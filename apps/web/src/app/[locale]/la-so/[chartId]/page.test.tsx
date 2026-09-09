import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const mockZiweiTranslations = {
  vi: {
    title: "Lá số Tử Vi",
    personalizedTitle: "Lá số Tử Vi của {name}",
    heroCopy: "Bản đồ sao cá nhân chi tiết",
    personalizedHeroCopy: "Bản đồ sao cá nhân của {name}",
    private: "Bảo mật",
    topicLink: "Chọn chủ đề luận giải",
    "deletion.title": "Xóa dữ liệu",
    "deletion.description": "Xóa dữ liệu ẩn danh",
    "deletion.begin": "Bắt đầu",
    "deletion.confirmation": "Xác nhận",
    "deletion.cancel": "Hủy",
    "deletion.confirm": "Xác nhận xóa",
    "deletion.pending": "Đang xóa...",
    "deletion.error": "Lỗi",
  },
  en: {
    title: "Zi Wei Chart",
    personalizedTitle: "Zi Wei Chart for {name}",
    heroCopy: "Detailed natal chart",
    personalizedHeroCopy: "Detailed natal chart for {name}",
    private: "Private",
    topicLink: "Choose a reading topic",
    "deletion.title": "Delete data",
    "deletion.description": "Delete anonymous data",
    "deletion.begin": "Start",
    "deletion.confirmation": "Confirm",
    "deletion.cancel": "Cancel",
    "deletion.confirm": "Confirm deletion",
    "deletion.pending": "Deleting...",
    "deletion.error": "Error",
  },
};

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    return (key: string, values?: Record<string, unknown>) => {
      const localeMessages = mockZiweiTranslations.vi;
      let val = (localeMessages as Record<string, string>)[key] ?? key;
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          val = val.replace("{" + k + "}", String(v));
        }
      }
      return val;
    };
  }),
}));

vi.mock("../../../../auth/resolve-current-actor", () => ({
  resolveCurrentActor: vi.fn(),
}));

vi.mock("../../../../features/ziwei/load-ziwei-chart", () => ({
  loadZiweiChart: {
    loadChart: vi.fn(),
  },
}));

vi.mock("../../../../features/reports/load-free-identity-preview", () => ({
  freeIdentityPreviewLoader: {
    loadPreview: vi.fn(),
  },
}));

vi.mock("../../../../features/ziwei/calculate-ziwei-chart-action", () => ({
  loadZiweiEvidence: vi.fn(),
}));

vi.mock("../../../../features/ziwei/ziwei-chart", () => ({
  ZiweiChart: () => <div data-testid="mock-ziwei-chart" />,
}));

vi.mock("../../../../features/ziwei/ziwei-result-summary", () => ({
  ZiweiResultSummary: () => <div data-testid="mock-ziwei-result-summary" />,
}));

vi.mock("../../../../features/reports/free-identity-preview", () => ({
  FreeIdentityPreview: () => <div data-testid="mock-free-preview" />,
}));

vi.mock("../../../../features/privacy/anonymous-data-deletion-control", () => ({
  AnonymousDataDeletionControl: () => <div data-testid="mock-deletion-control" />,
}));

import { resolveCurrentActor } from "../../../../auth/resolve-current-actor";
import { freeIdentityPreviewLoader } from "../../../../features/reports/load-free-identity-preview";
import { loadZiweiChart } from "../../../../features/ziwei/load-ziwei-chart";
import ZiweiChartResultPage from "./page";

