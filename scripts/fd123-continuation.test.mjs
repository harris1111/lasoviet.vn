import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCampaignBudget } from "./lib/campaign-budget.mjs";
import { captureNativeAccountingEvidence } from "./lib/prod-9router-child.mjs";
import { runProdRouterAttempt, paidTrialAttemptKey } from "./lib/prod-9router-attempt.mjs";
import { FD123_POLICY, FD123_MODEL_BOUND_MODE, FD123_TECHNICAL_CAP_VND, FD123_SLOTS, fd123AttemptKey, quoteFd123ReferenceSettlement } from "./lib/fd123-reference-continuation.mjs";
import { assertFd123OutputPath, normalizeTrialJson, assertFd123Original, assertFd123Resume, buildFd123Inputs, prepareFd123RetainedRecovery,
  prepareFd123RetainedFormatRecovery, prepareFd123RetainedQualityRecovery, paidTrialSchemaInstruction } from "./continue-paid-manual-trials.mjs";
import { API_REFERENCE_PRICING } from "./lib/native-campaign-api-pricing.mjs";

const now = () => new Date("2026-10-09T18:00:00Z");
const digest = text => createHash("sha256").update(text).digest("hex");
const trace = { requestedAlias: "ag/gemini-3.8-flash", wireModel: "gemini-3.8-flash-medium",
  requestId: "agent/11111111-1111-4111-a111-111111111111/1791568800000/22222222-2222-4222-a222-222222222222/1",
  effectiveMaxOutputTokens: 16384, requestSha256: "a".repeat(64) };
const pricedTrace = { ...trace, pricingVersion: API_REFERENCE_PRICING.version, pricingSnapshotSha256: API_REFERENCE_PRICING.snapshotSha256 };
const bounds = { inputTokens: 1048576, outputTokens: 65536, reasoningTokens: 65536 };
function fixture(mutate = () => {}) {
  const native = { modelVersion: "gemini-3.8-flash-medium", usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, thoughtsTokenCount: 30, totalTokenCount: 180 },
    candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: '{"synthetic":true}' }] } }] };
  mutate(native);
  const outputText = '{"synthetic":true}';
  const receipt = { modelVersion: native.modelVersion, usageMetadata: native.usageMetadata };
  const accountingEvidence = captureNativeAccountingEvidence(native, { requestSha256: trace.requestSha256, responseSha256: digest(JSON.stringify(native)), outputText });
  const reply = { type: "result", outputText, receipt, accountingEvidence, conflictingUsage: false };
  let calls = 0;
  const processFactory = () => {
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough();
    child.kill = () => { child.stdin.destroy(); child.stdout.end(); };
    let buffer = "", stage = 0;
    child.stdin.on("data", data => {
      buffer += data.toString(); let split;
      while ((split = buffer.indexOf("\n")) >= 0) {
        const line = JSON.parse(buffer.slice(0, split)); buffer = buffer.slice(split + 1);
        if (!stage++) child.stdout.write(JSON.stringify({ type: "prepared", trace, bounds, expiresAtMs: Date.parse("2026-10-10T00:00:00Z") }) + "\n");
        else { assert.equal(line.type, "dispatch"); calls++; child.stdout.end(JSON.stringify(reply) + "\n"); }
      }
    });
    return child;
  };
  return { reply, processFactory, calls: () => calls };
}
function fresh(reference = true) {
  const ledgerPath = join(mkdtempSync(join(tmpdir(), "fd123-test-")), "ledger.jsonl");
  const cap = reference ? FD123_TECHNICAL_CAP_VND : 180000;
  const options = { ledgerPath, totalCapVnd: cap, allocationsVnd: { "v4.2-report": cap }, settleActualUsage: true, now,
    ...(reference ? { referenceContinuation: FD123_POLICY } : {}) };
  return { budget: createCampaignBudget(options), options, ledgerPath };
}
const run = (budget, f, slot = FD123_SLOTS[0], purpose = "report", extra = {}) => runProdRouterAttempt({ system: "synthetic", user: "synthetic",
  maxOutputTokens: 14000, attemptKey: fd123AttemptKey(slot, purpose), budget, processFactory: f.processFactory, now, referenceContinuation: true, ...extra });

