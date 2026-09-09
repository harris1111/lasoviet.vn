import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

let mockLocale = "vi";
vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../../../../messages/vi/reports.json")).default;
  const enMessages = (await import("../../../../../../messages/en/reports.json")).default;
  return {
    useTranslations: (namespace?: string) => {
      return (key: string, values?: Record<string, unknown>) => {
        const messages = mockLocale === "en" ? enMessages : viMessages;
        let val: unknown = messages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        if (typeof val === "string") {
          if (values) {
            return Object.entries(values).reduce(
              (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
              val,
            );
          }
          return val;
        }
        return key;
      };
    },
  };
});

vi.mock("../../../../../auth/resolve-current-actor", () => {
  class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
      this.name = "VerifiedAccountResolutionError";
    }
  }
  return {
    VerifiedAccountResolutionError,
    resolveVerifiedAccountActor: vi.fn(),
  };
});

vi.mock("../../../../../features/account/account-data-loader", () => ({
  accountDataLoader: {
    loadLibrary: vi.fn(),
  },
}));

vi.mock("../../../../../features/reports/load-free-identity-preview", () => ({
  freeIdentityPreviewLoader: {
    loadTopics: vi.fn(),
  },
}));

vi.mock("../../../../../features/ziwei/load-ziwei-chart", () => ({
  loadZiweiChart: {
    loadChart: vi.fn(),
  },
}));

import {
  resolveVerifiedAccountActor,
  VerifiedAccountResolutionError,
} from "../../../../../auth/resolve-current-actor";
import { accountDataLoader } from "../../../../../features/account/account-data-loader";
import { freeIdentityPreviewLoader } from "../../../../../features/reports/load-free-identity-preview";
import { loadZiweiChart } from "../../../../../features/ziwei/load-ziwei-chart";
import PaidTopicSelectionPage from "./page";

const mockTopics = {
  version: 1,
  chartId: "chart-1",
  chartVersionId: "ver-1",
  offers: [
    {
      sku: "ZIWEI-IDENTITY-P0",
      method: "ziwei",
      price: 79000,
      currency: "VND",
      sections: ["core-identity", "transformations"],
    },
  ],
};

const mockChart = {
  chartId: "chart-1",
  chartVersionId: "ver-1",
  birthSummary: {
    displayName: "Minh An",
    normalizedCalendar: { kind: "solar", date: "1994-04-12" },
    normalizedTime: { precision: "exact_minute", localTime: "09:05" },
    timezoneProvenance: { source: "offset", offsetMinutes: 420 },
  },
};

const verifiedActor = {
  kind: "account" as const,
  userId: "user-1",
  sessionId: "session-1",
  requestId: "req-1",
};

