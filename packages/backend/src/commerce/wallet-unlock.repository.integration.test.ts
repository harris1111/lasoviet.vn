import { createMembershipService } from "./membership.service.js";
import { createDatabaseDailyReadingAccess } from "./personal-daily-reading.service.js";
import { createGuaranteeFeedbackService } from "./guarantee-feedback.service.js";
import { createDailyWalletUnlockService, readPurchasedDailyReading } from "./daily-wallet-unlock.service.js";
import { writePersonalDailyReading } from "../../../engine-adapters/src/ziwei/personal-daily-reading-writer.js";
import { findLaProduct } from "@lasoviet/contracts";
import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  auditLogs,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  dailyReadingUnlocks,
  guaranteeClaims,
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
  getPalaceIdFromSku,
  isSinglePalaceSku,
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

  function walletPorts(auditActorId: string, options: { reportVersionResolver?: Parameters<typeof createWalletUnlockService>[2]["reportVersionResolver"]; now?: () => Date } = {}) {
    const authority = { token: {}, actorId: auditActorId };
    const nowFn = options.now ?? (() => frozenNow);
    const repository = createDatabaseWalletRepository(database, {
      now: nowFn,
      trustedGrantAuthority: authority,
    });
    return {
      authority,
      repository,
      service: createWalletUnlockService(database, createWalletService(repository), {
        now: nowFn,
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

  async function insertPaidPalace(owner: Awaited<ReturnType<typeof ownerFixture>>, sku: string, paidAt: Date) {
    const orderId = randomUUID();
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `LSV-${orderId}`,
      ownerId: owner.userId,
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      kind: "content_purchase",
      sku,
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
      sku,
      ownerId: owner.userId,
      scope: { sections: [], palaces: ["ziwei.palace.life"] },
    });
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

  async function insertWalletSpend(
    owner: Awaited<ReturnType<typeof ownerFixture>>,
    sku: string,
    amountLa: number,
    spentAt: Date,
  ) {
    const intentId = randomUUID();
    await database.insert(walletPurchaseIntents).values({
      id: intentId,
      ownerId: owner.userId,
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku,
      locale: "vi",
      priceLa: amountLa,
      status: "pending",
      stateVersion: 1,
      createdAt: spentAt,
    });
    const { authority, repository } = walletPorts(owner.userId, { now: () => spentAt });
    const funded = await repository.grant({
      targetOwnerId: owner.userId,
      grant: grant(owner.userId, `grant-${randomUUID()}`, amountLa),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!funded.ok) throw new Error(`grant failed in insertWalletSpend: ${funded.error.code}`);
    const [account] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    const spendResult = await repository.spend({
      actor: owner.actor,
      spend: {
        kind: "spend",
        actorId: owner.userId,
        reasonCode: "wallet.report.unlock",
        requestId: randomUUID(),
        traceId: randomUUID(),
        idempotencyKey: `spend-${randomUUID()}`,
        purchaseIntentId: intentId,
        amountLa,
        expectedWalletVersion: account!.stateVersion,
      },
    });
    if (!spendResult.ok) {
      throw new Error(`Failed to insert wallet spend: ${JSON.stringify(spendResult)}`);
    }
    await database.update(walletPurchaseIntents).set({
      status: "completed",
      stateVersion: 2,
      completedAt: spentAt,
    }).where(eq(walletPurchaseIntents.id, intentId));
    const spendId = spendResult.value.transactionId;
    const palaceId = isSinglePalaceSku(sku) ? getPalaceIdFromSku(sku) : undefined;
    await database.insert(commerceEntitlements).values({
      orderId: null,
      ledgerSpendId: spendId,
      chartId: owner.chartId,
      sku,
      ownerId: owner.userId,
      scope: palaceId ? { sections: [], palaces: [palaceId] } : TIER_1_ENTITLEMENT_SCOPE,
      createdAt: spentAt,
    });
  }

  it("uses exact 240, 720, and 960 Lá pricing, preserves pending reuse, and closes FD-041 at +7 days", async () => {
    const audit = await ownerFixture("Audit pricing");
    const base = await ownerFixture("Base pricing");
    const withinWindow = await ownerFixture("Within window");
    const boundary = await ownerFixture("Boundary");
    const { service } = walletPorts(audit.userId);

    await insertWalletSpend(withinWindow, "ZIWEI-NATAL-EXCERPT-P0", 240, new Date(frozenNow.getTime() - (7 * 24 * 60 * 60 * 1_000) + 1));
    await insertWalletSpend(boundary, "ZIWEI-NATAL-EXCERPT-P0", 240, new Date(frozenNow.getTime() - (7 * 24 * 60 * 60 * 1_000)));

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

  it("applies dynamic 7-day rollover discount from single palace and excerpt spends into Tử Vi trọn đời (960 base)", async () => {
    const audit = await ownerFixture("Audit dynamic rollover");
    const user1 = await ownerFixture("User 1 palace rollover");
    const user2 = await ownerFixture("User 2 palaces rollover");
    const userExpired = await ownerFixture("User expired palace rollover");
    const { service } = walletPorts(audit.userId);

    // user1 paid for 1 palace 2 days ago via wallet: discount 120 -> 840 Lá
    await insertWalletSpend(user1, "ZIWEI-PALACE-LIFE-P0", 120, new Date(frozenNow.getTime() - 2 * 24 * 60 * 60 * 1000));
    const intent1 = await service.createPurchaseIntent(user1.actor, {
      chartId: user1.chartId,
      chartVersionId: user1.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    expect(intent1).toMatchObject({ ok: true, value: { amountLa: 840, locale: "vi" }, reused: false });

    // user2 paid for 1 palace 3 days ago and Bản mệnh 1 day ago via wallet: discount 120 + 240 = 360 -> 600 Lá
    await insertWalletSpend(user2, "ZIWEI-PALACE-LIFE-P0", 120, new Date(frozenNow.getTime() - 3 * 24 * 60 * 60 * 1000));
    await insertWalletSpend(user2, "ZIWEI-NATAL-EXCERPT-P0", 240, new Date(frozenNow.getTime() - 1 * 24 * 60 * 60 * 1000));
    const intent2 = await service.createPurchaseIntent(user2.actor, {
      chartId: user2.chartId,
      chartVersionId: user2.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    expect(intent2).toMatchObject({ ok: true, value: { amountLa: 600, locale: "vi" }, reused: false });

    // userExpired paid for 1 palace 8 days ago via wallet: expired -> base 960 Lá
    await insertWalletSpend(userExpired, "ZIWEI-PALACE-LIFE-P0", 120, new Date(frozenNow.getTime() - 8 * 24 * 60 * 60 * 1000));
    const intentExpired = await service.createPurchaseIntent(userExpired.actor, {
      chartId: userExpired.chartId,
      chartVersionId: userExpired.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    expect(intentExpired).toMatchObject({ ok: true, value: { amountLa: 960, locale: "vi" }, reused: false });

    // Verify all new SKUs can create purchase intents with canonical catalog prices
    const palaceIntent = await service.createPurchaseIntent(user1.actor, {
      chartId: user1.chartId,
      chartVersionId: user1.chartVersionId,
      sku: "ZIWEI-PALACE-WEALTH-P0",
      locale: "vi",
    });
    expect(palaceIntent).toMatchObject({ ok: true, value: { amountLa: 120, locale: "vi" }, reused: false });

    // Reserved products fail closed until their writer tickets ship
    expect(await service.createPurchaseIntent(user1.actor, {
      chartId: user1.chartId,
      chartVersionId: user1.chartVersionId,
      sku: "ZIWEI-TODAY-P0",
      locale: "vi",
    })).toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });

    expect(await service.createPurchaseIntent(user1.actor, {
      chartId: user1.chartId,
      chartVersionId: user1.chartVersionId,
      sku: "ZIWEI-MONTHLY-P0",
      locale: "vi",
    })).toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });

    expect(await service.createPurchaseIntent(user1.actor, {
      chartId: user1.chartId,
      chartVersionId: user1.chartVersionId,
      sku: "ZIWEI-YEAR-2026-P0",
      locale: "vi",
    })).toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });

    expect(await service.createPurchaseIntent(user1.actor, {
      chartId: user1.chartId,
      chartVersionId: user1.chartVersionId,
      sku: "ZIWEI-COMBO-2026-P0",
      locale: "vi",
    })).toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });

    expect(await service.createPurchaseIntent(user1.actor, {
      chartId: user1.chartId,
      chartVersionId: user1.chartVersionId,
      sku: "ZIWEI-RELATIONSHIP-P0",
      locale: "vi",
    })).toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });

    expect(await service.createPurchaseIntent(user1.actor, {
      chartId: user1.chartId,
      chartVersionId: user1.chartVersionId,
      sku: "ZIWEI-PALACE-P0", // generic palace removed
      locale: "vi",
    })).toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });
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

  it("only qualifies real Lá wallet spends for the exact same chart and ignores legacy VND orders", async () => {
    const audit = await ownerFixture("Audit qualification test");
    const { service } = walletPorts(audit.userId);

    // User A: has a legacy VND order for Bản mệnh
    const userA = await ownerFixture("User A legacy VND");
    await insertPaidTierOne(userA, new Date(frozenNow.getTime() - 1000));
    const intentA = await service.createPurchaseIntent(userA.actor, {
      chartId: userA.chartId,
      chartVersionId: userA.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    // Legacy VND order does NOT discount Lá price: stays at 960
    expect(intentA).toMatchObject({ ok: true, value: { amountLa: 960 } });

    // User B: has real Lá wallet spend on chart 1, but checks chart 2
    const userB = await ownerFixture("User B multi chart");
    const chart2 = await ownerFixture("User B chart 2");
    await insertWalletSpend(
      { ...userB, chartId: chart2.chartId, chartVersionId: chart2.chartVersionId },
      "ZIWEI-PALACE-LIFE-P0",
      120,
      new Date(frozenNow.getTime() - 1000),
    );
    const intentB = await service.createPurchaseIntent(userB.actor, {
      chartId: userB.chartId,
      chartVersionId: userB.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    // Spend on chart 2 does NOT discount chart 1: stays at 960
    expect(intentB).toMatchObject({ ok: true, value: { amountLa: 960 } });
  });

  it("replaces stale pending intent on price change and expiry without permanent lockout", async () => {
    const audit = await ownerFixture("Audit stale intent test");
    const owner = await ownerFixture("Stale intent owner");
    const { service } = walletPorts(audit.userId);

    // 1. Initial pending intent at 960 Lá
    const initialIntent = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    expect(initialIntent).toMatchObject({ ok: true, value: { amountLa: 960 }, reused: false });

    // 2. User spends 120 Lá on a single palace
    await insertWalletSpend(owner, "ZIWEI-PALACE-LIFE-P0", 120, new Date(frozenNow.getTime() - 1000));

    // 3. User requests intent again: old 960 intent is cancelled and new 840 intent returned
    const updatedIntent = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    expect(updatedIntent).toMatchObject({ ok: true, value: { amountLa: 840 }, reused: false });
    expect(updatedIntent.value.id).not.toBe(initialIntent.value.id);

    const [cancelledInitial] = await database.select().from(walletPurchaseIntents)
      .where(eq(walletPurchaseIntents.id, initialIntent.value.id));
    expect(cancelledInitial?.status).toBe("cancelled");

    // 4. Stale intent replacement on 7-day expiry
    const eightDaysLater = new Date(frozenNow.getTime() + 8 * 24 * 60 * 60 * 1000);
    const { service: laterService } = walletPorts(audit.userId, { now: () => eightDaysLater });
    const expiredReplaceIntent = await laterService.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    expect(expiredReplaceIntent).toMatchObject({ ok: true, value: { amountLa: 960 }, reused: false });
    expect(expiredReplaceIntent.value.id).not.toBe(updatedIntent.value.id);

    const [cancelled840] = await database.select().from(walletPurchaseIntents)
      .where(eq(walletPurchaseIntents.id, updatedIntent.value.id));
    expect(cancelled840?.status).toBe("cancelled");
  });

  it("handles dedicated zero-cost completion path without passing 0 into spend schema or debiting balance", async () => {
    const audit = await ownerFixture("Audit zero unlock test");
    const zeroOwner = await ownerFixture("Zero rollover owner");
    const { authority: zeroAuth, service: zeroService, repository: zeroRepo } = walletPorts(audit.userId);

    // Give owner 500 Lá to verify balance is not touched
    const funded = await zeroRepo.grant({
      targetOwnerId: zeroOwner.userId,
      grant: grant(audit.userId, "grant-zero-balance", 500),
      topUpOrderId: null,
      trustedGrantToken: zeroAuth.token,
    });
    if (!funded.ok) throw new Error(`grant failed: ${funded.error.code}`);

    // Spend 8 single palaces within 7-day window (8 * 120 = 960 Lá)
    const palaceSkus = [
      "ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-SIBLINGS-P0", "ZIWEI-PALACE-SPOUSE-P0",
      "ZIWEI-PALACE-CHILDREN-P0", "ZIWEI-PALACE-WEALTH-P0", "ZIWEI-PALACE-HEALTH-P0",
      "ZIWEI-PALACE-TRAVEL-P0", "ZIWEI-PALACE-FRIENDS-P0",
    ];
    for (const pSku of palaceSkus) {
      await insertWalletSpend(zeroOwner, pSku, 120, new Date(frozenNow.getTime() - 1000));
    }

    // Purchase intent has priceLa = 0
    const zeroIntent = await zeroService.createPurchaseIntent(zeroOwner.actor, {
      chartId: zeroOwner.chartId,
      chartVersionId: zeroOwner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
    });
    expect(zeroIntent).toMatchObject({ ok: true, value: { amountLa: 0 }, reused: false });

    // Unlock at 0 Lá
    const [zeroAccount] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, zeroOwner.userId));
    const unlockResult = await zeroService.unlock(zeroOwner.actor, {
      purchaseIntentId: zeroIntent.value.id,
      expectedIntentVersion: zeroIntent.value.stateVersion,
      expectedWalletVersion: zeroAccount!.stateVersion,
      idempotencyKey: "zero-cost-unlock-key-1",
    });
    expect(unlockResult.ok).toBe(true);
    if (!unlockResult.ok) throw new Error("Expected zero unlock to succeed");
    expect(unlockResult.value.intent.amountLa).toBe(0);
    expect(unlockResult.value.balance.totalLa).toBe(500); // 0 Lá debited!

    // Verify entitlement created with valid non-null ledgerSpendId
    const [entitlement] = await database.select().from(commerceEntitlements)
      .where(and(
        eq(commerceEntitlements.ownerId, zeroOwner.userId),
        eq(commerceEntitlements.chartId, zeroOwner.chartId),
        eq(commerceEntitlements.sku, "ZIWEI-IDENTITY-P0"),
      ));
    expect(entitlement).toBeDefined();
    expect(entitlement?.dailyBonusExpiresAt).toEqual(new Date(frozenNow.getTime() + 7 * 24 * 60 * 60 * 1000));
    expect(entitlement?.expiresAt).toBeNull();
    expect(entitlement?.orderId).toBeNull();
    expect(entitlement?.ledgerSpendId).not.toBeNull();

    // Verify report reservation created
    const [reservation] = await database.select().from(reportReservations)
      .where(eq(reportReservations.entitlementId, entitlement!.id));
    expect(reservation).toBeDefined();
    expect(reservation?.reportId).toBe(unlockResult.value.reportId);

    // Verify idempotency replay succeeds
    const replayResult = await zeroService.unlock(zeroOwner.actor, {
      purchaseIntentId: zeroIntent.value.id,
      expectedIntentVersion: zeroIntent.value.stateVersion,
      expectedWalletVersion: zeroAccount!.stateVersion,
      idempotencyKey: "zero-cost-unlock-key-1",
    });
    expect(replayResult.ok).toBe(true);

    // Verify wallet history does not crash and does not contain 0-delta entries
    const history = await zeroRepo.readHistory(zeroOwner.actor);
    expect(history.ok).toBe(true);
    if (history.ok) {
      for (const item of history.value.items) {
        expect(item.laDelta).not.toBe(0);
      }
    }
  });

  it("grants membership daily access and immutable discounted report intents until exact expiry", async () => {
    const owner = await ownerFixture("Membership reader");
    let current = new Date(frozenNow);
    const ports = walletPorts(owner.userId, { now: () => current });
    const funded = await ports.repository.grant({ targetOwnerId: owner.userId, grant: grant(owner.userId, `member-${randomUUID()}`, 5000), topUpOrderId: null, trustedGrantToken: ports.authority.token });
    if (!funded.ok) throw new Error("fund");
    const membership = createMembershipService(database, createWalletService(ports.repository), { now: () => current, catalog: (sku) => { const product = findLaProduct(sku); return product ? { ...product, availability: "active" } : undefined; } });
    const intent = await membership.createIntent(owner.actor, { sku: "MEMBERSHIP-MONTHLY-P0", locale: "vi" });
    if (!intent.ok) throw new Error("membership intent");
    expect(await membership.purchase(owner.actor, { purchaseIntentId: intent.value.id, expectedIntentVersion: 1, expectedWalletVersion: funded.value.balance.stateVersion, idempotencyKey: randomUUID() })).toMatchObject({ ok: true });
    expect(await createDatabaseDailyReadingAccess(database)(owner.userId, owner.chartId, current)).toMatchObject({ chartVersionId: owner.chartVersionId });
    const request = { chartId: owner.chartId, chartVersionId: owner.chartVersionId, sku: "ZIWEI-NATAL-EXCERPT-P0", locale: "vi" };
    const discounted = await ports.service.createPurchaseIntent(owner.actor, request);
    expect(discounted).toMatchObject({ ok: true, value: { amountLa: 192 } });
    expect(await ports.service.createPurchaseIntent(owner.actor, { ...request, sku: "ZIWEI-IDENTITY-P0" })).toMatchObject({ ok: true, value: { amountLa: 768 } });
    current = new Date(frozenNow.getTime() + 30 * 86_400_000);
    expect(await createDatabaseDailyReadingAccess(database)(owner.userId, owner.chartId, current)).toBeNull();
    if (!discounted.ok) throw new Error("discount");
    const before = await createWalletService(ports.repository).readBalance(owner.actor);
    if (!before.ok) throw new Error("balance");
    expect(await ports.service.unlock(owner.actor, { purchaseIntentId: discounted.value.id, expectedIntentVersion: 1, expectedWalletVersion: before.value.stateVersion, idempotencyKey: randomUUID() })).toMatchObject({ ok: false });
    expect(await createWalletService(ports.repository).readBalance(owner.actor)).toEqual(before);
  });

  it("atomically buys a daily reading once, replays without generation, and allows the next Vietnam day", async () => {
    const owner = await ownerFixture("Daily reading owner");
    const [chart] = await database.select().from(ziweiCharts).where(eq(ziweiCharts.id, owner.chartId));
    await database.update(birthProfileRevisions).set({
      originalInput: { version: 1, calendar: { kind: "solar", date: "2000-01-01" }, time: { precision: "exact_minute", localTime: "12:00" }, timezone: { offsetMinutes: 420 }, consentVersion: "1.0", gender: "female" },
      normalizedInput: { version: 1, normalizedCalendar: { kind: "solar", date: "2000-01-01" }, normalizedTime: { precision: "exact_minute", localTime: "12:00" }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] },
    }).where(eq(birthProfileRevisions.id, chart!.profileRevisionId));
    let current = new Date("2026-09-20T16:59:00Z");
    const ports = walletPorts(owner.userId, { now: () => current });
    const funded = await ports.repository.grant({ targetOwnerId: owner.userId, grant: grant(owner.userId, "daily-credit", 180), topUpOrderId: null, trustedGrantToken: ports.authority.token });
    if (!funded.ok) throw new Error("DAILY_TEST_CREDIT_FAILED");
    const writer = vi.fn(writePersonalDailyReading);
    const daily = createDailyWalletUnlockService(database, createWalletService(ports.repository), {
      writer, now: () => current,
      catalog: (sku) => { const item = findLaProduct(sku); return item ? { ...item, availability: "active" } : undefined; },
    });
    const request = { chartId: owner.chartId, chartVersionId: owner.chartVersionId, sku: "ZIWEI-TODAY-P0", locale: "vi" };
    const reserved = createDailyWalletUnlockService(database, createWalletService(ports.repository), { writer, now: () => current });
    expect(await reserved.createPurchaseIntent(owner.actor, request)).toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });
    const intent = await daily.createPurchaseIntent(owner.actor, request);
    if (!intent.ok) throw new Error(intent.code);
    const command = { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: funded.value.balance.stateVersion, idempotencyKey: "daily-buy-1" };
    const unlocked = await daily.unlock(owner.actor, command);
    expect(unlocked).toMatchObject({ ok: true, value: { balance: { totalLa: 120 } } });
    expect(await daily.unlock(owner.actor, command)).toEqual(unlocked);
    expect(await daily.unlock(owner.actor, { ...command, expectedIntentVersion: command.expectedIntentVersion + 1 }))
      .toEqual({ ok: false, code: "WALLET_IDEMPOTENCY_KEY_REUSED" });
    expect(writer).toHaveBeenCalledOnce();
    expect(await daily.createPurchaseIntent(owner.actor, request)).toEqual({ ok: false, code: "WALLET_ENTITLEMENT_EXISTS" });
    expect(await readPurchasedDailyReading(database, owner.userId, owner.chartId, "2026-09-20", current)).not.toBeNull();
    expect(await readPurchasedDailyReading(database, "another-owner", owner.chartId, "2026-09-20", current)).toBeNull();
    expect(await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId))).toHaveLength(0);
    current = new Date("2026-09-20T17:00:00Z");
    expect(await readPurchasedDailyReading(database, owner.userId, owner.chartId, "2026-09-20", current)).toBeNull();
    const nextIntent = await daily.createPurchaseIntent(owner.actor, request);
    if (!nextIntent.ok || !unlocked.ok) throw new Error("DAILY_NEXT_INTENT_FAILED");
    const nextCommand = { ...command, purchaseIntentId: nextIntent.value.id, expectedWalletVersion: unlocked.value.balance.stateVersion, idempotencyKey: "daily-buy-2" };
    writer.mockImplementationOnce((profile, options) => {
      const reading = writePersonalDailyReading(profile, options);
      return { ...reading, qualityGate: { ...reading.qualityGate, passed: false } };
    });
    expect(await daily.unlock(owner.actor, nextCommand)).toEqual({ ok: false, code: "WALLET_INTENT_VERSION_CONFLICT" });
    expect(await ports.repository.readBalance(owner.actor)).toMatchObject({ ok: true, value: { totalLa: 120 } });
    expect(await daily.unlock(owner.actor, nextCommand)).toMatchObject({ ok: true, value: { balance: { totalLa: 60 } } });
    const readings = await database.select().from(dailyReadingUnlocks).where(eq(dailyReadingUnlocks.ownerId, owner.userId));
    expect(readings.map((r) => r.readingDate).sort()).toEqual(["2026-09-20", "2026-09-21"]);
    expect(writer).toHaveBeenCalledTimes(3);
    const latest = readings.find((r) => r.readingDate === "2026-09-21")!;
    const balance = await ports.repository.readBalance(owner.actor);
    if (!balance.ok) throw new Error("DAILY_BALANCE_FAILED");
    const guarantee = createGuaranteeFeedbackService(database, { now: () => current });
    const claim = { chartId: owner.chartId, partId: "daily:2026-09-21", rating: "inaccurate" as const, idempotencyKey: "daily-guarantee" };
    expect(await guarantee.claimGuarantee(owner.actor, { ...claim, partId: "daily:2026-09-19" })).toEqual({ ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND" });
    const [restored, replay] = await Promise.all([guarantee.claimGuarantee(owner.actor, claim), guarantee.claimGuarantee(owner.actor, claim)]);
    expect(restored).toMatchObject({ ok: true, value: { amountLaRestored: 60, balance: { totalLa: 120 } } });
    expect(replay).toEqual(restored);
    expect(await guarantee.claimGuarantee(owner.actor, { ...claim, partId: "daily:2026-09-20", idempotencyKey: "daily-guarantee-second" })).toEqual({ ok: false, code: "GUARANTEE_ALREADY_CLAIMED" });
    expect(await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, owner.userId))).toHaveLength(1);
    const [revoked] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.id, latest.id));
    expect(revoked?.revokedAt).toEqual(current);
    expect(await readPurchasedDailyReading(database, owner.userId, owner.chartId, "2026-09-21", current)).toBeNull();
  });

});
