import {
  ConsentPurposesSetSchema,
  CURRENT_CONSENT_DOCUMENT_VERSION,
  type CurrentActor,
  type Result,
} from "@lasoviet/contracts";

import {
  ConsentRepositoryError,
  type ConsentRecordResult,
  type ConsentRepository,
} from "./consent.repository.js";

export type ConsentErrorCode =
  | "CONSENT_VERSION_UNKNOWN"
  | "PROFILE_FORBIDDEN"
  | "PROFILE_NOT_FOUND";

export type ConsentDocumentVersions = Record<string, readonly string[]>;

export type ConsentServiceOptions = {
  repository: ConsentRepository;
  documentVersions: ConsentDocumentVersions;
  now?: () => Date;
};

function error(code: ConsentErrorCode): Result<never, ConsentErrorCode> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `privacy.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

export function createConsentService(options: ConsentServiceOptions) {
  const now = options.now ?? (() => new Date());

  return {
    async record(
      actor: CurrentActor,
      documentKey: string,
      documentVersion: string,
      purposes: readonly string[],
      visitorId?: string | null,
    ): Promise<Result<ConsentRecordResult, ConsentErrorCode>> {
      const versions = options.documentVersions[documentKey];
      if (
        versions === undefined ||
        !versions.includes(documentVersion) ||
        purposes.length === 0 ||
        purposes.some((p) => p.trim() === "")
      ) {
        return error("CONSENT_VERSION_UNKNOWN");
      }

      if (documentVersion === CURRENT_CONSENT_DOCUMENT_VERSION) {
        const validatedPurposes = ConsentPurposesSetSchema.safeParse(purposes);
        if (!validatedPurposes.success) {
          return error("CONSENT_VERSION_UNKNOWN");
        }
      }

      try {
        const value = await options.repository.record({
          actor,
          documentKey,
          documentVersion,
          purposes,
          visitorId,
          grantedAt: now(),
        });
        return {
          ok: true,
          value,
        };
      } catch (err) {
        if (
          err instanceof ConsentRepositoryError &&
          (err.code === "PROFILE_FORBIDDEN" || err.code === "PROFILE_NOT_FOUND")
        ) {
          return error(err.code);
        }
        throw err;
      }
    },
  };
}
