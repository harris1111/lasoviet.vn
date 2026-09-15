import { z } from "zod";

export const CANONICAL_ANALYTICS_EVENT_NAMES = [
  "landing",
  "wizard_start",
  "wizard_step_complete",
  "chart_success",
  "offer_view",
  "locked_preview_view",
  "topup_view",
  "pack_selected",
  "checkout_created",
  "payment_confirmed",
  "la_spent",
  "report_opened",
  "report_section_read",
  "upgrade_view",
  "upgrade_purchased",
  "return_visit",
] as const;

export const CanonicalAnalyticsEventNameSchema = z.enum(
  CANONICAL_ANALYTICS_EVENT_NAMES,
);
export type CanonicalAnalyticsEventName = z.infer<
  typeof CanonicalAnalyticsEventNameSchema
>;

const AnalyticsScalarValueSchema = z.union([
  z.string().max(256),
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
