import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, asc, eq, gt, sql } from "drizzle-orm";

import type { Result } from "@lasoviet/contracts";
import {
  reportQueueJobs,
  reportReservations,
  reportSectionCheckpoints,
  reportSectionCheckpointRevisions,
  type Database,
} from "@lasoviet/database";

import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  parseComprehensiveReportAcceptedSection,
  resolveComprehensiveReportSectionKeys,
  type ComprehensiveReportAcceptedSection,
  type ComprehensiveReportSectionKey,
} from "./comprehensive-report-section-v4.js";

export type ReportSectionCheckpointStatus =
  | "pending"
  | "generating"
  | "passed"
  | "terminal_failure";

export type ReportSectionCheckpointLineage = {
  reportVersionId: string;
  sectionKey: ComprehensiveReportSectionKey;
  sectionOrder: number;
  promptVersion: string;
  knowledgeVersionId: string;
  reportConfigVersion: string;
  qualityConfigVersion: string;
};

export type PersistedReportSectionCheckpoint = ReportSectionCheckpointLineage & {
  id: string;
  stateVersion: number;
  status: ReportSectionCheckpointStatus;
  generationAttemptCount: number;
  rewriteAttemptCount: number;
  activeJobId: string | null;
  activeWorkerId: string | null;
  acceptedSection: ComprehensiveReportAcceptedSection | null;
  contentHash: string | null;
  providerId: string | null;
  modelId: string | null;
  failureCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportSectionCheckpointError =
  | "REPORT_SECTION_CHECKPOINT_INVALID"
  | "REPORT_VERSION_CONFLICT"
  | "REPORT_SECTION_CHECKPOINT_LEASE_LOST"
  | "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT"
  | "REPORT_SECTION_CHECKPOINT_CORRUPT";

export type PersistedReportSectionCheckpointRevision = {
  id: string;
  checkpointId: string;
  rewriteOrdinal: number;
  stateVersion: number;
  status: ReportSectionCheckpointStatus;
  activeJobId: string | null;
  activeWorkerId: string | null;
  acceptedSection: ComprehensiveReportAcceptedSection | null;
  contentHash: string | null;
  providerId: string | null;
  modelId: string | null;
  failureCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClaimReportSectionCheckpointInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  mode: "generation" | "rewrite";
  generationAttemptCap: number;
  rewriteAttemptCap: number;
};

export type MarkPassedReportSectionCheckpointInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  expectedStateVersion: number;
  acceptedContent: unknown;
  contentHash: string;
  providerId: string;
  modelId: string;
};

export type ReleaseReportSectionCheckpointInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  expectedStateVersion: number;
  failureCode: string;
};

export type ClaimPassedReportSectionRewriteInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  rewriteAttemptCap: number;
};

export type MarkPassedReportSectionRewriteInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  rewriteOrdinal: number;
  expectedStateVersion: number;
  acceptedContent: unknown;
  contentHash: string;
  providerId: string;
  modelId: string;
};

export type ReleaseReportSectionRewriteInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  rewriteOrdinal: number;
  expectedStateVersion: number;
  failureCode: string;
};

export type ReportSectionCheckpointRepository = {
  get(
    reportVersionId: string,
    sectionKey: ComprehensiveReportSectionKey,
  ): Promise<Result<PersistedReportSectionCheckpoint | null, "REPORT_SECTION_CHECKPOINT_CORRUPT">>;
  listPassed(
    reportVersionId: string,
  ): Promise<Result<readonly PersistedReportSectionCheckpoint[], "REPORT_SECTION_CHECKPOINT_CORRUPT">>;
  claim(
    input: ClaimReportSectionCheckpointInput,
  ): Promise<Result<
    { outcome: "claimed" | "replay" | "terminal"; checkpoint: PersistedReportSectionCheckpoint },
    Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT">
  >>;
  markPassed(
    input: MarkPassedReportSectionCheckpointInput,
  ): Promise<Result<
    { outcome: "passed" | "replay"; checkpoint: PersistedReportSectionCheckpoint },
    Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT" | "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT">
  >>;
  releaseRetryableFailure(
    input: ReleaseReportSectionCheckpointInput,
  ): Promise<Result<PersistedReportSectionCheckpoint, Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT" | "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT">>>;
  markTerminalFailure(
    input: ReleaseReportSectionCheckpointInput,
  ): Promise<Result<PersistedReportSectionCheckpoint, Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT" | "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT">>>;
  claimPassedRewrite(
    input: ClaimPassedReportSectionRewriteInput,
  ): Promise<Result<
    { outcome: "claimed" | "replay" | "terminal"; revision: PersistedReportSectionCheckpointRevision },
    Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT">
  >>;
  markPassedRewrite(
    input: MarkPassedReportSectionRewriteInput,
  ): Promise<Result<
    { outcome: "passed" | "replay"; revision: PersistedReportSectionCheckpointRevision },
    Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT" | "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT">
  >>;
  releaseRewriteRetryableFailure(
    input: ReleaseReportSectionRewriteInput,
  ): Promise<Result<PersistedReportSectionCheckpointRevision, Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT" | "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT">>>;
  markRewriteTerminalFailure(
    input: ReleaseReportSectionRewriteInput,
  ): Promise<Result<PersistedReportSectionCheckpointRevision, Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT" | "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT">>>;
  listAccepted(
    reportVersionId: string,
  ): Promise<Result<readonly PersistedReportSectionCheckpoint[], "REPORT_SECTION_CHECKPOINT_CORRUPT">>;
};

