import {randomUUID} from "node:crypto";
import {and, eq, sql} from "drizzle-orm";
import {PostgreSqlContainer} from "@testcontainers/postgresql";
import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";
import {WalletTopUpCatalogV1, type CurrentActor} from "@lasoviet/contracts";
import {
  authUsers, birthProfiles, birthProfileRevisions, calculationRuns, ziweiCharts, ziweiChartVersions, evidenceSets,
  commerceOrders, commerceEntitlements, walletAccounts, walletTransactions, walletRestorationAllocations,
  reportReservations, reportQueueJobs, reportVersions, reportWalletCompensations, outbox, auditLogs,
  guaranteeClaims, lockFreeAiCoordination, deletionRequests, runMigrations, createDatabase, type Database,
} from "@lasoviet/database";
import {createDatabaseWalletRepository} from "../wallet/wallet.repository.js";
import {createWalletService} from "../wallet/wallet.service.js";
import {createWalletUnlockService} from "../commerce/wallet-unlock.service.js";
import {createGuaranteeFeedbackService} from "../commerce/guarantee-feedback.service.js";
import {v4_1SensitivityReportVersions} from "./identity-report-config.js";
import {createDatabaseReportQueuePublisher} from "../outbox/outbox.dispatcher.js";
import {createDatabaseReportQueueStore, createReportService, recoverInvalidOutputGenerationInTransaction,
  recoverTransientProviderFailureGenerationInTransaction, restartInvalidOutputWithCurrentVersionInTransaction} from "./report.service.js";
import {createReportGenerateProcessor} from "../../../../apps/worker/src/processors/report-generate.processor.js";
import {createDatabaseDeletionRepository} from "../privacy/deletion.repository.js";
import {createDatabaseReportVersionRepository} from "./report-version.repository.js";
import {createReportWalletCompensationRunner} from "./report-wallet-compensation.js";
import {createDatabaseReportQueryRepository} from "./report-query.repository.js";
import {createReportQueryService} from "./report-query.service.js";

