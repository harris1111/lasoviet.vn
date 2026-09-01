import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { authAnonymousActors, authUsers } from "./auth.js";

export const deletionRequestStatus = pgEnum("deletion_request_status", [
  "requested",
  "cancelled",
  "purged",
]);

export const consents = pgTable(
  "consents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    anonymousActorId: text("anonymous_actor_id").references(
      () => authAnonymousActors.id,
      { onDelete: "cascade" },
    ),
    documentKey: text("document_key").notNull(),
    documentVersion: text("document_version").notNull(),
    purpose: text("purpose").notNull(),
    grantedAt: timestamp("granted_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    check(
      "consents_one_owner",
      sql`num_nonnulls(${table.userId}, ${table.anonymousActorId}) = 1`,
    ),
    uniqueIndex("consents_account_document_purpose_unique").on(
      table.userId,
      table.documentKey,
      table.documentVersion,
      table.purpose,
    ).where(sql`${table.userId} IS NOT NULL`),
    uniqueIndex("consents_anonymous_document_purpose_unique").on(
      table.anonymousActorId,
      table.documentKey,
      table.documentVersion,
      table.purpose,
    ).where(sql`${table.anonymousActorId} IS NOT NULL`),
    index("consents_document_idx").on(table.documentKey, table.documentVersion),
  ],
);

export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    status: deletionRequestStatus("status").notNull().default("requested"),
    requestedAt: timestamp("requested_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    recoverUntil: timestamp("recover_until", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    purgeAfter: timestamp("purge_after", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "date",
    }),
    purgedAt: timestamp("purged_at", {
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
    uniqueIndex("deletion_requests_active_user_unique").on(table.userId),
    index("deletion_requests_purge_after_idx").on(table.purgeAfter),
  ],
);
