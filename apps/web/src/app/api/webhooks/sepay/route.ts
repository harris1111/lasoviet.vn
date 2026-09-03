import { loadEnvironment } from "@lasoviet/config/load-environment";

const MAX_SECRET_HEADER_LENGTH = 512;

export async function POST(request: Request): Promise<Response> {
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.privateApiUrl === undefined) {
    return Response.json({ ok: false }, { status: 503 });
  }
  const secret = request.headers.get("x-secret-key");
  const contentType = request.headers.get("content-type");
  if (secret === null || secret.length === 0 || secret.length > MAX_SECRET_HEADER_LENGTH || contentType === null || contentType.length > 128) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const rawBody = await request.arrayBuffer();
  const response = await fetch(`${environment.value.privateApiUrl}/commerce/webhooks/sepay`, {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-secret-key": secret,
      "x-internal-ingress-secret": environment.value.internalActorSecret ?? "",
    },
    body: rawBody,
    cache: "no-store",
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
