import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createFreeIdentityPreviewLoader,
  type FreeIdentityPreviewLoaderDependencies,
} from "./load-free-identity-preview";

function dependencies(): FreeIdentityPreviewLoaderDependencies & {
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

const evidence = {
  evidenceId: "ziwei.identity.soul",
  factReferences: ["fact.soul"],
  confidence: "high",
  interpretationBounds: ["identity-only"],
  limitations: ["birth-time-dependent"],
};

describe("free identity preview server loaders", () => {
  it("loads only strict preview and topic response envelopes", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: true,
      value: {
        version: 1, chartId: "chart-1", chartVersionId: "chart-version-1",
        capabilityId: "ziwei.identity.p0", summaryVersion: "ziwei.identity.free.v1",
        insights: [
          { id: "soul", evidence },
          { id: "body", evidence: { ...evidence, evidenceId: "ziwei.identity.body" } },
          { id: "configuration", evidence: { ...evidence, evidenceId: "ziwei.identity.configuration" } },
        ],
        strengthSignal: { id: "soul-strength", evidence },
        tensionSignal: { id: "body-configuration-tension", evidence: [{ ...evidence, evidenceId: "ziwei.identity.body" }, { ...evidence, evidenceId: "ziwei.identity.configuration" }] },
        paidPreview: { sku: "ZIWEI-IDENTITY-P0", sectionId: "personal_summary", coveragePercent: 12, evidence: [evidence] },
      },
    });

    await expect(createFreeIdentityPreviewLoader(subject).loadPreview("chart-1"))
      .resolves.toMatchObject({ ok: true, value: { paidPreview: { coveragePercent: 12 } } });

    subject.request.mockResolvedValueOnce({
      ok: true,
      value: {
        version: 1, chartId: "chart-1", chartVersionId: "chart-version-1",
        offers: [{ sku: "ZIWEI-IDENTITY-P0", method: "ziwei", price: 79000, currency: "VND", sections: ["personal_summary"] }],
        leaked: true,
      },
    });
    await expect(createFreeIdentityPreviewLoader(subject).loadTopics("chart-1"))
      .rejects.toMatchObject({ code: "PRIVATE_API_RESPONSE_INVALID" });
  });

  it("posts a strict identity SKU selection only", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({ ok: true, value: { version: 1, chartId: "chart-1", chartVersionId: "chart-version-1", offers: [{ sku: "ZIWEI-IDENTITY-P0", method: "ziwei", price: 79000, currency: "VND", sections: ["personal_summary"] }] } });

    await expect(createFreeIdentityPreviewLoader(subject).selectTopic("chart-1", {
      sku: "ZIWEI-IDENTITY-P0",
    })).resolves.toMatchObject({ ok: true });
    expect(subject.request).toHaveBeenLastCalledWith(
      "/ziwei/charts/chart-1/topics",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("lets the authorized backend distinguish missing charts from unavailable SKUs", async () => {
    const subject = dependencies();
    subject.request
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: "CHART_NOT_FOUND",
          messageKey: "ziwei.chart_not_found",
          retryable: false,
        },
      })
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: "SKU_UNAVAILABLE",
          messageKey: "ziwei.sku_unavailable",
          retryable: false,
        },
      });

    await expect(createFreeIdentityPreviewLoader(subject).selectTopic("missing-chart", {
      sku: "ZIWEI-RELATIONSHIP-P0",
    } as never)).resolves.toMatchObject({
      ok: false,
      error: { code: "CHART_NOT_FOUND" },
    });
    await expect(createFreeIdentityPreviewLoader(subject).selectTopic("authorized-chart", {
      sku: "ZIWEI-RELATIONSHIP-P0",
    } as never)).resolves.toMatchObject({
      ok: false,
      error: { code: "SKU_UNAVAILABLE" },
    });
    expect(subject.request).toHaveBeenNthCalledWith(
      1,
      "/ziwei/charts/missing-chart/topics",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
