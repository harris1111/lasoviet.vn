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
} from "drizzle-orm/pg-core";

import { authAnonymousActors, authUsers } from "./auth.js";

export const birthProfiles = pgTable(
  "birth_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    anonymousActorId: text("anonymous_actor_id").references(
      () => authAnonymousActors.id,
      { onDelete: "cascade" },
    ),
    anonymousExpiresAt: timestamp("anonymous_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "birth_profiles_one_owner",
      sql`num_nonnulls(${table.userId}, ${table.anonymousActorId}) = 1`,
    ),
    check(
      "birth_profiles_anonymous_expiry_matches_owner",
      sql`(${table.userId} IS NOT NULL AND ${table.anonymousActorId} IS NULL AND ${table.anonymousExpiresAt} IS NULL) OR (${table.userId} IS NULL AND ${table.anonymousActorId} IS NOT NULL AND ${table.anonymousExpiresAt} IS NOT NULL)`,
    ),
    index("birth_profiles_user_id_idx").on(table.userId),
    index("birth_profiles_anonymous_expiry_idx").on(
      table.anonymousActorId,
      table.anonymousExpiresAt,
    ),
  ],
);

export const birthProfileRevisions = pgTable(
  "birth_profile_revisions",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    originalInput: jsonb("original_input")
      .$type<Record<string, unknown>>()
      .notNull(),
    normalizedInput: jsonb("normalized_input").$type<
      Record<string, unknown>
    >(),
    normalizationWarnings: jsonb("normalization_warnings").$type<string[]>(),
    limitations: jsonb("limitations").$type<string[]>(),
    consentVersion: text("consent_version").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("birth_profile_revisions_profile_revision_unique").on(
      table.profileId,
      table.revisionNumber,
    ),
    index("birth_profile_revisions_profile_id_idx").on(table.profileId),
  ],
);

export const calculationRuns = pgTable(
  "calculation_runs",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    profileRevisionId: text("profile_revision_id")
      .notNull()
      .references(() => birthProfileRevisions.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    engineId: text("engine_id").notNull(),
    engineVersion: text("engine_version").notNull(),
    adapterId: text("adapter_id").notNull(),
    adapterVersion: text("adapter_version").notNull(),
    schemaId: text("schema_id").notNull(),
    ruleSetId: text("rule_set_id").notNull(),
    inputHash: text("input_hash").notNull(),
    configHash: text("config_hash").notNull(),
    rawSnapshotHash: text("raw_snapshot_hash").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("calculation_runs_revision_idempotency_key_unique").on(
      table.profileRevisionId,
      table.idempotencyKey,
    ),
    index("calculation_runs_profile_revision_id_idx").on(
      table.profileRevisionId,
    ),
  ],
);

export const ziweiCharts = pgTable(
  "ziwei_charts",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    profileRevisionId: text("profile_revision_id")
      .notNull()
      .references(() => birthProfileRevisions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ziwei_charts_profile_revision_unique").on(
      table.profileRevisionId,
    ),
  ],
);

export const ziweiChartVersions = pgTable(
  "ziwei_chart_versions",
  {
    id: text("id").primaryKey(),
    chartId: text("chart_id")
      .notNull()
      .references(() => ziweiCharts.id, { onDelete: "cascade" }),
    calculationRunId: text("calculation_run_id")
      .notNull()
      .references(() => calculationRuns.id, { onDelete: "cascade" }),
    normalizedOutput: jsonb("normalized_output")
      .$type<Record<string, unknown>>()
      .notNull(),
    privateRawSnapshot: jsonb("private_raw_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    warnings: jsonb("warnings").$type<string[]>().notNull(),
    provenance: jsonb("provenance")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ziwei_chart_versions_calculation_run_unique").on(
      table.calculationRunId,
    ),
    index("ziwei_chart_versions_chart_id_idx").on(table.chartId),
  ],
);