test("FD123-only immutable configuration does not relax generic budgets or reinterpret existing ledgers", () => {
  const modern = fresh(); modern.budget.status();
  assert.throws(() => createCampaignBudget({ ...modern.options, referenceContinuation: undefined }), { code: "BUDGET_CONFIG_INVALID" });
  assert.throws(() => createCampaignBudget({ ...modern.options, referenceContinuation: "arbitrary" }), { code: "BUDGET_CONFIG_INVALID" });
  assert.throws(() => createCampaignBudget({ ...modern.options, totalCapVnd: 180000 }), { code: "BUDGET_CONFIG_INVALID" });
  assert.throws(() => createCampaignBudget({ ...modern.options, settleActualUsage: false }), { code: "BUDGET_CONFIG_INVALID" });
  const old = fresh(false); old.budget.status();
  assert.throws(() => createCampaignBudget({ ...modern.options, ledgerPath: old.ledgerPath }).status(), { code: "BUDGET_LEDGER_CONFIG_MISMATCH" });
  assert.throws(() => createCampaignBudget({ ...old.options, ledgerPath: modern.ledgerPath }).status(), { code: "BUDGET_LEDGER_CONFIG_MISMATCH" });
});
test("complete future missing-cache receipt checkpoints then settles a conservative reference without inventing zero", async () => {
  const { budget, options } = fresh(), f = fixture(); let checkpointed = false;
  const value = await run(budget, f, undefined, undefined, { onReceipt(row) {
    assert.equal(budget.status().openReservations, 1); assert.equal(Object.hasOwn(row.accountingEvidence.usageMetadata, "cachedContentTokenCount"), false); checkpointed = true;
  } });
  assert(checkpointed); assert.equal(value.quote.quoteVnd, "10"); assert.equal(value.quote.cachedTokensUnknown, true);
  assert.equal(value.quote.providerBillingVerified, false); assert.equal(value.quote.ownerDecision, "FD-123");
  assert.equal(budget.status().totalVnd, 10); assert.equal(budget.status().openReservations, 0);
  assert.deepEqual(createCampaignBudget(options).status(), budget.status());
  await assert.rejects(run(budget, f), { code: "BUDGET_ATTEMPT_ALREADY_CLAIMED" }); assert.equal(f.calls(), 1);
});
test("historical unknown reservation remains byte-identical while a separate continuation can run", async () => {
  const old = fresh(false), f = fixture();
  await assert.rejects(runProdRouterAttempt({ system: "synthetic", user: "synthetic", maxOutputTokens: 14000,
    attemptKey: paidTrialAttemptKey("relationship_marriage:0", "report"), budget: old.budget, now, processFactory: f.processFactory }), { code: "NATIVE_API_PRICING_USAGE_UNVERIFIED" });
  const before = digest(readFileSync(old.ledgerPath)), marker = digest(readFileSync(`${old.ledgerPath}.lock`));
  const modern = fresh(); await run(modern.budget, fixture());
  assert.equal(digest(readFileSync(old.ledgerPath)), before); assert.equal(digest(readFileSync(`${old.ledgerPath}.lock`)), marker);
  assert.equal(old.budget.status().totalVnd, 33368); assert.equal(old.budget.status().openReservations, 1);
});
test("only fixed nine report/rewrite keys are legal; first-slot and rewrite-first cannot dispatch", async () => {
  assert.throws(() => fd123AttemptKey("relationship_marriage:0", "report"), { code: "FD123_SLOT_OR_PURPOSE_INVALID" });
  assert.throws(() => fd123AttemptKey("arbitrary:1", "report"));
  const { budget } = fresh(), f = fixture();
  await assert.rejects(run(budget, f, undefined, "rewrite"), { code: "BUDGET_ATTEMPT_INVALID" });
  await assert.rejects(run(budget, f, undefined, undefined, { attemptKey: paidTrialAttemptKey("relationship_marriage:0", "report") }), { code: "BUDGET_ATTEMPT_INVALID" });
  assert.equal(f.calls(), 0); assert.equal(budget.status().totalVnd, 0);
});
test("all eighteen bounded attempts settle and a nineteenth cannot dispatch", async () => {
  const { budget } = fresh(), f = fixture();
  for (const slot of FD123_SLOTS) for (const purpose of ["report", "rewrite"]) await run(budget, f, slot, purpose);
  assert.equal(f.calls(), 18); assert.equal(budget.status().totalVnd, 180); assert.equal(budget.status().capVnd, 600624);
  await assert.rejects(run(budget, f, FD123_SLOTS.at(-1), "rewrite"), { code: "BUDGET_ATTEMPT_ALREADY_CLAIMED" }); assert.equal(f.calls(), 18);
});
test("unsupported or conflicting future metadata and completion keep full hold and block the next slot", async () => {
  for (const mutate of [n => { n.usageMetadata.serviceTier = "PRIORITY"; }, n => { n.usageMetadata.trafficType = "PROVISIONED_THROUGHPUT"; }, n => { n.usageMetadata.promptTokensDetails = [{ modality: "IMAGE", tokenCount: 100 }]; },
    n => { n.usageMetadata.toolUsePromptTokenCount = 1; }, n => { n.usageMetadata.totalTokenCount++; },
    n => { n.candidates[0].finishReason = "MAX_TOKENS"; }, n => { n.unknownCharge = true; },
    n => { n.usageMetadata.cacheTokensDetails = []; }]) {
    const { budget } = fresh(), f = fixture(mutate);
    await assert.rejects(run(budget, f)); assert.equal(budget.status().totalVnd, 33368); assert.equal(budget.status().openReservations, 1);
    await assert.rejects(run(budget, f, FD123_SLOTS[1]), { code: "BUDGET_ATTEMPT_UNRESOLVED" }); assert.equal(f.calls(), 1);
  }
});
test("ledger revalidates receipt/request/output linkage and cannot accept an invented cache or forged authority", () => {
  for (const mutate of [s => { s.accountingEvidence.requestSha256 = "b".repeat(64); }, s => { s.outputSha256 = "b".repeat(64); },
    s => { s.accountingEvidence.settlementAuthorized = true; }, s => { s.receipt.usageMetadata.cachedContentTokenCount = 0; },
    s => { s.receipt.extra = "unsafe"; }]) {
    const { budget } = fresh(), f = fixture();
    const id = budget.reserveAttempt("v4.2-report", 33368, { attemptKey: fd123AttemptKey(FD123_SLOTS[0], "report"), trace: pricedTrace }); budget.markDispatched(id);
    const settlement = structuredClone({ receipt: f.reply.receipt, accountingEvidence: f.reply.accountingEvidence, outputSha256: digest(f.reply.outputText) }); mutate(settlement);
    assert.throws(() => budget.settleAttempt(id, settlement), { code: "BUDGET_ATTEMPT_SETTLEMENT_INVALID" }); assert.equal(budget.status().openReservations, 1);
  }
});
test("verified cached counters retain the ordinary API reference path and proof linkage", async () => {
  const f = fixture(n => { n.usageMetadata.cachedContentTokenCount = 20; }), { budget } = fresh();
  const value = await run(budget, f); assert.equal(value.quote.cachedTokensUnknown, false); assert.equal(value.quote.quoteVnd, "10");
  assert.equal(value.quote.accountingStatus, "api_reference");
});
test("checkpoint failure cannot settle and a generic ledger cannot opt into FD123 dispatch", async () => {
  const modern = fresh(), f = fixture();
  await assert.rejects(run(modern.budget, f, undefined, undefined, { onReceipt() { throw Object.assign(new Error("checkpoint"), { code: "CHECKPOINT_FAILED" }); } }), { code: "CHECKPOINT_FAILED" });
  assert.equal(modern.budget.status().totalVnd, 33368);
  const old = fresh(false), unused = fixture(); await assert.rejects(run(old.budget, unused), { code: "FD123_LEDGER_POLICY_REQUIRED" }); assert.equal(unused.calls(), 0);
});
test("normalization accepts only a single exact JSON fence or raw JSON and retains both identities", () => {
  for (const raw of ['{"x":1}', '```json\n{"x":1}\n```', '```\n{"x":1}\n```']) {
    const result = normalizeTrialJson(raw); assert.deepEqual(result.value, { x: 1 }); assert.equal(result.rawSha256, digest(raw)); assert.equal(result.parsedSha256, digest('{"x":1}'));
  }
  for (const raw of ['intro\n```json\n{"x":1}\n```', '```json\n{"x":1}\n```\nfooter', '```javascript\n{"x":1}\n```', '{"x":1}{"x":2}', '```json\nnot json\n```']) assert.throws(() => normalizeTrialJson(raw), { code: "FD123_JSON_INVALID" });
});
test("original fence and continuation restart reject missing history, incomplete runs and duplicate slots", () => {
  const original = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-retained.json", import.meta.url), "utf8")); assertFd123Original(original);
  const bad = structuredClone(original); bad.reports[0].slot = FD123_SLOTS[0]; assert.throws(() => assertFd123Original(bad));
  const lineage = { originalJournalSha256: "a".repeat(64), originalLedgerSha256: "b".repeat(64) };
  const complete = { campaign: FD123_POLICY, ...lineage, status: "complete_pending_manual_review", manualAccepted: false,
    reports: FD123_SLOTS.map(slot => ({ slot, status: "quality_passed_pending_manual_review", manualAccepted: false, attempts: [{}] })) };
  assertFd123Resume(complete, lineage);
  for (const mutate of [m => { m.status = "stopped"; }, m => { m.originalLedgerSha256 = "c".repeat(64); }, m => { m.reports[1].slot = m.reports[0].slot; }, m => { m.reports[0].attempts.push({}, {}); }]) {
    const value = structuredClone(complete); mutate(value); assert.throws(() => assertFd123Resume(value, lineage), { code: "FD123_RESTART_REQUIRES_RECONCILIATION" });
  }
});
test("all nine actual Iztro sources match the original frozen ten-slot identities", async () => {
  const original = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-retained.json", import.meta.url), "utf8"));
  const preflight = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-preflight.json", import.meta.url), "utf8"));
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const inputs = await buildFd123Inputs(original, modules, preflight); assert.equal(inputs.length, 9);
  assert.deepEqual(inputs.map(x => `${x.group}:${x.index}`), FD123_SLOTS);
  const tampered = structuredClone(preflight); tampered.inputs[1].factsSha256 = "c".repeat(64);
  await assert.rejects(buildFd123Inputs(original, modules, tampered), { code: "FD123_SOURCE_CHANGED" });
});
test("reference settlement rejects overbound counters rather than using an unchecked tariff ceiling", () => {
  const f = fixture(n => { n.usageMetadata.promptTokenCount = 1048577; n.usageMetadata.totalTokenCount = 1048657; });
  assert.throws(() => quoteFd123ReferenceSettlement({ receipt: f.reply.receipt, accountingEvidence: f.reply.accountingEvidence, outputSha256: digest(f.reply.outputText) }, pricedTrace, { at: now() }));
});


