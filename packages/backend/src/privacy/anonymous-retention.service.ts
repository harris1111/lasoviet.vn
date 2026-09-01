import type { Result } from "@lasoviet/contracts";

export type AnonymousRetentionError =
  | "ANONYMOUS_NOT_EXPIRED"
  | "ANONYMOUS_ALREADY_LINKED";

export type AnonymousRetentionRepository = {
  purgeExpired(now: Date): Promise<string[]>;
  purgeActor(
    actorId: string,
    now: Date,
  ): Promise<
    | { ok: true; value: { actorId: string } }
    | { ok: false; error: AnonymousRetentionError }
  >;
  deleteNow(
    actorId: string,
  ): Promise<
    | { ok: true; value: { actorId: string } }
    | { ok: false; error: AnonymousRetentionError }
  >;
};

function error(
  code: AnonymousRetentionError,
): Result<never, AnonymousRetentionError> {
  return {
    ok: false,
    error: {
      code,
      messageKey:
        code === "ANONYMOUS_NOT_EXPIRED"
          ? "privacy.anonymousNotExpired"
          : "privacy.anonymousAlreadyLinked",
      retryable: false,
    },
  };
}

export function createAnonymousRetentionService(options: {
  repository: AnonymousRetentionRepository;
}) {
  return {
    async purgeExpired(now: Date): Promise<string[]> {
      return options.repository.purgeExpired(now);
    },

    async purgeActor(
      actorId: string,
      now: Date,
    ): Promise<Result<{ actorId: string }, AnonymousRetentionError>> {
      const result = await options.repository.purgeActor(actorId, now);
      return result.ok ? result : error(result.error);
    },

    async deleteNow(
      actorId: string,
    ): Promise<Result<{ actorId: string }, AnonymousRetentionError>> {
      const result = await options.repository.deleteNow(actorId);
      return result.ok ? result : error(result.error);
    },
  };
}
