import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, asc, eq, gt, sql } from "drizzle-orm";

import type { Result } from "@lasoviet/contracts";
import {
  reportQueueJobs,
  reportReservations,
  reportSectionCheckpoints,
  reportSectionCheckpointRevisions,
  reportSectionQualityCandidates,
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
  recordQualityCandidate(
    input: RecordReportSectionQualityCandidateInput,
  ): Promise<Result<
    { outcome: "recorded" | "replay"; candidate: PersistedReportSectionQualityCandidate },
    ReportSectionCheckpointError
  >>;
  claimQualityRewrite(
    input: ClaimReportSectionQualityRewriteInput,
  ): Promise<Result<
    { outcome: "none" | "claimed" | "in_progress" | "terminal"; candidate?: PersistedReportSectionQualityCandidate },
    ReportSectionCheckpointError
  >>;
  releaseQualityRewriteRetryableFailure(
    input: MutateReportSectionQualityCandidateInput,
  ): Promise<Result<PersistedReportSectionQualityCandidate, ReportSectionCheckpointError>>;
  markQualityRewriteTerminalFailure(
    input: TerminalReportSectionQualityCandidateInput,
  ): Promise<Result<PersistedReportSectionQualityCandidate, ReportSectionCheckpointError>>;
  markQualityRewritePassed(
    input: MarkPassedReportSectionQualityCandidateInput,
  ): Promise<Result<
    { outcome: "passed" | "replay"; candidate: PersistedReportSectionQualityCandidate },
    ReportSectionCheckpointError
  >>;
  listAccepted(
    reportVersionId: string,
  ): Promise<Result<readonly PersistedReportSectionCheckpoint[], "REPORT_SECTION_CHECKPOINT_CORRUPT">>;
};

type CheckpointRow = typeof reportSectionCheckpoints.$inferSelect;
type RevisionRow = typeof reportSectionCheckpointRevisions.$inferSelect;
type QualityCandidateRow = typeof reportSectionQualityCandidates.$inferSelect;
type MutatingError = Exclude<ReportSectionCheckpointError, "REPORT_SECTION_CHECKPOINT_CORRUPT">;

export const REPORT_SECTION_QUALITY_FINDING_CODES = [
  "MINIMUM_SYLLABLES", "DISCOURAGED_TERM", "DEATH_TERM", "CERTAINTY",
  "LOCALE_HAN", "ENGLISH_BRIGHTNESS", "PROPER_NAME_DENSITY", "ADVERSE_DATE",
  "PREPARATION_FRAMING", "PALACE_FACTS", "PALACE_ANCHORS", "EVIDENCE_ANCHORS",
] as const;
type ReportSectionQualityFindingCode = (typeof REPORT_SECTION_QUALITY_FINDING_CODES)[number];
export type ReportSectionQualityFinding = {
  itemKey: string;
  code: ReportSectionQualityFindingCode;
  note: string;
};

export type PersistedReportSectionQualityCandidate = {
  id: string;
  checkpointId: string;
  rewriteOrdinal: number;
  generationOrdinal: number;
  stateVersion: number;
  status: ReportSectionCheckpointStatus;
  activeJobId: string | null;
  activeWorkerId: string | null;
  activeAttemptNumber: number | null;
  candidateSection: ComprehensiveReportAcceptedSection;
  candidateHash: string;
  candidateProviderId: string;
  candidateModelId: string;
  findings: readonly ReportSectionQualityFinding[];
  terminalFindings: readonly ReportSectionQualityFinding[] | null;
  acceptedSection: ComprehensiveReportAcceptedSection | null;
  contentHash: string | null;
  providerId: string | null;
  modelId: string | null;
  failureCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RecordReportSectionQualityCandidateInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  expectedStateVersion: number;
  generationOrdinal: number;
  candidateContent: unknown;
  candidateHash: string;
  candidateProviderId: string;
  candidateModelId: string;
  findings: readonly ReportSectionQualityFinding[];
  rewriteAttemptCap: number;
};

export type ClaimReportSectionQualityRewriteInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  attemptNumber: number;
};

export type MutateReportSectionQualityCandidateInput = ReportSectionCheckpointLineage & {
  jobId: string;
  workerId: string;
  rewriteOrdinal: number;
  expectedStateVersion: number;
  failureCode: string;
};

