ALTER TABLE "report_section_quality_candidates"
ADD COLUMN "terminal_findings" jsonb;
--> statement-breakpoint
ALTER TABLE "report_section_quality_candidates"
ADD CONSTRAINT "report_section_quality_candidates_terminal_findings_bounded"
CHECK (
  "terminal_findings" IS NULL
  OR "report_section_quality_findings_valid"("terminal_findings")
);
--> statement-breakpoint
ALTER TABLE "report_section_quality_candidates"
ADD CONSTRAINT "report_section_quality_candidates_terminal_findings_status"
CHECK (
  "status" = 'terminal_failure'
  OR "terminal_findings" IS NULL
);
