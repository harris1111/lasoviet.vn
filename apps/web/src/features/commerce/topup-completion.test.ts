import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn() }));
vi.mock("../../api/private-api-client", () => ({ privateApiClient: vi.fn() }));
import { privateApiClient } from "../../api/private-api-client";
import { loadTopUpCompletion } from "./topup-completion";

const actor = { kind: "account" as const, userId: "owner", sessionId: "session", requestId: "request" };
const orderId = "11111111-1111-4111-8111-111111111111";
const continuation = { status: "completed" as const, unlockedSku: "ZIWEI-NATAL-EXCERPT-P0", returnPath: `/la-so/chart?tab=palaces&topupOrder=${orderId}&open=life`, reportId: "report", remainingLa: 60, errorCode: null };
const value = {
  order: { id: orderId, kind: "wallet_topup", status: "paid", amount: 29000, currency: "VND", locale: "vi", productTitle: "Nhập môn", paymentCode: "LSV000000001", chartId: null, createdAt: "2026-09-30T09:00:00.000Z", creditApplied: 0, creditExpiresAt: null, creditedLa: 300, supportUrl: "/lien-he", continuation },
  paymentInstructions: null, reportId: null,
};

describe("owned top-up completion notice", () => {
  beforeEach(() => vi.resetAllMocks());
  it("loads only a completed, paid order for this chart through the authenticated API", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, value });
    vi.mocked(privateApiClient).mockReturnValue({ request });
    expect(await loadTopUpCompletion(actor, orderId, "/la-so/chart")).toEqual(continuation);
    expect(privateApiClient).toHaveBeenCalledWith(actor, "request");
    expect(request).toHaveBeenCalledExactlyOnceWith(`/commerce/orders/${orderId}`);
    expect(await loadTopUpCompletion(actor, orderId, "/la-so/another-chart")).toBeNull();
  });
  it.each(["pending", "blocked"])("never displays an uncompleted %s result", async (status) => {
    vi.mocked(privateApiClient).mockReturnValue({ request: vi.fn().mockResolvedValue({ ok: true, value: { ...value, order: { ...value.order, continuation: { ...continuation, status } } } }) });
    expect(await loadTopUpCompletion(actor, orderId, "/la-so/chart")).toBeNull();
  });
  it("rejects invalid identifiers and unauthorized responses without leaking details", async () => {
    expect(await loadTopUpCompletion(actor, "invalid", "/la-so/chart")).toBeNull();
    expect(privateApiClient).not.toHaveBeenCalled();
    vi.mocked(privateApiClient).mockReturnValue({ request: vi.fn().mockResolvedValue({ ok: false, error: { code: "ORDER_NOT_FOUND" } }) });
    expect(await loadTopUpCompletion(actor, orderId, "/la-so/chart")).toBeNull();
  });
});
