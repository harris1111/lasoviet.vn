import type { IdentityReportV1, ReportGenerateJobEnvelopeV1 } from "@lasoviet/contracts";
import type { AiProductionGate, AiProvider } from "../ai/ai-provider.js";
import {
  CURRENT_REPORT_RENDER_VERSION,
  CURRENT_REPORT_TEMPLATE_VERSION,
} from "./identity-report-config.js";
import { resolveIdentityReportVersionFamily } from "./identity-report-version-family.js";
import { renderIdentityReportHtml } from "./identity-report-html.js";
import { writeIdentityReportDraft } from "./identity-report-writer.js";
import { validateIdentityReport } from "./report-validator.js";
import { critiqueIdentityReport } from "./report-critic.js";
import type { ReportGenerationSourceRepository } from "./report-generation.repository.js";
import type { ImmutableReportVersionRecord, ReportVersionRepository } from "./report-version.repository.js";

export type ReportGenerationServiceErrorCode =
  | "AI_CAPABILITY_UNSUPPORTED"
  | "AI_TIMEOUT"
  | "AI_OUTPUT_INVALID"
  | "REPORT_EVIDENCE_INVALID"
  | "REPORT_SAFETY_REJECTED"
  | "REPORT_VERSION_CONFLICT";

export type ReportGenerationServiceError = {
  code: ReportGenerationServiceErrorCode;
  retryable: boolean;
};

export type ReportGenerationServiceResult =
  | { ok: true; value: ImmutableReportVersionRecord }
  | { ok: false; error: ReportGenerationServiceError };

export type GenerateReportInput = {
  job: ReportGenerateJobEnvelopeV1;
  attemptNumber: number;
  workerId: string;
  jobId?: string;
};

export type ReportGenerationServiceDependencies = {
  sourceRepository: ReportGenerationSourceRepository;
  versionRepository: ReportVersionRepository;
  gate: AiProductionGate;
  provider: AiProvider;
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
      });
    } catch {
      return failAttempt("AI_TIMEOUT", true);
    }

    if (!writerResult.ok) {
      const errCode = writerResult.error.code;
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
        { promptVersion: payload.promptVersion, knowledgeVersion: payload.knowledgeVersionId },
      );
    } catch {
      return failAttempt("AI_TIMEOUT", true);
    }

    let finalDraft = draft;

    if (!criticResult.ok) {
      const errCode = criticResult.error.code;
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
          });
        } catch {
          return failAttempt("AI_TIMEOUT", false);
        }

        if (!revisionResult.ok) {
          const revErrCode = revisionResult.error.code;
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
            { promptVersion: payload.promptVersion, knowledgeVersion: payload.knowledgeVersionId },
          );
        } catch {
          return failAttempt("AI_TIMEOUT", false);
        }

        if (!revCriticResult.ok) {
          const revCritErrCode = revCriticResult.error.code;
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
