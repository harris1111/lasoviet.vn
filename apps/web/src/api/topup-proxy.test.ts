import { beforeEach, describe, expect, it, vi } from "vitest";
import { topupProxy } from "./topup-proxy";
import { privateApiClient, PrivateApiClientError } from "./private-api-client";
import { resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../auth/resolve-current-actor";
import { sendServerAnalyticsEvent } from "../analytics/server-analytics";
vi.mock("./private-api-client", () => ({ privateApiClient: vi.fn(), PrivateApiClientError: class extends Error { constructor(public code: string, public status?: number) { super(code); } } }));
vi.mock("../auth/resolve-current-actor", () => ({ resolveVerifiedAccountActor: vi.fn(), VerifiedAccountResolutionError: class extends Error {} }));
vi.mock("../analytics/server-analytics", () => ({ sendServerAnalyticsEvent: vi.fn().mockResolvedValue({ ok: true }) }));
const actor = { kind: "account" as const, userId: "member", sessionId: "session", requestId: "request" };
const continuation = { purchaseIntentId: "11111111-1111-4111-8111-111111111111", expectedIntentVersion: 2, confirmedPriceLa: 840, returnTab: "palaces", returnOpen: "life" };
const input = { packId: "LA-START-1100", locale: "vi", continuation };
const checkout = { order: { id: "order", kind: "wallet_topup", status: "pending", amount: 99000, currency: "VND", locale: "vi", productTitle: "Pack", paymentCode: "LSV12345", chartId: null,
  createdAt: "2026-10-06T12:00:00Z", creditApplied: 0, creditExpiresAt: null, creditedLa: null, supportUrl: "/lien-he" },
  paymentInstructions: { bankCode: "VCB", accountNumber: "00000000", accountHolder: "TEST ONLY", amount: 99000, currency: "VND", transferDescription: "TEST ONLY",
    qrUrl: "https://vietqr.app/fixture.png", expiresAt: "2026-10-06T12:15:00Z" }, reportId: null };
function request(body: unknown = input, origin = "https://lasoviet.net") { return new Request("https://lasoviet.net/api/commerce/wallet/top-up-orders", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }); }
describe("verified inline payment commands", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor); });
  it("rejects cross-site before resolving an actor", async () => {
    expect((await topupProxy(request(input, "https://attacker.test"))).status).toBe(403);
    expect(resolveVerifiedAccountActor).not.toHaveBeenCalled();
  });
  it("requires verified account and never forwards anonymous commands", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    const result = await topupProxy(request()); expect(result.status).toBe(401); expect(privateApiClient).not.toHaveBeenCalled();
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it.each([{ ...input, locale: "xx" }, { ...input, packId: "made-up" }, { ...input, continuation: { ...continuation, returnTab: "https://attacker.test" } }, { ...input, ownerId: "victim" }])("rejects malformed or additional fields", async value => {
    expect((await topupProxy(request(value))).status).toBe(400); expect(privateApiClient).not.toHaveBeenCalled();
  });
  it("issues one private create with exact confirmed terms and emits stable checkout attribution", async () => {
    const forward = vi.fn().mockResolvedValue({ ok: true, value: checkout }); vi.mocked(privateApiClient).mockReturnValue({ request: forward });
    const result = await topupProxy(request()); expect(result.status).toBe(200); expect(await result.json()).toEqual(checkout);
    expect(forward).toHaveBeenCalledExactlyOnceWith("/commerce/wallet/top-up-orders", expect.objectContaining({ method: "POST", body: JSON.stringify(input) }));
    expect(result.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(sendServerAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "checkout_created", idempotencyKey: "checkout-created:order", properties: { sku: "LA-START-1100", amount: 99000, currency: "VND" } }));
  });
  it("rejects non-topup and untrusted QR projections", async () => {
    const forward = vi.fn().mockResolvedValue({ ok: true, value: { ...checkout, paymentInstructions: { ...checkout.paymentInstructions, qrUrl: "https://attacker.test/qr" } } });
    vi.mocked(privateApiClient).mockReturnValue({ request: forward }); expect((await topupProxy(request())).status).toBe(502);
    expect(sendServerAnalyticsEvent).not.toHaveBeenCalled();
    forward.mockResolvedValue({ ok: true, value: { ...checkout, order: { ...checkout.order, kind: "content_purchase" } } });
    expect((await topupProxy(request())).status).toBe(502);
  });
  it("retains the server error code without disclosing extra upstream fields", async () => {
    vi.mocked(privateApiClient).mockReturnValue({ request: vi.fn().mockRejectedValue(new PrivateApiClientError("CHECKOUT_PAYMENTS_PAUSED", 409)) });
    const result = await topupProxy(request()); expect(result.status).toBe(409); expect(await result.json()).toEqual({ code: "CHECKOUT_PAYMENTS_PAUSED" });
  });
  it("self-claim reuses authenticated reconciliation and validates its receipt", async () => {
    const forward = vi.fn().mockResolvedValue({ ok: true, value: { status: "claimed", orderId: "11111111-1111-4111-8111-111111111111", kind: "wallet_topup", creditedLa: 1100 } });
    vi.mocked(privateApiClient).mockReturnValue({ request: forward });
    const result = await topupProxy(request({ amount: 99000, transferredAtLocal: "2026-10-06T19:00" }), "self-claim");
    expect(result.status).toBe(200); expect(await result.json()).toMatchObject({ status: "claimed", kind: "wallet_topup", creditedLa: 1100 });
    expect(forward).toHaveBeenCalledExactlyOnceWith("/commerce/payments/self-claim", expect.objectContaining({ method: "POST" }));
    expect(sendServerAnalyticsEvent).not.toHaveBeenCalled();
  });
});
