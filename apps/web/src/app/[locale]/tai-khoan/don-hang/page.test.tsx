import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { CurrentActor, OrderHistoryV1 } from "@lasoviet/contracts";
import { notFound, redirect } from "next/navigation";

import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import { loadOrderHistory } from "../../../../features/account/account-data-loader";

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
  loadOrderHistory: vi.fn(),
}));

const mockActor: CurrentActor = {
  kind: "account",
  userId: "user-123",
  sessionId: "session-456",
  requestId: "req-789",
};

const mockOrders: OrderHistoryV1 = {
  version: 1,
  totalCount: 2,
  orders: [
    {
      id: "ord-1",
      orderId: "ord-1",
      invoiceNumber: "LSV-INV-2026-001",
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
      supportUrl: "/lien-he?order=LSV-INV-2026-001",
    },
    {
      id: "ord-2",
      orderId: "ord-2",
      invoiceNumber: "LSV-INV-2026-002",
      chartId: "chart-2",
      profileId: "prof-2",
      profileDisplayName: "Trần Thị B",
      sku: "ZIWEI-IDENTITY-P0",
      productTitle: "Báo cáo hết hạn",
      productName: "Báo cáo hết hạn",
      amount: 79_000,
      currency: "VND",
      status: "expired",
      orderStatus: "expired",
      locale: "vi",
      createdAt: "2026-09-08T11:00:00.000Z",
      paidAt: null,
      reportId: null,
      readUrl: null,
      supportUrl: undefined,
    },
  ],
  items: [],
};

describe("AccountOrdersPage (/tai-khoan/don-hang)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when route locale is neither vi nor en", async () => {
    const { default: AccountOrdersPage } = await import("./page");
    await expect(
      AccountOrdersPage({ params: Promise.resolve({ locale: "fr" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("redirects unauthenticated VI visitor to localized sign-in callback", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const { default: AccountOrdersPage } = await import("./page");
    await expect(
      AccountOrdersPage({ params: Promise.resolve({ locale: "vi" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dang-nhap?callbackURL=%2Ftai-khoan%2Fdon-hang");
    expect(redirect).toHaveBeenCalledWith(
      "/dang-nhap?callbackURL=%2Ftai-khoan%2Fdon-hang",
    );
  });

  it("redirects unauthenticated EN visitor to localized sign-in callback", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const { default: AccountOrdersPage } = await import("./page");
    await expect(
      AccountOrdersPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan%2Fdon-hang",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/en/dang-nhap?callbackURL=%2Fen%2Ftai-khoan%2Fdon-hang",
    );
  });

  it("loads orders for authenticated user and renders history including expired in projection order", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadOrderHistory).mockResolvedValue({
      ok: true,
      value: mockOrders,
    });

    const { default: AccountOrdersPage } = await import("./page");
    const element = await AccountOrdersPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("LSV-INV-2026-001");
    expect(html).toContain("LSV-INV-2026-002");
    expect(html).toContain("Đã thanh toán");
    expect(html).toContain("Hết hạn");
    expect(html).toContain("href=\"/bao-cao/rep-1\"");
    expect(html).toContain("href=\"/lien-he?order=LSV-INV-2026-001\"");

    const posPaid = html.indexOf("LSV-INV-2026-001");
    const posExpired = html.indexOf("LSV-INV-2026-002");
    expect(posPaid).toBeLessThan(posExpired);
  });

  it("renders localized bounded error when loadOrderHistory fails in VI and EN", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(mockActor);
    vi.mocked(loadOrderHistory).mockResolvedValue({
      ok: false,
      error: {
        code: "COMMERCE_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });

    const { default: AccountOrdersPage } = await import("./page");

    const elementVi = await AccountOrdersPage({
      params: Promise.resolve({ locale: "vi" }),
    });
    const htmlVi = renderToStaticMarkup(elementVi);
    expect(htmlVi).toContain("role=\"alert\"");
    expect(htmlVi).toContain("Dịch vụ đơn hàng tạm thời không khả dụng. Vui lòng thử lại sau.");
    expect(htmlVi).not.toContain("Chưa có đơn hàng nào");
    expect(htmlVi).not.toContain("/tao-la-so/tu-vi");

    const elementEn = await AccountOrdersPage({
      params: Promise.resolve({ locale: "en" }),
    });
    const htmlEn = renderToStaticMarkup(elementEn);
    expect(htmlEn).toContain("role=\"alert\"");
    expect(htmlEn).toContain("Order history service is temporarily unavailable. Please try again later.");
    expect(htmlEn).not.toContain("No orders yet");
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
