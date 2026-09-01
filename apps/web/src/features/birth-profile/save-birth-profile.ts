import "server-only";

import {
  BirthProfileV1Schema,
  type CurrentActor,
  type Result,
} from "@lasoviet/contracts";

import {
  privateApiClient,
  type PrivateApiClient,
} from "../../api/private-api-client";
import {
  CurrentActorResolutionError,
  resolveCurrentActor,
} from "../../auth/resolve-current-actor";

export type BirthProfileSubmissionValue = {
  profileId: string;
  revisionId: string;
  ziweiEligibility:
    | { version: 1; eligible: true; timeIndex: number }
    | {
        version: 1;
        eligible: false;
        reason: "TIME_UNKNOWN" | "TIME_RANGE_MULTIPLE_BRANCHES";
      };
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
};

type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string } };

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

export function createBirthProfileSubmission(
  dependencies: BirthProfileSubmissionDependencies,
) {
  return async (input: {
    profile: unknown;
    explicitConsent: boolean;
  }): Promise<Result<BirthProfileSubmissionValue, BirthProfileSubmissionError>> => {
    if (input.explicitConsent !== true) {
      return failure("CONSENT_REQUIRED");
    }
    const parsed = BirthProfileV1Schema.safeParse(input.profile);
    if (!parsed.success) {
      return failure("VALIDATION_FAILED");
    }

    let actor: CurrentActor;
    try {
      actor = await dependencies.resolveCurrentActor();
    } catch (error) {
      return actorError(error);
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
          documentVersion: parsed.data.consentVersion,
          purpose: "birth-profile-calculation",
        }),
      },
    );
    if (!consent.ok) {
      return failure("PROFILE_FORBIDDEN");
    }

    const profile = await api.request<ApiResult<BirthProfileSubmissionValue>>(
      "/birth-profiles",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      },
    );
    if (!profile.ok) {
      return failure(
        profile.error.code === "ANONYMOUS_EXPIRED"
          ? "ANONYMOUS_EXPIRED"
          : "PROFILE_FORBIDDEN",
      );
    }
    return {
      ok: true,
      value: {
        ...profile.value,
        ...(actor.kind === "anonymous" ? { expiresAt: actor.expiresAt } : {}),
      },
    };
  };
}

export const saveBirthProfile = createBirthProfileSubmission({
  resolveCurrentActor,
  privateApiClient,
});
