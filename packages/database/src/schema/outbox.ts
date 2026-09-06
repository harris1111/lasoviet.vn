import { sql } from "drizzle-orm";
import {
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

import type { Database } from "../client.js";

export const outboxStatus = pgEnum("outbox_status", [
  "pending",
  "leased",
  "processed",
  "failed",
]);

export type WorkflowEnvelopeV1<TPayload = unknown> = {
  schemaVersion: 1;
  type: string;
  eventId: string;
  occurredAt: string;
  traceId: string;
  actorId: string | null;
  aggregateType: "order" | "report" | "asset" | "account";
  aggregateId: string;
  idempotencyKey?: string;
  payload: TPayload;
};

export class OutboxError extends Error {
  readonly code = "OUTBOX_DUPLICATE_KEY" as const;

  constructor() {
    super("OUTBOX_DUPLICATE_KEY: event or idempotency key already exists");
    this.name = "OutboxError";
  }
}

export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schemaVersion: integer("schema_version").notNull(),
    eventType: text("event_type").notNull(),
    eventId: text("event_id").notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    traceId: text("trace_id").notNull(),
    actorId: text("actor_id"),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    status: outboxStatus("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    leasedUntil: timestamp("leased_until", {
      withTimezone: true,
      mode: "date",
    }),
    leasedBy: text("leased_by"),
    lastErrorCode: text("last_error_code"),
    processedAt: timestamp("processed_at", {
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
      "outbox_schema_version_supported",
      sql`${table.schemaVersion} = 1`,
    ),
    uniqueIndex("outbox_event_id_unique").on(table.eventId),
    uniqueIndex("outbox_idempotency_key_unique").on(table.idempotencyKey),
    index("outbox_claim_idx").on(table.status, table.availableAt),
    index("outbox_lease_idx").on(table.leasedUntil),
    index("outbox_report_pending_claim_idx").on(
      table.eventType,
      table.status,
      table.availableAt,
    ),
    index("outbox_report_expired_lease_idx").on(
      table.eventType,
      table.status,
      table.leasedUntil,
    ),
  ],
);

export async function enqueueOutbox(
  tx: Pick<Database, "insert">,
  event: WorkflowEnvelopeV1,
): Promise<typeof outbox.$inferSelect> {
  const [inserted] = await tx
    .insert(outbox)
    .values({
      schemaVersion: event.schemaVersion,
      eventType: event.type,
      eventId: event.eventId,
      occurredAt: new Date(event.occurredAt),
      traceId: event.traceId,
      actorId: event.actorId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      idempotencyKey: event.idempotencyKey ?? event.eventId,
      payload: event.payload,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted === undefined) {
    throw new OutboxError();
  }
  return inserted;
}
