import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { and, asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createDatabase,
  linkAnonymousActorToAccount,
} from "../runtime.js";
import {
  authAccounts,
  authAnonymousActors,
  authSessions,
  authUsers,
} from "./auth.js";
import {
  commerceOrders,
  commerceEntitlements,
} from "./commerce.js";
import { reportReservations } from "./reports.js";
import {
  TIER_1_ENTITLEMENT_SCOPE,
  TIER_2_ENTITLEMENT_SCOPE,
} from "@lasoviet/contracts";
import {
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  ziweiCharts,
  ziweiChartVersions,
} from "./birth-profile.js";
import { consents, deletionRequests } from "./privacy.js";
import { enqueueOutbox, outbox } from "./outbox.js";
import { auditLogs } from "./audit.js";
import {
  adminAuditLogs,
  adminCapabilityPolicies,
  adminRoleAssignments,
  adminRoleMutationRequests,
} from "./admin-access.js";
import { runMigrations } from "../migrate.js";
import { notificationDeliveries } from "./notifications.js";
import { reportAssets } from "./assets.js";
import { supportCases } from "./support-cases.js";
import { aiModelPricing, aiCallAttempts, aiUsageOutcomes } from "./ai-cost.js";
import {
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsFraudIpRecords,
  analyticsVisitors,
} from "./analytics.js";
import {
  walletAccounts,
  walletCommandReceipts,
  walletCreditLots,
  walletLedgerEntries,
  walletPurchaseIntents,
  walletRestorationAllocations,
  walletSpendAllocations,
  walletTransactions,
} from "./wallet-commerce.js";
import { generatedPreviewRequests, generatedPreviewSections } from "./generated-preview.js";

