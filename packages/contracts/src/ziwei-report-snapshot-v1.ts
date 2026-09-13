import { z } from "zod";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";
import type { ZiweiPalaceId } from "./normalized-ziwei-chart-v1.js";

export const ZIWEI_BRANCH_IDS = [
  "ziwei.branch.rat",
  "ziwei.branch.ox",
  "ziwei.branch.tiger",
  "ziwei.branch.rabbit",
  "ziwei.branch.dragon",
  "ziwei.branch.snake",
  "ziwei.branch.horse",
  "ziwei.branch.goat",
  "ziwei.branch.monkey",
  "ziwei.branch.rooster",
  "ziwei.branch.dog",
  "ziwei.branch.pig",
] as const;
export type ZiweiBranchId = (typeof ZIWEI_BRANCH_IDS)[number];

export const ZIWEI_STEM_IDS = [
  "ziwei.stem.jia",
  "ziwei.stem.yi",
  "ziwei.stem.bing",
  "ziwei.stem.ding",
  "ziwei.stem.wu",
  "ziwei.stem.ji",
  "ziwei.stem.geng",
  "ziwei.stem.xin",
  "ziwei.stem.ren",
  "ziwei.stem.gui",
] as const;
export type ZiweiStemId = (typeof ZIWEI_STEM_IDS)[number];

export const ZiweiTimingConfigV1Schema = z
  .object({
    yearDivide: z.literal("normal"),
    horoscopeDivide: z.literal("normal"),
    ageDivide: z.literal("normal"),
    dayDivide: z.literal("current"),
  })
  .strict();
export type ZiweiTimingConfigV1 = z.infer<typeof ZiweiTimingConfigV1Schema>;

export const ZiweiTimingProvenanceV1Schema = z
  .object({
    engineId: z.literal("ziwei.iztro"),
    engineVersion: z.literal("2.6.0"),
    adapterId: z.string().trim().min(1),
    adapterVersion: z.string().trim().min(1),
    ruleSetId: z.literal("ziwei.default"),
    config: ZiweiTimingConfigV1Schema,
  })
  .strict();
export type ZiweiTimingProvenanceV1 = z.infer<typeof ZiweiTimingProvenanceV1Schema>;

export const ZiweiTimingStarSchema = z
  .object({
    id: z.string().regex(/^ziwei\.star\.[a-z0-9-]+$/),
    brightness: z
      .enum([
        "ziwei.brightness.exalted",
        "ziwei.brightness.prosperous",
        "ziwei.brightness.favorable",
        "ziwei.brightness.neutral",
        "ziwei.brightness.unfavorable",
        "ziwei.brightness.weak",
      ])
      .optional(),
    category: z.enum(["major", "minor", "adjective", "decorative"]).optional(),
  })
  .strict();
export type ZiweiTimingStar = z.infer<typeof ZiweiTimingStarSchema>;

export const ZiweiTimingTransformationSchema = z
  .object({
    starId: z.string().regex(/^ziwei\.star\.[a-z0-9-]+$/),
    id: z.enum([
      "ziwei.transformation.prosperity",
      "ziwei.transformation.power",
      "ziwei.transformation.fame",
      "ziwei.transformation.obstacle",
    ]),
  })
  .strict();
export type ZiweiTimingTransformation = z.infer<typeof ZiweiTimingTransformationSchema>;

export const ZiweiTimingPalaceSchema = z
  .object({
    palaceId: z.enum(ZIWEI_PALACE_IDS),
    heavenlyStemId: z.string().regex(/^ziwei\.stem\.[a-z0-9-]+$/),
    earthlyBranchId: z.enum(ZIWEI_BRANCH_IDS),
    isOriginalPalace: z.boolean(),
    cycleStateId: z.string().regex(/^ziwei\.cycle\.[a-z0-9-]+$/),
    stars: z.array(ZiweiTimingStarSchema),
    transformations: z.array(ZiweiTimingTransformationSchema),
  })
  .strict();
export type ZiweiTimingPalace = z.infer<typeof ZiweiTimingPalaceSchema>;