describe("terminal wallet compensation with posted financial authority", () => {
  let database: Database;
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  const fixed = new Date("2026-10-04T23:00:00Z");
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri()); database = createDatabase(container.getConnectionUri());
  }, 120_000);
  afterAll(async () => {await container?.stop();}, 30_000);
  const actor = (userId: string): CurrentActor => ({kind: "account", userId, sessionId: randomUUID(), requestId: randomUUID()});
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


  async function purchases(skus = ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0", "ZIWEI-IDENTITY-P0"]) {
    const owner = await ownerFixture("Compensation fixture");
    const grantToken = {};
    const repository = createDatabaseWalletRepository(database, {now: () => fixed, trustedGrantAuthority: {token: grantToken, actorId: owner.userId}});
    const service = createWalletUnlockService(database, createWalletService(repository), {now: () => fixed, reportVersionResolver: v4_1SensitivityReportVersions});
    const pack = WalletTopUpCatalogV1.find(pack => pack.id === "LA-START-1100")!;
    const orderId = randomUUID();
    await database.insert(commerceOrders).values({id: orderId, ownerId: owner.userId, invoiceNumber: randomUUID(),
      kind: "wallet_topup", sku: pack.id, amount: pack.vndAmount, currency: "VND", locale: "vi", status: "paid", paidAt: fixed});
    const grant = await repository.grant({targetOwnerId: owner.userId, trustedGrantToken: grantToken, topUpOrderId: orderId,
      grant: {version: 1, kind: "grant", actorId: owner.userId, reasonCode: "test.isolated.compensation", requestId: randomUUID(),
        traceId: randomUUID(), idempotencyKey: randomUUID(), purchasedLa: pack.purchasedLa, promotionalLa: pack.promotionalLa, topUpPackId: pack.id}});
    if (!grant.ok) throw new Error("FUNDING_FAILED");
    let balance = grant.value.balance;
    let reportId = "";
    const outcomes = [];
    for (const sku of skus) {
      const intent = await service.createPurchaseIntent(owner.actor, {chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi", sku});
      if (!intent.ok) throw new Error(intent.code);
      const outcome = await service.unlock(owner.actor, {purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion,
        expectedWalletVersion: balance.stateVersion, idempotencyKey: randomUUID()});
      if (!outcome.ok) throw new Error(outcome.code);
      balance = outcome.value.balance; reportId = outcome.value.reportId!; outcomes.push(outcome.value);
    }
    const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.reportId, reportId));
    return {owner, service, repository, reservation: reservation!, outcomes, balance};
  }
  async function terminal(fixture: Awaited<ReturnType<typeof purchases>>) {
    const current = new Date(fixed.getTime() + 1_000);
    const workerId = randomUUID();
    const [event] = await database.select().from(outbox).where(and(eq(outbox.eventType, "report.generation.requested.v2"), sql`${outbox.payload}->>'reportVersionId' = ${fixture.reservation.reportVersionId}`));
    const publisher = createDatabaseReportQueuePublisher(database);
    await publisher.publish({schemaVersion: 2, name: "report.generate.v2", sourceEventId: event!.eventId, traceId: event!.traceId,
      idempotencyKey: `report-generate:${fixture.reservation.reportVersionId}`, payload: event!.payload as never});
    const queue = createDatabaseReportQueueStore(database, workerId);
    const service = createReportService(database, {now: () => current});
    const processor = createReportGenerateProcessor({database, workerId, reportService: service,
      queueStore: {...queue, recordRetryableFailure: (id, code, next) => queue.recordRetryableFailure(id, code, next, current)},
      clock: {now: () => current, setInterval: () => {throw new Error("NO_PROVIDER_ALLOWED");}, clearInterval() {}},
    });
    for (let attempt = 1; attempt <= 3; attempt++) {
      const job = await queue.claimNext(current);
      expect(job?.id).toBe(`report-generate:${fixture.reservation.reportVersionId}`);
      const start = await service.startGenerating({reportVersionId: fixture.reservation.reportVersionId, jobId: job!.id, workerId});
      expect(start.ok).toBe(true);
      const failed = await processor.processJobFailure({jobId: job!.id, reportVersionId: fixture.reservation.reportVersionId,
        attemptCount: job!.attemptCount, errorCode: "AI_OUTPUT_INVALID", expectedStateVersion: start.ok ? start.report.stateVersion : undefined});
      expect(failed).toEqual(attempt < 3 ? {ok: true} : {ok: false, code: "JOB_RETRY_EXHAUSTED"});
      if (attempt < 3) current.setTime(current.getTime() + 30_000);
    }
    const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.id, fixture.reservation.id));
    const [failure] = await database.select().from(outbox).where(and(eq(outbox.aggregateId, reservation!.reportVersionId), eq(outbox.eventType, "report.fulfillment.failed.v1")));
    expect(reservation?.status).toBe("terminal_failure"); expect(failure).toBeDefined();
    return {reservation: reservation!, failure: failure!, current};
  }
  const runner = (current: Date, extra: Partial<Parameters<typeof createReportWalletCompensationRunner>[1]> = {}) =>
    createReportWalletCompensationRunner(database, {workerId: randomUUID(), now: () => current, ...extra});
  const wallet = async (ownerId: string) => (await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, ownerId)))[0]!;
  const markers = (ownerId: string) => database.select().from(reportWalletCompensations).where(eq(reportWalletCompensations.ownerId, ownerId));

  it("restores actual mixed-bucket shared debits once after the existing three-attempt policy", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture);
    expect(fixture.balance).toMatchObject({totalLa: 140, promotionalLa: 0, purchasedLa: 140});
    const results = await Promise.all([runner(failed.current).runOnce(), runner(failed.current).runOnce()]);
    expect(results.reduce((sum, result) => sum + result.compensated, 0)).toBe(1);
    expect(await runner(failed.current).runOnce()).toEqual({compensated: 0});
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
    const proofs = await markers(fixture.owner.userId); expect(proofs).toHaveLength(3);
    await expect(database.update(reportWalletCompensations).set({amountLa: 1}).where(eq(reportWalletCompensations.id, proofs[0]!.id))).rejects.toThrow();
    await expect(database.delete(reportWalletCompensations).where(eq(reportWalletCompensations.id, proofs[0]!.id))).rejects.toThrow();
    expect(proofs.map(row => row.amountLa).sort((a,b) => a-b)).toEqual([120,120,720]);
    const restorationAllocations = await database.select().from(walletRestorationAllocations).where(sql`${walletRestorationAllocations.restorationTransactionId} in (${sql.join(proofs.map(row=>sql`${row.restorationTransactionId}::uuid`),sql`, `)})`);
    expect(restorationAllocations).toHaveLength(4);
    const entitlements = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, fixture.owner.userId));
    expect(entitlements.every(row => row.revokedAt !== null)).toBe(true);
    const query = createReportQueryService({repository: createDatabaseReportQueryRepository(database, () => failed.current), now: () => failed.current});
    expect(await query.getReport(fixture.owner.actor, fixture.reservation.reportId)).toMatchObject({ok: true, value: {state: "failed", compensation: {status: "restored", amountLa: 960}}});
    expect(await query.getReport(actor("different-owner"), fixture.reservation.reportId)).toMatchObject({ok: false});
    const audit = await database.select().from(auditLogs).where(and(eq(auditLogs.targetId, fixture.reservation.reportId), eq(auditLogs.action, "report.wallet.compensated")));
    expect(audit).toHaveLength(3); expect(audit.every(row => row.actorId === null)).toBe(true);
  });

  it("rolls back a partly completed shared restoration and safely retries the whole atomic delivery", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture);
    await runner(failed.current, {beforeRestore: async ordinal => {if (ordinal === 1) throw new Error("INJECTED_TRANSIENT");}}).runOnce();
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 140, promotionalBalance: 0});
    expect(await markers(fixture.owner.userId)).toHaveLength(0);
    const [pending] = await database.select().from(outbox).where(eq(outbox.id, failed.failure.id));
    expect(pending).toMatchObject({status: "pending", lastErrorCode: "REPORT_COMPENSATION_RETRY"});
    failed.current.setTime(failed.current.getTime() + 60_000);
    expect(await runner(failed.current).runOnce()).toEqual({compensated: 1});
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
    expect(await markers(fixture.owner.userId)).toHaveLength(3);
  });

  it("revokes zero-charge credited lifetime access without inventing an extra refund", async () => {
    const fixture = await purchases([...['LIFE','SIBLINGS','SPOUSE','CHILDREN','WEALTH','HEALTH','TRAVEL','FRIENDS'].map(id=>`ZIWEI-PALACE-${id}-P0`), "ZIWEI-IDENTITY-P0"]);
    expect(fixture.outcomes.at(-1)?.upgradePurchase?.chargedLa).toBe(0);
    const failed = await terminal(fixture); expect(await runner(failed.current).runOnce()).toEqual({compensated: 1});
    const proof = await markers(fixture.owner.userId); expect(proof).toHaveLength(9);
    expect(proof.filter(row => row.amountLa === 0)).toMatchObject([{restorationTransactionId: null}]);
    expect(proof.filter(row => row.restorationTransactionId)).toHaveLength(8);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
  }, 30_000);

  it("recognizes an earlier guarantee restoration without duplicating it or consuming another claim", async () => {
    const fixture = await purchases(["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0"]);
    const guarantee = await createGuaranteeFeedbackService(database, {now: () => fixed}).claimGuarantee(fixture.owner.actor,
      {chartId: fixture.owner.chartId, reportId: fixture.reservation.reportId, partId: "ziwei.palace.life", rating: "inaccurate", idempotencyKey: randomUUID()});
    expect(guarantee.ok).toBe(true);
    const failed = await terminal(fixture); expect(await runner(failed.current).runOnce()).toEqual({compensated: 1});
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
    const proof = await markers(fixture.owner.userId); expect(proof).toHaveLength(2);
    expect(proof.some(row=>guarantee.ok && row.restorationTransactionId===guarantee.value.receipt.transactionId)).toBe(true);
    expect(await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, fixture.owner.userId))).toHaveLength(1);
  });

  it("does not compensate a failure superseded by authorized recovery", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture);
    const recovery = await database.transaction(tx => recoverInvalidOutputGenerationInTransaction(tx, {reportVersionId: failed.reservation.reportVersionId,
      expectedStateVersion: failed.reservation.stateVersion, recoveryId: randomUUID(), now: failed.current}));
    expect(recovery.ok).toBe(true);
    expect(await runner(failed.current).runOnce()).toEqual({compensated: 0});
    expect(await markers(fixture.owner.userId)).toHaveLength(0);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 140});
  });

  it("fences recovery after compensation and supports one fresh paid generation", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture);
    await runner(failed.current).runOnce();
    for (const recover of [recoverInvalidOutputGenerationInTransaction, restartInvalidOutputWithCurrentVersionInTransaction,
      recoverTransientProviderFailureGenerationInTransaction]) {
      const result = await database.transaction(tx => recover(tx, {reportVersionId: failed.reservation.reportVersionId,
        expectedStateVersion: failed.reservation.stateVersion, recoveryId: randomUUID(), now: failed.current}));
      expect(result.ok).toBe(false);
    }
    const balance = await wallet(fixture.owner.userId);
    const intent = await fixture.service.createPurchaseIntent(fixture.owner.actor, {chartId: fixture.owner.chartId, chartVersionId: fixture.owner.chartVersionId, sku: "ZIWEI-PALACE-LIFE-P0", locale: "vi"});
    if (!intent.ok) throw new Error(intent.code);
    const result = await fixture.service.unlock(fixture.owner.actor, {purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, expectedWalletVersion: balance.stateVersion, idempotencyKey: randomUUID()});
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    expect(result.value.reportId).not.toBe(fixture.reservation.reportId);
    expect(result.value.balance.totalLa).toBe(980);
    const secondIntent = await fixture.service.createPurchaseIntent(fixture.owner.actor, {chartId: fixture.owner.chartId, chartVersionId: fixture.owner.chartVersionId, sku: "ZIWEI-PALACE-WEALTH-P0", locale: "vi"});
    if (!secondIntent.ok) throw new Error(secondIntent.code);
    const second = await fixture.service.unlock(fixture.owner.actor, {purchaseIntentId: secondIntent.value.id, expectedIntentVersion: secondIntent.value.stateVersion, expectedWalletVersion: result.value.balance.stateVersion, idempotencyKey: randomUUID()});
    expect(second).toMatchObject({ok: true, value: {reportId: result.value.reportId}});
    expect((await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, fixture.owner.chartVersionId)))).toHaveLength(2);
  });

  it("preserves verified-owner invariants and rejects an untrusted private restoration token", async () => {
    const fixture = await purchases();
    const [spend] = await database.select().from(walletTransactions).where(eq(walletTransactions.purchaseIntentId, fixture.outcomes[0]!.intent.id));
    expect(await fixture.repository.restore({ownerId: fixture.owner.userId, trustedAuthorityToken: {}, originalSpendId: spend!.id,
      expectedWalletVersion: fixture.balance.stateVersion, idempotencyKey: randomUUID(), requestId: randomUUID(), traceId: randomUUID()})).toMatchObject({ok: false, error: {code: "WALLET_INVALID_COMMAND"}});
    await expect(database.update(authUsers).set({emailVerified: false}).where(eq(authUsers.id, fixture.owner.userId))).rejects.toThrow();
    const failed = await terminal(fixture); expect(await runner(failed.current).runOnce()).toEqual({compensated: 1});
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
  });
  function barrier() {
    let enter!: () => void; let release!: () => void;
    const reached = new Promise<void>(resolve => {enter = resolve;});
    const gate = new Promise<void>(resolve => {release = resolve;});
    return {enter, release, reached, gate};
  }
  async function blockedLocks(minimum = 1) {
    await vi.waitFor(async () => {
      const rows = await database.execute<{count: string}>(sql`select count(*)::text as count from pg_stat_activity
        where datname = current_database() and pid <> pg_backend_pid() and wait_event_type = 'Lock'`);
      expect(Number(rows[0]!.count)).toBeGreaterThanOrEqual(minimum);
    }, {timeout: 10_000, interval: 10});
  }
  async function startPublication(fixture: Awaited<ReturnType<typeof purchases>>, current: Date) {
    const workerId = randomUUID();
    const [event] = await database.select().from(outbox).where(and(eq(outbox.eventType, "report.generation.requested.v2"), sql`${outbox.payload}->>'reportVersionId' = ${fixture.reservation.reportVersionId}`));
    await createDatabaseReportQueuePublisher(database).publish({schemaVersion: 2, name: "report.generate.v2",
      sourceEventId: event!.eventId, traceId: event!.traceId, idempotencyKey: `report-generate:${fixture.reservation.reportVersionId}`, payload: event!.payload as never});
    const job = await createDatabaseReportQueueStore(database, workerId).claimNext(current);
    expect(job?.id).toBe(`report-generate:${fixture.reservation.reportVersionId}`);
    const start = await createReportService(database, {now: () => current}).startGenerating({reportVersionId: fixture.reservation.reportVersionId, jobId: job!.id, workerId});
    expect(start.ok).toBe(true);
    const repository = createDatabaseReportVersionRepository(database, {now: () => current,
      betterAuthUrl: "https://lasoviet.net", recipientFingerprintSecret: "isolated-test-secret"});
    expect((await repository.startOrReuseAttempt({jobId: job!.id, attemptNumber: job!.attemptCount,
      reportVersionId: fixture.reservation.reportVersionId})).ok).toBe(true);
    const reservation = fixture.reservation;
    return () => repository.commitImmutableVersion({reportId: reservation.reportId, reportVersionId: reservation.reportVersionId,
      entitlementId: reservation.entitlementId, chartVersionId: reservation.chartVersionId, evidenceVersionId: reservation.evidenceVersionId,
      knowledgeVersionId: reservation.knowledgeVersionId, promptVersion: reservation.promptVersion, reportConfigVersion: reservation.reportConfigVersion,
      locale: reservation.locale, sku: reservation.sku, templateVersion: "isolated-template", renderVersion: "identity-report-pdf.v2",
      providerId: "isolated-no-provider", modelId: "isolated-no-model", structuredContent: {} as never, htmlContent: "<p>isolated</p>",
      jobId: job!.id, workerId, attemptNumber: job!.attemptCount, traceId: event!.traceId});
  }

  it("rejects a same-owner spend receipt reused as origin of a different reservation", async () => {
    const fixture = await purchases();
    const [spend] = await database.select().from(walletTransactions).where(eq(walletTransactions.purchaseIntentId, fixture.outcomes[1]!.intent.id));
    const [foreign] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ledgerSpendId, spend!.id));
    const [reservation] = await database.insert(reportReservations).values({...fixture.reservation, id: randomUUID(),
      reportId: randomUUID(), reportVersionId: randomUUID(), entitlementId: foreign!.id, sku: foreign!.sku}).returning();
    const [original] = await database.select().from(outbox).where(eq(outbox.idempotencyKey, `report-request:${fixture.reservation.reportVersionId}`));
    await database.insert(outbox).values({schemaVersion: 1, eventType: "report.generation.requested.v2", eventId: randomUUID(),
      occurredAt: fixed, traceId: randomUUID(), actorId: fixture.owner.userId, aggregateType: "report", aggregateId: reservation!.reportId,
      idempotencyKey: `report-request:${reservation!.reportVersionId}`, payload: {...original!.payload as object,
        reportId: reservation!.reportId, reportVersionId: reservation!.reportVersionId, entitlementId: foreign!.id, sku: foreign!.sku}});
    fixture.reservation = reservation!;
    const failed = await terminal(fixture);
    expect(await runner(failed.current).runOnce()).toEqual({compensated: 0});
    expect(await markers(fixture.owner.userId)).toHaveLength(0);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 140, promotionalBalance: 0});
    expect((await database.select().from(outbox).where(eq(outbox.id, failed.failure.id)))[0]).toMatchObject({status: "failed", lastErrorCode: "REPORT_COMPENSATION_INVALID"});
  });

  it.each(["foreign_report", "stale_event", "corrupt_job"])("fails closed on %s before committing a refund", async kind => {
    const fixture = await purchases(); const failed = await terminal(fixture);
    if (kind === "foreign_report") await database.update(outbox).set({payload: {...failed.failure.payload as object, reportId: randomUUID()}}).where(eq(outbox.id, failed.failure.id));
    if (kind === "stale_event") await database.update(outbox).set({occurredAt: new Date(failed.current.getTime() - 1)}).where(eq(outbox.id, failed.failure.id));
    if (kind === "corrupt_job") await database.update(reportQueueJobs).set({lastErrorCode: "UNRELATED_FAILURE"})
      .where(eq(reportQueueJobs.id, failed.reservation.activeJobId!));
    expect(await runner(failed.current).runOnce()).toEqual({compensated: 0});
    expect(await markers(fixture.owner.userId)).toHaveLength(0);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 140});
  });

  it("preserves the original receipt lineage across an authorized current-version restart", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture);
    const restarted = await database.transaction(tx => restartInvalidOutputWithCurrentVersionInTransaction(tx,
      {reportVersionId: fixture.reservation.reportVersionId, expectedStateVersion: failed.reservation.stateVersion, recoveryId: randomUUID(), now: failed.current}));
    expect(restarted.ok).toBe(true);
    fixture.reservation = (await database.select().from(reportReservations).where(eq(reportReservations.id, fixture.reservation.id)))[0]!;
    expect(fixture.reservation.reportVersionId).not.toBe(failed.reservation.reportVersionId);
    await runner(failed.current).runOnce();
    const second = await terminal(fixture);
    expect(await runner(second.current).runOnce()).toEqual({compensated: 1});
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
  });

  it("fences a stale delivery lease reclaimed while waiting for coordination", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture); const fence = barrier();
    const lock = database.transaction(async tx => {await lockFreeAiCoordination(tx); fence.enter(); await fence.gate;});
    await fence.reached;
    const first = runner(failed.current, {limit: 1}).runOnce();
    await blockedLocks();
    failed.current.setTime(failed.current.getTime() + 60_001);
    const second = runner(failed.current, {limit: 1}).runOnce();
    try {await blockedLocks(2);} finally {fence.release();}
    const results = await Promise.all([first, second, lock]);
    expect(results[0]).toEqual({compensated: 0}); expect(results[1]).toEqual({compensated: 1});
    expect(await markers(fixture.owner.userId)).toHaveLength(3);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
  }, 20_000);

  it("serializes real guarantee and privileged recovery behind the committed compensation", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture); const fence = barrier();
    const compensation = runner(failed.current, {afterRestore: async () => {fence.enter(); await fence.gate;}}).runOnce();
    await fence.reached;
    const guarantee = createGuaranteeFeedbackService(database, {now: () => failed.current}).claimGuarantee(fixture.owner.actor,
      {chartId: fixture.owner.chartId, reportId: fixture.reservation.reportId, partId: "ziwei.palace.life", rating: "inaccurate", idempotencyKey: randomUUID()});
    const recovery = database.transaction(tx => recoverInvalidOutputGenerationInTransaction(tx,
      {reportVersionId: fixture.reservation.reportVersionId, expectedStateVersion: failed.reservation.stateVersion, recoveryId: randomUUID(), now: failed.current}));
    try {await blockedLocks(2);} finally {fence.release();}
    expect(await compensation).toEqual({compensated: 1});
    expect((await guarantee).ok).toBe(false); expect((await recovery).ok).toBe(false);
    expect(await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, fixture.owner.userId))).toHaveLength(0);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
  }, 20_000);

  it("fences publication after a concurrent real guarantee restoration", async () => {
    const fixture = await purchases(["ZIWEI-PALACE-LIFE-P0"]); const current = new Date(fixed.getTime() + 1000);
    const publish = await startPublication(fixture, current); const fence = barrier();
    const restore = database.transaction(async tx => {
      const guarantee = await createGuaranteeFeedbackService(tx, {now: () => current}).claimGuarantee(fixture.owner.actor,
        {chartId: fixture.owner.chartId, reportId: fixture.reservation.reportId, partId: "ziwei.palace.life", rating: "inaccurate", idempotencyKey: randomUUID()});
      expect(guarantee.ok).toBe(true); fence.enter(); await fence.gate;
    });
    await fence.reached; const publication = publish();
    try {await blockedLocks();} finally {fence.release();}
    await restore; expect(await publication).toMatchObject({ok: false, error: {code: "REPORT_VERSION_CONFLICT"}});
    expect(await database.select().from(reportVersions).where(eq(reportVersions.reportId, fixture.reservation.reportId))).toHaveLength(0);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 1000, promotionalBalance: 100});
  }, 20_000);

  it("never refunds an already delivered report or a PDF-only failure", async () => {
    const fixture = await purchases(); const current = new Date(fixed.getTime() + 1000);
    expect((await (await startPublication(fixture, current))()).ok).toBe(true);
    const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.id, fixture.reservation.id));
    await database.insert(outbox).values({schemaVersion: 1, eventType: "report.fulfillment.failed.v1", eventId: randomUUID(),
      occurredAt: current, traceId: randomUUID(), aggregateType: "report", aggregateId: reservation!.reportVersionId,
      idempotencyKey: randomUUID(), availableAt: current, payload: {version: 1, reportId: reservation!.reportId,
        reportVersionId: reservation!.reportVersionId, failureStage: "generation", errorCode: "AI_OUTPUT_INVALID", retryable: false}});
    expect(await runner(current).runOnce()).toEqual({compensated: 0});
    const second = await purchases(); const failed = await terminal(second);
    await database.update(outbox).set({payload: {...failed.failure.payload as object, failureStage: "pdf"}}).where(eq(outbox.id, failed.failure.id));
    expect(await runner(failed.current).runOnce()).toEqual({compensated: 0});
    expect(await markers(fixture.owner.userId)).toHaveLength(0); expect(await markers(second.owner.userId)).toHaveLength(0);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 140});
    expect(await wallet(second.owner.userId)).toMatchObject({purchasedBalance: 140});
    expect((await database.select().from(outbox).where(eq(outbox.id, failed.failure.id)))[0]!.status).toBe("pending");
  });

  it("serializes account purge with compensation and keeps historical financial proof private", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture); const fence = barrier();
    const deletion = createDatabaseDeletionRepository(database);
    const recoverUntil = new Date(failed.current.getTime() + 30 * 86_400_000);
    expect(await deletion.request({userId: fixture.owner.userId, requestId: randomUUID(), requestedAt: failed.current, recoverUntil})).toMatchObject({ok: true});
    const compensation = runner(failed.current, {afterRestore: async () => {fence.enter(); await fence.gate;}}).runOnce();
    await fence.reached;
    const purgedAt = new Date(recoverUntil.getTime() + 1);
    const purge = deletion.purgeExpired(purgedAt, 100);
    try {await blockedLocks();} finally {fence.release();}
    expect(await compensation).toEqual({compensated: 1}); expect(await purge).toHaveLength(1);
    const query = createReportQueryService({repository: createDatabaseReportQueryRepository(database, () => purgedAt), now: () => purgedAt});
    expect((await query.getReport(fixture.owner.actor, fixture.reservation.reportId)).ok).toBe(false);
    expect(await runner(purgedAt).runOnce()).toEqual({compensated: 0});
    expect(await markers(fixture.owner.userId)).toHaveLength(3);
    expect((await database.select().from(deletionRequests).where(eq(deletionRequests.userId, fixture.owner.userId)))[0]!.status).toBe("purged");
  }, 20_000);

  it("acknowledges a purged-owner failure without creating new restoration data", async () => {
    const fixture = await purchases(); const failed = await terminal(fixture);
    const deletion = createDatabaseDeletionRepository(database);
    expect(await deletion.request({userId: fixture.owner.userId, requestId: randomUUID(), requestedAt: fixed, recoverUntil: failed.current})).toMatchObject({ok: true});
    expect(await deletion.purgeExpired(failed.current, 100)).toHaveLength(1);
    expect(await runner(failed.current).runOnce()).toEqual({compensated: 0});
    expect(await markers(fixture.owner.userId)).toHaveLength(0);
    expect(await wallet(fixture.owner.userId)).toMatchObject({purchasedBalance: 140});
  });

});
