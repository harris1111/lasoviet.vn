import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../../auth/resolve-current-actor", () => ({
  resolveCurrentActor: vi.fn(), resolveVerifiedAccountActor: vi.fn(),
  CurrentActorResolutionError: class extends Error {}, VerifiedAccountResolutionError: class extends Error {},
}));
vi.mock("../../api/private-api-client", () => ({ privateApiClient: vi.fn(), PrivateApiClientError: class extends Error {} }));
import { resolveCurrentActor, resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../../auth/resolve-current-actor";
import { privateApiClient } from "../../api/private-api-client";
import { POST as feedback } from "../../app/api/commerce/feedback/parts/route";
import { POST as guarantee } from "../../app/api/commerce/wallet/guarantee-claim/route";
import { loadRouteRegistry } from "@lasoviet/config";

const feedbackBody = { chartId: "chart-1", partId: "overview", rating: "accurate" };
const guaranteeBody = { chartId: "chart-1", partId: "overview", rating: "inaccurate", idempotencyKey: "claim-1" };

function buildRequest(
  url = "https://lasoviet.net/api/commerce/feedback/parts",
  headersInit: Record<string, string> = { origin: "https://lasoviet.net" },
  value: unknown = feedbackBody,
) {
  const headers = new Headers({ "content-type": "application/json", ...headersInit });
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(value),
  });
}

