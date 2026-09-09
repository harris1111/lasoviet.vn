import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { resolveVerifiedAccountActor } from "../../auth/resolve-current-actor.js";
import { privateApiClient, PrivateApiClientError } from "../../api/private-api-client.js";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../auth/resolve-current-actor.js", () => ({
  VerifiedAccountResolutionError: class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
    }
  },
  resolveVerifiedAccountActor: vi.fn(),
}));
vi.mock("../../api/private-api-client.js", () => {
  class MockPrivateApiClientError extends Error {
    readonly code: string;
    readonly status: number | undefined;
    constructor(code: string, status?: number) {
      super(code);
      this.name = "PrivateApiClientError";
      this.code = code;
      this.status = status;
    }
  }
  return {
    privateApiClient: vi.fn(),
    PrivateApiClientError: MockPrivateApiClientError,
  };
});

const actor = {
  kind: "account" as const,
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

describe("payment self-claim action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
  });

  it("validates amount and exact local minute before API call and rejects invalid inputs without calling API", async () => {
    const { submitPaymentSelfClaim } = await import("./payment-self-claim.js");

    // Missing amount
    const fd1 = new FormData();
    fd1.set("transferredAtLocal", "2026-09-09T05:00");
    const res1 = await submitPaymentSelfClaim({ status: "idle" }, fd1);
    expect(res1.status).toBe("invalid_input");
    expect(privateApiClient).not.toHaveBeenCalled();

    // Invalid amount <= 0
    const fd2 = new FormData();
    fd2.set("amount", "0");
    fd2.set("transferredAtLocal", "2026-09-09T05:00");
    const res2 = await submitPaymentSelfClaim({ status: "idle" }, fd2);
    expect(res2.status).toBe("invalid_input");
    expect(privateApiClient).not.toHaveBeenCalled();

    // Invalid time with seconds
    const fd3 = new FormData();
    fd3.set("amount", "79000");
    fd3.set("transferredAtLocal", "2026-09-09T05:00:00");
    const res3 = await submitPaymentSelfClaim({ status: "idle" }, fd3);
    expect(res3.status).toBe("invalid_input");
    expect(privateApiClient).not.toHaveBeenCalled();

    // Invalid time string (not ISO minute)
    const fd4 = new FormData();
    fd4.set("amount", "79000");
    fd4.set("transferredAtLocal", "yesterday");
    const res4 = await submitPaymentSelfClaim({ status: "idle" }, fd4);
    expect(res4.status).toBe("invalid_input");
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("posts only bounded fields (amount, transferredAtLocal) and redirects to locale-correct report on success for vi", async () => {
    const mockRequest = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        status: "claimed",
        orderId: "ord-123",
        reportId: "rep-456",
      },
    });
    vi.mocked(privateApiClient).mockReturnValue({ request: mockRequest });

    const { submitPaymentSelfClaim } = await import("./payment-self-claim.js");

    const fd = new FormData();
    fd.set("orderId", "ord-123");
    fd.set("locale", "vi");
    fd.set("amount", "79,000");
    fd.set("transferredAtLocal", "2026-09-09T05:30");

    await submitPaymentSelfClaim({ status: "idle" }, fd);

    expect(privateApiClient).toHaveBeenCalledWith(actor, actor.requestId);
    expect(mockRequest).toHaveBeenCalledWith(
      "/commerce/payments/self-claim",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          amount: 79000,
          transferredAtLocal: "2026-09-09T05:30",
        }),
      }),
    );
    expect(redirect).toHaveBeenCalledWith("/bao-cao/rep-456");
  });

  it("redirects to locale-correct report on success for en", async () => {
    const mockRequest = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        status: "claimed",
        orderId: "ord-123",
        reportId: "rep-789",
      },
    });
    vi.mocked(privateApiClient).mockReturnValue({ request: mockRequest });

    const { submitPaymentSelfClaim } = await import("./payment-self-claim.js");

    const fd = new FormData();
    fd.set("orderId", "ord-123");
    fd.set("locale", "en");
    fd.set("amount", "79000");
    fd.set("transferredAtLocal", "2026-09-09T05:30");

    await submitPaymentSelfClaim({ status: "idle" }, fd);

    expect(redirect).toHaveBeenCalledWith("/en/bao-cao/rep-789");
  });

  it("maps PAYMENT_CLAIM_NOT_FOUND to approved generic state without candidate detail", async () => {
    const mockRequest = vi.fn().mockRejectedValue(
      new PrivateApiClientError("PAYMENT_CLAIM_NOT_FOUND", 404),
    );
    vi.mocked(privateApiClient).mockReturnValue({ request: mockRequest });

    const { submitPaymentSelfClaim } = await import("./payment-self-claim.js");

    const fd = new FormData();
    fd.set("amount", "79000");
    fd.set("transferredAtLocal", "2026-09-09T05:30");

    const res = await submitPaymentSelfClaim({ status: "idle" }, fd);

    expect(res).toEqual({
      status: "payment_not_found",
      code: "payment_not_found",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("maps PAYMENT_CLAIM_RATE_LIMITED to approved generic state", async () => {
    const mockRequest = vi.fn().mockRejectedValue(
      new PrivateApiClientError("PAYMENT_CLAIM_RATE_LIMITED", 429),
    );
    vi.mocked(privateApiClient).mockReturnValue({ request: mockRequest });

    const { submitPaymentSelfClaim } = await import("./payment-self-claim.js");

    const fd = new FormData();
    fd.set("amount", "79000");
    fd.set("transferredAtLocal", "2026-09-09T05:30");

    const res = await submitPaymentSelfClaim({ status: "idle" }, fd);

    expect(res).toEqual({
      status: "rate_limited",
      code: "rate_limited",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("maps unexpected service failure to temporary service_unavailable state", async () => {
    const mockRequest = vi.fn().mockRejectedValue(
      new PrivateApiClientError("PRIVATE_API_UNREACHABLE", 500),
    );
    vi.mocked(privateApiClient).mockReturnValue({ request: mockRequest });

    const { submitPaymentSelfClaim } = await import("./payment-self-claim.js");

    const fd = new FormData();
    fd.set("amount", "79000");
    fd.set("transferredAtLocal", "2026-09-09T05:30");

    const res = await submitPaymentSelfClaim({ status: "idle" }, fd);

    expect(res).toEqual({
      status: "service_unavailable",
      code: "service_unavailable",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated or unverified user to sign-in flow", async () => {
    const { VerifiedAccountResolutionError } = await import(
      "../../auth/resolve-current-actor.js"
    );
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );

    const { submitPaymentSelfClaim } = await import("./payment-self-claim.js");

    const fd = new FormData();
    fd.set("orderId", "ord-123");
    fd.set("locale", "vi");
    fd.set("amount", "79000");
    fd.set("transferredAtLocal", "2026-09-09T05:30");

    await submitPaymentSelfClaim({ status: "idle" }, fd);

    expect(redirect).toHaveBeenCalledWith(
      "/dang-nhap?callbackURL=%2Fthanh-toan%2Ford-123",
    );
  });
});
