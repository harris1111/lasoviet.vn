import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { BaziFactsInputV1, NormalizedBaziChartV1 } from "@lasoviet/contracts";
import { birthProfiles, birthProfileRevisions, calculationRuns } from "./birth-profile.js";

/** Private immutable source; ownership follows the live profile, never a copied owner ID. */
export const baziSources = pgTable("bazi_sources", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => birthProfiles.id, {onDelete: "cascade"}),
  profileRevisionId: text("profile_revision_id").notNull().references(() => birthProfileRevisions.id, {onDelete: "cascade"}),
  calculationRunId: text("calculation_run_id").notNull().references(() => calculationRuns.id, {onDelete: "cascade"}),
  mappingVersion: text("mapping_version").notNull(),
  profileRevisionHash: text("profile_revision_hash").notNull(),
  resolvedInput: jsonb("resolved_input").$type<BaziFactsInputV1>().notNull(),
  normalizedOutput: jsonb("normalized_output").$type<NormalizedBaziChartV1>().notNull(),
  createdAt: timestamp("created_at", {withTimezone: true, mode: "date"}).notNull(),
}, table => [
  uniqueIndex("bazi_sources_run_unique").on(table.calculationRunId),
  index("bazi_sources_revision_idx").on(table.profileRevisionId),
  check("bazi_sources_mapping_valid", sql`${table.mappingVersion} = 'lasoviet.bazi.birth-profile.v1' AND ${table.profileRevisionHash} ~ '^[0-9a-f]{64}$'`),
  check("bazi_sources_objects", sql`jsonb_typeof(${table.resolvedInput}) = 'object' AND jsonb_typeof(${table.normalizedOutput}) = 'object'`),
]);
