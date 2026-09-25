import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { projectFreeIdentityPreview } from "./ziwei-free-preview-projection";
import type { FreeIdentityPreviewV1 } from "@lasoviet/contracts";

const EXACT_SENTINEL = "SENTINEL_PAID_NARRATIVE_DO_NOT_LEAK_INTO_FREE_DOM_394857";

// Valid baseline conforming strictly to FreeIdentityPreviewV1Schema + injected unknown fields
const validAdversarialPreview = {
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
        factReferences: ["fact-life-1"],
        confidence: "high" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Authorized safe boundary 1"],
        limitations: ["Standard limitation 1"],
        // Injected unknown fields
        lockedEvidenceNarrative: EXACT_SENTINEL,
        leak1: EXACT_SENTINEL,
      },
      insightNarrative: EXACT_SENTINEL,
    },
    {
      id: "body-palace",
      evidence: {
        evidenceId: "ziwei.identity.body-palace",
        factReferences: ["fact-body-1"],
        confidence: "moderate" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Authorized safe boundary 2"],
        limitations: ["Standard limitation 2"],
        leak2: EXACT_SENTINEL,
      },
      bodyNarrative: EXACT_SENTINEL,
    },
    {
      id: "transformations",
      evidence: {
        evidenceId: "ziwei.identity.transformations",
        factReferences: ["fact-trans-1"],
        confidence: "high" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Authorized safe boundary 3"],
        limitations: ["Standard limitation 3"],
        leak3: EXACT_SENTINEL,
      },
      transNarrative: EXACT_SENTINEL,
    },
  ],
  strengthSignal: {
    id: "strength",
    evidence: {
      evidenceId: "ziwei.identity.life-palace",
      factReferences: ["fact-life-1"],
      confidence: "high" as const,
      interpretationBoundCodes: ["reflective_identity_only" as const],
      interpretationBounds: ["Authorized safe boundary 1"],
      limitations: ["Standard limitation 1"],
      leakSignal: EXACT_SENTINEL,
    },
    strengthProse: EXACT_SENTINEL,
  },
  tensionSignal: {
    id: "tension",
    evidence: [
      {
        evidenceId: "ziwei.identity.body-palace",
        factReferences: ["fact-body-1"],
        confidence: "moderate" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Authorized safe boundary 2"],
        limitations: ["Standard limitation 2"],
        leakSignal: EXACT_SENTINEL,
      },
      {
        evidenceId: "ziwei.identity.transformations",
        factReferences: ["fact-trans-1"],
        confidence: "high" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Authorized safe boundary 3"],
        limitations: ["Standard limitation 3"],
        leakSignal: EXACT_SENTINEL,
      },
    ],
    tensionProse: EXACT_SENTINEL,
  },
  paidPreview: {
    sku: "ZIWEI-IDENTITY-P0" as const,
    sectionId: "personal_summary" as const,
    coveragePercent: 12,
    evidence: [
      {
        evidenceId: "ziwei.identity.life-palace",
        factReferences: ["fact-life-1"],
        confidence: "high" as const,
        interpretationBoundCodes: ["reflective_identity_only" as const],
        interpretationBounds: ["Authorized safe boundary 1"],
        limitations: ["Standard limitation 1"],
        paidSecret: EXACT_SENTINEL,
      },
    ],
    secretLockedNarrative: EXACT_SENTINEL,
    fullLockedReport: {
      narrative: EXACT_SENTINEL,
    },
  },
  // Injected malicious root properties
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

let currentMockPreviewResult: any = { ok: true, value: validAdversarialPreview };

