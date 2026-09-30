import { beforeEach, describe, expect, it, vi } from "vitest";
import { membershipProxy } from "./membership-proxy";
import { privateApiClient } from "./private-api-client";
import { resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../auth/resolve-current-actor";
vi.mock("./private-api-client", () => ({ privateApiClient: vi.fn(), PrivateApiClientError: class extends Error {} }));
vi.mock("../auth/resolve-current-actor", () => ({ resolveVerifiedAccountActor: vi.fn(), VerifiedAccountResolutionError: class extends Error {} }));
const actor = { kind: "account" as const, userId: "member", sessionId: "session", requestId: "request" };
describe("private membership proxy", () => {
  beforeEach(() => vi.resetAllMocks());
  it("requires a verified session before issuing commands", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    const response = await membershipProxy(new Request("https://lasoviet.net/api/commerce/membership"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(privateApiClient).not.toHaveBeenCalled();
  });
  it("forwards the explicit purchase once and returns a private projection", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const command = { purchaseIntentId: "intent", expectedWalletVersion: 2, expectedIntentVersion: 1, idempotencyKey: "confirmed" };
    const request = vi.fn().mockResolvedValue({ ok: true, value: { subscriptionId: "period", balance: { totalLa: 500 } } });
    vi.mocked(privateApiClient).mockReturnValue({ request });
    const response = await membershipProxy(new Request("https://lasoviet.net/api/commerce/membership/purchase", { method: "POST", body: JSON.stringify(command) }), "purchase");
    expect(request).toHaveBeenCalledExactlyOnceWith("/commerce/membership/purchase", expect.objectContaining({ method: "POST", body: JSON.stringify(command) }));
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.json()).toMatchObject({ subscriptionId: "period" });
  });
});
