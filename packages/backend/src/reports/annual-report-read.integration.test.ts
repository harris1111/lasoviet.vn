import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceEntitlements,
  createDatabase, evidenceSets, outbox, runMigrations, ziweiCharts, ziweiChartVersions,
  reportReservations, reportSourceSnapshots, reportVersions, walletTransactions, type Database } from "@lasoviet/database";
import { type CurrentActor, type WalletGrantV1, type NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { calculateIztroReportSnapshot } from "../../../engine-adapters/src/ziwei/iztro-report-snapshot.js";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createWalletUnlockService } from "../commerce/wallet-unlock.service.js";
import { createDatabaseReportQueryRepository } from "./report-query.repository.js";
import { createReportQueryService, ReportQueryDataError } from "./report-query.service.js";
import { periodReportVersions } from "./period-report-config.js";
import { content as monthlyContent } from "./period-report.test-fixture.js";
import { renderPeriodReportHtml } from "./period-report-html.js";
const availability = vi.hoisted(() => ({enabled: false}));
// Test-only reserved availability; real frozen prices, wallet locks and report authority remain intact.
vi.mock("@lasoviet/contracts", async importOriginal => {
  const actual = await importOriginal<typeof import("@lasoviet/contracts")>();
  return {...actual, findLaProduct: (sku: string) => {
    const product = actual.findLaProduct(sku);
    return product && sku === "ZIWEI-YEAR-P0" && availability.enabled ? {...product, availability: "active"} : product;
  }};
});
describe("frozen next annual report with real PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: Database;
  const frozenNow = new Date("2026-09-30T10:00:00Z");
  const readNow = new Date("2029-03-01T00:00:00Z");
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
    return {chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi" as const, sku, targetYear: 2027};
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


  const sku = "ZIWEI-YEAR-P0";
  it("reserves2027 once, reads computed months across rollover, rejects wrong year and fences revocation", async () => {
    availability.enabled = true;
    const owner = await ownerFixture("Frozen next year"); const outsider = await ownerFixture("Other owner");
    const ports = await fund(owner);
    const purchase = await buy(owner, ports, sku);
    expect(purchase.value.intent.amountLa).toBe(480);
    const spends = await database.select().from(walletTransactions).where(and(
      eq(walletTransactions.purchaseIntentId, purchase.value.intent.id), eq(walletTransactions.kind, "spend")));
    expect(spends).toHaveLength(1);
    const [reservation] = await database.select().from(reportReservations).innerJoin(commerceEntitlements,
      eq(commerceEntitlements.id, reportReservations.entitlementId)).where(and(
        eq(commerceEntitlements.ownerId, owner.userId), eq(reportReservations.sku, sku)));
    if (!reservation) throw new Error("missing actual annual reservation");
    const frozen = reservation.report_reservations;
    expect(frozen.targetYear).toBe(2027);
    expect(reservation.commerce_entitlements.periodKey).toBe("2027");
    const events = await database.select().from(outbox).where(sql`${outbox.payload}->>'reportId' = ${frozen.reportId}`);
    expect(events.filter(event => event.eventType.startsWith("report.generation.requested"))).toHaveLength(1);
    const profile: NormalizedBirthProfileV1 = {
      version: 1, originalInput: {version: 1, calendar: {kind: "solar", date: "1992-06-15"},
        time: {precision: "exact_minute", localTime: "08:30"}, timezone: {offsetMinutes: 420}, gender: "male", consentVersion: "synthetic"},
      normalizedCalendar: {kind: "solar", date: "1992-06-15"}, normalizedTime: {precision: "exact_minute", localTime: "08:30"},
      timezoneProvenance: {source: "offset", offsetMinutes: 420}, normalizationWarnings: [], limitations: []};
    const snapshot = await calculateIztroReportSnapshot({chartVersionId: owner.chartVersionId, birthProfile: profile,
      asOfDate: frozen.asOfDate!, targetYear: frozen.targetYear!, timingRuleVersion: frozen.timingRuleVersion!,
      sensitivityRuleVersion: frozen.sensitivityRuleVersion!, periodReading: {chartId: owner.chartId, kind: "annual"}});
    if (!snapshot.ok) throw new Error(snapshot.error.code);
    const facts = snapshot.value.periodReading!;
    expect(facts.targetYear).toBe(2027);
    expect(new Set(facts.periods.map(period => period.month)).size).toBe(12);
    await database.insert(reportSourceSnapshots).values({reportId: frozen.reportId, reportVersionId: frozen.reportVersionId,
      chartVersionId: owner.chartVersionId, asOfDate: frozen.asOfDate!, targetYear: 2027,
      timingRuleVersion: frozen.timingRuleVersion!, sensitivityRuleVersion: frozen.sensitivityRuleVersion!,
      snapshotHash: createHash("sha256").update(JSON.stringify(snapshot.value)).digest("hex"), snapshot: snapshot.value});
    // Synthetic prose exercises immutable storage/read, not native generation or owner quality acceptance.
    const base = monthlyContent();
    const output = {...base, kind: "annual" as const, targetYear: 2027, periodKey: "2027", title: "Năm2027",
      overview: {...base.overview, evidenceKeys: facts.evidenceKeys}, periods: facts.periods.map(period => ({
        ...base.periods[0]!, periodId: period.id, title: `Tháng ${period.month}`, evidenceKeys: period.evidenceKeys}))};
    const tuple = periodReportVersions();
    await database.insert(reportVersions).values({reportId: frozen.reportId, reportVersionId: frozen.reportVersionId,
      entitlementId: frozen.entitlementId, chartVersionId: frozen.chartVersionId, evidenceVersionId: frozen.evidenceVersionId,
      knowledgeVersionId: tuple.knowledgeVersion, promptVersion: tuple.promptVersion, reportConfigVersion: tuple.reportConfigVersion,
      templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion, locale: "vi", sku,
      providerId: "synthetic", modelId: "synthetic", structuredContent: output, htmlContent: renderPeriodReportHtml(output),
      contentHash: createHash("sha256").update(JSON.stringify(output)).digest("hex"), pdfAssetId: randomUUID()});
    await database.update(reportReservations).set({status: "html_ready"}).where(eq(reportReservations.id, frozen.id));
    const query = createReportQueryService({repository: createDatabaseReportQueryRepository(database, () => readNow), now: () => readNow});
    const result = await query.getReport(owner.actor, frozen.reportId);
    expect(result).toMatchObject({ok: true, value: {state: "ready", sku, content: {targetYear: 2027, periodKey: "2027"}}});
    if (!result.ok || result.value.state !== "ready" || !("periods" in result.value.content)) throw new Error("expected annual reader");
    expect(result.value.content.periods).toHaveLength(facts.periods.length);
    expect(JSON.stringify(result)).not.toMatch(/evidenceKeys|periodId/);
    expect(await query.getReport(outsider.actor, frozen.reportId)).toMatchObject({ok: false});
    // Keep stored immutable rows intact while presenting a corrupted read projection to the service.
    const repository = createDatabaseReportQueryRepository(database, () => readNow);
    const record = await repository.readAuthorizedReport(owner.userId, frozen.reportId);
    if (!record?.version) throw new Error("missing immutable projection");
    const wrong = {...record, version: {...record.version, structuredContent: {...output, targetYear: 2026}}};
    await expect(createReportQueryService({repository: {readAuthorizedReport: async () => wrong}, now: () => readNow})
      .getReport(owner.actor, frozen.reportId)).rejects.toBeInstanceOf(ReportQueryDataError);
    await database.update(commerceEntitlements).set({revokedAt: readNow}).where(eq(commerceEntitlements.id, frozen.entitlementId));
    expect(await query.getReport(owner.actor, frozen.reportId)).toMatchObject({ok: false});
  });
});
