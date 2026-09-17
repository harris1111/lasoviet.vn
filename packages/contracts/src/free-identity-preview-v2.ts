import { z } from "zod";

const id = z.string().trim().min(1);

export const FreeIdentityPreviewV2Schema = z.object({
  version: z.literal(2),
  chartId: id,
  chartVersionId: id,
  capabilityId: z.literal("ziwei.identity.p0"),
  previews: z.array(z.object({
    sectionId: z.string().trim().min(1).max(120),
    teaser: z.string().trim().min(1).max(520),
    locked: z.literal(true),
  }).strict()).min(1).max(3),
}).strict();
export type FreeIdentityPreviewV2 = z.infer<typeof FreeIdentityPreviewV2Schema>;

export const PaidTopicSelectionViewV2Schema = z.object({
  version: z.literal(2),
  chartId: id,
  chartVersionId: id,
  offers: z.array(z.discriminatedUnion("sku", [
    z.object({
      sku: z.literal("ZIWEI-NATAL-EXCERPT-P0"),
      priceLa: z.literal(240),
      currency: z.literal("LA"),
    }).strict(),
    z.object({
      sku: z.literal("ZIWEI-IDENTITY-P0"),
      priceLa: z.union([z.literal(720), z.literal(960)]),
      currency: z.literal("LA"),
    }).strict(),
  ])).min(1).max(2),
}).strict();
export type PaidTopicSelectionViewV2 = z.infer<typeof PaidTopicSelectionViewV2Schema>;
