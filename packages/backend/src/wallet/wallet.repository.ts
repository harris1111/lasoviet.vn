import { createHash } from "node:crypto";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  resolveProductTitle,
  type CurrentActor,
  type WalletBalanceV1,
  type WalletGrantV1,
  type WalletHistoryV1,
  type WalletRestorationV1,
  type WalletSpendAllocationV1,
  type WalletSpendV1,
  WalletTransactionReceiptV1Schema,
  type WalletTransactionReceiptV1,
  WalletTopUpCatalogV1,
} from "@lasoviet/contracts";
import {
  auditLogs,
  authUsers,
  commerceOrders,
  type Database,
  walletAccounts,
  walletCommandReceipts,
  walletCreditLots,
  walletLedgerEntries,
  walletPurchaseIntents,
  walletRestorationAllocations,
  walletSpendAllocations,
  walletTransactions,
} from "@lasoviet/database";

export type WalletError =
  | "WALLET_ACCOUNT_REQUIRED"
  | "WALLET_ACCOUNT_INELIGIBLE"
  | "WALLET_NOT_FOUND"
  | "WALLET_INSUFFICIENT_BALANCE"
  | "WALLET_VERSION_CONFLICT"
  | "WALLET_INVALID_INTENT"
  | "WALLET_IDEMPOTENCY_KEY_REUSED"
  | "WALLET_RECONCILIATION_FAILED"
  | "WALLET_RESTORATION_INVALID"
  | "WALLET_ALREADY_RESTORED"
  | "WALLET_TOP_UP_CONFLICT"
  | "WALLET_INVALID_COMMAND";

export type WalletResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: WalletError; messageKey: string; retryable: false } };

export type WalletSpendMetadata = {
  walletId: string;
  spendTransactionId: string;
  intent: { id: string; sku: string; chartVersionId: string; amountLa: number };
  allocations: WalletSpendAllocationV1[];
  balance: WalletBalanceV1;
  stateVersion: number;
};

export type WalletSpendContinuation<T = Record<string, never>> = (
  transaction: Database,
  metadata: WalletSpendMetadata,
) => Promise<T>;

export type WalletResultCodec<T> = {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
};

const emptyContinuationCodec: WalletResultCodec<Record<string, never>> = {
  safeParse(value) {
    if (value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
      return { success: true, data: {} };
    }
    return { success: false };
  },
};

export type TrustedGrantAuthority = {
  token: object;
  actorId: string;
};

export type WalletGrantCommand = {
  targetOwnerId: string;
  grant: WalletGrantV1;
  topUpOrderId: string | null;
  trustedGrantToken: object;
};

export type WalletSpendCommand<T = Record<string, never>> = {
  actor: CurrentActor;
  spend: WalletSpendV1;
  continuation?: WalletSpendContinuation<T>;
  continuationOperation?: string;
  continuationResultCodec?: WalletResultCodec<T>;
};

export type WalletRestorationCommand = {
  actor: CurrentActor;
  restoration: WalletRestorationV1;
};

type StoredCommandResult = {
  receipt: WalletTransactionReceiptV1;
  continuation: unknown;
};

function failure<T = never>(code: WalletError): WalletResult<T> {
  return { ok: false, error: { code, messageKey: `wallet.${code.toLowerCase()}`, retryable: false } };
}

class WalletCommandAbort extends Error {
  constructor(readonly code: WalletError) {
    super(code);
  }
}

function abort(code: WalletError): never {
  throw new WalletCommandAbort(code);
}

export type WalletSpendContinuationAbortCode =
  | "WALLET_INVALID_INTENT"
  | "WALLET_RECONCILIATION_FAILED";

export function abortWalletSpendContinuation(code: WalletSpendContinuationAbortCode): never {
  throw new WalletCommandAbort(code);
}

