import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AccountLibraryV1, CurrentActor } from "@lasoviet/contracts";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import { loadAccountLibrary } from "../../../../features/account/account-data-loader";

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

vi.mock("../../../../features/account/account-data-loader", () => ({
  loadAccountLibrary: vi.fn(),
}));

const mockActor: CurrentActor = {
  kind: "account",
  userId: "user-123",
  sessionId: "session-456",
  requestId: "req-789",
};

const mockLibrary: AccountLibraryV1 = {
  version: 1,
  totalCount: 2,
  latestReadableReport: null,
  groups: [
    {
      profileId: "prof-1",
      profileDisplayName: "Hồ sơ của Lan",
      chartId: "chart-1",
      latestReportId: "rep-1",
      latestReadUrl: "/bao-cao/rep-1",
      items: [
        {
          id: "item-1",
          entitlementId: "ent-1",
          orderId: "ord-1",
          chartId: "chart-1",
          profileId: "prof-1",
          profileDisplayName: "Hồ sơ của Lan",
          sku: "ZIWEI-IDENTITY-P0",
          productTitle: "Báo cáo Lan 1",
          productName: "Bản mệnh & tiềm năng",
          orderStatus: "paid",
          entitlementStatus: "active",
          reportId: "rep-1",
          readUrl: "/bao-cao/rep-1",
          reportStatus: "ready",
          locale: "vi",
          createdAt: "2026-09-08T10:00:00.000Z",
          purchasedAt: "2026-09-08T10:05:00.000Z",
        },
      ],
    },
  ],
  items: [],
};

describe("AccountReportsPage (/tai-khoan/bao-cao)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when route locale is neither vi nor en", async () => {
    const { default: AccountReportsPage } = await import("./page");
    await expect(
      AccountReportsPage({ params: Promise.resolve({ locale: "fr" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("redirects unauthenticated VI visitor to localized sign-in callback", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const { default: AccountReportsPage } = await import("./page");
    await expect(
      AccountReportsPage({ params: Promise.resolve({ locale: "vi" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dang-nhap?callbackURL=%2Ftai-khoan%2Fbao-cao");
    expect(redirect).toHaveBeenCalledWith(
      "/dang-nhap?callbackURL=%2Ftai-khoan%2Fbao-cao",
    );
  });

  it("redirects unauthenticated EN visitor to localized sign-in callback", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const { default: AccountReportsPage } = await import("./page");
    await expect(
      AccountReportsPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan%2Fbao-cao",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan%2Fbao-cao",
    );
  });

  it("loads library for authenticated user and renders reports grouped by profile", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountLibrary).mockResolvedValue({
      ok: true,
      value: mockLibrary,
    });

    const { default: AccountReportsPage } = await import("./page");
    const element = await AccountReportsPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Hồ sơ của Lan");
    expect(html).toContain("Báo cáo Lan 1");
    expect(html).toContain("href=\"/bao-cao/rep-1\"");
    expect(html).toContain("Đọc báo cáo");
  });

  it("renders localized bounded error when loadAccountLibrary fails in VI and EN", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountLibrary).mockResolvedValue({
      ok: false,
      error: {
        code: "COMMERCE_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });

    const { default: AccountReportsPage } = await import("./page");

    const elementVi = await AccountReportsPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const htmlVi = renderToStaticMarkup(elementVi);
    expect(htmlVi).toContain("role=\"alert\"");
    expect(htmlVi).toContain("Dịch vụ báo cáo tạm thời không khả dụng. Vui lòng thử lại sau.");
    expect(htmlVi).not.toContain("Chưa có báo cáo nào");
    expect(htmlVi).not.toContain("/tao-la-so/tu-vi");

    const elementEn = await AccountReportsPage({
      params: Promise.resolve({ locale: "en" }),
    });
    const htmlEn = renderToStaticMarkup(elementEn);
    expect(htmlEn).toContain("role=\"alert\"");
    expect(htmlEn).toContain("Report service is temporarily unavailable. Please try again later.");
    expect(htmlEn).not.toContain("No reports yet");
    expect(htmlEn).not.toContain("/en/tao-la-so/tu-vi");
  });

  it("exports force-dynamic and robots metadata", async () => {
    const pageModule = await import("./page");
    expect(pageModule.dynamic).toBe("force-dynamic");
    expect(pageModule.metadata).toMatchObject({
      robots: { index: false, follow: false },
    });
  });
});
