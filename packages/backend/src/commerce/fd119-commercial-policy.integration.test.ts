import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { authUsers, auditLogs, birthProfiles, birthProfileRevisions, calculationRuns, commerceEntitlements,
  createDatabase, evidenceSets, outbox, runMigrations, walletAccounts, walletPurchaseIntents,
  ziweiCharts, ziweiChartVersions, type Database } from "@lasoviet/database";
import { SINGLE_PALACE_SKUS, type CurrentActor, type WalletGrantV1 } from "@lasoviet/contracts";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createWalletUnlockService } from "./wallet-unlock.service.js";
import { freezePurchaseCommercialTerms } from "./purchase-commercial-terms.js";
// Only reserved-product availability is overridden; actual FD119 prices/policy/codecs remain real.
vi.mock("@lasoviet/contracts", async importOriginal => {
  const actual = await importOriginal<typeof import("@lasoviet/contracts")>();
  return {...actual, findLaProduct: (sku: string) => {
    const product = actual.findLaProduct(sku);
    return product && ["ZIWEI-YEAR-P0", "ZIWEI-COMBO-P0"].includes(sku) ? {...product, availability: "active"} : product;
  }};
});
describe("FD119 purchase cohorts", () => {
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


  async function fund(owner: Awaited<ReturnType<typeof ownerFixture>>) {
    const ports = walletPorts(owner.userId);
    const result = await ports.repository.grant({targetOwnerId: owner.userId, grant: grant(owner.userId, randomUUID(), 3000),
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
  async function pending(owner: Awaited<ReturnType<typeof ownerFixture>>, sku: string, periodKey: string, priceLa: number, snapshot: boolean) {
    const values = {ownerId: owner.userId, chartId: owner.chartId, chartVersionId: owner.chartVersionId,
      sku, periodKey, locale: "vi", priceLa, createdAt: frozenNow};
    const [inserted] = await database.insert(walletPurchaseIntents).values({...values,
      commercialTerms: snapshot ? freezePurchaseCommercialTerms(values, undefined, "pre-fd119") : null}).returning();
    return inserted!;
  }
  it("creates1200/v2 new lifetime terms and completes/replays under the actual new catalog", async () => {
    const owner = await ownerFixture("New policy"); const ports = await fund(owner);
    const result = await buy(owner, ports, "ZIWEI-IDENTITY-P0");
    expect(result.value.intent.amountLa).toBe(1200);
    const [intent] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, result.value.intent.id));
    expect(intent!.commercialTerms).toMatchObject({version: 2, policy: "fd119", basePriceLa: 1200, chargedLa: 1200, guarantee: "half"});
  });
  it.each([false, true])("preserves the original960 scope and old guarantee with snapshot=%s", async snapshot => {
    const owner = await ownerFixture("Old scope"); const ports = await fund(owner);
    const original = await pending(owner, "ZIWEI-IDENTITY-P0", "lifetime", 960, snapshot);
    const first = await ports.service.createPurchaseIntent(owner.actor, request(owner));
    expect(first).toMatchObject({ok: true, reused: true, value: {id: original.id, amountLa: 960}});
    await buy(owner, ports, "ZIWEI-PALACE-LIFE-P0");
    const replaced = await ports.service.createPurchaseIntent(owner.actor, request(owner));
    expect(replaced).toMatchObject({ok: true, reused: false, value: {amountLa: 840}});
    if (!replaced.ok) throw new Error(replaced.code);
    const [frozen] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, replaced.value.id));
    expect(frozen!.commercialTerms).toMatchObject({version: 1, policy: "pre-fd119", basePriceLa: 960, chargedLa: 840, guarantee: "none", creditProof: {version: 1, creditLa: 120}});
    const [audit] = await database.select().from(auditLogs).where(eq(auditLogs.targetId, replaced.value.id));
    expect(audit!.metadata).toMatchObject({originalIntentId: original.id, replacementIntentId: replaced.value.id, preservedPolicy: true});
    const later = walletPorts(owner.userId, {now: () => new Date(frozenNow.getTime() + 8 * 86_400_000)});
    const expired = await later.service.createPurchaseIntent(owner.actor, request(owner));
    expect(expired).toMatchObject({ok: true, value: {amountLa: 960}});
  });
  it("a different Combo year creates a new FD119 purchase rather than grandfathering the SKU", async () => {
    const owner = await ownerFixture("New year"); const ports = await fund(owner);
    const original = await pending(owner, "ZIWEI-COMBO-P0", "2026", 1300, true);
    const replacement = await ports.service.createPurchaseIntent(owner.actor, {...request(owner, "ZIWEI-COMBO-P0"), targetYear: 2027});
    expect(replacement).toMatchObject({ok: true, reused: false, value: {amountLa: 1300}});
    if (!replacement.ok) throw new Error(replacement.code);
    const [frozen] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, replacement.value.id));
    expect(frozen!.commercialTerms).toMatchObject({version: 2, policy: "fd119", guarantee: "half", periodKey: "2027"});
    const [audit] = await database.select().from(auditLogs).where(eq(auditLogs.targetId, replacement.value.id));
    expect(audit!.metadata).toMatchObject({originalIntentId: original.id, preservedPolicy: false});
  });
  it("publishes a1080+120 version2 upgrade without changing stable dedupe or replay", async () => {
    const owner = await ownerFixture("New rollover"); const ports = await fund(owner);
    await buy(owner, ports, "ZIWEI-PALACE-LIFE-P0");
    const result = await buy(owner, ports, "ZIWEI-IDENTITY-P0");
    expect(result.value).toMatchObject({intent: {amountLa: 1080}, upgradePurchase: {version: 2, creditLa: 120, chargedLa: 1080}});
    const [event] = await database.select().from(outbox).where(eq(outbox.eventType, "wallet.upgrade.committed.v1"));
    expect(event!.payload).toMatchObject({upgrade: {version: 2, creditLa: 120, chargedLa: 1080}});
  });
  it("caps version2 credit at1200 and completes a zero-price lifetime without another debit", async () => {
    const owner = await ownerFixture("New zero"); const ports = await fund(owner);
    for (const sku of SINGLE_PALACE_SKUS.slice(0, 10)) await buy(owner, ports, sku);
    const before = await ports.repository.readBalance(owner.actor);
    const result = await buy(owner, ports, "ZIWEI-IDENTITY-P0");
    expect(result.value).toMatchObject({intent: {amountLa: 0}, upgradePurchase: {version: 2, creditLa: 1200, chargedLa: 0}});
    expect(await ports.repository.readBalance(owner.actor)).toEqual(before);
    expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId))).toHaveLength(11);
  });
  it("rejects NULL/v1 high prices and cross-policy snapshots in PostgreSQL", async () => {
    const owner = await ownerFixture("Database policy guard");
    const values = {ownerId: owner.userId, chartId: owner.chartId, chartVersionId: owner.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0", locale: "vi", periodKey: "lifetime", priceLa: 1200, createdAt: frozenNow};
    const terms = freezePurchaseCommercialTerms(values);
    for (const commercialTerms of [null, {...terms, version: 1}, {...terms, policy: "pre-fd119"},
      {...terms, basePriceLa: 960}, {...terms, guarantee: "full"}]) {
      await expect(database.insert(walletPurchaseIntents).values({...values, commercialTerms})).rejects.toThrow();
    }
    expect(await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.ownerId, owner.userId))).toHaveLength(0);
  });

});
