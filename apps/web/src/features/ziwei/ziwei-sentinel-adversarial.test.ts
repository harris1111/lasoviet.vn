import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ZiweiResultTabs } from "./ziwei-result-tabs";
import type { FreeIdentityPreviewV1, NormalizedZiweiChartV1, ZiweiBirthSummaryV1 } from "@lasoviet/contracts";

// Mock next-intl
vi.mock("next-intl", () => {
  const viZiwei = require("../../../messages/vi/ziwei.json");
  const viReports = require("../../../messages/vi/reports.json");
  return {
    useTranslations: (ns: string) => {
      const msgs = ns === "reports" ? viReports : viZiwei;
      return (key: string) => {
        const parts = key.split(".");
        let curr: any = msgs;
        for (const p of parts) curr = curr?.[p];
        return typeof curr === "string" ? curr : key;
      };
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("Adversarial locked narrative sentinel non-leakage", () => {
  const SENTINEL = "SENTINEL_PAID_NARRATIVE_DO_NOT_LEAK_INTO_FREE_DOM_394857";

  const birthSummary: ZiweiBirthSummaryV1 = {
    displayName: "Minh An",
    gender: "male",
    normalizedCalendar: { kind: "solar", date: "1994-04-12" },
    normalizedTime: { precision: "exact_minute", localTime: "09:30" },
    timezoneProvenance: { source: "offset", offsetMinutes: 420 },
  };

  const chart = {
    version: 1,
    systemId: "ziwei",
    provenance: {
      ruleSetId: "test-rule-set",
      calculatedAt: "2026-09-22T00:00:00Z",
      engineVersion: "1.0.0",
    },
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: { canGenerateHoroscope: true },
    warnings: [],
    transformations: [],
    palaces: [
      {
        id: "ziwei.palace.life",
        earthlyBranchId: "ziwei.branch.tiger",
        stars: [],
      },
    ],
  } as unknown as NormalizedZiweiChartV1;

  it("proves an adversarial locked narrative payload injected into source boundary is absent from free tabs render", () => {
    // Adversarial mock where locked payload attempts to pass through preview or extra properties
    const adversarialPreview = {
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
            interpretationBounds: ["Authorized safe boundary"],
            limitations: [],
          },
        },
      ],
      paidPreview: {
        sku: "ZIWEI-IDENTITY-P0",
        sectionId: "personal_summary",
        coveragePercent: 12,
        evidence: [],
        // Injected secret locked report narrative
        secretLockedNarrative: SENTINEL,
      },
      // Injected malicious root property
      maliciousLockedProse: SENTINEL,
    } as unknown as FreeIdentityPreviewV1;

    // Render across topics tab
    const topicsHtml = renderToStaticMarkup(
      createElement(ZiweiResultTabs, {
        basePath: "/la-so/c1",
        birthSummary,
        chart,
        chartId: "c1",
        initialState: { tab: "topics" },
        locale: "vi",
        loadEvidence: vi.fn(),
        preview: adversarialPreview,
      }),
    );
    expect(topicsHtml).not.toContain(SENTINEL);

    // Render across evidence tab
    const evidenceHtml = renderToStaticMarkup(
      createElement(ZiweiResultTabs, {
        basePath: "/la-so/c1",
        birthSummary,
        chart,
        chartId: "c1",
        initialState: { tab: "evidence" },
        locale: "vi",
        loadEvidence: vi.fn(),
        preview: adversarialPreview,
      }),
    );
    expect(evidenceHtml).not.toContain(SENTINEL);
  });
});
