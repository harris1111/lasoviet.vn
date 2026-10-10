import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as contracts from '@lasoviet/contracts';
import * as config from '@lasoviet/config';
import * as backend from '@lasoviet/backend';
import { calculateZiweiHoroscope, writePersonalDailyReading } from '@lasoviet/engine-adapters';

// Synthetic profile and injected authority only: no provider, DB, financial or customer service.
const originalInput = { version: 1, calendar: { kind: 'solar', date: '1992-06-15' },
  time: { precision: 'exact_minute', localTime: '08:30' }, timezone: { offsetMinutes: 420 },
  consentVersion: 'synthetic', gender: 'male' };
const normalizedInput = { version: 1, normalizedCalendar: originalInput.calendar, normalizedTime: originalInput.time,
  timezoneProvenance: { source: 'offset', offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
const profile = contracts.NormalizedBirthProfileV1Schema.parse({ ...normalizedInput, originalInput });
const clock = () => new Date('2026-10-10T00:00:00Z');
const current = calculateZiweiHoroscope(profile, { asOfDate: '2025-08-22', targetYear: 2026 });
const next = calculateZiweiHoroscope(profile, { asOfDate: '2025-08-22', targetYear: 2027 });
const boundaries = [
  ['2027-02-05', '29/12 Bính Ngọ'], ['2027-02-06', '1/1 Đinh Mùi'],
  ['2025-08-22', '29/6 nhuận Ất Tỵ'], ['2025-08-23', '1/7 Ất Tỵ'],
].map(([asOfDate, expected]) => {
  const value = writePersonalDailyReading(profile, { asOfDate, now: clock });
  return { asOfDate, expected, actual: value.calendar.lunarDateFormatted, qualityPassed: value.qualityGate.passed,
    groundMatches: value.chartGrounding.touchedPalaceId === calculateZiweiHoroscope(profile, { asOfDate }).daily.touchedPalaceId };
});
const actor = { kind: 'account', userId: 'synthetic-owner', sessionId: 'synthetic', requestId: 'synthetic' };
const chart = { chartId: 'synthetic-chart', chartVersionId: 'synthetic-version', normalizedInput, originalInput,
  normalizedOutput: {}, items: [], evidenceSetId: null, capabilityId: null, ruleVersion: null };
const midnightCases = [];
for (const [start, finish, date, lunarDate] of [
  ['2027-02-05T16:59:59.999Z', '2027-02-05T17:00:00Z', '2027-02-06', '1/1 Đinh Mùi'],
  ['2025-08-22T16:59:59.999Z', '2025-08-22T17:00:00Z', '2025-08-23', '1/7 Ất Tỵ'],
]) {
  let currentClock = new Date(start);
  const service = backend.createPersonalDailyReadingService({ now: () => currentClock, writer: writePersonalDailyReading,
    charts: { readAuthorizedChart: async () => chart, readEvidenceItem: async () => null },
    access: async () => { currentClock = new Date(finish); return { chartVersionId: chart.chartVersionId,
      grantedAt: new Date('2025-01-01T00:00:00Z'), expiresAt: new Date('2028-01-01T00:00:00Z') }; } });
  const result = await service.read(actor, chart.chartId);
  assert.equal(result.ok, true);
  assert.equal(result.value.asOfDate, date);
  assert.equal(result.value.calendar.lunarDateFormatted, lunarDate);
  assert.equal(result.value.qualityGate.checkedAt, new Date(finish).toISOString());
  midnightCases.push({ date, lunarDate, passed: true });
}
const walletCatalogHash = createHash('sha256').update(JSON.stringify(contracts.LA_PRODUCT_CATALOG)).digest('hex');
const legacyIdentity = backend.LEGACY_VND_CHECKOUT_CATALOG === backend.PRODUCT_CATALOG &&
  config.legacyVndProductCatalog === config.productCatalog && !!config.legacyVndProductCatalog;
const baseline = process.env.LSV_SMOKE_MODE === 'baseline';
if (baseline) {
  assert.equal(current.minorLimit, undefined);
  assert.equal(boundaries[2].actual, '29/-6 Ất Tỵ');
} else {
  for (const [value, year, palace] of [[current, 2026, 'ziwei.palace.travel'], [next, 2027, 'ziwei.palace.health']]) {
    assert.equal(contracts.ZiweiHoroscopeResultV1Schema.safeParse(value).success, true);
    assert.equal(value.minorLimit.targetYear, year);
    assert.equal(value.minorLimit.lunarAge, year - 1992 + 1);
    assert.equal(value.minorLimit.palaceId, palace);
    assert.notEqual(value.minorLimit.palaceId, value.yearly.annualPalaceId);
    assert.equal(value.daily.solarDate, '2025-08-22');
  }
  for (const row of boundaries) { assert.equal(row.actual, row.expected); assert.equal(row.qualityPassed, true); assert.equal(row.groundMatches, true); }
  assert.equal(walletCatalogHash, 'fb9d330bd545591fe26b1b54e14fd3fb748ea504c10af9aa9ec2bbbb252a9be6');
  assert.equal(legacyIdentity, true);
  assert.equal(backend.LEGACY_VND_CHECKOUT_CATALOG['ZIWEI-IDENTITY-P0'].amount, 79000);
  assert.equal(backend.LEGACY_VND_CHECKOUT_CATALOG['ZIWEI-NATAL-EXCERPT-P0'].amount, 19000);
  assert.equal(contracts.findLaProduct('ZIWEI-IDENTITY-P0').priceLa, 960);
}
console.log(JSON.stringify({ status: baseline ? 'EXPECTED_BASELINE_GAP' : 'PASS', minorCurrent: current.minorLimit ?? null,
  minorNext: next.minorLimit ?? null, boundaries, midnightCases, legacyIdentity, walletCatalogHash,
  physicalProviderCalls: 0, databaseWrites: 0, financialWrites: 0, customerSends: 0, manualAccepted: false }));
