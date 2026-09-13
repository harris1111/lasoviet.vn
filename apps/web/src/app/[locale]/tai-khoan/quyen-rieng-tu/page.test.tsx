import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { CurrentActor } from "@lasoviet/contracts";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import { loadAccountPrivacy } from "../../../../features/account/account-center-data";

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

  it("renders read-only consent items, export link, and statutory retention text", async () => {
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
    expect(html).toContain("Xử lý hồ sơ lá số");
    expect(html).toContain("dieu-khoan-dich-vu");
    expect(html).toContain("2026-09-01");
    expect(html).toContain("Đang bật");
    expect(html).toContain('href="/api/account/export"');
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
});
