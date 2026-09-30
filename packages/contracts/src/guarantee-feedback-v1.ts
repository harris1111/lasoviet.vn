import { z } from "zod";
import {
  WalletBalanceV1Schema,
  WalletTransactionReceiptV1Schema,
} from "./wallet-commerce-v1.js";

const id = z.string().trim().min(1).max(128);
const timestamp = z.string().datetime();

export const PartFeedbackRatingSchema = z.enum([
  "accurate",
  "partially_accurate",
  "inaccurate",
]);
export type PartFeedbackRating = z.infer<typeof PartFeedbackRatingSchema>;

export const PartFeedbackCreateV1Schema = z
  .object({
    chartId: id,
    partId: z.string().trim().min(1).max(100),
    reportId: id.nullable().optional(),
    rating: PartFeedbackRatingSchema,
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
export type PartFeedbackCreateV1 = z.infer<typeof PartFeedbackCreateV1Schema>;

export const PartFeedbackV1Schema = z
  .object({
    id: id,
    chartId: id,
    partId: z.string().trim().min(1).max(100),
    reportId: id.nullable(),
    rating: PartFeedbackRatingSchema,
    comment: z.string().nullable(),
    createdAt: timestamp,
  })
  .strict();
export type PartFeedbackV1 = z.infer<typeof PartFeedbackV1Schema>;

export const RelatedPalaceSuggestionV1Schema = z
  .object({
    palaceId: z.string().trim().min(1).max(64),
    palaceName: z.string().trim().min(1).max(100),
    relationType: z.enum(["opposite", "trine", "complementary", "related"]),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export type RelatedPalaceSuggestionV1 = z.infer<
  typeof RelatedPalaceSuggestionV1Schema
>;

export const PartFeedbackResultV1Schema = z
  .object({
    feedback: PartFeedbackV1Schema,
    relatedPalaceSuggestion: RelatedPalaceSuggestionV1Schema.nullable().optional(),
  })
  .strict();
export type PartFeedbackResultV1 = z.infer<typeof PartFeedbackResultV1Schema>;

export const GuaranteeClaimRequestV1Schema = z
  .object({
    chartId: id,
    partId: z.string().trim().min(1).max(100),
    reportId: id.nullable().optional(),
    rating: z.literal("inaccurate"),
    comment: z.string().trim().max(500).nullable().optional(),
    idempotencyKey: z.string().trim().min(1).max(200),
  })
  .strict();
export type GuaranteeClaimRequestV1 = z.infer<
  typeof GuaranteeClaimRequestV1Schema
>;

export const GuaranteeClaimResultV1Schema = z
  .object({
    claimId: id,
    claimNumber: z.string().trim().min(1).max(64),
    status: z.literal("approved"),
    amountLaRestored: z.number().int().positive(),
    partId: z.string().trim().min(1).max(100),
    sku: z.string().trim().min(1).max(64),
    balance: WalletBalanceV1Schema,
    receipt: WalletTransactionReceiptV1Schema,
    relatedPalaceSuggestion: RelatedPalaceSuggestionV1Schema,
    createdAt: timestamp,
  })
  .strict();
export type GuaranteeClaimResultV1 = z.infer<
  typeof GuaranteeClaimResultV1Schema
>;

export const GuaranteeErrorCodeSchema = z.enum([
  "GUARANTEE_ACCOUNT_REQUIRED",
  "GUARANTEE_ACCOUNT_INELIGIBLE",
  "GUARANTEE_ALREADY_CLAIMED",
  "GUARANTEE_PRICE_EXCEEDS_LIMIT",
  "GUARANTEE_RATING_INELIGIBLE",
  "GUARANTEE_WINDOW_EXPIRED",
  "GUARANTEE_ENTITLEMENT_NOT_FOUND",
  "GUARANTEE_NOT_OWNER",
  "GUARANTEE_ALREADY_RESTORED",
  "GUARANTEE_IDEMPOTENCY_CONFLICT",
  "GUARANTEE_INVALID_REQUEST",
]);
export type GuaranteeErrorCode = z.infer<typeof GuaranteeErrorCodeSchema>;
