import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { FreeChartRecoverySourceV1 } from "@lasoviet/contracts";
import { authUsers } from "./auth.js";
import { ziweiCharts, ziweiChartVersions } from "./birth-profile.js";

/** Immutable first actual view, supplied only by a private trusted display reader. */
export const freeChartRecoverySources = pgTable("free_chart_recovery_sources", {
  chartId: text("chart_id").primaryKey().references(() => ziweiCharts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  chartVersionId: text("chart_version_id").notNull().references(() => ziweiChartVersions.id, { onDelete: "cascade" }),
  firstViewedAt: timestamp("first_viewed_at", { withTimezone: true, mode: "date" }).notNull(),
  sourceSha256: text("source_sha256").notNull(),
  source: jsonb("source").$type<FreeChartRecoverySourceV1>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, table => [
  index("free_chart_recovery_due_idx").on(table.firstViewedAt, table.chartId),
  check("free_chart_recovery_hash_check", sql`${table.sourceSha256} ~ '^[a-f0-9]{64}$'`),
  check("free_chart_recovery_time_check", sql`${table.firstViewedAt} <= ${table.createdAt}`),
]);
