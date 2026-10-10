import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, lstatSync } from 'node:fs';
import * as backend from '../../../packages/backend/dist/index.js';
import * as contracts from '../../../packages/contracts/dist/index.js';
import * as engine from '../../../packages/engine-adapters/dist/index.js';
import { makePaidTrialInput } from '../../../scripts/run-paid-manual-trials.mjs';
import { assertFd123OutputPath, normalizeTrialJson } from '../../../scripts/continue-paid-manual-trials.mjs';

const inputPath = process.env.LASOVIET_ACCEPTANCE_JOURNAL;
const outputPath = process.env.LASOVIET_ACCEPTANCE_RECEIPT;
assert(inputPath && outputPath, 'Explicit private input and separate receipt paths required');
assert.notEqual(inputPath, outputPath);
assertFd123OutputPath(outputPath);
const stat = lstatSync(inputPath);
assert(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0);
const bytes = readFileSync(inputPath);
const manifest = JSON.parse(bytes);
const hash = value => createHash('sha256').update(value).digest('hex');
const rows = [];
let originalJournalSha256 = null;
const originalPath = process.env.LASOVIET_ACCEPTANCE_ORIGINAL_JOURNAL;
if (originalPath) {
  const originalStat = lstatSync(originalPath);
  assert(originalStat.isFile() && !originalStat.isSymbolicLink() && originalStat.uid === process.getuid() && (originalStat.mode & 0o077) === 0);
  const originalBytes = readFileSync(originalPath);
  const original = JSON.parse(originalBytes);
  assert.equal(original.reports.length, 1);
  const row = original.reports[0];
  const input = await makePaidTrialInput(row.group, row.index, original.asOfDate, { backend, contracts, engine });
  const sourceMatches = input.snapshotHash === row.snapshotHash && hash(JSON.stringify(input.facts)) === row.factsSha256;
  assert(sourceMatches, 'Original retained sample source mismatch');
  const normalized = normalizeTrialJson(row.attempts[0].visibleUnacceptedOutput);
  const content = contracts.ZiweiTopicDeepDiveContentV1Schema.parse(normalized.value);
  const quality = backend.validateZiweiTopicDeepDiveQualityV4(content, input.facts);
  rows.push({ slot: row.slot, group: row.group, index: row.index, journal: 'original_fd121', sourceMatches,
    snapshotHash: input.snapshotHash, factsSha256: hash(JSON.stringify(input.facts)), contentAvailable: true,
    contentSha256: hash(JSON.stringify(content)), qualityPassed: quality.ok, qualityFindings: quality.findings,
    status: quality.ok ? 'AUTOMATED_PASS_PENDING_EDITORIAL_REVIEW' : 'FACTUAL_OR_CONTENT_FAIL' });
  originalJournalSha256 = hash(originalBytes);
  assert.equal(hash(readFileSync(originalPath)), originalJournalSha256, 'Original authority mutated');
}
for (const row of manifest.reports) {
  const input = await makePaidTrialInput(row.group, row.index, manifest.asOfDate, { backend, contracts, engine });
  const sourceMatches = input.snapshotHash === row.snapshotHash && hash(JSON.stringify(input.facts)) === row.factsSha256;
  const selected = row.result?.ok && row.result.value?.content;
  const knownRejectedOriginal = !selected && row.group === 'career_wealth' && row.index === 1 && row.attempts[0]?.outputText;
  const retained = selected || (knownRejectedOriginal && contracts.ZiweiTopicDeepDiveContentV1Schema.parse(normalizeTrialJson(knownRejectedOriginal).value));
  const quality = retained && sourceMatches ? (['monthly', 'current_annual', 'next_annual'].includes(row.group)
    ? backend.validatePeriodReading(retained, input.facts)
    : backend.validateZiweiTopicDeepDiveQualityV4(retained, input.facts)) : null;
  rows.push({ slot: row.slot, group: row.group, index: row.index, sourceMatches, snapshotHash: input.snapshotHash,
    factsSha256: hash(JSON.stringify(input.facts)), contentAvailable: Boolean(retained),
    contentSha256: retained ? hash(JSON.stringify(retained)) : null,
    selectedResponseAvailable: Boolean(selected), correctionAvailable: row.group === 'career_wealth' && row.index === 1 ? false : null, qualityPassed: quality?.ok ?? false, qualityFindings: quality?.findings ?? [], qualityAdvisories: quality?.advisory ?? [],
    status: !sourceMatches ? 'SOURCE_MISMATCH' : !retained ? 'NOT_AVAILABLE' : quality.ok ? 'AUTOMATED_PASS_PENDING_EDITORIAL_REVIEW' : 'FACTUAL_OR_CONTENT_FAIL' });
}
assert.equal(hash(readFileSync(inputPath)), hash(bytes), 'Actual journal mutated during review');
const receipt = { observedAt: new Date().toISOString(), sourceBaseSha: 'fff32b37263eb0bd9a35aec4808c0ef916a22f99',
  topicGuardSourceSha256: hash(readFileSync(new URL('../../../packages/backend/src/reports/topic-deep-dive-quality-v4.ts', import.meta.url))), originalJournalSha256,
  sourceJournalSha256: hash(bytes), rows, physicalProviderCalls: 0, productionDatabaseWrites: 0, financialWrites: 0, customerSends: 0,
  ownerDelegatedEditorialAcceptance: 'separate independent review required', productAccepted: false,
  scope: 'Read-only local compiled hard-quality replay; source guard hash identifies reviewed code separately from installed release; neither sample count nor historical status is acceptance' };
writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ sourceMatches: rows.filter(row => row.sourceMatches).length, automatedPass: rows.filter(row => row.qualityPassed).length,
  availableResponses: rows.filter(row => row.contentAvailable).length, rejected: rows.filter(row => row.contentAvailable && !row.qualityPassed).length }, null, 2));
