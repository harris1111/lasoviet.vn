import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { IztroAdapter } from '@lasoviet/engine-adapters';
import {
  freezeFreeReadingCall,
  prepareFreeReadingOpenAiCompatibleWire, createOpenAiCompatibleAdapter, createAiProductionGate,
} from '@lasoviet/backend';
// These intentionally private modules are shipped beside the selected installed package entry.
const backendEntry = import.meta.resolve('@lasoviet/backend');
const { buildFreeReadingFacts } = await import(new URL('./ziwei/free-reading-facts.js', backendEntry));
const { compileFreeReadingFallback } = await import(new URL('./ziwei/free-reading-fallback.js', backendEntry));


// Synthetic transport only. No native route, credentials, database or customer sender is constructed.
const time = { precision: 'exact_minute', localTime: '08:30' };
const profile = { version: 1,
  originalInput: { version: 1, calendar: { kind: 'solar', date: '1992-06-15' }, time,
    timezone: { offsetMinutes: 420 }, gender: 'male', consentVersion: 'synthetic' },
  normalizedCalendar: { kind: 'solar', date: '1992-06-15' }, normalizedTime: time,
  timezoneProvenance: { source: 'offset', offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
const chart = await new IztroAdapter().calculate({ birthProfile: profile });
assert.equal(chart.ok, true);
const tariff = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pricingVersion: 'synthetic-not-native-pricing',
  providerId: '9router-an', modelId: 'gemini-3.8-flash', inputPricePerMillion: 20000,
  outputPricePerMillion: 100000, cachedInputPricePerMillion: 2000 };
const options = { baseUrl: 'https://ai.synthetic.test/v1/', modelId: tariff.modelId };
let syntheticFetches = 0, driftAuthorizations = 0;
const locales = [];
for (const locale of ['vi', 'en']) {
  const source = buildFreeReadingFacts({ chart: chart.output, focusPalaceId: chart.output.soulPalaceId, locale });
  const call = freezeFreeReadingCall({ requestId: 'PRIVATE_REQUEST', chartVersionId: 'PRIVATE_CHART', source, tariff });
  const prepared = prepareFreeReadingOpenAiCompatibleWire(call, options);
  assert.equal(prepared.kind, 'prepared_unproven'); assert.equal(prepared.tokenBoundProof, null);
  assert.notEqual(prepared.wire.body, call.serializedPrompt);
  assert.equal(prepared.wire.bodySha256, createHash('sha256').update(prepared.wire.body).digest('hex'));
  for (const secret of ['PRIVATE_REQUEST', 'PRIVATE_CHART', '1992-06-15', '08:30', 'synthetic-secret']) {
    assert.equal(JSON.stringify(prepared.wire).includes(secret), false);
  }
  const bodies = [];
  const adapter = createOpenAiCompatibleAdapter({ ...options, apiKey: 'synthetic-secret',
    allowedResolvedModelIds: [tariff.modelId], timeoutMs: 1000, retryCount: 0,
    productionGate: createAiProductionGate('pending'), fetchImpl: async (url, init) => {
      syntheticFetches++; assert.equal(String(url), prepared.wire.endpoint); bodies.push(String(init.body));
      return new Response(JSON.stringify({ model: tariff.modelId,
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
        choices: [{ message: { content: JSON.stringify(compileFreeReadingFallback(source)) } }] }), { status: 200 });
    } });
  const result = await adapter.generateStructured({ ...prepared.request, use: 'synthetic_capability_probe' });
  assert.equal(result.ok, true); assert.equal(result.value.usage.tokensUnknown, true);
  assert.deepEqual(bodies, [prepared.wire.body]);
  const drift = createOpenAiCompatibleAdapter({ ...options, baseUrl: 'https://other.synthetic.test/v1', apiKey: 'synthetic-secret',
    allowedResolvedModelIds: [tariff.modelId], timeoutMs: 1000, retryCount: 1,
    productionGate: createAiProductionGate('approved'),
    costRecorder: { beginAttempt: async () => { driftAuthorizations++; throw new Error('Unexpected authorization'); },
      completeAttempt: async () => { throw new Error('Unexpected outcome'); } },
    fetchImpl: async () => { throw new Error('Unexpected fetch'); } });
  assert.deepEqual(await drift.generateStructured(prepared.request),
    { ok: false, error: { code: 'AI_PROVIDER_NOT_APPROVED', retryable: false } });
  locales.push(locale);
}
assert.equal(driftAuthorizations, 0);
console.log(JSON.stringify({ status: 'PASS', locales, exactWireMatches: true, driftRefusedBeforeAuthorization: true,
  tokenBoundProof: null, geminiUsageStillUnknown: true, syntheticFetches, physicalProviderCalls: 0,
  databaseWrites: 0, financialWrites: 0, customerSends: 0, manualAccepted: false }));
