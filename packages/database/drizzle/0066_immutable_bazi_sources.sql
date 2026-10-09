CREATE TABLE IF NOT EXISTS "bazi_sources" (
  "id" text PRIMARY KEY,
  "profile_id" text NOT NULL REFERENCES "birth_profiles"("id") ON DELETE CASCADE,
  "profile_revision_id" text NOT NULL REFERENCES "birth_profile_revisions"("id") ON DELETE CASCADE,
  "calculation_run_id" text NOT NULL REFERENCES "calculation_runs"("id") ON DELETE CASCADE,
  "mapping_version" text NOT NULL,
  "profile_revision_hash" text NOT NULL,
  "resolved_input" jsonb NOT NULL,
  "normalized_output" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL,
  CONSTRAINT "bazi_sources_mapping_valid" CHECK (
    mapping_version = 'lasoviet.bazi.birth-profile.v1' AND profile_revision_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "bazi_sources_objects" CHECK (
    jsonb_typeof(resolved_input) = 'object' AND jsonb_typeof(normalized_output) = 'object'
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bazi_sources_run_unique" ON "bazi_sources"("calculation_run_id");
CREATE INDEX IF NOT EXISTS "bazi_sources_revision_idx" ON "bazi_sources"("profile_revision_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_bazi_source_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision birth_profile_revisions%ROWTYPE; run calculation_runs%ROWTYPE; p jsonb;
BEGIN
  -- Lock referenced inputs before binding the source. Updates of referenced rows
  -- cannot interleave with publication; historical Ziwei-only rows stay mutable.
  SELECT * INTO revision FROM birth_profile_revisions WHERE id = NEW.profile_revision_id FOR UPDATE;
  SELECT * INTO run FROM calculation_runs WHERE id = NEW.calculation_run_id FOR UPDATE;
  p := NEW.normalized_output->'provenance';
  IF NOT ((revision.id IS NOT NULL AND run.id IS NOT NULL
    AND revision.profile_id = NEW.profile_id AND run.profile_id = NEW.profile_id
    AND run.profile_revision_id = NEW.profile_revision_id
    AND run.engine_id = 'lunar-typescript' AND run.engine_version = 'lunar-typescript1.8.6'
    AND run.adapter_id = 'lasoviet.bazi.lunar' AND run.adapter_version = '1.0.0'
    AND run.schema_id = 'lasoviet.normalized-bazi.v1' AND run.rule_set_id = 'bazi.vendor-civil-midnight.v1'
    AND run.input_hash ~ '^[0-9a-f]{64}$' AND run.config_hash ~ '^[0-9a-f]{64}$'
    AND run.raw_snapshot_hash ~ '^[0-9a-f]{64}$'
    AND run.idempotency_key = concat_ws(':', 'bazi', run.input_hash, run.engine_version, run.adapter_version, run.config_hash)
    AND NEW.created_at = run.created_at
    AND NEW.normalized_output->>'version' = '1' AND NEW.normalized_output->>'systemId' = 'bazi'
    AND p->>'engineId' = run.engine_id AND p->>'engineVersion' = run.engine_version
    AND p->>'adapterId' = run.adapter_id AND p->>'adapterVersion' = run.adapter_version
    AND p->>'schemaId' = run.schema_id AND p->>'ruleSetId' = run.rule_set_id
    AND p->>'inputHash' = run.input_hash AND p->>'configHash' = run.config_hash
    AND p->>'rawSnapshotHash' = run.raw_snapshot_hash
    AND (p->>'calculatedAt')::timestamptz = run.created_at
    AND NEW.normalized_output->'facts'->>'inputHash' = run.input_hash
    AND NEW.normalized_output->'structure'->>'sourceInputHash' = run.input_hash) IS TRUE)
  THEN RAISE EXCEPTION 'BAZI_SOURCE_BINDING_INVALID'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS bazi_source_binding ON bazi_sources;
CREATE TRIGGER bazi_source_binding BEFORE INSERT ON bazi_sources FOR EACH ROW EXECUTE FUNCTION enforce_bazi_source_binding();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_bazi_source_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'BAZI_SOURCE_IMMUTABLE'; END $$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS bazi_source_immutable ON bazi_sources;
CREATE TRIGGER bazi_source_immutable BEFORE UPDATE ON bazi_sources FOR EACH ROW EXECUTE FUNCTION prevent_bazi_source_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_bazi_referenced_input() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_TABLE_NAME = 'calculation_runs' AND EXISTS (SELECT 1 FROM bazi_sources WHERE calculation_run_id = OLD.id))
    OR (TG_TABLE_NAME = 'birth_profile_revisions' AND EXISTS (SELECT 1 FROM bazi_sources WHERE profile_revision_id = OLD.id))
  THEN RAISE EXCEPTION 'BAZI_SOURCE_INPUT_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS bazi_run_input_immutable ON calculation_runs;
CREATE TRIGGER bazi_run_input_immutable BEFORE UPDATE ON calculation_runs FOR EACH ROW EXECUTE FUNCTION preserve_bazi_referenced_input();
DROP TRIGGER IF EXISTS bazi_profile_input_immutable ON birth_profile_revisions;
CREATE TRIGGER bazi_profile_input_immutable BEFORE UPDATE ON birth_profile_revisions FOR EACH ROW EXECUTE FUNCTION preserve_bazi_referenced_input();
