import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth.js";
import { ziweiCharts } from "./birth-profile.js";
import { commerceEntitlements } from "./commerce.js";
import { walletTransactions } from "./wallet-commerce.js";

export const partFeedbacks = pgTable("part_feedbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => authUsers.id),
  chartId: text("chart_id").notNull().references(() => ziweiCharts.id, { onDelete: "cascade" }),
  reportId: text("report_id"),
  partId: text("part_id").notNull(),
  rating: text("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  index("part_feedbacks_chart_part_idx").on(table.chartId, table.partId),
  index("part_feedbacks_user_idx").on(table.userId),
]);

export const guaranteeClaims = pgTable("guarantee_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  claimNumber: text("claim_number").notNull(),
  accountId: text("account_id").notNull().references(() => authUsers.id),
  entitlementId: uuid("entitlement_id").notNull().references(() => commerceEntitlements.id),
  spendTransactionId: uuid("spend_transaction_id").notNull().references(() => walletTransactions.id),
  restorationTransactionId: uuid("restoration_transaction_id").notNull().references(() => walletTransactions.id),
  feedbackId: uuid("feedback_id").notNull().references(() => partFeedbacks.id),
  chartId: text("chart_id").notNull(),
  sku: text("sku").notNull(),
  partId: text("part_id").notNull(),
  amountLa: integer("amount_la").notNull(),
  status: text("status").notNull().default("approved"),
  relatedPalaceId: text("related_palace_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  fingerprint: text("fingerprint").notNull(),
  resultPayload: jsonb("result_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("guarantee_claims_idempotency_unique").on(table.idempotencyKey),
  uniqueIndex("guarantee_claims_account_unique").on(table.accountId),
  uniqueIndex("guarantee_claims_claim_number_unique").on(table.claimNumber),
  uniqueIndex("guarantee_claims_spend_unique").on(table.spendTransactionId),
  uniqueIndex("guarantee_claims_entitlement_unique").on(table.entitlementId),
]);
