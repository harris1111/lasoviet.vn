import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TIER_1_ENTITLEMENT_SCOPE,
  TIER_2_ENTITLEMENT_SCOPE,
} from "@lasoviet/contracts";
import {
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  evidenceSets,
  reportReservations,
  reportVersions,
  runMigrations,
  walletAccounts,
  walletPurchaseIntents,
  walletSpendAllocations,
  walletTransactions,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";

import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createDatabaseReportGenerationSourceRepository } from "./report-generation.repository.js";
import { createDatabaseReportQueryRepository } from "./report-query.repository.js";

describe("report query repository wallet authority", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_report_query_authority_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function ownerFixture() {
    const userId = `user-${randomUUID()}`;
    const profileId = `profile-${randomUUID()}`;
    const revisionId = `revision-${randomUUID()}`;
    const chartId = `chart-${randomUUID()}`;
    const chartVersionId = `chart-version-${randomUUID()}`;
    const evidenceId = `evidence-${randomUUID()}`;
    const calculationRunId = randomUUID();
    await database.insert(authUsers).values({
      id: userId,
      name: "Report authority owner",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      originalInput: { version: 1, displayName: "Authority owner" },
      normalizedInput: {},
      consentVersion: "privacy.v1",
    });
    await database.insert(calculationRuns).values({
      id: calculationRunId,
      profileId,
      profileRevisionId: revisionId,
      idempotencyKey: `run-${calculationRunId}`,
      engineId: "ziwei.iztro",
      engineVersion: "1.0",
      adapterId: "iztro",
      adapterVersion: "1.0",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
    });
    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId,
      profileRevisionId: revisionId,
    });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId,
      calculationRunId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });
    await database.insert(evidenceSets).values({
      id: evidenceId,
      chartVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });
    return { userId, profileId, revisionId, chartId, chartVersionId, evidenceId };
  }

  async function addAlternateChart(owner: Awaited<ReturnType<typeof ownerFixture>>) {
    const chartId = `chart-${randomUUID()}`;
    const chartVersionId = `chart-version-${randomUUID()}`;
    const evidenceId = `evidence-${randomUUID()}`;
    const calculationRunId = randomUUID();
    const revisionId = `revision-${randomUUID()}`;
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId: owner.profileId,
      revisionNumber: 2,
      originalInput: { version: 1, displayName: "Alternate chart owner" },
      normalizedInput: {},
      consentVersion: "privacy.v1",
    });
    await database.insert(calculationRuns).values({
      id: calculationRunId,
      profileId: owner.profileId,
      profileRevisionId: revisionId,
      idempotencyKey: `run-${calculationRunId}`,
      engineId: "ziwei.iztro",
      engineVersion: "1.0",
      adapterId: "iztro",
      adapterVersion: "1.0",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
    });
    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId: owner.profileId,
      profileRevisionId: revisionId,
    });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId,
      calculationRunId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });
    await database.insert(evidenceSets).values({
      id: evidenceId,
      chartVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });
    return { chartId, chartVersionId, evidenceId };
  }

  async function addOrder(owner: Awaited<ReturnType<typeof ownerFixture>>) {
    const orderId = randomUUID();
    const entitlementId = randomUUID();
    const reservationId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `LSV-${orderId}`,
      kind: "content_purchase",
      ownerId: owner.userId,
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      amount: 19_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date(),
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      ledgerSpendId: null,
      ownerId: owner.userId,
      chartId: owner.chartId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      scope: TIER_1_ENTITLEMENT_SCOPE,
    });
    await database.insert(reportReservations).values({
      id: reservationId,
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId: owner.chartVersionId,
      evidenceVersionId: owner.evidenceId,
      knowledgeVersionId: "ziwei.identity.knowledge.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "report-config.v1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
    });
    return { orderId, entitlementId, reservationId, reportId, reportVersionId };
  }

  async function addWallet(owner: Awaited<ReturnType<typeof ownerFixture>>) {
    const intentId = randomUUID();
    const entitlementId = randomUUID();
    const reservationId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const authority = { token: {}, actorId: owner.userId };
    const walletRepository = createDatabaseWalletRepository(database, {
      trustedGrantAuthority: authority,
    });
    const granted = await walletRepository.grant({
      targetOwnerId: owner.userId,
      trustedGrantToken: authority.token,
      topUpOrderId: null,
      grant: {
        kind: "grant",
        actorId: owner.userId,
        reasonCode: "test.report.query.credit",
        requestId: `request-${intentId}`,
        traceId: `trace-${intentId}`,
        idempotencyKey: `grant-${intentId}`,
        purchasedLa: 0,
        promotionalLa: 960,
        topUpPackId: null,
      },
    });
    if (!granted.ok) throw new Error("wallet grant fixture failed");
    const [wallet] = await database
      .select({
        id: walletAccounts.id,
        stateVersion: walletAccounts.stateVersion,
      })
      .from(walletAccounts)
      .where(eq(walletAccounts.ownerId, owner.userId));
    if (!wallet || wallet.stateVersion < 1) {
      throw new Error("wallet grant fixture missing account");
    }
    await database.insert(walletPurchaseIntents).values({
      id: intentId,
      ownerId: owner.userId,
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
      priceLa: 960,
      status: "pending",
      stateVersion: 1,
    });
    const spent = await walletRepository.spend({
      actor: {
        kind: "account",
        userId: owner.userId,
        sessionId: `session-${owner.userId}`,
        requestId: `request-${intentId}`,
      },
      spend: {
        kind: "spend",
        actorId: owner.userId,
        reasonCode: "wallet.report.unlock",
        requestId: `request-${intentId}`,
        traceId: `trace-${intentId}`,
        idempotencyKey: `spend-${intentId}`,
        purchaseIntentId: intentId,
        amountLa: 960,
        expectedWalletVersion: wallet.stateVersion,
      },
      continuationResultCodec: {
        safeParse(value) {
          return value !== null && typeof value === "object" && !Array.isArray(value)
            ? { success: true as const, data: {} }
            : { success: false as const };
        },
      },
      continuation: async (transaction, metadata) => {
        const completedAt = new Date();
        await transaction.insert(commerceEntitlements).values({
          id: entitlementId,
          orderId: null,
          ledgerSpendId: metadata.spendTransactionId,
          ownerId: owner.userId,
          chartId: owner.chartId,
          sku: "ZIWEI-IDENTITY-P0",
          scope: TIER_2_ENTITLEMENT_SCOPE,
        });
        await transaction.insert(reportReservations).values({
          id: reservationId,
          reportId,
          reportVersionId,
          entitlementId,
          chartVersionId: owner.chartVersionId,
          evidenceVersionId: owner.evidenceId,
          knowledgeVersionId: "ziwei.identity.knowledge.v1",
          promptVersion: "ziwei.identity.prompt.v1",
          reportConfigVersion: "report-config.v1",
          locale: "vi",
          sku: "ZIWEI-IDENTITY-P0",
        });
        const [completedIntent] = await transaction
          .update(walletPurchaseIntents)
          .set({
            status: "completed",
            stateVersion: 2,
            completedAt,
          })
          .where(
            and(
              eq(walletPurchaseIntents.id, intentId),
              eq(walletPurchaseIntents.status, "pending"),
              eq(walletPurchaseIntents.stateVersion, 1),
            ),
          )
          .returning({ id: walletPurchaseIntents.id });
        if (!completedIntent) {
          throw new Error("wallet spend fixture intent completion failed");
        }
        return {};
      },
    });
    if (!spent.ok) throw new Error(`wallet spend fixture failed: ${spent.error.code}`);
    const [spend] = await database
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(eq(walletTransactions.purchaseIntentId, intentId));
    if (!spend) throw new Error("wallet spend fixture missing transaction");
    return { entitlementId, intentId, spendId: spend.id, reservationId, reportId, reportVersionId };
  }

  async function addBareWalletSpend(owner: Awaited<ReturnType<typeof ownerFixture>>) {
    const intentId = randomUUID();
    const authority = { token: {}, actorId: owner.userId };
    const walletRepository = createDatabaseWalletRepository(database, {
      trustedGrantAuthority: authority,
    });
    const granted = await walletRepository.grant({
      targetOwnerId: owner.userId,
      trustedGrantToken: authority.token,
      topUpOrderId: null,
      grant: {
        kind: "grant",
        actorId: owner.userId,
        reasonCode: "test.report.query.bare-credit",
        requestId: `request-${intentId}`,
        traceId: `trace-${intentId}`,
        idempotencyKey: `grant-${intentId}`,
        purchasedLa: 0,
        promotionalLa: 240,
        topUpPackId: null,
      },
    });
    if (!granted.ok) throw new Error("bare wallet grant fixture failed");
    const [wallet] = await database
      .select({ stateVersion: walletAccounts.stateVersion })
      .from(walletAccounts)
      .where(eq(walletAccounts.ownerId, owner.userId));
    if (!wallet || wallet.stateVersion < 1) {
      throw new Error("bare wallet grant fixture missing account");
    }
    await database.insert(walletPurchaseIntents).values({
      id: intentId,
      ownerId: owner.userId,
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
      priceLa: 240,
      status: "pending",
      stateVersion: 1,
    });
    const spent = await walletRepository.spend({
      actor: {
        kind: "account",
        userId: owner.userId,
        sessionId: `session-${owner.userId}`,
        requestId: `request-${intentId}`,
      },
      spend: {
        kind: "spend",
        actorId: owner.userId,
        reasonCode: "test.report.query.bare-spend",
        requestId: `request-${intentId}`,
        traceId: `trace-${intentId}`,
        idempotencyKey: `spend-${intentId}`,
        purchaseIntentId: intentId,
        amountLa: 240,
        expectedWalletVersion: wallet.stateVersion,
      },
    });
    if (!spent.ok) throw new Error(`bare wallet spend fixture failed: ${spent.error.code}`);
    const [spend] = await database
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(eq(walletTransactions.purchaseIntentId, intentId));
    if (!spend) throw new Error("bare wallet spend fixture missing transaction");
    return spend.id;
  }

  function generationRepository() {
    return createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval: { retrieveKnowledge: async () => [] },
    });
  }

  async function validateWalletLifecycle(
    wallet: Awaited<ReturnType<typeof addWallet>>,
    jobId = `job-${randomUUID()}`,
  ) {
    await database.update(reportReservations).set({ activeJobId: jobId })
      .where(eq(reportReservations.id, wallet.reservationId));
    return generationRepository().validateLifecycle({
      reportVersionId: wallet.reportVersionId,
      jobId,
      readingContextRevisionId: null,
    });
  }

  async function restoreWallet(
    owner: Awaited<ReturnType<typeof ownerFixture>>,
    originalSpendId: string,
  ) {
    const [wallet] = await database.select({ stateVersion: walletAccounts.stateVersion })
      .from(walletAccounts)
      .where(eq(walletAccounts.ownerId, owner.userId));
    if (!wallet) throw new Error("wallet restoration fixture missing account");
    const restored = await createDatabaseWalletRepository(database).restore({
      actor: {
        kind: "account",
        userId: owner.userId,
        sessionId: `session-${owner.userId}`,
        requestId: `restore-request-${originalSpendId}`,
      },
      restoration: {
        kind: "restoration",
        actorId: owner.userId,
        reasonCode: "test.report.query.restoration",
        requestId: `restore-request-${originalSpendId}`,
        traceId: `restore-trace-${originalSpendId}`,
        idempotencyKey: `restore-${originalSpendId}`,
        originalSpendId,
        expectedWalletVersion: wallet.stateVersion,
      },
    });
    if (!restored.ok) throw new Error(`wallet restoration fixture failed: ${restored.error.code}`);
  }

  it("reads valid paid order and wallet authorities and unions mixed active scopes", async () => {
    const owner = await ownerFixture();
    const order = await addOrder(owner);
    const wallet = await addWallet(owner);
    const repository = createDatabaseReportQueryRepository(database);

    const historical = await repository.readAuthorizedReport(owner.userId, order.reportId);
    expect(historical?.source).toBe("order");
    expect(historical?.source === "order" && historical.order.id).toBe(order.orderId);

    const walletRead = await repository.readAuthorizedReport(owner.userId, wallet.reportId);
    expect(walletRead?.source).toBe("ledger_spend");
    expect(walletRead?.entitlements).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: order.entitlementId, active: true, source: "order" }),
      expect.objectContaining({ id: wallet.entitlementId, active: true, source: "ledger_spend" }),
    ]));
    await expect(validateWalletLifecycle(wallet)).resolves.toEqual({
      ok: true,
      value: { readingContextRevisionId: null },
    });
  });

  it("fails closed for another owner, actual restoration, pending, and cancelled wallet authority", async () => {
    const owner = await ownerFixture();
    const other = await ownerFixture();
    const wallet = await addWallet(owner);
    const repository = createDatabaseReportQueryRepository(database);
    expect(await repository.readAuthorizedReport(other.userId, wallet.reportId)).toBeNull();

    await restoreWallet(owner, wallet.spendId);
    expect(await repository.readAuthorizedReport(owner.userId, wallet.reportId)).toBeNull();
    await expect(validateWalletLifecycle(wallet)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_CONTEXT_MISMATCH" },
    });

    const pendingOwner = await ownerFixture();
    const pendingWallet = await addWallet(pendingOwner);
    await database.update(walletPurchaseIntents).set({ status: "pending", completedAt: null })
      .where(eq(walletPurchaseIntents.id, pendingWallet.intentId));
    expect(await repository.readAuthorizedReport(pendingOwner.userId, pendingWallet.reportId)).toBeNull();
    await database.update(walletPurchaseIntents).set({ status: "cancelled" })
      .where(eq(walletPurchaseIntents.id, pendingWallet.intentId));
    expect(await repository.readAuthorizedReport(pendingOwner.userId, pendingWallet.reportId)).toBeNull();
  });

  it("rejects database corruption and readers fail closed for source, reservation, and version lineage", async () => {
    const owner = await ownerFixture();
    const order = await addOrder(owner);
    const bareSpendId = await addBareWalletSpend(owner);
    const repository = createDatabaseReportQueryRepository(database);

    await expect(database.update(commerceEntitlements).set({ ledgerSpendId: bareSpendId })
      .where(eq(commerceEntitlements.id, order.entitlementId))).rejects.toBeDefined();

    await database.execute(sql`
      ALTER TABLE commerce_entitlements
      DISABLE TRIGGER commerce_entitlements_ledger_relation_guard
    `);
    try {
      await database.execute(sql`
        ALTER TABLE commerce_entitlements
        DROP CONSTRAINT commerce_entitlements_authority_xor
      `);
      await database.update(commerceEntitlements).set({ ledgerSpendId: bareSpendId })
        .where(eq(commerceEntitlements.id, order.entitlementId));
      expect(await repository.readAuthorizedReport(owner.userId, order.reportId)).toBeNull();
    } finally {
      await database.update(commerceEntitlements).set({ ledgerSpendId: null })
        .where(eq(commerceEntitlements.id, order.entitlementId));
      await database.execute(sql`
        ALTER TABLE commerce_entitlements
        ADD CONSTRAINT commerce_entitlements_authority_xor
        CHECK ((order_id IS NOT NULL AND ledger_spend_id IS NULL) OR (order_id IS NULL AND ledger_spend_id IS NOT NULL))
      `);
      await database.execute(sql`
        ALTER TABLE commerce_entitlements
        ENABLE TRIGGER commerce_entitlements_ledger_relation_guard
      `);
    }

    await database.update(reportReservations).set({ locale: "en" })
      .where(eq(reportReservations.id, order.reservationId));
    expect(await repository.readAuthorizedReport(owner.userId, order.reportId)).toBeNull();
    await database.update(reportReservations).set({ locale: "vi" })
      .where(eq(reportReservations.id, order.reservationId));

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: order.reportId,
      reportVersionId: order.reportVersionId,
      entitlementId: order.entitlementId,
      chartVersionId: owner.chartVersionId,
      evidenceVersionId: owner.evidenceId,
      knowledgeVersionId: "wrong-knowledge",
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "report-config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      providerId: "test",
      modelId: "test",
      structuredContent: {},
      htmlContent: "",
      contentHash: "d".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "render.v1",
    });
    expect(await repository.readAuthorizedReport(owner.userId, order.reportId)).toBeNull();
  });

  it("fails closed for allocation corruption after the active database guard rejects it", async () => {
    const owner = await ownerFixture();
    const wallet = await addWallet(owner);
    const repository = createDatabaseReportQueryRepository(database);
    const [allocation] = await database.select({ id: walletSpendAllocations.id })
      .from(walletSpendAllocations)
      .where(eq(walletSpendAllocations.spendTransactionId, wallet.spendId));
    if (!allocation) throw new Error("wallet fixture allocation missing");

    await expect(database.update(walletSpendAllocations).set({ amountLa: 959 })
      .where(eq(walletSpendAllocations.id, allocation.id))).rejects.toBeDefined();

    await database.execute(sql`
      ALTER TABLE wallet_spend_allocations
      DISABLE TRIGGER wallet_spend_allocations_immutable
    `);
    await database.execute(sql`
      ALTER TABLE wallet_spend_allocations
      DISABLE TRIGGER wallet_spend_allocations_ledger_reconciliation
    `);
    try {
      await database.update(walletSpendAllocations).set({ amountLa: 959 })
        .where(eq(walletSpendAllocations.id, allocation.id));
      expect(await repository.readAuthorizedReport(owner.userId, wallet.reportId)).toBeNull();
      await expect(validateWalletLifecycle(wallet)).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_CONTEXT_MISMATCH" },
      });
    } finally {
      await database.update(walletSpendAllocations).set({ amountLa: 960 })
        .where(eq(walletSpendAllocations.id, allocation.id));
      await database.execute(sql`
        ALTER TABLE wallet_spend_allocations
        ENABLE TRIGGER wallet_spend_allocations_ledger_reconciliation
      `);
      await database.execute(sql`
        ALTER TABLE wallet_spend_allocations
        ENABLE TRIGGER wallet_spend_allocations_immutable
      `);
    }
  });

  it("fails lifecycle closed for cross-owner profile and cross-chart-version lineage", async () => {
    const owner = await ownerFixture();
    const other = await ownerFixture();
    const wallet = await addWallet(owner);

    await database.update(ziweiCharts).set({ profileId: other.profileId })
      .where(eq(ziweiCharts.id, owner.chartId));
    await expect(validateWalletLifecycle(wallet)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_CONTEXT_MISMATCH" },
    });
    await database.update(ziweiCharts).set({ profileId: owner.profileId })
      .where(eq(ziweiCharts.id, owner.chartId));

    const alternate = await addAlternateChart(owner);
    await database.update(walletPurchaseIntents).set({
      chartVersionId: alternate.chartVersionId,
    }).where(eq(walletPurchaseIntents.id, wallet.intentId));
    await database.update(reportReservations).set({
      chartVersionId: alternate.chartVersionId,
      evidenceVersionId: alternate.evidenceId,
    }).where(eq(reportReservations.id, wallet.reservationId));
    await expect(validateWalletLifecycle(wallet)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_CONTEXT_MISMATCH" },
    });
  });

  it("excludes corrupt order chart-version lineage from the mixed chart scope union", async () => {
    const owner = await ownerFixture();
    const order = await addOrder(owner);
    const wallet = await addWallet(owner);
    const alternate = await addAlternateChart(owner);
    const repository = createDatabaseReportQueryRepository(database);

    await database.update(commerceOrders).set({ chartVersionId: alternate.chartVersionId })
      .where(eq(commerceOrders.id, order.orderId));
    await database.update(reportReservations).set({
      chartVersionId: alternate.chartVersionId,
      evidenceVersionId: alternate.evidenceId,
    }).where(eq(reportReservations.id, order.reservationId));
    const record = await repository.readAuthorizedReport(owner.userId, wallet.reportId);
    expect(record?.source).toBe("ledger_spend");
    expect(record?.entitlements).toEqual([
      expect.objectContaining({ id: wallet.entitlementId, source: "ledger_spend" }),
    ]);
  });

  it("fails closed for wallet report-version corruption", async () => {
    const owner = await ownerFixture();
    const wallet = await addWallet(owner);
    const repository = createDatabaseReportQueryRepository(database);
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: wallet.reportId,
      reportVersionId: wallet.reportVersionId,
      entitlementId: wallet.entitlementId,
      chartVersionId: owner.chartVersionId,
      evidenceVersionId: owner.evidenceId,
      knowledgeVersionId: "wrong-knowledge",
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "report-config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "test",
      modelId: "test",
      structuredContent: {},
      htmlContent: "",
      contentHash: "d".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "render.v1",
    });
    expect(await repository.readAuthorizedReport(owner.userId, wallet.reportId)).toBeNull();
  });
});
