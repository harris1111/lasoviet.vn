import { sql } from "drizzle-orm";
import {
  index,
  integer,
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
  invoiceNumber: text("invoice_number").notNull(),
  chartId: text("chart_id").notNull(),
  chartVersionId: text("chart_version_id").notNull(),
  ownerId: text("owner_id").notNull(),
  sku: text("sku").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  locale: text("locale").notNull(),
  status: commerceOrderStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
}, (table) => [
  uniqueIndex("commerce_orders_invoice_unique").on(table.invoiceNumber),
  uniqueIndex("commerce_orders_chart_sku_unique")
    .on(table.chartId, table.sku)
    .where(sql`${table.status} = 'pending'`),
  index("commerce_orders_owner_idx").on(table.ownerId),
]);

export const commercePaymentEvents = pgTable("commerce_payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => commerceOrders.id),
  providerEventId: text("provider_event_id").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("commerce_entitlements_order_unique").on(table.orderId),
  uniqueIndex("commerce_entitlements_chart_sku_unique").on(table.chartId, table.sku),
]);
