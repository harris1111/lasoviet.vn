import { createWalletUpgradeOutboxRunner } from "../analytics/wallet-upgrade-outbox.js";
import { createDatabaseAnalyticsRepository } from "../analytics/analytics.repository.js";
import { WALLET_UPGRADE_EVENT_TYPE } from "./wallet-upgrade-event.js";
import { createDatabaseDeletionRepository } from "../privacy/deletion.repository.js";
import { createDatabaseBirthProfileRepository } from "../birth-profile/birth-profile.repository.js";
import * as comboReservations from "./combo-report-reservation.js";
import { createAuthEmailDeliveryService, createDatabaseAuthEmailDeliveryStore } from "../notifications/auth-email.js";
import { createHanMonthReminderService } from "../notifications/han-month-reminder.service.js";
import { createDatabaseNotificationPreferenceStore } from "../notifications/notification-preference.js";
import { createDatabaseReportSourceSnapshotRepository } from "../reports/report-source-snapshot.repository.js";
import { periodReportVersions } from "../reports/period-report-config.js";
import { calculateIztroReportSnapshot } from "../../../engine-adapters/src/ziwei/iztro-report-snapshot.js";
import { NormalizedBirthProfileV1Schema } from "@lasoviet/contracts";
import { createMembershipService } from "./membership.service.js";
import { createDatabaseReportGenerationSourceRepository } from "../reports/report-generation.repository.js";
import { createDatabaseDailyReadingAccess } from "./personal-daily-reading.service.js";
import { createGuaranteeFeedbackService } from "./guarantee-feedback.service.js";
import { createDailyWalletUnlockService, readPurchasedDailyReading } from "./daily-wallet-unlock.service.js";
import { writePersonalDailyReading } from "../../../engine-adapters/src/ziwei/personal-daily-reading-writer.js";
import { findLaProduct } from "@lasoviet/contracts";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { lunarPeriodPurchaseKey } from "../../../engine-adapters/src/ziwei/period-purchase-key.js";
const topicCatalogGate = vi.hoisted(() => ({ enabled: false }));
vi.mock("@lasoviet/contracts", async importOriginal => {
  const actual = await importOriginal<typeof import("@lasoviet/contracts")>();
  return { ...actual, findLaProduct: (sku: string) => {
    const product = actual.findLaProduct(sku);
    return topicCatalogGate.enabled && product && ["ZIWEI-RELATIONSHIP-P0", "ZIWEI-CAREER-P0", "ZIWEI-MONTHLY-P0", "ZIWEI-YEAR-2026-P0", "ZIWEI-COMBO-2026-P0"].includes(sku) ? { ...product, availability: "active" } : product;
  }};
});
import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  auditLogs,
  analyticsEvents,
  analyticsVisitors,
  accountBehaviorProfiles,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  consents,
  notificationDeliveries,
  dailyReadingUnlocks,
  guaranteeClaims,
  commerceOrders,
  createDatabase,
  evidenceSets,
  outbox,
  reportReservations,
  reportVersions,
  reportEntitlementLinks,
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
        resolveMonthlyPeriodKey: lunarPeriodPurchaseKey,
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
    return { userId, profileId, chartId, chartVersionId, evidenceId, actor: actor(userId) };
  }

  async function quoteSnapshot() {
    const tables = [walletAccounts, walletPurchaseIntents, walletTransactions, commerceEntitlements, reportReservations, walletCommandReceipts, auditLogs, outbox];
    return Promise.all(tables.map(table => database.select().from(table)));
  }

  async function committedUpgradeFixture() {
    const owner = await ownerFixture("Durable upgrade owner");
    const ports = walletPorts(owner.userId, {reportVersionResolver: v4_1SensitivityReportVersions});
    const granted = await ports.repository.grant({targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID()), topUpOrderId: null, trustedGrantToken: ports.authority.token});
    if (!granted.ok) throw new Error("grant");
    let balance = granted.value.balance;
    let finalCommand: Parameters<typeof ports.service.unlock>[1] | undefined;
    let upgrade: import("./wallet-unlock.service.js").WalletUnlockOutcome | undefined;
    for (const sku of ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0", "ZIWEI-IDENTITY-P0"] as const) {
      const intent = await ports.service.createPurchaseIntent(owner.actor, {chartId: owner.chartId, chartVersionId: owner.chartVersionId, sku, locale: "vi"});
      if (!intent.ok) throw new Error(intent.code);
      finalCommand = {purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: balance.stateVersion, idempotencyKey: randomUUID()};
      const outcome = await ports.service.unlock(owner.actor, finalCommand);
      if (!outcome.ok) throw new Error(outcome.code);
      balance = outcome.value.balance;
      if (sku === "ZIWEI-IDENTITY-P0") upgrade = outcome.value;
    }
    const [event] = await database.select().from(outbox).where(and(eq(outbox.actorId, owner.userId), eq(outbox.eventType, WALLET_UPGRADE_EVENT_TYPE)));
    if (!event || !upgrade) throw new Error("missing durable upgrade");
    return {owner, ports, event, command: finalCommand!, upgrade};
  }

  function upgradeRunner(options: Partial<Parameters<typeof createWalletUpgradeOutboxRunner>[1]> = {}) {
    return createWalletUpgradeOutboxRunner(database, {workerId: randomUUID(), now: () => frozenNow, limit: 500, ...options});
  }

  async function financialEvents(ownerId: string) {
    return database.select().from(analyticsEvents).where(and(eq(analyticsEvents.userId, ownerId), eq(analyticsEvents.name, "upgrade_purchased")));
  }

  it("durably delivers a posted upgrade once across concurrent command and worker retries without browser metadata", async () => {
    const fixture = await committedUpgradeFixture();
    const replies = await Promise.all([fixture.ports.service.unlock(fixture.owner.actor, fixture.command), fixture.ports.service.unlock(fixture.owner.actor, fixture.command)]);
    expect(replies.every(reply => reply.ok)).toBe(true);
    expect(await database.select().from(outbox).where(and(eq(outbox.actorId, fixture.owner.userId), eq(outbox.eventType, WALLET_UPGRADE_EVENT_TYPE)))).toHaveLength(1);
    expect(await financialEvents(fixture.owner.userId)).toHaveLength(0);
    await Promise.all([upgradeRunner().runOnce(), upgradeRunner().runOnce()]);
    await upgradeRunner().runOnce();
    const events = await financialEvents(fixture.owner.userId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({occurredAt: frozenNow, properties: {amount: 720, credit_amount: 240, currency: "LA"}, birthProfileId: null, ip: null, userAgent: null, pathname: null, utmSource: null});
    const [visitor] = await database.select().from(analyticsVisitors).where(eq(analyticsVisitors.id, events[0]!.visitorId));
    expect(visitor).toMatchObject({userId: fixture.owner.userId, consentedAt: null, birthProfileId: null});
    expect(visitor!.id).toMatch(/^business_[a-f0-9]{32}$/);
    expect(await database.select().from(accountBehaviorProfiles).where(eq(accountBehaviorProfiles.userId, fixture.owner.userId))).toHaveLength(1);
    expect(await database.select().from(outbox).where(eq(outbox.id, fixture.event.id))).toEqual([expect.objectContaining({status: "processed", lastErrorCode: null})]);
  }, 20_000);

  it("rolls back analytics and acknowledgement on delivery failure then recovers the original commit time", async () => {
    const fixture = await committedUpgradeFixture();
    await upgradeRunner({afterRecord: async () => {throw new Error("injected after-record failure");}}).runOnce();
    expect(await financialEvents(fixture.owner.userId)).toHaveLength(0);
    const [failed] = await database.select().from(outbox).where(eq(outbox.id, fixture.event.id));
    expect(failed).toMatchObject({status: "pending", attemptCount: 1, lastErrorCode: "WALLET_UPGRADE_DELIVERY_RETRY"});
    expect(await fixture.ports.service.unlock(fixture.owner.actor, fixture.command)).toMatchObject({ok: true, value: fixture.upgrade});
    await upgradeRunner({now: () => new Date(frozenNow.getTime() + 60_001)}).runOnce();
    expect(await financialEvents(fixture.owner.userId)).toEqual([expect.objectContaining({occurredAt: frozenNow})]);
  }, 20_000);

  it("recovers an expired worker lease without changing financial attribution", async () => {
    const fixture = await committedUpgradeFixture();
    await database.update(outbox).set({status: "leased", leasedBy: "crashed-worker", leasedUntil: new Date(frozenNow.getTime() - 1), attemptCount: 4}).where(eq(outbox.id, fixture.event.id));
    await upgradeRunner().runOnce();
    expect(await financialEvents(fixture.owner.userId)).toHaveLength(1);
    expect(await database.select().from(outbox).where(eq(outbox.id, fixture.event.id))).toEqual([expect.objectContaining({status: "processed", attemptCount: 5})]);
  }, 20_000);

  it.each(["malformed", "foreign", "changed-proof"])("rejects %s durable financial authority without emitting an event", async failure => {
    const fixture = await committedUpgradeFixture();
    const payload = fixture.event.payload as {transactionId: string; upgrade: Record<string, unknown>};
    if (failure === "foreign") {
      const outsider = await ownerFixture("Foreign durable owner");
      await database.update(outbox).set({actorId: outsider.userId, aggregateId: outsider.userId}).where(eq(outbox.id, fixture.event.id));
    } else {
      const upgrade = failure === "malformed" ? {...payload.upgrade, birthProfileId: "private"} : {...payload.upgrade, sourceSku: "ZIWEI-PALACE-WEALTH-P0"};
      await database.update(outbox).set({payload: {...payload, upgrade}}).where(eq(outbox.id, fixture.event.id));
    }
    await upgradeRunner().runOnce();
    expect(await financialEvents(fixture.owner.userId)).toHaveLength(0);
    expect(await database.select().from(outbox).where(eq(outbox.id, fixture.event.id))).toEqual([expect.objectContaining({status: "failed", lastErrorCode: "WALLET_UPGRADE_EVENT_INVALID"})]);
  }, 20_000);

  it.each([false, true])("preserves an exact prior browser event and refuses a conflict (conflict=%s)", async conflict => {
    const fixture = await committedUpgradeFixture();
    const upgrade = fixture.upgrade.upgradePurchase!;
    const properties = {source_sku: upgrade.sourceSku, source_skus: upgrade.sourceSkus, target_sku: upgrade.targetSku,
      amount: conflict ? 721 : upgrade.chargedLa, credit_amount: upgrade.creditLa, currency: "LA"};
    const result = await createDatabaseAnalyticsRepository(database).recordEvent({idempotencyKey: fixture.event.idempotencyKey,
      visitorId: randomUUID(), userId: fixture.owner.userId, name: "upgrade_purchased", properties, occurredAt: frozenNow, now: frozenNow});
    if (!result.ok) throw new Error(result.error);
    await upgradeRunner().runOnce();
    expect(await financialEvents(fixture.owner.userId)).toEqual([result.event]);
    const [event] = await database.select().from(outbox).where(eq(outbox.id, fixture.event.id));
    expect(event?.status).toBe(conflict ? "failed" : "processed");
  }, 20_000);

  async function requestUpgradeOwnerPurge(userId: string) {
    return createDatabaseDeletionRepository(database).request({userId, requestId: randomUUID(),
      requestedAt: new Date(frozenNow.getTime() - 1000), recoverUntil: new Date(frozenNow.getTime() - 1)});
  }

  it("official purge removes pending financial payloads and prevents account analytics resurrection", async () => {
    const fixture = await committedUpgradeFixture();
    expect(await requestUpgradeOwnerPurge(fixture.owner.userId)).toMatchObject({ok: true});
    await createDatabaseDeletionRepository(database).purgeExpired(frozenNow, 500);
    await upgradeRunner().runOnce();
    expect(await financialEvents(fixture.owner.userId)).toHaveLength(0);
    expect(await database.select().from(outbox).where(eq(outbox.id, fixture.event.id))).toHaveLength(0);
  }, 20_000);

  it("serializes delivery against purge and removes an event committed immediately before purge", async () => {
    const fixture = await committedUpgradeFixture();
    await requestUpgradeOwnerPurge(fixture.owner.userId);
    let entered!: () => void; let release!: () => void;
    const reached = new Promise<void>(resolve => {entered = resolve;});
    const gate = new Promise<void>(resolve => {release = resolve;});
    const delivery = upgradeRunner({beforeRecord: async () => {entered(); await gate;}}).runOnce();
    await reached;
    const purge = createDatabaseDeletionRepository(database).purgeExpired(frozenNow, 500);
    release();
    await Promise.all([delivery, purge]);
    await upgradeRunner().runOnce();
    expect(await financialEvents(fixture.owner.userId)).toHaveLength(0);
    expect(await database.select().from(analyticsVisitors).where(eq(analyticsVisitors.userId, fixture.owner.userId))).toHaveLength(0);
    expect(await database.select().from(outbox).where(eq(outbox.id, fixture.event.id))).toHaveLength(0);
  }, 20_000);

  it("fences a purge request created after delivery started without an account deletion marker", async () => {
    const fixture = await committedUpgradeFixture();
    let current = frozenNow;
    let entered!: () => void; let release!: () => void;
    const reached = new Promise<void>(resolve => {entered = resolve;});
    const gate = new Promise<void>(resolve => {release = resolve;});
    const delivery = upgradeRunner({now: () => current, beforeRecord: async () => {entered(); await gate;}}).runOnce();
    await reached;
    const recoveryEnds = new Date(frozenNow.getTime() + 30 * 86_400_000);
    expect(await createDatabaseDeletionRepository(database).request({userId: fixture.owner.userId,
      requestId: randomUUID(), requestedAt: frozenNow, recoverUntil: recoveryEnds})).toMatchObject({ok: true});
    current = new Date(recoveryEnds.getTime() + 1);
    const purge = createDatabaseDeletionRepository(database).purgeExpired(current, 500);
    try {
      // Wait for PostgreSQL to prove purge reached the contested lock. With the
      // old consumer it waits on outbox deletion; with the fix it waits on the
      // shared advisory fence. Releasing immediately would make the race flaky.
      await vi.waitFor(async () => {
        const rows = await database.execute<{count: string}>(sql`
          SELECT count(*)::text AS count FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> pg_backend_pid()
            AND wait_event_type = 'Lock'
            AND (query LIKE '%pg_advisory_xact_lock%' OR query LIKE '%delete from "outbox"%')`);
        expect(Number(rows[0]!.count)).toBeGreaterThan(0);
      }, {timeout: 10_000, interval: 10});
    } finally {
      release();
    }
    await Promise.all([delivery, purge]);
    await upgradeRunner({now: () => current}).runOnce();
    expect(await financialEvents(fixture.owner.userId)).toHaveLength(0);
    expect(await database.select().from(analyticsVisitors).where(eq(analyticsVisitors.userId, fixture.owner.userId))).toHaveLength(0);
    expect(await database.select().from(outbox).where(eq(outbox.id, fixture.event.id))).toHaveLength(0);
  }, 20_000);

  it("quotes closed catalog without writes and denies archived, purged, foreign or mismatched charts", async () => {
    const owner = await ownerFixture("Quote privacy owner");
    const other = await ownerFixture("Quote foreign owner");
    const { service } = walletPorts(owner.userId, { reportVersionResolver: v4_1SensitivityReportVersions });
    const request = { chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi" as const };
    const before = await quoteSnapshot();
    const result = await service.readQuotes(owner.actor, request);
    expect(result).toMatchObject({ ok: true, value: { chartId: owner.chartId, chartVersionId: owner.chartVersionId } });
    if (!result.ok) throw new Error(result.code);
    expect(result.value.quotes.find(item => item.sku === "ZIWEI-PALACE-LIFE-P0")).toMatchObject({ state: "available", priceLa: 120 });
    expect(result.value.quotes.find(item => item.sku === "ZIWEI-COMBO-2026-P0")).toMatchObject({ state: "coming_soon", priceLa: null });
    expect(await service.readQuotes(other.actor, request)).toMatchObject({ ok: false, code: "WALLET_CHART_NOT_FOUND" });
    expect(await service.readQuotes(owner.actor, { ...request, chartVersionId: other.chartVersionId })).toMatchObject({ ok: false, code: "WALLET_CHART_NOT_FOUND" });
    expect(await quoteSnapshot()).toEqual(before);
    await database.update(authUsers).set({ emailVerified: false }).where(eq(authUsers.id, owner.userId));
    expect(await service.readQuotes(owner.actor, request)).toMatchObject({ ok: false, code: "WALLET_ACCOUNT_INELIGIBLE" });
    await database.update(authUsers).set({ emailVerified: true, isAnonymous: true }).where(eq(authUsers.id, owner.userId));
    expect(await service.readQuotes(owner.actor, request)).toMatchObject({ ok: false, code: "WALLET_ACCOUNT_INELIGIBLE" });
    await database.update(authUsers).set({ isAnonymous: false }).where(eq(authUsers.id, owner.userId));
    expect(await createDatabaseBirthProfileRepository(database).archive(owner.actor, owner.profileId, frozenNow)).toBe(true);
    const archived = await quoteSnapshot();
    expect(await service.readQuotes(owner.actor, request)).toMatchObject({ ok: false, code: "WALLET_CHART_NOT_FOUND" });
    expect(await service.createPurchaseIntent(owner.actor, { ...request, sku: "ZIWEI-PALACE-LIFE-P0" })).toMatchObject({ ok: false, code: "WALLET_CHART_NOT_FOUND" });
    expect(await quoteSnapshot()).toEqual(archived);
    // Exercise the privacy marker while auth/chart rows still await physical cleanup.
    const deletion = createDatabaseDeletionRepository(database);
    expect(await deletion.request({ userId: other.userId, requestId: randomUUID(), requestedAt: frozenNow, recoverUntil: frozenNow })).toMatchObject({ ok: true });
    expect(await deletion.purgeExpired(frozenNow, 10)).toHaveLength(1);
    const purged = await quoteSnapshot();
    expect(await service.readQuotes(other.actor, { ...request, chartId: other.chartId, chartVersionId: other.chartVersionId })).toMatchObject({ ok: false, code: "WALLET_CHART_NOT_FOUND" });
    expect(await quoteSnapshot()).toEqual(purged);
  });

  it("quotes actual rollover charges and linked pending/failed reports without mutations", async () => {
    const owner = await ownerFixture("Quote rollover owner");
    let current = frozenNow;
    const { service, repository, authority } = walletPorts(owner.userId, { reportVersionResolver: v4_1SensitivityReportVersions, now: () => current });
    await repository.grant({ targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID()), topUpOrderId: null, trustedGrantToken: authority.token });
    const request = { chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi" as const };
    for (const sku of ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0"]) {
      const intent = await service.createPurchaseIntent(owner.actor, { ...request, sku });
      if (!intent.ok) throw new Error(intent.code);
      const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
      const unlock = await service.unlock(owner.actor, { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: wallet!.stateVersion, idempotencyKey: randomUUID() });
      expect(unlock).toMatchObject({ ok: true });
    }
    const before = await quoteSnapshot();
    const quote = await service.readQuotes(owner.actor, request);
    if (!quote.ok) throw new Error(quote.code);
    expect(quote.value.quotes.find(item => item.sku === "ZIWEI-IDENTITY-P0")).toMatchObject({ state: "available", priceLa: 720, creditLa: 240, discountLa: 0 });
    const linked = quote.value.quotes.find(item => item.sku === "ZIWEI-PALACE-WEALTH-P0")!;
    expect(linked).toMatchObject({ state: "owned", reportState: "processing" });
    expect(linked.reportId).toBeTruthy();
    expect(await quoteSnapshot()).toEqual(before);
    const intent = await service.createPurchaseIntent(owner.actor, { ...request, sku: "ZIWEI-IDENTITY-P0" });
    expect(intent).toMatchObject({ ok: true, value: { amountLa: 720 } });
    await database.update(reportReservations).set({ status: "complete" }).where(eq(reportReservations.chartVersionId, owner.chartVersionId));
    const corrupt = await service.readQuotes(owner.actor, request);
    expect(corrupt).toMatchObject({ ok: true, value: { quotes: expect.arrayContaining([expect.objectContaining({ sku: linked.sku, state: "owned", reportId: null, reportState: "unavailable" })]) } });
    await database.update(reportReservations).set({ status: "terminal_failure" }).where(eq(reportReservations.chartVersionId, owner.chartVersionId));
    const failed = await service.readQuotes(owner.actor, request);
    expect(failed).toMatchObject({ ok: true, value: { quotes: expect.arrayContaining([expect.objectContaining({ sku: linked.sku, state: "owned", reportId: linked.reportId, reportState: "unavailable" })]) } });
    const [account] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    const [spend] = await database.select().from(walletTransactions).where(and(eq(walletTransactions.walletId, account!.id), eq(walletTransactions.kind, "spend"))).limit(1);
    expect(await repository.restore({ actor: owner.actor, restoration: { kind: "restoration", actorId: owner.userId, originalSpendId: spend!.id, expectedWalletVersion: account!.stateVersion, reasonCode: "test.wallet.quote.restore", requestId: randomUUID(), traceId: randomUUID(), idempotencyKey: randomUUID() } })).toMatchObject({ ok: true });
    const restoredBefore = await quoteSnapshot();
    expect(await service.readQuotes(owner.actor, request)).toMatchObject({ ok: true, value: { quotes: expect.arrayContaining([expect.objectContaining({ sku: "ZIWEI-IDENTITY-P0", priceLa: 840, creditLa: 120 })]) } });
    expect(await quoteSnapshot()).toEqual(restoredBefore);
    expect(await service.createPurchaseIntent(owner.actor, { ...request, sku: "ZIWEI-IDENTITY-P0" })).toMatchObject({ ok: true, value: { amountLa: 840 } });
    current = new Date(frozenNow.getTime() + 7 * 86_400_000);
    const boundary = await service.readQuotes(owner.actor, request);
    expect(boundary).toMatchObject({ ok: true, value: { quotes: expect.arrayContaining([expect.objectContaining({ sku: "ZIWEI-IDENTITY-P0", priceLa: 960, creditLa: 0 })]) } });
    expect(await service.createPurchaseIntent(owner.actor, { ...request, sku: "ZIWEI-IDENTITY-P0" })).toMatchObject({ ok: true, value: { amountLa: 960 } });
  }, 15_000);

  it("charges the exact quoted rollover price through the atomic unlock command", async () => {
    const owner = await ownerFixture("Quote actual lifetime debit");
    const { service, repository, authority } = walletPorts(owner.userId, { reportVersionResolver: v4_1SensitivityReportVersions });
    const initial = await repository.grant({ targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID()), topUpOrderId: null, trustedGrantToken: authority.token });
    if (!initial.ok) throw new Error("grant");
    const request = { chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi" as const };
    let balance = initial.value.balance;
    for (const sku of ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0", "ZIWEI-IDENTITY-P0"] as const) {
      const quotes = await service.readQuotes(owner.actor, request);
      if (!quotes.ok) throw new Error(quotes.code);
      const expected = sku === "ZIWEI-IDENTITY-P0" ? 720 : 120;
      expect(quotes.value.quotes.find(quote => quote.sku === sku)?.priceLa).toBe(expected);
      const intent = await service.createPurchaseIntent(owner.actor, { ...request, sku });
      if (!intent.ok) throw new Error(intent.code);
      expect(intent.value.amountLa).toBe(expected);
      const command = { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: balance.stateVersion, idempotencyKey: randomUUID() };
      const outcome = await service.unlock(owner.actor, command);
      if (!outcome.ok) throw new Error(outcome.code);
      expect(balance.totalLa - outcome.value.balance.totalLa).toBe(expected);
      const replay = await service.unlock(owner.actor, command);
      expect(replay).toMatchObject({ ok: true, value: { balance: outcome.value.balance, reportId: outcome.value.reportId } });
      if (sku === "ZIWEI-IDENTITY-P0") {
        const upgrade = outcome.value.upgradePurchase;
        expect(upgrade).toMatchObject({version: 1, occurredAt: frozenNow.toISOString(), targetSku: sku,
          sourceSku: "ZIWEI-PALACE-LIFE-P0", sourceSkus: ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0"], chargedLa: 720, creditLa: 240, currency: "LA"});
        expect(upgrade?.eventKey).toMatch(/^upg_[0-9a-f]{32}$/);
        expect(JSON.stringify(upgrade)).not.toMatch(/spendId|walletId|chartId|entitlementId|birth/i);
        expect(replay).toMatchObject({ok: true, value: {upgradePurchase: upgrade}});
        const later = walletPorts(owner.userId, {reportVersionResolver: v4_1SensitivityReportVersions, now: () => new Date(frozenNow.getTime() + 8 * 86_400_000)});
        expect(await later.service.unlock(owner.actor, command)).toMatchObject({ok: true, value: {upgradePurchase: upgrade}});

        const [source] = await database.select().from(commerceEntitlements).where(and(eq(commerceEntitlements.ownerId, owner.userId), eq(commerceEntitlements.sku, "ZIWEI-PALACE-LIFE-P0")));
        const restored = await repository.restore({actor: owner.actor, restoration: {kind: "restoration", actorId: owner.userId,
          originalSpendId: source!.ledgerSpendId!, expectedWalletVersion: outcome.value.balance.stateVersion, reasonCode: "test.source.restore.after.upgrade",
          requestId: randomUUID(), traceId: randomUUID(), idempotencyKey: randomUUID()}});
        expect(restored).toMatchObject({ok: true, value: {balance: {totalLa: 1160}}});
        expect(await later.service.unlock(owner.actor, command)).toMatchObject({ok: true, value: {upgradePurchase: upgrade}});
      } else {
        expect(outcome.value.upgradePurchase).toBeNull();
      }
      balance = outcome.value.balance;
    }
    expect(balance.totalLa).toBe(1040);
  }, 15_000);

  it("preserves legacy receipts and rejects malformed or foreign source proofs without another debit", async () => {
    const owner = await ownerFixture("Upgrade receipt authority");
    const ports = walletPorts(owner.userId, {reportVersionResolver: v4_1SensitivityReportVersions});
    const funded = await ports.repository.grant({targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID()), topUpOrderId: null, trustedGrantToken: ports.authority.token});
    if (!funded.ok) throw new Error("fund");
    let balance = funded.value.balance;
    let command: Parameters<typeof ports.service.unlock>[1] | undefined;
    for (const sku of ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-IDENTITY-P0"] as const) {
      const intent = await ports.service.createPurchaseIntent(owner.actor, {chartId: owner.chartId, chartVersionId: owner.chartVersionId, sku, locale: "vi"});
      if (!intent.ok) throw new Error(intent.code);
      command = {purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: balance.stateVersion, idempotencyKey: randomUUID()};
      const unlocked = await ports.service.unlock(owner.actor, command);
      if (!unlocked.ok) throw new Error(unlocked.code);
      balance = unlocked.value.balance;
    }
    const [receipt] = await database.select().from(walletCommandReceipts).where(eq(walletCommandReceipts.idempotencyKey, command!.idempotencyKey));
    type Stored = {continuation: {creditProof?: {sources: Array<{spendId: string; creditedLa: number}>}}};
    const original = receipt!.result as Stored;
    async function fixtureReceipt(value: Stored) {
      // Corruption is confined to the disposable test database; retain all other guards.
      await database.execute(sql`alter table wallet_command_receipts disable trigger wallet_command_receipts_immutable`);
      try {
        await database.update(walletCommandReceipts).set({result: value}).where(eq(walletCommandReceipts.id, receipt!.id));
      } finally {
        await database.execute(sql`alter table wallet_command_receipts enable trigger wallet_command_receipts_immutable`);
      }
    }
    const legacy = structuredClone(original);
    delete legacy.continuation.creditProof;
    await expect(database.update(walletCommandReceipts).set({result: legacy}).where(eq(walletCommandReceipts.id, receipt!.id))).rejects.toThrow();
    await fixtureReceipt(legacy);
    expect(await ports.service.unlock(owner.actor, command!)).toMatchObject({ok: true, value: {upgradePurchase: null}});

    const malformed = structuredClone(original);
    malformed.continuation.creditProof!.sources[0]!.creditedLa -= 1;
    await fixtureReceipt(malformed);
    expect(await ports.service.unlock(owner.actor, command!)).toMatchObject({ok: false, code: "WALLET_RECONCILIATION_FAILED"});

    const foreign = await ownerFixture("Foreign upgrade proof owner");
    await insertWalletSpend(foreign, "ZIWEI-PALACE-LIFE-P0", 120, frozenNow);
    const [foreignEntitlement] = await database.select().from(commerceEntitlements).where(and(eq(commerceEntitlements.ownerId, foreign.userId), eq(commerceEntitlements.sku, "ZIWEI-PALACE-LIFE-P0")));
    const forged = structuredClone(original);
    forged.continuation.creditProof!.sources[0]!.spendId = foreignEntitlement!.ledgerSpendId!;
    await fixtureReceipt(forged);
    expect(await ports.service.unlock(owner.actor, command!)).toMatchObject({ok: false, code: "WALLET_RECONCILIATION_FAILED"});
    expect(await createWalletService(ports.repository).readBalance(owner.actor)).toMatchObject({ok: true, value: balance});
    await fixtureReceipt(original);
    expect(await ports.service.unlock(owner.actor, command!)).toMatchObject({ok: true, value: {upgradePurchase: {chargedLa: 840, creditLa: 120}}});
  }, 15_000);

  it("does not turn an actual 768-La membership debit into rollover attribution", async () => {
    const owner = await ownerFixture("Member upgrade attribution");
    const ports = walletPorts(owner.userId, {reportVersionResolver: v4_1SensitivityReportVersions});
    const funded = await ports.repository.grant({targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID(), 5000), topUpOrderId: null, trustedGrantToken: ports.authority.token});
    if (!funded.ok) throw new Error("fund");
    const membership = createMembershipService(database, createWalletService(ports.repository), {now: () => frozenNow,
      catalog: sku => {const product = findLaProduct(sku); return product ? {...product, availability: "active"} : undefined;}});
    const subscription = await membership.createIntent(owner.actor, {sku: "MEMBERSHIP-MONTHLY-P0", locale: "vi"});
    if (!subscription.ok) throw new Error("subscription");
    const purchased = await membership.purchase(owner.actor, {purchaseIntentId: subscription.value.id, expectedIntentVersion: subscription.value.stateVersion,
      expectedWalletVersion: funded.value.balance.stateVersion, idempotencyKey: randomUUID()});
    if (!purchased.ok) throw new Error("membership purchase");
    const intent = await ports.service.createPurchaseIntent(owner.actor, {chartId: owner.chartId, chartVersionId: owner.chartVersionId, sku: "ZIWEI-IDENTITY-P0", locale: "vi"});
    if (!intent.ok) throw new Error(intent.code);
    expect(intent.value.amountLa).toBe(768);
    const before = await createWalletService(ports.repository).readBalance(owner.actor);
    if (!before.ok) throw new Error("balance");
    const unlocked = await ports.service.unlock(owner.actor, {purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion,
      expectedWalletVersion: before.value.stateVersion, idempotencyKey: randomUUID()});
    expect(unlocked).toMatchObject({ok: true, value: {upgradePurchase: null, balance: {totalLa: before.value.totalLa - 768}}});
  }, 15_000);

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

  it("includes monthly member readings at zero, rechecks active membership, and never refunds a free grant", async () => {
    const owner = await ownerFixture("Included monthly owner");
    let current = new Date(frozenNow);
    const ports = walletPorts(owner.userId, { now: () => current });
    const wallet = createWalletService(ports.repository);
    const funded = await ports.repository.grant({ targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID(), 5000), topUpOrderId: null, trustedGrantToken: ports.authority.token });
    if (!funded.ok) throw new Error("fund");
    const members = createMembershipService(database, wallet, { now: () => current, catalog: (sku) => { const product = findLaProduct(sku); return product ? { ...product, availability: "active" } : undefined; } });
    const memberIntent = await members.createIntent(owner.actor, { sku: "MEMBERSHIP-MONTHLY-P0", locale: "vi" });
    if (!memberIntent.ok) throw new Error("member");
    expect(await members.purchase(owner.actor, { purchaseIntentId: memberIntent.value.id, expectedIntentVersion: 1, expectedWalletVersion: funded.value.balance.stateVersion, idempotencyKey: randomUUID() })).toMatchObject({ ok: true });
    current = new Date(frozenNow.getTime() + 29 * 86_400_000);
    topicCatalogGate.enabled = true;
    try {
      const request = { chartId: owner.chartId, chartVersionId: owner.chartVersionId, sku: "ZIWEI-MONTHLY-P0", locale: "vi" };
      await insertWalletSpend(owner, "ZIWEI-PALACE-LIFE-P0", 120, new Date(current.getTime() - 1000));
      const memberQuoteBefore = await quoteSnapshot();
      expect(await ports.service.readQuotes(owner.actor, { chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi" })).toMatchObject({ ok: true, value: { quotes: expect.arrayContaining([
        expect.objectContaining({ sku: "ZIWEI-IDENTITY-P0", priceLa: 768, creditLa: 0, discountLa: 192, creditExpiresAt: null, creditSourceSkus: [] }),
        expect.objectContaining({ sku: "ZIWEI-MONTHLY-P0", priceLa: 0, discountLa: 300 }),
      ]) } });
      expect(await quoteSnapshot()).toEqual(memberQuoteBefore);
      expect(await ports.service.createPurchaseIntent(owner.actor, { ...request, sku: "ZIWEI-IDENTITY-P0" })).toMatchObject({ ok: true, value: { amountLa: 768 } });
      expect(await ports.service.createPurchaseIntent(owner.actor, { ...request, sku: "ZIWEI-YEAR-2026-P0" })).toMatchObject({ ok: true, value: { amountLa: 384 } });
      const intent = await ports.service.createPurchaseIntent(owner.actor, request);
      expect(intent).toMatchObject({ ok: true, value: { amountLa: 0 } });
      const before = await wallet.readBalance(owner.actor);
      if (!intent.ok || !before.ok) throw new Error("intent");
      const command = { purchaseIntentId: intent.value.id, expectedIntentVersion: 1, expectedWalletVersion: before.value.stateVersion, idempotencyKey: randomUUID() };
      const [first, replay] = await Promise.all([ports.service.unlock(owner.actor, command), ports.service.unlock(owner.actor, command)]);
      if (!first.ok) throw new Error(first.code);
      expect(replay).toEqual(first);
      expect(await wallet.readBalance(owner.actor)).toEqual(before);
      const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.reportId, first.value.reportId));
      expect(reservation?.reportConfigVersion).toBe("ziwei.period-reading.report.v1");
      const jobId = randomUUID();
      await database.update(reportReservations).set({ activeJobId: jobId }).where(eq(reportReservations.id, reservation!.id));
      const source = createDatabaseReportGenerationSourceRepository({ database, now: () => current, knowledgeRetrieval: { retrieveKnowledge: vi.fn() } });
      const validate = () => source.validateLifecycle({ reportVersionId: reservation!.reportVersionId, jobId, readingContextRevisionId: null });
      expect(await validate()).toMatchObject({ ok: true });
      const guarantee = createGuaranteeFeedbackService(database, { now: () => current });
      expect(await guarantee.claimGuarantee(owner.actor, { chartId: owner.chartId, reportId: first.value.reportId, partId: "ZIWEI-MONTHLY-P0", rating: "inaccurate", idempotencyKey: randomUUID() })).toMatchObject({ ok: false, code: "GUARANTEE_PRICE_EXCEEDS_LIMIT" });
      current = new Date(frozenNow.getTime() + 30 * 86_400_000);
      expect(await validate()).toMatchObject({ ok: false });
      expect(await createDatabaseReportQueryRepository(database, () => current).readAuthorizedReport(owner.userId, first.value.reportId)).toBeNull();
      const beforeQuote = await quoteSnapshot();
      const monthlyQuote = await ports.service.readQuotes(owner.actor, { chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi" });
      expect(monthlyQuote).toMatchObject({ ok: true, value: { quotes: expect.arrayContaining([expect.objectContaining({ sku: "ZIWEI-MONTHLY-P0", state: "available", priceLa: 300 })]) } });
      expect(await quoteSnapshot()).toEqual(beforeQuote);
      const paidIntent = await ports.service.createPurchaseIntent(owner.actor, request);
      expect(paidIntent).toMatchObject({ ok: true, value: { amountLa: 300 } });
      if (!paidIntent.ok) throw new Error("paid");
      const paid = await ports.service.unlock(owner.actor, { ...command, purchaseIntentId: paidIntent.value.id, idempotencyKey: randomUUID() });
      if (!paid.ok) throw new Error(paid.code);
      expect(paid.value.balance.totalLa).toBe(before.value.totalLa - 300);
      expect(await guarantee.claimGuarantee(owner.actor, { chartId: owner.chartId, reportId: paid.value.reportId, partId: "ZIWEI-MONTHLY-P0", rating: "inaccurate", idempotencyKey: randomUUID() })).toMatchObject({ ok: true, value: { amountLaRestored: 300 } });
    } finally { topicCatalogGate.enabled = false; }
  });

  it("atomically charges a reserved combo once, proves both children, and restores/relocks both once", async () => {
    const audit=await ownerFixture("Combo audit"); const owner=await ownerFixture("Combo buyer");
    const {authority,repository,service}=walletPorts(audit.userId,{reportVersionResolver:v4_1SensitivityReportVersions});
    const request={chartId:owner.chartId,chartVersionId:owner.chartVersionId,sku:"ZIWEI-COMBO-2026-P0",locale:"vi" as const};
    expect((await service.createPurchaseIntent(owner.actor,request)).ok).toBe(false);topicCatalogGate.enabled=true;
    try {
      await repository.grant({targetOwnerId:owner.userId,grant:grant(audit.userId,`combo-grant-${randomUUID()}`,3000),topUpOrderId:null,trustedGrantToken:authority.token});
      const intent=await service.createPurchaseIntent(owner.actor,request);if(!intent.ok)throw new Error(intent.code);expect(intent.value.amountLa).toBe(1300);
      const command={purchaseIntentId:intent.value.id,expectedIntentVersion:1,expectedWalletVersion:2,idempotencyKey:`combo-${randomUUID()}`};
      const [first,replay]=await Promise.all([service.unlock(owner.actor,command),service.unlock(owner.actor,command)]);if(!first.ok)throw new Error(first.code);expect(replay).toMatchObject({ok:true,value:{reportId:first.value.reportId}});expect(first.value.balance.totalLa).toBe(1700);
      const children=await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.chartId,owner.chartId));expect(children).toHaveLength(2);expect(new Set(children.map(child=>child.ledgerSpendId)).size).toBe(1);
      const annual=children.find(child=>child.sku==="ZIWEI-YEAR-2026-P0")!;const lifetime=children.find(child=>child.sku==="ZIWEI-IDENTITY-P0")!;expect(annual.periodKey).toBe("2026");expect(lifetime.periodKey).toBe("lifetime");
      const [year]=await database.select().from(reportReservations).where(eq(reportReservations.entitlementId,annual.id));expect(year).toMatchObject({promptVersion:"ziwei.period-reading.prompt.v1",chartVersionId:owner.chartVersionId});
      const query=createDatabaseReportQueryRepository(database,()=>frozenNow);expect(await query.readAuthorizedReport(owner.userId,first.value.reportId)).not.toBeNull();expect(await query.readAuthorizedReport(owner.userId,year!.reportId)).not.toBeNull();
      expect(await createDatabaseDailyReadingAccess(database)(owner.userId,owner.chartId,frozenNow)).toMatchObject({chartVersionId:owner.chartVersionId});
      const source=createDatabaseReportGenerationSourceRepository({database,now:()=>frozenNow,knowledgeRetrieval:{retrieveKnowledge:vi.fn()}});
      const pairReports=await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId,owner.chartVersionId));
      for(const row of pairReports){const jobId=randomUUID();await database.update(reportReservations).set({activeJobId:jobId}).where(eq(reportReservations.id,row.id));expect(await source.validateLifecycle({reportVersionId:row.reportVersionId,jobId,readingContextRevisionId:null})).toMatchObject({ok:true});}
      expect(await service.createPurchaseIntent(owner.actor,request)).toMatchObject({ok:false,code:"WALLET_ENTITLEMENT_EXISTS"});
      await database.update(commerceEntitlements).set({revokedAt:frozenNow}).where(eq(commerceEntitlements.id,annual.id));expect(await query.readAuthorizedReport(owner.userId,first.value.reportId)).toBeNull();
      await database.update(commerceEntitlements).set({revokedAt:null}).where(eq(commerceEntitlements.id,annual.id));
      await database.update(reportReservations).set({promptVersion:"identity-report.prompt.v1"}).where(eq(reportReservations.id,year!.id));expect(await query.readAuthorizedReport(owner.userId,first.value.reportId)).toBeNull();
      await database.update(reportReservations).set({promptVersion:year!.promptVersion}).where(eq(reportReservations.id,year!.id));
      await expect(database.update(commerceEntitlements).set({periodKey:"2027"}).where(eq(commerceEntitlements.id,annual.id))).rejects.toThrow();
      const guarantee=createGuaranteeFeedbackService(database,{now:()=>frozenNow});expect(await guarantee.claimGuarantee(owner.actor,{chartId:owner.chartId,partId:annual.sku,reportId:year!.reportId,rating:"inaccurate",idempotencyKey:`combo-guarantee-${randomUUID()}`})).toMatchObject({ok:false,code:"GUARANTEE_PRICE_EXCEEDS_LIMIT"});
      const restoration={kind:"restoration" as const,actorId:owner.userId,originalSpendId:annual.ledgerSpendId!,expectedWalletVersion:first.value.balance.stateVersion,reasonCode:"test.combo.restore",requestId:randomUUID(),traceId:randomUUID(),idempotencyKey:randomUUID()};
      expect(await repository.restore({actor:owner.actor,restoration})).toMatchObject({ok:true,value:{balance:{totalLa:3000}}});expect(await repository.restore({actor:owner.actor,restoration})).toMatchObject({ok:true,value:{balance:{totalLa:3000}}});
      expect(await query.readAuthorizedReport(owner.userId,first.value.reportId)).toBeNull();expect(await query.readAuthorizedReport(owner.userId,year!.reportId)).toBeNull();
      expect((await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.chartId,owner.chartId))).every(child=>child.revokedAt!==null)).toBe(true);
      expect(await createDatabaseDailyReadingAccess(database)(owner.userId,owner.chartId,frozenNow)).toBeNull();
    } finally {topicCatalogGate.enabled=false;}
  });

  it("reuses the natal generation from a palace and rejects a combo when an annual component is already owned", async () => {
    const audit=await ownerFixture("Combo reuse audit");const owner=await ownerFixture("Combo reuse buyer");const {authority,repository,service}=walletPorts(audit.userId,{reportVersionResolver:v4_1SensitivityReportVersions});topicCatalogGate.enabled=true;
    try {
      await repository.grant({targetOwnerId:owner.userId,grant:grant(audit.userId,`combo-reuse-${randomUUID()}`,4000),topUpOrderId:null,trustedGrantToken:authority.token});
      const palace=await service.createPurchaseIntent(owner.actor,{chartId:owner.chartId,chartVersionId:owner.chartVersionId,sku:"ZIWEI-PALACE-LIFE-P0",locale:"vi"});if(!palace.ok)throw new Error(palace.code);
      const initial=await service.unlock(owner.actor,{purchaseIntentId:palace.value.id,expectedIntentVersion:1,expectedWalletVersion:2,idempotencyKey:randomUUID()});if(!initial.ok)throw new Error(initial.code);
      const combo=await service.createPurchaseIntent(owner.actor,{chartId:owner.chartId,chartVersionId:owner.chartVersionId,sku:"ZIWEI-COMBO-2026-P0",locale:"vi"});if(!combo.ok)throw new Error(combo.code);expect(combo.value.amountLa).toBe(1300);
      const bundled=await service.unlock(owner.actor,{purchaseIntentId:combo.value.id,expectedIntentVersion:1,expectedWalletVersion:initial.value.balance.stateVersion,idempotencyKey:randomUUID()});if(!bundled.ok)throw new Error(bundled.code);expect(bundled.value.reportId).toBe(initial.value.reportId);expect(bundled.value.balance.totalLa).toBe(2580);
      const reports=await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId,owner.chartVersionId));expect(reports).toHaveLength(2);expect(reports.filter(row=>row.promptVersion!=="ziwei.period-reading.prompt.v1")).toHaveLength(1);
      const other=await ownerFixture("Already annual");const otherPorts=walletPorts(audit.userId);await otherPorts.repository.grant({targetOwnerId:other.userId,grant:grant(audit.userId,`annual-owned-${randomUUID()}`,3000),topUpOrderId:null,trustedGrantToken:otherPorts.authority.token});
      const year=await otherPorts.service.createPurchaseIntent(other.actor,{chartId:other.chartId,chartVersionId:other.chartVersionId,sku:"ZIWEI-YEAR-2026-P0",locale:"vi"});if(!year.ok)throw new Error(year.code);expect((await otherPorts.service.unlock(other.actor,{purchaseIntentId:year.value.id,expectedIntentVersion:1,expectedWalletVersion:2,idempotencyKey:randomUUID()})).ok).toBe(true);
      expect(await otherPorts.service.createPurchaseIntent(other.actor,{chartId:other.chartId,chartVersionId:other.chartVersionId,sku:"ZIWEI-COMBO-2026-P0",locale:"vi"})).toMatchObject({ok:false,code:"WALLET_ENTITLEMENT_EXISTS"});
    } finally {topicCatalogGate.enabled=false;}
  });

  it("charges the approved member combo price without rollover stacking and keeps purchased access after membership expiry", async () => {
    const owner=await ownerFixture("Member combo buyer");let current=new Date(frozenNow);const ports=walletPorts(owner.userId,{now:()=>current,reportVersionResolver:v4_1SensitivityReportVersions});topicCatalogGate.enabled=true;
    try {
      const funded=await ports.repository.grant({targetOwnerId:owner.userId,grant:grant(owner.userId,`member-combo-${randomUUID()}`,5000),topUpOrderId:null,trustedGrantToken:ports.authority.token});if(!funded.ok)throw new Error("fund");
      const membership=createMembershipService(database,createWalletService(ports.repository),{now:()=>current,catalog:sku=>{const product=findLaProduct(sku);return product?{...product,availability:"active"}:undefined;}});
      const subscription=await membership.createIntent(owner.actor,{sku:"MEMBERSHIP-MONTHLY-P0",locale:"vi"});if(!subscription.ok)throw new Error("subscription");expect((await membership.purchase(owner.actor,{purchaseIntentId:subscription.value.id,expectedIntentVersion:1,expectedWalletVersion:funded.value.balance.stateVersion,idempotencyKey:randomUUID()})).ok).toBe(true);
      const before=await createWalletService(ports.repository).readBalance(owner.actor);if(!before.ok)throw new Error("balance");
      const intent=await ports.service.createPurchaseIntent(owner.actor,{chartId:owner.chartId,chartVersionId:owner.chartVersionId,sku:"ZIWEI-COMBO-2026-P0",locale:"vi"});if(!intent.ok)throw new Error(intent.code);expect(intent.value.amountLa).toBe(1040);
      const paid=await ports.service.unlock(owner.actor,{purchaseIntentId:intent.value.id,expectedIntentVersion:1,expectedWalletVersion:before.value.stateVersion,idempotencyKey:randomUUID()});if(!paid.ok)throw new Error(paid.code);expect(paid.value.balance.totalLa).toBe(before.value.totalLa-1040);
      current=new Date(frozenNow.getTime()+31*86400000);const query=createDatabaseReportQueryRepository(database,()=>current);const reports=await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId,owner.chartVersionId));expect(reports).toHaveLength(2);for(const report of reports)expect(await query.readAuthorizedReport(owner.userId,report.reportId)).not.toBeNull();
    } finally {topicCatalogGate.enabled=false;}
  });

  it("rolls back the combo debit and both report children when fulfillment fails", async () => {
    const audit=await ownerFixture("Combo rollback audit");const owner=await ownerFixture("Combo rollback buyer");const {authority,repository,service}=walletPorts(audit.userId,{reportVersionResolver:v4_1SensitivityReportVersions});topicCatalogGate.enabled=true;
    try {
      await repository.grant({targetOwnerId:owner.userId,grant:grant(audit.userId,`combo-rollback-${randomUUID()}`),topUpOrderId:null,trustedGrantToken:authority.token});
      const intent=await service.createPurchaseIntent(owner.actor,{chartId:owner.chartId,chartVersionId:owner.chartVersionId,sku:"ZIWEI-COMBO-2026-P0",locale:"vi"});if(!intent.ok)throw new Error(intent.code);
      const original=comboReservations.reserveComboReports;const failure=vi.spyOn(comboReservations,"reserveComboReports").mockImplementationOnce(async(db,input)=>{await original(db,input);throw new Error("injected after both children");});
      try {await expect(service.unlock(owner.actor,{purchaseIntentId:intent.value.id,expectedIntentVersion:1,expectedWalletVersion:2,idempotencyKey:`combo-fail-${randomUUID()}`})).rejects.toThrow("injected after both children");} finally {failure.mockRestore();}
      expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.chartId,owner.chartId))).toHaveLength(0);
      expect(await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId,owner.chartVersionId))).toHaveLength(0);
      const [account]=await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId,owner.userId));expect(account).toMatchObject({promotionalBalance:2000,stateVersion:2});
    } finally {topicCatalogGate.enabled=false;}
  });

  it("scopes monthly spends across lunar years, rejects stale quotes atomically, and refunds only the selected period", async () => {
    const audit = await ownerFixture("Period audit"); const owner = await ownerFixture("Period buyer");
    let current = new Date("2026-01-15T12:00:00.000Z");
    const {authority,repository,service}=walletPorts(audit.userId,{now:()=>current});
    const request={chartId:owner.chartId,chartVersionId:owner.chartVersionId,sku:"ZIWEI-MONTHLY-P0",locale:"vi" as const};
    expect(await service.createPurchaseIntent(owner.actor,request)).toMatchObject({ok:false,code:"WALLET_INTENT_INVALID"});
    topicCatalogGate.enabled=true;
    try {
      await repository.grant({targetOwnerId:owner.userId,grant:grant(audit.userId,`period-grant-${randomUUID()}`),topUpOrderId:null,trustedGrantToken:authority.token});
      const first=await service.createPurchaseIntent(owner.actor,request);if(!first.ok)throw new Error(first.code);expect(first.value.amountLa).toBe(300);
      const command={purchaseIntentId:first.value.id,expectedIntentVersion:1,expectedWalletVersion:2,idempotencyKey:`period-first-${randomUUID()}`};
      const results=await Promise.all([service.unlock(owner.actor,command),service.unlock(owner.actor,command)]);
      const paid=results[0]!;if(!paid.ok)throw new Error(paid.code);expect(results[1]).toMatchObject({ok:true,value:{reportId:paid.value.reportId}});expect(paid.value.balance.totalLa).toBe(1700);
      const [firstIntent]=await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id,first.value.id));expect(firstIntent?.periodKey).toBe("2025-11-regular");
      expect(await service.createPurchaseIntent(owner.actor,request)).toMatchObject({ok:false,code:"WALLET_ENTITLEMENT_EXISTS"});
      current=new Date("2026-02-20T12:00:00.000Z");
      const stale=await service.createPurchaseIntent(owner.actor,request);if(!stale.ok)throw new Error(stale.code);
      current=new Date("2026-03-20T12:00:00.000Z");
      expect((await service.unlock(owner.actor,{purchaseIntentId:stale.value.id,expectedIntentVersion:1,expectedWalletVersion:paid.value.balance.stateVersion,idempotencyKey:`period-stale-${randomUUID()}`})).ok).toBe(false);
      const fresh=await service.createPurchaseIntent(owner.actor,request);if(!fresh.ok)throw new Error(fresh.code);expect(fresh.value.id).not.toBe(stale.value.id);
      const next=await service.unlock(owner.actor,{purchaseIntentId:fresh.value.id,expectedIntentVersion:1,expectedWalletVersion:paid.value.balance.stateVersion,idempotencyKey:`period-next-${randomUUID()}`});if(!next.ok)throw new Error(next.code);expect(next.value.balance.totalLa).toBe(1400);expect(next.value.reportId).not.toBe(paid.value.reportId);
      const reservations=await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId,owner.chartVersionId));expect(reservations).toHaveLength(2);expect(reservations.every(row=>row.promptVersion==="ziwei.period-reading.prompt.v1")).toBe(true);
      const query=createDatabaseReportQueryRepository(database);expect(await query.readAuthorizedReport(owner.userId,paid.value.reportId)).not.toBeNull();expect(await query.readAuthorizedReport(owner.userId,next.value.reportId)).not.toBeNull();
      const guarantee=createGuaranteeFeedbackService(database,{now:()=>current});const claim={chartId:owner.chartId,partId:request.sku,rating:"inaccurate" as const,idempotencyKey:`period-refund-${randomUUID()}`};
      expect(await guarantee.claimGuarantee(owner.actor,claim)).toMatchObject({ok:false,code:"GUARANTEE_ENTITLEMENT_NOT_FOUND"});
      const exact={...claim,reportId:next.value.reportId};expect(await guarantee.claimGuarantee(owner.actor,exact)).toMatchObject({ok:true,value:{amountLaRestored:300}});expect(await guarantee.claimGuarantee(owner.actor,exact)).toMatchObject({ok:true});
      expect(await guarantee.claimGuarantee(owner.actor,{...exact,reportId:paid.value.reportId})).toMatchObject({ok:false,code:"GUARANTEE_IDEMPOTENCY_CONFLICT"});
      expect(await query.readAuthorizedReport(owner.userId,next.value.reportId)).toBeNull();expect(await query.readAuthorizedReport(owner.userId,paid.value.reportId)).not.toBeNull();
    } finally {topicCatalogGate.enabled=false;}
  });

  it("reserves annual sales, charges exactly 480 for 2026, and rejects a quote after the year boundary", async () => {
    const audit=await ownerFixture("Annual audit");const owner=await ownerFixture("Annual buyer");let current=new Date("2026-12-31T12:00:00.000Z");const {authority,repository,service}=walletPorts(audit.userId,{now:()=>current});
    const request={chartId:owner.chartId,chartVersionId:owner.chartVersionId,sku:"ZIWEI-YEAR-2026-P0",locale:"vi" as const};
    expect((await service.createPurchaseIntent(owner.actor,request)).ok).toBe(false);topicCatalogGate.enabled=true;
    try {
      await repository.grant({targetOwnerId:owner.userId,grant:grant(audit.userId,`annual-grant-${randomUUID()}`),topUpOrderId:null,trustedGrantToken:authority.token});
      const intent=await service.createPurchaseIntent(owner.actor,request);if(!intent.ok)throw new Error(intent.code);expect(intent.value.amountLa).toBe(480);
      current=new Date("2027-01-01T12:00:00.000Z");expect((await service.unlock(owner.actor,{purchaseIntentId:intent.value.id,expectedIntentVersion:1,expectedWalletVersion:2,idempotencyKey:`annual-stale-${randomUUID()}`})).ok).toBe(false);expect((await service.createPurchaseIntent(owner.actor,request)).ok).toBe(false);
      current=new Date("2026-12-31T12:00:00.000Z");const result=await service.unlock(owner.actor,{purchaseIntentId:intent.value.id,expectedIntentVersion:1,expectedWalletVersion:2,idempotencyKey:`annual-valid-${randomUUID()}`});if(!result.ok)throw new Error(result.code);expect(result.value.balance.totalLa).toBe(1520);
      const [entitlement]=await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.chartId,owner.chartId));expect(entitlement).toMatchObject({periodKey:"2026",scope:{sections:["periodReading"]}});
      const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.reportId, result.value.reportId));
      const frozen = reservation!;
      const profile = NormalizedBirthProfileV1Schema.parse({ version: 1, originalInput: { version: 1, calendar: { kind: "solar", date: "1990-05-12" }, time: { precision: "exact_minute", localTime: "08:30" }, timezone: { offsetMinutes: 420 }, consentVersion: "fixture", gender: "male" }, normalizedCalendar: { kind: "solar", date: "1990-05-12" }, normalizedTime: { precision: "exact_minute", localTime: "08:30" }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] });
      const snapshot = await calculateIztroReportSnapshot({ birthProfile: profile, chartVersionId: owner.chartVersionId, asOfDate: frozen.asOfDate!, targetYear: 2026, timingRuleVersion: frozen.timingRuleVersion!, sensitivityRuleVersion: frozen.sensitivityRuleVersion!, periodReading: { chartId: owner.chartId, kind: "annual" } });
      if (!snapshot.ok) throw new Error(snapshot.error.code);
      const facts = snapshot.value.periodReading!;
      const period = facts.periods.find((item) => item.obstacleStarIds.length > 0)!;
      expect(period).toBeDefined();
      const persisted = await createDatabaseReportSourceSnapshotRepository(database).persist({ version: 1, reportId: frozen.reportId, reportVersionId: frozen.reportVersionId, chartVersionId: frozen.chartVersionId, asOfDate: frozen.asOfDate, targetYear: 2026, timingRuleVersion: frozen.timingRuleVersion, sensitivityRuleVersion: frozen.sensitivityRuleVersion, snapshotHash: snapshot.value.provenance.snapshotHash, snapshot: snapshot.value });
      expect(persisted.ok).toBe(true);
      const preferenceStore = createDatabaseNotificationPreferenceStore(database, "fixture", () => current);
      const notices = createHanMonthReminderService(database, { preferenceStore, tokenSecret: "fixture", now: () => current, resolveLunarDay: () => ({ year: period.year, month: period.month, isLeapMonth: period.isLeapMonth, day: period.dayRange[0] }) });
      expect(await notices.requestFor(frozen.reportId)).toBeNull();
      await database.insert(consents).values({ id: randomUUID(), userId: owner.userId, purpose: "offers", documentKey: "privacy", documentVersion: "v1", grantedAt: current });
      expect(await notices.requestFor(frozen.reportId)).toBeNull(); // Payment alone is not a ready report.
      const tuple = periodReportVersions();
      await database.insert(reportVersions).values({ reportId: frozen.reportId, reportVersionId: frozen.reportVersionId, entitlementId: frozen.entitlementId, chartVersionId: frozen.chartVersionId, evidenceVersionId: frozen.evidenceVersionId, knowledgeVersionId: frozen.knowledgeVersionId, promptVersion: frozen.promptVersion, reportConfigVersion: frozen.reportConfigVersion, locale: "vi", sku: frozen.sku, templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion, providerId: "fixture", modelId: "fixture", contentHash: "a".repeat(64), pdfAssetId: randomUUID(), htmlContent: "<p>fixture</p>", structuredContent: { version: 1, contentVersion: "ziwei.period-reading.v1", locale: "vi", kind: "annual", targetYear: 2026, calendar: "lunar", periodKey: "2026", title: "Vận hạn năm 2026", overview: { narrative: "Nội dung thử nghiệm.", evidenceKeys: facts.evidenceKeys }, periods: facts.periods.map((item) => ({ periodId: item.id, title: `Tháng ${item.month}`, narrative: "Nội dung thử nghiệm.", recommendations: ["Ghi lại ưu tiên.", "Trao đổi rõ ràng."], cautions: ["Dành thời gian chuẩn bị."], evidenceKeys: item.evidenceKeys })) } });
      await database.update(reportReservations).set({ status: "complete" }).where(eq(reportReservations.id, frozen.id));
      const notice = await notices.requestFor(frozen.reportId);
      expect(notice).toMatchObject({ marker: "warn", periodId: period.id, monthIndex: period.month, chartVersionId: owner.chartVersionId });
      if (!notice) throw new Error("missing reminder");
      expect(await notices.isEligible(notice)).toBe(true);
      expect(await notices.isEligible({ ...notice, actionUrl: "https://evil.test" })).toBe(false);
      expect(await notices.scanAndEnqueue()).toBeGreaterThan(0);
      await notices.scanAndEnqueue();
      expect(await database.select().from(notificationDeliveries).where(eq(notificationDeliveries.idempotencyKey, notice.idempotencyKey))).toHaveLength(1);
      await preferenceStore.updatePreferences(owner.userId, { nurtureEmailsAllowed: false, hanRemindersAllowed: true });
      expect(await notices.isEligible(notice)).toBe(true);
      let sent = 0;
      const mail = createAuthEmailDeliveryService({ store: createDatabaseAuthEmailDeliveryStore(database), provider: { async send() { sent += 1; return { ok: true as const, providerMessageId: "han-fixture" }; } }, recipientFingerprintSecret: "fixture", preferenceChecker: preferenceStore, hanReminderEligibility: notices.isEligible, now: () => current });
      expect((await mail.send(notice)).status).toBe("sent");
      expect((await mail.send(notice)).status).toBe("sent");
      expect(sent).toBe(1);

      await preferenceStore.updatePreferences(owner.userId, { hanRemindersAllowed: false });
      expect(await notices.isEligible(notice)).toBe(false);
      await preferenceStore.updatePreferences(owner.userId, { hanRemindersAllowed: true });
      await database.update(commerceEntitlements).set({ revokedAt: current }).where(eq(commerceEntitlements.id, entitlement!.id));
      expect(await notices.isEligible(notice)).toBe(false);

    } finally {topicCatalogGate.enabled=false;}
  }, 30_000);

  it("keeps topics reserved, then atomically binds an approved 480 Lá topic to its own immutable reservation", async () => {
    const audit = await ownerFixture("Topic audit");
    const owner = await ownerFixture("Topic buyer");
    const { authority, repository, service } = walletPorts(audit.userId);
    const request = { chartId: owner.chartId, chartVersionId: owner.chartVersionId, sku: "ZIWEI-RELATIONSHIP-P0", locale: "vi" as const };
    expect(await service.createPurchaseIntent(owner.actor, request)).toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });
    topicCatalogGate.enabled = true;
    try {
      const funded = await repository.grant({ targetOwnerId: owner.userId, grant: grant(audit.userId, `topic-grant-${randomUUID()}`), topUpOrderId: null, trustedGrantToken: authority.token });
      expect(funded.ok).toBe(true);
      const intent = await service.createPurchaseIntent(owner.actor, request);
      if (!intent.ok) throw new Error(intent.code);
      expect(intent.value.amountLa).toBe(480);
      const command = { purchaseIntentId: intent.value.id, expectedIntentVersion: 1, expectedWalletVersion: 2, idempotencyKey: `topic-unlock-${randomUUID()}` };
      const [first, replay] = await Promise.all([service.unlock(owner.actor, command), service.unlock(owner.actor, command)]);
      expect(first.ok && replay.ok).toBe(true);
      if (!first.ok || !replay.ok) throw new Error("topic unlock failed");
      expect(first.value.reportId).toBe(replay.value.reportId);
      expect(first.value.balance.totalLa).toBe(1520);
      const reservations = await database.select().from(reportReservations).where(eq(reportReservations.reportId, first.value.reportId));
      expect(reservations).toHaveLength(1);
      expect(reservations[0]).toMatchObject({ sku: request.sku, chartVersionId: owner.chartVersionId, promptVersion: "ziwei.topic-deep-dive.prompt.v1", reportConfigVersion: "ziwei.topic-deep-dive.report.v1", status: "requested" });
      const [entitlement] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.id, reservations[0]!.entitlementId));
      expect(entitlement?.scope).toEqual({ sections: ["topicDeepDive"] });
      const events = await database.select().from(outbox).where(eq(outbox.aggregateId, first.value.reportId));
      expect(events).toHaveLength(1);
      expect(events[0]?.payload).toMatchObject({ sku: request.sku, chartVersionId: owner.chartVersionId });
      const query = createDatabaseReportQueryRepository(database);
      expect(await query.readAuthorizedReport(owner.userId, first.value.reportId)).not.toBeNull();
      const guarantee = createGuaranteeFeedbackService(database, { now: () => frozenNow });
      const claim = { chartId: owner.chartId, partId: request.sku, reportId: first.value.reportId, rating: "inaccurate" as const, idempotencyKey: `topic-restore-${randomUUID()}` };
      const restored = await guarantee.claimGuarantee(owner.actor, claim);
      expect(restored).toMatchObject({ ok: true, value: { amountLaRestored: 480 } });
      expect(await query.readAuthorizedReport(owner.userId, first.value.reportId)).toBeNull();
      expect(await guarantee.claimGuarantee(owner.actor, claim)).toMatchObject({ ok: true });
    } finally { topicCatalogGate.enabled = false; }
  });

  it("replaces an unpaid pending intent when the chart is recalculated into a newer version", async () => {
    const owner = await ownerFixture("Recalculated chart");
    const { service } = walletPorts(owner.userId);
    const first = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
    });
    if (!first.ok) throw new Error("expected first intent");

    const [previousVersion] = await database.select().from(ziweiChartVersions).where(eq(ziweiChartVersions.id, owner.chartVersionId));
    const newerVersionId = `chart-version-${randomUUID()}`;
    const newerRunId = randomUUID();
    const [previousRun] = await database.select().from(calculationRuns).where(eq(calculationRuns.id, previousVersion!.calculationRunId));
    await database.insert(calculationRuns).values({ ...previousRun!, id: newerRunId, idempotencyKey: `run-${newerRunId}` });
    await database.insert(ziweiChartVersions).values({
      id: newerVersionId,
      chartId: owner.chartId,
      calculationRunId: newerRunId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });
    await database.insert(evidenceSets).values({
      id: `evidence-${randomUUID()}`,
      chartVersionId: newerVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    const second = await service.createPurchaseIntent(owner.actor, {
      chartId: owner.chartId,
      chartVersionId: newerVersionId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      locale: "vi",
    });

    expect(second).toMatchObject({ ok: true, reused: false });
    if (!second.ok) throw new Error("expected second intent");
    expect(second.value.id).not.toBe(first.value.id);
    const [cancelled] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, first.value.id));
    expect(cancelled?.status).toBe("cancelled");
  });

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

  it.each(["restored", "revoked", "terminal", "ready_restored"])("preserves spend and fulfillment safeguards when the original reservation is %s", async (failure) => {
    const owner = await ownerFixture(`Orphan ${failure}`);
    const { authority, repository, service } = walletPorts(owner.userId);
    await repository.grant({ targetOwnerId: owner.userId, grant: grant(owner.userId, `orphan-${failure}`), topUpOrderId: null, trustedGrantToken: authority.token });
    async function buy(sku: string, key: string) {
      const intent = await service.createPurchaseIntent(owner.actor, { chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi", sku });
      if (!intent.ok) throw new Error(intent.code);
      const [account] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
      return service.unlock(owner.actor, { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: account!.stateVersion, idempotencyKey: key });
    }
    expect(await buy("ZIWEI-PALACE-LIFE-P0", `origin-${failure}`)).toMatchObject({ ok: true });
    const [original] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId));
    const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.entitlementId, original!.id));
    if (failure === "ready_restored") {
      const frozen = reservation!;
      await database.insert(reportVersions).values({
        reportId: frozen.reportId, reportVersionId: frozen.reportVersionId, entitlementId: frozen.entitlementId,
        chartVersionId: frozen.chartVersionId, evidenceVersionId: frozen.evidenceVersionId,
        knowledgeVersionId: frozen.knowledgeVersionId, promptVersion: frozen.promptVersion,
        reportConfigVersion: frozen.reportConfigVersion, templateVersion: "fixture", locale: frozen.locale,
        sku: frozen.sku, providerId: "fixture", modelId: "fixture", structuredContent: {},
        htmlContent: "<p>fixture</p>", contentHash: "a".repeat(64), pdfAssetId: randomUUID(), renderVersion: "fixture",
      });
      await database.update(reportReservations).set({ status: "complete" }).where(eq(reportReservations.id, frozen.id));
    }
    if (failure === "restored" || failure === "ready_restored") {
      const [account] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
      expect(await repository.restore({ actor: owner.actor, restoration: { kind: "restoration", actorId: owner.userId, originalSpendId: original!.ledgerSpendId!, expectedWalletVersion: account!.stateVersion, reasonCode: "test.orphan.restore", requestId: "orphan-restore", traceId: "orphan-restore", idempotencyKey: `restore-${failure}` } })).toMatchObject({ ok: true });
    } else if (failure === "revoked") {
      await database.update(commerceEntitlements).set({ revokedAt: frozenNow }).where(eq(commerceEntitlements.id, original!.id));
    } else {
      await database.update(reportReservations).set({ status: "terminal_failure" }).where(eq(reportReservations.id, reservation!.id));
    }
    const [before] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    if (failure === "ready_restored") {
      expect(await buy("ZIWEI-PALACE-SPOUSE-P0", `second-${failure}`)).toMatchObject({ ok: true, value: { reportId: reservation!.reportId } });
      expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId))).toHaveLength(2);
      expect(await database.select().from(reportEntitlementLinks).where(eq(reportEntitlementLinks.reservationId, reservation!.id))).toHaveLength(1);
    } else {
      await expect(buy("ZIWEI-PALACE-SPOUSE-P0", `second-${failure}`)).rejects.toThrow("NATAL_REPORT_RECOVERY_REQUIRED");
      const [after] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
      expect(after).toEqual(before);
      expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId))).toHaveLength(1);
      expect(await database.select().from(reportEntitlementLinks).where(eq(reportEntitlementLinks.reservationId, reservation!.id))).toHaveLength(0);
    }
  });

  it("fulfills an already-paid linked palace after restoring the original purchase and rejects invalid replacement authority", async () => {
    const owner = await ownerFixture("Linked pending owner");
    const outsider = await ownerFixture("Linked pending outsider");
    const { authority, repository, service } = walletPorts(owner.userId);
    await repository.grant({ targetOwnerId: owner.userId, grant: grant(owner.userId, `linked-pending-${randomUUID()}`), topUpOrderId: null, trustedGrantToken: authority.token });
    async function buy(sku: string) {
      const intent = await service.createPurchaseIntent(owner.actor, { chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi", sku });
      if (!intent.ok) throw new Error(intent.code);
      const [account] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
      return service.unlock(owner.actor, { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: account!.stateVersion, idempotencyKey: randomUUID() });
    }
    expect(await buy("ZIWEI-PALACE-LIFE-P0")).toMatchObject({ ok: true });
    expect(await buy("ZIWEI-PALACE-SPOUSE-P0")).toMatchObject({ ok: true });
    const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId));
    const purchases = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId));
    const origin = purchases.find((item) => item.id === reservation!.entitlementId)!;
    const linked = purchases.find((item) => item.id !== origin.id)!;
    const jobId = randomUUID();
    await database.update(reportReservations).set({ activeJobId: jobId }).where(eq(reportReservations.id, reservation!.id));
    let lifecycleNow = frozenNow;
    const source = createDatabaseReportGenerationSourceRepository({ database, now: () => lifecycleNow, knowledgeRetrieval: { retrieveKnowledge: vi.fn() } });
    const validate = () => source.validateLifecycle({ reportVersionId: reservation!.reportVersionId, jobId, readingContextRevisionId: null });
    expect(await validate()).toMatchObject({ ok: true });
    const [account] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    expect(await repository.restore({ actor: owner.actor, restoration: { kind: "restoration", actorId: owner.userId, originalSpendId: origin.ledgerSpendId!, expectedWalletVersion: account!.stateVersion, reasonCode: "test.linked.restore", requestId: randomUUID(), traceId: randomUUID(), idempotencyKey: randomUUID() } })).toMatchObject({ ok: true });
    expect(await validate()).toMatchObject({ ok: true });
    await expect(database.update(commerceEntitlements).set({ ownerId: outsider.userId }).where(eq(commerceEntitlements.id, linked.id))).rejects.toThrow();
    expect(await createDatabaseReportQueryRepository(database).readAuthorizedReport(outsider.userId, reservation!.reportId)).toBeNull();
    await database.update(commerceEntitlements).set({ ownerId: owner.userId, revokedAt: frozenNow }).where(eq(commerceEntitlements.id, linked.id));
    expect(await validate()).toMatchObject({ ok: false });
    await database.update(commerceEntitlements).set({ revokedAt: null }).where(eq(commerceEntitlements.id, linked.id));
    expect(await validate()).toMatchObject({ ok: true });
    lifecycleNow = new Date(frozenNow.getTime() + 1_000);
    await database.update(commerceEntitlements).set({ expiresAt: lifecycleNow }).where(eq(commerceEntitlements.id, linked.id));
    expect(await validate()).toMatchObject({ ok: false });
    await database.update(commerceEntitlements).set({ expiresAt: null }).where(eq(commerceEntitlements.id, linked.id));
    await database.delete(reportEntitlementLinks).where(eq(reportEntitlementLinks.entitlementId, linked.id));
    expect(await validate()).toMatchObject({ ok: false });
    await database.insert(reportEntitlementLinks).values({ entitlementId: linked.id, reservationId: reservation!.id, createdAt: frozenNow });
    expect(await validate()).toMatchObject({ ok: true });
    // A third purchase can safely join the still-authorized pending generation.
    expect(await buy("ZIWEI-NATAL-EXCERPT-P0")).toMatchObject({ ok: true, value: { reportId: reservation!.reportId } });
    const [frozen] = await database.select().from(reportReservations).where(eq(reportReservations.id, reservation!.id));
    expect(frozen).toMatchObject({ entitlementId: origin.id, sku: origin.sku, reportVersionId: reservation!.reportVersionId });
    expect(await database.select().from(outbox).where(eq(outbox.idempotencyKey, `report-request:${reservation!.reportVersionId}`))).toHaveLength(1);
    for (const purchase of (await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId))).filter((item) => item.id !== origin.id)) {
      const [current] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
      expect(await repository.restore({ actor: owner.actor, restoration: { kind: "restoration", actorId: owner.userId, originalSpendId: purchase.ledgerSpendId!, expectedWalletVersion: current!.stateVersion, reasonCode: "test.linked.restore", requestId: randomUUID(), traceId: randomUUID(), idempotencyKey: randomUUID() } })).toMatchObject({ ok: true });
    }
    expect(await validate()).toMatchObject({ ok: false });
  });

  it("shares one generation across two palaces, excerpt and rollover lifetime, with linked replay and isolated access", async () => {
    const audit = await ownerFixture("Shared generation audit");
    const owner = await ownerFixture("Shared generation owner");
    const outsider = await ownerFixture("Shared generation outsider");
    const { authority, repository, service } = walletPorts(audit.userId);
    const funded = await repository.grant({ targetOwnerId: owner.userId, grant: grant(audit.userId, `shared-${randomUUID()}`), topUpOrderId: null, trustedGrantToken: authority.token });
    expect(funded.ok).toBe(true);
    const reportIds: string[] = [];
    for (const [index, sku] of ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-SPOUSE-P0", "ZIWEI-NATAL-EXCERPT-P0", "ZIWEI-IDENTITY-P0"].entries()) {
      const intent = await service.createPurchaseIntent(owner.actor, { chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi", sku });
      if (!intent.ok) throw new Error(intent.code);
      expect(intent.value.amountLa).toBe([120, 120, 240, 480][index]);
      const [account] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
      const request = { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: account!.stateVersion, idempotencyKey: `shared-unlock-${randomUUID()}` };
      const result = await service.unlock(owner.actor, request);
      if (!result.ok) throw new Error(result.code);
      reportIds.push(result.value.reportId);
      expect(await service.unlock(owner.actor, request)).toMatchObject({ ok: true, value: { reportId: result.value.reportId } });
      const read = await createDatabaseReportQueryRepository(database).readAuthorizedReport(owner.userId, result.value.reportId);
      expect(read?.entitlements).toHaveLength(index + 1);
      expect(await createDatabaseReportQueryRepository(database).readAuthorizedReport(outsider.userId, result.value.reportId)).toBeNull();
    }
    expect(new Set(reportIds).size).toBe(1);
    const reservations = await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId));
    expect(reservations).toHaveLength(1);
    expect(await database.select().from(reportEntitlementLinks).where(eq(reportEntitlementLinks.reservationId, reservations[0]!.id))).toHaveLength(3);
    expect(await database.select().from(outbox).where(eq(outbox.idempotencyKey, `report-request:${reservations[0]!.reportVersionId}`))).toHaveLength(1);
    const [origin] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.id, reservations[0]!.entitlementId));
    const [account] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    const restored = await repository.restore({ actor: owner.actor, restoration: {
      kind: "restoration", actorId: owner.userId, originalSpendId: origin!.ledgerSpendId!, expectedWalletVersion: account!.stateVersion,
      reasonCode: "test.shared.origin.restore", requestId: "shared-restore", traceId: "shared-restore", idempotencyKey: `shared-restore-${randomUUID()}`,
    } });
    expect(restored.ok).toBe(true);
    const remaining = await createDatabaseReportQueryRepository(database).readAuthorizedReport(owner.userId, reportIds[0]!);
    expect(remaining?.entitlements).toHaveLength(3);
    expect(remaining?.entitlements.some((item) => item.id === origin!.id)).toBe(false);
    const bonusAccess = createDatabaseDailyReadingAccess(database);
    const [lifetime] = await database.select().from(commerceEntitlements).where(and(
      eq(commerceEntitlements.ownerId, owner.userId), eq(commerceEntitlements.sku, "ZIWEI-IDENTITY-P0"),
    ));
    expect(await bonusAccess(owner.userId, owner.chartId, frozenNow)).toMatchObject({
      chartVersionId: owner.chartVersionId, grantedAt: frozenNow,
      expiresAt: new Date(frozenNow.getTime() + 7 * 86_400_000),
    });
    expect(await bonusAccess(outsider.userId, owner.chartId, frozenNow)).toBeNull();
    expect(await bonusAccess(owner.userId, owner.chartId, new Date(frozenNow.getTime() + 7 * 86_400_000))).toBeNull();
    await database.update(commerceEntitlements).set({ revokedAt: frozenNow }).where(eq(commerceEntitlements.id, lifetime!.id));
    expect(await bonusAccess(owner.userId, owner.chartId, frozenNow)).toBeNull();
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

  it("serializes distinct wallet and VND natal purchases onto one reservation", async () => {
    const audit = await ownerFixture("Mixed purchase audit");
    const owner = await ownerFixture("Mixed purchase owner");
    const { authority, repository, service } = walletPorts(audit.userId);
    await repository.grant({ targetOwnerId: owner.userId, grant: grant(audit.userId, `mixed-${randomUUID()}`), topUpOrderId: null, trustedGrantToken: authority.token });
    const intent = await service.createPurchaseIntent(owner.actor, { chartId: owner.chartId, chartVersionId: owner.chartVersionId, sku: "ZIWEI-PALACE-LIFE-P0", locale: "vi" });
    if (!intent.ok) throw new Error(intent.code);
    const commerce = createDatabaseCommerceRepository(database, { now: () => frozenNow });
    const order = await commerce.createOrder(owner.actor, owner.chartId, "ZIWEI-NATAL-EXCERPT-P0", "vi");
    if (!order.ok) throw new Error(order.code);
    const request = { purchaseIntentId: intent.value.id, expectedIntentVersion: 1, expectedWalletVersion: 2, idempotencyKey: `mixed-unlock-${randomUUID()}` };
    const [paid, unlocked] = await Promise.all([
      commerce.recordPaid({ invoiceNumber: order.value.invoiceNumber, providerEventId: `mixed-paid-${randomUUID()}`, amount: 19_000, currency: "VND", traceId: "mixed-test" }),
      service.unlock(owner.actor, request),
    ]);
    expect(paid).toMatchObject({ ok: true });
    if (!unlocked.ok) throw new Error(unlocked.code);
    expect(await service.unlock(owner.actor, request)).toMatchObject({ ok: true });
    expect(await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId))).toHaveLength(1);
    const read = await createDatabaseReportQueryRepository(database).readAuthorizedReport(owner.userId, unlocked.value.reportId);
    expect(read?.entitlements.map((item) => item.sku).sort()).toEqual(["ZIWEI-NATAL-EXCERPT-P0", "ZIWEI-PALACE-LIFE-P0"]);
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

    // Ten posted spends exceed the ceiling; the ninth credited source is partial.
    const palaceSkus = [
      "ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-SIBLINGS-P0", "ZIWEI-PALACE-SPOUSE-P0",
      "ZIWEI-PALACE-CHILDREN-P0", "ZIWEI-PALACE-WEALTH-P0", "ZIWEI-PALACE-HEALTH-P0",
      "ZIWEI-PALACE-TRAVEL-P0", "ZIWEI-PALACE-FRIENDS-P0",
      "ZIWEI-PALACE-CAREER-P0", "ZIWEI-PALACE-PARENTS-P0",
    ];
    for (const pSku of palaceSkus) {
      await insertWalletSpend(zeroOwner, pSku, pSku === "ZIWEI-PALACE-LIFE-P0" ? 96 : 120, new Date(frozenNow.getTime() - 1000));
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
    expect(unlockResult.value.upgradePurchase).toMatchObject({chargedLa: 0, creditLa: 960,
      sourceSku: "ZIWEI-PALACE-CAREER-P0", occurredAt: frozenNow.toISOString()});
    expect(unlockResult.value.upgradePurchase?.sourceSkus).toHaveLength(9);
    expect(unlockResult.value.upgradePurchase?.sourceSkus).not.toContain("ZIWEI-PALACE-WEALTH-P0");
    const [zeroReceipt] = await database.select().from(walletCommandReceipts)
      .where(eq(walletCommandReceipts.idempotencyKey, "zero-cost-unlock-key-1"));
    const zeroProof = (zeroReceipt!.result as {continuation: {creditProof: {creditLa: number; sources: Array<{sku: string; amountLa: number; creditedLa: number}>}}}).continuation.creditProof;
    expect(zeroProof.creditLa).toBe(960);
    expect(zeroProof.sources.find(source => source.sku === "ZIWEI-PALACE-TRAVEL-P0"))
      .toMatchObject({amountLa: 120, creditedLa: 24});
    expect(zeroProof.sources.find(source => source.sku === "ZIWEI-PALACE-LIFE-P0"))
      .toMatchObject({amountLa: 96, creditedLa: 96});
    expect(zeroProof.sources.some(source => source.sku === "ZIWEI-PALACE-WEALTH-P0")).toBe(false);
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
    if (replayResult.ok) expect(replayResult.value.upgradePurchase).toEqual(unlockResult.value.upgradePurchase);

    await upgradeRunner().runOnce();
    expect(await financialEvents(zeroOwner.userId)).toEqual([expect.objectContaining({properties: expect.objectContaining({amount: 0, credit_amount: 960})})]);
    expect(await database.select().from(outbox).where(and(eq(outbox.actorId, zeroOwner.userId), eq(outbox.eventType, WALLET_UPGRADE_EVENT_TYPE)))).toHaveLength(1);

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
    const palace = await ports.service.createPurchaseIntent(owner.actor, { ...request, sku: "ZIWEI-PALACE-LIFE-P0" });
    expect(palace).toMatchObject({ ok: true, value: { amountLa: 96 } });
    const fundedMember = await createWalletService(ports.repository).readBalance(owner.actor);
    if (!palace.ok || !fundedMember.ok) throw new Error("palace intent");
    const paid = await ports.service.unlock(owner.actor, { purchaseIntentId: palace.value.id, expectedIntentVersion: 1, expectedWalletVersion: fundedMember.value.stateVersion, idempotencyKey: randomUUID() });
    if (!paid.ok) throw new Error("palace purchase");
    const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.reportId, paid.value.reportId));
    const jobId = randomUUID();
    await database.update(reportReservations).set({ activeJobId: jobId }).where(eq(reportReservations.id, reservation!.id));
    const source = createDatabaseReportGenerationSourceRepository({ database, now: () => current, knowledgeRetrieval: { retrieveKnowledge: vi.fn() } });
    const validate = () => source.validateLifecycle({ reportVersionId: reservation!.reportVersionId, jobId, readingContextRevisionId: null });
    expect(await validate()).toMatchObject({ ok: true });
    current = new Date(frozenNow.getTime() + 30 * 86_400_000);
    expect(await createDatabaseDailyReadingAccess(database)(owner.userId, owner.chartId, current)).toBeNull();
    expect(await validate()).toMatchObject({ ok: true });
    expect(await createDatabaseReportQueryRepository(database, () => current).readAuthorizedReport(owner.userId, paid.value.reportId)).not.toBeNull();
    if (!discounted.ok) throw new Error("discount");
    const before = await createWalletService(ports.repository).readBalance(owner.actor);
    if (!before.ok) throw new Error("balance");
    expect(await ports.service.unlock(owner.actor, { purchaseIntentId: discounted.value.id, expectedIntentVersion: 1, expectedWalletVersion: before.value.stateVersion, idempotencyKey: randomUUID() })).toMatchObject({ ok: false });
    expect(await createWalletService(ports.repository).readBalance(owner.actor)).toEqual(before);
    const [entitlement] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.id, reservation!.entitlementId));
    expect(await ports.repository.restore({ actor: owner.actor, restoration: { kind: "restoration", actorId: owner.userId, originalSpendId: entitlement!.ledgerSpendId!, expectedWalletVersion: before.value.stateVersion, reasonCode: "test.member.report.refund", requestId: randomUUID(), traceId: randomUUID(), idempotencyKey: randomUUID() } })).toMatchObject({ ok: true });
    expect(await validate()).toMatchObject({ ok: false });
    expect(await createDatabaseReportQueryRepository(database, () => current).readAuthorizedReport(owner.userId, paid.value.reportId)).toBeNull();
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
