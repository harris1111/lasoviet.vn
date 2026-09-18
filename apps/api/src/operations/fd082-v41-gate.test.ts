import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
} from "@lasoviet/backend";

import {
  parseFd082GateArguments,
  fd082AuditTargetMatchesWalletId,
  passesFd082Evidence,
  runFd082GateSequence,
  type Fd082Evidence,
} from "./fd082-v41-gate.js";

function exactEvidence(): Fd082Evidence {
  return {
    reservation: {
      reportVersionId: "report-version-1",
      status: "complete",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V4,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    },
    checkpoints: COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.map((sectionKey) => ({
      sectionKey,
      status: "passed",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V4,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
      qualityConfigVersion: REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
      providerId: "9router-an",
      modelId: "claude-sonnet-4-6",
    })),
    immutable: {
      providerId: "9router-an",
      modelId: "claude-sonnet-4-6",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V4,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
      contentHash: "a".repeat(64),
    },
    asset: {
      status: "stored",
      renderVersion: "identity-report-pdf.v2",
      objectKey: "reports/report-version-1.pdf",
      sha256: "b".repeat(64),
      byteLength: 1,
      storedAt: new Date(),
    },
    spend: { id: "spend-1", receiptId: "receipt-1", auditId: "audit-1", ledgerAmount: -960, restored: false },
    ai: [{
      providerId: "9router-an",
      requestedModelId: "ag/claude-sonnet-4-6",
      responseModelId: "claude-sonnet-4-6",
      errorCode: null,
    }],
  };
}

