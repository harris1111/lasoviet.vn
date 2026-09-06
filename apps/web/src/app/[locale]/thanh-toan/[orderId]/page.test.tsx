import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { privateApiClient } from "../../../../api/private-api-client.js";
import {
  resolveVerifiedAccountActor,
} from "../../../../auth/resolve-current-actor.js";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
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
    "checkout.instructions_title": "Thông tin chuyển khoản",
    "checkout.bank_code": "Ngân hàng",
    "checkout.account_number": "Số tài khoản",
    "checkout.account_holder": "Chủ tài khoản",
    "checkout.amount": "Số tiền",
    "checkout.transfer_description": "Nội dung chuyển khoản",
    "checkout.remaining_time": "Thời gian còn lại",
    "checkout.qr_alt": "Mã VietQR thanh toán",
    "checkout.copy_account_number": "Sao chép số tài khoản",
    "checkout.copy_amount": "Sao chép số tiền",
    "checkout.copy_transfer_description": "Sao chép nội dung chuyển khoản",
    "checkout.copied": "Đã sao chép",
    "checkout.status.pending": "Đang chờ thanh toán",
    "checkout.status.paid": "Đã thanh toán",
    "checkout.status.expired": "Đơn đã hết hạn",
    "checkout.status.failed": "Thanh toán chưa thành công",
    "checkout.status.refunded": "Đã hoàn tiền",
  },
  en: {
    "checkout.eyebrow": "Payment",
    "checkout.title": "Identity reading",
    "checkout.instructions_title": "Bank transfer details",
    "checkout.bank_code": "Bank",
    "checkout.account_number": "Account number",
    "checkout.account_holder": "Account holder",
    "checkout.amount": "Amount",
    "checkout.transfer_description": "Transfer description",
    "checkout.remaining_time": "Remaining time",
    "checkout.qr_alt": "VietQR payment code",
    "checkout.copy_account_number": "Copy account number",
    "checkout.copy_amount": "Copy amount",
    "checkout.copy_transfer_description": "Copy transfer description",
    "checkout.copied": "Copied",
    "checkout.status.pending": "Awaiting payment",
    "checkout.status.paid": "Paid",
    "checkout.status.expired": "Order expired",
    "checkout.status.failed": "Payment was not completed",
    "checkout.status.refunded": "Refunded",
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
    expect(html).toContain("https://vietqr.app/img?acc=123456789");
    expect(html).toContain("VCB");
    expect(html).toContain("123456789");
    expect(html).toContain("LA SO VIET");
    expect(html).toContain("79");
    expect(html).toContain("000");
    expect(html).toContain("LSV-order-1");
    expect(html.match(/<button/g)).toHaveLength(3);
  });


  it("triggers notFound when private API returns ok: true but malformed payload without paymentInstructions", async () => {
    const { notFound } = await import("next/navigation");
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
        },
      }),
    });
    const { default: CheckoutPage } = await import("./page.js");

    await expect(CheckoutPage({
      params: Promise.resolve({ locale: "vi", orderId: "order-1" }),
    })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

  it("triggers notFound when private API returns payload with invalid QR origin", async () => {
    const { notFound } = await import("next/navigation");
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          ...sampleCheckoutStatus("vi"),
          paymentInstructions: {
            ...sampleCheckoutStatus("vi").paymentInstructions,
            qrUrl: "https://evil.example.com/img?acc=123",
          },
        },
      }),
    });
    const { default: CheckoutPage } = await import("./page.js");

    await expect(CheckoutPage({
      params: Promise.resolve({ locale: "vi", orderId: "order-1" }),
    })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
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
  it("server-redirects a paid order with reportId to the locale-correct report route for vi", async () => {
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "paid",
            amount: 79_000,
            currency: "VND",
            locale: "vi",
          },
          paymentInstructions: null,
          reportId: "report-auto-1",
        },
      }),
    });
    const { default: CheckoutPage } = await import("./page.js");

    await CheckoutPage({
      params: Promise.resolve({ locale: "vi", orderId: "order-1" }),
    });

    expect(redirect).toHaveBeenCalledWith("/bao-cao/report-auto-1");
  });

  it("server-redirects a paid order with reportId to the locale-correct report route for en", async () => {
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "paid",
            amount: 79_000,
            currency: "VND",
            locale: "en",
          },
          paymentInstructions: null,
          reportId: "report-auto-2",
        },
      }),
    });
    const { default: CheckoutPage } = await import("./page.js");

    await CheckoutPage({
      params: Promise.resolve({ locale: "en", orderId: "order-1" }),
    });

    expect(redirect).toHaveBeenCalledWith("/en/bao-cao/report-auto-2");
  });

  it("triggers notFound when no redirect occurs and paymentInstructions is null", async () => {
    const { notFound } = await import("next/navigation");
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "paid",
            amount: 79_000,
            currency: "VND",
            locale: "vi",
          },
          paymentInstructions: null,
          reportId: null,
        },
      }),
    });
    const { default: CheckoutPage } = await import("./page.js");

    await expect(CheckoutPage({
      params: Promise.resolve({ locale: "vi", orderId: "order-1" }),
    })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

});
