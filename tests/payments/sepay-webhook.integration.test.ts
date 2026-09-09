import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { randomUUID } from "node:crypto";
import { eq } from "../../packages/backend/node_modules/drizzle-orm/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  auditLogs,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  commercePaymentEvents,
  commerceUnmatchedPayments,
  createDatabase,
  evidenceSets,
  enqueueOutbox,
  outbox,
  reportQueueJobs,
  reportReservations,
  runMigrations,
  ziweiChartVersions,
  ziweiCharts,
} from "../../packages/database/src/index.js";
import {
  createDatabaseCommerceRepository,
  createDatabaseOutboxStore,
  createDatabaseReportQueuePublisher,
  createOutboxDispatcher,
  createSePayWebhookService,
  generatePaymentCode,
  isValidPaymentCode,
} from "../../packages/backend/src/index.js";
import { createHmac } from "node:crypto";

describe("SePay payment transaction", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function createChartFixture(database: ReturnType<typeof createDatabase>, overrides: {
    userId?: string;
    emailVerified?: boolean;
  } = {}) {
    const userId = overrides.userId ?? ("user-" + randomUUID());
    const profileId = "profile-" + randomUUID();
    const revisionId = "revision-" + randomUUID();
    const runId = randomUUID();
    const chartId = "chart-" + randomUUID();
    const versionId = "version-" + randomUUID();
    const evidenceId = "evidence-" + randomUUID();
    await database.insert(authUsers).values({
      id: userId,
      name: "Fixture user",
      email: userId + "@example.test",
      emailVerified: overrides.emailVerified ?? true,
    }).onConflictDoNothing();
    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({
      id: revisionId, profileId, revisionNumber: 1, originalInput: {}, normalizedInput: {}, consentVersion: "test",
    });
    await database.insert(calculationRuns).values({
      id: runId, profileId, profileRevisionId: revisionId, idempotencyKey: "run-" + runId,
      engineId: "test", engineVersion: "1", adapterId: "test", adapterVersion: "1", schemaId: "test",
      ruleSetId: "test", inputHash: "test", configHash: "test", rawSnapshotHash: "test",
    });
    await database.insert(ziweiCharts).values({ id: chartId, profileId, profileRevisionId: revisionId });
    await database.insert(ziweiChartVersions).values({
      id: versionId, chartId, calculationRunId: runId, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(evidenceSets).values({
      id: evidenceId,
      chartVersionId: versionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });
    const actor = {
      kind: "account" as const,
      userId,
      sessionId: "session-" + randomUUID(),
      requestId: "request-" + randomUUID(),
    };
    return { userId, actor, chartId, versionId, evidenceId };
  }

  it("commits one paid order, entitlement, reservation, and outbox event for replayed delivery", async () => {
    const database = createDatabase(databaseUrl);
    const userId = `user-${randomUUID()}`;
    const profileId = `profile-${randomUUID()}`;
    const revisionId = `revision-${randomUUID()}`;
    const runId = randomUUID();
    const chartId = `chart-${randomUUID()}`;
    const versionId = `version-${randomUUID()}`;
    const orderId = randomUUID();
    await database.insert(authUsers).values({
      id: userId,
      name: "Payment test",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({
      id: revisionId, profileId, revisionNumber: 1, originalInput: {}, normalizedInput: {}, consentVersion: "test",
    });
    await database.insert(calculationRuns).values({
      id: runId, profileId, profileRevisionId: revisionId, idempotencyKey: `run-${runId}`,
      engineId: "test", engineVersion: "1", adapterId: "test", adapterVersion: "1", schemaId: "test",
      ruleSetId: "test", inputHash: "test", configHash: "test", rawSnapshotHash: "test",
    });
    await database.insert(ziweiCharts).values({ id: chartId, profileId, profileRevisionId: revisionId });
    await database.insert(ziweiChartVersions).values({
      id: versionId, chartId, calculationRunId: runId, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(evidenceSets).values({
      id: `evidence-${randomUUID()}`,
      chartVersionId: versionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });
    await database.insert(commerceOrders).values({
      id: orderId, invoiceNumber: "LSV-integration-order", chartId, chartVersionId: versionId,
      ownerId: userId, sku: "ZIWEI-IDENTITY-P0", amount: 79_000, currency: "VND", locale: "en",
    });
    const repository = createDatabaseCommerceRepository(database);
    const actor = {
      kind: "account" as const,
      userId,
      sessionId: "payment-session",
      requestId: "payment-request",
    };
    await expect(repository.createOrder(
      actor,
      chartId,
      "ZIWEI-IDENTITY-P0",
      "vi",
    )).resolves.toMatchObject({
      ok: true,
      reused: true,
      value: { id: orderId, locale: "en" },
    });
    await expect(repository.readOrder(actor, orderId)).resolves.toMatchObject({
      id: orderId,
      locale: "en",
    });
    await expect(repository.readOrderProjection(actor, orderId)).resolves.toMatchObject({
      order: {
        id: orderId,
        locale: "en",
      },
      reportId: null,
    });
    await expect(repository.recordPaid({
      invoiceNumber: "LSV-integration-order",
      providerEventId: "sandbox-event-wrong-amount",
      amount: 1,
      currency: "VND",
      traceId: "integration-trace",
    })).resolves.toMatchObject({ ok: false, code: "PAYMENT_AMOUNT_MISMATCH" });
    await expect(repository.recordPaid({
      invoiceNumber: "LSV-unknown-order",
      providerEventId: "sandbox-event-unknown-order",
      amount: 79_000,
      currency: "VND",
      traceId: "integration-trace",
    })).resolves.toMatchObject({ ok: false, code: "ORDER_NOT_FOUND" });
    const replay = {
      invoiceNumber: "LSV-integration-order",
      providerEventId: "sandbox-event-1",
      amount: 79_000,
      currency: "VND",
      traceId: "integration-trace",
    };
    const results = await Promise.all([repository.recordPaid(replay), repository.recordPaid(replay)]);
    expect(results).toContainEqual({ ok: true, replayed: false });
    expect(results).toContainEqual({ ok: true, replayed: true });
    await expect(repository.recordPaid({
      ...replay,
      providerEventId: "sandbox-event-out-of-order",
    })).resolves.toMatchObject({ ok: false, code: "PAYMENT_STATE_CONFLICT" });
    expect((await database.select().from(commerceEntitlements)).filter((entitlement) => entitlement.orderId === orderId)).toHaveLength(1);
    expect(await database.select().from(reportReservations)).toHaveLength(1);
    expect((await database.select().from(reportReservations))[0]).toMatchObject({ locale: "en" });
    expect((await database.select().from(outbox)).filter((event) => event.aggregateId === orderId)).toMatchObject([
      { payload: expect.objectContaining({ locale: "en" }) },
    ]);
    const [reservationRecord] = await database.select().from(reportReservations);
    await expect(repository.readOrder(actor, orderId)).resolves.toMatchObject({
      id: orderId,
      status: "paid",
      locale: "en",
    });
    await expect(repository.readOrderProjection(actor, orderId)).resolves.toMatchObject({
      order: {
        id: orderId,
        status: "paid",
        locale: "en",
      },
      reportId: reservationRecord.reportId,
    });
    const crossOwnerActor = {
      kind: "account" as const,
      userId: "cross-" + randomUUID(),
      sessionId: "cross-session",
      requestId: "cross-request",
    };
    await database.insert(authUsers).values({
      id: crossOwnerActor.userId,
      name: "Cross owner",
      email: crossOwnerActor.userId + "@example.test",
      emailVerified: true,
    });
    await expect(repository.readOrder(crossOwnerActor, orderId)).resolves.toBeNull();
    await expect(repository.readOrderProjection(crossOwnerActor, orderId)).resolves.toBeNull();
    await database.$client.end();
  }, 120_000);

  it("rolls back the paid CAS and every downstream record when the transaction cannot commit", async () => {
    const database = createDatabase(databaseUrl);
    const userId = `rollback-user-${randomUUID()}`;
    const profileId = `rollback-profile-${randomUUID()}`;
    const revisionId = `rollback-revision-${randomUUID()}`;
    const runId = randomUUID();
    const chartId = `rollback-chart-${randomUUID()}`;
    const versionId = `rollback-version-${randomUUID()}`;
    const orderId = randomUUID();
    await database.insert(authUsers).values({ id: userId, name: "Rollback", email: `${userId}@example.test` });
    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({ id: revisionId, profileId, revisionNumber: 1, originalInput: {}, normalizedInput: {}, consentVersion: "test" });
    await database.insert(calculationRuns).values({
      id: runId, profileId, profileRevisionId: revisionId, idempotencyKey: `run-${runId}`,
      engineId: "test", engineVersion: "1", adapterId: "test", adapterVersion: "1", schemaId: "test",
      ruleSetId: "test", inputHash: "test", configHash: "test", rawSnapshotHash: "test",
    });
    await database.insert(ziweiCharts).values({ id: chartId, profileId, profileRevisionId: revisionId });
    await database.insert(ziweiChartVersions).values({ id: versionId, chartId, calculationRunId: runId, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {} });
    await database.insert(evidenceSets).values({ id: `rollback-evidence-${randomUUID()}`, chartVersionId: versionId, capabilityId: "ziwei.identity.p0", ruleVersion: "test" });
    await database.insert(commerceOrders).values({
      id: orderId, invoiceNumber: `LSV-rollback-${orderId}`, chartId, chartVersionId: versionId,
      ownerId: userId, sku: "ZIWEI-IDENTITY-P0", amount: 79_000, currency: "VND", locale: "vi",
    });
    const repository = createDatabaseCommerceRepository(database, {
      beforePaymentCommit: async () => {
        throw new Error("FORCED_PAYMENT_ROLLBACK");
      },
    });

    await expect(repository.recordPaid({
      invoiceNumber: `LSV-rollback-${orderId}`,
      providerEventId: `rollback-event-${orderId}`,
      amount: 79_000,
      currency: "VND",
      traceId: "rollback-trace",
    })).rejects.toThrow("FORCED_PAYMENT_ROLLBACK");
    expect((await database.select().from(commerceOrders)).find((order) => order.id === orderId))
      .toMatchObject({ status: "pending" });
    expect((await database.select().from(commercePaymentEvents)).filter((event) => event.orderId === orderId)).toEqual([]);
    expect((await database.select().from(commerceEntitlements)).filter((entitlement) => entitlement.orderId === orderId)).toEqual([]);
    expect((await database.select().from(reportReservations)).filter((reservation) => reservation.chartVersionId === versionId)).toEqual([]);
    await database.$client.end();
  }, 120_000);

  it("rejects a provider event reused for another order and terminal order states", async () => {
    const database = createDatabase(databaseUrl);
    const firstOrderId = randomUUID();
    const secondOrderId = randomUUID();
    await database.insert(commerceOrders).values([
      {
        id: firstOrderId, invoiceNumber: `LSV-event-first-${firstOrderId}`, chartId: `chart-${firstOrderId}`,
        chartVersionId: `version-${firstOrderId}`, ownerId: "account-event", sku: "ZIWEI-IDENTITY-P0",
        amount: 79_000, currency: "VND", locale: "vi", status: "refunded",
      },
      {
        id: secondOrderId, invoiceNumber: `LSV-event-second-${secondOrderId}`, chartId: `chart-${secondOrderId}`,
        chartVersionId: `version-${secondOrderId}`, ownerId: "account-event", sku: "ZIWEI-IDENTITY-P0",
        amount: 79_000, currency: "VND", locale: "en", status: "failed",
      },
    ]);
    const repository = createDatabaseCommerceRepository(database);
    const eventId = `conflict-event-${randomUUID()}`;

    await expect(repository.recordPaid({
      invoiceNumber: `LSV-event-first-${firstOrderId}`,
      providerEventId: eventId,
      amount: 79_000,
      currency: "VND",
      traceId: "event-trace",
    })).resolves.toMatchObject({ ok: false, code: "PAYMENT_STATE_CONFLICT" });
    await database.insert(commercePaymentEvents).values({
      orderId: firstOrderId,
      providerEventId: eventId,
      amount: 79_000,
      currency: "VND",
      status: "ORDER_PAID",
    });
    await expect(repository.recordPaid({
      invoiceNumber: `LSV-event-second-${secondOrderId}`,
      providerEventId: eventId,
      amount: 79_000,
      currency: "VND",
      traceId: "event-trace",
    })).resolves.toMatchObject({ ok: false, code: "PAYMENT_EVENT_CONFLICT" });
    await expect(repository.recordPaid({
      invoiceNumber: `LSV-event-second-${secondOrderId}`,
      providerEventId: `failed-event-${randomUUID()}`,
      amount: 79_000,
      currency: "VND",
      traceId: "event-trace",
    })).resolves.toMatchObject({ ok: false, code: "PAYMENT_STATE_CONFLICT" });
    await database.$client.end();
  }, 120_000);

  it("dispatches a report event after an earlier unsupported outbox event", async () => {
    const database = createDatabase(databaseUrl);
    await database.delete(reportQueueJobs);
    await database.delete(outbox);
    const now = new Date("2026-09-03T00:00:00Z");
    await enqueueOutbox(database, {
      schemaVersion: 1,
      type: "anonymous.purge.requested.v1",
      eventId: `anonymous-${randomUUID()}`,
      occurredAt: now.toISOString(),
      traceId: "anonymous-trace",
      actorId: null,
      aggregateType: "account",
      aggregateId: "anonymous-1",
      idempotencyKey: `anonymous-purge-${randomUUID()}`,
      payload: {},
    });
    const reportEvent = await enqueueOutbox(database, {
      schemaVersion: 1,
      type: "report.generation.requested.v1",
      eventId: `report-${randomUUID()}`,
      occurredAt: now.toISOString(),
      traceId: "report-trace",
      actorId: "account-1",
      aggregateType: "order",
      aggregateId: "order-1",
      idempotencyKey: `report-request-${randomUUID()}`,
      payload: {
        reportId: randomUUID(),
        reportVersionId: randomUUID(),
        entitlementId: randomUUID(),
        chartVersionId: "chart-version",
        evidenceVersionId: "evidence",
        knowledgeVersionId: "knowledge",
        promptVersion: "prompt",
        reportConfigVersion: "config",
        locale: "en",
        sku: "ZIWEI-IDENTITY-P0",
      },
    });
    const dispatcher = createOutboxDispatcher({
      ...createDatabaseOutboxStore(
        database,
        "outbox-test",
        () => new Date(reportEvent.availableAt.getTime() + 1),
      ),
      ...createDatabaseReportQueuePublisher(database),
    });

    await expect(dispatcher.dispatchOne()).resolves.toEqual({ dispatched: true });
    expect(
      await database
        .select({ sourceEventId: reportQueueJobs.sourceEventId })
        .from(reportQueueJobs),
    ).toEqual([{ sourceEventId: reportEvent.eventId }]);
    const persistedOutboxEvents = await database.select().from(outbox);
    expect(
      persistedOutboxEvents.find((event) => event.id === reportEvent.id),
    ).toMatchObject({ status: "processed" });
    expect(persistedOutboxEvents.find(
      (event) => event.eventType === "anonymous.purge.requested.v1",
    )).toMatchObject({ status: "pending" });
    await database.$client.end();
  }, 120_000);

  it("does not create commerce rows for anonymous or unverified checkout actors", async () => {
    const database = createDatabase(databaseUrl);
    const repository = createDatabaseCommerceRepository(database);
    const anonymous = {
      kind: "anonymous" as const,
      anonymousActorId: `anonymous-${randomUUID()}`,
      sessionId: "anonymous-session",
      requestId: "anonymous-request",
      expiresAt: "2026-09-04T00:00:00+00:00",
    };
    const unverifiedId = `unverified-${randomUUID()}`;
    await database.insert(authUsers).values({
      id: unverifiedId,
      name: "Unverified checkout",
      email: `${unverifiedId}@example.test`,
      emailVerified: false,
    });

    await expect(repository.createOrder(
      anonymous,
      "not-looked-up",
      "ZIWEI-IDENTITY-P0",
      "vi",
    )).resolves.toMatchObject({
      ok: false,
      code: "CHECKOUT_ACCOUNT_REQUIRED",
    });
    await expect(repository.createOrder(
      {
        kind: "account",
        userId: unverifiedId,
        sessionId: "unverified-session",
        requestId: "unverified-request",
      },
      "not-looked-up",
      "ZIWEI-IDENTITY-P0",
      "en",
    )).resolves.toMatchObject({
      ok: false,
      code: "CHECKOUT_EMAIL_VERIFICATION_REQUIRED",
    });
    expect((await database.select().from(commerceOrders)).filter(
      (order) => order.ownerId === anonymous.anonymousActorId || order.ownerId === unverifiedId,
    )).toEqual([]);
    await database.$client.end();
  }, 120_000);
  it("keeps pending orders pending at 14:59 and transitions them to expired at 15:00", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const t0 = new Date("2026-09-05T10:00:00.000Z");
    const initialRepo = createDatabaseCommerceRepository(database, {
      now: () => t0,
      orderTtlSeconds: 900,
    });
    const createResult = await initialRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) throw new Error("ORDER_CREATE_FAILED");
    const orderId = createResult.value.id;

    // pending at 14:59 remains pending
    const t1459 = new Date("2026-09-05T10:14:59.000Z");
    const repo1459 = createDatabaseCommerceRepository(database, {
      now: () => t1459,
      orderTtlSeconds: 900,
    });
    await expect(repo1459.readOrder(actor, orderId)).resolves.toMatchObject({
      id: orderId,
      status: "pending",
    });
    await expect(repo1459.readOrderProjection(actor, orderId)).resolves.toMatchObject({
      order: { id: orderId, status: "pending" },
      reportId: null,
    });
    const orderAt1459 = (await database.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(orderAt1459?.status).toBe("pending");

    // pending at 15:00 atomically becomes expired
    const t1500 = new Date("2026-09-05T10:15:00.000Z");
    const repo1500 = createDatabaseCommerceRepository(database, {
      now: () => t1500,
      orderTtlSeconds: 900,
    });
    await expect(repo1500.readOrder(actor, orderId)).resolves.toMatchObject({
      id: orderId,
      status: "expired",
    });
    await expect(repo1500.readOrderProjection(actor, orderId)).resolves.toMatchObject({
      order: { id: orderId, status: "expired" },
      reportId: null,
    });
    const orderAt1500 = (await database.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(orderAt1500?.status).toBe("expired");

    await database.$client.end();
  }, 120_000);

  it("accepts late payment matching invoice, amount, and currency after order expiry when no entitlement exists", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const t0 = new Date("2026-09-05T10:00:00.000Z");
    const initialRepo = createDatabaseCommerceRepository(database, {
      now: () => t0,
      orderTtlSeconds: 900,
    });
    const createResult = await initialRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "en");
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) throw new Error("ORDER_CREATE_FAILED");
    const order = createResult.value;

    const tLate = new Date(t0.getTime() + 900 * 1000);
    const repoLate = createDatabaseCommerceRepository(database, {
      now: () => tLate,
      orderTtlSeconds: 900,
    });
    const latePaidResult = await repoLate.recordPaid({
      invoiceNumber: order.invoiceNumber,
      providerEventId: "late-event-" + randomUUID(),
      amount: order.amount,
      currency: order.currency,
      traceId: "late-trace",
    });
    expect(latePaidResult).toMatchObject({
      ok: true,
      replayed: false,
    });

    // Fulfills the original order and creates entitlement, reservation, outbox
    expect(
      (await database.select().from(commercePaymentEvents)).filter((event) => event.orderId === order.id),
    ).toHaveLength(1);
    expect(
      (await database.select().from(commerceEntitlements)).filter((entitlement) => entitlement.orderId === order.id),
    ).toHaveLength(1);
    expect(
      (await database.select().from(reportReservations)).filter((reservation) => reservation.chartVersionId === versionId),
    ).toHaveLength(1);
    expect(
      (await database.select().from(outbox)).filter((event) => event.aggregateId === order.id),
    ).toHaveLength(1);

    const persistedOrder = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(persistedOrder?.status).toBe("paid");
    expect(persistedOrder?.paidAt).not.toBeNull();

    await database.$client.end();
  }, 120_000);

  it("accepts late payment on original invoice after order expiry and reopen, cancels replacement pending order, and creates one entitlement", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const t0 = new Date("2026-09-05T10:00:00.000Z");
    const initialRepo = createDatabaseCommerceRepository(database, {
      now: () => t0,
      orderTtlSeconds: 900,
    });
    const createResult = await initialRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) throw new Error("ORDER_CREATE_FAILED");
    const originalOrderId = createResult.value.id;
    const originalInvoice = createResult.value.invoiceNumber;

    const tReopen = new Date("2026-09-05T10:20:00.000Z");
    const reopenRepo = createDatabaseCommerceRepository(database, {
      now: () => tReopen,
      orderTtlSeconds: 900,
    });
    const reopenResult = await reopenRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "en");
    expect(reopenResult.ok).toBe(true);
    if (!reopenResult.ok) throw new Error("REOPEN_FAILED");
    const replacementOrderId = reopenResult.value.id;
    const replacementInvoice = reopenResult.value.invoiceNumber;

    // Requirement 1: invoice_number is immutable, reopen inserts new row with new invoice
    expect(replacementOrderId).not.toBe(originalOrderId);
    expect(replacementInvoice).not.toBe(originalInvoice);

    // Old order row remains preserved with status='expired' and original invoice
    const oldOrderBeforePayment = (await database.select().from(commerceOrders)).find((o) => o.id === originalOrderId);
    expect(oldOrderBeforePayment?.status).toBe("expired");
    expect(oldOrderBeforePayment?.invoiceNumber).toBe(originalInvoice);

    // Deliver late payment event on the original invoice
    const delayedPaidResult = await reopenRepo.recordPaid({
      invoiceNumber: originalInvoice,
      providerEventId: "delayed-event-" + randomUUID(),
      amount: createResult.value.amount,
      currency: createResult.value.currency,
      traceId: "delayed-trace",
    });
    expect(delayedPaidResult).toMatchObject({ ok: true, replayed: false });

    // Requirement 4: Old row is paid, replacement pending row is cancelled/expired, exactly one entitlement
    const originalOrderAfter = (await database.select().from(commerceOrders)).find((o) => o.id === originalOrderId);
    expect(originalOrderAfter?.status).toBe("paid");
    expect(originalOrderAfter?.invoiceNumber).toBe(originalInvoice);
    expect(originalOrderAfter?.paidAt).not.toBeNull();

    const replacementOrderAfter = (await database.select().from(commerceOrders)).find((o) => o.id === replacementOrderId);
    expect(replacementOrderAfter?.status).toBe("expired");
    expect(replacementOrderAfter?.invoiceNumber).toBe(replacementInvoice);
    expect(replacementOrderAfter?.paidAt).toBeNull();

    // Exactly one payment event, one entitlement, one reservation, and one outbox event (for original order)
    expect((await database.select().from(commercePaymentEvents)).filter((e) => e.orderId === originalOrderId)).toHaveLength(1);
    expect((await database.select().from(commercePaymentEvents)).filter((e) => e.orderId === replacementOrderId)).toHaveLength(0);

    const entitlements = (await database.select().from(commerceEntitlements)).filter((e) => e.chartId === chartId);
    expect(entitlements).toHaveLength(1);
    expect(entitlements[0]?.orderId).toBe(originalOrderId);

    expect((await database.select().from(reportReservations)).filter((r) => r.chartVersionId === versionId)).toHaveLength(1);
    expect((await database.select().from(outbox)).filter((e) => e.aggregateId === originalOrderId)).toHaveLength(1);

    await database.$client.end();
  }, 120_000);

  it("reopens expired and failed orders by inserting a new row while preserving original row and invoice, and never reopens paid or refunded orders", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const orderId = randomUUID();
    const initialInvoiceNumber = "LSV-reopen-" + orderId;
    const t0 = new Date("2026-09-05T10:00:00.000Z");

    // 1. Expired order is reopened: inserts new row with new invoice
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: initialInvoiceNumber,
      chartId,
      chartVersionId: versionId,
      ownerId: actor.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "expired",
      createdAt: t0,
    });

    const tReopenExpired = new Date("2026-09-05T10:20:00.000Z");
    const repoReopenExpired = createDatabaseCommerceRepository(database, {
      now: () => tReopenExpired,
      orderTtlSeconds: 900,
    });
    const reopenExpiredResult = await repoReopenExpired.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "en");
    expect(reopenExpiredResult).toMatchObject({
      ok: true,
      reused: false,
      value: {
        status: "pending",
        paidAt: null,
      },
    });
    if (!reopenExpiredResult.ok) throw new Error("REOPEN_EXPIRED_FAILED");
    expect(reopenExpiredResult.value.id).not.toBe(orderId);
    expect(reopenExpiredResult.value.invoiceNumber).not.toBe(initialInvoiceNumber);
    expect(reopenExpiredResult.value.invoiceNumber).toMatch(/^LSV-[0-9a-f-]{36}$/);

    // Old order row preserved
    const originalExpiredOrder = (await database.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(originalExpiredOrder?.status).toBe("expired");
    expect(originalExpiredOrder?.invoiceNumber).toBe(initialInvoiceNumber);

    // New order row exists
    const newPendingOrder = (await database.select().from(commerceOrders)).find((o) => o.id === reopenExpiredResult.value.id);
    expect(newPendingOrder?.status).toBe("pending");
    expect(newPendingOrder?.invoiceNumber).toBe(reopenExpiredResult.value.invoiceNumber);

    // 2. Failed order is reopened: inserts new row with new invoice
    const failedOrderId = randomUUID();
    const failedInvoiceNumber = "LSV-failed-" + failedOrderId;
    // Expire the pending one first so we can test failed reopen cleanly
    await database.update(commerceOrders).set({ status: "expired" }).where(eq(commerceOrders.id, reopenExpiredResult.value.id));
    await database.insert(commerceOrders).values({
      id: failedOrderId,
      invoiceNumber: failedInvoiceNumber,
      chartId,
      chartVersionId: versionId,
      ownerId: actor.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "failed",
      createdAt: t0,
    });

    const tReopenFailed = new Date("2026-09-05T10:30:00.000Z");
    const repoReopenFailed = createDatabaseCommerceRepository(database, {
      now: () => tReopenFailed,
      orderTtlSeconds: 900,
    });
    const reopenFailedResult = await repoReopenFailed.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(reopenFailedResult).toMatchObject({
      ok: true,
      reused: false,
      value: {
        status: "pending",
        paidAt: null,
      },
    });
    if (!reopenFailedResult.ok) throw new Error("REOPEN_FAILED_FAILED");
    expect(reopenFailedResult.value.id).not.toBe(failedOrderId);
    expect(reopenFailedResult.value.invoiceNumber).not.toBe(failedInvoiceNumber);

    // Original failed row preserved
    const originalFailedOrder = (await database.select().from(commerceOrders)).find((o) => o.id === failedOrderId);
    expect(originalFailedOrder?.status).toBe("failed");
    expect(originalFailedOrder?.invoiceNumber).toBe(failedInvoiceNumber);

    // 3. Paid order is never reopened
    const tPaid = new Date("2026-09-05T10:35:00.000Z");
    await database.update(commerceOrders).set({ status: "paid", paidAt: tPaid }).where(eq(commerceOrders.id, reopenFailedResult.value.id));
    const repoPaid = createDatabaseCommerceRepository(database, { now: () => new Date("2026-09-05T10:40:00.000Z"), orderTtlSeconds: 900 });
    const paidResult = await repoPaid.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(paidResult).toMatchObject({ ok: true, reused: true, value: { id: reopenFailedResult.value.id, status: "paid" } });

    // 4. Refunded order is never reopened
    const { actor: refundActor, chartId: refundChartId } = await createChartFixture(database);
    const repoRefunded = createDatabaseCommerceRepository(database, { now: () => new Date("2026-09-05T10:45:00.000Z"), orderTtlSeconds: 900 });
    const refundOrder2Id = randomUUID();
    await database.insert(commerceOrders).values({
      id: refundOrder2Id,
      invoiceNumber: "LSV-refund-" + refundOrder2Id,
      chartId: refundChartId,
      chartVersionId: versionId,
      ownerId: refundActor.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "refunded",
      createdAt: t0,
    });
    const refundedResult = await repoRefunded.createOrder(refundActor, refundChartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(refundedResult).toMatchObject({ ok: true, reused: true, value: { id: refundOrder2Id, status: "refunded" } });

    await database.$client.end();
  }, 120_000);

  it("ensures concurrent payments for old and replacement orders result in exactly one entitlement", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const t0 = new Date("2026-09-05T10:00:00.000Z");
    const initialRepo = createDatabaseCommerceRepository(database, {
      now: () => t0,
      orderTtlSeconds: 900,
    });
    const order1Result = await initialRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(order1Result.ok).toBe(true);
    if (!order1Result.ok) throw new Error("ORDER1_FAILED");
    const order1 = order1Result.value;

    const tReopen = new Date("2026-09-05T10:20:00.000Z");
    const reopenRepo = createDatabaseCommerceRepository(database, {
      now: () => tReopen,
      orderTtlSeconds: 900,
    });
    const order2Result = await reopenRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "en");
    expect(order2Result.ok).toBe(true);
    if (!order2Result.ok) throw new Error("ORDER2_FAILED");
    const order2 = order2Result.value;

    const results = await Promise.all([
      reopenRepo.recordPaid({
        invoiceNumber: order1.invoiceNumber,
        providerEventId: "concurrent-event-" + randomUUID(),
        amount: order1.amount,
        currency: order1.currency,
        traceId: "concurrent-trace-1",
      }),
      reopenRepo.recordPaid({
        invoiceNumber: order2.invoiceNumber,
        providerEventId: "concurrent-event-" + randomUUID(),
        amount: order2.amount,
        currency: order2.currency,
        traceId: "concurrent-trace-2",
      }),
    ]);

    const successes = results.filter((r) => r.ok && !r.replayed);
    const conflicts = results.filter((r) => !r.ok && r.code === "PAYMENT_STATE_CONFLICT");
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);

    const entitlements = (await database.select().from(commerceEntitlements)).filter((e) => e.chartId === chartId);
    expect(entitlements).toHaveLength(1);

    const reservations = (await database.select().from(reportReservations)).filter((r) => r.chartVersionId === versionId);
    expect(reservations).toHaveLength(1);

    await database.$client.end();
  }, 120_000);

  it("applies default 86400s (24h) TTL when orderTtlSeconds is omitted", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const t0 = new Date("2026-09-05T10:00:00.000Z");
    const repoDefault = createDatabaseCommerceRepository(database, {
      now: () => t0,
    });
    const createResult = await repoDefault.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) throw new Error("ORDER_CREATE_FAILED");
    const orderId = createResult.value.id;

    // At t0 + 900s: order is STILL pending (not expired!)
    const repo900s = createDatabaseCommerceRepository(database, {
      now: () => new Date(t0.getTime() + 900 * 1000),
    });
    const orderAt900s = await repo900s.readOrder(actor, orderId);
    expect(orderAt900s?.status).toBe("pending");

    // At t0 + 86399s: order is STILL pending
    const repo86399s = createDatabaseCommerceRepository(database, {
      now: () => new Date(t0.getTime() + 86399 * 1000),
    });
    const orderAt86399s = await repo86399s.readOrder(actor, orderId);
    expect(orderAt86399s?.status).toBe("pending");

    // At t0 + 86400s: order transitions to expired
    const repo86400s = createDatabaseCommerceRepository(database, {
      now: () => new Date(t0.getTime() + 86400 * 1000),
    });
    const orderAt86400s = await repo86400s.readOrder(actor, orderId);
    expect(orderAt86400s?.status).toBe("expired");

    await database.$client.end();
  }, 120_000);

  it("proves partial unique index allows multiple expired orders and strictly one pending order", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);

    const id1 = randomUUID();
    const id2 = randomUUID();
    await database.insert(commerceOrders).values([
      {
        id: id1,
        invoiceNumber: "LSV-multi-1-" + id1,
        chartId,
        chartVersionId: versionId,
        ownerId: actor.userId,
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79_000,
        currency: "VND",
        locale: "vi",
        status: "expired",
      },
      {
        id: id2,
        invoiceNumber: "LSV-multi-2-" + id2,
        chartId,
        chartVersionId: versionId,
        ownerId: actor.userId,
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79_000,
        currency: "VND",
        locale: "vi",
        status: "expired",
      },
    ]);

    const id3 = randomUUID();
    await database.insert(commerceOrders).values({
      id: id3,
      invoiceNumber: "LSV-multi-3-" + id3,
      chartId,
      chartVersionId: versionId,
      ownerId: actor.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "pending",
    });

    const id4 = randomUUID();
    await expect(
      database.insert(commerceOrders).values({
        id: id4,
        invoiceNumber: "LSV-multi-4-" + id4,
        chartId,
        chartVersionId: versionId,
        ownerId: actor.userId,
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79_000,
        currency: "VND",
        locale: "vi",
        status: "pending",
      }),
    ).rejects.toThrow();

    await database.$client.end();
  }, 120_000);

  it("atomically aborts reopen without corrupting paid state when racing recordPaid", async () => {
    const db1 = createDatabase(databaseUrl);
    const db2 = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(db1);
    const t0 = new Date("2026-09-05T10:00:00.000Z");
    const initialRepo = createDatabaseCommerceRepository(db1, {
      now: () => t0,
      orderTtlSeconds: 900,
    });
    const createResult = await initialRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) throw new Error("ORDER_CREATE_FAILED");
    const order = createResult.value;

    let reopenPromise: Promise<unknown> | undefined;

    // db1 starts recordPaid within valid TTL (t0 + 800s)
    const payingRepo = createDatabaseCommerceRepository(db1, {
      now: () => new Date(t0.getTime() + 800 * 1000),
      orderTtlSeconds: 900,
      beforePaymentCommit: async () => {
        // Inside transaction: paid CAS succeeded, side effects written, row is locked.
        // Race a concurrent reopen attempt from db2 with clock past expiry.
        reopenPromise = (async () => {
          const reopeningRepo = createDatabaseCommerceRepository(db2, {
            now: () => new Date(t0.getTime() + 960 * 1000),
            orderTtlSeconds: 900,
          });
          return reopeningRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "en");
        })();
        // Yield to allow reopen query to execute and encounter row lock / evaluated WHERE clause
        await new Promise((resolve) => setTimeout(resolve, 150));
      },
    });

    const paidResult = await payingRepo.recordPaid({
      invoiceNumber: order.invoiceNumber,
      providerEventId: "race-event-" + randomUUID(),
      amount: order.amount,
      currency: order.currency,
      traceId: "race-trace",
    });
    expect(paidResult).toMatchObject({ ok: true, replayed: false });

    const reopenResult = await reopenPromise;
    expect(reopenResult).toMatchObject({
      ok: true,
      reused: true,
      value: {
        id: order.id,
        status: "paid",
      },
    });

    // Verify row in database: still paid, paidAt preserved, entitlement and outbox intact
    const finalOrder = (await db1.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(finalOrder?.status).toBe("paid");
    expect(finalOrder?.paidAt).not.toBeNull();
    expect((await db1.select().from(commerceEntitlements)).filter((e) => e.orderId === order.id)).toHaveLength(1);
    expect((await db1.select().from(reportReservations)).filter((r) => r.chartVersionId === versionId)).toHaveLength(1);

    await db1.$client.end();
    await db2.$client.end();
  }, 120_000);

  it("atomically aborts reopen without corrupting terminal refunded state when racing refund update", async () => {
    const db1 = createDatabase(databaseUrl);
    const db2 = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(db1);
    const orderId = randomUUID();
    const invoiceNumber = "LSV-refund-race-" + orderId;
    const t0 = new Date("2026-09-05T10:00:00.000Z");

    await db1.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber,
      chartId,
      chartVersionId: versionId,
      ownerId: actor.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "expired",
      createdAt: t0,
    });

    let releaseTx: () => void;
    const holdTx = new Promise<void>((resolve) => { releaseTx = resolve; });

    // db1 starts a transaction that updates order to refunded and holds lock
    const refundTxPromise = db1.transaction(async (tx) => {
      await tx.update(commerceOrders).set({ status: "refunded" }).where(eq(commerceOrders.id, orderId));
      await holdTx;
    });

    // While db1 holds row lock, db2 attempts reopen
    const reopenPromise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const repo2 = createDatabaseCommerceRepository(db2, {
        now: () => new Date(t0.getTime() + 1000 * 1000),
        orderTtlSeconds: 900,
      });
      return repo2.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    })();

    // Allow db2 update to queue on the row lock, then release db1
    await new Promise((resolve) => setTimeout(resolve, 250));
    releaseTx!();
    await refundTxPromise;

    const reopenResult = await reopenPromise;
    expect(reopenResult).toMatchObject({
      ok: true,
      reused: true,
      value: {
        id: orderId,
        status: "refunded",
      },
    });

    const finalOrder = (await db1.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(finalOrder?.status).toBe("refunded");

    await db1.$client.end();
    await db2.$client.end();
  }, 120_000);
  it("enforces database-level immutability of commerce_orders.invoice_number", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const orderId = randomUUID();
    const originalInvoice = "LSV-immutable-" + orderId;

    // 1. INSERT succeeds
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: originalInvoice,
      chartId,
      chartVersionId: versionId,
      ownerId: actor.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "pending",
    });

    // 2. Unrelated UPDATE succeeds (e.g. status)
    await database.update(commerceOrders)
      .set({ status: "expired" })
      .where(eq(commerceOrders.id, orderId));

    const updated = (await database.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(updated?.status).toBe("expired");
    expect(updated?.invoiceNumber).toBe(originalInvoice);

    // 3. Direct invoice overwrite FAILS at database level with trigger exception
    let updateError: any;
    try {
      await database.update(commerceOrders)
        .set({ invoiceNumber: "LSV-overwritten-" + randomUUID() })
        .where(eq(commerceOrders.id, orderId));
    } catch (err) {
      updateError = err;
    }
    expect(updateError).toBeDefined();
    expect(String(updateError?.cause?.message ?? updateError?.cause ?? updateError?.message)).toMatch(
      /commerce_orders\.invoice_number is immutable/,
    );

    // Persisted invoice is unchanged
    const afterAttempt = (await database.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(afterAttempt?.invoiceNumber).toBe(originalInvoice);

    await database.$client.end();
  }, 120_000);

  it("interleaves old-invoice and replacement-order payments deterministically with exactly one entitlement and controlled conflict", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const t0 = new Date("2026-09-05T10:00:00.000Z");
    const initialRepo = createDatabaseCommerceRepository(database, {
      now: () => t0,
      orderTtlSeconds: 900,
    });
    const order1Result = await initialRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(order1Result.ok).toBe(true);
    if (!order1Result.ok) throw new Error("ORDER1_FAILED");
    const order1 = order1Result.value;

    const tReopen = new Date("2026-09-05T10:20:00.000Z");
    const reopenRepo = createDatabaseCommerceRepository(database, {
      now: () => tReopen,
      orderTtlSeconds: 900,
    });
    const order2Result = await reopenRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "en");
    expect(order2Result.ok).toBe(true);
    if (!order2Result.ok) throw new Error("ORDER2_FAILED");
    const order2 = order2Result.value;

    let releaseTx1: () => void;
    const holdTx1 = new Promise<void>((resolve) => { releaseTx1 = resolve; });

    const repoWithHook = createDatabaseCommerceRepository(database, {
      now: () => tReopen,
      orderTtlSeconds: 900,
      beforePaymentCommit: async () => {
        await holdTx1;
      },
    });

    // Start payment 1 (old invoice), which pauses right before commit inside transaction
    const payment1Promise = repoWithHook.recordPaid({
      invoiceNumber: order1.invoiceNumber,
      providerEventId: "interleave-event-1-" + randomUUID(),
      amount: order1.amount,
      currency: order1.currency,
      traceId: "interleave-trace-1",
    });

    // Let payment 1 acquire advisory lock and pause
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Start payment 2 (replacement invoice) concurrently
    const payment2Promise = reopenRepo.recordPaid({
      invoiceNumber: order2.invoiceNumber,
      providerEventId: "interleave-event-2-" + randomUUID(),
      amount: order2.amount,
      currency: order2.currency,
      traceId: "interleave-trace-2",
    });

    // Allow payment 2 to queue on the advisory lock, then release payment 1
    await new Promise((resolve) => setTimeout(resolve, 200));
    releaseTx1!();

    const [result1, result2] = await Promise.all([payment1Promise, payment2Promise]);

    // Payment 1 succeeded, Payment 2 cleanly conflicted
    expect(result1).toMatchObject({ ok: true, replayed: false });
    expect(result2).toMatchObject({ ok: false, code: "PAYMENT_STATE_CONFLICT" });

    // Exactly one paid order, exactly one expired order
    const persistedOrder1 = (await database.select().from(commerceOrders)).find((o) => o.id === order1.id);
    const persistedOrder2 = (await database.select().from(commerceOrders)).find((o) => o.id === order2.id);
    expect(persistedOrder1?.status).toBe("paid");
    expect(persistedOrder2?.status).toBe("expired");

    // Exactly one payment event, one entitlement, one reservation, and one outbox event
    const events = (await database.select().from(commercePaymentEvents)).filter((e) => e.orderId === order1.id || e.orderId === order2.id);
    expect(events).toHaveLength(1);

    const entitlements = (await database.select().from(commerceEntitlements)).filter((e) => e.chartId === chartId);
    expect(entitlements).toHaveLength(1);
    expect(entitlements[0]?.orderId).toBe(order1.id);

    const reservations = (await database.select().from(reportReservations)).filter((r) => r.chartVersionId === versionId);
    expect(reservations).toHaveLength(1);

    const outboxEvents = (await database.select().from(outbox)).filter((e) => e.aggregateId === order1.id || e.aggregateId === order2.id);
    expect(outboxEvents).toHaveLength(1);

    await database.$client.end();
  }, 120_000);

  it("ensures concurrent first-time createOrder calls serialize cleanly and return the same pending order", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);

    const repo = createDatabaseCommerceRepository(database, {
      now: () => new Date("2026-09-05T10:00:00.000Z"),
      orderTtlSeconds: 86400,
    });

    const results = await Promise.all([
      repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi"),
      repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi"),
      repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi"),
    ]);

    for (const res of results) {
      expect(res.ok).toBe(true);
    }

    const createdCount = results.filter((r) => r.ok && !r.reused).length;
    const reusedCount = results.filter((r) => r.ok && r.reused).length;
    expect(createdCount).toBe(1);
    expect(reusedCount).toBe(2);

    const firstOrderId = results[0]?.ok ? results[0].value.id : null;
    const firstInvoice = results[0]?.ok ? results[0].value.invoiceNumber : null;
    for (const res of results) {
      if (res.ok) {
        expect(res.value.id).toBe(firstOrderId);
        expect(res.value.invoiceNumber).toBe(firstInvoice);
        expect(res.value.status).toBe("pending");
      }
    }

    const ordersInDb = (await database.select().from(commerceOrders)).filter((o) => o.chartId === chartId);
    expect(ordersInDb).toHaveLength(1);

    await database.$client.end();
  }, 120_000);

  it("stores a valid unique payment code on new order creation and retains it on reuse", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const result = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("CREATE_ORDER_FAILED");

    const order = result.value;
    expect(order.paymentCode).toBeDefined();
    expect(isValidPaymentCode(order.paymentCode)).toBe(true);

    const orderInDb = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(orderInDb?.paymentCode).toBe(order.paymentCode);

    // Reuse pending order retains the exact same payment code
    const reusedResult = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(reusedResult.ok).toBe(true);
    if (!reusedResult.ok) throw new Error("REUSE_ORDER_FAILED");
    expect(reusedResult.reused).toBe(true);
    expect(reusedResult.value.paymentCode).toBe(order.paymentCode);

    await database.$client.end();
  }, 120_000);

  it("retries on payment code collision and exhausts after five collisions", async () => {
    const database = createDatabase(databaseUrl);
    const { actor: actor1, chartId: chartId1 } = await createChartFixture(database);
    const { actor: actor2, chartId: chartId2 } = await createChartFixture(database);

    const normalRepo = createDatabaseCommerceRepository(database);
    const firstOrder = await normalRepo.createOrder(actor1, chartId1, "ZIWEI-IDENTITY-P0", "vi");
    expect(firstOrder.ok).toBe(true);
    if (!firstOrder.ok) throw new Error("FIRST_ORDER_FAILED");
    const collisionCode = firstOrder.value.paymentCode;

    // Retry test: factory produces collisionCode once, then a fresh code
    let attempts = 0;
    const retryRepo = createDatabaseCommerceRepository(database, {
      paymentCodeFactory: () => {
        attempts++;
        return attempts === 1 ? collisionCode : generatePaymentCode();
      },
    });

    const retryResult = await retryRepo.createOrder(actor2, chartId2, "ZIWEI-IDENTITY-P0", "vi");
    expect(retryResult.ok).toBe(true);
    expect(attempts).toBe(2);
    if (!retryResult.ok) throw new Error("RETRY_ORDER_FAILED");
    expect(retryResult.value.paymentCode).not.toBe(collisionCode);

    // Exhaustion test: factory always produces an existing code
    const { actor: actor3, chartId: chartId3 } = await createChartFixture(database);
    const exhaustRepo = createDatabaseCommerceRepository(database, {
      paymentCodeFactory: () => collisionCode,
    });

    await expect(
      exhaustRepo.createOrder(actor3, chartId3, "ZIWEI-IDENTITY-P0", "vi"),
    ).rejects.toThrow(/PAYMENT_CODE_GENERATION_EXHAUSTED/);

    await database.$client.end();
  }, 120_000);

  it("scopes onConflictDoNothing specifically to payment_code so non-payment-code unique violations throw rather than suppressing", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);

    const initialId = randomUUID();
    const duplicateInvoice = "LSV-invoice-conflict-" + randomUUID();
    const initialCode = generatePaymentCode();

    await database.insert(commerceOrders).values({
      id: initialId,
      paymentCode: initialCode,
      invoiceNumber: duplicateInvoice,
      chartId,
      chartVersionId: versionId,
      ownerId: actor.userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "expired",
    });

    const newUniqueCode = generatePaymentCode();
    let insertError: any;
    try {
      await database
        .insert(commerceOrders)
        .values({
          id: randomUUID(),
          paymentCode: newUniqueCode,
          invoiceNumber: duplicateInvoice,
          chartId,
          chartVersionId: versionId,
          ownerId: actor.userId,
          sku: "ZIWEI-IDENTITY-P0",
          amount: 79_000,
          currency: "VND",
          locale: "vi",
          status: "pending",
        })
        .onConflictDoNothing({ target: commerceOrders.paymentCode })
        .returning();
    } catch (err) {
      insertError = err;
    }
    expect(insertError).toBeDefined();
    expect(String(insertError?.cause?.message ?? insertError?.cause ?? insertError?.message)).toMatch(
      /commerce_orders_invoice_unique/,
    );

    await database.$client.end();
  }, 120_000);

  it("records match_method = payment_code on payment code match and match_method = invoice_number on invoice match", async () => {
    const database = createDatabase(databaseUrl);
    const { actor: actorCode, chartId: chartIdCode } = await createChartFixture(database);
    const { actor: actorInvoice, chartId: chartIdInvoice } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    // 1. Payment code match
    const orderCodeResult = await repo.createOrder(actorCode, chartIdCode, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderCodeResult.ok).toBe(true);
    if (!orderCodeResult.ok) throw new Error("CREATE_ORDER_FAILED");
    const codeOrder = orderCodeResult.value;

    const eventIdCode = "event-code-" + randomUUID();
    const paidCodeResult = await repo.recordPaid({
      paymentCode: codeOrder.paymentCode,
      matchMethod: "payment_code",
      providerEventId: eventIdCode,
      amount: codeOrder.amount,
      currency: codeOrder.currency,
      traceId: "trace-code",
    });
    expect(paidCodeResult).toMatchObject({ ok: true, replayed: false });

    const codeEvent = (await database.select().from(commercePaymentEvents)).find((e) => e.providerEventId === eventIdCode);
    expect(codeEvent?.matchMethod).toBe("payment_code");

    // 2. Invoice number match
    const orderInvoiceResult = await repo.createOrder(actorInvoice, chartIdInvoice, "ZIWEI-IDENTITY-P0", "en");
    expect(orderInvoiceResult.ok).toBe(true);
    if (!orderInvoiceResult.ok) throw new Error("CREATE_ORDER_FAILED");
    const invoiceOrder = orderInvoiceResult.value;

    const eventIdInvoice = "event-invoice-" + randomUUID();
    const paidInvoiceResult = await repo.recordPaid({
      invoiceNumber: invoiceOrder.invoiceNumber,
      matchMethod: "invoice_number",
      providerEventId: eventIdInvoice,
      amount: invoiceOrder.amount,
      currency: invoiceOrder.currency,
      traceId: "trace-invoice",
    });
    expect(paidInvoiceResult).toMatchObject({ ok: true, replayed: false });

    const invoiceEvent = (await database.select().from(commercePaymentEvents)).find((e) => e.providerEventId === eventIdInvoice);
    expect(invoiceEvent?.matchMethod).toBe("invoice_number");

    await database.$client.end();
  }, 120_000);

  it("records unmatched payment idempotently on duplicate providerEventId", async () => {
    const database = createDatabase(databaseUrl);
    const repo = createDatabaseCommerceRepository(database);
    const providerEventId = "unmatched-event-" + randomUUID();

    const first = await repo.recordUnmatched({
      providerEventId,
      rawPayload: { note: "first attempt" },
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
    });
    expect(first).toEqual({ ok: true, replayed: false });

    const second = await repo.recordUnmatched({
      providerEventId,
      rawPayload: { note: "second attempt" },
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
    });
    expect(second).toEqual({ ok: true, replayed: true });

    const rows = (await database.select().from(commerceUnmatchedPayments)).filter((r) => r.providerEventId === providerEventId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reason).toBe("NO_VALID_PAYMENT_CODE");
    expect(rows[0]?.amount).toBe(79_000);

    await database.$client.end();
  }, 120_000);

  it("handles bank webhook with noisy content and corrupted content end-to-end", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const orderResult = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderResult.ok).toBe(true);
    if (!orderResult.ok) throw new Error("ORDER_CREATE_FAILED");
    const order = orderResult.value;

    const webhookSecret = "integration-webhook-secret";
    const webhookService = createSePayWebhookService({
      secretKey: "dummy",
      webhookSecret,
      recordPaid: (input) => repo.recordPaid(input),
      recordUnmatched: (input) => repo.recordUnmatched(input),
    });

    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    function sign(body: string) {
      const hmac = createHmac("sha256", webhookSecret);
      hmac.update(String(nowEpochSeconds) + "." + body);
      return "sha256=" + hmac.digest("hex");
    }

    // 1. Bank transfer with noisy content containing valid paymentCode -> paid
    const bankTransfer = {
      id: Math.floor(Math.random() * 1000000) + 1000,
      gateway: "Vietcombank",
      transactionDate: "2026-09-05 10:00:00",
      accountNumber: "123456789",
      subAccount: "",
      code: "",
      content: `CT DEN:987654 ${order.paymentCode} CHUYEN TIEN BAP`,
      transferType: "in",
      description: "CHUYEN TIEN",
      transferAmount: 79000,
      accumulated: 1000000,
      referenceCode: "FT24012345678",
    };
    const body1 = JSON.stringify(bankTransfer);
    const result1 = await webhookService.handle({
      rawBody: body1,
      signatureHeader: sign(body1),
      timestampHeader: String(nowEpochSeconds),
      traceId: "webhook-trace-1",
    });

    expect(result1).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });

    const orderAfter = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(orderAfter?.status).toBe("paid");

    const eventAfter = (await database.select().from(commercePaymentEvents)).find((e) => e.providerEventId === String(bankTransfer.id));
    expect(eventAfter?.matchMethod).toBe("payment_code");

    // 2. Bank transfer with corrupted content -> persists unmatched, returns acknowledged: true
    const corruptedTransfer = {
      id: Math.floor(Math.random() * 1000000) + 2000,
      gateway: "Vietcombank",
      transactionDate: "2026-09-05 10:05:00",
      accountNumber: "123456789",
      subAccount: "",
      code: "",
      content: "GIBBERISH WITHOUT PAYMENT CODE",
      transferType: "in",
      description: "UNKNOWN",
      transferAmount: 79000,
      accumulated: 1000000,
      referenceCode: "FT99999999999",
    };
    const body2 = JSON.stringify(corruptedTransfer);
    const result2 = await webhookService.handle({
      rawBody: body2,
      signatureHeader: sign(body2),
      timestampHeader: String(nowEpochSeconds),
      traceId: "webhook-trace-2",
    });

    expect(result2).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });

    const unmatchedRow = (await database.select().from(commerceUnmatchedPayments)).find((r) => r.providerEventId === String(corruptedTransfer.id));
    expect(unmatchedRow).toBeDefined();
    expect(unmatchedRow?.reason).toBe("NO_VALID_PAYMENT_CODE");
    expect(unmatchedRow?.amount).toBe(79000);

    await database.$client.end();
  }, 120_000);

  it("enforces cross-table provider_event_id idempotency across payment events and unmatched payments", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const orderResult = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderResult.ok).toBe(true);
    if (!orderResult.ok) throw new Error("CREATE_ORDER_FAILED");
    const order = orderResult.value;

    // Direction 1: Event already persisted unmatched must never later grant entitlement if replayed with valid code
    const eventIdUnmatchedFirst = "cross-idempotency-unmatched-" + randomUUID();
    const unmatchedResult = await repo.recordUnmatched({
      providerEventId: eventIdUnmatchedFirst,
      rawPayload: { note: "first arrived corrupted" },
      amount: order.amount,
      reason: "NO_VALID_PAYMENT_CODE",
    });
    expect(unmatchedResult).toEqual({ ok: true, replayed: false });

    // Now attempt recordPaid using the same providerEventId with a valid code
    const replayedPaidResult = await repo.recordPaid({
      paymentCode: order.paymentCode,
      matchMethod: "payment_code",
      providerEventId: eventIdUnmatchedFirst,
      amount: order.amount,
      currency: order.currency,
      traceId: "trace-replayed-unmatched",
    });
    expect(replayedPaidResult).toEqual({ ok: true, replayed: true });

    // Verify: order status remains pending, no entitlement granted, no reservation created
    const orderAfterReplay = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(orderAfterReplay?.status).toBe("pending");
    expect(orderAfterReplay?.paidAt).toBeNull();
    const entitlementsAfter = (await database.select().from(commerceEntitlements)).filter((e) => e.orderId === order.id);
    expect(entitlementsAfter).toHaveLength(0);
    const reservationsAfter = (await database.select().from(reportReservations)).filter((r) => r.chartVersionId === versionId);
    expect(reservationsAfter).toHaveLength(0);

    // Direction 2: Event already matched must not create an unmatched row
    const eventIdPaidFirst = "cross-idempotency-paid-" + randomUUID();
    const paidResult = await repo.recordPaid({
      paymentCode: order.paymentCode,
      matchMethod: "payment_code",
      providerEventId: eventIdPaidFirst,
      amount: order.amount,
      currency: order.currency,
      traceId: "trace-paid-first",
    });
    expect(paidResult).toMatchObject({ ok: true, replayed: false });

    // Order is now paid, entitlement granted
    const orderPaidInDb = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(orderPaidInDb?.status).toBe("paid");

    // Attempt to record unmatched with the same providerEventId
    const unmatchedReplayResult = await repo.recordUnmatched({
      providerEventId: eventIdPaidFirst,
      rawPayload: { note: "should not create unmatched row" },
      amount: order.amount,
      reason: "SOME_REASON",
    });
    expect(unmatchedReplayResult).toEqual({ ok: true, replayed: true });

    // Verify: commerce_unmatched_payments has NO row for eventIdPaidFirst
    const unmatchedRows = (await database.select().from(commerceUnmatchedPayments))
      .filter((r) => r.providerEventId === eventIdPaidFirst);
    expect(unmatchedRows).toHaveLength(0);

    await database.$client.end();
  }, 120_000);

  it("persists unmatched payment and acknowledges success when hosted ORDER_PAID IPN encounters non-ok recordPaid", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const orderResult = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderResult.ok).toBe(true);
    if (!orderResult.ok) throw new Error("CREATE_ORDER_FAILED");
    const order = orderResult.value;

    const webhookService = createSePayWebhookService({
      secretKey: "hosted-test-secret",
      recordPaid: (input) => repo.recordPaid(input),
      recordUnmatched: (input) => repo.recordUnmatched(input),
    });

    // 1. Hosted IPN with unknown invoice number
    const unknownEventId = "hosted-unknown-" + randomUUID();
    const unknownPayload = {
      notification_type: "ORDER_PAID",
      order: {
        order_invoice_number: "LSV-nonexistent-invoice",
        order_amount: "79000.00",
        order_currency: "VND",
        order_status: "CAPTURED",
      },
      transaction: {
        transaction_id: unknownEventId,
        transaction_amount: "79000.00",
        transaction_currency: "VND",
        transaction_status: "APPROVED",
        transaction_type: "PAYMENT",
      },
    };

    const unknownResult = await webhookService.handle({
      rawBody: JSON.stringify(unknownPayload),
      secretHeader: "hosted-test-secret",
      traceId: "trace-hosted-unknown",
    });
    expect(unknownResult).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });

    const unmatchedUnknown = (await database.select().from(commerceUnmatchedPayments))
      .find((r) => r.providerEventId === unknownEventId);
    expect(unmatchedUnknown).toBeDefined();
    expect(unmatchedUnknown?.reason).toBe("ORDER_NOT_FOUND");
    expect(unmatchedUnknown?.amount).toBe(79000);

    // 2. Hosted IPN with amount mismatch against real order
    const mismatchEventId = "hosted-mismatch-" + randomUUID();
    const mismatchPayload = {
      notification_type: "ORDER_PAID",
      order: {
        order_invoice_number: order.invoiceNumber,
        order_amount: "50000.00",
        order_currency: "VND",
        order_status: "CAPTURED",
      },
      transaction: {
        transaction_id: mismatchEventId,
        transaction_amount: "50000.00",
        transaction_currency: "VND",
        transaction_status: "APPROVED",
        transaction_type: "PAYMENT",
      },
    };

    const mismatchResult = await webhookService.handle({
      rawBody: JSON.stringify(mismatchPayload),
      secretHeader: "hosted-test-secret",
      traceId: "trace-hosted-mismatch",
    });
    expect(mismatchResult).toEqual({ ok: true, value: { acknowledged: true, replayed: false } });

    const unmatchedMismatch = (await database.select().from(commerceUnmatchedPayments))
      .find((r) => r.providerEventId === mismatchEventId);
    expect(unmatchedMismatch).toBeDefined();
    expect(unmatchedMismatch?.reason).toBe("PAYMENT_AMOUNT_MISMATCH");
    expect(unmatchedMismatch?.amount).toBe(50000);

    // Real order remains pending
    const orderCheck = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(orderCheck?.status).toBe("pending");

    await database.$client.end();
  }, 120_000);


  it("succeeds at exact inclusive -15m and +15m boundaries, granting entitlement and marking payment claimed", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    // Declared local minute: 2026-09-05 10:30 (+07:00) -> 03:30 UTC
    const transferredAtLocal = "2026-09-05T10:30";

    // 1. Boundary at exact -15m: 03:15:00.000Z
    const order1Res = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(order1Res.ok).toBe(true);
    if (!order1Res.ok) throw new Error("ORDER1_FAILED");
    const order1 = order1Res.value;

    const paymentIdMinus15 = "payment-minus-15-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: paymentIdMinus15,
      rawPayload: { note: "minus 15m" },
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-05T03:15:00.000Z"),
    });

    const claim1Res = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(claim1Res).toEqual({
      ok: true,
      value: {
        status: "claimed",
        orderId: order1.id,
        reportId: expect.any(String),
      },
    });

    const payment1Db = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === paymentIdMinus15);
    expect(payment1Db?.claimedAt).not.toBeNull();
    expect(payment1Db?.claimedByOrderId).toBe(order1.id);

    const order1Db = (await database.select().from(commerceOrders)).find((o) => o.id === order1.id);
    expect(order1Db?.status).toBe("paid");

    const event1Db = (await database.select().from(commercePaymentEvents)).find((e) => e.providerEventId === paymentIdMinus15);
    expect(event1Db?.matchMethod).toBe("self_claim");

    // 2. Boundary at exact +15m: 03:45:00.000Z
    const { actor: actor2, chartId: chartId2 } = await createChartFixture(database);
    const order2Res = await repo.createOrder(actor2, chartId2, "ZIWEI-IDENTITY-P0", "vi");
    expect(order2Res.ok).toBe(true);
    if (!order2Res.ok) throw new Error("ORDER2_FAILED");
    const order2 = order2Res.value;

    const paymentIdPlus15 = "payment-plus-15-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: paymentIdPlus15,
      rawPayload: { note: "plus 15m" },
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-05T03:45:00.000Z"),
    });

    const claim2Res = await repo.claimUnmatchedPayment(actor2, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(claim2Res).toEqual({
      ok: true,
      value: {
        status: "claimed",
        orderId: order2.id,
        reportId: expect.any(String),
      },
    });

    const payment2Db = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === paymentIdPlus15);
    expect(payment2Db?.claimedAt).not.toBeNull();
    expect(payment2Db?.claimedByOrderId).toBe(order2.id);

    await database.$client.end();
  }, 120_000);

  it("returns PAYMENT_CLAIM_NOT_FOUND when payment is 1 millisecond outside either boundary", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const orderRes = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderRes.ok).toBe(true);
    if (!orderRes.ok) throw new Error("ORDER_FAILED");
    const order = orderRes.value;

    // Declared: 2026-09-05 12:30 (+07:00) -> 05:30 UTC
    const transferredAtLocal = "2026-09-05T12:30";

    // Case A: 1ms before -15m (05:14:59.999Z)
    const earlyId = "early-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: earlyId,
      rawPayload: {},
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-05T05:14:59.999Z"),
    });

    const earlyClaim = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(earlyClaim).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    // Case B: 1ms after +15m (05:45:00.001Z)
    const lateId = "late-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: lateId,
      rawPayload: {},
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-05T05:45:00.001Z"),
    });

    const lateClaim = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(lateClaim).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    // Order remains pending, payments remain unclaimed
    const orderDb = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(orderDb?.status).toBe("pending");

    const earlyDb = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === earlyId);
    expect(earlyDb?.claimedAt).toBeNull();
    const lateDb = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === lateId);
    expect(lateDb?.claimedAt).toBeNull();

    await database.$client.end();
  }, 120_000);

  it("returns generic PAYMENT_CLAIM_NOT_FOUND when two eligible payments match", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const orderRes = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderRes.ok).toBe(true);
    if (!orderRes.ok) throw new Error("ORDER_FAILED");

    const transferredAtLocal = "2026-09-05T14:30";

    const id1 = "dup-payment-1-" + randomUUID();
    const id2 = "dup-payment-2-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values([
      {
        providerEventId: id1,
        rawPayload: {},
        amount: 79_000,
        reason: "NO_VALID_PAYMENT_CODE",
        receivedAt: new Date("2026-09-05T07:20:00.000Z"),
      },
      {
        providerEventId: id2,
        rawPayload: {},
        amount: 79_000,
        reason: "NO_VALID_PAYMENT_CODE",
        receivedAt: new Date("2026-09-05T07:25:00.000Z"),
      },
    ]);

    const claimRes = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(claimRes).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    const p1 = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === id1);
    const p2 = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === id2);
    expect(p1?.claimedAt).toBeNull();
    expect(p2?.claimedAt).toBeNull();

    await database.$client.end();
  }, 120_000);

  it("returns generic PAYMENT_CLAIM_NOT_FOUND when two eligible owner orders match", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId: chartId1, versionId: versionId1 } = await createChartFixture(database);
    const { chartId: chartId2, versionId: versionId2 } = await createChartFixture(database, { userId: actor.userId });
    const repo = createDatabaseCommerceRepository(database);

    // Create 2 pending orders for the same user with amount 79,000
    const o1 = await repo.createOrder(actor, chartId1, "ZIWEI-IDENTITY-P0", "vi");
    const o2 = await repo.createOrder(actor, chartId2, "ZIWEI-IDENTITY-P0", "en");
    expect(o1.ok && o2.ok).toBe(true);

    const transferredAtLocal = "2026-09-05T16:30";
    const paymentId = "single-payment-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: paymentId,
      rawPayload: {},
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-05T09:30:00.000Z"),
    });

    const claimRes = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(claimRes).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    const paymentDb = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === paymentId);
    expect(paymentDb?.claimedAt).toBeNull();

    await database.$client.end();
  }, 120_000);

  it("shares the same PAYMENT_CLAIM_NOT_FOUND outcome for cross-owner, wrong amount, and already claimed payments without disclosing details", async () => {
    const database = createDatabase(databaseUrl);
    const { actor: ownerA, chartId } = await createChartFixture(database);
    const { actor: ownerB } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const orderRes = await repo.createOrder(ownerA, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderRes.ok).toBe(true);

    const transferredAtLocal = "2026-09-05T18:30";

    // 1. Wrong amount
    const wrongAmountRes = await repo.claimUnmatchedPayment(ownerA, {
      amount: 50_000, // No payment or order at 50k
      transferredAtLocal,
    });
    expect(wrongAmountRes).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    // 2. Cross-owner: Owner B tries to claim
    const crossOwnerRes = await repo.claimUnmatchedPayment(ownerB, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(crossOwnerRes).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    // 3. Already claimed payment
    const claimedPaymentId = "claimed-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: claimedPaymentId,
      rawPayload: {},
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-05T11:30:00.000Z"),
      claimedAt: new Date(),
    });

    const alreadyClaimedRes = await repo.claimUnmatchedPayment(ownerA, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(alreadyClaimedRes).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    await database.$client.end();
  }, 120_000);

  it("evaluates up to five attempts per Vietnam calendar day, rate-limits the sixth, and resets on the next local day", async () => {
    const database = createDatabase(databaseUrl);
    const { actor } = await createChartFixture(database);

    // Injected clock at 10:00 UTC on 2026-09-05 (17:00 Vietnam time on 2026-09-05)
    let currentClock = new Date("2026-09-05T10:00:00.000Z");
    const repo = createDatabaseCommerceRepository(database, {
      now: () => currentClock,
    });

    const transferredAtLocal = "2026-09-05T14:30";

    // Attempts 1 through 5 on this day evaluate and return NOT_FOUND
    for (let i = 1; i <= 5; i++) {
      const res = await repo.claimUnmatchedPayment(actor, {
        amount: 79_000,
        transferredAtLocal,
      });
      expect(res).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });
    }

    // 6th attempt on the same Vietnam calendar day is RATE_LIMITED
    const res6 = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(res6).toEqual({ ok: false, code: "PAYMENT_CLAIM_RATE_LIMITED" });

    // 7th attempt on the same day is also RATE_LIMITED
    const res7 = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(res7).toEqual({ ok: false, code: "PAYMENT_CLAIM_RATE_LIMITED" });

    // Advance clock to next Vietnam calendar day:
    // 18:00 UTC on 2026-09-05 is 01:00 on 2026-09-06 in Vietnam!
    currentClock = new Date("2026-09-05T18:00:00.000Z");

    // Allowance is reset for the new Vietnam calendar day!
    const nextDayRes = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal: "2026-09-06T01:00",
    });
    expect(nextDayRes).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    await database.$client.end();
  }, 120_000);

  it("prevents concurrent attempts from exceeding the daily limit and prevents claiming a payment twice", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const transferredAtLocal = "2026-09-05T22:30";

    // 1. Run 10 concurrent requests on empty match
    const concurrent10 = await Promise.all(
      Array.from({ length: 10 }, () =>
        repo.claimUnmatchedPayment(actor, {
          amount: 79_000,
          transferredAtLocal,
        }),
      ),
    );

    const notFounds = concurrent10.filter((r) => !r.ok && r.code === "PAYMENT_CLAIM_NOT_FOUND");
    const rateLimiteds = concurrent10.filter((r) => !r.ok && r.code === "PAYMENT_CLAIM_RATE_LIMITED");

    // Exactly 5 evaluated attempts, remaining 5 rate limited
    expect(notFounds).toHaveLength(5);
    expect(rateLimiteds).toHaveLength(5);

    // 2. Race two claims on the same single eligible payment with another user
    const { actor: actor2, chartId: chartId2 } = await createChartFixture(database);
    const orderRes = await repo.createOrder(actor2, chartId2, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderRes.ok).toBe(true);
    if (!orderRes.ok) throw new Error("ORDER_FAILED");

    const transferredAtLocalRace = "2026-09-06T10:30";
    const singlePaymentId = "race-payment-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: singlePaymentId,
      rawPayload: {},
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-06T03:30:00.000Z"),
    });

    const raceResults = await Promise.all([
      repo.claimUnmatchedPayment(actor2, { amount: 79_000, transferredAtLocal: transferredAtLocalRace }),
      repo.claimUnmatchedPayment(actor2, { amount: 79_000, transferredAtLocal: transferredAtLocalRace }),
    ]);

    const successes = raceResults.filter((r) => r.ok && r.value.status === "claimed");
    const failures = raceResults.filter((r) => !r.ok && r.code === "PAYMENT_CLAIM_NOT_FOUND");

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // Exactly one entitlement created
    const entitlements = (await database.select().from(commerceEntitlements)).filter((e) => e.chartId === chartId2);
    expect(entitlements).toHaveLength(1);

    await database.$client.end();
  }, 120_000);

  it("appends exactly one bounded audit row per evaluated attempt without leaking sensitive metadata", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId } = await createChartFixture(database);
    const repo = createDatabaseCommerceRepository(database);

    const orderRes = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderRes.ok).toBe(true);
    if (!orderRes.ok) throw new Error("ORDER_FAILED");
    const order = orderRes.value;

    const transferredAtLocal = "2026-09-06T14:30";

    // 1. Evaluated attempt that fails
    const failRes = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(failRes.ok).toBe(false);

    // 2. Evaluated attempt that succeeds
    const successPaymentId = "audit-payment-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: successPaymentId,
      rawPayload: { secretSender: "classified" },
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-06T07:30:00.000Z"),
    });

    const successRes = await repo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });
    expect(successRes.ok).toBe(true);

    const audits = (await database.select().from(auditLogs))
      .filter((a) => a.actorId === actor.userId && a.action === "commerce.payment_self_claim.requested");

    expect(audits).toHaveLength(2);

    // Failed audit row
    const failedAudit = audits.find((a) => a.targetId === "unresolved");
    expect(failedAudit).toBeDefined();
    expect(failedAudit?.reasonCode).toBe("PAYMENT_CLAIM_NOT_FOUND");
    expect(failedAudit?.targetType).toBe("commerce_payment_claim");
    expect(failedAudit?.requestId).toBe(actor.requestId);
    expect(failedAudit?.metadata).toEqual({
      outcome: "PAYMENT_CLAIM_NOT_FOUND",
      claimedAmount: 79_000,
    });

    // Success audit row
    const successAudit = audits.find((a) => a.targetId === order.id);
    expect(successAudit).toBeDefined();
    expect(successAudit?.reasonCode).toBe("claimed");
    expect(successAudit?.targetType).toBe("commerce_payment_claim");
    expect(successAudit?.requestId).toBe(actor.requestId);
    expect(successAudit?.metadata).toEqual({
      outcome: "claimed",
      claimedAmount: 79_000,
    });

    // Confirm neither audit row contains sensitive metadata
    for (const audit of audits) {
      const metaKeys = Object.keys(audit.metadata ?? {});
      expect(metaKeys.sort()).toEqual(["claimedAmount", "outcome"]);
    }

    await database.$client.end();
  }, 120_000);


  it("detects when a second matching payment arrives between initial selection and locked re-query, asserting generic NOT_FOUND and no claim", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);

    // Isolated time window: 2026-09-07 10:30 (UTC 03:30, window 03:15 to 03:45)
    const transferredAtLocal = "2026-09-07T10:30";

    const orderRes = await createDatabaseCommerceRepository(database).createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(orderRes.ok).toBe(true);
    if (!orderRes.ok) throw new Error("ORDER_FAILED");
    const order = orderRes.value;

    const initialPaymentId = "race-init-payment-" + randomUUID();
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: initialPaymentId,
      rawPayload: {},
      amount: 79_000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-07T03:30:00.000Z"),
    });

    const secondPaymentId = "race-second-payment-" + randomUUID();

    const racingRepo = createDatabaseCommerceRepository(database, {
      beforeClaimLockedRequery: async () => {
        await database.insert(commerceUnmatchedPayments).values({
          providerEventId: secondPaymentId,
          rawPayload: {},
          amount: 79_000,
          reason: "NO_VALID_PAYMENT_CODE",
          receivedAt: new Date("2026-09-07T03:35:00.000Z"),
        });
      },
    });

    const claimRes = await racingRepo.claimUnmatchedPayment(actor, {
      amount: 79_000,
      transferredAtLocal,
    });

    expect(claimRes).toEqual({ ok: false, code: "PAYMENT_CLAIM_NOT_FOUND" });

    const p1 = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === initialPaymentId);
    const p2 = (await database.select().from(commerceUnmatchedPayments)).find((p) => p.providerEventId === secondPaymentId);
    expect(p1?.claimedAt).toBeNull();
    expect(p2?.claimedAt).toBeNull();

    const orderDb = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(orderDb?.status).toBe("pending");

    const audits = (await database.select().from(auditLogs))
      .filter((a) => a.actorId === actor.userId && a.action === "commerce.payment_self_claim.requested");
    expect(audits).toHaveLength(1);
    expect(audits[0]?.targetId).toBe("unresolved");
    expect(audits[0]?.reasonCode).toBe("PAYMENT_CLAIM_NOT_FOUND");
    expect(audits[0]?.metadata).toEqual({
      outcome: "PAYMENT_CLAIM_NOT_FOUND",
      claimedAmount: 79_000,
    });

    await database.$client.end();
  }, 120_000);

});
