import { describe, expect, it } from "vitest";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";
import {
  ZIWEI_BRANCH_IDS,
  type ZiweiReportSnapshotV1,
  type ZiweiTimingPalace,
} from "./ziwei-report-snapshot-v1.js";
import {
  ReportSourceSnapshotV1Schema,
  type ReportSourceSnapshotV1,
} from "./ziwei-report-source-snapshot-v1.js";

function create12Palaces(): ZiweiTimingPalace[] {
  return ZIWEI_PALACE_IDS.map((palaceId, idx) => ({
    palaceId,
    heavenlyStemId: "ziwei.stem.bing",
    earthlyBranchId: ZIWEI_BRANCH_IDS[idx % ZIWEI_BRANCH_IDS.length]!,
    isOriginalPalace: idx === 2,
    cycleStateId: "ziwei.cycle.prime",
    stars: [
      {
        id: "ziwei.star.ziwei",
        brightness: "ziwei.brightness.exalted",
        category: "major",
      },
    ],
    transformations: [
      {
        starId: "ziwei.star.ziwei",
        id: "ziwei.transformation.prosperity",
      },
    ],
  }));
}

function createValidSnapshot(): ZiweiReportSnapshotV1 {
  const chartVersionId = "chart-v1-uuid";
  const timingRuleVersion = "ziwei.timing.v1";
  const sensitivityRuleVersion = "ziwei.sensitivity.v1";
  const snapshotHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  return {
    version: 1,
    chartVersionId,
    asOfDate: "2026-09-12",
    timezone: "Asia/Ho_Chi_Minh",
    timingRuleVersion,
    sensitivityRuleVersion,
    timing: {
      decadal: {
        state: "active",
        index: 2,
        ageRange: [22, 31],
        yearRange: [2022, 2031],
        palaceId: "ziwei.palace.fortune",
        heavenlyStemId: "ziwei.stem.bing",
        earthlyBranchId: "ziwei.branch.tiger",
        palaces: create12Palaces(),
      },
      annual: {
        targetYear: 2026,
        palaceId: "ziwei.palace.career",
        heavenlyStemId: "ziwei.stem.bing",
        earthlyBranchId: "ziwei.branch.horse",
        palaces: create12Palaces(),
      },
      provenance: {
        engineId: "ziwei.iztro",
        engineVersion: "2.6.0",
        adapterId: "ziwei.iztro-adapter",
        adapterVersion: "1.0.0",
        ruleSetId: "ziwei.default",
        config: {
          yearDivide: "normal",
          horoscopeDivide: "normal",
          ageDivide: "normal",
          dayDivide: "current",
        },
      },
    },
    sensitivity: {
      previousFrame: {
        position: "previous",
        vendorTimeIndex: 5,
        civilDateOffset: 0,
        frameId: "ziwei.time-frame.snake",
      },
      selectedFrame: {
        position: "selected",
        vendorTimeIndex: 6,
        civilDateOffset: 0,
        frameId: "ziwei.time-frame.horse",
      },
      nextFrame: {
        position: "next",
        vendorTimeIndex: 7,
        civilDateOffset: 0,
        frameId: "ziwei.time-frame.goat",
      },
      stableFactKeys: [
        "ziwei.fact.life-palace-branch",
        "ziwei.fact.body-palace-branch",
      ],
      sensitiveFacts: [
        {
          factKey: "ziwei.fact.life-palace-stem",
          variants: [
            {
              position: "previous",
              valueIds: ["ziwei.stem.yi"],
              evidenceKeys: ["ziwei.palace.life"],
            },
            {
              position: "selected",
              valueIds: ["ziwei.stem.bing"],
              evidenceKeys: ["ziwei.palace.life"],
            },
            {
              position: "next",
              valueIds: ["ziwei.stem.ding"],
              evidenceKeys: ["ziwei.palace.life"],
            },
          ],
        },
      ],
    },
    provenance: {
      chartVersionId,
      timingRuleVersion,
      sensitivityRuleVersion,
      snapshotHash,
    },
  };
}

