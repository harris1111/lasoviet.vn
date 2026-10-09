import { createHash, randomUUID } from "node:crypto";
import { createRequire, registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { request } from "node:https";

export const ROUTER_IMAGE = "sha256:edb54b1be50b4c4e518b138c859e957cf16f80539e88731928d1a4e918fe33e3";
export const ROUTER_SOURCE_HASHES = Object.freeze({
  "executors/antigravity.js": "ee6c7f02113e4d1c474662b3e7cde3f55b14088c4688fef3a7d5dc531db98d90",
  "executors/base.js": "ff76f5fc9be0103b847b864ce831859ec17e5da73fdbef30d4404c3bae3db717",
  "translator/concerns/thinkingUnified.js": "24899d8f9fdad837353584b0c18bc2ce3deca524346ea2367190144556cb0519",
  "config/providerModels.js": "7dc5c2b19b8775c907e0dbb9ccaef47976b25708f845b28a8b79536aef43e9d0",
  "providers/capabilities.js": "311187e32476742a18a6731fb35beef3c752b6949673bd9e7fb6fe7b38d813e1",
});
const MODEL = "gemini-3.8-flash-medium";
const ENDPOINT = "https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent";
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hash = value => createHash("sha256").update(value).digest("hex");

// A child-process-only isolation hook. These services are never allowed in the
// text-only transform; their compiled deployment dependencies are absent on disk.
// Calling either substituted function fails rather than refreshing or writing DB.
export function isolateUnusedRouterServices() {
  const blocked = {
    "file:///app/open-sse/services/oauthCredentialManager.js": "export function shouldRefreshCredentials(){throw new Error('PRIVATE_REFRESH_FORBIDDEN')}",
    "file:///app/open-sse/services/thoughtSignatureStore.js": "export function getGeminiThoughtSignatureSync(){throw new Error('PRIVATE_SIGNATURE_FORBIDDEN')}",
  };
  registerHooks({ resolve(specifier, context, next) {
    const url = context.parentURL ? new URL(specifier, context.parentURL).href : specifier;
    if (blocked[url]) return { url: `data:text/javascript,${encodeURIComponent(blocked[url])}`, shortCircuit: true };
    return next(specifier, context);
  } });
}

export async function prepareInstalledRequest(input, { now = () => new Date() } = {}) {
  for (const [path, expected] of Object.entries(ROUTER_SOURCE_HASHES)) {
    if (hash(readFileSync(`/app/open-sse/${path}`)) !== expected) fail("ROUTER_SOURCE_CHANGED");
  }
  if (JSON.parse(readFileSync("/app/package.json", "utf8")).version !== "0.5.99") fail("ROUTER_VERSION_CHANGED");
  if (typeof input.system !== "string" || !input.system.trim() || typeof input.user !== "string" || !input.user.trim() ||
      !Number.isSafeInteger(input.maxOutputTokens) || input.maxOutputTokens < 1 || input.maxOutputTokens > 64000) fail("ROUTER_REQUEST_INVALID");
  const at = now();
  const require = createRequire("file:///app/package.json");
  const Database = require("better-sqlite3");
  const db = new Database("/app/data/db/data.sqlite", { readonly: true, fileMustExist: true });
  let credential;
  try {
    credential = db.prepare("SELECT data FROM providerConnections WHERE provider='antigravity' AND isActive=1 ORDER BY priority, id").all()
      .map(row => JSON.parse(row.data)).find(row => row.accessToken && row.projectId && Date.parse(row.expiresAt) > at.getTime() + 120000 &&
        (!row.rateLimitedUntil || Date.parse(row.rateLimitedUntil) <= at.getTime()) && !row[`modelLock_${MODEL}`]);
  } finally { db.close(); }
  if (!credential) fail("ROUTER_CREDENTIAL_UNAVAILABLE");
  isolateUnusedRouterServices();
  const [{ default: Executor }, { getModelUpstreamId }, { applyThinking, stripThinkingSuffix }, { getCapabilitiesForModel }] = await Promise.all([
    import("file:///app/open-sse/executors/antigravity.js"), import("file:///app/open-sse/config/providerModels.js"),
    import("file:///app/open-sse/translator/concerns/thinkingUnified.js"), import("file:///app/open-sse/providers/capabilities.js"),
  ]);
  const upstream = getModelUpstreamId("ag", MODEL), wireModel = stripThinkingSuffix(upstream);
  const caps = getCapabilitiesForModel("ag", upstream);
  if (wireModel !== MODEL || caps.contextWindow !== 1048576 || caps.maxOutput !== 65536) fail("ROUTER_MODEL_CHANGED");
  const requestId = `agent/${randomUUID()}/${at.getTime()}/${randomUUID()}/1`;
  const envelope = { model: wireModel, requestId, request: {
    systemInstruction: { parts: [{ text: input.system }] }, contents: [{ role: "user", parts: [{ text: input.user }] }],
    generationConfig: { candidateCount: 1, maxOutputTokens: Math.max(16384, input.maxOutputTokens), responseMimeType: "application/json" },
    sessionId: String(BigInt(`0x${hash(requestId).slice(0, 15)}`)),
  } };
  applyThinking("antigravity", upstream, envelope, "antigravity");
  const executor = new Executor();
  const native = executor.transformRequest(wireModel, envelope, false, credential);
  const endpoint = executor.buildUrl(wireModel, false, 0);
  const gc = native.request?.generationConfig;
  if (endpoint !== ENDPOINT || native.model !== MODEL || native.project !== credential.projectId || native.requestId !== requestId ||
      native.requestType !== undefined || native.request?.tools !== undefined || gc?.maxOutputTokens !== Math.max(16384, input.maxOutputTokens) ||
      gc?.thinkingConfig?.thinkingLevel !== "medium" || gc?.thinkingConfig?.includeThoughts !== true) fail("ROUTER_WIRE_UNVERIFIED");
  const body = JSON.stringify(native);
  if (Buffer.byteLength(body) > 1000000) fail("ROUTER_REQUEST_TOO_LARGE");
  return { endpoint, body, headers: executor.buildHeaders(credential, false), expiresAtMs: Date.parse(credential.expiresAt),
    trace: { requestedAlias: "ag/gemini-3.8-flash", wireModel, requestId, effectiveMaxOutputTokens: gc.maxOutputTokens, requestSha256: hash(body) },
    bounds: { inputTokens: caps.contextWindow, outputTokens: caps.maxOutput, reasoningTokens: caps.maxOutput } };
}

export async function dispatchOnce(prepared, { requestImpl = request, now = () => new Date() } = {}) {
  if (prepared.endpoint !== ENDPOINT || hash(prepared.body) !== prepared.trace.requestSha256 || prepared.expiresAtMs <= now().getTime() + 120000) fail("ROUTER_DISPATCH_INVALID");
  return new Promise((resolve, reject) => {
    let req, res, done = false;
    const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); if (error) { req?.destroy(); res?.destroy(); reject(error); } else resolve(value); };
    const timer = setTimeout(() => finish(Object.assign(new Error("ROUTER_TIMEOUT"), { code: "ROUTER_TIMEOUT" })), 120000);
    try {
      req = requestImpl(ENDPOINT, { method: "POST", agent: false, rejectUnauthorized: true,
        headers: { ...prepared.headers, "Content-Length": Buffer.byteLength(prepared.body) } }, response => {
        res = response;
        if (res.statusCode !== 200) { finish(Object.assign(new Error("ROUTER_HTTP_STATUS"), { code: "ROUTER_HTTP_STATUS", httpStatus: res.statusCode })); return; }
        let size = 0; const chunks = [];
        res.on("data", chunk => { size += chunk.length; if (size > 2000000) finish(Object.assign(new Error("ROUTER_RESPONSE_TOO_LARGE"), { code: "ROUTER_RESPONSE_TOO_LARGE" })); else chunks.push(chunk); });
        res.once("error", () => finish(Object.assign(new Error("ROUTER_TRANSPORT_ERROR"), { code: "ROUTER_TRANSPORT_ERROR" })));
        res.once("aborted", () => finish(Object.assign(new Error("ROUTER_TRANSPORT_ERROR"), { code: "ROUTER_TRANSPORT_ERROR" })));
        res.once("end", () => { try {
          const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")), native = payload.response ?? payload;
          const candidate = native.candidates?.[0];
          if (native.candidates?.length !== 1 || candidate?.finishReason !== "STOP" || candidate.content?.role !== "model" ||
              !Array.isArray(candidate.content.parts) || candidate.content.parts.some(p => typeof p.text !== "string" ||
                Object.keys(p).some(k => !["text", "thought", "thoughtSignature"].includes(k)) || (p.thought !== undefined && typeof p.thought !== "boolean"))) fail("ROUTER_CANDIDATE_INVALID");
          const outputText = candidate.content.parts.filter(p => p.thought !== true).map(p => p.text).join("");
          if (!outputText.trim()) fail("ROUTER_CANDIDATE_INVALID");
          // Raw counters preserve absence, including absent zeros. Neither raw
          // response nor thought text can leave this process or enter its logs.
          finish(null, { outputText, receipt: { modelVersion: native.modelVersion, usageMetadata: native.usageMetadata },
            conflictingUsage: payload.response !== undefined && payload.usageMetadata !== undefined });
        } catch { finish(Object.assign(new Error("ROUTER_RESPONSE_INVALID"), { code: "ROUTER_RESPONSE_INVALID" })); } });
      });
      req.once("error", () => finish(Object.assign(new Error("ROUTER_TRANSPORT_ERROR"), { code: "ROUTER_TRANSPORT_ERROR" })));
      if (done) req.destroy(); else req.end(prepared.body);
    } catch { finish(Object.assign(new Error("ROUTER_TRANSPORT_ERROR"), { code: "ROUTER_TRANSPORT_ERROR" })); }
  });
}

