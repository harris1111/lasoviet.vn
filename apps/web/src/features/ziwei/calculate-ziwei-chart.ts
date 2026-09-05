import "server-only";

import { z } from "zod";

import type { CurrentActor, Result } from "@lasoviet/contracts";

import type { PrivateApiClient } from "../../api/private-api-client";

type ZiweiChartCalculationError =
  | "PROFILE_FORBIDDEN"
  | "ZIWEI_TIME_INELIGIBLE"
  | "CALCULATION_FAILED";

export type ZiweiChartCalculationDependencies = {
  resolveCurrentActor(): Promise<CurrentActor>;
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
};

const responseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    value: z.object({ chartId: z.string().trim().min(1) }).passthrough(),
  }).strict(),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.string().trim().min(1),
      retryable: z.boolean(),
    }).passthrough(),
  }).strict(),
]);

function failure(
  code: ZiweiChartCalculationError,
  retryable: boolean,
): Result<never, ZiweiChartCalculationError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `ziwei.${code.toLowerCase()}`,
      retryable,
    },
  };
}

export function createZiweiChartCalculation(
  dependencies: ZiweiChartCalculationDependencies,
) {
  return async (
    revisionId: string,
  ): Promise<Result<{ chartId: string }, ZiweiChartCalculationError>> => {
    if (revisionId.trim() === "") {
      return failure("PROFILE_FORBIDDEN", false);
    }
    try {
      const actor = await dependencies.resolveCurrentActor();
      const response = responseSchema.safeParse(
        await dependencies
          .privateApiClient(actor, actor.requestId)
          .request<unknown>(
            `/ziwei/revisions/${encodeURIComponent(revisionId)}/calculate`,
            { method: "POST" },
          ),
      );
      if (!response.success) {
        return failure("CALCULATION_FAILED", true);
      }
      if (response.data.ok) {
        return { ok: true, value: { chartId: response.data.value.chartId } };
      }
      return response.data.error.code === "ZIWEI_TIME_INELIGIBLE"
        ? failure("ZIWEI_TIME_INELIGIBLE", false)
        : response.data.error.code === "PROFILE_FORBIDDEN"
          ? failure("PROFILE_FORBIDDEN", false)
          : failure("CALCULATION_FAILED", response.data.error.retryable);
    } catch {
      return failure("CALCULATION_FAILED", true);
    }
  };
}
