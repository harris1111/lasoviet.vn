import { describe, expect, it, vi } from "vitest";

import type { CurrentActor } from "@lasoviet/contracts";
import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IDENTITY_REPORT_SECTION_IDS,
} from "@lasoviet/contracts";
import {
  createReportQueryService,
  ReportQueryDataError,
  type ReportQueryRepository,
  type AuthorizedReportQueryRecord,
} from "./report-query.service.js";

const accountActor: CurrentActor = {
  kind: "account",
  userId: "owner-1",
  role: "authenticated",
  permissions: [],
};

const otherAccountActor: CurrentActor = {
  kind: "account",
  userId: "owner-2",
  role: "authenticated",
  permissions: [],
};

const anonymousActor: CurrentActor = {
  kind: "anonymous",
  anonymousActorId: "anon-1",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

function validSections() {
  return IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
    id,
    title: "Section " + (index + 1),
    narrative: "Narrative description for self reflection.",
    claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
      ? []
      : [{
          id: "claim-" + (index + 1),
          text: "Claim narrative.",
          evidenceIds: ["ziwei.identity.life-palace"],
          interpretationBoundCode: "reflective_identity_only" as const,
          confidence: "moderate" as const,
          limitations: ["Hours offset"],
          suggestedActions: [{
            category: "reflect" as const,
            text: "Observe your feelings.",
          }],
        }],
  }));
}

function validStructuredContent(overrides = {}) {
  return {
    version: 1 as const,
    sku: "ZIWEI-IDENTITY-P0" as const,
    capabilityId: "ziwei.identity.p0" as const,
    locale: "vi" as const,
    provenance: {
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: "knowledge.vi.v1",
      providerId: "open-router",
      modelId: "synthetic-model",
      promptVersion: "identity-report-prompt.v1",
      templateVersion: "identity-report-template.v1",
    },
    sections: validSections(),
    reflectionQuestions: [
      "Question 1?",
      "Question 2?",
      "Question 3?",
    ],
    summaryActions: ["Action 1"],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    ...overrides,
  };
}

function sampleEvidenceItems() {
  return [
    {
      id: "ev-row-1",
      evidenceSetId: "ev-set-1",
      evidenceKey: "ziwei.identity.life-palace",
      payload: {
        id: "ziwei.identity.life-palace",
        factReferences: ["life palace fact"],
        confidence: "high",
        interpretationBounds: ["Reflective bound"],
        interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Hours offset"],
        riskTags: ["identity"],
        allowedActionCategories: ["reflect"],
      },
      createdAt: new Date(),
    },
    {
      id: "ev-row-2",
      evidenceSetId: "ev-set-1",
      evidenceKey: "ziwei.identity.unreferenced",
      payload: {
        id: "ziwei.identity.unreferenced",
        factReferences: ["unreferenced fact"],
        confidence: "moderate",
        interpretationBounds: ["Bound"],
        interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Limit"],
        riskTags: ["identity"],
        allowedActionCategories: ["reflect"],
      },
      createdAt: new Date(),
    },
  ];
}

function createSampleRecord(overrides: Partial<AuthorizedReportQueryRecord> = {}): AuthorizedReportQueryRecord {
  const reservation = {
    id: "res-uuid-1",
    reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
    reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
    entitlementId: "ent-1",
    chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
    evidenceVersionId: "ev-set-1",
    knowledgeVersionId: "knowledge.vi.v1",
    promptVersion: "identity-report-prompt.v1",
    reportConfigVersion: "report-config.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "generating",
    stateVersion: 1,
    attemptCount: 1,
    activeJobId: "job-1",
    lastErrorCode: null,
    nextAttemptAt: null,
    createdAt: new Date("2026-09-05T00:00:00+07:00"),
    updatedAt: new Date("2026-09-05T00:00:00+07:00"),
    ...(overrides.reservation || {}),
  } as any;

  const version = overrides.version === undefined ? null : overrides.version;
  const evidenceItems = overrides.evidenceItems || [];

  return { reservation, version, evidenceItems };
}