describe("FD-082 V4.1 gate", () => {
  it("strictly parses bounded private CLI arguments", () => {
    expect(parseFd082GateArguments([
      "--owner-id=owner-1",
      "--campaign-id=campaign-1",
      "--runs=20",
      "--poll-ms=1000",
      "--timeout-ms=60000",
    ])).toMatchObject({ ownerId: "owner-1", campaignId: "campaign-1", runs: 20 });
    expect(() => parseFd082GateArguments(["--owner-id=owner-1", "--campaign-id=x", "--runs=21"])).toThrow("FD082_GATE_INVALID_INPUT");
  });

  it("accepts only the exact V4.1 evidence tuple", () => {
    expect(passesFd082Evidence(exactEvidence())).toBe(true);
    const oldTuple = exactEvidence();
    oldTuple.reservation!.reportConfigVersion = REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY;
    oldTuple.checkpoints = oldTuple.checkpoints.map((checkpoint) => ({
      ...checkpoint,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
    }));
    oldTuple.immutable!.reportConfigVersion = REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY;
    expect(passesFd082Evidence(oldTuple)).toBe(false);
  });

  it("constructs the wallet audit predicate with an explicit UUID-to-text cast", () => {
    const compiled = new PgDialect().sqlToQuery(fd082AuditTargetMatchesWalletId());
    expect(compiled.sql).toContain('"audit_logs"."target_id" = "wallet_transactions"."wallet_id"::text');
  });

  it.each([
    "missing",
    "extra",
    "wrong-model",
    "tuple",
    "immutable",
    "asset",
    "spend",
    "aggregate-spend",
    "restoration",
    "gemini",
    "failed-model",
  ])("rejects invalid evidence: %s", (variant) => {
    const evidence = exactEvidence();
    if (variant === "missing") evidence.checkpoints = evidence.checkpoints.slice(1);
    if (variant === "extra") evidence.checkpoints = [...evidence.checkpoints, evidence.checkpoints[0]!];
    if (variant === "wrong-model") evidence.checkpoints[0]!.modelId = "other";
    if (variant === "tuple") evidence.reservation!.promptVersion = "other";
    if (variant === "immutable") evidence.immutable = null;
    if (variant === "asset") evidence.asset = null;
    if (variant === "spend") evidence.spend = null;
    if (variant === "aggregate-spend") evidence.spend!.ledgerAmount = -959;
    if (variant === "restoration") evidence.spend!.restored = true;
    if (variant === "gemini") evidence.ai[0]!.responseModelId = "gemini";
    if (variant === "failed-model") {
      evidence.ai = [{
        providerId: "other-provider",
        requestedModelId: "other-model",
        responseModelId: null,
        errorCode: "AI_TIMEOUT",
      }];
    }
    expect(passesFd082Evidence(evidence)).toBe(false);
  });

  it("resumes an existing report without duplicate unlock and emits bounded campaign events", async () => {
    const createAndUnlock = vi.fn();
    const logs: Record<string, unknown>[] = [];
    await runFd082GateSequence(
      { ownerId: "owner", campaignId: "campaign", runs: 1, pollMs: 1_000, timeoutMs: 60_000 },
      {
        findReportVersion: vi.fn().mockResolvedValue("report-version-1"),
        createAndUnlock,
        readEvidence: vi.fn().mockResolvedValue(exactEvidence()),
        wait: vi.fn(),
        restore: vi.fn(),
      },
      (line) => logs.push(line),
    );
    expect(createAndUnlock).not.toHaveBeenCalled();
    expect(logs).toEqual([
      { status: "started", campaignId: "campaign" },
      { run: 1, status: "passed", reportVersionId: "report-version-1" },
      { status: "completed", campaignId: "campaign" },
    ]);
  });

  it("restores a terminal evidence failure once through the stable run port", async () => {
    const restore = vi.fn();
    const invalid = exactEvidence();
    invalid.asset = null;
    await expect(runFd082GateSequence(
      { ownerId: "owner", campaignId: "campaign", runs: 1, pollMs: 1_000, timeoutMs: 60_000 },
      {
        findReportVersion: vi.fn().mockResolvedValue(null),
        createAndUnlock: vi.fn().mockResolvedValue("report-version-1"),
        readEvidence: vi.fn().mockResolvedValue(invalid),
        wait: vi.fn(),
        restore,
      },
      vi.fn(),
    )).rejects.toThrow("FD082_GATE_EVIDENCE_FAILED");
    expect(restore).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledWith(
      1,
      "report-version-1",
      "fd082.v41.campaign.run.1.restore.v1",
    );
  });

  it("does not restore a requested or generating report when polling times out", async () => {
    const restore = vi.fn();
    const pending = exactEvidence();
    pending.reservation = { ...pending.reservation!, status: "generating" };
    await expect(runFd082GateSequence(
      { ownerId: "owner", campaignId: "campaign", runs: 1, pollMs: 1_000, timeoutMs: 0 },
      {
        findReportVersion: vi.fn().mockResolvedValue("report-version-1"),
        createAndUnlock: vi.fn(),
        readEvidence: vi.fn().mockResolvedValue(pending),
        wait: vi.fn(),
        restore,
      },
      vi.fn(),
    )).rejects.toThrow("FD082_GATE_TIMEOUT");
    expect(restore).not.toHaveBeenCalled();
  });

  it("waits for pdf_pending storage completion before evaluating or restoring evidence", async () => {
    const restore = vi.fn();
    const wait = vi.fn();
    const pending = exactEvidence();
    pending.reservation = { ...pending.reservation!, status: "pdf_pending" };
    await runFd082GateSequence(
      { ownerId: "owner", campaignId: "campaign", runs: 1, pollMs: 1_000, timeoutMs: 60_000 },
      {
        findReportVersion: vi.fn().mockResolvedValue("report-version-1"),
        createAndUnlock: vi.fn(),
        readEvidence: vi.fn()
          .mockResolvedValueOnce(pending)
          .mockResolvedValueOnce(exactEvidence()),
        wait,
        restore,
      },
      vi.fn(),
    );
    expect(wait).toHaveBeenCalledWith(1_000);
    expect(restore).not.toHaveBeenCalled();
  });
});
