import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createZiweiChartLoader,
  type ZiweiChartLoaderDependencies,
} from "./load-ziwei-chart";

function dependencies(): ZiweiChartLoaderDependencies & {
  resolveCurrentActor: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
} {
  const request = vi.fn();
  return {
    resolveCurrentActor: vi.fn().mockResolvedValue({
      kind: "account",
      userId: "account-1",
      sessionId: "session-1",
      requestId: "request-1",
    }),
    privateApiClient: vi.fn().mockReturnValue({ request }),
    request,
  };
}

describe("Zi Wei chart server loaders", () => {
  const chart = {
    version: 1,
    systemId: "ziwei",
    palaces: [
      "life", "siblings", "spouse", "children", "wealth", "health",
      "travel", "friends", "career", "property", "fortune", "parents",
    ].map((name) => ({
      id: `ziwei.palace.${name}`,
      earthlyBranchId: "ziwei.branch.tiger",
      stars: [],
    })),
    transformations: [{
      starId: "ziwei.star.wuqu",
      id: "ziwei.transformation.prosperity",
    }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [{
      id: "ziwei.horoscope.annual",
      supported: true,
    }],
    warnings: [],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: ["IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"],
    },
  };

  it("loads the strict chart view and rejects extra private response data", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: true,
      value: {
        version: 1,
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        chart,
        evidenceIndex: {
          version: 1,
          evidenceSetId: "evidence-set-1",
          capabilityId: "ziwei.identity.p0",
          chartVersionId: "chart-version-1",
          ruleVersion: "ziwei.identity.v1",
          itemIds: [
            "ziwei.identity.soul",
            "ziwei.identity.body",
            "ziwei.identity.configuration",
          ],
        },
        leakedEvidence: true,
      },
    });

    await expect(createZiweiChartLoader(subject).loadChart("chart-1")).rejects.toMatchObject({
      code: "PRIVATE_API_RESPONSE_INVALID",
    });
  });

  it("maps a chart error envelope with safe optional metadata", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: false,
      error: {
        code: "CHART_NOT_FOUND",
        messageKey: "ziwei.chart_not_found",
        retryable: false,
        field: "chartId",
        details: { source: "backend", attempts: 1, retryable: false },
      },
    });
    await expect(createZiweiChartLoader(subject).loadChart("chart-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "CHART_NOT_FOUND" },
    });
  });

  it("maps an evidence error envelope with safe optional metadata", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: false,
      error: {
        code: "EVIDENCE_NOT_FOUND",
        messageKey: "ziwei.evidence_not_found",
        retryable: false,
        field: "evidenceId",
        details: { source: "backend", attempts: 1, retryable: false },
      },
    });
    await expect(createZiweiChartLoader(subject).loadEvidence("chart-1", "evidence-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "EVIDENCE_NOT_FOUND" },
    });
  });
});