vi.mock("../reports/load-free-identity-preview", () => ({
  freeIdentityPreviewLoader: {
    loadPreview: async () => currentMockPreviewResult,
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
    loadHoroscope: async () => ({ ok: false }),
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
  it("proves the production projector strips unknown/sentinel fields from valid baseline and validates cleanly", () => {
    const projected = projectFreeIdentityPreview(validAdversarialPreview);
    expect(projected).not.toBeNull();

    // 1. Assert projected structure conforms strictly to FreeIdentityPreviewV1
    expect(projected).toHaveProperty("version", 1);
    expect(projected).toHaveProperty("chartId", "c1");
    expect(projected).toHaveProperty("capabilityId", "ziwei.identity.p0");
    expect(projected).toHaveProperty("summaryVersion", "ziwei.identity.free.v1");
    expect(projected!.insights).toHaveLength(3);

    // 2. Stringify projected client-prop payload and prove exact sentinel is completely absent
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain(EXACT_SENTINEL);

    // 3. Deep key inspection: no unexpected properties present on root or nested objects
    const expectedRootKeys = ["version", "chartId", "chartVersionId", "capabilityId", "summaryVersion", "insights", "strengthSignal", "tensionSignal", "paidPreview"];
    expect(Object.keys(projected!)).toEqual(expectedRootKeys);

    const expectedInsightKeys = ["id", "evidence"];
    expect(Object.keys(projected!.insights[0]!)).toEqual(expectedInsightKeys);

    const expectedEvidenceKeys = [
      "evidenceId",
      "factReferences",
      "confidence",
      "interpretationBoundCodes",
      "interpretationBounds",
      "limitations",
    ];
    expect(Object.keys(projected!.insights[0]!.evidence)).toEqual(expectedEvidenceKeys);

    const expectedPaidKeys = ["sku", "sectionId", "coveragePercent", "evidence"];
    expect(Object.keys(projected!.paidPreview)).toEqual(expectedPaidKeys);
  });

  it("proves the production projector rejects malformed payloads and returns null (fail closed)", () => {
    // 1. Null or non-object
    expect(projectFreeIdentityPreview(null)).toBeNull();
    expect(projectFreeIdentityPreview(undefined)).toBeNull();
    expect(projectFreeIdentityPreview("not-an-object")).toBeNull();

    // 2. Missing insights or wrong length
    expect(projectFreeIdentityPreview({ ...validAdversarialPreview, insights: [] })).toBeNull();
    expect(
      projectFreeIdentityPreview({
        ...validAdversarialPreview,
        insights: (validAdversarialPreview as any).insights.slice(0, 2),
      }),
    ).toBeNull();

    // 3. Invalid confidence (no default fallback allowed)
    const invalidConfidence = JSON.parse(JSON.stringify(validAdversarialPreview));
    invalidConfidence.insights[0].evidence.confidence = "unsupported_confidence";
    expect(projectFreeIdentityPreview(invalidConfidence)).toBeNull();

    // 4. Missing required section (e.g. no paidPreview)
    const missingPaid = { ...validAdversarialPreview };
    delete (missingPaid as any).paidPreview;
    expect(projectFreeIdentityPreview(missingPaid)).toBeNull();

    // 5. Fact mismatch between repeated evidence and insight
    const mismatchedFacts = JSON.parse(JSON.stringify(validAdversarialPreview));
    mismatchedFacts.strengthSignal.evidence.factReferences = ["different-fact"];
    expect(projectFreeIdentityPreview(mismatchedFacts)).toBeNull();
  });

  it("proves page composition executes the production projector and client props passed to ZiweiResultTabs never leak the sentinel", async () => {
    currentMockPreviewResult = { ok: true, value: validAdversarialPreview };

    const pageElement = await ZiweiChartResultPage({
      params: Promise.resolve({ chartId: "c1", locale: "vi" }),
      searchParams: Promise.resolve({}),
    });

    const tabsElement = findElementInTree(pageElement, ZiweiResultTabs);
    expect(tabsElement).not.toBeNull();

    const clientProps = tabsElement.props;
    expect(clientProps).toHaveProperty("preview");

    const serializedClientProps = JSON.stringify(clientProps);
    expect(serializedClientProps).not.toContain(EXACT_SENTINEL);

    const safeStringify = (obj: any) =>
      JSON.stringify(obj, (key, value) => {
        if (typeof value === "function" || key === "_owner" || key === "type") return undefined;
        return value;
      });
    const serializedPageTree = safeStringify(pageElement);
    expect(serializedPageTree).not.toContain(EXACT_SENTINEL);

    expect(clientProps.preview).toHaveProperty("capabilityId", "ziwei.identity.p0");
    expect(clientProps.preview.insights).toHaveLength(3);
    expect(clientProps.preview.insights[0].evidence).not.toHaveProperty("lockedEvidenceNarrative");
    expect(clientProps.preview.insights[0].evidence).not.toHaveProperty("leak1");
    expect(clientProps.preview.paidPreview).not.toHaveProperty("secretLockedNarrative");
  });

  it("proves page composition fails closed with notFound when preview is malformed", async () => {
    currentMockPreviewResult = { ok: true, value: { version: 1, malformed: true } };

    await expect(
      ZiweiChartResultPage({
        params: Promise.resolve({ chartId: "c1", locale: "vi" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
