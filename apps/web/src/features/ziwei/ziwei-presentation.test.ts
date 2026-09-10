import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ziweiPresentation } from "./ziwei-presentation";

describe("localized Zi Wei presentation", () => {
  it("presents canonical chart and evidence identifiers without exposing raw IDs", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.palace("ziwei.palace.travel")).toBe("Travel Palace");
    expect(vi.palace("ziwei.palace.travel")).toBe("Cung Thiên Di");
    expect(en.branch("ziwei.branch.tiger")).toBe("Tiger");
    expect(vi.branch("ziwei.branch.tiger")).toBe("Dần");
    expect(en.star("ziwei.star.pojun")).toBe("Po Jun");
    expect(vi.star("ziwei.star.pojun")).toBe("Phá Quân");
    expect(en.chrome.chartFacts).toBe("Chart facts");
    expect(vi.chrome.chartFacts).toBe("Dữ liệu lá số");
    expect(en.evidence("ziwei.identity.life-palace")).toBe(
      "Life Palace evidence",
    );
    expect(en.fact("palaces.ziwei.palace.life.earthlyBranchId")).toBe(
      "Life Palace branch",
    );
    expect(en.insight("body-palace-transformations-tension")).toBe(
      "Body Palace and transformations tension",
    );
    expect(en.offer("ZIWEI-IDENTITY-P0")).toBe("Comprehensive Zi Wei reading");
    expect(vi.offer("ZIWEI-IDENTITY-P0")).toBe("Luận giải Tử Vi toàn diện");
  });

  it("does not expose orphaned technical report helpers", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en).not.toHaveProperty("interpretationBound");
    expect(en).not.toHaveProperty("action");
    expect(en).not.toHaveProperty("confidence");
    expect(en).not.toHaveProperty("limitation");
    expect(vi).not.toHaveProperty("interpretationBound");
    expect(vi).not.toHaveProperty("action");
    expect(vi).not.toHaveProperty("confidence");
    expect(vi).not.toHaveProperty("limitation");
  });

  it("localizes brightness levels without exposing raw IDs", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.brightness("ziwei.brightness.exalted")).toBe("Exalted");
    expect(vi.brightness("ziwei.brightness.exalted")).toBe("Miếu");
    expect(en.brightness("ziwei.brightness.prosperous")).toBe("Prosperous");
    expect(vi.brightness("ziwei.brightness.prosperous")).toBe("Vượng");
    expect(en.brightness("ziwei.brightness.favorable")).toBe("Favorable");
    expect(vi.brightness("ziwei.brightness.favorable")).toBe("Đắc");
    expect(en.brightness("ziwei.brightness.neutral")).toBe("Neutral");
    expect(vi.brightness("ziwei.brightness.neutral")).toBe("Bình");
    expect(en.brightness("ziwei.brightness.unfavorable")).toBe("Unfavorable");
    expect(vi.brightness("ziwei.brightness.unfavorable")).toBe("Hãm");
    expect(en.brightness("ziwei.brightness.weak")).toBe("Weak");
    expect(vi.brightness("ziwei.brightness.weak")).toBe("Nhược");
    expect(en.brightness("unknown")).toBe("Standard brightness");
    expect(vi.brightness("unknown")).toBe("Độ sáng tiêu chuẩn");
  });

  it("localizes transformations without exposing raw IDs", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.transformation("ziwei.transformation.prosperity")).toBe("Prosperity");
    expect(vi.transformation("ziwei.transformation.prosperity")).toBe("Hóa Lộc");
    expect(en.transformation("ziwei.transformation.power")).toBe("Power");
    expect(vi.transformation("ziwei.transformation.power")).toBe("Hóa Quyền");
    expect(en.transformation("ziwei.transformation.fame")).toBe("Fame");
    expect(vi.transformation("ziwei.transformation.fame")).toBe("Hóa Khoa");
    expect(en.transformation("ziwei.transformation.obstacle")).toBe("Obstacle");
    expect(vi.transformation("ziwei.transformation.obstacle")).toBe("Hóa Kỵ");
    expect(en.transformation("unknown")).toBe("Transformation");
    expect(vi.transformation("unknown")).toBe("Hóa khí");
  });

  it("localizes gender, calendar kind, and time precision", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.gender("male")).toBe("Male");
    expect(vi.gender("male")).toBe("Nam");
    expect(en.gender("female")).toBe("Female");
    expect(vi.gender("female")).toBe("Nữ");
    expect(en.gender(undefined)).toBe("Unspecified");
    expect(vi.gender(undefined)).toBe("Chưa xác định");

    expect(en.calendarKind("solar")).toBe("Solar calendar");
    expect(vi.calendarKind("solar")).toBe("Dương lịch");
    expect(en.calendarKind("lunar")).toBe("Lunar calendar");
    expect(vi.calendarKind("lunar")).toBe("Âm lịch");

    expect(en.timePrecision("exact_minute")).toBe("Exact minute");
    expect(vi.timePrecision("exact_minute")).toBe("Chính xác theo phút");
    expect(en.timePrecision("branch_only")).toBe("Earthly branch");
    expect(vi.timePrecision("branch_only")).toBe("Theo địa chi");
    expect(en.timePrecision("range")).toBe("Time range");
    expect(vi.timePrecision("range")).toBe("Khoảng giờ");
    expect(en.timePrecision("unknown")).toBe("Unknown");
    expect(vi.timePrecision("unknown")).toBe("Chưa rõ");
  });
});


