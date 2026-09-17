import { z } from "zod";
import { CommerceSkuSchema, EntitlementStatusSchema } from "./commerce.js";

const id = z.string().trim().min(1);
const timestamp = z.iso.datetime({ offset: true });

export const AccountLibraryItemV2Schema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("order"),
    id,
    entitlementId: id,
    orderId: id,
    chartId: id,
    profileId: id.nullable(),
    profileDisplayName: z.string().trim().min(1).max(80).nullable(),
    sku: CommerceSkuSchema,
    productTitle: z.string().trim().min(1),
    entitlementStatus: EntitlementStatusSchema,
    reportId: id.nullable(),
    readUrl: z.string().trim().min(1).nullable(),
    reportStatus: z.string().trim().min(1).nullable(),
    locale: z.enum(["vi", "en"]),
    createdAt: timestamp,
    purchasedAt: timestamp.nullable(),
  }).strict(),
  z.object({
    source: z.literal("ledger_spend"),
    id,
    entitlementId: id,
    orderId: z.null(),
    chartId: id,
    profileId: id.nullable(),
    profileDisplayName: z.string().trim().min(1).max(80).nullable(),
    sku: CommerceSkuSchema,
    productTitle: z.string().trim().min(1),
    entitlementStatus: EntitlementStatusSchema,
    reportId: id.nullable(),
    readUrl: z.string().trim().min(1).nullable(),
    reportStatus: z.string().trim().min(1).nullable(),
    locale: z.enum(["vi", "en"]),
    createdAt: timestamp,
    purchasedAt: timestamp.nullable(),
  }).strict(),
]);
export type AccountLibraryItemV2 = z.infer<typeof AccountLibraryItemV2Schema>;

export const AccountLibraryV2Schema = z.object({
  version: z.literal(2),
  items: z.array(AccountLibraryItemV2Schema),
  totalCount: z.number().int().nonnegative(),
}).strict();
export type AccountLibraryV2 = z.infer<typeof AccountLibraryV2Schema>;

export const ReportFailedWalletSpendViewV2Schema = z.object({
  version: z.literal(2),
  purchaseSource: z.literal("wallet_spend"),
  reportId: id,
  reportVersionId: id,
  errorCode: z.string().trim().min(1).max(120),
  supportReference: z.string().trim().min(1).max(120),
}).strict();
export type ReportFailedWalletSpendViewV2 = z.infer<typeof ReportFailedWalletSpendViewV2Schema>;
