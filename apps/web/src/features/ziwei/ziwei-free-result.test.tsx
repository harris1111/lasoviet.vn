import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ZIWEI_PALACE_IDS, type FreeIdentityPreviewV1, type NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import messages from "../../../messages/vi/ziwei.json";
import reports from "../../../messages/vi/reports.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {} }) }));
vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
  const root = namespace === "reports" ? reports : messages;
  let text: unknown = root;
  for (const segment of key.split(".")) text = (text as Record<string, unknown>)?.[segment];
  return String(text ?? key).replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? name));
} }));
import { ZiweiFreeResult } from "./ziwei-free-result";
import { buildFreeResultModel } from "./ziwei-free-result-model";
import { CANONICAL_BRANCH_SEQUENCE } from "./ziwei-chart-relations";

const chart = {
  palaces: ZIWEI_PALACE_IDS.map((id, index) => ({ id, earthlyBranchId: CANONICAL_BRANCH_SEQUENCE[index]!, stars: [] })),
  soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: [],
} as unknown as NormalizedZiweiChartV1;
const model = buildFreeResultModel({ chart, preview: {} as FreeIdentityPreviewV1, isGuest: true, locale: "vi" });
function render(tab: "chart" | "overview" | "topics" = "overview") {
  return renderToStaticMarkup(<ZiweiFreeResult chart={chart} chartId="fixture" chartVersionId="v1" basePath="/la-so/fixture" locale="vi"
    initialState={{ tab }} model={model} signInHref="/dang-nhap" loadEvidence={async () => ({ ok: false, error: { code: "EVIDENCE_NOT_FOUND" } })} />);
}

