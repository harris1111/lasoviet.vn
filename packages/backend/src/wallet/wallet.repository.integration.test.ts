import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  auditLogs,
  authUsers,
  createDatabase,
  commerceOrders,
  runMigrations,
  walletAccounts,
  walletCommandReceipts,
  walletCreditLots,
  walletLedgerEntries,
  walletPurchaseIntents,
  walletSpendAllocations,
  walletTransactions,
  type Database,
} from "@lasoviet/database";
import type { CurrentActor, WalletGrantV1 } from "@lasoviet/contracts";

import { createDatabaseWalletRepository } from "./wallet.repository.js";

describe("wallet repository", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_wallet_repository_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function createAccount(
    name: string,
    options: { emailVerified?: boolean; isAnonymous?: boolean } = {},
  ) {
    const id = `${name}-${randomUUID()}`;
    await database.insert(authUsers).values({
      id,
      name,
      email: `${id}@example.test`,
      emailVerified: options.emailVerified ?? true,
      isAnonymous: options.isAnonymous ?? false,
    });
    return id;
  }

  function accountActor(userId: string): CurrentActor {
    return { kind: "account", userId, sessionId: `session-${userId}`, requestId: `request-${userId}` };
  }

  function promotionalGrant(actorId: string, idempotencyKey: string, promotionalLa = 100000): WalletGrantV1 {
    return {
      version: 1,
      kind: "grant",
      actorId,
      reasonCode: "founder.promotional.credit",
      requestId: `request-${idempotencyKey}`,
      traceId: `trace-${idempotencyKey}`,
      idempotencyKey,
      purchasedLa: 0,
      promotionalLa,
      topUpPackId: null,
    };
  }

  function trustedRepository(actorId: string, now?: () => Date) {
    const authority = { token: {}, actorId };
    return {
      authority,
      repository: createDatabaseWalletRepository(database, { now, trustedGrantAuthority: authority }),
    };
  }

  function reservationCodec() {
    return {
      safeParse(value: unknown) {
        if (typeof value === "object" && value !== null && "reservationId" in value &&
          typeof (value as { reservationId?: unknown }).reservationId === "string") {
          return { success: true as const, data: value as { reservationId: string } };
        }
        return { success: false as const };
      },
    };
  }

  async function insertIntent(ownerId: string, amountLa = 240) {
    const id = randomUUID();
    await database.insert(walletPurchaseIntents).values({
      id,
      ownerId,
      chartId: `chart-${randomUUID()}`,
      chartVersionId: `chart-version-${randomUUID()}`,
      sku: amountLa === 240 ? "ZIWEI-NATAL-EXCERPT-P0" : "ZIWEI-IDENTITY-P0",
      priceLa: amountLa,
    });
    return id;
  }

  async function insertLibraryOrder(ownerId: string, status: "pending" | "paid" | "refunded" = "paid") {
    const id = randomUUID();
    await database.insert(commerceOrders).values({
      id,
      ownerId,
      invoiceNumber: `wallet-${randomUUID()}`,
      kind: "wallet_topup",
      sku: "LA-LIBRARY-8000",
      amount: 599000,
      currency: "VND",
      locale: "vi",
      status,
      paidAt: status === "paid" ? new Date() : null,
    });
    return id;
  }

  async function insertEntryOrder(ownerId: string) {
    const id = randomUUID();
    await database.insert(commerceOrders).values({
      id,
      ownerId,
      invoiceNumber: `wallet-${randomUUID()}`,
      kind: "wallet_topup",
      sku: "LA-ENTRY-300",
      amount: 29000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date("2026-09-17T00:00:00.000Z"),
    });
    return id;
  }

  function libraryGrant(actorId: string, idempotencyKey: string): WalletGrantV1 {
    return {
      ...promotionalGrant(actorId, idempotencyKey, 2000),
      purchasedLa: 6000,
      topUpPackId: "LA-LIBRARY-8000",
    };
  }

  function entryGrant(actorId: string, idempotencyKey: string): WalletGrantV1 {
    return {
      ...promotionalGrant(actorId, idempotencyKey, 0),
      purchasedLa: 300,
      topUpPackId: "LA-ENTRY-300",
    };
  }

  async function walletFor(ownerId: string) {
    const [wallet] = await database.select().from(walletAccounts)
      .where(eq(walletAccounts.ownerId, ownerId));
    if (wallet === undefined) throw new Error(`wallet not found for ${ownerId}`);
    return wallet;
  }

  it("requires an account actor for reads", async () => {
    const repository = createDatabaseWalletRepository(database);
    const result = await repository.readBalance({
      kind: "anonymous",
      anonymousId: `anonymous-${randomUUID()}`,
      requestId: `request-${randomUUID()}`,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "WALLET_ACCOUNT_REQUIRED" } });
  });

  it("grants non-expiring promotional Lá to a target distinct from the audit actor exactly once", async () => {
    const auditActorId = await createAccount("wallet-audit-actor");
    const targetOwnerId = await createAccount("wallet-target-owner");
    const { authority, repository } = trustedRepository(auditActorId);
    const grant = promotionalGrant(auditActorId, `grant-${randomUUID()}`);

    const first = await repository.grant({ targetOwnerId, grant, topUpOrderId: null, trustedGrantToken: authority.token });
    const replay = await repository.grant({ targetOwnerId, grant, topUpOrderId: null, trustedGrantToken: authority.token });

    expect(first).toMatchObject({
      ok: true,
      value: {
        status: "completed",
        balance: { purchasedLa: 0, promotionalLa: 100000, totalLa: 100000 },
      },
    });
    if (!replay.ok) throw new Error(`unexpected replay failure: ${replay.error.code}`);
    expect(replay).toMatchObject({
      ok: true,
      value: {
        status: "replayed",
        balance: { purchasedLa: 0, promotionalLa: 100000, totalLa: 100000 },
      },
    });
    if (!first.ok || !replay.ok) throw new Error("expected controlled grant and replay");
    expect(replay.value.transactionId).toBe(first.value.transactionId);

    const [wallet] = await database.select().from(walletAccounts)
      .where(eq(walletAccounts.ownerId, targetOwnerId));
    expect(wallet).toMatchObject({ ownerId: targetOwnerId, purchasedBalance: 0, promotionalBalance: 100000 });
    expect(wallet?.ownerId).not.toBe(auditActorId);

    const lots = await database.select().from(walletCreditLots)
      .where(eq(walletCreditLots.walletId, wallet!.id));
    expect(lots).toEqual([expect.objectContaining({
      bucket: "promotional",
      grantedLa: 100000,
      remainingLa: 100000,
      expiresAt: null,
    })]);
    expect(await database.select().from(walletLedgerEntries)
      .where(eq(walletLedgerEntries.transactionId, first.value.transactionId)))
      .toEqual([expect.objectContaining({ bucket: "promotional", amountLa: 100000 })]);
    expect(await database.select().from(walletCommandReceipts)
      .where(and(
        eq(walletCommandReceipts.walletId, wallet!.id),
        eq(walletCommandReceipts.idempotencyKey, grant.idempotencyKey),
      ))).toHaveLength(1);
    expect(await database.select().from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet!.id))).toHaveLength(1);

    const audits = await database.select().from(auditLogs)
      .where(and(eq(auditLogs.targetType, "wallet"), eq(auditLogs.targetId, wallet!.id)));
    expect(audits).toEqual([expect.objectContaining({
      actorId: auditActorId,
      action: "wallet.grant",
      reasonCode: grant.reasonCode,
      metadata: expect.objectContaining({
        purchasedDelta: 0,
        promotionalDelta: 100000,
      }),
    })]);
    expect(audits[0]?.actorId).not.toBe(targetOwnerId);
    expect(JSON.stringify(audits[0]?.metadata)).not.toContain("chart");

    const targetBalance = await repository.readBalance(accountActor(targetOwnerId));
    expect(targetBalance).toMatchObject({
      ok: true,
      value: { purchasedLa: 0, promotionalLa: 100000, totalLa: 100000 },
    });
  });

  it("rejects an idempotency key reused with a different grant command", async () => {
    const auditActorId = await createAccount("wallet-idempotency-actor");
    const targetOwnerId = await createAccount("wallet-idempotency-target");
    const { authority, repository } = trustedRepository(auditActorId);
    const idempotencyKey = `grant-${randomUUID()}`;

    expect(await repository.grant({
      targetOwnerId,
      grant: promotionalGrant(auditActorId, idempotencyKey),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    })).toMatchObject({ ok: true });
    expect(await repository.grant({
      targetOwnerId,
      grant: {
        ...promotionalGrant(auditActorId, idempotencyKey),
        reasonCode: "founder.promotional.credit.changed",
      },
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    })).toMatchObject({ ok: false, error: { code: "WALLET_IDEMPOTENCY_KEY_REUSED" } });
  });

  it("rejects unverified and anonymous grant targets before wallet writes", async () => {
    const auditActorId = await createAccount("wallet-eligibility-audit");
    const unverifiedOwnerId = await createAccount("wallet-unverified-target", { emailVerified: false });
    const anonymousOwnerId = await createAccount("wallet-anonymous-target", { isAnonymous: true });
    const { authority, repository } = trustedRepository(auditActorId);

    const rejectedKeys: string[] = [];
    for (const targetOwnerId of [unverifiedOwnerId, anonymousOwnerId]) {
      const idempotencyKey = `ineligible-${randomUUID()}`;
      rejectedKeys.push(idempotencyKey);
      const result = await repository.grant({
        targetOwnerId,
        grant: promotionalGrant(auditActorId, idempotencyKey),
        topUpOrderId: null,
        trustedGrantToken: authority.token,
      });
      expect(result).toMatchObject({ ok: false, error: { code: "WALLET_ACCOUNT_INELIGIBLE" } });
      expect(await database.select().from(walletAccounts)
        .where(eq(walletAccounts.ownerId, targetOwnerId))).toHaveLength(0);
    }

    expect(await database.select().from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, rejectedKeys[0]!))).toHaveLength(0);
    expect(await database.select().from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, rejectedKeys[1]!))).toHaveLength(0);
    expect(await database.select().from(walletCommandReceipts)
      .where(eq(walletCommandReceipts.idempotencyKey, rejectedKeys[0]!))).toHaveLength(0);
    expect(await database.select().from(walletCommandReceipts)
      .where(eq(walletCommandReceipts.idempotencyKey, rejectedKeys[1]!))).toHaveLength(0);
    expect(await database.select().from(auditLogs)
      .where(and(eq(auditLogs.action, "wallet.grant"), eq(auditLogs.actorId, auditActorId)))).toHaveLength(0);
  });

  it("serializes concurrent expected-version spends with one completion and one version conflict", async () => {
    const auditActorId = await createAccount("wallet-concurrent-version-audit");
    const ownerId = await createAccount("wallet-concurrent-version-owner");
    const actor = accountActor(ownerId);
    const { authority, repository } = trustedRepository(auditActorId);
    const grant = await repository.grant({
      targetOwnerId: ownerId,
      grant: promotionalGrant(auditActorId, `concurrent-version-grant-${randomUUID()}`, 500),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!grant.ok) throw new Error("expected grant");
    const [firstIntentId, secondIntentId] = await Promise.all([insertIntent(ownerId), insertIntent(ownerId)]);

    const commands = [firstIntentId, secondIntentId].map((purchaseIntentId) => repository.spend({
      actor,
      spend: {
        kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey: `concurrent-version-${randomUUID()}`, purchaseIntentId, amountLa: 240, expectedWalletVersion: 2,
      },
    }));
    const results = await Promise.all(commands);
    expect(results.filter((result) => result.ok && result.value.status === "completed")).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.error.code === "WALLET_VERSION_CONFLICT")).toHaveLength(1);

    const wallet = await walletFor(ownerId);
    expect(wallet).toMatchObject({ promotionalBalance: 260, purchasedBalance: 0, stateVersion: 3 });
    expect(wallet.promotionalBalance).toBeGreaterThanOrEqual(0);
    const spends = await database.select().from(walletTransactions)
      .where(and(eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.kind, "spend")));
    const audits = await database.select().from(auditLogs)
      .where(and(eq(auditLogs.targetId, wallet.id), eq(auditLogs.action, "wallet.spend")));
    expect(spends).toHaveLength(1);
    expect(audits).toHaveLength(1);
  });

  it("replays a matching concurrent idempotency command without rerunning its continuation", async () => {
    const auditActorId = await createAccount("wallet-concurrent-replay-audit");
    const ownerId = await createAccount("wallet-concurrent-replay-owner");
    const actor = accountActor(ownerId);
    const { authority, repository } = trustedRepository(auditActorId);
    const grant = await repository.grant({
      targetOwnerId: ownerId,
      grant: promotionalGrant(auditActorId, `concurrent-replay-grant-${randomUUID()}`, 500),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!grant.ok) throw new Error("expected grant");
    const intentId = await insertIntent(ownerId);
    const idempotencyKey = `concurrent-replay-${randomUUID()}`;
    let continuationCalls = 0;
    const command = () => repository.spend({
      actor,
      spend: {
        kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey, purchaseIntentId: intentId, amountLa: 240, expectedWalletVersion: 2,
      },
      continuation: async () => {
        continuationCalls += 1;
        return { reservationId: "concurrent-reservation" };
      },
      continuationResultCodec: reservationCodec(),
    });

    const results = await Promise.all([command(), command()]);
    expect(results.filter((result) => result.ok && result.value.status === "completed")).toHaveLength(1);
    expect(results.filter((result) => result.ok && result.value.status === "replayed")).toHaveLength(1);
    expect(continuationCalls).toBe(1);

    const wallet = await walletFor(ownerId);
    expect(await database.select().from(walletTransactions)
      .where(and(eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.kind, "spend")))).toHaveLength(1);
    expect(await database.select().from(walletCommandReceipts)
      .where(and(eq(walletCommandReceipts.walletId, wallet.id), eq(walletCommandReceipts.idempotencyKey, idempotencyKey)))).toHaveLength(1);
    expect(await database.select().from(auditLogs)
      .where(and(eq(auditLogs.targetId, wallet.id), eq(auditLogs.action, "wallet.spend")))).toHaveLength(1);
  });

  it("spends promotional credit first and restores the exact lot allocation for a later re-spend", async () => {
    const ownerId = await createAccount("wallet-spend-owner");
    const actor = accountActor(ownerId);
    const auditActorId = await createAccount("wallet-spend-audit");
    const { authority, repository } = trustedRepository(auditActorId);
    const grant = await repository.grant({
      targetOwnerId: ownerId,
      grant: promotionalGrant(auditActorId, `grant-${randomUUID()}`, 500),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!grant.ok) throw new Error("expected promotional grant");

    const firstIntentId = randomUUID();
    await database.insert(walletPurchaseIntents).values({
      id: firstIntentId,
      ownerId,
      chartId: `chart-${randomUUID()}`,
      chartVersionId: `chart-version-${randomUUID()}`,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      priceLa: 240,
    });
    const firstSpend = await repository.spend({
      actor,
      spend: {
        actorId: ownerId,
        reasonCode: "wallet.report.unlock",
        requestId: `request-${randomUUID()}`,
        traceId: `trace-${randomUUID()}`,
        idempotencyKey: `spend-${randomUUID()}`,
        kind: "spend",
        purchaseIntentId: firstIntentId,
        amountLa: 240,
        expectedWalletVersion: 2,
      },
      continuation: async () => ({ reservationId: "reservation-1" }),
      continuationResultCodec: reservationCodec(),
    });
    expect(firstSpend).toMatchObject({
      ok: true,
      value: {
        status: "completed",
        continuation: { reservationId: "reservation-1" },
        balance: { purchasedLa: 0, promotionalLa: 260, totalLa: 260 },
      },
    });
    if (!firstSpend.ok) throw new Error("expected promotional spend");

    const replay = await repository.spend({
      actor,
      spend: {
        actorId: ownerId,
        reasonCode: "wallet.report.unlock",
        requestId: "ignored-on-replay",
        traceId: "ignored-on-replay",
        idempotencyKey: firstSpend.value.commandId,
        kind: "spend",
        purchaseIntentId: firstIntentId,
        amountLa: 240,
        expectedWalletVersion: 2,
      },
      continuation: async () => {
        throw new Error("matching replay must not invoke continuation");
      },
      continuationResultCodec: reservationCodec(),
    });
    expect(replay).toMatchObject({
      ok: true,
      value: {
        status: "replayed",
        continuation: { reservationId: "reservation-1" },
      },
    });

    const spendAllocations = await database.select().from(walletSpendAllocations)
      .where(eq(walletSpendAllocations.spendTransactionId, firstSpend.value.transactionId));
    expect(spendAllocations).toEqual([expect.objectContaining({
      bucket: "promotional",
      amountLa: 240,
      purchasedLa: 0,
      recognizedVnd: 0,
    })]);

    const restoration = await repository.restore({
      actor,
      restoration: {
        actorId: ownerId,
        reasonCode: "wallet.report.failure",
        requestId: `request-${randomUUID()}`,
        traceId: `trace-${randomUUID()}`,
        idempotencyKey: `restore-${randomUUID()}`,
        kind: "restoration",
        originalSpendId: firstSpend.value.transactionId,
        expectedWalletVersion: 3,
      },
    });
    expect(restoration).toMatchObject({
      ok: true,
      value: {
        balance: { purchasedLa: 0, promotionalLa: 500, totalLa: 500 },
      },
    });

    const secondIntentId = randomUUID();
    await database.insert(walletPurchaseIntents).values({
      id: secondIntentId,
      ownerId,
      chartId: `chart-${randomUUID()}`,
      chartVersionId: `chart-version-${randomUUID()}`,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      priceLa: 240,
    });
    const secondSpend = await repository.spend({
      actor,
      spend: {
        actorId: ownerId,
        reasonCode: "wallet.report.unlock",
        requestId: `request-${randomUUID()}`,
        traceId: `trace-${randomUUID()}`,
        idempotencyKey: `spend-${randomUUID()}`,
        kind: "spend",
        purchaseIntentId: secondIntentId,
        amountLa: 240,
        expectedWalletVersion: 4,
      },
    });
    expect(secondSpend).toMatchObject({
      ok: true,
      value: { balance: { purchasedLa: 0, promotionalLa: 260, totalLa: 260 } },
    });
  });

  it("validates trusted grant authority and exact paid top-up order before any wallet write", async () => {
    const auditActorId = await createAccount("wallet-paid-audit");
    const targetOwnerId = await createAccount("wallet-paid-target");
    const { authority, repository } = trustedRepository(auditActorId);
    const orderId = await insertLibraryOrder(targetOwnerId);
    const grant = libraryGrant(auditActorId, `paid-grant-${randomUUID()}`);

    expect(await repository.grant({
      targetOwnerId,
      grant,
      topUpOrderId: orderId,
      trustedGrantToken: {},
    })).toMatchObject({ ok: false, error: { code: "WALLET_INVALID_COMMAND" } });
    expect(await repository.grant({
      targetOwnerId,
      grant,
      topUpOrderId: orderId,
      trustedGrantToken: authority.token,
    })).toMatchObject({ ok: true, value: { balance: { purchasedLa: 6000, promotionalLa: 2000 } } });
    expect(await repository.grant({
      targetOwnerId,
      grant: { ...grant, idempotencyKey: `different-${randomUUID()}` },
      topUpOrderId: orderId,
      trustedGrantToken: authority.token,
    })).toMatchObject({ ok: false, error: { code: "WALLET_TOP_UP_CONFLICT" } });

    const pendingOwnerId = await createAccount("wallet-pending-target");
    const pendingOrderId = await insertLibraryOrder(pendingOwnerId, "pending");
    expect(await repository.grant({
      targetOwnerId: pendingOwnerId,
      grant: libraryGrant(auditActorId, `pending-${randomUUID()}`),
      topUpOrderId: pendingOrderId,
      trustedGrantToken: authority.token,
    })).toMatchObject({ ok: false, error: { code: "WALLET_INVALID_INTENT" } });
    expect(await database.select().from(walletTransactions)
      .where(eq(walletTransactions.topUpOrderId, pendingOrderId))).toHaveLength(0);
  });

  it("uses numeric cumulative-floor revenue after restoration and preserves restoration history lineage", async () => {
    const auditActorId = await createAccount("wallet-revenue-audit");
    const ownerId = await createAccount("wallet-revenue-owner");
    const actor = accountActor(ownerId);
    const { authority, repository } = trustedRepository(auditActorId);
    const orderId = await insertLibraryOrder(ownerId);
    const grant = await repository.grant({
      targetOwnerId: ownerId,
      grant: libraryGrant(auditActorId, `library-${randomUUID()}`),
      topUpOrderId: orderId,
      trustedGrantToken: authority.token,
    });
    if (!grant.ok) throw new Error("expected paid grant");

    const spends = [];
    for (const amountLa of [960, 960, 960, 960, 960, 960, 240]) {
      const intentId = await insertIntent(ownerId, amountLa);
      const result = await repository.spend({
        actor,
        spend: {
          kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
          idempotencyKey: `paid-spend-${randomUUID()}`, purchaseIntentId: intentId, amountLa,
          expectedWalletVersion: spends.length + 2,
        },
      });
      if (!result.ok) throw new Error(`expected paid spend: ${result.error.code}`);
      spends.push(result.value);
    }
    const allocations = await database.select({
      recognizedVnd: walletSpendAllocations.recognizedVnd,
      purchasedLa: walletSpendAllocations.purchasedLa,
    }).from(walletSpendAllocations)
      .where(eq(walletSpendAllocations.creditLotId, (await database.select({ id: walletCreditLots.id })
        .from(walletCreditLots).where(and(eq(walletCreditLots.walletId, (await database.select({ id: walletAccounts.id })
          .from(walletAccounts).where(eq(walletAccounts.ownerId, ownerId)))[0]!.id), eq(walletCreditLots.bucket, "purchased"))))[0]!.id));
    expect(allocations.reduce((total, row) => total + row.purchasedLa, 0)).toBe(4000);
    expect(allocations.reduce((total, row) => total + row.recognizedVnd, 0)).toBe(Math.floor(4000 * 599000 / 6000));

    const restoration = await repository.restore({
      actor,
      restoration: {
        kind: "restoration", actorId: ownerId, reasonCode: "wallet.report.failure", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey: `restore-${randomUUID()}`, originalSpendId: spends[3]!.transactionId, expectedWalletVersion: 9,
      },
    });
    expect(restoration).toMatchObject({ ok: true, value: { balance: { purchasedLa: 2960 } } });
    const respendIntentId = await insertIntent(ownerId, 960);
    expect(await repository.spend({
      actor,
      spend: {
        kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey: `respend-${randomUUID()}`, purchaseIntentId: respendIntentId, amountLa: 960, expectedWalletVersion: 10,
      },
    })).toMatchObject({ ok: true, value: { balance: { purchasedLa: 2000 } } });

    const history = await repository.readHistory(actor);
    expect(history).toMatchObject({ ok: true });
    if (!history.ok) throw new Error("expected history");
    const restorationItem = history.value.items.find((item) => item.id === restoration.value.transactionId);
    const originalSpendItem = history.value.items.find((item) => item.id === spends[3]!.transactionId);
    expect(restorationItem?.productTitle).toBe(originalSpendItem?.productTitle);
    expect(JSON.stringify(history.value)).not.toMatch(/order|provider|invoice|chart|profile|session|receipt|allocation|lot/i);
  });

  it("recognizes the exact full LA-LIBRARY-8000 purchased value after promotional-first spending", async () => {
    const auditActorId = await createAccount("wallet-library-endpoint-audit");
    const ownerId = await createAccount("wallet-library-endpoint-owner");
    const actor = accountActor(ownerId);
    const now = () => new Date("2026-09-17T12:00:00.000Z");
    const { authority, repository } = trustedRepository(auditActorId, now);
    const orderId = await insertLibraryOrder(ownerId);
    const paidGrant = await repository.grant({
      targetOwnerId: ownerId,
      grant: libraryGrant(auditActorId, `library-endpoint-${randomUUID()}`),
      topUpOrderId: orderId,
      trustedGrantToken: authority.token,
    });
    if (!paidGrant.ok) throw new Error("expected library grant");
    const controlledGrant = await repository.grant({
      targetOwnerId: ownerId,
      grant: promotionalGrant(auditActorId, `library-endpoint-controlled-${randomUUID()}`, 160),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!controlledGrant.ok) throw new Error("expected controlled grant");

    const amounts = [960, 960, 960, 960, 960, 960, 960, 720, 240, 240, 240];
    for (const [index, amountLa] of amounts.entries()) {
      const intentId = await insertIntent(ownerId, amountLa);
      const result = await repository.spend({
        actor,
        spend: {
          kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
          idempotencyKey: `library-endpoint-spend-${randomUUID()}`, purchaseIntentId: intentId, amountLa, expectedWalletVersion: 3 + index,
        },
      });
      if (!result.ok) throw new Error(`expected endpoint spend: ${result.error.code}`);
    }

    const wallet = await walletFor(ownerId);
    const [purchasedLot] = await database.select().from(walletCreditLots)
      .where(and(eq(walletCreditLots.walletId, wallet.id), eq(walletCreditLots.bucket, "purchased")));
    const allocations = await database.select({ purchasedLa: walletSpendAllocations.purchasedLa, recognizedVnd: walletSpendAllocations.recognizedVnd })
      .from(walletSpendAllocations).where(eq(walletSpendAllocations.creditLotId, purchasedLot!.id));
    expect(purchasedLot).toMatchObject({ grantedLa: 6000, remainingLa: 0 });
    expect(allocations.reduce((total, allocation) => total + allocation.purchasedLa, 0)).toBe(6000);
    expect(allocations.reduce((total, allocation) => total + allocation.recognizedVnd, 0)).toBe(599000);
  });

  it("consumes paid LA-ENTRY-300 lots in FIFO grantedAt order", async () => {
    const auditActorId = await createAccount("wallet-fifo-audit");
    const ownerId = await createAccount("wallet-fifo-owner");
    const actor = accountActor(ownerId);
    let currentNow = new Date("2026-09-17T13:00:00.000Z");
    const { authority, repository } = trustedRepository(auditActorId, () => currentNow);
    const firstOrderId = await insertEntryOrder(ownerId);
    const firstGrant = await repository.grant({
      targetOwnerId: ownerId,
      grant: entryGrant(auditActorId, `fifo-first-${randomUUID()}`),
      topUpOrderId: firstOrderId,
      trustedGrantToken: authority.token,
    });
    if (!firstGrant.ok) throw new Error("expected first entry grant");
    currentNow = new Date("2026-09-17T13:01:00.000Z");
    const secondOrderId = await insertEntryOrder(ownerId);
    const secondGrant = await repository.grant({
      targetOwnerId: ownerId,
      grant: entryGrant(auditActorId, `fifo-second-${randomUUID()}`),
      topUpOrderId: secondOrderId,
      trustedGrantToken: authority.token,
    });
    if (!secondGrant.ok) throw new Error("expected second entry grant");
    const controlledGrant = await repository.grant({
      targetOwnerId: ownerId,
      grant: promotionalGrant(auditActorId, `fifo-controlled-${randomUUID()}`, 120),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!controlledGrant.ok) throw new Error("expected controlled grant");

    const intentId = await insertIntent(ownerId, 720);
    const spend = await repository.spend({
      actor,
      spend: {
        kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey: `fifo-spend-${randomUUID()}`, purchaseIntentId: intentId, amountLa: 720, expectedWalletVersion: 4,
      },
    });
    if (!spend.ok) throw new Error(`expected FIFO spend: ${spend.error.code}`);

    const wallet = await walletFor(ownerId);
    const lots = await database.select().from(walletCreditLots)
      .where(and(eq(walletCreditLots.walletId, wallet.id), eq(walletCreditLots.bucket, "purchased")))
      .orderBy(walletCreditLots.grantedAt, walletCreditLots.id);
    const allocations = await database.select().from(walletSpendAllocations)
      .where(eq(walletSpendAllocations.spendTransactionId, spend.value.transactionId));
    expect(lots).toMatchObject([
      { grantTransactionId: firstGrant.value.transactionId, grantedLa: 300, remainingLa: 0 },
      { grantTransactionId: secondGrant.value.transactionId, grantedLa: 300, remainingLa: 0 },
    ]);
    expect(allocations.filter((allocation) => allocation.bucket === "purchased")).toEqual([
      expect.objectContaining({ creditLotId: lots[0]!.id, amountLa: 300, recognizedVnd: 29000 }),
      expect.objectContaining({ creditLotId: lots[1]!.id, amountLa: 300, recognizedVnd: 29000 }),
    ]);
  });

  it("rejects actor spoofing, corrupted reconciliation, and invalid continuations without partial writes", async () => {
    const auditActorId = await createAccount("wallet-closed-audit");
    const ownerId = await createAccount("wallet-closed-owner");
    const actor = accountActor(ownerId);
    const { authority, repository } = trustedRepository(auditActorId);
    const grant = await repository.grant({
      targetOwnerId: ownerId,
      grant: promotionalGrant(auditActorId, `closed-grant-${randomUUID()}`, 500),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!grant.ok) throw new Error("expected grant");
    const intentId = await insertIntent(ownerId);
    expect(await repository.spend({
      actor,
      spend: {
        kind: "spend", actorId: "spoofed", reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey: randomUUID(), purchaseIntentId: intentId, amountLa: 240, expectedWalletVersion: 2,
      },
    })).toMatchObject({ ok: false, error: { code: "WALLET_INVALID_COMMAND" } });

    const [wallet] = await database.select().from(walletAccounts).where(eq(walletAccounts.ownerId, ownerId));
    const before = await database.select().from(walletTransactions).where(eq(walletTransactions.walletId, wallet!.id));
    const rollbackIntentId = await insertIntent(ownerId);
    await expect(repository.spend({
      actor,
      spend: {
        kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey: randomUUID(), purchaseIntentId: rollbackIntentId, amountLa: 240, expectedWalletVersion: 2,
      },
      continuation: async () => ({ invalid: true }),
      continuationResultCodec: reservationCodec(),
    })).resolves.toMatchObject({ ok: false, error: { code: "WALLET_INVALID_COMMAND" } });
    expect(await database.select().from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet!.id))).toHaveLength(before.length);

    await database.update(walletAccounts).set({ promotionalBalance: 499 }).where(eq(walletAccounts.id, wallet!.id));
    const reconciliationIntentId = await insertIntent(ownerId);
    expect(await repository.spend({
      actor,
      spend: {
        kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey: randomUUID(), purchaseIntentId: reconciliationIntentId, amountLa: 240, expectedWalletVersion: 2,
      },
    })).toMatchObject({ ok: false, error: { code: "WALLET_RECONCILIATION_FAILED" } });
  });

  it("rolls back every spend write when an executed continuation throws", async () => {
    const auditActorId = await createAccount("wallet-throwing-continuation-audit");
    const ownerId = await createAccount("wallet-throwing-continuation-owner");
    const actor = accountActor(ownerId);
    const { authority, repository } = trustedRepository(auditActorId);
    const grant = await repository.grant({
      targetOwnerId: ownerId,
      grant: promotionalGrant(auditActorId, `throwing-continuation-grant-${randomUUID()}`, 500),
      topUpOrderId: null,
      trustedGrantToken: authority.token,
    });
    if (!grant.ok) throw new Error("expected grant");
    const wallet = await walletFor(ownerId);
    const [lot] = await database.select().from(walletCreditLots).where(eq(walletCreditLots.walletId, wallet.id));
    const before = {
      wallet,
      remainingLa: lot!.remainingLa,
      transactions: await database.select().from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id)),
      allocations: await database.select().from(walletSpendAllocations),
      ledger: await database.select().from(walletLedgerEntries),
      receipts: await database.select().from(walletCommandReceipts).where(eq(walletCommandReceipts.walletId, wallet.id)),
      audits: await database.select().from(auditLogs).where(eq(auditLogs.targetId, wallet.id)),
    };
    const intentId = await insertIntent(ownerId);
    const idempotencyKey = `throwing-continuation-${randomUUID()}`;

    await expect(repository.spend({
      actor,
      spend: {
        kind: "spend", actorId: ownerId, reasonCode: "wallet.report.unlock", requestId: randomUUID(), traceId: randomUUID(),
        idempotencyKey, purchaseIntentId: intentId, amountLa: 240, expectedWalletVersion: 2,
      },
      continuation: async () => {
        throw new Error("continuation failed");
      },
      continuationResultCodec: reservationCodec(),
    })).rejects.toThrow("continuation failed");

    expect(await walletFor(ownerId)).toMatchObject({
      id: before.wallet.id,
      purchasedBalance: before.wallet.purchasedBalance,
      promotionalBalance: before.wallet.promotionalBalance,
      stateVersion: before.wallet.stateVersion,
    });
    expect((await database.select().from(walletCreditLots).where(eq(walletCreditLots.id, lot!.id)))[0]?.remainingLa)
      .toBe(before.remainingLa);
    expect(await database.select().from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id)))
      .toHaveLength(before.transactions.length);
    expect(await database.select().from(walletSpendAllocations)).toHaveLength(before.allocations.length);
    expect(await database.select().from(walletLedgerEntries)).toHaveLength(before.ledger.length);
    expect(await database.select().from(walletCommandReceipts)
      .where(and(eq(walletCommandReceipts.walletId, wallet.id), eq(walletCommandReceipts.idempotencyKey, idempotencyKey)))).toHaveLength(0);
    expect(await database.select().from(auditLogs).where(eq(auditLogs.targetId, wallet.id)))
      .toHaveLength(before.audits.length);
  });
});
