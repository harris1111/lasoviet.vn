import { z } from "zod";

export const CommerceSkuSchema = z.enum([
  "ZIWEI-IDENTITY-P0",
  "ZIWEI-NATAL-EXCERPT-P0",
]);
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

export const COMPREHENSIVE_REPORT_SECTION_IDS = [
  "overview",
  "coreAxis",
  "strengthsAndTensions",
  "practicalDirection",
  "keyConfigurations",
  "palaceReadings",
  "thematicSynthesis",
] as const;

export const ComprehensiveReportSectionIdSchema = z.enum(COMPREHENSIVE_REPORT_SECTION_IDS);
export type ComprehensiveReportSectionId = z.infer<typeof ComprehensiveReportSectionIdSchema>;

export const TIER_1_SCOPE_SECTIONS = [
  "overview",
  "coreAxis",
  "strengthsAndTensions",
  "practicalDirection",
] as const;

export const TIER_2_SCOPE_SECTIONS = [
  "overview",
  "coreAxis",
  "strengthsAndTensions",
  "practicalDirection",
  "keyConfigurations",
  "palaceReadings",
  "thematicSynthesis",
] as const;

export const COMPREHENSIVE_REPORT_TIER_1_LOCKED_SECTIONS = [
  "keyConfigurations",
  "palaceReadings",
  "thematicSynthesis",
] as const;

export const EntitlementScopeSchema = z
  .object({
    sections: z.array(ComprehensiveReportSectionIdSchema).min(1),
  })
  .strict();
export type EntitlementScope = z.infer<typeof EntitlementScopeSchema>;

export const TIER_1_ENTITLEMENT_SCOPE: EntitlementScope = Object.freeze({
  sections: [...TIER_1_SCOPE_SECTIONS],
});

export const TIER_2_ENTITLEMENT_SCOPE: EntitlementScope = Object.freeze({
  sections: [...TIER_2_SCOPE_SECTIONS],
});

export function resolveEntitlementScopeForSku(sku: CommerceSku): EntitlementScope {
  switch (sku) {
    case "ZIWEI-NATAL-EXCERPT-P0":
      return TIER_1_ENTITLEMENT_SCOPE;
    case "ZIWEI-IDENTITY-P0":
      return TIER_2_ENTITLEMENT_SCOPE;
  }
}

export const PRODUCT_DISPLAY_NAMES: Record<CommerceSku, Record<"vi" | "en", string>> = {
  "ZIWEI-IDENTITY-P0": {
    vi: "Luận giải Tử Vi toàn diện",
    en: "Comprehensive Zi Wei reading",
  },
  "ZIWEI-NATAL-EXCERPT-P0": {
    vi: "Bản mệnh và tiềm năng",
    en: "Core identity and potential",
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

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

export function isValidLocalMinuteString(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
    return false;
  }
  const [datePart, timePart] = val.split("T");
  if (!datePart || !timePart) return false;
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr] = timePart.split(":");
  if (!yearStr || !monthStr || !dayStr || !hourStr || !minuteStr) return false;

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;

  return true;
}

export const PaymentSelfClaimRequestV1Schema = z
  .object({
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    transferredAtLocal: z.string().refine(isValidLocalMinuteString, {
      message: "transferredAtLocal must be an exact valid YYYY-MM-DDTHH:mm date without seconds or timezone offset",
    }),
  })
  .strict();
export type PaymentSelfClaimRequestV1 = z.infer<typeof PaymentSelfClaimRequestV1Schema>;

export const PaymentSelfClaimSuccessV1Schema = z
  .object({
    status: z.literal("claimed"),
    orderId: z.string().trim().min(1),
    reportId: z.string().trim().min(1),
  })
  .strict();
export type PaymentSelfClaimSuccessV1 = z.infer<typeof PaymentSelfClaimSuccessV1Schema>;

export const PAYMENT_CLAIM_ERROR_CODES = [
  "PAYMENT_CLAIM_NOT_FOUND",
  "PAYMENT_CLAIM_RATE_LIMITED",
  "PAYMENT_CLAIM_ACCOUNT_REQUIRED",
  "PAYMENT_CLAIM_EMAIL_VERIFICATION_REQUIRED",
  "PAYMENT_CLAIM_INVALID",
] as const;
export type PaymentClaimErrorCode = typeof PAYMENT_CLAIM_ERROR_CODES[number];
