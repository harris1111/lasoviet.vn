import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ZiweiEvidenceTab } from "./ziwei-evidence-tab";
import type { FreeIdentityPreviewV1, NormalizedZiweiChartV1 } from "@lasoviet/contracts";

// Mock next-intl
vi.mock("next-intl", () => {
  const viZiwei = require("../../../messages/vi/ziwei.json");
  return {
    useTranslations: () => (key: string) => {
      const parts = key.split(".");
      let curr: any = viZiwei;
      for (const p of parts) curr = curr?.[p];
      return typeof curr === "string" ? curr : key;
    },
  };
});

describe("Ziwei evidence mapping & fail-closed security", () => {
  const dummyChart = {} as NormalizedZiweiChartV1;

  it("maps each actual insight.evidence.evidenceId correctly regardless of array ordering", () => {
    // Reverse order: transformations first, then body-palace, then life-palace
    const previewReversed = {
      version: 1,
      chartId: "c1",
      chartVersionId: "cv1",
      capabilityId: "ziwei.identity.p0",
      summaryVersion: "ziwei.identity.free.v1",
      insights: [
        {
          id: "transformations",
          evidence: {
            evidenceId: "ziwei.identity.transformations",
            factReferences: [],
            confidence: "high",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Bound transformations"],
            limitations: [],
          },
        },
        {
          id: "life-palace",
          evidence: {
            evidenceId: "ziwei.identity.life-palace",
            factReferences: [],
            confidence: "high",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Bound life"],
            limitations: [],
          },
        },
      ],
      paidPreview: {
        sku: "ZIWEI-IDENTITY-P0",
        sectionId: "personal_summary",
        coveragePercent: 12,
        evidence: [],
      },
    };

    const html = renderToStaticMarkup(
      createElement(ZiweiEvidenceTab, {
        chart: dummyChart,
        chartId: "c1",
        locale: "vi",
        loadEvidence: vi.fn(),
        preview: previewReversed as unknown as FreeIdentityPreviewV1,
        onOpenEvidence: vi.fn(),
      }),
    );

    expect(html).toContain("Bound transformations");
    expect(html).toContain("Bound life");
  });

  it("fails closed and drops unknown/unauthorized evidence IDs", () => {
    const previewWithAttackerId = {
      version: 1,
      chartId: "c1",
      chartVersionId: "cv1",
      capabilityId: "ziwei.identity.p0",
      summaryVersion: "ziwei.identity.free.v1",
      insights: [
        {
          id: "life-palace",
          evidence: {
            evidenceId: "ziwei.identity.life-palace",
            factReferences: [],
            confidence: "high",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Bound life"],
            limitations: [],
          },
        },
        {
          id: "attacker-node",
          evidence: {
            evidenceId: "ziwei.unauthorized.admin.leak",
            factReferences: [],
            confidence: "high",
            interpretationBoundCodes: ["reflective_identity_only"],
            interpretationBounds: ["Injected text"],
            limitations: [],
          },
        },
      ],
      paidPreview: {
        sku: "ZIWEI-IDENTITY-P0",
        sectionId: "personal_summary",
        coveragePercent: 12,
        evidence: [],
      },
    };

    const html = renderToStaticMarkup(
      createElement(ZiweiEvidenceTab, {
        chart: dummyChart,
        chartId: "c1",
        locale: "vi",
        loadEvidence: vi.fn(),
        preview: previewWithAttackerId as unknown as FreeIdentityPreviewV1,
        onOpenEvidence: vi.fn(),
      }),
    );

    expect(html).toContain("Bound life");
    expect(html).not.toContain("ziwei.unauthorized.admin.leak");
    expect(html).not.toContain("Injected text");
  });
});
