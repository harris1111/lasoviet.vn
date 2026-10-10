import { LaSkuSchema, isQualifyingRolloverSku, SINGLE_PALACE_SKUS, ROLLOVER_WINDOW_MS, z } from "@lasoviet/contracts";
import type { walletPurchaseIntents } from "@lasoviet/database";

export const creditProofSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  creditLa: z.number().int().positive().max(1200),
  sources: z.array(z.object({
    spendId: z.string().uuid(),
    sku: LaSkuSchema.refine(isQualifyingRolloverSku),
    amountLa: z.number().int().positive(),
    creditedLa: z.number().int().positive(),
    spentAt: z.iso.datetime({ offset: true }),
  }).strict()).min(1).max(13),
}).strict().superRefine((proof, context) => {
  if (new Set(proof.sources.map(source => source.spendId)).size !== proof.sources.length ||
      proof.sources.some(source => source.creditedLa > source.amountLa) ||
      proof.sources.reduce((sum, source) => sum + source.creditedLa, 0) !== proof.creditLa ||
      Math.min(proof.version === 1 ? 960 : 1200, proof.sources.reduce((sum, source) => sum + source.amountLa, 0)) !== proof.creditLa) {
    context.addIssue({ code: "custom", message: "Credit proof must match unique original spend allocations" });
  }
});
export type CreditProof = z.infer<typeof creditProofSchema>;

// Historical policy is intentionally independent of the mutable sale catalog.
const historicalBasePrices: Readonly<Record<string, number>> = {
  "ZIWEI-IDENTITY-P0": 960, "ZIWEI-NATAL-EXCERPT-P0": 240,
  "ZIWEI-RELATIONSHIP-P0": 480, "ZIWEI-CAREER-P0": 480,
  "ZIWEI-TODAY-P0": 60, "ZIWEI-MONTHLY-P0": 300,
  "ZIWEI-YEAR-P0": 480, "ZIWEI-YEAR-2026-P0": 480,
  "ZIWEI-COMBO-P0": 1300, "ZIWEI-COMBO-2026-P0": 1300,
  "MEMBERSHIP-MONTHLY-P0": 1500, "MEMBERSHIP-MONTHLY-1500": 1500,
  "MEMBERSHIP-YEARLY-P0": 8000, "MEMBERSHIP-YEARLY-8000": 8000,
  ...Object.fromEntries(SINGLE_PALACE_SKUS.map(sku => [sku, 120])),
};
export type PurchaseCommercialPolicy = "pre-fd119" | "fd119";
const postFd119BasePrices: Readonly<Record<string, number>> = {...historicalBasePrices, "ZIWEI-IDENTITY-P0": 1200};

function guaranteeFor(policy: PurchaseCommercialPolicy, chargedLa: number): "none" | "full" | "half" {
  return chargedLa === 0 ? "none" : chargedLa < 500 ? "full" : policy === "fd119" ? "half" : "none";
}

const CommercialTermsSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]), policy: z.enum(["pre-fd119", "fd119"]),
  ownerId: z.string().min(1), chartId: z.string().min(1), chartVersionId: z.string().min(1),
  sku: z.string().min(1), locale: z.enum(["vi", "en"]), periodKey: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  basePriceLa: z.number().int().positive(), chargedLa: z.number().int().nonnegative(),
  creditLa: z.number().int().nonnegative(), discountLa: z.number().int().nonnegative(),
  guarantee: z.enum(["full", "none", "half"]),
  discountBasis: z.enum(["none", "membership", "rollover", "monthly_grant", "legacy_unknown"]),
  creditExpiresAt: z.iso.datetime({ offset: true }).optional(),
  creditProof: creditProofSchema.optional(),
}).strict().superRefine((terms, context) => {
  const expected = (terms.policy === "pre-fd119" ? historicalBasePrices : postFd119BasePrices)[terms.sku];
  const invalid = terms.version !== (terms.policy === "pre-fd119" ? 1 : 2) || expected === undefined || terms.basePriceLa !== expected ||
    terms.basePriceLa !== terms.chargedLa + terms.creditLa + terms.discountLa ||
    terms.guarantee !== guaranteeFor(terms.policy, terms.chargedLa) ||
    (terms.guarantee === "half" && terms.chargedLa % 2 !== 0) ||
    (terms.creditLa > 0
      ? terms.sku !== "ZIWEI-IDENTITY-P0" || terms.discountLa !== 0 ||
        terms.creditProof?.creditLa !== terms.creditLa || terms.creditProof?.version !== (terms.policy === "pre-fd119" ? 1 : 2) || !terms.creditExpiresAt ||
        Date.parse(terms.creditExpiresAt) <= Date.parse(terms.createdAt)
      : terms.creditProof !== undefined || terms.creditExpiresAt !== undefined) ||
    (terms.creditProof !== undefined && (terms.creditProof.sources.some(source => Date.parse(source.spentAt) > Date.parse(terms.createdAt)) ||
      Math.min(...terms.creditProof.sources.map(source => Date.parse(source.spentAt))) + ROLLOVER_WINDOW_MS !== Date.parse(terms.creditExpiresAt!))) ||
    (terms.sku === "ZIWEI-TODAY-P0" && terms.chargedLa !== 60) ||
    (terms.sku.startsWith("MEMBERSHIP-") && terms.chargedLa !== expected) ||
    (terms.sku !== "ZIWEI-IDENTITY-P0" && terms.sku !== "ZIWEI-MONTHLY-P0" &&
      terms.chargedLa !== expected && terms.chargedLa !== Math.ceil(expected! * 0.8)) ||
    (terms.sku === "ZIWEI-MONTHLY-P0" && ![0, 240, 300].includes(terms.chargedLa));
  if (invalid) context.addIssue({ code: "custom", message: "Commercial terms do not match frozen policy" });
});
export type PurchaseCommercialTerms = z.infer<typeof CommercialTermsSchema>;
type IntentTerms = Pick<typeof walletPurchaseIntents.$inferSelect,
  "ownerId" | "chartId" | "chartVersionId" | "sku" | "locale" | "periodKey" | "priceLa" | "createdAt" | "commercialTerms">;

