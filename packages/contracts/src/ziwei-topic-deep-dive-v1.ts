import { z } from "zod";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";
import type { ZiweiPalaceId } from "./normalized-ziwei-chart-v1.js";

export const ZIWEI_TOPIC_DEEP_DIVE_IDS = [
  "relationship_marriage",
  "career_wealth",
  "business_enterprise",
] as const;

export type ZiweiTopicDeepDiveId = (typeof ZIWEI_TOPIC_DEEP_DIVE_IDS)[number];
export const ZiweiTopicDeepDiveIdSchema = z.enum(ZIWEI_TOPIC_DEEP_DIVE_IDS);

export const ZIWEI_TOPIC_SKU_MAP = Object.freeze({
  relationship_marriage: "ZIWEI-RELATIONSHIP-P0",
  career_wealth: "ZIWEI-CAREER-P0",
  business_enterprise: "ZIWEI-BUSINESS-P0",
} as const);

export const ZiweiTopicSkuSchema = z.enum(Object.values(ZIWEI_TOPIC_SKU_MAP));

export const CANONICAL_TOPIC_DEEP_DIVE_TITLES_VI: Record<ZiweiTopicDeepDiveId, string> = {
  relationship_marriage: "Luận giải chuyên sâu Tình duyên & Hôn nhân",
  career_wealth: "Luận giải chuyên sâu Công việc & Tài lộc",
  business_enterprise: "Luận giải chuyên sâu Kinh doanh và làm ăn",
};

export const CANONICAL_TOPIC_DEEP_DIVE_TITLES_EN: Record<ZiweiTopicDeepDiveId, string> = {
  relationship_marriage: "Relationship & Marriage Deep Dive",
  career_wealth: "Career & Wealth Deep Dive",
  business_enterprise: "Business & Enterprise Deep Dive",
};

export const TOPIC_PALACE_SCOPES: Record<
  ZiweiTopicDeepDiveId,
  {
    primaryPalaces: readonly ZiweiPalaceId[];
    supportingPalaces: readonly ZiweiPalaceId[];
  }
> = {
  relationship_marriage: {
    primaryPalaces: ["ziwei.palace.spouse"],
    supportingPalaces: [
      "ziwei.palace.life",
      "ziwei.palace.fortune",
      "ziwei.palace.travel",
      "ziwei.palace.children",
      "ziwei.palace.siblings",
      "ziwei.palace.parents",
    ],
  },
  business_enterprise: {
    primaryPalaces: ["ziwei.palace.wealth", "ziwei.palace.career"],
    supportingPalaces: ["ziwei.palace.life", "ziwei.palace.friends", "ziwei.palace.property", "ziwei.palace.travel"],
  },
  career_wealth: {
    primaryPalaces: ["ziwei.palace.career", "ziwei.palace.wealth"],
    supportingPalaces: [
      "ziwei.palace.life",
      "ziwei.palace.property",
      "ziwei.palace.travel",
      "ziwei.palace.friends",
    ],
  },
};

const narrativeSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const ZiweiTopicOverviewSchema = narrativeSectionSchema;
export type ZiweiTopicOverview = z.infer<typeof ZiweiTopicOverviewSchema>;

export const ZiweiTopicPalaceAnchorSchema = narrativeSectionSchema
  .extend({
    palaceId: z.enum(ZIWEI_PALACE_IDS),
  })
  .strict();
export type ZiweiTopicPalaceAnchor = z.infer<typeof ZiweiTopicPalaceAnchorSchema>;

export const ZiweiTopicThematicDimensionSchema = narrativeSectionSchema
  .extend({
    key: z.string().trim().min(1).max(64),
  })
  .strict();
export type ZiweiTopicThematicDimension = z.infer<
  typeof ZiweiTopicThematicDimensionSchema
>;

export const ZiweiTopicDecadalTimingActiveSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
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
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
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
  });
export type ZiweiTopicDecadalTimingActive = z.infer<
  typeof ZiweiTopicDecadalTimingActiveSchema
>;

export const ZiweiTopicDecadalTimingNotStartedSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    state: z.literal("not_started"),
    firstCycleStartAge: z.number().int().positive(),
    firstCycleStartYear: z.number().int(),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();
export type ZiweiTopicDecadalTimingNotStarted = z.infer<
  typeof ZiweiTopicDecadalTimingNotStartedSchema
>;

export const ZiweiTopicDecadalTimingSchema = z.discriminatedUnion("state", [
  ZiweiTopicDecadalTimingActiveSchema,
  ZiweiTopicDecadalTimingNotStartedSchema,
]);
export type ZiweiTopicDecadalTiming = z.infer<
  typeof ZiweiTopicDecadalTimingSchema
