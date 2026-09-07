import { sql } from "drizzle-orm";
import {
  check,
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
  rewriteConsumedAt: timestamp("rewrite_consumed_at", { withTimezone: true, mode: "date" }),
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

export const reportVersions = pgTable("report_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").notNull(),
  reportVersionId: uuid("report_version_id").notNull(),
  entitlementId: uuid("entitlement_id").notNull().references(() => commerceEntitlements.id),
  chartVersionId: text("chart_version_id").notNull(),
  evidenceVersionId: text("evidence_version_id").notNull(),
  knowledgeVersionId: text("knowledge_version_id").notNull(),
  promptVersion: text("prompt_version").notNull(),
  reportConfigVersion: text("report_config_version").notNull(),
  templateVersion: text("template_version").notNull(),
  locale: text("locale").notNull(),
  sku: text("sku").notNull(),
  providerId: text("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  structuredContent: jsonb("structured_content").$type<Record<string, unknown>>().notNull(),
  htmlContent: text("html_content").notNull(),
  contentHash: text("content_hash").notNull(),
  pdfAssetId: uuid("pdf_asset_id").notNull(),
  renderVersion: text("render_version").notNull(),
  supersedesReportVersionId: uuid("supersedes_report_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("report_versions_version_unique").on(table.reportVersionId),
  uniqueIndex("report_versions_pdf_asset_unique").on(table.pdfAssetId),
  index("report_versions_report_idx").on(table.reportId, table.createdAt),
  index("report_versions_entitlement_idx").on(table.entitlementId),
  check(
    "report_versions_content_hash_format",
    sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`,
  ),
]);

export const reportGenerationAttempts = pgTable("report_generation_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportVersionId: uuid("report_version_id").notNull(),
  jobId: text("job_id").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  status: text("status").notNull(),
  providerId: text("provider_id"),
  modelId: text("model_id"),
  errorCode: text("error_code"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
}, (table) => [
  uniqueIndex("report_generation_attempts_job_attempt_unique").on(table.jobId, table.attemptNumber),
  index("report_generation_attempts_report_idx").on(table.reportVersionId, table.startedAt),
]);