test("export path guard preserves original authority through lexical and symlink aliases", () => {
  const root = mkdtempSync(join(tmpdir(), "fd123-export-"));
  const authority = join(root, "authority"); mkdirSync(authority, { mode: 0o700 });
  const original = join(authority, "reports.json"); writeFileSync(original, "original-secret-free-history\n", { mode: 0o600 });
  const before = digest(readFileSync(original));
  const alias = join(root, "alias"); symlinkSync(authority, alias, "dir");
  const leaf = join(root, "leaf.json"); symlinkSync(original, leaf);
  for (const path of [original, join(authority, "budget.jsonl"), join(authority, "fd123-continuation", "reports.json"),
    join(alias, "reports.json"), join(alias, "new-child", "out.json"), leaf]) {
    assert.throws(() => assertFd123OutputPath(path, authority), { code: "FD123_EXPORT_AUTHORITY_PATH_FORBIDDEN" });
    assert.equal(digest(readFileSync(original)), before);
  }
  assert.equal(assertFd123OutputPath(join(root, "evidence.json"), authority), join(root, "evidence.json"));
});


test("only explicit on-demand traffic is supported while original tags remain in native proof", async () => {
  for (const cached of [false, true]) {
    const { budget } = fresh(), f = fixture(n => {
      n.usageMetadata.trafficType = "ON_DEMAND";
      if (cached) n.usageMetadata.cachedContentTokenCount = 20;
    });
    const value = await run(budget, f);
    assert.equal(value.quote.nativeTrafficType, "ON_DEMAND");
    assert.equal(value.accountingEvidence.usageMetadata.trafficType, "ON_DEMAND");
    assert.equal(value.quote.cachedTokensUnknown, !cached);
  }
});

