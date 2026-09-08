import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { randomUUID } from "node:crypto";
import { eq } from "../../packages/backend/node_modules/drizzle-orm/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  commercePaymentEvents,
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
} from "../../packages/backend/src/index.js";

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
    });
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

});
