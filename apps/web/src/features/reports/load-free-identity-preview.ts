import "server-only";

import {
  FreeIdentityPreviewV1Schema,
  PaidTopicSelectionViewV1Schema,
  type CurrentActor,
  type FreeIdentityPreviewV1,
  type PaidTopicSelectionViewV1,
  type Result,
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

export type FreeIdentityPreviewLoaderDependencies = {
  resolveCurrentActor(): Promise<CurrentActor>;
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
};

type PreviewLoaderError =
  | "CHART_NOT_FOUND"
  | "ANONYMOUS_EXPIRED"
  | "INSUFFICIENT_EVIDENCE";
type TopicLoaderError =
  | "CHART_NOT_FOUND"
  | "ANONYMOUS_EXPIRED"
  | "SKU_UNAVAILABLE";

const appErrorSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{1,127}$/),
  messageKey: z.string().trim().min(1),
  retryable: z.boolean(),
  field: z.string().trim().min(1).optional(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
}).strict();

const responseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: z.unknown() }).strict(),
  z.object({ ok: z.literal(false), error: appErrorSchema }).strict(),
]);

function failure<TCode extends string>(code: TCode): Result<never, TCode> {
  return {
    ok: false,
    error: { code, messageKey: `ziwei.${code.toLowerCase()}`, retryable: false },
  };
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

async function actorFor<TCode extends string>(
  dependencies: FreeIdentityPreviewLoaderDependencies,
): Promise<CurrentActor | Result<never, TCode | "ANONYMOUS_EXPIRED">> {
  try {
    return await dependencies.resolveCurrentActor();
  } catch (error) {
    if (
      error instanceof CurrentActorResolutionError &&
      error.code === "ANONYMOUS_EXPIRED"
    ) {
      return failure("ANONYMOUS_EXPIRED");
    }
    throw error;
  }
}

export function createFreeIdentityPreviewLoader(
  dependencies: FreeIdentityPreviewLoaderDependencies,
) {
  return {
    async loadPreview(chartId: string): Promise<Result<FreeIdentityPreviewV1, PreviewLoaderError>> {
      const actor = await actorFor<PreviewLoaderError>(dependencies);
      if ("ok" in actor) {
        return actor;
      }
      const response = parseResponse(
        await dependencies.privateApiClient(actor, actor.requestId)
          .request<unknown>(`/ziwei/charts/${encodeURIComponent(chartId)}/preview`),
        FreeIdentityPreviewV1Schema,
      );
      return response.ok
        ? response
        : readError(response.error.code, ["CHART_NOT_FOUND", "ANONYMOUS_EXPIRED", "INSUFFICIENT_EVIDENCE"]);
    },

    async loadTopics(chartId: string): Promise<Result<PaidTopicSelectionViewV1, TopicLoaderError>> {
      const actor = await actorFor<TopicLoaderError>(dependencies);
      if ("ok" in actor) {
        return actor;
      }
      const response = parseResponse(
        await dependencies.privateApiClient(actor, actor.requestId)
          .request<unknown>(`/ziwei/charts/${encodeURIComponent(chartId)}/topics`),
        PaidTopicSelectionViewV1Schema,
      );
      return response.ok
        ? response
        : readError(response.error.code, ["CHART_NOT_FOUND", "ANONYMOUS_EXPIRED", "SKU_UNAVAILABLE"]);
    },

    async selectTopic(
      chartId: string,
      request: unknown,
    ): Promise<Result<PaidTopicSelectionViewV1, TopicLoaderError>> {
      const actor = await actorFor<TopicLoaderError>(dependencies);
      if ("ok" in actor) {
        return actor;
      }
      const response = parseResponse(
        await dependencies.privateApiClient(actor, actor.requestId)
          .request<unknown>(`/ziwei/charts/${encodeURIComponent(chartId)}/topics`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(request),
          }),
        PaidTopicSelectionViewV1Schema,
      );
      return response.ok
        ? response
        : readError(response.error.code, ["CHART_NOT_FOUND", "ANONYMOUS_EXPIRED", "SKU_UNAVAILABLE"]);
    },
  };
}

export const freeIdentityPreviewLoader = createFreeIdentityPreviewLoader({
  resolveCurrentActor,
  privateApiClient,
});
