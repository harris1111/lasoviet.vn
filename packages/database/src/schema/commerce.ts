import {
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

import { ziweiChartVersions, ziweiCharts } from "./birth-profile.js";

export const commerceOrderStatus = pgEnum("commerce_order_status", [
  "pending", "paid", "expired", "failed", "refunded",
]);

export const commerceOrders = pgTable("commerce_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  chartId: text("chart_id").notNull().references(() => ziweiCharts.id),
  chartVersionId: text("chart_version_id").notNull().references(() => ziweiChartVersions.id),
  ownerId: text("owner_id").notNull(),
  sku: text("sku").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  status: commerceOrderStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
}, (table) => [
  uniqueIndex("commerce_orders_invoice_unique").on(table.invoiceNumber),
  uniqueIndex("commerce_orders_chart_sku_unique").on(table.chartId, table.sku),
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
  chartId: text("chart_id").notNull().references(() => ziweiCharts.id),
  sku: text("sku").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("commerce_entitlements_order_unique").on(table.orderId),
  uniqueIndex("commerce_entitlements_chart_sku_unique").on(table.chartId, table.sku),
]);

export const reportReservations = pgTable("report_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").notNull(),
  reportVersionId: uuid("report_version_id").notNull(),
  entitlementId: uuid("entitlement_id").notNull().references(() => commerceEntitlements.id),
  chartVersionId: text("chart_version_id").notNull().references(() => ziweiChartVersions.id),
  evidenceVersionId: text("evidence_version_id").notNull(),
  knowledgeVersionId: text("knowledge_version_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
  reportConfigVersion: text("report_config_version").notNull(),
  locale: text("locale").notNull(),
  sku: text("sku").notNull(),
  status: text("status").notNull().default("requested"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("report_reservations_entitlement_unique").on(table.entitlementId),
]);

export const reportQueueJobs = pgTable("report_queue_jobs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sourceEventId: text("source_event_id").notNull(),
  traceId: text("trace_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("waiting"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("report_queue_jobs_source_event_unique").on(table.sourceEventId),
  uniqueIndex("report_queue_jobs_idempotency_unique").on(table.idempotencyKey),
]);
