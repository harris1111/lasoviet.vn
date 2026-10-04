import { z } from "zod";
import { LaSkuSchema, isQualifyingRolloverSku } from "./la-catalog.js";

export const WalletQuoteRequestV1Schema = z.object({
  chartId: z.string().trim().min(1).max(200),
  chartVersionId: z.string().trim().min(1).max(200),
  locale: z.enum(["vi", "en"]),
}).strict();

const amount = z.number().int().nonnegative();
export const WalletQuoteV1Schema = z.object({
  sku: LaSkuSchema,
  state: z.enum(["available", "owned", "coming_soon", "unavailable"]),
  basePriceLa: amount,
  priceLa: amount.nullable(),
  creditLa: amount,
  discountLa: amount,
  creditExpiresAt: z.string().datetime({ offset: true }).nullable(),
  creditSourceSkus: z.array(LaSkuSchema).max(16),
  reportId: z.string().min(1).nullable(),
  reportState: z.enum(["ready", "processing", "unavailable"]).nullable(),
}).strict().superRefine((quote, context) => {
  if (new Set(quote.creditSourceSkus).size !== quote.creditSourceSkus.length || quote.creditSourceSkus.some(sku => !isQualifyingRolloverSku(sku))) {
    context.addIssue({ code: "custom", message: "Credit sources must be distinct qualifying products" });
  }
  if ((quote.creditLa === 0 && (quote.creditExpiresAt !== null || quote.creditSourceSkus.length > 0)) ||
      (quote.creditLa > 0 && (quote.creditExpiresAt === null || quote.creditSourceSkus.length === 0))) {
    context.addIssue({ code: "custom", message: "Credit requires authoritative source and expiry" });
  }
  if (quote.state === "owned" && (quote.reportState === null ||
      (quote.reportId === null && quote.reportState !== "unavailable"))) {
    context.addIssue({ code: "custom", message: "Owned quote has inconsistent report state" });
  }
  if (quote.state === "available") {
    if (quote.priceLa === null || quote.priceLa + quote.creditLa + quote.discountLa !== quote.basePriceLa || quote.reportId !== null || quote.reportState !== null) {
      context.addIssue({ code: "custom", message: "Available quote has inconsistent terms" });
    }
  } else if (quote.priceLa !== null || quote.creditLa !== 0 || quote.discountLa !== 0 || (quote.state !== "owned" && (quote.reportId !== null || quote.reportState !== null))) {
    context.addIssue({ code: "custom", message: "Non-purchasable quote cannot carry purchase terms" });
  }
});

export const WalletQuotesV1Schema = WalletQuoteRequestV1Schema.extend({
  version: z.literal(1),
  quotedAt: z.string().datetime({ offset: true }),
  quotes: z.array(WalletQuoteV1Schema).max(64),
}).strict().superRefine((value, context) => {
  if (new Set(value.quotes.map((quote) => quote.sku)).size !== value.quotes.length) {
    context.addIssue({ code: "custom", message: "Duplicate quote SKU" });
  }
});

export type WalletQuoteRequestV1 = z.infer<typeof WalletQuoteRequestV1Schema>;
export type WalletQuoteV1 = z.infer<typeof WalletQuoteV1Schema>;
export type WalletQuotesV1 = z.infer<typeof WalletQuotesV1Schema>;
