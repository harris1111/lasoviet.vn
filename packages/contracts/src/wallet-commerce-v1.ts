import { z } from "zod";

const id = z.string().trim().min(1);
const walletHistoryId = z.string().regex(/^wh_[0-9a-f]{32}$/);
const amount = z.number().int().nonnegative();
const positiveAmount = z.number().int().positive();
const timestamp = z.iso.datetime({ offset: true });
const contentPrice = z.union([z.literal(240), z.literal(720), z.literal(960)]);

export const WalletTopUpCatalogV1 = [
  { id: "LA-ENTRY-300", vndAmount: 29000, purchasedLa: 300, promotionalLa: 0 },
  { id: "LA-START-1100", vndAmount: 99000, purchasedLa: 1000, promotionalLa: 100 },
  { id: "LA-DISCOVER-3000", vndAmount: 249000, purchasedLa: 2500, promotionalLa: 500 },
  { id: "LA-LIBRARY-8000", vndAmount: 599000, purchasedLa: 6000, promotionalLa: 2000 },
] as const;

export const WalletTopUpPackIdSchema = z.enum([
  "LA-ENTRY-300",
  "LA-START-1100",
  "LA-DISCOVER-3000",
  "LA-LIBRARY-8000",
]);
export type WalletTopUpPackId = z.infer<typeof WalletTopUpPackIdSchema>;

export const WalletBalanceV1Schema = z.object({
  version: z.literal(1),
  totalLa: amount,
  purchasedLa: amount,
  promotionalLa: amount,
  updatedAt: timestamp,
}).strict().superRefine((value, context) => {
  if (value.totalLa !== value.purchasedLa + value.promotionalLa) {
    context.addIssue({ code: "custom", path: ["totalLa"], message: "totalLa must equal bucket sum" });
  }
});
export type WalletBalanceV1 = z.infer<typeof WalletBalanceV1Schema>;

export const WalletHistoryItemV1Schema = z.object({
  id: walletHistoryId,
  category: z.enum(["grant", "spend", "restoration"]),
  laDelta: z.number().int().refine((value) => value !== 0),
  resultingPurchasedLa: amount,
  resultingPromotionalLa: amount,
  productTitle: z.string().trim().min(1).max(160).nullable(),
  occurredAt: timestamp,
}).strict();
export type WalletHistoryItemV1 = z.infer<typeof WalletHistoryItemV1Schema>;

export const WalletHistoryV1Schema = z.object({
  version: z.literal(1),
  balance: WalletBalanceV1Schema,
  items: z.array(WalletHistoryItemV1Schema),
}).strict();
export type WalletHistoryV1 = z.infer<typeof WalletHistoryV1Schema>;

export const WalletCommandContextV1Schema = z.object({
  actorId: id,
  reasonCode: z.string().trim().min(1).max(80),
  requestId: id,
  traceId: id,
  idempotencyKey: z.string().trim().min(1).max(200),
}).strict();
export type WalletCommandContextV1 = z.infer<typeof WalletCommandContextV1Schema>;

export const WalletGrantV1Schema = WalletCommandContextV1Schema.extend({
  kind: z.literal("grant"),
  purchasedLa: amount,
  promotionalLa: amount,
  topUpPackId: WalletTopUpPackIdSchema.nullable(),
}).strict().superRefine((value, context) => {
  if (value.purchasedLa + value.promotionalLa <= 0) {
    context.addIssue({ code: "custom", message: "grant must add Lá" });
  }
  if (value.topUpPackId !== null) {
    const pack = WalletTopUpCatalogV1.find((candidate) => candidate.id === value.topUpPackId);
    if (value.purchasedLa !== pack!.purchasedLa || value.promotionalLa !== pack!.promotionalLa) {
      context.addIssue({ code: "custom", message: "top-up grant must match its catalog tuple" });
    }
  } else if (value.purchasedLa !== 0) {
    context.addIssue({ code: "custom", path: ["purchasedLa"], message: "unlinked grant must be promotional-only" });
  }
});
export type WalletGrantV1 = z.infer<typeof WalletGrantV1Schema>;

