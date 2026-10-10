import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceEntitlements,
  createDatabase, evidenceSets, outbox, runMigrations, walletAccounts, walletCreditLots, walletPurchaseIntents,
  ziweiCharts, ziweiChartVersions, reportReservations, reportVersions, walletTransactions, walletSpendAllocations, walletRestorationAllocations, guaranteeClaims, type Database } from "@lasoviet/database";
import { type CurrentActor, type WalletGrantV1 } from "@lasoviet/contracts";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createWalletUnlockService } from "./wallet-unlock.service.js";
import { freezePurchaseCommercialTerms } from "./purchase-commercial-terms.js";
import { createDatabaseCommerceRepository } from "./commerce.repository.js";
import { createGuaranteeFeedbackService } from "./guarantee-feedback.service.js";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { createReportQueryService } from "../reports/report-query.service.js";
import { topicReportVersions } from "../reports/topic-report-config.js";
import { buildFactsFixture, makeCareerTransitionContentFixture } from "../reports/topic-report.test-fixture.js";
import { renderTopicReportHtml } from "../reports/topic-report-html.js";
const availability = vi.hoisted(() => ({ enabled: false }));
// Only reserved-product availability is overridden; actual FD119 prices/policy/codecs remain real.
vi.mock("@lasoviet/contracts", async importOriginal => {
  const actual = await importOriginal<typeof import("@lasoviet/contracts")>();
  return {...actual, findLaProduct: (sku: string) => {
    const product = actual.findLaProduct(sku);
    return product && ["ZIWEI-CAREER-TRANSITION-P0", "ZIWEI-CAREER-P0"].includes(sku) && availability.enabled ? {...product, availability: "active"} : product;
  }};
});
describe("reserved transition topic commerce with real PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: Database;
  const frozenNow = new Date("2026-09-30T10:00:00.000Z");
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 120_000);
  beforeEach(() => { availability.enabled = false; });
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


  async function fund(owner: Awaited<ReturnType<typeof ownerFixture>>, promotionalLa = 3000) {
    const ports = walletPorts(owner.userId);
    const result = await ports.repository.grant({targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID(), promotionalLa),
      topUpOrderId: null, trustedGrantToken: ports.authority.token});
    if (!result.ok) throw new Error(result.error.code);
    return ports;
  }
  function request(owner: Awaited<ReturnType<typeof ownerFixture>>, sku = "ZIWEI-IDENTITY-P0") {
    return {chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi" as const, sku};
  }
  async function buy(owner: Awaited<ReturnType<typeof ownerFixture>>, ports: ReturnType<typeof walletPorts>, sku: string) {
    const intent = await ports.service.createPurchaseIntent(owner.actor, request(owner, sku));
    if (!intent.ok) throw new Error(intent.code);
    const wallet = await ports.repository.readBalance(owner.actor);
    if (!wallet.ok) throw new Error(wallet.error.code);
    const command = {purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion,
      expectedWalletVersion: wallet.value.stateVersion, idempotencyKey: randomUUID()};
    const result = await ports.service.unlock(owner.actor, command);
    if (!result.ok) throw new Error(result.code);
    expect(await ports.service.unlock(owner.actor, command)).toEqual(result);
    return result;
  }

  const sku = "ZIWEI-CAREER-TRANSITION-P0";
  const query = () => createReportQueryService({repository: createDatabaseReportQueryRepository(database, () => frozenNow)});
  const guarantee = (now = frozenNow) => createGuaranteeFeedbackService(database, {now: () => now});
  async function reservationFor(owner: Awaited<ReturnType<typeof ownerFixture>>, productSku = sku) {
    const [reservation] = await database.select().from(reportReservations).innerJoin(commerceEntitlements,
      eq(commerceEntitlements.id, reportReservations.entitlementId)).where(and(
        eq(commerceEntitlements.ownerId, owner.userId), eq(reportReservations.sku, productSku)));
    if (!reservation) throw new Error("missing actual purchase reservation");
    return reservation.report_reservations;
  }
  async function publishSynthetic(owner: Awaited<ReturnType<typeof ownerFixture>>) {
    const reservation = await reservationFor(owner);
    const tuple = topicReportVersions(); const content = makeCareerTransitionContentFixture(buildFactsFixture());
    // A synthetic storage/read fixture does not claim native generation or manual sale acceptance.
    await database.insert(reportVersions).values({reportId: reservation.reportId, reportVersionId: reservation.reportVersionId,
      entitlementId: reservation.entitlementId, chartVersionId: reservation.chartVersionId, evidenceVersionId: reservation.evidenceVersionId,
      knowledgeVersionId: tuple.knowledgeVersion, promptVersion: tuple.promptVersion, reportConfigVersion: tuple.reportConfigVersion,
      templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion, locale: "vi", sku,
      providerId: "synthetic", modelId: "synthetic", structuredContent: content, htmlContent: renderTopicReportHtml(content),
      contentHash: "a".repeat(64), pdfAssetId: randomUUID()});
    await database.update(reportReservations).set({status: "complete"}).where(eq(reportReservations.id, reservation.id));
    return reservation;
  }
  function claim(owner: Awaited<ReturnType<typeof ownerFixture>>, reportId?: string, partId = sku) {
    return {chartId: owner.chartId, ...(reportId ? {reportId} : {}), partId, rating: "inaccurate" as const, idempotencyKey: randomUUID()};
  }
  it("does not spend or reserve the default held product", async () => {
    const owner = await ownerFixture("Reserved transition"); const ports = await fund(owner);
    const before = await ports.repository.readBalance(owner.actor);
    expect(await ports.service.createPurchaseIntent(owner.actor, request(owner, sku))).toMatchObject({ok: false});
    expect(await ports.repository.readBalance(owner.actor)).toEqual(before);
    expect(await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.ownerId, owner.userId))).toHaveLength(0);
    expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId))).toHaveLength(0);
  });
  it("buys480 once, reserves the actual topic tuple, reads only for the owner and fully restores the same report once", async () => {
    availability.enabled = true;
    const owner = await ownerFixture("Owned transition"); const outsider = await ownerFixture("Other account"); const ports = await fund(owner);
    const purchase = await buy(owner, ports, sku);
    expect(purchase.value.intent.amountLa).toBe(480);
    const [intent] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, purchase.value.intent.id));
    expect(intent!.commercialTerms).toMatchObject({version: 2, policy: "fd119", basePriceLa: 480, chargedLa: 480, guarantee: "full"});
    const spends = await database.select().from(walletTransactions).where(and(eq(walletTransactions.purchaseIntentId, intent!.id), eq(walletTransactions.kind, "spend")));
    expect(spends).toHaveLength(1);
    const reservation = await publishSynthetic(owner);
    const tuple = topicReportVersions();
    expect(reservation).toMatchObject({sku, knowledgeVersionId: tuple.knowledgeVersion, promptVersion: tuple.promptVersion, reportConfigVersion: tuple.reportConfigVersion});
    const events = await database.select().from(outbox).where(sql`${outbox.payload}->>'reportId' = ${reservation.reportId}`);
    expect(events.filter(event => event.eventType.startsWith("report.generation.requested"))).toHaveLength(1);
    const view = await query().getReport(owner.actor, reservation.reportId);
    expect(view).toMatchObject({ok: true, value: {state: "ready", sku, content: {topicId: "career_transition"}}});
    expect(JSON.stringify(view)).not.toContain("evidenceKeys");
    expect(await query().getReport(outsider.actor, reservation.reportId)).toMatchObject({ok: false});
    expect(await guarantee().claimGuarantee(outsider.actor, claim(owner, reservation.reportId))).toEqual({ok: false, code: "GUARANTEE_NOT_OWNER"});
    expect(await guarantee().claimGuarantee(owner.actor, claim(owner))).toEqual({ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND"});
    expect(await guarantee().claimGuarantee(owner.actor, claim(owner, undefined, "topicDeepDive"))).toEqual({ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND"});
    const input = claim(owner, reservation.reportId);
    const result = await guarantee().claimGuarantee(owner.actor, input);
    expect(result).toMatchObject({ok: true, value: {amountLaRestored: 480, balance: {purchasedLa: 0, promotionalLa: 3000, totalLa: 3000}}});
    expect(await guarantee().claimGuarantee(owner.actor, input)).toEqual(result);
    expect(await guarantee().claimGuarantee(owner.actor, claim(owner, reservation.reportId))).toEqual({ok: false, code: "GUARANTEE_ALREADY_CLAIMED"});
    expect(await database.select().from(guaranteeClaims).where(eq(guaranteeClaims.accountId, owner.userId))).toHaveLength(1);
    expect(await query().getReport(owner.actor, reservation.reportId)).toMatchObject({ok: false});
  });
  it("rejects another purchased topic's report association, including the generic section alias", async () => {
    availability.enabled = true;
    const owner = await ownerFixture("Separate topic claims"); const ports = await fund(owner);
    await buy(owner, ports, "ZIWEI-CAREER-P0");
    const career = await reservationFor(owner, "ZIWEI-CAREER-P0");
    await buy(owner, ports, sku); const transition = await reservationFor(owner);
    expect(await guarantee().claimGuarantee(owner.actor, claim(owner, career.reportId))).toEqual({ok: false, code: "GUARANTEE_ENTITLEMENT_NOT_FOUND"});
    // Generic aliases refund only the report they name, even if another topic was purchased later.
    const result = await guarantee().claimGuarantee(owner.actor, claim(owner, career.reportId, "section-topicDeepDive"));
    expect(result).toMatchObject({ok: true, value: {amountLaRestored: 480}});
    const [returned] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.id, career.entitlementId));
    const [retained] = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.id, transition.entitlementId));
    expect(returned!.revokedAt).not.toBeNull(); expect(retained!.revokedAt).toBeNull();
  });
  it("returns the original mixed lots and exact recognized revenue for a full480 refund", async () => {
    availability.enabled = true;
    const owner = await ownerFixture("Mixed transition funding"); const ports = await fund(owner, 200);
    const commerce = createDatabaseCommerceRepository(database, {now: () => frozenNow});
    const topup = await commerce.createTopUpOrder(owner.actor, "LA-ENTRY-300", "vi");
    if (!topup.ok) throw new Error(topup.code);
    // Local synthetic settlement uses the real grant path; no provider/webhook/customer action.
    expect(await commerce.recordPaid({invoiceNumber: topup.value.invoiceNumber, providerEventId: randomUUID(), amount: 29000,
      currency: "VND", traceId: "synthetic-transition-funding"})).toMatchObject({ok: true});
    const originalLots = await database.select().from(walletCreditLots).where(eq(walletCreditLots.walletId, (await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, owner.userId)))[0]!.id));
    await buy(owner, ports, sku); const report = await reservationFor(owner);
    expect(await ports.repository.readBalance(owner.actor)).toMatchObject({ok: true, value: {purchasedLa: 20, promotionalLa: 0, totalLa: 20}});
    const result = await guarantee().claimGuarantee(owner.actor, claim(owner, report.reportId));
    expect(result).toMatchObject({ok: true, value: {amountLaRestored: 480, balance: {purchasedLa: 300, promotionalLa: 200, totalLa: 500}}});
    if (!result.ok) throw new Error(result.code);
    const restored = await database.select({returned: walletRestorationAllocations, source: walletSpendAllocations})
      .from(walletRestorationAllocations).innerJoin(walletSpendAllocations, eq(walletSpendAllocations.id, walletRestorationAllocations.spendAllocationId))
      .where(eq(walletRestorationAllocations.restorationTransactionId, result.value.receipt.transactionId));
    expect(restored.reduce((sum, row) => sum + row.returned.amountLa!, 0)).toBe(480);
    expect(restored.filter(row => row.source.bucket === "promotional").reduce((sum, row) => sum + row.returned.amountLa!, 0)).toBe(200);
    expect(restored.filter(row => row.source.bucket === "purchased").reduce((sum, row) => sum + row.returned.amountLa!, 0)).toBe(280);
    expect(restored.reduce((sum, row) => sum + row.returned.reversedVnd!, 0)).toBe(27066);
    expect(restored.map(row => row.source.creditLotId).sort()).toEqual(originalLots.map(lot => lot.id).sort());
    const returnedLots = await database.select().from(walletCreditLots).where(eq(walletCreditLots.walletId, originalLots[0]!.walletId));
    expect(returnedLots.map(lot => ({id: lot.id, bucket: lot.bucket, remainingLa: lot.remainingLa})).sort((a, b) => a.id.localeCompare(b.id)))
      .toEqual(originalLots.map(lot => ({id: lot.id, bucket: lot.bucket, remainingLa: lot.remainingLa})).sort((a, b) => a.id.localeCompare(b.id)));
  });
  it("enforces the exact24h refund boundary without financial mutation", async () => {
    availability.enabled = true;
    const owner = await ownerFixture("Expired transition claim"); const ports = await fund(owner);
    await buy(owner, ports, sku); const report = await reservationFor(owner);
    const before = await ports.repository.readBalance(owner.actor);
    expect(await guarantee(new Date(frozenNow.getTime() + 86_400_000)).claimGuarantee(owner.actor, claim(owner, report.reportId)))
      .toEqual({ok: false, code: "GUARANTEE_WINDOW_EXPIRED"});
    expect(await ports.repository.readBalance(owner.actor)).toEqual(before);
  });
  it("requires a bound v2/fd119 promise and rejects malformed database transition sales", async () => {
    const owner = await ownerFixture("Business database guard");
    const values = {ownerId: owner.userId, chartId: owner.chartId, chartVersionId: owner.chartVersionId,
      sku, locale: "vi", periodKey: "lifetime", priceLa: 480, createdAt: frozenNow};
    const terms = freezePurchaseCommercialTerms(values);
    for (const commercialTerms of [null, {...terms, version: 1, policy: "pre-fd119"}, {...terms, basePriceLa: 600}, {...terms, guarantee: "half"}]) {
      await expect(database.insert(walletPurchaseIntents).values({...values, commercialTerms})).rejects.toThrow();
    }
    for (const overrides of [{locale: "en"}, {periodKey: "2026"}, {priceLa: 600}]) {
      const invalid = {...values, ...overrides};
      // The promise remains bound to that scope so the product-specific database rule is exercised.
      await expect(database.insert(walletPurchaseIntents).values({...invalid, commercialTerms: {...terms, ...overrides}})).rejects.toThrow();
    }
    expect(await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.ownerId, owner.userId))).toHaveLength(0);
  });
});
