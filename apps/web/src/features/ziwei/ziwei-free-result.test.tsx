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
function render(tab: "overview" | "topics" = "overview") {
  return renderToStaticMarkup(<ZiweiFreeResult chart={chart} chartId="fixture" basePath="/la-so/fixture" locale="vi"
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
});