describe("free-result reader structure", () => {
  it("places one completion after the topic map and before collapsed evidence", () => {
    const html = render();
    expect(html.match(/data-testid="fd109-completion"/g)).toHaveLength(1);
    expect(html.indexOf('data-free-result-block="completion"')).toBeLessThan(html.indexOf('data-free-result-block="evidence"'));
    expect(html).toContain('<details');
    expect(html).toContain('data-completion-tabs="overview topics"');
  });
  it("renders supported life-question topics as single row controls with state", () => {
    const html = render("topics");
    expect(html).toContain("Công việc và tài lộc");
    expect(html).toContain("Tình duyên và hôn nhân");
    expect(html).toContain("Chưa mở");
    expect(html).not.toContain("PAID_");
    expect(html).toContain('data-topic-id="career_wealth"');
  });
  it("offers readable enlargement and score explanations within reading and preview", () => {
    const html = render();
    expect(html).toContain('data-testid="fd109-chart-enlarge"');
    expect(html.match(/Điểm này tính thế nào/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('id="free-result-board"');
    expect(html).toContain('data-free-result-block="scores"');
  });
  describe("chart stage (phase 2.5)", () => {
    it("renders the chart once, outside the tab panels, in compact density", () => {
      const html = render();
      expect(html.match(/data-testid="ziwei-chart-grid"/g)).toHaveLength(1);
      const stage = html.indexOf('id="free-result-board"');
      expect(stage).toBeGreaterThan(-1);
      expect(stage).toBeLessThan(html.indexOf('role="tablist"'));
      expect(html.indexOf('data-testid="ziwei-chart-grid"')).toBeLessThan(html.indexOf('role="tablist"'));
      expect(html).toContain('data-density="compact"');
      expect(html).not.toMatch(/class="ziwei-palace [^"]*" data-density="full"/);
      expect(html).not.toContain('data-testid="fd109-chart-tab-scores"');
    });
    it("places the inspector for the selected palace beside the stage and keeps the radar at the top of overview", () => {
      const html = render();
      expect(html).toContain('data-testid="fd109-stage-inspector"');
      expect(html).toContain('data-testid="ziwei-detail-inspector"');
      expect(html.indexOf('data-testid="fd109-radar"')).toBeGreaterThan(html.indexOf('data-tab="overview"'));
      expect(html.indexOf('data-testid="fd109-radar"')).toBeLessThan(html.indexOf('data-overview-section'));
      expect(html.match(/class="report-radar/g)?.length ?? 1).toBe(1);
    });
    it("keeps ?tab=chart working by reading it as the overview tab", () => {
      const html = render("chart");
      expect(html).toContain('data-active-tab="overview"');
      expect(html).toContain('aria-selected="true"');
      expect(html).not.toContain('id="tab-chart"');
    });
    it("decorates the stage with ornaments that assistive tech ignores", () => {
      const html = render();
      expect(html.match(/fd109-corner fd109-corner-/g)).toHaveLength(4);
      expect(html).toMatch(/class="fd109-divider" aria-hidden="true"/);
    });
  });
  describe("free palace gift", () => {
    const point = (text: string) => ({ text, evidenceKeys: ["fact:one"] });
    const gift = {
      version: 1, status: "ready", requestId: "123e4567-e89b-42d3-a456-426614174000", chartVersionId: "v1", palaceId: "ziwei.palace.wealth", locale: "vi",
      sourceKind: "validated_artifact", contentHash: "a".repeat(64),
      reading: { palaceId: "ziwei.palace.wealth", title: "GIFT_TITLE", conclusion: "GIFT_CONCLUSION", keyPoints: [point("KEY_ONE"), point("KEY_TWO"), point("KEY_THREE")],
        narrative: "PROSE_ONE\n\nPROSE_TWO", do: [point("DO_ITEM")], avoid: [point("AVOID_ITEM")], evidenceKeys: ["fact:one"] },
      facts: [{ key: "fact:one", label: "FACT_LABEL", value: "FACT_VALUE" }],
    } as never;
    const renderWith = (value: unknown) => renderToStaticMarkup(<ZiweiFreeResult chart={chart} chartId="fixture" chartVersionId="v1" basePath="/la-so/fixture" locale="vi"
      initialState={{ tab: "overview" }} model={buildFreeResultModel({ chart, preview: {} as FreeIdentityPreviewV1, isGuest: true, locale: "vi", gift: value as never })}
      signInHref="/dang-nhap" loadEvidence={async () => ({ ok: false, error: { code: "EVIDENCE_NOT_FOUND" } })} />);

    it("row 49: a ready gift renders every part of one palace and gates the bridge language on it", () => {
      const html = renderWith(gift);
      for (const text of ["GIFT_TITLE", "GIFT_CONCLUSION", "KEY_ONE", "KEY_TWO", "KEY_THREE", "PROSE_ONE", "PROSE_TWO", "DO_ITEM", "AVOID_ITEM", "FACT_LABEL", "FACT_VALUE", "Nên làm", "Nên tránh", "Bạn đã đọc trọn một cung"]) expect(html).toContain(text);
      expect(html).toContain('data-testid="fd109-palace-gift"');
      expect(html).toContain('data-free-result-block="gift"');
      expect(html).not.toContain('data-free-result-block="free-palace"');
    });
    it("row 49: never implies the other eleven palaces were written", () => {
      const html = renderWith(gift);
      expect(html).toContain("11 cung còn lại hiện chỉ có bản đồ cấu trúc, chưa có bài đọc");
      expect(html.match(/data-testid="fd109-palace-gift"/g)).toHaveLength(1);
      expect(html).toContain("Chưa mở"); // the other palaces stay locked structural rows
    });
    it("row 49: every non-ready state keeps the honest Phase A copy and the old bridge", () => {
      for (const value of [null, { version: 1, status: "unavailable" }, { version: 1, status: "terminal_failure" }, { version: 1, status: "cost_unknown" }]) {
        const html = renderWith(value);
        expect(html).toContain('data-free-result-block="free-palace"');
        expect(html).toContain("Đọc sâu hơn từ lá số này");
        expect(html).not.toContain("fd109-palace-gift");
        expect(html).not.toContain("Bạn đã đọc trọn một cung");
        expect(html).not.toContain("đang được chuẩn bị");
      }
    });
    it("row 50: a pending gift says so once, without polling controls or a way to request generation", () => {
      const html = renderWith({ version: 1, status: "generating" });
      expect(html).toContain("đang được chuẩn bị");
      expect(html).toContain('data-testid="fd109-gift-preparing"');
      expect(html).not.toMatch(/data-testid="fd109-gift-(retry|generate|refresh)"/);
    });
  });
});