/** Null is historical authority, never an invitation to reprice from today's catalog. */
export function readPurchaseCommercialTerms(intent: IntentTerms): PurchaseCommercialTerms | null {
  if (intent.commercialTerms === null) {
    const basePriceLa = historicalBasePrices[intent.sku];
    if (basePriceLa === undefined) return null;
    return parseBoundTerms(intent, { ...binding(intent), version: 1, policy: "pre-fd119",
      basePriceLa, chargedLa: intent.priceLa, creditLa: 0, discountLa: basePriceLa - intent.priceLa,
      guarantee: intent.priceLa > 0 && intent.priceLa < 500 ? "full" : "none", discountBasis: "legacy_unknown" });
  }
  return parseBoundTerms(intent, intent.commercialTerms);
}
function binding(intent: Omit<IntentTerms, "commercialTerms">) {
  return { ownerId: intent.ownerId, chartId: intent.chartId, chartVersionId: intent.chartVersionId,
    sku: intent.sku, locale: intent.locale, periodKey: intent.periodKey, createdAt: intent.createdAt.toISOString() };
}
function parseBoundTerms(intent: IntentTerms, value: unknown): PurchaseCommercialTerms | null {
  const parsed = CommercialTermsSchema.safeParse(value);
  if (!parsed.success || parsed.data.chargedLa !== intent.priceLa) return null;
  if (intent.commercialTerms !== null) {
    const expectedBasis = parsed.data.creditLa > 0 ? "rollover" :
      intent.sku === "ZIWEI-MONTHLY-P0" && intent.priceLa === 0 ? "monthly_grant" :
      parsed.data.discountLa > 0 ? "membership" : "none";
    if (parsed.data.discountBasis !== expectedBasis ||
      (expectedBasis === "membership" && intent.priceLa !== Math.ceil(parsed.data.basePriceLa * 0.8))) return null;
  }
  const expected = binding(intent);
  if (Object.entries(expected).some(([key, field]) => parsed.data[key as keyof typeof expected] !== field)) return null;
  return parsed.data;
}

/** Private server factory; clients cannot submit commercial policy or refund authority. */
export function freezePurchaseCommercialTerms(intent: Omit<IntentTerms, "commercialTerms">, quote?: {
  creditLa?: number; creditExpiresAt?: string; creditProof?: CreditProof;
}, policy: PurchaseCommercialPolicy = "fd119"): Record<string, unknown> {
  const basePriceLa = (policy === "pre-fd119" ? historicalBasePrices : postFd119BasePrices)[intent.sku];
  const creditLa = quote?.creditLa ?? 0;
  return CommercialTermsSchema.parse({ ...binding(intent), version: policy === "pre-fd119" ? 1 : 2, policy,
    basePriceLa, chargedLa: intent.priceLa, creditLa, discountLa: basePriceLa! - intent.priceLa - creditLa,
    guarantee: guaranteeFor(policy, intent.priceLa),
    discountBasis: creditLa > 0 ? "rollover" : intent.sku === "ZIWEI-MONTHLY-P0" && intent.priceLa === 0
      ? "monthly_grant" : intent.priceLa < basePriceLa! ? "membership" : "none",
    ...(creditLa > 0 ? { creditExpiresAt: quote?.creditExpiresAt, creditProof: quote?.creditProof } : {}),
  });
}

/** New snapshots bind original benefit attribution; legacy receipts keep their old codec. */
export function matchesPurchaseCreditProof(intent: IntentTerms, proof: CreditProof | undefined): boolean {
  const terms = readPurchaseCommercialTerms(intent);
  return terms !== null && (intent.commercialTerms === null || JSON.stringify(terms.creditProof) === JSON.stringify(proof));
}
