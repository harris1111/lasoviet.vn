import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth.js";
import { commerceOrders } from "./commerce.js";

export const walletAccounts = pgTable("wallet_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  purchasedBalance: integer("purchased_balance").notNull().default(0),
  promotionalBalance: integer("promotional_balance").notNull().default(0),
  stateVersion: integer("state_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("wallet_accounts_owner_unique").on(table.ownerId),
  check("wallet_accounts_nonnegative_balances", sql`${table.purchasedBalance} >= 0 AND ${table.promotionalBalance} >= 0 AND ${table.stateVersion} > 0`),
]);

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id").notNull().references(() => walletAccounts.id, { onDelete: "restrict" }),
  kind: text("kind").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  fingerprint: text("fingerprint").notNull(),
  purchaseIntentId: uuid("purchase_intent_id").references(() => walletPurchaseIntents.id, { onDelete: "restrict" }),
  topUpOrderId: uuid("top_up_order_id").references(() => commerceOrders.id, { onDelete: "restrict" }),
  reversalOfTransactionId: uuid("reversal_of_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("wallet_transactions_idempotency_unique").on(table.walletId, table.idempotencyKey),
  uniqueIndex("wallet_transactions_top_up_order_unique")
    .on(table.topUpOrderId)
    .where(sql`${table.topUpOrderId} IS NOT NULL`),
  uniqueIndex("wallet_transactions_reversal_unique").on(table.reversalOfTransactionId),
  foreignKey({
    columns: [table.reversalOfTransactionId],
    foreignColumns: [table.id],
    name: "wallet_transactions_reversal_of_transaction_id_wallet_transactions_id_fk",
  }).onDelete("restrict"),
  check("wallet_transactions_kind_valid", sql`${table.kind} IN ('grant', 'spend', 'restoration')`),
  check("wallet_transactions_lineage", sql`(${table.kind} = 'grant' AND ${table.purchaseIntentId} IS NULL AND ${table.reversalOfTransactionId} IS NULL) OR (${table.kind} = 'spend' AND ${table.purchaseIntentId} IS NOT NULL AND ${table.topUpOrderId} IS NULL AND ${table.reversalOfTransactionId} IS NULL) OR (${table.kind} = 'restoration' AND ${table.purchaseIntentId} IS NULL AND ${table.topUpOrderId} IS NULL AND ${table.reversalOfTransactionId} IS NOT NULL)`),
]);

export const walletLedgerEntries = pgTable("wallet_ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => walletTransactions.id, { onDelete: "restrict" }),
  bucket: text("bucket").notNull(),
  amountLa: integer("amount_la").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  index("wallet_ledger_entries_transaction_idx").on(table.transactionId),
  uniqueIndex("wallet_ledger_entries_transaction_bucket_unique").on(table.transactionId, table.bucket),
  check("wallet_ledger_entries_bucket_valid", sql`${table.bucket} IN ('purchased', 'promotional')`),
  check("wallet_ledger_entries_nonzero", sql`${table.amountLa} <> 0`),
]);

export const walletCreditLots = pgTable("wallet_credit_lots", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id").notNull().references(() => walletAccounts.id, { onDelete: "restrict" }),
  grantTransactionId: uuid("grant_transaction_id").notNull().references(() => walletTransactions.id, { onDelete: "restrict" }),
  bucket: text("bucket").notNull(),
  grantedLa: integer("granted_la").notNull(),
  remainingLa: integer("remaining_la").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
}, (table) => [
  index("wallet_credit_lots_fifo_idx").on(table.walletId, table.bucket, table.grantedAt, table.id),
  uniqueIndex("wallet_credit_lots_grant_bucket_unique").on(table.grantTransactionId, table.bucket),
  check("wallet_credit_lots_valid", sql`${table.bucket} IN ('purchased', 'promotional') AND ${table.grantedLa} > 0 AND ${table.remainingLa} >= 0 AND ${table.remainingLa} <= ${table.grantedLa} AND ${table.expiresAt} IS NULL`),
]);

export const walletSpendAllocations = pgTable("wallet_spend_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  spendTransactionId: uuid("spend_transaction_id").notNull().references(() => walletTransactions.id, { onDelete: "restrict" }),
  creditLotId: uuid("credit_lot_id").notNull().references(() => walletCreditLots.id, { onDelete: "restrict" }),
  bucket: text("bucket").notNull(),
  amountLa: integer("amount_la").notNull(),
  purchasedLa: integer("purchased_la").notNull().default(0),
  recognizedVnd: integer("recognized_vnd").notNull().default(0),
}, (table) => [
  uniqueIndex("wallet_spend_allocations_spend_lot_unique").on(table.spendTransactionId, table.creditLotId),
  check("wallet_spend_allocations_amounts_valid", sql`${table.amountLa} > 0 AND ${table.purchasedLa} >= 0 AND ${table.recognizedVnd} >= 0 AND ((${table.bucket} = 'promotional' AND ${table.purchasedLa} = 0 AND ${table.recognizedVnd} = 0) OR (${table.bucket} = 'purchased' AND ${table.purchasedLa} = ${table.amountLa}))`),
  check("wallet_spend_allocations_bucket_valid", sql`${table.bucket} IN ('purchased', 'promotional')`),
]);

export const walletRestorationAllocations = pgTable("wallet_restoration_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  restorationTransactionId: uuid("restoration_transaction_id").notNull().references(() => walletTransactions.id, { onDelete: "restrict" }),
  spendAllocationId: uuid("spend_allocation_id").notNull().references(() => walletSpendAllocations.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("wallet_restoration_allocations_restoration_allocation_unique").on(table.restorationTransactionId, table.spendAllocationId),
  uniqueIndex("wallet_restoration_allocations_spend_allocation_unique").on(table.spendAllocationId),
]);

export const walletPurchaseIntents = pgTable("wallet_purchase_intents", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull().references(() => authUsers.id, { onDelete: "restrict" }),
  chartId: text("chart_id").notNull(),
  chartVersionId: text("chart_version_id").notNull(),
  sku: text("sku").notNull(),
  locale: text("locale").notNull(),
  priceLa: integer("price_la").notNull(),
  status: text("status").notNull().default("pending"),
  stateVersion: integer("state_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
}, (table) => [
  uniqueIndex("wallet_purchase_intents_owner_chart_sku_pending_unique").on(table.ownerId, table.chartId, table.sku).where(sql`${table.status} = 'pending'`),
  check("wallet_purchase_intents_valid", sql`((${table.sku} = 'ZIWEI-NATAL-EXCERPT-P0' AND ${table.locale} = 'vi' AND ${table.priceLa} = 240) OR (${table.sku} = 'ZIWEI-IDENTITY-P0' AND ${table.locale} IN ('vi', 'en') AND ${table.priceLa} IN (720, 960))) AND ${table.status} IN ('pending', 'completed', 'cancelled', 'expired') AND ${table.stateVersion} > 0`),
]);

export const walletCommandReceipts = pgTable("wallet_command_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id").notNull().references(() => walletAccounts.id, { onDelete: "restrict" }),
  idempotencyKey: text("idempotency_key").notNull(),
  fingerprint: text("fingerprint").notNull(),
  transactionId: uuid("transaction_id").notNull().references(() => walletTransactions.id, { onDelete: "restrict" }),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [uniqueIndex("wallet_command_receipts_wallet_key_unique").on(table.walletId, table.idempotencyKey)]);
