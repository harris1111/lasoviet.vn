import { createHash, randomUUID } from "node:crypto";

// Source-pinned 9router 0.5.95 mapping. This is not a live campaign entry point.
export const NATIVE_CAMPAIGN_ALIAS = "ag/gemini-3.8-flash";
export const NATIVE_CAMPAIGN_MODEL = "gemini-3.8-flash-medium";
export const NATIVE_CAMPAIGN_ENDPOINT = "https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent";
export const NATIVE_PRICING_SOURCE_HASH = "e844579f53d16e8765c6e740fccef351ad5abca76b34f6de5db945b86babc1e8";
const builtPreflights = new WeakSet();
export const isNativeCampaignPreflight = value => builtPreflights.has(value);
const counter = value => Number.isSafeInteger(value) && value >= 0;
const counters = ["promptTokenCount", "candidatesTokenCount", "cachedContentTokenCount", "thoughtsTokenCount", "totalTokenCount"];
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = code => { throw Object.assign(new Error(code), { code }); };

export function buildNativeCampaignPreflight({ system, user, maxOutputTokens, credential, deadlineMs = 60_000, now = () => new Date() }) {
  const at = now();
  if (!(at instanceof Date) || !Number.isFinite(at.getTime()) || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 120_000) fail("NATIVE_PREFLIGHT_INVALID_CLOCK");
  if (typeof system !== "string" || !system.trim() || typeof user !== "string" || !user.trim() || !Number.isSafeInteger(maxOutputTokens) || maxOutputTokens <= 0 || maxOutputTokens > 64_000) fail("NATIVE_PREFLIGHT_INVALID_REQUEST");
  if (!record(credential) || typeof credential.accessToken !== "string" || !credential.accessToken || credential.accessToken.length > 16_384 || /\s/.test(credential.accessToken) || typeof credential.projectId !== "string" || !/^[a-z][a-z0-9-]{4,127}$/.test(credential.projectId)) fail("NATIVE_CREDENTIAL_UNVERIFIED");
  const expiresAtMs = Date.parse(credential.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= at.getTime() + deadlineMs) fail("NATIVE_CREDENTIAL_EXPIRED");
  const effectiveMaxOutputTokens = Math.max(16_384, maxOutputTokens);
  const requestId = `agent/${randomUUID()}/${at.getTime()}/${randomUUID()}/1`;
  const payload = {
    project: credential.projectId, model: NATIVE_CAMPAIGN_MODEL, userAgent: "antigravity", requestId,
    request: {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: effectiveMaxOutputTokens, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "medium", includeThoughts: true } },
      sessionId: String(BigInt(`0x${createHash("sha256").update(requestId).digest("hex").slice(0, 15)}`)),
    },
  };
  const body = JSON.stringify(payload);
  if (Buffer.byteLength(body) > 2_000_000) fail("NATIVE_REQUEST_TOO_LARGE");
  // Secret-bearing headers/body are transient; only trace may be persisted as audit.
  const preflight = Object.freeze({
    endpoint: NATIVE_CAMPAIGN_ENDPOINT, body, deadlineMs, expiresAtMs,
    headers: Object.freeze({ "Content-Type": "application/json", Authorization: `Bearer ${credential.accessToken}`, "User-Agent": "antigravity/ide/2.11.0 darwin/arm64" }),
    trace: Object.freeze({ requestedAlias: NATIVE_CAMPAIGN_ALIAS, wireModel: NATIVE_CAMPAIGN_MODEL, requestId, effectiveMaxOutputTokens, requestSha256: createHash("sha256").update(body).digest("hex") }),
    executionReady: false,
    blockers: Object.freeze(["applicable_billing_basis_unverified", "private_route_thinking_output_bound_unverified"]),
  });
  builtPreflights.add(preflight);
  return preflight;
}