describe("feedback and guarantee HTTP boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects cross-origin commands before resolving or creating any session", async () => {
    expect((await feedback(buildRequest("https://lasoviet.net/api/commerce/feedback/parts", { origin: "https://other.example" }))).status).toBe(403);
    expect(resolveCurrentActor).not.toHaveBeenCalled();
  });

  it("rejects injected owner identity", async () => {
    expect((await feedback(buildRequest("https://lasoviet.net/api/commerce/feedback/parts", { origin: "https://lasoviet.net" }, { ...feedbackBody, userId: "victim" }))).status).toBe(400);
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("requires verified account authority for refunds", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    expect((await guarantee(buildRequest("https://lasoviet.net/api/commerce/wallet/guarantee-claim", { origin: "https://lasoviet.net" }, guaranteeBody))).status).toBe(401);
    expect(resolveCurrentActor).not.toHaveBeenCalled();
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("uses the server-resolved anonymous identity for owned free feedback and validates output", async () => {
    const actor = { kind: "anonymous" as const, anonymousActorId: "anon", sessionId: "session", requestId: "request", expiresAt: "2026-10-01T00:00:00Z" };
    vi.mocked(resolveCurrentActor).mockResolvedValue(actor);
    const output = { feedback: { ...feedbackBody, id: "feedback", reportId: null, comment: null, createdAt: "2026-09-30T00:00:00Z" } };
    const upstream = vi.fn().mockResolvedValue({ ok: true, value: output });
    vi.mocked(privateApiClient).mockReturnValue({ request: upstream });
    const response = await feedback(buildRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(privateApiClient).toHaveBeenCalledWith(actor, "request");
    await expect(response.json()).resolves.toEqual(output);
    upstream.mockResolvedValueOnce({ ok: true, value: { private: "invalid" } });
    expect((await feedback(buildRequest())).status).toBe(502);
  });

  it("registers both commands as private, live noindex and excluded from sitemaps", () => {
    for (const id of ["api.feedback.parts", "api.wallet.guarantee"]) {
      expect(loadRouteRegistry().find(route => route.id === id)).toMatchObject({ status: "live_noindex", private: true, robots: "noindex,nofollow", sitemap: false, localeBehavior: "unlocalized" });
    }
  });

  describe.each([
    ["feedback", feedback, "https://lasoviet.net/api/commerce/feedback/parts", feedbackBody, resolveCurrentActor],
    ["guarantee", guarantee, "https://lasoviet.net/api/commerce/wallet/guarantee-claim", guaranteeBody, resolveVerifiedAccountActor],
  ] as const)("%s origin and cross-site matrix", (_name, handler, url, validBody, actorSpy) => {
    it("accepts exact canonical origin irrespective of internal request URL (e.g. http://web:3000)", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const actor = { kind: "account" as const, userId: "user-1", email: "a@b.c", emailVerified: true, sessionId: "sess", requestId: "req-1" };
      vi.mocked(actorSpy).mockResolvedValue(actor as any);
      const upstream = vi.fn().mockResolvedValue({
        ok: true,
        value: _name === "feedback"
          ? { feedback: { ...feedbackBody, id: "fb-1", reportId: null, comment: null, createdAt: "2026-10-01T00:00:00Z" } }
          : {
              claimId: "claim-1",
              claimNumber: "CLM-001",
              status: "approved",
              amountLaRestored: 100,
              partId: "overview",
              sku: "free-result",
              balance: {
                version: 1,
                stateVersion: 2,
                purchasedLa: 100,
                promotionalLa: 0,
                totalLa: 100,
                updatedAt: "2026-10-01T00:00:00.000Z",
              },
              receipt: {
                version: 1,
                commandId: "cmd-1",
                transactionId: "tx-1",
                status: "completed",
                balance: {
                  version: 1,
                  stateVersion: 2,
                  purchasedLa: 100,
                  promotionalLa: 0,
                  totalLa: 100,
                  updatedAt: "2026-10-01T00:00:00.000Z",
                },
                completedAt: "2026-10-01T00:00:00.000Z",
              },
              relatedPalaceSuggestion: {
                palaceId: "ziwei.palace.career",
                palaceName: "Career Palace",
                relationType: "opposite",
                reason: "Look into opposite palace",
              },
              createdAt: "2026-10-01T00:00:00Z",
            },
      });
      vi.mocked(privateApiClient).mockReturnValue({ request: upstream });

      const internalUrl = url.replace("https://lasoviet.net", "http://web:3000");
      const res = await handler(buildRequest(internalUrl, { origin: "https://lasoviet.net" }, validBody));
      expect(res.status).toBe(200);
      expect(actorSpy).toHaveBeenCalled();
    });

    it.each([
      ["wrong external origin", { origin: "https://evil.com" }],
      ["reserved .vn domain", { origin: "https://lasoviet.vn" }],
      ["reserved .cloud domain", { origin: "https://lasoviet.cloud" }],
      ["insecure http canonical", { origin: "http://lasoviet.net" }],
      ["literal null string", { origin: "null" }],
      ["empty origin string", { origin: "" }],
      ["cross-site sec-fetch-site with canonical origin", { origin: "https://lasoviet.net", "sec-fetch-site": "cross-site" }],
      ["cross-site sec-fetch-site without origin", { "sec-fetch-site": "cross-site" }],
    ])("rejects %s with 403 before resolving actor or upstream", async (_caseName, headers) => {
      vi.stubEnv("NODE_ENV", "production");
      const res = await handler(buildRequest(url, headers, validBody));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ code: "REQUEST_ORIGIN_INVALID" });
      expect(actorSpy).not.toHaveBeenCalled();
      expect(privateApiClient).not.toHaveBeenCalled();
    });

    it("ignores spoofed Host and X-Forwarded headers when checking origin", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const res = await handler(buildRequest(
        url,
        {
          origin: "https://evil.com",
          host: "lasoviet.net",
          "x-forwarded-host": "lasoviet.net",
          "x-forwarded-proto": "https",
        },
        validBody,
      ));
      expect(res.status).toBe(403);
      expect(actorSpy).not.toHaveBeenCalled();
      expect(privateApiClient).not.toHaveBeenCalled();
    });

    it("allows local origin matching request URL ONLY in development mode", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const actor = { kind: "account" as const, userId: "user-1", email: "a@b.c", emailVerified: true, sessionId: "sess", requestId: "req-1" };
      vi.mocked(actorSpy).mockResolvedValue(actor as any);
      const upstream = vi.fn().mockResolvedValue({
        ok: true,
        value: _name === "feedback"
          ? { feedback: { ...feedbackBody, id: "fb-1", reportId: null, comment: null, createdAt: "2026-10-01T00:00:00Z" } }
          : {
              claimId: "claim-1",
              claimNumber: "CLM-001",
              status: "approved",
              amountLaRestored: 100,
              partId: "overview",
              sku: "free-result",
              balance: {
                version: 1,
                stateVersion: 2,
                purchasedLa: 100,
                promotionalLa: 0,
                totalLa: 100,
                updatedAt: "2026-10-01T00:00:00.000Z",
              },
              receipt: {
                version: 1,
                commandId: "cmd-1",
                transactionId: "tx-1",
                status: "completed",
                balance: {
                  version: 1,
                  stateVersion: 2,
                  purchasedLa: 100,
                  promotionalLa: 0,
                  totalLa: 100,
                  updatedAt: "2026-10-01T00:00:00.000Z",
                },
                completedAt: "2026-10-01T00:00:00.000Z",
              },
              relatedPalaceSuggestion: {
                palaceId: "ziwei.palace.career",
                palaceName: "Career Palace",
                relationType: "opposite",
                reason: "Look into opposite palace",
              },
              createdAt: "2026-10-01T00:00:00Z",
            },
      });
      vi.mocked(privateApiClient).mockReturnValue({ request: upstream });

      const devUrl = "http://localhost:3000/api/endpoint";
      const devRes = await handler(buildRequest(devUrl, { origin: "http://localhost:3000" }, validBody));
      expect(devRes.status).toBe(200);
      expect(actorSpy).toHaveBeenCalled();
    });

    it("denies local origin in production even if it matches request URL", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const devUrl = "http://localhost:3000/api/endpoint";
      const res = await handler(buildRequest(devUrl, { origin: "http://localhost:3000" }, validBody));
      expect(res.status).toBe(403);
      expect(actorSpy).not.toHaveBeenCalled();
      expect(privateApiClient).not.toHaveBeenCalled();
    });

    it("denies internal container origin in production even if it matches request URL", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const internalUrl = "http://web:3000/api/endpoint";
      const res = await handler(buildRequest(internalUrl, { origin: "http://web:3000" }, validBody));
      expect(res.status).toBe(403);
      expect(actorSpy).not.toHaveBeenCalled();
      expect(privateApiClient).not.toHaveBeenCalled();
    });

    it("preserves old contract when Origin is missing (null) and not cross-site", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const actor = { kind: "account" as const, userId: "user-1", email: "a@b.c", emailVerified: true, sessionId: "sess", requestId: "req-1" };
      vi.mocked(actorSpy).mockResolvedValue(actor as any);
      const upstream = vi.fn().mockResolvedValue({
        ok: true,
        value: _name === "feedback"
          ? { feedback: { ...feedbackBody, id: "fb-1", reportId: null, comment: null, createdAt: "2026-10-01T00:00:00Z" } }
          : {
              claimId: "claim-1",
              claimNumber: "CLM-001",
              status: "approved",
              amountLaRestored: 100,
              partId: "overview",
              sku: "free-result",
              balance: {
                version: 1,
                stateVersion: 2,
                purchasedLa: 100,
                promotionalLa: 0,
                totalLa: 100,
                updatedAt: "2026-10-01T00:00:00.000Z",
              },
              receipt: {
                version: 1,
                commandId: "cmd-1",
                transactionId: "tx-1",
                status: "completed",
                balance: {
                  version: 1,
                  stateVersion: 2,
                  purchasedLa: 100,
                  promotionalLa: 0,
                  totalLa: 100,
                  updatedAt: "2026-10-01T00:00:00.000Z",
                },
                completedAt: "2026-10-01T00:00:00.000Z",
              },
              relatedPalaceSuggestion: {
                palaceId: "ziwei.palace.career",
                palaceName: "Career Palace",
                relationType: "opposite",
                reason: "Look into opposite palace",
              },
              createdAt: "2026-10-01T00:00:00Z",
            },
      });
      vi.mocked(privateApiClient).mockReturnValue({ request: upstream });

      // No origin header provided in headersInit
      const res = await handler(buildRequest(url, {}, validBody));
      expect(res.status).toBe(200);
      expect(actorSpy).toHaveBeenCalled();
    });
  });
});
