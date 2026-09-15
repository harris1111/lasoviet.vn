import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY_CONTENT } from "./privacy-policy-content";

describe("PRIVACY_POLICY_CONTENT", () => {
  it("contains all required factual sections and review date 2026-09-14 for Vietnamese", () => {
    const vi = PRIVACY_POLICY_CONTENT.vi;
    expect(vi.effectiveDate).toBe("14/09/2026");
    expect(vi.sections).toHaveLength(6);

    const text = JSON.stringify(vi);
    // Collected categories
    expect(text).toContain("Thông tin tài khoản");
    expect(text).toContain("Dữ liệu kỹ thuật và hành vi");
    // Purposes
    expect(text).toContain("birth_profile");
    expect(text).toContain("analytics");
    expect(text).toContain("personalization");
    expect(text).toContain("offers");
    // Retention
    expect(text).toContain("30 ngày");
    expect(text).toContain("24 giờ");
    expect(text).toContain("12 tháng");
    // FD-053
    expect(text).toContain("FD-053");
    expect(text).toContain("Pixel quảng cáo và trình theo dõi quảng cáo bên thứ ba không được kích hoạt");
    // Consent vs auth linking distinction
    expect(text).toContain("không tự tạo hoặc hàm ý tài khoản xác thực");
    expect(text).toContain("liên kết với hồ sơ sinh và ngữ cảnh phiên ẩn danh");
    expect(text).toContain("Khi bạn đăng nhập hoặc tạo tài khoản xác thực");

    // User rights
    expect(text).toContain("Xuất dữ liệu tài khoản");
    expect(text).toContain("Xoá dữ liệu tạm thời");
  });

  it("contains equivalent factual sections and review date September 14, 2026 for English", () => {
    const en = PRIVACY_POLICY_CONTENT.en;
    expect(en.effectiveDate).toBe("September 14, 2026");
    expect(en.sections).toHaveLength(6);

    const text = JSON.stringify(en);
    expect(text).toContain("30 days");
    expect(text).toContain("24 hours");
    expect(text).toContain("12 months");
    expect(text).toContain("does not by itself create or imply an authenticated account");
    expect(text).toContain("links visitor history to the birth profile and anonymous session context");
    expect(text).toContain("Signing in or authenticating");
    expect(text).toContain("Advertising pixels and third-party advertising trackers are not activated by LSV-12 in the current release");
  });
});