function createValidSourceSnapshot(): ReportSourceSnapshotV1 {
  const snapshot = createValidSnapshot();
  return {
    version: 1,
    reportId: "a0000000-0000-4000-8000-000000000001",
    reportVersionId: "b0000000-0000-4000-8000-000000000002",
    chartVersionId: snapshot.chartVersionId,
    asOfDate: snapshot.asOfDate,
    targetYear: 2026,
    timingRuleVersion: snapshot.timingRuleVersion,
    sensitivityRuleVersion: snapshot.sensitivityRuleVersion,
    snapshotHash: snapshot.provenance.snapshotHash,
    snapshot,
  };
}

describe("ReportSourceSnapshotV1Schema", () => {
  it("parses valid source snapshot", () => {
    const valid = createValidSourceSnapshot();
    const result = ReportSourceSnapshotV1Schema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.reportId).toBe("a0000000-0000-4000-8000-000000000001");
      expect(result.data.reportVersionId).toBe("b0000000-0000-4000-8000-000000000002");
      expect(result.data.asOfDate).toBe("2026-09-12");
      expect(result.data.targetYear).toBe(2026);
    }
  });

  it("rejects unknown extra fields (strict)", () => {
    const valid = createValidSourceSnapshot();
    const result = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      extraField: "not-allowed",
    });
    expect(result.success).toBe(false);
  });

  it("strictly rejects raw birth profile / PII fields", () => {
    const valid = createValidSourceSnapshot();
    const withBirthDate = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      birthDate: "1990-01-01",
    });
    expect(withBirthDate.success).toBe(false);

    const withGender = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      gender: "male",
    });
    expect(withGender.success).toBe(false);

    const withLocation = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      location: "Hanoi",
    });
    expect(withLocation.success).toBe(false);
  });

  it("rejects invalid UUIDs", () => {
    const valid = createValidSourceSnapshot();
    expect(
      ReportSourceSnapshotV1Schema.safeParse({
        ...valid,
        reportId: "not-a-uuid",
      }).success,
    ).toBe(false);

    expect(
      ReportSourceSnapshotV1Schema.safeParse({
        ...valid,
        reportVersionId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid or non-hex snapshot hash", () => {
    const valid = createValidSourceSnapshot();
    expect(
      ReportSourceSnapshotV1Schema.safeParse({
        ...valid,
        snapshotHash: "tooshort",
      }).success,
    ).toBe(false);

    expect(
      ReportSourceSnapshotV1Schema.safeParse({
        ...valid,
        snapshotHash: "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF", // uppercase
      }).success,
    ).toBe(false);
  });

  it("rejects when targetYear does not match asOfDate year", () => {
    const valid = createValidSourceSnapshot();
    const result = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      targetYear: 2025, // asOfDate is 2026-09-12
    });
    expect(result.success).toBe(false);
  });

  it("rejects chartVersionId mismatch with snapshot", () => {
    const valid = createValidSourceSnapshot();
    const result = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      chartVersionId: "different-chart-id",
    });
    expect(result.success).toBe(false);
  });

  it("rejects asOfDate mismatch with snapshot", () => {
    const valid = createValidSourceSnapshot();
    const result = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      asOfDate: "2026-09-13",
      targetYear: 2026,
    });
    expect(result.success).toBe(false);
  });

  it("rejects timingRuleVersion mismatch with snapshot", () => {
    const valid = createValidSourceSnapshot();
    const result = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      timingRuleVersion: "ziwei.timing.v2",
    });
    expect(result.success).toBe(false);
  });

  it("rejects sensitivityRuleVersion mismatch with snapshot", () => {
    const valid = createValidSourceSnapshot();
    const result = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      sensitivityRuleVersion: "ziwei.sensitivity.v2",
    });
    expect(result.success).toBe(false);
  });

  it("rejects snapshotHash mismatch with snapshot provenance", () => {
    const valid = createValidSourceSnapshot();
    const result = ReportSourceSnapshotV1Schema.safeParse({
      ...valid,
      snapshotHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    });
    expect(result.success).toBe(false);
  });
});
