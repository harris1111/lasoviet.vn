import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceEntitlements, createDatabase, evidenceSets, guaranteeClaims, partFeedbacks, reportReservations, reportVersions, lockFreeAiCoordination, walletRestorationAllocations, walletSpendAllocations, runMigrations, walletAccounts, walletPurchaseIntents, walletTransactions, ziweiCharts, ziweiChartVersions, type Database } from "@lasoviet/database";
import { TIER_1_ENTITLEMENT_SCOPE, TIER_2_ENTITLEMENT_SCOPE, ZIWEI_PALACE_IDS, ZIWEI_THEMATIC_SYNTHESIS_IDS, getPalaceIdFromSku, isSinglePalaceSku, type CurrentActor, type WalletGrantV1 } from "@lasoviet/contracts";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createWalletUnlockService } from "./wallet-unlock.service.js";
import { freezePurchaseCommercialTerms } from "./purchase-commercial-terms.js";
import { createReportQueryService } from "../reports/report-query.service.js";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { CANONICAL_PALACE_TITLES_VI, CANONICAL_THEMATIC_TITLES_VI, REPORT_KNOWLEDGE_VERSION_V3, REPORT_PROMPT_VERSION_V3, REPORT_CONFIG_VERSION_V3, REPORT_TEMPLATE_VERSION_V3 } from "../reports/identity-report-config.js";
import { NormalizedBirthProfileV1Schema } from "@lasoviet/contracts";
import { calculateIztroReportSnapshot } from "../../../engine-adapters/src/ziwei/iztro-report-snapshot.js";
import { createDatabaseReportSourceSnapshotRepository } from "../reports/report-source-snapshot.repository.js";
import { periodReportVersions } from "../reports/period-report-config.js";
import { createDatabaseCommerceRepository } from "./commerce.repository.js";
import { createGuaranteeFeedbackService } from "./guarantee-feedback.service.js";

