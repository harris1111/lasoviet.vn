import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { projectFreeIdentityPreview } from "./ziwei-free-preview-projection";
import type { FreeIdentityPreviewV1 } from "@lasoviet/contracts";

const EXACT_SENTINEL = "SENTINEL_PAID_NARRATIVE_DO_NOT_LEAK_INTO_FREE_DOM_394857";

const rawAdversarialPreview = {
  version: 1,
  chartId: "c1",
  chartVersionId: "cv1",
  capabilityId: "ziwei.identity.p0",
  summaryVersion: "ziwei.identity.free.v1",
  strengthSignal: {
    id: "strength",
    evidence: {
      evidenceId: "ziwei.identity.strength",
      factReferences: ["f1"],
      confidence: "high" as const,
      interpretationBoundCodes: ["reflective_identity_only" as const],
      interpretationBounds: ["Bound"],
      limitations: ["Limit"],
      leakSignal: EXACT_SENTINEL,
    },
  },
  tensionSignal: {
    id: "tension",
    evidence: [
      {
        evidenceId: "ziwei.identity.tension-1",
        factReferences: ["f1"],
        confidence: "high" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Bound"],
        limitations: ["Limit"],
        leakSignal: EXACT_SENTINEL,
      },
      {
        evidenceId: "ziwei.identity.tension-2",
        factReferences: ["f2"],
        confidence: "high" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Bound"],
        limitations: ["Limit"],
        leakSignal: EXACT_SENTINEL,
      },
    ],
  },
  insights: [
    {
      id: "life-palace",
      evidence: {
        evidenceId: "ziwei.identity.life-palace",
        factReferences: ["fact-1"],
        confidence: "high" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Authorized safe boundary"],
        limitations: ["Standard limitations"],
        lockedEvidenceNarrative: EXACT_SENTINEL,
        leak1: EXACT_SENTINEL,
      },
      insightNarrative: EXACT_SENTINEL,
    },
  ],
  paidPreview: {
    sku: "ZIWEI-IDENTITY-P0" as const,
    sectionId: "personal_summary" as const,
    coveragePercent: 12,
    evidence: [
      {
        evidenceId: "ev-paid",
        factReferences: [],
        confidence: "high" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: [],
        limitations: [],
        paidSecret: EXACT_SENTINEL,
      },
    ],
    secretLockedNarrative: EXACT_SENTINEL,
    fullLockedReport: {
      narrative: EXACT_SENTINEL,
    },
  },
  maliciousLockedProse: EXACT_SENTINEL,
  unauthorizedReportBody: {
    career: EXACT_SENTINEL,
    wealth: EXACT_SENTINEL,
  },
} as unknown as FreeIdentityPreviewV1;

// Mocks for page composition test
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  usePathname: vi.fn(() => null),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

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

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, opts?: any) => (opts?.name ? `${key}:${opts.name}` : key),
}));

vi.mock("../../auth/resolve-current-actor", () => ({
  resolveCurrentActor: async () => ({ kind: "anonymous", sessionId: "anon-1" }),
}));

vi.mock("../reports/load-free-identity-preview", () => ({
  freeIdentityPreviewLoader: {
    loadPreview: async () => ({
      ok: true,
      value: rawAdversarialPreview,
    }),
  },
}));

vi.mock("./load-ziwei-chart", () => ({
  loadZiweiChart: {
    loadChart: async () => ({
      ok: true,
      value: {
        birthSummary: {
          displayName: "Minh An",
          gender: "male",
          normalizedCalendar: { kind: "solar", date: "1994-04-12" },
          normalizedTime: { precision: "exact_minute", localTime: "09:30" },
          timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        },
        chart: {
          version: 1,
          systemId: "ziwei",
          soulPalaceId: "ziwei.palace.life",
          bodyPalaceId: "ziwei.palace.career",
          transformations: [],
          palaces: [{ id: "ziwei.palace.life", earthlyBranchId: "ziwei.branch.tiger", stars: [] }],
        },
      },
    }),
  },
}));

