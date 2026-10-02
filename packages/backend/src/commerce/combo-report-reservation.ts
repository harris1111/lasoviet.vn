import { calculateBonusExpiry, resolveEntitlementScopeForSku } from "@lasoviet/contracts";
import { commerceEntitlements, type Database } from "@lasoviet/database";
import { deriveReportTimingLineage, type ReportVersionSelection } from "../reports/identity-report-config.js";
import { reserveNatalReport, reservePaidReport } from "../reports/natal-report-reservation.js";
import { periodReportVersions } from "../reports/period-report-config.js";
import { COMBO_ANNUAL_SKU, COMBO_LIFETIME_SKU } from "./combo-purchase-authority.js";

/** Runs inside the wallet spend continuation. Any failure rolls back both children and the debit. */
export async function reserveComboReports(database: Database, input: {
  spendId: string;
  ownerId: string;
  chartId: string;
  chartVersionId: string;
  evidenceVersionId: string;
  readingContextRevisionId: string | null;
  natalVersions: ReportVersionSelection;
  now: Date;
  traceId: string;
}) {
  if (deriveReportTimingLineage(input.now).targetYear !== 2026) throw new Error("COMBO_YEAR_INVALID");
  const common = {orderId: null, ledgerSpendId: input.spendId, ownerId: input.ownerId, chartId: input.chartId, createdAt: input.now};
  const children = await database.insert(commerceEntitlements).values([
    {...common, sku: COMBO_LIFETIME_SKU, periodKey: "lifetime", scope: resolveEntitlementScopeForSku(COMBO_LIFETIME_SKU, input.natalVersions.family), dailyBonusExpiresAt: calculateBonusExpiry(input.now)},
    {...common, sku: COMBO_ANNUAL_SKU, periodKey: "2026", scope: resolveEntitlementScopeForSku(COMBO_ANNUAL_SKU)},
  ]).returning();
  const lifetime = children.find(child => child.sku === COMBO_LIFETIME_SKU);
  const annual = children.find(child => child.sku === COMBO_ANNUAL_SKU);
  if (children.length !== 2 || !lifetime || !annual) throw new Error("COMBO_ENTITLEMENT_CREATE_FAILED");
  const shared = {chartVersionId: input.chartVersionId, evidenceVersionId: input.evidenceVersionId,
    readingContextRevisionId: input.readingContextRevisionId, now: input.now, traceId: input.traceId};
  const natal = await reserveNatalReport(database, {...shared, entitlement: lifetime, versions: input.natalVersions, locale: "vi"});
  const period = await reservePaidReport(database, {...shared, entitlement: annual, locale: "vi", versions: periodReportVersions()});
  return {lifetime, annual, natal, period};
}
