import { describe, expect, it } from "vitest";

import { AccountLibraryItemV2Schema, ReportFailedWalletSpendViewV2Schema } from "./commerce-report-v2.js";

describe("commerce report V2 contracts", () => {
  it("distinguishes order-backed and ledger-backed library records without payment internals", () => {
    const item = {
      source: "ledger_spend", id: "item", entitlementId: "entitlement", orderId: null,
      profileId: null, profileDisplayName: null, productTitle: "Reading", entitlementStatus: "active", reportId: null, readUrl: null,
      reportStatus: null, locale: "vi", createdAt: "2026-09-17T00:00:00.000Z", purchasedAt: null,
    };
    expect(AccountLibraryItemV2Schema.safeParse(item).success).toBe(true);
    expect(AccountLibraryItemV2Schema.safeParse({ ...item, ledgerId: "secret" }).success).toBe(false);
    expect(AccountLibraryItemV2Schema.safeParse({ ...item, sku: "ZIWEI-IDENTITY-P0" }).success).toBe(false);
    expect(AccountLibraryItemV2Schema.safeParse({ ...item, chartId: "chart" }).success).toBe(false);
    const terminalFailure = {
      version: 2, purchaseSource: "wallet_spend", reportId: "report", reportVersionId: "version",
      errorCode: "REPORT_GENERATION_FAILED", supportReference: "support",
    };
    expect(ReportFailedWalletSpendViewV2Schema.safeParse(terminalFailure).success).toBe(true);
    expect(ReportFailedWalletSpendViewV2Schema.safeParse({
      ...terminalFailure,
      errorCode: "REPORT_FAILED",
    }).success).toBe(false);
    expect(ReportFailedWalletSpendViewV2Schema.safeParse({
      ...terminalFailure,
      errorCode: "provider_internal_detail",
    }).success).toBe(false);
  });
});
