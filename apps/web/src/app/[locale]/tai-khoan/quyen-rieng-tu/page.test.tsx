import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { CurrentActor } from "@lasoviet/contracts";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import { loadAccountPrivacy } from "../../../../features/account/account-center-data";
import { formatConsentPurpose } from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("../../../../auth/resolve-current-actor", () => ({
  resolveVerifiedAccountActor: vi.fn(),
}));

vi.mock("../../../../features/account/account-center-data", () => ({
  loadAccountPrivacy: vi.fn(),
  buildAccountSignInRedirect: (locale: string, path: string) =>
    locale === "en" ? `/en/dang-nhap?callbackURL=${encodeURIComponent(path)}` : `/dang-nhap?callbackURL=${encodeURIComponent(path)}`,
}));

const mockActor: CurrentActor = {
  kind: "account",
  userId: "user-test-1",
  sessionId: "session-test-1",
  requestId: "req-test-1",
};

describe("AccountPrivacyPage (/tai-khoan/quyen-rieng-tu)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when route locale is neither vi nor en", async () => {
    const { default: AccountPrivacyPage } = await import("./page");
    await expect(
      AccountPrivacyPage({ params: Promise.resolve({ locale: "ja" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("redirects unauthenticated user to localized sign-in callback", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const { default: AccountPrivacyPage } = await import("./page");
    await expect(
      AccountPrivacyPage({ params: Promise.resolve({ locale: "vi" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dang-nhap?callbackURL=%2Ftai-khoan%2Fquyen-rieng-tu");

    await expect(
      AccountPrivacyPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan%2Fquyen-rieng-tu");
  });

  it("renders read-only consent items, an export button, and statutory retention text", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountPrivacy).mockResolvedValue({
      ok: true,
      value: {
        consents: [
          {
            documentKey: "dieu-khoan-dich-vu",
            documentVersion: "2026-09-01",
            purpose: "birth_profile",
            grantedAt: "2026-09-08T10:00:00.000Z",
            revokedAt: null,
            active: true,
          },
        ],
        deletionRequest: null,
      },
    });

    const { default: AccountPrivacyPage } = await import("./page");
    const element = await AccountPrivacyPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Quyền riêng tư dữ liệu");
    expect(html).toContain("Trạng thái đồng ý được ghi nhận từ lần chấp thuận gần nhất và hiển thị dạng chỉ đọc.");
    expect(html).not.toContain("công tắc");
    expect(html).toContain("Xử lý hồ sơ lá số");
    expect(html).toContain("dieu-khoan-dich-vu");
    expect(html).toContain("2026-09-01");
    expect(html).toContain("Đang bật");
    expect(html).not.toContain('href="/api/account/export"');
    expect(html).toContain("Xuất dữ liệu (.json)");
    expect(html).toContain("Yêu cầu xoá dữ liệu");
    expect(html).toContain("Thời gian khôi phục 30 ngày");
    expect(html).toContain("Dữ liệu kế toán bắt buộc");
  });

  it("renders cancel deletion button when a deletion request is pending", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountPrivacy).mockResolvedValue({
      ok: true,
      value: {
        consents: [],
        deletionRequest: {
          id: "del-req-1",
          requestedAt: "2026-09-08T10:00:00.000Z",
          recoverUntil: "2026-10-08T10:00:00.000Z",
          purgeAfter: "2026-10-08T10:00:00.000Z",
          status: "requested",
        },
      },
    });

    const { default: AccountPrivacyPage } = await import("./page");
    const element = await AccountPrivacyPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Tài khoản đang trong thời gian chờ xoá");
    expect(html).toContain("Huỷ yêu cầu xoá dữ liệu");
  });

  it("renders localized error banner when loadAccountPrivacy fails", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountPrivacy).mockResolvedValue({
      ok: false,
      error: {
        code: "ACCOUNT_CENTER_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });

    const { default: AccountPrivacyPage } = await import("./page");
    const element = await AccountPrivacyPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Dịch vụ quyền riêng tư tạm thời không khả dụng. Vui lòng thử lại sau.");
  });

  it("exports force-dynamic and robots metadata", async () => {
    const pageModule = await import("./page");
    expect(pageModule.dynamic).toBe("force-dynamic");
    expect(pageModule.metadata).toMatchObject({
      robots: { index: false, follow: false },
    });
  });
  it("renders newer compact consent labels in VI and EN without raw identifiers", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    const mockConsents = [
      {
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purpose: "analytics",
        grantedAt: "2026-09-14T10:00:00.000Z",
        revokedAt: null,
        active: true,
      },
      {
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purpose: "personalization",
        grantedAt: "2026-09-14T10:00:00.000Z",
        revokedAt: null,
        active: true,
      },
      {
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purpose: "offers",
        grantedAt: "2026-09-14T10:00:00.000Z",
        revokedAt: null,
        active: true,
      },
      {
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purpose: "service_operation",
        grantedAt: "2026-09-14T10:00:00.000Z",
        revokedAt: null,
        active: true,
      },
    ];

    vi.mocked(loadAccountPrivacy).mockResolvedValue({
      ok: true,
      value: {
        consents: mockConsents,
        deletionRequest: null,
      },
    });

    const { default: AccountPrivacyPage } = await import("./page");

    // Vietnamese test
    const elementVi = await AccountPrivacyPage({ params: Promise.resolve({ locale: "vi" }) });
    const htmlVi = renderToStaticMarkup(elementVi);

    expect(htmlVi).toContain("Phân tích việc sử dụng sản phẩm");
    expect(htmlVi).toContain("Cá nhân hoá nội dung");
    expect(htmlVi).toContain("Gợi ý dịch vụ và ưu đãi phù hợp");
    expect(htmlVi).toContain("Vận hành dịch vụ");
    expect(htmlVi).not.toContain("<h3 class=\"account-row-title\">analytics</h3>");
    expect(htmlVi).not.toContain("<h3 class=\"account-row-title\">personalization</h3>");
    expect(htmlVi).not.toContain("<h3 class=\"account-row-title\">offers</h3>");

    // English test
    const elementEn = await AccountPrivacyPage({ params: Promise.resolve({ locale: "en" }) });
    const htmlEn = renderToStaticMarkup(elementEn);

    expect(htmlEn).toContain("Product usage analytics");
    expect(htmlEn).toContain("Content personalization");
    expect(htmlEn).toContain("Relevant service and offer suggestions");
    expect(htmlEn).toContain("Service operation");
    expect(htmlEn).not.toContain("<h3 class=\"account-row-title\">analytics</h3>");
    expect(htmlEn).not.toContain("<h3 class=\"account-row-title\">personalization</h3>");
    expect(htmlEn).not.toContain("<h3 class=\"account-row-title\">offers</h3>");
  });
  it("never renders raw unknown purpose identifiers and falls back to localized generic label", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountPrivacy).mockResolvedValue({
      ok: true,
      value: {
        consents: [
          {
            documentKey: "custom_doc",
            documentVersion: "1.0",
            purpose: "internal_unknown_purpose",
            grantedAt: "2026-09-14T10:00:00.000Z",
            revokedAt: null,
            active: true,
          },
        ],
        deletionRequest: null,
      },
    });

    const { default: AccountPrivacyPage } = await import("./page");

    const elementVi = await AccountPrivacyPage({ params: Promise.resolve({ locale: "vi" }) });
    const htmlVi = renderToStaticMarkup(elementVi);
    expect(htmlVi).not.toContain("internal_unknown_purpose");
    expect(htmlVi).toContain("Mục đích sử dụng khác");

    const elementEn = await AccountPrivacyPage({ params: Promise.resolve({ locale: "en" }) });
    const htmlEn = renderToStaticMarkup(elementEn);
    expect(htmlEn).not.toContain("internal_unknown_purpose");
    expect(htmlEn).toContain("Other data purpose");
  });

  it("localizes evidenced purposes and never leaks unknown technical keys", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountPrivacy).mockResolvedValue({
      ok: true,
      value: {
        consents: [
          {
            documentKey: "privacy",
            documentVersion: "v1",
            purpose: "birth_profile",
            grantedAt: "2026-09-08T10:00:00.000Z",
            revokedAt: null,
            active: true,
          },
          {
            documentKey: "privacy",
            documentVersion: "v1",
            purpose: "birth-profile-calculation",
            grantedAt: "2026-09-08T10:00:00.000Z",
            revokedAt: null,
            active: true,
          },
          {
            documentKey: "privacy",
            documentVersion: "v1",
            purpose: "marketing_email",
            grantedAt: "2026-09-08T10:00:00.000Z",
            revokedAt: null,
            active: true,
          },
          {
            documentKey: "privacy",
            documentVersion: "v1",
            purpose: "unknown_technical_key_xyz",
            grantedAt: "2026-09-08T10:00:00.000Z",
            revokedAt: null,
            active: true,
          },
        ],
        deletionRequest: null,
      },
    });

    const { default: AccountPrivacyPage } = await import("./page");
    const htmlVi = renderToStaticMarkup(
      await AccountPrivacyPage({ params: Promise.resolve({ locale: "vi" }) }),
    );
    expect(htmlVi).toContain("Xử lý hồ sơ lá số");
    expect(htmlVi).toContain("Tính toán hồ sơ lá số");
    expect(htmlVi).toContain("Email tiếp thị");
    expect(htmlVi).toContain("Mục đích sử dụng khác");
    expect(htmlVi).not.toContain("unknown_technical_key_xyz");

    const htmlEn = renderToStaticMarkup(
      await AccountPrivacyPage({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(htmlEn).toContain("Birth profile processing");
    expect(htmlEn).toContain("Birth profile calculation");
    expect(htmlEn).toContain("Marketing email");
    expect(htmlEn).toContain("Other data purpose");
    expect(htmlEn).not.toContain("unknown_technical_key_xyz");
  });

  it("maps all consent-purpose variants to localized labels", () => {
    expect(formatConsentPurpose("birth_profile", "vi")).toBe("Xử lý hồ sơ lá số");
    expect(formatConsentPurpose("birth-profile-calculation", "en")).toBe("Birth profile calculation");
    expect(formatConsentPurpose("service_operation", "vi")).toBe("Vận hành dịch vụ");
    expect(formatConsentPurpose("marketing", "en")).toBe("Marketing email");
    expect(formatConsentPurpose("marketing_email", "vi")).toBe("Email tiếp thị");
    expect(formatConsentPurpose("third_party_sharing", "en")).toBe("Third-party sharing");
    expect(formatConsentPurpose("ai_training", "vi")).toBe("Huấn luyện mô hình AI");
    expect(formatConsentPurpose("custom_telemetry_optin", "en")).toBe("Other data purpose");
  });
});
