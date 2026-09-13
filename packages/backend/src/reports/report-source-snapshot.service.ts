import { eq } from "drizzle-orm";

import {
  NormalizedBirthProfileV1Schema,
  ReportGenerationRequestedV2Schema,
  ReportSourceSnapshotV1Schema,
  type NormalizedBirthProfileV1,
  type ReportGenerationRequestedV2,
  type ReportSourceSnapshotV1,
  type Result,
  type ZiweiReportSnapshotV1,
} from "@lasoviet/contracts";
import {
  birthProfileRevisions,
  ziweiCharts,
  ziweiChartVersions,
  type Database,
} from "@lasoviet/database";

import type {
  PersistedReportSourceSnapshotRecord,
  ReportSourceSnapshotConflictCode,
  ReportSourceSnapshotRepository,
} from "./report-source-snapshot.repository.js";

export type ReportSnapshotCalculatorInput = {
  chartVersionId: string;
  birthProfile: NormalizedBirthProfileV1;
  asOfDate: string;
  targetYear: number;
  timingRuleVersion?: string;
  sensitivityRuleVersion?: string;
};

export type ReportSnapshotCalculator = (
  input: ReportSnapshotCalculatorInput,
) => Promise<
  Result<
    ZiweiReportSnapshotV1,
    "ENGINE_INPUT_INVALID" | "ENGINE_UNAVAILABLE" | "NORMALIZATION_INVALID"
  >
>;

export type ReportSourceSnapshotPreparationErrorCode =
  | "REPORT_SOURCE_SNAPSHOT_INVALID"
  | "REPORT_SOURCE_SNAPSHOT_CONFLICT"
  | "REPORT_SOURCE_SNAPSHOT_UNAVAILABLE";

export type ReportSourceSnapshotPreparationServiceDependencies = {
  database: Database;
  repository: ReportSourceSnapshotRepository;
  calculateSnapshot: ReportSnapshotCalculator;
};

export type ReportSourceSnapshotPreparationService = {
  prepare(
    payload: unknown,
  ): Promise<
    Result<
      PersistedReportSourceSnapshotRecord,
      ReportSourceSnapshotPreparationErrorCode
    >
  >;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function unavailable(): Result<never, "REPORT_SOURCE_SNAPSHOT_UNAVAILABLE"> {
  return {
    ok: false,
    error: {
      code: "REPORT_SOURCE_SNAPSHOT_UNAVAILABLE",
      messageKey: "reports.report_source_snapshot_unavailable",
      retryable: true,
    },
  };
}

export function createReportSourceSnapshotPreparationService(
  dependencies: ReportSourceSnapshotPreparationServiceDependencies,
): ReportSourceSnapshotPreparationService {
  return {
    async prepare(
      payload: unknown,
    ): Promise<
      Result<
        PersistedReportSourceSnapshotRecord,
        ReportSourceSnapshotPreparationErrorCode
      >
    > {
      const parsedPayload = ReportGenerationRequestedV2Schema.safeParse(payload);
      if (!parsedPayload.success) {
        return invalid();
      }
      const data = parsedPayload.data;

      if (!UUID_REGEX.test(data.reportId) || !UUID_REGEX.test(data.reportVersionId)) {
        return invalid();
      }

      let existing: PersistedReportSourceSnapshotRecord | null;
      try {
        existing = await dependencies.repository.getByReportVersionId(data.reportVersionId);
      } catch (error) {
        return classifyRepositoryError(error);
      }

      if (existing) {
        const matches =
          existing.reportId === data.reportId &&
          existing.reportVersionId === data.reportVersionId &&
          existing.chartVersionId === data.chartVersionId &&
          existing.asOfDate === data.asOfDate &&
          existing.targetYear === data.targetYear &&
          existing.timingRuleVersion === data.timingRuleVersion &&
          existing.sensitivityRuleVersion === data.sensitivityRuleVersion;

        if (!matches) {
          return conflict();
        }

        return { ok: true, value: existing };
      }

      let row:
        | {
            originalInput: Record<string, unknown>;
            normalizedInput: Record<string, unknown> | null;
          }
        | undefined;
      try {
        const [found] = await dependencies.database
          .select({
            originalInput: birthProfileRevisions.originalInput,
            normalizedInput: birthProfileRevisions.normalizedInput,
          })
          .from(ziweiChartVersions)
          .innerJoin(ziweiCharts, eq(ziweiCharts.id, ziweiChartVersions.chartId))
          .innerJoin(
            birthProfileRevisions,
            eq(birthProfileRevisions.id, ziweiCharts.profileRevisionId),
          )
          .where(eq(ziweiChartVersions.id, data.chartVersionId))
          .limit(1);
        row = found;
      } catch {
        return unavailable();
      }

      if (!row || !row.originalInput || !row.normalizedInput) {
        return invalid();
      }

      const reconstructed = {
        ...row.normalizedInput,
        originalInput: row.originalInput,
      };

      const parsedProfile = NormalizedBirthProfileV1Schema.safeParse(reconstructed);
      if (!parsedProfile.success) {
        return invalid();
      }

      let calcResult: Result<
        ZiweiReportSnapshotV1,
        "ENGINE_INPUT_INVALID" | "ENGINE_UNAVAILABLE" | "NORMALIZATION_INVALID"
      >;
      try {
        calcResult = await dependencies.calculateSnapshot({
          chartVersionId: data.chartVersionId,
          birthProfile: parsedProfile.data,
          asOfDate: data.asOfDate,
          targetYear: data.targetYear,
          timingRuleVersion: data.timingRuleVersion,
          sensitivityRuleVersion: data.sensitivityRuleVersion,
        });
      } catch {
        return unavailable();
      }

      if (!calcResult.ok) {
        if (calcResult.error.code === "ENGINE_UNAVAILABLE") {
          return unavailable();
        }
        return invalid();
      }

      const snapshot = calcResult.value;
      const snapshotCandidate = {
        version: 1 as const,
        reportId: data.reportId,
        reportVersionId: data.reportVersionId,
        chartVersionId: data.chartVersionId,
        asOfDate: data.asOfDate,
        targetYear: data.targetYear,
        timingRuleVersion: data.timingRuleVersion,
        sensitivityRuleVersion: data.sensitivityRuleVersion,
        snapshotHash: snapshot.provenance.snapshotHash,
        snapshot,
      };

      const parsedSourceSnapshot = ReportSourceSnapshotV1Schema.safeParse(snapshotCandidate);
      if (!parsedSourceSnapshot.success) {
        return invalid();
      }

      let persistResult: Result<
        PersistedReportSourceSnapshotRecord,
        ReportSourceSnapshotConflictCode
      >;
      try {
        persistResult = await dependencies.repository.persist(parsedSourceSnapshot.data);
      } catch (error) {
        return classifyRepositoryError(error);
      }

      if (!persistResult.ok) {
        if (persistResult.error.code === "REPORT_SOURCE_SNAPSHOT_CONFLICT") {
          return conflict();
        }
        return invalid();
      }

      return { ok: true, value: persistResult.value };
    },
  };
}

function classifyRepositoryError(
  error: unknown,
): Result<
  never,
  "REPORT_SOURCE_SNAPSHOT_INVALID" | "REPORT_SOURCE_SNAPSHOT_UNAVAILABLE"
> {
  if (
    (error instanceof Error && error.message === "CORRUPT_REPORT_SOURCE_SNAPSHOT") ||
    error === "CORRUPT_REPORT_SOURCE_SNAPSHOT"
  ) {
    return invalid();
  }
  return unavailable();
}