type CheckpointRow = typeof reportSectionCheckpoints.$inferSelect;
type RevisionRow = typeof reportSectionCheckpointRevisions.$inferSelect;
type MutatingError = Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT">;

function failure<TCode extends string>(code: TCode): Result<never, TCode> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `reports.${code.toLowerCase()}`,
      retryable: code === "REPORT_SECTION_CHECKPOINT_LEASE_LOST",
    },
  };
}

function nonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function failureCode(value: unknown): value is string {
  return nonBlank(value) && value.length <= 120;
}

function validLineage(value: ReportSectionCheckpointLineage): boolean {
  let sectionKeys: readonly string[];
  try {
    sectionKeys = resolveComprehensiveReportSectionKeys(value.reportConfigVersion);
  } catch {
    return false;
  }
  return (
    nonBlank(value.reportVersionId) &&
    nonBlank(value.sectionKey) &&
    sectionKeys.includes(value.sectionKey) &&
    Number.isInteger(value.sectionOrder) &&
    value.sectionOrder === sectionKeys.indexOf(value.sectionKey) &&
    nonBlank(value.promptVersion) &&
    nonBlank(value.knowledgeVersionId) &&
    nonBlank(value.reportConfigVersion) &&
    nonBlank(value.qualityConfigVersion)
  );
}

