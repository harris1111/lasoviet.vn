import type { AiCostRequestContext, IdentityReportV1, ReportGenerateJobEnvelope } from "@lasoviet/contracts";
import { createHash } from "node:crypto";
import {
  resolveZiweiReportQualityConfig,
  ziweiComprehensiveReportQualityV1,
} from "@lasoviet/config";
import type { AiProductionGate, AiProvider } from "../ai/ai-provider.js";
import {
  CURRENT_REPORT_RENDER_VERSION,
  CURRENT_REPORT_TEMPLATE_VERSION,
  REPORT_PROMPT_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_0_1,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V1,
  REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
  REPORT_TEMPLATE_VERSION_V3,
  v4SectionedReportVersions,
  v4_1_1KeyConfigSensitivityReportVersions,
  v4_1_2SensitivityReportVersions,
  v4_1_1SensitivityReportVersions,
  v4_1SensitivityReportVersions,
} from "./identity-report-config.js";
import { resolveIdentityReportVersionFamily } from "./identity-report-version-family.js";
import { renderIdentityReportHtml } from "./identity-report-html.js";
import { renderComprehensiveZiweiHtml } from "./comprehensive-report-html.js";
import { writeIdentityReportDraft } from "./identity-report-writer.js";
import { validateIdentityReport } from "./report-validator.js";
import { critiqueIdentityReport } from "./report-critic.js";
import { writeComprehensiveZiweiReport } from "./comprehensive-report-writer.js";
import { validateComprehensiveZiweiReport } from "./comprehensive-report-validator.js";
import { writeComprehensiveZiweiReportV4 } from "./comprehensive-report-writer-v4.js";
import {
  validateComprehensiveZiweiReportV4,
  validateComprehensiveZiweiReportV4_1,
} from "./comprehensive-report-validator-v4.js";
import {
  critiqueComprehensiveZiweiReportSectionedV4,
  critiqueComprehensiveZiweiReportV4,
  type ComprehensiveSectionedReviewWarning,
} from "./comprehensive-report-critic-v4.js";
import {
  writeComprehensiveReportSectionGroupV4,
  writeComprehensiveReportSectionV4,
} from "./comprehensive-report-section-writer-v4.js";
import {
  assembleComprehensiveReportV4,
  assembleComprehensiveReportV4_1,
} from "./comprehensive-report-assembler-v4.js";
import {
  buildComprehensiveReportPalaceSectionDigest,
  buildComprehensiveReportSectionDigest,
} from "./comprehensive-report-section-digest-v4.js";
import { validateComprehensiveReportSectionQualityV4 } from "./comprehensive-report-quality-v4.js";
import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  resolveComprehensiveReportSectionKeys,
  type ComprehensiveReportAcceptedSection,
  type ComprehensiveReportSectionKey,
} from "./comprehensive-report-section-v4.js";
import type {
  PersistedReportSectionCheckpoint,
  ReportSectionQualityFinding,
  ReportSectionCheckpointLineage,
  ReportSectionCheckpointRepository,
} from "./report-section-checkpoint.repository.js";
import type { ComprehensiveReportSourceV4 } from "./report-source.js";
import type { ComprehensiveReportSource } from "./report-source.js";
import type { ReportGenerationSourceRepository } from "./report-generation.repository.js";
import type { ImmutableReportVersionRecord, ReportVersionRepository } from "./report-version.repository.js";
import type { ReportSourceSnapshotPreparationService } from "./report-source-snapshot.service.js";

export type ReportGenerationServiceErrorCode =
  | "AI_CAPABILITY_UNSUPPORTED"
  | "AI_PROVIDER_NOT_APPROVED"
  | "AI_COST_RECORDING_FAILED"
  | "AI_TIMEOUT"
  | "AI_OUTPUT_INVALID"
  | "REPORT_EVIDENCE_INVALID"
  | "REPORT_SAFETY_REJECTED"
  | "REPORT_VERSION_CONFLICT"
  | "REPORT_SOURCE_SNAPSHOT_INVALID"
  | "REPORT_SOURCE_SNAPSHOT_CONFLICT"
  | "REPORT_SOURCE_SNAPSHOT_UNAVAILABLE"
  | "REPORT_PROFILE_PURGED"
  | "REPORT_CONTEXT_MISMATCH";

export type ReportGenerationExecutionState =
  | "active"
  | "lease_lost"
  | "wall_clock_exhausted";

export type ReportGenerationExecutionGuard = {
  state(): ReportGenerationExecutionState;
};

export type ReportGenerationServiceError = {
  code: ReportGenerationServiceErrorCode;
  retryable: boolean;
};

export type ReportGenerationServiceResult =
  | { ok: true; value: ImmutableReportVersionRecord }
  | { ok: false; error: ReportGenerationServiceError };

export type GenerateReportInput = {
  job: ReportGenerateJobEnvelope;
  attemptNumber: number;
  workerId: string;
  jobId?: string;
  executionGuard?: ReportGenerationExecutionGuard;
};

export type ReportGenerationServiceDependencies = {
  sourceRepository: ReportGenerationSourceRepository;
  versionRepository: ReportVersionRepository;
  gate: AiProductionGate;
  provider: AiProvider;
  sourceSnapshotPreparer?: ReportSourceSnapshotPreparationService;
  sectionCheckpointRepository?: ReportSectionCheckpointRepository;
  onReviewWarnings?: (event: {
    reportVersionId: string;
    warnings: readonly ComprehensiveSectionedReviewWarning[];
  }) => void;
};

function supersedesReportVersionId(
  payload: ReportGenerateJobEnvelope["payload"],
): string | null {
  return "supersedesReportVersionId" in payload
    ? payload.supersedesReportVersionId ?? null
    : null;
}

export type ReportGenerationService = {
  replayExisting(input: GenerateReportInput): Promise<
    | { ok: true; value: ImmutableReportVersionRecord | null }
    | { ok: false; error: ReportGenerationServiceError }
  >;
  generateReport(input: GenerateReportInput): Promise<ReportGenerationServiceResult>;
  generate(input: GenerateReportInput): Promise<ReportGenerationServiceResult>;
};

