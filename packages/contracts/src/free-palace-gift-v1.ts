import { z } from "zod";
import { PalaceIdSchema } from "./normalized-ziwei-chart-v1.js";

const evidenceKey = z.string().min(1).max(160).regex(/^[a-z0-9:._-]+$/);
const evidenceKeys = z.array(evidenceKey).min(1).max(32);
const point = z.object({ text: z.string().trim().min(1).max(1200), evidenceKeys }).strict();
export const FreePalaceGiftContentV1Schema = z.object({
  palaceId: PalaceIdSchema,
  title: z.string().trim().min(1).max(160),
  conclusion: z.string().trim().min(1).max(1600),
  keyPoints: z.array(point).min(3).max(5),
  narrative: z.string().trim().min(1).max(16000),
  do: z.array(point).min(1).max(5),
  avoid: z.array(point).min(1).max(5),
  evidenceKeys,
}).strict();
export const FreePalaceGiftFactV1Schema = z.object({
  key: evidenceKey, label: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(800),
}).strict();
export const FreePalaceGiftViewV1Schema = z.discriminatedUnion("status", [
  z.object({
    version: z.literal(1), status: z.literal("ready"), requestId: z.uuid(),
    chartVersionId: z.string().min(1).max(200), palaceId: PalaceIdSchema,
    locale: z.enum(["vi", "en"]), sourceKind: z.literal("validated_artifact"),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    reading: FreePalaceGiftContentV1Schema,
    facts: z.array(FreePalaceGiftFactV1Schema).min(1).max(64),
  }).strict().superRefine((view, context) => {
    if (view.palaceId !== view.reading.palaceId) {
      context.addIssue({ code: "custom", path: ["reading", "palaceId"], message: "Gift palace must match frozen selection" });
    }
    const keys = new Set(view.facts.map((fact) => fact.key));
    const used = [...view.reading.evidenceKeys, ...view.reading.keyPoints.flatMap((p) => p.evidenceKeys), ...view.reading.do.flatMap((p) => p.evidenceKeys), ...view.reading.avoid.flatMap((p) => p.evidenceKeys)];
    if (keys.size !== view.facts.length || used.some((key) => !keys.has(key))) {
      context.addIssue({ code: "custom", path: ["facts"], message: "Every evidence reference must resolve to a unique supplied fact" });
    }
  }),
  z.object({ version: z.literal(1), status: z.enum(["requested", "generating", "unavailable", "budget_exhausted", "terminal_failure", "cost_unknown"]) }).strict(),
]);
export const FreePalaceGiftOutboxPayloadV1Schema = z.object({ requestId: z.uuid() }).strict();
export type FreePalaceGiftContentV1 = z.infer<typeof FreePalaceGiftContentV1Schema>;
export type FreePalaceGiftViewV1 = z.infer<typeof FreePalaceGiftViewV1Schema>;
export type FreePalaceGiftFactV1 = z.infer<typeof FreePalaceGiftFactV1Schema>;

// Server-only request snapshot. Never embed this object in a browser DTO.
const lineageId = z.string().trim().min(1).max(200);
export const FreePalaceGiftFrozenCallV1Schema = z.object({
  version: z.literal(1), requestId: z.uuid(), chartVersionId: lineageId,
  palaceId: PalaceIdSchema, locale: z.enum(["vi", "en"]),
  provider: lineageId, model: lineageId,
  promptVersion: lineageId, rulesVersion: lineageId, knowledgeVersion: lineageId,
  scorerVersion: lineageId, schemaVersion: lineageId, pricingSnapshotId: lineageId,
  serializedPrompt: z.string().min(1).max(1000000),
  maxOutputTokens: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  reservedMicroVnd: z.string().regex(/^[1-9][0-9]*$/),
  deletionGeneration: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();
export type FreePalaceGiftFrozenCallV1 = Readonly<z.infer<typeof FreePalaceGiftFrozenCallV1Schema>>;
