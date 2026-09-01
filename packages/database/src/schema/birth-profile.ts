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
