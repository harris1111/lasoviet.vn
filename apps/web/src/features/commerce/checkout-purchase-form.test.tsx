import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { renderToStaticMarkup } from "react-dom/server";
import { CheckoutPurchaseForm } from "./checkout-purchase-form";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("CheckoutPurchaseForm", () => {
  const action = async () => ({ status: "idle" as const });

  it("renders initial purchase CTA and sample-report link in idle state", () => {
    const html = renderToStaticMarkup(
      <CheckoutPurchaseForm
        action={action}
        chartId="chart-1"
        locale="vi"
        sampleHref="/bao-cao-mau/tu-vi"
      />,
    );

    expect(html).toContain("Tiếp tục thanh toán");
    expect(html).toContain("/bao-cao-mau/tu-vi");
    expect(html).toContain("Xem bản luận giải mẫu");
    expect(html).not.toContain("Tạm dừng tiếp nhận");
    const submitMatches = (html.match(/type="submit"/g) || []).length;
    expect(submitMatches).toBe(1);
    expect(html).toContain('value="ziwei-comprehensive"');
    expect(html).not.toMatch(/ZIWEI-[A-Z0-9]+/);
  });

  it("renders localized English purchase CTA and sample link when locale is en", () => {
    const html = renderToStaticMarkup(
      <CheckoutPurchaseForm
        action={action}
        chartId="chart-1"
        locale="en"
        sampleHref="/en/bao-cao-mau/tu-vi"
      />,
    );

    expect(html).toContain("Continue to payment");
    expect(html).toContain("/en/bao-cao-mau/tu-vi");
    expect(html).toContain("View sample report");
    expect(html).not.toContain("temporarily paused");
  });

  it("renders inline paused state with warning, retry button, and sample link when status is paused", () => {
    const html = renderToStaticMarkup(
      <CheckoutPurchaseForm
        action={action}
        chartId="chart-1"
        locale="vi"
        sampleHref="/bao-cao-mau/tu-vi"
        initialState={{ status: "paused" }}
      />,
    );

    expect(html).toContain("Tạm dừng tiếp nhận thanh toán mới");
    expect(html).toContain("Hệ thống đang tạm ngừng tiếp nhận thanh toán mới");
    expect(html).toContain("Quý khách vui lòng không chuyển khoản trong thời gian này");
    expect(html).toContain("Thử lại");
    expect(html).toContain("/bao-cao-mau/tu-vi");
    expect(html).toContain("Xem bản luận giải mẫu");
  });

  it("renders English paused copy when locale is en and status is paused", () => {
    const html = renderToStaticMarkup(
      <CheckoutPurchaseForm
        action={action}
        chartId="chart-1"
        locale="en"
        sampleHref="/en/bao-cao-mau/tu-vi"
        initialState={{ status: "paused" }}
      />,
    );

    expect(html).toContain("New payments temporarily paused");
    expect(html).toContain("Please do not transfer funds at this time");
    expect(html).toContain("Try again");
    expect(html).toContain("/en/bao-cao-mau/tu-vi");
  });

  it("excludes internal metrics, circuit reason codes, and operational SLAs from markup", () => {
    const html = renderToStaticMarkup(
      <CheckoutPurchaseForm
        action={action}
        chartId="chart-1"
        locale="vi"
        sampleHref="/bao-cao-mau/tu-vi"
        initialState={{ status: "paused" }}
      />,
    );

    expect(html).not.toContain("circuit");
    expect(html).not.toContain("telegram");
    expect(html).not.toContain("SLA");
    expect(html).not.toContain("reason_code");
    expect(html).not.toContain("auto_matched");
  });

  it("accepts custom offerKey and renders it in hidden field without exposing technical SKU", () => {
    const html = renderToStaticMarkup(
      <CheckoutPurchaseForm
        action={action}
        chartId="chart-1"
        locale="vi"
        offerKey="ziwei-comprehensive"
        sampleHref="/bao-cao-mau/tu-vi"
      />,
    );

    expect(html).toContain('name="offerKey"');
    expect(html).toContain('value="ziwei-comprehensive"');
    expect(html).not.toMatch(/ZIWEI-[A-Z0-9]+/);
  });
});
