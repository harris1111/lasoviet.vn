import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER } from "@lasoviet/contracts";

import { PrivateApiClientError } from "../../api/private-api-client";
import { VerifiedAccountResolutionError } from "../../auth/resolve-current-actor";
import { createReportLoader } from "./load-report";

const mockActor = {
  kind: "account" as const,
  userId: "user-1",
  sessionId: "session-1",
  requestId: "req-1",
};

const sampleSections = [
  "personal_summary",
  "data_and_method",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "cycles_and_timing",
  "within_control",
  "reflection_questions",
  "action_summary",
  "limitations_and_disclaimer",
].map((id, index) => ({
  id: id as (typeof import("@lasoviet/contracts").IDENTITY_REPORT_SECTION_IDS)[number],
  title: `Mục ${index + 1}`,
  narrative: `Nội dung mục ${index + 1}`,
  claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
    ? []
    : [{
      id: `claim-${index + 1}`,
      text: `Nhận định ${index + 1}`,
      evidenceIds: ["ziwei.identity.life-palace"],
      interpretationBoundCode: "reflective_identity_only" as const,
      confidence: "moderate" as const,
      limitations: ["Phụ thuộc vào giờ sinh."],
      suggestedActions: [{
        category: "reflect" as const,
        text: "Quan sát bản thân.",
      }],
    }],
}));

const sampleEvidence = [
  {
    id: "ziwei.identity.life-palace",
    factReferences: ["soulPalaceId"],
    confidence: "high" as const,
    interpretationBounds: ["Giới hạn diễn giải"],
    interpretationBoundCodes: ["reflective_identity_only" as const],
    limitations: ["TIME_BRANCH_ONLY"],
    riskTags: ["identity" as const],
    allowedActionCategories: ["reflect" as const],
  },
];

const validPendingView = {
  version: 1 as const,
  state: "pending" as const,
  reportId: "rep-1",
  reportVersionId: "rep-ver-1",
  locale: "vi" as const,
  sku: "ZIWEI-IDENTITY-P0" as const,
  fulfillmentStatus: "generating" as const,
  refreshAfterMs: 5000 as const,
};

const validReadyView = {
  version: 1 as const,
  state: "ready" as const,
  contentVersion: "identity.v1" as const,
  reportId: "rep-2",
  reportVersionId: "rep-ver-2",
  locale: "vi" as const,
  sku: "ZIWEI-IDENTITY-P0" as const,
  fulfillmentStatus: "complete" as const,
  content: {
    sections: sampleSections,
    reflectionQuestions: ["Câu hỏi 1", "Câu hỏi 2", "Câu hỏi 3"],
    summaryActions: ["Hành động 1"],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  },
  evidence: sampleEvidence,
  lineage: {
    supersedesReportVersionId: null,
  },
  provenance: {
    method: "ziwei" as const,
    ruleVersion: "1.0",
    evidenceVersion: 1,
    knowledgeVersion: "1.0",
    templateVersion: "identity-report-html.v1",
    createdAt: "2026-09-05T00:00:00.000+07:00",
  },
};


