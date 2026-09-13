import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { CurrentActor } from "@lasoviet/contracts";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import { loadAccountProfiles } from "../../../../features/account/account-center-data";

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
  loadAccountProfiles: vi.fn(),
  buildAccountSignInRedirect: (locale: string, path: string) =>
    locale === "en" ? `/en/dang-nhap?callbackURL=${encodeURIComponent(path)}` : `/dang-nhap?callbackURL=${encodeURIComponent(path)}`,
}));

const mockActor: CurrentActor = {
  kind: "account",
  userId: "user-test-1",
  sessionId: "session-test-1",
  requestId: "req-test-1",
};

describe("AccountProfilesPage (/tai-khoan/ho-so-sinh)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when route locale is neither vi nor en", async () => {
    const { default: AccountProfilesPage } = await import("./page");
    await expect(
      AccountProfilesPage({ params: Promise.resolve({ locale: "es" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("redirects unauthenticated user to localized sign-in callback", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const { default: AccountProfilesPage } = await import("./page");
    await expect(
      AccountProfilesPage({ params: Promise.resolve({ locale: "vi" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dang-nhap?callbackURL=%2Ftai-khoan%2Fho-so-sinh");

    await expect(
      AccountProfilesPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan%2Fho-so-sinh");
  });

  it("renders profile list with canonical chart hrefs and does not leak internal profile IDs into visible text", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountProfiles).mockResolvedValue({
      ok: true,
      value: {
        profiles: [
          {
            id: "internal-secret-prof-id-123",
            calendar: { kind: "solar", date: "1995-10-20" },
            time: { precision: "exact_minute", localTime: "14:15" },
            timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
            gender: "female",
            chartId: "chart-opaque-456",
            hasPurchasedReport: true,
            createdAt: "2026-09-05T00:00:00.000Z",
          },
        ],
      },
    });

    const { default: AccountProfilesPage } = await import("./page");
    const element = await AccountProfilesPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Lá số &amp; hồ sơ của bạn");
    expect(html).toContain("Hồ sơ #1");
    expect(html).toContain("Nữ");
    expect(html).toContain("Dương lịch: 1995-10-20");
    expect(html).toContain("14:15");
    expect(html).toContain('href="/la-so/chart-opaque-456"');
    expect(html).toContain('href="/tai-khoan/bao-cao"');
    expect(html).toContain("Xoá hồ sơ");

    // Must NOT leak internal profile ID as visible text content (e.g. "internal-secret-prof-id-123")
    // (Only in form/button props or data attributes)
    expect(html).not.toContain(">internal-secret-prof-id-123<");
  });

  it("renders empty state with canonical link to /tao-la-so/tu-vi in vi and en", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountProfiles).mockResolvedValue({
      ok: true,
      value: { profiles: [] },
    });

    const { default: AccountProfilesPage } = await import("./page");

    const elementVi = await AccountProfilesPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const htmlVi = renderToStaticMarkup(elementVi);
    expect(htmlVi).toContain("Bạn chưa có hồ sơ nào.");
    expect(htmlVi).toContain('href="/tao-la-so/tu-vi"');
    expect(htmlVi).toContain("Lập lá số đầu tiên");

    const elementEn = await AccountProfilesPage({
      params: Promise.resolve({ locale: "en" }),
    });
    const htmlEn = renderToStaticMarkup(elementEn);
    expect(htmlEn).toContain("You don&#x27;t have any birth profiles yet.");
    expect(htmlEn).toContain('href="/en/tao-la-so/tu-vi"');
    expect(htmlEn).toContain("Create your first chart");
  });

  it("renders error banner when loadAccountProfiles fails", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountProfiles).mockResolvedValue({
      ok: false,
      error: {
        code: "ACCOUNT_CENTER_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });

    const { default: AccountProfilesPage } = await import("./page");
    const element = await AccountProfilesPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Dịch vụ hồ sơ tạm thời không khả dụng. Vui lòng thử lại sau.");
  });

  it("exports force-dynamic and robots metadata", async () => {
    const pageModule = await import("./page");
    expect(pageModule.dynamic).toBe("force-dynamic");
    expect(pageModule.metadata).toMatchObject({
      robots: { index: false, follow: false },
    });
  });
});
