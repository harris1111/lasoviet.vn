import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ZiweiResultTabs } from "./ziwei-result-tabs";
import { CANONICAL_RESULT_TABS } from "./ziwei-tabs-state";
import type {
  NormalizedZiweiChartV1,
  ZiweiBirthSummaryV1,
  FreeIdentityPreviewV1,
} from "@lasoviet/contracts";

vi.mock("next-intl", () => {
  const viZiwei = require("../../../messages/vi/ziwei.json");
  const viReports = require("../../../messages/vi/reports.json");
  return {
    useTranslations: (ns: string) => {
      const msgs = ns === "reports" ? viReports : viZiwei;
      return (key: string) => {
        const parts = key.split(".");
        let curr: any = msgs;
        for (const p of parts) {
          curr = curr?.[p];
        }
        return typeof curr === "string" ? curr : key;
      };
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const mockBirthSummary: ZiweiBirthSummaryV1 = {
  displayName: "Nguyen Van A",
  gender: "male",
  normalizedCalendar: { kind: "solar", date: "1994-04-12" },
  normalizedTime: { precision: "exact_minute", localTime: "09:30" },
  timezoneProvenance: { source: "offset", offsetMinutes: 420 },
};

const palaceIds = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
] as const;

const branchMapping = [
  "ziwei.branch.tiger", "ziwei.branch.rabbit", "ziwei.branch.dragon",
  "ziwei.branch.snake", "ziwei.branch.horse", "ziwei.branch.goat",
  "ziwei.branch.monkey", "ziwei.branch.rooster", "ziwei.branch.dog",
  "ziwei.branch.pig", "ziwei.branch.rat", "ziwei.branch.ox"
] as const;

const mockChart = {
  version: 1,
  systemId: "ziwei",
  provenance: {
    ruleSetId: "test-rule-set",
    calculatedAt: "2026-09-22T00:00:00Z",
    engineVersion: "1.0.0",
  },
  soulPalaceId: "ziwei.palace.life",
  bodyPalaceId: "ziwei.palace.career",
  horoscopeCapabilities: { canGenerateHoroscope: true },
  warnings: [],
  transformations: [
    { id: "ziwei.transformation.prosperity", starId: "ziwei.star.lianzhen" },
    { id: "ziwei.transformation.power", starId: "ziwei.star.pojun" },
    { id: "ziwei.transformation.fame", starId: "ziwei.star.wuqu" },
    { id: "ziwei.transformation.obstacle", starId: "ziwei.star.taiyang" },
  ],
  palaces: palaceIds.map((id, index) => ({
    id,
    earthlyBranchId: branchMapping[index]!,
    heavenlyStemId: "ziwei.stem.jia",
    cycleStateId: "changsheng",
    stars: [
      { id: "ziwei.star.ziwei", category: "major", brightness: "ziwei.brightness.exalted" },
      { id: "ziwei.star.tianfu", category: "major", brightness: "ziwei.brightness.prosperous" },
    ],
  })),
} as unknown as NormalizedZiweiChartV1;

const mockPreview = {
  version: 1,
  chartId: "chart-test-123",
  chartVersionId: "chart-version-1",
  capabilityId: "ziwei.identity.p0",
  summaryVersion: "ziwei.identity.free.v1",
  insights: [
    {
      id: "life-palace",
      evidence: {
        evidenceId: "ziwei.identity.life-palace",
        factReferences: [],
        confidence: "high",
        interpretationBoundCodes: ["reflective_identity_only"],
        interpretationBounds: ["Chỉ dùng cho mục đích tự phản chiếu."],
        limitations: [],
      },
    },
    {
      id: "body-palace",
      evidence: {
        evidenceId: "ziwei.identity.body-palace",
        factReferences: [],
        confidence: "high",
        interpretationBoundCodes: ["reflective_identity_only"],
        interpretationBounds: ["Chỉ dùng cho mục đích tự phản chiếu."],
        limitations: [],
      },
    },
    {
      id: "transformations",
      evidence: {
        evidenceId: "ziwei.identity.transformations",
        factReferences: [],
        confidence: "high",
        interpretationBoundCodes: ["reflective_identity_only"],
        interpretationBounds: ["Chỉ dùng cho mục đích tự phản chiếu."],
        limitations: [],
      },
    },
  ],
  paidPreview: {
    sku: "ZIWEI-IDENTITY-P0",
    sectionId: "personal_summary",
    coveragePercent: 12,
    evidence: [],
  },
} as unknown as FreeIdentityPreviewV1;

const mockLoadEvidence = vi.fn().mockResolvedValue({
  ok: true,
  value: {
    evidence: {
      id: "ziwei.identity.life-palace",
      factReferences: ["fact-1"],
    },
  },
});

describe("ZiweiResultTabs UI Shell component", () => {
  it("renders 5 canonical tab headers with accessible role='tab' and aria-selected", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiResultTabs, {
        basePath: "/la-so/chart-test-123",
        birthSummary: mockBirthSummary,
        chart: mockChart,
        chartId: "chart-test-123",
        displayName: "Nguyen Van A",
        initialState: { tab: "chart" },
        locale: "vi",
        loadEvidence: mockLoadEvidence,
        preview: mockPreview,
      }),
    );

    expect(html).toContain('role="tablist"');
    for (const tab of CANONICAL_RESULT_TABS) {
      expect(html).toContain(`id="tab-${tab}"`);
      expect(html).toContain(`aria-controls="panel-${tab}"`);
    }

    // Chart is initially selected
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('id="tab-chart"');
    expect(html).toContain('id="panel-chart" role="tabpanel"');

    // Chart tab contains brightness legend and factual discovery strip
    expect(html).toContain("Độ sáng sao:");
    expect(html).toContain("12 cung bản mệnh đã an");
    expect(html).toContain("03");

    // Action pills row present with exact canonical star lookup href
    expect(html).toContain("Lập lại lá số");
    expect(html).toContain('href="/kien-thuc/tu-vi/14-chinh-tinh"');
    expect(html).toContain("Tải ảnh lá số");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('id="download-disabled-note"');
  });

  it("renders Overview tab with FreeIdentityPreview and CTA switching to Palaces", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiResultTabs, {
        basePath: "/la-so/chart-test-123",
        birthSummary: mockBirthSummary,
        chart: mockChart,
        chartId: "chart-test-123",
        displayName: "Nguyen Van A",
        initialState: { tab: "overview" },
        locale: "vi",
        loadEvidence: mockLoadEvidence,
        preview: mockPreview,
      }),
    );

    expect(html).toContain('id="tab-overview"');
    expect(html).toContain('id="panel-overview" role="tabpanel"');
    expect(html).toContain("Xem luận giải 12 cung →");
    expect(html).toContain("reading-overview-container");
  });

  it("renders Palaces tab with exactly 12 palace rows, preview on Life and Body, unopened elsewhere, and never 'Đã đọc'", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiResultTabs, {
        basePath: "/la-so/chart-test-123",
        birthSummary: mockBirthSummary,
        chart: mockChart,
        chartId: "chart-test-123",
        displayName: "Nguyen Van A",
        initialState: { tab: "palaces" },
        locale: "vi",
        loadEvidence: mockLoadEvidence,
        preview: mockPreview,
      }),
    );

    expect(html).toContain('id="tab-palaces"');
    expect(html).toContain('id="panel-palaces" role="tabpanel"');
    expect(html).toContain("Bản đồ 12 cung bản mệnh");

    const palaceItems = html.match(/class="palace-row-card/g) || [];
    expect(palaceItems).toHaveLength(12);

    // Life and Body palaces get preview marker
    const previewBadges = html.match(/badge-preview/g) || [];
    expect(previewBadges).toHaveLength(2);

    const unopenedBadges = html.match(/badge-unopened/g) || [];
    expect(unopenedBadges).toHaveLength(10);

    expect(html).not.toContain("Đã đọc");
    expect(html).not.toContain("0/12");
  });

  it("renders Topics tab with exactly 12 structural reading themes from getPalaceLifeArea without pricing/Lá", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiResultTabs, {
        basePath: "/la-so/chart-test-123",
        birthSummary: mockBirthSummary,
        chart: mockChart,
        chartId: "chart-test-123",
        displayName: "Nguyen Van A",
        initialState: { tab: "topics" },
        locale: "vi",
        loadEvidence: mockLoadEvidence,
        preview: mockPreview,
      }),
    );

    expect(html).toContain('id="tab-topics"');
    expect(html).toContain('id="panel-topics" role="tabpanel"');
    expect(html).toContain("Chuyên đề luận giải sâu");

    const topicItems = html.match(/class="topic-row-item/g) || [];
    expect(topicItems).toHaveLength(12);

    // Assert domain text comes from canonical getPalaceLifeArea
    expect(html).toContain("Bản mệnh, tính cách nền tảng, phong thái");
    expect(html).toContain("Sự nghiệp, phong cách làm việc");

    // Assert no price, no Lá, no entitlement or ownership claims
    expect(html).not.toMatch(/\d[\d.,]*\s*(?:₫|đ(?!\p{L})|VND|(?:Lá|La)(?!\p{L}))/iu);
    expect(html).not.toContain("Đã mở");
    expect(html).not.toContain("0/12");
  });

  it("renders Evidence tab deriving exactly 3 authorized references directly from preview.insights with canonical ID calling", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiResultTabs, {
        basePath: "/la-so/chart-test-123",
        birthSummary: mockBirthSummary,
        chart: mockChart,
        chartId: "chart-test-123",
        displayName: "Nguyen Van A",
        initialState: { tab: "evidence" },
        locale: "vi",
        loadEvidence: mockLoadEvidence,
        preview: mockPreview,
      }),
    );

    expect(html).toContain('id="tab-evidence"');
    expect(html).toContain('id="panel-evidence" role="tabpanel"');
    expect(html).toContain("Căn cứ diễn giải");

    const evidenceCards = html.match(/class="evidence-matrix-card/g) || [];
    expect(evidenceCards).toHaveLength(3);

    // No unsupported marketing claims
    expect(html).not.toContain("astronomical");
    expect(html).not.toContain("căn cứ xác thực");
  });
});

