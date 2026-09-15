import "server-only";

import {
  BirthProfileV1Schema,
  type CurrentActor,
  ReadingContextV1Schema,
  type Result,
  ZiweiEligibilityV1Schema,
  type ZiweiEligibilityV1,
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
import { getOrReconcileVisitorId } from "../../analytics/visitor-cookie";

export type BirthProfileSubmissionValue = {
  profileId: string;
  revisionId: string;
  ziweiEligibility: ZiweiEligibilityV1;
  expiresAt?: string;
};

export type BirthProfileSubmissionError =
  | "CONSENT_REQUIRED"
  | "VALIDATION_FAILED"
  | "PROFILE_FORBIDDEN"
  | "ANONYMOUS_EXPIRED";

export type BirthProfileSubmissionDependencies = {
  resolveCurrentActor(): Promise<CurrentActor>;
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
  getVisitorId(): Promise<string>;
};

type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string } };

const profileSuccessValueSchema = z
  .object({
    profileId: z.string().trim().min(1),
    revisionId: z.string().trim().min(1),
    ziweiEligibility: ZiweiEligibilityV1Schema,
  })
  .strict();

const appErrorSchema = z
  .object({
    code: z.string().regex(/^[A-Z][A-Z0-9_]{1,127}$/),
    messageKey: z.string().trim().min(1),
    retryable: z.boolean(),
    field: z.string().trim().min(1).optional(),
    details: z
      .record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean()]),
      )
      .optional(),
  })
  .strict();

const profileResponseSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      value: z.unknown(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: appErrorSchema,
    })
    .strict(),
]);

function failure(
  code: BirthProfileSubmissionError,
): Result<never, BirthProfileSubmissionError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `birthProfile.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function actorError(error: unknown): Result<never, BirthProfileSubmissionError> | never {
  if (
    error instanceof CurrentActorResolutionError &&
    error.code === "ANONYMOUS_EXPIRED"
  ) {
    return failure("ANONYMOUS_EXPIRED");
  }
  throw error;
}

function profileError(code: string): Result<never, BirthProfileSubmissionError> | never {
  if (code === "INVALID_TIMEZONE" || code === "INVALID_CALENDAR_INPUT") {
    return failure("VALIDATION_FAILED");
  }
  if (code === "READING_CONTEXT_INVALID") {
    return failure("VALIDATION_FAILED");
  }
  if (code === "ANONYMOUS_EXPIRED") {
    return failure("ANONYMOUS_EXPIRED");
  }
  if (
    code === "PROFILE_NOT_FOUND" ||
    code === "ACTOR_TOKEN_INVALID" ||
    code === "ACTOR_TOKEN_EXPIRED" ||
    code === "ACTOR_TOKEN_AUDIENCE"
  ) {
    return failure("PROFILE_FORBIDDEN");
  }
  throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
}

function parseProfileResponse(response: unknown): ApiResult<BirthProfileSubmissionValue> {
  const parsed = profileResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
  }
  if (!parsed.data.ok) {
    return parsed.data;
  }
  const value = parsed.data.value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
  }
  const responseValue = value as Record<string, unknown>;
  const selected = profileSuccessValueSchema.safeParse({
    profileId: responseValue.profileId,
    revisionId: responseValue.revisionId,
    ziweiEligibility: responseValue.ziweiEligibility,
  });
  if (!selected.success) {
    throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
  }
  return { ok: true, value: selected.data };
}

export function createBirthProfileSubmission(
  dependencies: BirthProfileSubmissionDependencies,
) {
  return async (input: {
    profile: unknown;
    explicitConsent: boolean;
    readingContext?: unknown;
  }): Promise<Result<BirthProfileSubmissionValue, BirthProfileSubmissionError>> => {
    if (input.explicitConsent !== true) {
      return failure("CONSENT_REQUIRED");
    }
    const parsed = BirthProfileV1Schema.safeParse(input.profile);
    if (!parsed.success) {
      return failure("VALIDATION_FAILED");
    }
    const readingContext =
      input.readingContext === undefined
        ? undefined
        : ReadingContextV1Schema.safeParse(input.readingContext);
    if (readingContext !== undefined && !readingContext.success) {
      return failure("VALIDATION_FAILED");
    }

    let actor: CurrentActor;
    try {
      actor = await dependencies.resolveCurrentActor();
    } catch (error) {
      return actorError(error);
    }

    let visitorId: string;
    try {
      visitorId = await dependencies.getVisitorId();
    } catch {
      return failure("PROFILE_FORBIDDEN");
    }
    if (!visitorId || typeof visitorId !== "string" || visitorId.trim() === "") {
      return failure("PROFILE_FORBIDDEN");
    }
    const api = dependencies.privateApiClient(actor, actor.requestId);
    const consent = await api.request<ApiResult<{ id: string }>>(
      "/privacy/consents",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: 1,
          documentKey: "privacy",
          documentVersion: "2026-09-14",
          purposes: ["birth_profile", "analytics", "personalization", "offers"],
          visitorId: visitorId.trim(),
        }),
      },
    );
    if (!consent.ok) {
      return failure("PROFILE_FORBIDDEN");
    }

    const profile = parseProfileResponse(await api.request<unknown>(
      "/birth-profiles",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          readingContext === undefined
            ? parsed.data
            : { profile: parsed.data, readingContext: readingContext.data },
        ),
      },
    ));
    if (!profile.ok) {
      return profileError(profile.error.code);
    }

    const createdProfile = profile.value;

    async function requestAssociation(): Promise<boolean> {
      try {
        const assocResponse = await api.request<unknown>(
          "/privacy/associate-profile",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              version: 1,
              visitorId: visitorId.trim(),
              profileId: createdProfile.profileId,
            }),
          },
        );
        return (
          typeof assocResponse === "object" &&
          assocResponse !== null &&
          "ok" in assocResponse &&
          assocResponse.ok === true
        );
      } catch {
        return false;
      }
    }

    let associated = await requestAssociation();
    if (!associated) {
      associated = await requestAssociation();
    }

    if (!associated) {
      return failure("PROFILE_FORBIDDEN");
    }

    return {
      ok: true,
      value: {
        profileId: createdProfile.profileId,
        revisionId: createdProfile.revisionId,
        ziweiEligibility: createdProfile.ziweiEligibility,
        ...(actor.kind === "anonymous" ? { expiresAt: actor.expiresAt } : {}),
      },
    };
  };
}

export const saveBirthProfile = createBirthProfileSubmission({
  resolveCurrentActor,
  privateApiClient,
  getVisitorId: getOrReconcileVisitorId,
});
