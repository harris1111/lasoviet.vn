import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
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

export const birthProfileReadingContextRevisions = pgTable(
  "birth_profile_reading_context_revisions",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    lifeStage: text("life_stage"),
    topConcern: text("top_concern"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reading_context_revisions_profile_id_id_unique").on(
      table.profileId,
      table.id,
    ),
    uniqueIndex("reading_context_revisions_profile_revision_idx").on(
      table.profileId,
      table.revisionNumber,
    ),
    index("reading_context_revisions_profile_id_idx").on(table.profileId),
    check("reading_context_revision_number_positive", sql`${table.revisionNumber} > 0`),
    check(
      "reading_context_at_least_one",
      sql`num_nonnulls(${table.lifeStage}, ${table.topConcern}) >= 1`,
    ),
    check(
      "reading_context_valid_life_stage",
      sql`${table.lifeStage} IS NULL OR ${table.lifeStage} IN ('studying', 'early_career', 'established_career', 'business_owner', 'between_paths', 'retired')`,
    ),
    check(
      "reading_context_valid_top_concern",
      sql`${table.topConcern} IS NULL OR ${table.topConcern} IN ('career', 'money', 'love', 'family', 'wellbeing', 'self_understanding')`,
    ),
  ],
);

export const birthProfileReadingContexts = pgTable(
  "birth_profile_reading_contexts",
  {
    profileId: text("profile_id")
      .primaryKey()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    currentRevisionId: text("current_revision_id"),
    stateVersion: integer("state_version").notNull().default(1),
    lastRevisionNumber: integer("last_revision_number").notNull().default(0),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.currentRevisionId],
      foreignColumns: [
        birthProfileReadingContextRevisions.profileId,
        birthProfileReadingContextRevisions.id,
      ],
      name: "birth_profile_reading_contexts_same_profile_fk",
    }).onDelete("cascade"),
    index("reading_contexts_current_revision_idx").on(table.currentRevisionId),
    check("reading_context_state_version_positive", sql`${table.stateVersion} > 0`),
    check(
      "reading_context_last_revision_number_non_negative",
      sql`${table.lastRevisionNumber} >= 0`,
    ),
    check(
      "reading_context_current_revision_coherent",
      sql`${table.currentRevisionId} IS NULL OR ${table.lastRevisionNumber} > 0`,
    ),
  ],
);

export const birthProfileReadingContextMutationReceipts = pgTable(
  "birth_profile_reading_context_mutation_receipts",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => birthProfiles.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    commandType: text("command_type").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    resultStateVersion: integer("result_state_version").notNull(),
    resultRevisionId: text("result_revision_id"),
    resultRevisionNumber: integer("result_revision_number"),
    resultKind: text("result_kind").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.profileId, table.idempotencyKey],
      name: "reading_context_mutation_receipts_pk",
    }),
    index("reading_context_mutation_receipts_profile_idx").on(table.profileId),
    check(
      "reading_context_receipt_command_type_valid",
      sql`${table.commandType} IN ('set', 'clear')`,
    ),
    check(
      "reading_context_receipt_fingerprint_format",
      sql`${table.requestFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "reading_context_receipt_idempotency_key_bounded",
      sql`char_length(${table.idempotencyKey}) BETWEEN 1 AND 128 AND btrim(${table.idempotencyKey}) <> ''`,
    ),
    check(
      "reading_context_receipt_result_state_version_positive",
      sql`${table.resultStateVersion} > 0`,
    ),
    check(
      "reading_context_receipt_result_coherent",
      sql`(
        ${table.commandType} = 'clear'
        AND ${table.resultKind} = 'cleared'
        AND ${table.resultRevisionId} IS NULL
        AND ${table.resultRevisionNumber} IS NULL
      ) OR (
        ${table.commandType} = 'set'
        AND ${table.resultKind} IN ('created', 'updated')
        AND ${table.resultRevisionId} IS NOT NULL
        AND ${table.resultRevisionNumber} > 0
      )`,
    ),
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
