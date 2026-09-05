import type { CurrentActor, Result } from "@lasoviet/contracts";

import type { ConsentRepository } from "./consent.repository.js";

export type ConsentErrorCode = "CONSENT_VERSION_UNKNOWN";

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
      messageKey: "privacy.consentVersionUnknown",
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
      purpose: string,
    ): Promise<Result<{ id: string }, ConsentErrorCode>> {
      const versions = options.documentVersions[documentKey];
      if (
        versions === undefined ||
        !versions.includes(documentVersion) ||
        purpose.trim() === ""
      ) {
        return error("CONSENT_VERSION_UNKNOWN");
      }
      return {
        ok: true,
        value: await options.repository.record({
          actor,
          documentKey,
          documentVersion,
          purpose: purpose.trim(),
          grantedAt: now(),
        }),
      };
    },
  };
}
