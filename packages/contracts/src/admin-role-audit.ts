import { z } from "zod";

import { AdminAccessV1Schema, AdminRoleSchema } from "./admin-auth.js";

const boundedId = z.string().trim().min(1).max(128);
const correlationId = z.string().trim().regex(/^[A-Za-z0-9._:-]{1,128}$/);

export const RoleMutationReasonCodeSchema = z.enum([
  "access_onboarding",
  "access_role_change",
  "access_offboarding",
  "access_review",
  "security_incident",
]);
export type RoleMutationReasonCode = z.infer<typeof RoleMutationReasonCodeSchema>;

export const AdminRoleMutationContextV1Schema = z.object({
  access: AdminAccessV1Schema,
  requestId: correlationId,
  traceId: correlationId,
  idempotencyKey: boundedId,
  reasonCode: RoleMutationReasonCodeSchema,
}).strict();
export type AdminRoleMutationContextV1 = z.infer<
  typeof AdminRoleMutationContextV1Schema
>;

export const AssignAdminRoleV1Schema = z.object({
  subjectAccountId: boundedId,
  role: AdminRoleSchema,
  expectedVersion: z.number().int().min(0).max(1_000_000),
  idempotencyKey: boundedId,
  reasonCode: RoleMutationReasonCodeSchema,
}).strict();
export type AssignAdminRoleV1 = z.infer<typeof AssignAdminRoleV1Schema>;

export const RevokeAdminRoleV1Schema = z.object({
  assignmentId: boundedId,
  expectedVersion: z.number().int().min(1).max(1_000_000),
  idempotencyKey: boundedId,
  reasonCode: RoleMutationReasonCodeSchema,
}).strict();
export type RevokeAdminRoleV1 = z.infer<typeof RevokeAdminRoleV1Schema>;

export const AdminAuditSearchFiltersV1Schema = z.object({
  page: z.number().int().min(1).max(100_000),
  pageSize: z.number().int().min(1).max(50),
  cursor: z.string().trim().min(1).max(256).optional(),
  dateFrom: z.iso.datetime({ offset: true }).optional(),
  dateTo: z.iso.datetime({ offset: true }).optional(),
  actorId: boundedId.optional(),
  operation: z.string().trim().min(1).max(96).optional(),
  targetType: z.string().trim().min(1).max(64).optional(),
  targetId: boundedId.optional(),
  traceId: correlationId.optional(),
  result: z.enum(["allowed", "denied"]).optional(),
}).strict();
export type AdminAuditSearchFiltersV1 = z.infer<
  typeof AdminAuditSearchFiltersV1Schema
>;

export function parseAdminAuditSearchFiltersV1(input: Record<string, unknown>) {
  const numeric = (value: unknown, fallback: number) =>
    typeof value === "string" && /^\d{1,6}$/.test(value)
      ? Number(value)
      : value ?? fallback;
  const optional = (value: unknown) =>
    typeof value === "string" && value.trim() === "" ? undefined : value;
  const instant = (value: unknown) => {
    const normalized = optional(value);
    if (typeof normalized !== "string") return normalized;
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00.000Z`
      : normalized;
  };
  const parsed = AdminAuditSearchFiltersV1Schema.safeParse({
    ...Object.fromEntries(Object.entries(input).map(([key, value]) => [key, optional(value)])),
    page: numeric(input.page, 1),
    pageSize: numeric(input.pageSize, 25),
    dateFrom: instant(input.dateFrom),
    dateTo: instant(input.dateTo),
  });
  if (!parsed.success) return parsed;
  if (
    parsed.data.dateFrom !== undefined &&
    parsed.data.dateTo !== undefined &&
    new Date(parsed.data.dateFrom).getTime() > new Date(parsed.data.dateTo).getTime()
  ) {
    return AdminAuditSearchFiltersV1Schema.safeParse({ dateFrom: "" });
  }
  return parsed;
}

export const AdminAuditSummaryV1Schema = z.object({
  id: z.string().uuid(),
  actorId: boundedId.nullable(),
  roleAssignmentId: boundedId.nullable(),
  capability: z.string().trim().min(1).max(96),
  operation: z.string().trim().min(1).max(96),
  target: z.object({ type: z.string().trim().min(1).max(64), id: boundedId }).strict(),
  requestId: correlationId,
  traceId: correlationId,
  result: z.enum(["allowed", "denied"]),
  redactionLevel: z.literal("redacted"),
  reasonCode: RoleMutationReasonCodeSchema.nullable(),
  idempotencyKey: boundedId.nullable(),
  beforeVersion: z.number().int().min(0).nullable(),
  afterVersion: z.number().int().min(0).nullable(),
  resultSummary: z.object({
    role: AdminRoleSchema.optional(),
    outcome: z.enum(["allowed", "denied"]).optional(),
    code: z.string().trim().min(1).max(128).optional(),
    count: z.number().int().min(0).max(100_000).optional(),
  }).strict(),
  createdAt: z.iso.datetime({ offset: true }),
}).strict();
export type AdminAuditSummaryV1 = z.infer<typeof AdminAuditSummaryV1Schema>;

export const AdminAuditPageV1Schema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(50),
  total: z.number().int().min(0).max(100_000),
  nextCursor: z.string().trim().min(1).max(256).nullable().optional(),
  items: z.array(AdminAuditSummaryV1Schema).max(50),
}).strict();
export type AdminAuditPageV1 = z.infer<typeof AdminAuditPageV1Schema>;
