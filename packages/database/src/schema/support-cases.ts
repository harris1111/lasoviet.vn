import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { reportAssets } from "./assets.js";
import { reportVersions } from "./reports.js";

export const supportCases = pgTable("support_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").notNull(),
  reportVersionId: uuid("report_version_id")
    .notNull()
    .references(() => reportVersions.reportVersionId, { onDelete: "restrict" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => reportAssets.id, { onDelete: "restrict" }),
  failureStage: text("failure_stage").notNull(),
  errorCode: text("error_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("support_cases_report_version_stage_unique").on(
    table.reportVersionId,
    table.failureStage,
  ),
  index("support_cases_asset_idx").on(table.assetId),
  check(
    "support_cases_failure_stage_bounded",
    sql`${table.failureStage} IN ('pdf', 'garage')`,
  ),
  check(
    "support_cases_error_code_bounded",
    sql`${table.errorCode} IN ('PDF_RENDER_FAILED', 'PDF_TEMP_CLEANUP_FAILED', 'PDF_FONT_MISSING', 'PDF_RENDER_VERSION_UNSUPPORTED', 'GARAGE_UNAVAILABLE', 'ASSET_CHECKSUM_MISMATCH', 'ASSET_KEY_CONFLICT')`,
  ),
]);
