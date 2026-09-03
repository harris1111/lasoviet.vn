import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { randomUUID } from "node:crypto";
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
});