export const ZiweiTimingDecadalActiveLayerV1Schema = z
  .object({
    state: z.literal("active"),
    index: z.number().int().nonnegative(),
    ageRange: z.tuple([
      z.number().int().positive(),
      z.number().int().positive(),
    ]),
    yearRange: z.tuple([
      z.number().int(),
      z.number().int(),
    ]),
    palaceId: z.enum(ZIWEI_PALACE_IDS),
    heavenlyStemId: z.string().regex(/^ziwei\.stem\.[a-z0-9-]+$/),
    earthlyBranchId: z.enum(ZIWEI_BRANCH_IDS),
    palaces: z.array(ZiweiTimingPalaceSchema).length(12),
  })
  .strict()
  .superRefine((decadal, ctx) => {
    const [ageMin, ageMax] = decadal.ageRange;
    if (ageMax - ageMin !== 9) {
      ctx.addIssue({
        code: "custom",
        path: ["ageRange"],
        message: `Decadal ageRange must span exactly 10 inclusive values (end - start === 9), got [${ageMin}, ${ageMax}]`,
      });
    }
    const [yearMin, yearMax] = decadal.yearRange;
    if (yearMax - yearMin !== 9) {
      ctx.addIssue({
        code: "custom",
        path: ["yearRange"],
        message: `Decadal yearRange must span exactly 10 inclusive values (end - start === 9), got [${yearMin}, ${yearMax}]`,
      });
    }
    for (let i = 0; i < decadal.palaces.length; i++) {
      const p = decadal.palaces[i]!;
      const expectedPalaceId = ZIWEI_PALACE_IDS[i]!;
      if (p.palaceId !== expectedPalaceId) {
        ctx.addIssue({
          code: "custom",
          path: ["palaces", i, "palaceId"],
          message: `Decadal palace at index ${i} must match canonical palace ID ${expectedPalaceId}, got ${p.palaceId}`,
        });
      }
    }
  });
export type ZiweiTimingDecadalActiveLayerV1 = z.infer<
  typeof ZiweiTimingDecadalActiveLayerV1Schema
>;

export const ZiweiTimingDecadalNotStartedLayerV1Schema = z
  .object({
    state: z.literal("not_started"),
    firstCycleStartAge: z.number().int().positive(),
    firstCycleStartYear: z.number().int(),
  })
  .strict();
export type ZiweiTimingDecadalNotStartedLayerV1 = z.infer<
  typeof ZiweiTimingDecadalNotStartedLayerV1Schema
>;

export const ZiweiTimingDecadalLayerV1Schema = z.discriminatedUnion("state", [
  ZiweiTimingDecadalActiveLayerV1Schema,
  ZiweiTimingDecadalNotStartedLayerV1Schema,
]);
export type ZiweiTimingDecadalLayerV1 = z.infer<
  typeof ZiweiTimingDecadalLayerV1Schema
>;

export const ZiweiTimingAnnualLayerV1Schema = z
  .object({
    targetYear: z.number().int(),
    palaceId: z.enum(ZIWEI_PALACE_IDS),
    heavenlyStemId: z.string().regex(/^ziwei\.stem\.[a-z0-9-]+$/),
    earthlyBranchId: z.enum(ZIWEI_BRANCH_IDS),
    palaces: z.array(ZiweiTimingPalaceSchema).length(12),
  })
  .strict()
  .superRefine((annual, ctx) => {
    for (let i = 0; i < annual.palaces.length; i++) {
      const p = annual.palaces[i]!;
      const expectedPalaceId = ZIWEI_PALACE_IDS[i]!;
      if (p.palaceId !== expectedPalaceId) {
        ctx.addIssue({
          code: "custom",
          path: ["palaces", i, "palaceId"],
          message: `Annual palace at index ${i} must match canonical palace ID ${expectedPalaceId}, got ${p.palaceId}`,
        });
      }
    }
  });
export type ZiweiTimingAnnualLayerV1 = z.infer<typeof ZiweiTimingAnnualLayerV1Schema>;

export const ZiweiTimingSnapshotV1Schema = z
  .object({
    decadal: ZiweiTimingDecadalLayerV1Schema,
    annual: ZiweiTimingAnnualLayerV1Schema,
    provenance: ZiweiTimingProvenanceV1Schema,
  })
  .strict();
export type ZiweiTimingSnapshotV1 = z.infer<typeof ZiweiTimingSnapshotV1Schema>;

