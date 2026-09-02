import { describe, expect, it } from "vitest";

import {
  FreeIdentityPreviewV1Schema,
  PaidTopicSelectionRequestV1Schema,
  PaidTopicSelectionViewV1Schema,
} from "./free-identity-preview-v1.js";

const evidence = {
  evidenceId: "ziwei.identity.soul",
  factReferences: ["fact.soul"],
  confidence: "high",
  interpretationBounds: ["identity-only"],
  limitations: ["birth-time-dependent"],
};

describe("free identity preview contracts", () => {
  it("requires three unique evidence-backed insights and literal 12 percent coverage", () => {
    const result = FreeIdentityPreviewV1Schema.safeParse({
      version: 1,
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      capabilityId: "ziwei.identity.p0",
      summaryVersion: "ziwei.identity.free.v1",
      insights: [
        { id: "soul", evidence },
        { id: "body", evidence: { ...evidence, evidenceId: "ziwei.identity.body" } },
        { id: "configuration", evidence: { ...evidence, evidenceId: "ziwei.identity.configuration" } },
      ],
      strengthSignal: { id: "soul-strength", evidence },
      tensionSignal: {
        id: "body-configuration-tension",
        evidence: [
          { ...evidence, evidenceId: "ziwei.identity.body" },
          { ...evidence, evidenceId: "ziwei.identity.configuration" },
        ],
      },
      paidPreview: {
        sku: "ZIWEI-IDENTITY-P0",
        sectionId: "personal_summary",
        coveragePercent: 12,
        evidence: [evidence],
      },
    });

    expect(result.success).toBe(true);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      insights: [result.data?.insights[0], result.data?.insights[0], result.data?.insights[2]],
    }).success).toBe(false);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      paidPreview: { ...result.data?.paidPreview, coveragePercent: 15 },
    }).success).toBe(false);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      strengthSignal: {
        ...result.data?.strengthSignal,
        evidence: { ...evidence, evidenceId: "ziwei.identity.foreign" },
      },
    }).success).toBe(false);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      tensionSignal: {
        ...result.data?.tensionSignal,
        evidence: [
          { ...evidence, evidenceId: "ziwei.identity.body", factReferences: ["mismatched.fact"] },
          { ...evidence, evidenceId: "ziwei.identity.configuration" },
        ],
      },
    }).success).toBe(false);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      paidPreview: {
        ...result.data?.paidPreview,
        evidence: [{ ...evidence, evidenceId: "ziwei.identity.body", factReferences: ["mismatched.fact"] }],
      },
    }).success).toBe(false);
  });

  it("allows only the identity topic request and one catalog-backed VND offer", () => {
    expect(PaidTopicSelectionRequestV1Schema.safeParse({
      sku: "ZIWEI-IDENTITY-P0",
    }).success).toBe(true);
    expect(PaidTopicSelectionRequestV1Schema.safeParse({
      sku: "ZIWEI-RELATIONSHIP-P0",
    }).success).toBe(false);
    expect(PaidTopicSelectionViewV1Schema.safeParse({
      version: 1,
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      offers: [{
        sku: "ZIWEI-IDENTITY-P0",
        method: "ziwei",
        price: 79000,
        currency: "VND",
        sections: ["personal_summary"],
      }],
    }).success).toBe(true);
  });
});
