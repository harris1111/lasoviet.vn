import type { EntitlementScope } from "@lasoviet/contracts";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const commerceOrderStatus = pgEnum("commerce_order_status", [
  "pending", "paid", "expired", "failed", "refunded",
]);

export const commerceOrders = pgTable("commerce_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentCode: text("payment_code").notNull().default(sql`generate_payment_code()`),
  invoiceNumber: text("invoice_number").notNull(),
  chartId: text("chart_id").notNull(),
  chartVersionId: text("chart_version_id").notNull(),
  ownerId: text("owner_id").notNull(),
  sku: text("sku").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  locale: text("locale").notNull(),
  status: commerceOrderStatus("status").notNull().default("pending"),
  priceVariant: text("price_variant"),
  creditApplied: integer("credit_applied").notNull().default(0),
  creditedFromOrderId: uuid("credited_from_order_id").references((): any => commerceOrders.id),
  creditExpiresAt: timestamp("credit_expires_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
}, (table) => [
  check("commerce_orders_credit_applied_non_negative", sql`${table.creditApplied} >= 0`),
  check(
    "commerce_orders_credit_upgrade_consistency",
    sql`(${table.creditApplied} = 0 AND ${table.creditedFromOrderId} IS NULL) OR (${table.creditApplied} > 0 AND ${table.creditedFromOrderId} IS NOT NULL AND ${table.creditExpiresAt} IS NOT NULL AND ${table.sku} = 'ZIWEI-IDENTITY-P0' AND ${table.creditedFromOrderId} <> ${table.id})`,
  ),
  uniqueIndex("commerce_orders_payment_code_unique").on(table.paymentCode),
  uniqueIndex("commerce_orders_invoice_unique").on(table.invoiceNumber),
  uniqueIndex("commerce_orders_chart_sku_unique")
    .on(table.chartId, table.sku)
    .where(sql`${table.status} = 'pending'`),
  index("commerce_orders_owner_idx").on(table.ownerId),
  check("commerce_orders_payment_code_format", sql`${table.paymentCode} ~ '^LSV[0-9ABCDEFGHJKMNPQRSTVWXYZ]{9}$'`),
]);

export const commercePaymentEvents = pgTable("commerce_payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => commerceOrders.id),
  providerEventId: text("provider_event_id").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  matchMethod: text("match_method"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("commerce_payment_events_provider_unique").on(table.providerEventId),
  index("commerce_payment_events_order_idx").on(table.orderId),
]);

export const commerceEntitlements = pgTable("commerce_entitlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => commerceOrders.id),
  chartId: text("chart_id").notNull(),
  sku: text("sku").notNull(),
  ownerId: text("owner_id").notNull(),
  scope: jsonb("scope").$type<EntitlementScope>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("commerce_entitlements_order_unique").on(table.orderId),
  uniqueIndex("commerce_entitlements_chart_sku_unique").on(table.chartId, table.sku),
]);

export const commerceUnmatchedPayments = pgTable("commerce_unmatched_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerEventId: text("provider_event_id").notNull(),
  rawPayload: jsonb("raw_payload").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  claimedByOrderId: uuid("claimed_by_order_id").references(() => commerceOrders.id),
  claimedAt: timestamp("claimed_at", { withTimezone: true, mode: "date" }),
  staleAlertedAt: timestamp("stale_alerted_at", { withTimezone: true, mode: "date" }),
}, (table) => [
  uniqueIndex("commerce_unmatched_payments_provider_event_unique").on(table.providerEventId),
  index("commerce_unmatched_payments_received_claimed_idx").on(table.receivedAt, table.claimedAt),
  check("commerce_unmatched_payments_amount_positive", sql`${table.amount} > 0`),
]);

export const commerceReconciliationState = pgTable("commerce_reconciliation_state", {
  id: text("id").primaryKey(),
  circuitStatus: text("circuit_status").$type<"closed" | "open">().notNull().default("closed"),
  openedAt: timestamp("opened_at", { withTimezone: true, mode: "date" }),
  reasonCode: text("reason_code"),
  alertIdempotencyKey: text("alert_idempotency_key"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  check("commerce_reconciliation_state_singleton", sql`${table.id} = 'singleton'`),
  check("commerce_reconciliation_state_circuit_status", sql`${table.circuitStatus} IN ('closed', 'open')`),
]);

export const commerceAlertDeliveries = pgTable(
  "commerce_alert_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    alertKind: text("alert_kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    leasedUntil: timestamp("leased_until", { withTimezone: true, mode: "date" }),
    leaseToken: text("lease_token"),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("commerce_alert_deliveries_idempotency_unique").on(table.idempotencyKey),
    index("commerce_alert_deliveries_claim_idx").on(
      table.status,
      table.leasedUntil,
      table.createdAt,
    ),
  ],
);
