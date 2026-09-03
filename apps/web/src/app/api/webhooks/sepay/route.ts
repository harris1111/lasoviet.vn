import { loadEnvironment } from "@lasoviet/config/load-environment";

const MAX_SECRET_HEADER_LENGTH = 512;

export async function POST(request: Request): Promise<Response> {
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.privateApiUrl === undefined) {
    return Response.json({ ok: false }, { status: 503 });
  }
  const secret = request.headers.get("x-secret-key");
  if (secret === null || secret.length === 0 || secret.length > MAX_SECRET_HEADER_LENGTH) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const rawBody = await request.text();
  const response = await fetch(`${environment.value.privateApiUrl}/commerce/webhooks/sepay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-secret-key": secret,
    },
    body: JSON.stringify({ rawBody }),
    cache: "no-store",
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
