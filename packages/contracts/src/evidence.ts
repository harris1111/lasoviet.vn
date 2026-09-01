import { z } from "zod";

const evidenceKey = z.string().regex(/^ziwei\.identity\.[a-z0-9-]+$/);

export const EvidenceItemV1Schema = z.object({
  id: evidenceKey,
  factReferences: z.array(z.string().min(1)).min(1),
  confidence: z.enum(["high", "moderate"]),
  interpretationBounds: z.array(z.string().min(1)).min(1),
  limitations: z.array(z.string().min(1)).min(1),
  riskTags: z.array(z.enum(["identity", "determinism", "birth-time"])).min(1),
  allowedActionCategories: z.array(
    z.enum(["reflect", "explore", "discuss-with-support"]),
  ).min(1),
}).strict();

export const EvidenceSetV1Schema = z.object({
  version: z.literal(1),
  capabilityId: z.literal("ziwei.identity.p0"),
  chartVersionId: z.string().min(1),
  ruleVersion: z.literal("ziwei.identity.v1"),
  items: z.array(EvidenceItemV1Schema).length(3),
}).strict();

export type EvidenceItemV1 = z.infer<typeof EvidenceItemV1Schema>;
export type EvidenceSetV1 = z.infer<typeof EvidenceSetV1Schema>;
