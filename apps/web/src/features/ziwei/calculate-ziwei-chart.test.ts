import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createZiweiChartCalculation,
  type ZiweiChartCalculationDependencies,
} from "./calculate-ziwei-chart";

function dependencies(): ZiweiChartCalculationDependencies & {
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

describe("Zi Wei chart calculation", () => {
  it("calculates an eligible revision through the private BFF and returns its opaque chart ID", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: true,
      value: {
        chartId: "chart-opaque-1",
        chartVersionId: "chart-version-1",
        reused: false,
      },
    });

    await expect(
      createZiweiChartCalculation(subject)("revision-1"),
    ).resolves.toEqual({
      ok: true,
      value: { chartId: "chart-opaque-1" },
    });
    expect(subject.request).toHaveBeenCalledWith(
      "/ziwei/revisions/revision-1/calculate",
      { method: "POST" },
    );
  });

  it("returns an actionable ineligible state without exposing private failures", async () => {
    const subject = dependencies();
    subject.request.mockResolvedValue({
      ok: false,
      error: {
        code: "ZIWEI_TIME_INELIGIBLE",
        messageKey: "ziwei.ziwei_time_ineligible",
        retryable: false,
      },
    });

    await expect(
      createZiweiChartCalculation(subject)("revision-1"),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ZIWEI_TIME_INELIGIBLE", retryable: false },
    });
  });
});