test("explicit FD123 model-bound mode retains the entire hold without inventing absent counters and survives ledger replay", async () => {
  const { budget, options } = fresh(), f = fixture(n => {
    delete n.usageMetadata.thoughtsTokenCount; n.usageMetadata.totalTokenCount = 150; n.responseMetadata = { internal: true };
  });
  const value = await run(budget, f, undefined, undefined, { referenceMode: FD123_MODEL_BOUND_MODE });
  assert.equal(value.quote.quoteVnd, "33368"); assert.equal(value.quote.tokensUnknown, true);
  assert.equal(value.quote.actualUsageVerified, false); assert.equal(value.quote.providerBillingVerified, false);
  assert.equal(value.quote.exposureReduced, false); assert.equal(value.accountingEvidence.envelopeComplete, false);
  assert.deepEqual(value.quote.unknownNativeCounters, ["cachedContentTokenCount", "thoughtsTokenCount"]);
  assert.equal(Object.hasOwn(value.receipt.usageMetadata, "thoughtsTokenCount"), false);
  assert.equal(Object.hasOwn(value.receipt.usageMetadata, "cachedContentTokenCount"), false);
  assert.equal(budget.status().totalVnd, 33368); assert.equal(budget.status().openReservations, 0);
  assert.deepEqual(createCampaignBudget(options).status(), budget.status());
  await run(budget, fixture(), FD123_SLOTS[1]); assert.equal(f.calls(), 1);
  await assert.rejects(run(budget, f, undefined, undefined, { referenceMode: FD123_MODEL_BOUND_MODE }), { code: "BUDGET_ATTEMPT_ALREADY_CLAIMED" });
});

