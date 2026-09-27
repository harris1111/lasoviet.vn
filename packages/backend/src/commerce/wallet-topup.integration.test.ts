import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authUsers,
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

  async function walletOf(userId: string) {
    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, userId)).limit(1);
    return wallet;
  }

  function formatLocalMinute(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  }

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
