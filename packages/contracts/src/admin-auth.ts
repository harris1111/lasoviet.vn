import { z } from "zod";

export const AdminRoleSchema = z.enum([
  "super_admin",
  "operations",
  "support",
  "read_only",
]);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const AdminCapabilitySchema = z.enum([
  "admin.roles.manage",
  "admin.overview.read",
  "admin.accounts.read",
  "admin.commerce.read",
  "admin.support.manage",
  "admin.reports.read",
  "admin.reports.regenerate",
  "admin.workflow.retry",
  "admin.storage.reconcile",
  "admin.privacy.manage",
  "admin.audit.read",
  "admin.readiness.read",
]);
export type AdminCapability = z.infer<typeof AdminCapabilitySchema>;
export const ADMIN_CAPABILITIES = AdminCapabilitySchema.options;

export const INTERNAL_ADMIN_PREFLIGHT_AUDIT_ISSUER = "lasoviet-web";
export const INTERNAL_ADMIN_PREFLIGHT_AUDIT_AUDIENCE =
  "lasoviet-admin-preflight-audit";
export const InternalAdminPreflightAuditV1Schema = z.object({
  version: z.literal(1),
  purpose: z.literal("admin_preflight_denial"),
  requestId: z.string().trim().min(1).max(128),
}).strict();
export type InternalAdminPreflightAuditV1 = z.infer<
  typeof InternalAdminPreflightAuditV1Schema
>;

export const AdminAccessV1Schema = z.object({
  actorId: z.string().trim().min(1),
  roleAssignmentId: z.string().trim().min(1),
  role: AdminRoleSchema,
  capabilities: z.array(AdminCapabilitySchema),
}).strict();
export type AdminAccessV1 = z.infer<typeof AdminAccessV1Schema>;

export const AdminAuditTargetSchema = z.object({
  type: z.string().trim().min(1),
  id: z.string().trim().min(1),
}).strict();
export type AdminAuditTarget = z.infer<typeof AdminAuditTargetSchema>;
