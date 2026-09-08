DROP INDEX "admin_role_assignments_active_idx";--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ALTER COLUMN "role_assignment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_capability_policies" ALTER COLUMN "active" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "admin_capability_policies" ALTER COLUMN "active" SET DATA TYPE boolean USING CASE WHEN "active" = 1 THEN true ELSE false END;--> statement-breakpoint
ALTER TABLE "admin_capability_policies" ALTER COLUMN "active" SET DEFAULT true;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_role_assignments_one_active_unique" ON "admin_role_assignments" USING btree ("user_id") WHERE "admin_role_assignments"."revoked_at" IS NULL;--> statement-breakpoint
INSERT INTO "admin_capability_policies" ("id", "role", "capability", "active") VALUES
  ('admin_policy_super_admin_roles_manage', 'super_admin', 'admin.roles.manage', true),
  ('admin_policy_super_admin_overview_read', 'super_admin', 'admin.overview.read', true),
  ('admin_policy_super_admin_accounts_read', 'super_admin', 'admin.accounts.read', true),
  ('admin_policy_super_admin_commerce_read', 'super_admin', 'admin.commerce.read', true),
  ('admin_policy_super_admin_support_manage', 'super_admin', 'admin.support.manage', true),
  ('admin_policy_super_admin_reports_read', 'super_admin', 'admin.reports.read', true),
  ('admin_policy_super_admin_reports_regenerate', 'super_admin', 'admin.reports.regenerate', true),
  ('admin_policy_super_admin_workflow_retry', 'super_admin', 'admin.workflow.retry', true),
  ('admin_policy_super_admin_storage_reconcile', 'super_admin', 'admin.storage.reconcile', true),
  ('admin_policy_super_admin_privacy_manage', 'super_admin', 'admin.privacy.manage', true),
  ('admin_policy_super_admin_audit_read', 'super_admin', 'admin.audit.read', true),
  ('admin_policy_super_admin_readiness_read', 'super_admin', 'admin.readiness.read', true),
  ('admin_policy_operations_overview_read', 'operations', 'admin.overview.read', true),
  ('admin_policy_operations_accounts_read', 'operations', 'admin.accounts.read', true),
  ('admin_policy_operations_reports_read', 'operations', 'admin.reports.read', true),
  ('admin_policy_operations_workflow_retry', 'operations', 'admin.workflow.retry', true),
  ('admin_policy_operations_storage_reconcile', 'operations', 'admin.storage.reconcile', true),
  ('admin_policy_operations_readiness_read', 'operations', 'admin.readiness.read', true),
  ('admin_policy_support_accounts_read', 'support', 'admin.accounts.read', true),
  ('admin_policy_support_commerce_read', 'support', 'admin.commerce.read', true),
  ('admin_policy_support_support_manage', 'support', 'admin.support.manage', true),
  ('admin_policy_support_reports_read', 'support', 'admin.reports.read', true),
  ('admin_policy_support_reports_regenerate', 'support', 'admin.reports.regenerate', true),
  ('admin_policy_support_privacy_manage', 'support', 'admin.privacy.manage', true),
  ('admin_policy_read_only_overview_read', 'read_only', 'admin.overview.read', true),
  ('admin_policy_read_only_reports_read', 'read_only', 'admin.reports.read', true),
  ('admin_policy_read_only_audit_read', 'read_only', 'admin.audit.read', true),
  ('admin_policy_read_only_readiness_read', 'read_only', 'admin.readiness.read', true)
ON CONFLICT ("role", "capability") DO NOTHING;