export function inspectNativeReceipt(payload) {
  const unknown = { rawCountersComplete: false, accountingStatus: "unverified" };
  if (!record(payload) || (payload.response !== undefined && !record(payload.response))) return unknown;
  const native = payload.response ?? payload;
  if (payload.response && payload.usageMetadata !== undefined) return unknown;
  if (!["gemini-3.8-flash", NATIVE_CAMPAIGN_MODEL].includes(native.modelVersion)) return unknown;
  const usage = native.usageMetadata;
  if (!record(usage)) return unknown;
  const presence = Object.fromEntries(counters.map(key => [key, Object.hasOwn(usage, key)]));
  if (counters.some(key => !counter(usage[key]))) return { ...unknown, counterPresence: presence };
  const [input, output, cached, reasoning, total] = counters.map(key => usage[key]);
  if (cached > input || !Number.isSafeInteger(input + output + reasoning) || total !== input + output + reasoning) return unknown;
  const allowed = new Set([...counters, "toolUsePromptTokenCount", "promptTokensDetails", "cacheTokensDetails", "candidatesTokensDetails", "toolUsePromptTokensDetails", "serviceTier"]);
  if (Object.keys(usage).some(key => !allowed.has(key)) || (usage.toolUsePromptTokenCount !== undefined && usage.toolUsePromptTokenCount !== 0) || (usage.serviceTier !== undefined && !["STANDARD", "SERVICE_TIER_UNSPECIFIED"].includes(usage.serviceTier))) return unknown;
  for (const key of ["promptTokensDetails", "cacheTokensDetails", "candidatesTokensDetails", "toolUsePromptTokensDetails"]) {
    if (usage[key] === undefined) continue;
    const expected = { promptTokensDetails: input, cacheTokensDetails: cached, candidatesTokensDetails: output, toolUsePromptTokensDetails: 0 }[key];
    if (!Array.isArray(usage[key]) || usage[key].length > 1 || usage[key].some(row => !record(row) || Object.keys(row).some(name => !["modality", "tokenCount"].includes(name)) || row.modality !== "TEXT" || !counter(row.tokenCount)) || usage[key].reduce((sum, row) => sum + row.tokenCount, 0) !== expected) return unknown;
  }
  // Preserve absent counters as absent; this intentionally rejects omitted zeros.
  return { rawCountersComplete: true, accountingStatus: "unverified", modelVersion: native.modelVersion, inputTokens: input, outputTokens: output, cachedTokens: cached, reasoningTokens: reasoning, totalTokens: total };
}

export function conservativeNativeEstimate(receipt) {
  if (!receipt?.rawCountersComplete || ![receipt.inputTokens, receipt.outputTokens, receipt.cachedTokens, receipt.reasoningTokens, receipt.totalTokens].every(counter) || receipt.cachedTokens > receipt.inputTokens || !Number.isSafeInteger(receipt.inputTokens + receipt.outputTokens + receipt.reasoningTokens) || receipt.totalTokens !== receipt.inputTokens + receipt.outputTokens + receipt.reasoningTokens) fail("NATIVE_ESTIMATE_USAGE_UNVERIFIED");
  // Twice the VND/million rate, using the existing frozen FX26110 reference.
  // This estimate is neither an invoice nor a permission/settlement proof.
  const twiceMicroVnd = BigInt(receipt.inputTokens - receipt.cachedTokens) * 78_330n + BigInt(receipt.outputTokens) * 391_650n + BigInt(receipt.cachedTokens) * 7_833n + BigInt(receipt.reasoningTokens) * 587_475n;
  const microVnd = (twiceMicroVnd + 1n) / 2n;
  return { quoteKind: "conservative_estimate", accountingStatus: "unverified", sourceHash: NATIVE_PRICING_SOURCE_HASH, fxReferenceVndPerUsd: 26_110, quoteMicroVnd: String(microVnd), quoteVnd: String((microVnd + 999_999n) / 1_000_000n), executionReady: false };
}
