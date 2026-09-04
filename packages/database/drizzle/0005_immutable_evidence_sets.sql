CREATE TABLE "evidence_sets" (
  "id" text PRIMARY KEY NOT NULL,
  "chart_version_id" text NOT NULL REFERENCES "ziwei_chart_versions"("id") ON DELETE cascade,
  "capability_id" text NOT NULL,
  "rule_version" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "evidence_items" (
  "id" text PRIMARY KEY NOT NULL,
  "evidence_set_id" text NOT NULL REFERENCES "evidence_sets"("id") ON DELETE cascade,
  "evidence_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_sets_chart_rule_unique" ON "evidence_sets" USING btree ("chart_version_id","rule_version");--> statement-breakpoint
CREATE INDEX "evidence_sets_chart_version_idx" ON "evidence_sets" USING btree ("chart_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_items_set_key_unique" ON "evidence_items" USING btree ("evidence_set_id","evidence_key");
