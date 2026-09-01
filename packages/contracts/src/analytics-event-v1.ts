import { z } from "zod";

export const AnalyticsEventV1Schema = z
  .object({
    name: z.string().trim().min(1),
    properties: z.record(z.string(), z.unknown()),
  })
  .strict();

export type AnalyticsEventV1 = z.infer<typeof AnalyticsEventV1Schema>;
