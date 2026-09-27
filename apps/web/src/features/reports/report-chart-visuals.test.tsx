import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReportChartSnapshotV1 } from "@lasoviet/contracts";
import { ZIWEI_PALACE_IDS } from "@lasoviet/contracts";

import { ReportDecadalTimeline, ReportMiniChart, ReportStarChips } from "./report-chart-visuals";

const RING = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

const snapshot: ReportChartSnapshotV1 = {
  version: 1,
  palaces: ZIWEI_PALACE_IDS.map((palaceId, i) => ({
    palaceId,
    earthlyBranchId: `ziwei.branch.${RING[(4 - i + 12) % 12]}`,
    isLife: i === 0,
    isBody: i === 6,
    triadPalaceIds: [ZIWEI_PALACE_IDS[(i + 4) % 12]!, ZIWEI_PALACE_IDS[(i + 8) % 12]!],
    oppositePalaceId: ZIWEI_PALACE_IDS[(i + 6) % 12]!,
    stars: i === 2
      ? [{ starId: "ziwei.star.pojun", kind: "main", brightnessId: "ziwei.brightness.favorable", transformationId: "ziwei.transformation.prosperity" }, { starId: "ziwei.star.dijie", kind: "aux" }]
      : [],
  })),
  decadal: {
    currentOrdinal: 2,
    cycles: [0, 1, 2, 3].map((k) => ({ ordinal: k, palaceId: ZIWEI_PALACE_IDS[k]!, ageRange: [5 + 10 * k, 14 + 10 * k] as [number, number], yearRange: [1997 + 10 * k, 2006 + 10 * k] as [number, number] })),
  },
  annual: { targetYear: 2026, palaceId: "ziwei.palace.fortune" },
};
const t = (key: string, values?: Record<string, unknown>) =>
  key === "reader.timeline_age" ? `${values?.from}-${values?.to} tuổi` : key === "reader.no_main_star" ? "Vô chính diệu" : key;

describe("report chart visuals", () => {
  it("renders star chips with Vietnamese brightness and transformation labels", () => {
    const html = renderToStaticMarkup(<ReportStarChips palace={snapshot.palaces[2]!} t={t} />);
    expect(html).toContain("Phá Quân");
    expect(html).toContain("Đắc");
    expect(html).toContain("Hóa Lộc");
    expect(html).toContain('class="report-chip is-main"');
  });

  it("says when a palace has no main star", () => {
    const html = renderToStaticMarkup(<ReportStarChips palace={snapshot.palaces[1]!} t={t} />);
    expect(html).toContain("Vô chính diệu");
  });

  it("lights the palace and marks its triad and opposite on the mini chart", () => {
    const html = renderToStaticMarkup(<ReportMiniChart snapshot={snapshot} palaceId="ziwei.palace.life" t={t} />);
    expect(html.match(/report-mini-cell/g)).toHaveLength(12);
    expect(html.match(/is-lit/g)).toHaveLength(1);
    expect(html.match(/is-related/g)).toHaveLength(3);
  });

  it("renders every cycle and marks the current one without good/bad styling", () => {
    const html = renderToStaticMarkup(<ReportDecadalTimeline snapshot={snapshot} t={t} />);
    expect(html.match(/report-cycle"|report-cycle /g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain("25-34 tuổi");
    expect(html).toContain("aria-current=\"true\"");
    expect(html).not.toMatch(/is-good|is-bad|is-risk/);
  });
});
