import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));

vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  return {
    useTranslations: () => {
      return (key: string, values?: Record<string, unknown>) => {
        let val: unknown = viMessages;
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

import type {
  ReportComprehensiveV2ReadyViewV1,
  ReportComprehensiveV3ReadyViewV1,
  ReportLegacyReadyViewV1,
} from "@lasoviet/contracts";
import { ReportReader } from "./report-reader";

const legacyReport: ReportLegacyReadyViewV1 = {
  version: 1,
  state: "ready",
  contentVersion: "identity.v1",
  reportId: "rep-legacy-1",
  reportVersionId: "rep-ver-1",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "complete",
  lineage: { supersedesReportVersionId: null },
  provenance: {
    method: "ziwei",
    ruleVersion: "1.0",
    evidenceVersion: 1,
    knowledgeVersion: "1.0",
    templateVersion: "1.0",
    createdAt: "2026-09-14T00:00:00Z",
  },
  evidence: [],
  content: {
    sections: [
      { id: "personal_summary", title: "Cung Mệnh", narrative: "Bản mệnh vững vàng", claims: [] },
      { id: "identity_analysis", title: "Cung Thân", narrative: "Hậu vận hanh thông", claims: [] },
    ],
    professionalAdviceDisclaimer: "Bản luận giải này mang tính tham khảo, chiêm nghiệm, không thay thế cho các quyết định hay tư vấn chuyên môn về y tế, pháp lý, đầu tư tài chính.",
    reflectionQuestions: [],
    summaryActions: [],
  },
};

const v3Report: ReportComprehensiveV3ReadyViewV1 = {
  version: 1,
  state: "ready",
  contentVersion: "ziwei-comprehensive.v3",
  reportId: "rep-v4-1",
  reportVersionId: "rep-ver-v4-1",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "complete",
  lineage: { supersedesReportVersionId: null },
  content: {
    overview: { title: "Tổng quan", narrative: "Nội dung tổng quan." },
    coreAxis: { title: "Trục Mệnh Thân", narrative: "Nội dung trục Mệnh Thân." },
    keyConfigurations: [{ title: "Cách cục", narrative: "Nội dung cách cục." }],
    palaceReadings: [
      { palaceId: "ziwei.palace.life", title: "Cung Mệnh", narrative: "Nội dung cung Mệnh." },
      { palaceId: "ziwei.palace.siblings", title: "Cung Huynh Đệ", narrative: "Nội dung cung Huynh Đệ." },
      { palaceId: "ziwei.palace.spouse", title: "Cung Phu Thê", narrative: "Nội dung cung Phu Thê." },
      { palaceId: "ziwei.palace.children", title: "Cung Tử Tức", narrative: "Nội dung cung Tử Tức." },
      { palaceId: "ziwei.palace.wealth", title: "Cung Tài Bạch", narrative: "Nội dung cung Tài Bạch." },
      { palaceId: "ziwei.palace.health", title: "Cung Tật Ách", narrative: "Nội dung cung Tật Ách." },
      { palaceId: "ziwei.palace.travel", title: "Cung Thiên Di", narrative: "Nội dung cung Thiên Di." },
      { palaceId: "ziwei.palace.friends", title: "Cung Nô Bộc", narrative: "Nội dung cung Nô Bộc." },
      { palaceId: "ziwei.palace.career", title: "Cung Quan Lộc", narrative: "Nội dung cung Quan Lộc." },
      { palaceId: "ziwei.palace.property", title: "Cung Điền Trạch", narrative: "Nội dung cung Điền Trạch." },
      { palaceId: "ziwei.palace.fortune", title: "Cung Phúc Đức", narrative: "Nội dung cung Phúc Đức." },
      { palaceId: "ziwei.palace.parents", title: "Cung Phụ Mẫu", narrative: "Nội dung cung Phụ Mẫu." },
    ],
    thematicSynthesis: [
      "career_wealth", "relationships_family", "social_environment", "wellbeing_inner_resources",
    ].map((id) => ({
      id: id as "career_wealth" | "relationships_family" | "social_environment" | "wellbeing_inner_resources",
      title: `Chủ đề ${id}`,
      narrative: `Nội dung chủ đề ${id}.`,
    })),
    strengthsAndTensions: { title: "Điểm mạnh", narrative: "Nội dung điểm mạnh." },
    currentDecadal: {
      title: "Đại vận hiện tại",
      state: "active",
      index: 2,
      ageRange: [21, 30],
      yearRange: [2021, 2030],
      narrative: "Nội dung đại vận.",
    },
    annualSnapshot: {
      title: "Lưu niên",
      targetYear: 2026,
      asOfDate: "2026-09-16",
      narrative: "Nội dung lưu niên.",
    },
    birthTimeSensitivity: {
      title: "Độ nhạy giờ sinh",
      stableFactors: {
        title: "Yếu tố ổn định",
        narrative: "Những điểm ổn định vẫn giữ nguyên khi đối chiếu các khả năng lân cận.",
      },
      sensitiveFactors: {
        title: "Yếu tố cần thận trọng",
        narrative: "Một số chi tiết cần được đọc thận trọng khi độ chính xác của giờ sinh thay đổi.",
      },
    },
    practicalDirection: [
      { recommendation: "Khuyến nghị một", rationale: "Lý do một", avoid: "Điều cần tránh một" },
      { recommendation: "Khuyến nghị hai", rationale: "Lý do hai", avoid: "Điều cần tránh hai" },
      { recommendation: "Khuyến nghị ba", rationale: "Lý do ba", avoid: "Điều cần tránh ba" },
    ],
  },
};

const v2Report = {
  ...v3Report,
  contentVersion: "ziwei-comprehensive.v2",
} as unknown as ReportComprehensiveV2ReadyViewV1;

describe("ReportReader", () => {
  it("renders legacy reader and produces valid HTML markup without throwing", () => {
    const html = renderToStaticMarkup(
      <ReportReader locale="vi" report={legacyReport} />,
    );
    expect(html).toContain("Cung Mệnh");
    expect(html).toContain("Bản mệnh vững vàng");
    expect(html).toContain("Cung Thân");
  });

  it("preserves the V2 fail-closed reader behavior", () => {
    expect(() => renderToStaticMarkup(
      <ReportReader locale="vi" report={v2Report} />,
    )).toThrow("V4_REPORT_READER_NOT_ACTIVATED");
  });

  it("renders the V4.1 sensitivity narratives exactly once in the reader flow", () => {
    const html = renderToStaticMarkup(
      <ReportReader locale="vi" report={v3Report} />,
    );

    expect(html).toContain('id="section-birth-time-sensitivity"');
    expect(html).toContain('<span class="report-section-numeral">09</span>');
    expect(html).toContain('<span class="report-section-numeral">10</span>');
    expect(html.match(/Những điểm ổn định vẫn giữ nguyên khi đối chiếu các khả năng lân cận\./g)).toHaveLength(1);
    expect(html.match(/Một số chi tiết cần được đọc thận trọng khi độ chính xác của giờ sinh thay đổi\./g)).toHaveLength(1);
  });

  it("fails closed for missing or mixed V4.1 public content", () => {
    if (!("birthTimeSensitivity" in v3Report.content)) {
      throw new Error("V4_1_TEST_FIXTURE_INVALID");
    }
    const { birthTimeSensitivity: _missing, ...missingSensitivity } = v3Report.content;

    expect(() => renderToStaticMarkup(
      <ReportReader
        locale="vi"
        report={{
          ...v3Report,
          content: missingSensitivity,
        } as unknown as ReportComprehensiveV3ReadyViewV1}
      />,
    )).toThrow("V4_1_REPORT_READER_INVALID");
    expect(() => renderToStaticMarkup(
      <ReportReader
        locale="vi"
        report={{
          ...v3Report,
          content: {
            ...v3Report.content,
            lockedSections: ["birthTimeSensitivity"],
          },
        } as unknown as ReportComprehensiveV3ReadyViewV1}
      />,
    )).toThrow("V4_1_REPORT_READER_INVALID");
  });
});
