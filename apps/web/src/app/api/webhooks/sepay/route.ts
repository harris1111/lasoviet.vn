import { loadEnvironment } from "@lasoviet/config/load-environment";

const MAX_SECRET_HEADER_LENGTH = 512;
const MAX_SIGNATURE_HEADER_LENGTH = 128;
const MAX_TIMESTAMP_HEADER_LENGTH = 32;
const MAX_WEBHOOK_BODY_BYTES = 65_536;

type BoundedBodyResult =
  | { ok: true; body: Uint8Array }
  | { ok: false; status: number };

async function readBoundedBody(request: Request): Promise<BoundedBodyResult> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const trimmed = contentLengthHeader.trim();
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed.toString() !== trimmed) {
      return { ok: false, status: 400 };
    }
    if (parsed > MAX_WEBHOOK_BODY_BYTES) {
      return { ok: false, status: 413 };
    }
  }

  if (request.body === null) {
    return { ok: true, body: new Uint8Array(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_WEBHOOK_BODY_BYTES) {
        await reader.cancel("PAYLOAD_TOO_LARGE");
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error) {
      return { ok: false, status: 413 };
    }
    return { ok: false, status: 400 };
  }

  const concatenated = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    concatenated.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body: concatenated };
}

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

  const bodyResult = await readBoundedBody(request);
  if (!bodyResult.ok) {
    return Response.json({ ok: false }, { status: bodyResult.status });
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

  const response = await fetch(`${environment.value.privateApiUrl}/commerce/webhooks/sepay`, {
    method: "POST",
    headers: forwardHeaders,
    body: bodyResult.body.buffer as ArrayBuffer,
    cache: "no-store",
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
