import { SINGLE_PALACE_SKUS } from "@lasoviet/contracts";
import { and, eq, inArray } from "drizzle-orm";
import { commerceEntitlements, reportReservations, walletPurchaseIntents, type Database } from "@lasoviet/database";
import { reportReservationAuthority } from "../reports/natal-report-authority.js";

export const COMBO_SKU = "ZIWEI-COMBO-2026-P0";
export const COMBO_LIFETIME_SKU = "ZIWEI-IDENTITY-P0";
export const COMBO_ANNUAL_SKU = "ZIWEI-YEAR-2026-P0";
export const COMBO_COMPONENT_SKUS = [COMBO_LIFETIME_SKU, COMBO_ANNUAL_SKU] as const;

export function isSupportedComboPrice(priceLa: number): boolean {
  return priceLa === 1300 || priceLa === 1040;
}

/** Only the closed two-child bundle may differ from its originating intent SKU. */
export async function hasCompleteComboAuthority(database: Database, input: {
  intent: typeof walletPurchaseIntents.$inferSelect;
  entitlement: typeof commerceEntitlements.$inferSelect;
}): Promise<boolean> {
  const {intent, entitlement} = input;
  if (intent.sku !== COMBO_SKU || intent.status !== "completed" || !intent.completedAt ||
      intent.locale !== "vi" || intent.periodKey !== "2026" || !isSupportedComboPrice(intent.priceLa) ||
      entitlement.ownerId !== intent.ownerId || entitlement.chartId !== intent.chartId ||
      !entitlement.ledgerSpendId || entitlement.orderId !== null) return false;
  const children = await database.select().from(commerceEntitlements)
    .where(eq(commerceEntitlements.ledgerSpendId, entitlement.ledgerSpendId));
  if (children.length !== 2 || !children.some(child => child.id === entitlement.id) ||
      new Set(children.map(child => child.sku)).size !== 2 || children.some(child =>
        !COMBO_COMPONENT_SKUS.includes(child.sku as typeof COMBO_COMPONENT_SKUS[number]) ||
        child.ownerId !== intent.ownerId || child.chartId !== intent.chartId || child.orderId !== null || child.revokedAt !== null ||
        child.periodKey !== (child.sku === COMBO_ANNUAL_SKU ? "2026" : "lifetime"))) return false;
  for (const child of children) {
    const linked = await database.select({id: reportReservations.id})
      .from(commerceEntitlements).innerJoin(reportReservations, reportReservationAuthority(database))
      .where(and(eq(commerceEntitlements.id, child.id), eq(reportReservations.chartVersionId, intent.chartVersionId),
        eq(reportReservations.locale, "vi"), child.sku === COMBO_ANNUAL_SKU ? eq(reportReservations.sku, COMBO_ANNUAL_SKU) : inArray(reportReservations.sku, [COMBO_LIFETIME_SKU, "ZIWEI-NATAL-EXCERPT-P0", ...SINGLE_PALACE_SKUS])));
    if (linked.length !== 1) return false;
  }
  return true;
}
