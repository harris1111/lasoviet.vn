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

export const EntitlementStatusSchema = z.enum(["active", "revoked"]);
export type EntitlementStatus = z.infer<typeof EntitlementStatusSchema>;

export const PRODUCT_DISPLAY_NAMES: Record<CommerceSku, Record<"vi" | "en", string>> = {
  "ZIWEI-IDENTITY-P0": {
    vi: "Bản mệnh & tiềm năng",
    en: "Identity and potential",
  },
};

export function resolveProductTitle(sku: CommerceSku, locale: "vi" | "en"): string {
  return PRODUCT_DISPLAY_NAMES[sku]?.[locale] ?? sku;
}

export const AccountLibraryItemV1Schema = z
  .object({
    id: z.string().trim().min(1),
    entitlementId: z.string().trim().min(1),
    orderId: z.string().trim().min(1),
    chartId: z.string().trim().min(1),
    profileId: z.string().trim().min(1).nullable(),
    profileDisplayName: z.string().trim().min(1).max(80).nullable(),
    sku: CommerceSkuSchema,
    productTitle: z.string().trim().min(1),
    productName: z.string().trim().min(1),
    orderStatus: OrderStatusSchema,
    entitlementStatus: EntitlementStatusSchema,
    reportId: z.string().trim().min(1).nullable(),
    readUrl: z.string().trim().min(1).nullable(),
    reportStatus: z.string().trim().min(1).nullable(),
    locale: z.enum(["vi", "en"]),
    createdAt: z.iso.datetime({ offset: true }),
    purchasedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
export type AccountLibraryItemV1 = z.infer<typeof AccountLibraryItemV1Schema>;

export const AccountLibraryGroupV1Schema = z
  .object({
    profileId: z.string().trim().min(1).nullable(),
    profileDisplayName: z.string().trim().min(1).max(80).nullable(),
    chartId: z.string().trim().min(1),
    items: z.array(AccountLibraryItemV1Schema),
    latestReportId: z.string().trim().min(1).nullable(),
    latestReadUrl: z.string().trim().min(1).nullable(),
  })
  .strict();
export type AccountLibraryGroupV1 = z.infer<typeof AccountLibraryGroupV1Schema>;

export const AccountLibraryV1Schema = z
  .object({
    version: z.literal(1),
    groups: z.array(AccountLibraryGroupV1Schema),
    items: z.array(AccountLibraryItemV1Schema),
    latestReadableReport: AccountLibraryItemV1Schema.nullable(),
    totalCount: z.number().int().nonnegative(),
  })
  .strict();
export type AccountLibraryV1 = z.infer<typeof AccountLibraryV1Schema>;

export const OrderHistoryItemV1Schema = z
  .object({
    id: z.string().trim().min(1),
    orderId: z.string().trim().min(1),
    invoiceNumber: z.string().trim().min(1),
    chartId: z.string().trim().min(1),
    profileId: z.string().trim().min(1).nullable(),
    profileDisplayName: z.string().trim().min(1).max(80).nullable(),
    sku: CommerceSkuSchema,
    productTitle: z.string().trim().min(1),
    productName: z.string().trim().min(1),
    amount: z.number().int().nonnegative(),
    currency: z.string().trim().min(1),
    status: OrderStatusSchema,
    orderStatus: OrderStatusSchema,
    locale: z.enum(["vi", "en"]),
    createdAt: z.iso.datetime({ offset: true }),
    paidAt: z.iso.datetime({ offset: true }).nullable(),
    reportId: z.string().trim().min(1).nullable(),
    readUrl: z.string().trim().min(1).nullable(),
    supportUrl: z.string().trim().min(1).optional(),
  })
  .strict();
export type OrderHistoryItemV1 = z.infer<typeof OrderHistoryItemV1Schema>;

export const OrderHistoryV1Schema = z
  .object({
    version: z.literal(1),
    orders: z.array(OrderHistoryItemV1Schema),
    items: z.array(OrderHistoryItemV1Schema),
    totalCount: z.number().int().nonnegative(),
  })
  .strict();
export type OrderHistoryV1 = z.infer<typeof OrderHistoryV1Schema>;