function validV3StructuredContent() {
  return {
    overview: {
      title: "Tổng quan bản mệnh",
      narrative: "Tổng quan cuộc đời với Tử Vi đắc địa, tạo phong thái đĩnh đạc và uy tín tự nhiên.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân thể hiện ý chí quật cường, kiên trì theo đuổi mục tiêu lớn dài hạn.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Phủ Đồng Cung",
        narrative: "Tử Vi và Thiên Phủ cùng hội tụ đem lại sự vững vàng về tài chính và sự nghiệp.",
        evidenceKeys: ["ziwei.palace.life", "zi-fu-tong-gong"],
      },
    ],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: CANONICAL_PALACE_TITLES_VI[palaceId],
      narrative: `Luận giải chi tiết cho ${CANONICAL_PALACE_TITLES_VI[palaceId]}.`,
      evidenceKeys: [palaceId],
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: CANONICAL_THEMATIC_TITLES_VI[id],
      narrative: `Phân tích chuyên đề ${CANONICAL_THEMATIC_TITLES_VI[id]}.`,
      evidenceKeys: ["ziwei.palace.life"],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Thế mạnh là tính kỷ luật, điểm cần lưu ý là tránh thái độ độc đoán.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    practicalDirection: [
      "Ưu tiên phát triển năng lực chuyên môn sâu trong 3 năm tới.",
    ],
  };
}

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
    policy: "pre-fd119" | "fd119" | null = null,
    fund = true,
  ) {
    const intentId = randomUUID();
    const periodKey = sku === "ZIWEI-COMBO-P0" ? "2026" : "lifetime";
    await database.insert(walletPurchaseIntents).values({
      id: intentId,
      ownerId: owner.userId,
      chartId: owner.chartId,
      chartVersionId: owner.chartVersionId,
      sku,
      locale: "vi",
      priceLa: amountLa,
      periodKey,
      status: "pending",
      stateVersion: 1,
      createdAt: spentAt,
      ...(policy ? {commercialTerms: freezePurchaseCommercialTerms({ownerId: owner.userId, chartId: owner.chartId,
        chartVersionId: owner.chartVersionId, sku, locale: "vi", periodKey, priceLa: amountLa, createdAt: spentAt}, undefined, policy)} : {}),
    });
    const { authority, repository } = walletPorts(owner.userId, { now: () => spentAt });
    if (fund) {
    const funded = await repository.grant({
      targetOwnerId: owner.userId,
      grant: grant(owner.userId, `grant-${randomUUID()}`, amountLa),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!funded.ok) throw new Error(`grant failed in insertWalletSpend: ${funded.error.code}`);
    }
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
    const common = {orderId: null, ledgerSpendId: spendId, chartId: owner.chartId, ownerId: owner.userId, createdAt: spentAt};
    await database.insert(commerceEntitlements).values(sku === "ZIWEI-COMBO-P0" ? [
      {...common, sku: "ZIWEI-IDENTITY-P0", periodKey: "lifetime", scope: TIER_2_ENTITLEMENT_SCOPE},
      {...common, sku: "ZIWEI-YEAR-P0", periodKey: "2026", scope: {sections: ["periodReading"]}},
    ] : [{...common, sku, scope: palaceId ? {sections: [], palaces: [palaceId]} :
      sku === "ZIWEI-IDENTITY-P0" ? TIER_2_ENTITLEMENT_SCOPE : TIER_1_ENTITLEMENT_SCOPE}]);
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
  async function readyLifetime(owner: Awaited<ReturnType<typeof ownerFixture>>, spendId: string, publish = true) {
    const [entitlement] = await database.select().from(commerceEntitlements).where(and(eq(commerceEntitlements.ledgerSpendId, spendId), eq(commerceEntitlements.sku, "ZIWEI-IDENTITY-P0")));
    const [reservation] = await database.insert(reportReservations).values({reportId: randomUUID(), reportVersionId: randomUUID(),
      entitlementId: entitlement!.id, chartVersionId: owner.chartVersionId, evidenceVersionId: owner.evidenceId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3, promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: REPORT_CONFIG_VERSION_V3, locale: "vi", sku: "ZIWEI-IDENTITY-P0"}).returning();
    if (publish) {
      await database.insert(reportVersions).values({reportId: reservation!.reportId, reportVersionId: reservation!.reportVersionId,
        entitlementId: entitlement!.id, chartVersionId: owner.chartVersionId, evidenceVersionId: owner.evidenceId,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3, promptVersion: REPORT_PROMPT_VERSION_V3,
        reportConfigVersion: REPORT_CONFIG_VERSION_V3, templateVersion: REPORT_TEMPLATE_VERSION_V3,
        renderVersion: "fixture", locale: "vi", sku: "ZIWEI-IDENTITY-P0", providerId: "fixture", modelId: "fixture",
        structuredContent: validV3StructuredContent(), htmlContent: "<p>Owned ready fixture</p>",
        contentHash: "a".repeat(64), pdfAssetId: randomUUID()});
      await database.update(reportReservations).set({status: "complete"}).where(eq(reportReservations.id, reservation!.id));
    }
    return reservation!;
  }

  it("restores the exact FD119 half from an authenticated stored ready report and replays once", async () => {
    const owner = await ownerFixture("New half");
    const spendId = await insertWalletSpend(owner, "ZIWEI-IDENTITY-P0", 1200, frozenNow, "fd119");
    const report = await readyLifetime(owner, spendId);
    const query = createReportQueryService({repository: createDatabaseReportQueryRepository(database, () => frozenNow)});
    expect(await query.getReport(owner.actor, report.reportId)).toMatchObject({ok: true, value: {state: "ready"}});
    const input = {...claim(owner.chartId, "ZIWEI-IDENTITY-P0"), reportId: report.reportId};
    const [first, replay] = await Promise.all([service().claimGuarantee(owner.actor, input), service().claimGuarantee(owner.actor, input)]);
    expect(first).toEqual(replay);
    expect(first).toMatchObject({ok: true, value: {amountLaRestored: 600, balance: {promotionalLa: 600}}});
    const [recorded] = await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, owner.userId));
    expect(recorded!.amountLa).toBe(600);
    expect(await database.select().from(walletRestorationAllocations).where(eq(walletRestorationAllocations.restorationTransactionId, recorded!.restorationTransactionId)))
      .toEqual([expect.objectContaining({amountLa: 600, reversedVnd: 0})]);
    expect(await query.getReport(owner.actor, report.reportId)).toMatchObject({ok: false});
  });

  it.each(["absent", "pending", "terminal", "forged_ready"])("rejects FD119 half without authentic readiness: %s", async state => {
    const owner = await ownerFixture(`No ready ${state}`);
    const spendId = await insertWalletSpend(owner, "ZIWEI-IDENTITY-P0", 1200, frozenNow, "fd119");
    if (state !== "absent") {
      const report = await readyLifetime(owner, spendId, false);
      if (state !== "pending") await database.update(reportReservations).set({status: state === "terminal" ? "terminal_failure" : "complete"})
        .where(eq(reportReservations.id, report.id));
    }
    expect(await service().claimGuarantee(owner.actor, claim(owner.chartId, "ZIWEI-IDENTITY-P0"))).toMatchObject({ok: false, code: "GUARANTEE_INVALID_REQUEST"});
    expect(await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, owner.userId))).toHaveLength(0);
    expect(await database.select().from(walletTransactions).where(eq(walletTransactions.reversalOfTransactionId, spendId))).toHaveLength(0);
  });

  it("blocks generic v2 restore and an unbound nonce while preserving trusted terminal full", async () => {
    const owner = await ownerFixture("Closed authority");
    const spendId = await insertWalletSpend(owner, "ZIWEI-IDENTITY-P0", 1200, frozenNow, "fd119");
    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId));
    const restoration = {kind: "restoration" as const, actorId: owner.userId, originalSpendId: spendId,
      expectedWalletVersion: wallet!.stateVersion, reasonCode: "guarantee_la_back", requestId: "private-test", traceId: "private-test", idempotencyKey: randomUUID()};
    const repository = createDatabaseWalletRepository(database, {now: () => frozenNow});
    expect(await repository.restore({actor: owner.actor, restoration})).toMatchObject({ok: false, error: {code: "WALLET_INVALID_COMMAND"}});
    expect(await repository.restore({actor: owner.actor, restoration, trustedGuaranteeToken: {}, requestFingerprint: "foreign"}))
      .toMatchObject({ok: false, error: {code: "WALLET_INVALID_COMMAND"}});
    const terminal = {};
    expect(await createDatabaseWalletRepository(database, {now: () => frozenNow, trustedTerminalRestorationToken: terminal}).restore({
      ownerId: owner.userId, trustedAuthorityToken: terminal, originalSpendId: spendId, expectedWalletVersion: wallet!.stateVersion,
      requestId: "terminal-test", traceId: "terminal-test", idempotencyKey: randomUUID()}))
      .toMatchObject({ok: true, value: {balance: {promotionalLa: 1200}}});
  });

  it.each(["coordination", "reservation"])("checks the 24h clock after a real %s wait", async fence => {
    const owner = await ownerFixture("Locked expiry");
    const spendId = await insertWalletSpend(owner, "ZIWEI-IDENTITY-P0", 1200, frozenNow, "fd119");
    const report = await readyLifetime(owner, spendId);
    let current = frozenNow;
    let enter!: () => void; let release!: () => void;
    const entered = new Promise<void>(resolve => {enter = resolve;});
    const gate = new Promise<void>(resolve => {release = resolve;});
    const held = database.transaction(async tx => {
      if (fence === "coordination") await lockFreeAiCoordination(tx);
      else await tx.select().from(reportReservations).where(eq(reportReservations.id, report.id)).for("update");
      enter(); await gate;
    });
    await entered;
    const pending = createGuaranteeFeedbackService(database, {now: () => current}).claimGuarantee(owner.actor, claim(owner.chartId, "ZIWEI-IDENTITY-P0"));
    let observed = false;
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const wait = await database.execute(sql`select 1 from pg_locks where locktype in ('advisory', 'transactionid') and not granted limit 1`);
        if (wait.length > 0) {observed = true; break;}
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(observed).toBe(true);
      current = new Date(frozenNow.getTime() + 86_400_000);
    } finally {release(); await held;}
    expect(await pending).toMatchObject({ok: false, code: "GUARANTEE_WINDOW_EXPIRED"});
    expect(await database.select().from(walletTransactions).where(eq(walletTransactions.reversalOfTransactionId, spendId))).toHaveLength(0);
  });

  async function annualComponent(owner: Awaited<ReturnType<typeof ownerFixture>>, spendId: string, publish: boolean) {
    const [entitlement] = await database.select().from(commerceEntitlements)
      .where(and(eq(commerceEntitlements.ledgerSpendId, spendId), eq(commerceEntitlements.sku, "ZIWEI-YEAR-P0")));
    const tuple = periodReportVersions();
    const [reservation] = await database.insert(reportReservations).values({reportId: randomUUID(), reportVersionId: randomUUID(),
      entitlementId: entitlement!.id, chartVersionId: owner.chartVersionId, evidenceVersionId: owner.evidenceId,
      knowledgeVersionId: tuple.knowledgeVersion, promptVersion: tuple.promptVersion, reportConfigVersion: tuple.reportConfigVersion,
      locale: "vi", sku: "ZIWEI-YEAR-P0", asOfDate: "2026-09-30", targetYear: 2026,
      timingRuleVersion: "ziwei.timing.lunar-year.v2", sensitivityRuleVersion: "ziwei.sensitivity.v1"}).returning();
    const frozen = reservation!;
    if (publish) {
      const profile = NormalizedBirthProfileV1Schema.parse({version: 1, originalInput: {version: 1,
        calendar: {kind: "solar", date: "1990-05-12"}, time: {precision: "exact_minute", localTime: "08:30"},
        timezone: {offsetMinutes: 420}, consentVersion: "fixture", gender: "male"},
        normalizedCalendar: {kind: "solar", date: "1990-05-12"}, normalizedTime: {precision: "exact_minute", localTime: "08:30"},
        timezoneProvenance: {source: "offset", offsetMinutes: 420}, normalizationWarnings: [], limitations: []});
      const snapshot = await calculateIztroReportSnapshot({birthProfile: profile, chartVersionId: owner.chartVersionId,
        asOfDate: frozen.asOfDate!, targetYear: 2026, timingRuleVersion: frozen.timingRuleVersion!,
        sensitivityRuleVersion: frozen.sensitivityRuleVersion!, periodReading: {chartId: owner.chartId, kind: "annual"}});
      if (!snapshot.ok) throw new Error(snapshot.error.code);
      const facts = snapshot.value.periodReading!;
      const persisted = await createDatabaseReportSourceSnapshotRepository(database).persist({version: 1, reportId: frozen.reportId,
        reportVersionId: frozen.reportVersionId, chartVersionId: frozen.chartVersionId, asOfDate: frozen.asOfDate,
        targetYear: 2026, timingRuleVersion: frozen.timingRuleVersion, sensitivityRuleVersion: frozen.sensitivityRuleVersion,
        snapshotHash: snapshot.value.provenance.snapshotHash, snapshot: snapshot.value});
      if (!persisted.ok) throw new Error(persisted.error.code);
      await database.insert(reportVersions).values({reportId: frozen.reportId, reportVersionId: frozen.reportVersionId,
        entitlementId: frozen.entitlementId, chartVersionId: frozen.chartVersionId, evidenceVersionId: frozen.evidenceVersionId,
        knowledgeVersionId: frozen.knowledgeVersionId, promptVersion: frozen.promptVersion, reportConfigVersion: frozen.reportConfigVersion,
        locale: "vi", sku: frozen.sku, templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion,
        providerId: "fixture", modelId: "fixture", contentHash: "a".repeat(64), pdfAssetId: randomUUID(), htmlContent: "<p>Annual fixture</p>",
        structuredContent: {version: 1, contentVersion: "ziwei.period-reading.v1", locale: "vi", kind: "annual", targetYear: 2026,
          calendar: "lunar", periodKey: "2026", title: "Vận hạn năm 2026", overview: {narrative: "Nội dung thử nghiệm.", evidenceKeys: facts.evidenceKeys},
          periods: facts.periods.map(item => ({periodId: item.id, title: `Tháng ${item.month}`, narrative: "Nội dung thử nghiệm.",
            recommendations: ["Ghi lại ưu tiên.", "Trao đổi rõ ràng."], cautions: ["Dành thời gian chuẩn bị."], evidenceKeys: item.evidenceKeys}))}});
      await database.update(reportReservations).set({status: "complete"}).where(eq(reportReservations.id, frozen.id));
    }
    return frozen;
  }
  it.each(["pending", "terminal", "forged_ready"])("requires every Combo component ready, annual=%s", async state => {
    const owner = await ownerFixture(`Combo ${state}`);
    const spendId = await insertWalletSpend(owner, "ZIWEI-COMBO-P0", 1300, frozenNow, "fd119");
    await readyLifetime(owner, spendId);
    const annual = await annualComponent(owner, spendId, false);
    if (state !== "pending") await database.update(reportReservations).set({status: state === "terminal" ? "terminal_failure" : "complete"})
      .where(eq(reportReservations.id, annual.id));
    expect(await service().claimGuarantee(owner.actor, claim(owner.chartId, "ZIWEI-IDENTITY-P0")))
      .toMatchObject({ok: false, code: "GUARANTEE_INVALID_REQUEST"});
    expect(await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, owner.userId))).toHaveLength(0);
    const children = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ledgerSpendId, spendId));
    expect(children).toHaveLength(2); expect(children.every(item => item.revokedAt === null)).toBe(true);
  });
  it("halves a fully ready Combo once and revokes both components", async () => {
    const owner = await ownerFixture("Ready Combo");
    const spendId = await insertWalletSpend(owner, "ZIWEI-COMBO-P0", 1300, frozenNow, "fd119");
    const natal = await readyLifetime(owner, spendId); const annual = await annualComponent(owner, spendId, true);
    const query = createReportQueryService({repository: createDatabaseReportQueryRepository(database, () => frozenNow)});
    for (const report of [natal, annual]) expect(await query.getReport(owner.actor, report.reportId)).toMatchObject({ok: true, value: {state: "ready"}});
    const input = claim(owner.chartId, "ZIWEI-IDENTITY-P0");
    const first = await service().claimGuarantee(owner.actor, input);
    expect(first).toMatchObject({ok: true, value: {amountLaRestored: 650, balance: {promotionalLa: 650}}});
    expect(await service().claimGuarantee(owner.actor, input)).toEqual(first);
    const children = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ledgerSpendId, spendId));
    expect(children.every(item => item.revokedAt !== null)).toBe(true);
    for (const report of [natal, annual]) expect(await query.getReport(owner.actor, report.reportId)).toMatchObject({ok: false});
  });

  it("restores half to original mixed buckets/lots and reverses only proportional revenue", async () => {
    const owner = await ownerFixture("Mixed half"); const ports = walletPorts(owner.userId);
    expect(await ports.repository.grant({targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID(), 200),
      topUpOrderId: null, trustedGrantToken: ports.authority.token})).toMatchObject({ok: true});
    const commerce = createDatabaseCommerceRepository(database, {now: () => frozenNow});
    for (let index = 0; index < 4; index++) {
      const order = await commerce.createTopUpOrder(owner.actor, "LA-ENTRY-300", "vi");
      if (!order.ok) throw new Error(order.code);
      expect(await commerce.recordPaid({invoiceNumber: order.value.invoiceNumber, providerEventId: randomUUID(),
        amount: 29000, currency: "VND", traceId: "isolated-mixed-funding"})).toMatchObject({ok: true});
    }
    const spendId = await insertWalletSpend(owner, "ZIWEI-IDENTITY-P0", 1200, frozenNow, "fd119", false);
    await readyLifetime(owner, spendId);
    const result = await service().claimGuarantee(owner.actor, claim(owner.chartId, "ZIWEI-IDENTITY-P0"));
    expect(result).toMatchObject({ok: true, value: {amountLaRestored: 600, balance: {purchasedLa: 700, promotionalLa: 100, totalLa: 800}}});
    if (!result.ok) throw new Error(result.code);
    const returned = await database.select({returned: walletRestorationAllocations, source: walletSpendAllocations})
      .from(walletRestorationAllocations).innerJoin(walletSpendAllocations, eq(walletSpendAllocations.id, walletRestorationAllocations.spendAllocationId))
      .where(eq(walletRestorationAllocations.restorationTransactionId, result.value.receipt.transactionId));
    expect(returned.map(item => item.returned.amountLa).sort((a, b) => a! - b!)).toEqual([50, 100, 150, 150, 150]);
    expect(returned.reduce((sum, item) => sum + item.returned.reversedVnd!, 0)).toBe(48333);
    expect(returned.filter(item => item.source.bucket === "promotional").reduce((sum, item) => sum + item.returned.amountLa!, 0)).toBe(100);
    expect(returned.every(item => item.source.spendTransactionId === spendId)).toBe(true);
  });

  it("rejects a half guarantee when current-version recovery changes readiness while the claim waits", async () => {
    const owner = await ownerFixture("Recovery readiness fence");
    const spendId = await insertWalletSpend(owner, "ZIWEI-IDENTITY-P0", 1200, frozenNow, "fd119");
    const report = await readyLifetime(owner, spendId);
    let enter!: () => void; let release!: () => void;
    const entered = new Promise<void>(resolve => {enter = resolve;}); const gate = new Promise<void>(resolve => {release = resolve;});
    const recovery = database.transaction(async tx => {
      await lockFreeAiCoordination(tx);
      await tx.select().from(authUsers).where(eq(authUsers.id, owner.userId)).for("update");
      await tx.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId)).for("update");
      await tx.select().from(reportReservations).where(eq(reportReservations.id, report.id)).for("update");
      enter(); await gate;
      // The actual restart/publication writers fence these same authority rows.
      await tx.update(reportReservations).set({status: "requested", reportVersionId: randomUUID(), stateVersion: report.stateVersion + 1})
        .where(eq(reportReservations.id, report.id));
    });
    await entered;
    const pending = service().claimGuarantee(owner.actor, claim(owner.chartId, "ZIWEI-IDENTITY-P0"));
    try {
      let observed = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const wait = await database.execute(sql`select 1 from pg_locks where locktype = 'advisory' and not granted limit 1`);
        if (wait.length > 0) {observed = true; break;}
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(observed).toBe(true);
    } finally {release(); await recovery;}
    expect(await pending).toMatchObject({ok: false, code: "GUARANTEE_INVALID_REQUEST"});
    expect(await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, owner.userId))).toHaveLength(0);
    expect(await database.select().from(walletTransactions).where(eq(walletTransactions.reversalOfTransactionId, spendId))).toHaveLength(0);
  });

});
