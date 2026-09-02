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
