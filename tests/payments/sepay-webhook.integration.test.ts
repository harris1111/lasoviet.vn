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
        amount: 79_000, currency: "VND", locale: "vi", status: "expired",
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

  it("rejects late payment after 15:00 with PAYMENT_STATE_CONFLICT and creates no side effects", async () => {
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
      ok: false,
      code: "PAYMENT_STATE_CONFLICT",
    });

    // No side effects created
    expect(
      (await database.select().from(commercePaymentEvents)).filter((event) => event.orderId === order.id),
    ).toEqual([]);
    expect(
      (await database.select().from(commerceEntitlements)).filter((entitlement) => entitlement.orderId === order.id),
    ).toEqual([]);
    expect(
      (await database.select().from(reportReservations)).filter((reservation) => reservation.chartVersionId === versionId),
    ).toEqual([]);
    expect(
      (await database.select().from(outbox)).filter((event) => event.aggregateId === order.id),
    ).toEqual([]);

    const persistedOrder = (await database.select().from(commerceOrders)).find((o) => o.id === order.id);
    expect(persistedOrder?.status).not.toBe("paid");

    await database.$client.end();
  }, 120_000);

  it("rejects delayed payment on original invoice after order expiry and reopen without mutating pending attempt", async () => {
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
    const orderId = createResult.value.id;
    const originalInvoice = createResult.value.invoiceNumber;

    const tReopen = new Date("2026-09-05T10:20:00.000Z");
    const reopenRepo = createDatabaseCommerceRepository(database, {
      now: () => tReopen,
      orderTtlSeconds: 900,
    });
    const reopenResult = await reopenRepo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "en");
    expect(reopenResult.ok).toBe(true);
    if (!reopenResult.ok) throw new Error("REOPEN_FAILED");
    expect(reopenResult.value.id).toBe(orderId);
    expect(reopenResult.value.invoiceNumber).not.toBe(originalInvoice);

    // Deliver delayed payment event using original invoice inside the reopened window
    const delayedPaidResult = await reopenRepo.recordPaid({
      invoiceNumber: originalInvoice,
      providerEventId: "delayed-event-" + randomUUID(),
      amount: createResult.value.amount,
      currency: createResult.value.currency,
      traceId: "delayed-trace",
    });
    expect(delayedPaidResult.ok).toBe(false);

    // Proves no payment event, entitlement, report reservation, or outbox event is created
    expect((await database.select().from(commercePaymentEvents)).filter((e) => e.orderId === orderId)).toEqual([]);
    expect((await database.select().from(commerceEntitlements)).filter((e) => e.orderId === orderId)).toEqual([]);
    expect((await database.select().from(reportReservations)).filter((r) => r.chartVersionId === versionId)).toEqual([]);
    expect((await database.select().from(outbox)).filter((e) => e.aggregateId === orderId)).toEqual([]);

    // Proves the reopened order remains pending with the new invoice
    const persisted = (await database.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(persisted?.status).toBe("pending");
    expect(persisted?.invoiceNumber).toBe(reopenResult.value.invoiceNumber);
    expect(persisted?.paidAt).toBeNull();

    await database.$client.end();
  }, 120_000);

  it("reopens expired and failed orders on createOrder but never reopens paid or refunded orders", async () => {
    const database = createDatabase(databaseUrl);
    const { actor, chartId, versionId } = await createChartFixture(database);
    const orderId = randomUUID();
    const initialInvoiceNumber = "LSV-reopen-" + orderId;
    const t0 = new Date("2026-09-05T10:00:00.000Z");

    // 1. Expired order is reopened
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
      reused: true,
      value: {
        id: orderId,
        status: "pending",
        paidAt: null,
      },
    });
    if (!reopenExpiredResult.ok) throw new Error("REOPEN_EXPIRED_FAILED");
    expect(reopenExpiredResult.value.invoiceNumber).not.toBe(initialInvoiceNumber);
    expect(reopenExpiredResult.value.invoiceNumber).toMatch(/^LSV-[0-9a-f-]{36}$/);

    const reopenedExpiredOrder = (await database.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(reopenedExpiredOrder?.status).toBe("pending");
    expect(reopenedExpiredOrder?.invoiceNumber).toBe(reopenExpiredResult.value.invoiceNumber);
    expect(reopenedExpiredOrder?.paidAt).toBeNull();
    expect(reopenedExpiredOrder?.createdAt.getTime()).toBe(tReopenExpired.getTime());

    // 2. Failed order is reopened
    await database.$client.unsafe("UPDATE commerce_orders SET status = \x27failed\x27 WHERE id = \x27" + orderId + "\x27");
    const tReopenFailed = new Date("2026-09-05T10:30:00.000Z");
    const repoReopenFailed = createDatabaseCommerceRepository(database, {
      now: () => tReopenFailed,
      orderTtlSeconds: 900,
    });
    const reopenFailedResult = await repoReopenFailed.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(reopenFailedResult).toMatchObject({
      ok: true,
      reused: true,
      value: {
        id: orderId,
        status: "pending",
        paidAt: null,
      },
    });
    if (!reopenFailedResult.ok) throw new Error("REOPEN_FAILED_FAILED");
    expect(reopenFailedResult.value.invoiceNumber).not.toBe(initialInvoiceNumber);
    expect(reopenFailedResult.value.invoiceNumber).not.toBe(reopenExpiredResult.value.invoiceNumber);
    expect(reopenFailedResult.value.invoiceNumber).toMatch(/^LSV-[0-9a-f-]{36}$/);

    const reopenedFailedOrder = (await database.select().from(commerceOrders)).find((o) => o.id === orderId);
    expect(reopenedFailedOrder?.status).toBe("pending");
    expect(reopenedFailedOrder?.invoiceNumber).toBe(reopenFailedResult.value.invoiceNumber);
    expect(reopenedFailedOrder?.createdAt.getTime()).toBe(tReopenFailed.getTime());

    // 3. Paid order is never reopened
    const tPaid = new Date("2026-09-05T10:35:00.000Z");
    await database.$client.unsafe("UPDATE commerce_orders SET status = \x27paid\x27, paid_at = \x27" + tPaid.toISOString() + "\x27 WHERE id = \x27" + orderId + "\x27");
    const repoPaid = createDatabaseCommerceRepository(database, { now: () => new Date("2026-09-05T10:40:00.000Z"), orderTtlSeconds: 900 });
    const paidResult = await repoPaid.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(paidResult).toMatchObject({ ok: true, reused: true, value: { id: orderId, status: "paid" } });

    // 4. Refunded order is never reopened
    await database.$client.unsafe("UPDATE commerce_orders SET status = \x27refunded\x27 WHERE id = \x27" + orderId + "\x27");
    const repoRefunded = createDatabaseCommerceRepository(database, { now: () => new Date("2026-09-05T10:45:00.000Z"), orderTtlSeconds: 900 });
    const refundedResult = await repoRefunded.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(refundedResult).toMatchObject({ ok: true, reused: true, value: { id: orderId, status: "refunded" } });

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
});
