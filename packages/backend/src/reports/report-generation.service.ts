import type { IdentityReportV1, ReportGenerateJobEnvelopeV1 } from "@lasoviet/contracts";
import type { AiProductionGate, AiProvider } from "../ai/ai-provider.js";
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

    const sourceResult = await dependencies.sourceRepository.loadSource({
      reportVersionId: payload.reportVersionId,
      chartVersionId: payload.chartVersionId,
      evidenceVersionId: payload.evidenceVersionId,
      knowledgeVersionId: payload.knowledgeVersionId,
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
          templateVersion: "identity-report-html.v1",
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

    const validationResult = validateIdentityReport(draft.report, source);
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
      criticResult = await critiqueIdentityReport(draft.report, source, dependencies.provider);
    } catch {
      return failAttempt("AI_TIMEOUT", true);
    }
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
      if (errCode === "AI_OUTPUT_INVALID") {
        return failAttempt("AI_OUTPUT_INVALID", false);
      }
      if (errCode === "REPORT_EVIDENCE_INVALID" || errCode === "REPORT_LANGUAGE_INVALID") {
        return failAttempt("REPORT_EVIDENCE_INVALID", false);
      }
      return failAttempt("REPORT_SAFETY_REJECTED", false);
    }

    const htmlContent = renderIdentityReportHtml(draft.report);

    const commitResult = await dependencies.versionRepository.commitImmutableVersion({
      reportId: payload.reportId,
      reportVersionId: payload.reportVersionId,
      entitlementId: payload.entitlementId,
      chartVersionId: payload.chartVersionId,
      evidenceVersionId: payload.evidenceVersionId,
      knowledgeVersionId: payload.knowledgeVersionId,
      promptVersion: payload.promptVersion,
      reportConfigVersion: payload.reportConfigVersion,
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: payload.locale,
      sku: payload.sku,
      providerId: draft.providerId,
      modelId: draft.modelId,
      structuredContent: draft.report,
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
