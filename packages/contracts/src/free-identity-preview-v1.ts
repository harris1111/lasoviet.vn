import { z } from "zod";

const evidenceReferenceSchema = z.object({
  evidenceId: z.string().regex(/^ziwei\.identity\.[a-z0-9-]+$/),
  factReferences: z.array(z.string().min(1)).min(1),
  confidence: z.enum(["high", "moderate"]),
  interpretationBounds: z.array(z.string().min(1)).min(1),
  limitations: z.array(z.string().min(1)).min(1),
}).strict();

const insightSchema = z.object({
  id: z.string().trim().min(1),
  evidence: evidenceReferenceSchema,
}).strict();

const offerSchema = z.object({
  sku: z.literal("ZIWEI-IDENTITY-P0"),
  method: z.literal("ziwei"),
  price: z.literal(79000),
  currency: z.literal("VND"),
  sections: z.array(z.string().trim().min(1)).min(1),
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
});

export const PaidTopicSelectionViewV1Schema = z.object({
  version: z.literal(1),
  chartId: z.string().trim().min(1),
  chartVersionId: z.string().trim().min(1),
  offers: z.array(offerSchema).length(1),
}).strict();

export const PaidTopicSelectionRequestV1Schema = z.object({
  sku: z.literal("ZIWEI-IDENTITY-P0"),
}).strict();

export type FreeIdentityPreviewV1 = z.infer<typeof FreeIdentityPreviewV1Schema>;
export type PaidTopicSelectionViewV1 = z.infer<typeof PaidTopicSelectionViewV1Schema>;
export type PaidTopicSelectionRequestV1 = z.infer<typeof PaidTopicSelectionRequestV1Schema>;
