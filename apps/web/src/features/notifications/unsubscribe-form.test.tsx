import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mockMessages: Record<string, string> = {
  page_title: "Hủy đăng ký nhận thông báo",
  title: "Hủy đăng ký nhận email tin tức & gợi ý",
  description: "Bạn có chắc chắn muốn hủy đăng ký nhận các email tin tức, gợi ý và thông báo chăm sóc từ Lá Số Việt không? Bạn vẫn sẽ nhận được các email giao dịch thiết yếu như xác nhận đơn hàng, đặt lại mật khẩu và thông báo khi báo cáo hoàn thành.",
  confirm_button: "Xác nhận hủy đăng ký",
  submitting: "Đang xử lý...",
  success_title: "Đã hủy đăng ký thành công",
  success_message: "Bạn đã được hủy đăng ký nhận các email tin tức và gợi ý. Các email giao dịch thiết yếu vẫn sẽ tiếp tục được gửi bình thường.",
  error_title: "Không thể xử lý yêu cầu",
  error_invalid_or_expired: "Liên kết hủy đăng ký không hợp lệ hoặc đã hết hạn.",
  error_no_token: "Không tìm thấy mã xác nhận hủy đăng ký hợp lệ.",
  back_to_home: "Về trang chủ",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => mockMessages[key] ?? key,
}));

import { UnsubscribeFormView } from "./unsubscribe-form";

describe("UnsubscribeForm SSR views", () => {
  it("renders all states through truthful JSX renderToStaticMarkup without PII", () => {
    const t = (k: string) => mockMessages[k] ?? k;

    // 1. Ready confirmation state
    const readyHtml = renderToStaticMarkup(
      <UnsubscribeFormView
        state="ready"
        onConfirm={() => {}}
        homeHref="/"
        t={t}
      />,
    );
    expect(readyHtml).toContain("Xác nhận hủy đăng ký");
    expect(readyHtml).not.toContain("disabled");
    expect(readyHtml).not.toContain("user@");
    expect(readyHtml).not.toContain("sensitive");

    // 2. Submitting busy state
    const submittingHtml = renderToStaticMarkup(
      <UnsubscribeFormView
        state="submitting"
        onConfirm={() => {}}
        homeHref="/"
        t={t}
      />,
    );
    expect(submittingHtml).toContain("disabled");
    expect(submittingHtml).toContain("Đang xử lý...");

    // 3. Success state
    const successHtml = renderToStaticMarkup(
      <UnsubscribeFormView
        state="success"
        onConfirm={() => {}}
        homeHref="/"
        t={t}
      />,
    );
    expect(successHtml).toContain("Đã hủy đăng ký thành công");
    expect(successHtml).toContain("role=\"status\"");
    expect(successHtml).toContain("aria-live=\"polite\"");
    expect(successHtml).not.toContain("user@");

    // 4. Error state
    const errorHtml = renderToStaticMarkup(
      <UnsubscribeFormView
        state="error"
        onConfirm={() => {}}
        homeHref="/"
        t={t}
      />,
    );
    expect(errorHtml).toContain("Liên kết hủy đăng ký không hợp lệ hoặc đã hết hạn.");
    expect(errorHtml).toContain("role=\"alert\"");
    expect(errorHtml).not.toContain("user@");

    // 5. No token state
    const noTokenHtml = renderToStaticMarkup(
      <UnsubscribeFormView
        state="no_token"
        onConfirm={() => {}}
        homeHref="/"
        t={t}
      />,
    );
    expect(noTokenHtml).toContain("Không tìm thấy mã xác nhận hủy đăng ký hợp lệ.");
    expect(noTokenHtml).toContain("role=\"alert\"");
    expect(noTokenHtml).not.toContain("user@");
  });
});
