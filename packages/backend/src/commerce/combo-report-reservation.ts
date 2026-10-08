import { calculateBonusExpiry, resolveEntitlementScopeForSku } from "@lasoviet/contracts";
import { commerceEntitlements, type Database } from "@lasoviet/database";
import { type ReportVersionSelection } from "../reports/identity-report-config.js";
import { reserveNatalReport, reservePaidReport } from "../reports/natal-report-reservation.js";
import { annualPurchaseYear, periodReportVersions } from "../reports/period-report-config.js";
import { comboAnnualSku, COMBO_LIFETIME_SKU } from "./combo-purchase-authority.js";

/** Runs inside the wallet spend continuation. Any failure rolls back both children and the debit. */
export async function reserveComboReports(database: Database, input: {
  spendId: string;
  comboSku?: string;
  targetYear?: number;
  ownerId: string;
  chartId: string;
  chartVersionId: string;
  evidenceVersionId: string;
  readingContextRevisionId: string | null;
  natalVersions: ReportVersionSelection;
  now: Date;
  traceId: string;
}) {
  const comboSku = input.comboSku ?? "ZIWEI-COMBO-2026-P0";
  const targetYear = annualPurchaseYear(comboSku, input.now, input.targetYear);
  if (targetYear === null) throw new Error("COMBO_YEAR_INVALID");
  const annualSku = comboAnnualSku(comboSku);
  const common = {orderId: null, ledgerSpendId: input.spendId, ownerId: input.ownerId, chartId: input.chartId, createdAt: input.now};
  const children = await database.insert(commerceEntitlements).values([
    {...common, sku: COMBO_LIFETIME_SKU, periodKey: "lifetime", scope: resolveEntitlementScopeForSku(COMBO_LIFETIME_SKU, input.natalVersions.family), dailyBonusExpiresAt: calculateBonusExpiry(input.now)},
    {...common, sku: annualSku, periodKey: String(targetYear), scope: resolveEntitlementScopeForSku(annualSku)},
  ]).returning();
  const lifetime = children.find(child => child.sku === COMBO_LIFETIME_SKU);
  const annual = children.find(child => child.sku === annualSku);
  if (children.length !== 2 || !lifetime || !annual) throw new Error("COMBO_ENTITLEMENT_CREATE_FAILED");
  const shared = {chartVersionId: input.chartVersionId, evidenceVersionId: input.evidenceVersionId,
    readingContextRevisionId: input.readingContextRevisionId, now: input.now, traceId: input.traceId};
  const natal = await reserveNatalReport(database, {...shared, entitlement: lifetime, versions: input.natalVersions, locale: "vi"});
  const period = await reservePaidReport(database, {...shared, entitlement: annual, locale: "vi", versions: periodReportVersions()});
  return {lifetime, annual, natal, period};
}
