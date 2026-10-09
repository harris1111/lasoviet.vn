import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { ZiweiPalace } from "./ziwei-palace";

const palace = {
  id: "ziwei.palace.life", earthlyBranchId: "ziwei.branch.zi", heavenlyStemId: "ziwei.stem.jia", cycleStateId: "ziwei.cycle.changsheng",
  stars: [
    { id: "ziwei.star.ziwei", category: "major", brightness: "temple" },
    { id: "ziwei.star.zuofu", category: "minor", brightness: "bright" },
  ],
} as unknown as NormalizedZiweiChartV1["palaces"][number];
const base = { palace, bodyPalaceId: "ziwei.palace.career", soulPalaceId: "ziwei.palace.life", locale: "vi" as const, relationType: "selected" as const };

describe("palace cell density", () => {
  it("compact keeps only name, stem-branch and main stars", () => {
    const html = renderToStaticMarkup(<ZiweiPalace {...base} density="compact" />);
    expect(html).toContain('data-density="compact"');
    expect(html).toContain("palace-title");
    expect(html).toContain("palace-stem-branch");
    expect(html).toContain("star-name");
    for (const hidden of ["star-brightness", "minor-stars", "palace-relation-tag", "palace-role-tag", "ziwei-palace-footer", "star-mutagen"]) {
      expect(html).not.toContain(hidden);
    }
  });
  it("compact drops the Cung prefix, full keeps it", () => {
    expect(renderToStaticMarkup(<ZiweiPalace {...base} density="compact" />)).toContain('<span class="palace-title">Mệnh</span>');
    expect(renderToStaticMarkup(<ZiweiPalace {...base} />)).toContain('<span class="palace-title">Cung Mệnh</span>');
  });
  it("full shows brightness, minor stars, relation and role labels", () => {
    const html = renderToStaticMarkup(<ZiweiPalace {...base} />);
    expect(html).toContain('data-density="full"');
    for (const shown of ["star-brightness", "minor-stars", "palace-relation-tag", "palace-role-tag", "ziwei-palace-footer"]) {
      expect(html).toContain(shown);
    }
  });
});
