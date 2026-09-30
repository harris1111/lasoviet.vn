import { z } from "zod";

import { EvidenceInterpretationBoundCodeSchema } from "./evidence.js";

const evidenceReferenceSchema = z.object({
  evidenceId: z.string().regex(/^ziwei\.identity\.[a-z0-9-]+$/),
  factReferences: z.array(z.string().min(1)).min(1),
  confidence: z.enum(["high", "moderate"]),
  interpretationBoundCodes: z.array(EvidenceInterpretationBoundCodeSchema).min(1).default(["reflective_identity_only"]),
  interpretationBounds: z.array(z.string().min(1)).min(1),
  limitations: z.array(z.string().min(1)).min(1),
}).strict();

const insightSchema = z.object({
  id: z.string().trim().min(1),
  evidence: evidenceReferenceSchema,
}).strict();

const natalExcerptOfferSchema = z.object({
  sku: z.literal("ZIWEI-NATAL-EXCERPT-P0"),
  method: z.literal("ziwei"),
  price: z.literal(19000),
  currency: z.literal("VND"),
  sections: z.array(z.string().trim().min(1)).min(1),
}).strict();

const identityOfferSchema = z.object({
  sku: z.literal("ZIWEI-IDENTITY-P0"),
  method: z.literal("ziwei"),
  price: z.literal(79000),
  currency: z.literal("VND"),
  sections: z.array(z.string().trim().min(1)).min(1),
}).strict();

const offerSchema = z.discriminatedUnion("sku", [
  natalExcerptOfferSchema,
  identityOfferSchema,
]);

function matchingFacts(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return first.length === second.length && first.every(
    (factReference, index) => factReference === second[index],
  );
}


export const LockedPartPreviewSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  tagline: z.string().trim().min(1).optional(),
  clippedSentences: z.array(z.string().trim().min(1)),
  counts: z.object({
    points: z.number().int().nonnegative().optional(),
    evidenceItems: z.number().int().nonnegative().optional(),
    approximateWords: z.number().int().nonnegative().optional(),
  }).strict().optional(),
  lengthHint: z.number().int().positive().default(4),
  isLocked: z.literal(true),
  priceLa: z.number().int().positive().optional(),
}).strict();

export const InsightDetailSchema = z.object({
  id: z.string().trim().min(1),
  numeral: z.string().trim().min(1),
  title: z.string().trim().min(1),
  tagline: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  starsSummary: z.string().trim().min(1).optional(),
  locationSummary: z.string().trim().min(1).optional(),
  evidenceId: z.string().trim().min(1),
  isLocked: z.boolean().default(false),
  lockedPreview: LockedPartPreviewSchema.optional(),
}).strict();

export const PalaceTitleLineSchema = z.object({
  palaceId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  state: z.enum(["read", "preview", "unopened"]),
  clippedOpening: z.string().trim().min(1).optional(),
  lengthHint: z.number().int().positive().optional(),
  priceLa: z.number().int().positive().optional(),
}).strict();

export const BanMenhPreviewSchema = z.object({
  title: z.string().trim().min(1),
  opening: z.string().trim().min(1).optional(),
  isLocked: z.literal(true),
  lengthHint: z.number().int().positive().default(4),
  counts: z.object({
    points: z.number().int().nonnegative().optional(),
    evidenceItems: z.number().int().nonnegative().optional(),
    approximateWords: z.number().int().nonnegative().optional(),
  }).strict().optional(),
  priceLa: z.number().int().positive().default(240),
}).strict();