const validComprehensiveReadyView = {
  version: 1 as const,
  state: "ready" as const,
  contentVersion: "ziwei-comprehensive.v1" as const,
  reportId: "rep-v3-1",
  reportVersionId: "rep-ver-v3-1",
  locale: "vi" as const,
  sku: "ZIWEI-IDENTITY-P0" as const,
  fulfillmentStatus: "complete" as const,
  content: {
    overview: {
      title: "Tổng quan bản mệnh",
      narrative: "Nội dung tổng quan bản mệnh",
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Nội dung Mệnh Thân",
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Phủ Đồng Cung",
        narrative: "Nội dung cách cục",
      },
    ],
    palaceReadings: [
      "ziwei.palace.life",
      "ziwei.palace.siblings",
      "ziwei.palace.spouse",
      "ziwei.palace.children",
      "ziwei.palace.wealth",
      "ziwei.palace.health",
      "ziwei.palace.travel",
      "ziwei.palace.friends",
      "ziwei.palace.career",
      "ziwei.palace.property",
      "ziwei.palace.fortune",
      "ziwei.palace.parents",
    ].map((palaceId) => ({
      palaceId: palaceId as (typeof import("@lasoviet/contracts").ZIWEI_PALACE_IDS)[number],
      title: `Cung ${palaceId}`,
      narrative: `Nội dung ${palaceId}`,
    })),
    thematicSynthesis: [
      "career_wealth",
      "relationships_family",
      "social_environment",
      "wellbeing_inner_resources",
    ].map((id) => ({
      id: id as (typeof import("@lasoviet/contracts").ZIWEI_THEMATIC_SYNTHESIS_IDS)[number],
      title: `Chuyên đề ${id}`,
      narrative: `Nội dung chuyên đề ${id}`,
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng",
      narrative: "Nội dung thế mạnh và mâu thuẫn",
    },
    practicalDirection: ["Hành động định hướng thực tế 1"],
  },
  lineage: {
    supersedesReportVersionId: null,
  },
};

const validFailedView = {
  version: 1 as const,
  state: "failed" as const,
  reportId: "rep-3",
  reportVersionId: "rep-ver-3",
  locale: "vi" as const,
  sku: "ZIWEI-IDENTITY-P0" as const,
  fulfillmentStatus: "terminal_failure" as const,
};

describe("createReportLoader", () => {
  it("maps VerifiedAccountResolutionError to REPORT_AUTH_REQUIRED", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockRejectedValue(
      new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"),
    );
    const privateApiClient = vi.fn();
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    const result = await loader.loadReport("rep-1");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_AUTH_REQUIRED",
        messageKey: "reports.auth_required",
        retryable: false,
      },
    });
    expect(privateApiClient).not.toHaveBeenCalled();
  });

  it("propagates unexpected actor resolution errors", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockRejectedValue(new Error("Database disconnected"));
    const privateApiClient = vi.fn();
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    await expect(loader.loadReport("rep-1")).rejects.toThrow("Database disconnected");
  });

  it("loads report through privateApiClient for verified account actor", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: validPendingView,
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    const result = await loader.loadReport("rep-test/1");
    expect(privateApiClient).toHaveBeenCalledWith(mockActor, mockActor.requestId);
    expect(request).toHaveBeenCalledWith("/reports/rep-test%2F1");
    expect(result).toEqual({
      ok: true,
      value: validPendingView,
    });
  });

  it("handles outward REPORT_NOT_FOUND in response envelope", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const request = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        code: "REPORT_NOT_FOUND",
        messageKey: "reports.report_not_found",
        retryable: false,
      },
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    const result = await loader.loadReport("rep-missing");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_NOT_FOUND",
        messageKey: "reports.report_not_found",
        retryable: false,
      },
    });
  });

  it("handles PrivateApiClientError with code REPORT_NOT_FOUND", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const request = vi.fn().mockRejectedValue(
      new PrivateApiClientError("REPORT_NOT_FOUND", 404),
    );
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    const result = await loader.loadReport("rep-missing");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_NOT_FOUND",
        messageKey: "reports.report_not_found",
        retryable: false,
      },
    });
  });

  it("loads ready report view and validates contract", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: validReadyView,
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    const result = await loader.loadReport("rep-ready");
    expect(result).toEqual({
      ok: true,
      value: validReadyView,
    });
  });

  it("loads failed report view and validates contract", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: validFailedView,
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    const result = await loader.loadReport("rep-failed");
    expect(result).toEqual({
      ok: true,
      value: validFailedView,
    });
  });

  it("throws PrivateApiClientError(PRIVATE_API_RESPONSE_INVALID) when payload fails schema validation", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        ...validReadyView,
        extraSecretField: "leaked_secret",
      },
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    await expect(loader.loadReport("rep-invalid")).rejects.toThrow(
      new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID"),
    );
  });

  it("throws PrivateApiClientError(PRIVATE_API_RESPONSE_INVALID) on unknown error code", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const request = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        code: "UNKNOWN_INTERNAL_ERROR",
        messageKey: "some.key",
        retryable: false,
      },
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    await expect(loader.loadReport("rep-unknown-err")).rejects.toThrow(
      new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID"),
    );
  });
  it("loads comprehensive ready report view (V3) and validates contract", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: validComprehensiveReadyView,
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    const result = await loader.loadReport("rep-v3");
    expect(result).toEqual({
      ok: true,
      value: validComprehensiveReadyView,
    });
  });

  it("throws PrivateApiClientError(PRIVATE_API_RESPONSE_INVALID) when V3 payload is malformed", async () => {
    const resolveVerifiedAccountActor = vi.fn().mockResolvedValue(mockActor);
    const malformedV3 = {
      ...validComprehensiveReadyView,
      content: {
        ...validComprehensiveReadyView.content,
        palaceReadings: validComprehensiveReadyView.content.palaceReadings.slice(0, 5), // missing 7 palaces
      },
    };
    const request = vi.fn().mockResolvedValue({
      ok: true,
      value: malformedV3,
    });
    const privateApiClient = vi.fn().mockReturnValue({ request });
    const loader = createReportLoader({ resolveVerifiedAccountActor, privateApiClient });

    await expect(loader.loadReport("rep-malformed-v3")).rejects.toThrow(
      new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID"),
    );
  });
});
