import { ZIWEI_PALACE_IDS, type FreeIdentityPreviewV1 } from "@lasoviet/contracts";
import { CANONICAL_BRANCH_SEQUENCE } from "../../../../features/ziwei/ziwei-chart-relations";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  usePathname: vi.fn(() => null),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
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

vi.mock("next-intl", () => {
  const viZiwei = require("../../../../../messages/vi/ziwei.json");
  const viReports = require("../../../../../messages/vi/reports.json");
  return {
    useTranslations: (ns: string) => {
      const msgs = ns === "reports" ? viReports : viZiwei;
      return (key: string, values?: Record<string, unknown>) => {
        const parts = key.split(".");
        let curr: any = msgs;
        for (const p of parts) {
          curr = curr?.[p];
        }
        let val = typeof curr === "string" ? curr : key;
        if (values) {
          for (const [k, v] of Object.entries(values)) {
            val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return val;
      };
    },
  };
});

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
    loadHoroscope: vi.fn().mockResolvedValue({ ok: false }),
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
import { PrivateApiClientError } from "../../../../api/private-api-client";

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
        palaces: ZIWEI_PALACE_IDS.map((id, index) => ({
          id, earthlyBranchId: CANONICAL_BRANCH_SEQUENCE[index]!,
          stars: [{ id: "ziwei.star.ziwei", category: "major" as const, brightness: "ziwei.brightness.exalted" as const }],
        })),
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

  const mockPreviewSuccess: { ok: true; value: FreeIdentityPreviewV1 } = {
    ok: true,
    value: {
      version: 1,
      chartId,
      chartVersionId: "cv-1",
      capabilityId: "ziwei.identity.p0",
      summaryVersion: "ziwei.identity.free.v1",
      insights: [
        {
          id: "life-palace",
          evidence: {
            evidenceId: "ziwei.identity.life-palace",
            factReferences: ["fact-life-1"],
            confidence: "high",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Authorized safe boundary 1"],
            limitations: ["Standard limitation 1"],
          },
        },
        {
          id: "body-palace",
          evidence: {
            evidenceId: "ziwei.identity.body-palace",
            factReferences: ["fact-body-1"],
            confidence: "moderate",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Authorized safe boundary 2"],
            limitations: ["Standard limitation 2"],
          },
        },
        {
          id: "transformations",
          evidence: {
            evidenceId: "ziwei.identity.transformations",
            factReferences: ["fact-trans-1"],
            confidence: "high",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Authorized safe boundary 3"],
            limitations: ["Standard limitation 3"],
          },
        },
      ],
      strengthSignal: {
        id: "strength",
        evidence: {
          evidenceId: "ziwei.identity.life-palace",
          factReferences: ["fact-life-1"],
          confidence: "high",
          interpretationBoundCodes: ["reflective_identity_only"],
          interpretationBounds: ["Authorized safe boundary 1"],
          limitations: ["Standard limitation 1"],
        },
      },
      tensionSignal: {
        id: "tension",
        evidence: [
          {
            evidenceId: "ziwei.identity.body-palace",
            factReferences: ["fact-body-1"],
            confidence: "moderate",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Authorized safe boundary 2"],
            limitations: ["Standard limitation 2"],
          },
          {
            evidenceId: "ziwei.identity.transformations",
            factReferences: ["fact-trans-1"],
            confidence: "high",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Authorized safe boundary 3"],
            limitations: ["Standard limitation 3"],
          },
        ],
      },
      paidPreview: {
        sku: "ZIWEI-IDENTITY-P0",
        sectionId: "personal_summary",
        coveragePercent: 12,
        evidence: [
          {
            evidenceId: "ziwei.identity.life-palace",
            factReferences: ["fact-life-1"],
            confidence: "high",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Authorized safe boundary 1"],
            limitations: ["Standard limitation 1"],
          },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadZiweiChart.loadChart).mockResolvedValue(mockChartSuccess as never);
    vi.mocked(loadZiweiChart.loadHoroscope).mockResolvedValue({ ok: false } as never);
    vi.mocked(freeIdentityPreviewLoader.loadPreview).mockResolvedValue(mockPreviewSuccess as never);
    vi.mocked(resolveCurrentActor).mockResolvedValue({ kind: "account", userId: "u1", emailVerified: true } as never);
  });

  it("renders FD109 read-first completion without the old paid offer section", async () => {
    const page = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId, locale: "vi" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Bạn đã xem phần miễn phí");
    expect(html).not.toContain("Bạn đã đọc xong phần miễn phí");
    expect(html).toContain("Xem các gói luận giải");
    expect(html).toContain("Bạn đang xem các sao và điểm cấu trúc của lá số");
    expect(html).toContain("/la-so/chart-test-123/chon-luan-giai");
    expect(html).not.toContain("result-paid-report-cta");
    expect(html).not.toContain("79.000 ₫");
    expect(html).not.toContain("240 Lá");

    // Must not expose raw internal SKU identifiers
    expect(html).not.toContain("ZIWEI-IDENTITY-P0");
    expect(html).not.toMatch(/ZIWEI-[A-Z]+/);
  });

  it("uses the localized English offer destination without the old paid section", async () => {
    const page = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId, locale: "en" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("/en/la-so/chart-test-123/chon-luan-giai");
    expect(html).not.toContain("result-paid-report-cta");
    expect(html).not.toContain("79,000 VND");
  });

  it("triggers notFound when chart loader fails", async () => {
    vi.mocked(loadZiweiChart.loadChart).mockResolvedValue({ ok: false, error: { code: "CHART_NOT_FOUND" } } as never);

    await expect(
      ZiweiChartResultPage({ params: Promise.resolve({ chartId, locale: "vi" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each([false, undefined])("redacts the second insight when account verification is %s", async (emailVerified) => {
    vi.mocked(resolveCurrentActor).mockResolvedValue({ kind: "account", userId: "u1", emailVerified } as never);
    vi.mocked(freeIdentityPreviewLoader.loadPreview).mockResolvedValue({
      ...mockPreviewSuccess,
      value: {
        ...mockPreviewSuccess.value,
        audience: "verified",
        insightDetails: [
          { id: "life-palace", numeral: "01", title: "Visible", tagline: "Visible", description: "VISIBLE_FIRST",
            evidenceId: "ziwei.identity.life-palace", isLocked: false },
          { id: "top-concern", numeral: "02", title: "SECOND_SECRET_TITLE", tagline: "SECOND_SECRET_TAG",
            description: "SECOND_SECRET_PROSE", evidenceId: "ziwei.identity.life-palace", isLocked: false },
        ],
      },
    });
    const page = await ZiweiChartResultPage({ params: Promise.resolve({ chartId, locale: "vi" }) });
    const html = renderToStaticMarkup(page);
    expect(html).not.toContain("VISIBLE_FIRST");
    expect(html).toContain("data-free-result-block=\"insights\"");
    expect(html).not.toContain("SECOND_SECRET");
    expect(html).toContain("Lưu lá số miễn phí");
    expect(html).toMatch(/data-testid="fd109-sticky" hidden=""/);
  });

  it("preserves the authorized chart when optional evidence is insufficient", async () => {
    vi.mocked(freeIdentityPreviewLoader.loadPreview).mockResolvedValue({ ok: false, error: { code: "INSUFFICIENT_EVIDENCE" } } as never);
    const page = await ZiweiChartResultPage({ params: Promise.resolve({ chartId, locale: "vi" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('data-testid="fd109-free-result"');
    expect(html).toContain("Bạn đã xem phần miễn phí");
  });

  it("uses structural fallback for malformed optional preview responses", async () => {
    vi.mocked(freeIdentityPreviewLoader.loadPreview).mockRejectedValue(new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID"));
    const page = await ZiweiChartResultPage({ params: Promise.resolve({ chartId, locale: "vi" }) });
    expect(renderToStaticMarkup(page)).toContain('data-testid="fd109-free-result"');
  });
  it("does not suppress preview transport/authorization failures", async () => {
    vi.mocked(freeIdentityPreviewLoader.loadPreview).mockRejectedValue(new PrivateApiClientError("PRIVATE_API_UNREACHABLE"));
    await expect(ZiweiChartResultPage({ params: Promise.resolve({ chartId, locale: "vi" }) })).rejects.toThrow("PRIVATE_API_UNREACHABLE");
  });

  it("triggers notFound when preview loader fails", async () => {
    vi.mocked(freeIdentityPreviewLoader.loadPreview).mockResolvedValue({ ok: false, error: { code: "PREVIEW_NOT_FOUND" } } as never);

    await expect(
      ZiweiChartResultPage({ params: Promise.resolve({ chartId, locale: "vi" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("renders localized sign-in CTA returning to chart URL when actor is anonymous in VI", async () => {
    vi.mocked(resolveCurrentActor).mockResolvedValue({ kind: "anonymous", actorId: "anon-1" } as never);
    const page = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId, locale: "vi" }),
    });
    const html = renderToStaticMarkup(page);

    const expectedCallback = encodeURIComponent("/la-so/" + chartId);
    const expectedHref = "/dang-nhap?callbackURL=" + expectedCallback;

    // Privacy note link
    expect(html).toContain("Đăng nhập để lưu lại");
    expect(html).toContain("href=\"" + expectedHref + "\"");

    // Header links on chart result page also carry current chart callback
    expect(html).toContain("class=\"login-link\"");
    expect(html).toContain("href=\"" + expectedHref + "\"");
    expect(html).toContain("class=\"mobile-login-link\" href=\"" + expectedHref + "\"");
  });

  it("renders localized sign-in CTA returning to chart URL when actor is anonymous in EN", async () => {
    vi.mocked(resolveCurrentActor).mockResolvedValue({ kind: "anonymous", actorId: "anon-1" } as never);
    const page = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId, locale: "en" }),
    });
    const html = renderToStaticMarkup(page);

    const expectedCallback = encodeURIComponent("/en/la-so/" + chartId);
    const expectedHref = "/en/dang-nhap?callbackURL=" + expectedCallback;

    // Privacy note link
    expect(html).toContain("Sign in to keep it");
    expect(html).toContain("href=\"" + expectedHref + "\"");

    // Header links on chart result page also carry current chart callback
    expect(html).toContain("class=\"login-link\"");
    expect(html).toContain("href=\"" + expectedHref + "\"");
    expect(html).toContain("class=\"mobile-login-link\" href=\"" + expectedHref + "\"");
  });

  it("omits anonymous privacy note and sign-in CTA when actor is authenticated account", async () => {
    vi.mocked(resolveCurrentActor).mockResolvedValue({ kind: "account", userId: "u1" } as never);
    const page = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId, locale: "vi" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).not.toContain("result-privacy-note");
    expect(html).not.toContain("Đăng nhập để lưu lại");
  });
});

  it("safely redirects non-canonical query params to canonical URL", async () => {
    const chartId = "chart-test-123";
    await expect(
      ZiweiChartResultPage({
        params: Promise.resolve({ chartId, locale: "vi" }),
        searchParams: Promise.resolve({ tab: "invalid_tab" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/la-so/chart-test-123");

    await expect(
      ZiweiChartResultPage({
        params: Promise.resolve({ chartId, locale: "vi" }),
        searchParams: Promise.resolve({ tab: "topics", open: "career", unknown: "extra" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("renders aggregate year counts without serializing locked months or daily prose", async () => {
    const chartId = "chart-test-123";
    const mockHoroscope = {
      version: 1,
      chartId,
      chartVersionId: "cv-1",
      asOfDate: "2026-09-22",
      isUnlocked: false,
      yearly: {
        targetYear: 2026,
        lunarYear: "Bính Ngọ",
        lunarAge: 35,
        annualPalaceId: "ziwei.palace.career",
        annualPalaceName: "Quan Lộc",
        annualBranch: "Ngọ",
        annualStem: "Bính",
        hanMonthCount: 2,
        favorableMonthCount: 3,
        neutralMonthCount: 7,
        focusAreas: ["tiền bạc"],
        summary: "Năm nay có 2 tháng cần chú ý và 3 tháng thuận.",
        months: Array.from({ length: 12 }, (_, i) => ({
          monthIndex: i + 1,
          marker: i === 2 || i === 6 ? "warn" : "neutral",
          isLocked: i === 2 || i === 6,
          monthNumberDisplay: i === 2 || i === 6 ? "?" : String(i + 1),
          label: i === 2 || i === 6 ? "Tháng hạn, mở để xem" : `Tháng ${i + 1}`,
          evidenceKeys: [],
        })),
        evidenceKeys: [],
      },
      daily: {
        solarDate: "2026-09-22",
        solarDateFormatted: "Thứ Ba, 22/9/2026",
        lunarDateFormatted: "12/8 Bính Ngọ",
        dayStemBranch: "Kỷ Hợi",
        solarTerm: "Bạch Lộ",
        touchedPalaceId: "ziwei.palace.children",
        touchedPalaceName: "Tử Tức",
        headline: "Ngày Kỷ Hợi chạm cung Tử Tức của bạn. Mở mỗi sáng trong gói Hội viên.",
        evidenceKeys: [],
      },
    };

    vi.mocked(loadZiweiChart.loadHoroscope).mockResolvedValue({
      ok: true,
      value: mockHoroscope,
    } as never);

    const page = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId, locale: "vi" }),
      searchParams: Promise.resolve({ tab: "nam-nay" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Năm nay");
    expect(html).toContain("<strong>2</strong>tháng cần chú ý");
    expect(html).toContain("<strong>3</strong>tháng thuận");
    expect(html).not.toContain("Tháng hạn, mở để xem");
    expect(html).not.toContain("Tháng 12");
    expect(html).not.toContain("Ngày Kỷ Hợi");
  });
