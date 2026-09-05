import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveVerifiedAccountActor,
} from "../../auth/resolve-current-actor.js";
import { privateApiClient } from "../../api/private-api-client.js";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../auth/resolve-current-actor.js", () => ({
  VerifiedAccountResolutionError: class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
    }
  },
  resolveVerifiedAccountActor: vi.fn(),
}));
vi.mock("../../api/private-api-client.js", () => ({ privateApiClient: vi.fn() }));

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

  it("redirects anonymous or unverified purchase intent to the existing sign-in flow without calling commerce", async () => {
    const { VerifiedAccountResolutionError } = await import(
      "../../auth/resolve-current-actor.js"
    );
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "vi");

    expect(privateApiClient).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "/dang-nhap?callbackURL=%2Fla-so%2Fchart-1%2Fchon-luan-giai",
    );
  });

  it("creates an order only after resolving a verified account", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: validCheckoutStatus,
      }),
    });
    const { createCheckoutOrder } = await import("./create-checkout-order.js");

    await createCheckoutOrder("chart-1", "en");

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
});
