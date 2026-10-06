import { z } from "zod";
import { LaSkuSchema } from "./la-catalog.js";

/** Private hint only. Opening the confirmation fetches fresh purchase terms. */
export const PendingUnlockHintV1Schema = z.object({
  version: z.literal(1), ownerId: z.string().min(1), intentId: z.string().uuid(),
  chartId: z.string().min(1), chartVersionId: z.string().min(1), sku: LaSkuSchema,
  locale: z.enum(["vi", "en"]), priceLa: z.number().int().positive(),
  balanceLa: z.number().int().nonnegative(), gapLa: z.number().int().positive(),
}).strict().refine(value => value.gapLa === value.priceLa - value.balanceLa, { message: "Shortfall must match current balance and price" });
export type PendingUnlockHintV1 = z.infer<typeof PendingUnlockHintV1Schema>;
