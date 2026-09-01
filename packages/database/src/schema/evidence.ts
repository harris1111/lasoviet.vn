import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { ziweiChartVersions } from "./birth-profile.js";

export const evidenceSets = pgTable("evidence_sets", {
  id: text("id").primaryKey(),
  chartVersionId: text("chart_version_id").notNull().references(() => ziweiChartVersions.id, { onDelete: "cascade" }),
  capabilityId: text("capability_id").notNull(),
  ruleVersion: text("rule_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("evidence_sets_chart_rule_unique").on(table.chartVersionId, table.ruleVersion),
  index("evidence_sets_chart_version_idx").on(table.chartVersionId),
]);

export const evidenceItems = pgTable("evidence_items", {
  id: text("id").primaryKey(),
  evidenceSetId: text("evidence_set_id").notNull().references(() => evidenceSets.id, { onDelete: "cascade" }),
  evidenceKey: text("evidence_key").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("evidence_items_set_key_unique").on(table.evidenceSetId, table.evidenceKey),
]);
