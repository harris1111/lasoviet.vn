import assert from 'node:assert/strict';
import { NormalizedBirthProfileV1Schema } from '@lasoviet/contracts';
import { createPersonalDailyReadingService } from '@lasoviet/backend';
import { writePersonalDailyReading } from '@lasoviet/engine-adapters';

// Injected authority and clock only; no database, native provider, financial or customer service.
const actor = { kind: 'account', userId: 'synthetic-owner', sessionId: 'synthetic', requestId: 'synthetic' };
const originalInput = { version: 1, calendar: { kind: 'solar', date: '2000-01-01' },
  time: { precision: 'exact_minute', localTime: '12:00' }, timezone: { offsetMinutes: 420 },
  consentVersion: 'synthetic', gender: 'female' };
const normalizedInput = { version: 1, normalizedCalendar: originalInput.calendar,
  normalizedTime: originalInput.time, timezoneProvenance: { source: 'offset', offsetMinutes: 420 },
  normalizationWarnings: [], limitations: [] };
const chart = { chartId: 'synthetic-chart', chartVersionId: 'synthetic-version',
  normalizedInput, originalInput, normalizedOutput: {}, items: [], evidenceSetId: null,
  capabilityId: null, ruleVersion: null };
const profile = NormalizedBirthProfileV1Schema.parse({ ...normalizedInput, originalInput });
const start = '2026-09-26T16:59:59.999Z', finish = '2026-09-26T17:00:00.000Z';
let writerCalls = 0;
const writer = (...args) => { writerCalls++; return writePersonalDailyReading(...args); };
const expiredStages = [];
for (const stage of ['chart', 'access']) {
  let current = new Date(start), accessAt;
  const service = createPersonalDailyReadingService({ now: () => current, writer,
    charts: { readAuthorizedChart: async () => {
      if (stage === 'chart') current = new Date(finish);
      return chart;
    }, readEvidenceItem: async () => null },
    access: async (_owner, _chart, at) => {
      accessAt = at.toISOString();
      if (stage === 'access') current = new Date(finish);
      return { chartVersionId: chart.chartVersionId, grantedAt: new Date('2026-09-20T00:00:00Z'), expiresAt: new Date(finish) };
    } });
  assert.equal((await service.read(actor, chart.chartId)).error?.code, 'DAILY_READING_FORBIDDEN');
  assert.equal(accessAt, stage === 'chart' ? finish : new Date(start).toISOString());
  expiredStages.push(stage);
}
assert.equal(writerCalls, 0);
let current = new Date(start);
const grant = { chartVersionId: chart.chartVersionId, grantedAt: new Date('2026-09-20T00:00:00Z'), expiresAt: new Date('2026-09-28T00:00:00Z') };
const charts = { readAuthorizedChart: async () => chart, readEvidenceItem: async () => null };
const live = createPersonalDailyReadingService({ charts, writer, now: () => current,
  access: async () => { current = new Date(finish); return grant; } });
const result = await live.read(actor, chart.chartId);
assert.equal(result.ok, true); assert.equal(result.value.asOfDate, '2026-09-27');
assert.equal(result.value.qualityGate.checkedAt, finish); assert.equal(writerCalls, 1);
current = new Date(start);
const stored = writePersonalDailyReading(profile, { chartId: chart.chartId, chartVersionId: chart.chartVersionId, asOfDate: '2026-09-26', now: () => current });
const stale = createPersonalDailyReadingService({ charts, writer, now: () => current,
  access: async () => { current = new Date(finish); return { ...grant, content: stored, purchaseId: 'synthetic-purchase' }; } });
assert.equal((await stale.read(actor, chart.chartId)).error?.code, 'DAILY_READING_UNAVAILABLE');
assert.equal(writerCalls, 1);
console.log(JSON.stringify({ status: 'PASS', expiredStages, staleStoredContentRefused: true,
  validGrantUsesNewVietnamDate: true, writerUsesFinalClock: true, syntheticWriterCalls: writerCalls,
  physicalProviderCalls: 0, databaseWrites: 0, financialWrites: 0, customerSends: 0, manualAccepted: false }));
