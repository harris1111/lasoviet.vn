import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ZIWEI_PALACE_IDS, type NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import messages from "../../../messages/vi/ziwei.json";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => {
  let text: unknown = messages;
  for (const segment of key.split(".")) text = (text as Record<string, unknown>)?.[segment];
  return String(text ?? key);
} }));
import { ZiweiChartSheet } from "./ziwei-chart-sheet";
import { CANONICAL_BRANCH_SEQUENCE } from "./ziwei-chart-relations";

const chart = {
  palaces: ZIWEI_PALACE_IDS.map((id, index) => ({ id, earthlyBranchId: CANONICAL_BRANCH_SEQUENCE[index]!, stars: [] })),
  soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: [],
} as unknown as NormalizedZiweiChartV1;
const html = renderToStaticMarkup(<ZiweiChartSheet chart={chart} locale="vi" selectedPalaceId="ziwei.palace.life" onSelectPalace={() => {}} />);

describe("enlarged chart sheet", () => {
  it("draws all 12 palaces once, in the scaled board, with the zoom toolbar", () => {
    expect(html.match(/class="ziwei-palace[ "]/g)).toHaveLength(12);
    expect(html).toContain('role="toolbar"');
    for (const label of ["Phóng to lá số", "Thu nhỏ lá số", "Vừa khung màn hình"]) expect(html).toContain(label);
    expect(html).toContain("transform:scale(1)");
  });
  it("keeps the palace detail in its own region, outside the scaled board", () => {
    const board = html.slice(html.indexOf("fd109-sheet-board"), html.indexOf("fd109-sheet-detail"));
    expect(board).not.toContain("ziwei-detail-inspector");
    expect(html.slice(html.indexOf("fd109-sheet-detail"))).toContain("ziwei-detail-inspector");
    expect(html).toContain('aria-expanded="false"');
  });
});
