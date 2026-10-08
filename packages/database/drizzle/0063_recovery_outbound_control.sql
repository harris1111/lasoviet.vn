CREATE TABLE recovery_outbound_control (
  id text PRIMARY KEY CHECK (id = 'pending-topup'),
  emergency_stopped boolean NOT NULL DEFAULT true,
  cohort_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_limit integer NOT NULL DEFAULT 5 CHECK (daily_limit BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recovery_outbound_cohort_size CHECK (jsonb_typeof(cohort_ids) = 'array' AND jsonb_array_length(cohort_ids) <= 5)
);
--> statement-breakpoint
INSERT INTO recovery_outbound_control (id) VALUES ('pending-topup');
--> statement-breakpoint
CREATE TABLE recovery_outbound_daily_attempts (
  utc_day text PRIMARY KEY CHECK (utc_day ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION preserve_recovery_attempt_budget() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR NEW.utc_day IS DISTINCT FROM OLD.utc_day OR NEW.attempts < OLD.attempts THEN
    RAISE EXCEPTION 'recovery attempt reservations cannot be removed or decreased';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER recovery_attempt_budget_monotonic BEFORE UPDATE OR DELETE ON recovery_outbound_daily_attempts FOR EACH ROW EXECUTE FUNCTION preserve_recovery_attempt_budget();
