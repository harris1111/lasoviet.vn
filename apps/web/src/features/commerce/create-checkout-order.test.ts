import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor.js";
import { privateApiClient, PrivateApiClientError } from "../../api/private-api-client.js";

vi.mock("server-only", () => ({}));
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

const validCheckoutStatus = {
  order: {
    id: "order-1",
    status: "pending",
    amount: 79000,
    currency: "VND",
    locale: "en",
  },
  paymentInstructions: {
    bankCode: "VCB",
    accountNumber: "123456789",
    accountHolder: "LA SO VIET",
    amount: 79000,
    currency: "VND",
    transferDescription: "LSV-order-1",
    qrUrl: "https://vietqr.app/img?acc=123456789&bank=VCB&amount=79000&des=LSV-order-1&template=compact",
    expiresAt: "2026-09-05T00:15:00.000Z",
  },
  reportId: null,
};

describe("create checkout order", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects anonymous or unverified purchase intent to the existing sign-in flow with public query and stable hash, containing no SKU", async () => {
    const { VerifiedAccountResolutionError } = await import(
      "../../auth/resolve-current-actor.js"
    );
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "vi", "ziwei-comprehensive");

    expect(privateApiClient).not.toHaveBeenCalled();
    const expectedTarget = encodeURIComponent("/la-so/chart-1/chon-luan-giai?offer=ziwei-comprehensive#ziwei-comprehensive");
    expect(redirect).toHaveBeenCalledWith(`/dang-nhap?callbackURL=${expectedTarget}`);
    const calledUrl = vi.mocked(redirect).mock.calls[0]![0];
    expect(calledUrl).not.toMatch(/ZIWEI-[A-Z0-9]+/);

    // Also verify EN locale
    vi.mocked(redirect).mockClear();
    await createCheckoutOrder("chart-1", "en", "ziwei-comprehensive");
    const expectedEnTarget = encodeURIComponent("/en/la-so/chart-1/chon-luan-giai?offer=ziwei-comprehensive#ziwei-comprehensive");
    expect(redirect).toHaveBeenCalledWith(`/en/dang-nhap?callbackURL=${expectedEnTarget}`);
  });

  it("rejects unknown offer key before auth or private API", async () => {
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await expect(createCheckoutOrder("chart-1", "vi", "unknown-offer")).rejects.toThrow(
      "CHECKOUT_OFFER_INVALID",
    );

    expect(resolveVerifiedAccountActor).not.toHaveBeenCalled();
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("creates an order only after resolving a verified account and sends mapped active SKU in server POST body", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: validCheckoutStatus,
      }),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "en", "ziwei-comprehensive");

    expect(privateApiClient).toHaveBeenCalledWith(actor, actor.requestId);
    expect(vi.mocked(privateApiClient).mock.results[0]?.value.request).toHaveBeenCalledWith(
      "/commerce/orders",
      expect.objectContaining({
        body: JSON.stringify({
          chartId: "chart-1",
          sku: "ZIWEI-IDENTITY-P0",
          locale: "en",
        }),
      }),
    );
    expect(redirect).toHaveBeenCalledWith("/en/thanh-toan/order-1");
  });

  it("rejects 19k excerpt offer in English checkout (Correction check 3)", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await expect(
      createCheckoutOrder("chart-1", "en", "ziwei-natal-excerpt"),
    ).rejects.toThrow("CHECKOUT_OFFER_UNSUPPORTED_FOR_LOCALE");
  });

  it("permits 19k excerpt offer in Vietnamese checkout and maps to ZIWEI-NATAL-EXCERPT-P0", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          ...validCheckoutStatus,
          order: {
            ...validCheckoutStatus.order,
            id: "order-excerpt-1",
            amount: 19000,
          },
        },
      }),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "vi", "ziwei-natal-excerpt");

    expect(vi.mocked(privateApiClient).mock.results[0]?.value.request).toHaveBeenCalledWith(
      "/commerce/orders",
      expect.objectContaining({
        body: JSON.stringify({
          chartId: "chart-1",
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          locale: "vi",
        }),
      }),
    );
    expect(redirect).toHaveBeenCalledWith("/thanh-toan/order-excerpt-1");
  });

  it("redirects directly to existing report when order is already paid with reportId", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          ...validCheckoutStatus,
          order: {
            ...validCheckoutStatus.order,
            status: "paid",
          },
          paymentInstructions: null,
          reportId: "report-paid-123",
        },
      }),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "vi", "ziwei-comprehensive");

    expect(redirect).toHaveBeenCalledWith("/bao-cao/report-paid-123");
  });

  it("redirects to report library when private API throws ENTITLEMENT_EXISTS error", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockRejectedValue(
        new PrivateApiClientError("ENTITLEMENT_EXISTS", 409),
      ),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "vi", "ziwei-comprehensive");

    expect(redirect).toHaveBeenCalledWith("/tai-khoan/bao-cao");
  });

  it("redirects to report library when response has ok: false and code: ENTITLEMENT_EXISTS", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: false,
        code: "ENTITLEMENT_EXISTS",
      }),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "en", "ziwei-comprehensive");

    expect(redirect).toHaveBeenCalledWith("/en/tai-khoan/bao-cao");
  });

  it("rejects unsupported checkout locales before it calls commerce", async () => {
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await expect(createCheckoutOrder("chart-1", "fr")).rejects.toThrow(
      "CHECKOUT_LOCALE_INVALID",
    );

    expect(resolveVerifiedAccountActor).not.toHaveBeenCalled();
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("encodes order ID containing path-special characters in the redirect URL", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          ...validCheckoutStatus,
          order: {
            ...validCheckoutStatus.order,
            id: "order/special#1?foo=bar",
          },
        },
      }),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "en");

    expect(redirect).toHaveBeenCalledWith("/en/thanh-toan/order%2Fspecial%231%3Ffoo%3Dbar");
  });

  it("throws CHECKOUT_ORDER_FAILED when create response fails schema parsing", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: { id: "order-1" },
        },
      }),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await expect(createCheckoutOrder("chart-1", "en")).rejects.toThrow("CHECKOUT_ORDER_FAILED");
  });

  describe("createCheckoutOrderAction wrapper for useActionState", () => {
    it("returns paused status when private API throws CHECKOUT_PAYMENTS_PAUSED and does not redirect", async () => {
      vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
      vi.mocked(privateApiClient).mockReturnValue({
        request: vi.fn().mockRejectedValue(
          new PrivateApiClientError("CHECKOUT_PAYMENTS_PAUSED", 503),
        ),
      });
      const { createCheckoutOrderAction } = await import("./create-checkout-order.js");

      const result = await createCheckoutOrderAction("chart-1", "vi", { status: "idle" });

      expect(result).toEqual({ status: "paused" });
      expect(redirect).not.toHaveBeenCalled();
    });

    it("re-throws when private API throws other errors without mislabeling paused", async () => {
      vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
      vi.mocked(privateApiClient).mockReturnValue({
        request: vi.fn().mockRejectedValue(
          new PrivateApiClientError("PRIVATE_API_UNREACHABLE", 500),
        ),
      });
      const { createCheckoutOrderAction } = await import("./create-checkout-order.js");

      await expect(
        createCheckoutOrderAction("chart-1", "vi", { status: "idle" }),
      ).rejects.toThrow("PRIVATE_API_UNREACHABLE");

      expect(redirect).not.toHaveBeenCalled();
    });

    it("executes successful checkout redirect normally", async () => {
      vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
      vi.mocked(privateApiClient).mockReturnValue({
        request: vi.fn().mockResolvedValue({
          ok: true,
          value: validCheckoutStatus,
        }),
      });
      const { createCheckoutOrderAction } = await import("./create-checkout-order.js");

      const result = await createCheckoutOrderAction("chart-1", "en", { status: "idle" });

      expect(result).toEqual({ status: "idle" });
      expect(redirect).toHaveBeenCalledWith("/en/thanh-toan/order-1");
    });

    it("handles bound action with offerKey", async () => {
      vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
      vi.mocked(privateApiClient).mockReturnValue({
        request: vi.fn().mockResolvedValue({
          ok: true,
          value: validCheckoutStatus,
        }),
      });
      const { createCheckoutOrderAction } = await import("./create-checkout-order.js");

      const bound = createCheckoutOrderAction.bind(null, "chart-1", "en", "ziwei-comprehensive");
      const result = await bound({ status: "idle" });

      expect(result).toEqual({ status: "idle" });
      expect(redirect).toHaveBeenCalledWith("/en/thanh-toan/order-1");
    });
  });
});
