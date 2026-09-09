import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentSelfClaimForm } from "./payment-self-claim-form";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("PaymentSelfClaimForm", () => {
  const action = async () => ({ status: "idle" as const });

  it("renders default amount, minute-precision datetime control, Vietnamese-time label, and accessible result region", () => {
    const html = renderToStaticMarkup(
      <PaymentSelfClaimForm
        action={action}
        orderId="order-123"
        defaultAmount={79000}
        locale="vi"
      />,
    );

    expect(html).toContain("Đã chuyển khoản nhưng chưa được ghi nhận?");
    expect(html).toContain("Nhập chính xác số tiền và thời gian đã chuyển để hệ thống đối chiếu giao dịch và tiếp tục chuẩn bị báo cáo.");
    expect(html).toContain("79000");
    expect(html).toContain("datetime-local");
    expect(html).toContain("step=\"60\"");
    expect(html).toContain("Thời gian chuyển khoản (giờ Việt Nam)");
    expect(html).toContain("Kiểm tra và nhận báo cáo");
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).toContain("role=\"status\"");
  });

  it("renders English copy when locale is en", () => {
    const html = renderToStaticMarkup(
      <PaymentSelfClaimForm
        action={action}
        orderId="order-123"
        defaultAmount={79000}
        locale="en"
      />,
    );

    expect(html).toContain("Transferred but not yet confirmed?");
    expect(html).toContain("Enter the exact amount and transfer time to locate your payment and continue preparing your report.");
    expect(html).toContain("Transfer time (Vietnam time)");
    expect(html).toContain("Check and claim report");
  });

  it("renders generic not-found message without disclosing whether unmatched records exist", () => {
    const html = renderToStaticMarkup(
      <PaymentSelfClaimForm
        action={action}
        orderId="order-123"
        defaultAmount={79000}
        locale="vi"
        initialState={{ status: "payment_not_found" }}
      />,
    );

    expect(html).toContain("Chưa tìm thấy giao dịch phù hợp với thông tin đã nhập");
    expect(html).not.toContain("unmatched");
    expect(html).not.toContain("candidate");
    expect(html).not.toContain("database");
  });

  it("renders rate limited message when status is rate_limited", () => {
    const html = renderToStaticMarkup(
      <PaymentSelfClaimForm
        action={action}
        orderId="order-123"
        defaultAmount={79000}
        locale="vi"
        initialState={{ status: "rate_limited" }}
      />,
    );

    expect(html).toContain("Bạn đã vượt quá số lần kiểm tra trong ngày");
  });

  it("renders invalid input message when status is invalid_input", () => {
    const html = renderToStaticMarkup(
      <PaymentSelfClaimForm
        action={action}
        orderId="order-123"
        defaultAmount={79000}
        locale="vi"
        initialState={{ status: "invalid_input" }}
      />,
    );

    expect(html).toContain("Vui lòng kiểm tra lại số tiền và thời gian chuyển khoản.");
  });

  it("excludes AI, methodology, confidence, and limitation disclosures from visible copy", () => {
    const html = renderToStaticMarkup(
      <PaymentSelfClaimForm
        action={action}
        orderId="order-123"
        defaultAmount={79000}
        locale="vi"
      />,
    );

    expect(html).not.toContain("trí tuệ nhân tạo");
    expect(html).not.toContain("AI");
    expect(html).not.toContain("độ tin cậy");
    expect(html).not.toContain("khuyến cáo");
    expect(html).not.toContain("giới hạn");
  });
});
