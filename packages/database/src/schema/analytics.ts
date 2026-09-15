import { sql } from "drizzle-orm";
import {
  check,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth.js";
import { birthProfiles } from "./birth-profile.js";

export const analyticsVisitors = pgTable(
  "analytics_visitors",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    birthProfileId: text("birth_profile_id").references(
      () => birthProfiles.id,
      { onDelete: "set null" },
    ),
    consentedAt: timestamp("consented_at", {
      withTimezone: true,
      mode: "date",
    }),
    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    linkedAt: timestamp("linked_at", {
      withTimezone: true,
      mode: "date",
    }),
    expiresAt: timestamp("expires_at", {
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
      "analytics_visitors_link_expiry_check",
      sql`(${table.userId} IS NULL AND ${table.expiresAt} IS NOT NULL AND ${table.linkedAt} IS NULL) OR (${table.userId} IS NOT NULL AND ${table.expiresAt} IS NULL AND ${table.linkedAt} IS NOT NULL)`,
    ),
    index("analytics_visitors_user_id_idx").on(table.userId),
    index("analytics_visitors_expires_at_idx").on(table.expiresAt),
    index("analytics_visitors_birth_profile_id_idx").on(table.birthProfileId),
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    visitorId: text("visitor_id")
      .notNull()
      .references(() => analyticsVisitors.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    birthProfileId: text("birth_profile_id").references(
      () => birthProfiles.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    properties: jsonb("properties")
      .notNull()
      .default(sql`{}::jsonb`),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    deviceClass: text("device_class"),
    locale: text("locale"),
    pathname: text("pathname"),
    ipExpiresAt: timestamp("ip_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    unlinkedExpiresAt: timestamp("unlinked_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("analytics_events_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    check(
      "analytics_events_link_expiry_check",
      sql`(${table.userId} IS NULL AND ${table.unlinkedExpiresAt} IS NOT NULL) OR (${table.userId} IS NOT NULL AND ${table.unlinkedExpiresAt} IS NULL)`,
    ),
    check(
      "analytics_events_ip_expiry_check",
      sql`${table.ip} IS NULL OR ${table.ipExpiresAt} IS NOT NULL`,
    ),
    index("analytics_events_visitor_id_idx").on(table.visitorId),
    index("analytics_events_user_id_idx").on(table.userId),
    index("analytics_events_name_idx").on(table.name),
    index("analytics_events_unlinked_expires_at_idx").on(
      table.unlinkedExpiresAt,
    ),
    index("analytics_events_ip_expires_at_idx").on(table.ipExpiresAt),
    index("analytics_events_occurred_at_idx").on(table.occurredAt),
  ],
);

export const accountBehaviorProfiles = pgTable(
  "account_behavior_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    lockedSectionsViewed: jsonb("locked_sections_viewed")
      .notNull()
      .default(sql`[]::jsonb`),
    topupPacksViewed: jsonb("topup_packs_viewed")
      .notNull()
      .default(sql`[]::jsonb`),
    laBalance: integer("la_balance"),
    lastReturnAt: timestamp("last_return_at", {
      withTimezone: true,
      mode: "date",
    }),
    reportReadDepthPercent: integer("report_read_depth_percent"),
    interestTopics: jsonb("interest_topics")
      .notNull()
      .default(sql`[]::jsonb`),
    lastEventAt: timestamp("last_event_at", {
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
    uniqueIndex("account_behavior_profiles_user_id_unique").on(table.userId),
    index("account_behavior_profiles_updated_at_idx").on(table.updatedAt),
  ],
);

export const analyticsFraudIpRecords = pgTable(
  "analytics_fraud_ip_records",
  {
    id: text("id").primaryKey(),
    ip: inet("ip").notNull(),
    action: text("action").notNull(),
    visitorId: text("visitor_id"),
    userId: text("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    requestId: text("request_id"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`{}::jsonb`),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analytics_fraud_ip_records_ip_idx").on(table.ip),
    index("analytics_fraud_ip_records_action_idx").on(table.action),
    index("analytics_fraud_ip_records_expires_at_idx").on(table.expiresAt),
    index("analytics_fraud_ip_records_user_id_idx").on(table.userId),
  ],
);
