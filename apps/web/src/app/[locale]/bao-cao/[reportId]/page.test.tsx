import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  type ReportFailedViewV1,
  type ReportPendingViewV1,
  type ReportReadyViewV1,
} from "@lasoviet/contracts";

import { notFound, redirect } from "next/navigation";
import { reportLoader } from "../../../../features/reports/load-report";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

vi.mock("next-intl", async () => {
  const viMessages = await import("../../../../../messages/vi/reports.json");
  return {
    useTranslations: (namespace?: string) => {
      return (key: string, values?: Record<string, unknown>) => {
        let val: unknown = viMessages.default || viMessages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        if (typeof val === "string") {
          if (values) {
            return Object.entries(values).reduce(
              (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
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

vi.mock("../../../../features/reports/load-report", () => ({
  reportLoader: {
    loadReport: vi.fn(),
  },
}));

const sectionIds = [
  "personal_summary",
  "data_and_method",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "cycles_and_timing",
  "within_control",
  "reflection_questions",
  "action_summary",
  "limitations_and_disclaimer",
] as const;

const mockReadyViSections = sectionIds.map((id, index) => ({
  id,
  title: id === "limitations_and_disclaimer"
    ? "Tuyên Bố Miễn Trừ"
    : index === 0 ? "Tổng quan lá số" : `Mục ${index + 1}`,
  narrative: index === 0
    ? "Bản chất xu hướng nổi trội <script>alert('xss')</script>"
    : `Nội dung mục ${index + 1}`,
  claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
    ? []
    : [{
      id: `claim-${index + 1}`,
      text: index === 0 ? "Nhận định cung mệnh" : `Nhận định ${index + 1}`,
      evidenceIds: ["ziwei.identity.life-palace"],
      interpretationBoundCode: "reflective_identity_only" as const,
      confidence: "high" as const,
      limitations: ["TIME_BRANCH_ONLY"],
      suggestedActions: [{
        category: "reflect" as const,
        text: "Quan sát bản thân",
      }],
    }],
}));

const mockReadyVi: ReportReadyViewV1 = {
  version: 1,
  state: "ready",
  reportId: "rep-vi-1",
  reportVersionId: "rep-ver-vi-1",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "complete",
  content: {
    sections: mockReadyViSections,
    reflectionQuestions: [
      "Câu hỏi tự suy ngẫm 1",
      "Câu hỏi tự suy ngẫm 2",
      "Câu hỏi tự suy ngẫm 3",
    ],
    summaryActions: ["Gợi ý hành động 1", "Gợi ý hành động 2"],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  },
  evidence: [
    {
      id: "ziwei.identity.life-palace",
      factReferences: ["soulPalaceId"],
      confidence: "high",
      interpretationBounds: ["Giới hạn diễn giải mệnh reflective identity"],
      interpretationBoundCodes: ["reflective_identity_only"],
      limitations: ["TIME_BRANCH_ONLY"],
      riskTags: ["identity"],
      allowedActionCategories: ["reflect"],
    },
  ],
  lineage: {
    supersedesReportVersionId: null,
  },
  provenance: {
    method: "ziwei",
    ruleVersion: "1.0",
    evidenceVersion: 1,
    knowledgeVersion: "1.0",
    templateVersion: "identity-report-html.v1",
    createdAt: "2026-09-05T00:00:00.000+07:00",
  },
};

const mockReadyEn: ReportReadyViewV1 = {
  ...mockReadyVi,
  reportId: "rep-en-1",
  locale: "en",
  content: {
    ...mockReadyVi.content,
    sections: mockReadyVi.content.sections.map((s) => ({
      ...s,
      title: `EN ${s.title}`,
      narrative: `EN ${s.narrative}`,
      claims: s.claims.map((c) => ({ ...c, text: `EN ${c.text}` })),
    })),
    reflectionQuestions: ["EN Question 1", "EN Question 2", "EN Question 3"],
    summaryActions: ["EN Action 1"],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  },
};

const mockPending: ReportPendingViewV1 = {
  version: 1,
  state: "pending",
  reportId: "rep-pending-1",
  reportVersionId: "rep-ver-p-1",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "generating",
  refreshAfterMs: 5000,
};

const mockFailed: ReportFailedViewV1 = {
  version: 1,
  state: "failed",
  reportId: "rep-failed-1",
  reportVersionId: "rep-ver-f-1",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "terminal_failure",
};

describe("ReportPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls notFound when route locale is neither vi nor en", async () => {
    const { default: ReportPage } = await import("./page");
    await expect(
      ReportPage({ params: Promise.resolve({ locale: "fr" as never, reportId: "rep-1" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("redirects unauthenticated VI visitor to localized sign-in callback", async () => {
    vi.mocked(reportLoader.loadReport).mockResolvedValue({
      ok: false,
      error: {
        code: "REPORT_AUTH_REQUIRED",
        messageKey: "reports.auth_required",
        retryable: false,
      },
    });

    const { default: ReportPage } = await import("./page");
    await expect(
      ReportPage({ params: Promise.resolve({ locale: "vi", reportId: "rep-1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dang-nhap?callbackURL=%2Fbao-cao%2Frep-1");
    expect(redirect).toHaveBeenCalledWith("/dang-nhap?callbackURL=%2Fbao-cao%2Frep-1");
  });

  it("redirects unauthenticated EN visitor to localized sign-in callback", async () => {
    vi.mocked(reportLoader.loadReport).mockResolvedValue({
      ok: false,
      error: {
        code: "REPORT_AUTH_REQUIRED",
        messageKey: "reports.auth_required",
        retryable: false,
      },
    });

    const { default: ReportPage } = await import("./page");
    await expect(
      ReportPage({ params: Promise.resolve({ locale: "en", reportId: "rep-1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/en/dang-nhap?callbackURL=%2Fen%2Fbao-cao%2Frep-1");
    expect(redirect).toHaveBeenCalledWith("/en/dang-nhap?callbackURL=%2Fen%2Fbao-cao%2Frep-1");
  });

  it("calls notFound when report is missing or cross-owner", async () => {
    vi.mocked(reportLoader.loadReport).mockResolvedValue({
      ok: false,
      error: {
        code: "REPORT_NOT_FOUND",
        messageKey: "reports.report_not_found",
        retryable: false,
      },
    });

    const { default: ReportPage } = await import("./page");
    await expect(
      ReportPage({ params: Promise.resolve({ locale: "vi", reportId: "rep-missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("redirects to authoritative VI path if persisted locale is vi but requested at /en/", async () => {
    vi.mocked(reportLoader.loadReport).mockResolvedValue({
      ok: true,
      value: mockReadyVi,
    });

    const { default: ReportPage } = await import("./page");
    await expect(
      ReportPage({ params: Promise.resolve({ locale: "en", reportId: "rep-vi-1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/bao-cao/rep-vi-1");
    expect(redirect).toHaveBeenCalledWith("/bao-cao/rep-vi-1");
  });

  it("redirects to authoritative EN path if persisted locale is en but requested at /vi/", async () => {
    vi.mocked(reportLoader.loadReport).mockResolvedValue({
      ok: true,
      value: mockReadyEn,
    });

    const { default: ReportPage } = await import("./page");
    await expect(
      ReportPage({ params: Promise.resolve({ locale: "vi", reportId: "rep-en-1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/en/bao-cao/rep-en-1");
    expect(redirect).toHaveBeenCalledWith("/en/bao-cao/rep-en-1");
  });

  it("renders pending progress component with role='status' and message-backed copy", async () => {
    vi.mocked(reportLoader.loadReport).mockResolvedValue({
      ok: true,
      value: mockPending,
    });

    const { default: ReportPage } = await import("./page");
    const element = await ReportPage({
      params: Promise.resolve({ locale: "vi", reportId: "rep-pending-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('role="status"');
    expect(html).toContain("Báo cáo đang được xử lý");
    expect(html).toContain("Đang tổng hợp nội dung luận giải...");
    expect(html).not.toContain("<script>");
  });

  it("renders failed progress component with role='alert' and message-backed copy", async () => {
    vi.mocked(reportLoader.loadReport).mockResolvedValue({
      ok: true,
      value: mockFailed,
    });

    const { default: ReportPage } = await import("./page");
    const element = await ReportPage({
      params: Promise.resolve({ locale: "vi", reportId: "rep-failed-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Chưa thể hoàn tất báo cáo");
    expect(html).not.toContain("lastErrorCode");
    expect(html).not.toContain("terminal_failure");
  });

  it("renders ready report reader with frontispiece, localized alt, sections, disclosure, and escaped content", async () => {
    vi.mocked(reportLoader.loadReport).mockResolvedValue({
      ok: true,
      value: mockReadyVi,
    });

    const { default: ReportPage } = await import("./page");
    const element = await ReportPage({
      params: Promise.resolve({ locale: "vi", reportId: "rep-vi-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("frontispiece-bao-cao-luan-giai-tu-vi.webp");
    expect(html).toContain("Bìa báo cáo luận giải Tử Vi — ảnh vật phẩm sơn mài");
    expect(html).toContain("Lá Số Việt dùng công cụ tính toán theo phương pháp và AI để tổ chức, đối chiếu và diễn giải bằng tiếng Việt. Mỗi nhận định quan trọng đều gắn với dữ liệu lá số được sử dụng.");
    expect(html).toContain("Tổng quan lá số");
    expect(html).toContain("Căn cứ Cung Mệnh");
    expect(html).toContain("Câu hỏi tự suy ngẫm 1");
    expect(html).toContain("Gợi ý hành động 1");
    expect(html).toContain("Hết báo cáo");

    expect(html).not.toContain("Giới hạn ghi nhận");
    expect(html).not.toContain("Tuyên Bố Miễn Trừ");
    expect(html).not.toContain("Độ tin cậy");
    expect(html).not.toContain("Giới hạn diễn giải");
    expect(html).not.toContain("Trường dữ liệu căn cứ");
    expect(html).not.toContain("reflective identity");

    // Must never render script sentinels as raw HTML
    expect(html).not.toContain("<script>alert('xss')</script>");
    expect(html).toContain("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
  });

  it("exports force-dynamic and static robots metadata", async () => {
    const pageModule = await import("./page");
    expect(pageModule.dynamic).toBe("force-dynamic");
    expect(pageModule.metadata).toMatchObject({
      robots: { index: false, follow: false },
    });
  });
});
