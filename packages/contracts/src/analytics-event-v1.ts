import { z } from "zod";

const AnalyticsScalarValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const AnalyticsPropertyValueSchema = z.union([
  AnalyticsScalarValueSchema,
  z.array(AnalyticsScalarValueSchema).max(25),
]);

export const AnalyticsEventV1Schema = z
  .object({
    name: z.string().trim().min(1),
    properties: z.record(z.string(), AnalyticsPropertyValueSchema),
  })
  .strict();

export type AnalyticsEventV1 = z.infer<typeof AnalyticsEventV1Schema>;
