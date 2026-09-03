ALTER TABLE "admin_audit_logs" ADD COLUMN "capability_policy_id" text;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_capability_policy_id_admin_capability_policies_id_fk" FOREIGN KEY ("capability_policy_id") REFERENCES "public"."admin_capability_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_id_idx" ON "admin_audit_logs" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_operation_idx" ON "admin_audit_logs" USING btree ("operation");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_result_idx" ON "admin_audit_logs" USING btree ("policy_result");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_role_assignments_user_version_unique" ON "admin_role_assignments" USING btree ("user_id","assignment_version");