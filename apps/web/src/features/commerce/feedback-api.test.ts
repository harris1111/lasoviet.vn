import { beforeEach, describe, expect, it, vi } from "vitest";
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

const body = { chartId: "chart-1", partId: "overview", rating: "accurate" };
function request(value: unknown = body, origin = "https://lasoviet.net") {
  return new Request("https://lasoviet.net/api/commerce/feedback/parts", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(value) });
}
describe("feedback HTTP boundary", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects cross-origin commands before resolving or creating any session", async () => {
    expect((await feedback(request(body, "https://other.example"))).status).toBe(403);
    expect(resolveCurrentActor).not.toHaveBeenCalled();
  });
  it("rejects injected owner identity", async () => {
    expect((await feedback(request({ ...body, userId: "victim" }))).status).toBe(400);
    expect(privateApiClient).not.toHaveBeenCalled();
  });
  it("requires verified account authority for refunds", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    expect((await guarantee(request({ ...body, rating: "inaccurate", idempotencyKey: "claim-1" }))).status).toBe(401);
    expect(resolveCurrentActor).not.toHaveBeenCalled();
    expect(privateApiClient).not.toHaveBeenCalled();
  });
  it("uses the server-resolved anonymous identity for owned free feedback and validates output", async () => {
    const actor = { kind: "anonymous" as const, anonymousActorId: "anon", sessionId: "session", requestId: "request", expiresAt: "2026-10-01T00:00:00Z" };
    vi.mocked(resolveCurrentActor).mockResolvedValue(actor);
    const output = { feedback: { ...body, id: "feedback", reportId: null, comment: null, createdAt: "2026-09-30T00:00:00Z" } };
    const upstream = vi.fn().mockResolvedValue({ ok: true, value: output });
    vi.mocked(privateApiClient).mockReturnValue({ request: upstream });
    const response = await feedback(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(privateApiClient).toHaveBeenCalledWith(actor, "request");
    await expect(response.json()).resolves.toEqual(output);
    upstream.mockResolvedValueOnce({ ok: true, value: { private: "invalid" } });
    expect((await feedback(request())).status).toBe(502);
  });
  it("registers both commands as private, live noindex and excluded from sitemaps", () => {
    for (const id of ["api.feedback.parts", "api.wallet.guarantee"]) {
      expect(loadRouteRegistry().find(route => route.id === id)).toMatchObject({ status: "live_noindex", private: true, robots: "noindex,nofollow", sitemap: false, localeBehavior: "unlocalized" });
    }
  });
});