test("model-bound mode preserves non-monetary completion, metadata, model and counter fences", async () => {
  for (const mutate of [n => { n.candidates[0].finishReason = "MAX_TOKENS"; }, n => { n.modelVersion = "unknown"; },
    n => { n.usageMetadata.unrecognized = "sensitive"; }, n => { n.usageMetadata.serviceTier = "PRIORITY"; },
    n => { n.usageMetadata.trafficType = "PROVISIONED_THROUGHPUT"; }, n => { n.usageMetadata.toolUsePromptTokenCount = 1; },
    n => { n.usageMetadata.promptTokensDetails = [{ modality: "IMAGE", tokenCount: 100 }]; },
    n => { n.usageMetadata.totalTokenCount = 149; }, n => { n.usageMetadata.totalTokenCount = 65687; },
    n => { n.usageMetadata.promptTokenCount = 1048577; }, n => { n.usageMetadata.cachedContentTokenCount = 101; },
    n => { n.usageMetadata.candidatesTokensDetails = [{ modality: "TEXT", tokenCount: 49 }]; }]) {
    const { budget } = fresh(), f = fixture(n => { delete n.usageMetadata.thoughtsTokenCount; n.usageMetadata.totalTokenCount = 150; mutate(n); });
    await assert.rejects(run(budget, f, undefined, undefined, { referenceMode: FD123_MODEL_BOUND_MODE }));
    assert.equal(budget.status().totalVnd, 33368); assert.equal(budget.status().openReservations, 1);
  }
  const old = fresh(false), f = fixture();
  await assert.rejects(runProdRouterAttempt({ system: "synthetic", user: "synthetic", maxOutputTokens: 14000,
    attemptKey: paidTrialAttemptKey("relationship_marriage:0", "report"), budget: old.budget, now,
    processFactory: f.processFactory, referenceMode: FD123_MODEL_BOUND_MODE }), { code: "FD123_REFERENCE_MODE_INVALID" });
  assert.equal(f.calls(), 0);
});

test("historical reference recovery refuses the newly identified natal coordinate error and preserves all crash fences", async () => {
  const retained = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd123-first-retained-stop.json", import.meta.url), "utf8"));
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const { makePaidTrialInput } = await import("./run-paid-manual-trials.mjs");
  const input = await makePaidTrialInput("relationship_marriage", 1, retained.asOfDate, modules);
  const lineage = { originalJournalSha256: retained.originalJournalSha256, originalLedgerSha256: retained.originalLedgerSha256 };
  const before = JSON.stringify(retained);
  const recover = value => prepareFd123RetainedRecovery(value, lineage, input, modules, retained.budget, { at: now() });
  assert.throws(() => recover(retained), { code: "FD123_RECOVERY_QUALITY_FAILED" });
  const attempt = retained.reports[0].attempts[0];
  const normalized = normalizeTrialJson(attempt.visibleUnacceptedOutput);
  const content = modules.contracts.ZiweiTopicDeepDiveContentV1Schema.parse(normalized.value);
  const quality = modules.backend.validateZiweiTopicDeepDiveQualityV4(content, input.facts);
  assert.equal(quality.ok, false);
  assert(quality.findings.some(f => f.code === "PALACE_FACTS" && f.note.includes("ziwei.branch.monkey")));
  assert.equal(JSON.stringify(retained), before);
  for (const mutate of [m => { m.status = "recovery_prepared"; }, m => { m.recoveryEvents = [{ status: "prepared" }]; },
    m => { m.recoveryEvents = [{ status: "completed" }]; }, m => { m.reports[0].attempts[0].status = "reference_settled_model_bound"; },
    m => { m.reports[0].slot = FD123_SLOTS[1]; }, m => { m.reports.push(m.reports[0]); },
    m => { m.reports[0].factsSha256 = "b".repeat(64); }, m => { m.originalLedgerSha256 = "b".repeat(64); },
    m => { m.reports[0].attempts[0].visibleUnacceptedOutput += " "; },
    m => { m.reports[0].attempts[0].accountingEvidence.responseSha256 = "b".repeat(64); },
    m => { m.reports[0].attempts[0].accountingEvidence.completionVerified = false; }]) {
    const value = structuredClone(retained); mutate(value); assert.throws(() => recover(value));
  }
  const rejectedModules = { ...modules, backend: { ...modules.backend, validateZiweiTopicDeepDiveQualityV4: () => ({ ok: false }) } };
  assert.throws(() => prepareFd123RetainedRecovery(retained, lineage, input, rejectedModules, retained.budget, { at: now() }), { code: "FD123_RECOVERY_QUALITY_FAILED" });
  assert.equal(JSON.stringify(retained), before);
});