export const ZiweiTimeFrameSchema = z
  .object({
    position: z.enum(["previous", "selected", "next"]),
    vendorTimeIndex: z.number().int().min(0).max(12),
    civilDateOffset: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    frameId: z.string().regex(/^ziwei\.time-frame\.[a-z0-9-]+$/),
  })
  .strict();
export type ZiweiTimeFrame = z.infer<typeof ZiweiTimeFrameSchema>;

export const ZiweiSensitiveFactVariantSchema = z
  .object({
    position: z.enum(["previous", "selected", "next"]),
    valueIds: z.array(z.string().trim().min(1)),
    evidenceKeys: z.array(z.string().trim().min(1)),
  })
  .strict();
export type ZiweiSensitiveFactVariant = z.infer<typeof ZiweiSensitiveFactVariantSchema>;

export const ZiweiSensitiveFactSchema = z
  .object({
    factKey: z.string().trim().min(1),
    variants: z.tuple([
      ZiweiSensitiveFactVariantSchema,
      ZiweiSensitiveFactVariantSchema,
      ZiweiSensitiveFactVariantSchema,
    ]),
  })
  .strict();
export type ZiweiSensitiveFact = z.infer<typeof ZiweiSensitiveFactSchema>;

export const ZiweiSensitivitySnapshotV1Schema = z
  .object({
    selectedFrame: ZiweiTimeFrameSchema,
    previousFrame: ZiweiTimeFrameSchema,
    nextFrame: ZiweiTimeFrameSchema,
    stableFactKeys: z.array(z.string().trim().min(1)).min(1),
    sensitiveFacts: z.array(ZiweiSensitiveFactSchema),
  })
  .strict();
export type ZiweiSensitivitySnapshotV1 = z.infer<typeof ZiweiSensitivitySnapshotV1Schema>;