describe("report query service", () => {
  it("returns REPORT_NOT_FOUND without calling repository for non-UUID reportId", async () => {
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn(),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "not-a-valid-uuid");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("REPORT_NOT_FOUND");
    expect(repository.readAuthorizedReport).not.toHaveBeenCalled();
  });

  it("throws ReportQueryDataError when reservation and version metadata disagree", async () => {
    const versionRecord = {
      id: "ver-uuid-1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-2", // mismatched entitlementId
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "identity-report-prompt.v1",
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent(),
      htmlContent: "<html></html>",
      contentHash: "a".repeat(64),
      pdfAssetId: "44444444-4444-4444-8444-444444444444",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: { entitlementId: "ent-1" } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(service.getReport(accountActor, "e2a22be2-2be2-4be2-8be2-2be22be22be2")).rejects.toThrow(ReportQueryDataError);
  });

  it("throws ReportQueryDataError when structured content provenance disagrees with stored version", async () => {
    const versionRecord = {
      id: "ver-uuid-1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "identity-report-prompt.v1",
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent({
        provenance: {
          chartVersionId: "chart-version-mismatch",
          ruleVersion: "ziwei.identity.v1",
          evidenceVersion: 1,
          knowledgeVersion: "knowledge.vi.v1",
          providerId: "open-router",
          modelId: "synthetic-model",
          promptVersion: "identity-report-prompt.v1",
          templateVersion: "identity-report-template.v1",
        },
      }),
      htmlContent: "<html></html>",
      contentHash: "a".repeat(64),
      pdfAssetId: "44444444-4444-4444-8444-444444444444",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: { chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67" } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(service.getReport(accountActor, "e2a22be2-2be2-4be2-8be2-2be22be22be2")).rejects.toThrow(ReportQueryDataError);
  });

  it("returns REPORT_NOT_FOUND for empty or malformed reportId", async () => {
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn(),
    };
    const service = createReportQueryService({ repository });

    const resultEmpty = await service.getReport(accountActor, "");
    expect(resultEmpty.ok).toBe(false);
    expect(resultEmpty.error?.code).toBe("REPORT_NOT_FOUND");
    expect(repository.readAuthorizedReport).not.toHaveBeenCalled();

    const resultWhitespace = await service.getReport(accountActor, "   ");
    expect(resultWhitespace.ok).toBe(false);
    expect(resultWhitespace.error?.code).toBe("REPORT_NOT_FOUND");
  });

  it("returns internal REPORT_FORBIDDEN for anonymous actor with no repository read", async () => {
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn(),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(anonymousActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("REPORT_FORBIDDEN");
    expect(repository.readAuthorizedReport).not.toHaveBeenCalled();
  });

  it("passes ownerId derived strictly from actor to repository", async () => {
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(null),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(repository.readAuthorizedReport).toHaveBeenCalledWith("owner-1", "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("REPORT_NOT_FOUND");
  });

  it("owner reads pending reservation", async () => {
    const record = createSampleRecord();
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      version: 1,
      state: "pending",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "generating",
      refreshAfterMs: 5000,
    });
  });

  it("owner reads ready immutable version with exact evidence and safe provenance", async () => {
    const versionRecord = {
      id: "ver-uuid-1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "identity-report-prompt.v1",
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent(),
      htmlContent: "<script>alert(1)</script>",
      contentHash: "a".repeat(64),
      pdfAssetId: "44444444-4444-4444-8444-444444444444",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: "55555555-5555-4555-8555-555555555555",
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: { status: "complete" } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.state).toBe("ready");
    if (result.value.state !== "ready") return;

    expect(result.value.fulfillmentStatus).toBe("complete");
    expect(result.value.lineage.supersedesReportVersionId).toBe("55555555-5555-4555-8555-555555555555");
    expect(result.value.evidence).toHaveLength(1);
    expect(result.value.evidence[0].id).toBe("ziwei.identity.life-palace");
    expect(result.value.provenance).toEqual({
      method: "ziwei",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: "knowledge.vi.v1",
      templateVersion: "identity-report-template.v1",
      createdAt: expect.any(String),
    });

    expect((result.value as any).htmlContent).toBeUndefined();
    expect((result.value as any).providerId).toBeUndefined();
    expect((result.value as any).modelId).toBeUndefined();
  });

  it("owner reads terminal generation failure without internal error detail", async () => {
    const record = createSampleRecord({
      reservation: {
        status: "terminal_failure",
        lastErrorCode: "CRITICAL_SYSTEM_FAILURE_SECRET_INFO",
      } as any,
    });
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      version: 1,
      state: "failed",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "terminal_failure",
    });
    expect((result.value as any).lastErrorCode).toBeUndefined();
  });

  it("fails closed on locale, SKU, or evidence mismatch by throwing ReportQueryDataError", async () => {
    const versionRecord = {
      id: "ver-uuid-1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "identity-report-prompt.v1",
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent({ locale: "en", professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN }),
      htmlContent: "<html></html>",
      contentHash: "a".repeat(64),
      pdfAssetId: "44444444-4444-4444-8444-444444444444",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: { locale: "vi" } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553")).rejects.toThrow(ReportQueryDataError);
  });
});
