CREATE TABLE "birth_profile_reading_context_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"life_stage" text,
	"top_concern" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_context_revision_number_positive" CHECK ("revision_number" > 0),
	CONSTRAINT "reading_context_at_least_one" CHECK (num_nonnulls("life_stage", "top_concern") >= 1),
	CONSTRAINT "reading_context_valid_life_stage" CHECK ("life_stage" IS NULL OR "life_stage" IN ('studying', 'early_career', 'established_career', 'business_owner', 'between_paths', 'retired')),
	CONSTRAINT "reading_context_valid_top_concern" CHECK ("top_concern" IS NULL OR "top_concern" IN ('career', 'money', 'love', 'family', 'wellbeing', 'self_understanding'))
);
--> statement-breakpoint
ALTER TABLE "birth_profile_reading_context_revisions" ADD CONSTRAINT "birth_profile_reading_context_revisions_profile_id_birth_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."birth_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "reading_context_revisions_profile_id_id_unique" ON "birth_profile_reading_context_revisions" USING btree ("profile_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "reading_context_revisions_profile_revision_idx" ON "birth_profile_reading_context_revisions" USING btree ("profile_id","revision_number");
--> statement-breakpoint
CREATE INDEX "reading_context_revisions_profile_id_idx" ON "birth_profile_reading_context_revisions" USING btree ("profile_id");
--> statement-breakpoint
CREATE TABLE "birth_profile_reading_contexts" (
	"profile_id" text PRIMARY KEY NOT NULL,
	"current_revision_id" text,
	"state_version" integer DEFAULT 1 NOT NULL,
	"last_revision_number" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_context_state_version_positive" CHECK ("state_version" > 0),
	CONSTRAINT "reading_context_last_revision_number_non_negative" CHECK ("last_revision_number" >= 0),
	CONSTRAINT "reading_context_current_revision_coherent" CHECK ("current_revision_id" IS NULL OR "last_revision_number" > 0),
	CONSTRAINT "birth_profile_reading_contexts_same_profile_fk" FOREIGN KEY ("profile_id","current_revision_id") REFERENCES "birth_profile_reading_context_revisions"("profile_id","id") ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE "birth_profile_reading_contexts" ADD CONSTRAINT "birth_profile_reading_contexts_profile_id_birth_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."birth_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "reading_contexts_current_revision_idx" ON "birth_profile_reading_contexts" USING btree ("current_revision_id");
--> statement-breakpoint
CREATE TABLE "birth_profile_reading_context_mutation_receipts" (
	"profile_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"command_type" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"result_state_version" integer NOT NULL,
	"result_revision_id" text,
	"result_revision_number" integer,
	"result_kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_context_mutation_receipts_pk" PRIMARY KEY("profile_id","idempotency_key"),
	CONSTRAINT "reading_context_receipt_command_type_valid" CHECK ("command_type" IN ('set', 'clear')),
	CONSTRAINT "reading_context_receipt_fingerprint_format" CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "reading_context_receipt_idempotency_key_bounded" CHECK (char_length("idempotency_key") BETWEEN 1 AND 128 AND btrim("idempotency_key") <> ''),
	CONSTRAINT "reading_context_receipt_result_state_version_positive" CHECK ("result_state_version" > 0),
	CONSTRAINT "reading_context_receipt_result_coherent" CHECK (
		("command_type" = 'clear' AND "result_kind" = 'cleared' AND "result_revision_id" IS NULL AND "result_revision_number" IS NULL)
		OR
		("command_type" = 'set' AND "result_kind" IN ('created', 'updated') AND "result_revision_id" IS NOT NULL AND "result_revision_number" > 0)
	)
);
--> statement-breakpoint
ALTER TABLE "birth_profile_reading_context_mutation_receipts" ADD CONSTRAINT "birth_profile_reading_context_mutation_receipts_profile_id_birth_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."birth_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "reading_context_mutation_receipts_profile_idx" ON "birth_profile_reading_context_mutation_receipts" USING btree ("profile_id");