export const FreeIdentityPreviewV1Schema = z.object({
  version: z.literal(1),
  chartId: z.string().trim().min(1),
  chartVersionId: z.string().trim().min(1),
  capabilityId: z.literal("ziwei.identity.p0"),
  summaryVersion: z.literal("ziwei.identity.free.v1"),
  insights: z.array(insightSchema).length(3),
  strengthSignal: z.object({
    id: z.string().trim().min(1),
    evidence: evidenceReferenceSchema,
  }).strict(),
  tensionSignal: z.object({
    id: z.string().trim().min(1),
    evidence: z.array(evidenceReferenceSchema).min(2),
  }).strict(),
  paidPreview: z.object({
    sku: z.literal("ZIWEI-IDENTITY-P0"),
    sectionId: z.literal("personal_summary"),
    coveragePercent: z.literal(12),
    evidence: z.array(evidenceReferenceSchema).min(1),
  }).strict(),
  audience: z.enum(["guest", "verified"]).optional(),
  topConcern: z.enum(["career", "money", "love", "family", "wellbeing", "self_understanding"]).optional(),
  magnetOffer: z.object({
    title: z.string().trim().min(1),
    subtitle: z.string().trim().min(1),
  }).strict().optional(),
  insightDetails: z.array(InsightDetailSchema).optional(),
  palaceTitleLines: z.array(PalaceTitleLineSchema).optional(),
  banMenhPreview: BanMenhPreviewSchema.optional(),
}).strict().superRefine((preview, context) => {
  if (new Set(preview.insights.map((insight) => insight.id)).size !== 3) {
    context.addIssue({ code: "custom", path: ["insights"], message: "Insight IDs must be unique" });
  }
  if (
    new Set(preview.insights.map((insight) => insight.evidence.evidenceId)).size !== 3
  ) {
    context.addIssue({ code: "custom", path: ["insights"], message: "Insight evidence IDs must be unique" });
  }
  if (
    new Set(preview.tensionSignal.evidence.map((evidence) => evidence.evidenceId)).size
      !== preview.tensionSignal.evidence.length
  ) {
    context.addIssue({ code: "custom", path: ["tensionSignal", "evidence"], message: "Tension evidence IDs must be unique" });
  }
  const insightEvidence = new Map(
    preview.insights.map((insight) => [insight.evidence.evidenceId, insight.evidence]),
  );
  for (const [path, evidence] of [
    [["strengthSignal", "evidence"], preview.strengthSignal.evidence],
    ...preview.tensionSignal.evidence.map((item, index) => [
      ["tensionSignal", "evidence", index],
      item,
    ] as const),
    ...preview.paidPreview.evidence.map((item, index) => [
      ["paidPreview", "evidence", index],
      item,
    ] as const),
  ] as const) {
    const matchingInsight = insightEvidence.get(evidence.evidenceId);
    if (
      matchingInsight === undefined ||
      !matchingFacts(matchingInsight.factReferences, evidence.factReferences)
    ) {
      context.addIssue({
        code: "custom",
        path: [...path],
        message: "Repeated evidence must match an insight evidence reference",
      });
    }
  }
});

export const PaidTopicSelectionViewV1Schema = z.object({
  version: z.literal(1),
  chartId: z.string().trim().min(1),
  chartVersionId: z.string().trim().min(1),
  offers: z.array(offerSchema).min(1).max(2),
}).strict();

export const PaidTopicSelectionRequestV1Schema = z.object({
  sku: z.enum(["ZIWEI-IDENTITY-P0", "ZIWEI-NATAL-EXCERPT-P0"]),
}).strict();

export type LockedPartPreview = z.infer<typeof LockedPartPreviewSchema>;
export type InsightDetail = z.infer<typeof InsightDetailSchema>;
export type PalaceTitleLine = z.infer<typeof PalaceTitleLineSchema>;
export type BanMenhPreview = z.infer<typeof BanMenhPreviewSchema>;

export type FreeIdentityPreviewV1 = z.infer<typeof FreeIdentityPreviewV1Schema>;
export type PaidTopicSelectionViewV1 = z.infer<typeof PaidTopicSelectionViewV1Schema>;
export type PaidTopicSelectionRequestV1 = z.infer<typeof PaidTopicSelectionRequestV1Schema>;
