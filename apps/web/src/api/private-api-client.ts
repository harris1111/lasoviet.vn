import "server-only";

import { loadEnvironment } from "@lasoviet/config";
import type { CurrentActor } from "@lasoviet/contracts";

import { createInternalActorToken } from "../auth/create-internal-actor-token";

export type PrivateApiClientErrorCode =
  | "PRIVATE_API_UNREACHABLE"
  | "PRIVATE_API_RESPONSE_INVALID";

export class PrivateApiClientError extends Error {
  readonly code: PrivateApiClientErrorCode;

  constructor(code: PrivateApiClientErrorCode) {
    super(code);
    this.name = "PrivateApiClientError";
    this.code = code;
  }
}

export type PrivateApiClient = {
  request<T>(path: string, init?: RequestInit): Promise<T>;
};

function resolvePrivateApiUrl(): string {
  const environment = loadEnvironment(process.env);
  if (!environment.ok || environment.value.privateApiUrl === undefined) {
    throw new PrivateApiClientError("PRIVATE_API_UNREACHABLE");
  }
  return environment.value.privateApiUrl;
}

export function privateApiClient(
  actor: CurrentActor,
  requestId: string,
): PrivateApiClient {
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const headers = new Headers(init.headers);
      headers.set(
        "Authorization",
        `Bearer ${await createInternalActorToken(actor, requestId)}`,
      );
      headers.set("x-request-id", requestId);

      let response: Response;
      try {
        response = await fetch(new URL(path, resolvePrivateApiUrl()), {
          ...init,
          headers,
        });
      } catch {
        throw new PrivateApiClientError("PRIVATE_API_UNREACHABLE");
      }

      if (!response.ok) {
        throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
      }

      try {
        return (await response.json()) as T;
      } catch {
        throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
      }
    },
  };
}
