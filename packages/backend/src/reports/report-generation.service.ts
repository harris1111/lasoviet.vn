import type { AiCostRequestContext, IdentityReportV1, ReportGenerateJobEnvelope } from "@lasoviet/contracts";
import type { AiProductionGate, AiProvider } from "../ai/ai-provider.js";
import {
  CURRENT_REPORT_RENDER_VERSION,
  CURRENT_REPORT_TEMPLATE_VERSION,
  REPORT_PROMPT_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_0_1,
  REPORT_TEMPLATE_VERSION_V3,
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
import { validateComprehensiveZiweiReportV4 } from "./comprehensive-report-validator-v4.js";
import { critiqueComprehensiveZiweiReportV4 } from "./comprehensive-report-critic-v4.js";
import type { ComprehensiveReportSourceV4 } from "./report-source.js";
import type { ComprehensiveReportSource } from "./report-source.js";
import type { ReportGenerationSourceRepository } from "./report-generation.repository.js";
import type { ImmutableReportVersionRecord, ReportVersionRepository } from "./report-version.repository.js";
import type { ReportSourceSnapshotPreparationService } from "./report-source-snapshot.service.js";

export type ReportGenerationServiceErrorCode =
  | "AI_CAPABILITY_UNSUPPORTED"
  | "AI_COST_RECORDING_FAILED"
  | "AI_TIMEOUT"
  | "AI_OUTPUT_INVALID"
  | "REPORT_EVIDENCE_INVALID"
  | "REPORT_SAFETY_REJECTED"
  | "REPORT_VERSION_CONFLICT"
  | "REPORT_SOURCE_SNAPSHOT_INVALID"
  | "REPORT_SOURCE_SNAPSHOT_CONFLICT"
  | "REPORT_SOURCE_SNAPSHOT_UNAVAILABLE";

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
};

export type ReportGenerationServiceDependencies = {
  sourceRepository: ReportGenerationSourceRepository;
  versionRepository: ReportVersionRepository;
  gate: AiProductionGate;
  provider: AiProvider;
  sourceSnapshotPreparer?: ReportSourceSnapshotPreparationService;
};

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
    });
    if (!sourceResult.ok) {
      return failAttempt("REPORT_EVIDENCE_INVALID", false);
    }
    const source = sourceResult.value;

    if (family === "v4") {
      if (!source.comprehensiveFactsV4 || !source.knowledgePacks) {
        return failAttempt("REPORT_EVIDENCE_INVALID", false);
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
        if (errCode === "AI_CAPABILITY_UNSUPPORTED" || errCode === "AI_PROVIDER_NOT_APPROVED") {
          return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
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
        try {
          criticResult = await critiqueComprehensiveZiweiReportV4(
            draft.report,
            source.comprehensiveFactsV4,
            dependencies.provider,
            { costContext: { ...baseCostContext, purpose: "critic" } },
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
          if (errCode === "AI_CAPABILITY_UNSUPPORTED" || errCode === "AI_PROVIDER_NOT_APPROVED") {
            return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
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
        try {
          revisionResult = await writeComprehensiveZiweiReportV4(
            {
              facts: source.comprehensiveFactsV4,
              knowledgePacks: source.knowledgePacks,
              provider: dependencies.provider,
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
          if (revErrCode === "AI_CAPABILITY_UNSUPPORTED" || revErrCode === "AI_PROVIDER_NOT_APPROVED") {
            return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
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
        try {
          revCriticResult = await critiqueComprehensiveZiweiReportV4(
            draft.report,
            source.comprehensiveFactsV4,
            dependencies.provider,
            { costContext: { ...baseCostContext, purpose: "critic" } },
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
          if (revCritErrCode === "AI_CAPABILITY_UNSUPPORTED" || revCritErrCode === "AI_PROVIDER_NOT_APPROVED") {
            return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
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
        if (errCode === "AI_CAPABILITY_UNSUPPORTED" || errCode === "AI_PROVIDER_NOT_APPROVED") {
          return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
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
      });

      if (!commitResult.ok) {
        return failAttempt("REPORT_VERSION_CONFLICT", false);
      }

      return { ok: true, value: commitResult.value };
    }

    let writerResult: Awaited<ReturnType<typeof writeIdentityReportDraft>>;
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
      if (errCode === "AI_CAPABILITY_UNSUPPORTED" || errCode === "AI_PROVIDER_NOT_APPROVED") {
        return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
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
      if (errCode === "AI_CAPABILITY_UNSUPPORTED" || errCode === "AI_PROVIDER_NOT_APPROVED") {
        return failAttempt("AI_CAPABILITY_UNSUPPORTED", false);
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
