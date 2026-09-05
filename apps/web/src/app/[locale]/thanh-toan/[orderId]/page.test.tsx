import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { privateApiClient } from "../../../../api/private-api-client.js";
import {
  resolveVerifiedAccountActor,
} from "../../../../auth/resolve-current-actor.js";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn() }));
vi.mock("../../../../api/private-api-client.js", () => ({ privateApiClient: vi.fn() }));
vi.mock("../../../../auth/resolve-current-actor.js", () => ({
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
    "checkout.status.pending": "Đang chờ thanh toán",
  },
  en: {
    "checkout.eyebrow": "Payment",
    "checkout.title": "Identity reading",
    "checkout.status.pending": "Awaiting payment",
  },
};

const sampleCheckoutStatus = (locale: "vi" | "en") => ({
  order: {
    id: "order-1",
    status: "pending" as const,
    amount: 79_000,
    currency: "VND" as const,
    locale,
  },
  paymentInstructions: {
    bankCode: "VCB",
    accountNumber: "123456789",
    accountHolder: "LA SO VIET",
    amount: 79_000,
    currency: "VND" as const,
    transferDescription: "LSV-order-1",
    qrUrl: "https://vietqr.app/img?acc=123456789&bank=VCB&amount=79000&des=LSV-order-1&template=compact",
    expiresAt: "2026-09-05T00:15:00.000Z",
  },
  reportId: null,
});

describe("checkout page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
  });

  it.each([
    ["vi", "Thanh toán"],
    ["en", "Payment"],
  ] as const)("renders %s copy from the authoritative order locale using CheckoutStatus projection", async (locale, eyebrow) => {
    vi.mocked(getTranslations).mockResolvedValue(
      ((key: keyof typeof copy.vi) => copy[locale][key]) as never,
    );
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: sampleCheckoutStatus(locale),
      }),
    });
    const { default: CheckoutPage } = await import("./page.js");

    const html = renderToStaticMarkup(await CheckoutPage({
      params: Promise.resolve({ locale, orderId: "order-1" }),
    }));

    expect(html).toContain(eyebrow);
    expect(html).toContain("VCB - 123456789");
    expect(html).toContain("LA SO VIET");
    expect(html).toContain("LSV-order-1");
  });

  it("redirects a mismatched route locale to the authoritative checkout route", async () => {
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: sampleCheckoutStatus("vi"),
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
