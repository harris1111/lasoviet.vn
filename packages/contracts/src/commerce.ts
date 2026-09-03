import { z } from "zod";

export const CommerceSkuSchema = z.literal("ZIWEI-IDENTITY-P0");
export const OrderStatusSchema = z.enum([
  "pending",
  "paid",
  "expired",
  "failed",
  "refunded",
]);

export type CommerceSku = z.infer<typeof CommerceSkuSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
