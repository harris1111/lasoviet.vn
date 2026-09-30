import { acknowledgeTopUpPresence, createDelayedUnlockCompletionService } from "../notifications/delayed-unlock-completion.js";
import { createAuthEmailDeliveryService, createDatabaseAuthEmailDeliveryStore } from "../notifications/auth-email.js";
import { CANONICAL_PALACE_TITLES_VI, CANONICAL_THEMATIC_TITLES_VI, REPORT_KNOWLEDGE_VERSION_V3, REPORT_PROMPT_VERSION_V3, REPORT_CONFIG_VERSION_V3, REPORT_TEMPLATE_VERSION_V3 } from "../reports/identity-report-config.js";
import { ZIWEI_PALACE_IDS, ZIWEI_THEMATIC_SYNTHESIS_IDS } from "@lasoviet/contracts";
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  authUsers,
  birthProfiles, birthProfileRevisions, calculationRuns, ziweiCharts, ziweiChartVersions, evidenceSets,
  walletPurchaseIntents, walletTopUpContinuations, commerceEntitlements, reportReservations, reportVersions,
  commerceOrders,
  commercePaymentEvents,
  commerceUnmatchedPayments,
  createDatabase,
  runMigrations,
  walletAccounts,
  walletCreditLots,
  walletTransactions,
  type Database,
} from "@lasoviet/database";
import type { CurrentActor } from "@lasoviet/contracts";

import { createDatabaseCommerceRepository } from "./commerce.repository.js";

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
const monthlyCatalogGate = vi.hoisted(() => ({ enabled: false }));
vi.mock("@lasoviet/contracts", async importOriginal => {
  const actual = await importOriginal<typeof import("@lasoviet/contracts")>();
  return { ...actual, findLaProduct: (sku: string) => {
    const product = actual.findLaProduct(sku);
    return monthlyCatalogGate.enabled && product && sku === "ZIWEI-MONTHLY-P0" ? { ...product, availability: "active" } : product;
  }};
});

