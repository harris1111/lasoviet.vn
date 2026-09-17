import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const generatedPreviewRequests = pgTable("generated_preview_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  chartVersionId: text("chart_version_id").notNull(),
  sourceReference: uuid("source_reference").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("requested"),
  budgetReservationId: text("budget_reservation_id"),
  stateVersion: integer("state_version").notNull().default(1),
  leaseToken: text("lease_token"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true, mode: "date" }),
  failureCode: text("failure_code"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("generated_preview_requests_chart_version_unique").on(table.chartVersionId),
  index("generated_preview_requests_claim_idx").on(table.status, table.leaseExpiresAt),
  check("generated_preview_requests_valid", sql`${table.status} IN ('requested', 'generating', 'ready', 'budget_exhausted', 'terminal_failure') AND ${table.stateVersion} > 0`),
]);

export const generatedPreviewSections = pgTable("generated_preview_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => generatedPreviewRequests.id, { onDelete: "restrict" }),
  sectionId: text("section_id").notNull(),
  ordinal: integer("ordinal").notNull(),
  status: text("status").notNull().default("requested"),
  safeExcerpt: text("safe_excerpt"),
  teaser: text("teaser").notNull(),
  contentHash: text("content_hash"),
  generationAttempts: integer("generation_attempts").notNull().default(0),
  rewriteAttempts: integer("rewrite_attempts").notNull().default(0),
  failureCode: text("failure_code"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("generated_preview_sections_request_section_unique").on(table.requestId, table.sectionId),
  uniqueIndex("generated_preview_sections_request_ordinal_unique").on(table.requestId, table.ordinal),
  check("generated_preview_sections_valid", sql`${table.ordinal} >= 0 AND ${table.ordinal} < 3 AND ${table.status} IN ('requested', 'generating', 'ready', 'budget_exhausted', 'terminal_failure') AND char_length(${table.teaser}) BETWEEN 1 AND 520 AND (${table.safeExcerpt} IS NULL OR char_length(${table.safeExcerpt}) BETWEEN 280 AND 520) AND ${table.generationAttempts} >= 0 AND ${table.rewriteAttempts} BETWEEN 0 AND 1`),
]);
