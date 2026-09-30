import { describe, expect, it } from "vitest";

import { ReportComprehensiveV3ReadyViewV1Schema } from "./identity-report-v1.js";
import { ReportChartSnapshotV1Schema } from "./report-chart-snapshot-v1.js";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";

function validSnapshot() {
  return {
    version: 1,
    palaces: ZIWEI_PALACE_IDS.map((palaceId, i) => ({
      palaceId,
      earthlyBranchId: "ziwei.branch.rat",
      isLife: i === 0,
      isBody: i === 6,
      triadPalaceIds: [ZIWEI_PALACE_IDS[(i + 4) % 12], ZIWEI_PALACE_IDS[(i + 8) % 12]],
      oppositePalaceId: ZIWEI_PALACE_IDS[(i + 6) % 12],
      stars: i === 0
        ? [{ starId: "ziwei.star.lianzhen", kind: "main", brightnessId: "ziwei.brightness.neutral" }]
        : [],
    })),
    decadal: {
      currentOrdinal: 2,
      cycles: [{ ordinal: 2, palaceId: "ziwei.palace.spouse", ageRange: [25, 34], yearRange: [2017, 2026] }],
    },
    annual: { targetYear: 2026, palaceId: "ziwei.palace.fortune" },
  };
}

describe("ReportChartSnapshotV1Schema", () => {
  it("accepts a valid snapshot", () => {
    expect(ReportChartSnapshotV1Schema.safeParse(validSnapshot()).success).toBe(true);
  });

  it("rejects a snapshot without 12 palaces", () => {
    const snapshot = validSnapshot();
    snapshot.palaces.pop();
    expect(ReportChartSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
  });

  it("rejects unknown fields such as birth data", () => {
    expect(ReportChartSnapshotV1Schema.safeParse({ ...validSnapshot(), birthDate: "1993-01-01" }).success).toBe(false);
  });

  it("is optional and nullable on the v3 ready view", () => {
    const field = ReportComprehensiveV3ReadyViewV1Schema.shape.chartSnapshot;
    expect(field.safeParse(undefined).success).toBe(true);
    expect(field.safeParse(null).success).toBe(true);
    expect(field.safeParse(validSnapshot()).success).toBe(true);
  });
});
