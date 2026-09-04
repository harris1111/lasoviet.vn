import { describe, expect, it } from "vitest";

import {
  completeReportGeneratingHandoff,
  parseReportGenerateJob,
  transitionReportToGenerating,
} from "./report-state.js";
import { resolveWorkerQueues } from "../jobs/queue.registry.js";

describe("report worker state and queue contracts", () => {
  const validPayload = {
    reportId: "00000000-0000-0000-0000-000000000001",
    reportVersionId: "00000000-0000-0000-0000-000000000002",
    entitlementId: "00000000-0000-0000-0000-000000000003",
    chartVersionId: "chart-v1",
    evidenceVersionId: "evidence-v1",
    knowledgeVersionId: "knowledge-v1",
    promptVersion: "prompt-v1",
    reportConfigVersion: "config-v1",
    locale: "vi" as const,
    sku: "ZIWEI-IDENTITY-P0",
  };

  const validJobEnvelope = {
    schemaVersion: 1 as const,
    name: "report.generate.v1" as const,
    sourceEventId: "evt-source-1",
    traceId: "trace-test-1",
    idempotencyKey: "report-generate:00000000-0000-0000-0000-000000000002",
    payload: validPayload,
  };

  it("strictly validates report.generate.v1 job envelopes and rejects invalid payloads", () => {
    const validResult = parseReportGenerateJob(validJobEnvelope);
    expect(validResult).toEqual({
      ok: true,
      value: validJobEnvelope,
    });

    const invalidLocaleResult = parseReportGenerateJob({
      ...validJobEnvelope,
      payload: { ...validPayload, locale: "fr" },
    });
    expect(invalidLocaleResult).toEqual({
      ok: false,
      code: "JOB_PAYLOAD_INVALID",
    });

    const invalidSchemaVersion = parseReportGenerateJob({
      ...validJobEnvelope,
      schemaVersion: 2,
    });
    expect(invalidSchemaVersion).toEqual({
      ok: false,
      code: "JOB_PAYLOAD_INVALID",
    });

    const invalidName = parseReportGenerateJob({
      ...validJobEnvelope,
      name: "report.generate.v2",
    });
    expect(invalidName).toEqual({
      ok: false,
      code: "JOB_PAYLOAD_INVALID",
    });
  });

  it("resolves WORKER_QUEUES with default, accept, and fail-closed validation", () => {
    expect(resolveWorkerQueues(undefined)).toEqual({
      ok: true,
      value: ["report.generate"],
    });
    expect(resolveWorkerQueues("report.generate")).toEqual({
      ok: true,
      value: ["report.generate"],
    });
    expect(resolveWorkerQueues("")).toEqual({
      ok: false,
      code: "WORKER_QUEUES_INVALID",
    });
    expect(resolveWorkerQueues("   ")).toEqual({
      ok: false,
      code: "WORKER_QUEUES_INVALID",
    });
    expect(resolveWorkerQueues("unknown.queue")).toEqual({
      ok: false,
      code: "WORKER_QUEUES_INVALID",
    });
    expect(resolveWorkerQueues("report.generate,unknown.queue")).toEqual({
      ok: false,
      code: "WORKER_QUEUES_INVALID",
    });
  });

  it("transitions requested report to generating, increments stateVersion and attemptCount, and binds activeJobId", () => {
    const currentReport = {
      id: "00000000-0000-0000-0000-000000000001",
      status: "requested" as const,
      stateVersion: 1,
      attemptCount: 0,
      activeJobId: null as string | null,
      lastErrorCode: null as string | null,
    };

    const result = transitionReportToGenerating(currentReport, "job-active-1");
    expect(result).toEqual({
      ok: true,
      value: {
        status: "generating",
        stateVersion: 2,
        attemptCount: 1,
        activeJobId: "job-active-1",
        lastErrorCode: null,
      },
    });
  });

  it("resumes an active job crash idempotently without incrementing report attemptCount", () => {
    const crashedGeneratingReport = {
      id: "00000000-0000-0000-0000-000000000001",
      status: "generating" as const,
      stateVersion: 2,
      attemptCount: 1,
      activeJobId: "job-active-1",
      lastErrorCode: null as string | null,
    };

    const result = transitionReportToGenerating(crashedGeneratingReport, "job-active-1");
    expect(result).toEqual({
      ok: true,
      value: {
        status: "generating",
        stateVersion: 2,
        attemptCount: 1,
        activeJobId: "job-active-1",
        lastErrorCode: null,
      },
    });
  });

  it("returns WORKFLOW_STATE_CONFLICT on invalid prior status or mismatched active job", () => {
    const completeReport = {
      id: "00000000-0000-0000-0000-000000000001",
      status: "complete" as const,
      stateVersion: 3,
      attemptCount: 1,
      activeJobId: "job-previous",
      lastErrorCode: null as string | null,
    };
    expect(transitionReportToGenerating(completeReport, "job-new")).toEqual({
      ok: false,
      code: "WORKFLOW_STATE_CONFLICT",
    });

    const generatingDifferentJob = {
      id: "00000000-0000-0000-0000-000000000001",
      status: "generating" as const,
      stateVersion: 2,
      attemptCount: 1,
      activeJobId: "job-active-1",
      lastErrorCode: null as string | null,
    };
    expect(transitionReportToGenerating(generatingDifferentJob, "job-conflicting-2")).toEqual({
      ok: false,
      code: "WORKFLOW_STATE_CONFLICT",
    });
  });

  it("completes processing handoff by keeping report generating and marking job processed without calling report writer", () => {
    const handoff = completeReportGeneratingHandoff({
      reportId: "00000000-0000-0000-0000-000000000001",
      reportVersionId: "00000000-0000-0000-0000-000000000002",
      jobId: "job-active-1",
    });

    expect(handoff).toEqual({
      reportStatus: "generating",
      queueJobStatus: "processed",
      invokedWriter: false,
    });
  });
});
