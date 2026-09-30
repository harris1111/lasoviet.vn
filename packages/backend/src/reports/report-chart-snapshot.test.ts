import { describe, expect, it } from "vitest";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { ZIWEI_PALACE_IDS } from "@lasoviet/contracts";

import {
  buildReportChartSnapshot,
  buildReportChartSnapshotFromStored,
  deriveDecadalCycles,
  findDecadalOrdinal,
} from "./report-chart-snapshot.js";

const RING = [
  "ziwei.branch.rat", "ziwei.branch.ox", "ziwei.branch.tiger", "ziwei.branch.rabbit",
  "ziwei.branch.dragon", "ziwei.branch.snake", "ziwei.branch.horse", "ziwei.branch.goat",
  "ziwei.branch.monkey", "ziwei.branch.rooster", "ziwei.branch.dog", "ziwei.branch.pig",
] as const;

// Founder's 2026-09-27 chart: Mệnh at Thìn, palaces run backward, Thân at Thiên Di (Tuất).
function founderChart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: ZIWEI_PALACE_IDS.map((id, i) => ({
      id,
      earthlyBranchId: RING[(4 - i + 12) % 12]!,
      heavenlyStemId: "ziwei.stem.bing",
      isBodyPalace: id === "ziwei.palace.travel",
      stars:
        id === "ziwei.palace.life"
          ? [
              { id: "ziwei.star.lianzhen", brightness: "ziwei.brightness.neutral", category: "major" },
              { id: "ziwei.star.tianfu", brightness: "ziwei.brightness.exalted", category: "major" },
            ]
          : id === "ziwei.palace.spouse"
            ? [{ id: "ziwei.star.pojun", brightness: "ziwei.brightness.favorable", category: "major" }]
            : [],
    })),
    transformations: [{ starId: "ziwei.star.pojun", id: "ziwei.transformation.prosperity" }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.travel",
    horoscopeCapabilities: [{ id: "ziwei.horoscope.decadal", supported: true }],
    warnings: [],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart-v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: [],
    },
  };
}

const activeTiming = {
  decadal: {
    state: "active" as const,
    earthlyBranchId: "ziwei.branch.tiger",
    palaceId: "ziwei.palace.spouse" as const,
    ageRange: [25, 34] as [number, number],
    yearRange: [2017, 2026] as [number, number],
  },
  annual: { targetYear: 2026, palaceId: "ziwei.palace.fortune" as const },
};

describe("findDecadalOrdinal", () => {
  it("finds the cycle number from the start age", () => {
    expect(findDecadalOrdinal(25)).toBe(2);
    expect(findDecadalOrdinal(6)).toBe(0);
    expect(findDecadalOrdinal(62)).toBe(6);
  });

  it("returns null for impossible start ages", () => {
    expect(findDecadalOrdinal(1)).toBeNull();
    expect(findDecadalOrdinal(18)).toBeNull();
  });
});

describe("deriveDecadalCycles", () => {
  it("derives a backward run from the founder's chart", () => {
    const cycles = deriveDecadalCycles("ziwei.branch.dragon", activeTiming.decadal);
    expect(cycles?.[0]).toEqual({ ordinal: 0, branchId: "ziwei.branch.dragon", ageRange: [5, 14], yearRange: [1997, 2006] });
    expect(cycles?.[3]).toEqual({ ordinal: 3, branchId: "ziwei.branch.ox", ageRange: [35, 44], yearRange: [2027, 2036] });
    expect(cycles).toHaveLength(12);
  });

  it("derives a forward run", () => {
    const cycles = deriveDecadalCycles("ziwei.branch.rat", {
      earthlyBranchId: "ziwei.branch.tiger", ageRange: [23, 32], yearRange: [2010, 2019],
    });
    expect(cycles?.[1]?.branchId).toBe("ziwei.branch.ox");
    expect(cycles?.[1]?.ageRange).toEqual([13, 22]);
  });

  it("returns null when the direction cannot be known", () => {
    expect(deriveDecadalCycles("ziwei.branch.rat", { earthlyBranchId: "ziwei.branch.rat", ageRange: [4, 13], yearRange: [2000, 2009] })).toBeNull();
    expect(deriveDecadalCycles("ziwei.branch.rat", { earthlyBranchId: "ziwei.branch.horse", ageRange: [62, 71], yearRange: [2040, 2049] })).toBeNull();
  });

  it("returns null for inconsistent data", () => {
    expect(deriveDecadalCycles("ziwei.branch.rat", { earthlyBranchId: "ziwei.branch.dragon", ageRange: [25, 34], yearRange: [2017, 2026] })).toBeNull();
  });
});

describe("buildReportChartSnapshot", () => {
  it("projects palaces, stars, transformations and the full decadal run", () => {
    const snapshot = buildReportChartSnapshot(founderChart(), activeTiming);
    const life = snapshot.palaces.find((p) => p.palaceId === "ziwei.palace.life")!;
    expect(life.isLife).toBe(true);
    expect(life.earthlyBranchId).toBe("ziwei.branch.dragon");
    expect(life.stars.map((s) => s.starId)).toEqual(["ziwei.star.lianzhen", "ziwei.star.tianfu"]);
    const spouse = snapshot.palaces.find((p) => p.palaceId === "ziwei.palace.spouse")!;
    expect(spouse.stars[0]).toMatchObject({ kind: "main", transformationId: "ziwei.transformation.prosperity" });
    expect(snapshot.decadal.currentOrdinal).toBe(2);
    expect(snapshot.decadal.cycles[3]).toMatchObject({ palaceId: "ziwei.palace.children", ageRange: [35, 44] });
    expect(snapshot.annual).toEqual({ targetYear: 2026, palaceId: "ziwei.palace.fortune" });
  });

  it("falls back to the current cycle only when the run cannot be derived", () => {
    const timing = { ...activeTiming, decadal: { ...activeTiming.decadal, earthlyBranchId: "ziwei.branch.dog", palaceId: "ziwei.palace.travel" as const, ageRange: [62, 71] as [number, number], yearRange: [2054, 2063] as [number, number] } };
    const snapshot = buildReportChartSnapshot(founderChart(), timing);
    expect(snapshot.decadal.cycles).toEqual([{ ordinal: 6, palaceId: "ziwei.palace.travel", ageRange: [62, 71], yearRange: [2054, 2063] }]);
    expect(snapshot.decadal.currentOrdinal).toBe(6);
  });

  it("shows only the first cycle before decadal cycles start", () => {
    const snapshot = buildReportChartSnapshot(founderChart(), {
      decadal: { state: "not_started", firstCycleStartAge: 5, firstCycleStartYear: 1997 },
      annual: { targetYear: 1995, palaceId: "ziwei.palace.life" },
    });
    expect(snapshot.decadal).toEqual({
      currentOrdinal: null,
      cycles: [{ ordinal: 0, palaceId: "ziwei.palace.life", ageRange: [5, 14], yearRange: [1997, 2006] }],
    });
  });
});

describe("buildReportChartSnapshotFromStored", () => {
  it("returns null instead of throwing on bad stored data", () => {
    expect(buildReportChartSnapshotFromStored({ nope: true }, null, "chart-1")).toBeNull();
  });
});
