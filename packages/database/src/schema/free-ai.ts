import { sql } from "drizzle-orm";
import { bigint, check, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { FreePalaceGiftContentV1, FreePalaceGiftFactV1, FreePalaceGiftFrozenCallV1, FreeReadingFrozenCallV2, FreeReadingCandidateV2 } from "@lasoviet/contracts";

const money = (name: string) => bigint(name, { mode: "bigint" }).notNull().default(sql`0`);
const time = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const freeAiChartBudgets = pgTable("free_ai_chart_budgets", {
  chartVersionId: text("chart_version_id").primaryKey(),
  reservedMicroVnd: money("reserved_micro_vnd"), resolvedMicroVnd: money("resolved_micro_vnd"),
  unknownMicroVnd: money("unknown_micro_vnd"), deletionGeneration: integer("deletion_generation").notNull().default(0),
  deletedAt: time("deleted_at"), legacyReconciledAt: time("legacy_reconciled_at"),
}, (t) => [check("free_ai_chart_budget_nonnegative", sql`${t.reservedMicroVnd} >= 0 AND ${t.resolvedMicroVnd} >= 0 AND ${t.unknownMicroVnd} >= 0 AND ${t.deletionGeneration} >= 0`)]);

export const freeAiDailyBudgets = pgTable("free_ai_daily_budgets", {
  utcDay: date("utc_day", { mode: "string" }).primaryKey(),
  reservedMicroVnd: money("reserved_micro_vnd"), resolvedMicroVnd: money("resolved_micro_vnd"), unknownMicroVnd: money("unknown_micro_vnd"),
}, (t) => [check("free_ai_daily_budget_nonnegative", sql`${t.reservedMicroVnd} >= 0 AND ${t.resolvedMicroVnd} >= 0 AND ${t.unknownMicroVnd} >= 0`)]);

// Stable accounting identities deliberately have no cascading auth foreign key.
export const freeAiQuotaSubjects = pgTable("free_ai_quota_subjects", {
  id: uuid("id").defaultRandom().primaryKey(), kind: text("kind").notNull(),
  mergedIntoSubjectId: uuid("merged_into_subject_id"), createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [check("free_ai_quota_subject_kind", sql`${t.kind} IN ('guest', 'account') AND (${t.mergedIntoSubjectId} IS NULL OR ${t.mergedIntoSubjectId} <> ${t.id})`)]);

export const freeAiQuotaAliases = pgTable("free_ai_quota_aliases", {
  aliasKey: text("alias_key").primaryKey(),
  subjectId: uuid("subject_id").notNull().references(() => freeAiQuotaSubjects.id, { onDelete: "restrict" }),
  createdAt: time("created_at").notNull().defaultNow(),
});

export const freeAiRequests = pgTable("free_ai_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  chartVersionId: text("chart_version_id").notNull().references(() => freeAiChartBudgets.chartVersionId, { onDelete: "restrict" }),
  subjectId: uuid("subject_id").notNull().references(() => freeAiQuotaSubjects.id, { onDelete: "restrict" }),
  palaceId: text("palace_id").notNull(), locale: text("locale").notNull(), concern: text("concern"),
  status: text("status").notNull().default("reserved"), deletionGeneration: integer("deletion_generation").notNull(),
  admissionDay: date("admission_day", { mode: "string" }).notNull(), dispatchDay: date("dispatch_day", { mode: "string" }),
  reservedMicroVnd: money("reserved_micro_vnd"), attemptId: uuid("attempt_id"),
  pricingSnapshotId: text("pricing_snapshot_id").notNull(), lineageHash: text("lineage_hash").notNull(),
  fencedAt: time("fenced_at"), settledAt: time("settled_at"), createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("free_ai_requests_chart_slot_unique").on(t.chartVersionId),
  uniqueIndex("free_ai_requests_attempt_unique").on(t.attemptId),
  index("free_ai_requests_status_idx").on(t.status),
  check("free_ai_requests_valid", sql`${t.locale} IN ('vi','en') AND ${t.status} IN ('reserved','dispatching','ready','cancelled','terminal_failure','cost_unknown') AND ${t.reservedMicroVnd} >= 0 AND ${t.deletionGeneration} >= 0 AND ((${t.fencedAt} IS NULL AND ${t.attemptId} IS NULL AND ${t.dispatchDay} IS NULL) OR (${t.fencedAt} IS NOT NULL AND ${t.attemptId} IS NOT NULL AND ${t.dispatchDay} IS NOT NULL))`),
]);

export const freeAiAdmissions = pgTable("free_ai_admissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => freeAiRequests.id, { onDelete: "restrict" }),
  subjectId: uuid("subject_id").notNull().references(() => freeAiQuotaSubjects.id, { onDelete: "restrict" }),
  admittedAt: time("admitted_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("free_ai_admissions_request_unique").on(t.requestId), index("free_ai_admissions_rolling_idx").on(t.subjectId, t.admittedAt)]);

export const freeAiSettlements = pgTable("free_ai_settlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => freeAiRequests.id, { onDelete: "restrict" }),
  attemptId: uuid("attempt_id").notNull(), actualMicroVnd: bigint("actual_micro_vnd", { mode: "bigint" }),
  outcome: text("outcome").notNull(), settledAt: time("settled_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("free_ai_settlements_request_unique").on(t.requestId), uniqueIndex("free_ai_settlements_attempt_unique").on(t.attemptId), check("free_ai_settlements_valid", sql`${t.outcome} IN ('resolved','unknown') AND ((${t.outcome} = 'resolved' AND ${t.actualMicroVnd} IS NOT NULL AND ${t.actualMicroVnd} >= 0) OR (${t.outcome} = 'unknown' AND ${t.actualMicroVnd} IS NULL))`)]);

// Private payloads can be purged while non-content accounting survives.
export const freeAiArtifacts = pgTable("free_ai_artifacts", {
  requestId: uuid("request_id").primaryKey().references(() => freeAiRequests.id, { onDelete: "restrict" }),
  deletionGeneration: integer("deletion_generation").notNull(),
  frozenCall: jsonb("frozen_call").$type<FreePalaceGiftFrozenCallV1 | FreeReadingFrozenCallV2>(),
  content: jsonb("content").$type<FreePalaceGiftContentV1 | FreeReadingCandidateV2>(), facts: jsonb("facts").$type<FreePalaceGiftFactV1[]>(),
  contentHash: text("content_hash"), expiresAt: time("expires_at"), createdAt: time("created_at").notNull().defaultNow(),
}, (t) => [index("free_ai_artifacts_expiry_idx").on(t.expiresAt), check("free_ai_artifacts_generation_valid", sql`${t.deletionGeneration} >= 0`)]);