vi.mock("./calculate-ziwei-chart-action", () => ({
  loadZiweiEvidence: vi.fn(),
}));

import ZiweiChartResultPage from "../../app/[locale]/la-so/[chartId]/page";
import { ZiweiResultTabs } from "./ziwei-result-tabs";

function findElementInTree(node: any, targetComponent: any): any {
  if (!node || typeof node !== "object") return null;
  if (node.type === targetComponent) return node;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementInTree(child, targetComponent);
      if (found) return found;
    }
  }
  if (node.props?.children) {
    return findElementInTree(node.props.children, targetComponent);
  }
  return null;
}

describe("Production projection boundary & locked narrative sentinel non-leakage", () => {
  it("proves the production projector completely strips the exact locked sentinel from arbitrary root and nested locations", () => {
    // Execute production projector directly
    const projected = projectFreeIdentityPreview(rawAdversarialPreview);

    // 1. Assert projected structure contains only known free-preview keys
    expect(projected).toHaveProperty("version", 1);
    expect(projected).toHaveProperty("chartId", "c1");
    expect(projected).toHaveProperty("capabilityId", "ziwei.identity.p0");
    expect(projected).toHaveProperty("summaryVersion", "ziwei.identity.free.v1");
    expect(projected.insights).toHaveLength(1);

    // 2. Stringify projected client-prop payload and prove exact sentinel is completely absent
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain(EXACT_SENTINEL);

    // 3. Deep key inspection: no unexpected properties present on root or nested objects
    const expectedRootKeys = ["version", "chartId", "chartVersionId", "capabilityId", "summaryVersion", "insights", "strengthSignal", "tensionSignal", "paidPreview"];
    expect(Object.keys(projected)).toEqual(expectedRootKeys);

    const expectedInsightKeys = ["id", "evidence"];
    expect(Object.keys(projected.insights[0]!)).toEqual(expectedInsightKeys);

    const expectedEvidenceKeys = [
      "evidenceId",
      "factReferences",
      "confidence",
      "interpretationBoundCodes",
      "interpretationBounds",
      "limitations",
    ];
    expect(Object.keys(projected.insights[0]!.evidence)).toEqual(expectedEvidenceKeys);

    const expectedPaidKeys = ["sku", "sectionId", "coveragePercent", "evidence"];
    expect(Object.keys(projected.paidPreview)).toEqual(expectedPaidKeys);
  });

  it("proves page composition executes the production projector and client props passed to ZiweiResultTabs never leak the sentinel", async () => {
    // Render the server component page directly
    const pageElement = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId: "c1", locale: "vi" }),
      searchParams: Promise.resolve({}),
    });

    // Locate the ZiweiResultTabs client component element within the server component composition tree
    const tabsElement = findElementInTree(pageElement, ZiweiResultTabs);
    expect(tabsElement).not.toBeNull();

    // Verify props passed to the client component boundary
    const clientProps = tabsElement.props;
    expect(clientProps).toHaveProperty("preview");

    // Stringify client component props (equivalent to RSC serialization to browser)
    const serializedClientProps = JSON.stringify(clientProps);
    expect(serializedClientProps).not.toContain(EXACT_SENTINEL);

    // Also stringify the entire page JSX tree to guarantee no leak elsewhere in RSC payload
    const safeStringify = (obj: any) =>
      JSON.stringify(obj, (key, value) => {
        if (typeof value === "function" || key === "_owner" || key === "type") return undefined;
        return value;
      });
    const serializedPageTree = safeStringify(pageElement);
    expect(serializedPageTree).not.toContain(EXACT_SENTINEL);

    // Ensure safe preview was properly projected
    expect(clientProps.preview).toHaveProperty("capabilityId", "ziwei.identity.p0");
    expect(clientProps.preview).toHaveProperty("insights");
    expect(clientProps.preview.insights[0].evidence).not.toHaveProperty("lockedEvidenceNarrative");
    expect(clientProps.preview.insights[0].evidence).not.toHaveProperty("leak1");
    expect(clientProps.preview.paidPreview).not.toHaveProperty("secretLockedNarrative");
  });
});