>;

export const ZiweiTopicActionItemSchema = z
  .object({
    recommendation: z.string().trim().min(1).max(5_000),
    rationale: z.string().trim().min(1).max(5_000),
    avoid: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();
export type ZiweiTopicActionItem = z.infer<typeof ZiweiTopicActionItemSchema>;

export const ZiweiTopicDeepDiveContentV1Schema = z
  .object({
    topicId: ZiweiTopicDeepDiveIdSchema,
    title: z.string().trim().min(1).max(160),
    overview: ZiweiTopicOverviewSchema,
    palaceAnchors: z.array(ZiweiTopicPalaceAnchorSchema).min(1).max(6),
    thematicDimensions: z
      .array(ZiweiTopicThematicDimensionSchema)
      .min(2)
      .max(6),
    decadalTiming: ZiweiTopicDecadalTimingSchema,
    actions: z.array(ZiweiTopicActionItemSchema).min(3).max(5),
  })
  .strict()
  .superRefine((report, ctx) => {
    if (report.topicId === "business_enterprise") {
      const scope = TOPIC_PALACE_SCOPES.business_enterprise;
      const allowed = new Set([...scope.primaryPalaces, ...scope.supportingPalaces]);
      const anchors = report.palaceAnchors.map(anchor => anchor.palaceId);
      if (scope.primaryPalaces.some(palace => !anchors.includes(palace)) ||
          anchors.some(palace => !allowed.has(palace)) || new Set(anchors).size !== anchors.length) {
        ctx.addIssue({code: "custom", path: ["palaceAnchors"],
          message: "Business reading requires distinct Wealth/Career anchors within its closed palace scope"});
      }
    }
    if (report.topicId === "relationship_marriage") {
      const hasSpouse = report.palaceAnchors.some(
        (p) => p.palaceId === "ziwei.palace.spouse",
      );
      if (!hasSpouse) {
        ctx.addIssue({
          code: "custom",
          path: ["palaceAnchors"],
          message:
            "Relationship & marriage deep dive must include ziwei.palace.spouse in palaceAnchors",
        });
      }
    } else if (report.topicId === "career_wealth") {
      const hasCareerOrWealth = report.palaceAnchors.some(
        (p) =>
          p.palaceId === "ziwei.palace.career" ||
          p.palaceId === "ziwei.palace.wealth",
      );
      if (!hasCareerOrWealth) {
        ctx.addIssue({
          code: "custom",
          path: ["palaceAnchors"],
          message:
            "Career & wealth deep dive must include ziwei.palace.career or ziwei.palace.wealth in palaceAnchors",
        });
      }
    }
  });

export type ZiweiTopicDeepDiveContentV1 = z.infer<
  typeof ZiweiTopicDeepDiveContentV1Schema
>;

// Paid readers receive prose and chart references, never internal evidence keys.
const publicNarrativeSchema = narrativeSectionSchema.omit({ evidenceKeys: true });
export const ZiweiTopicDeepDivePublicContentV1Schema = z.object({
  topicId: ZiweiTopicDeepDiveIdSchema,
  title: z.string().trim().min(1).max(160),
  overview: publicNarrativeSchema,
  palaceAnchors: z.array(publicNarrativeSchema.extend({ palaceId: z.enum(ZIWEI_PALACE_IDS) }).strict()).min(1).max(6),
  thematicDimensions: z.array(publicNarrativeSchema.extend({ key: z.string().trim().min(1).max(64) }).strict()).min(2).max(6),
  decadalTiming: publicNarrativeSchema,
  actions: z.array(ZiweiTopicActionItemSchema.omit({ evidenceKeys: true })).min(3).max(5),
}).strict();
export type ZiweiTopicDeepDivePublicContentV1 = z.infer<typeof ZiweiTopicDeepDivePublicContentV1Schema>;

export function projectTopicDeepDivePublicContent(content: ZiweiTopicDeepDiveContentV1): ZiweiTopicDeepDivePublicContentV1 {
  const prose = ({title, narrative}: {title: string; narrative: string}) => ({title, narrative});
  return ZiweiTopicDeepDivePublicContentV1Schema.parse({
    topicId: content.topicId, title: content.title, overview: prose(content.overview),
    palaceAnchors: content.palaceAnchors.map(item => ({...prose(item), palaceId: item.palaceId})),
    thematicDimensions: content.thematicDimensions.map(item => ({...prose(item), key: item.key})),
    decadalTiming: prose(content.decadalTiming),
    actions: content.actions.map(({recommendation, rationale, avoid}) => ({recommendation, rationale, avoid})),
  });
}
