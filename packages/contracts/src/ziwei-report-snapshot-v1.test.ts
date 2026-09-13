import { describe, expect, it } from "vitest";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";
import {
  ZIWEI_BRANCH_IDS,
  ZiweiReportSnapshotV1Schema,
  ZiweiTimingPalaceSchema,
  type ZiweiReportSnapshotV1,
  type ZiweiTimingPalace,
  type ZiweiTimingDecadalActiveLayerV1,
} from "./ziwei-report-snapshot-v1.js";

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


function asActiveDecadal(snapshot: ZiweiReportSnapshotV1): ZiweiTimingDecadalActiveLayerV1 {
  if (snapshot.timing.decadal.state !== "active") {
    throw new Error("Expected active decadal layer");
  }
  return snapshot.timing.decadal;
}

function createValidSnapshot(): ZiweiReportSnapshotV1 {
  return {
    version: 1,
    chartVersionId: "chart-v1-uuid",
    asOfDate: "2026-09-12",
    timezone: "Asia/Ho_Chi_Minh",
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
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
      chartVersionId: "chart-v1-uuid",
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      snapshotHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
  };
}

describe("ZiweiReportSnapshotV1Schema", () => {
  it("validates a compliant deterministic V4 snapshot", () => {
    const valid = createValidSnapshot();
    const parsed = ZiweiReportSnapshotV1Schema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  describe("chronological adjacency and vendor time index boundaries", () => {
    it("validates boundary vendorTimeIndex 0 with previous 12 (-1) and next 1 (0)", () => {
      const snapshot = createValidSnapshot();
      snapshot.sensitivity.selectedFrame.vendorTimeIndex = 0;
      snapshot.sensitivity.selectedFrame.civilDateOffset = 0;
      snapshot.sensitivity.previousFrame.vendorTimeIndex = 12;
      snapshot.sensitivity.previousFrame.civilDateOffset = -1;
      snapshot.sensitivity.nextFrame.vendorTimeIndex = 1;
      snapshot.sensitivity.nextFrame.civilDateOffset = 0;

      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(true);
    });

    it("validates boundary vendorTimeIndex 12 with previous 11 (0) and next 0 (+1)", () => {
      const snapshot = createValidSnapshot();
      snapshot.sensitivity.selectedFrame.vendorTimeIndex = 12;
      snapshot.sensitivity.selectedFrame.civilDateOffset = 0;
      snapshot.sensitivity.previousFrame.vendorTimeIndex = 11;
      snapshot.sensitivity.previousFrame.civilDateOffset = 0;
      snapshot.sensitivity.nextFrame.vendorTimeIndex = 0;
      snapshot.sensitivity.nextFrame.civilDateOffset = 1;

      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(true);
    });

    it("validates vendorTimeIndex 11 with previous 10 (0) and next 12 (0)", () => {
      const snapshot = createValidSnapshot();
      snapshot.sensitivity.selectedFrame.vendorTimeIndex = 11;
      snapshot.sensitivity.selectedFrame.civilDateOffset = 0;
      snapshot.sensitivity.previousFrame.vendorTimeIndex = 10;
      snapshot.sensitivity.previousFrame.civilDateOffset = 0;
      snapshot.sensitivity.nextFrame.vendorTimeIndex = 12;
      snapshot.sensitivity.nextFrame.civilDateOffset = 0;

      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(true);
    });

    it("rejects when selectedFrame civilDateOffset is not 0", () => {
      const snapshot = createValidSnapshot();
      snapshot.sensitivity.selectedFrame.civilDateOffset = 1;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
    });

    it("rejects non-adjacent previous vendor index or incorrect civil offset", () => {
      const snapshot = createValidSnapshot();
      // selected is 6, previous should be 5 offset 0; set to 4
      snapshot.sensitivity.previousFrame.vendorTimeIndex = 4;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshot2 = createValidSnapshot();
      // selected is 0, previous should be offset -1; set to offset 0
      snapshot2.sensitivity.selectedFrame.vendorTimeIndex = 0;
      snapshot2.sensitivity.previousFrame.vendorTimeIndex = 12;
      snapshot2.sensitivity.previousFrame.civilDateOffset = 0; // wrong offset!
      snapshot2.sensitivity.nextFrame.vendorTimeIndex = 1;
      snapshot2.sensitivity.nextFrame.civilDateOffset = 0;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);
    });

    it("rejects non-adjacent next vendor index or incorrect civil offset", () => {
      const snapshot = createValidSnapshot();
      // selected is 6, next should be 7; set to 8
      snapshot.sensitivity.nextFrame.vendorTimeIndex = 8;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshot2 = createValidSnapshot();
      // selected is 12, next should be index 0 offset 1; set to index 0 offset 0
      snapshot2.sensitivity.selectedFrame.vendorTimeIndex = 12;
      snapshot2.sensitivity.previousFrame.vendorTimeIndex = 11;
      snapshot2.sensitivity.previousFrame.civilDateOffset = 0;
      snapshot2.sensitivity.nextFrame.vendorTimeIndex = 0;
      snapshot2.sensitivity.nextFrame.civilDateOffset = 0; // wrong offset!
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);
    });

    it("rejects out of bounds vendorTimeIndex (< 0 or > 12)", () => {
      const snapshot = createValidSnapshot();
      snapshot.sensitivity.selectedFrame.vendorTimeIndex = 13;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      snapshot.sensitivity.selectedFrame.vendorTimeIndex = -1;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
    });
  });

  describe("decadal range exact 10 inclusive values (end - start === 9)", () => {
    it("accepts exactly 10-value inclusive ageRange and yearRange", () => {
      const snapshot = createValidSnapshot();
      const decadal = asActiveDecadal(snapshot);
      decadal.ageRange = [12, 21];
      decadal.yearRange = [2012, 2021];
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(true);
    });

    it("rejects decadal ageRange not spanning 10 inclusive values", () => {
      const snapshot = createValidSnapshot();
      asActiveDecadal(snapshot).ageRange = [22, 30]; // span 9
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshot2 = createValidSnapshot();
      asActiveDecadal(snapshot2).ageRange = [22, 32]; // span 11
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);
    });

    it("rejects decadal yearRange not spanning 10 inclusive values", () => {
      const snapshot = createValidSnapshot();
      asActiveDecadal(snapshot).yearRange = [2022, 2030]; // span 9
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshot2 = createValidSnapshot();
      asActiveDecadal(snapshot2).yearRange = [2022, 2032]; // span 11
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);
    });
  });


  describe("decadal layer state discriminated union", () => {
    it("validates a compliant snapshot with not_started decadal layer", () => {
      const snapshot = createValidSnapshot();
      snapshot.timing.decadal = {
        state: "not_started",
        firstCycleStartAge: 6,
        firstCycleStartYear: 2030,
      };
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(true);
    });

    it("rejects not_started decadal layer with non-positive firstCycleStartAge", () => {
      const snapshot = createValidSnapshot();
      snapshot.timing.decadal = {
        state: "not_started",
        firstCycleStartAge: 0,
        firstCycleStartYear: 2030,
      };
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshotNegative = createValidSnapshot();
      snapshotNegative.timing.decadal = {
        state: "not_started",
        firstCycleStartAge: -5,
        firstCycleStartYear: 2030,
      };
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshotNegative).success).toBe(false);
    });

    it("rejects not_started decadal layer with mixed active fields", () => {
      const snapshot = createValidSnapshot();
      snapshot.timing.decadal = {
        state: "not_started",
        firstCycleStartAge: 6,
        firstCycleStartYear: 2030,
        palaceId: "ziwei.palace.life",
      } as any;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshot2 = createValidSnapshot();
      snapshot2.timing.decadal = {
        state: "not_started",
        firstCycleStartAge: 6,
        firstCycleStartYear: 2030,
        index: 0,
      } as any;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);

      const snapshot3 = createValidSnapshot();
      snapshot3.timing.decadal = {
        state: "not_started",
        firstCycleStartAge: 6,
        firstCycleStartYear: 2030,
        palaces: create12Palaces(),
      } as any;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot3).success).toBe(false);
    });

    it("rejects active decadal layer with mixed not_started fields", () => {
      const snapshot = createValidSnapshot();
      (snapshot.timing.decadal as any).firstCycleStartAge = 6;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshot2 = createValidSnapshot();
      (snapshot2.timing.decadal as any).firstCycleStartYear = 2030;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);
    });

    it("rejects decadal layer with missing or invalid state discriminator", () => {
      const snapshot = createValidSnapshot();
      delete (snapshot.timing.decadal as any).state;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshot2 = createValidSnapshot();
      (snapshot2.timing.decadal as any).state = "childhood";
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);
    });
  });

  describe("canonical palace order", () => {
    it("enforces canonical order for decadal timing palaces", () => {
      const snapshot = createValidSnapshot();
      // Swap palace 0 and palace 1
      const decadal = asActiveDecadal(snapshot);
      const temp = decadal.palaces[0]!;
      decadal.palaces[0] = decadal.palaces[1]!;
      decadal.palaces[1] = temp;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
    });

    it("enforces canonical order for annual timing palaces", () => {
      const snapshot = createValidSnapshot();
      // Swap palace 0 and palace 1
      const temp = snapshot.timing.annual.palaces[0]!;
      snapshot.timing.annual.palaces[0] = snapshot.timing.annual.palaces[1]!;
      snapshot.timing.annual.palaces[1] = temp;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
    });

    it("rejects when timing palaces has fewer or more than 12 palaces", () => {
      const snapshot = createValidSnapshot();
      asActiveDecadal(snapshot).palaces.pop();
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

      const snapshot2 = createValidSnapshot();
      snapshot2.timing.annual.palaces.pop();
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);
    });
  });

  describe("annual targetYear vs asOfDate", () => {
    it("accepts matching targetYear and asOfDate year", () => {
      const snapshot = createValidSnapshot();
      snapshot.asOfDate = "2026-09-12";
      snapshot.timing.annual.targetYear = 2026;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(true);
    });

    it("rejects mismatch between annual targetYear and asOfDate year", () => {
      const snapshot = createValidSnapshot();
      snapshot.asOfDate = "2026-09-12";
      snapshot.timing.annual.targetYear = 2025;
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
    });
  });

  describe("stable and sensitive key separation", () => {
    it("rejects when a sensitiveFact factKey overlaps with stableFactKeys", () => {
      const snapshot = createValidSnapshot();
      snapshot.sensitivity.stableFactKeys = [
        "ziwei.fact.life-palace-branch",
        "ziwei.fact.overlapping-key",
      ];
      snapshot.sensitivity.sensitiveFacts[0]!.factKey = "ziwei.fact.overlapping-key";
      expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
    });
  });

  it("strictly rejects unknown fields at top-level and in nested objects", () => {
    const snapshot = createValidSnapshot() as any;
    snapshot.extraField = "forbidden";
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

    const snapshot2 = createValidSnapshot() as any;
    snapshot2.timing.extraTimingField = "forbidden";
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);
  });

  it("strictly rejects birth PII and raw profile fields", () => {
    const piiFieldCases = [
      { birthDate: "2000-01-01" },
      { birthTime: "12:30" },
      { birthPlace: "Hà Nội" },
      { displayName: "Nguyễn Văn A" },
      { timezoneInput: "Asia/Ho_Chi_Minh" },
      { profilePayload: { name: "test" } },
      { place: "Vietnam" },
      { gender: "female" },
    ];

    for (const piiField of piiFieldCases) {
      const invalid = { ...createValidSnapshot(), ...piiField };
      const result = ZiweiReportSnapshotV1Schema.safeParse(invalid);
      expect(result.success).toBe(false);
    }
  });

  it("enforces frame position labels: previous, selected, next", () => {
    const snapshot = createValidSnapshot();
    snapshot.sensitivity.previousFrame.position = "next" as never;
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

    const snapshot2 = createValidSnapshot();
    snapshot2.sensitivity.selectedFrame.position = "previous" as never;
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);

    const snapshot3 = createValidSnapshot();
    snapshot3.sensitivity.nextFrame.position = "selected" as never;
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot3).success).toBe(false);
  });

  it("enforces variant ordering in sensitiveFacts: previous, selected, next", () => {
    const snapshot = createValidSnapshot();
    snapshot.sensitivity.sensitiveFacts[0]!.variants[0].position = "selected" as never;
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
  });

  it("enforces matching top-level and provenance identifiers", () => {
    const snapshot = createValidSnapshot();
    snapshot.provenance.chartVersionId = "mismatched-chart-id";
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

    const snapshot2 = createValidSnapshot();
    snapshot2.provenance.timingRuleVersion = "mismatched-timing-rule";
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);

    const snapshot3 = createValidSnapshot();
    snapshot3.provenance.sensitivityRuleVersion = "mismatched-sensitivity-rule";
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot3).success).toBe(false);
  });

  it("enforces timing provenance exact pinned values", () => {
    const snapshot = createValidSnapshot();
    snapshot.timing.provenance.engineId = "other.engine" as never;
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);

    const snapshot2 = createValidSnapshot();
    snapshot2.timing.provenance.engineVersion = "3.0.0" as never;
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot2).success).toBe(false);

    const snapshot3 = createValidSnapshot();
    snapshot3.timing.provenance.ruleSetId = "ziwei.other" as never;
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot3).success).toBe(false);

    const snapshot4 = createValidSnapshot();
    snapshot4.timing.provenance.config.dayDivide = "exact" as never;
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot4).success).toBe(false);
  });

  it("rejects non-hex or non-64 snapshotHash", () => {
    const snapshot = createValidSnapshot();
    snapshot.provenance.snapshotHash = "not-a-valid-sha256-hash";
    expect(ZiweiReportSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
  });

  describe("ZiweiTimingPalaceSchema metadata enforcement", () => {
    it("validates timing palace with required stem, branch, isOriginalPalace, and cycleStateId", () => {
      const validPalace: ZiweiTimingPalace = {
        palaceId: "ziwei.palace.life",
        heavenlyStemId: "ziwei.stem.wu",
        earthlyBranchId: "ziwei.branch.horse",
        isOriginalPalace: true,
        cycleStateId: "ziwei.cycle.prime",
        stars: [],
        transformations: [],
      };
      expect(ZiweiTimingPalaceSchema.safeParse(validPalace).success).toBe(true);
    });

    it("rejects timing palace missing heavenlyStemId, earthlyBranchId, isOriginalPalace, or cycleStateId", () => {
      const basePalace = {
        palaceId: "ziwei.palace.life",
        heavenlyStemId: "ziwei.stem.wu",
        earthlyBranchId: "ziwei.branch.horse",
        isOriginalPalace: false,
        cycleStateId: "ziwei.cycle.prime",
        stars: [],
        transformations: [],
      };

      const withoutStem = { ...basePalace };
      delete (withoutStem as any).heavenlyStemId;
      expect(ZiweiTimingPalaceSchema.safeParse(withoutStem).success).toBe(false);

      const withoutBranch = { ...basePalace };
      delete (withoutBranch as any).earthlyBranchId;
      expect(ZiweiTimingPalaceSchema.safeParse(withoutBranch).success).toBe(false);

      const withoutOriginal = { ...basePalace };
      delete (withoutOriginal as any).isOriginalPalace;
      expect(ZiweiTimingPalaceSchema.safeParse(withoutOriginal).success).toBe(false);

      const withoutCycle = { ...basePalace };
      delete (withoutCycle as any).cycleStateId;
      expect(ZiweiTimingPalaceSchema.safeParse(withoutCycle).success).toBe(false);
    });

    it("rejects invalid branch or stem or cycle format", () => {
      const basePalace = {
        palaceId: "ziwei.palace.life",
        heavenlyStemId: "invalid-stem",
        earthlyBranchId: "ziwei.branch.horse",
        isOriginalPalace: false,
        cycleStateId: "ziwei.cycle.prime",
        stars: [],
        transformations: [],
      };
      expect(ZiweiTimingPalaceSchema.safeParse(basePalace).success).toBe(false);

      const invalidBranch = { ...basePalace, heavenlyStemId: "ziwei.stem.wu", earthlyBranchId: "invalid-branch" as any };
      expect(ZiweiTimingPalaceSchema.safeParse(invalidBranch).success).toBe(false);

      const invalidCycle = { ...basePalace, heavenlyStemId: "ziwei.stem.wu", cycleStateId: "invalid-cycle" };
      expect(ZiweiTimingPalaceSchema.safeParse(invalidCycle).success).toBe(false);
    });

    it("rejects extra fields on timing palace due to strict()", () => {
      const extra = {
        palaceId: "ziwei.palace.life",
        heavenlyStemId: "ziwei.stem.wu",
        earthlyBranchId: "ziwei.branch.horse",
        isOriginalPalace: false,
        cycleStateId: "ziwei.cycle.prime",
        stars: [],
        transformations: [],
        extraProperty: true,
      };
      expect(ZiweiTimingPalaceSchema.safeParse(extra).success).toBe(false);
    });
  });
});
