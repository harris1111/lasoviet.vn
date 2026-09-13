import { isDeepStrictEqual } from "node:util";
import { eq } from "drizzle-orm";

import {
  ReportSourceSnapshotV1Schema,
  type ReportSourceSnapshotV1,
  type Result,
  type ZiweiReportSnapshotV1,
} from "@lasoviet/contracts";
import {
  reportSourceSnapshots,
  type Database,
} from "@lasoviet/database";

export type ReportSourceSnapshotConflictCode =
  | "REPORT_SOURCE_SNAPSHOT_INVALID"
  | "REPORT_SOURCE_SNAPSHOT_CONFLICT";

export type PersistedReportSourceSnapshotRecord = {
  id: string;
  reportId: string;
  reportVersionId: string;
  chartVersionId: string;
  asOfDate: string;
  targetYear: number;
  timingRuleVersion: string;
  sensitivityRuleVersion: string;
  snapshotHash: string;
  snapshot: ZiweiReportSnapshotV1;
  createdAt: Date;
};

export type ReportSourceSnapshotRepository = {
  getByReportVersionId(
    reportVersionId: string,
  ): Promise<PersistedReportSourceSnapshotRecord | null>;
  persist(
    input: unknown,
  ): Promise<
    Result<
      PersistedReportSourceSnapshotRecord,
      ReportSourceSnapshotConflictCode
    >
  >;
};

function invalid(): Result<never, "REPORT_SOURCE_SNAPSHOT_INVALID"> {
  return {
    ok: false,
    error: {
      code: "REPORT_SOURCE_SNAPSHOT_INVALID",
      messageKey: "reports.report_source_snapshot_invalid",
      retryable: false,
    },
  };
}

function conflict(): Result<never, "REPORT_SOURCE_SNAPSHOT_CONFLICT"> {
  return {
    ok: false,
    error: {
      code: "REPORT_SOURCE_SNAPSHOT_CONFLICT",
      messageKey: "reports.report_source_snapshot_conflict",
      retryable: false,
    },
  };
}

function mapRow(
  row: typeof reportSourceSnapshots.$inferSelect,
): PersistedReportSourceSnapshotRecord {
  const parsed = ReportSourceSnapshotV1Schema.safeParse({
    version: 1,
    reportId: row.reportId,
    reportVersionId: row.reportVersionId,
    chartVersionId: row.chartVersionId,
    asOfDate: row.asOfDate,
    targetYear: row.targetYear,
    timingRuleVersion: row.timingRuleVersion,
    sensitivityRuleVersion: row.sensitivityRuleVersion,
    snapshotHash: row.snapshotHash,
    snapshot: row.snapshot,
  });

  if (!parsed.success) {
    throw new Error("CORRUPT_REPORT_SOURCE_SNAPSHOT");
  }

  const data = parsed.data;

  return {
    id: row.id,
    reportId: data.reportId,
    reportVersionId: data.reportVersionId,
    chartVersionId: data.chartVersionId,
    asOfDate: data.asOfDate,
    targetYear: data.targetYear,
    timingRuleVersion: data.timingRuleVersion,
    sensitivityRuleVersion: data.sensitivityRuleVersion,
    snapshotHash: data.snapshotHash,
    snapshot: data.snapshot,
    createdAt: row.createdAt,
  };
}

export function createDatabaseReportSourceSnapshotRepository(
  database: Database,
): ReportSourceSnapshotRepository {
  return {
    async getByReportVersionId(
      reportVersionId: string,
    ): Promise<PersistedReportSourceSnapshotRecord | null> {
      if (typeof reportVersionId !== "string" || !reportVersionId.trim()) {
        return null;
      }

      const [row] = await database
        .select()
        .from(reportSourceSnapshots)
        .where(eq(reportSourceSnapshots.reportVersionId, reportVersionId.trim()))
        .limit(1);

      return row ? mapRow(row) : null;
    },

    async persist(
      input: unknown,
    ): Promise<
      Result<
        PersistedReportSourceSnapshotRecord,
        ReportSourceSnapshotConflictCode
      >
    > {
      const parsed = ReportSourceSnapshotV1Schema.safeParse(input);
      if (!parsed.success) {
        return invalid();
      }

      const data = parsed.data;

      const [inserted] = await database
        .insert(reportSourceSnapshots)
        .values({
          reportId: data.reportId,
          reportVersionId: data.reportVersionId,
          chartVersionId: data.chartVersionId,
          asOfDate: data.asOfDate,
          targetYear: data.targetYear,
          timingRuleVersion: data.timingRuleVersion,
          sensitivityRuleVersion: data.sensitivityRuleVersion,
          snapshotHash: data.snapshotHash,
          snapshot: data.snapshot,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted) {
        return { ok: true, value: mapRow(inserted) };
      }

      const [existing] = await database
        .select()
        .from(reportSourceSnapshots)
        .where(eq(reportSourceSnapshots.reportVersionId, data.reportVersionId))
        .limit(1);

      if (!existing) {
        return conflict();
      }

      const matches =
        existing.reportId === data.reportId &&
        existing.reportVersionId === data.reportVersionId &&
        existing.chartVersionId === data.chartVersionId &&
        existing.asOfDate === data.asOfDate &&
        existing.targetYear === data.targetYear &&
        existing.timingRuleVersion === data.timingRuleVersion &&
        existing.sensitivityRuleVersion === data.sensitivityRuleVersion &&
        existing.snapshotHash === data.snapshotHash &&
        isDeepStrictEqual(existing.snapshot, data.snapshot);

      if (!matches) {
        return conflict();
      }

      return { ok: true, value: mapRow(existing) };
    },
  };
}
