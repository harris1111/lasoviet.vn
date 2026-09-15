import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  auditLogs,
  commerceEntitlements,
  commerceOrders,
  commercePaymentEvents,
  commerceUnmatchedPayments,
  createDatabase,
  reportReservations,
  reportVersions,
  runMigrations,
  type Database,
} from "@lasoviet/database";
import { TIER_1_ENTITLEMENT_SCOPE } from "@lasoviet/contracts";

import { createDatabaseAdminBusinessMetricsRepository } from "./business-metrics.repository.js";

describe("AdminBusinessMetricsRepository integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_metrics_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    database = createDatabase(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  function testPaymentCode(seq: number): string {
    const code = seq.toString(32).toUpperCase().padStart(9, "0");
    return `LSV${code.slice(0, 9)}`;
  }

  const validContentHash = "a".repeat(64);

  it("proves upgrade correctness, disabled-autopay exclusion, lineage-matching reportsReady, and null qrExpiry/reportFailures", async () => {
    const repository = createDatabaseAdminBusinessMetricsRepository(database);

    // Captured test clock: 2026-09-14 10:00:00 UTC (17:00:00 Asia/Ho_Chi_Minh)
    const testNow = new Date("2026-09-14T10:00:00.000Z");

    const day11PaidAt = new Date("2026-09-11T03:00:00.000Z"); // 10:00 in VN
    const day12PaidAt = new Date("2026-09-12T03:00:00.000Z");
    const day13PaidAt = new Date("2026-09-13T03:00:00.000Z");
    const day14PaidAt = new Date("2026-09-14T03:00:00.000Z");

    // 1. Valid Real Paid Order on Day 14 (Order 1)
    const order1Id = randomUUID();
    await database.insert(commerceOrders).values({
      id: order1Id,
      paymentCode: testPaymentCode(1),
      invoiceNumber: "INV-001",
      chartId: "chart-1",
      chartVersionId: "cv-1",
      ownerId: "owner-1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: new Date("2026-09-14T02:50:00.000Z"),
      paidAt: day14PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: order1Id,
      providerEventId: "sepay:evt-1",
      amount: 79000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay_webhook",
      createdAt: new Date("2026-09-09T03:00:00.000Z"),
    });

    // Entitlement & ReportVersion for Order 1 with MATCHING full identity lineage (45s elapsed)
    const ent1Id = randomUUID();
    const rep1Id = randomUUID();
    const ver1Id = randomUUID();
    await database.insert(commerceEntitlements).values({
      id: ent1Id,
      orderId: order1Id,
      chartId: "chart-1",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: "owner-1",
      scope: TIER_1_ENTITLEMENT_SCOPE,
      createdAt: new Date("2026-09-09T03:00:00.000Z"),
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: rep1Id,
      reportVersionId: ver1Id,
      entitlementId: ent1Id,
      chartVersionId: "cv-1",
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kv-1",
      promptVersion: "pv-1",
      reportConfigVersion: "rcv-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "ready",
      createdAt: day14PaidAt,
      updatedAt: day14PaidAt,
    });
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: rep1Id,
      reportVersionId: ver1Id,
      entitlementId: ent1Id,
      chartVersionId: "cv-1",
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kv-1",
      promptVersion: "pv-1",
      reportConfigVersion: "rcv-1",
      templateVersion: "tv-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: { summary: "ok" },
      htmlContent: "<p>Report</p>",
      contentHash: validContentHash,
      pdfAssetId: randomUUID(),
      renderVersion: "rv-1",
      createdAt: new Date("2026-09-14T03:00:45.000Z"), // exactly 45s after paidAt
    });

    // 1b. A real payment remains historical after the order is later refunded.
    const refundedOrderId = randomUUID();
    await database.insert(commerceOrders).values({
      id: refundedOrderId,
      paymentCode: testPaymentCode(17),
      invoiceNumber: "INV-017",
      chartId: "chart-refunded",
      chartVersionId: "cv-refunded",
      ownerId: "owner-refunded",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "refunded",
      createdAt: new Date("2026-09-14T02:45:00.000Z"),
      paidAt: day14PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: refundedOrderId,
      providerEventId: "sepay:evt-refunded-17",
      amount: 79000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay_webhook",
      createdAt: day14PaidAt,
    });

    // ReportVersion with MISMATCHED lineage (e.g. mismatched evidenceVersionId)
    // Must NOT increment reportsReady!
    const mismatchOrderId = randomUUID();
    await database.insert(commerceOrders).values({
      id: mismatchOrderId,
      paymentCode: testPaymentCode(99),
      invoiceNumber: "INV-099",
      chartId: "chart-mismatch",
      chartVersionId: "cv-mismatch",
      ownerId: "owner-mismatch",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: new Date("2026-09-09T03:00:00.000Z"),
      paidAt: new Date("2026-09-09T03:00:00.000Z"),
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: mismatchOrderId,
      providerEventId: "sepay:evt-mismatch",
      amount: 79000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay_webhook",
      createdAt: day14PaidAt,
    });
    const entMismatchId = randomUUID();
    const repMismatchId = randomUUID();
    const verMismatchId = randomUUID();
    await database.insert(commerceEntitlements).values({
      id: entMismatchId,
      orderId: mismatchOrderId,
      chartId: "chart-mismatch",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: "owner-mismatch",
      scope: TIER_1_ENTITLEMENT_SCOPE,
      createdAt: day14PaidAt,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: repMismatchId,
      reportVersionId: verMismatchId,
      entitlementId: entMismatchId,
      chartVersionId: "cv-1",
      evidenceVersionId: "ev-res-correct",
      knowledgeVersionId: "kv-1",
      promptVersion: "pv-1",
      reportConfigVersion: "rcv-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "ready",
      createdAt: day14PaidAt,
      updatedAt: day14PaidAt,
    });
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: repMismatchId,
      reportVersionId: verMismatchId,
      entitlementId: entMismatchId,
      chartVersionId: "cv-1",
      evidenceVersionId: "ev-ver-mismatched", // MISMATCH
      knowledgeVersionId: "kv-1",
      promptVersion: "pv-1",
      reportConfigVersion: "rcv-1",
      templateVersion: "tv-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: { summary: "mismatch" },
      htmlContent: "<p>Mismatch</p>",
      contentHash: validContentHash,
      pdfAssetId: randomUUID(),
      renderVersion: "rv-1",
      createdAt: new Date("2026-09-14T03:05:00.000Z"),
    });

    // 2. Order having BOTH a valid real payment event AND a disabled-autopay event (Order 2) on Day 14
    const order2Id = randomUUID();
    await database.insert(commerceOrders).values({
      id: order2Id,
      paymentCode: testPaymentCode(2),
      invoiceNumber: "INV-002",
      chartId: "chart-2",
      chartVersionId: "cv-2",
      ownerId: "owner-2",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: new Date("2026-09-14T02:40:00.000Z"),
      paidAt: day14PaidAt,
    });
    await database.insert(commercePaymentEvents).values([
      {
        id: randomUUID(),
        orderId: order2Id,
        providerEventId: "sepay:valid-real-event-2",
        amount: 79000,
        currency: "VND",
        status: "ORDER_PAID",
        matchMethod: "sepay_webhook",
        createdAt: day14PaidAt,
      },
      {
        id: randomUUID(),
        orderId: order2Id,
        providerEventId: "disabled-autopay:auto-event-2",
        amount: 79000,
        currency: "VND",
        status: "ORDER_PAID",
        matchMethod: "autopay",
        createdAt: day14PaidAt,
      },
      {
        id: randomUUID(),
        orderId: order2Id,
        providerEventId: "sepay:self-claim-disabled-2",
        amount: 79000,
        currency: "VND",
        status: "ORDER_PAID",
        matchMethod: "self_claim",
        createdAt: new Date("2026-09-14T06:05:00.000Z"),
      },
    ]);
    // A matching report for Order 2 would increment reportsReady without the
    // all_real_paid_orders join, but must be excluded with disabled-autopay.
    const ent2Id = randomUUID();
    const rep2Id = randomUUID();
    const ver2Id = randomUUID();
    await database.insert(commerceEntitlements).values({
      id: ent2Id,
      orderId: order2Id,
      chartId: "chart-2",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: "owner-2",
      scope: TIER_1_ENTITLEMENT_SCOPE,
      createdAt: day14PaidAt,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: rep2Id,
      reportVersionId: ver2Id,
      entitlementId: ent2Id,
      chartVersionId: "cv-2",
      evidenceVersionId: "ev-2",
      knowledgeVersionId: "kv-2",
      promptVersion: "pv-2",
      reportConfigVersion: "rcv-2",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "ready",
      createdAt: day14PaidAt,
      updatedAt: day14PaidAt,
    });
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: rep2Id,
      reportVersionId: ver2Id,
      entitlementId: ent2Id,
      chartVersionId: "cv-2",
      evidenceVersionId: "ev-2",
      knowledgeVersionId: "kv-2",
      promptVersion: "pv-2",
      reportConfigVersion: "rcv-2",
      templateVersion: "tv-2",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: { summary: "disabled autopay" },
      htmlContent: "<p>Disabled autopay</p>",
      contentHash: validContentHash,
      pdfAssetId: randomUUID(),
      renderVersion: "rv-2",
      createdAt: new Date("2026-09-14T03:01:00.000Z"),
    });

    // 3. Pending over 1h vs pending under 1h vs expired on Day 14
    await database.insert(commerceOrders).values([
      {
        id: randomUUID(),
        paymentCode: testPaymentCode(3),
        invoiceNumber: "INV-003",
        chartId: "chart-poh",
        chartVersionId: "cv-poh",
        ownerId: "owner-poh",
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        status: "pending",
        createdAt: new Date("2026-09-14T08:30:00.000Z"), // 1.5h ago
      },
      {
        id: randomUUID(),
        paymentCode: testPaymentCode(4),
        invoiceNumber: "INV-004",
        chartId: "chart-puh",
        chartVersionId: "cv-puh",
        ownerId: "owner-puh",
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        status: "pending",
        createdAt: new Date("2026-09-14T09:30:00.000Z"), // 0.5h ago
      },
      {
        id: randomUUID(),
        paymentCode: testPaymentCode(5),
        invoiceNumber: "INV-005",
        chartId: "chart-exp",
        chartVersionId: "cv-exp",
        ownerId: "owner-exp",
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        status: "expired",
        createdAt: new Date("2026-09-14T07:00:00.000Z"),
      },
    ]);

    // 4. Unmatched payment and self-claim audit on Day 14
    await database.insert(commerceUnmatchedPayments).values({
      id: randomUUID(),
      providerEventId: "sepay:unmatched-1",
      rawPayload: { note: "test unmatched" },
      amount: 79000,
      reason: "order_not_found",
      receivedAt: new Date("2026-09-14T05:00:00.000Z"),
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: order1Id,
      providerEventId: "sepay:self-claim-1",
      amount: 79000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "self_claim",
      createdAt: new Date("2026-09-14T06:00:00.000Z"),
    });
    await database.insert(auditLogs).values([
      {
        id: randomUUID(),
        action: "commerce.payment_self_claim.requested",
        targetType: "commerce_payment_claim",
        targetId: "target-1",
        reasonCode: "PAYMENT_CLAIM_RATE_LIMITED",
        createdAt: new Date("2026-09-14T06:10:00.000Z"),
      },
      {
        id: randomUUID(),
        action: "commerce.payment_self_claim.requested",
        targetType: "commerce_payment_claim",
        targetId: "target-2",
        reasonCode: "claimed",
        createdAt: new Date("2026-09-14T06:15:00.000Z"),
      },
    ]);

    // 5. Upgrades within 7 days:
    // 5a. Valid upgrade: Tier 1 (ZIWEI-NATAL-EXCERPT-P0) -> Tier 2 (ZIWEI-IDENTITY-P0)
    const validSourceId = randomUUID();
    await database.insert(commerceOrders).values({
      id: validSourceId,
      paymentCode: testPaymentCode(6),
      invoiceNumber: "INV-006",
      chartId: "chart-u-valid",
      chartVersionId: "cv-u",
      ownerId: "owner-u-valid",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: day11PaidAt,
      paidAt: day11PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: validSourceId,
      providerEventId: "sepay:evt-u-valid-1",
      amount: 29000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay",
      createdAt: day11PaidAt,
    });

    const validUpgradeId = randomUUID();
    await database.insert(commerceOrders).values({
      id: validUpgradeId,
      paymentCode: testPaymentCode(7),
      invoiceNumber: "INV-007",
      chartId: "chart-u-valid",
      chartVersionId: "cv-u",
      ownerId: "owner-u-valid",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 50000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      creditApplied: 29000,
      creditedFromOrderId: validSourceId,
      creditExpiresAt: new Date("2026-09-18T03:00:00.000Z"),
      createdAt: day13PaidAt,
      paidAt: day13PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: validUpgradeId,
      providerEventId: "sepay:evt-u-valid-2",
      amount: 50000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay",
      createdAt: day13PaidAt,
    });

    // 5b. Regression case: Source lacks valid ORDER_PAID event
    const unpaidSourceId = randomUUID();
    await database.insert(commerceOrders).values({
      id: unpaidSourceId,
      paymentCode: testPaymentCode(8),
      invoiceNumber: "INV-008",
      chartId: "chart-u-unpaid",
      chartVersionId: "cv-u",
      ownerId: "owner-u-unpaid",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "pending", // NOT paid, no ORDER_PAID event
      createdAt: day11PaidAt,
    });
    const targetWithUnpaidSource = randomUUID();
    await database.insert(commerceOrders).values({
      id: targetWithUnpaidSource,
      paymentCode: testPaymentCode(9),
      invoiceNumber: "INV-009",
      chartId: "chart-u-unpaid",
      chartVersionId: "cv-u",
      ownerId: "owner-u-unpaid",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 50000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      creditApplied: 29000,
      creditedFromOrderId: unpaidSourceId,
      creditExpiresAt: new Date("2026-09-18T03:00:00.000Z"),
      createdAt: day13PaidAt,
      paidAt: day13PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: targetWithUnpaidSource,
      providerEventId: "sepay:evt-target-unpaid-source",
      amount: 50000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay",
      createdAt: day13PaidAt,
    });

    // 5c. Regression case: Source has disabled-autopay event
    const autopaySourceId = randomUUID();
    await database.insert(commerceOrders).values({
      id: autopaySourceId,
      paymentCode: testPaymentCode(10),
      invoiceNumber: "INV-010",
      chartId: "chart-u-auto",
      chartVersionId: "cv-u",
      ownerId: "owner-u-auto",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: day11PaidAt,
      paidAt: day11PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: autopaySourceId,
      providerEventId: "disabled-autopay:source-bad",
      amount: 29000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "autopay",
      createdAt: day11PaidAt,
    });
    const targetWithAutopaySource = randomUUID();
    await database.insert(commerceOrders).values({
      id: targetWithAutopaySource,
      paymentCode: testPaymentCode(11),
      invoiceNumber: "INV-011",
      chartId: "chart-u-auto",
      chartVersionId: "cv-u",
      ownerId: "owner-u-auto",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 50000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      creditApplied: 29000,
      creditedFromOrderId: autopaySourceId,
      creditExpiresAt: new Date("2026-09-18T03:00:00.000Z"),
      createdAt: day13PaidAt,
      paidAt: day13PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: targetWithAutopaySource,
      providerEventId: "sepay:evt-target-auto-source",
      amount: 50000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay",
      createdAt: day13PaidAt,
    });

    // 5d. Regression case: Source SKU is NOT Tier 1 (e.g. ZIWEI-CAREER-P0 instead of ZIWEI-NATAL-EXCERPT-P0)
    const nonTier1SourceId = randomUUID();
    await database.insert(commerceOrders).values({
      id: nonTier1SourceId,
      paymentCode: testPaymentCode(15),
      invoiceNumber: "INV-015",
      chartId: "chart-u-non-tier1",
      chartVersionId: "cv-u",
      ownerId: "owner-u-non-tier1",
      sku: "ZIWEI-CAREER-P0", // NOT Tier 1
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: day11PaidAt,
      paidAt: day11PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: nonTier1SourceId,
      providerEventId: "sepay:evt-non-tier1-source",
      amount: 29000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay",
      createdAt: day11PaidAt,
    });
    const targetWithNonTier1Source = randomUUID();
    await database.insert(commerceOrders).values({
      id: targetWithNonTier1Source,
      paymentCode: testPaymentCode(16),
      invoiceNumber: "INV-016",
      chartId: "chart-u-non-tier1",
      chartVersionId: "cv-u",
      ownerId: "owner-u-non-tier1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 50000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      creditApplied: 29000,
      creditedFromOrderId: nonTier1SourceId,
      creditExpiresAt: new Date("2026-09-18T03:00:00.000Z"),
      createdAt: day13PaidAt,
      paidAt: day13PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: targetWithNonTier1Source,
      providerEventId: "sepay:evt-target-non-tier1-source",
      amount: 50000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay",
      createdAt: day13PaidAt,
    });

    // 6. Repeat purchases: Owner R
    // Day 11: First paid order
    const orderR1Id = randomUUID();
    await database.insert(commerceOrders).values({
      id: orderR1Id,
      paymentCode: testPaymentCode(12),
      invoiceNumber: "INV-012",
      chartId: "chart-r1",
      chartVersionId: "cv-r1",
      ownerId: "owner-repeat",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: day11PaidAt,
      paidAt: day11PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: orderR1Id,
      providerEventId: "sepay:evt-r1",
      amount: 79000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay",
      createdAt: day11PaidAt,
    });

    // Day 12: Second paid order (not an upgrade) -> Repeat purchase!
    const orderR2Id = randomUUID();
    await database.insert(commerceOrders).values({
      id: orderR2Id,
      paymentCode: testPaymentCode(13),
      invoiceNumber: "INV-013",
      chartId: "chart-r2",
      chartVersionId: "cv-r2",
      ownerId: "owner-repeat",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: day12PaidAt,
      paidAt: day12PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: orderR2Id,
      providerEventId: "sepay:evt-r2",
      amount: 79000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "sepay",
      createdAt: day12PaidAt,
    });

    // Day 13: Third order for Owner R with disabled-autopay -> MUST NOT count as repeat purchase!
    const orderR3Id = randomUUID();
    await database.insert(commerceOrders).values({
      id: orderR3Id,
      paymentCode: testPaymentCode(14),
      invoiceNumber: "INV-014",
      chartId: "chart-r3",
      chartVersionId: "cv-r3",
      ownerId: "owner-repeat",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: day13PaidAt,
      paidAt: day13PaidAt,
    });
    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: orderR3Id,
      providerEventId: "disabled-autopay:r3",
      amount: 79000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "autopay",
      createdAt: day13PaidAt,
    });

    // Now query repository across the window 2026-09-10 to 2026-09-14
    const metrics = await repository.readMetrics({
      fromDate: "2026-09-10",
      toDate: "2026-09-14",
      now: testNow,
    });

    // Requirement 6: Assert generated per-day coverage across the entire requested range (5 days)
    expect(metrics).toHaveLength(5);
    expect(metrics.map((d) => d.date)).toEqual([
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
      "2026-09-14",
    ]);

    // Requirement 2 & 3 & 6: qrExpired, reportsFailed, and reportFailureRate must be null across all days
    for (const day of metrics) {
      expect(day.qrExpired).toBeNull();
      expect(day.reportsFailed).toBeNull();
      expect(day.reportFailureRate).toBeNull();
    }

    // Day 10: Empty day
    const day10 = metrics.find((d) => d.date === "2026-09-10");
    expect(day10).toBeDefined();
    expect(day10?.ordersCreated).toBe(0);
    expect(day10?.realPaidOrders).toBe(0);
    expect(day10?.cashCollectedVnd).toBe(0);
    expect(day10?.averagePaidToReportReadySeconds).toBeNull();

    // Day 11: Base orders
    const day11 = metrics.find((d) => d.date === "2026-09-11");
    expect(day11).toBeDefined();
    expect(day11?.upgradesWithin7Days).toBe(0);
    expect(day11?.repeatPurchases).toBe(0);

    // Day 12: Order R2 -> Repeat purchase!
    const day12 = metrics.find((d) => d.date === "2026-09-12");
    expect(day12).toBeDefined();
    expect(day12?.realPaidOrders).toBe(1);
    expect(day12?.repeatPurchases).toBe(1);
    expect(day12?.upgradesWithin7Days).toBe(0);

    // Day 13:
    // - Valid upgrade: target 5a (counted)
    // - Target 5b (source unpaid) -> NOT counted
    // - Target 5c (source has disabled-autopay) -> NOT counted
    // Total upgradesWithin7Days must be exactly 1!
    const day13 = metrics.find((d) => d.date === "2026-09-13");
    expect(day13).toBeDefined();
    expect(day13?.upgradesWithin7Days).toBe(1); // valid upgrade only!
    expect(day13?.repeatPurchases).toBe(0); // upgrades are not repeat purchases, R3 excluded

    // Day 14:
    // Order 1 and refunded Order 17 are historical real payments. Order 2 has
    // both a real event and disabled-autopay, so it is excluded from all
    // order-backed metrics.
    const day14 = metrics.find((d) => d.date === "2026-09-14");
    expect(day14).toBeDefined();
    expect(day14?.ordersCreated).toBe(5);
    expect(day14?.realPaidOrders).toBe(2);
    expect(day14?.disabledAutopayOrdersExcluded).toBe(1); // Order 2 counted here
    expect(day14?.cashCollectedVnd).toBe(158000);
    expect(day14?.recognizedDirectRevenueVnd).toBe(158000);
    expect(day14?.paymentPendingOver1h).toBe(1);
    expect(day14?.paymentUnmatched).toBe(1);
    expect(day14?.selfClaimSucceeded).toBe(1); // Order 2 self-claim is excluded
    expect(day14?.selfClaimFailed).toBe(1);
    // Requirement 3 & 6: Only matching full-identity lineage increments reportsReady
    // ver1Id matched -> counted (1)
    // verMismatchId had mismatched evidenceVersionId -> NOT counted!
    // ver2Id matched but belongs to disabled-autopay Order 2 -> NOT counted!
    expect(day14?.reportsReady).toBe(1);
    // Paid-to-ready timing: Order 1 was 45s; Order 2 excluded
    expect(day14?.averagePaidToReportReadySeconds).toBe(45);
  });
});
