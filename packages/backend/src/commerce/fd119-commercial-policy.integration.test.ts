import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { reportReservations } from "@lasoviet/database";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { authUsers, auditLogs, birthProfiles, birthProfileRevisions, calculationRuns, commerceEntitlements, commerceOrders, walletTopUpContinuations,
  createDatabase, evidenceSets, outbox, runMigrations, walletAccounts, walletPurchaseIntents,
  walletTransactions, ziweiCharts, ziweiChartVersions, type Database } from "@lasoviet/database";
import { findLaProduct, SINGLE_PALACE_SKUS, type CurrentActor, type WalletGrantV1 } from "@lasoviet/contracts";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createWalletUnlockService } from "./wallet-unlock.service.js";
import { createMembershipService } from "./membership.service.js";
import { createDatabaseCommerceRepository } from "./commerce.repository.js";
import { freezePurchaseCommercialTerms } from "./purchase-commercial-terms.js";
const heldComboChildren = vi.hoisted(() => new Set<string>());
// Only product availability is overridden; actual FD119 prices/policy/codecs remain real.
vi.mock("@lasoviet/contracts", async importOriginal => {
  const actual = await importOriginal<typeof import("@lasoviet/contracts")>();
  return {...actual, findLaProduct: (sku: string) => {
    const product = actual.findLaProduct(sku);
    if (product && heldComboChildren.has(sku)) return {...product, availability: "reserved"};
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
  async function spendsForOwner(ownerId: string) {
    const rows = await database.select({transaction: walletTransactions}).from(walletTransactions)
      .innerJoin(walletAccounts, eq(walletAccounts.id, walletTransactions.walletId))
      .where(and(eq(walletAccounts.ownerId, ownerId), eq(walletTransactions.kind, "spend")));
    return rows.map(row => row.transaction);
  }
  async function pending(owner: Awaited<ReturnType<typeof ownerFixture>>, sku: string, periodKey: string, priceLa: number, snapshot: boolean | "fd119") {
    const values = {ownerId: owner.userId, chartId: owner.chartId, chartVersionId: owner.chartVersionId,
      sku, periodKey, locale: "vi", priceLa, createdAt: frozenNow};
    const [inserted] = await database.insert(walletPurchaseIntents).values({...values,
      commercialTerms: snapshot ? freezePurchaseCommercialTerms(values, undefined, snapshot === "fd119" ? "fd119" : "pre-fd119") : null}).returning();
    return inserted!;
  }
  it("creates1200/v2 new lifetime terms and completes/replays under the actual new catalog", async () => {
    const owner = await ownerFixture("New policy"); const ports = await fund(owner);
    const result = await buy(owner, ports, "ZIWEI-IDENTITY-P0");
    expect(result.value.intent.amountLa).toBe(1200);
    const [intent] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, result.value.intent.id));
    expect(intent!.commercialTerms).toMatchObject({version: 2, policy: "fd119", basePriceLa: 1200, chargedLa: 1200, guarantee: "half"});
    const [reservation]=await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId,owner.chartVersionId));
    const record=await createDatabaseReportQueryRepository(database,()=>frozenNow).readAuthorizedReport(owner.userId,reservation!.reportId);
    expect(record).toMatchObject({source:"ledger_spend",wallet:{guaranteePromise:{chargedLa:1200,restoration:"half",maximumRestoreLa:600,claimBefore:"2026-10-01T10:00:00.000Z"}}});
    expect(await createDatabaseReportQueryRepository(database,()=>frozenNow).readAuthorizedReport("other-owner",reservation!.reportId)).toBeNull();

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
  it.each([false,true])("reads actual old960 completed purchase snapshot=%s without new refund rights",async snapshot=>{
    const owner=await ownerFixture("Old read projection");const ports=await fund(owner);
    await pending(owner,"ZIWEI-IDENTITY-P0","lifetime",960,snapshot);
    await buy(owner,ports,"ZIWEI-IDENTITY-P0");
    const [reservation]=await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId,owner.chartVersionId));
    const record=await createDatabaseReportQueryRepository(database,()=>frozenNow).readAuthorizedReport(owner.userId,reservation!.reportId);
    expect(record).toMatchObject({wallet:{guaranteePromise:{commercialPolicyVersion:1,chargedLa:960,restoration:"none",maximumRestoreLa:0,claimBefore:null}}});
  });
  it.each(["ZIWEI-IDENTITY-P0", "ZIWEI-YEAR-P0"])("refuses new Combo quotes and intents while child %s is held", async heldSku => {
    const owner = await ownerFixture("Held component"); const ports = await fund(owner);
    const before = await ports.repository.readBalance(owner.actor);
    heldComboChildren.add(heldSku);
    try {
      for (const targetYear of [2026, 2027]) {
        expect(await ports.service.readQuotes(owner.actor, {chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi", targetYear})).toMatchObject({ok: true, value: {quotes: expect.arrayContaining([
          expect.objectContaining({sku: "ZIWEI-COMBO-P0", state: "unavailable", priceLa: null}),
        ])}});
        expect(await ports.service.createPurchaseIntent(owner.actor, {...request(owner, "ZIWEI-COMBO-P0"), targetYear}))
          .toEqual({ok: false, code: "WALLET_INTENT_INVALID"});
      }
      expect(await ports.repository.readBalance(owner.actor)).toEqual(before);
      expect(await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.ownerId, owner.userId))).toHaveLength(0);
      expect(await spendsForOwner(owner.userId)).toHaveLength(0);
      expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId))).toHaveLength(0);
      expect(await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId))).toHaveLength(0);
    } finally { heldComboChildren.clear(); }
  });
  it.each([2026, 2027])("settles and replays the frozen %s Combo after a child is held, with one debit and exact child authority", async targetYear => {
    const owner = await ownerFixture("Frozen component release"); const ports = await fund(owner);
    const input = {...request(owner, "ZIWEI-COMBO-P0"), targetYear};
    const created = await ports.service.createPurchaseIntent(owner.actor, input);
    if (!created.ok) throw new Error(created.code);
    expect(created.value.amountLa).toBe(1300);
    heldComboChildren.add("ZIWEI-YEAR-P0");
    try {
      expect(await ports.service.createPurchaseIntent(owner.actor, input)).toMatchObject({ok: true, reused: true, value: {id: created.value.id, amountLa: 1300}});
      expect(await ports.service.readQuotes(owner.actor, {chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi", targetYear})).toMatchObject({ok: true, value: {quotes: expect.arrayContaining([
        expect.objectContaining({sku: "ZIWEI-COMBO-P0", state: "available", priceLa: 1300}),
      ])}});
      const balance = await ports.repository.readBalance(owner.actor);
      if (!balance.ok) throw new Error(balance.error.code);
      const command = {purchaseIntentId: created.value.id, expectedIntentVersion: created.value.stateVersion,
        expectedWalletVersion: balance.value.stateVersion, idempotencyKey: randomUUID()};
      const result = await ports.service.unlock(owner.actor, command);
      if (!result.ok) throw new Error(result.code);
      expect(result.value.balance.totalLa).toBe(1700);
      expect(await ports.service.unlock(owner.actor, command)).toEqual(result);
      const spends = await spendsForOwner(owner.userId);
      expect(spends).toHaveLength(1);
      const children = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, owner.userId));
      expect(children).toHaveLength(2);
      expect(children).toEqual(expect.arrayContaining([
        expect.objectContaining({sku: "ZIWEI-IDENTITY-P0", periodKey: "lifetime", ledgerSpendId: spends[0]!.id}),
        expect.objectContaining({sku: "ZIWEI-YEAR-P0", periodKey: String(targetYear), ledgerSpendId: spends[0]!.id}),
      ]));
      const reservations = await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId));
      expect(reservations).toHaveLength(2);
      expect(reservations).toEqual(expect.arrayContaining([expect.objectContaining({sku: "ZIWEI-YEAR-P0", targetYear})]));
      for (const reservation of reservations) {
        expect(await createDatabaseReportQueryRepository(database, () => frozenNow).readAuthorizedReport(owner.userId, reservation.reportId))
          .toMatchObject({source: "ledger_spend", wallet: {guaranteePromise: {chargedLa: 1300, restoration: "half", maximumRestoreLa: 650}}});
      }
      expect(await ports.service.createPurchaseIntent(owner.actor, input)).toEqual({ok: false, code: "WALLET_ENTITLEMENT_EXISTS"});
    } finally { heldComboChildren.clear(); }
  });
  it.each([false, true])("refuses a changed year without cancelling historical pending Combo snapshot=%s", async snapshot => {
    const owner = await ownerFixture("Preserved original Combo"); const ports = await fund(owner);
    const original = await pending(owner, "ZIWEI-COMBO-P0", "2026", 1300, snapshot);
    heldComboChildren.add("ZIWEI-IDENTITY-P0");
    try {
      expect(await ports.service.createPurchaseIntent(owner.actor, {...request(owner, "ZIWEI-COMBO-P0"), targetYear: 2027}))
        .toEqual({ok: false, code: "WALLET_INTENT_INVALID"});
      expect(await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, original.id))).toEqual([original]);
      expect(await ports.service.createPurchaseIntent(owner.actor, {...request(owner, "ZIWEI-COMBO-P0"), targetYear: 2026}))
        .toMatchObject({ok: true, reused: true, value: {id: original.id, amountLa: 1300}});
      await buy(owner, ports, "ZIWEI-COMBO-P0");
      expect(await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.ownerId, owner.userId)))
        .toEqual([expect.objectContaining({id: original.id, status: "completed", priceLa: 1300, commercialTerms: original.commercialTerms})]);
    } finally { heldComboChildren.clear(); }
  });
  it.each([
    [false, false], [true, false], ["fd119", false],
    [false, true], [true, true], ["fd119", true],
  ] as const)("refuses expired-membership replacement with cohort=%s and bound=%s before cancelling original terms", async (snapshot, bound) => {
    const owner = await ownerFixture("Held membership replacement");
    const funded = await fund(owner); let current = frozenNow;
    const ports = walletPorts(owner.userId, {now: () => current});
    const balance = await funded.repository.readBalance(owner.actor);
    if (!balance.ok) throw new Error(balance.error.code);
    const membership = createMembershipService(database, createWalletService(ports.repository), {now: () => current,
      catalog: sku => {const product = findLaProduct(sku); return product ? {...product, availability: "active"} : undefined;}});
    const memberIntent = await membership.createIntent(owner.actor, {sku: "MEMBERSHIP-MONTHLY-P0", locale: "vi"});
    if (!memberIntent.ok) throw new Error(memberIntent.code);
    expect(await membership.purchase(owner.actor, {purchaseIntentId: memberIntent.value.id, expectedIntentVersion: memberIntent.value.stateVersion,
      expectedWalletVersion: balance.value.stateVersion, idempotencyKey: randomUUID()})).toMatchObject({ok: true});
    const original = await pending(owner, "ZIWEI-COMBO-P0", "2026", 1040, snapshot);
    const input = {...request(owner, "ZIWEI-COMBO-P0"), targetYear: 2026};
    expect(await ports.service.createPurchaseIntent(owner.actor, input)).toMatchObject({ok: true, reused: true, value: {id: original.id, amountLa: 1040}});
    // Bind shortly before membership expiry so the unpaid top-up itself remains
    // pending throughout the benefit-expiry/refusal assertion.
    current = new Date(frozenNow.getTime() + 30 * 86_400_000 - 60_000);
    const commerce = createDatabaseCommerceRepository(database, {now: () => current});
    const order = bound ? await commerce.createTopUpOrder(owner.actor, "LA-ENTRY-300", "vi", {purchaseIntentId: original.id,
      expectedIntentVersion: original.stateVersion, confirmedPriceLa: 1040, returnTab: "palaces"}) : null;
    if (order && !order.ok) throw new Error(order.code);
    const originalStoredOrder = order?.ok ? await database.select().from(commerceOrders).where(eq(commerceOrders.id, order.value.id)) : [];
    const originalContinuation = order?.ok ? await database.select().from(walletTopUpContinuations).where(eq(walletTopUpContinuations.orderId, order.value.id)) : [];
    current = new Date(frozenNow.getTime() + 30 * 86_400_000);
    const originalOrder = order?.ok ? await commerce.readTopUpOrderProjection(owner.actor, order.value.id) : null;
    if (order?.ok) expect(originalOrder).toMatchObject({order: {status: "pending"}});
    const before = await ports.repository.readBalance(owner.actor);
    const beforeSpends = await spendsForOwner(owner.userId);
    heldComboChildren.add("ZIWEI-YEAR-P0");
    try {
      expect(await ports.service.createPurchaseIntent(owner.actor, input)).toEqual({ok: false, code: "WALLET_INTENT_INVALID"});
      expect(await ports.service.readQuotes(owner.actor, {chartId: owner.chartId, chartVersionId: owner.chartVersionId, locale: "vi", targetYear: 2026}))
        .toMatchObject({ok: true, value: {quotes: expect.arrayContaining([expect.objectContaining({sku: "ZIWEI-COMBO-P0", state: "unavailable", priceLa: null})])}});
      expect(await database.select().from(walletPurchaseIntents).where(and(eq(walletPurchaseIntents.ownerId, owner.userId), eq(walletPurchaseIntents.sku, "ZIWEI-COMBO-P0"))))
        .toEqual([original]);
      expect(await ports.repository.readBalance(owner.actor)).toEqual(before);
      expect(await spendsForOwner(owner.userId)).toEqual(beforeSpends);
      expect(await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, owner.chartVersionId))).toHaveLength(0);
      if (order?.ok) {
        expect(await commerce.readTopUpOrderProjection(owner.actor, order.value.id)).toEqual(originalOrder);
        expect(await database.select().from(commerceOrders).where(eq(commerceOrders.id, order.value.id))).toEqual(originalStoredOrder);
        expect(await database.select().from(walletTopUpContinuations).where(eq(walletTopUpContinuations.orderId, order.value.id))).toEqual(originalContinuation);
      }
    } finally { heldComboChildren.clear(); }
    expect(await ports.service.createPurchaseIntent(owner.actor, input)).toMatchObject({ok: true, reused: false, value: {amountLa: 1300}});
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
