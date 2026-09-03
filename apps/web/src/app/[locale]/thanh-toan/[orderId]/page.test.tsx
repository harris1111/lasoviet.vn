import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { privateApiClient } from "../../../../api/private-api-client";
import {
  resolveVerifiedAccountActor,
} from "../../../../auth/resolve-current-actor";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn() }));
vi.mock("../../../../api/private-api-client", () => ({ privateApiClient: vi.fn() }));
vi.mock("../../../../auth/resolve-current-actor", () => ({
  VerifiedAccountResolutionError: class VerifiedAccountResolutionError extends Error {},
  resolveVerifiedAccountActor: vi.fn(),
}));

const actor = {
  kind: "account" as const,
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

const copy = {
  vi: {
    "checkout.eyebrow": "Thanh toán",
    "checkout.title": "Luận giải bản mệnh",
    "checkout.action": "Đi tới SePay",
    "checkout.status.pending": "Đang chờ thanh toán",
  },
  en: {
    "checkout.eyebrow": "Payment",
    "checkout.title": "Identity reading",
    "checkout.action": "Continue to SePay",
    "checkout.status.pending": "Awaiting payment",
  },
};

describe("checkout page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
  });

  it.each([
    ["vi", "Thanh toán", "Đi tới SePay"],
    ["en", "Payment", "Continue to SePay"],
  ] as const)("renders %s copy from the authoritative order locale", async (locale, eyebrow, action) => {
    vi.mocked(getTranslations).mockResolvedValue(
      ((key: keyof typeof copy.vi) => copy[locale][key]) as never,
    );
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "pending",
            amount: 79_000,
            currency: "VND",
            locale,
          },
          payment: { action: "https://pay-sandbox.sepay.vn/v1/checkout/init", fields: {} },
        },
      }),
    });
    const { default: CheckoutPage } = await import("./page.js");

    const html = renderToStaticMarkup(await CheckoutPage({
      params: Promise.resolve({ locale, orderId: "order-1" }),
    }));

    expect(html).toContain(eyebrow);
    expect(html).toContain(action);
  });

  it("redirects a mismatched route locale to the authoritative checkout route", async () => {
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "pending",
            amount: 79_000,
            currency: "VND",
            locale: "vi",
          },
          payment: { action: "https://pay-sandbox.sepay.vn/v1/checkout/init", fields: {} },
        },
      }),
    });
    const { default: CheckoutPage } = await import("./page.js");

    await CheckoutPage({
      params: Promise.resolve({ locale: "en", orderId: "order-1" }),
    });

    expect(redirect).toHaveBeenCalledWith("/thanh-toan/order-1");
    expect(getTranslations).not.toHaveBeenCalled();
  });
});
