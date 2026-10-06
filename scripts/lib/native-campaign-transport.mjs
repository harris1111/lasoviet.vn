import { request as httpsRequest } from "node:https";
import { performance } from "node:perf_hooks";
import { NATIVE_CAMPAIGN_ENDPOINT, isNativeCampaignPreflight } from "./native-campaign-preflight.mjs";

const error = code => Object.assign(new Error(code), { code });

// A private primitive, not an activated provider. The caller must durably reserve,
// mark dispatch and audit the trace before returning true from beforeSend.
export async function sendNativeOnce(preflight, { beforeSend, requestImpl = httpsRequest, now = () => new Date() } = {}) {
  if (!isNativeCampaignPreflight(preflight) || preflight.endpoint !== NATIVE_CAMPAIGN_ENDPOINT || typeof beforeSend !== "function" || !Number.isSafeInteger(preflight.deadlineMs) || preflight.deadlineMs < 1 || preflight.deadlineMs > 120_000) throw error("NATIVE_DISPATCH_NOT_AUTHORIZED");
  // The installed static quote does not authorize live dispatch. Only injected
  // synthetic/local TLS transports are usable in this preflight milestone.
  if (requestImpl === httpsRequest) throw error("NATIVE_LIVE_GATE_UNVERIFIED");
  const body = preflight.body;
  const headers = { ...preflight.headers, "Content-Length": Buffer.byteLength(body) };
  const started = performance.now();
  if (preflight.expiresAtMs <= now().getTime() + preflight.deadlineMs) throw error("NATIVE_CREDENTIAL_EXPIRED");
  if (await beforeSend(preflight.trace) !== true) throw error("NATIVE_DISPATCH_NOT_AUTHORIZED");
  const remainingMs = Math.floor(preflight.deadlineMs - (performance.now() - started));
  if (remainingMs <= 0 || preflight.expiresAtMs <= now().getTime() + remainingMs) throw error("NATIVE_DEADLINE_EXCEEDED");
  return await new Promise((resolve, reject) => {
    let req, response, timer, finished = false;
    const finish = (failure, value) => {
      if (finished) return;
      finished = true; clearTimeout(timer);
      if (failure) { req?.destroy(); response?.destroy(); reject(failure); }
      else resolve(value);
    };
    timer = setTimeout(() => finish(error("NATIVE_DEADLINE_EXCEEDED")), remainingMs);
    try {
      req = requestImpl(NATIVE_CAMPAIGN_ENDPOINT, { method: "POST", agent: false, rejectUnauthorized: true, headers }, res => {
        response = res;
        const httpStatus = res.statusCode;
        if (httpStatus !== 200) { finish(Object.assign(error("NATIVE_HTTP_STATUS"), { httpStatus })); return; }
        let bytes = 0; const chunks = [];
        res.on("data", chunk => {
          bytes += chunk.length;
          if (bytes > 2_000_000) finish(error("NATIVE_RESPONSE_TOO_LARGE"));
          else chunks.push(chunk);
        });
        res.once("error", () => finish(error("NATIVE_TRANSPORT_ERROR")));
        res.once("aborted", () => finish(error("NATIVE_TRANSPORT_ERROR")));
        res.once("end", () => {
          try { finish(null, { httpStatus, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }); }
          catch { finish(error("NATIVE_RESPONSE_INVALID_JSON")); }
        });
      });
      req.once("error", () => finish(error("NATIVE_TRANSPORT_ERROR")));
      if (finished) req.destroy();
      else req.end(body);
    } catch { finish(error("NATIVE_TRANSPORT_ERROR")); }
  });
}