export const ZiweiReportSnapshotProvenanceV1Schema = z
  .object({
    chartVersionId: z.string().trim().min(1),
    timingRuleVersion: z.string().trim().min(1),
    sensitivityRuleVersion: z.string().trim().min(1),
    snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type ZiweiReportSnapshotProvenanceV1 = z.infer<
  typeof ZiweiReportSnapshotProvenanceV1Schema
>;

export const ZiweiReportSnapshotV1Schema = z
  .object({
    version: z.literal(1),
    chartVersionId: z.string().trim().min(1),
    asOfDate: z.iso.date(),
    timezone: z.literal("Asia/Ho_Chi_Minh"),
    timingRuleVersion: z.string().trim().min(1),
    sensitivityRuleVersion: z.string().trim().min(1),
    timing: ZiweiTimingSnapshotV1Schema,
    sensitivity: ZiweiSensitivitySnapshotV1Schema,
    provenance: ZiweiReportSnapshotProvenanceV1Schema,
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    if (snapshot.chartVersionId !== snapshot.provenance.chartVersionId) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "chartVersionId"],
        message: "Provenance chartVersionId must match top-level chartVersionId",
      });
    }
    if (snapshot.timingRuleVersion !== snapshot.provenance.timingRuleVersion) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "timingRuleVersion"],
        message: "Provenance timingRuleVersion must match top-level timingRuleVersion",
      });
    }
    if (snapshot.sensitivityRuleVersion !== snapshot.provenance.sensitivityRuleVersion) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "sensitivityRuleVersion"],
        message: "Provenance sensitivityRuleVersion must match top-level sensitivityRuleVersion",
      });
    }

    const asOfDateYear = parseInt(snapshot.asOfDate.slice(0, 4), 10);
    if (snapshot.timing.annual.targetYear !== asOfDateYear) {
      ctx.addIssue({
        code: "custom",
        path: ["timing", "annual", "targetYear"],
        message: `Annual targetYear (${snapshot.timing.annual.targetYear}) must match asOfDate year (${asOfDateYear})`,
      });
    }

    const prevFrame = snapshot.sensitivity.previousFrame;
    const selFrame = snapshot.sensitivity.selectedFrame;
    const nextFrame = snapshot.sensitivity.nextFrame;

    if (prevFrame.position !== "previous") {
      ctx.addIssue({
        code: "custom",
        path: ["sensitivity", "previousFrame", "position"],
        message: "previousFrame position must be 'previous'",
      });
    }
    if (selFrame.position !== "selected") {
      ctx.addIssue({
        code: "custom",
        path: ["sensitivity", "selectedFrame", "position"],
        message: "selectedFrame position must be 'selected'",
      });
    }
    if (nextFrame.position !== "next") {
      ctx.addIssue({
        code: "custom",
        path: ["sensitivity", "nextFrame", "position"],
        message: "nextFrame position must be 'next'",
      });
    }

    if (selFrame.civilDateOffset !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["sensitivity", "selectedFrame", "civilDateOffset"],
        message: "selectedFrame civilDateOffset must be 0",
      });
    }

    const selIdx = selFrame.vendorTimeIndex;
    let expectedPrevIdx: number;
    let expectedPrevOffset: -1 | 0 | 1;
    let expectedNextIdx: number;
    let expectedNextOffset: -1 | 0 | 1;

    if (selIdx === 0) {
      expectedPrevIdx = 12;
      expectedPrevOffset = -1;
      expectedNextIdx = 1;
      expectedNextOffset = 0;
    } else if (selIdx === 12) {
      expectedPrevIdx = 11;
      expectedPrevOffset = 0;
      expectedNextIdx = 0;
      expectedNextOffset = 1;
    } else {
      expectedPrevIdx = selIdx - 1;
      expectedPrevOffset = 0;
      expectedNextIdx = selIdx + 1;
      expectedNextOffset = 0;
    }

    if (
      prevFrame.vendorTimeIndex !== expectedPrevIdx ||
      prevFrame.civilDateOffset !== expectedPrevOffset
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sensitivity", "previousFrame"],
        message: `Chronological adjacency mismatch for previousFrame when selected vendorTimeIndex is ${selIdx}: expected index ${expectedPrevIdx} with offset ${expectedPrevOffset}, got index ${prevFrame.vendorTimeIndex} with offset ${prevFrame.civilDateOffset}`,
      });
    }

    if (
      nextFrame.vendorTimeIndex !== expectedNextIdx ||
      nextFrame.civilDateOffset !== expectedNextOffset
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sensitivity", "nextFrame"],
        message: `Chronological adjacency mismatch for nextFrame when selected vendorTimeIndex is ${selIdx}: expected index ${expectedNextIdx} with offset ${expectedNextOffset}, got index ${nextFrame.vendorTimeIndex} with offset ${nextFrame.civilDateOffset}`,
      });
    }

    const stableKeys = new Set<string>();
    for (let i = 0; i < snapshot.sensitivity.stableFactKeys.length; i++) {
      const key = snapshot.sensitivity.stableFactKeys[i]!;
      if (stableKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["sensitivity", "stableFactKeys", i],
          message: `Duplicate stableFactKey: ${key}`,
        });
      }
      stableKeys.add(key);
    }

    const factKeys = new Set<string>();
    for (let i = 0; i < snapshot.sensitivity.sensitiveFacts.length; i++) {
      const fact = snapshot.sensitivity.sensitiveFacts[i]!;
      if (factKeys.has(fact.factKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["sensitivity", "sensitiveFacts", i, "factKey"],
          message: `Duplicate sensitive factKey: ${fact.factKey}`,
        });
      }
      if (stableKeys.has(fact.factKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["sensitivity", "sensitiveFacts", i, "factKey"],
          message: `Sensitive factKey '${fact.factKey}' must not overlap with stableFactKeys`,
        });
      }
      factKeys.add(fact.factKey);

      const [prevVar, selVar, nextVar] = fact.variants;
      if (prevVar.position !== "previous") {
        ctx.addIssue({
          code: "custom",
          path: ["sensitivity", "sensitiveFacts", i, "variants", 0, "position"],
          message: "Variant 0 position must be 'previous'",
        });
      }
      if (selVar.position !== "selected") {
        ctx.addIssue({
          code: "custom",
          path: ["sensitivity", "sensitiveFacts", i, "variants", 1, "position"],
          message: "Variant 1 position must be 'selected'",
        });
      }
      if (nextVar.position !== "next") {
        ctx.addIssue({
          code: "custom",
          path: ["sensitivity", "sensitiveFacts", i, "variants", 2, "position"],
          message: "Variant 2 position must be 'next'",
        });
      }
    }
  });

export type ZiweiReportSnapshotV1 = z.infer<typeof ZiweiReportSnapshotV1Schema>;
