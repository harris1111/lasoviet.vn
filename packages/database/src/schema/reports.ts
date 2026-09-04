import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { commerceEntitlements } from "./commerce.js";

export const reportReservations = pgTable("report_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").notNull(),
  reportVersionId: uuid("report_version_id").notNull(),
  entitlementId: uuid("entitlement_id").notNull().references(() => commerceEntitlements.id),
  chartVersionId: text("chart_version_id").notNull(),
  evidenceVersionId: text("evidence_version_id").notNull(),
  knowledgeVersionId: text("knowledge_version_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
  reportConfigVersion: text("report_config_version").notNull(),
  locale: text("locale").notNull(),
  sku: text("sku").notNull(),
  status: text("status").notNull().default("requested"),
  stateVersion: integer("state_version").notNull().default(1),
  attemptCount: integer("attempt_count").notNull().default(0),
  activeJobId: text("active_job_id"),
  lastErrorCode: text("last_error_code"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
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
  attemptCount: integer("attempt_count").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  leasedBy: text("leased_by"),
  leasedUntil: timestamp("leased_until", { withTimezone: true, mode: "date" }),
  lastErrorCode: text("last_error_code"),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("report_queue_jobs_source_event_unique").on(table.sourceEventId),
  uniqueIndex("report_queue_jobs_idempotency_unique").on(table.idempotencyKey),
  index("report_queue_jobs_waiting_claim_idx").on(table.status, table.availableAt),
  index("report_queue_jobs_expired_lease_idx").on(table.status, table.leasedUntil),
]);
