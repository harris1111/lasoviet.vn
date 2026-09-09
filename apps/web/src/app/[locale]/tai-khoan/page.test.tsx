import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  AccountLibraryV1,
  CurrentActor,
  OrderHistoryV1,
} from "@lasoviet/contracts";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../auth/resolve-current-actor";
import {
  loadAccountLibrary,
  loadOrderHistory,
} from "../../../features/account/account-data-loader";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("../../../auth/resolve-current-actor", () => ({
  resolveVerifiedAccountActor: vi.fn(),
}));

vi.mock("../../../features/account/account-data-loader", () => ({
  loadAccountLibrary: vi.fn(),
  loadOrderHistory: vi.fn(),
}));

const mockActor: CurrentActor = {
  kind: "account",
  userId: "user-123",
  sessionId: "session-456",
  requestId: "req-789",
};

const mockLibrary: AccountLibraryV1 = {
  version: 1,
  totalCount: 1,
  latestReadableReport: {
    id: "item-1",
    entitlementId: "ent-1",
    orderId: "ord-1",
    chartId: "chart-1",
    profileId: "prof-1",
    profileDisplayName: "Nguyễn Văn A",
    sku: "ZIWEI-IDENTITY-P0",
    productTitle: "Bản mệnh & tiềm năng",
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
  groups: [],
  items: [],
};

const mockOrders: OrderHistoryV1 = {
  version: 1,
  totalCount: 1,
  orders: [
    {
      id: "ord-1",
      orderId: "ord-1",
      invoiceNumber: "LSV-INV-001",
      chartId: "chart-1",
      profileId: "prof-1",
      profileDisplayName: "Nguyễn Văn A",
      sku: "ZIWEI-IDENTITY-P0",
      productTitle: "Bản mệnh & tiềm năng",
      productName: "Bản mệnh & tiềm năng",
      amount: 79_000,
      currency: "VND",
      status: "paid",
      orderStatus: "paid",
      locale: "vi",
      createdAt: "2026-09-08T10:00:00.000Z",
      paidAt: "2026-09-08T10:05:00.000Z",
      reportId: "rep-1",
      readUrl: "/bao-cao/rep-1",
      supportUrl: "/lien-he?order=LSV-INV-001",
    },
  ],
  items: [],
};

describe("AccountPage (/tai-khoan)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when route locale is neither vi nor en", async () => {
    const { default: AccountPage } = await import("./page");
    await expect(
      AccountPage({ params: Promise.resolve({ locale: "fr" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("redirects unauthenticated VI visitor to localized sign-in callback", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const { default: AccountPage } = await import("./page");
    await expect(
      AccountPage({ params: Promise.resolve({ locale: "vi" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dang-nhap?callbackURL=%2Ftai-khoan");
    expect(redirect).toHaveBeenCalledWith(
      "/dang-nhap?callbackURL=%2Ftai-khoan",
    );
  });

  it("redirects unauthenticated EN visitor to localized sign-in callback", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const { default: AccountPage } = await import("./page");
    await expect(
      AccountPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan");
    expect(redirect).toHaveBeenCalledWith(
      "/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan",
    );
  });

  it("loads library and orders for authenticated user and renders dashboard", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountLibrary).mockResolvedValue({
      ok: true,
      value: mockLibrary,
    });
    vi.mocked(loadOrderHistory).mockResolvedValue({
      ok: true,
      value: mockOrders,
    });

    const { default: AccountPage } = await import("./page");
    const element = await AccountPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Báo cáo gần nhất");
    expect(html).toContain("Bản mệnh &amp; tiềm năng");
    expect(html).toContain("LSV-INV-001");
    expect(html).toContain("href=\"/bao-cao/rep-1\"");
  });

  it("renders partial data with localized error when library fails but orders succeed", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountLibrary).mockResolvedValue({
      ok: false,
      error: {
        code: "COMMERCE_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });
    vi.mocked(loadOrderHistory).mockResolvedValue({
      ok: true,
      value: mockOrders,
    });

    const { default: AccountPage } = await import("./page");
    const element = await AccountPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("role=\"alert\"");
    expect(html).toContain("Không thể tải danh sách báo cáo. Vui lòng thử lại sau.");
    expect(html).toContain("LSV-INV-001");
  });

  it("renders partial data with localized error when orders fail but library succeeds", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountLibrary).mockResolvedValue({
      ok: true,
      value: mockLibrary,
    });
    vi.mocked(loadOrderHistory).mockResolvedValue({
      ok: false,
      error: {
        code: "COMMERCE_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });

    const { default: AccountPage } = await import("./page");
    const element = await AccountPage({
      params: Promise.resolve({ locale: "en" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("role=\"alert\"");
    expect(html).toContain("Unable to load order history. Please try again later.");
    expect(html).toContain("Latest report");
  });

  it("renders bounded error when both projections fail", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadAccountLibrary).mockResolvedValue({
      ok: false,
      error: {
        code: "COMMERCE_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });
    vi.mocked(loadOrderHistory).mockResolvedValue({
      ok: false,
      error: {
        code: "COMMERCE_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });

    const { default: AccountPage } = await import("./page");
    const element = await AccountPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("role=\"alert\"");
    expect(html).toContain("Dịch vụ tài khoản tạm thời không khả dụng. Vui lòng thử lại sau.");
  });

  it("exports force-dynamic and robots metadata", async () => {
    const pageModule = await import("./page");
    expect(pageModule.dynamic).toBe("force-dynamic");
    expect(pageModule.metadata).toMatchObject({
      robots: { index: false, follow: false },
    });
  });
});
