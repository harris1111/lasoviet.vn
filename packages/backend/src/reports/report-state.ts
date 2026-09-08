import {
  ReportGenerateJobEnvelopeV1Schema,
  type ReportGenerateJobEnvelopeV1,
  type ReportStatus,
} from "@lasoviet/contracts";

export type ParseReportGenerateJobResult =
  | { ok: true; value: ReportGenerateJobEnvelopeV1 }
  | { ok: false; code: "JOB_PAYLOAD_INVALID" };

export function parseReportGenerateJob(input: unknown): ParseReportGenerateJobResult {
  const result = ReportGenerateJobEnvelopeV1Schema.safeParse(input);
  if (!result.success) {
    return { ok: false, code: "JOB_PAYLOAD_INVALID" };
  }
  return { ok: true, value: result.data };
}

export type ReportStateSnapshot = {
  id: string;
  status: ReportStatus;
  stateVersion: number;
  attemptCount: number;
  activeJobId: string | null;
  lastErrorCode: string | null;
};

export type TransitionReportToGeneratingResult =
  | {
      ok: true;
      value: {
        status: "generating";
        stateVersion: number;
        attemptCount: number;
        activeJobId: string;
        lastErrorCode: null;
      };
    }
  | { ok: false; code: "WORKFLOW_STATE_CONFLICT" };

export function transitionReportToGenerating(
  report: ReportStateSnapshot,
  jobId: string,
): TransitionReportToGeneratingResult {
  if (report.status === "requested") {
    return {
      ok: true,
      value: {
        status: "generating",
        stateVersion: report.stateVersion + 1,
        attemptCount: report.attemptCount + 1,
        activeJobId: jobId,
        lastErrorCode: null,
      },
    };
  }

  if (report.status === "generating" && report.activeJobId === jobId) {
    return {
      ok: true,
      value: {
        status: "generating",
        stateVersion: report.stateVersion,
        attemptCount: report.attemptCount,
        activeJobId: jobId,
        lastErrorCode: null,
      },
    };
  }

  return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
}

export function completeReportGeneratingHandoff(_params: {
  reportId: string;
  reportVersionId: string;
  jobId: string;
}): {
  reportStatus: "generating";
  queueJobStatus: "processed";
  invokedWriter: false;
} {
  return {
    reportStatus: "generating",
    queueJobStatus: "processed",
    invokedWriter: false,
  };
}
