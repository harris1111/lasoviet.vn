import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  auditLogs,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  evidenceSets,
  outbox,
  reportReservations,
  runMigrations,
  walletAccounts,
  walletCommandReceipts,
  walletLedgerEntries,
  walletPurchaseIntents,
  walletSpendAllocations,
  walletTransactions,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";
import {
  TIER_1_ENTITLEMENT_SCOPE,
  type CurrentActor,
  type WalletGrantV1,
} from "@lasoviet/contracts";

import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createDatabaseCommerceRepository } from "./commerce.repository.js";
import { createWalletUnlockService } from "./wallet-unlock.service.js";
import {
  deriveReportTimingLineage,
  v4_1SensitivityReportVersions,
} from "../reports/identity-report-config.js";

describe("wallet unlock repository integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;
  const frozenNow = new Date("2026-09-17T12:00:00.000Z");

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_wallet_unlock_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  function actor(userId: string): CurrentActor {
    return {
      kind: "account",
      userId,
      sessionId: `session-${userId}`,
      requestId: `request-${userId}`,
    };
  }

  function grant(userId: string, idempotencyKey: string, promotionalLa = 2_000): WalletGrantV1 {
    return {
      version: 1,
      kind: "grant",
      actorId: userId,
      reasonCode: "test.wallet.unlock.credit",
      requestId: `request-${idempotencyKey}`,
      traceId: `trace-${idempotencyKey}`,
      idempotencyKey,
      purchasedLa: 0,
      promotionalLa,
      topUpPackId: null,
    };
  }

  function walletPorts(auditActorId: string, options: { reportVersionResolver?: Parameters<typeof createWalletUnlockService>[2]["reportVersionResolver"] } = {}) {
    const authority = { token: {}, actorId: auditActorId };
    const repository = createDatabaseWalletRepository(database, {
      now: () => frozenNow,
      trustedGrantAuthority: authority,
    });
    return {
      authority,
      repository,
      service: createWalletUnlockService(database, createWalletService(repository), {
        now: () => frozenNow,
        reportVersionResolver: options.reportVersionResolver,
      }),
    };
  }

  async function ownerFixture(name: string) {
    const userId = `user-${randomUUID()}`;
    const profileId = `profile-${randomUUID()}`;
    const revisionId = `revision-${randomUUID()}`;
    const chartId = `chart-${randomUUID()}`;
    const chartVersionId = `chart-version-${randomUUID()}`;
    const evidenceId = `evidence-${randomUUID()}`;
    const runId = randomUUID();

    await database.insert(authUsers).values({
      id: userId,
      name,
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      originalInput: { version: 1, displayName: name },
      normalizedInput: {},
      consentVersion: "privacy.v1",
    });
    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      profileRevisionId: revisionId,
      idempotencyKey: `run-${runId}`,
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
      calculationRunId: runId,
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
    return { userId, chartId, chartVersionId, evidenceId, actor: actor(userId) };
  }

  async function insertPaidTierOne(owner: Awaited<ReturnType<typeof ownerFixture>>, paidAt: Date) {
    const orderId = randomUUID();
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `LSV-${orderId}`,
      ownerId: owner.userId,
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      kind: "content_purchase",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      amount: 19_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt,
    });
    await database.insert(commerceEntitlements).values({
      orderId,
      ledgerSpendId: null,
      chartId: owner.chartId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      ownerId: owner.userId,
      scope: TIER_1_ENTITLEMENT_SCOPE,
    });
  }

  it("uses exact 240, 720, and 960 Lá pricing, preserves pending reuse, and closes FD-041 at +7 days", async () => {
    const audit = await ownerFixture("Audit pricing");
    const base = await ownerFixture("Base pricing");
    const withinWindow = await ownerFixture("Within window");
    const boundary = await ownerFixture("Boundary");
    const { service } = walletPorts(audit.userId);

    await insertPaidTierOne(withinWindow, new Date(frozenNow.getTime() - (7 * 24 * 60 * 60 * 1_000) + 1));
    await insertPaidTierOne(boundary, new Date(frozenNow.getTime() - (7 * 24 * 60 * 60 * 1_000)));

    const tierOne = await service.createPurchaseIntent(base.actor, {
      chartId: base.chartId,
      chartVersionId: base.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
    });
    const tierTwo = await service.createPurchaseIntent(base.actor, {
      chartId: base.chartId,
      chartVersionId: base.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "en",
    });
    const tierTwoReplay = await service.createPurchaseIntent(base.actor, {
      chartId: base.chartId,
      chartVersionId: base.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "en",
    });
    const tierTwoConflict = await service.createPurchaseIntent(base.actor, {
      chartId: base.chartId,
      chartVersionId: base.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    const upgrade = await service.createPurchaseIntent(withinWindow.actor, {
      chartId: withinWindow.chartId,
      chartVersionId: withinWindow.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    const expiredUpgrade = await service.createPurchaseIntent(boundary.actor, {
      chartId: boundary.chartId,
      chartVersionId: boundary.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });

    expect(tierOne).toMatchObject({ ok: true, value: { amountLa: 240, locale: "vi" }, reused: false });
    expect(tierTwo).toMatchObject({ ok: true, value: { amountLa: 960, locale: "en" }, reused: false });
    expect(tierTwoReplay).toMatchObject({ ok: true, value: { amountLa: 960, locale: "en" }, reused: true });
    expect(tierTwoConflict).toEqual({ ok: false, code: "WALLET_INTENT_VERSION_CONFLICT" });
    expect(upgrade).toMatchObject({ ok: true, value: { amountLa: 720 }, reused: false });
    expect(expiredUpgrade).toMatchObject({ ok: true, value: { amountLa: 960 }, reused: false });
  });

  it("atomically unlocks exactly once under matching concurrent retries and keeps customer ownership isolated", async () => {
    const audit = await ownerFixture("Audit unlock");
    const owner = await ownerFixture("Wallet owner");
    const outsider = await ownerFixture("Wallet outsider");
    const { authority, repository, service } = walletPorts(audit.userId);
    const funded = await repository.grant({
      targetOwnerId: owner.userId,
      grant: grant(audit.userId, `grant-${randomUUID()}`),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!funded.ok) throw new Error(`grant failed: ${funded.error.code}`);
    const intentResult = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    if (!intentResult.ok) throw new Error(`intent failed: ${intentResult.code}`);
    const idempotencyKey = `unlock-${randomUUID()}`;
    const command = () => service.unlock(owner.actor, {
      purchaseIntentId: intentResult.value.id,
      expectedIntentVersion: 1,
      expectedWalletVersion: 2,
      idempotencyKey,
    });
    const [first, replay] = await Promise.all([command(), command()]);
    expect([first, replay].filter((result) => result.ok)).toHaveLength(2);
    expect([first, replay].filter((result) => result.ok && result.value.intent.status === "completed")).toHaveLength(2);
    if (!first.ok || !replay.ok) throw new Error("unlock did not complete");
    expect(first.value.reportId).toBe(replay.value.reportId);
    expect(await service.unlock(outsider.actor, {
      purchaseIntentId: intentResult.value.id,
      expectedIntentVersion: 1,
      expectedWalletVersion: 2,
      idempotencyKey: `outsider-${randomUUID()}`,
    })).toEqual({ ok: false, code: "WALLET_INTENT_VERSION_CONFLICT" });

    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    const spends = await database.select().from(walletTransactions).where(and(
      eq(walletTransactions.walletId, wallet!.id),
      eq(walletTransactions.kind, "spend"),
      eq(walletTransactions.idempotencyKey, idempotencyKey),
    ));
    const entitlements = await database.select().from(commerceEntitlements)
      .where(eq(commerceEntitlements.ledgerSpendId, spends[0]!.id));
    const reservations = await database.select().from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlements[0]!.id));
    const receipts = await database.select().from(walletCommandReceipts).where(and(
      eq(walletCommandReceipts.walletId, wallet!.id),
      eq(walletCommandReceipts.idempotencyKey, idempotencyKey),
    ));
    const audits = await database.select().from(auditLogs).where(and(
      eq(auditLogs.targetId, wallet!.id),
      eq(auditLogs.action, "wallet.spend"),
    ));
    const events = await database.select().from(outbox).where(eq(outbox.aggregateId, reservations[0]!.reportId));
    const allocations = await database.select().from(walletSpendAllocations)
      .where(eq(walletSpendAllocations.spendTransactionId, spends[0]!.id));
    const ledgerEntries = await database.select().from(walletLedgerEntries)
      .where(eq(walletLedgerEntries.transactionId, spends[0]!.id));

    expect(spends).toHaveLength(1);
    expect(entitlements).toEqual([expect.objectContaining({
      ownerId: owner.userId,
      orderId: null,
      ledgerSpendId: spends[0]!.id,
      chartId: owner.chartId,
      sku: "ZIWEI-IDENTITY-P0",
    })]);
    expect(reservations).toEqual([expect.objectContaining({
      chartVersionId: owner.chartVersionId,
      evidenceVersionId: owner.evidenceId,
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
    })]);
    expect(events).toHaveLength(1);
    expect(receipts).toHaveLength(1);
    expect(audits).toHaveLength(1);
    expect(allocations).toHaveLength(1);
    expect(ledgerEntries).toHaveLength(1);
    expect(wallet).toMatchObject({ promotionalBalance: 1_040, purchasedBalance: 0, stateVersion: 3 });
  });

  it("persists V4.1 sensitivity timing lineage and a V2 generation request for wallet unlock", async () => {
    const audit = await ownerFixture("Audit V4.1 wallet unlock");
    const owner = await ownerFixture("V4.1 wallet unlock owner");
    const { authority, repository, service } = walletPorts(audit.userId, {
      reportVersionResolver: () => v4_1SensitivityReportVersions("vi"),
    });
    const funded = await repository.grant({
      targetOwnerId: owner.userId,
      grant: grant(audit.userId, `v4-1-grant-${randomUUID()}`, 960),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!funded.ok) throw new Error(`grant failed: ${funded.error.code}`);

    const intent = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    if (!intent.ok) throw new Error(`intent failed: ${intent.code}`);
    const unlocked = await service.unlock(owner.actor, {
      purchaseIntentId: intent.value.id,
      expectedIntentVersion: 1,
      expectedWalletVersion: 2,
      idempotencyKey: `v4-1-unlock-${randomUUID()}`,
    });
    if (!unlocked.ok) throw new Error(`unlock failed: ${unlocked.code}`);

    const [reservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportId, unlocked.value.reportId));
    const [event] = await database
      .select()
      .from(outbox)
      .where(eq(outbox.idempotencyKey, `report-request:${reservation!.reportVersionId}`));
    const timing = deriveReportTimingLineage(frozenNow);

    expect(reservation).toMatchObject({
      knowledgeVersionId: "ziwei.comprehensive.knowledge.v4",
      promptVersion: "ziwei.comprehensive.prompt.v4.1-sensitivity",
      reportConfigVersion: "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
      asOfDate: timing.asOfDate,
      targetYear: timing.targetYear,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
    });
    expect(event?.eventType).toBe("report.generation.requested.v2");
    expect(event?.payload).toMatchObject({
      knowledgeVersionId: "ziwei.comprehensive.knowledge.v4",
      promptVersion: "ziwei.comprehensive.prompt.v4.1-sensitivity",
      reportConfigVersion: "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
      asOfDate: timing.asOfDate,
      targetYear: timing.targetYear,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      readingContextRevisionId: null,
    });
  });

  it("replays a completed matching unlock sequentially and rejects shape-valid corrupted continuation lineage", async () => {
    const audit = await ownerFixture("Audit sequential replay");
    const owner = await ownerFixture("Sequential replay owner");
    const { authority, repository, service } = walletPorts(audit.userId);
    const funded = await repository.grant({
      targetOwnerId: owner.userId,
      grant: grant(audit.userId, `sequential-grant-${randomUUID()}`, 240),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!funded.ok) throw new Error(`grant failed: ${funded.error.code}`);
    const intent = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
    });
    if (!intent.ok) throw new Error(`intent failed: ${intent.code}`);
    const request = {
      purchaseIntentId: intent.value.id,
      expectedIntentVersion: 1,
      expectedWalletVersion: 2,
      idempotencyKey: `sequential-unlock-${randomUUID()}`,
    };
    const completed = await service.unlock(owner.actor, request);
    const replay = await service.unlock(owner.actor, request);
    expect(completed).toMatchObject({ ok: true, value: { intent: { status: "completed" } } });
    expect(replay).toMatchObject({ ok: true, value: { intent: { status: "completed" } } });
    if (!completed.ok || !replay.ok) throw new Error("expected completed unlock and replay");
    expect(replay.value.reportId).toBe(completed.value.reportId);
    await expect(service.unlock(owner.actor, {
      ...request,
      expectedIntentVersion: 2,
    })).resolves.toEqual({ ok: false, code: "WALLET_IDEMPOTENCY_KEY_REUSED" });
    await expect(service.unlock(owner.actor, {
      ...request,
      idempotencyKey: `completed-intent-new-key-${randomUUID()}`,
    })).resolves.toEqual({ ok: false, code: "WALLET_INTENT_VERSION_CONFLICT" });

    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    const [receipt] = await database.select().from(walletCommandReceipts).where(and(
      eq(walletCommandReceipts.walletId, wallet!.id),
      eq(walletCommandReceipts.idempotencyKey, request.idempotencyKey),
    ));
    const stored = receipt!.result as { receipt: unknown; continuation: Record<string, unknown> };
    await database.execute(sql`alter table wallet_command_receipts disable trigger all`);
    try {
      await database.update(walletCommandReceipts).set({
        result: {
          receipt: stored.receipt,
          continuation: { ...stored.continuation, outboxId: randomUUID() },
        },
      }).where(eq(walletCommandReceipts.id, receipt!.id));
    } finally {
      await database.execute(sql`alter table wallet_command_receipts enable trigger all`);
    }

    await expect(service.unlock(owner.actor, request))
      .resolves.toEqual({ ok: false, code: "WALLET_RECONCILIATION_FAILED" });
    expect(await database.select().from(walletTransactions).where(and(
      eq(walletTransactions.walletId, wallet!.id),
      eq(walletTransactions.kind, "spend"),
    ))).toHaveLength(1);
  });

  it("serializes a direct-VND payment ahead of a wallet unlock and rolls back the losing wallet path", async () => {
    const audit = await ownerFixture("Audit direct wallet race");
    const owner = await ownerFixture("Direct wallet race owner");
    const { authority, repository, service } = walletPorts(audit.userId);
    const funded = await repository.grant({
      targetOwnerId: owner.userId,
      grant: grant(audit.userId, `direct-wallet-race-grant-${randomUUID()}`, 240),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!funded.ok) throw new Error(`grant failed: ${funded.error.code}`);
    const intent = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
    });
    if (!intent.ok) throw new Error(`intent failed: ${intent.code}`);
    const commerce = createDatabaseCommerceRepository(database);
    const order = await commerce.createOrder(owner.actor, owner.chartId, "ZIWEI-NATAL-EXCERPT-P0", "vi");
    if (!order.ok) throw new Error(`order failed: ${order.code}`);

    let paid: ReturnType<typeof commerce.recordPaid> | undefined;
    let unlock: ReturnType<typeof service.unlock> | undefined;
    await database.transaction(async (transaction) => {
      await transaction.select().from(commerceOrders).where(eq(commerceOrders.id, order.value.id)).for("update");
      paid = commerce.recordPaid({
        invoiceNumber: order.value.invoiceNumber,
        providerEventId: `direct-wallet-race-paid-${randomUUID()}`,
        amount: 19_000,
        currency: "VND",
        traceId: `direct-wallet-race-${randomUUID()}`,
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      unlock = service.unlock(owner.actor, {
        purchaseIntentId: intent.value.id,
        expectedIntentVersion: 1,
        expectedWalletVersion: 2,
        idempotencyKey: `direct-wallet-race-unlock-${randomUUID()}`,
      });
    });
    const [paidResult, unlockResult] = await Promise.all([paid!, unlock!]);

    expect(paidResult).toMatchObject({ ok: true });
    expect(unlockResult).toEqual({ ok: false, code: "WALLET_INVALID_INTENT" });
    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    expect(wallet).toMatchObject({ promotionalBalance: 240, purchasedBalance: 0, stateVersion: 2 });
    expect(await database.select().from(walletTransactions).where(and(
      eq(walletTransactions.walletId, wallet!.id),
      eq(walletTransactions.kind, "spend"),
    ))).toHaveLength(0);
    expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.chartId, owner.chartId)))
      .toHaveLength(1);
    expect(await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId)))
      .toHaveLength(1);
  });

  it("rechecks verified-account eligibility after acquiring the transactional row lock", async () => {
    const audit = await ownerFixture("Audit authority race");
    const owner = await ownerFixture("Authority race owner");
    const { service } = walletPorts(audit.userId);
    let pending: Promise<Awaited<ReturnType<typeof service.createPurchaseIntent>>> | undefined;

    await database.transaction(async (transaction) => {
      await transaction.select().from(authUsers).where(eq(authUsers.id, owner.userId)).for("update");
      await transaction.update(authUsers).set({ emailVerified: false }).where(eq(authUsers.id, owner.userId));
      pending = service.createPurchaseIntent(owner.actor, {
        chartId: owner.chartId,
        chartVersionId: owner.chartVersionId,
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        locale: "vi",
      });
    });

    await expect(pending).resolves.toEqual({ ok: false, code: "WALLET_ACCOUNT_INELIGIBLE" });
    expect(await database.select().from(walletPurchaseIntents)
      .where(eq(walletPurchaseIntents.ownerId, owner.userId))).toHaveLength(0);
  });

  it("removes restored wallet Tier-1 authority from upgrade pricing and same-SKU creation", async () => {
    const audit = await ownerFixture("Audit restored authority");
    const owner = await ownerFixture("Restored authority owner");
    const { authority, repository, service } = walletPorts(audit.userId);
    const funded = await repository.grant({
      targetOwnerId: owner.userId,
      grant: grant(audit.userId, `restored-authority-grant-${randomUUID()}`, 2_000),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!funded.ok) throw new Error(`grant failed: ${funded.error.code}`);
    const tierOne = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
    });
    if (!tierOne.ok) throw new Error(`tier one intent failed: ${tierOne.code}`);
    const unlocked = await service.unlock(owner.actor, {
      purchaseIntentId: tierOne.value.id,
      expectedIntentVersion: 1,
      expectedWalletVersion: 2,
      idempotencyKey: `restored-authority-unlock-${randomUUID()}`,
    });
    if (!unlocked.ok) throw new Error(`tier one unlock failed: ${unlocked.code}`);
    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    const [spend] = await database.select().from(walletTransactions).where(and(
      eq(walletTransactions.walletId, wallet!.id),
      eq(walletTransactions.kind, "spend"),
    ));
    const restored = await repository.restore({
      actor: owner.actor,
      restoration: {
        version: 1,
        kind: "restoration",
        actorId: owner.userId,
        reasonCode: "wallet.report.failure",
        requestId: `restored-authority-request-${randomUUID()}`,
        traceId: `restored-authority-trace-${randomUUID()}`,
        idempotencyKey: `restored-authority-${randomUUID()}`,
        originalSpendId: spend!.id,
        expectedWalletVersion: 3,
      },
    });
    if (!restored.ok) throw new Error(`restoration failed: ${restored.error.code}`);

    await expect(service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
    })).resolves.toMatchObject({ ok: true, value: { amountLa: 240 } });
    await expect(service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    })).resolves.toMatchObject({ ok: true, value: { amountLa: 960 } });
  });

  it("rolls back every wallet and report artifact when the unlock continuation fails", async () => {
    const audit = await ownerFixture("Audit rollback");
    const owner = await ownerFixture("Rollback owner");
    const { authority, repository, service } = walletPorts(audit.userId, {
      reportVersionResolver: () => {
        throw new Error("test report resolver failure");
      },
    });
    const funded = await repository.grant({
      targetOwnerId: owner.userId,
      grant: grant(audit.userId, `grant-${randomUUID()}`, 240),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!funded.ok) throw new Error(`grant failed: ${funded.error.code}`);
    const intentResult = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
    });
    if (!intentResult.ok) throw new Error(`intent failed: ${intentResult.code}`);
    const [walletBefore] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    const idempotencyKey = `rollback-${randomUUID()}`;

    await expect(service.unlock(owner.actor, {
      purchaseIntentId: intentResult.value.id,
      expectedIntentVersion: 1,
      expectedWalletVersion: 2,
      idempotencyKey,
    })).rejects.toThrow("test report resolver failure");

    const [walletAfter] = await database.select().from(walletAccounts).where(eq(walletAccounts.id, walletBefore!.id));
    expect(walletAfter).toMatchObject({
      purchasedBalance: walletBefore!.purchasedBalance,
      promotionalBalance: walletBefore!.promotionalBalance,
      stateVersion: walletBefore!.stateVersion,
    });
    expect(await database.select().from(walletTransactions).where(and(
      eq(walletTransactions.walletId, walletBefore!.id),
      eq(walletTransactions.idempotencyKey, idempotencyKey),
    ))).toHaveLength(0);
    expect(await database.select().from(walletCommandReceipts).where(and(
      eq(walletCommandReceipts.walletId, walletBefore!.id),
      eq(walletCommandReceipts.idempotencyKey, idempotencyKey),
    ))).toHaveLength(0);
    expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.chartId, owner.chartId)))
      .toHaveLength(0);
    expect(await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId)))
      .toHaveLength(0);
    expect(await database.select().from(outbox).where(eq(outbox.traceId, owner.actor.requestId))).toHaveLength(0);
  });
});