test("only the exact root schema-document annotation normalizes; nested annotations and other extra content fields still reject", async () => {
  const modules = { contracts: await import("../packages/contracts/dist/index.js") };
  const stopped = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd123-monthly-retained-stop.json", import.meta.url), "utf8"));
  const raw = stopped.reports[3].attempts[0].outputText;
  assert.equal(modules.contracts.ZiweiPeriodReadingContentV1Schema.safeParse(JSON.parse(raw)).success, false);
  const normalized = normalizeTrialJson(raw);
  assert.equal(normalized.rawSha256, digest(raw)); assert.equal(normalized.normalization, "root_json_schema_annotation");
  assert.equal(modules.contracts.ZiweiPeriodReadingContentV1Schema.safeParse(normalized.value).success, true);
  assert.equal(Object.hasOwn(normalized.value, "$schema"), false);
  assert.equal(normalizeTrialJson(`\`\`\`json\n${raw}\n\`\`\``).normalization, "single_json_fence_and_root_json_schema_annotation");
  for (const uri of ["https://json-schema.org/draft/other/schema", "https://untrusted.invalid/schema", null, {}, 1]) {
    const value = JSON.parse(raw); value.$schema = uri;
    assert.throws(() => normalizeTrialJson(JSON.stringify(value)), { code: "FD123_JSON_SCHEMA_ANNOTATION_INVALID" });
  }
  for (const mutate of [v => { v.$id = "extra"; }, v => { v.overview.$schema = v.$schema; },
    v => { v.periods[0].$schema = v.$schema; }, v => { v.periods[0].unknown = "content"; }, v => { v.version = 2; }]) {
    const value = JSON.parse(raw); mutate(value);
    assert.equal(modules.contracts.ZiweiPeriodReadingContentV1Schema.safeParse(normalizeTrialJson(JSON.stringify(value)).value).success, false);
  }
  const document = modules.contracts.z.toJSONSchema(modules.contracts.ZiweiPeriodReadingContentV1Schema), before = JSON.stringify(document);
  const instruction = paidTrialSchemaInstruction(document);
  const projected = JSON.parse(instruction.split("Authoritative JSON output schema: ")[1]);
  assert.equal(projected.additionalProperties, false); assert.equal(Object.hasOwn(projected, "$schema"), false);
  const expected = structuredClone(document); delete expected.$schema; assert.deepEqual(projected, expected);
  assert.equal(JSON.stringify(document), before); assert.match(instruction, /never schema-document annotations/u);
});

test("historical four-row format stop refuses the new source finding while exact annotation normalization preserves bytes", async () => {
  const stopped = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd123-monthly-retained-stop.json", import.meta.url), "utf8"));
  const original = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-retained.json", import.meta.url), "utf8"));
  const preflight = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-preflight.json", import.meta.url), "utf8"));
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const inputs = await buildFd123Inputs(original, modules, preflight);
  const lineage = { originalJournalSha256: stopped.originalJournalSha256, originalLedgerSha256: stopped.originalLedgerSha256 };
  const { budget, ledgerPath } = fresh();
  for (const row of stopped.reports) {
    const attempt = row.attempts[0];
    const id = budget.reserveAttempt("v4.2-report", 33368, { attemptKey: attempt.attemptKey, trace: attempt.trace }); budget.markDispatched(id);
    budget.settleAttempt(id, { receipt: attempt.receipt, outputSha256: attempt.outputSha256, accountingEvidence: attempt.accountingEvidence, referenceMode: FD123_MODEL_BOUND_MODE });
  }
  assert.equal(budget.status().totalVnd, 133472); assert.equal(budget.status().openReservations, 0);
  const ledgerBefore = digest(readFileSync(ledgerPath)), before = JSON.stringify(stopped);
  const recover = value => prepareFd123RetainedFormatRecovery(value, lineage, inputs, modules, budget.status(), { at: now() });
  assert.throws(() => recover(stopped), { code: "FD123_FORMAT_RECOVERY_CONTENT_OR_REFERENCE_INVALID" });
  const recovered = normalizeTrialJson(stopped.reports[3].attempts[0].outputText);
  assert.equal(modules.backend.validatePeriodReading(modules.contracts.ZiweiPeriodReadingContentV1Schema.parse(recovered.value), inputs[3].facts).ok, true);
  assert.equal(recovered.normalization, "root_json_schema_annotation");
  assert.equal(recovered.rawSha256, stopped.reports[3].attempts[0].rawSha256);
  assert.notEqual(recovered.parsedSha256, stopped.reports[3].attempts[0].parsedSha256);
  assert.equal(JSON.stringify(stopped), before); assert.equal(digest(readFileSync(ledgerPath)), ledgerBefore);
  for (const mutate of [m => { m.status = "format_recovery_prepared"; }, m => { m.formatRecoveryEvents = [{status: "prepared"}]; },
    m => { m.reports[3].status = "quality_passed_pending_manual_review"; }, m => { m.reports[3].attempts[0].parsedSha256 = "b".repeat(64); },
    m => { m.reports[2].factsSha256 = "b".repeat(64); }, m => { m.reports[3].attempts[0].quote.quoteVnd = "1"; },
    m => { m.reports[3].attempts[0].accountingEvidence.envelopeComplete = true; }, m => { m.reports[3].attempts[0].outputText += " "; },
    m => { m.reports[0].result.value.content.title = "changed"; }, m => { m.manualAccepted = true; }]) {
    const value = structuredClone(stopped); mutate(value); assert.throws(() => recover(value));
  }
  const unsafe = { ...modules, backend: { ...modules.backend, validatePeriodReading: () => ({ok: false}) } };
  assert.throws(() => prepareFd123RetainedFormatRecovery(stopped, lineage, inputs, unsafe, budget.status(), { at: now() }), { code: "FD123_FORMAT_RECOVERY_CONTENT_OR_REFERENCE_INVALID" });
  const manifest = structuredClone(stopped); manifest.reports[3].status = "quality_passed_pending_manual_review";
  const dispatched = []; const { runTrialSequence } = await import("./run-paid-manual-trials.mjs");
  await runTrialSequence({ inputs: inputs.slice(4), manifest, save() {}, generate: async (_, row) => {
    dispatched.push(row.slot); return {ok: true, value: {quality: {ok: true}}};
  } });
  assert.deepEqual(dispatched, FD123_SLOTS.slice(4)); assert.equal(manifest.reports.length, 9);
  assert.equal(digest(readFileSync(ledgerPath)), ledgerBefore);
});


