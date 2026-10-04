import { z } from "zod";
import { LaSkuSchema, findLaProduct, isQualifyingRolloverSku } from "./la-catalog.js";
import { WalletBalanceV1Schema } from "./wallet-commerce-v1.js";

const id = z.string().trim().min(1).max(200);
const amount = z.number().int().nonnegative();

export const WalletUnlockRequestV1Schema = z.object({
  purchaseIntentId: id,
  expectedIntentVersion: z.number().int().positive(),
  expectedWalletVersion: z.number().int().positive(),
  idempotencyKey: id,
}).strict();

export const WalletUpgradePurchaseV1Schema = z.object({
  version: z.literal(1),
  eventKey: z.string().regex(/^upg_[0-9a-f]{32}$/),
  occurredAt: z.iso.datetime({ offset: true }),
  targetSku: z.literal("ZIWEI-IDENTITY-P0"),
  sourceSku: LaSkuSchema,
  sourceSkus: z.array(LaSkuSchema).min(1).max(13),
  chargedLa: amount.max(959),
  creditLa: z.number().int().positive().max(960),
  currency: z.literal("LA"),
}).strict().superRefine((value, context) => {
  if (value.chargedLa + value.creditLa !== 960 ||
      new Set(value.sourceSkus).size !== value.sourceSkus.length ||
      !value.sourceSkus.includes(value.sourceSku) ||
      value.sourceSkus.some(sku => !isQualifyingRolloverSku(sku))) {
    context.addIssue({ code: "custom", message: "Upgrade requires exact credit and distinct qualifying sources" });
  }
});
export type WalletUpgradePurchaseV1 = z.infer<typeof WalletUpgradePurchaseV1Schema>;

export const WalletUnlockResultV1Schema = z.object({
  intent: z.object({
    id,
    sku: LaSkuSchema,
    productTitle: z.string().trim().min(1).max(160),
    locale: z.enum(["vi", "en"]),
    amountLa: amount,
    status: z.literal("completed"),
    stateVersion: z.number().int().positive(),
    createdAt: z.iso.datetime({ offset: true }),
  }).strict().superRefine((intent, context) => {
    const product = findLaProduct(intent.sku);
    const validPrice = intent.sku === "ZIWEI-IDENTITY-P0" ? intent.amountLa <= 960 :
      intent.sku === "ZIWEI-MONTHLY-P0" && intent.amountLa === 0 ||
      !!product && (intent.amountLa === product.priceLa || intent.amountLa === Math.ceil(product.priceLa * 0.8));
    if (!validPrice) context.addIssue({code: "custom", message: "Unlock price must match its catalog terms"});
  }),
  balance: WalletBalanceV1Schema,
  reportId: id.nullable(),
  // Older API instances may omit this field during a rolling deployment.
  upgradePurchase: WalletUpgradePurchaseV1Schema.nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.upgradePurchase && (value.intent.sku !== value.upgradePurchase.targetSku ||
      value.intent.amountLa !== value.upgradePurchase.chargedLa || value.reportId === null)) {
    context.addIssue({ code: "custom", message: "Upgrade must match the completed unlock" });
  }
});
