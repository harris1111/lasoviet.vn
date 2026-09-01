import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const notificationDeliveryKind = pgEnum("notification_delivery_kind", [
  "email_verification",
  "password_reset",
]);

export const notificationDeliveryStatus = pgEnum("notification_delivery_status", [
  "pending",
  "sending",
  "sent",
  "failed_retryable",
  "failed_permanent",
  "delivery_unknown",
]);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    kind: notificationDeliveryKind("kind").notNull(),
    recipientFingerprint: text("recipient_fingerprint").notNull(),
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
