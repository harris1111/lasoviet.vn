import {
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
    index("admin_role_assignments_active_idx").on(table.userId, table.revokedAt),
  ],
);

export const adminCapabilityPolicies = pgTable(
  "admin_capability_policies",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    capability: text("capability").notNull(),
    active: integer("active").notNull().default(1),
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

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    roleAssignmentId: text("role_assignment_id")
      .notNull()
      .references(() => adminRoleAssignments.id, { onDelete: "restrict" }),
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
  ],
);
