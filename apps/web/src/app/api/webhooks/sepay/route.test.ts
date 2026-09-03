import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route.js";

describe("SePay public ingress", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards byte-identical provider body with only bounded required headers", async () => {
    vi.stubEnv("SEPAY_ENV", "sandbox");
    vi.stubEnv("SEPAY_MERCHANT_ID", "synthetic-merchant");
    vi.stubEnv("SEPAY_SECRET_KEY", "synthetic-secret");
    vi.stubEnv("PRIVATE_API_URL", "https://private-api.example.test");
    vi.stubEnv("INTERNAL_ACTOR_SECRET", "synthetic-internal-secret");
    const fetch = vi.fn(async (_url: string, init: RequestInit) => new Response(
      JSON.stringify({ ok: true }),
      { headers: { "content-type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetch);
    const bytes = new Uint8Array([0, 255, 10, 13, 123, 125]);

    await expect(POST(new Request("https://lasoviet.example/api/webhooks/sepay", {
      method: "POST",
      headers: { "content-type": "application/json", "x-secret-key": "synthetic-secret" },
      body: bytes,
    }))).resolves.toMatchObject({ status: 200 });

    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(new Uint8Array(init.body as ArrayBuffer)).toEqual(bytes);
    expect(init.headers).toEqual({
      "content-type": "application/json",
      "x-secret-key": "synthetic-secret",
      "x-internal-ingress-secret": "synthetic-internal-secret",
    });
  });
});
