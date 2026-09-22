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
    replace: vi.fn(),
    push: vi.fn(),
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

const branchIds = [
  "yin", "mao", "chen", "si", "wu", "wei",
  "shen", "you", "xu", "hai", "zi", "chou"
] as const;

const branchMapping = [
  "ziwei.branch.tiger", "ziwei.branch.rabbit", "ziwei.branch.dragon",
  "ziwei.branch.snake", "ziwei.branch.horse", "ziwei.branch.goat",
  "ziwei.branch.monkey", "ziwei.branch.rooster", "ziwei.branch.dog",
  "ziwei.branch.pig", "ziwei.branch.rat", "ziwei.branch.ox"
] as const;

const mockChart: any = {
  version: 1,
  systemId: "ziwei",
  provenance: {
    ruleSetId: "test-rule-set",
    calculatedAt: "2026-09-22T00:00:00Z",
    engineVersion: "1.0.0",
  } as any,
  soulPalaceId: "ziwei.palace.life",
  bodyPalaceId: "ziwei.palace.career",
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
      { id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted" },
      { id: "ziwei.star.tianfu", brightness: "ziwei.brightness.prosperous" },
    ],
  })),
};

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
          evidenceId: "life-palace",
          factReferences: [],
          confidence: "high",
          interpretationBoundCodes: ["reflective_identity_only"],
          interpretationBounds: [],
          limitations: [],
        },
      },
      {
        id: "body-palace",
        evidence: {
          evidenceId: "body-palace",
          factReferences: [],
          confidence: "high",
          interpretationBoundCodes: ["reflective_identity_only"],
          interpretationBounds: [],
          limitations: [],
        },
      },
      {
        id: "transformations",
        evidence: {
          evidenceId: "transformations",
          factReferences: [],
          confidence: "high",
          interpretationBoundCodes: ["reflective_identity_only"],
          interpretationBounds: [],
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
      id: "life-palace",
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

    // Action pills row present
    expect(html).toContain("Lập lại lá số");
    expect(html).toContain("Tra cứu sao");
    expect(html).toContain("Tải ảnh lá số");
    expect(html).toContain('aria-disabled="true"');
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
  });

  it("renders Palaces tab with exactly 12 palace rows, honest preview/unopened markers, and never 'Đã đọc'", () => {
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

    // Honesty invariants: only Xem trước (preview) or Chưa mở (unopened); never Đã đọc
    expect(html).toContain("Xem trước");
    expect(html).toContain("Chưa mở");
    expect(html).not.toContain("Đã đọc");
    expect(html).not.toContain("0/12");
  });

  it("renders Topics tab with exactly 12 structural reading themes and CTA to topic selection without pricing/Lá", () => {
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

    // Assert no price, no Lá, no entitlement or ownership claims
    expect(html).not.toMatch(/\d[\d.,]*\s*(?:₫|đ(?!\p{L})|VND|(?:Lá|La)(?!\p{L}))/iu);
    expect(html).not.toContain("Đã mở");
    expect(html).not.toContain("0/12");
  });

  it("renders Evidence tab exposing exactly 3 authorized free references without hidden narrative", () => {
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
    expect(html).toContain("Minh chứng căn cứ &amp; quy tắc an sao");

    const evidenceCards = html.match(/class="evidence-matrix-card/g) || [];
    expect(evidenceCards).toHaveLength(3);

    expect(html).toContain("Căn cứ Cung Mệnh");
    expect(html).toContain("Căn cứ Cung Thân");
    expect(html).toContain("Căn cứ Tứ Hóa");
  });
});