describe("database schema integration", () => {
  let container:
    | Awaited<ReturnType<PostgreSqlContainer["start"]>>
    | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  }, 30_000);

  it("applies empty and repeat migrations to one converged schema", async () => {
    const first = await runMigrations(databaseUrl);
    const second = await runMigrations(databaseUrl);

    expect(first.appliedMigrations).toEqual(second.appliedMigrations);
    expect(first.appliedMigrations.length).toBeGreaterThan(0);
  });

  it("exposes PDF asset, support case, and report_failed delivery schema exactly once", () => {
    expect(reportAssets.id).toBeDefined();
    expect(reportAssets.reportVersionId).toBeDefined();
    expect(reportAssets.objectKey).toBeDefined();
    expect(reportAssets.replicaStatus).toBeDefined();
    expect(supportCases.assetId).toBeDefined();
    expect(supportCases.failureStage).toBeDefined();
    expect(notificationDeliveries.kind).toBeDefined();
    expect(walletAccounts.ownerId).toBeDefined();
    expect(walletTransactions.idempotencyKey).toBeDefined();
    expect(walletCreditLots.remainingLa).toBeDefined();
    expect(walletLedgerEntries.amountLa).toBeDefined();
    expect(walletSpendAllocations.bucket).toBeDefined();
    expect(generatedPreviewRequests.leaseExpiresAt).toBeDefined();
    expect(generatedPreviewSections.safeExcerpt).toBeDefined();
  });

  it("enforces immutable wallet purchase intent locale and SKU combinations in PostgreSQL", async () => {
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-locale-owner";
    await database.insert(authUsers).values({
      id: ownerId,
      name: "Wallet Locale Owner",
      email: "wallet-locale-owner@example.test",
      emailVerified: true,
    });
    await database.insert(walletPurchaseIntents).values([
      {
        id: "10000000-0000-4000-8000-000000000037",
        ownerId,
        chartId: "wallet-locale-identity-vi",
        chartVersionId: "wallet-locale-identity-version-vi",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
        priceLa: 960,
      },
      {
        id: "10000000-0000-4000-8000-000000000038",
        ownerId,
        chartId: "wallet-locale-identity-en",
        chartVersionId: "wallet-locale-identity-version-en",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "en",
        priceLa: 720,
      },
      {
        id: "10000000-0000-4000-8000-000000000039",
        ownerId,
        chartId: "wallet-locale-excerpt-vi",
        chartVersionId: "wallet-locale-excerpt-version-vi",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      },
    ]);
    await expect(database.insert(walletPurchaseIntents).values({
      id: "10000000-0000-4000-8000-000000000040",
      ownerId,
      chartId: "wallet-locale-excerpt-en",
      chartVersionId: "wallet-locale-excerpt-version-en",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "en",
      priceLa: 240,
    })).rejects.toBeDefined();
  });

  it("backfills a valid 0036 wallet intent through 0037 and restores the current 0038 schema", async () => {
    const client = postgres(databaseUrl);
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-0036-to-0037-owner";
    const legacyIntentId = "10000000-0000-4000-8000-000000000041";
    await database.insert(authUsers).values({
      id: ownerId,
      name: "Wallet 0037 Upgrade Owner",
      email: "wallet-0037-upgrade@example.test",
      emailVerified: true,
    });

    try {
      await client`
        ALTER TABLE wallet_purchase_intents
        DROP CONSTRAINT wallet_purchase_intents_valid
      `;
      await client`
        ALTER TABLE wallet_purchase_intents
        DROP COLUMN locale
      `;
      await client`
        ALTER TABLE ai_usage_outcomes
        DROP CONSTRAINT IF EXISTS ai_usage_outcomes_invalid_output_reason_relation
      `;
      await client`
        ALTER TABLE ai_usage_outcomes
        DROP CONSTRAINT IF EXISTS ai_usage_outcomes_invalid_output_reason_valid
      `;
      await client`
        ALTER TABLE ai_usage_outcomes
        DROP COLUMN IF EXISTS invalid_output_reason
      `;
      await client`
        ALTER TABLE wallet_purchase_intents
        ADD CONSTRAINT wallet_purchase_intents_valid CHECK (
          (
            (sku = 'ZIWEI-NATAL-EXCERPT-P0' AND price_la = 240) OR
            (sku = 'ZIWEI-IDENTITY-P0' AND price_la IN (720, 960))
          ) AND
          status IN ('pending', 'completed', 'cancelled', 'expired') AND
          state_version > 0
        )
      `;
      await client`
        DELETE FROM drizzle.__drizzle_migrations
        WHERE created_at IN (1790812980000, 1790813040000)
      `;
      await client`
        INSERT INTO wallet_purchase_intents (
          id, owner_id, chart_id, chart_version_id, sku, price_la, status, state_version
        ) VALUES (
          ${legacyIntentId}, ${ownerId}, 'wallet-0036-chart', 'wallet-0036-version',
          'ZIWEI-NATAL-EXCERPT-P0', 240, 'pending', 1
        )
      `;

      await runMigrations(databaseUrl);

      const [backfilled] = await client<{ locale: string }[]>`
        SELECT locale FROM wallet_purchase_intents WHERE id = ${legacyIntentId}
      `;
      expect(backfilled?.locale).toBe("vi");
      await expect(client`
        INSERT INTO wallet_purchase_intents (
          id, owner_id, chart_id, chart_version_id, sku, locale, price_la, status, state_version
        ) VALUES (
          '10000000-0000-4000-8000-000000000042', ${ownerId}, 'wallet-0037-null-chart',
          'wallet-0037-null-version', 'ZIWEI-IDENTITY-P0', ${null}, 960, 'pending', 1
        )
      `).rejects.toBeDefined();
      await expect(client`
        INSERT INTO wallet_purchase_intents (
          id, owner_id, chart_id, chart_version_id, sku, locale, price_la, status, state_version
        ) VALUES (
          '10000000-0000-4000-8000-000000000043', ${ownerId}, 'wallet-0037-identity-chart',
          'wallet-0037-identity-version', 'ZIWEI-IDENTITY-P0', 'en', 960, 'pending', 1
        )
      `).resolves.toBeDefined();
      await expect(client`
        INSERT INTO wallet_purchase_intents (
          id, owner_id, chart_id, chart_version_id, sku, locale, price_la, status, state_version
        ) VALUES (
          '10000000-0000-4000-8000-000000000044', ${ownerId}, 'wallet-0037-excerpt-chart',
          'wallet-0037-excerpt-version', 'ZIWEI-NATAL-EXCERPT-P0', 'en', 240, 'pending', 1
        )
      `).rejects.toBeDefined();
    } finally {
      await runMigrations(databaseUrl);
      await client.end();
    }
  });

  it("rejects invalid wallet, revenue, receipt, entitlement, and preview lineage in PostgreSQL", async () => {
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-lineage-owner";
    const unverifiedOwnerId = "wallet-lineage-unverified";
    const walletId = "10000000-0000-4000-8000-000000000001";
    const topUpOrderId = "10000000-0000-4000-8000-000000000002";
    const grantId = "10000000-0000-4000-8000-000000000003";
    const lotId = "10000000-0000-4000-8000-000000000004";
    const intentId = "10000000-0000-4000-8000-000000000005";
    const spendId = "10000000-0000-4000-8000-000000000006";

    await database.insert(authUsers).values([
      { id: ownerId, name: "Wallet Lineage Owner", email: "wallet-lineage-owner@example.test", emailVerified: true },
      { id: unverifiedOwnerId, name: "Unverified Wallet Owner", email: "wallet-lineage-unverified@example.test" },
    ]);
    await expect(database.insert(walletAccounts).values({
      id: "10000000-0000-4000-8000-000000000000",
      ownerId: unverifiedOwnerId,
    })).rejects.toBeDefined();
    await database.insert(walletAccounts).values({ id: walletId, ownerId });
    await database.insert(commerceOrders).values({
      id: topUpOrderId,
      paymentCode: "LSVABD123EFG",
      invoiceNumber: "LSV-WALLET-LINEAGE-001",
      kind: "wallet_topup",
      ownerId,
      sku: "LA-ENTRY-300",
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await expect(database.insert(commerceOrders).values({
      id: "10000000-0000-4000-8000-000000000007",
      paymentCode: "LSVABD123EFH",
      invoiceNumber: "LSV-WALLET-LINEAGE-002",
      kind: "wallet_topup",
      ownerId,
      sku: "LA-ENTRY-300",
      amount: 1,
      currency: "VND",
      locale: "vi",
      status: "pending",
    })).rejects.toBeDefined();
    await expect(database.transaction(async (transaction) => {
      await transaction.insert(walletPurchaseIntents).values({
        id: "10000000-0000-4000-8000-000000000008",
        ownerId,
        chartId: "wallet-lineage-invalid-chart",
        chartVersionId: "wallet-lineage-invalid-version",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      });
      await transaction.insert(walletTransactions).values({
        id: "10000000-0000-4000-8000-000000000009",
        walletId,
        kind: "spend",
        idempotencyKey: "wallet-lineage-invalid-spend",
        fingerprint: "invalid-spend-fingerprint",
        purchaseIntentId: "10000000-0000-4000-8000-000000000008",
      });
      await transaction.insert(walletSpendAllocations).values({
        id: "10000000-0000-4000-8000-000000000010",
        spendTransactionId: "10000000-0000-4000-8000-000000000009",
        creditLotId: lotId,
        bucket: "purchased",
        amountLa: 240,
        purchasedLa: 240,
        recognizedVnd: 1,
      });
    })).rejects.toBeDefined();
    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: grantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-lineage-grant",
        fingerprint: "grant-fingerprint",
        topUpOrderId,
      });
      await transaction.insert(walletCreditLots).values({
        id: lotId,
        walletId,
        grantTransactionId: grantId,
        bucket: "purchased",
        grantedLa: 300,
        remainingLa: 300,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: grantId,
        bucket: "purchased",
        amountLa: 300,
      });
      await transaction.insert(walletPurchaseIntents).values({
        id: intentId,
        ownerId,
        chartId: "wallet-lineage-chart",
        chartVersionId: "wallet-lineage-chart-version",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      });
      await transaction.insert(walletTransactions).values({
        id: spendId,
        walletId,
        kind: "spend",
        idempotencyKey: "wallet-lineage-spend",
        fingerprint: "spend-fingerprint",
        purchaseIntentId: intentId,
      });
      await transaction.insert(walletSpendAllocations).values({
        id: "10000000-0000-4000-8000-000000000011",
        spendTransactionId: spendId,
        creditLotId: lotId,
        bucket: "purchased",
        amountLa: 240,
        purchasedLa: 240,
        recognizedVnd: 23200,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: spendId,
        bucket: "purchased",
        amountLa: -240,
      });
    });
    await expect(database.insert(walletCommandReceipts).values({
      walletId,
      idempotencyKey: "wrong-key",
      fingerprint: "spend-fingerprint",
      transactionId: spendId,
      result: {},
    })).rejects.toBeDefined();
    await expect(database.insert(commerceEntitlements).values({
      ledgerSpendId: spendId,
      chartId: "another-chart",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      ownerId,
      scope: TIER_1_ENTITLEMENT_SCOPE,
    })).rejects.toBeDefined();
    await expect(database.insert(commerceEntitlements).values({
      orderId: topUpOrderId,
      chartId: "wallet-lineage-chart",
      sku: "LA-ENTRY-300",
      ownerId,
      scope: TIER_1_ENTITLEMENT_SCOPE,
    })).rejects.toBeDefined();
    const contentOrderId = "10000000-0000-4000-8000-000000000013";
    await database.insert(commerceOrders).values({
      id: contentOrderId,
      paymentCode: "LSVABD123EFK",
      invoiceNumber: "LSV-WALLET-LINEAGE-CONTENT-001",
      kind: "content_purchase",
      chartId: "wallet-lineage-chart",
      chartVersionId: "wallet-lineage-chart-version",
      ownerId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      amount: 19000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await expect(database.insert(commerceEntitlements).values({
      orderId: contentOrderId,
      chartId: "wallet-lineage-chart",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      ownerId,
      scope: TIER_1_ENTITLEMENT_SCOPE,
    })).resolves.toBeDefined();
    await database.insert(generatedPreviewRequests).values({
      id: "10000000-0000-4000-8000-000000000010",
      chartVersionId: "wallet-lineage-preview-version",
      sourceReference: "10000000-0000-4000-8000-000000000011",
      idempotencyKey: "preview-one",
    });
    await expect(database.insert(generatedPreviewRequests).values({
      id: "10000000-0000-4000-8000-000000000012",
      chartVersionId: "wallet-lineage-preview-version",
      sourceReference: "10000000-0000-4000-8000-000000000013",
      idempotencyKey: "preview-two",
    })).rejects.toBeDefined();
  });

  it("enforces wallet owner, lot, reversal, and ledger authority in PostgreSQL", async () => {
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-authority-owner";
    const replacementOwnerId = "wallet-authority-replacement";
    const walletId = "20000000-0000-4000-8000-000000000001";
    const topUpOrderId = "20000000-0000-4000-8000-000000000012";
    const grantId = "20000000-0000-4000-8000-000000000003";
    const lotId = "20000000-0000-4000-8000-000000000004";
    const intentId = "20000000-0000-4000-8000-000000000005";
    const spendId = "20000000-0000-4000-8000-000000000006";
    const allocationId = "20000000-0000-4000-8000-000000000007";
    const restorationId = "20000000-0000-4000-8000-000000000008";

    await database.insert(authUsers).values([
      { id: ownerId, name: "Wallet Authority Owner", email: "wallet-authority-owner@example.test", emailVerified: true },
      { id: replacementOwnerId, name: "Wallet Authority Replacement", email: "wallet-authority-replacement@example.test", emailVerified: true },
    ]);
    await database.insert(walletAccounts).values({ id: walletId, ownerId });
    await database.insert(commerceOrders).values({
      id: topUpOrderId,
      paymentCode: "LSVABD123EFJ",
      invoiceNumber: "LSV-WALLET-AUTHORITY-001",
      kind: "wallet_topup",
      ownerId,
      sku: "LA-ENTRY-300",
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await expect(database.update(walletAccounts).set({ ownerId: replacementOwnerId }).where(
      eq(walletAccounts.id, walletId),
    )).rejects.toBeDefined();
    await expect(database.update(authUsers).set({ emailVerified: false }).where(
      eq(authUsers.id, ownerId),
    )).rejects.toBeDefined();
    await expect(database.update(authUsers).set({ isAnonymous: true }).where(
      eq(authUsers.id, ownerId),
    )).rejects.toBeDefined();
    await expect(database.insert(walletTransactions).values({
      id: "20000000-0000-4000-8000-000000000009",
      walletId,
      kind: "restoration",
      idempotencyKey: "wallet-authority-missing-restoration",
      fingerprint: "missing-restoration-fingerprint",
      reversalOfTransactionId: "20000000-0000-4000-8000-000000000010",
    })).rejects.toBeDefined();

    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: grantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-authority-grant",
        fingerprint: "authority-grant-fingerprint",
        topUpOrderId,
      });
      await transaction.insert(walletCreditLots).values({
        id: lotId,
        walletId,
        grantTransactionId: grantId,
        bucket: "purchased",
        grantedLa: 300,
        remainingLa: 300,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: grantId,
        bucket: "purchased",
        amountLa: 300,
      });
      await transaction.insert(walletPurchaseIntents).values({
        id: intentId,
        ownerId,
        chartId: "wallet-authority-chart",
        chartVersionId: "wallet-authority-chart-version",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      });
      await transaction.insert(walletTransactions).values({
        id: spendId,
        walletId,
        kind: "spend",
        idempotencyKey: "wallet-authority-spend",
        fingerprint: "authority-spend-fingerprint",
        purchaseIntentId: intentId,
      });
      await transaction.insert(walletSpendAllocations).values({
        id: allocationId,
        spendTransactionId: spendId,
        creditLotId: lotId,
        bucket: "purchased",
        amountLa: 240,
        purchasedLa: 240,
        recognizedVnd: 23200,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: spendId,
        bucket: "purchased",
        amountLa: -240,
      });
      await transaction.insert(walletTransactions).values({
        id: restorationId,
        walletId,
        kind: "restoration",
        idempotencyKey: "wallet-authority-restoration",
        fingerprint: "authority-restoration-fingerprint",
        reversalOfTransactionId: spendId,
      });
      await transaction.insert(walletRestorationAllocations).values({
        restorationTransactionId: restorationId,
        spendAllocationId: allocationId,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: restorationId,
        bucket: "purchased",
        amountLa: 240,
      });
    });

    await expect(database.insert(walletLedgerEntries).values({
      transactionId: grantId,
      bucket: "promotional",
      amountLa: 999999,
    })).rejects.toBeDefined();

    const immutableLotUpdates = [
      { walletId: "20000000-0000-4000-8000-000000000011" },
      { grantTransactionId: spendId },
      { bucket: "promotional" },
      { grantedLa: 301 },
      { grantedAt: new Date("2026-09-17T00:00:00.000Z") },
      { expiresAt: new Date("2026-09-18T00:00:00.000Z") },
    ];
    for (const values of immutableLotUpdates) {
      await expect(database.update(walletCreditLots).set(values).where(
        eq(walletCreditLots.id, lotId),
      )).rejects.toBeDefined();
    }
    await expect(database.update(walletCreditLots).set({ remainingLa: 60 }).where(
      eq(walletCreditLots.id, lotId),
    )).resolves.toBeDefined();

    const entries = await database.select({
      transactionId: walletLedgerEntries.transactionId,
      amountLa: walletLedgerEntries.amountLa,
    }).from(walletLedgerEntries).where(
      eq(walletLedgerEntries.bucket, "purchased"),
    ).orderBy(asc(walletLedgerEntries.transactionId));
    expect(entries.filter((entry) => [
      grantId,
      spendId,
      restorationId,
    ].includes(entry.transactionId))).toEqual([
      { transactionId: grantId, amountLa: 300 },
      { transactionId: spendId, amountLa: -240 },
      { transactionId: restorationId, amountLa: 240 },
    ]);
  });

  it("enforces exact top-up pack grants while preserving deferred ledger ordering", async () => {
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-pack-owner";
    const walletId = "30000000-0000-4000-8000-000000000001";
    const startOrderId = "30000000-0000-4000-8000-000000000002";
    const discoverOrderId = "30000000-0000-4000-8000-000000000003";
    const entryOrderId = "30000000-0000-4000-8000-000000000004";
    const pendingOrderId = "30000000-0000-4000-8000-000000000005";
    const refundedOrderId = "30000000-0000-4000-8000-000000000006";

    await database.insert(authUsers).values({
      id: ownerId,
      name: "Wallet Pack Owner",
      email: "wallet-pack-owner@example.test",
      emailVerified: true,
    });
    await database.insert(walletAccounts).values({ id: walletId, ownerId });
    await database.insert(commerceOrders).values([
      {
        id: startOrderId,
        paymentCode: "LSVWAT123456",
        invoiceNumber: "LSV-WALLET-PACK-START",
        kind: "wallet_topup",
        ownerId,
        sku: "LA-START-1100",
        amount: 99000,
        currency: "VND",
        locale: "vi",
        status: "paid",
      },
      {
        id: discoverOrderId,
        paymentCode: "LSVWAT123457",
        invoiceNumber: "LSV-WALLET-PACK-DISCOVER",
        kind: "wallet_topup",
        ownerId,
        sku: "LA-DISCOVER-3000",
        amount: 249000,
        currency: "VND",
        locale: "vi",
        status: "paid",
      },
      {
        id: entryOrderId,
        paymentCode: "LSVWAT123458",
        invoiceNumber: "LSV-WALLET-PACK-ENTRY",
        kind: "wallet_topup",
        ownerId,
        sku: "LA-ENTRY-300",
        amount: 29000,
        currency: "VND",
        locale: "vi",
        status: "paid",
      },
      {
        id: pendingOrderId,
        paymentCode: "LSVWAT123459",
        invoiceNumber: "LSV-WALLET-PACK-PENDING",
        kind: "wallet_topup",
        ownerId,
        sku: "LA-ENTRY-300",
        amount: 29000,
        currency: "VND",
        locale: "vi",
        status: "pending",
      },
      {
        id: refundedOrderId,
        paymentCode: "LSVWAT123460",
        invoiceNumber: "LSV-WALLET-PACK-REFUNDED",
        kind: "wallet_topup",
        ownerId,
        sku: "LA-ENTRY-300",
        amount: 29000,
        currency: "VND",
        locale: "vi",
        status: "refunded",
      },
    ]);

    const ledgerFirstGrantId = "30000000-0000-4000-8000-000000000010";
    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: ledgerFirstGrantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-pack-ledger-first",
        fingerprint: "wallet-pack-ledger-first-fingerprint",
        topUpOrderId: startOrderId,
      });
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: ledgerFirstGrantId, bucket: "purchased", amountLa: 1000 },
        { transactionId: ledgerFirstGrantId, bucket: "promotional", amountLa: 100 },
      ]);
      await transaction.insert(walletCreditLots).values([
        {
          id: "30000000-0000-4000-8000-000000000011",
          walletId,
          grantTransactionId: ledgerFirstGrantId,
          bucket: "purchased",
          grantedLa: 1000,
          remainingLa: 1000,
        },
        {
          id: "30000000-0000-4000-8000-000000000012",
          walletId,
          grantTransactionId: ledgerFirstGrantId,
          bucket: "promotional",
          grantedLa: 100,
          remainingLa: 100,
        },
      ]);
    });

    const lotsFirstGrantId = "30000000-0000-4000-8000-000000000020";
    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: lotsFirstGrantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-pack-lots-first",
        fingerprint: "wallet-pack-lots-first-fingerprint",
        topUpOrderId: discoverOrderId,
      });
      await transaction.insert(walletCreditLots).values([
        {
          id: "30000000-0000-4000-8000-000000000021",
          walletId,
          grantTransactionId: lotsFirstGrantId,
          bucket: "purchased",
          grantedLa: 2500,
          remainingLa: 2500,
        },
        {
          id: "30000000-0000-4000-8000-000000000022",
          walletId,
          grantTransactionId: lotsFirstGrantId,
          bucket: "promotional",
          grantedLa: 500,
          remainingLa: 500,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: lotsFirstGrantId, bucket: "purchased", amountLa: 2500 },
        { transactionId: lotsFirstGrantId, bucket: "promotional", amountLa: 500 },
      ]);
    });

    const reconciledEntries = await database.select({
      transactionId: walletLedgerEntries.transactionId,
      bucket: walletLedgerEntries.bucket,
      amountLa: walletLedgerEntries.amountLa,
    }).from(walletLedgerEntries).where(
      eq(walletLedgerEntries.transactionId, ledgerFirstGrantId),
    ).orderBy(asc(walletLedgerEntries.bucket));
    expect(reconciledEntries).toEqual([
      { transactionId: ledgerFirstGrantId, bucket: "promotional", amountLa: 100 },
      { transactionId: ledgerFirstGrantId, bucket: "purchased", amountLa: 1000 },
    ]);
    await expect(database.insert(walletCreditLots).values({
      walletId,
      grantTransactionId: ledgerFirstGrantId,
      bucket: "purchased",
      grantedLa: 1,
      remainingLa: 1,
    })).rejects.toBeDefined();

    await expect(database.transaction(async (transaction) => {
      const grantId = "30000000-0000-4000-8000-000000000030";
      await transaction.insert(walletTransactions).values({
        id: grantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-pack-wrong-total",
        fingerprint: "wallet-pack-wrong-total-fingerprint",
        topUpOrderId: entryOrderId,
      });
      await transaction.insert(walletCreditLots).values({
        walletId,
        grantTransactionId: grantId,
        bucket: "purchased",
        grantedLa: 301,
        remainingLa: 301,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: grantId,
        bucket: "purchased",
        amountLa: 301,
      });
    })).rejects.toBeDefined();

    await expect(database.transaction(async (transaction) => {
      const grantId = "30000000-0000-4000-8000-000000000040";
      await transaction.insert(walletTransactions).values({
        id: grantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-pack-extra-bucket",
        fingerprint: "wallet-pack-extra-bucket-fingerprint",
        topUpOrderId: entryOrderId,
      });
      await transaction.insert(walletCreditLots).values([
        {
          walletId,
          grantTransactionId: grantId,
          bucket: "purchased",
          grantedLa: 300,
          remainingLa: 300,
        },
        {
          walletId,
          grantTransactionId: grantId,
          bucket: "promotional",
          grantedLa: 1,
          remainingLa: 1,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: grantId, bucket: "purchased", amountLa: 300 },
        { transactionId: grantId, bucket: "promotional", amountLa: 1 },
      ]);
    })).rejects.toBeDefined();

    await expect(database.insert(walletTransactions).values({
      id: "30000000-0000-4000-8000-000000000050",
      walletId,
      kind: "grant",
      idempotencyKey: "wallet-pack-duplicate-order",
      fingerprint: "wallet-pack-duplicate-order-fingerprint",
      topUpOrderId: startOrderId,
    })).rejects.toBeDefined();

    const rejectedTopUpGrants = [
      {
        grantId: "30000000-0000-4000-8000-000000000051",
        orderId: pendingOrderId,
        idempotencyKey: "wallet-pack-pending-order",
      },
      {
        grantId: "30000000-0000-4000-8000-000000000052",
        orderId: refundedOrderId,
        idempotencyKey: "wallet-pack-refunded-order",
      },
    ];
    for (const rejectedGrant of rejectedTopUpGrants) {
      await expect(database.transaction(async (transaction) => {
        await transaction.insert(walletTransactions).values({
          id: rejectedGrant.grantId,
          walletId,
          kind: "grant",
          idempotencyKey: rejectedGrant.idempotencyKey,
          fingerprint: `${rejectedGrant.idempotencyKey}-fingerprint`,
          topUpOrderId: rejectedGrant.orderId,
        });
        await transaction.insert(walletCreditLots).values({
          walletId,
          grantTransactionId: rejectedGrant.grantId,
          bucket: "purchased",
          grantedLa: 300,
          remainingLa: 300,
        });
        await transaction.insert(walletLedgerEntries).values({
          transactionId: rejectedGrant.grantId,
          bucket: "purchased",
          amountLa: 300,
        });
      })).rejects.toBeDefined();

      const [rejectedTransaction] = await database.select({
        id: walletTransactions.id,
      }).from(walletTransactions).where(
        eq(walletTransactions.id, rejectedGrant.grantId),
      );
      const rejectedLots = await database.select({
        id: walletCreditLots.id,
      }).from(walletCreditLots).where(
        eq(walletCreditLots.grantTransactionId, rejectedGrant.grantId),
      );
      const rejectedEntries = await database.select({
        id: walletLedgerEntries.id,
      }).from(walletLedgerEntries).where(
        eq(walletLedgerEntries.transactionId, rejectedGrant.grantId),
      );
      expect(rejectedTransaction).toBeUndefined();
      expect(rejectedLots).toEqual([]);
      expect(rejectedEntries).toEqual([]);
    }

    const promotionalGrantId = "30000000-0000-4000-8000-000000000060";
    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: promotionalGrantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-pack-promotional-control",
        fingerprint: "wallet-pack-promotional-control-fingerprint",
      });
      await transaction.insert(walletCreditLots).values({
        walletId,
        grantTransactionId: promotionalGrantId,
        bucket: "promotional",
        grantedLa: 750,
        remainingLa: 750,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: promotionalGrantId,
        bucket: "promotional",
        amountLa: 750,
      });
    });

    await expect(database.transaction(async (transaction) => {
      const grantId = "30000000-0000-4000-8000-000000000070";
      await transaction.insert(walletTransactions).values({
        id: grantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-pack-unlinked-purchased",
        fingerprint: "wallet-pack-unlinked-purchased-fingerprint",
      });
      await transaction.insert(walletCreditLots).values({
        walletId,
        grantTransactionId: grantId,
        bucket: "purchased",
        grantedLa: 1,
        remainingLa: 1,
      });
    })).rejects.toBeDefined();

    await expect(database.delete(authUsers).where(
      eq(authUsers.id, ownerId),
    )).rejects.toBeDefined();
  });

  it("requires spend allocations to equal the immutable intent price across buckets", async () => {
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-spend-price-owner";
    const walletId = "40000000-0000-4000-8000-000000000001";
    const topUpOrderId = "40000000-0000-4000-8000-000000000002";
    const purchasedGrantId = "40000000-0000-4000-8000-000000000003";
    const purchasedLotId = "40000000-0000-4000-8000-000000000004";
    const promotionalGrantId = "40000000-0000-4000-8000-000000000005";
    const promotionalLotId = "40000000-0000-4000-8000-000000000006";

    await database.insert(authUsers).values({
      id: ownerId,
      name: "Wallet Spend Price Owner",
      email: "wallet-spend-price-owner@example.test",
      emailVerified: true,
    });
    await database.insert(walletAccounts).values({ id: walletId, ownerId });
    await database.insert(commerceOrders).values({
      id: topUpOrderId,
      paymentCode: "LSVWSP123456",
      invoiceNumber: "LSV-WALLET-SPEND-PRICE-001",
      kind: "wallet_topup",
      ownerId,
      sku: "LA-ENTRY-300",
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: purchasedGrantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-spend-price-purchased",
        fingerprint: "wallet-spend-price-purchased-fingerprint",
        topUpOrderId,
      });
      await transaction.insert(walletCreditLots).values({
        id: purchasedLotId,
        walletId,
        grantTransactionId: purchasedGrantId,
        bucket: "purchased",
        grantedLa: 300,
        remainingLa: 300,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: purchasedGrantId,
        bucket: "purchased",
        amountLa: 300,
      });
      await transaction.insert(walletTransactions).values({
        id: promotionalGrantId,
        walletId,
        kind: "grant",
        idempotencyKey: "wallet-spend-price-promotional",
        fingerprint: "wallet-spend-price-promotional-fingerprint",
      });
      await transaction.insert(walletCreditLots).values({
        id: promotionalLotId,
        walletId,
        grantTransactionId: promotionalGrantId,
        bucket: "promotional",
        grantedLa: 300,
        remainingLa: 300,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: promotionalGrantId,
        bucket: "promotional",
        amountLa: 300,
      });
    });

    for (const [amountLa, intentId, spendId] of [
      [239, "40000000-0000-4000-8000-000000000239", "40000000-0000-4000-8000-000000000139"],
      [241, "40000000-0000-4000-8000-000000000241", "40000000-0000-4000-8000-000000000141"],
    ] as const) {
      await expect(database.transaction(async (transaction) => {
        await transaction.insert(walletPurchaseIntents).values({
          id: intentId,
          ownerId,
          chartId: `wallet-spend-price-chart-${amountLa}`,
          chartVersionId: `wallet-spend-price-version-${amountLa}`,
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          locale: "vi",
          priceLa: 240,
        });
        await transaction.insert(walletTransactions).values({
          id: spendId,
          walletId,
          kind: "spend",
          idempotencyKey: `wallet-spend-price-${amountLa}`,
          fingerprint: `wallet-spend-price-${amountLa}-fingerprint`,
          purchaseIntentId: intentId,
        });
        await transaction.insert(walletSpendAllocations).values({
          spendTransactionId: spendId,
          creditLotId: promotionalLotId,
          bucket: "promotional",
          amountLa,
          purchasedLa: 0,
          recognizedVnd: 0,
        });
        await transaction.insert(walletLedgerEntries).values({
          transactionId: spendId,
          bucket: "promotional",
          amountLa: -amountLa,
        });
      })).rejects.toBeDefined();
    }

    const intentId = "40000000-0000-4000-8000-000000000007";
    const spendId = "40000000-0000-4000-8000-000000000008";
    await database.transaction(async (transaction) => {
      await transaction.insert(walletPurchaseIntents).values({
        id: intentId,
        ownerId,
        chartId: "wallet-spend-price-chart-valid",
        chartVersionId: "wallet-spend-price-version-valid",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      });
      await transaction.insert(walletTransactions).values({
        id: spendId,
        walletId,
        kind: "spend",
        idempotencyKey: "wallet-spend-price-valid",
        fingerprint: "wallet-spend-price-valid-fingerprint",
        purchaseIntentId: intentId,
      });
      await transaction.insert(walletSpendAllocations).values([
        {
          spendTransactionId: spendId,
          creditLotId: promotionalLotId,
          bucket: "promotional",
          amountLa: 60,
          purchasedLa: 0,
          recognizedVnd: 0,
        },
        {
          spendTransactionId: spendId,
          creditLotId: purchasedLotId,
          bucket: "purchased",
          amountLa: 180,
          purchasedLa: 180,
          recognizedVnd: 17400,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: spendId, bucket: "promotional", amountLa: -60 },
        { transactionId: spendId, bucket: "purchased", amountLa: -180 },
      ]);
    });
  });

  it("uses cumulative-floor recognition for non-divisible purchased lot consumption", async () => {
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-cumulative-floor-owner";
    const walletId = "45000000-0000-4000-8000-000000000001";
    const topUpOrderId = "45000000-0000-4000-8000-000000000002";
    const purchasedGrantId = "45000000-0000-4000-8000-000000000003";
    const purchasedLotId = "45000000-0000-4000-8000-000000000004";
    const packPromotionalLotId = "45000000-0000-4000-8000-000000000005";
    const controlledPromotionalGrantId = "45000000-0000-4000-8000-000000000006";
    const controlledPromotionalLotId = "45000000-0000-4000-8000-000000000007";
    let sequence = 0;

    const nextId = () => `45000000-0000-4000-8000-${String(++sequence + 100).padStart(12, "0")}`;
    const createSpend = async (
      allocations: Array<{
        creditLotId: string;
        bucket: "purchased" | "promotional";
        amountLa: number;
        recognizedVnd: number;
      }>,
      priceLa: 240 | 720 | 960,
    ) => {
      const intentId = nextId();
      const spendId = nextId();
      await database.transaction(async (transaction) => {
        await transaction.insert(walletPurchaseIntents).values({
          id: intentId,
          ownerId,
          chartId: `wallet-cumulative-floor-chart-${spendId}`,
          chartVersionId: `wallet-cumulative-floor-version-${spendId}`,
          sku: priceLa === 240 ? "ZIWEI-NATAL-EXCERPT-P0" : "ZIWEI-IDENTITY-P0",
          locale: "vi",
          priceLa,
        });
        await transaction.insert(walletTransactions).values({
          id: spendId,
          walletId,
          kind: "spend",
          idempotencyKey: `wallet-cumulative-floor-${spendId}`,
          fingerprint: `wallet-cumulative-floor-${spendId}-fingerprint`,
          purchaseIntentId: intentId,
        });
        await transaction.insert(walletSpendAllocations).values(allocations.map((allocation) => ({
          spendTransactionId: spendId,
          creditLotId: allocation.creditLotId,
          bucket: allocation.bucket,
          amountLa: allocation.amountLa,
          purchasedLa: allocation.bucket === "purchased" ? allocation.amountLa : 0,
          recognizedVnd: allocation.recognizedVnd,
        })));
        await transaction.insert(walletLedgerEntries).values(allocations.map((allocation) => ({
          transactionId: spendId,
          bucket: allocation.bucket,
          amountLa: -allocation.amountLa,
        })));
      });
      return spendId;
    };

    await database.insert(authUsers).values({
      id: ownerId,
      name: "Wallet Cumulative Floor Owner",
      email: "wallet-cumulative-floor-owner@example.test",
      emailVerified: true,
    });
    await database.insert(walletAccounts).values({ id: walletId, ownerId });
    await database.insert(commerceOrders).values({
      id: topUpOrderId,
      paymentCode: "LSVCDF123456",
      invoiceNumber: "LSV-WALLET-CUMULATIVE-FLOOR-001",
      kind: "wallet_topup",
      ownerId,
      sku: "LA-LIBRARY-8000",
      amount: 599000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values([
        {
          id: purchasedGrantId,
          walletId,
          kind: "grant",
          idempotencyKey: "wallet-cumulative-floor-pack",
          fingerprint: "wallet-cumulative-floor-pack-fingerprint",
          topUpOrderId,
        },
        {
          id: controlledPromotionalGrantId,
          walletId,
          kind: "grant",
          idempotencyKey: "wallet-cumulative-floor-controlled-promotional",
          fingerprint: "wallet-cumulative-floor-controlled-promotional-fingerprint",
        },
      ]);
      await transaction.insert(walletCreditLots).values([
        {
          id: purchasedLotId,
          walletId,
          grantTransactionId: purchasedGrantId,
          bucket: "purchased",
          grantedLa: 6000,
          remainingLa: 6000,
        },
        {
          id: packPromotionalLotId,
          walletId,
          grantTransactionId: purchasedGrantId,
          bucket: "promotional",
          grantedLa: 2000,
          remainingLa: 2000,
        },
        {
          id: controlledPromotionalLotId,
          walletId,
          grantTransactionId: controlledPromotionalGrantId,
          bucket: "promotional",
          grantedLa: 160,
          remainingLa: 160,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: purchasedGrantId, bucket: "purchased", amountLa: 6000 },
        { transactionId: purchasedGrantId, bucket: "promotional", amountLa: 2000 },
        { transactionId: controlledPromotionalGrantId, bucket: "promotional", amountLa: 160 },
      ]);
    });

    for (let index = 0; index < 8; index += 1) {
      await createSpend([{
        creditLotId: packPromotionalLotId,
        bucket: "promotional",
        amountLa: 240,
        recognizedVnd: 0,
      }], 240);
    }

    const firstPurchasedSpendId = await createSpend([
      {
        creditLotId: packPromotionalLotId,
        bucket: "promotional",
        amountLa: 80,
        recognizedVnd: 0,
      },
      {
        creditLotId: purchasedLotId,
        bucket: "purchased",
        amountLa: 160,
        recognizedVnd: 15973,
      },
    ], 240);
    const firstPurchasedAllocation = await database.select({
      recognizedVnd: walletSpendAllocations.recognizedVnd,
    }).from(walletSpendAllocations).where(
      eq(walletSpendAllocations.spendTransactionId, firstPurchasedSpendId),
    );
    expect(firstPurchasedAllocation).toContainEqual({ recognizedVnd: 15973 });

    await expect(createSpend([{
      creditLotId: purchasedLotId,
      bucket: "purchased",
      amountLa: 240,
      recognizedVnd: 23959,
    }], 240)).rejects.toBeDefined();
    await expect(createSpend([{
      creditLotId: purchasedLotId,
      bucket: "purchased",
      amountLa: 240,
      recognizedVnd: 23961,
    }], 240)).rejects.toBeDefined();

    const residualCarrySpendId = await createSpend([{
      creditLotId: purchasedLotId,
      bucket: "purchased",
      amountLa: 240,
      recognizedVnd: 23960,
    }], 240);
    const residualCarryAllocation = await database.select({
      recognizedVnd: walletSpendAllocations.recognizedVnd,
    }).from(walletSpendAllocations).where(
      eq(walletSpendAllocations.spendTransactionId, residualCarrySpendId),
    );
    expect(residualCarryAllocation).toEqual([{ recognizedVnd: 23960 }]);

    for (let index = 0; index < 5; index += 1) {
      const cumulativePurchasedLa = 400 + ((index + 1) * 960);
      const priorPurchasedLa = cumulativePurchasedLa - 960;
      await createSpend([{
        creditLotId: purchasedLotId,
        bucket: "purchased",
        amountLa: 960,
        recognizedVnd: Math.floor((cumulativePurchasedLa * 599000) / 6000)
          - Math.floor((priorPurchasedLa * 599000) / 6000),
      }], 960);
    }

    await createSpend([
      {
        creditLotId: purchasedLotId,
        bucket: "purchased",
        amountLa: 800,
        recognizedVnd: 79867,
      },
      {
        creditLotId: controlledPromotionalLotId,
        bucket: "promotional",
        amountLa: 160,
        recognizedVnd: 0,
      },
    ], 960);

    const purchasedAllocations = await database.select({
      purchasedLa: walletSpendAllocations.purchasedLa,
      recognizedVnd: walletSpendAllocations.recognizedVnd,
    }).from(walletSpendAllocations).where(
      eq(walletSpendAllocations.creditLotId, purchasedLotId),
    );
    const totalPurchasedLa = purchasedAllocations.reduce(
      (total, allocation) => total + allocation.purchasedLa,
      0,
    );
    const totalRecognizedVnd = purchasedAllocations.reduce(
      (total, allocation) => total + allocation.recognizedVnd,
      0,
    );
    expect(totalPurchasedLa).toBe(6000);
    expect(totalRecognizedVnd).toBeLessThanOrEqual(599000);
    expect(totalRecognizedVnd).toBe(599000);
  });

  it("uses active allocations to compensate non-LIFO purchased-lot restoration and re-spend", async () => {
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-restoration-rounding-owner";
    const walletId = "46000000-0000-4000-8000-000000000001";
    const topUpOrderId = "46000000-0000-4000-8000-000000000002";
    const purchasedGrantId = "46000000-0000-4000-8000-000000000003";
    const promotionalGrantId = "46000000-0000-4000-8000-000000000004";
    const purchasedLotId = "46000000-0000-4000-8000-000000000005";
    const packPromotionalLotId = "46000000-0000-4000-8000-000000000006";
    const controlledPromotionalLotId = "46000000-0000-4000-8000-000000000007";
    const firstIntentId = "46000000-0000-4000-8000-000000000008";
    const firstSpendId = "46000000-0000-4000-8000-000000000009";
    const firstPurchasedAllocationId = "46000000-0000-4000-8000-000000000010";
    const firstPromotionalAllocationId = "46000000-0000-4000-8000-000000000011";
    const secondIntentId = "46000000-0000-4000-8000-000000000012";
    const secondSpendId = "46000000-0000-4000-8000-000000000013";
    const restorationId = "46000000-0000-4000-8000-000000000014";
    const thirdIntentId = "46000000-0000-4000-8000-000000000015";
    const thirdSpendId = "46000000-0000-4000-8000-000000000016";

    await database.insert(authUsers).values({
      id: ownerId,
      name: "Wallet Restoration Rounding Owner",
      email: "wallet-restoration-rounding@example.test",
      emailVerified: true,
    });
    await database.insert(walletAccounts).values({ id: walletId, ownerId });
    await database.insert(commerceOrders).values({
      id: topUpOrderId,
      paymentCode: "LSVRND123456",
      invoiceNumber: "LSV-WALLET-RESTORATION-ROUNDING-001",
      kind: "wallet_topup",
      ownerId,
      sku: "LA-LIBRARY-8000",
      amount: 599000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values([
        {
          id: purchasedGrantId,
          walletId,
          kind: "grant",
          idempotencyKey: "wallet-restoration-rounding-pack",
          fingerprint: "wallet-restoration-rounding-pack-fingerprint",
          topUpOrderId,
        },
        {
          id: promotionalGrantId,
          walletId,
          kind: "grant",
          idempotencyKey: "wallet-restoration-rounding-promotional",
          fingerprint: "wallet-restoration-rounding-promotional-fingerprint",
        },
      ]);
      await transaction.insert(walletCreditLots).values([
        {
          id: purchasedLotId,
          walletId,
          grantTransactionId: purchasedGrantId,
          bucket: "purchased",
          grantedLa: 6000,
          remainingLa: 6000,
        },
        {
          id: packPromotionalLotId,
          walletId,
          grantTransactionId: purchasedGrantId,
          bucket: "promotional",
          grantedLa: 2000,
          remainingLa: 2000,
        },
        {
          id: controlledPromotionalLotId,
          walletId,
          grantTransactionId: promotionalGrantId,
          bucket: "promotional",
          grantedLa: 720,
          remainingLa: 720,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: purchasedGrantId, bucket: "purchased", amountLa: 6000 },
        { transactionId: purchasedGrantId, bucket: "promotional", amountLa: 2000 },
        { transactionId: promotionalGrantId, bucket: "promotional", amountLa: 720 },
      ]);
    });

    const insertOneLaSpend = async (
      intentId: string,
      spendId: string,
      recognizedVnd: number,
      purchasedAllocationId?: string,
    ) => database.transaction(async (transaction) => {
      await transaction.insert(walletPurchaseIntents).values({
        id: intentId,
        ownerId,
        chartId: `wallet-restoration-rounding-chart-${spendId}`,
        chartVersionId: `wallet-restoration-rounding-version-${spendId}`,
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      });
      await transaction.insert(walletTransactions).values({
        id: spendId,
        walletId,
        kind: "spend",
        idempotencyKey: `wallet-restoration-rounding-${spendId}`,
        fingerprint: `wallet-restoration-rounding-${spendId}-fingerprint`,
        purchaseIntentId: intentId,
      });
      await transaction.insert(walletSpendAllocations).values([
        {
          ...(purchasedAllocationId ? { id: purchasedAllocationId } : {}),
          spendTransactionId: spendId,
          creditLotId: purchasedLotId,
          bucket: "purchased",
          amountLa: 1,
          purchasedLa: 1,
          recognizedVnd,
        },
        {
          ...(purchasedAllocationId ? { id: firstPromotionalAllocationId } : {}),
          spendTransactionId: spendId,
          creditLotId: controlledPromotionalLotId,
          bucket: "promotional",
          amountLa: 239,
          purchasedLa: 0,
          recognizedVnd: 0,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: spendId, bucket: "purchased", amountLa: -1 },
        { transactionId: spendId, bucket: "promotional", amountLa: -239 },
      ]);
    });

    await insertOneLaSpend(firstIntentId, firstSpendId, 99, firstPurchasedAllocationId);
    await insertOneLaSpend(secondIntentId, secondSpendId, 100);

    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: restorationId,
        walletId,
        kind: "restoration",
        idempotencyKey: "wallet-restoration-rounding-reversal",
        fingerprint: "wallet-restoration-rounding-reversal-fingerprint",
        reversalOfTransactionId: firstSpendId,
      });
      await transaction.insert(walletRestorationAllocations).values([
        {
          restorationTransactionId: restorationId,
          spendAllocationId: firstPurchasedAllocationId,
        },
        {
          restorationTransactionId: restorationId,
          spendAllocationId: firstPromotionalAllocationId,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: restorationId, bucket: "purchased", amountLa: 1 },
        { transactionId: restorationId, bucket: "promotional", amountLa: 239 },
      ]);
    });

    const activeBeforeThirdSpend = await database.select({
      id: walletSpendAllocations.id,
      purchasedLa: walletSpendAllocations.purchasedLa,
      recognizedVnd: walletSpendAllocations.recognizedVnd,
    }).from(walletSpendAllocations).where(
      eq(walletSpendAllocations.creditLotId, purchasedLotId),
    );
    const restoredBeforeThirdSpend = new Set((await database.select({
      spendAllocationId: walletRestorationAllocations.spendAllocationId,
    }).from(walletRestorationAllocations).where(
      eq(walletRestorationAllocations.restorationTransactionId, restorationId),
    )).map((restoration) => restoration.spendAllocationId));
    const activeRecognizedBeforeThirdSpend = activeBeforeThirdSpend
      .filter((allocation) => !restoredBeforeThirdSpend.has(allocation.id))
      .reduce((sum, allocation) => sum + allocation.recognizedVnd, 0);
    expect(activeRecognizedBeforeThirdSpend).toBe(100);

    await database.transaction(async (transaction) => {
      await transaction.insert(walletPurchaseIntents).values({
        id: thirdIntentId,
        ownerId,
        chartId: "wallet-restoration-rounding-chart-third",
        chartVersionId: "wallet-restoration-rounding-version-third",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      });
      await transaction.insert(walletTransactions).values({
        id: thirdSpendId,
        walletId,
        kind: "spend",
        idempotencyKey: "wallet-restoration-rounding-third",
        fingerprint: "wallet-restoration-rounding-third-fingerprint",
        purchaseIntentId: thirdIntentId,
      });
      await transaction.insert(walletSpendAllocations).values([
        {
          spendTransactionId: thirdSpendId,
          creditLotId: purchasedLotId,
          bucket: "purchased",
          amountLa: 1,
          purchasedLa: 1,
          recognizedVnd: 99,
        },
        {
          spendTransactionId: thirdSpendId,
          creditLotId: controlledPromotionalLotId,
          bucket: "promotional",
          amountLa: 239,
          purchasedLa: 0,
          recognizedVnd: 0,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: thirdSpendId, bucket: "purchased", amountLa: -1 },
        { transactionId: thirdSpendId, bucket: "promotional", amountLa: -239 },
      ]);
    });

    const purchasedAllocations = await database.select({
      id: walletSpendAllocations.id,
      purchasedLa: walletSpendAllocations.purchasedLa,
      recognizedVnd: walletSpendAllocations.recognizedVnd,
    }).from(walletSpendAllocations).where(
      eq(walletSpendAllocations.creditLotId, purchasedLotId),
    );
    const restorations = await database.select({
      spendAllocationId: walletRestorationAllocations.spendAllocationId,
    }).from(walletRestorationAllocations).where(
      eq(walletRestorationAllocations.restorationTransactionId, restorationId),
    );
    const restoredAllocationIds = new Set(restorations.map((restoration) => restoration.spendAllocationId));
    const activeAllocations = purchasedAllocations.filter(
      (allocation) => !restoredAllocationIds.has(allocation.id),
    );

    expect(purchasedAllocations).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: firstPurchasedAllocationId, recognizedVnd: 99 }),
      expect.objectContaining({ recognizedVnd: 100 }),
      expect.objectContaining({ recognizedVnd: 99 }),
    ]));
    expect(activeAllocations.reduce((sum, allocation) => sum + allocation.purchasedLa, 0)).toBe(2);
    expect(activeAllocations.reduce((sum, allocation) => sum + allocation.recognizedVnd, 0)).toBe(
      Math.floor((2 * 599000) / 6000),
    );
  });

  it("requires a restoration to restore every allocation from its reversed multi-bucket spend", async () => {
    const database = createDatabase(databaseUrl);
    const ownerId = "wallet-restoration-owner";
    const walletId = "50000000-0000-4000-8000-000000000001";
    const topUpOrderId = "50000000-0000-4000-8000-000000000002";
    const purchasedGrantId = "50000000-0000-4000-8000-000000000003";
    const purchasedLotId = "50000000-0000-4000-8000-000000000004";
    const promotionalGrantId = "50000000-0000-4000-8000-000000000005";
    const promotionalLotId = "50000000-0000-4000-8000-000000000006";
    const intentId = "50000000-0000-4000-8000-000000000007";
    const spendId = "50000000-0000-4000-8000-000000000008";
    const purchasedAllocationId = "50000000-0000-4000-8000-000000000009";
    const promotionalAllocationId = "50000000-0000-4000-8000-000000000010";
    const partialRestorationId = "50000000-0000-4000-8000-000000000011";
    const completeRestorationId = "50000000-0000-4000-8000-000000000012";
    const respendIntentId = "50000000-0000-4000-8000-000000000013";
    const respendId = "50000000-0000-4000-8000-000000000014";

    await database.insert(authUsers).values({
      id: ownerId,
      name: "Wallet Restoration Owner",
      email: "wallet-restoration-owner@example.test",
      emailVerified: true,
    });
    await database.insert(walletAccounts).values({ id: walletId, ownerId });
    await database.insert(commerceOrders).values({
      id: topUpOrderId,
      paymentCode: "LSVABC123EFH",
      invoiceNumber: "LSV-WALLET-RESTORATION-001",
      kind: "wallet_topup",
      ownerId,
      sku: "LA-ENTRY-300",
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values([
        {
          id: purchasedGrantId,
          walletId,
          kind: "grant",
          idempotencyKey: "wallet-restoration-purchased-grant",
          fingerprint: "wallet-restoration-purchased-grant-fingerprint",
          topUpOrderId,
        },
        {
          id: promotionalGrantId,
          walletId,
          kind: "grant",
          idempotencyKey: "wallet-restoration-promotional-grant",
          fingerprint: "wallet-restoration-promotional-grant-fingerprint",
        },
      ]);
      await transaction.insert(walletCreditLots).values([
        {
          id: purchasedLotId,
          walletId,
          grantTransactionId: purchasedGrantId,
          bucket: "purchased",
          grantedLa: 300,
          remainingLa: 300,
        },
        {
          id: promotionalLotId,
          walletId,
          grantTransactionId: promotionalGrantId,
          bucket: "promotional",
          grantedLa: 60,
          remainingLa: 60,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: purchasedGrantId, bucket: "purchased", amountLa: 300 },
        { transactionId: promotionalGrantId, bucket: "promotional", amountLa: 60 },
      ]);
      await transaction.insert(walletPurchaseIntents).values({
        id: intentId,
        ownerId,
        chartId: "wallet-restoration-chart",
        chartVersionId: "wallet-restoration-version",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      });
      await transaction.insert(walletTransactions).values({
        id: spendId,
        walletId,
        kind: "spend",
        idempotencyKey: "wallet-restoration-spend",
        fingerprint: "wallet-restoration-spend-fingerprint",
        purchaseIntentId: intentId,
      });
      await transaction.insert(walletSpendAllocations).values([
        {
          id: purchasedAllocationId,
          spendTransactionId: spendId,
          creditLotId: purchasedLotId,
          bucket: "purchased",
          amountLa: 180,
          purchasedLa: 180,
          recognizedVnd: 17400,
        },
        {
          id: promotionalAllocationId,
          spendTransactionId: spendId,
          creditLotId: promotionalLotId,
          bucket: "promotional",
          amountLa: 60,
          purchasedLa: 0,
          recognizedVnd: 0,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: spendId, bucket: "purchased", amountLa: -180 },
        { transactionId: spendId, bucket: "promotional", amountLa: -60 },
      ]);
    });

    await expect(database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: partialRestorationId,
        walletId,
        kind: "restoration",
        idempotencyKey: "wallet-restoration-partial",
        fingerprint: "wallet-restoration-partial-fingerprint",
        reversalOfTransactionId: spendId,
      });
      await transaction.insert(walletRestorationAllocations).values({
        restorationTransactionId: partialRestorationId,
        spendAllocationId: promotionalAllocationId,
      });
      await transaction.insert(walletLedgerEntries).values({
        transactionId: partialRestorationId,
        bucket: "promotional",
        amountLa: 60,
      });
    })).rejects.toBeDefined();
    await expect(database.select().from(walletTransactions).where(
      eq(walletTransactions.id, partialRestorationId),
    )).resolves.toEqual([]);

    await database.transaction(async (transaction) => {
      await transaction.insert(walletTransactions).values({
        id: completeRestorationId,
        walletId,
        kind: "restoration",
        idempotencyKey: "wallet-restoration-complete",
        fingerprint: "wallet-restoration-complete-fingerprint",
        reversalOfTransactionId: spendId,
      });
      await transaction.insert(walletRestorationAllocations).values([
        {
          restorationTransactionId: completeRestorationId,
          spendAllocationId: purchasedAllocationId,
        },
        {
          restorationTransactionId: completeRestorationId,
          spendAllocationId: promotionalAllocationId,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: completeRestorationId, bucket: "purchased", amountLa: 180 },
        { transactionId: completeRestorationId, bucket: "promotional", amountLa: 60 },
      ]);
    });

    const restorationEntries = await database.select({
      bucket: walletLedgerEntries.bucket,
      amountLa: walletLedgerEntries.amountLa,
    }).from(walletLedgerEntries).where(
      eq(walletLedgerEntries.transactionId, completeRestorationId),
    ).orderBy(asc(walletLedgerEntries.bucket));
    expect(restorationEntries).toEqual([
      { bucket: "promotional", amountLa: 60 },
      { bucket: "purchased", amountLa: 180 },
    ]);

    await database.transaction(async (transaction) => {
      await transaction.insert(walletPurchaseIntents).values({
        id: respendIntentId,
        ownerId,
        chartId: "wallet-restoration-respend-chart",
        chartVersionId: "wallet-restoration-respend-version",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
        priceLa: 240,
      });
      await transaction.insert(walletTransactions).values({
        id: respendId,
        walletId,
        kind: "spend",
        idempotencyKey: "wallet-restoration-respend",
        fingerprint: "wallet-restoration-respend-fingerprint",
        purchaseIntentId: respendIntentId,
      });
      await transaction.insert(walletSpendAllocations).values([
        {
          spendTransactionId: respendId,
          creditLotId: purchasedLotId,
          bucket: "purchased",
          amountLa: 180,
          purchasedLa: 180,
          recognizedVnd: 17400,
        },
        {
          spendTransactionId: respendId,
          creditLotId: promotionalLotId,
          bucket: "promotional",
          amountLa: 60,
          purchasedLa: 0,
          recognizedVnd: 0,
        },
      ]);
      await transaction.insert(walletLedgerEntries).values([
        { transactionId: respendId, bucket: "purchased", amountLa: -180 },
        { transactionId: respendId, bucket: "promotional", amountLa: -60 },
      ]);
    });

    const activePurchasedAllocations = await database.select({
      purchasedLa: walletSpendAllocations.purchasedLa,
      recognizedVnd: walletSpendAllocations.recognizedVnd,
    }).from(walletSpendAllocations).where(
      eq(walletSpendAllocations.spendTransactionId, respendId),
    );
    expect(activePurchasedAllocations).toContainEqual({
      purchasedLa: 180,
      recognizedVnd: 17400,
    });
  });

  it("enforces identity, ownership, privacy, and outbox integrity", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_schema_test";
    const anonymousActorId = "anonymous_schema_test";
    const accountId = "account_schema_test";
    const profileId = "profile_schema_test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Schema Test User",
      email: "schema-test@example.test",
    });

    await expect(
      database.insert(authUsers).values({
        id: "user_schema_duplicate",
        name: "Duplicate User",
        email: "schema-test@example.test",
      }),
    ).rejects.toBeDefined();

    await database.insert(authAccounts).values({
      id: accountId,
      userId,
      providerId: "credential",
      accountId: "schema-test@example.test",
      issuer: "local",
    });

    await expect(
      database.insert(authAccounts).values({
        id: "account_schema_duplicate",
        userId,
        providerId: "credential",
        accountId: "schema-test@example.test",
      }),
    ).rejects.toBeDefined();

    await database.insert(consents).values({
      id: "consent_schema_test",
      userId,
      documentKey: "privacy",
      documentVersion: "2026-09-01",
      purpose: "birth_profile",
    });
    await expect(
      database.insert(consents).values({
        id: "consent_schema_test_duplicate",
        userId,
        documentKey: "privacy",
        documentVersion: "2026-09-01",
        purpose: "birth_profile",
      }),
    ).rejects.toBeDefined();
    await database.insert(deletionRequests).values({
      id: "deletion_schema_test",
      userId,
      requestedAt: new Date("2026-09-01T00:00:00Z"),
      recoverUntil: new Date("2026-10-01T00:00:00Z"),
      purgeAfter: new Date("2026-10-01T00:00:00Z"),
    });

    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await expect(
      database.insert(birthProfiles).values({
        id: "profile_schema_missing_expiry",
        anonymousActorId,
      }),
    ).rejects.toBeDefined();
    await expect(
      database.insert(birthProfiles).values({
        id: "profile_schema_account_expiry",
        userId,
        anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
      }),
    ).rejects.toBeDefined();
    await database.insert(consents).values({
      id: "consent_schema_anonymous",
      anonymousActorId,
      documentKey: "privacy",
      documentVersion: "2026-09-01",
      purpose: "birth_profile",
    });
    await expect(
      database.insert(consents).values({
        id: "consent_schema_anonymous_duplicate",
        anonymousActorId,
        documentKey: "privacy",
        documentVersion: "2026-09-01",
        purpose: "birth_profile",
      }),
    ).rejects.toBeDefined();
    await database.insert(birthProfileRevisions).values({
      id: "profile_revision_schema_test",
      profileId,
      revisionNumber: 1,
      originalInput: { localDate: "1990-01-01", timePrecision: "unknown" },
      normalizedInput: { timePrecision: "unknown" },
      consentVersion: "2026-09-01",
    });

    const insertedEvent = await enqueueOutbox(database, {
      schemaVersion: 1,
      type: "profile.created.v1",
      eventId: "event_schema_test",
      occurredAt: "2026-09-01T00:00:00+00:00",
      traceId: "trace_schema_test",
      actorId: anonymousActorId,
      aggregateType: "account",
      aggregateId: profileId,
      idempotencyKey: "profile-created:profile_schema_test",
      payload: { profileId },
    });

    expect(insertedEvent).toMatchObject({
      eventId: "event_schema_test",
      status: "pending",
      attemptCount: 0,
      leasedUntil: null,
      leasedBy: null,
    });
    await expect(
      enqueueOutbox(database, {
        schemaVersion: 1,
        type: "profile.created.v1",
        eventId: "event_schema_duplicate",
        occurredAt: "2026-09-01T00:00:00+00:00",
        traceId: "trace_schema_test",
        actorId: anonymousActorId,
        aggregateType: "account",
        aggregateId: profileId,
        idempotencyKey: "profile-created:profile_schema_test",
        payload: { profileId },
      }),
    ).rejects.toMatchObject({ code: "OUTBOX_DUPLICATE_KEY" });

    await database.insert(auditLogs).values({
      actorId: anonymousActorId,
      action: "profile.created",
      targetType: "birth_profile",
      targetId: profileId,
      requestId: "request_schema_test",
      metadata: { source: "integration-test" },
    });
    await database.insert(adminRoleAssignments).values({
      id: "admin_assignment_schema_test",
      userId,
      role: "read_only",
    });
    await expect(
      database.insert(adminRoleAssignments).values({
        id: "admin_assignment_duplicate",
        userId,
        role: "operations",
      }),
    ).rejects.toBeDefined();
    await database.insert(adminRoleMutationRequests).values({
      actorId: userId,
      operation: "admin.role.assigned",
      targetId: "admin_assignment_schema_test",
      idempotencyKey: "schema-role-change-1",
      requestFingerprint: "fingerprint-1",
      result: { assignmentId: "admin_assignment_schema_test", version: 1 },
    });
    await database.insert(adminRoleMutationRequests).values({
      actorId: userId,
      operation: "admin.role.assigned",
      targetId: "admin_assignment_schema_test",
      idempotencyKey: "schema-role-change-1",
      requestFingerprint: "fingerprint-2",
      result: { assignmentId: "admin_assignment_schema_test", version: 1 },
    });
    await expect(
      database.insert(adminRoleMutationRequests).values({
        actorId: userId,
        operation: "admin.role.assigned",
        targetId: "admin_assignment_schema_test",
        idempotencyKey: "schema-role-change-1",
        requestFingerprint: "fingerprint-2",
        result: { assignmentId: "admin_assignment_schema_test", version: 1 },
      }),
    ).rejects.toBeDefined();
    expect(
      await database
        .select({
          idempotencyKey: adminRoleMutationRequests.idempotencyKey,
          requestFingerprint: adminRoleMutationRequests.requestFingerprint,
        })
        .from(adminRoleMutationRequests)
        .where(
          and(
            eq(adminRoleMutationRequests.actorId, userId),
            eq(
              adminRoleMutationRequests.idempotencyKey,
              "schema-role-change-1",
            ),
          ),
        )
        .orderBy(asc(adminRoleMutationRequests.requestFingerprint)),
    ).toEqual([
      {
        idempotencyKey: "schema-role-change-1",
        requestFingerprint: "fingerprint-1",
      },
      {
        idempotencyKey: "schema-role-change-1",
        requestFingerprint: "fingerprint-2",
      },
    ]);
    expect(
      await database
        .select({ capability: adminCapabilityPolicies.capability })
        .from(adminCapabilityPolicies)
        .where(eq(adminCapabilityPolicies.role, "read_only"))
        .orderBy(asc(adminCapabilityPolicies.capability)),
    ).toEqual([
      { capability: "admin.audit.read" },
      { capability: "admin.overview.read" },
      { capability: "admin.readiness.read" },
      { capability: "admin.reports.read" },
    ]);
    const [adminAudit] = await database
      .insert(adminAuditLogs)
      .values({
        actorId: userId,
        roleAssignmentId: "admin_assignment_schema_test",
        capability: "admin.overview.read",
        operation: "admin.overview.read",
        targetType: "admin_overview",
        targetId: "overview",
        requestId: "admin-request-schema-test",
        traceId: "admin-trace-schema-test",
        policyResult: "allowed",
        redactionLevel: "redacted",
        resultSummary: { count: 1 },
      })
      .returning();
    await expect(
      database
        .update(adminAuditLogs)
        .set({ operation: "admin.audit.mutated" })
        .where(eq(adminAuditLogs.id, adminAudit!.id)),
    ).rejects.toBeDefined();
    await expect(
      database.delete(adminAuditLogs).where(eq(adminAuditLogs.id, adminAudit!.id)),
    ).rejects.toBeDefined();
    await expect(
      database.insert(adminAuditLogs).values({
        actorId: null,
        roleAssignmentId: null,
        capability: "admin.overview.read",
        operation: "admin.access.read",
        targetType: "admin_overview",
        targetId: "overview",
        requestId: "admin-denied-request",
        traceId: "admin-denied-trace",
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: { outcome: "denied" },
      }),
    ).resolves.toBeDefined();
    const [notification] = await database
      .insert(notificationDeliveries)
      .values({
        idempotencyKey: "auth-email:verification:schema-test",
        kind: "email_verification",
        recipientFingerprint: "recipient-fingerprint-schema-test",
        requestPayload: {
          version: 1,
          kind: "email_verification",
          idempotencyKey: "auth-email:verification:schema-test",
          recipient: "schema-test@example.test",
          locale: "en",
          actionUrl: "https://lasoviet.example/verify",
          requestId: "schema-test-request",
        },
      })
      .returning();

    const [profile] = await database
      .select()
      .from(birthProfiles);
    expect(profile).toMatchObject({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    expect(notification).toMatchObject({
      idempotencyKey: "auth-email:verification:schema-test",
      kind: "email_verification",
      status: "pending",
      attemptCount: 0,
      sendingLeaseExpiresAt: null,
      sentAt: null,
    });

    const [reportReadyNotification] = await database
      .insert(notificationDeliveries)
      .values({
        idempotencyKey: "report-ready-email:ver-schema-test:acc-schema-test",
        kind: "report_ready",
        recipientFingerprint: "recipient-fingerprint-schema-test",
        requestPayload: {
          version: 1,
          kind: "report_ready",
          idempotencyKey: "report-ready-email:ver-schema-test:acc-schema-test",
          recipient: "schema-test@example.test",
          locale: "vi",
          actionUrl: "https://lasoviet.net/bao-cao/report-schema-test",
          requestId: "trace-schema-test",
        },
      })
      .returning();
    expect(reportReadyNotification).toMatchObject({
      idempotencyKey: "report-ready-email:ver-schema-test:acc-schema-test",
      kind: "report_ready",
      status: "pending",
      attemptCount: 0,
      sendingLeaseExpiresAt: null,
      sentAt: null,
    });

    await database.$client.end();
  }, 120_000);

  it("links an anonymous profile to an account without duplication", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_link_test";
    const anonymousActorId = "anonymous_link_test";
    const profileId = "profile_link_test";
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await database.insert(authUsers).values({
      id: userId,
      name: "Linked User",
      email: "linked-user@example.test",
    });
    await database.insert(authUsers).values({
      id: anonymousActorId,
      name: "Anonymous Link User",
      email: "anonymous-link-user@example.test",
      isAnonymous: true,
    });
    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: futureExpiry,
    });
    await database.insert(authSessions).values({
      id: "anonymous_link_session",
      userId: anonymousActorId,
      token: "anonymous-link-token",
      expiresAt: futureExpiry,
    });
    await database.insert(auditLogs).values({
      actorId: anonymousActorId,
      action: "anonymous.profile.created",
      targetType: "birth_profile",
      targetId: profileId,
      requestId: "anonymous-link-request",
      metadata: {},
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: futureExpiry,
    });

    await expect(
      linkAnonymousActorToAccount(database, anonymousActorId, userId),
    ).resolves.toMatchObject({
      ok: true,
      value: { anonymousActorId, userId },
    });

    const [profile] = await database
      .select()
      .from(birthProfiles)
      .where(eq(birthProfiles.id, profileId));
    const [actor] = await database
      .select()
      .from(authAnonymousActors)
      .where(eq(authAnonymousActors.id, anonymousActorId));

    expect(profile).toMatchObject({
      id: profileId,
      userId,
      anonymousActorId: null,
      anonymousExpiresAt: null,
    });
    expect(actor).toMatchObject({ id: anonymousActorId, linkedUserId: userId });
    expect(
      (await database.select().from(authUsers)).find(
        (user) => user.id === anonymousActorId,
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(authSessions)).find(
        (session) => session.id === "anonymous_link_session",
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(auditLogs)).find(
        (audit) =>
          audit.actorId === anonymousActorId &&
          audit.action === "anonymous.profile.created",
      ),
    ).toBeDefined();

    await database.$client.end();
  }, 120_000);

  it("refuses to link an expired anonymous actor", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "user_expired_link_test",
      name: "Expired Link User",
      email: "expired-link-user@example.test",
    });
    await database.insert(authAnonymousActors).values({
      id: "anonymous_expired_link_test",
      expiresAt: new Date("2026-08-31T23:59:59Z"),
    });

    await expect(
      linkAnonymousActorToAccount(
        database,
        "anonymous_expired_link_test",
        "user_expired_link_test",
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_LINK_CONFLICT" },
    });
    await database.$client.end();
  }, 120_000);

  it("links an anonymous actor with no profile and removes its old identity", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_no_profile_link_test";
    const anonymousActorId = "anonymous_no_profile_link_test";
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await database.insert(authUsers).values([
      {
        id: userId,
        name: "No Profile Link Account",
        email: "no-profile-link-account@example.test",
      },
      {
        id: anonymousActorId,
        name: "No Profile Anonymous User",
        email: "no-profile-anonymous@example.test",
        isAnonymous: true,
      },
    ]);
    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: futureExpiry,
    });
    await database.insert(authSessions).values({
      id: "anonymous_no_profile_link_session",
      userId: anonymousActorId,
      token: "anonymous-no-profile-link-token",
      expiresAt: futureExpiry,
    });

    await expect(
      linkAnonymousActorToAccount(database, anonymousActorId, userId),
    ).resolves.toMatchObject({
      ok: true,
      value: { anonymousActorId, userId },
    });
    const [actor] = await database
      .select()
      .from(authAnonymousActors)
      .where(eq(authAnonymousActors.id, anonymousActorId));
    expect(actor).toMatchObject({ linkedUserId: userId });
    expect(
      (await database.select().from(authUsers)).find(
        (user) => user.id === anonymousActorId,
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(authSessions)).find(
        (session) => session.id === "anonymous_no_profile_link_session",
      ),
    ).toBeUndefined();
    await database.$client.end();
  }, 120_000);
  it("enforces non-null entitlement scope and supports Tier-1 and Tier-2 scopes (Acceptance test 1)", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_entitlement_scope_test";
    const orderId1 = "11111111-2222-3333-4444-555555555551";
    const orderId2 = "11111111-2222-3333-4444-555555555552";
    const chartId = "chart_scope_test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Scope Test User",
      email: "scope-test@example.test",
    });

    await database.insert(commerceOrders).values([
      {
        id: orderId1,
        invoiceNumber: "LSV-scope-test-1",
        paymentCode: "LSV123456781",
        chartId,
        chartVersionId: "cv-1",
        ownerId: userId,
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        status: "paid",
      },
      {
        id: orderId2,
        invoiceNumber: "LSV-scope-test-2",
        paymentCode: "LSV123456782",
        chartId,
        chartVersionId: "cv-1",
        ownerId: userId,
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        amount: 19000,
        currency: "VND",
        locale: "vi",
        status: "paid",
      },
    ]);

    // 1. Rejects inserting null scope (NOT NULL constraint)
    await expect(
      database.insert(commerceEntitlements).values({
        id: "22222222-2222-3333-4444-555555555551",
        orderId: orderId1,
        chartId,
        sku: "ZIWEI-IDENTITY-P0",
        ownerId: userId,
        scope: null as any,
      }),
    ).rejects.toBeDefined();

    // 2. Persists Tier-2 entitlement scope
    await database.insert(commerceEntitlements).values({
      id: "22222222-2222-3333-4444-555555555551",
      orderId: orderId1,
      chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    // 3. Persists Tier-1 entitlement scope
    await database.insert(commerceEntitlements).values({
      id: "22222222-2222-3333-4444-555555555552",
      orderId: orderId2,
      chartId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      ownerId: userId,
      scope: TIER_1_ENTITLEMENT_SCOPE,
    });

    const rows = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.chartId, chartId));

    expect(rows).toHaveLength(2);
    const tier2Row = rows.find((r) => r.sku === "ZIWEI-IDENTITY-P0");
    const tier1Row = rows.find((r) => r.sku === "ZIWEI-NATAL-EXCERPT-P0");

    expect(tier2Row?.scope).toEqual(TIER_2_ENTITLEMENT_SCOPE);
    expect(tier1Row?.scope).toEqual(TIER_1_ENTITLEMENT_SCOPE);

    await database.$client.end();
  }, 120_000);

  it("migrates and validates ai_model_pricing, ai_call_attempts, ai_usage_outcomes and append-only triggers", async () => {
    const database = createDatabase(databaseUrl);

    // 1. Persists versioned model pricing
    await database.insert(aiModelPricing).values({
      pricingVersion: "v1-20260914",
      providerId: "9router-an",
      modelId: "qwen-2.5-72b-instruct",
      currency: "VND",
      inputPricePerMillion: 15_000n,
      outputPricePerMillion: 60_000n,
      cachedInputPricePerMillion: 3_750n,
      effectiveFrom: new Date("2026-09-14T00:00:00Z"),
      source: "founder_approved_20260914",
      sourceCurrency: "VND",
      sourceReference: "founder_decision_20260914",
      fxSource: "direct_vnd",
      fxRate: 1n,
      fxTimestamp: new Date("2026-09-14T00:00:00Z"),
      referenceMetadata: { note: "test pricing" },
      status: "active",
    });

    // 2. Persists immutable call attempt
    const [attempt] = await database
      .insert(aiCallAttempts)
      .values({
        callId: "call-pg-001",
        attemptNumber: 0,
        purpose: "report",
        providerId: "9router-an",
        requestedModelId: "qwen-2.5-72b-instruct",
        maxOutputTokens: 9_000,
        pricingVersion: "v1-20260914",
        inputPricePerMillion: 15_000n,
        outputPricePerMillion: 60_000n,
        cachedInputPricePerMillion: 3_750n,
        currency: "VND",
        sourceCurrency: "VND",
        sourceReference: "founder_decision_20260914",
        fxSource: "direct_vnd",
        fxRate: 1n,
        fxTimestamp: new Date("2026-09-14T00:00:00Z"),
        pricingSource: "founder_approved_20260914",
      })
      .returning();

    expect(attempt.callId).toBe("call-pg-001");

    // 3. Persists outcome referencing attempt
    const [outcome] = await database
      .insert(aiUsageOutcomes)
      .values({
        attemptId: attempt.id,
        responseModelId: "qwen-2.5-72b-instruct",
        httpStatus: 200,
        inputTokens: 10_000,
        outputTokens: 1_000,
        cachedTokens: 3_000,
        totalTokens: 11_000,
        tokensUnknown: false,
        costMicroVnd: 176250000000n,
        costVnd: 177,
        costStatus: "resolved",
      })
      .returning();

    expect(outcome.costVnd).toBe(177);
    expect(outcome.costMicroVnd).toBe(176250000000n);
    expect(outcome.invalidOutputReason).toBeNull();

    const insertAttempt = async (callId: string) => {
      const [row] = await database
        .insert(aiCallAttempts)
        .values({
          callId,
          attemptNumber: 0,
          purpose: "report",
          providerId: "9router-an",
          requestedModelId: "qwen-2.5-72b-instruct",
          maxOutputTokens: 9_000,
          pricingVersion: "v1-20260914",
          inputPricePerMillion: 15_000n,
          outputPricePerMillion: 60_000n,
          cachedInputPricePerMillion: 3_750n,
          currency: "VND",
          sourceCurrency: "VND",
          sourceReference: "founder_decision_20260914",
          fxSource: "direct_vnd",
          fxRate: 1n,
          fxTimestamp: new Date("2026-09-14T00:00:00Z"),
          pricingSource: "founder_approved_20260914",
        })
        .returning();
      return row!;
    };

    const validDiagnosticAttempt = await insertAttempt("call-pg-002");
    const [validDiagnostic] = await database
      .insert(aiUsageOutcomes)
      .values({
        attemptId: validDiagnosticAttempt.id,
        httpStatus: 200,
        errorCode: "AI_OUTPUT_INVALID",
        invalidOutputReason: "json_object_malformed",
        tokensUnknown: true,
        costStatus: "unknown",
      })
      .returning();
    expect(validDiagnostic.invalidOutputReason).toBe("json_object_malformed");

    const unknownReasonAttempt = await insertAttempt("call-pg-003");
    await expect(
      database.insert(aiUsageOutcomes).values({
        attemptId: unknownReasonAttempt.id,
        errorCode: "AI_OUTPUT_INVALID",
        invalidOutputReason: "unknown_reason",
        tokensUnknown: true,
        costStatus: "unknown",
      }),
    ).rejects.toThrow();

    const invalidRelationAttempt = await insertAttempt("call-pg-004");
    await expect(
      database.insert(aiUsageOutcomes).values({
        attemptId: invalidRelationAttempt.id,
        errorCode: "AI_TIMEOUT",
        invalidOutputReason: "json_object_malformed",
        tokensUnknown: true,
        costStatus: "unknown",
      }),
    ).rejects.toThrow();

    // 4. Verifies append-only triggers reject UPDATE and DELETE
    await expect(
      database
        .update(aiModelPricing)
        .set({ status: "retired" })
        .where(eq(aiModelPricing.pricingVersion, "v1-20260914")),
    ).rejects.toThrow();

    await expect(
      database.delete(aiCallAttempts).where(eq(aiCallAttempts.id, attempt.id)),
    ).rejects.toThrow();

    await expect(
      database.delete(aiUsageOutcomes).where(eq(aiUsageOutcomes.id, outcome.id)),
    ).rejects.toThrow();

    await database.$client.end();
  }, 120_000);

  it("enforces analytics schema constraints, unique idempotency, and foreign key deletion behavior", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_analytics_test";
    const profileId = "profile_analytics_test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Analytics Test User",
      email: "analytics-test@example.test",
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      userId,
    });

    const unlinkedVisitorId = "vis_unlinked_1";
    const unlinkedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 1. Unlinked visitor with expiresAt set succeeds
    await database.insert(analyticsVisitors).values({
      id: unlinkedVisitorId,
      expiresAt: unlinkedExpiry,
    });

    // Unlinked visitor with null expiresAt fails check constraint
    await expect(
      database.insert(analyticsVisitors).values({
        id: "vis_unlinked_invalid",
        expiresAt: null,
      }),
    ).rejects.toBeDefined();

    // Anonymous consented visitor with birthProfileId and 30-day expiry is valid
    const anonymousActorId = "anon_actor_analytics_test";
    const anonymousProfileId = "profile_anon_analytics_test";
    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: unlinkedExpiry,
    });
    await database.insert(birthProfiles).values({
      id: anonymousProfileId,
      anonymousActorId,
      anonymousExpiresAt: unlinkedExpiry,
    });

    const consentedVisitorId = "vis_anonymous_consented";
    const consentedAt = new Date();
    await database.insert(analyticsVisitors).values({
      id: consentedVisitorId,
      birthProfileId: anonymousProfileId,
      consentedAt,
      expiresAt: unlinkedExpiry,
    });

    const [consentedVisitor] = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, consentedVisitorId));
    expect(consentedVisitor).toMatchObject({
      id: consentedVisitorId,
      birthProfileId: anonymousProfileId,
      consentedAt,
      expiresAt: unlinkedExpiry,
      userId: null,
      linkedAt: null,
    });

    // Consented unlinked visitor with null expiresAt still fails check constraint
    await expect(
      database.insert(analyticsVisitors).values({
        id: "vis_consented_no_expiry_invalid",
        birthProfileId: anonymousProfileId,
        consentedAt,
        expiresAt: null,
      }),
    ).rejects.toBeDefined();

    // 2. Linked visitor with userId, linkedAt set, and null expiresAt succeeds
    const linkedVisitorId = "vis_linked_1";
    await database.insert(analyticsVisitors).values({
      id: linkedVisitorId,
      userId,
      linkedAt: new Date(),
      expiresAt: null,
      birthProfileId: profileId,
      consentedAt,
    });

    // Linked visitor with expiresAt set fails check constraint
    await expect(
      database.insert(analyticsVisitors).values({
        id: "vis_linked_invalid",
        userId,
        linkedAt: new Date(),
        expiresAt: unlinkedExpiry,
      }),
    ).rejects.toBeDefined();

    const [linkedVisitor] = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, linkedVisitorId));
    expect(linkedVisitor).toMatchObject({
      id: linkedVisitorId,
      userId,
      birthProfileId: profileId,
      consentedAt,
      expiresAt: null,
    });

    // 3. Analytics events: unlinked event with unlinkedExpiresAt set succeeds
    await database.insert(analyticsEvents).values({
      id: "evt_unlinked_1",
      idempotencyKey: "idemp_unlinked_1",
      visitorId: unlinkedVisitorId,
      name: "landing",
      properties: { landing_page: "/tra-cuu" },
      ip: "192.168.1.1",
      ipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      unlinkedExpiresAt: unlinkedExpiry,
    });

    // Unlinked event with null unlinkedExpiresAt fails check constraint
    await expect(
      database.insert(analyticsEvents).values({
        id: "evt_unlinked_invalid",
        idempotencyKey: "idemp_unlinked_invalid",
        visitorId: unlinkedVisitorId,
        name: "landing",
        properties: {},
        unlinkedExpiresAt: null,
      }),
    ).rejects.toBeDefined();

    // Duplicate idempotency key fails unique constraint
    await expect(
      database.insert(analyticsEvents).values({
        id: "evt_unlinked_duplicate",
        idempotencyKey: "idemp_unlinked_1",
        visitorId: unlinkedVisitorId,
        name: "landing",
        properties: {},
        unlinkedExpiresAt: unlinkedExpiry,
      }),
    ).rejects.toBeDefined();

    // Linked event with userId and null unlinkedExpiresAt succeeds
    await database.insert(analyticsEvents).values({
      id: "evt_linked_1",
      idempotencyKey: "idemp_linked_1",
      visitorId: linkedVisitorId,
      userId,
      birthProfileId: profileId,
      name: "chart_success",
      properties: { engine_version: "v3" },
      ip: "10.0.0.1",
      ipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      unlinkedExpiresAt: null,
    });

    // Linked event with unlinkedExpiresAt set fails check constraint
    await expect(
      database.insert(analyticsEvents).values({
        id: "evt_linked_invalid",
        idempotencyKey: "idemp_linked_invalid",
        visitorId: linkedVisitorId,
        userId,
        name: "chart_success",
        properties: {},
        unlinkedExpiresAt: unlinkedExpiry,
      }),
    ).rejects.toBeDefined();

    // Event with IP but null ipExpiresAt fails check constraint
    await expect(
      database.insert(analyticsEvents).values({
        id: "evt_ip_invalid",
        idempotencyKey: "idemp_ip_invalid",
        visitorId: unlinkedVisitorId,
        name: "landing",
        properties: {},
        ip: "1.2.3.4",
        ipExpiresAt: null,
        unlinkedExpiresAt: unlinkedExpiry,
      }),
    ).rejects.toBeDefined();

    // 4. Account behavior profile succeeds and enforces unique userId
    await database.insert(accountBehaviorProfiles).values({
      id: "beh_1",
      userId,
      lockedSectionsViewed: ["section_career"],
      topupPacksViewed: ["pack_50k"],
      laBalance: 20,
      interestTopics: ["career"],
    });

    await expect(
      database.insert(accountBehaviorProfiles).values({
        id: "beh_duplicate",
        userId,
        lockedSectionsViewed: [],
        topupPacksViewed: [],
        interestTopics: [],
      }),
    ).rejects.toBeDefined();

    // 5. Fraud IP record with inet succeeds
    await database.insert(analyticsFraudIpRecords).values({
      id: "fraud_1",
      ip: "203.0.113.195",
      action: "auth.register",
      userId,
      visitorId: linkedVisitorId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // 6. Deleting birthProfile sets birthProfileId to null
    await database.delete(birthProfiles).where(eq(birthProfiles.id, profileId));
    const [visitorAfterProfileDelete] = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, linkedVisitorId));
    expect(visitorAfterProfileDelete?.birthProfileId).toBeNull();

    const [eventAfterProfileDelete] = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.id, "evt_linked_1"));
    expect(eventAfterProfileDelete?.birthProfileId).toBeNull();

    // 7. Deleting authUsers cascades and removes linked visitor, event, behavior profile, and fraud record
    await database.delete(authUsers).where(eq(authUsers.id, userId));

    const visitorsForUser = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, linkedVisitorId));
    expect(visitorsForUser).toHaveLength(0);

    const eventsForUser = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.id, "evt_linked_1"));
    expect(eventsForUser).toHaveLength(0);

    const profilesForUser = await database
      .select()
      .from(accountBehaviorProfiles)
      .where(eq(accountBehaviorProfiles.id, "beh_1"));
    expect(profilesForUser).toHaveLength(0);

    const fraudForUser = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_1"));
    expect(fraudForUser).toHaveLength(0);

    // Unlinked visitor and event are preserved
    const unlinkedVisitors = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, unlinkedVisitorId));
    expect(unlinkedVisitors).toHaveLength(1);

    await database.$client.end();
  }, 120_000);

  it("keeps migration journal identifiers sequential and unique", async () => {
    const journalUrl = new URL("../../drizzle/meta/_journal.json", import.meta.url);
    const journal = JSON.parse(await readFile(journalUrl, "utf8")) as {
      entries: Array<{ idx: number; when: number; tag: string }>;
    };

    expect(journal.entries.length).toBeGreaterThanOrEqual(29);
    for (let i = 1; i < journal.entries.length; i++) {
      const prev = journal.entries[i - 1]!;
      const curr = journal.entries[i]!;
      expect(curr.idx).toBe(prev.idx + 1);
      expect(curr.when).toBeGreaterThan(prev.when);
    }

    const indexes = journal.entries.map((entry) => entry.idx);
    const tags = journal.entries.map((entry) => entry.tag);
    const timestamps = journal.entries.map((entry) => entry.when);
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(new Set(tags).size).toBe(tags.length);
    expect(new Set(timestamps).size).toBe(timestamps.length);
    expect(journal.entries.slice(-13)).toEqual([
      {
        idx: 26,
        version: "7",
        when: 1789718400000,
        tag: "0026_ai_usage_and_cost",
        breakpoints: true,
      },
      {
        idx: 27,
        version: "7",
        when: 1789804800000,
        tag: "0027_birth_profile_reading_context",
        breakpoints: true,
      },
      {
        idx: 28,
        version: "7",
        when: 1789891200000,
        tag: "0028_account_linked_analytics",
        breakpoints: true,
      },
      {
        idx: 29,
        version: "7",
        when: 1789977600000,
        tag: "0029_report_section_checkpoints",
        breakpoints: true,
      },
      {
        idx: 30,
        version: "7",
        when: 1790064000000,
        tag: "0030_report_section_checkpoint_revisions",
        breakpoints: true,
      },
      {
        idx: 31,
        version: "7",
        when: 1790553600000,
        tag: "0031_report_reading_context_freeze",
        breakpoints: true,
      },
      {
        idx: 32,
        version: "7",
        when: 1790640000000,
        tag: "0032_admin_report_recovery",
        breakpoints: true,
      },
      {
        idx: 33,
        version: "7",
        when: 1790726400000,
        tag: "0033_report_assets_and_report_failure_delivery",
        breakpoints: true,
      },
      {
        idx: 34,
        version: "7",
        when: 1790812800000,
        tag: "0034_wallet_commerce_foundation",
        breakpoints: true,
      },
      {
        idx: 35,
        version: "7",
        when: 1790812860000,
        tag: "0035_generated_preview_persistence",
        breakpoints: true,
      },
      {
        idx: 36,
        version: "7",
        when: 1790812920000,
        tag: "0036_wallet_restoration_respend_reconciliation",
        breakpoints: true,
      },
      {
        idx: 37,
        version: "7",
        when: 1790812980000,
        tag: "0037_wallet_purchase_intent_locale",
        breakpoints: true,
      },
      {
        idx: 38,
        version: "7",
        when: 1790813040000,
        tag: "0038_ai_output_diagnostics",
        breakpoints: true,
      },
    ]);
  });

  it("applies 0026 AI cost, 0027 reading context, 0028 analytics, and 0029 checkpoints to a clean database", async () => {
    const client = postgres(databaseUrl);

    const migrations = await client<{ created_at: string }[]>`
      SELECT created_at
      FROM drizzle.__drizzle_migrations
      WHERE created_at IN (1789718400000, 1789804800000, 1789891200000, 1789977600000)
      ORDER BY created_at ASC
    `;
    expect(migrations.map((migration) => Number(migration.created_at))).toEqual([
      1789718400000,
      1789804800000,
      1789891200000,
      1789977600000,
    ]);

    const tables = await client<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'ai_model_pricing',
          'ai_call_attempts',
          'ai_usage_outcomes',
          'analytics_visitors',
          'analytics_events',
          'account_behavior_profiles',
          'analytics_fraud_ip_records',
          'report_section_checkpoints',
          'report_section_checkpoint_revisions'
        )
      ORDER BY table_name ASC
    `;
    expect(tables.map((table) => table.table_name)).toEqual([
      "account_behavior_profiles",
      "ai_call_attempts",
      "ai_model_pricing",
      "ai_usage_outcomes",
      "analytics_events",
      "analytics_fraud_ip_records",
      "analytics_visitors",
      "report_section_checkpoint_revisions",
      "report_section_checkpoints",
    ]);

    await client.end();
  });

  it("upgrades 0030 through 0038 from the 0029 checkpoint boundary without losing ReadingContext, analytics, or AI data", async () => {
    const client = postgres(databaseUrl);
    const database = createDatabase(databaseUrl);
    const upgradeNow = new Date("2026-09-15T00:00:00.000Z");
    const userId = "checkpoint-upgrade-user";
    const profileId = "checkpoint-upgrade-profile";
    const revisionId = "checkpoint-upgrade-revision";
    const visitorId = "checkpoint-upgrade-visitor";
    const eventId = "checkpoint-upgrade-event";

    try {
    await database.insert(authUsers).values({
      id: userId,
      name: "Checkpoint Upgrade User",
      email: "checkpoint-upgrade@example.test",
      createdAt: upgradeNow,
      updatedAt: upgradeNow,
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      userId,
      createdAt: upgradeNow,
      updatedAt: upgradeNow,
    });
    await database.insert(birthProfileReadingContextRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      lifeStage: "early_career",
      topConcern: "career",
      createdAt: upgradeNow,
    });
    await database.insert(birthProfileReadingContexts).values({
      profileId,
      currentRevisionId: revisionId,
      stateVersion: 1,
      lastRevisionNumber: 1,
      updatedAt: upgradeNow,
    });
    await database.insert(analyticsVisitors).values({
      id: visitorId,
      userId,
      birthProfileId: profileId,
      linkedAt: upgradeNow,
      firstSeenAt: upgradeNow,
      lastSeenAt: upgradeNow,
      createdAt: upgradeNow,
      updatedAt: upgradeNow,
    });
    await database.insert(analyticsEvents).values({
      id: eventId,
      idempotencyKey: "checkpoint-upgrade-event-key",
      visitorId,
      userId,
      birthProfileId: profileId,
      name: "birth_profile_saved",
      properties: { source: "checkpoint-upgrade" },
      occurredAt: upgradeNow,
      createdAt: upgradeNow,
    });
    const historicalOrderId = "20000000-0000-4000-8000-000000000001";
    const historicalUpgradeOrderId = "20000000-0000-4000-8000-000000000002";
    const historicalEntitlementId = "20000000-0000-4000-8000-000000000003";
    await database.insert(commerceOrders).values([
      {
        id: historicalOrderId,
        paymentCode: "LSVABC123DEF",
        invoiceNumber: "LSV-HISTORICAL-001",
        chartId: "historical-direct-vnd-chart",
        chartVersionId: "historical-direct-vnd-version",
        ownerId: userId,
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        amount: 19000,
        currency: "VND",
        locale: "vi",
        status: "paid",
        paidAt: upgradeNow,
      },
      {
        id: historicalUpgradeOrderId,
        paymentCode: "LSVABC123DEG",
        invoiceNumber: "LSV-HISTORICAL-002",
        chartId: "historical-direct-vnd-chart",
        chartVersionId: "historical-direct-vnd-version",
        ownerId: userId,
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        status: "paid",
        creditApplied: 19000,
        creditedFromOrderId: historicalOrderId,
        creditExpiresAt: new Date("2026-09-20T00:00:00.000Z"),
        paidAt: upgradeNow,
      },
    ]);
    await database.insert(commerceEntitlements).values({
      id: historicalEntitlementId,
      orderId: historicalUpgradeOrderId,
      chartId: "historical-direct-vnd-chart",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
      createdAt: upgradeNow,
    });

    await client`DROP TABLE IF EXISTS generated_preview_sections`;
    await client`DROP TABLE IF EXISTS generated_preview_requests`;
    await client`
      DROP TRIGGER IF EXISTS auth_users_wallet_owner_state_guard
      ON auth_users
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_restoration_allocations_ledger_reconciliation
      ON wallet_restoration_allocations
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_spend_allocations_ledger_reconciliation
      ON wallet_spend_allocations
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_credit_lots_ledger_reconciliation
      ON wallet_credit_lots
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_ledger_entries_reconciliation
      ON wallet_ledger_entries
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_transactions_ledger_reconciliation
      ON wallet_transactions
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_command_receipts_immutable
      ON wallet_command_receipts
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_command_receipts_relation_guard
      ON wallet_command_receipts
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_spend_allocations_immutable
      ON wallet_spend_allocations
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_spend_allocations_relation_guard
      ON wallet_spend_allocations
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_restoration_allocations_immutable
      ON wallet_restoration_allocations
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_restoration_allocations_relation_guard
      ON wallet_restoration_allocations
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_credit_lots_relation_guard
      ON wallet_credit_lots
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_credit_lots_source_immutable
      ON wallet_credit_lots
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_ledger_entries_immutable
      ON wallet_ledger_entries
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_transactions_immutable
      ON wallet_transactions
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_transactions_relation_guard
      ON wallet_transactions
    `;
    await client`
      DROP TRIGGER IF EXISTS wallet_accounts_owner_guard
      ON wallet_accounts
    `;
    await client`
      DROP TRIGGER IF EXISTS commerce_entitlements_ledger_relation_guard
      ON commerce_entitlements
    `;
    await client`DROP FUNCTION IF EXISTS prevent_wallet_immutable_mutation()`;
    await client`DROP FUNCTION IF EXISTS prevent_wallet_credit_lot_source_mutation()`;
    await client`DROP FUNCTION IF EXISTS enforce_wallet_ledger_reconciliation()`;
    await client`DROP FUNCTION IF EXISTS enforce_wallet_owner_account_state()`;
    await client`DROP FUNCTION IF EXISTS enforce_wallet_relations()`;
    await client`
      ALTER TABLE commerce_entitlements
      DROP CONSTRAINT IF EXISTS commerce_entitlements_authority_xor
    `;
    await client`DROP INDEX IF EXISTS commerce_entitlements_ledger_spend_unique`;
    await client`
      ALTER TABLE commerce_entitlements
      DROP CONSTRAINT IF EXISTS commerce_entitlements_ledger_spend_id_wallet_transactions_id_fk
    `;
    await client`
      ALTER TABLE commerce_entitlements
      DROP COLUMN IF EXISTS ledger_spend_id
    `;
    await client`
      ALTER TABLE commerce_entitlements
      ALTER COLUMN order_id SET NOT NULL
    `;
    await client`DROP TABLE IF EXISTS wallet_command_receipts`;
    await client`DROP TABLE IF EXISTS wallet_restoration_allocations`;
    await client`DROP TABLE IF EXISTS wallet_spend_allocations`;
    await client`DROP TABLE IF EXISTS wallet_ledger_entries`;
    await client`DROP TABLE IF EXISTS wallet_credit_lots`;
    await client`DROP TABLE IF EXISTS wallet_transactions`;
    await client`DROP TABLE IF EXISTS wallet_purchase_intents`;
    await client`DROP TABLE IF EXISTS wallet_accounts`;
    await client`DELETE FROM commerce_orders WHERE kind = 'wallet_topup'`;
    await client`
      ALTER TABLE commerce_orders
      DROP CONSTRAINT IF EXISTS commerce_orders_kind_fields
    `;
    await client`
      ALTER TABLE commerce_orders
      DROP CONSTRAINT IF EXISTS commerce_orders_kind_valid
    `;
    await client`DROP INDEX IF EXISTS commerce_orders_chart_sku_unique`;
    await client`ALTER TABLE commerce_orders DROP COLUMN IF EXISTS kind`;
    await client`
      ALTER TABLE commerce_orders
      ALTER COLUMN chart_id SET NOT NULL
    `;
    await client`
      ALTER TABLE commerce_orders
      ALTER COLUMN chart_version_id SET NOT NULL
    `;
    await client`
      CREATE UNIQUE INDEX commerce_orders_chart_sku_unique
      ON commerce_orders USING btree (chart_id, sku)
      WHERE status = 'pending'
    `;
    await client`
      ALTER TABLE report_reservations
      DROP CONSTRAINT IF EXISTS report_reservations_reading_context_revision_id_birth_profile_reading_context_revisions_id_fk
    `;
    await client`DROP INDEX IF EXISTS report_reservations_reading_context_revision_idx`;
    await client`
      ALTER TABLE report_reservations
      DROP COLUMN IF EXISTS reading_context_revision_id
    `;
    await client`DROP TABLE IF EXISTS admin_report_recovery_receipts`;
    await client`DROP TABLE IF EXISTS report_section_checkpoint_revisions`;
    await client`DROP TABLE IF EXISTS support_cases`;
    await client`DROP TABLE IF EXISTS report_assets`;
    await client`
      ALTER TABLE ai_usage_outcomes
      DROP CONSTRAINT IF EXISTS ai_usage_outcomes_invalid_output_reason_relation
    `;
    await client`
      ALTER TABLE ai_usage_outcomes
      DROP CONSTRAINT IF EXISTS ai_usage_outcomes_invalid_output_reason_valid
    `;
    await client`
      ALTER TABLE ai_usage_outcomes
      DROP COLUMN IF EXISTS invalid_output_reason
    `;
    await client`
      DELETE FROM drizzle.__drizzle_migrations
      WHERE created_at IN (
        1790064000000,
        1790553600000,
        1790640000000,
        1790726400000,
        1790812800000,
        1790812860000,
        1790812920000,
        1790812980000,
        1790813040000
      )
    `;

    const [latestBefore] = await client<{ created_at: string }[]>`
      SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
    `;
    expect(Number(latestBefore?.created_at)).toBe(1789977600000);

    await runMigrations(databaseUrl);

    const [latestAfter] = await client<{ created_at: string }[]>`
      SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
    `;
    expect(Number(latestAfter?.created_at)).toBe(1790813040000);

    const reappliedMigrations = await client<{ created_at: string }[]>`
      SELECT created_at
      FROM drizzle.__drizzle_migrations
      WHERE created_at IN (
        1790064000000,
        1790553600000,
        1790640000000,
        1790726400000,
        1790812800000,
        1790812860000,
        1790812920000,
        1790812980000,
        1790813040000
      )
      ORDER BY created_at ASC
    `;
    expect(reappliedMigrations.map((migration) => Number(migration.created_at))).toEqual([
      1790064000000,
      1790553600000,
      1790640000000,
      1790726400000,
      1790812800000,
      1790812860000,
      1790812920000,
      1790812980000,
      1790813040000,
    ]);

    const [recoveryReceiptTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admin_report_recovery_receipts'
      ) as exists
    `;
    expect(recoveryReceiptTableCheck?.exists).toBe(true);

    const [checkpointTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'report_section_checkpoints'
      ) as exists
    `;
    expect(checkpointTableCheck?.exists).toBe(true);

    const [revisionTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'report_section_checkpoint_revisions'
      ) as exists
    `;
    expect(revisionTableCheck?.exists).toBe(true);

    const [revisionForeignKey] = await client<{ delete_rule: string }[]>`
      SELECT delete_rule
      FROM information_schema.referential_constraints
      WHERE constraint_name = 'report_section_checkpoint_revisions_checkpoint_fk'
    `;
    expect(revisionForeignKey?.delete_rule).toBe("RESTRICT");

    const restoredTables = await client<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'wallet_accounts',
          'generated_preview_requests',
          'generated_preview_sections'
        )
      ORDER BY table_name ASC
    `;
    expect(restoredTables.map((table) => table.table_name)).toEqual([
      "generated_preview_requests",
      "generated_preview_sections",
      "wallet_accounts",
    ]);

    const restoredColumns = await client<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'commerce_entitlements' AND column_name = 'ledger_spend_id')
          OR (table_name = 'commerce_orders' AND column_name = 'kind')
        )
      ORDER BY table_name ASC, column_name ASC
    `;
    expect(restoredColumns).toEqual([
      { table_name: "commerce_entitlements", column_name: "ledger_spend_id" },
      { table_name: "commerce_orders", column_name: "kind" },
    ]);

    const restoredConstraints = await client<{ constraint_name: string }[]>`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND constraint_name IN (
          'commerce_entitlements_authority_xor',
          'commerce_orders_kind_valid'
        )
      ORDER BY constraint_name ASC
    `;
    expect(restoredConstraints.map((constraint) => constraint.constraint_name)).toEqual([
      "commerce_entitlements_authority_xor",
      "commerce_orders_kind_valid",
    ]);

    const [aiTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ai_model_pricing'
      ) as exists
    `;
    expect(aiTableCheck?.exists).toBe(true);

    const [aiDataCheck] = await client<{ count: string }[]>`
      SELECT count(*) FROM ai_model_pricing WHERE pricing_version = 'v1-20260914'
    `;
    expect(Number(aiDataCheck?.count)).toBeGreaterThan(0);

    const [aiDiagnosticColumn] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ai_usage_outcomes'
          AND column_name = 'invalid_output_reason'
      ) as exists
    `;
    expect(aiDiagnosticColumn?.exists).toBe(true);

    const aiDiagnosticConstraints = await client<{ constraint_name: string }[]>`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND constraint_name IN (
          'ai_usage_outcomes_invalid_output_reason_valid',
          'ai_usage_outcomes_invalid_output_reason_relation'
        )
      ORDER BY constraint_name ASC
    `;
    expect(aiDiagnosticConstraints.map((constraint) => constraint.constraint_name)).toEqual([
      "ai_usage_outcomes_invalid_output_reason_relation",
      "ai_usage_outcomes_invalid_output_reason_valid",
    ]);

    const [readingContextTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'birth_profile_reading_contexts'
      ) as exists
    `;
    expect(readingContextTableCheck?.exists).toBe(true);

    const [context] = await database.select().from(birthProfileReadingContexts).where(
      eq(birthProfileReadingContexts.profileId, profileId),
    );
    const [revision] = await database.select().from(birthProfileReadingContextRevisions).where(
      eq(birthProfileReadingContextRevisions.id, revisionId),
    );
    const [visitor] = await database.select().from(analyticsVisitors).where(
      eq(analyticsVisitors.id, visitorId),
    );
    const [event] = await database.select().from(analyticsEvents).where(
      eq(analyticsEvents.id, eventId),
    );
    expect(context).toMatchObject({
      profileId,
      currentRevisionId: revisionId,
      stateVersion: 1,
      lastRevisionNumber: 1,
    });
    expect(revision).toMatchObject({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      lifeStage: "early_career",
      topConcern: "career",
    });
    expect(visitor).toMatchObject({
      id: visitorId,
      userId,
      birthProfileId: profileId,
      linkedAt: upgradeNow,
    });
    expect(event).toMatchObject({
      id: eventId,
      visitorId,
      userId,
      birthProfileId: profileId,
      name: "birth_profile_saved",
      properties: { source: "checkpoint-upgrade" },
    });
    const [historicalUpgrade] = await database.select().from(commerceOrders).where(
      eq(commerceOrders.id, historicalUpgradeOrderId),
    );
    const [historicalEntitlement] = await database.select().from(commerceEntitlements).where(
      eq(commerceEntitlements.id, historicalEntitlementId),
    );
    expect(historicalUpgrade).toMatchObject({
      id: historicalUpgradeOrderId,
      kind: "content_purchase",
      paymentCode: "LSVABC123DEG",
      invoiceNumber: "LSV-HISTORICAL-002",
      creditApplied: 19000,
      creditedFromOrderId: historicalOrderId,
    });
    expect(historicalEntitlement).toMatchObject({
      id: historicalEntitlementId,
      orderId: historicalUpgradeOrderId,
      ledgerSpendId: null,
      ownerId: userId,
    });

    } finally {
      await runMigrations(databaseUrl);
      await client.end();
    }
  });

  it("nulls a reservation context reference when profile hard purge cascades its revision", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "reservation-context-purge-user";
    const profileId = "reservation-context-purge-profile";
    const profileRevisionId = "reservation-context-purge-profile-revision";
    const contextRevisionId = "reservation-context-purge-context-revision";
    const runId = "reservation-context-purge-run";
    const chartId = "reservation-context-purge-chart";
    const chartVersionId = "reservation-context-purge-chart-version";
    const orderId = "00000000-0000-4000-8000-000000000034";
    const entitlementId = "00000000-0000-4000-8000-000000000035";
    const reservationId = "00000000-0000-4000-8000-000000000031";

    await database.insert(authUsers).values({
      id: userId,
      name: "Reservation Context Purge User",
      email: "reservation-context-purge@example.test",
    });
    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({
      id: profileRevisionId,
      profileId,
      revisionNumber: 1,
      originalInput: {},
      normalizedInput: {},
      consentVersion: "privacy.v1",
    });
    await database.insert(birthProfileReadingContextRevisions).values({
      id: contextRevisionId,
      profileId,
      revisionNumber: 1,
      lifeStage: "early_career",
    });
    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      profileRevisionId,
      idempotencyKey: "reservation-context-purge-run",
      engineId: "ziwei.iztro",
      engineVersion: "1",
      adapterId: "iztro",
      adapterVersion: "1",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
    });
    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId,
      profileRevisionId,
    });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId,
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: "LSV-RESERVATION-CONTEXT-PURGE",
      chartId,
      chartVersionId,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    await database.insert(reportReservations).values({
      id: reservationId,
      reportId: "00000000-0000-4000-8000-000000000032",
      reportVersionId: "00000000-0000-4000-8000-000000000033",
      entitlementId,
      chartVersionId,
      evidenceVersionId: "reservation-context-purge-evidence",
      knowledgeVersionId: "knowledge.v1",
      promptVersion: "prompt.v1",
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      readingContextRevisionId: contextRevisionId,
    });

    await database.delete(birthProfiles).where(eq(birthProfiles.id, profileId));

    const [reservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.id, reservationId));
    expect(reservation).toBeDefined();
    expect(reservation?.readingContextRevisionId).toBeNull();
  });
});