export function createReportGenerationService(
  dependencies: ReportGenerationServiceDependencies,
): ReportGenerationService {
  async function replayExisting(input: GenerateReportInput): Promise<
    | { ok: true; value: ImmutableReportVersionRecord | null }
    | { ok: false; error: ReportGenerationServiceError }
  > {
    const { job, attemptNumber, workerId } = input;
    const jobId = input.jobId ?? job.idempotencyKey;
    const payload = job.payload;

    const existing = await dependencies.versionRepository.getImmutableVersion(payload.reportVersionId);
    if (!existing) {
      return { ok: true, value: null };
    }

    const replayResult = await dependencies.versionRepository.commitImmutableVersion({
      reportId: payload.reportId,
      reportVersionId: payload.reportVersionId,
      entitlementId: payload.entitlementId,
      chartVersionId: payload.chartVersionId,
      evidenceVersionId: payload.evidenceVersionId,
      knowledgeVersionId: payload.knowledgeVersionId,
      promptVersion: payload.promptVersion,
      reportConfigVersion: payload.reportConfigVersion,
      templateVersion: existing.templateVersion,
      renderVersion: existing.renderVersion as "identity-report-pdf.v1",
      locale: payload.locale,
      sku: payload.sku,
      providerId: existing.providerId,
      modelId: existing.modelId,
      structuredContent: existing.structuredContent as IdentityReportV1,
      htmlContent: existing.htmlContent,
      jobId,
      workerId,
      attemptNumber,
      traceId: job.traceId,
      supersedesReportVersionId: supersedesReportVersionId(payload),
    });

    if (!replayResult.ok) {
      return {
        ok: false,
        error: {
          code: "REPORT_VERSION_CONFLICT",
          retryable: false,
        },
      };
    }
    return { ok: true, value: replayResult.value };
  }

  function guardState(input: GenerateReportInput): ReportGenerationExecutionState {
    return input.executionGuard?.state() ?? "active";
  }

  function stableHash(value: unknown): string {
    const canonical = (source: unknown): string => {
      if (source === null || typeof source === "string" || typeof source === "number" || typeof source === "boolean") {
        return JSON.stringify(source);
      }
      if (Array.isArray(source)) return `[${source.map(canonical).join(",")}]`;
      if (source && typeof source === "object") {
        const record = source as Record<string, unknown>;
        return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
      }
      throw new Error("REPORT_SECTION_CANONICAL_CONTENT_INVALID");
    };
    return createHash("sha256").update(canonical(value), "utf8").digest("hex");
  }

  function resolveSectionedSelection(payload: {
    knowledgeVersionId: string;
    promptVersion: string;
    reportConfigVersion: string;
  }) {
    const v4 = v4SectionedReportVersions();
    if (
      payload.knowledgeVersionId === v4.knowledgeVersion &&
      payload.promptVersion === v4.promptVersion &&
      payload.reportConfigVersion === v4.reportConfigVersion
    ) {
      return v4;
    }
    const v4_1 = v4_1SensitivityReportVersions();
    if (
      payload.knowledgeVersionId === v4_1.knowledgeVersion &&
      payload.promptVersion === v4_1.promptVersion &&
      payload.reportConfigVersion === v4_1.reportConfigVersion
    ) {
      return v4_1;
    }
    const v4_1_1 = v4_1_1SensitivityReportVersions();
    if (
      payload.knowledgeVersionId === v4_1_1.knowledgeVersion &&
      payload.promptVersion === v4_1_1.promptVersion &&
      payload.reportConfigVersion === v4_1_1.reportConfigVersion
    ) {
      return v4_1_1;
    }
    const v4_1_1KeyConfig = v4_1_1KeyConfigSensitivityReportVersions();
    if (
      payload.knowledgeVersionId === v4_1_1KeyConfig.knowledgeVersion &&
      payload.promptVersion === v4_1_1KeyConfig.promptVersion &&
      payload.reportConfigVersion === v4_1_1KeyConfig.reportConfigVersion
    ) {
      return v4_1_1KeyConfig;
    }
    const v4_1_2 = v4_1_2SensitivityReportVersions();
    if (
      payload.knowledgeVersionId === v4_1_2.knowledgeVersion &&
      payload.promptVersion === v4_1_2.promptVersion &&
      payload.reportConfigVersion === v4_1_2.reportConfigVersion
    ) {
      return v4_1_2;
    }
    return null;
  }

  function qualityInputs(section: ComprehensiveReportAcceptedSection) {
    const kind = section.key.startsWith("palace:")
      ? "palace"
      : section.key.startsWith("thematic:")
        ? "thematic"
        : section.key === "practicalDirection"
          ? "practicalAction"
          : section.key === "birthTimeSensitivity"
            ? "birthTimeSensitivity"
          : section.key;
    if (section.key === "birthTimeSensitivity") {
      return [
        {
          key: section.key,
          itemKey: `${section.key}.stableFactors`,
          kind,
          text: `${section.value.stableFactors.title} ${section.value.stableFactors.narrative}`,
          evidenceKeys: section.value.stableFactors.evidenceKeys,
        },
        {
          key: section.key,
          itemKey: `${section.key}.sensitiveFactors`,
          kind,
          text: `${section.value.sensitiveFactors.title} ${section.value.sensitiveFactors.narrative}`,
          evidenceKeys: section.value.sensitiveFactors.evidenceKeys,
        },
      ] as unknown as Array<Parameters<typeof validateComprehensiveReportSectionQualityV4>[0] & { itemKey: string }>;
    }
    const entries = Array.isArray(section.value) ? section.value : [section.value];
    return entries.map((entry: any, index: number) => ({
      key: Array.isArray(section.value) ? `${section.key}[${index}]` : section.key,
      itemKey: Array.isArray(section.value) ? `${section.key}[${index}]` : section.key,
      kind,
      text: typeof entry === "object" && "recommendation" in entry
        ? `${entry.recommendation} ${entry.rationale} ${entry.avoid}`
        : `${entry.title} ${entry.narrative}`,
      evidenceKeys: entry.evidenceKeys ?? [],
      ...(section.key.startsWith("palace:") ? { palaceId: section.key.slice("palace:".length) } : {}),
    } as Parameters<typeof validateComprehensiveReportSectionQualityV4>[0] & { itemKey: string }));
  }

  function sectionQualityFindings(
    section: ComprehensiveReportAcceptedSection,
    facts: ComprehensiveReportSourceV4["comprehensiveFactsV4"],
    reportConfigVersion: string = REPORT_CONFIG_VERSION_V4_1_SECTIONED,
    qualityVersion: string = REPORT_QUALITY_VERSION_COMPREHENSIVE_V1,
  ): readonly ReportSectionQualityFinding[] {
    return qualityInputs(section).flatMap((quality) => {
      const result = validateComprehensiveReportSectionQualityV4(quality, facts!, reportConfigVersion, qualityVersion);
      return result.ok
        ? []
        : result.findings.map((finding) => ({
          itemKey: (quality as unknown as { itemKey: string }).itemKey,
          code: finding.code,
          note: finding.note.slice(0, 300),
        }));
    }).slice(0, 8);
  }

  function sectionPassesQuality(
    section: ComprehensiveReportAcceptedSection,
    facts: ComprehensiveReportSourceV4["comprehensiveFactsV4"],
    reportConfigVersion: string = REPORT_CONFIG_VERSION_V4_1_SECTIONED,
    qualityVersion: string = REPORT_QUALITY_VERSION_COMPREHENSIVE_V1,
  ): boolean {
    return sectionQualityFindings(section, facts, reportConfigVersion, qualityVersion).length === 0;
  }

  function keyConfigurationRewriteContractFindings(
    candidate: ComprehensiveReportAcceptedSection,
    rewritten: ComprehensiveReportAcceptedSection,
    promptVersion: string,
  ): readonly ReportSectionQualityFinding[] {
    if (
      ![
        REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
        REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
      ].includes(promptVersion as typeof REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY | typeof REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY) ||
      candidate.key !== "keyConfigurations" ||
      rewritten.key !== "keyConfigurations"
    ) {
      return [];
    }
    if (candidate.value.length !== rewritten.value.length) {
      return [{
        itemKey: "keyConfigurations",
        code: "EVIDENCE_ANCHORS",
        note: "Rewrite must preserve the candidate item count and order.",
      }];
    }
    return candidate.value.flatMap((item, index) => {
      const rewrittenItem = rewritten.value[index]!;
      if (item.title !== rewrittenItem.title) {
        return [{
          itemKey: `keyConfigurations[${index}]`,
          code: "EVIDENCE_ANCHORS" as const,
          note: "Rewrite must preserve this item's title and array position.",
        }];
      }
      return stableHash(item.evidenceKeys) === stableHash(rewrittenItem.evidenceKeys)
        ? []
        : [{
            itemKey: `keyConfigurations[${index}]`,
            code: "EVIDENCE_ANCHORS" as const,
            note: "Rewrite must preserve this item's evidence keys and array position.",
          }];
    }).slice(0, 8);
  }

  function mapProviderError(
    error: { code: string; retryable?: boolean },
  ): ReportGenerationServiceError {
    if (error.code === "AI_COST_RECORDING_FAILED") {
      return { code: "AI_COST_RECORDING_FAILED", retryable: error.retryable ?? false };
    }
    if (error.code === "AI_TIMEOUT" || (error.code === "AI_PROVIDER_REQUEST_FAILED" && error.retryable)) {
      return { code: "AI_TIMEOUT", retryable: true };
    }
    if (error.code === "AI_CAPABILITY_UNSUPPORTED") {
      return { code: "AI_CAPABILITY_UNSUPPORTED", retryable: false };
    }
    if (error.code === "AI_PROVIDER_NOT_APPROVED") {
      return { code: "AI_PROVIDER_NOT_APPROVED", retryable: false };
    }
    if (error.code === "REPORT_SAFETY_REJECTED") return { code: "REPORT_SAFETY_REJECTED", retryable: false };
    return { code: "AI_OUTPUT_INVALID", retryable: false };
  }

  async function lifecycleFence(
    input: GenerateReportInput,
  ): Promise<ReportGenerationServiceResult | null> {
    const result = await dependencies.sourceRepository.validateLifecycle({
      reportVersionId: input.job.payload.reportVersionId,
      jobId: input.jobId ?? input.job.idempotencyKey,
      readingContextRevisionId:
        input.job.name === "report.generate.v2"
          ? input.job.payload.readingContextRevisionId ?? null
          : null,
    });
    return result.ok
      ? null
      : { ok: false, error: { code: result.error.code, retryable: false } };
  }

  async function executeSectionedGeneration(
    input: GenerateReportInput,
    source: ComprehensiveReportSourceV4,
    baseCostContext: AiCostRequestContext,
  ): Promise<ReportGenerationServiceResult> {
    const repository = dependencies.sectionCheckpointRepository;
    if (!repository) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
    const { payload } = input.job;
    const selection = resolveSectionedSelection(payload);
    if (!selection) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
    const warningOnlyReview =
      selection.qualityVersion === REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY;
    const sectionKeys = resolveComprehensiveReportSectionKeys(selection.reportConfigVersion);
    const quality = selection.family === "v4"
      ? ziweiComprehensiveReportQualityV1
      : resolveZiweiReportQualityConfig(
        selection.reportConfigVersion,
        selection.qualityVersion,
      );
    const jobId = input.jobId ?? input.job.idempotencyKey;
    const lineageFor = (sectionKey: ComprehensiveReportSectionKey): ReportSectionCheckpointLineage => ({
      reportVersionId: payload.reportVersionId,
      sectionKey,
      sectionOrder: sectionKeys.indexOf(sectionKey),
      promptVersion: payload.promptVersion,
      knowledgeVersionId: payload.knowledgeVersionId,
      reportConfigVersion: payload.reportConfigVersion,
      qualityConfigVersion: selection.qualityVersion,
    });
    const stopped = (): ReportGenerationServiceResult | null => {
      const state = guardState(input);
      if (state === "lease_lost") return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
      if (state === "wall_clock_exhausted") return { ok: false, error: { code: "AI_TIMEOUT", retryable: true } };
      return null;
    };
    const listAccepted = async (): Promise<
      { ok: true; value: readonly PersistedReportSectionCheckpoint[] } | ReportGenerationServiceResult
    > => {
      const stoppedResult = stopped();
      if (stoppedResult) return stoppedResult;
      const listed = await repository.listAccepted(payload.reportVersionId);
      if (!listed.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
      return listed;
    };
    const acceptedSections = (rows: readonly PersistedReportSectionCheckpoint[]) => {
      const sections: ComprehensiveReportAcceptedSection[] = [];
      for (const row of rows) {
        if (!row.acceptedSection || !row.providerId?.trim() || !row.modelId?.trim()) {
          throw new Error("REPORT_SECTION_ACCEPTED_LINEAGE_INVALID");
        }
        sections.push(row.acceptedSection);
      }
      return sections;
    };
    const groupedActiveTuple =
      selection.promptVersion === REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY &&
      selection.reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY &&
      selection.qualityVersion === REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY;
    const groupedGeneration = async (): Promise<ReportGenerationServiceResult | null> => {
      if (!groupedActiveTuple) return null;
      const palaceKeys = sectionKeys.filter((key) => key.startsWith("palace:"));
      const thematicKeys = sectionKeys.filter((key) => key.startsWith("thematic:"));
      const groups = [
        { groupId: "G1" as const, keys: ["overview", "coreAxis", "keyConfigurations", ...palaceKeys.slice(0, 6)] as ComprehensiveReportSectionKey[] },
        { groupId: "G2" as const, keys: [...palaceKeys.slice(6), ...thematicKeys] as ComprehensiveReportSectionKey[] },
        { groupId: "G3" as const, keys: ["strengthsAndTensions", "currentDecadal", "annualSnapshot", "birthTimeSensitivity", "practicalDirection"] as ComprehensiveReportSectionKey[] },
      ];
      let digest: ReturnType<typeof buildComprehensiveReportSectionDigest> | undefined;
      for (const group of groups) {
        const current = await listAccepted();
        if (!current.ok) return current;
        const currentRows = current.value as readonly PersistedReportSectionCheckpoint[];
        const passedKeys = new Set(currentRows.map((row) => row.sectionKey));
        const remainingKeys = group.keys.filter((key) => !passedKeys.has(key));
        if (remainingKeys.length === 0) {
          digest = buildComprehensiveReportSectionDigest(
            acceptedSections(currentRows),
            selection.reportConfigVersion,
            selection.qualityVersion,
          );
          continue;
        }
        const members = remainingKeys.map((sectionKey) => ({
          ...lineageFor(sectionKey),
          jobId,
          workerId: input.workerId,
        }));
        let groupCompleted = false;
        while (!groupCompleted) {
          const claimed = await repository.claimGroup({
            members,
            generationAttemptCap: quality.generationAttemptCap,
            rewriteAttemptCap: quality.sectionRewriteCap,
          });
          if (!claimed.ok) {
            return {
              ok: false,
              error: {
                code: claimed.error.code === "REPORT_SECTION_CHECKPOINT_LEASE_LOST"
                  ? "REPORT_VERSION_CONFLICT"
                  : claimed.error.code === "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT"
                    ? "AI_OUTPUT_INVALID"
                    : "REPORT_VERSION_CONFLICT",
                retryable: false,
              },
            };
          }
          if (claimed.value.outcome === "terminal") {
            return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
          }
          if (claimed.value.outcome === "in_progress") {
            return { ok: false, error: { code: "AI_TIMEOUT", retryable: true } };
          }
          if (claimed.value.outcome === "replay") {
            digest = buildComprehensiveReportSectionDigest(
              acceptedSections(claimed.value.checkpoints),
              selection.reportConfigVersion,
              selection.qualityVersion,
            );
            groupCompleted = true;
            continue;
          }
          const generationAttempt = Math.max(
            ...claimed.value.checkpoints
              .filter((checkpoint) => checkpoint.status === "generating")
              .map((checkpoint) => checkpoint.generationAttemptCount),
          );
          const beforeProvider = stopped();
          if (beforeProvider) return beforeProvider;
          const lifecycle = await lifecycleFence(input);
          if (lifecycle) return lifecycle;
          let written: Awaited<ReturnType<typeof writeComprehensiveReportSectionGroupV4>>;
          try {
            written = await writeComprehensiveReportSectionGroupV4({
              groupId: group.groupId,
              sectionKeys: remainingKeys,
              facts: source.comprehensiveFactsV4!,
              knowledgePacks: source.knowledgePacks!,
              provider: dependencies.provider,
              promptVersion: selection.promptVersion,
              reportConfigVersion: selection.reportConfigVersion,
              readingContext: source.readingContext,
              ...(digest ? { priorSectionDigest: digest } : {}),
              costContext: {
                ...baseCostContext,
                idempotencyKey: `${payload.reportVersionId}:${group.groupId}:generation:${generationAttempt}:critic:0`,
                purpose: "report",
              },
            });
          } catch {
            written = { ok: false, error: { code: "AI_TIMEOUT", retryable: true } };
          }
          const afterProvider = stopped();
          if (afterProvider) return afterProvider;
          if (!written.ok) {
            const mapped = mapProviderError(written.error);
            const released = await repository.releaseGroupRetryableFailure({
              members: claimed.value.checkpoints
                .filter((checkpoint) => checkpoint.status === "generating")
                .map((checkpoint) => ({
                  ...lineageFor(checkpoint.sectionKey),
                  jobId,
                  workerId: input.workerId,
                  expectedStateVersion: checkpoint.stateVersion,
                  failureCode: mapped.code,
                })),
            });
            if (!released.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
            if (mapped.code === "AI_OUTPUT_INVALID" && generationAttempt < quality.generationAttemptCap) {
              continue;
            }
            return { ok: false, error: mapped };
          }
          const returned = new Map(written.value.sections.map((section) => [section.key, section]));
          if (
            written.value.providerId !== written.value.sections[0]?.providerId ||
            written.value.modelId !== written.value.sections[0]?.modelId ||
            returned.size !== remainingKeys.length ||
            remainingKeys.some((key) => !returned.has(key))
          ) {
            const released = await repository.releaseGroupRetryableFailure({
              members: claimed.value.checkpoints.map((checkpoint) => ({
                ...lineageFor(checkpoint.sectionKey),
                jobId,
                workerId: input.workerId,
                expectedStateVersion: checkpoint.stateVersion,
                failureCode: "AI_OUTPUT_INVALID",
              })),
            });
            if (!released.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
            if (generationAttempt < quality.generationAttemptCap) continue;
            return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
          }
          const acceptedBeforePass = await listAccepted();
          if (!acceptedBeforePass.ok) return acceptedBeforePass;
          const acceptedRowsBeforePass = acceptedBeforePass.value as readonly PersistedReportSectionCheckpoint[];
          const existingProviderIds = new Set(
            acceptedRowsBeforePass
              .map((row) => row.providerId?.trim())
              .filter((value): value is string => Boolean(value)),
          );
          const existingModelIds = new Set(
            acceptedRowsBeforePass
              .map((row) => row.modelId?.trim())
              .filter((value): value is string => Boolean(value)),
          );
          const lineageMismatch =
            existingProviderIds.size > 1 ||
            existingModelIds.size > 1 ||
            (existingProviderIds.size === 1 && !existingProviderIds.has(written.value.providerId)) ||
            (existingModelIds.size === 1 && !existingModelIds.has(written.value.modelId));
          if (lineageMismatch) {
            const released = await repository.releaseGroupRetryableFailure({
              members: claimed.value.checkpoints
                .filter((checkpoint) => checkpoint.status === "generating")
                .map((checkpoint) => ({
                  ...lineageFor(checkpoint.sectionKey),
                  jobId,
                  workerId: input.workerId,
                  expectedStateVersion: checkpoint.stateVersion,
                  failureCode: "AI_OUTPUT_INVALID",
                })),
            });
            if (!released.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
            return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
          }
          const stoppedBeforePass = stopped();
          if (stoppedBeforePass) return stoppedBeforePass;
          const marked = await repository.markGroupPassed({
            members: remainingKeys.map((sectionKey) => {
              const section = returned.get(sectionKey)!;
              const checkpoint = claimed.value.checkpoints.find((row) => row.sectionKey === sectionKey)!;
              return {
                groupId: group.groupId,
                ...lineageFor(sectionKey),
                jobId,
                workerId: input.workerId,
                expectedStateVersion: checkpoint.stateVersion,
                acceptedContent: section.value,
                contentHash: stableHash(section.value),
                providerId: written.value.providerId,
                modelId: written.value.modelId,
              };
            }),
          });
          if (!marked.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
          const afterPass = await listAccepted();
          if (!afterPass.ok) return afterPass;
          digest = buildComprehensiveReportSectionDigest(
            acceptedSections(afterPass.value as readonly PersistedReportSectionCheckpoint[]),
            selection.reportConfigVersion,
            selection.qualityVersion,
          );
          groupCompleted = true;
        }
      }
      return null;
    };
    const generateOne = async (
      sectionKey: ComprehensiveReportSectionKey,
      digest?: ReturnType<typeof buildComprehensiveReportSectionDigest>,
    ): Promise<ReportGenerationServiceResult | null> => {
      while (true) {
        const stoppedResult = stopped();
        if (stoppedResult) return stoppedResult;
        const qualityRewrite = warningOnlyReview
          ? null
          : await repository.claimQualityRewrite({
            ...lineageFor(sectionKey),
            jobId,
            workerId: input.workerId,
            attemptNumber: input.attemptNumber,
          });
        if (qualityRewrite && (!qualityRewrite.ok || qualityRewrite.value.outcome === "terminal")) {
          return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
        }
        if (qualityRewrite?.ok && qualityRewrite.value.outcome === "in_progress") {
          return { ok: false, error: { code: "AI_TIMEOUT", retryable: true } };
        }
        if (qualityRewrite?.ok && qualityRewrite.value.outcome === "claimed") {
          const candidate = qualityRewrite.value.candidate!;
          const beforeQualityProvider = stopped();
          if (beforeQualityProvider) return beforeQualityProvider;
          const qualityLifecycle = await lifecycleFence(input);
          if (qualityLifecycle) return qualityLifecycle;
          let rewritten: Awaited<ReturnType<typeof writeComprehensiveReportSectionV4>>;
          try {
            rewritten = await writeComprehensiveReportSectionV4({
              sectionKey,
              facts: source.comprehensiveFactsV4!,
              knowledgePacks: source.knowledgePacks!,
              provider: dependencies.provider,
              promptVersion: selection.promptVersion,
              reportConfigVersion: selection.reportConfigVersion,
              readingContext: source.readingContext,
              ...(digest ? { priorSectionDigest: digest } : {}),
              rewrite: {
                priorSection: candidate.candidateSection,
                findings: selection.promptVersion === REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY ||
                  selection.promptVersion === REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY
                  ? candidate.findings
                  : candidate.findings.map((finding) =>
                      `${finding.itemKey} ${finding.code}: ${finding.note}`.slice(0, 300),
                    ),
              },
              costContext: {
                ...baseCostContext,
                idempotencyKey: `${payload.reportVersionId}:${sectionKey}:quality-rewrite:${candidate.rewriteOrdinal}`,
                purpose: "rewrite",
              },
            });
          } catch {
            rewritten = { ok: false, error: { code: "AI_TIMEOUT", retryable: true } };
          }
          const afterQualityProvider = stopped();
          if (afterQualityProvider) return afterQualityProvider;
          if (!rewritten.ok) {
            const mapped = mapProviderError(rewritten.error);
            const transitioned = mapped.retryable
              ? await repository.releaseQualityRewriteRetryableFailure({
                ...lineageFor(sectionKey), jobId, workerId: input.workerId,
                rewriteOrdinal: candidate.rewriteOrdinal, expectedStateVersion: candidate.stateVersion,
                failureCode: mapped.code,
              })
              : await repository.markQualityRewriteTerminalFailure({
                ...lineageFor(sectionKey), jobId, workerId: input.workerId,
                rewriteOrdinal: candidate.rewriteOrdinal, expectedStateVersion: candidate.stateVersion,
                failureCode: mapped.code,
              });
            if (!transitioned.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
            return { ok: false, error: mapped };
          }
          const rewrittenSection: ComprehensiveReportAcceptedSection = {
            key: sectionKey as any,
            value: rewritten.value.value as any,
          };
          const postRewriteFindings = sectionQualityFindings(
            rewrittenSection,
            source.comprehensiveFactsV4,
            selection.reportConfigVersion,
            selection.qualityVersion,
          );
          const contractFindings = keyConfigurationRewriteContractFindings(
            candidate.candidateSection,
            rewrittenSection,
            selection.promptVersion,
          );
          if (contractFindings.length > 0) {
            const terminal = await repository.markQualityRewriteTerminalFailure({
              ...lineageFor(sectionKey), jobId, workerId: input.workerId,
              rewriteOrdinal: candidate.rewriteOrdinal, expectedStateVersion: candidate.stateVersion,
              failureCode: "AI_OUTPUT_INVALID",
              terminalFindings: contractFindings,
            });
            if (!terminal.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
            return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
          }
          const finalFindings = postRewriteFindings.slice(0, 8);
          if (finalFindings.length > 0) {
            if (candidate.rewriteOrdinal < quality.sectionRewriteCap) {
              const continued = await repository.continueQualityRewrite({
                ...lineageFor(sectionKey),
                jobId,
                workerId: input.workerId,
                rewriteOrdinal: candidate.rewriteOrdinal,
                expectedStateVersion: candidate.stateVersion,
                candidateContent: rewrittenSection.value,
                candidateHash: stableHash(rewrittenSection.value),
                candidateProviderId: rewritten.value.providerId,
                candidateModelId: rewritten.value.modelId,
                findings: finalFindings,
                rewriteAttemptCap: quality.sectionRewriteCap,
              });
              if (!continued.ok) {
                return {
                  ok: false,
                  error: {
                    code: continued.error.code === "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT"
                      ? "AI_OUTPUT_INVALID"
                      : "REPORT_VERSION_CONFLICT",
                    retryable: false,
                  },
                };
              }
              continue;
            }
            const terminal = await repository.markQualityRewriteTerminalFailure({
              ...lineageFor(sectionKey), jobId, workerId: input.workerId,
              rewriteOrdinal: candidate.rewriteOrdinal, expectedStateVersion: candidate.stateVersion,
              failureCode: "AI_OUTPUT_INVALID",
              terminalFindings: finalFindings,
            });
            if (!terminal.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
            return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
          }
          const passed = await repository.markQualityRewritePassed({
            ...lineageFor(sectionKey), jobId, workerId: input.workerId,
            rewriteOrdinal: candidate.rewriteOrdinal, expectedStateVersion: candidate.stateVersion,
            acceptedContent: rewrittenSection.value, contentHash: stableHash(rewrittenSection.value),
            providerId: rewritten.value.providerId, modelId: rewritten.value.modelId,
          });
          return passed.ok ? null : { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
        }
        const claim = await repository.claim({
          ...lineageFor(sectionKey),
          jobId,
          workerId: input.workerId,
          mode: "generation",
          generationAttemptCap: quality.generationAttemptCap,
          rewriteAttemptCap: quality.sectionRewriteCap,
        });
        if (!claim.ok || claim.value.outcome === "terminal") {
          return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
        }
        if (claim.value.outcome === "replay") return null;
        const checkpoint = claim.value.checkpoint;
        const stoppedBeforeProvider = stopped();
        if (stoppedBeforeProvider) return stoppedBeforeProvider;
        const lifecycle = await lifecycleFence(input);
        if (lifecycle) return lifecycle;
        let written: Awaited<ReturnType<typeof writeComprehensiveReportSectionV4>>;
        try {
          written = await writeComprehensiveReportSectionV4({
            sectionKey,
            facts: source.comprehensiveFactsV4!,
            knowledgePacks: source.knowledgePacks!,
            provider: dependencies.provider,
            promptVersion: selection.promptVersion,
            reportConfigVersion: selection.reportConfigVersion,
            readingContext: source.readingContext,
            ...(digest ? { priorSectionDigest: digest } : {}),
            costContext: {
              ...baseCostContext,
              idempotencyKey: `${payload.reportVersionId}:${sectionKey}:generation:${checkpoint.generationAttemptCount}:critic:0`,
              purpose: "report",
            },
          });
        } catch {
          written = { ok: false, error: { code: "AI_TIMEOUT", retryable: true } };
        }
        const stoppedAfterProvider = stopped();
        if (stoppedAfterProvider) return stoppedAfterProvider;
        if (!written.ok) {
          const mapped = mapProviderError(written.error);
          const finalInvalidAttempt =
            mapped.code === "AI_OUTPUT_INVALID" &&
            checkpoint.generationAttemptCount >= quality.generationAttemptCap;
          const transitioned = await (finalInvalidAttempt
            ? repository.markTerminalFailure({
              ...lineageFor(sectionKey),
              jobId,
              workerId: input.workerId,
              expectedStateVersion: checkpoint.stateVersion,
              failureCode: mapped.code,
            })
            : repository.releaseRetryableFailure({
              ...lineageFor(sectionKey),
              jobId,
              workerId: input.workerId,
              expectedStateVersion: checkpoint.stateVersion,
              failureCode: mapped.code,
            }));
          if (!transitioned.ok) {
            return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
          }
          if (
            mapped.code === "AI_OUTPUT_INVALID" &&
            !finalInvalidAttempt
          ) {
            continue;
          }
          return { ok: false, error: mapped };
        }
        const section: ComprehensiveReportAcceptedSection = { key: sectionKey as any, value: written.value.value as any };
        const findings = warningOnlyReview
          ? []
          : sectionQualityFindings(section, source.comprehensiveFactsV4, selection.reportConfigVersion, selection.qualityVersion);
        if (findings.length > 0) {
          const recorded = await repository.recordQualityCandidate({
            ...lineageFor(sectionKey), jobId, workerId: input.workerId,
            expectedStateVersion: checkpoint.stateVersion,
            generationOrdinal: checkpoint.generationAttemptCount,
            candidateContent: section.value, candidateHash: stableHash(section.value),
            candidateProviderId: written.value.providerId, candidateModelId: written.value.modelId,
            findings, rewriteAttemptCap: quality.sectionRewriteCap,
          });
          if (!recorded.ok) {
            return {
              ok: false,
              error: {
                code: recorded.error.code === "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT"
                  ? "AI_OUTPUT_INVALID"
                  : "REPORT_VERSION_CONFLICT",
                retryable: false,
              },
            };
          }
          continue;
        }
        const stoppedBeforePass = stopped();
        if (stoppedBeforePass) return stoppedBeforePass;
        const passed = await repository.markPassed({
          ...lineageFor(sectionKey), jobId, workerId: input.workerId, expectedStateVersion: checkpoint.stateVersion,
          acceptedContent: section.value, contentHash: stableHash(section.value),
          providerId: written.value.providerId, modelId: written.value.modelId,
        });
        if (!passed.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
        return null;
      }
    };
    const runPhase = async (keys: readonly ComprehensiveReportSectionKey[], digest?: ReturnType<typeof buildComprehensiveReportSectionDigest>) => {
      for (let offset = 0; offset < keys.length; offset += quality.providerConcurrency) {
        const group = keys.slice(offset, offset + quality.providerConcurrency);
        const results = await Promise.all(group.map((key) => generateOne(key, digest)));
        const failure = results.find((result): result is ReportGenerationServiceResult => result !== null);
        if (failure) return failure;
      }
      return null;
    };
    const rewriteOne = async (
      sectionKey: ComprehensiveReportSectionKey,
      findings: readonly string[],
      criticPass: number,
    ): Promise<ReportGenerationServiceResult | null> => {
      const stoppedResult = stopped();
      if (stoppedResult) return stoppedResult;
      const current = await listAccepted();
      if (!current.ok) return current;
      const row = (current.value as readonly PersistedReportSectionCheckpoint[]).find((item) => item.sectionKey === sectionKey);
      if (!row?.acceptedSection) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
      const claimed = await repository.claimPassedRewrite({
        ...lineageFor(sectionKey), jobId, workerId: input.workerId,
        rewriteAttemptCap: 1,
      });
      if (!claimed.ok || claimed.value.outcome === "terminal") return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
      if (claimed.value.outcome === "replay") return null;
      const revision = claimed.value.revision;
      const stoppedBeforeProvider = stopped();
      if (stoppedBeforeProvider) return stoppedBeforeProvider;
      const lifecycle = await lifecycleFence(input);
      if (lifecycle) return lifecycle;
      let written: Awaited<ReturnType<typeof writeComprehensiveReportSectionV4>>;
      try {
        written = await writeComprehensiveReportSectionV4({
          sectionKey, facts: source.comprehensiveFactsV4!, knowledgePacks: source.knowledgePacks!,
          provider: dependencies.provider, promptVersion: selection.promptVersion,
          reportConfigVersion: selection.reportConfigVersion,
          readingContext: source.readingContext,
          priorSectionDigest: buildComprehensiveReportSectionDigest((current.value as readonly PersistedReportSectionCheckpoint[]).flatMap((item) => item.acceptedSection ? [item.acceptedSection] : []), selection.reportConfigVersion, selection.qualityVersion),
          rewrite: { priorSection: row.acceptedSection, findings: findings.slice(0, 8) },
          costContext: {
            ...baseCostContext,
            idempotencyKey: `${payload.reportVersionId}:${sectionKey}:rewrite:${revision.rewriteOrdinal}:critic:${criticPass}`,
            purpose: "rewrite",
          },
        });
      } catch {
        written = { ok: false, error: { code: "AI_TIMEOUT", retryable: true } };
      }
      const postProvider = stopped();
      if (postProvider) return postProvider;
      if (!written.ok) {
        const mapped = mapProviderError(written.error);
        await repository.releaseRewriteRetryableFailure({
          ...lineageFor(sectionKey), jobId, workerId: input.workerId,
          rewriteOrdinal: revision.rewriteOrdinal, expectedStateVersion: revision.stateVersion, failureCode: mapped.code,
        });
        return { ok: false, error: mapped };
      }
      const section: ComprehensiveReportAcceptedSection = { key: sectionKey as any, value: written.value.value as any };
      const contractFindings = keyConfigurationRewriteContractFindings(
        row.acceptedSection,
        section,
        selection.promptVersion,
      );
      if (contractFindings.length > 0) {
        const terminal = await repository.markRewriteTerminalFailure({
          ...lineageFor(sectionKey), jobId, workerId: input.workerId,
          rewriteOrdinal: revision.rewriteOrdinal, expectedStateVersion: revision.stateVersion,
          failureCode: "AI_OUTPUT_INVALID",
        });
        if (!terminal.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
        return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
      }
      if (!sectionPassesQuality(section, source.comprehensiveFactsV4, selection.reportConfigVersion, selection.qualityVersion)) {
        await repository.releaseRewriteRetryableFailure({
          ...lineageFor(sectionKey), jobId, workerId: input.workerId,
          rewriteOrdinal: revision.rewriteOrdinal, expectedStateVersion: revision.stateVersion, failureCode: "AI_OUTPUT_INVALID",
        });
        return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
      }
      const beforePass = stopped();
      if (beforePass) return beforePass;
      const passed = await repository.markPassedRewrite({
        ...lineageFor(sectionKey), jobId, workerId: input.workerId,
        rewriteOrdinal: revision.rewriteOrdinal, expectedStateVersion: revision.stateVersion,
        acceptedContent: section.value, contentHash: stableHash(section.value),
        providerId: written.value.providerId, modelId: written.value.modelId,
      });
      return passed.ok ? null : { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
    };
    const validatorKeys = (errors: readonly string[]): ComprehensiveReportSectionKey[] | null => {
      const keys = new Set<ComprehensiveReportSectionKey>();
      for (const error of errors) {
        const direct = sectionKeys.find((key) => error.includes(key));
        if (direct) { keys.add(direct); continue; }
        const palace = /palaceReadings\.(\d+)/u.exec(error);
        if (palace) { keys.add(`palace:${["ziwei.palace.life", "ziwei.palace.siblings", "ziwei.palace.spouse", "ziwei.palace.children", "ziwei.palace.wealth", "ziwei.palace.health", "ziwei.palace.travel", "ziwei.palace.friends", "ziwei.palace.career", "ziwei.palace.property", "ziwei.palace.fortune", "ziwei.palace.parents"][Number(palace[1])]}` as ComprehensiveReportSectionKey); continue; }
        const palaceKey = /palaceReadings\[(ziwei\.palace\.[a-z]+)\]/u.exec(error);
        if (palaceKey && (sectionKeys as readonly string[]).includes(`palace:${palaceKey[1]}`)) {
          keys.add(`palace:${palaceKey[1]}` as ComprehensiveReportSectionKey); continue;
        }
        const theme = /thematicSynthesis\.(\d+)/u.exec(error);
        if (theme) { keys.add(`thematic:${["career_wealth", "relationships_family", "social_environment", "wellbeing_inner_resources"][Number(theme[1])]}` as ComprehensiveReportSectionKey); continue; }
        const themeKey = /thematicSynthesis\[([a-z_]+)\]/u.exec(error);
        if (themeKey && (sectionKeys as readonly string[]).includes(`thematic:${themeKey[1]}`)) {
          keys.add(`thematic:${themeKey[1]}` as ComprehensiveReportSectionKey); continue;
        }
        return null;
      }
      return keys.size > 0 ? [...keys] : null;
    };
    let listed = await listAccepted();
    if (!listed.ok) return listed;
    let rows = listed.value as readonly PersistedReportSectionCheckpoint[];
    const groupedResult = await groupedGeneration();
    if (groupedResult) return groupedResult;
    if (groupedActiveTuple) {
      listed = await listAccepted();
      if (!listed.ok) return listed;
      rows = listed.value as readonly PersistedReportSectionCheckpoint[];
    }
    const existing = new Set(rows.map((row) => row.sectionKey));
    const sequentialBefore = ["overview", "coreAxis", "keyConfigurations"] as const;
    for (const key of sequentialBefore) {
      if (!existing.has(key)) {
        const result = await generateOne(key);
        if (result) return result;
      }
    }
    listed = await listAccepted(); if (!listed.ok) return listed;
    rows = listed.value as readonly PersistedReportSectionCheckpoint[];
    const firstDigest = buildComprehensiveReportSectionDigest(acceptedSections(rows), selection.reportConfigVersion, selection.qualityVersion);
    const palaces = sectionKeys.filter((key) => key.startsWith("palace:"));
    const palaceResult = await runPhase(palaces.filter((key) => !new Set(rows.map((row) => row.sectionKey)).has(key)), firstDigest);
    if (palaceResult) return palaceResult;
    listed = await listAccepted(); if (!listed.ok) return listed;
    rows = listed.value as readonly PersistedReportSectionCheckpoint[];
    const palaceDigest = buildComprehensiveReportPalaceSectionDigest(acceptedSections(rows), selection.reportConfigVersion, selection.qualityVersion);
    const preferredTheme =
      source.readingContext?.topConcern === "career" || source.readingContext?.topConcern === "money"
        ? "thematic:career_wealth"
        : source.readingContext?.topConcern === "love" || source.readingContext?.topConcern === "family"
          ? "thematic:relationships_family"
          : source.readingContext?.topConcern === "wellbeing" || source.readingContext?.topConcern === "self_understanding"
            ? "thematic:wellbeing_inner_resources"
            : null;
    const themes = sectionKeys
      .filter((key) => key.startsWith("thematic:"))
      .sort((left, right) => Number(right === preferredTheme) - Number(left === preferredTheme));
    const themeResult = await runPhase(themes.filter((key) => !new Set(rows.map((row) => row.sectionKey)).has(key)), palaceDigest);
    if (themeResult) return themeResult;
    listed = await listAccepted(); if (!listed.ok) return listed;
    rows = listed.value as readonly PersistedReportSectionCheckpoint[];
    const trailing = selection.family === "v4"
      ? ["strengthsAndTensions", "currentDecadal", "annualSnapshot", "practicalDirection"] as const
      : ["strengthsAndTensions", "currentDecadal", "annualSnapshot", "birthTimeSensitivity", "practicalDirection"] as const;
    for (const key of trailing) {
      if (!new Set(rows.map((row) => row.sectionKey)).has(key)) {
        const result = await generateOne(key, buildComprehensiveReportSectionDigest(acceptedSections(rows), selection.reportConfigVersion, selection.qualityVersion));
        if (result) return result;
        listed = await listAccepted(); if (!listed.ok) return listed;
        rows = listed.value as readonly PersistedReportSectionCheckpoint[];
      }
    }
    if (rows.length !== sectionKeys.length || rows.some((row) =>
      row.promptVersion !== selection.promptVersion ||
      row.knowledgeVersionId !== selection.knowledgeVersion ||
      row.reportConfigVersion !== selection.reportConfigVersion ||
      row.qualityConfigVersion !== selection.qualityVersion,
    )) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
    const sections = acceptedSections(rows);
    const lineage = (accepted: readonly PersistedReportSectionCheckpoint[]) => ({
      providerIds: new Set(accepted.map((row) => row.providerId).filter((value): value is string => Boolean(value?.trim()))),
      modelIds: new Set(accepted.map((row) => row.modelId).filter((value): value is string => Boolean(value?.trim()))),
    });
    let { providerIds, modelIds } = lineage(rows);
    if (providerIds.size !== 1 || modelIds.size !== 1) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
    let report;
    try {
      report = selection.family === "v4"
        ? assembleComprehensiveReportV4(sections, source.comprehensiveFactsV4!)
        : assembleComprehensiveReportV4_1(
          sections,
          source.comprehensiveFactsV4!,
          selection.reportConfigVersion,
        );
    } catch { return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } }; }
    if (stopped()) return stopped()!;
    const validationOptions = warningOnlyReview ? { contentPolicy: "ignore" as const } : undefined;
    let validation = selection.family === "v4"
      ? validateComprehensiveZiweiReportV4(report, source.comprehensiveFactsV4!, validationOptions)
      : validateComprehensiveZiweiReportV4_1(report, source.comprehensiveFactsV4!, validationOptions);
    if (!validation.ok && !warningOnlyReview) {
      const keys = validatorKeys(validation.errors);
      if (!keys) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
      for (const key of keys) {
        const result = await rewriteOne(key, validation.errors, 0);
        if (result) return result;
      }
      const refreshed = await listAccepted(); if (!refreshed.ok) return refreshed;
      ({ providerIds, modelIds } = lineage(refreshed.value as readonly PersistedReportSectionCheckpoint[]));
      if (providerIds.size !== 1 || modelIds.size !== 1) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
      try {
        report = selection.family === "v4"
          ? assembleComprehensiveReportV4(acceptedSections(refreshed.value as readonly PersistedReportSectionCheckpoint[]), source.comprehensiveFactsV4!)
          : assembleComprehensiveReportV4_1(
            acceptedSections(refreshed.value as readonly PersistedReportSectionCheckpoint[]),
            source.comprehensiveFactsV4!,
            selection.reportConfigVersion,
          );
      } catch { return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } }; }
      validation = selection.family === "v4"
        ? validateComprehensiveZiweiReportV4(report, source.comprehensiveFactsV4!)
        : validateComprehensiveZiweiReportV4_1(report, source.comprehensiveFactsV4!);
      if (!validation.ok) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
    }
    if (warningOnlyReview) {
      const reviewLifecycle = await lifecycleFence(input);
      if (reviewLifecycle) return reviewLifecycle;
      try {
        const review = await critiqueComprehensiveZiweiReportSectionedV4(report, source.comprehensiveFactsV4!, dependencies.provider, {
          costContext: { ...baseCostContext, idempotencyKey: `${payload.reportVersionId}:critic:1`, purpose: "critic" },
          readingContext: source.readingContext,
          reportConfigVersion: selection.reportConfigVersion,
          warningOnly: true,
        });
        if (review.ok && "warnings" in review.value && review.value.warnings.length > 0) {
          dependencies.onReviewWarnings?.({
            reportVersionId: payload.reportVersionId,
            warnings: review.value.warnings,
          });
        }
      } catch {
        // Advisory review is intentionally best-effort.
      }
    } else {
    let critic;
    const firstCriticLifecycle = await lifecycleFence(input);
    if (firstCriticLifecycle) return firstCriticLifecycle;
    try {
      critic = await critiqueComprehensiveZiweiReportSectionedV4(report, source.comprehensiveFactsV4!, dependencies.provider, {
        costContext: { ...baseCostContext, idempotencyKey: `${payload.reportVersionId}:critic:1`, purpose: "critic" },
        readingContext: source.readingContext,
        reportConfigVersion: selection.reportConfigVersion,
      });
    } catch { return { ok: false, error: { code: "AI_TIMEOUT", retryable: true } }; }
    if (stopped()) return stopped()!;
    if (!critic.ok) {
      const findings = "findings" in critic.error ? critic.error.findings : undefined;
      if (!findings?.length) return { ok: false, error: mapProviderError(critic.error) };
      for (const key of [...new Set(findings.map((finding) => finding.key))]) {
        const result = await rewriteOne(key, findings.filter((finding) => finding.key === key).map((finding) => finding.note), 1);
        if (result) return result;
      }
      const refreshed = await listAccepted(); if (!refreshed.ok) return refreshed;
      ({ providerIds, modelIds } = lineage(refreshed.value as readonly PersistedReportSectionCheckpoint[]));
      if (providerIds.size !== 1 || modelIds.size !== 1) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
      try {
        report = selection.family === "v4"
          ? assembleComprehensiveReportV4(acceptedSections(refreshed.value as readonly PersistedReportSectionCheckpoint[]), source.comprehensiveFactsV4!)
          : assembleComprehensiveReportV4_1(
            acceptedSections(refreshed.value as readonly PersistedReportSectionCheckpoint[]),
            source.comprehensiveFactsV4!,
            selection.reportConfigVersion,
          );
      } catch { return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } }; }
      validation = selection.family === "v4"
        ? validateComprehensiveZiweiReportV4(report, source.comprehensiveFactsV4!)
        : validateComprehensiveZiweiReportV4_1(report, source.comprehensiveFactsV4!);
      if (!validation.ok) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
      const secondCriticLifecycle = await lifecycleFence(input);
      if (secondCriticLifecycle) return secondCriticLifecycle;
      try {
        critic = await critiqueComprehensiveZiweiReportSectionedV4(report, source.comprehensiveFactsV4!, dependencies.provider, {
          costContext: { ...baseCostContext, idempotencyKey: `${payload.reportVersionId}:critic:2`, purpose: "critic" },
          readingContext: source.readingContext,
          reportConfigVersion: selection.reportConfigVersion,
        });
      } catch { return { ok: false, error: { code: "AI_TIMEOUT", retryable: true } }; }
      if (!critic.ok) return { ok: false, error: mapProviderError(critic.error) };
    }
    }
    if (warningOnlyReview) {
      const commitLifecycle = await lifecycleFence(input);
      if (commitLifecycle) return commitLifecycle;
      if (guardState(input) === "lease_lost") {
        return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
      }
    } else {
      const stoppedBeforeCommit = stopped();
      if (stoppedBeforeCommit) return stoppedBeforeCommit;
    }
    const commit = await dependencies.versionRepository.commitImmutableVersion({
      reportId: payload.reportId, reportVersionId: payload.reportVersionId, entitlementId: payload.entitlementId,
      chartVersionId: payload.chartVersionId, evidenceVersionId: payload.evidenceVersionId,
      knowledgeVersionId: payload.knowledgeVersionId, promptVersion: payload.promptVersion,
      reportConfigVersion: payload.reportConfigVersion, templateVersion: selection.templateVersion,
      renderVersion: "renderVersion" in selection ? selection.renderVersion : CURRENT_REPORT_RENDER_VERSION, locale: payload.locale, sku: payload.sku,
      providerId: [...providerIds][0]!, modelId: [...modelIds][0]!,
      structuredContent: report as unknown as IdentityReportV1, htmlContent: renderComprehensiveZiweiHtml(report as never),
      jobId, workerId: input.workerId, attemptNumber: input.attemptNumber, traceId: input.job.traceId,
      supersedesReportVersionId: supersedesReportVersionId(payload),
    });
    if (!commit.ok) return { ok: false, error: { code: "REPORT_VERSION_CONFLICT", retryable: false } };
    return { ok: true, value: commit.value };
  }

  async function executeGeneration(input: GenerateReportInput): Promise<ReportGenerationServiceResult> {
    const { job, attemptNumber, workerId } = input;
    const jobId = input.jobId ?? job.idempotencyKey;
    const payload = job.payload;
    const baseCostContext: AiCostRequestContext = {
      idempotencyKey: jobId,
      reportId: payload.reportId,
      reportVersionId: payload.reportVersionId,
      entitlementId: payload.entitlementId,
      // chartId is intentionally omitted; resolved by database cost service from commerce_entitlements
      chartVersionId: payload.chartVersionId,
      sku: payload.sku,
      attemptNumber,
    };

    const replay = await replayExisting(input);
    if (!replay.ok) return replay;
    if (replay.value !== null) return { ok: true, value: replay.value };

    if (!dependencies.gate.allows("production_report_generation")) {
      return {
        ok: false,
        error: {
          code: "AI_CAPABILITY_UNSUPPORTED",
          retryable: false,
        },
      };
    }

    const attemptResult = await dependencies.versionRepository.startOrReuseAttempt({
      jobId,
      attemptNumber,
      reportVersionId: payload.reportVersionId,
    });
    if (!attemptResult.ok) {
      return {
        ok: false,
        error: {
          code: "REPORT_VERSION_CONFLICT",
          retryable: false,
        },
      };
    }

    async function failAttempt(code: ReportGenerationServiceErrorCode, retryable: boolean): Promise<ReportGenerationServiceResult> {
      try {
        const recordResult = await dependencies.versionRepository.recordFailedAttempt({
          jobId,
          attemptNumber,
          errorCode: code,
        });
        if (!recordResult.ok) {
          return {
            ok: false,
            error: {
              code: "REPORT_VERSION_CONFLICT",
              retryable: false,
            },
          };
        }
      } catch {
        return {
          ok: false,
          error: {
            code: "REPORT_VERSION_CONFLICT",
            retryable: false,
          },
        };
      }
      return {
        ok: false,
        error: {
          code,
          retryable,
        },
      };
    }

    if (job.name === "report.generate.v2") {
      if (!dependencies.sourceSnapshotPreparer) {
        return failAttempt("REPORT_SOURCE_SNAPSHOT_INVALID", false);
      }
      const prepResult = await dependencies.sourceSnapshotPreparer.prepare(payload);
      if (!prepResult.ok) {
        return failAttempt(prepResult.error.code, prepResult.error.retryable);
      }
    }

    const family = resolveIdentityReportVersionFamily(
      payload.promptVersion,
      payload.knowledgeVersionId,
    );
    if (family === null) {
      return failAttempt("AI_OUTPUT_INVALID", false);
    }

    const sourceResult = await dependencies.sourceRepository.loadSource({
      reportVersionId: payload.reportVersionId,
      chartVersionId: payload.chartVersionId,
      evidenceVersionId: payload.evidenceVersionId,
      knowledgeVersionId: payload.knowledgeVersionId,
      promptVersion: payload.promptVersion,
      locale: payload.locale,
      readingContextRevisionId:
        "readingContextRevisionId" in payload
          ? payload.readingContextRevisionId ?? null
          : null,
    });
    if (!sourceResult.ok) {
      return failAttempt("REPORT_EVIDENCE_INVALID", false);
    }
    const source = sourceResult.value;

    if (family === "v4" || family === "v4_1") {
      if (!source.comprehensiveFactsV4 || !source.knowledgePacks) {
        return failAttempt("REPORT_EVIDENCE_INVALID", false);
      }
      const sectionedSelection = resolveSectionedSelection(payload);
      if (sectionedSelection) {
        const sectioned = await executeSectionedGeneration(
          input,
          source as ComprehensiveReportSourceV4,
          baseCostContext,
        );
        if (!sectioned.ok && guardState(input) === "lease_lost") return sectioned;
        if (!sectioned.ok && guardState(input) === "wall_clock_exhausted") return sectioned;
        if (!sectioned.ok) return failAttempt(sectioned.error.code, sectioned.error.retryable);
        return sectioned;
      }
      if (family === "v4_1") {
        return failAttempt("AI_OUTPUT_INVALID", false);
      }
      const promptVersion =
        payload.promptVersion === REPORT_PROMPT_VERSION_V4 ||
        payload.promptVersion === REPORT_PROMPT_VERSION_V4_0_1
          ? payload.promptVersion
          : null;
      if (!promptVersion) {
        return failAttempt("AI_OUTPUT_INVALID", false);
      }

      let writerResult: Awaited<ReturnType<typeof writeComprehensiveZiweiReportV4>>;
      const writerLifecycle = await lifecycleFence(input);
      if (writerLifecycle?.ok === false) return failAttempt(writerLifecycle.error.code, false);
      try {
        writerResult = await writeComprehensiveZiweiReportV4(
          source as ComprehensiveReportSourceV4,
          dependencies.provider,
          {
            costContext: { ...baseCostContext, purpose: "report" },
            promptVersion,
          },
        );
      } catch {
        return failAttempt("AI_TIMEOUT", true);
      }

      if (!writerResult.ok) {
        const errCode = writerResult.error.code;
        if (errCode === "AI_COST_RECORDING_FAILED") {
          return failAttempt("AI_COST_RECORDING_FAILED", (writerResult.error as any).retryable ?? false);
        }
        if (errCode === "AI_TIMEOUT" || (errCode === "AI_PROVIDER_REQUEST_FAILED" && writerResult.error.retryable)) {
          return failAttempt("AI_TIMEOUT", true);
        }
        if (errCode === "AI_CAPABILITY_UNSUPPORTED") {
          return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
        }
        if (errCode === "AI_PROVIDER_NOT_APPROVED") {
          return failAttempt("AI_PROVIDER_NOT_APPROVED", false);
        }
        return failAttempt("AI_OUTPUT_INVALID", false);
      }

      let draft = writerResult.value;

      let initialValidation = validateComprehensiveZiweiReportV4(
        draft.report,
        source.comprehensiveFactsV4,
      );

      let initialCriticFailed = false;
      let initialCriticErrorCode: "AI_OUTPUT_INVALID" | "REPORT_SAFETY_REJECTED" | undefined;
      let rewriteIssues: string[] = [];

      if (!initialValidation.ok) {
        rewriteIssues = initialValidation.errors.slice(0, 8).map((e) => e.slice(0, 300));
      } else {
        let criticResult: Awaited<ReturnType<typeof critiqueComprehensiveZiweiReportV4>>;
        const criticLifecycle = await lifecycleFence(input);
        if (criticLifecycle?.ok === false) return failAttempt(criticLifecycle.error.code, false);
        try {
          criticResult = await critiqueComprehensiveZiweiReportV4(
            draft.report,
            source.comprehensiveFactsV4,
            dependencies.provider,
            {
              costContext: { ...baseCostContext, purpose: "critic" },
              readingContext: source.readingContext,
            },
          );
        } catch {
          return failAttempt("AI_TIMEOUT", true);
        }

        if (!criticResult.ok) {
          const errCode = criticResult.error.code;
          if (errCode === "AI_COST_RECORDING_FAILED") {
            return failAttempt("AI_COST_RECORDING_FAILED", (criticResult.error as any).retryable ?? false);
          }
          if (
            errCode === "AI_TIMEOUT" ||
            (errCode === "AI_PROVIDER_REQUEST_FAILED" && (criticResult.error as any).retryable)
          ) {
            return failAttempt("AI_TIMEOUT", true);
          }
          if (errCode === "AI_CAPABILITY_UNSUPPORTED") {
            return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
          }
          if (errCode === "AI_PROVIDER_NOT_APPROVED") {
            return failAttempt("AI_PROVIDER_NOT_APPROVED", false);
          }

          initialCriticFailed = true;
          initialCriticErrorCode =
            errCode === "REPORT_SAFETY_REJECTED" ? "REPORT_SAFETY_REJECTED" : "AI_OUTPUT_INVALID";

          const notes = "notes" in criticResult.error && Array.isArray(criticResult.error.notes)
            ? criticResult.error.notes
            : [];
          rewriteIssues = notes.slice(0, 8).map((n) => n.slice(0, 300));
          if (rewriteIssues.length === 0 && initialCriticErrorCode === "REPORT_SAFETY_REJECTED") {
            rewriteIssues = ["Báo cáo không đạt tiêu chuẩn an toàn hoặc tính chính xác, cần hiệu chỉnh."];
          }
        }
      }

      // Exactly one durable rewrite attempt if validation or critic rejected and budget available
      if (!initialValidation.ok || initialCriticFailed) {
        const budgetResult = await dependencies.versionRepository.consumeRewriteBudget(payload.reportVersionId);
        if (!budgetResult.ok) {
          return failAttempt("REPORT_VERSION_CONFLICT", false);
        }
        if (!budgetResult.value.consumed) {
          const terminalCode = initialCriticErrorCode ?? "AI_OUTPUT_INVALID";
          return failAttempt(terminalCode, false);
        }

        let revisionResult: Awaited<ReturnType<typeof writeComprehensiveZiweiReportV4>>;
        const rewriteLifecycle = await lifecycleFence(input);
        if (rewriteLifecycle?.ok === false) return failAttempt(rewriteLifecycle.error.code, false);
        try {
          revisionResult = await writeComprehensiveZiweiReportV4(
            {
              facts: source.comprehensiveFactsV4,
              knowledgePacks: source.knowledgePacks,
              provider: dependencies.provider,
              readingContext: source.readingContext,
              revision: {
                priorContent: draft.report,
                issues: rewriteIssues,
              },
            },
            dependencies.provider,
            {
              costContext: { ...baseCostContext, purpose: "report" },
              promptVersion,
            },
          );
        } catch {
          return failAttempt("AI_TIMEOUT", false);
        }

        if (!revisionResult.ok) {
          const revErrCode = revisionResult.error.code;
          if (revErrCode === "AI_COST_RECORDING_FAILED") {
            return failAttempt("AI_COST_RECORDING_FAILED", (revisionResult.error as any).retryable ?? false);
          }
          if (
            revErrCode === "AI_TIMEOUT" ||
            (revErrCode === "AI_PROVIDER_REQUEST_FAILED" && revisionResult.error.retryable)
          ) {
            return failAttempt("AI_TIMEOUT", false);
          }
          if (revErrCode === "AI_CAPABILITY_UNSUPPORTED") {
            return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
          }
          if (revErrCode === "AI_PROVIDER_NOT_APPROVED") {
            return failAttempt("AI_PROVIDER_NOT_APPROVED", false);
          }
          return failAttempt("AI_OUTPUT_INVALID", false);
        }

        draft = revisionResult.value;

        const revValidation = validateComprehensiveZiweiReportV4(
          draft.report,
          source.comprehensiveFactsV4,
        );
        if (!revValidation.ok) {
          return failAttempt("AI_OUTPUT_INVALID", false);
        }

        let revCriticResult: Awaited<ReturnType<typeof critiqueComprehensiveZiweiReportV4>>;
        const recriticLifecycle = await lifecycleFence(input);
        if (recriticLifecycle?.ok === false) return failAttempt(recriticLifecycle.error.code, false);
        try {
          revCriticResult = await critiqueComprehensiveZiweiReportV4(
            draft.report,
            source.comprehensiveFactsV4,
            dependencies.provider,
            {
              costContext: { ...baseCostContext, purpose: "critic" },
              readingContext: source.readingContext,
            },
          );
        } catch {
          return failAttempt("AI_TIMEOUT", false);
        }

        if (!revCriticResult.ok) {
          const revCritErrCode = revCriticResult.error.code;
          if (revCritErrCode === "AI_COST_RECORDING_FAILED") {
            return failAttempt("AI_COST_RECORDING_FAILED", (revCriticResult.error as any).retryable ?? false);
          }
          if (revCritErrCode === "REPORT_SAFETY_REJECTED") {
            return failAttempt("REPORT_SAFETY_REJECTED", false);
          }
          if (
            revCritErrCode === "AI_TIMEOUT" ||
            (revCritErrCode === "AI_PROVIDER_REQUEST_FAILED" && (revCriticResult.error as any).retryable)
          ) {
            return failAttempt("AI_TIMEOUT", false);
          }
          if (revCritErrCode === "AI_CAPABILITY_UNSUPPORTED") {
            return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
          }
          if (revCritErrCode === "AI_PROVIDER_NOT_APPROVED") {
            return failAttempt("AI_PROVIDER_NOT_APPROVED", false);
          }
          return failAttempt("AI_OUTPUT_INVALID", false);
        }
      }

      const htmlContent = renderComprehensiveZiweiHtml(draft.report);

      const commitResult = await dependencies.versionRepository.commitImmutableVersion({
        reportId: payload.reportId,
        reportVersionId: payload.reportVersionId,
        entitlementId: payload.entitlementId,
        chartVersionId: payload.chartVersionId,
        evidenceVersionId: payload.evidenceVersionId,
        knowledgeVersionId: payload.knowledgeVersionId,
        promptVersion: payload.promptVersion,
        reportConfigVersion: payload.reportConfigVersion,
        templateVersion: REPORT_TEMPLATE_VERSION_V3,
        renderVersion: CURRENT_REPORT_RENDER_VERSION,
        locale: payload.locale,
        sku: payload.sku,
        providerId: draft.providerId,
        modelId: draft.modelId,
        structuredContent: draft.report as unknown as IdentityReportV1,
        htmlContent,
        jobId,
        workerId,
        attemptNumber,
        traceId: job.traceId,
        supersedesReportVersionId: supersedesReportVersionId(payload),
      });

      if (!commitResult.ok) {
        return failAttempt("REPORT_VERSION_CONFLICT", false);
      }

      return { ok: true, value: commitResult.value };
    }

    if (family === "v3") {
      if (!source.comprehensiveFacts || !source.knowledgePacks) {
        return failAttempt("REPORT_EVIDENCE_INVALID", false);
      }

      let writerResult: Awaited<ReturnType<typeof writeComprehensiveZiweiReport>>;
      const v3WriterLifecycle = await lifecycleFence(input);
      if (v3WriterLifecycle?.ok === false) return failAttempt(v3WriterLifecycle.error.code, false);
      try {
        writerResult = await writeComprehensiveZiweiReport(
          source as ComprehensiveReportSource,
          dependencies.provider,
          { costContext: { ...baseCostContext, purpose: "report" } },
        );
      } catch {
        return failAttempt("AI_TIMEOUT", true);
      }

      if (!writerResult.ok) {
        const errCode = writerResult.error.code;
        if (errCode === "AI_COST_RECORDING_FAILED") {
          return failAttempt("AI_COST_RECORDING_FAILED", (writerResult.error as any).retryable ?? false);
        }
        if (errCode === "AI_TIMEOUT" || (errCode === "AI_PROVIDER_REQUEST_FAILED" && writerResult.error.retryable)) {
          return failAttempt("AI_TIMEOUT", true);
        }
        if (errCode === "AI_CAPABILITY_UNSUPPORTED") {
          return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
        }
        if (errCode === "AI_PROVIDER_NOT_APPROVED") {
          return failAttempt("AI_PROVIDER_NOT_APPROVED", false);
        }
        return failAttempt("AI_OUTPUT_INVALID", false);
      }

      const draft = writerResult.value;

      const validation = validateComprehensiveZiweiReport(draft.report, source.comprehensiveFacts);
      if (!validation.ok) {
        return failAttempt("AI_OUTPUT_INVALID", false);
      }

      const htmlContent = renderComprehensiveZiweiHtml(draft.report);

      const commitResult = await dependencies.versionRepository.commitImmutableVersion({
        reportId: payload.reportId,
        reportVersionId: payload.reportVersionId,
        entitlementId: payload.entitlementId,
        chartVersionId: payload.chartVersionId,
        evidenceVersionId: payload.evidenceVersionId,
        knowledgeVersionId: payload.knowledgeVersionId,
        promptVersion: payload.promptVersion,
        reportConfigVersion: payload.reportConfigVersion,
        templateVersion: REPORT_TEMPLATE_VERSION_V3,
        renderVersion: CURRENT_REPORT_RENDER_VERSION,
        locale: payload.locale,
        sku: payload.sku,
        providerId: draft.providerId,
        modelId: draft.modelId,
        structuredContent: draft.report as unknown as IdentityReportV1,
        htmlContent,
        jobId,
        workerId,
        attemptNumber,
        traceId: job.traceId,
        supersedesReportVersionId: supersedesReportVersionId(payload),
      });

      if (!commitResult.ok) {
        return failAttempt("REPORT_VERSION_CONFLICT", false);
      }

      return { ok: true, value: commitResult.value };
    }

    let writerResult: Awaited<ReturnType<typeof writeIdentityReportDraft>>;
    const legacyWriterLifecycle = await lifecycleFence(input);
    if (legacyWriterLifecycle?.ok === false) return failAttempt(legacyWriterLifecycle.error.code, false);
    try {
      writerResult = await writeIdentityReportDraft({
        ...source,
        locale: payload.locale,
        sku: payload.sku as "ZIWEI-IDENTITY-P0",
        provenance: {
          knowledgeVersion: payload.knowledgeVersionId,
          promptVersion: payload.promptVersion,
          templateVersion: CURRENT_REPORT_TEMPLATE_VERSION,
        },
        provider: dependencies.provider,
        costContext: { ...baseCostContext, purpose: "report" },
      });
    } catch {
      return failAttempt("AI_TIMEOUT", true);
    }

    if (!writerResult.ok) {
      const errCode = writerResult.error.code;
      if (errCode === "AI_COST_RECORDING_FAILED") {
        return failAttempt("AI_COST_RECORDING_FAILED", (writerResult.error as any).retryable ?? false);
      }
      if (errCode === "AI_TIMEOUT" || (errCode === "AI_PROVIDER_REQUEST_FAILED" && writerResult.error.retryable)) {
        return failAttempt("AI_TIMEOUT", true);
      }
      if (errCode === "AI_CAPABILITY_UNSUPPORTED") {
        return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
      }
      if (errCode === "AI_PROVIDER_NOT_APPROVED") {
        return failAttempt("AI_PROVIDER_NOT_APPROVED", false);
      }
      if (errCode === "REPORT_EVIDENCE_INVALID") {
        return failAttempt("REPORT_EVIDENCE_INVALID", false);
      }
      return failAttempt("AI_OUTPUT_INVALID", false);
    }

    const draft = writerResult.value;

    const validationResult = validateIdentityReport(draft.report, source, {
      promptVersion: payload.promptVersion,
      knowledgeVersion: payload.knowledgeVersionId,
    });
    if (!validationResult.ok) {
      const primaryFinding = validationResult.findings[0]?.code;
      if (primaryFinding === "REPORT_SAFETY_REJECTED") {
        return failAttempt("REPORT_SAFETY_REJECTED", false);
      }
      if (primaryFinding === "REPORT_SCHEMA_INVALID") {
        return failAttempt("AI_OUTPUT_INVALID", false);
      }
      return failAttempt("REPORT_EVIDENCE_INVALID", false);
    }

    let criticResult: Awaited<ReturnType<typeof critiqueIdentityReport>>;
    const legacyCriticLifecycle = await lifecycleFence(input);
    if (legacyCriticLifecycle?.ok === false) return failAttempt(legacyCriticLifecycle.error.code, false);
    try {
      criticResult = await critiqueIdentityReport(
        draft.report,
        source,
        dependencies.provider,
        {
          promptVersion: payload.promptVersion,
          knowledgeVersion: payload.knowledgeVersionId,
            costContext: { ...baseCostContext, purpose: "critic" },
        },
      );
    } catch {
      return failAttempt("AI_TIMEOUT", true);
    }

    let finalDraft = draft;

    if (!criticResult.ok) {
      const errCode = criticResult.error.code;
      if (errCode === "AI_COST_RECORDING_FAILED") {
        return failAttempt("AI_COST_RECORDING_FAILED", (criticResult.error as any).retryable ?? false);
      }
      if (errCode === "AI_TIMEOUT" || (errCode === "AI_PROVIDER_REQUEST_FAILED" && criticResult.error.retryable)) {
        return failAttempt("AI_TIMEOUT", true);
      }
      if (errCode === "REPORT_SAFETY_REJECTED") {
        return failAttempt("REPORT_SAFETY_REJECTED", false);
      }
      if (errCode === "AI_CAPABILITY_UNSUPPORTED") {
        return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
      }
      if (errCode === "AI_PROVIDER_NOT_APPROVED") {
        return failAttempt("AI_PROVIDER_NOT_APPROVED", false);
      }
      if (errCode === "REPORT_EVIDENCE_INVALID" || errCode === "REPORT_LANGUAGE_INVALID") {
        return failAttempt("REPORT_EVIDENCE_INVALID", false);
      }
      if (errCode === "AI_OUTPUT_INVALID") {
        // V1 never rewrites on quality failure
        if (family !== "v2") {
          return failAttempt("AI_OUTPUT_INVALID", false);
        }

        // V2 durable rewrite budget check
        const budgetResult = await dependencies.versionRepository.consumeRewriteBudget(payload.reportVersionId);
        if (!budgetResult.ok) {
          return failAttempt("REPORT_VERSION_CONFLICT", false);
        }
        if (!budgetResult.value.consumed) {
          return failAttempt("AI_OUTPUT_INVALID", false);
        }

        // Exactly one rewrite attempt
        const criticNotes = "notes" in criticResult.error && Array.isArray(criticResult.error.notes)
          ? criticResult.error.notes.slice(0, 8)
          : [];

        let revisionResult: Awaited<ReturnType<typeof writeIdentityReportDraft>>;
        const legacyRewriteLifecycle = await lifecycleFence(input);
        if (legacyRewriteLifecycle?.ok === false) return failAttempt(legacyRewriteLifecycle.error.code, false);
        try {
          revisionResult = await writeIdentityReportDraft({
            ...source,
            locale: payload.locale,
            sku: payload.sku as "ZIWEI-IDENTITY-P0",
            provenance: {
              knowledgeVersion: payload.knowledgeVersionId,
              promptVersion: payload.promptVersion,
              templateVersion: CURRENT_REPORT_TEMPLATE_VERSION,
            },
            provider: dependencies.provider,
            revision: {
              priorContent: {
                sections: draft.report.sections,
                reflectionQuestions: draft.report.reflectionQuestions,
                summaryActions: draft.report.summaryActions,
              },
              criticNotes,
            },
            costContext: { ...baseCostContext, purpose: "rewrite" },
          });
        } catch {
          return failAttempt("AI_TIMEOUT", false);
        }

        if (!revisionResult.ok) {
          const revErrCode = revisionResult.error.code;
          if (revErrCode === "AI_COST_RECORDING_FAILED") {
            return failAttempt("AI_COST_RECORDING_FAILED", (revisionResult.error as any).retryable ?? false);
          }
          if (revErrCode === "AI_TIMEOUT" || (revErrCode === "AI_PROVIDER_REQUEST_FAILED" && revisionResult.error.retryable)) {
            return failAttempt("AI_TIMEOUT", false);
          }
          return failAttempt("AI_OUTPUT_INVALID", false);
        }

        const revisedDraft = revisionResult.value;

        const revValidation = validateIdentityReport(revisedDraft.report, source, {
          promptVersion: payload.promptVersion,
          knowledgeVersion: payload.knowledgeVersionId,
        });
        if (!revValidation.ok) {
          const primaryFinding = revValidation.findings[0]?.code;
          if (primaryFinding === "REPORT_SAFETY_REJECTED") {
            return failAttempt("REPORT_SAFETY_REJECTED", false);
          }
          return failAttempt("AI_OUTPUT_INVALID", false);
        }

        let revCriticResult: Awaited<ReturnType<typeof critiqueIdentityReport>>;
        const legacyRecriticLifecycle = await lifecycleFence(input);
        if (legacyRecriticLifecycle?.ok === false) return failAttempt(legacyRecriticLifecycle.error.code, false);
        try {
          revCriticResult = await critiqueIdentityReport(
            revisedDraft.report,
            source,
            dependencies.provider,
            {
              promptVersion: payload.promptVersion,
              knowledgeVersion: payload.knowledgeVersionId,
              costContext: { ...baseCostContext, purpose: "critic" },
            },
          );
        } catch {
          return failAttempt("AI_TIMEOUT", false);
        }

        if (!revCriticResult.ok) {
          const revCritErrCode = revCriticResult.error.code;
          if (revCritErrCode === "AI_COST_RECORDING_FAILED") {
            return failAttempt("AI_COST_RECORDING_FAILED", (revCriticResult.error as any).retryable ?? false);
          }
          if (revCritErrCode === "REPORT_SAFETY_REJECTED") {
            return failAttempt("REPORT_SAFETY_REJECTED", false);
          }
          if (revCritErrCode === "AI_TIMEOUT" || (revCritErrCode === "AI_PROVIDER_REQUEST_FAILED" && revCriticResult.error.retryable)) {
            return failAttempt("AI_TIMEOUT", false);
          }
          return failAttempt("AI_OUTPUT_INVALID", false);
        }

        finalDraft = revisedDraft;
      } else {
        return failAttempt("REPORT_SAFETY_REJECTED", false);
      }
    }

    const htmlContent = renderIdentityReportHtml(finalDraft.report);

    const commitResult = await dependencies.versionRepository.commitImmutableVersion({
      reportId: payload.reportId,
      reportVersionId: payload.reportVersionId,
      entitlementId: payload.entitlementId,
      chartVersionId: payload.chartVersionId,
      evidenceVersionId: payload.evidenceVersionId,
      knowledgeVersionId: payload.knowledgeVersionId,
      promptVersion: payload.promptVersion,
      reportConfigVersion: payload.reportConfigVersion,
      templateVersion: CURRENT_REPORT_TEMPLATE_VERSION,
      renderVersion: CURRENT_REPORT_RENDER_VERSION,
      locale: payload.locale,
      sku: payload.sku,
      providerId: finalDraft.providerId,
      modelId: finalDraft.modelId,
      structuredContent: finalDraft.report,
      htmlContent,
      jobId,
      workerId,
      attemptNumber,
      traceId: job.traceId,
      supersedesReportVersionId: supersedesReportVersionId(payload),
    });

    if (!commitResult.ok) {
      return failAttempt("REPORT_VERSION_CONFLICT", false);
    }

    return { ok: true, value: commitResult.value };
  }

  return {
    replayExisting,
    generateReport: executeGeneration,
    generate: executeGeneration,
  };
}
