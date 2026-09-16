import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { reportVersions } from "./reports.js";

export const reportAssets = pgTable("report_assets", {
  id: uuid("id").primaryKey(),
  reportId: uuid("report_id").notNull(),
  reportVersionId: uuid("report_version_id")
    .notNull()
    .references(() => reportVersions.reportVersionId, { onDelete: "restrict" }),
  renderVersion: text("render_version").notNull(),
  mediaType: text("media_type").notNull().default("application/pdf"),
  objectKey: text("object_key").notNull(),
  sha256: text("sha256"),
  byteLength: integer("byte_length"),
  status: text("status").notNull().default("render_pending"),
  replicaStatus: text("replica_status").notNull().default("replica_disabled"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastErrorCode: text("last_error_code"),
  leaseToken: text("lease_token"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true, mode: "date" }),
  stateVersion: integer("state_version").notNull().default(1),
  garageEtag: text("garage_etag"),
  garageVersionId: text("garage_version_id"),
  storedAt: timestamp("stored_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("report_assets_report_version_unique").on(table.reportVersionId),
  uniqueIndex("report_assets_object_key_unique").on(table.objectKey),
  index("report_assets_status_lease_idx").on(table.status, table.leaseExpiresAt),
  check(
    "report_assets_render_version_supported",
    sql`${table.renderVersion} IN ('identity-report-pdf.v1', 'identity-report-pdf.v2')`,
  ),
  check(
    "report_assets_media_type_pdf",
    sql`${table.mediaType} = 'application/pdf'`,
  ),
  check(
    "report_assets_status_bounded",
    sql`${table.status} IN ('render_pending', 'rendering', 'rendered', 'storing', 'stored', 'store_retryable_failure', 'terminal_failure')`,
  ),
  check(
    "report_assets_replica_status_bounded",
    sql`${table.replicaStatus} = 'replica_disabled'`,
  ),
  check(
    "report_assets_error_code_bounded",
    sql`${table.lastErrorCode} IS NULL OR ${table.lastErrorCode} IN ('PDF_RENDER_FAILED', 'PDF_TEMP_CLEANUP_FAILED', 'PDF_FONT_MISSING', 'PDF_RENDER_VERSION_UNSUPPORTED', 'GARAGE_UNAVAILABLE', 'ASSET_CHECKSUM_MISMATCH', 'ASSET_KEY_CONFLICT')`,
  ),
  check(
    "report_assets_integrity_metadata",
    sql`(${table.sha256} IS NULL AND ${table.byteLength} IS NULL) OR (${table.sha256} ~ '^[a-f0-9]{64}$' AND ${table.byteLength} > 0)`,
  ),
  check(
    "report_assets_positive_attempts_and_state_version",
    sql`${table.attemptCount} >= 0 AND ${table.stateVersion} > 0`,
  ),
]);
