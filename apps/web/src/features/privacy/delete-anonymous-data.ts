import "server-only";

import type { CurrentActor } from "@lasoviet/contracts";

type AnonymousDeletionDependencies = {
  resolveCurrentActor(): Promise<CurrentActor>;
  privateApiClient(
    actor: CurrentActor,
    requestId: string,
  ): {
    request(path: string, init?: RequestInit): Promise<unknown>;
  };
  signOut(): Promise<unknown>;
};

export type AnonymousDeletionResult =
  | { ok: true }
  | {
      ok: false;
      error: { code: "ANONYMOUS_REQUIRED" | "DELETE_FAILED" };
    };

function deletionSucceeded(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true
  );
}

export function createAnonymousDataDeletion(
  dependencies: AnonymousDeletionDependencies,
) {
  return async (): Promise<AnonymousDeletionResult> => {
    const actor = await dependencies.resolveCurrentActor();
    if (actor.kind !== "anonymous") {
      return { ok: false, error: { code: "ANONYMOUS_REQUIRED" } };
    }

    try {
      const response = await dependencies
        .privateApiClient(actor, actor.requestId)
        .request("/privacy/anonymous", { method: "DELETE" });
      if (!deletionSucceeded(response)) {
        return { ok: false, error: { code: "DELETE_FAILED" } };
      }
      await dependencies.signOut();
      return { ok: true };
    } catch {
      return { ok: false, error: { code: "DELETE_FAILED" } };
    }
  };
}
