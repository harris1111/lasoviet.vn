import type {
  ClearReadingContextRequestV1,
  CurrentActor,
  ReadingContextV1,
  Result,
  SetReadingContextRequestV1,
} from "@lasoviet/contracts";
import {
  ClearReadingContextRequestV1Schema,
  computeReadingContextFingerprint,
  SetReadingContextRequestV1Schema,
} from "@lasoviet/contracts";

import type {
  ReadingContextCurrentRecord,
  ReadingContextRepository,
  ReadingContextRepositoryError,
} from "./reading-context.repository.js";

export type ReadingContextServiceError =
  | "READING_CONTEXT_INVALID"
  | "PROFILE_NOT_FOUND"
  | "READING_CONTEXT_CONFLICT"
  | "IDEMPOTENCY_KEY_REUSED"
  | "READING_CONTEXT_UNAVAILABLE";

export type ReadingContextService = {
  getCurrentContext(
    actor: CurrentActor,
    profileId: string,
  ): Promise<Result<ReadingContextCurrentRecord, ReadingContextServiceError>>;
  setContext(
    actor: CurrentActor,
    profileId: string,
    input: SetReadingContextRequestV1,
  ): Promise<Result<ReadingContextCurrentRecord, ReadingContextServiceError>>;
  clearContext(
    actor: CurrentActor,
    profileId: string,
    input: ClearReadingContextRequestV1,
  ): Promise<Result<ReadingContextCurrentRecord, ReadingContextServiceError>>;
};

export type ReadingContextServiceOptions = {
  repository: ReadingContextRepository;
  now?: () => Date;
};

function error(
  code: ReadingContextServiceError,
): Result<never, ReadingContextServiceError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `readingContext.${code.toLowerCase()}`,
      retryable: code === "READING_CONTEXT_UNAVAILABLE",
    },
  };
}

function profileIdIsValid(profileId: string): boolean {
  const value = profileId.trim();
  return value.length > 0 && value.length <= 128;
}

function activeActor(actor: CurrentActor, now: Date): boolean {
  return actor.kind !== "anonymous" || new Date(actor.expiresAt) > now;
}

function repositoryError(
  result: Result<ReadingContextCurrentRecord, ReadingContextRepositoryError>,
): Result<ReadingContextCurrentRecord, ReadingContextServiceError> {
  return result;
}

export function createReadingContextService(
  options: ReadingContextServiceOptions,
): ReadingContextService {
  const now = options.now ?? (() => new Date());

  return {
    async getCurrentContext(actor, profileId) {
      const currentTime = now();
      if (!profileIdIsValid(profileId)) {
        return error("READING_CONTEXT_INVALID");
      }
      if (!activeActor(actor, currentTime)) {
        return error("PROFILE_NOT_FOUND");
      }
      try {
        const record = await options.repository.getCurrent(
          actor,
          profileId,
          currentTime,
        );
        return record === null
          ? error("PROFILE_NOT_FOUND")
          : { ok: true, value: record };
      } catch {
        return error("READING_CONTEXT_UNAVAILABLE");
      }
    },

    async setContext(actor, profileId, input) {
      const currentTime = now();
      const parsed = SetReadingContextRequestV1Schema.safeParse(input);
      if (!profileIdIsValid(profileId) || !parsed.success) {
        return error("READING_CONTEXT_INVALID");
      }
      if (!activeActor(actor, currentTime)) {
        return error("PROFILE_NOT_FOUND");
      }
      const context: ReadingContextV1 = {
        version: 1,
        ...(parsed.data.lifeStage === undefined
          ? {}
          : { lifeStage: parsed.data.lifeStage }),
        ...(parsed.data.topConcern === undefined
          ? {}
          : { topConcern: parsed.data.topConcern }),
      };
      try {
        return repositoryError(
          await options.repository.mutateContextWithAdvisoryLock(
            actor,
            profileId,
            {
              commandType: "set",
              context,
              expectedStateVersion: parsed.data.expectedStateVersion,
              idempotencyKey: parsed.data.idempotencyKey,
              requestFingerprint: computeReadingContextFingerprint(
                "set",
                parsed.data.expectedStateVersion,
                context,
              ),
              now: currentTime,
            },
          ),
        );
      } catch {
        return error("READING_CONTEXT_UNAVAILABLE");
      }
    },

    async clearContext(actor, profileId, input) {
      const currentTime = now();
      const parsed = ClearReadingContextRequestV1Schema.safeParse(input);
      if (!profileIdIsValid(profileId) || !parsed.success) {
        return error("READING_CONTEXT_INVALID");
      }
      if (!activeActor(actor, currentTime)) {
        return error("PROFILE_NOT_FOUND");
      }
      try {
        return repositoryError(
          await options.repository.mutateContextWithAdvisoryLock(
            actor,
            profileId,
            {
              commandType: "clear",
              expectedStateVersion: parsed.data.expectedStateVersion,
              idempotencyKey: parsed.data.idempotencyKey,
              requestFingerprint: computeReadingContextFingerprint(
                "clear",
                parsed.data.expectedStateVersion,
              ),
              now: currentTime,
            },
          ),
        );
      } catch {
        return error("READING_CONTEXT_UNAVAILABLE");
      }
    },
  };
}