export function walletFingerprint(command: Record<string, unknown>): string {
  const canonical = JSON.stringify(canonicalize(command));
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function balance(wallet: typeof walletAccounts.$inferSelect): WalletBalanceV1 {
  return {
    version: 1,
    purchasedLa: wallet.purchasedBalance,
    promotionalLa: wallet.promotionalBalance,
    totalLa: wallet.purchasedBalance + wallet.promotionalBalance,
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

function zeroBalance(now: Date): WalletBalanceV1 {
  return {
    version: 1,
    purchasedLa: 0,
    promotionalLa: 0,
    totalLa: 0,
    updatedAt: now.toISOString(),
  };
}

async function accountEligible(
  database: Database,
  actor: CurrentActor,
  lock = false,
): Promise<"ok" | WalletError> {
  if (actor.kind !== "account") return "WALLET_ACCOUNT_REQUIRED";
  return accountOwnerEligible(database, actor.userId, lock);
}

async function accountOwnerEligible(
  database: Database,
  ownerId: string,
  lock = false,
): Promise<"ok" | WalletError> {
  let query = database.select({ emailVerified: authUsers.emailVerified, isAnonymous: authUsers.isAnonymous })
    .from(authUsers).where(eq(authUsers.id, ownerId)).limit(1);
  if (lock) query = query.for("update") as typeof query;
  const [account] = await query;
  if (account === undefined || account.isAnonymous || !account.emailVerified) return "WALLET_ACCOUNT_INELIGIBLE";
  return "ok";
}

async function reconcile(
  database: Database,
  wallet: typeof walletAccounts.$inferSelect,
): Promise<boolean> {
  const [ledger] = await database.select({
    purchased: sql<number>`coalesce(sum(${walletLedgerEntries.amountLa}) filter (where ${walletLedgerEntries.bucket} = 'purchased'), 0)`,
    promotional: sql<number>`coalesce(sum(${walletLedgerEntries.amountLa}) filter (where ${walletLedgerEntries.bucket} = 'promotional'), 0)`,
  }).from(walletLedgerEntries)
    .innerJoin(walletTransactions, eq(walletTransactions.id, walletLedgerEntries.transactionId))
    .where(eq(walletTransactions.walletId, wallet.id));
  const [lots] = await database.select({
    purchased: sql<number>`coalesce(sum(${walletCreditLots.remainingLa}) filter (where ${walletCreditLots.bucket} = 'purchased'), 0)`,
    promotional: sql<number>`coalesce(sum(${walletCreditLots.remainingLa}) filter (where ${walletCreditLots.bucket} = 'promotional'), 0)`,
  }).from(walletCreditLots).where(eq(walletCreditLots.walletId, wallet.id));
  const values = [ledger?.purchased, ledger?.promotional, lots?.purchased, lots?.promotional].map(safeNonnegativeInteger);
  if (values.some((value) => value === undefined)) return false;
  const [ledgerPurchased, ledgerPromotional, lotPurchased, lotPromotional] = values as number[];
  return ledgerPurchased === wallet.purchasedBalance &&
    ledgerPromotional === wallet.promotionalBalance &&
    lotPurchased === wallet.purchasedBalance &&
    lotPromotional === wallet.promotionalBalance;
}

function safeNonnegativeInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function safeInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function publicHistoryId(transactionId: string): string {
  return `wh_${createHash("sha256").update(`lasoviet.wallet.history.v1:${transactionId}`).digest("hex").slice(0, 32)}`;
}

function receipt(
  commandId: string,
  transactionId: string,
  commandBalance: WalletBalanceV1,
  now: Date,
  status: "completed" | "replayed" = "completed",
): WalletTransactionReceiptV1 {
  return { version: 1, commandId, transactionId, status, balance: commandBalance, completedAt: now.toISOString() };
}

function storedReplay(value: unknown): StoredCommandResult | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Partial<StoredCommandResult>;
  const parsed = WalletTransactionReceiptV1Schema.safeParse(candidate.receipt);
  if (!parsed.success || !("continuation" in candidate)) return undefined;
  return { receipt: parsed.data, continuation: candidate.continuation };
}

async function replayReceipt(
  database: Database,
  walletId: string,
  key: string,
  fingerprint: string,
): Promise<WalletResult<StoredCommandResult> | undefined> {
  const [existing] = await database.select().from(walletCommandReceipts)
    .where(and(eq(walletCommandReceipts.walletId, walletId), eq(walletCommandReceipts.idempotencyKey, key)))
    .limit(1).for("update");
  if (existing === undefined) return undefined;
  if (existing.fingerprint !== fingerprint) return failure("WALLET_IDEMPOTENCY_KEY_REUSED");
  const result = storedReplay(existing.result);
  if (result === undefined || result.receipt.transactionId !== existing.transactionId || result.receipt.commandId !== key ||
    result.receipt.balance.totalLa !== result.receipt.balance.purchasedLa + result.receipt.balance.promotionalLa) {
    return failure("WALLET_RECONCILIATION_FAILED");
  }
  return {
    ok: true,
    value: {
      ...result,
      receipt: { ...result.receipt, status: "replayed" },
    },
  };
}

async function writeAudit(
  database: Database,
  actorId: string,
  action: "wallet.grant" | "wallet.spend" | "wallet.restoration",
  walletId: string,
  reasonCode: string,
  requestId: string,
  traceId: string,
  beforeVersion: number,
  afterVersion: number,
  purchasedDelta: number,
  promotionalDelta: number,
) {
  await database.insert(auditLogs).values({
    actorId,
    action,
    targetType: "wallet",
    targetId: walletId,
    reasonCode,
    requestId,
    metadata: {
      traceId,
      beforeVersion,
      afterVersion,
      purchasedDelta,
      promotionalDelta,
      outcome: "completed",
    },
  });
}

export function createDatabaseWalletRepository(
  database: Database,
  options: { now?: () => Date; trustedGrantAuthority?: TrustedGrantAuthority } = {},
) {
  const now = options.now ?? (() => new Date());

  async function mutate<T>(operation: (transaction: Database) => Promise<WalletResult<T>>): Promise<WalletResult<T>> {
    try {
      return await database.transaction(operation);
    } catch (error) {
      if (error instanceof WalletCommandAbort) return failure(error.code);
      throw error;
    }
  }

  async function lockedWallet(transaction: Database, ownerId: string) {
    const [wallet] = await transaction.select().from(walletAccounts)
      .where(eq(walletAccounts.ownerId, ownerId)).limit(1).for("update");
    return wallet;
  }

  return {
    async readBalance(actor: CurrentActor): Promise<WalletResult<WalletBalanceV1>> {
      const authority = await accountEligible(database, actor);
      if (authority !== "ok") return failure(authority);
      if (actor.kind !== "account") return failure("WALLET_ACCOUNT_REQUIRED");
      const [wallet] = await database.select().from(walletAccounts)
        .where(eq(walletAccounts.ownerId, actor.userId)).limit(1);
      if (wallet === undefined) return { ok: true, value: zeroBalance(now()) };
      if (!await reconcile(database, wallet)) return failure("WALLET_RECONCILIATION_FAILED");
      return { ok: true, value: balance(wallet) };
    },

    async readHistory(actor: CurrentActor): Promise<WalletResult<WalletHistoryV1>> {
      if (actor.kind !== "account") return failure("WALLET_ACCOUNT_REQUIRED");
      const current = await this.readBalance(actor);
      if (!current.ok) return current;
      const ownerId = actor.userId;
      const [wallet] = await database.select().from(walletAccounts)
        .where(eq(walletAccounts.ownerId, ownerId)).limit(1);
      if (wallet === undefined) return { ok: true, value: { version: 1, balance: current.value, items: [] } };
      const rows = await database.select({
        transaction: walletTransactions,
        purchased: sql<number>`coalesce(sum(${walletLedgerEntries.amountLa}) filter (where ${walletLedgerEntries.bucket} = 'purchased'), 0)`,
        promotional: sql<number>`coalesce(sum(${walletLedgerEntries.amountLa}) filter (where ${walletLedgerEntries.bucket} = 'promotional'), 0)`,
        sku: walletPurchaseIntents.sku,
      }).from(walletTransactions)
        .leftJoin(walletLedgerEntries, eq(walletLedgerEntries.transactionId, walletTransactions.id))
        .leftJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId))
        .where(eq(walletTransactions.walletId, wallet.id))
        .groupBy(walletTransactions.id, walletPurchaseIntents.sku)
        .orderBy(asc(walletTransactions.createdAt), asc(walletTransactions.id));
      const reversalIds = rows.flatMap((row) => row.transaction.reversalOfTransactionId === null
        ? [] : [row.transaction.reversalOfTransactionId]);
      const originalSkus = reversalIds.length === 0 ? [] : await database.select({
        id: walletTransactions.id,
        sku: walletPurchaseIntents.sku,
      }).from(walletTransactions)
        .innerJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId))
        .where(inArray(walletTransactions.id, reversalIds));
      const originalSkuBySpendId = new Map(originalSkus.map((row) => [row.id, row.sku]));
      let purchased = 0;
      let promotional = 0;
      const items: WalletHistoryV1["items"] = [];
      for (const row of rows) {
        const purchasedDelta = safeInteger(row.purchased);
        const promotionalDelta = safeInteger(row.promotional);
        if (purchasedDelta === undefined || promotionalDelta === undefined) return failure("WALLET_RECONCILIATION_FAILED");
        purchased += purchasedDelta;
        promotional += promotionalDelta;
        const candidateSku = row.transaction.kind === "restoration"
          ? originalSkuBySpendId.get(row.transaction.reversalOfTransactionId!)
          : row.sku;
        const sku = candidateSku === "ZIWEI-IDENTITY-P0" || candidateSku === "ZIWEI-NATAL-EXCERPT-P0" ? candidateSku : null;
        items.push({
          id: publicHistoryId(row.transaction.id),
          category: row.transaction.kind as "grant" | "spend" | "restoration",
          laDelta: purchasedDelta + promotionalDelta,
          resultingPurchasedLa: purchased,
          resultingPromotionalLa: promotional,
          productTitle: sku === null ? null : resolveProductTitle(sku, "vi"),
          occurredAt: row.transaction.createdAt.toISOString(),
        });
      }
      return { ok: true, value: { version: 1, balance: current.value, items } };
    },

    async grant(command: WalletGrantCommand): Promise<WalletResult<WalletTransactionReceiptV1>> {
      const { targetOwnerId, grant, topUpOrderId } = command;
      const configuredGrantAuthority = options.trustedGrantAuthority;
      if (configuredGrantAuthority === undefined || command.trustedGrantToken !== configuredGrantAuthority.token ||
        grant.actorId !== configuredGrantAuthority.actorId) {
        return failure("WALLET_INVALID_COMMAND");
      }
      if ((grant.topUpPackId === null) !== (topUpOrderId === null)) return failure("WALLET_INVALID_COMMAND");
      const fingerprint = walletFingerprint({
        operation: "wallet.grant", targetOwnerId, topUpOrderId, grant: {
          actorId: grant.actorId, purchasedLa: grant.purchasedLa, promotionalLa: grant.promotionalLa,
          topUpPackId: grant.topUpPackId, reasonCode: grant.reasonCode, idempotencyKey: grant.idempotencyKey,
        },
      });
      return mutate(async (transaction) => {
        const auditAuthority = await accountOwnerEligible(transaction, configuredGrantAuthority.actorId, true);
        if (auditAuthority !== "ok") return failure("WALLET_INVALID_COMMAND");
        const authority = await accountOwnerEligible(transaction, targetOwnerId, true);
        if (authority !== "ok") return failure(authority);
        await transaction.insert(walletAccounts).values({ ownerId: targetOwnerId }).onConflictDoNothing();
        const wallet = await lockedWallet(transaction, targetOwnerId);
        if (wallet === undefined) return failure("WALLET_NOT_FOUND");
        if (!await reconcile(transaction, wallet)) return failure("WALLET_RECONCILIATION_FAILED");
        if (topUpOrderId !== null) {
          const [order] = await transaction.select().from(commerceOrders)
            .where(eq(commerceOrders.id, topUpOrderId)).limit(1).for("update");
          const pack = WalletTopUpCatalogV1.find((candidate) => candidate.id === grant.topUpPackId);
          if (order === undefined || pack === undefined || order.ownerId !== targetOwnerId || order.kind !== "wallet_topup" ||
            order.status !== "paid" || order.currency !== "VND" || order.sku !== pack.id || order.amount !== pack.vndAmount ||
            grant.purchasedLa !== pack.purchasedLa || grant.promotionalLa !== pack.promotionalLa) {
            return failure("WALLET_INVALID_INTENT");
          }
          const [existingGrant] = await transaction.select().from(walletTransactions)
            .where(eq(walletTransactions.topUpOrderId, order.id)).limit(1).for("update");
          if (existingGrant !== undefined && (existingGrant.walletId !== wallet.id || existingGrant.idempotencyKey !== grant.idempotencyKey ||
            existingGrant.fingerprint !== fingerprint)) return failure("WALLET_TOP_UP_CONFLICT");
        }
        const replay = await replayReceipt(transaction, wallet.id, grant.idempotencyKey, fingerprint);
        if (replay !== undefined) return replay.ok ? { ok: true, value: replay.value.receipt } : replay;
        const [entry] = await transaction.insert(walletTransactions).values({
          walletId: wallet.id, kind: "grant", idempotencyKey: grant.idempotencyKey, fingerprint, topUpOrderId,
        }).returning();
        if (entry === undefined) return failure("WALLET_INVALID_COMMAND");
        const ledger = [
          grant.purchasedLa > 0 ? { transactionId: entry.id, bucket: "purchased", amountLa: grant.purchasedLa } : undefined,
          grant.promotionalLa > 0 ? { transactionId: entry.id, bucket: "promotional", amountLa: grant.promotionalLa } : undefined,
        ].filter((item): item is { transactionId: string; bucket: string; amountLa: number } => item !== undefined);
        await transaction.insert(walletLedgerEntries).values(ledger);
        await transaction.insert(walletCreditLots).values(ledger.map((item) => ({
          walletId: wallet.id, grantTransactionId: entry.id, bucket: item.bucket, grantedLa: item.amountLa, remainingLa: item.amountLa, grantedAt: now(),
        })));
        const [updated] = await transaction.update(walletAccounts).set({
          purchasedBalance: wallet.purchasedBalance + grant.purchasedLa,
          promotionalBalance: wallet.promotionalBalance + grant.promotionalLa,
          stateVersion: wallet.stateVersion + 1,
          updatedAt: now(),
        }).where(eq(walletAccounts.id, wallet.id)).returning();
        if (updated === undefined) return failure("WALLET_NOT_FOUND");
        const commandReceipt = receipt(grant.idempotencyKey, entry.id, balance(updated), now());
        await transaction.insert(walletCommandReceipts).values({
          walletId: wallet.id, idempotencyKey: grant.idempotencyKey, fingerprint, transactionId: entry.id,
          result: { receipt: commandReceipt, continuation: {} },
        });
        await writeAudit(transaction, grant.actorId, "wallet.grant", wallet.id, grant.reasonCode, grant.requestId, grant.traceId,
          wallet.stateVersion, updated.stateVersion, grant.purchasedLa, grant.promotionalLa);
        return { ok: true, value: commandReceipt };
      });
    },

    async spend<T = Record<string, never>>(command: WalletSpendCommand<T>): Promise<WalletResult<WalletTransactionReceiptV1 & { continuation?: T }>> {
      const { actor, spend, continuationOperation = "wallet.spend.v1" } = command;
      const continuation = command.continuation;
      const continuationResultCodec = command.continuationResultCodec;
      if (actor.kind !== "account") return failure("WALLET_ACCOUNT_REQUIRED");
      if (spend.actorId !== actor.userId) return failure("WALLET_INVALID_COMMAND");
      if (continuation !== undefined && continuationResultCodec === undefined) return failure("WALLET_INVALID_COMMAND");
      const fingerprint = walletFingerprint({
        operation: continuationOperation, ownerId: actor.userId, actorId: spend.actorId, purchaseIntentId: spend.purchaseIntentId,
        amountLa: spend.amountLa, expectedWalletVersion: spend.expectedWalletVersion, reasonCode: spend.reasonCode, idempotencyKey: spend.idempotencyKey,
      });
      return mutate(async (transaction) => {
        const authority = await accountEligible(transaction, actor, true);
        if (authority !== "ok") return failure(authority);
        const wallet = await lockedWallet(transaction, actor.userId);
        if (wallet === undefined) return failure("WALLET_NOT_FOUND");
        if (!await reconcile(transaction, wallet)) return failure("WALLET_RECONCILIATION_FAILED");
        const replay = await replayReceipt(transaction, wallet.id, spend.idempotencyKey, fingerprint);
        if (replay !== undefined) {
          if (!replay.ok) return replay;
          if (continuation === undefined) {
            if (!emptyContinuationCodec.safeParse(replay.value.continuation).success) return failure("WALLET_RECONCILIATION_FAILED");
            return { ok: true, value: replay.value.receipt };
          }
          const parsed = continuationResultCodec!.safeParse(replay.value.continuation);
          if (!parsed.success) return failure("WALLET_RECONCILIATION_FAILED");
          return { ok: true, value: { ...replay.value.receipt, continuation: parsed.data } };
        }
        if (wallet.stateVersion !== spend.expectedWalletVersion) return failure("WALLET_VERSION_CONFLICT");
        const [intent] = await transaction.select().from(walletPurchaseIntents)
          .where(and(eq(walletPurchaseIntents.id, spend.purchaseIntentId), eq(walletPurchaseIntents.ownerId, actor.userId)))
          .limit(1).for("update");
        if (intent === undefined || intent.status !== "pending" || intent.priceLa !== spend.amountLa) return failure("WALLET_INVALID_INTENT");
        const lots = await transaction.select().from(walletCreditLots)
          .where(and(eq(walletCreditLots.walletId, wallet.id), sql`${walletCreditLots.remainingLa} > 0`))
          .orderBy(asc(sql`case when ${walletCreditLots.bucket} = 'promotional' then 0 else 1 end`), asc(walletCreditLots.grantedAt), asc(walletCreditLots.id))
          .for("update");
        if (lots.reduce((total, lot) => total + lot.remainingLa, 0) < spend.amountLa) return failure("WALLET_INSUFFICIENT_BALANCE");
        const [entry] = await transaction.insert(walletTransactions).values({
          walletId: wallet.id, kind: "spend", idempotencyKey: spend.idempotencyKey, fingerprint, purchaseIntentId: intent.id,
        }).returning();
        if (entry === undefined) return failure("WALLET_INVALID_COMMAND");
        let remaining = spend.amountLa;
        let purchasedDelta = 0;
        let promotionalDelta = 0;
        const allocations: WalletSpendAllocationV1[] = [];
        for (const lot of lots) {
          if (remaining === 0) break;
          const amountLa = Math.min(remaining, lot.remainingLa);
          remaining -= amountLa;
          if (lot.bucket === "promotional") promotionalDelta += amountLa;
          else purchasedDelta += amountLa;
          let recognizedVnd = 0;
          if (lot.bucket === "purchased") {
            const [grantOrder] = await transaction.select({ amount: commerceOrders.amount })
              .from(walletTransactions)
              .innerJoin(commerceOrders, eq(commerceOrders.id, walletTransactions.topUpOrderId))
              .where(eq(walletTransactions.id, lot.grantTransactionId))
              .limit(1);
            const [prior] = await transaction.select({
              amount: sql<number>`coalesce(sum(${walletSpendAllocations.purchasedLa}), 0)`,
              revenue: sql<number>`coalesce(sum(${walletSpendAllocations.recognizedVnd}), 0)`,
            }).from(walletSpendAllocations)
              .leftJoin(walletRestorationAllocations, eq(walletRestorationAllocations.spendAllocationId, walletSpendAllocations.id))
              .where(and(eq(walletSpendAllocations.creditLotId, lot.id), sql`${walletRestorationAllocations.id} is null`));
            const priorAmount = safeNonnegativeInteger(prior?.amount ?? 0);
            const priorRevenue = safeNonnegativeInteger(prior?.revenue ?? 0);
            const orderAmount = safeNonnegativeInteger(grantOrder?.amount ?? 0);
            if (priorAmount === undefined || priorRevenue === undefined || orderAmount === undefined) {
              return abort("WALLET_RECONCILIATION_FAILED");
            }
            recognizedVnd = Math.floor((priorAmount + amountLa) * orderAmount / lot.grantedLa) - priorRevenue;
            if (!Number.isSafeInteger(recognizedVnd) || recognizedVnd < 0) return abort("WALLET_RECONCILIATION_FAILED");
          }
          allocations.push({
            creditLotId: lot.id, bucket: lot.bucket as "purchased" | "promotional", amountLa,
            purchasedLa: lot.bucket === "purchased" ? amountLa : 0, recognizedVnd,
          });
          await transaction.update(walletCreditLots).set({ remainingLa: lot.remainingLa - amountLa }).where(eq(walletCreditLots.id, lot.id));
        }
        await transaction.insert(walletSpendAllocations).values(allocations.map((item) => ({
          spendTransactionId: entry.id, creditLotId: item.creditLotId, bucket: item.bucket, amountLa: item.amountLa,
          purchasedLa: item.purchasedLa, recognizedVnd: item.recognizedVnd,
        })));
        await transaction.insert(walletLedgerEntries).values([
          ...(purchasedDelta > 0 ? [{ transactionId: entry.id, bucket: "purchased", amountLa: -purchasedDelta }] : []),
          ...(promotionalDelta > 0 ? [{ transactionId: entry.id, bucket: "promotional", amountLa: -promotionalDelta }] : []),
        ]);
        const [updated] = await transaction.update(walletAccounts).set({
          purchasedBalance: wallet.purchasedBalance - purchasedDelta, promotionalBalance: wallet.promotionalBalance - promotionalDelta,
          stateVersion: wallet.stateVersion + 1, updatedAt: now(),
        }).where(eq(walletAccounts.id, wallet.id)).returning();
        if (updated === undefined) return failure("WALLET_NOT_FOUND");
        const currentBalance = balance(updated);
        const metadata: WalletSpendMetadata = {
          walletId: wallet.id, spendTransactionId: entry.id,
          intent: { id: intent.id, sku: intent.sku, chartVersionId: intent.chartVersionId, amountLa: intent.priceLa },
          allocations, balance: currentBalance, stateVersion: updated.stateVersion,
        };
        const commandReceipt = receipt(spend.idempotencyKey, entry.id, currentBalance, now());
        if (continuation === undefined) {
          const parsedContinuation = emptyContinuationCodec.safeParse({});
          if (!parsedContinuation.success) return abort("WALLET_INVALID_COMMAND");
          await transaction.insert(walletCommandReceipts).values({
            walletId: wallet.id, idempotencyKey: spend.idempotencyKey, fingerprint, transactionId: entry.id,
            result: { receipt: commandReceipt, continuation: parsedContinuation.data },
          });
          await writeAudit(transaction, actor.userId, "wallet.spend", wallet.id, spend.reasonCode, spend.requestId, spend.traceId,
            wallet.stateVersion, updated.stateVersion, -purchasedDelta, -promotionalDelta);
          return { ok: true, value: commandReceipt };
        }
        const parsedContinuation = continuationResultCodec!.safeParse(await continuation(transaction, metadata));
        if (!parsedContinuation.success) return abort("WALLET_INVALID_COMMAND");
        await transaction.insert(walletCommandReceipts).values({
          walletId: wallet.id, idempotencyKey: spend.idempotencyKey, fingerprint, transactionId: entry.id,
          result: { receipt: commandReceipt, continuation: parsedContinuation.data },
        });
        await writeAudit(transaction, actor.userId, "wallet.spend", wallet.id, spend.reasonCode, spend.requestId, spend.traceId,
          wallet.stateVersion, updated.stateVersion, -purchasedDelta, -promotionalDelta);
        return { ok: true, value: { ...commandReceipt, continuation: parsedContinuation.data } };
      });
    },

    async restore(command: WalletRestorationCommand): Promise<WalletResult<WalletTransactionReceiptV1>> {
      const { actor, restoration } = command;
      if (actor.kind !== "account") return failure("WALLET_ACCOUNT_REQUIRED");
      if (restoration.actorId !== actor.userId) return failure("WALLET_INVALID_COMMAND");
      const fingerprint = walletFingerprint({
        operation: "wallet.restoration", ownerId: actor.userId, actorId: restoration.actorId, originalSpendId: restoration.originalSpendId,
        expectedWalletVersion: restoration.expectedWalletVersion, reasonCode: restoration.reasonCode, idempotencyKey: restoration.idempotencyKey,
      });
      return mutate(async (transaction) => {
        const authority = await accountEligible(transaction, actor, true);
        if (authority !== "ok") return failure(authority);
        const wallet = await lockedWallet(transaction, actor.userId);
        if (wallet === undefined) return failure("WALLET_NOT_FOUND");
        if (!await reconcile(transaction, wallet)) return failure("WALLET_RECONCILIATION_FAILED");
        const replay = await replayReceipt(transaction, wallet.id, restoration.idempotencyKey, fingerprint);
        if (replay !== undefined) return replay.ok ? { ok: true, value: replay.value.receipt } : replay;
        if (wallet.stateVersion !== restoration.expectedWalletVersion) return failure("WALLET_VERSION_CONFLICT");
        const [original] = await transaction.select().from(walletTransactions).where(and(
          eq(walletTransactions.id, restoration.originalSpendId), eq(walletTransactions.walletId, wallet.id), eq(walletTransactions.kind, "spend"),
        )).limit(1).for("update");
        if (original === undefined) return failure("WALLET_RESTORATION_INVALID");
        const [previous] = await transaction.select({ id: walletTransactions.id }).from(walletTransactions)
          .where(eq(walletTransactions.reversalOfTransactionId, original.id)).limit(1).for("update");
        if (previous !== undefined) return failure("WALLET_ALREADY_RESTORED");
        const allocations = await transaction.select({ allocation: walletSpendAllocations, lot: walletCreditLots })
          .from(walletSpendAllocations).innerJoin(walletCreditLots, eq(walletCreditLots.id, walletSpendAllocations.creditLotId))
          .where(eq(walletSpendAllocations.spendTransactionId, original.id)).for("update");
        if (allocations.length === 0) return failure("WALLET_RESTORATION_INVALID");
        const [entry] = await transaction.insert(walletTransactions).values({
          walletId: wallet.id, kind: "restoration", idempotencyKey: restoration.idempotencyKey, fingerprint, reversalOfTransactionId: original.id,
        }).returning();
        if (entry === undefined) return failure("WALLET_RESTORATION_INVALID");
        let purchasedDelta = 0;
        let promotionalDelta = 0;
        for (const item of allocations) {
          const next = item.lot.remainingLa + item.allocation.amountLa;
          if (next > item.lot.grantedLa) return abort("WALLET_RESTORATION_INVALID");
          await transaction.update(walletCreditLots).set({ remainingLa: next }).where(eq(walletCreditLots.id, item.lot.id));
          await transaction.insert(walletRestorationAllocations).values({
            restorationTransactionId: entry.id, spendAllocationId: item.allocation.id,
          });
          if (item.allocation.bucket === "purchased") purchasedDelta += item.allocation.amountLa;
          else promotionalDelta += item.allocation.amountLa;
        }
        await transaction.insert(walletLedgerEntries).values([
          ...(purchasedDelta > 0 ? [{ transactionId: entry.id, bucket: "purchased", amountLa: purchasedDelta }] : []),
          ...(promotionalDelta > 0 ? [{ transactionId: entry.id, bucket: "promotional", amountLa: promotionalDelta }] : []),
        ]);
        const [updated] = await transaction.update(walletAccounts).set({
          purchasedBalance: wallet.purchasedBalance + purchasedDelta, promotionalBalance: wallet.promotionalBalance + promotionalDelta,
          stateVersion: wallet.stateVersion + 1, updatedAt: now(),
        }).where(eq(walletAccounts.id, wallet.id)).returning();
        if (updated === undefined) return failure("WALLET_NOT_FOUND");
        const commandReceipt = receipt(restoration.idempotencyKey, entry.id, balance(updated), now());
        await transaction.insert(walletCommandReceipts).values({
          walletId: wallet.id, idempotencyKey: restoration.idempotencyKey, fingerprint, transactionId: entry.id,
          result: { receipt: commandReceipt, continuation: {} },
        });
        await writeAudit(transaction, actor.userId, "wallet.restoration", wallet.id, restoration.reasonCode, restoration.requestId, restoration.traceId,
          wallet.stateVersion, updated.stateVersion, purchasedDelta, promotionalDelta);
        return { ok: true, value: commandReceipt };
      });
    },
  };
}

export type WalletRepository = ReturnType<typeof createDatabaseWalletRepository>;
