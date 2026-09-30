import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth.js";

export const notificationDeliveryKind = pgEnum("notification_delivery_kind", [
  "email_verification",
  "password_reset",
  "report_ready",
  "report_failed",
  "nurture_verified_signin",
  "han_month_reminder",
  "delayed_unlock_completed",
]);

export const notificationDeliveryStatus = pgEnum("notification_delivery_status", [
  "pending",
  "sending",
  "sent",
  "failed_retryable",
  "failed_permanent",
  "delivery_unknown",
]);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    emailFingerprint: text("email_fingerprint").notNull(),
    nurtureEmailsAllowed: boolean("nurture_emails_allowed")
      .notNull()
      .default(true),
    hanRemindersAllowed: boolean("han_reminders_allowed")
      .notNull()
      .default(true),
    unsubscribedAll: boolean("unsubscribed_all").notNull().default(false),
    unsubscribedAt: timestamp("unsubscribed_at", {
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
    uniqueIndex("notification_preferences_user_id_unique").on(table.userId),
    uniqueIndex("notification_preferences_email_fingerprint_unique").on(
      table.emailFingerprint,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    kind: notificationDeliveryKind("kind").notNull(),
    recipientFingerprint: text("recipient_fingerprint").notNull(),
    requestPayload: jsonb("request_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: notificationDeliveryStatus("status").notNull().default("pending"),
    sendingLeaseExpiresAt: timestamp("sending_lease_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: text("last_error_code"),
    providerMessageId: text("provider_message_id"),
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
    sentAt: timestamp("sent_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("notification_deliveries_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("notification_deliveries_claim_idx").on(
      table.status,
      table.sendingLeaseExpiresAt,
    ),
  ],
);
