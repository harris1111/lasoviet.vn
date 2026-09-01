import "server-only";

import {
  type CurrentActor,
  type Result,
  ZiweiChartViewV1Schema,
  type ZiweiChartViewV1,
  ZiweiEvidenceViewV1Schema,
  type ZiweiEvidenceViewV1,
} from "@lasoviet/contracts";
import { z } from "zod";

import {
  privateApiClient,
  PrivateApiClientError,
  type PrivateApiClient,
} from "../../api/private-api-client";
import {
  CurrentActorResolutionError,
  resolveCurrentActor,
} from "../../auth/resolve-current-actor";

export type ZiweiChartLoaderDependencies = {
  resolveCurrentActor(): Promise<CurrentActor>;
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
};

type ChartLoaderError = "CHART_NOT_FOUND" | "ANONYMOUS_EXPIRED";
type EvidenceLoaderError =
  | "CHART_NOT_FOUND"
  | "EVIDENCE_NOT_FOUND"
  | "ANONYMOUS_EXPIRED";

const appErrorSchema = z
  .object({
    code: z.string().regex(/^[A-Z][A-Z0-9_]{1,127}$/),
    messageKey: z.string().trim().min(1),
    retryable: z.boolean(),
  })
  .strict();

const responseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: z.unknown() }).strict(),
  z.object({ ok: z.literal(false), error: appErrorSchema }).strict(),
]);

function failure<TCode extends string>(code: TCode): Result<never, TCode> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `ziwei.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function actorError<TCode extends string>(
  error: unknown,
): Result<never, TCode | "ANONYMOUS_EXPIRED"> | never {
  if (
    error instanceof CurrentActorResolutionError &&
    error.code === "ANONYMOUS_EXPIRED"
  ) {
    return failure("ANONYMOUS_EXPIRED");
  }
  throw error;
}

function parseResponse<T>(
  response: unknown,
  schema: z.ZodType<T>,
): { ok: true; value: T } | { ok: false; error: { code: string } } {
  const parsed = responseSchema.safeParse(response);
  if (!parsed.success) {
    throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
  }
  if (!parsed.data.ok) {
    return parsed.data;
  }
  const value = schema.safeParse(parsed.data.value);
  if (!value.success) {
    throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
  }
  return { ok: true, value: value.data };
}

function readError<TCode extends string>(
  code: string,
  allowed: readonly TCode[],
): Result<never, TCode> | never {
  if (allowed.includes(code as TCode)) {
    return failure(code as TCode);
  }
  throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
}

export function createZiweiChartLoader(
  dependencies: ZiweiChartLoaderDependencies,
) {
  return {
    async loadChart(
      chartId: string,
    ): Promise<Result<ZiweiChartViewV1, ChartLoaderError>> {
      let actor: CurrentActor;
      try {
        actor = await dependencies.resolveCurrentActor();
      } catch (error) {
        return actorError<ChartLoaderError>(error);
      }
      const response = parseResponse(
        await dependencies
          .privateApiClient(actor, actor.requestId)
          .request<unknown>(`/ziwei/charts/${encodeURIComponent(chartId)}`),
        ZiweiChartViewV1Schema,
      );
      return response.ok
        ? response
        : readError(response.error.code, ["CHART_NOT_FOUND", "ANONYMOUS_EXPIRED"]);
    },

    async loadEvidence(
      chartId: string,
      evidenceId: string,
    ): Promise<Result<ZiweiEvidenceViewV1, EvidenceLoaderError>> {
      let actor: CurrentActor;
      try {
        actor = await dependencies.resolveCurrentActor();
      } catch (error) {
        return actorError<EvidenceLoaderError>(error);
      }
      const response = parseResponse(
        await dependencies
          .privateApiClient(actor, actor.requestId)
          .request<unknown>(
            `/ziwei/charts/${encodeURIComponent(chartId)}/evidence/${encodeURIComponent(evidenceId)}`,
          ),
        ZiweiEvidenceViewV1Schema,
      );
      return response.ok
        ? response
        : readError(response.error.code, [
          "CHART_NOT_FOUND",
          "EVIDENCE_NOT_FOUND",
          "ANONYMOUS_EXPIRED",
        ]);
    },
  };
}

export const loadZiweiChart = createZiweiChartLoader({
  resolveCurrentActor,
  privateApiClient,
});
