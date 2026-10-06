import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {NormalizedBirthProfileV1Schema} from '../packages/contracts/dist/index.js';
import {writePersonalDailyReading, calculateZiweiHoroscope, validatePersonalDailyReadingQuality} from '../packages/engine-adapters/dist/index.js';

const previous = JSON.parse(readFileSync('plan/evidence/2026-10-05-personal-daily-editorial-qa.json', 'utf8'));
const now = () => new Date('2026-09-30T03:00:00Z');
const samples = previous.samples.map(sample => {
  const {birthDate, localTime, gender} = sample.syntheticInput;
  const profile = NormalizedBirthProfileV1Schema.parse({version: 1,
    originalInput: {version: 1, displayName: `Synthetic daily ${sample.sample}`, gender, calendar: {kind: 'solar', date: birthDate}, time: {precision: 'exact_minute', localTime}, timezone: {ianaZone: 'Asia/Ho_Chi_Minh'}, consentVersion: 'synthetic-qa-v1', locale: 'vi'},
    normalizedCalendar: {kind: 'solar', date: birthDate}, normalizedTime: {precision: 'exact_minute', localTime},
    timezoneProvenance: {source: 'iana', ianaZone: 'Asia/Ho_Chi_Minh', runtime: 'Intl'}, normalizationWarnings: [], limitations: []});
  const options = {asOfDate: sample.asOfDate, chartId: `synthetic-daily-${sample.sample}`, chartVersionId: `synthetic-version-${sample.sample}`, now};
  const reading = writePersonalDailyReading(profile, options);
  const repeated = writePersonalDailyReading(profile, options);
  const quality = validatePersonalDailyReadingQuality(reading, calculateZiweiHoroscope(profile, {asOfDate: sample.asOfDate}), reading.chartGrounding);
  if (!quality.ok || JSON.stringify(reading) !== JSON.stringify(repeated)) throw new Error(`Sample ${sample.sample} failed quality/determinism`);
  return {sample: sample.sample, syntheticInput: sample.syntheticInput, asOfDate: sample.asOfDate,
    sha256: createHash('sha256').update(JSON.stringify(reading)).digest('hex'), deterministicRepeat: true, quality, reading};
});
const configurationPairs = [];
for (let i = 0; i < samples.length; i++) for (let j = i + 1; j < samples.length; j++) {
  const a = samples[i].reading, b = samples[j].reading;
  if (a.chartGrounding.touchedPalaceId !== b.chartGrounding.touchedPalaceId || JSON.stringify(a.chartGrounding.majorStars) === JSON.stringify(b.chartGrounding.majorStars)) continue;
  const varied = a.reading.overview !== b.reading.overview && JSON.stringify(a.reading.actionPlan.recommendations) !== JSON.stringify(b.reading.actionPlan.recommendations);
  if (!varied) throw new Error('Different computed stars produced repeated prose/actions');
  configurationPairs.push({samples: [samples[i].sample, samples[j].sample], palaceId: a.chartGrounding.touchedPalaceId, differentProseAndActions: true});
}
if (samples.length !== 20 || !configurationPairs.length) throw new Error('Twenty outputs and same-palace configuration comparisons are required');
const evidence = {kind: 'deterministic-paid-daily-editorial-qa', syntheticProfiles: true, externalPaidCalls: 0,
  frozenGeneratedAt: now().toISOString(), consecutivePassingGenerations: samples.length, editorialAcceptance: 'pending-independent-paid-content-review',
  catalogActivation: 'branch-only-pending-implementation-review-and-release', source: 'approved-v4-passages-pinned-by-content-hash', sourceFileHashes: Object.fromEntries(['personal-daily-reading-writer.ts','daily-reading-grounding.ts'].map(file => [file, createHash('sha256').update(readFileSync('packages/engine-adapters/src/ziwei/'+file)).digest('hex')])), configurationPairs, samples};
writeFileSync('plan/evidence/2026-10-06-personal-daily-paid-qa.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({samples: samples.length, samePalaceConfigurationPairs: configurationPairs.length, externalPaidCalls: 0}));