export const WalletSpendV1Schema = WalletCommandContextV1Schema.extend({
  kind: z.literal("spend"),
  purchaseIntentId: id,
  amountLa: positiveAmount,
  expectedWalletVersion: z.number().int().positive(),
}).strict();
export type WalletSpendV1 = z.infer<typeof WalletSpendV1Schema>;

export const WalletRestorationV1Schema = WalletCommandContextV1Schema.extend({
  kind: z.literal("restoration"),
  originalSpendId: id,
  expectedWalletVersion: z.number().int().positive(),
}).strict();
export type WalletRestorationV1 = z.infer<typeof WalletRestorationV1Schema>;

export const WalletTransactionReceiptV1Schema = z.object({
  version: z.literal(1),
  commandId: id,
  transactionId: id,
  status: z.enum(["completed", "replayed"]),
  balance: WalletBalanceV1Schema,
  completedAt: timestamp,
}).strict();
export type WalletTransactionReceiptV1 = z.infer<typeof WalletTransactionReceiptV1Schema>;

export const WalletPurchaseIntentV1Schema = z.discriminatedUnion("sku", [
  z.object({
    id: id,
    sku: z.literal("ZIWEI-NATAL-EXCERPT-P0"),
    chartVersionId: id,
    locale: z.literal("vi"),
    amountLa: z.literal(240),
    status: z.enum(["pending", "completed", "cancelled", "expired"]),
    stateVersion: z.number().int().positive(),
    createdAt: timestamp,
  }).strict(),
  z.object({
    id: id,
    sku: z.literal("ZIWEI-IDENTITY-P0"),
    chartVersionId: id,
    locale: z.enum(["vi", "en"]),
    amountLa: z.union([z.literal(720), z.literal(960)]),
    status: z.enum(["pending", "completed", "cancelled", "expired"]),
    stateVersion: z.number().int().positive(),
    createdAt: timestamp,
  }).strict(),
]);
export type WalletPurchaseIntentV1 = z.infer<typeof WalletPurchaseIntentV1Schema>;

export const WalletContentPriceV1Schema = z.object({
  sku: z.enum(["ZIWEI-IDENTITY-P0", "ZIWEI-NATAL-EXCERPT-P0"]),
  amountLa: contentPrice,
}).strict().superRefine((value, context) => {
  if (value.sku === "ZIWEI-NATAL-EXCERPT-P0" && value.amountLa !== 240) {
    context.addIssue({ code: "custom", path: ["amountLa"], message: "excerpt price must be 240 Lá" });
  }
  if (value.sku === "ZIWEI-IDENTITY-P0" && value.amountLa !== 720 && value.amountLa !== 960) {
    context.addIssue({ code: "custom", path: ["amountLa"], message: "identity price must be 720 or 960 Lá" });
  }
});
export type WalletContentPriceV1 = z.infer<typeof WalletContentPriceV1Schema>;

export const WalletCreditLotV1Schema = z.object({
  id: id,
  bucket: z.enum(["purchased", "promotional"]),
  grantedLa: positiveAmount,
  remainingLa: amount,
  grantedAt: timestamp,
  expiresAt: z.null(),
}).strict().superRefine((value, context) => {
  if (value.remainingLa > value.grantedLa) {
    context.addIssue({ code: "custom", path: ["remainingLa"], message: "remainingLa exceeds grantedLa" });
  }
});
export type WalletCreditLotV1 = z.infer<typeof WalletCreditLotV1Schema>;

export const WalletSpendAllocationV1Schema = z.object({
  creditLotId: id,
  bucket: z.enum(["purchased", "promotional"]),
  amountLa: positiveAmount,
  purchasedLa: amount,
  recognizedVnd: amount,
}).strict().superRefine((value, context) => {
  if (value.bucket === "promotional" && (value.purchasedLa !== 0 || value.recognizedVnd !== 0)) {
    context.addIssue({ code: "custom", message: "promotional allocation has no revenue" });
  }
  if (value.bucket === "purchased" && value.purchasedLa !== value.amountLa) {
    context.addIssue({ code: "custom", message: "purchased allocation must match amount" });
  }
});
export type WalletSpendAllocationV1 = z.infer<typeof WalletSpendAllocationV1Schema>;
