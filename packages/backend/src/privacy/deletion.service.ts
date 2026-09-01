import type { Result } from "@lasoviet/contracts";

import type {
  DeletionRepository,
  DeletionRepositoryError,
} from "./deletion.repository.js";

export type AccountDeletionServiceOptions = {
  repository: DeletionRepository;
  now?: () => Date;
};

function resultError(
  code: DeletionRepositoryError,
): Result<never, DeletionRepositoryError> {
  return {
    ok: false,
    error: {
      code,
      messageKey:
        code === "DELETION_ALREADY_REQUESTED"
          ? "privacy.deletionAlreadyRequested"
          : "privacy.deletionRecoveryExpired",
      retryable: false,
    },
  };
}

export function createAccountDeletionService(
  options: AccountDeletionServiceOptions,
) {
  const now = options.now ?? (() => new Date());

  return {
    async request(
      userId: string,
      requestId: string,
    ): Promise<
      Result<
        { requestId: string; recoverUntil: string },
        DeletionRepositoryError
      >
    > {
      const requestedAt = now();
      const result = await options.repository.request({
        userId,
        requestId,
        requestedAt,
        recoverUntil: new Date(requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
      return result.ok
        ? {
            ok: true,
            value: {
              requestId: result.value.requestId,
              recoverUntil: result.value.recoverUntil.toISOString(),
            },
          }
        : resultError(result.error);
    },

    async cancel(
      userId: string,
      requestId: string,
    ): Promise<Result<{ requestId: string }, DeletionRepositoryError>> {
      const result = await options.repository.cancel(userId, requestId, now());
      return result.ok ? result : resultError(result.error);
    },

    async purgeExpired(): Promise<string[]> {
      return options.repository.purgeExpired(now());
    },
  };
}
