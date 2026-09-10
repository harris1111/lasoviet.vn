import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FreeIdentityPreviewV1 } from "@lasoviet/contracts";

let mockLocale = "vi";
vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  const enMessages = (await import("../../../messages/en/reports.json")).default;
  return {
    useTranslations: () => {
      return (key: string, values?: Record<string, unknown>) => {
        const messages = mockLocale === "en" ? enMessages : viMessages;
        let val: unknown = messages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        if (typeof val === "string") {
          if (values) {
            return Object.entries(values).reduce(
              (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
              val,
            );
          }
          return val;
        }
        return key;
      };
    },
  };
});

import { FreeIdentityPreview } from "./free-identity-preview";

const mockEvidence = {
  evidenceId: "ziwei.identity.soul",
  factReferences: ["fact.soul"],
  confidence: "high" as const,
  interpretationBoundCodes: ["reflective_identity_only" as const],
  interpretationBounds: ["identity-only"],
  limitations: ["birth-time-dependent"],
};

const mockPreview: FreeIdentityPreviewV1 = {
  version: 1,
  chartId: "chart-123",
  chartVersionId: "chart-version-1",
  capabilityId: "ziwei.identity.p0",
  summaryVersion: "ziwei.identity.free.v1",
  insights: [
    {
      id: "soul",
      evidence: mockEvidence,
    },
    {
      id: "body",
      evidence: { ...mockEvidence, evidenceId: "ziwei.identity.body" },
    },
    {
      id: "configuration",
      evidence: { ...mockEvidence, evidenceId: "ziwei.identity.configuration" },
    },
  ],
  strengthSignal: {
    id: "soul-strength",
    evidence: mockEvidence,
  },
  tensionSignal: {
    id: "body-configuration-tension",
    evidence: [{ ...mockEvidence, evidenceId: "ziwei.identity.body" }],
  },
  paidPreview: {
    sku: "ZIWEI-IDENTITY-P0",
    sectionId: "personal_summary",
    coveragePercent: 12,
    evidence: [mockEvidence],
  },
};

describe("FreeIdentityPreview paid upgrade presentation boundary", () => {
  it("renders free insights and paid coverage box by default", () => {
    mockLocale = "vi";
    const html = renderToStaticMarkup(
      createElement(FreeIdentityPreview, {
        chartId: "chart-123",
        locale: "vi",
        loadEvidence: vi.fn(),
        preview: mockPreview,
      }),
    );

    // Free insights retained
    expect(html).toContain("identity-preview");
    expect(html).toContain("identity-insights");
    expect(html).toContain("identity-insight-card");
    expect(html).toContain("01");
    expect(html).toContain("02");
    expect(html).toContain("03");

    // Paid coverage message rendered by default
    expect(html).toContain("identity-coverage-box");
    expect(html).toContain("identity-coverage");
  });

  it("renders free insights and paid coverage box when paidUpgradeEligible is explicitly true", () => {
    mockLocale = "vi";
    const html = renderToStaticMarkup(
      createElement(FreeIdentityPreview, {
        chartId: "chart-123",
        locale: "vi",
        loadEvidence: vi.fn(),
        preview: mockPreview,
        paidUpgradeEligible: true,
      }),
    );

    expect(html).toContain("identity-insight-card");
    expect(html).toContain("identity-coverage-box");
    expect(html).toContain("identity-coverage");
  });

  it("retains free insights but omits paid coverage completely when paidUpgradeEligible is false (WP-11 Test 5)", () => {
    mockLocale = "vi";
    const html = renderToStaticMarkup(
      createElement(FreeIdentityPreview, {
        chartId: "chart-123",
        locale: "vi",
        loadEvidence: vi.fn(),
        preview: mockPreview,
        paidUpgradeEligible: false,
      }),
    );

    // Free insights are retained
    expect(html).toContain("identity-preview");
    expect(html).toContain("identity-insights");
    expect(html).toContain("identity-insight-card");
    expect(html).toContain("01");
    expect(html).toContain("02");
    expect(html).toContain("03");

    // Paid coverage / upgrade box is completely omitted
    expect(html).not.toContain("identity-coverage-box");
    expect(html).not.toContain("identity-coverage");
  });

  it("retains free insights and omits paid coverage for English locale when paidUpgradeEligible is false", () => {
    mockLocale = "en";
    try {
      const html = renderToStaticMarkup(
        createElement(FreeIdentityPreview, {
          chartId: "chart-123",
          locale: "en",
          loadEvidence: vi.fn(),
          preview: mockPreview,
          paidUpgradeEligible: false,
        }),
      );

      expect(html).toContain("identity-preview");
      expect(html).toContain("identity-insight-card");
      expect(html).not.toContain("identity-coverage-box");
      expect(html).not.toContain("identity-coverage");
    } finally {
      mockLocale = "vi";
    }
  });
});