test("historical six-row recovery refuses the newly identified natal coordinate error while preserving proofs and ledger", async () => {
  const stopped = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd123-annual-retained-stop.json", import.meta.url), "utf8"));
  const original = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-retained.json", import.meta.url), "utf8"));
  const preflight = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-preflight.json", import.meta.url), "utf8"));
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const inputs = await buildFd123Inputs(original, modules, preflight);
  const lineage = { originalJournalSha256: stopped.originalJournalSha256, originalLedgerSha256: stopped.originalLedgerSha256 };
  const { budget, ledgerPath } = fresh();
  for (const row of stopped.reports) for (const attempt of row.attempts) {
    const id = budget.reserveAttempt("v4.2-report", 33368, { attemptKey: attempt.attemptKey, trace: attempt.trace }); budget.markDispatched(id);
    budget.settleAttempt(id, { receipt: attempt.receipt, outputSha256: attempt.outputSha256, accountingEvidence: attempt.accountingEvidence, referenceMode: FD123_MODEL_BOUND_MODE });
  }
  assert.equal(budget.status().totalVnd, 233576); assert.equal(budget.status().openReservations, 0);
  const ledgerBefore = digest(readFileSync(ledgerPath)), before = JSON.stringify(stopped);
  // The historical recovery authority stays pinned to v3; a newer runtime cannot resume it.
  assert.throws(() => prepareFd123RetainedQualityRecovery(stopped, lineage, inputs, modules, budget.status(), { at: now() }), {
    code: "FD123_QUALITY_RECOVERY_REQUIRES_RECONCILIATION",
  });
  // A test-only historical identity exercises its content gate with the actual current validators.
  const historicalIdentity = { ...modules, backend: { ...modules.backend,
    PERIOD_READING_TUPLE: { ...modules.backend.PERIOD_READING_TUPLE, qualityVersion: "ziwei.period-reading.quality.v3" },
  } };
  const recover = value => prepareFd123RetainedQualityRecovery(value, lineage, inputs, historicalIdentity, budget.status(), { at: now() });
  assert.throws(() => recover(stopped), { code: "FD123_QUALITY_RECOVERY_CONTENT_OR_REFERENCE_INVALID" });
  const retainedTopic = normalizeTrialJson(stopped.reports[2].attempts[0].outputText);
  const topicContent = modules.contracts.ZiweiTopicDeepDiveContentV1Schema.parse(retainedTopic.value);
  const retainedAnnual = normalizeTrialJson(stopped.reports[5].attempts[1].outputText);
  const annualContent = modules.contracts.ZiweiPeriodReadingContentV1Schema.parse(retainedAnnual.value);
  // Read-only diagnoses, not a successful campaign-recovery checkpoint.
  const recovered = {
    quality: modules.backend.validatePeriodReading(annualContent, inputs[5].facts),
    topicRepair: { content: topicContent, quality: modules.backend.validateZiweiTopicDeepDiveQualityV4(topicContent, inputs[2].facts) },
    rawSha256: retainedAnnual.rawSha256, parsedSha256: retainedAnnual.parsedSha256,
  };
  const relationship = stopped.reports[0].result.value.content;
  assert.equal(modules.backend.validateZiweiTopicDeepDiveQualityV4(relationship, inputs[0].facts).ok, false);
  assert.equal(recovered.quality.ok, true);
  assert.equal(recovered.topicRepair.quality.ok, false);
  assert.deepEqual(recovered.topicRepair.quality.findings.map(f => f.code), ["PALACE_FACTS"]);
  assert.deepEqual(recovered.topicRepair.content, stopped.reports[2].result.value.content);
  // Synthetic corrected provider fixture; retained traffic is never edited.
  const correctedFixture = structuredClone(recovered.topicRepair.content);
  correctedFixture.overview.narrative = correctedFixture.overview.narrative.replace("không có chính tinh trực chiếu", "không có chính tinh tọa thủ");
  let correctiveCalls = 0;
  const corrected = await modules.backend.writeZiweiTopicDeepDiveV4({ topicId: inputs[2].group, facts: inputs[2].facts, knowledgePacks: [],
    rewrite: { priorContent: recovered.topicRepair.content, findings: recovered.topicRepair.quality.findings },
    provider: { async generateStructured(request) {
      assert.equal(request.purpose, "rewrite"); correctiveCalls++;
      assert.match(request.user, /Opposing major-star absence/u);
      assert.match(request.system, /Nếu đối cung không có/u);
      return { ok: true, value: { value: correctedFixture, providerId: "fixture", modelId: "fixture" } };
    } } });
  assert.equal(corrected.ok && corrected.value.quality.ok, true); assert.equal(correctiveCalls, 1);
  const rejected = await modules.backend.writeZiweiTopicDeepDiveV4({ topicId: inputs[2].group, facts: inputs[2].facts, knowledgePacks: [],
    rewrite: { priorContent: recovered.topicRepair.content, findings: recovered.topicRepair.quality.findings },
    provider: { async generateStructured(request) { assert.equal(request.purpose, "rewrite"); return {ok: true, value: {value: recovered.topicRepair.content, providerId: "fixture", modelId: "fixture"}}; } } });
  assert.equal(rejected.ok && rejected.value.quality.ok, false);
  assert.equal(recovered.rawSha256, stopped.reports[5].attempts[1].rawSha256);
  assert.equal(recovered.parsedSha256, stopped.reports[5].attempts[1].parsedSha256);
  assert.equal(JSON.stringify(stopped), before); assert.equal(digest(readFileSync(ledgerPath)), ledgerBefore);
  for (const mutate of [m => { m.status = "quality_recovery_prepared"; }, m => { m.qualityRecoveryEvents = [{status: "prepared"}]; },
    m => { m.reports[5].attempts.pop(); }, m => { m.reports[5].attempts[1].outputText += " "; },
    m => { m.reports[5].attempts[0].quote.quoteVnd = "1"; }, m => { m.reports[5].result.findings = []; },
    m => { m.reports[0].result.value.content.title = "changed"; }, m => { m.manualAccepted = true; }]) {
    const value = structuredClone(stopped); mutate(value); assert.throws(() => recover(value));
  }
  const unsafe = { ...historicalIdentity, backend: { ...historicalIdentity.backend, validatePeriodReading: () => ({ok: false}) } };
  assert.throws(() => prepareFd123RetainedQualityRecovery(stopped, lineage, inputs, unsafe, budget.status(), { at: now() }), { code: "FD123_QUALITY_RECOVERY_CONTENT_OR_REFERENCE_INVALID" });
  const wrongVersion = { ...modules, backend: { ...modules.backend, PERIOD_READING_TUPLE: {qualityVersion: "ziwei.period-reading.quality.v2"} } };
  assert.throws(() => prepareFd123RetainedQualityRecovery(stopped, lineage, inputs, wrongVersion, budget.status(), { at: now() }));
  assert.throws(() => prepareFd123RetainedQualityRecovery(stopped, lineage, inputs, modules, {...budget.status(), openReservations: 1}, { at: now() }));
  assert.equal(digest(readFileSync(ledgerPath)), ledgerBefore);
});


test("actual unknown career dispatch cannot re-enter retained quality recovery", async () => {
  const stopped = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd123-paid-trials.json", import.meta.url), "utf8"));
  const original = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-retained.json", import.meta.url), "utf8"));
  const preflight = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-preflight.json", import.meta.url), "utf8"));
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const inputs = await buildFd123Inputs(original, modules, preflight);
  const lineage = { originalJournalSha256: stopped.originalJournalSha256, originalLedgerSha256: stopped.originalLedgerSha256 };
  const before = JSON.stringify(stopped);
  assert.equal(stopped.reports[2].attempts[1].errorCode, "ROUTER_RESPONSE_INVALID");
  assert.throws(() => prepareFd123RetainedQualityRecovery(stopped, lineage, inputs, modules, stopped.budget, { at: now() }), {
    code: "FD123_QUALITY_RECOVERY_REQUIRES_RECONCILIATION",
  });
  assert.equal(JSON.stringify(stopped), before);
});