function lineageMatches(
  row: CheckpointRow,
  lineage: ReportSectionCheckpointLineage,
): boolean {
  return (
    row.reportVersionId === lineage.reportVersionId &&
    row.sectionKey === lineage.sectionKey &&
    row.sectionOrder === lineage.sectionOrder &&
    row.promptVersion === lineage.promptVersion &&
    row.knowledgeVersionId === lineage.knowledgeVersionId &&
    row.reportConfigVersion === lineage.reportConfigVersion &&
    row.qualityConfigVersion === lineage.qualityConfigVersion
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new Error("REPORT_SECTION_CHECKPOINT_CANONICAL_JSON_INVALID");
}

function contentHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function mapRow(row: CheckpointRow): PersistedReportSectionCheckpoint {
  let sectionKeys: readonly string[];
  try {
    sectionKeys = resolveComprehensiveReportSectionKeys(row.reportConfigVersion);
  } catch {
    throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  }
  if (
    !sectionKeys.includes(row.sectionKey) ||
    row.sectionOrder !== sectionKeys.indexOf(row.sectionKey as ComprehensiveReportSectionKey) ||
    !nonBlank(row.reportVersionId) ||
    !nonBlank(row.promptVersion) ||
    !nonBlank(row.knowledgeVersionId) ||
    !nonBlank(row.reportConfigVersion) ||
    !nonBlank(row.qualityConfigVersion) ||
    !Number.isInteger(row.stateVersion) ||
    row.stateVersion < 1 ||
    !Number.isInteger(row.generationAttemptCount) ||
    row.generationAttemptCount < 0 ||
    !Number.isInteger(row.rewriteAttemptCount) ||
    row.rewriteAttemptCount < 0 ||
    !["pending", "generating", "passed", "terminal_failure"].includes(row.status)
  ) {
    throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  }

  const hasOwner = nonBlank(row.activeJobId) && nonBlank(row.activeWorkerId);
  if ((row.status === "generating") !== hasOwner) {
    throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  }

  let acceptedSection: ComprehensiveReportAcceptedSection | null = null;
  if (row.status === "passed") {
    if (!row.acceptedContent || !nonBlank(row.contentHash) || !/^[a-f0-9]{64}$/.test(row.contentHash) || !nonBlank(row.providerId) || !nonBlank(row.modelId)) {
      throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
    }
    try {
      acceptedSection = parseComprehensiveReportAcceptedSection({
        key: row.sectionKey,
        value: row.acceptedContent,
      }, row.reportConfigVersion);
    } catch {
      throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
    }
    if (contentHash(acceptedSection.value) !== row.contentHash) {
      throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
    }
  } else if (
    row.acceptedContent !== null ||
    row.contentHash !== null ||
    row.providerId !== null ||
    row.modelId !== null
  ) {
    throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  }

  return {
    id: row.id,
    reportVersionId: row.reportVersionId,
    sectionKey: row.sectionKey as ComprehensiveReportSectionKey,
    sectionOrder: row.sectionOrder,
    promptVersion: row.promptVersion,
    knowledgeVersionId: row.knowledgeVersionId,
    reportConfigVersion: row.reportConfigVersion,
    qualityConfigVersion: row.qualityConfigVersion,
    stateVersion: row.stateVersion,
    status: row.status as ReportSectionCheckpointStatus,
    generationAttemptCount: row.generationAttemptCount,
    rewriteAttemptCount: row.rewriteAttemptCount,
    activeJobId: row.activeJobId,
    activeWorkerId: row.activeWorkerId,
    acceptedSection,
    contentHash: row.contentHash,
    providerId: row.providerId,
    modelId: row.modelId,
    failureCode: row.failureCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRevisionRow(
  row: RevisionRow,
  sectionKey: ComprehensiveReportSectionKey,
  reportConfigVersion: string,
): PersistedReportSectionCheckpointRevision {
  if (
    !nonBlank(row.checkpointId) ||
    !Number.isInteger(row.rewriteOrdinal) ||
    row.rewriteOrdinal < 1 ||
    !Number.isInteger(row.stateVersion) ||
    row.stateVersion < 1 ||
    !["pending", "generating", "passed", "terminal_failure"].includes(row.status)
  ) throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  const hasOwner = nonBlank(row.activeJobId) && nonBlank(row.activeWorkerId);
  if ((row.status === "generating") !== hasOwner) throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  let acceptedSection: ComprehensiveReportAcceptedSection | null = null;
  if (row.status === "passed") {
    if (!row.acceptedContent || !nonBlank(row.contentHash) || !/^[a-f0-9]{64}$/.test(row.contentHash) || !nonBlank(row.providerId) || !nonBlank(row.modelId)) {
      throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
    }
    acceptedSection = parseComprehensiveReportAcceptedSection({ key: sectionKey, value: row.acceptedContent }, reportConfigVersion);
    if (contentHash(acceptedSection.value) !== row.contentHash) throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  } else if (row.acceptedContent !== null || row.contentHash !== null || row.providerId !== null || row.modelId !== null) {
    throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  }
  return {
    id: row.id, checkpointId: row.checkpointId, rewriteOrdinal: row.rewriteOrdinal,
    stateVersion: row.stateVersion, status: row.status as ReportSectionCheckpointStatus,
    activeJobId: row.activeJobId, activeWorkerId: row.activeWorkerId, acceptedSection,
    contentHash: row.contentHash, providerId: row.providerId, modelId: row.modelId,
    failureCode: row.failureCode, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function matchingPassedReplay(
  row: CheckpointRow,
  accepted: ComprehensiveReportAcceptedSection,
  hash: string,
  input: MarkPassedReportSectionCheckpointInput,
): Result<
  { outcome: "replay"; checkpoint: PersistedReportSectionCheckpoint },
  "REPORT_VERSION_CONFLICT"
> {
  const persisted = mapRow(row);
  if (
    persisted.contentHash !== hash ||
    persisted.providerId !== input.providerId ||
    persisted.modelId !== input.modelId ||
    !persisted.acceptedSection ||
    !isDeepStrictEqual(persisted.acceptedSection.value, accepted.value)
  ) return failure("REPORT_VERSION_CONFLICT");
  return { ok: true, value: { outcome: "replay", checkpoint: persisted } };
}

export function createDatabaseReportSectionCheckpointRepository(
  database: Database,
  options: {
    now?: () => Date;
    /** Test-only hook invoked after the current queue and reservation fence rows lock. */
    onFenceLocked?: () => Promise<void> | void;
  } = {},
): ReportSectionCheckpointRepository {
  const now = options.now ?? (() => new Date());

  async function lockActiveReservationLease(
    transaction: Database,
    reportVersionId: string,
    jobId: string,
    workerId: string,
    current: Date,
    invokeHook = false,
  ): Promise<boolean> {
    const [lease] = await transaction
      .select({ id: reportQueueJobs.id })
      .from(reportQueueJobs)
      .where(and(
        eq(reportQueueJobs.id, jobId),
        eq(reportQueueJobs.status, "leased"),
        eq(reportQueueJobs.leasedBy, workerId),
        gt(reportQueueJobs.leasedUntil, current),
      ))
      .for("update")
      .limit(1);
    if (!lease) return false;

    const [reservation] = await transaction
      .select({ id: reportReservations.id })
      .from(reportReservations)
      .where(and(
        eq(reportReservations.reportVersionId, reportVersionId),
        eq(reportReservations.status, "generating"),
        eq(reportReservations.activeJobId, jobId),
      ))
      .for("update")
      .limit(1);
    if (!reservation) return false;

    if (invokeHook) await options.onFenceLocked?.();
    return true;
  }

  return {
    async get(reportVersionId, sectionKey) {
      if (!nonBlank(reportVersionId)) {
        return { ok: true, value: null };
      }
      const [row] = await database.select().from(reportSectionCheckpoints).where(and(
        eq(reportSectionCheckpoints.reportVersionId, reportVersionId),
        eq(reportSectionCheckpoints.sectionKey, sectionKey),
      )).limit(1);
      try {
        return { ok: true, value: row ? mapRow(row) : null };
      } catch {
        return failure("REPORT_SECTION_CHECKPOINT_CORRUPT");
      }
    },

    async listPassed(reportVersionId) {
      if (!nonBlank(reportVersionId)) return { ok: true, value: [] };
      const rows = await database.select().from(reportSectionCheckpoints).where(and(
        eq(reportSectionCheckpoints.reportVersionId, reportVersionId),
        eq(reportSectionCheckpoints.status, "passed"),
      )).orderBy(asc(reportSectionCheckpoints.sectionOrder), asc(reportSectionCheckpoints.sectionKey));
      try {
        return { ok: true, value: rows.map(mapRow) };
      } catch {
        return failure("REPORT_SECTION_CHECKPOINT_CORRUPT");
      }
    },

    async listAccepted(reportVersionId) {
      if (!nonBlank(reportVersionId)) return { ok: true, value: [] };
      const parents = await database.select().from(reportSectionCheckpoints).where(and(
        eq(reportSectionCheckpoints.reportVersionId, reportVersionId),
        eq(reportSectionCheckpoints.status, "passed"),
      )).orderBy(asc(reportSectionCheckpoints.sectionOrder), asc(reportSectionCheckpoints.sectionKey));
      try {
        const result: PersistedReportSectionCheckpoint[] = [];
        for (const parent of parents) {
          const checkpoint = mapRow(parent);
          const revisions = await database.select().from(reportSectionCheckpointRevisions).where(and(
            eq(reportSectionCheckpointRevisions.checkpointId, parent.id),
            eq(reportSectionCheckpointRevisions.status, "passed"),
          )).orderBy(asc(reportSectionCheckpointRevisions.rewriteOrdinal));
          const latest = revisions.at(-1);
          if (!latest) {
            result.push(checkpoint);
            continue;
          }
          const revision = mapRevisionRow(latest, checkpoint.sectionKey, checkpoint.reportConfigVersion);
          result.push({
            ...checkpoint,
            acceptedSection: revision.acceptedSection,
            contentHash: revision.contentHash,
            providerId: revision.providerId,
            modelId: revision.modelId,
          });
        }
        return { ok: true, value: result };
      } catch {
        return failure("REPORT_SECTION_CHECKPOINT_CORRUPT");
      }
    },

    async claim(input) {
      if (
        !validLineage(input) ||
        !nonBlank(input.jobId) ||
        !nonBlank(input.workerId) ||
        (input.mode !== "generation" && input.mode !== "rewrite") ||
        !Number.isInteger(input.generationAttemptCap) ||
        input.generationAttemptCap < 1 ||
        !Number.isInteger(input.rewriteAttemptCap) ||
        input.rewriteAttemptCap < 0
      ) return failure("REPORT_SECTION_CHECKPOINT_INVALID");

      return database.transaction(async (transaction) => {
        const current = now();
        if (!await lockActiveReservationLease(
          transaction,
          input.reportVersionId,
          input.jobId,
          input.workerId,
          current,
          true,
        )) {
          return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        }

        await transaction.insert(reportSectionCheckpoints).values({
          reportVersionId: input.reportVersionId,
          sectionKey: input.sectionKey,
          sectionOrder: input.sectionOrder,
          promptVersion: input.promptVersion,
          knowledgeVersionId: input.knowledgeVersionId,
          reportConfigVersion: input.reportConfigVersion,
          qualityConfigVersion: input.qualityConfigVersion,
          createdAt: current,
          updatedAt: current,
        }).onConflictDoNothing();

        const [row] = await transaction.select().from(reportSectionCheckpoints).where(and(
          eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId),
          eq(reportSectionCheckpoints.sectionKey, input.sectionKey),
        )).for("update").limit(1);
        if (!row || !lineageMatches(row, input)) return failure("REPORT_VERSION_CONFLICT");
        if (row.status === "passed") return { ok: true, value: { outcome: "replay" as const, checkpoint: mapRow(row) } };
        if (row.status === "terminal_failure") return { ok: true, value: { outcome: "terminal" as const, checkpoint: mapRow(row) } };
        if (row.status === "generating") {
          if (row.activeJobId === input.jobId && row.activeWorkerId === input.workerId) {
            return { ok: true, value: { outcome: "claimed" as const, checkpoint: mapRow(row) } };
          }
        }

        const count = input.mode === "generation" ? row.generationAttemptCount : row.rewriteAttemptCount;
        const cap = input.mode === "generation" ? input.generationAttemptCap : input.rewriteAttemptCap;
        if (count >= cap) {
          const [limited] = await transaction.update(reportSectionCheckpoints).set({
            status: "terminal_failure",
            activeJobId: null,
            activeWorkerId: null,
            failureCode: input.mode === "generation" ? "GENERATION_ATTEMPT_LIMIT" : "REWRITE_ATTEMPT_LIMIT",
            stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`,
            updatedAt: current,
          }).where(and(
            eq(reportSectionCheckpoints.id, row.id),
            eq(reportSectionCheckpoints.stateVersion, row.stateVersion),
          )).returning();
          if (!limited) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
          return failure("REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT");
        }

        const [claimed] = await transaction.update(reportSectionCheckpoints).set({
          status: "generating",
          activeJobId: input.jobId,
          activeWorkerId: input.workerId,
          failureCode: null,
          generationAttemptCount: input.mode === "generation"
            ? sql`${reportSectionCheckpoints.generationAttemptCount} + 1`
            : row.generationAttemptCount,
          rewriteAttemptCount: input.mode === "rewrite"
            ? sql`${reportSectionCheckpoints.rewriteAttemptCount} + 1`
            : row.rewriteAttemptCount,
          stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`,
          updatedAt: current,
        }).where(and(
          eq(reportSectionCheckpoints.id, row.id),
          eq(reportSectionCheckpoints.stateVersion, row.stateVersion),
        )).returning();
        if (!claimed) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        return { ok: true, value: { outcome: "claimed" as const, checkpoint: mapRow(claimed) } };
      });
    },

    async markPassed(input) {
      if (!validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) || !Number.isInteger(input.expectedStateVersion) || input.expectedStateVersion < 1 || !nonBlank(input.providerId) || !nonBlank(input.modelId) || !/^[a-f0-9]{64}$/.test(input.contentHash)) {
        return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      }
      let accepted: ComprehensiveReportAcceptedSection;
      try {
        accepted = parseComprehensiveReportAcceptedSection({
          key: input.sectionKey,
          value: input.acceptedContent,
        }, input.reportConfigVersion);
      } catch {
        return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      }
      const hash = contentHash(accepted.value);
      if (hash !== input.contentHash) return failure("REPORT_SECTION_CHECKPOINT_INVALID");

      const [existing] = await database.select().from(reportSectionCheckpoints).where(and(
        eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId),
        eq(reportSectionCheckpoints.sectionKey, input.sectionKey),
      )).limit(1);
      if (existing?.status === "passed") {
        if (!lineageMatches(existing, input)) return failure("REPORT_VERSION_CONFLICT");
        return matchingPassedReplay(existing, accepted, hash, input);
      }

      return database.transaction(async (transaction) => {
        const current = now();
        if (!await lockActiveReservationLease(
          transaction,
          input.reportVersionId,
          input.jobId,
          input.workerId,
          current,
          true,
        )) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [row] = await transaction.select().from(reportSectionCheckpoints).where(and(
          eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId),
          eq(reportSectionCheckpoints.sectionKey, input.sectionKey),
        )).for("update").limit(1);
        if (!row || !lineageMatches(row, input)) return failure("REPORT_VERSION_CONFLICT");
        if (row.status === "passed") {
          return matchingPassedReplay(row, accepted, hash, input);
        }
        if (
          row.status !== "generating" ||
          row.stateVersion !== input.expectedStateVersion ||
          row.activeJobId !== input.jobId ||
          row.activeWorkerId !== input.workerId
        ) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [passed] = await transaction.update(reportSectionCheckpoints).set({
          status: "passed",
          activeJobId: null,
          activeWorkerId: null,
          acceptedContent: accepted.value as Record<string, unknown>,
          contentHash: hash,
          providerId: input.providerId,
          modelId: input.modelId,
          failureCode: null,
          stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`,
          updatedAt: current,
        }).where(and(
          eq(reportSectionCheckpoints.id, row.id),
          eq(reportSectionCheckpoints.stateVersion, input.expectedStateVersion),
          eq(reportSectionCheckpoints.status, "generating"),
          eq(reportSectionCheckpoints.activeJobId, input.jobId),
          eq(reportSectionCheckpoints.activeWorkerId, input.workerId),
        )).returning();
        if (!passed) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        return { ok: true, value: { outcome: "passed" as const, checkpoint: mapRow(passed) } };
      });
    },

    async releaseRetryableFailure(input) {
      return mutateFailure(input, "pending");
    },

    async markTerminalFailure(input) {
      return mutateFailure(input, "terminal_failure");
    },

    async claimPassedRewrite(input) {
      if (!validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) || !Number.isInteger(input.rewriteAttemptCap) || input.rewriteAttemptCap < 1) {
        return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      }
      return database.transaction(async (transaction) => {
        const current = now();
        if (!await lockActiveReservationLease(transaction, input.reportVersionId, input.jobId, input.workerId, current, true)) {
          return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        }
        const [parent] = await transaction.select().from(reportSectionCheckpoints).where(and(
          eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId),
          eq(reportSectionCheckpoints.sectionKey, input.sectionKey),
        )).for("update").limit(1);
        if (!parent || !lineageMatches(parent, input)) return failure("REPORT_VERSION_CONFLICT");
        if (parent.status !== "passed") return failure("REPORT_VERSION_CONFLICT");

        const unfinished = await transaction.select().from(reportSectionCheckpointRevisions).where(and(
          eq(reportSectionCheckpointRevisions.checkpointId, parent.id),
          sql`${reportSectionCheckpointRevisions.status} IN ('pending', 'generating')`,
        )).orderBy(asc(reportSectionCheckpointRevisions.rewriteOrdinal)).for("update").limit(1);
        const revision = unfinished[0];
        if (revision?.status === "generating" && revision.activeJobId === input.jobId && revision.activeWorkerId === input.workerId) {
          return { ok: true, value: { outcome: "claimed" as const, revision: mapRevisionRow(revision, input.sectionKey, input.reportConfigVersion) } };
        }
        if (revision) {
          const [abandoned] = await transaction.update(reportSectionCheckpointRevisions).set({
            status: "terminal_failure",
            activeJobId: null,
            activeWorkerId: null,
            failureCode: "REWRITE_OWNER_ABANDONED",
            stateVersion: sql`${reportSectionCheckpointRevisions.stateVersion} + 1`,
            updatedAt: current,
          }).where(and(
            eq(reportSectionCheckpointRevisions.id, revision.id),
            eq(reportSectionCheckpointRevisions.stateVersion, revision.stateVersion),
            sql`${reportSectionCheckpointRevisions.status} IN ('pending', 'generating')`,
          )).returning();
          if (!abandoned) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        }

        if (parent.rewriteAttemptCount >= input.rewriteAttemptCap) {
          return failure("REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT");
        }
        const [incremented] = await transaction.update(reportSectionCheckpoints).set({
          rewriteAttemptCount: sql`${reportSectionCheckpoints.rewriteAttemptCount} + 1`,
          stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`,
          updatedAt: current,
        }).where(and(
          eq(reportSectionCheckpoints.id, parent.id),
          eq(reportSectionCheckpoints.stateVersion, parent.stateVersion),
          eq(reportSectionCheckpoints.status, "passed"),
        )).returning();
        if (!incremented) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [claimed] = await transaction.insert(reportSectionCheckpointRevisions).values({
          checkpointId: parent.id,
          rewriteOrdinal: incremented.rewriteAttemptCount,
          status: "generating",
          activeJobId: input.jobId,
          activeWorkerId: input.workerId,
          createdAt: current,
          updatedAt: current,
        }).returning();
        if (!claimed) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        return { ok: true, value: { outcome: "claimed" as const, revision: mapRevisionRow(claimed, input.sectionKey, input.reportConfigVersion) } };
      });
    },

    async markPassedRewrite(input) {
      if (!validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) || !Number.isInteger(input.rewriteOrdinal) || input.rewriteOrdinal < 1 || !Number.isInteger(input.expectedStateVersion) || input.expectedStateVersion < 1 || !nonBlank(input.providerId) || !nonBlank(input.modelId) || !/^[a-f0-9]{64}$/.test(input.contentHash)) return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      let accepted: ComprehensiveReportAcceptedSection;
      try {
        accepted = parseComprehensiveReportAcceptedSection({ key: input.sectionKey, value: input.acceptedContent }, input.reportConfigVersion);
      } catch {
        return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      }
      const hash = contentHash(accepted.value);
      if (hash !== input.contentHash) return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      return database.transaction(async (transaction) => {
        const current = now();
        if (!await lockActiveReservationLease(transaction, input.reportVersionId, input.jobId, input.workerId, current, true)) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [parent] = await transaction.select().from(reportSectionCheckpoints).where(and(eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId), eq(reportSectionCheckpoints.sectionKey, input.sectionKey))).for("update").limit(1);
        if (!parent || !lineageMatches(parent, input) || parent.status !== "passed") return failure("REPORT_VERSION_CONFLICT");
        const [revision] = await transaction.select().from(reportSectionCheckpointRevisions).where(and(eq(reportSectionCheckpointRevisions.checkpointId, parent.id), eq(reportSectionCheckpointRevisions.rewriteOrdinal, input.rewriteOrdinal))).for("update").limit(1);
        if (!revision) return failure("REPORT_VERSION_CONFLICT");
        if (revision.status === "passed") {
          const persisted = mapRevisionRow(revision, input.sectionKey, input.reportConfigVersion);
          if (persisted.contentHash !== hash || persisted.providerId !== input.providerId || persisted.modelId !== input.modelId || !persisted.acceptedSection || !isDeepStrictEqual(persisted.acceptedSection.value, accepted.value)) return failure("REPORT_VERSION_CONFLICT");
          return { ok: true, value: { outcome: "replay" as const, revision: persisted } };
        }
        if (revision.status !== "generating" || revision.stateVersion !== input.expectedStateVersion || revision.activeJobId !== input.jobId || revision.activeWorkerId !== input.workerId) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [passed] = await transaction.update(reportSectionCheckpointRevisions).set({
          status: "passed", activeJobId: null, activeWorkerId: null,
          acceptedContent: accepted.value as Record<string, unknown>, contentHash: hash,
          providerId: input.providerId, modelId: input.modelId, failureCode: null,
          stateVersion: sql`${reportSectionCheckpointRevisions.stateVersion} + 1`, updatedAt: current,
        }).where(and(eq(reportSectionCheckpointRevisions.id, revision.id), eq(reportSectionCheckpointRevisions.stateVersion, input.expectedStateVersion), eq(reportSectionCheckpointRevisions.status, "generating"), eq(reportSectionCheckpointRevisions.activeJobId, input.jobId), eq(reportSectionCheckpointRevisions.activeWorkerId, input.workerId))).returning();
        if (!passed) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        return { ok: true, value: { outcome: "passed" as const, revision: mapRevisionRow(passed, input.sectionKey, input.reportConfigVersion) } };
      });
    },

    async releaseRewriteRetryableFailure(input) {
      return mutateRewriteFailure(input);
    },

    async markRewriteTerminalFailure(input) {
      return mutateRewriteFailure(input);
    },
  };

  async function mutateFailure(
    input: ReleaseReportSectionCheckpointInput,
    status: "pending" | "terminal_failure",
  ): Promise<Result<PersistedReportSectionCheckpoint, Exclude<MutatingError, "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT">>> {
    if (!validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) || !Number.isInteger(input.expectedStateVersion) || input.expectedStateVersion < 1 || !failureCode(input.failureCode)) {
      return failure("REPORT_SECTION_CHECKPOINT_INVALID");
    }
    return database.transaction(async (transaction) => {
      const current = now();
      if (!await lockActiveReservationLease(
        transaction,
        input.reportVersionId,
        input.jobId,
        input.workerId,
        current,
        true,
      )) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      const [updated] = await transaction.update(reportSectionCheckpoints).set({
        status,
        activeJobId: null,
        activeWorkerId: null,
        failureCode: input.failureCode.trim(),
        stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`,
        updatedAt: current,
      }).where(and(
        eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId),
        eq(reportSectionCheckpoints.sectionKey, input.sectionKey),
        eq(reportSectionCheckpoints.sectionOrder, input.sectionOrder),
        eq(reportSectionCheckpoints.promptVersion, input.promptVersion),
        eq(reportSectionCheckpoints.knowledgeVersionId, input.knowledgeVersionId),
        eq(reportSectionCheckpoints.reportConfigVersion, input.reportConfigVersion),
        eq(reportSectionCheckpoints.qualityConfigVersion, input.qualityConfigVersion),
        eq(reportSectionCheckpoints.status, "generating"),
        eq(reportSectionCheckpoints.stateVersion, input.expectedStateVersion),
        eq(reportSectionCheckpoints.activeJobId, input.jobId),
        eq(reportSectionCheckpoints.activeWorkerId, input.workerId),
      )).returning();
      if (!updated) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      return { ok: true, value: mapRow(updated) };
    });
  }

  async function mutateRewriteFailure(
    input: ReleaseReportSectionRewriteInput,
  ): Promise<Result<PersistedReportSectionCheckpointRevision, Exclude<MutatingError, "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT">>> {
    if (!validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) || !Number.isInteger(input.rewriteOrdinal) || input.rewriteOrdinal < 1 || !Number.isInteger(input.expectedStateVersion) || input.expectedStateVersion < 1 || !failureCode(input.failureCode)) return failure("REPORT_SECTION_CHECKPOINT_INVALID");
    return database.transaction(async (transaction) => {
      const current = now();
      if (!await lockActiveReservationLease(transaction, input.reportVersionId, input.jobId, input.workerId, current, true)) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      const [parent] = await transaction.select().from(reportSectionCheckpoints).where(and(eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId), eq(reportSectionCheckpoints.sectionKey, input.sectionKey))).for("update").limit(1);
      if (!parent || !lineageMatches(parent, input) || parent.status !== "passed") return failure("REPORT_VERSION_CONFLICT");
      const [updated] = await transaction.update(reportSectionCheckpointRevisions).set({
        status: "terminal_failure", activeJobId: null, activeWorkerId: null, failureCode: input.failureCode.trim(),
        stateVersion: sql`${reportSectionCheckpointRevisions.stateVersion} + 1`, updatedAt: current,
      }).where(and(
        eq(reportSectionCheckpointRevisions.checkpointId, parent.id),
        eq(reportSectionCheckpointRevisions.rewriteOrdinal, input.rewriteOrdinal),
        eq(reportSectionCheckpointRevisions.status, "generating"),
        eq(reportSectionCheckpointRevisions.stateVersion, input.expectedStateVersion),
        eq(reportSectionCheckpointRevisions.activeJobId, input.jobId),
        eq(reportSectionCheckpointRevisions.activeWorkerId, input.workerId),
      )).returning();
      if (!updated) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      return { ok: true, value: mapRevisionRow(updated, input.sectionKey, input.reportConfigVersion) };
    });
  }
}
