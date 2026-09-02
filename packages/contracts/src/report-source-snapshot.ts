import { z } from "zod";

const factReferenceSchema = z.string()
  .regex(/^(?:[A-Za-z][A-Za-z0-9]*)(?:\.[A-Za-z][A-Za-z0-9-]*)*$/);
const canonicalFactValueSchema = z.string()
  .regex(/^ziwei\.[a-z0-9.-]+$/);

export const FrozenIdentityReportFactsV1Schema = z.object({
  version: z.literal(1),
  capabilityId: z.literal("ziwei.identity.p0"),
  chartVersionId: z.string().trim().min(1),
  ruleVersion: z.literal("ziwei.identity.v1"),
  evidenceVersion: z.literal(1),
  facts: z.record(
    factReferenceSchema,
    z.union([
      canonicalFactValueSchema,
      z.array(canonicalFactValueSchema).min(1).max(24),
    ]),
  ).refine((facts) => Object.keys(facts).length > 0, {
    message: "At least one frozen fact is required",
  }),
}).strict();

export type FrozenIdentityReportFactsV1 = z.infer<
  typeof FrozenIdentityReportFactsV1Schema
>;