describe("ZiweiChartResultPage (WP-05 offer promise alignment)", () => {
  const chartId = "chart-test-123";
  const mockChartSuccess = {
    ok: true,
    value: {
      version: 1,
      chartId,
      chartVersionId: "cv-1",
      birthSummary: {
        displayName: "Minh An",
        normalizedCalendar: { kind: "solar", date: "1994-04-12" },
        normalizedTime: { precision: "exact_minute", localTime: "09:05" },
        timezoneProvenance: { source: "offset", offsetMinutes: 420 },
      },
      chart: {
        version: 1,
        systemId: "ziwei",
        palaces: [],
        transformations: [],
        soulPalaceId: "ziwei.palace.life",
        bodyPalaceId: "ziwei.palace.career",
        horoscopeCapabilities: [],
        warnings: [],
        provenance: {
          version: 1,
          engineId: "ziwei.iztro",
          engineVersion: "2.6.0",
          adapterId: "ziwei.iztro-adapter",
          adapterVersion: "1",
          schemaId: "ziwei.chart.v1",
          ruleSetId: "ziwei.default",
          inputHash: "a".repeat(64),
          configHash: "b".repeat(64),
          rawSnapshotHash: "c".repeat(64),
          calculatedAt: "2026-09-02T00:00:00+00:00",
          limitations: [],
        },
      },
    },
  };

  const mockPreviewSuccess = {
    ok: true,
    value: {
      version: 1,
      chartId,
      chartVersionId: "cv-1",
      strengthInsight: { id: "strength", title: "Thế mạnh", explanation: "...", evidenceIds: [] },
      tensionInsight: { id: "tension", title: "Điểm căng", explanation: "...", evidenceIds: [] },
      paidPreview: { sku: "ZIWEI-IDENTITY-P0", sectionId: "personal_summary", coveragePercent: 12, evidence: [] },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadZiweiChart.loadChart).mockResolvedValue(mockChartSuccess as never);
    vi.mocked(freeIdentityPreviewLoader.loadPreview).mockResolvedValue(mockPreviewSuccess as never);
    vi.mocked(resolveCurrentActor).mockResolvedValue({ kind: "account", userId: "u1" } as never);
  });

  it("renders synchronized Vietnamese offer title and avoids lifetime forecasting promises in paid CTA", async () => {
    const page = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId, locale: "vi" }),
    });
    const html = renderToStaticMarkup(page);

    // Paid report CTA assertions
    expect(html).toContain("Luận giải chuyên sâu");
    expect(html).toContain("Luận giải Tử Vi toàn diện");
    expect(html).toContain("79.000 ₫");
    expect(html).toContain("/la-so/chart-test-123/chon-luan-giai");
    expect(html).toContain("/bao-cao-mau/tu-vi");

    // Must not contain legacy titles or destiny forecasting promises in the CTA
    const ctaMatch = html.match(/<section[^>]*class="result-paid-report-cta"[^>]*>([\s\S]*?)<\/section>/);
    expect(ctaMatch).not.toBeNull();
    const ctaHtml = ctaMatch![1]!;
    expect(ctaHtml).not.toContain("Bản mệnh &amp; Tiềm năng");
    expect(ctaHtml).not.toContain("Bản mệnh & Tiềm năng");
    expect(ctaHtml).not.toContain("Destiny Report");
    expect(ctaHtml).not.toContain("trọn đời");
    expect(ctaHtml).not.toContain("vận trình thời gian");

    // Must not expose raw internal SKU identifiers
    expect(html).not.toContain("ZIWEI-IDENTITY-P0");
    expect(html).not.toMatch(/ZIWEI-[A-Z]+/);
  });

  it("renders synchronized English offer title in English locale", async () => {
    const page = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId, locale: "en" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("In-depth interpretation");
    expect(html).toContain("Comprehensive Zi Wei reading");
    expect(html).toContain("79,000 VND");
    expect(html).toContain("/en/la-so/chart-test-123/chon-luan-giai");
    expect(html).toContain("/en/bao-cao-mau/tu-vi");

    // Must not contain legacy titles in the CTA
    const ctaMatch = html.match(/<section[^>]*class="result-paid-report-cta"[^>]*>([\s\S]*?)<\/section>/);
    expect(ctaMatch).not.toBeNull();
    const ctaHtml = ctaMatch![1]!;
    expect(ctaHtml).not.toContain("Life Potential &amp; Destiny Report");
    expect(ctaHtml).not.toContain("Full Lifetime Report");
  });

  it("triggers notFound when chart loader fails", async () => {
    vi.mocked(loadZiweiChart.loadChart).mockResolvedValue({ ok: false, error: { code: "CHART_NOT_FOUND" } } as never);

    await expect(
      ZiweiChartResultPage({ params: Promise.resolve({ chartId, locale: "vi" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("triggers notFound when preview loader fails", async () => {
    vi.mocked(freeIdentityPreviewLoader.loadPreview).mockResolvedValue({ ok: false, error: { code: "PREVIEW_NOT_FOUND" } } as never);

    await expect(
      ZiweiChartResultPage({ params: Promise.resolve({ chartId, locale: "vi" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