export async function runBridge({ input = process.stdin, emit = value => process.stdout.write(JSON.stringify(value) + "\n"), prepare = prepareInstalledRequest, send = dispatchOnce } = {}) {
  const lines = createInterface({ input, crlfDelay: Infinity });
  const iterator = lines[Symbol.asyncIterator]();
  try {
    const first = await iterator.next();
    if (first.done || first.value.length > 1000000) fail("ROUTER_PROTOCOL_INVALID");
    const prepared = await prepare(JSON.parse(first.value));
    emit({ type: "prepared", trace: prepared.trace, bounds: prepared.bounds, expiresAtMs: prepared.expiresAtMs });
    const second = await iterator.next();
    if (second.done || second.value.length > 1000) fail("ROUTER_PROTOCOL_INVALID");
    const ack = JSON.parse(second.value);
    if (ack.type !== "dispatch" || ack.requestSha256 !== prepared.trace.requestSha256) fail("ROUTER_PROTOCOL_INVALID");
    emit({ type: "result", ...await send(prepared) });
  } catch (error) {
    emit({ type: "failure", code: /^ROUTER_[A-Z_]+$/.test(error.code ?? "") ? error.code : "ROUTER_BRIDGE_FAILED",
      ...(Number.isInteger(error.httpStatus) ? { httpStatus: error.httpStatus } : {}) });
  } finally { lines.close(); }
}
