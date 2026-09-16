import { describe, expect, it, vi } from "vitest";

import { createAssetDownloadRouteHandler } from "./route.js";

const actor = {
  kind: "account" as const,
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

const signedUrl =
  "http://garage:3900/reports/asset-1.pdf?X-Amz-Signature=private-signature";
const futureExpiresAt = "2026-09-16T12:05:00.000Z";
const testNow = new Date("2026-09-16T12:00:00.000Z");
const assetId = "6fb69d4a-88af-4d5e-a54f-3f3de45ab25f";

type RequestMock = ReturnType<
  typeof vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>
>;

function context(id = assetId) {
  return { params: Promise.resolve({ assetId: id }) };
}

function createHandler(options: {
  grant?: unknown;
  resolveActor?: () => Promise<typeof actor>;
  request?: RequestMock;
  fetch?: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;
  now?: () => Date;
} = {}) {
  const request =
    options.request ??
    vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>().mockResolvedValue(
      options.grant ?? { url: signedUrl, expiresAt: futureExpiresAt },
    );

  return {
    request,
    handler: createAssetDownloadRouteHandler({
      now: options.now ?? (() => testNow),
      resolveActor: options.resolveActor ?? (async () => actor),
      apiClient: () => ({
        request: async <T>(path: string, init?: RequestInit): Promise<T> => {
          const result =
            init === undefined ? await request(path) : await request(path, init);
          return result as T;
        },
      }),
      fetch:
        options.fetch ??
        (async () =>
          new Response(new Uint8Array([37, 80, 68, 70, 45]), {
            headers: { "content-type": "application/pdf; charset=binary" },
          })),
    }),
  };
}

describe("GET /api/downloads/[assetId]", () => {
  it("proxies the PDF stream with no-store and a safe attachment filename", async () => {
    const garageFetch = vi.fn(async () =>
      new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("%PDF-1.7"));
          controller.close();
        },
      }), {
        headers: { "content-type": "application/pdf; charset=binary" },
      }),
    );
    const { handler, request } = createHandler({ fetch: garageFetch });

    const response = await handler(
      new Request(`https://lasoviet.example/api/downloads/${assetId}`),
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="lasoviet-report-${assetId}.pdf"`,
    );
    expect(await response.text()).toBe("%PDF-1.7");
    expect(request).toHaveBeenCalledWith(`/assets/${assetId}/download`);
    expect(garageFetch).toHaveBeenCalledWith(new URL(signedUrl), {
      redirect: "manual",
    });
  });

  it("returns indistinguishable 404 responses for anonymous, malformed, missing, and cross-owner requests", async () => {
    const authFailure = createHandler({
      resolveActor: async () => {
        throw new Error("not verified");
      },
    });
    const malformed = createHandler();
    const notFoundError = Object.assign(new Error("not found"), {
      name: "PrivateApiClientError",
      code: "ASSET_FORBIDDEN",
      status: 404,
    });
    const missing = createHandler({
      request: vi.fn().mockRejectedValue(notFoundError),
    });

    const responses = await Promise.all([
      authFailure.handler(
        new Request(`https://lasoviet.example/api/downloads/${assetId}`),
        context(),
      ),
      malformed.handler(
        new Request("https://lasoviet.example/api/downloads/not%2Fan%2Fasset"),
        context("not/an/asset"),
      ),
      malformed.handler(
        new Request("https://lasoviet.example/api/downloads/not-a-uuid"),
        context("not-a-uuid"),
      ),
      missing.handler(
        new Request(`https://lasoviet.example/api/downloads/${assetId}`),
        context(),
      ),
    ]);

    const details = await Promise.all(responses.map(async (response) => ({
      status: response.status,
      cacheControl: response.headers.get("cache-control"),
      body: await response.text(),
    })));
    expect(details).toEqual([
      { status: 404, cacheControl: "no-store", body: "" },
      { status: 404, cacheControl: "no-store", body: "" },
      { status: 404, cacheControl: "no-store", body: "" },
      { status: 404, cacheControl: "no-store", body: "" },
    ]);
    expect(malformed.request).not.toHaveBeenCalled();
  });

  it.each([
    [{ url: signedUrl, expiresAt: futureExpiresAt, unexpected: true }],
    [{ url: "https://garage:3900/report.pdf", expiresAt: futureExpiresAt }],
    [{ url: "http://user@garage:3900/report.pdf", expiresAt: futureExpiresAt }],
    [{ url: `${signedUrl}#fragment`, expiresAt: futureExpiresAt }],
    [{ url: signedUrl, expiresAt: "2026-09-16T11:59:59.999Z" }],
  ])("fails closed with 503 for invalid grant %#", async (grant) => {
    const garageFetch = vi.fn();
    const { handler } = createHandler({ grant, fetch: garageFetch });

    const response = await handler(
      new Request(`https://lasoviet.example/api/downloads/${assetId}`),
      context(),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
    expect(garageFetch).not.toHaveBeenCalled();
  });

  it("rejects redirects from Garage", async () => {
    const { handler } = createHandler({
      fetch: async () =>
        new Response(null, {
          status: 302,
          headers: {
            location: "http://garage:3900/other.pdf",
            "content-type": "application/pdf",
          },
        }),
    });

    await expect(
      handler(
        new Request(`https://lasoviet.example/api/downloads/${assetId}`),
        context(),
      ),
    ).resolves.toMatchObject({ status: 503 });
  });

  it("maps Garage fetch failures, non-2xx responses, and invalid PDFs to 503", async () => {
    const fetchFailure = createHandler({
      fetch: async () => {
        throw new Error("Garage unavailable");
      },
    });
    const nonSuccess = createHandler({
      fetch: async () =>
        new Response("unavailable", {
          status: 503,
          headers: { "content-type": "application/pdf" },
        }),
    });
    const nonPdf = createHandler({
      fetch: async () =>
        new Response("not a PDF", {
          headers: { "content-type": "text/plain" },
        }),
    });
    const invalidPdfBody = createHandler({
      fetch: async () =>
        new Response("not a PDF", {
          headers: { "content-type": "application/pdf" },
        }),
    });
    const truncatedPdfBody = createHandler({
      fetch: async () =>
        new Response("%PD", {
          headers: { "content-type": "application/pdf" },
        }),
    });

    const responses = await Promise.all([
      fetchFailure.handler(
        new Request(`https://lasoviet.example/api/downloads/${assetId}`),
        context(),
      ),
      nonSuccess.handler(
        new Request(`https://lasoviet.example/api/downloads/${assetId}`),
        context(),
      ),
      nonPdf.handler(
        new Request(`https://lasoviet.example/api/downloads/${assetId}`),
        context(),
      ),
      invalidPdfBody.handler(
        new Request(`https://lasoviet.example/api/downloads/${assetId}`),
        context(),
      ),
      truncatedPdfBody.handler(
        new Request(`https://lasoviet.example/api/downloads/${assetId}`),
        context(),
      ),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).toBe("");
    }
  });

  it("validates a chunked PDF signature and replays the checked chunks", async () => {
    const { handler } = createHandler({
      fetch: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("%P"));
              controller.enqueue(new TextEncoder().encode("DF-1.7"));
              controller.enqueue(new TextEncoder().encode("\nbody"));
              controller.close();
            },
          }),
          { headers: { "content-type": "application/pdf" } },
        ),
    });

    const response = await handler(
      new Request(`https://lasoviet.example/api/downloads/${assetId}`),
      context(),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("%PDF-1.7\nbody");
  });

  it("never leaks a signed URL or object key in a browser response", async () => {
    const objectKey = "reports/private-object-key.pdf";
    const privateUrl =
      `http://garage:3900/${objectKey}?X-Amz-Signature=private-signature`;
    const { handler } = createHandler({
      grant: { url: privateUrl, expiresAt: futureExpiresAt },
    });

    const response = await handler(
      new Request(`https://lasoviet.example/api/downloads/${assetId}`),
      context(),
    );
    const body = await response.text();
    const browserResponse = [
      body,
      ...Array.from(response.headers.entries()).flat(),
    ].join("\n");

    expect(response.status).toBe(200);
    expect(browserResponse).not.toContain(privateUrl);
    expect(browserResponse).not.toContain(objectKey);
    expect(browserResponse).not.toContain("private-signature");
  });
});
