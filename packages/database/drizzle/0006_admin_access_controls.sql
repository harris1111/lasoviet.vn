CREATE TABLE "admin_role_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "assignment_version" integer DEFAULT 1 NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoked_by" text,
  "revoke_reason_code" text
);
--> statement-breakpoint
CREATE TABLE "admin_capability_policies" (
  "id" text PRIMARY KEY NOT NULL,
  "role" text NOT NULL,
  "capability" text NOT NULL,
  "active" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" text NOT NULL,
  "role_assignment_id" text NOT NULL,
  "capability" text NOT NULL,
  "operation" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "request_id" text NOT NULL,
  "trace_id" text NOT NULL,
  "idempotency_key" text,
  "reason_code" text,
  "policy_result" text NOT NULL,
  "redaction_level" text NOT NULL,
  "before_version" integer,
  "after_version" integer,
  "result_summary" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_revoked_by_auth_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_auth_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_role_assignment_id_admin_role_assignments_id_fk" FOREIGN KEY ("role_assignment_id") REFERENCES "public"."admin_role_assignments"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "admin_role_assignments_user_idx" ON "admin_role_assignments" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "admin_role_assignments_active_idx" ON "admin_role_assignments" USING btree ("user_id","revoked_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_capability_policies_role_capability_unique" ON "admin_capability_policies" USING btree ("role","capability");
--> statement-breakpoint
CREATE INDEX "admin_audit_logs_actor_idx" ON "admin_audit_logs" USING btree ("actor_id");
--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_idx" ON "admin_audit_logs" USING btree ("target_type","target_id");
--> statement-breakpoint
CREATE INDEX "admin_audit_logs_trace_idx" ON "admin_audit_logs" USING btree ("trace_id");
--> statement-breakpoint
CREATE FUNCTION "prevent_admin_audit_log_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'admin audit logs are append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "admin_audit_logs_append_only"
BEFORE UPDATE OR DELETE ON "admin_audit_logs"
FOR EACH ROW EXECUTE FUNCTION "prevent_admin_audit_log_mutation"();
