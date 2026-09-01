import "server-only";

import { loadEnvironment } from "@lasoviet/config";
import type { CurrentActor } from "@lasoviet/contracts";

import { createInternalActorToken } from "../auth/create-internal-actor-token";

export type PrivateApiClientErrorCode =
  | "PRIVATE_API_UNREACHABLE"
  | "PRIVATE_API_RESPONSE_INVALID"
  | "PRIVATE_API_PATH_INVALID";

export class PrivateApiClientError extends Error {
  readonly code: PrivateApiClientErrorCode | string;
  readonly status: number | undefined;

  constructor(code: PrivateApiClientErrorCode | string, status?: number) {
    super(code);
    this.name = "PrivateApiClientError";
    this.code = code;
    this.status = status;
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

function resolveApplicationPath(path: string): URL {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new PrivateApiClientError("PRIVATE_API_PATH_INVALID");
  }

  let privateApiUrl: URL;
  let requestUrl: URL;
  try {
    privateApiUrl = new URL(resolvePrivateApiUrl());
    requestUrl = new URL(path, privateApiUrl);
  } catch {
    throw new PrivateApiClientError("PRIVATE_API_PATH_INVALID");
  }

  if (requestUrl.origin !== privateApiUrl.origin) {
    throw new PrivateApiClientError("PRIVATE_API_PATH_INVALID");
  }
  return requestUrl;
}

function safeApiErrorCode(value: unknown): string | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("code" in value) ||
    typeof value.code !== "string"
  ) {
    return undefined;
  }

  return /^[A-Z][A-Z0-9_]{1,127}$/.test(value.code)
    ? value.code
    : undefined;
}

export function privateApiClient(
  actor: CurrentActor,
  requestId: string,
): PrivateApiClient {
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const requestUrl = resolveApplicationPath(path);
      const headers = new Headers(init.headers);
      headers.set(
        "Authorization",
        `Bearer ${await createInternalActorToken(actor, requestId)}`,
      );
      headers.set("x-request-id", requestId);

      let response: Response;
      try {
        response = await fetch(requestUrl, {
          ...init,
          headers,
        });
      } catch {
        throw new PrivateApiClientError("PRIVATE_API_UNREACHABLE");
      }

      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
        }

        const code = safeApiErrorCode(body);
        if (code === undefined) {
          throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
        }
        throw new PrivateApiClientError(code, response.status);
      }

      try {
        return (await response.json()) as T;
      } catch {
        throw new PrivateApiClientError("PRIVATE_API_RESPONSE_INVALID");
      }
    },
  };
}
