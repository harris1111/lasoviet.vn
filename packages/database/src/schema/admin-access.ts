import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth.js";

export const adminRoleAssignments = pgTable(
  "admin_role_assignments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    assignmentVersion: integer("assignment_version").notNull().default(1),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    revokedBy: text("revoked_by").references(() => authUsers.id, {
      onDelete: "restrict",
    }),
    revokeReasonCode: text("revoke_reason_code"),
  },
  (table) => [
    index("admin_role_assignments_user_idx").on(table.userId),
    uniqueIndex("admin_role_assignments_one_active_unique")
      .on(table.userId)
      .where(sql`${table.revokedAt} IS NULL`),
    uniqueIndex("admin_role_assignments_user_version_unique").on(
      table.userId,
      table.assignmentVersion,
    ),
  ],
);

export const adminCapabilityPolicies = pgTable(
  "admin_capability_policies",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    capability: text("capability").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_capability_policies_role_capability_unique").on(
      table.role,
      table.capability,
    ),
  ],
);

export const adminRoleMutationRequests = pgTable(
  "admin_role_mutation_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    operation: text("operation").notNull(),
    targetId: text("target_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_role_mutation_requests_actor_key_unique").on(
      table.actorId,
      table.idempotencyKey,
      table.requestFingerprint,
    ),
  ],
);

export const adminReportRecoveryReceipts = pgTable(
  "admin_report_recovery_receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    operation: text("operation").notNull(),
    targetReportVersionId: text("target_report_version_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_report_recovery_receipts_actor_key_unique").on(
      table.actorId,
      table.idempotencyKey,
    ),
    index("admin_report_recovery_receipts_target_idx").on(
      table.targetReportVersionId,
    ),
    check(
      "admin_report_recovery_receipts_operation_bounded",
      sql`char_length(${table.operation}) BETWEEN 1 AND 96 AND btrim(${table.operation}) <> ''`,
    ),
    check(
      "admin_report_recovery_receipts_target_bounded",
      sql`char_length(${table.targetReportVersionId}) BETWEEN 1 AND 128 AND btrim(${table.targetReportVersionId}) <> ''`,
    ),
    check(
      "admin_report_recovery_receipts_key_bounded",
      sql`char_length(${table.idempotencyKey}) BETWEEN 1 AND 128 AND btrim(${table.idempotencyKey}) <> ''`,
    ),
    check(
      "admin_report_recovery_receipts_fingerprint_format",
      sql`${table.requestFingerprint} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "admin_report_recovery_receipts_result_object",
      sql`jsonb_typeof(${table.result}) = 'object'`,
    ),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").references(() => authUsers.id, {
      onDelete: "restrict",
    }),
    roleAssignmentId: text("role_assignment_id").references(
      () => adminRoleAssignments.id,
      { onDelete: "restrict" },
    ),
    capabilityPolicyId: text("capability_policy_id").references(
      () => adminCapabilityPolicies.id,
      { onDelete: "restrict" },
    ),
    capability: text("capability").notNull(),
    operation: text("operation").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    requestId: text("request_id").notNull(),
    traceId: text("trace_id").notNull(),
    idempotencyKey: text("idempotency_key"),
    reasonCode: text("reason_code"),
    policyResult: text("policy_result").notNull(),
    redactionLevel: text("redaction_level").notNull(),
    beforeVersion: integer("before_version"),
    afterVersion: integer("after_version"),
    resultSummary: jsonb("result_summary").$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_actor_idx").on(table.actorId),
    index("admin_audit_logs_target_idx").on(table.targetType, table.targetId),
    index("admin_audit_logs_trace_idx").on(table.traceId),
    index("admin_audit_logs_created_id_idx").on(table.createdAt, table.id),
    index("admin_audit_logs_operation_idx").on(table.operation),
    index("admin_audit_logs_result_idx").on(table.policyResult),
  ],
);