describe("Overview tab effective typography & styling contracts", () => {
  it("enforces reading surface typography max-width 720px, font-size 17px, line-height 1.7", () => {
    const fs = require("fs");
    const path = require("path");
    const resultsCss = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/styles/discipline-pages-results.css"),
      "utf8",
    );

    expect(resultsCss).toContain(".reading-overview-container");
    expect(resultsCss).toContain("max-width: 720px");
    expect(resultsCss).toContain("font-size: 17px");
    expect(resultsCss).toContain("line-height: 1.7");
  });
});

describe("Mobile tab edge fade & modal exclusivity contract", () => {
  it("enforces mobile fade gradient and viewport exclusivity in discipline-pages-results.css", () => {
    const fs = require("fs");
    const path = require("path");
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "apps/web/src/styles/discipline-pages-results.css"),
      "utf8",
    );

    // Tab edge fade gradient
    expect(css).toContain("linear-gradient(to right, transparent, var(--lacquer-800))");

    // Modal exclusivity
    expect(css).toContain(".topic-mobile-sheet-overlay {\n    display: none !important;\n  }");
    expect(css).toContain(".topic-desktop-inline-preview {\n    display: none !important;\n  }");
  });
});

describe("Locked narrative sentinel non-leakage", () => {
  it("verifies full locked plaintext, 'Đã đọc', or Lá currency never exists in static render or props", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiResultTabs, {
        basePath: "/la-so/chart-test-123",
        birthSummary: mockBirthSummary,
        chart: mockChart,
        chartId: "chart-test-123",
        displayName: "Nguyen Van A",
        initialState: { tab: "topics" },
        locale: "vi",
        loadEvidence: mockLoadEvidence,
        preview: mockPreview,
      }),
    );

    // Sentinel checks
    expect(html).not.toContain("Đã đọc");
    expect(html).not.toContain("0/12");
    expect(html).not.toMatch(/\d+\s*Lá/);
    expect(html).not.toContain("nạp Lá");
    expect(html).not.toContain("khoá luận giải");
  });
});
