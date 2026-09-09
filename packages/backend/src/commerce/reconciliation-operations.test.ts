import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  adminCapabilityPolicies,
  adminRoleAssignments,
  auditLogs,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceOrders,
  commerceAlertDeliveries,
  commercePaymentEvents,
  commerceReconciliationState,
  commerceUnmatchedPayments,
  createDatabase,
  evidenceSets,
  runMigrations,
  type Database,
  ziweiChartVersions,
  ziweiCharts,
} from "@lasoviet/database";
import type { CurrentActor } from "@lasoviet/contracts";

import { createDatabaseCommerceRepository } from "./commerce.repository.js";
import { generatePaymentCode } from "./payment-code.js";
import { createReconciliationOperations } from "./reconciliation-operations.js";
import { createTelegramAlertProvider } from "./telegram-alert.js";
import { createAdminAccessService, createDatabaseAdminAccessRepository } from "../admin-access/capability.service.js";

describe("reconciliation operations and circuit breaker", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_reconciliation_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    database = createDatabase(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function createFixtureUser(options: { emailVerified?: boolean } = {}) {
    const userId = "user-" + randomUUID();
    const actor: CurrentActor = {
      kind: "account",
      userId,
      sessionId: "session-" + randomUUID(),
      requestId: "req-" + randomUUID(),
    };
    await database.insert(authUsers).values({
      id: userId,
      name: "Fixture User",
      email: userId + "@example.test",
      emailVerified: options.emailVerified ?? true,
    });
    return { userId, actor };
  }

  async function createChartFixture(userId: string) {
    const profileId = "prof-" + randomUUID();
    const revisionId = "rev-" + randomUUID();
    const runId = randomUUID();
    const chartId = "chart-" + randomUUID();
    const versionId = "ver-" + randomUUID();
    const evidenceId = "evi-" + randomUUID();

    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      originalInput: {},
      normalizedInput: {},
      consentVersion: "test",
    });
    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      profileRevisionId: revisionId,
      idempotencyKey: "run-" + runId,
      engineId: "test",
      engineVersion: "1",
      adapterId: "test",
      adapterVersion: "1",
      schemaId: "test",
      ruleSetId: "test",
      inputHash: "test",
      configHash: "test",
      rawSnapshotHash: "test",
    });
    await database.insert(ziweiCharts).values({ id: chartId, profileId, profileRevisionId: revisionId });
    await database.insert(ziweiChartVersions).values({
      id: versionId,
      chartId,
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });
    await database.insert(evidenceSets).values({
      id: evidenceId,
      chartVersionId: versionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    return { chartId, versionId };
  }

  async function createOrderFixture(userId: string, chartId: string, versionId: string) {
    const orderId = randomUUID();
    const [order] = await database
      .insert(commerceOrders)
      .values({
        id: orderId,
        paymentCode: generatePaymentCode(),
        invoiceNumber: "LSV-" + orderId,
        chartId,
        chartVersionId: versionId,
        ownerId: userId,
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        status: "pending",
      })
      .returning();
    return order;
  }

  it("rolling metric counts provider events once across payment events and unmatched rows, opening only at approved threshold", async () => {
    // Reset state to closed
    await database
      .insert(commerceReconciliationState)
      .values({ id: "singleton", circuitStatus: "closed", updatedAt: new Date() })
      .onConflictDoUpdate({
        target: commerceReconciliationState.id,
        set: { circuitStatus: "closed", openedAt: null, reasonCode: null, alertIdempotencyKey: null },
      });

    const now = new Date("2026-09-08T12:00:00.000Z");
    const { userId } = await createFixtureUser();
    const { chartId, versionId } = await createChartFixture(userId);
    const order = await createOrderFixture(userId, chartId, versionId);

    // Case 1: 19 auto-matches and 1 unmatched = 20 total, 19/20 = 95% -> DOES NOT open (< 0.95 required)
    const baseTime = new Date("2026-09-08T10:00:00.000Z");
    for (let i = 1; i <= 19; i++) {
      await database.insert(commercePaymentEvents).values({
        orderId: order.id,
        providerEventId: `sample-auto-${i}-${randomUUID()}`,
        amount: 79000,
        currency: "VND",
        status: "ORDER_PAID",
        matchMethod: "invoice_number",
        createdAt: baseTime,
      });
    }

    // 1 unmatched event in 24h window
    const unmatchId1 = `sample-unmatched-1-${randomUUID()}`;
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: unmatchId1,
      rawPayload: {},
      amount: 79000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: baseTime,
    });

    const ops = createReconciliationOperations({
      database,
      now: () => now,
    });

    const res1 = await ops.evaluateCircuitBreaker();
    expect(res1.circuitStatus).toBe("closed");
    expect(res1.transitioned).toBe(false);
    expect(res1.totalReceived).toBe(20);
    expect(res1.autoMatched).toBe(19);

    // Case 2: Add 1 more unmatched event -> 21 total, 19/21 = 90.4% (< 95%) -> OPENS!
    const unmatchId2 = `sample-unmatched-2-${randomUUID()}`;
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: unmatchId2,
      rawPayload: {},
      amount: 79000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: baseTime,
    });

    const res2 = await ops.evaluateCircuitBreaker();
    expect(res2.circuitStatus).toBe("open");
    expect(res2.transitioned).toBe(true);
    expect(res2.reasonCode).toBe("MATCH_RATE_LOW");
    expect(res2.totalReceived).toBe(21);
    expect(res2.autoMatched).toBe(19);

    // Case 3: Verify single event self-claimed is counted only ONCE
    // Reset back to closed
    await ops.resetCircuit({
      kind: "account",
      userId: "fake",
      sessionId: "s",
      requestId: "r",
    }); // will fail auth, update directly
    await database
      .update(commerceReconciliationState)
      .set({ circuitStatus: "closed", openedAt: null, reasonCode: null })
      .where(eq(commerceReconciliationState.id, "singleton"));

    // Self-claimed payment exists in unmatched AND payment events with matchMethod = "self_claim"
    const selfClaimProviderId = `self-claim-dedup-${randomUUID()}`;
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: selfClaimProviderId,
      rawPayload: {},
      amount: 79000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: baseTime,
      claimedAt: baseTime,
      claimedByOrderId: order.id,
    });
    await database.insert(commercePaymentEvents).values({
      orderId: order.id,
      providerEventId: selfClaimProviderId,
      amount: 79000,
      currency: "VND",
      status: "ORDER_PAID",
      matchMethod: "self_claim",
      createdAt: baseTime,
    });

    const dedupOps = createReconciliationOperations({
      database,
      now: () => now,
    });
    const dedupEval = await dedupOps.evaluateCircuitBreaker();
    // Previous 21 events + 1 dedup event = 22 total (NOT 23!)
    expect(dedupEval.totalReceived).toBe(22);
    expect(dedupEval.autoMatched).toBe(19); // self_claim is NOT auto-match
  });

  it("three unmatched payments older than six hours open the circuit; one at or below six hours does not", async () => {
    // Reset state to closed
    await database
      .update(commerceReconciliationState)
      .set({ circuitStatus: "closed", openedAt: null, reasonCode: null, alertIdempotencyKey: null })
      .where(eq(commerceReconciliationState.id, "singleton"));

    // Clean unmatched rows from previous test
    await database.delete(commerceUnmatchedPayments);
    await database.delete(commercePaymentEvents);

    const now = new Date("2026-09-08T18:00:00.000Z");
    const ops = createReconciliationOperations({ database, now: () => now });

    // 2 rows older than 6 hours (received at 11:00, which is 7 hours before 18:00)
    await database.insert(commerceUnmatchedPayments).values([
      {
        providerEventId: `stale-1-${randomUUID()}`,
        rawPayload: {},
        amount: 79000,
        reason: "NO_VALID_PAYMENT_CODE",
        receivedAt: new Date("2026-09-08T11:00:00.000Z"),
      },
      {
        providerEventId: `stale-2-${randomUUID()}`,
        rawPayload: {},
        amount: 79000,
        reason: "NO_VALID_PAYMENT_CODE",
        receivedAt: new Date("2026-09-08T11:30:00.000Z"),
      },
      // 1 row at or below 6 hours (received at 13:00, which is 5 hours before 18:00)
      {
        providerEventId: `recent-1-${randomUUID()}`,
        rawPayload: {},
        amount: 79000,
        reason: "NO_VALID_PAYMENT_CODE",
        receivedAt: new Date("2026-09-08T13:00:00.000Z"),
      },
    ]);

    // Total older than 6h is 2 (< 3) -> circuit remains closed
    const res1 = await ops.evaluateCircuitBreaker();
    expect(res1.circuitStatus).toBe("closed");
    expect(res1.transitioned).toBe(false);
    expect(res1.staleCount).toBe(2);

    // Now add a 3rd payment older than 6 hours (received at 10:00)
    await database.insert(commerceUnmatchedPayments).values({
      providerEventId: `stale-3-${randomUUID()}`,
      rawPayload: {},
      amount: 79000,
      reason: "NO_VALID_PAYMENT_CODE",
      receivedAt: new Date("2026-09-08T10:00:00.000Z"),
    });

    // Total older than 6h is now 3 (>= 3) -> circuit OPENS!
    const res2 = await ops.evaluateCircuitBreaker();
    expect(res2.circuitStatus).toBe("open");
    expect(res2.transitioned).toBe(true);
    expect(res2.reasonCode).toBe("STALE_UNMATCHED_PAYMENTS");
    expect(res2.staleCount).toBe(3);

    // Verify audit row was appended
    const audits = (await database.select().from(auditLogs))
      .filter((a) => a.action === "commerce.circuit_breaker.opened");
    expect(audits.length).toBeGreaterThan(0);
    const latestAudit = audits[audits.length - 1];
    expect(latestAudit.reasonCode).toBe("STALE_UNMATCHED_PAYMENTS");
    expect(latestAudit.targetType).toBe("commerce_reconciliation_state");
    expect(latestAudit.targetId).toBe("singleton");
    expect(latestAudit.metadata).toMatchObject({
      previousStatus: "closed",
      newStatus: "open",
      staleCount: 3,
    });
  });

  it("open circuit blocks new order creation and does not insert a row; closed circuit preserves behavior", async () => {
    const { userId, actor } = await createFixtureUser();
    const { chartId } = await createChartFixture(userId);
    const repo = createDatabaseCommerceRepository(database);

    // 1. Ensure circuit is open
    await database
      .update(commerceReconciliationState)
      .set({ circuitStatus: "open", openedAt: new Date(), reasonCode: "TEST_OPEN" })
      .where(eq(commerceReconciliationState.id, "singleton"));

    const openResult = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(openResult).toEqual({
      ok: false,
      code: "CHECKOUT_PAYMENTS_PAUSED",
    });

    // Verify NO pending order was inserted for this chart and owner
    const ordersWhenOpen = (await database.select().from(commerceOrders))
      .filter((o) => o.chartId === chartId && o.ownerId === userId);
    expect(ordersWhenOpen).toHaveLength(0);

    // 2. Set circuit to closed
    await database
      .update(commerceReconciliationState)
      .set({ circuitStatus: "closed", openedAt: null, reasonCode: null })
      .where(eq(commerceReconciliationState.id, "singleton"));

    const closedResult = await repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");
    expect(closedResult.ok).toBe(true);
    if (!closedResult.ok) throw new Error("EXPECTED_ORDER_CREATED");
    expect(closedResult.value.status).toBe("pending");

    // Verify order was inserted
    const ordersWhenClosed = (await database.select().from(commerceOrders))
      .filter((o) => o.chartId === chartId && o.ownerId === userId);
    expect(ordersWhenClosed).toHaveLength(1);
    expect(ordersWhenClosed[0].id).toBe(closedResult.value.id);
  });

  it("stale rows are alerted once, remain retryable on provider failure, and do not expose raw payload or sender metadata", async () => {
    // Clean unmatched rows and alert deliveries
    await database.delete(commerceAlertDeliveries);
    await database.delete(commerceUnmatchedPayments);

    const now = new Date("2026-09-08T20:00:00.000Z");
    const staleTime = new Date("2026-09-08T10:00:00.000Z"); // 10h ago (>6h)

    const payment1Id = "stale-alert-p1-" + randomUUID();
    const payment2Id = "stale-alert-p2-" + randomUUID();

    await database.insert(commerceUnmatchedPayments).values([
      {
        providerEventId: payment1Id,
        rawPayload: { senderName: "LEAK_ATTEMPT_1", bankNote: "CONFIDENTIAL" },
        amount: 79000,
        reason: "NO_VALID_PAYMENT_CODE",
        receivedAt: new Date(staleTime.getTime() - 60000),
      },
      {
        providerEventId: payment2Id,
        rawPayload: { senderName: "LEAK_ATTEMPT_2", bankNote: "SECRET" },
        amount: 79000,
        reason: "NO_VALID_PAYMENT_CODE",
        receivedAt: staleTime,
      },
    ]);

    // Mock fetch that succeeds on payment 1 but fails on payment 2
    const sentMessages: string[] = [];
    const mockFetch = vi.fn().mockImplementation((_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      sentMessages.push(body.text);
      if (body.text.includes(payment1Id)) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.resolve({ ok: false, status: 502 });
    });

    const telegramAlert = createTelegramAlertProvider({
      botToken: "test-token",
      chatId: "test-chat",
      fetch: mockFetch as never,
    });

    const ops = createReconciliationOperations({
      database,
      telegramAlert,
      now: () => now,
    });

    const firstScan = await ops.scanAndAlertStalePayments();
    expect(firstScan.scanned).toBe(2);
    expect(firstScan.alerted).toBe(1); // Only 1 succeeded

    // Verify both are marked enqueued in unmatched rows, and deliveries reflect sent vs retryable
    const rowsAfter1 = await database.select().from(commerceUnmatchedPayments);
    const p1 = rowsAfter1.find((r) => r.providerEventId === payment1Id);
    const p2 = rowsAfter1.find((r) => r.providerEventId === payment2Id);
    expect(p1?.staleAlertedAt).not.toBeNull();
    expect(p2?.staleAlertedAt).not.toBeNull();

    const deliveries1 = await database.select().from(commerceAlertDeliveries);
    const d1 = deliveries1.find((d) => d.idempotencyKey === `stale-payment:${payment1Id}`);
    const d2 = deliveries1.find((d) => d.idempotencyKey === `stale-payment:${payment2Id}`);
    expect(d1?.status).toBe("sent");
    expect(d2?.status).toBe("failed_retryable");

    // Verify messages NEVER contain raw payload or sender metadata
    for (const msg of sentMessages) {
      expect(msg).not.toContain("LEAK_ATTEMPT");
      expect(msg).not.toContain("CONFIDENTIAL");
      expect(msg).not.toContain("SECRET");
      expect(msg).toContain("79000 VND");
      expect(msg).toContain("NO_VALID_PAYMENT_CODE");
    }

    // Run second scan where fetch succeeds for the remaining row
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    const secondScan = await ops.scanAndAlertStalePayments();
    expect(secondScan.scanned).toBe(0); // Both were already enqueued in first scan
    expect(secondScan.alerted).toBe(1); // p2 retry succeeded!

    const deliveries2 = await database.select().from(commerceAlertDeliveries);
    const d2After = deliveries2.find((d) => d.idempotencyKey === `stale-payment:${payment2Id}`);
    expect(d2After?.status).toBe("sent");

    // Run third scan: both are alerted, 0 scanned
    const thirdScan = await ops.scanAndAlertStalePayments();
    expect(thirdScan.scanned).toBe(0);
    expect(thirdScan.alerted).toBe(0);

    // Verify durable commerce_alert_deliveries records exist and are marked sent
    const deliveries = await database.select().from(commerceAlertDeliveries);
    const finalD1 = deliveries.find((d) => d.idempotencyKey === `stale-payment:${payment1Id}`);
    const finalD2 = deliveries.find((d) => d.idempotencyKey === `stale-payment:${payment2Id}`);
    expect(finalD1?.status).toBe("sent");
    expect(finalD2?.status).toBe("sent");
  });

  it("circuit-open state does not automatically reset; authorized reset closes it and appends bounded audit evidence", async () => {
    // Open the circuit
    const openTime = new Date("2026-09-08T10:00:00.000Z");
    await database
      .update(commerceReconciliationState)
      .set({
        circuitStatus: "open",
        openedAt: openTime,
        reasonCode: "STALE_UNMATCHED_PAYMENTS",
        alertIdempotencyKey: "circuit-open:1",
      })
      .where(eq(commerceReconciliationState.id, "singleton"));

    // Set time to 48 hours later and clean all unmatched payments so conditions are normal
    await database.delete(commerceUnmatchedPayments);
    const futureTime = new Date("2026-09-10T10:00:00.000Z");

    const ops = createReconciliationOperations({
      database,
      now: () => futureTime,
    });

    // Evaluate circuit breaker: MUST NOT self-reset!
    const evalRes = await ops.evaluateCircuitBreaker();
    expect(evalRes.circuitStatus).toBe("open");
    expect(evalRes.transitioned).toBe(false);

    // Setup admin user with admin.commerce.manage capability
    const { userId: adminUserId, actor: adminActor } = await createFixtureUser();
    const roleAssignmentId = "assignment-" + randomUUID();
    await database.insert(adminRoleAssignments).values({
      id: roleAssignmentId,
      userId: adminUserId,
      role: "super_admin",
      assignmentVersion: 1,
    });
    // Policy admin.commerce.manage for super_admin is already seeded by migration 0021

    const adminAccessService = createAdminAccessService({
      repository: createDatabaseAdminAccessRepository(database),
    });

    const adminOps = createReconciliationOperations({
      database,
      adminAccessService,
      now: () => futureTime,
    });

    // 1. Unauthorized actor cannot reset
    const { actor: nonAdminActor } = await createFixtureUser();
    const unauthorizedReset = await adminOps.resetCircuit(nonAdminActor);
    expect(unauthorizedReset.ok).toBe(false);
    expect(await adminOps.getCircuitStatus()).toBe("open");

    // 2. Authorized admin resets circuit
    const authorizedReset = await adminOps.resetCircuit(adminActor);
    expect(authorizedReset).toEqual({
      ok: true,
      value: {
        previousStatus: "open",
        newStatus: "closed",
        reset: true,
      },
    });

    expect(await adminOps.getCircuitStatus()).toBe("closed");

    // Verify bounded audit evidence
    const resetAudits = (await database.select().from(auditLogs))
      .filter((a) => a.action === "commerce.circuit_breaker.reset" && a.actorId === adminUserId);
    expect(resetAudits).toHaveLength(1);
    expect(resetAudits[0].targetType).toBe("commerce_reconciliation_state");
    expect(resetAudits[0].targetId).toBe("singleton");
    expect(resetAudits[0].reasonCode).toBe("admin_reset");
    expect(resetAudits[0].metadata).toEqual({
      previousStatus: "open",
      newStatus: "closed",
      resetBy: adminUserId,
    });
  });

  it("concurrent maintenance runs cannot duplicate stale alerts or state-open transitions", async () => {
    // Reset circuit state to closed
    await database
      .update(commerceReconciliationState)
      .set({ circuitStatus: "closed", openedAt: null, reasonCode: null, alertIdempotencyKey: null })
      .where(eq(commerceReconciliationState.id, "singleton"));

    await database.delete(commerceAlertDeliveries);
    await database.delete(commerceUnmatchedPayments);

    const now = new Date("2026-09-08T22:00:00.000Z");
    const staleTime = new Date("2026-09-08T12:00:00.000Z"); // 10h ago

    // Insert 4 stale payments (meets >= 3 threshold)
    for (let i = 1; i <= 4; i++) {
      await database.insert(commerceUnmatchedPayments).values({
        providerEventId: `concurrent-stale-${i}-${randomUUID()}`,
        rawPayload: {},
        amount: 79000,
        reason: "NO_VALID_PAYMENT_CODE",
        receivedAt: staleTime,
      });
    }

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const telegramAlert = createTelegramAlertProvider({
      botToken: "test-token",
      chatId: "test-chat",
      fetch: mockFetch as never,
    });

    const ops = createReconciliationOperations({
      database,
      telegramAlert,
      now: () => now,
    });

    // Run 5 concurrent maintenance executions
    const runs = await Promise.all(
      Array.from({ length: 5 }, () => ops.runMaintenance()),
    );

    // Total transitions across all 5 runs: exactly 1 run transitions, other 4 see it already open
    const transitionedRuns = runs.filter((r) => r.circuitTransitioned);
    expect(transitionedRuns).toHaveLength(1);

    // Exactly 1 circuit open audit log recorded
    const openAudits = (await database.select().from(auditLogs))
      .filter((a) => a.action === "commerce.circuit_breaker.opened" && a.createdAt >= now);
    expect(openAudits).toHaveLength(1);

    // Stale alerts: total staleAlerted across all runs equals 4 (each stale row alerted at most once)
    const totalStaleAlerted = runs.reduce((sum, r) => sum + r.staleAlerted, 0);
    expect(totalStaleAlerted).toBe(4);

    // Verify all 4 rows in DB have staleAlertedAt populated
    const rows = await database.select().from(commerceUnmatchedPayments);
    expect(rows.every((r) => r.staleAlertedAt !== null)).toBe(true);
  });
  it("proves an order cannot commit after an already-serialized circuit opening (Finding 2 concurrency)", async () => {
    // Reset circuit to closed
    await database
      .update(commerceReconciliationState)
      .set({ circuitStatus: "closed", openedAt: null, reasonCode: null })
      .where(eq(commerceReconciliationState.id, "singleton"));

    const { userId, actor } = await createFixtureUser();
    const { chartId } = await createChartFixture(userId);
    const repo = createDatabaseCommerceRepository(database);

    // Hold the circuit advisory lock in a transaction, open the circuit, and test that createOrder blocks until commit and then rejects with CHECKOUT_PAYMENTS_PAUSED
    let releaseHold: () => void = () => {};
    const holdPromise = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });

    let txStarted = false;
    let txResolved = false;

    const circuitLockKey = "commerce:reconciliation_circuit";
    const openingTx = database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${circuitLockKey}))`);
      txStarted = true;
      // Wait until createOrder is in flight
      await holdPromise;
      await tx
        .update(commerceReconciliationState)
        .set({ circuitStatus: "open", openedAt: new Date(), reasonCode: "RACE_TEST_OPEN" })
        .where(eq(commerceReconciliationState.id, "singleton"));
    }).then(() => {
      txResolved = true;
    });

    // Wait for the opening transaction to acquire the lock
    while (!txStarted) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Now call createOrder concurrently - it will block waiting for the advisory lock
    const orderPromise = repo.createOrder(actor, chartId, "ZIWEI-IDENTITY-P0", "vi");

    // Allow some time to confirm orderPromise is waiting (has not finished)
    await new Promise((r) => setTimeout(r, 50));
    expect(txResolved).toBe(false);

    // Release the opening transaction hold
    releaseHold();
    await openingTx;

    // createOrder unblocks, sees circuitStatus is "open", and rejects!
    const orderResult = await orderPromise;
    expect(orderResult).toEqual({
      ok: false,
      code: "CHECKOUT_PAYMENTS_PAUSED",
    });

    // Confirm no order was committed
    const committedOrders = (await database.select().from(commerceOrders))
      .filter((o) => o.chartId === chartId && o.ownerId === userId);
    expect(committedOrders).toHaveLength(0);
  });

  it("denies circuit reset for non-super-admin, revoked, and absent policy assignments (Finding 3 tests)", async () => {
    // Open circuit
    await database
      .update(commerceReconciliationState)
      .set({ circuitStatus: "open", openedAt: new Date(), reasonCode: "TEST_DENY" })
      .where(eq(commerceReconciliationState.id, "singleton"));

    const adminAccessService = createAdminAccessService({
      repository: createDatabaseAdminAccessRepository(database),
    });
    const ops = createReconciliationOperations({ database, adminAccessService });

    // 1. User with no admin assignment at all
    const { actor: unassignedActor } = await createFixtureUser();
    const unassignedResult = await ops.resetCircuit(unassignedActor);
    expect(unassignedResult).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "ADMIN_FORBIDDEN" }),
    });

    // 2. User with operations role (no admin.commerce.manage capability)
    const { userId: opsUserId, actor: opsActor } = await createFixtureUser();
    await database.insert(adminRoleAssignments).values({
      id: "asst-ops-" + randomUUID(),
      userId: opsUserId,
      role: "operations",
      assignmentVersion: 1,
    });
    const opsResult = await ops.resetCircuit(opsActor);
    expect(opsResult).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "ADMIN_FORBIDDEN" }),
    });

    // 3. User with super_admin role but REVOKED assignment
    const { userId: revokedUserId, actor: revokedActor } = await createFixtureUser();
    await database.insert(adminRoleAssignments).values({
      id: "asst-revoked-" + randomUUID(),
      userId: revokedUserId,
      role: "super_admin",
      assignmentVersion: 1,
      revokedAt: new Date(),
    });
    const revokedResult = await ops.resetCircuit(revokedActor);
    expect(revokedResult).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "ROLE_ASSIGNMENT_INACTIVE" }),
    });

    // 4. Circuit status remains OPEN throughout all failed attempts
    expect(await ops.getCircuitStatus()).toBe("open");
  });
  it("proves a stale claimant cannot overwrite a newer claim result when lease expires (Scoped Correction 2)", async () => {
    // Clear alert deliveries
    await database.delete(commerceAlertDeliveries);

    const deliveryId = randomUUID();
    const idempotencyKey = "test-reclaim-" + randomUUID();
    let frozenTime = new Date("2026-09-08T10:00:00.000Z");

    // Insert a pending delivery
    await database.insert(commerceAlertDeliveries).values({
      id: deliveryId,
      idempotencyKey,
      alertKind: "stale_payment",
      payload: {
        providerEventId: "ev-reclaim-test",
        amount: 79000,
        receivedAt: frozenTime.toISOString(),
        reason: "TEST_RECLAIM",
      },
      status: "pending",
      createdAt: frozenTime,
      updatedAt: frozenTime,
    });

    // Setup Runner B mock that succeeds
    const mockFetchB = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const telegramB = createTelegramAlertProvider({
      botToken: "token-b",
      chatId: "chat-b",
      fetch: mockFetchB as never,
    });
    const opsB = createReconciliationOperations({
      database,
      telegramAlert: telegramB,
      now: () => frozenTime,
    });

    // Setup Runner A whose Telegram call simulates delayed execution
    const mockFetchA = vi.fn().mockImplementation(async () => {
      // While A is waiting in its Telegram call, advance frozen time past the 60s lease (to + 2 minutes)
      frozenTime = new Date("2026-09-08T10:02:00.000Z");

      // Trigger Runner B to reclaim and complete delivery
      const bResult = await opsB.dispatchPendingAlerts("stale_payment");
      expect(bResult.delivered).toBe(1);

      // Verify Runner B successfully marked the delivery as "sent" with leaseToken cleared
      const [midDelivery] = await database
        .select()
        .from(commerceAlertDeliveries)
        .where(eq(commerceAlertDeliveries.id, deliveryId));
      expect(midDelivery.status).toBe("sent");
      expect(midDelivery.leaseToken).toBeNull();

      // Now Runner A returns a failure (which would normally set status = failed_retryable)
      return { ok: false, status: 502 };
    });

    const telegramA = createTelegramAlertProvider({
      botToken: "token-a",
      chatId: "chat-a",
      fetch: mockFetchA as never,
    });
    const opsA = createReconciliationOperations({
      database,
      telegramAlert: telegramA,
      now: () => frozenTime,
    });

    // Run A
    const aResult = await opsA.dispatchPendingAlerts("stale_payment");
    expect(aResult.failed).toBe(1);

    // Verify Runner A stale attempt did NOT overwrite Runner B sent status!
    const [finalDelivery] = await database
      .select()
      .from(commerceAlertDeliveries)
      .where(eq(commerceAlertDeliveries.id, deliveryId));

    expect(finalDelivery.status).toBe("sent");
    expect(finalDelivery.lastError).toBeNull();
    expect(finalDelivery.sentAt).not.toBeNull();
    expect(finalDelivery.leaseToken).toBeNull();
  });
});