export type TerminalReportSectionQualityCandidateInput =
  MutateReportSectionQualityCandidateInput & {
    terminalFindings?: readonly ReportSectionQualityFinding[];
  };

export type MarkPassedReportSectionQualityCandidateInput =
  Omit<MutateReportSectionQualityCandidateInput, "failureCode"> & {
    acceptedContent: unknown;
    contentHash: string;
    providerId: string;
    modelId: string;
  };

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

class QualityCandidateTransactionAbort extends Error {
  constructor(readonly code: ReportSectionCheckpointError) {
    super(code);
    this.name = "QualityCandidateTransactionAbort";
  }
}

function abortQualityCandidateTransaction(code: ReportSectionCheckpointError): never {
  throw new QualityCandidateTransactionAbort(code);
}

function nonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function failureCode(value: unknown): value is string {
  return nonBlank(value) && value.length <= 120;
}

function validQualityFindings(value: unknown): value is readonly ReportSectionQualityFinding[] {
  const allowedFields = new Set(["itemKey", "code", "note"]);
  return Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 8 &&
    value.every((finding) => {
      if (!finding || typeof finding !== "object" || Array.isArray(finding)) return false;
      const fields = Object.keys(finding);
      return fields.length === allowedFields.size &&
        fields.every((field) => allowedFields.has(field)) &&
        nonBlank((finding as ReportSectionQualityFinding).itemKey) &&
        (finding as ReportSectionQualityFinding).itemKey.length <= 120 &&
        REPORT_SECTION_QUALITY_FINDING_CODES.includes((finding as ReportSectionQualityFinding).code) &&
        nonBlank((finding as ReportSectionQualityFinding).note) &&
        (finding as ReportSectionQualityFinding).note.length <= 300;
    });
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

function mapQualityCandidateRow(
  row: QualityCandidateRow,
  sectionKey: ComprehensiveReportSectionKey,
  reportConfigVersion: string,
): PersistedReportSectionQualityCandidate {
  if (
    !nonBlank(row.checkpointId) ||
    !Number.isInteger(row.rewriteOrdinal) || row.rewriteOrdinal < 1 ||
    !Number.isInteger(row.generationOrdinal) || row.generationOrdinal < 1 ||
    !Number.isInteger(row.stateVersion) || row.stateVersion < 1 ||
    !["pending", "generating", "passed", "terminal_failure"].includes(row.status) ||
    !nonBlank(row.candidateHash) || !/^[a-f0-9]{64}$/.test(row.candidateHash) ||
    !nonBlank(row.candidateProviderId) || !nonBlank(row.candidateModelId) ||
    !validQualityFindings(row.findings)
  ) throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  const hasOwner = nonBlank(row.activeJobId) &&
    nonBlank(row.activeWorkerId) &&
    Number.isInteger(row.activeAttemptNumber) &&
    row.activeAttemptNumber! > 0;
  if ((row.status === "generating") !== hasOwner) throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  if (row.status !== "generating" && row.activeAttemptNumber !== null) {
    throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  }
  const terminalFindings = row.terminalFindings === null
    ? null
    : validQualityFindings(row.terminalFindings)
      ? row.terminalFindings as ReportSectionQualityFinding[]
      : null;
  if (
    (row.terminalFindings !== null && terminalFindings === null) ||
    (row.status !== "terminal_failure" && terminalFindings !== null)
  ) {
    throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  }
  let candidateSection: ComprehensiveReportAcceptedSection;
  try {
    candidateSection = parseComprehensiveReportAcceptedSection({ key: sectionKey, value: row.candidateContent }, reportConfigVersion);
  } catch {
    throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
  }
  if (contentHash(candidateSection.value) !== row.candidateHash) throw new Error("REPORT_SECTION_CHECKPOINT_CORRUPT");
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
    generationOrdinal: row.generationOrdinal, stateVersion: row.stateVersion,
    status: row.status as ReportSectionCheckpointStatus, activeJobId: row.activeJobId,
    activeWorkerId: row.activeWorkerId, activeAttemptNumber: row.activeAttemptNumber,
    candidateSection, candidateHash: row.candidateHash,
    candidateProviderId: row.candidateProviderId, candidateModelId: row.candidateModelId,
    findings: row.findings as ReportSectionQualityFinding[], terminalFindings, acceptedSection,
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

  async function qualityCandidateTransaction<T>(
    operation: (transaction: Database) => Promise<Result<T, ReportSectionCheckpointError>>,
  ): Promise<Result<T, ReportSectionCheckpointError>> {
    try {
      return await database.transaction(operation);
    } catch (error) {
      if (error instanceof QualityCandidateTransactionAbort) {
        return failure(error.code);
      }
      throw error;
    }
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

    async recordQualityCandidate(input) {
      if (
        !validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) ||
        !Number.isInteger(input.expectedStateVersion) || input.expectedStateVersion < 1 ||
        !Number.isInteger(input.generationOrdinal) || input.generationOrdinal < 1 ||
        !nonBlank(input.candidateProviderId) || !nonBlank(input.candidateModelId) ||
        !/^[a-f0-9]{64}$/.test(input.candidateHash) || !validQualityFindings(input.findings) ||
        !Number.isInteger(input.rewriteAttemptCap) || input.rewriteAttemptCap < 1
      ) return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      let candidate: ComprehensiveReportAcceptedSection;
      try {
        candidate = parseComprehensiveReportAcceptedSection({ key: input.sectionKey, value: input.candidateContent }, input.reportConfigVersion);
      } catch {
        return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      }
      if (contentHash(candidate.value) !== input.candidateHash) return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      return qualityCandidateTransaction<{
        outcome: "recorded" | "replay";
        candidate: PersistedReportSectionQualityCandidate;
      }>(async (transaction) => {
        const current = now();
        if (!await lockActiveReservationLease(transaction, input.reportVersionId, input.jobId, input.workerId, current, true)) {
          return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        }
        const [parent] = await transaction.select().from(reportSectionCheckpoints).where(and(
          eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId),
          eq(reportSectionCheckpoints.sectionKey, input.sectionKey),
        )).for("update").limit(1);
        if (!parent || !lineageMatches(parent, input)) return failure("REPORT_VERSION_CONFLICT");
        const [existing] = await transaction.select().from(reportSectionQualityCandidates).where(and(
          eq(reportSectionQualityCandidates.checkpointId, parent.id),
          eq(reportSectionQualityCandidates.generationOrdinal, input.generationOrdinal),
        )).for("update").limit(1);
        if (existing) {
          try {
            const persisted = mapQualityCandidateRow(existing, input.sectionKey, input.reportConfigVersion);
            if (
              persisted.candidateHash !== input.candidateHash ||
              persisted.candidateProviderId !== input.candidateProviderId ||
              persisted.candidateModelId !== input.candidateModelId ||
              !isDeepStrictEqual(persisted.candidateSection.value, candidate.value) ||
              !isDeepStrictEqual(persisted.findings, input.findings)
            ) return failure("REPORT_VERSION_CONFLICT");
            return { ok: true, value: { outcome: "replay" as const, candidate: persisted } };
          } catch {
            return failure("REPORT_SECTION_CHECKPOINT_CORRUPT");
          }
        }
        if (
          parent.status !== "generating" || parent.stateVersion !== input.expectedStateVersion ||
          parent.activeJobId !== input.jobId || parent.activeWorkerId !== input.workerId ||
          parent.generationAttemptCount !== input.generationOrdinal
        ) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        if (parent.rewriteAttemptCount >= input.rewriteAttemptCap) {
          const [terminal] = await transaction.update(reportSectionCheckpoints).set({
            status: "terminal_failure", activeJobId: null, activeWorkerId: null,
            failureCode: "REWRITE_ATTEMPT_LIMIT",
            stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`, updatedAt: current,
          }).where(and(eq(reportSectionCheckpoints.id, parent.id), eq(reportSectionCheckpoints.stateVersion, parent.stateVersion))).returning();
          if (!terminal) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
          return failure("REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT");
        }
        const [released] = await transaction.update(reportSectionCheckpoints).set({
          status: "pending", activeJobId: null, activeWorkerId: null,
          rewriteAttemptCount: sql`${reportSectionCheckpoints.rewriteAttemptCount} + 1`,
          failureCode: "QUALITY_GATE_REWRITE_PENDING",
          stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`, updatedAt: current,
        }).where(and(eq(reportSectionCheckpoints.id, parent.id), eq(reportSectionCheckpoints.stateVersion, parent.stateVersion))).returning();
        if (!released) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [created] = await transaction.insert(reportSectionQualityCandidates).values({
          checkpointId: parent.id, rewriteOrdinal: released.rewriteAttemptCount,
          generationOrdinal: input.generationOrdinal, candidateContent: candidate.value as Record<string, unknown>,
          candidateHash: input.candidateHash, candidateProviderId: input.candidateProviderId,
          candidateModelId: input.candidateModelId, findings: input.findings as ReportSectionQualityFinding[],
          status: "pending", createdAt: current, updatedAt: current,
        }).returning();
        if (!created) abortQualityCandidateTransaction("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        return { ok: true, value: { outcome: "recorded" as const, candidate: mapQualityCandidateRow(created, input.sectionKey, input.reportConfigVersion) } };
      });
    },

    async claimQualityRewrite(input) {
      if (
        !validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) ||
        !Number.isInteger(input.attemptNumber) || input.attemptNumber < 1
      ) {
        return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      }
      return qualityCandidateTransaction<{
        outcome: "none" | "claimed" | "in_progress" | "terminal";
        candidate?: PersistedReportSectionQualityCandidate;
      }>(async (transaction) => {
        const current = now();
        if (!await lockActiveReservationLease(transaction, input.reportVersionId, input.jobId, input.workerId, current, true)) {
          return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        }
        const [parent] = await transaction.select().from(reportSectionCheckpoints).where(and(
          eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId),
          eq(reportSectionCheckpoints.sectionKey, input.sectionKey),
        )).for("update").limit(1);
        if (!parent) return { ok: true, value: { outcome: "none" as const } };
        if (!lineageMatches(parent, input)) return failure("REPORT_VERSION_CONFLICT");
        if (parent.status === "passed") return { ok: true, value: { outcome: "none" as const } };
        if (parent.status === "terminal_failure") return { ok: true, value: { outcome: "terminal" as const } };
        const [candidate] = await transaction.select().from(reportSectionQualityCandidates).where(and(
          eq(reportSectionQualityCandidates.checkpointId, parent.id),
          sql`${reportSectionQualityCandidates.status} IN ('pending', 'generating')`,
        )).orderBy(asc(reportSectionQualityCandidates.rewriteOrdinal)).for("update").limit(1);
        if (!candidate) return { ok: true, value: { outcome: "none" as const } };
        if (candidate.status === "generating") {
          if (
            candidate.activeJobId === input.jobId &&
            candidate.activeWorkerId === input.workerId &&
            candidate.activeAttemptNumber === input.attemptNumber &&
            parent.status === "generating" &&
            parent.activeJobId === input.jobId &&
            parent.activeWorkerId === input.workerId
          ) {
            return { ok: true, value: { outcome: "in_progress" as const, candidate: mapQualityCandidateRow(candidate, input.sectionKey, input.reportConfigVersion) } };
          }
          if (
            candidate.activeJobId === input.jobId &&
            input.attemptNumber <= (candidate.activeAttemptNumber ?? 0)
          ) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        }
        const [claimedParent] = await transaction.update(reportSectionCheckpoints).set({
          status: "generating", activeJobId: input.jobId, activeWorkerId: input.workerId,
          failureCode: null, stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`, updatedAt: current,
        }).where(and(eq(reportSectionCheckpoints.id, parent.id), eq(reportSectionCheckpoints.stateVersion, parent.stateVersion), sql`${reportSectionCheckpoints.status} IN ('pending', 'generating')`)).returning();
        if (!claimedParent) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [claimed] = await transaction.update(reportSectionQualityCandidates).set({
          status: "generating", activeJobId: input.jobId, activeWorkerId: input.workerId,
          activeAttemptNumber: input.attemptNumber,
          failureCode: null, stateVersion: sql`${reportSectionQualityCandidates.stateVersion} + 1`, updatedAt: current,
        }).where(and(eq(reportSectionQualityCandidates.id, candidate.id), eq(reportSectionQualityCandidates.stateVersion, candidate.stateVersion), sql`${reportSectionQualityCandidates.status} IN ('pending', 'generating')`)).returning();
        if (!claimed) abortQualityCandidateTransaction("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        return { ok: true, value: { outcome: "claimed" as const, candidate: mapQualityCandidateRow(claimed, input.sectionKey, input.reportConfigVersion) } };
      });
    },

    async releaseQualityRewriteRetryableFailure(input) {
      return mutateQualityCandidate(input, "pending");
    },

    async markQualityRewriteTerminalFailure(input) {
      return mutateQualityCandidate(input, "terminal_failure");
    },

    async markQualityRewritePassed(input) {
      if (!validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) ||
        !Number.isInteger(input.rewriteOrdinal) || input.rewriteOrdinal < 1 ||
        !Number.isInteger(input.expectedStateVersion) || input.expectedStateVersion < 1 ||
        !nonBlank(input.providerId) || !nonBlank(input.modelId) || !/^[a-f0-9]{64}$/.test(input.contentHash)) {
        return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      }
      let accepted: ComprehensiveReportAcceptedSection;
      try {
        accepted = parseComprehensiveReportAcceptedSection({ key: input.sectionKey, value: input.acceptedContent }, input.reportConfigVersion);
      } catch {
        return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      }
      if (contentHash(accepted.value) !== input.contentHash) return failure("REPORT_SECTION_CHECKPOINT_INVALID");
      return qualityCandidateTransaction<{
        outcome: "passed" | "replay";
        candidate: PersistedReportSectionQualityCandidate;
      }>(async (transaction) => {
        const current = now();
        if (!await lockActiveReservationLease(transaction, input.reportVersionId, input.jobId, input.workerId, current, true)) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [parent] = await transaction.select().from(reportSectionCheckpoints).where(and(eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId), eq(reportSectionCheckpoints.sectionKey, input.sectionKey))).for("update").limit(1);
        if (!parent || !lineageMatches(parent, input)) return failure("REPORT_VERSION_CONFLICT");
        const [candidate] = await transaction.select().from(reportSectionQualityCandidates).where(and(eq(reportSectionQualityCandidates.checkpointId, parent.id), eq(reportSectionQualityCandidates.rewriteOrdinal, input.rewriteOrdinal))).for("update").limit(1);
        if (!candidate) return failure("REPORT_VERSION_CONFLICT");
        if (candidate.status === "passed") {
          const persisted = mapQualityCandidateRow(candidate, input.sectionKey, input.reportConfigVersion);
          if (!persisted.acceptedSection || persisted.contentHash !== input.contentHash || persisted.providerId !== input.providerId || persisted.modelId !== input.modelId || !isDeepStrictEqual(persisted.acceptedSection.value, accepted.value)) return failure("REPORT_VERSION_CONFLICT");
          return { ok: true, value: { outcome: "replay" as const, candidate: persisted } };
        }
        if (candidate.status !== "generating" || candidate.stateVersion !== input.expectedStateVersion || candidate.activeJobId !== input.jobId || candidate.activeWorkerId !== input.workerId ||
          parent.status !== "generating" || parent.activeJobId !== input.jobId || parent.activeWorkerId !== input.workerId) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [passedCandidate] = await transaction.update(reportSectionQualityCandidates).set({
          status: "passed", activeJobId: null, activeWorkerId: null, activeAttemptNumber: null,
          acceptedContent: accepted.value as Record<string, unknown>,
          contentHash: input.contentHash, providerId: input.providerId, modelId: input.modelId, failureCode: null,
          terminalFindings: null,
          stateVersion: sql`${reportSectionQualityCandidates.stateVersion} + 1`, updatedAt: current,
        }).where(and(eq(reportSectionQualityCandidates.id, candidate.id), eq(reportSectionQualityCandidates.stateVersion, input.expectedStateVersion))).returning();
        if (!passedCandidate) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        const [passedParent] = await transaction.update(reportSectionCheckpoints).set({
          status: "passed", activeJobId: null, activeWorkerId: null, acceptedContent: accepted.value as Record<string, unknown>,
          contentHash: input.contentHash, providerId: input.providerId, modelId: input.modelId, failureCode: null,
          stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`, updatedAt: current,
        }).where(and(eq(reportSectionCheckpoints.id, parent.id), eq(reportSectionCheckpoints.status, "generating"), eq(reportSectionCheckpoints.activeJobId, input.jobId), eq(reportSectionCheckpoints.activeWorkerId, input.workerId))).returning();
        if (!passedParent) abortQualityCandidateTransaction("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
        return { ok: true, value: { outcome: "passed" as const, candidate: mapQualityCandidateRow(passedCandidate, input.sectionKey, input.reportConfigVersion) } };
      });
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

  async function mutateQualityCandidate(
    input: MutateReportSectionQualityCandidateInput | TerminalReportSectionQualityCandidateInput,
    status: "pending" | "terminal_failure",
  ): Promise<Result<PersistedReportSectionQualityCandidate, ReportSectionCheckpointError>> {
    if (!validLineage(input) || !nonBlank(input.jobId) || !nonBlank(input.workerId) ||
      !Number.isInteger(input.rewriteOrdinal) || input.rewriteOrdinal < 1 ||
      !Number.isInteger(input.expectedStateVersion) || input.expectedStateVersion < 1 ||
      !failureCode(input.failureCode)) return failure("REPORT_SECTION_CHECKPOINT_INVALID");
    const terminalFindings = "terminalFindings" in input
      ? input.terminalFindings
      : undefined;
    if (
      (terminalFindings !== undefined && !validQualityFindings(terminalFindings)) ||
      (status !== "terminal_failure" && terminalFindings !== undefined)
    ) {
      return failure("REPORT_SECTION_CHECKPOINT_INVALID");
    }
    return qualityCandidateTransaction<PersistedReportSectionQualityCandidate>(async (transaction) => {
      const current = now();
      if (!await lockActiveReservationLease(transaction, input.reportVersionId, input.jobId, input.workerId, current, true)) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      const [parent] = await transaction.select().from(reportSectionCheckpoints).where(and(
        eq(reportSectionCheckpoints.reportVersionId, input.reportVersionId),
        eq(reportSectionCheckpoints.sectionKey, input.sectionKey),
      )).for("update").limit(1);
      if (!parent || !lineageMatches(parent, input) || parent.status !== "generating" ||
        parent.activeJobId !== input.jobId || parent.activeWorkerId !== input.workerId) {
        return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      }
      const [candidate] = await transaction.select().from(reportSectionQualityCandidates).where(and(
        eq(reportSectionQualityCandidates.checkpointId, parent.id),
        eq(reportSectionQualityCandidates.rewriteOrdinal, input.rewriteOrdinal),
      )).for("update").limit(1);
      if (!candidate) return failure("REPORT_VERSION_CONFLICT");
      if (candidate.status !== "generating" || candidate.stateVersion !== input.expectedStateVersion ||
        candidate.activeJobId !== input.jobId || candidate.activeWorkerId !== input.workerId) {
        return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      }
      const [updatedCandidate] = await transaction.update(reportSectionQualityCandidates).set({
        status, activeJobId: null, activeWorkerId: null, activeAttemptNumber: null,
        failureCode: input.failureCode.trim(),
        terminalFindings: status === "terminal_failure"
          ? terminalFindings as ReportSectionQualityFinding[] | undefined
          : null,
        stateVersion: sql`${reportSectionQualityCandidates.stateVersion} + 1`, updatedAt: current,
      }).where(and(eq(reportSectionQualityCandidates.id, candidate.id), eq(reportSectionQualityCandidates.stateVersion, input.expectedStateVersion))).returning();
      if (!updatedCandidate) return failure("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      const [updatedParent] = await transaction.update(reportSectionCheckpoints).set({
        status, activeJobId: null, activeWorkerId: null, failureCode: input.failureCode.trim(),
        stateVersion: sql`${reportSectionCheckpoints.stateVersion} + 1`, updatedAt: current,
      }).where(and(eq(reportSectionCheckpoints.id, parent.id), eq(reportSectionCheckpoints.status, "generating"), eq(reportSectionCheckpoints.activeJobId, input.jobId), eq(reportSectionCheckpoints.activeWorkerId, input.workerId))).returning();
      if (!updatedParent) abortQualityCandidateTransaction("REPORT_SECTION_CHECKPOINT_LEASE_LOST");
      return { ok: true, value: mapQualityCandidateRow(updatedCandidate, input.sectionKey, input.reportConfigVersion) };
    });
  }
}