describe("PaidTopicSelectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = "vi";
    vi.mocked(freeIdentityPreviewLoader.loadTopics).mockResolvedValue({
      ok: true,
      value: mockTopics as any,
    });
    vi.mocked(loadZiweiChart.loadChart).mockResolvedValue({
      ok: true,
      value: mockChart as any,
    });
  });

  it("renders purchase CTA for unverified visitor without errors", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );

    const jsx = await PaidTopicSelectionPage({
      params: Promise.resolve({ chartId: "chart-1", locale: "vi" }),
    });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Chọn chủ đề luận giải cho Minh An");
    expect(html).toContain("Tiếp tục thanh toán");
    expect(html).toContain("Xem bản luận giải mẫu");
    expect((html.match(/type="submit"/g) || []).length).toBe(1);
    expect(accountDataLoader.loadLibrary).not.toHaveBeenCalled();
  });

  it("renders Read again button and zero purchase buttons for verified owner with ready report", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(verifiedActor);
    vi.mocked(accountDataLoader.loadLibrary).mockResolvedValue({
      ok: true,
      value: {
        version: 1,
        groups: [],
        items: [
          {
            id: "ent-1",
            entitlementId: "ent-1",
            orderId: "ord-1",
            chartId: "chart-1",
            profileId: "prof-1",
            profileDisplayName: "Minh An",
            sku: "ZIWEI-IDENTITY-P0",
            productTitle: "Luận giải Tử Vi toàn diện",
            productName: "Luận giải Tử Vi toàn diện",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: "rep-ready-1",
            readUrl: "/bao-cao/rep-ready-1",
            reportStatus: "ready",
            locale: "vi",
            createdAt: "2026-09-09T00:00:00.000Z",
            purchasedAt: "2026-09-09T00:00:00.000Z",
          },
        ],
        latestReadableReport: null,
        totalCount: 1,
      },
    });

    const jsx = await PaidTopicSelectionPage({
      params: Promise.resolve({ chartId: "chart-1", locale: "vi" }),
    });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Đọc lại");
    expect(html).toContain('href="/bao-cao/rep-ready-1"');
    expect(html).not.toContain("Tiếp tục thanh toán");
    expect((html.match(/type="submit"/g) || []).length).toBe(0);
  });

  it("renders View progress and zero purchase buttons for verified owner with processing report", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(verifiedActor);
    vi.mocked(accountDataLoader.loadLibrary).mockResolvedValue({
      ok: true,
      value: {
        version: 1,
        groups: [],
        items: [
          {
            id: "ent-1",
            entitlementId: "ent-1",
            orderId: "ord-1",
            chartId: "chart-1",
            profileId: "prof-1",
            profileDisplayName: "Minh An",
            sku: "ZIWEI-IDENTITY-P0",
            productTitle: "Luận giải Tử Vi toàn diện",
            productName: "Luận giải Tử Vi toàn diện",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: "rep-generating-1",
            readUrl: null,
            reportStatus: "generating",
            locale: "vi",
            createdAt: "2026-09-09T00:00:00.000Z",
            purchasedAt: "2026-09-09T00:00:00.000Z",
          },
        ],
        latestReadableReport: null,
        totalCount: 1,
      },
    });

    const jsx = await PaidTopicSelectionPage({
      params: Promise.resolve({ chartId: "chart-1", locale: "vi" }),
    });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Xem tiến trình");
    expect(html).toContain('href="/bao-cao/rep-generating-1"');
    expect(html).not.toContain("Tiếp tục thanh toán");
    expect((html.match(/type="submit"/g) || []).length).toBe(0);
  });

  it("renders bounded unavailable state when verified account library projection fails", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(verifiedActor);
    vi.mocked(accountDataLoader.loadLibrary).mockResolvedValue({
      ok: false,
      error: {
        code: "COMMERCE_UNAVAILABLE",
        messageKey: "account.service_unavailable",
        retryable: true,
      },
    });

    const jsx = await PaidTopicSelectionPage({
      params: Promise.resolve({ chartId: "chart-1", locale: "vi" }),
    });
    const html = renderToStaticMarkup(jsx);

    expect(html).toContain("Tạm thời không thể kiểm tra trạng thái");
    expect(html).toContain("Hệ thống chưa thể tải thông tin sở hữu");
    expect(html).toContain("Xem bản luận giải mẫu");
    expect(html).not.toContain("Tiếp tục thanh toán");
    expect((html.match(/type="submit"/g) || []).length).toBe(0);
  });

  it("performs only read queries and never creates an order across page refreshes (B-9)", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(verifiedActor);
    vi.mocked(accountDataLoader.loadLibrary).mockResolvedValue({
      ok: true,
      value: {
        version: 1,
        groups: [],
        items: [],
        latestReadableReport: null,
        totalCount: 0,
      },
    });

    // Simulate 5 consecutive page refreshes
    for (let i = 0; i < 5; i++) {
      const jsx = await PaidTopicSelectionPage({
        params: Promise.resolve({ chartId: "chart-1", locale: "vi" }),
      });
      expect(jsx).toBeDefined();
    }

    expect(freeIdentityPreviewLoader.loadTopics).toHaveBeenCalledTimes(5);
    expect(loadZiweiChart.loadChart).toHaveBeenCalledTimes(5);
    expect(accountDataLoader.loadLibrary).toHaveBeenCalledTimes(5);
  });

  it("throws notFound when chart loader fails", async () => {
    vi.mocked(loadZiweiChart.loadChart).mockResolvedValue({
      ok: false,
      error: { code: "CHART_NOT_FOUND" } as any,
    });

    await expect(
      PaidTopicSelectionPage({
        params: Promise.resolve({ chartId: "chart-1", locale: "vi" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("throws notFound when topics loader fails", async () => {
    vi.mocked(freeIdentityPreviewLoader.loadTopics).mockResolvedValue({
      ok: false,
      error: { code: "TOPICS_NOT_FOUND" } as any,
    });

    await expect(
      PaidTopicSelectionPage({
        params: Promise.resolve({ chartId: "chart-1", locale: "vi" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
