import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceEntitlements, createDatabase, evidenceSets, guaranteeClaims, partFeedbacks, reportReservations, runMigrations, walletAccounts, walletPurchaseIntents, walletTransactions, ziweiCharts, ziweiChartVersions, type Database } from "@lasoviet/database";
import { TIER_1_ENTITLEMENT_SCOPE, getPalaceIdFromSku, isSinglePalaceSku, type CurrentActor, type WalletGrantV1 } from "@lasoviet/contracts";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createWalletUnlockService } from "./wallet-unlock.service.js";
import { createGuaranteeFeedbackService } from "./guarantee-feedback.service.js";

describe("guarantee atomicity and authority", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: Database;
  const frozenNow = new Date("2026-09-30T10:00:00.000Z");
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 120_000);
  afterAll(async () => { await container?.stop(); }, 30_000);
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
    return spendId;
  }


  function service(now = frozenNow) { return createGuaranteeFeedbackService(database, { now: () => now }); }
  function claim(chartId: string, partId = "ZIWEI-NATAL-EXCERPT-P0", idempotencyKey = randomUUID()) {
    return { chartId, partId, rating: "inaccurate" as const, idempotencyKey };
  }
  it("restores once and revokes the part under simultaneous replay", async () => {
    const owner = await ownerFixture("Replay");
    await insertWalletSpend(owner, "ZIWEI-NATAL-EXCERPT-P0", 240, frozenNow);
    const input = claim(owner.chartId);
    const results = await Promise.all([service().claimGuarantee(owner.actor, input), service().claimGuarantee(owner.actor, input)]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toMatchObject({ ok: true, value: { amountLaRestored: 240 } });
    const entitlements = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId));
    expect(entitlements.every(e => e.revokedAt !== null)).toBe(true);
    expect(await service().claimGuarantee(owner.actor, claim(owner.chartId))).toMatchObject({ ok: false, code: "GUARANTEE_ALREADY_CLAIMED" });
  });
  it("rejects foreign report associations before any refund and binds replay to the report", async () => {
    const owner = await ownerFixture("Report owner");
    const other = await ownerFixture("Foreign report owner");
    const spendId = await insertWalletSpend(owner, "ZIWEI-NATAL-EXCERPT-P0", 240, frozenNow);
    const otherSpendId = await insertWalletSpend(other, "ZIWEI-NATAL-EXCERPT-P0", 240, frozenNow);
    async function reserveReport(person: typeof owner, ledgerSpendId: string) {
      const [entitlement] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ledgerSpendId, ledgerSpendId));
      const reportId = randomUUID();
      await database.insert(reportReservations).values({ reportId, reportVersionId: randomUUID(), entitlementId: entitlement!.id,
        chartVersionId: person.chartVersionId, evidenceVersionId: person.evidenceId, knowledgeVersionId: "fixture",
        promptVersion: "fixture", reportConfigVersion: "fixture", locale: "vi", sku: "ZIWEI-NATAL-EXCERPT-P0" });
      return reportId;
    }
    const ownReportId = await reserveReport(owner, spendId);
    const foreignReportId = await reserveReport(other, otherSpendId);
    for (const reportId of [foreignReportId, randomUUID()]) {
      expect(await service().claimGuarantee(owner.actor, { ...claim(owner.chartId), reportId })).toEqual({ ok: false, code: "GUARANTEE_NOT_OWNER" });
    }
    expect(await database.select().from(walletTransactions).where(eq(walletTransactions.reversalOfTransactionId, spendId))).toHaveLength(0);
    expect(await database.select().from(partFeedbacks).where(eq(partFeedbacks.userId, owner.userId))).toHaveLength(0);
    const request = { ...claim(owner.chartId), reportId: ownReportId };
    const result = await service().claimGuarantee(owner.actor, request);
    expect(result).toMatchObject({ ok: true });
    expect(await service().claimGuarantee(owner.actor, request)).toEqual(result);
    expect(await service().claimGuarantee(owner.actor, claim(owner.chartId, request.partId, request.idempotencyKey)))
      .toEqual({ ok: false, code: "GUARANTEE_IDEMPOTENCY_CONFLICT" });
  });
  it("permits only one claim across different purchases racing on the same account", async () => {
    const owner = await ownerFixture("Race");
    await insertWalletSpend(owner, "ZIWEI-PALACE-LIFE-P0", 120, frozenNow);
    await insertWalletSpend(owner, "ZIWEI-PALACE-CAREER-P0", 120, frozenNow);
    const results = await Promise.all([
      service().claimGuarantee(owner.actor, claim(owner.chartId, "ziwei.palace.life")),
      service().claimGuarantee(owner.actor, claim(owner.chartId, "ziwei.palace.career")),
    ]);
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(results.filter(r => !r.ok)).toEqual([{ ok: false, code: "GUARANTEE_ALREADY_CLAIMED" }]);
  });
  it("rolls back wallet credit and revocation if claim persistence fails", async () => {
    const owner = await ownerFixture("Rollback");
    const spendId = await insertWalletSpend(owner, "ZIWEI-NATAL-EXCERPT-P0", 240, frozenNow);
    await database.execute(sql`CREATE FUNCTION reject_guarantee_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$`);
    await database.execute(sql`CREATE TRIGGER reject_guarantee_fixture BEFORE INSERT ON guarantee_claims FOR EACH ROW EXECUTE FUNCTION reject_guarantee_fixture()`);
    try {
      await expect(service().claimGuarantee(owner.actor, claim(owner.chartId))).rejects.toThrow();
    } finally {
      await database.execute(sql`DROP TRIGGER reject_guarantee_fixture ON guarantee_claims`);
      await database.execute(sql`DROP FUNCTION reject_guarantee_fixture()`);
    }
    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    expect(wallet?.promotionalBalance).toBe(0);
    expect(await database.select().from(walletTransactions).where(eq(walletTransactions.reversalOfTransactionId, spendId))).toHaveLength(0);
    const [entitlement] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ledgerSpendId, spendId));
    expect(entitlement?.revokedAt).toBeNull();
    expect(await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, owner.userId))).toHaveLength(0);
  });
  it("rejects the exact 24-hour boundary and high-priced products", async () => {
    const owner = await ownerFixture("Window");
    await insertWalletSpend(owner, "ZIWEI-NATAL-EXCERPT-P0", 240, frozenNow);
    expect(await service(new Date(frozenNow.getTime() + 86400000)).claimGuarantee(owner.actor, claim(owner.chartId)))
      .toMatchObject({ ok: false, code: "GUARANTEE_WINDOW_EXPIRED" });
    const expensive = await ownerFixture("Expensive");
    await insertWalletSpend(expensive, "ZIWEI-IDENTITY-P0", 960, frozenNow);
    expect(await service().claimGuarantee(expensive.actor, claim(expensive.chartId, "ZIWEI-IDENTITY-P0")))
      .toMatchObject({ ok: false, code: "GUARANTEE_PRICE_EXCEEDS_LIMIT" });
  });
  it("does not reveal or accept feedback on another owner's chart", async () => {
    const owner = await ownerFixture("Owner");
    const other = await ownerFixture("Other");
    expect(await service().submitPartFeedback(other.actor, { chartId: owner.chartId, partId: "overview", rating: "accurate" }))
      .toEqual({ ok: false, code: "FEEDBACK_CHART_NOT_FOUND" });
    expect(await service().submitPartFeedback(owner.actor, { chartId: owner.chartId, partId: "overview", rating: "accurate" })).toMatchObject({ ok: true });
    expect(await database.select().from(partFeedbacks).where(and(eq(partFeedbacks.chartId, owner.chartId), eq(partFeedbacks.userId, other.userId)))).toHaveLength(0);
    expect(await service().submitPartFeedback(owner.actor, { chartId: owner.chartId, reportId: randomUUID(), partId: "overview", rating: "accurate" }))
      .toEqual({ ok: false, code: "FEEDBACK_CHART_NOT_FOUND" });
    await database.delete(ziweiCharts).where(eq(ziweiCharts.id, owner.chartId));
    expect(await database.select().from(partFeedbacks).where(eq(partFeedbacks.chartId, owner.chartId))).toHaveLength(0);
  });
});
