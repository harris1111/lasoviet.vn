import { loadEnvironment } from "@lasoviet/config/load-environment";

const MAX_SECRET_HEADER_LENGTH = 512;
const MAX_SIGNATURE_HEADER_LENGTH = 128;
const MAX_TIMESTAMP_HEADER_LENGTH = 32;

export async function POST(request: Request): Promise<Response> {
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.privateApiUrl === undefined) {
    return Response.json({ ok: false }, { status: 503 });
  }

  const secret = request.headers.get("x-secret-key");
  const signature = request.headers.get("x-sepay-signature");
  const timestamp = request.headers.get("x-sepay-timestamp");
  const contentType = request.headers.get("content-type");

  if (contentType === null || contentType.length > 128) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const hasSecret = secret !== null && secret.length > 0 && secret.length <= MAX_SECRET_HEADER_LENGTH;
  const hasHmac = (
    signature !== null &&
    signature.length > 0 &&
    signature.length <= MAX_SIGNATURE_HEADER_LENGTH &&
    timestamp !== null &&
    timestamp.length > 0 &&
    timestamp.length <= MAX_TIMESTAMP_HEADER_LENGTH
  );

  // Exactly one authentication mode must be present and valid
  if (!hasSecret && !hasHmac) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (hasSecret && hasHmac) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const forwardHeaders: Record<string, string> = {
    "content-type": contentType,
    "x-internal-ingress-secret": environment.value.internalActorSecret ?? "",
  };

  if (hasSecret) {
    forwardHeaders["x-secret-key"] = secret;
  } else if (hasHmac) {
    forwardHeaders["x-sepay-signature"] = signature;
    forwardHeaders["x-sepay-timestamp"] = timestamp;
  }

  const rawBody = await request.arrayBuffer();
  const response = await fetch(`${environment.value.privateApiUrl}/commerce/webhooks/sepay`, {
    method: "POST",
    headers: forwardHeaders,
    body: rawBody,
    cache: "no-store",
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
