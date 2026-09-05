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
    vi.stubEnv("SEPAY_BANK_CODE", "VCB");
    vi.stubEnv("SEPAY_ACCOUNT_NUMBER", "123456789");
    vi.stubEnv("SEPAY_ACCOUNT_HOLDER", "LA SO VIET");
    vi.stubEnv("SEPAY_ORDER_TTL_SECONDS", "900");
    vi.stubEnv("SEPAY_WEBHOOK_SECRET", "synthetic-webhook-secret");
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
  it("forwards byte-identical provider body with HMAC headers when signature and timestamp are present", async () => {
    vi.stubEnv("SEPAY_ENV", "sandbox");
    vi.stubEnv("SEPAY_MERCHANT_ID", "synthetic-merchant");
    vi.stubEnv("SEPAY_SECRET_KEY", "synthetic-secret");
    vi.stubEnv("SEPAY_BANK_CODE", "VCB");
    vi.stubEnv("SEPAY_ACCOUNT_NUMBER", "123456789");
    vi.stubEnv("SEPAY_ACCOUNT_HOLDER", "LA SO VIET");
    vi.stubEnv("SEPAY_ORDER_TTL_SECONDS", "900");
    vi.stubEnv("SEPAY_WEBHOOK_SECRET", "synthetic-webhook-secret");
    vi.stubEnv("PRIVATE_API_URL", "https://private-api.example.test");
    vi.stubEnv("INTERNAL_ACTOR_SECRET", "synthetic-internal-secret");
    const fetch = vi.fn(async (_url: string, init: RequestInit) => new Response(
      JSON.stringify({ ok: true }),
      { headers: { "content-type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetch);
    const bytes = new Uint8Array([10, 20, 30, 40]);

    await expect(POST(new Request("https://lasoviet.example/api/webhooks/sepay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sepay-signature": "sha256=abcdef123456",
        "x-sepay-timestamp": "1757066400",
      },
      body: bytes,
    }))).resolves.toMatchObject({ status: 200 });

    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(new Uint8Array(init.body as ArrayBuffer)).toEqual(bytes);
    expect(init.headers).toEqual({
      "content-type": "application/json",
      "x-sepay-signature": "sha256=abcdef123456",
      "x-sepay-timestamp": "1757066400",
      "x-internal-ingress-secret": "synthetic-internal-secret",
    });
  });

  it("rejects when no auth headers are provided", async () => {
    vi.stubEnv("SEPAY_ENV", "sandbox");
    vi.stubEnv("SEPAY_MERCHANT_ID", "synthetic-merchant");
    vi.stubEnv("SEPAY_SECRET_KEY", "synthetic-secret");
    vi.stubEnv("SEPAY_BANK_CODE", "VCB");
    vi.stubEnv("SEPAY_ACCOUNT_NUMBER", "123456789");
    vi.stubEnv("SEPAY_ACCOUNT_HOLDER", "LA SO VIET");
    vi.stubEnv("SEPAY_ORDER_TTL_SECONDS", "900");
    vi.stubEnv("SEPAY_WEBHOOK_SECRET", "synthetic-webhook-secret");
    vi.stubEnv("PRIVATE_API_URL", "https://private-api.example.test");
    vi.stubEnv("INTERNAL_ACTOR_SECRET", "synthetic-internal-secret");
    await expect(POST(new Request("https://lasoviet.example/api/webhooks/sepay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new Uint8Array([1, 2, 3]),
    }))).resolves.toMatchObject({ status: 401 });
  });

  it("rejects with 413 when declared content-length exceeds 65536 bytes without calling private API", async () => {
    vi.stubEnv("SEPAY_ENV", "sandbox");
    vi.stubEnv("SEPAY_MERCHANT_ID", "synthetic-merchant");
    vi.stubEnv("SEPAY_SECRET_KEY", "synthetic-secret");
    vi.stubEnv("SEPAY_BANK_CODE", "VCB");
    vi.stubEnv("SEPAY_ACCOUNT_NUMBER", "123456789");
    vi.stubEnv("SEPAY_ACCOUNT_HOLDER", "LA SO VIET");
    vi.stubEnv("SEPAY_ORDER_TTL_SECONDS", "900");
    vi.stubEnv("SEPAY_WEBHOOK_SECRET", "synthetic-webhook-secret");
    vi.stubEnv("PRIVATE_API_URL", "https://private-api.example.test");
    vi.stubEnv("INTERNAL_ACTOR_SECRET", "synthetic-internal-secret");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await POST(new Request("https://lasoviet.example/api/webhooks/sepay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "65537",
        "x-secret-key": "synthetic-secret",
      },
      body: new Uint8Array([1, 2, 3]),
    }));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects with 413 when undeclared stream body exceeds 65536 bytes without calling private API", async () => {
    vi.stubEnv("SEPAY_ENV", "sandbox");
    vi.stubEnv("SEPAY_MERCHANT_ID", "synthetic-merchant");
    vi.stubEnv("SEPAY_SECRET_KEY", "synthetic-secret");
    vi.stubEnv("SEPAY_BANK_CODE", "VCB");
    vi.stubEnv("SEPAY_ACCOUNT_NUMBER", "123456789");
    vi.stubEnv("SEPAY_ACCOUNT_HOLDER", "LA SO VIET");
    vi.stubEnv("SEPAY_ORDER_TTL_SECONDS", "900");
    vi.stubEnv("SEPAY_WEBHOOK_SECRET", "synthetic-webhook-secret");
    vi.stubEnv("PRIVATE_API_URL", "https://private-api.example.test");
    vi.stubEnv("INTERNAL_ACTOR_SECRET", "synthetic-internal-secret");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    let cancelled = false;
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(40_000));
      },
      cancel() {
        cancelled = true;
      },
    });

    const req = new Request("https://lasoviet.example/api/webhooks/sepay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-secret-key": "synthetic-secret",
      },
      body: stream,
      // @ts-expect-error duplex required in Node fetch for ReadableStream bodies
      duplex: "half",
    });
    expect(req.headers.get("content-length")).toBeNull();

    const response = await POST(req);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
    expect(cancelled).toBe(true);
  });

  it("fails closed when content-length header is malformed without calling private API", async () => {
    vi.stubEnv("SEPAY_ENV", "sandbox");
    vi.stubEnv("SEPAY_MERCHANT_ID", "synthetic-merchant");
    vi.stubEnv("SEPAY_SECRET_KEY", "synthetic-secret");
    vi.stubEnv("SEPAY_BANK_CODE", "VCB");
    vi.stubEnv("SEPAY_ACCOUNT_NUMBER", "123456789");
    vi.stubEnv("SEPAY_ACCOUNT_HOLDER", "LA SO VIET");
    vi.stubEnv("SEPAY_ORDER_TTL_SECONDS", "900");
    vi.stubEnv("SEPAY_WEBHOOK_SECRET", "synthetic-webhook-secret");
    vi.stubEnv("PRIVATE_API_URL", "https://private-api.example.test");
    vi.stubEnv("INTERNAL_ACTOR_SECRET", "synthetic-internal-secret");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await POST(new Request("https://lasoviet.example/api/webhooks/sepay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "not-a-number",
        "x-secret-key": "synthetic-secret",
      },
      body: new Uint8Array([1, 2, 3]),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});
