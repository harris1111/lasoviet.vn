import {z} from "zod";
export const RecoveryReceiptCommandV1Schema = z.object({version:z.literal(1),orderId:z.string().uuid(),deliveryId:z.string().uuid()}).strict();
export const RecoveryReceiptViewV1Schema = z.object({version:z.literal(1),orderId:z.string().uuid(),source:z.literal("reminder"),classification:z.enum(["captured_click","clicked"])}).strict();
export type RecoveryReceiptCommandV1 = z.infer<typeof RecoveryReceiptCommandV1Schema>;