describe("Zi Wei presentation exhaustive star, stem, and cycle mappings", () => {
  const repoRoot = process.cwd();
  const mappingPath = fs.existsSync(repoRoot + "/packages/engine-adapters/src/ziwei/iztro-mapping.ts")
    ? repoRoot + "/packages/engine-adapters/src/ziwei/iztro-mapping.ts"
    : path.resolve(__dirname, "../../../../../packages/engine-adapters/src/ziwei/iztro-mapping.ts");

  const mappingSrc = fs.readFileSync(mappingPath, "utf8");
  const extractedStarIds: string[] = Array.from(
    new Set(
      [...mappingSrc.matchAll(/"(ziwei\.star\.[^"]+)"/g)]
        .map((m) => m[1])
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  // Traditional star duplicate aliases across different cycles:
  // 1. xianchi (adjective) vs xianchi-dec (jiangqian 12)
  // 2. huagai (adjective) vs huagai-dec (jiangqian 12)
  // 3. tiande (adjective) vs tiande-dec (suiqian 12)
  // 4. longde (adjective) vs longde-dec (suiqian 12)
  // 5. jiesha (adjective) vs jiesha-dec (jiangqian 12)
  // 6. dahao (adjective / suiqian) vs dahao-dec (boshi 12)
  // 7. feilian (adjective) vs feilian-dec (boshi 12)
  // 8. xiaohao (boshi 12) vs xiaohao-sq (suiqian 12)
  // 9. bingfu (boshi 12) vs bingfu-sq (suiqian 12)
  const allowedDuplicateAliases = new Set([
    "ziwei.star.xianchi-dec",
    "ziwei.star.huagai-dec",
    "ziwei.star.tiande-dec",
    "ziwei.star.longde-dec",
    "ziwei.star.jiesha-dec",
    "ziwei.star.dahao-dec",
    "ziwei.star.feilian-dec",
    "ziwei.star.xiaohao-sq",
    "ziwei.star.bingfu-sq",
  ]);

  it("extracts all 105 distinct canonical star IDs from iztro adapter", () => {
    expect(extractedStarIds).toHaveLength(105);
  });

  it("proves every generated star ID has an approved label mapping in Vietnamese and English", () => {
    const vi = ziweiPresentation("vi");
    const en = ziweiPresentation("en");

    const viSeen = new Map<string, string>();
    const enSeen = new Map<string, string>();

    for (const starId of extractedStarIds) {
      const viLabel = vi.star(starId);
      const enLabel = en.star(starId);

      // Must never hit fallback
      expect(viLabel).not.toBe("Sao chưa xác định");
      expect(viLabel).not.toBe("Sao Tử Vi"); // Must never collapse unknown stars to Sao Tử Vi
      expect(enLabel).not.toBe("Unknown star");
      expect(enLabel).not.toBe("Zi Wei star"); // Must never collapse unknown stars to Zi Wei star

      // Must have valid non-empty string
      expect(viLabel.length).toBeGreaterThan(0);
      expect(enLabel.length).toBeGreaterThan(0);

      // Verify uniqueness unless in allowed duplicate aliases
      if (viSeen.has(viLabel)) {
        const previousId = viSeen.get(viLabel)!;
        const isAllowed =
          allowedDuplicateAliases.has(starId) || allowedDuplicateAliases.has(previousId);
        expect(
          isAllowed,
          `Unexpected duplicate Vietnamese star label "${viLabel}" between "${previousId}" and "${starId}"`
        ).toBe(true);
      } else {
        viSeen.set(viLabel, starId);
      }

      if (enSeen.has(enLabel)) {
        const previousId = enSeen.get(enLabel)!;
        const isAllowed =
          allowedDuplicateAliases.has(starId) || allowedDuplicateAliases.has(previousId);
        expect(
          isAllowed,
          `Unexpected duplicate English star label "${enLabel}" between "${previousId}" and "${starId}"`
        ).toBe(true);
      } else {
        enSeen.set(enLabel, starId);
      }
    }
  });

  it("localizes all 10 heavenly stems in Vietnamese and English", () => {
    const vi = ziweiPresentation("vi");
    const en = ziweiPresentation("en");

    const stems = [
      { id: "ziwei.stem.jia", vi: "Giáp", en: "Jia" },
      { id: "ziwei.stem.yi", vi: "Ất", en: "Yi" },
      { id: "ziwei.stem.bing", vi: "Bính", en: "Bing" },
      { id: "ziwei.stem.ding", vi: "Đinh", en: "Ding" },
      { id: "ziwei.stem.wu", vi: "Mậu", en: "Wu" },
      { id: "ziwei.stem.ji", vi: "Kỷ", en: "Ji" },
      { id: "ziwei.stem.geng", vi: "Canh", en: "Geng" },
      { id: "ziwei.stem.xin", vi: "Tân", en: "Xin" },
      { id: "ziwei.stem.ren", vi: "Nhâm", en: "Ren" },
      { id: "ziwei.stem.gui", vi: "Quý", en: "Gui" },
    ];

    for (const s of stems) {
      expect(vi.stem(s.id)).toBe(s.vi);
      expect(en.stem(s.id)).toBe(s.en);
    }
  });

  it("localizes all 12 Changsheng cycle states in Vietnamese and English", () => {
    const vi = ziweiPresentation("vi");
    const en = ziweiPresentation("en");

    const cycles = [
      { id: "ziwei.cycle.born", vi: "Trường Sinh", en: "Birth" },
      { id: "ziwei.cycle.infancy", vi: "Mục Dục", en: "Infancy" },
      { id: "ziwei.cycle.adolescence", vi: "Quan Đới", en: "Adolescence" },
      { id: "ziwei.cycle.adulthood", vi: "Lâm Quan", en: "Adulthood" },
      { id: "ziwei.cycle.prime", vi: "Đế Vượng", en: "Peak" },
      { id: "ziwei.cycle.weak", vi: "Suy", en: "Decline" },
      { id: "ziwei.cycle.sick", vi: "Bệnh", en: "Sickness" },
      { id: "ziwei.cycle.dead", vi: "Tử", en: "Death" },
      { id: "ziwei.cycle.buried", vi: "Mộ", en: "Tomb" },
      { id: "ziwei.cycle.dissipated", vi: "Tuyệt", en: "Extinction" },
      { id: "ziwei.cycle.embryo", vi: "Thai", en: "Embryo" },
      { id: "ziwei.cycle.molding", vi: "Dưỡng", en: "Nourishment" },
    ];

    for (const c of cycles) {
      expect(vi.cycleState(c.id)).toBe(c.vi);
      expect(en.cycleState(c.id)).toBe(c.en);
    }
  });

  it("fails visibly in development and test when unknown star/stem/cycle IDs are supplied", () => {
    const vi = ziweiPresentation("vi");
    const en = ziweiPresentation("en");

    expect(() => vi.star("ziwei.star.unknown_fake_star")).toThrowError(
      /Unknown canonical Zi Wei star identifier/,
    );
    expect(() => en.star("ziwei.star.unknown_fake_star")).toThrowError(
      /Unknown canonical Zi Wei star identifier/,
    );

    expect(() => vi.stem("ziwei.stem.unknown_stem")).toThrowError(
      /Unknown canonical Zi Wei stem identifier/,
    );
    expect(() => en.stem("ziwei.stem.unknown_stem")).toThrowError(
      /Unknown canonical Zi Wei stem identifier/,
    );

    expect(() => vi.cycleState("ziwei.cycle.unknown_cycle")).toThrowError(
      /Unknown canonical Zi Wei cycle state identifier/,
    );
    expect(() => en.cycleState("ziwei.cycle.unknown_cycle")).toThrowError(
      /Unknown canonical Zi Wei cycle state identifier/,
    );
  });

  it("renders a bounded neutral unknown label when strict mode is disabled (production behavior)", () => {
    const viNonStrict = ziweiPresentation("vi", { strict: false });
    const enNonStrict = ziweiPresentation("en", { strict: false });

    expect(viNonStrict.star("ziwei.star.unknown_star")).toBe("Sao chưa xác định");
    expect(enNonStrict.star("ziwei.star.unknown_star")).toBe("Unknown star");

    expect(viNonStrict.stem("ziwei.stem.unknown_stem")).toBe("Thiên can chưa xác định");
    expect(enNonStrict.stem("ziwei.stem.unknown_stem")).toBe("Unknown stem");

    expect(viNonStrict.cycleState("ziwei.cycle.unknown_cycle")).toBe("Vòng Trường Sinh chưa xác định");
    expect(enNonStrict.cycleState("ziwei.cycle.unknown_cycle")).toBe("Unknown cycle state");

    // Must never contain misleading star names
    expect(viNonStrict.star("ziwei.star.unknown_star")).not.toContain("Tử Vi");
    expect(enNonStrict.star("ziwei.star.unknown_star")).not.toContain("Zi Wei");
  });
});
