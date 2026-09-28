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

import type { ReportChartSnapshotV1, ReportComprehensiveV3ReadyViewV1 } from "@lasoviet/contracts";
import { ComprehensiveReportReader } from "./comprehensive-report-reader";

const palaceIds = [
  "life", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "fortune", "parents",
] as const;
const ring = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

const chartSnapshot = {
  version: 1,
  palaces: palaceIds.map((id, i) => ({
    palaceId: `ziwei.palace.${id}` as const,
    earthlyBranchId: `ziwei.branch.${ring[(4 - i + 12) % 12]}`,
    isLife: i === 0,
    isBody: i === 6,
    triadPalaceIds: [`ziwei.palace.${palaceIds[(i + 4) % 12]}` as const, `ziwei.palace.${palaceIds[(i + 8) % 12]}` as const],
    oppositePalaceId: `ziwei.palace.${palaceIds[(i + 6) % 12]}` as const,
    stars: i === 0
      ? [
          { starId: "ziwei.star.lianzhen", kind: "main" as const, brightnessId: "ziwei.brightness.neutral" },
          { starId: "ziwei.star.tianfu", kind: "main" as const, brightnessId: "ziwei.brightness.exalted" },
        ]
      : [],
  })),
  decadal: {
    currentOrdinal: 2,
    cycles: [0, 1, 2, 3].map((k) => ({
      ordinal: k,
      palaceId: `ziwei.palace.${palaceIds[k]}` as const,
      ageRange: [5 + 10 * k, 14 + 10 * k] as [number, number],
      yearRange: [1997 + 10 * k, 2006 + 10 * k] as [number, number],
    })),
  },
  annual: { targetYear: 2026, palaceId: "ziwei.palace.fortune" },
} as unknown as ReportChartSnapshotV1;

const longNarrative = "Một là một. Hai là hai. Ba là ba. Bốn là bốn. Năm là năm. Sáu là sáu. Bảy là bảy.";

function v3Report(withSnapshot: boolean): ReportComprehensiveV3ReadyViewV1 {
  return {
    version: 1,
    state: "ready",
    contentVersion: "ziwei-comprehensive.v3",
    reportId: "fd104-report",
    reportVersionId: "fd104-report-version",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    fulfillmentStatus: "complete",
    lineage: { supersedesReportVersionId: null },
    ...(withSnapshot ? { chartSnapshot } : {}),
    content: {
      overview: { title: "Tổng quan", narrative: longNarrative },
      coreAxis: { title: "Trục Mệnh Thân", narrative: "Nội dung trục Mệnh Thân." },
      keyConfigurations: [{ title: "Cách cục", narrative: "Nội dung cách cục." }],
      palaceReadings: palaceIds.map((id) => ({
        palaceId: `ziwei.palace.${id}`,
        title: `Cung ${id}`,
        narrative: `Câu dẫn cung ${id}. Chi tiết thêm.`,
      })),
      thematicSynthesis: ["career_wealth", "relationships_family", "social_environment", "wellbeing_inner_resources"].map((id) => ({
        id,
        title: `Chủ đề ${id}`,
        narrative: `Nội dung chủ đề ${id}.`,
      })),
      strengthsAndTensions: { title: "Điểm mạnh", narrative: "Nội dung điểm mạnh." },
      currentDecadal: { title: "Đại vận", state: "active", index: 2, ageRange: [25, 34], yearRange: [2017, 2026], narrative: "Nội dung đại vận." },
      annualSnapshot: { title: "Lưu niên", targetYear: 2026, asOfDate: "2026-09-16", narrative: "Nội dung lưu niên." },
      birthTimeSensitivity: {
        title: "Độ nhạy giờ sinh",
        stableFactors: { title: "Ổn định", narrative: "Phần ổn định." },
        sensitiveFactors: { title: "Nhạy", narrative: "Phần nhạy." },
      },
      practicalDirection: [
        { recommendation: "Khuyến nghị một", rationale: "Lý do một", avoid: "Điều cần tránh một" },
        { recommendation: "Khuyến nghị hai", rationale: "Lý do hai", avoid: "Điều cần tránh hai" },
        { recommendation: "Khuyến nghị ba", rationale: "Lý do ba", avoid: "Điều cần tránh ba" },
      ],
    },
  } as unknown as ReportComprehensiveV3ReadyViewV1;
}

describe("ComprehensiveReportReader FD-104 wave 1", () => {
  it("splits long narratives into paragraphs with a lead line", () => {
    const html = renderToStaticMarkup(<ComprehensiveReportReader report={v3Report(false)} />);
    expect(html).toContain('<span class="report-narrative-lead">Một là một.</span>');
    expect(html).toContain("<p>Bảy là bảy.</p>");
  });

  it("renders practical directions as action cards", () => {
    const html = renderToStaticMarkup(<ComprehensiveReportReader report={v3Report(false)} />);
    expect(html.match(/class="report-action-card"/g)).toHaveLength(3);
    expect(html).toContain("Vì sao:");
    expect(html).toContain("Nên tránh:");
  });

  it("renders the 12 palaces as details cards with the first two open", () => {
    const html = renderToStaticMarkup(<ComprehensiveReportReader report={v3Report(false)} />);
    const cards = html.match(/<details[^>]*class="report-subcard report-palace-card"[^>]*>/g) ?? [];
    expect(cards).toHaveLength(12);
    expect(cards.filter((tag) => tag.includes('open=""'))).toHaveLength(2);
    expect(html).toContain("Mở tất cả 12 cung");
    expect(html).toContain('<span class="report-palace-lead">Câu dẫn cung parents.</span>');
  });

  it("renders no chart visuals when the report has no chart snapshot", () => {
    const html = renderToStaticMarkup(<ComprehensiveReportReader report={v3Report(false)} />);
    expect(html).not.toContain("report-mini-chart");
    expect(html).not.toContain("report-timeline");
    expect(html).not.toContain("report-chips");
  });

  it("renders star chips, mini charts and the decadal timeline from the snapshot", () => {
    const html = renderToStaticMarkup(<ComprehensiveReportReader report={v3Report(true)} />);
    expect(html.match(/class="report-mini-chart"/g)).toHaveLength(12);
    expect(html).toContain("Liêm Trinh");
    expect(html).toContain("Miếu");
    expect(html).toContain("Các chặng đại vận");
    expect(html).toContain("25-34 tuổi");
    expect(html).toContain('aria-current="true"');
  });
});