describe("wallet top-up money path (FD-105 package 1.1)", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_wallet_topup_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function createAccount(options: { emailVerified?: boolean } = {}): Promise<Extract<CurrentActor, { kind: "account" }>> {
    const userId = `topup-${randomUUID()}`;
    await database.insert(authUsers).values({
      id: userId,
      name: "Top-up owner",
      email: `${userId}@example.test`,
      emailVerified: options.emailVerified ?? true,
    });
    return { kind: "account", userId, sessionId: `session-${userId}`, requestId: `request-${userId}` };
  }

  async function chartFixture(actor: Extract<CurrentActor, { kind: "account" }>) {
    const userId = actor.userId;
    const profileId = `profile-${randomUUID()}`;
    const revisionId = `revision-${randomUUID()}`;
    const chartId = `chart-${randomUUID()}`;
    const chartVersionId = `chart-version-${randomUUID()}`;
    const evidenceId = `evidence-${randomUUID()}`;
    const runId = randomUUID();

    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      originalInput: { version: 1, displayName: "Continuation owner" },
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
    return { userId, chartId, chartVersionId, evidenceId, actor };
  }

  async function walletOf(userId: string) {
    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, userId)).limit(1);
    return wallet;
  }

  function formatLocalMinute(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  }

  const frozenNow = new Date("2026-09-30T09:00:00.000Z");

  async function continuationFixture(sku = "ZIWEI-NATAL-EXCERPT-P0") {
    const actor = await createAccount();
    const chart = await chartFixture(actor);
    const repository = createDatabaseCommerceRepository(database, { now: () => frozenNow });
    const intent = await repository.createWalletPurchaseIntent(actor, { chartId: chart.chartId, chartVersionId: chart.chartVersionId, sku, locale: "vi" });
    if (!intent.ok) throw new Error(intent.code);
    const continuation = { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, confirmedPriceLa: intent.value.amountLa, returnTab: "palaces" as const, returnOpen: "life" };
    return { actor, chart, repository, intent: intent.value, continuation };
  }

  it("delays completion email until owned content is ready, deduplicates delivery, and rechecks presence/refunds", async () => {
    const actor = await createAccount();
    const outsider = await createAccount();
    const chart = await chartFixture(actor);
    const repository = createDatabaseCommerceRepository(database, { now: () => frozenNow, reportVersionResolver: () => ({ family: "v3", knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V3, promptVersion: REPORT_PROMPT_VERSION_V3, reportConfigVersion: REPORT_CONFIG_VERSION_V3, templateVersion: REPORT_TEMPLATE_VERSION_V3 }) });
    const intent = await repository.createWalletPurchaseIntent(actor, { chartId: chart.chartId, chartVersionId: chart.chartVersionId, sku: "ZIWEI-NATAL-EXCERPT-P0", locale: "vi" });
    if (!intent.ok) throw new Error(intent.code);
    const order = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, confirmedPriceLa: intent.value.amountLa, returnTab: "palaces", returnOpen: "life" });
    if (!order.ok) throw new Error(order.code);
    expect(await acknowledgeTopUpPresence(database, outsider, order.value.id, frozenNow)).toBe(false);
    expect(await acknowledgeTopUpPresence(database, actor, order.value.id, frozenNow)).toBe(true);
    expect(await repository.recordPaid({ invoiceNumber: order.value.invoiceNumber, providerEventId: randomUUID(), amount: 29000, currency: "VND", traceId: "notice" })).toMatchObject({ ok: true });
    let now = new Date(frozenNow.getTime() + 299_999);
    const notices = createDelayedUnlockCompletionService(database, { now: () => now });
    expect(await notices.requestFor(order.value.id)).toBeNull();
    now = new Date(frozenNow.getTime() + 300_000);
    expect(await notices.requestFor(order.value.id)).toBeNull();
    const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, chart.chartVersionId));
    const frozen = reservation!;
    await database.insert(reportVersions).values({ reportId: frozen.reportId, reportVersionId: frozen.reportVersionId, entitlementId: frozen.entitlementId, chartVersionId: frozen.chartVersionId, evidenceVersionId: frozen.evidenceVersionId, knowledgeVersionId: frozen.knowledgeVersionId, promptVersion: frozen.promptVersion, reportConfigVersion: frozen.reportConfigVersion, templateVersion: REPORT_TEMPLATE_VERSION_V3, locale: frozen.locale, sku: frozen.sku, providerId: "fixture", modelId: "fixture", structuredContent: validV3StructuredContent(), htmlContent: "<p>Ready fixture</p>", contentHash: "a".repeat(64), pdfAssetId: randomUUID(), renderVersion: "fixture" });
    await database.update(reportReservations).set({ status: "complete" }).where(eq(reportReservations.id, frozen.id));
    const request = await notices.requestFor(order.value.id);
    expect(request).toMatchObject({ userId: actor.userId, kind: "delayed_unlock_completed", itemName: "Bản mệnh và tiềm năng", actionUrl: `https://lasoviet.net/la-so/${chart.chartId}?tab=palaces&topupOrder=${order.value.id}&open=life` });
    if (!request) throw new Error("notice missing");
    expect(await notices.isEligible({ ...request, recipient: "attacker@example.test" })).toBe(false);
    expect(await notices.isEligible({ ...request, actionUrl: "https://evil.test" })).toBe(false);
    let sent = 0;
    const mail = createAuthEmailDeliveryService({ store: createDatabaseAuthEmailDeliveryStore(database), provider: { async send() { sent += 1; return { ok: true as const, providerMessageId: "notice-test" }; } }, recipientFingerprintSecret: "fixture", delayedUnlockEligibility: notices.isEligible, now: () => now });
    await Promise.all([mail.send(request), mail.send(request)]);
    expect(sent).toBe(1);
    expect(await acknowledgeTopUpPresence(database, actor, order.value.id, now)).toBe(true);
    expect(await notices.requestFor(order.value.id)).toBeNull();
    expect(await notices.isEligible(request)).toBe(false);
    await database.update(walletTopUpContinuations).set({ completionSeenAt: null, lastCustomerSeenAt: null }).where(eq(walletTopUpContinuations.orderId, order.value.id));
    await database.update(commerceEntitlements).set({ revokedAt: now }).where(eq(commerceEntitlements.id, frozen.entitlementId));
    expect(await notices.requestFor(order.value.id)).toBeNull();
    expect(await notices.isEligible(request)).toBe(false);
  });

  it("credits and completes the confirmed unlock atomically, then replays without a second debit", async () => {
    const fixture = await continuationFixture();
    const { actor, repository, continuation, chart } = fixture;
    const created = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", continuation);
    if (!created.ok) throw new Error(created.code);
    expect((await repository.readTopUpOrderProjection(actor, created.value.id))?.continuation?.status).toBe("pending");
    expect(await walletOf(actor.userId)).toBeUndefined();
    const payment = { invoiceNumber: created.value.invoiceNumber, providerEventId: `continued-${randomUUID()}`, amount: 29000, currency: "VND", traceId: "continuation" };
    const [first, replay] = await Promise.all([repository.recordPaid(payment), repository.recordPaid(payment)]);
    expect(first.ok && replay.ok).toBe(true);
    const projection = await repository.readTopUpOrderProjection(actor, created.value.id);
    expect(projection?.continuation).toMatchObject({ status: "completed", remainingLa: 60 });
    expect(projection?.continuation?.returnPath).toBe(`/la-so/${chart.chartId}?tab=palaces&topupOrder=${created.value.id}&open=life`);
    const wallet = await walletOf(actor.userId);
    expect(wallet?.purchasedBalance).toBe(60);
    expect(await database.select().from(walletTransactions).where(and(eq(walletTransactions.walletId, wallet!.id), eq(walletTransactions.kind, "spend")))).toHaveLength(1);
    expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, actor.userId))).toHaveLength(1);
    expect(await database.select().from(reportReservations).where(eq(reportReservations.chartVersionId, chart.chartVersionId))).toHaveLength(1);
  });

  it("credits two separately paid QR orders but completes their shared intent only once", async () => {
    const { actor, repository, continuation } = await continuationFixture();
    const small = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", continuation);
    const large = await repository.createTopUpOrder(actor, "LA-START-1100", "vi", continuation);
    if (!small.ok || !large.ok) throw new Error("order fixture failed");
    const results = await Promise.all([small.value, large.value].map((order) => repository.recordPaid({ invoiceNumber: order.invoiceNumber, providerEventId: `parallel-${randomUUID()}`, amount: order.amount, currency: "VND", traceId: "parallel" })));
    expect(results.every((result) => result.ok)).toBe(true);
    const statuses = await Promise.all([small.value, large.value].map(async (order) => (await repository.readTopUpOrderProjection(actor, order.id))?.continuation?.status));
    expect(statuses.sort()).toEqual(["blocked", "completed"]);
    const wallet = await walletOf(actor.userId);
    expect(wallet!.purchasedBalance + wallet!.promotionalBalance).toBe(1160);
    expect(await database.select().from(walletTransactions).where(and(eq(walletTransactions.walletId, wallet!.id), eq(walletTransactions.kind, "spend")))).toHaveLength(1);
    expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, actor.userId))).toHaveLength(1);
  });

  it.each(["cancelled", "insufficient", "price_changed", "stale_version"])("leaves top-up credit intact when continuation is %s", async (failure) => {
    const { actor, repository, continuation, intent } = await continuationFixture(["insufficient", "price_changed"].includes(failure) ? "ZIWEI-IDENTITY-P0" : undefined);
    const created = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", continuation);
    if (!created.ok) throw new Error(created.code);
    if (failure === "cancelled") await database.update(walletPurchaseIntents).set({ status: "cancelled", stateVersion: intent.stateVersion + 1 }).where(eq(walletPurchaseIntents.id, intent.id));
    if (failure === "price_changed") await database.update(walletPurchaseIntents).set({ priceLa: intent.amountLa - 1 }).where(eq(walletPurchaseIntents.id, intent.id));
    if (failure === "stale_version") await database.update(walletPurchaseIntents).set({ stateVersion: intent.stateVersion + 1 }).where(eq(walletPurchaseIntents.id, intent.id));
    expect(await repository.recordPaid({ invoiceNumber: created.value.invoiceNumber, providerEventId: `blocked-${randomUUID()}`, amount: 29000, currency: "VND", traceId: "blocked" })).toMatchObject({ ok: true });
    const projection = await repository.readTopUpOrderProjection(actor, created.value.id);
    expect(projection?.continuation?.status).toBe("blocked");
    const wallet = await walletOf(actor.userId);
    expect(wallet?.purchasedBalance).toBe(300);
    expect(await database.select().from(walletTransactions).where(and(eq(walletTransactions.walletId, wallet!.id), eq(walletTransactions.kind, "spend")))).toHaveLength(0);
  });

  it.each([false, true])("forwards the monthly resolver and preserves top-up credit across a changed lunar period (%s)", async (changedPeriod) => {
    monthlyCatalogGate.enabled = true;
    try {
      const actor = await createAccount();
      const chart = await chartFixture(actor);
      let currentPeriod = "2026-08-regular";
      const repository = createDatabaseCommerceRepository(database, { now: () => frozenNow, resolveMonthlyPeriodKey: () => currentPeriod });
      const intent = await repository.createWalletPurchaseIntent(actor, { chartId: chart.chartId, chartVersionId: chart.chartVersionId, sku: "ZIWEI-MONTHLY-P0", locale: "vi" });
      if (!intent.ok) throw new Error(intent.code);
      const continuation = { purchaseIntentId: intent.value.id, expectedIntentVersion: intent.value.stateVersion, confirmedPriceLa: intent.value.amountLa, returnTab: "palaces" as const };
      const created = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", continuation);
      if (!created.ok) throw new Error(created.code);
      if (changedPeriod) currentPeriod = "2026-09-regular";
      expect(await repository.recordPaid({ invoiceNumber: created.value.invoiceNumber, providerEventId: `monthly-${randomUUID()}`, amount: 29000, currency: "VND", traceId: "monthly-continuation" })).toMatchObject({ ok: true });
      expect((await repository.readTopUpOrderProjection(actor, created.value.id))?.continuation?.status).toBe(changedPeriod ? "blocked" : "completed");
      const wallet = await walletOf(actor.userId);
      expect(wallet?.purchasedBalance).toBe(changedPeriod ? 300 : 0);
      expect(await database.select().from(walletTransactions).where(and(eq(walletTransactions.walletId, wallet!.id), eq(walletTransactions.kind, "spend")))).toHaveLength(changedPeriod ? 0 : 1);
      const entitlements = await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, actor.userId));
      expect(entitlements).toHaveLength(changedPeriod ? 0 : 1);
      if (!changedPeriod) expect(entitlements[0]?.periodKey).toBe("2026-08-regular");
    } finally {
      monthlyCatalogGate.enabled = false;
    }
  });

  it("rolls back both top-up credit and continuation spend when settlement commit fails", async () => {
    const { actor, repository, continuation } = await continuationFixture();
    const created = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", continuation);
    if (!created.ok) throw new Error(created.code);
    const payment = { invoiceNumber: created.value.invoiceNumber, providerEventId: `atomic-${randomUUID()}`, amount: 29000, currency: "VND", traceId: "atomic" };
    const failing = createDatabaseCommerceRepository(database, {
      now: () => frozenNow,
      beforePaymentCommit: async () => { throw new Error("injected commit failure"); },
    });
    await expect(failing.recordPaid(payment)).rejects.toThrow("injected commit failure");
    expect(await walletOf(actor.userId)).toBeUndefined();
    expect((await repository.readTopUpOrderProjection(actor, created.value.id))?.continuation?.status).toBe("pending");
    expect(await database.select().from(commerceEntitlements).where(eq(commerceEntitlements.ownerId, actor.userId))).toHaveLength(0);
    expect(await repository.recordPaid(payment)).toMatchObject({ ok: true });
    expect((await walletOf(actor.userId))?.purchasedBalance).toBe(60);
    expect((await repository.readTopUpOrderProjection(actor, created.value.id))?.continuation?.status).toBe("completed");
  });

  it("rejects forged owner/price terms and never rebinds an existing QR order", async () => {
    const { actor, repository, continuation } = await continuationFixture();
    expect(await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", { ...continuation, confirmedPriceLa: 1 })).toEqual({ ok: false, code: "TOP_UP_CONTINUATION_INVALID" });
    const outsider = await createAccount();
    expect(await repository.createTopUpOrder(outsider, "LA-ENTRY-300", "vi", continuation)).toEqual({ ok: false, code: "TOP_UP_CONTINUATION_INVALID" });
    const plain = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi");
    const linked = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", continuation);
    const replay = await repository.createTopUpOrder(actor, "LA-ENTRY-300", "vi", continuation);
    if (!plain.ok || !linked.ok || !replay.ok) throw new Error("order fixture failed");
    expect(plain.value.id).not.toBe(linked.value.id);
    expect(replay.value.id).toBe(linked.value.id);
    await expect(database.update(walletTopUpContinuations).set({ confirmedPriceLa: 1 }).where(eq(walletTopUpContinuations.orderId, linked.value.id))).rejects.toThrow();
    expect(await repository.readTopUpOrderProjection(outsider, linked.value.id)).toBeNull();
  });

  it("creates a pending top-up order with the pack's VND amount and reuses it on refresh", async () => {
    const actor = await createAccount();
    const repo = createDatabaseCommerceRepository(database);

    const first = await repo.createTopUpOrder(actor, "LA-START-1100", "vi");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value).toMatchObject({
      kind: "wallet_topup", sku: "LA-START-1100", amount: 99000, currency: "VND", status: "pending", chartId: null,
    });

    const refreshed = await repo.createTopUpOrder(actor, "LA-START-1100", "vi");
    expect(refreshed.ok && refreshed.value.id).toBe(first.value.id);
    expect(refreshed.ok && refreshed.reused).toBe(true);
  });

  it("refuses unknown packs and unverified accounts", async () => {
    const repo = createDatabaseCommerceRepository(database);
    const actor = await createAccount();
    expect(await repo.createTopUpOrder(actor, "LA-FREE-99999", "vi")).toEqual({ ok: false, code: "TOP_UP_PACK_UNSUPPORTED" });
    const unverified = await createAccount({ emailVerified: false });
    const result = await repo.createTopUpOrder(unverified, "LA-ENTRY-300", "vi");
    expect(result.ok).toBe(false);
  });

  it("credits purchased and bonus Lá exactly once when SePay confirms the payment code, even on replay", async () => {
    const actor = await createAccount();
    const repo = createDatabaseCommerceRepository(database);
    const created = await repo.createTopUpOrder(actor, "LA-DISCOVER-3000", "vi");
    if (!created.ok) throw new Error("order not created");

    const payment = {
      paymentCode: created.value.paymentCode,
      matchMethod: "payment_code" as const,
      providerEventId: `sepay-${randomUUID()}`,
      amount: 249000,
      currency: "VND",
      traceId: "trace-topup",
    };
    expect(await repo.recordPaid(payment)).toEqual({ ok: true, replayed: false });
    expect(await repo.recordPaid(payment)).toEqual({ ok: true, replayed: true });

    const wallet = await walletOf(actor.userId);
    expect(wallet).toMatchObject({ purchasedBalance: 2500, promotionalBalance: 500 });
    const grants = await database.select().from(walletTransactions).where(eq(walletTransactions.topUpOrderId, created.value.id));
    expect(grants).toHaveLength(1);
    const lots = await database.select().from(walletCreditLots).where(eq(walletCreditLots.grantTransactionId, grants[0]!.id));
    expect(lots.map((lot) => [lot.bucket, lot.grantedLa]).sort()).toEqual([["promotional", 500], ["purchased", 2500]]);

    const [order] = await database.select().from(commerceOrders).where(eq(commerceOrders.id, created.value.id));
    expect(order?.status).toBe("paid");

    const projection = await repo.readTopUpOrderProjection(actor, created.value.id);
    expect(projection?.creditedLa).toBe(3000);

    // A second, different transfer against the same paid order is not credited again.
    const second = await repo.recordPaid({ ...payment, providerEventId: `sepay-${randomUUID()}` });
    expect(second).toEqual({ ok: false, code: "PAYMENT_STATE_CONFLICT" });
    expect(await walletOf(actor.userId)).toMatchObject({ purchasedBalance: 2500, promotionalBalance: 500 });
  });

  it("rejects a wrong amount without crediting", async () => {
    const actor = await createAccount();
    const repo = createDatabaseCommerceRepository(database);
    const created = await repo.createTopUpOrder(actor, "LA-ENTRY-300", "vi");
    if (!created.ok) throw new Error("order not created");
    const result = await repo.recordPaid({
      paymentCode: created.value.paymentCode,
      matchMethod: "payment_code",
      providerEventId: `sepay-${randomUUID()}`,
      amount: 20000,
      currency: "VND",
      traceId: "trace-topup",
    });
    expect(result).toEqual({ ok: false, code: "PAYMENT_AMOUNT_MISMATCH" });
    expect(await walletOf(actor.userId)).toBeUndefined();
  });

  it("accepts payment on an expired top-up order (R-PAY-4)", async () => {
    let now = new Date("2026-09-27T01:00:00.000Z");
    const actor = await createAccount();
    const repo = createDatabaseCommerceRepository(database, { now: () => now, orderTtlSeconds: 60 });
    const created = await repo.createTopUpOrder(actor, "LA-ENTRY-300", "vi");
    if (!created.ok) throw new Error("order not created");

    now = new Date("2026-09-27T02:00:00.000Z");
    const expired = await repo.readTopUpOrderProjection(actor, created.value.id);
    expect(expired?.order.status).toBe("expired");

    const result = await repo.recordPaid({
      paymentCode: created.value.paymentCode,
      matchMethod: "payment_code",
      providerEventId: `sepay-${randomUUID()}`,
      amount: 29000,
      currency: "VND",
      traceId: "trace-topup",
    });
    expect(result).toEqual({ ok: true, replayed: false });
    expect(await walletOf(actor.userId)).toMatchObject({ purchasedBalance: 300, promotionalBalance: 0 });
  });

  it("lets the customer self-claim an unmatched transfer for a top-up order", async () => {
    const now = new Date("2026-09-27T03:00:00.000Z");
    const actor = await createAccount();
    const repo = createDatabaseCommerceRepository(database, { now: () => now });
    const created = await repo.createTopUpOrder(actor, "LA-LIBRARY-8000", "vi");
    if (!created.ok) throw new Error("order not created");

    const providerEventId = `sepay-unmatched-${randomUUID()}`;
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId,
      rawPayload: { transferAmount: 599000, content: "chuyen khoan" },
      amount: 599000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: now,
    });

    const claim = await repo.claimUnmatchedPayment(actor, { amount: 599000, transferredAtLocal: formatLocalMinute(now) });
    expect(claim).toEqual({
      ok: true,
      value: { status: "claimed", kind: "wallet_topup", orderId: created.value.id, creditedLa: 8000 },
    });
    expect(await walletOf(actor.userId)).toMatchObject({ purchasedBalance: 6000, promotionalBalance: 2000 });
    const [event] = await database.select().from(commercePaymentEvents).where(eq(commercePaymentEvents.providerEventId, providerEventId));
    expect(event?.matchMethod).toBe("self_claim");

    // The same transfer cannot be claimed twice.
    const again = await repo.claimUnmatchedPayment(actor, { amount: 599000, transferredAtLocal: formatLocalMinute(now) });
    expect(again).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });
    expect(await walletOf(actor.userId)).toMatchObject({ purchasedBalance: 6000, promotionalBalance: 2000 });
  });


  it("settles top-up with exact 1100 Lá credit lot and idempotent replay via disabled-autopay providerEventId", async () => {
    const frozenNow = new Date("2026-09-29T04:00:00.000Z");
    const actor = await createAccount();
    const repo = createDatabaseCommerceRepository(database, { now: () => frozenNow });
    const created = await repo.createTopUpOrder(actor, "LA-START-1100", "vi");
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const payment = {
      invoiceNumber: created.value.invoiceNumber,
      matchMethod: "invoice_number" as const,
      providerEventId: `disabled-autopay:topup:${created.value.id}`,
      amount: created.value.amount,
      currency: created.value.currency,
      traceId: actor.requestId,
    };

    // First auto-settlement succeeds
    const first = await repo.recordPaid(payment);
    expect(first).toEqual({ ok: true, replayed: false });

    // Idempotent replay succeeds without duplicate balance
    const replay = await repo.recordPaid(payment);
    expect(replay).toEqual({ ok: true, replayed: true });

    // Verification of exact 1100 Lá credited (1000 purchased + 100 promotional)
    const wallet = await walletOf(actor.userId);
    expect(wallet).toMatchObject({ purchasedBalance: 1000, promotionalBalance: 100 });

    const grants = await database.select().from(walletTransactions).where(eq(walletTransactions.topUpOrderId, created.value.id));
    expect(grants).toHaveLength(1);

    const lots = await database.select().from(walletCreditLots).where(eq(walletCreditLots.grantTransactionId, grants[0]!.id));
    expect(lots.map((lot) => [lot.bucket, lot.grantedLa]).sort()).toEqual([["promotional", 100], ["purchased", 1000]]);

    const projection = await repo.readTopUpOrderProjection(actor, created.value.id);
    expect(projection).not.toBeNull();
    expect(projection?.order.status).toBe("paid");
    expect(projection?.creditedLa).toBe(1100);
  });

  it("refuses a self-claim when two eligible top-up orders share the amount", async () => {
    const now = new Date("2026-09-27T04:00:00.000Z");
    const actor = await createAccount();
    const repo = createDatabaseCommerceRepository(database, { now: () => now });
    const first = await repo.createTopUpOrder(actor, "LA-ENTRY-300", "vi");
    const second = await repo.createTopUpOrder(actor, "LA-ENTRY-300", "en");
    expect(first.ok && second.ok && first.value.id !== second.value.id).toBe(true);
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: `sepay-unmatched-${randomUUID()}`,
      rawPayload: {},
      amount: 29000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: now,
    });
    const claim = await repo.claimUnmatchedPayment(actor, { amount: 29000, transferredAtLocal: formatLocalMinute(now) });
    expect(claim).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });
    expect(await walletOf(actor.userId)).toBeUndefined();
  });
});
