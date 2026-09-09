import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
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
    "checkout.title": "Luận giải Tử Vi toàn diện",
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
    "checkout.no_second_transfer_warning": "Nếu bạn đã chuyển khoản, tuyệt đối không chuyển khoản lại. Vui lòng sử dụng biểu mẫu kiểm tra giao dịch bên dưới để hệ thống đối chiếu.",
    "checkout.paid_processing_title": "Đã nhận thanh toán thành công",
    "checkout.paid_processing_description": "Hệ thống đã ghi nhận thanh toán của bạn và đang chuẩn bị báo cáo luận giải. Vui lòng chờ trong giây lát hoặc kiểm tra lịch sử đơn hàng.",
    "checkout.expired_title": "Đơn hàng đã hết hạn thanh toán",
    "checkout.expired_description": "Đơn hàng này đã quá thời gian thanh toán. Thông tin đơn hàng cũ vẫn được lưu trong lịch sử giao dịch để bạn tiện tra cứu.",
    "checkout.new_chart_action": "Lập lá số và tạo yêu cầu mới",
    "checkout.order_history_action": "Xem lịch sử đơn hàng",
    "checkout.failed_title": "Thanh toán chưa thành công",
    "checkout.failed_description": "Giao dịch thanh toán cho đơn hàng này chưa thành công. Vui lòng không chuyển khoản lại cho đơn hàng này. Quý khách có thể kiểm tra lịch sử đơn hàng hoặc liên hệ hỗ trợ.",
    "checkout.support_action": "Liên hệ hỗ trợ",
    "checkout.refunded_title": "Đơn hàng đã được hoàn tiền",
    "checkout.refunded_description": "Đơn hàng này đã được xử lý hoàn tiền. Quý khách có thể kiểm tra chi tiết trong lịch sử đơn hàng.",
    "checkout.selfClaim.heading": "Đã chuyển khoản nhưng chưa được ghi nhận?",
    "checkout.selfClaim.description": "Nhập chính xác số tiền và thời gian đã chuyển để hệ thống đối chiếu giao dịch và tiếp tục chuẩn bị báo cáo.",
    "checkout.selfClaim.amountLabel": "Số tiền đã chuyển (VND)",
    "checkout.selfClaim.timeLabel": "Thời gian chuyển khoản (giờ Việt Nam)",
    "checkout.selfClaim.submit": "Kiểm tra và nhận báo cáo",
    "checkout.selfClaim.submitting": "Đang kiểm tra...",
    "checkout.selfClaim.errors.invalid_input": "Vui lòng kiểm tra lại số tiền và thời gian chuyển khoản.",
    "checkout.selfClaim.errors.payment_not_found": "Chưa tìm thấy giao dịch phù hợp với thông tin đã nhập. Vui lòng kiểm tra lại thời gian chuyển khoản hoặc chờ thêm ít phút.",
    "checkout.selfClaim.errors.rate_limited": "Bạn đã vượt quá số lần kiểm tra trong ngày. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.",
    "checkout.selfClaim.errors.service_unavailable": "Hệ thống đối chiếu tạm thời gián đoạn. Vui lòng thử lại sau ít phút.",
  },
  en: {
    "checkout.eyebrow": "Payment",
    "checkout.title": "Comprehensive Zi Wei reading",
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
    "checkout.no_second_transfer_warning": "If you have already transferred, do not transfer again. Please use the verification form below to match your payment.",
    "checkout.paid_processing_title": "Payment received successfully",
    "checkout.paid_processing_description": "Your payment has been recorded and your interpretation report is being prepared. Please wait a moment or check your order history.",
    "checkout.expired_title": "Order expired",
    "checkout.expired_description": "This order has passed the payment window. Your previous order remains recorded in your order history for reference.",
    "checkout.new_chart_action": "Create a new chart and request",
    "checkout.order_history_action": "View order history",
    "checkout.failed_title": "Payment was not completed",
    "checkout.failed_description": "Payment for this order was not completed. Please do not attempt another transfer for this order. You can check your order history or contact support.",
    "checkout.support_action": "Contact support",
    "checkout.refunded_title": "Order refunded",
    "checkout.refunded_description": "This order has been refunded. You can review the details in your order history.",
    "checkout.selfClaim.heading": "Transferred but not yet confirmed?",
    "checkout.selfClaim.description": "Enter the exact amount and transfer time to locate your payment and continue preparing your report.",
    "checkout.selfClaim.amountLabel": "Amount transferred (VND)",
    "checkout.selfClaim.timeLabel": "Transfer time (Vietnam time)",
    "checkout.selfClaim.submit": "Check and claim report",
    "checkout.selfClaim.submitting": "Checking...",
    "checkout.selfClaim.errors.invalid_input": "Please check the entered amount and transfer time.",
    "checkout.selfClaim.errors.payment_not_found": "No matching payment found with the entered details. Please check your transfer time or try again in a few minutes.",
    "checkout.selfClaim.errors.rate_limited": "Daily claim limit reached. Please try again later or contact support.",
    "checkout.selfClaim.errors.service_unavailable": "Reconciliation service is temporarily unavailable. Please try again in a few minutes.",
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
    ["vi", "Thanh toán", "Đã chuyển khoản nhưng chưa được ghi nhận?"],
    ["en", "Payment", "Transferred but not yet confirmed?"],
  ] as const)("renders %s copy from the authoritative order locale using CheckoutStatus projection, warning, and recovery UI", async (locale, eyebrow, recoveryHeading) => {
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
    // Warning rendered
    expect(html).toContain("vietqr-no-second-transfer-warning");
    // 3 copy buttons + 1 recovery submit button = 4 buttons
    expect(html.match(/<button/g)).toHaveLength(4);
    // Recovery UI heading rendered below instructions
    expect(html).toContain(recoveryHeading);
    expect(html.indexOf("vietqr-instructions")).toBeLessThan(html.indexOf("payment-self-claim-section"));
  });

  it("triggers notFound when private API returns ok: true but malformed pending payload without paymentInstructions", async () => {
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

  it("renders recovery screen rather than 404 for paid order without reportId and null paymentInstructions", async () => {
    vi.mocked(getTranslations).mockResolvedValue(
      ((key: keyof typeof copy.vi) => copy.vi[key]) as never,
    );
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

    const html = renderToStaticMarkup(await CheckoutPage({
      params: Promise.resolve({ locale: "vi", orderId: "order-1" }),
    }));

    // Must render recovery screen, NOT notFound
    expect(html).toContain("Đã nhận thanh toán thành công");
    expect(html).toContain("/tai-khoan/don-hang");
    // No QR code or self-claim
    expect(html).not.toContain("https://vietqr.app");
    expect(html).not.toContain("payment-self-claim-section");
  });

  it("renders recovery screen rather than 404 for expired order with null paymentInstructions", async () => {
    vi.mocked(getTranslations).mockResolvedValue(
      ((key: keyof typeof copy.vi) => copy.vi[key]) as never,
    );
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "expired",
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

    const html = renderToStaticMarkup(await CheckoutPage({
      params: Promise.resolve({ locale: "vi", orderId: "order-1" }),
    }));

    expect(html).toContain("Đơn hàng đã hết hạn thanh toán");
    expect(html).toContain("/tao-la-so/tu-vi");
    expect(html).toContain("/tai-khoan/don-hang");
    expect(html).not.toContain("https://vietqr.app");
    expect(html).not.toContain("payment-self-claim-section");
  });

  it("renders recovery screen rather than 404 for failed order with null paymentInstructions", async () => {
    vi.mocked(getTranslations).mockResolvedValue(
      ((key: keyof typeof copy.vi) => copy.vi[key]) as never,
    );
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "failed",
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

    const html = renderToStaticMarkup(await CheckoutPage({
      params: Promise.resolve({ locale: "vi", orderId: "order-1" }),
    }));

    expect(html).toContain("Thanh toán chưa thành công");
    expect(html).toContain("mailto:support@lasoviet.vn");
    expect(html).toContain("/tai-khoan/don-hang");
    expect(html).not.toContain("https://vietqr.app");
    expect(html).not.toContain("payment-self-claim-section");
  });

  it("renders recovery screen rather than 404 for refunded order with null paymentInstructions", async () => {
    vi.mocked(getTranslations).mockResolvedValue(
      ((key: keyof typeof copy.vi) => copy.vi[key]) as never,
    );
    vi.mocked(privateApiClient).mockReturnValue({
      request: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          order: {
            id: "order-1",
            status: "refunded",
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

    const html = renderToStaticMarkup(await CheckoutPage({
      params: Promise.resolve({ locale: "vi", orderId: "order-1" }),
    }));

    expect(html).toContain("Đơn hàng đã được hoàn tiền");
    expect(html).toContain("/tai-khoan/don-hang");
    expect(html).not.toContain("/tao-la-so/tu-vi");
    expect(html).not.toContain("https://vietqr.app");
    expect(html).not.toContain("payment-self-claim-section");
  });
});
