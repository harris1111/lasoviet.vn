import { sql } from "drizzle-orm";
import { reportReservations } from "./reports.js";
import {
  boolean,
  check,
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
  "membership_expiry",
  "recovery_pending_topup",
]);

export const notificationDeliveryStatus = pgEnum("notification_delivery_status", [
  "pending",
  "sending",
  "sent",
  "failed_retryable",
  "failed_permanent",
  "delivery_unknown",
  "captured",
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

// Written only after creation of an authenticated, verified account session.
export const notificationVerifiedSignins = pgTable("notification_verified_signins", {
  userId: text("user_id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  signedInAt: timestamp("signed_in_at", { withTimezone: true, mode: "date" }).notNull(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true, mode: "date" }),
});

/** Additional owned-report subscriptions; automatic transaction notices stay independent. */
export const reportNotificationSubscriptions = pgTable("report_notification_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull().references(() => authUsers.id, {onDelete: "cascade"}),
  reservationId: uuid("reservation_id").notNull().references(() => reportReservations.id, {onDelete: "cascade"}),
  reportId: uuid("report_id").notNull(),
  reportVersionId: uuid("report_version_id").notNull(),
  locale: text("locale").notNull(),
  status: text("status").notNull().default("subscribed"),
  stateVersion: integer("state_version").notNull().default(1),
  captureCheckCount: integer("capture_check_count").notNull().default(0),
  createdAt: timestamp("created_at", {withTimezone: true, mode: "date"}).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {withTimezone: true, mode: "date"}).notNull().defaultNow(),
}, table => [
  uniqueIndex("report_notice_owner_version_unique").on(table.ownerId, table.reportVersionId),
  index("report_notice_status_idx").on(table.status, table.captureCheckCount, table.createdAt),
  check("report_notice_status_check", sql`${table.status} IN ('subscribed', 'cancelled', 'captured', 'already_notified', 'suppressed')`),
  check("report_notice_locale_check", sql`${table.locale} IN ('vi', 'en')`),
  check("report_notice_state_version_check", sql`${table.stateVersion} > 0`),
  check("report_notice_capture_check_count_check", sql`${table.captureCheckCount} >= 0`),
]);

// An opaque reminder receipt is account business attribution, never browser-supplied revenue.
export const recoveryClickReceipts = pgTable("recovery_click_receipts", {
  id:uuid("id").defaultRandom().primaryKey(),
  ownerId:text("owner_id").notNull().references(()=>authUsers.id,{onDelete:"cascade"}),
  deliveryId:uuid("delivery_id").notNull().references(()=>notificationDeliveries.id,{onDelete:"cascade"}),
  orderId:uuid("order_id").notNull(),
  intentId:uuid("intent_id").notNull(),
  chartId:text("chart_id").notNull(), chartVersionId:text("chart_version_id").notNull(),
  source:text("source").notNull().default("reminder"),
  classification:text("classification").notNull(),
  clickedAt:timestamp("clicked_at",{withTimezone:true,mode:"date"}).notNull(),
  attributedAt:timestamp("attributed_at",{withTimezone:true,mode:"date"}),
  paidVnd:integer("paid_vnd"), chargedLa:integer("charged_la"),
  financialCheckCount:integer("financial_check_count").notNull().default(0),
  recognizedVnd:integer("recognized_vnd"), paymentEventId:uuid("payment_event_id"),
  grantTransactionId:uuid("grant_transaction_id"), spendTransactionId:uuid("spend_transaction_id"),
},table=>[
  uniqueIndex("recovery_click_delivery_unique").on(table.deliveryId),
  uniqueIndex("recovery_click_order_unique").on(table.orderId),
  check("recovery_financial_check_count_valid", sql`${table.financialCheckCount} >= 0`),
  index("recovery_financial_fair_scan_idx").on(table.financialCheckCount,table.clickedAt,table.id).where(sql`${table.attributedAt} IS NULL AND ${table.classification} = 'clicked'`),
  uniqueIndex("recovery_click_payment_unique").on(table.paymentEventId).where(sql`${table.paymentEventId} IS NOT NULL`),
  uniqueIndex("recovery_click_spend_unique").on(table.spendTransactionId).where(sql`${table.spendTransactionId} IS NOT NULL`),
  check("recovery_click_classification_check",sql`${table.classification} IN ('captured_click','clicked') AND ${table.source} = 'reminder'`),
  check("recovery_click_money_check",sql`((${table.attributedAt} IS NULL AND ${table.paidVnd} IS NULL AND ${table.chargedLa} IS NULL AND ${table.recognizedVnd} IS NULL
 AND ${table.paymentEventId} IS NULL AND ${table.grantTransactionId} IS NULL AND ${table.spendTransactionId} IS NULL)
 OR (${table.classification} = 'clicked' AND ${table.attributedAt} IS NOT NULL AND ${table.paidVnd} IS NOT NULL AND ${table.chargedLa} IS NOT NULL
 AND ${table.recognizedVnd} IS NOT NULL AND ${table.paymentEventId} IS NOT NULL AND ${table.grantTransactionId} IS NOT NULL AND ${table.spendTransactionId} IS NOT NULL
 AND ${table.paidVnd} > 0 AND ${table.chargedLa} > 0 AND ${table.recognizedVnd} >= 0 AND ${table.recognizedVnd} <= ${table.paidVnd}))`),
]);

/** Durable stop is default-on; activation is a separately authorized private operation. */
export const recoveryOutboundControl = pgTable("recovery_outbound_control", {
  id: text("id").primaryKey(),
  emergencyStopped: boolean("emergency_stopped").notNull().default(true),
  cohortIds: jsonb("cohort_ids").$type<string[]>().notNull().default([]),
  dailyLimit: integer("daily_limit").notNull().default(5),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, table => [check("recovery_outbound_control_closed", sql`${table.id} = 'pending-topup' AND ${table.dailyLimit} BETWEEN 1 AND 5 AND jsonb_typeof(${table.cohortIds}) = 'array' AND jsonb_array_length(${table.cohortIds}) <= 5`)]);
export const recoveryOutboundDailyAttempts = pgTable("recovery_outbound_daily_attempts", {
  utcDay: text("utc_day").primaryKey(),
  attempts: integer("attempts").notNull(),
}, table => [check("recovery_outbound_daily_attempts_cap", sql`${table.utcDay} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND ${table.attempts} BETWEEN 1 AND 5`)]);
