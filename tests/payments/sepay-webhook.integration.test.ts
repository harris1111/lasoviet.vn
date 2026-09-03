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
  createDatabase,
  evidenceSets,
  outbox,
  reportReservations,
  runMigrations,
  ziweiChartVersions,
  ziweiCharts,
} from "../../packages/database/src/index.js";
import { createDatabaseCommerceRepository } from "../../packages/backend/src/commerce/commerce.repository.js";

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
    await database.insert(authUsers).values({ id: userId, name: "Payment test", email: `${userId}@example.test` });
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
      ownerId: userId, sku: "ZIWEI-IDENTITY-P0", amount: 79_000, currency: "VND",
    });
    const repository = createDatabaseCommerceRepository(database);
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
    expect((await database.select().from(outbox)).filter((event) => event.aggregateId === orderId)).toHaveLength(1);
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
