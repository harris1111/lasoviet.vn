import { isPeriodReportTuple } from "../reports/period-report-config.js";
import { SINGLE_PALACE_SKUS } from "@lasoviet/contracts";
import { and, eq, inArray } from "drizzle-orm";
import { commerceEntitlements, evidenceSets, reportReservations, walletPurchaseIntents, type Database } from "@lasoviet/database";
import { reportReservationAuthority } from "../reports/natal-report-authority.js";

export const COMBO_SKU = "ZIWEI-COMBO-2026-P0";
export const COMBO_LIFETIME_SKU = "ZIWEI-IDENTITY-P0";
export const COMBO_ANNUAL_SKU = "ZIWEI-YEAR-2026-P0";
export function isComboSku(sku: string): boolean { return sku === COMBO_SKU || sku === "ZIWEI-COMBO-P0"; }
export function comboAnnualSku(sku: string): string { return sku === COMBO_SKU ? COMBO_ANNUAL_SKU : "ZIWEI-YEAR-P0"; }
export function comboComponentSkus(sku: string): string[] { return [COMBO_LIFETIME_SKU, comboAnnualSku(sku)]; }
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
  if (!isComboSku(intent.sku) || intent.status !== "completed" || !intent.completedAt ||
      intent.locale !== "vi" || !/^(?:19\d{2}|20\d{2}|2100)$/.test(intent.periodKey) || (intent.sku === COMBO_SKU && intent.periodKey !== "2026") || !isSupportedComboPrice(intent.priceLa) ||
      entitlement.ownerId !== intent.ownerId || entitlement.chartId !== intent.chartId ||
      !entitlement.ledgerSpendId || entitlement.orderId !== null) return false;
  const children = await database.select().from(commerceEntitlements)
    .where(eq(commerceEntitlements.ledgerSpendId, entitlement.ledgerSpendId));
  if (children.length !== 2 || !children.some(child => child.id === entitlement.id) ||
      new Set(children.map(child => child.sku)).size !== 2 || children.some(child =>
        !comboComponentSkus(intent.sku).includes(child.sku) ||
        child.ownerId !== intent.ownerId || child.chartId !== intent.chartId || child.orderId !== null || child.revokedAt !== null ||
        child.periodKey !== (child.sku === comboAnnualSku(intent.sku) ? intent.periodKey : "lifetime"))) return false;
  for (const child of children) {
    const linked = await database.select({reservation: reportReservations})
      .from(commerceEntitlements).innerJoin(reportReservations, reportReservationAuthority(database))
      .innerJoin(evidenceSets, and(eq(evidenceSets.id, reportReservations.evidenceVersionId), eq(evidenceSets.chartVersionId, intent.chartVersionId), eq(evidenceSets.capabilityId, "ziwei.identity.p0")))
      .where(and(eq(commerceEntitlements.id, child.id), eq(reportReservations.chartVersionId, intent.chartVersionId),
        eq(reportReservations.locale, "vi"), child.sku === comboAnnualSku(intent.sku) ? eq(reportReservations.sku, comboAnnualSku(intent.sku)) : inArray(reportReservations.sku, [COMBO_LIFETIME_SKU, "ZIWEI-NATAL-EXCERPT-P0", ...SINGLE_PALACE_SKUS])));
    if (linked.length !== 1) return false;
    if (child.sku === comboAnnualSku(intent.sku)) {
      const annual = linked[0]!.reservation;
      if (!isPeriodReportTuple(annual) || String(annual.targetYear) !== intent.periodKey || annual.asOfDate === null ||
          JSON.stringify(child.scope) !== JSON.stringify({sections: ["periodReading"]})) return false;
    }
  }
  return true;
}
