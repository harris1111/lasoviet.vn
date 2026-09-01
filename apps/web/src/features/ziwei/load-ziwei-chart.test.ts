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
  it("loads the strict chart view and rejects extra private response data", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: true,
      value: {
        version: 1,
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        chart: {},
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

  it("maps private not-found and expired actor outcomes without exposing operational errors", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: false,
      error: { code: "CHART_NOT_FOUND", messageKey: "ziwei.chart_not_found", retryable: false },
    });
    await expect(createZiweiChartLoader(subject).loadChart("chart-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "CHART_NOT_FOUND" },
    });
  });

  it("loads one selected evidence item and maps its absence", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: false,
      error: { code: "EVIDENCE_NOT_FOUND", messageKey: "ziwei.evidence_not_found", retryable: false },
    });
    await expect(createZiweiChartLoader(subject).loadEvidence("chart-1", "evidence-1")).resolves.toMatchObject({
      ok: false,
      error: { code: "EVIDENCE_NOT_FOUND" },
    });
  });
});
