import { NextResponse } from "next/server";
import type { CurrentActor } from "@lasoviet/contracts";

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
};

export const MAX_ACCOUNT_EXPORT_BYTES = 5 * 1024 * 1024; // 5 MiB

export type AccountExportRouteHandlerDependencies = {
  maxBytes?: number;
  schema?: { safeParse(data: unknown): { success: boolean; data?: unknown } };
  resolveActor?: () => Promise<Extract<CurrentActor, { kind: "account" }>>;
  apiClient?: (
    actor: CurrentActor,
    requestId: string,
  ) => {
    request<T>(path: string, init?: RequestInit): Promise<T>;
  };
  isPrivateApiClientError?: (
    error: unknown,
  ) => error is { code: string; status?: number };
};

function defaultIsPrivateApiClientError(
  error: unknown,
): error is { code: string; status?: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "PrivateApiClientError" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

export function createAccountExportRouteHandler(
  dependencies: AccountExportRouteHandlerDependencies = {},
) {
  const isApiError =
    dependencies.isPrivateApiClientError ?? defaultIsPrivateApiClientError;

  return async function GET(request?: Request): Promise<Response> {
    const resolveActor =
      dependencies.resolveActor ??
      (async () => {
        const { resolveVerifiedAccountActor } = await import(
          "../../../../auth/resolve-current-actor"
        );
        return resolveVerifiedAccountActor();
      });

    const getApiClient =
      dependencies.apiClient ??
      ((actor: CurrentActor, reqId: string) => ({
        async request<T>(path: string, init?: RequestInit): Promise<T> {
          const { privateApiClient } = await import(
            "../../../../api/private-api-client"
          );
          return privateApiClient(actor, reqId).request<T>(path, init);
        },
      }));

    let actor;
    try {
      actor = await resolveActor();
    } catch {
      return new NextResponse(null, {
        status: 404,
        headers: NO_STORE_HEADERS,
      });
    }

    const client = getApiClient(actor, actor.requestId);

    let raw: unknown;
    try {
      raw = await client.request<unknown>("/account-center/export");
    } catch (error) {
      if (
        isApiError(error) &&
        (error.code === "ACCOUNT_RESOURCE_NOT_FOUND" || error.status === 404)
      ) {
        return new NextResponse(null, {
          status: 404,
          headers: NO_STORE_HEADERS,
        });
      }
      if (
        isApiError(error) &&
        (error.code === "ACCOUNT_EXPORT_LIMIT_EXCEEDED" || error.status === 413)
      ) {
        return new NextResponse(
          JSON.stringify({ code: "ACCOUNT_EXPORT_LIMIT_EXCEEDED" }),
          {
            status: 413,
            headers: {
              ...NO_STORE_HEADERS,
              "content-type": "application/json",
            },
          },
        );
      }
      return new NextResponse(null, {
        status: 503,
        headers: NO_STORE_HEADERS,
      });
    }

    const schema =
      dependencies.schema ??
      (await import("@lasoviet/contracts")).AccountExportProjectionV1Schema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return new NextResponse(null, {
        status: 503,
        headers: NO_STORE_HEADERS,
      });
    }

    const maxBytes = dependencies.maxBytes ?? MAX_ACCOUNT_EXPORT_BYTES;
    const serialized = JSON.stringify(parsed.data, null, 2);
    const byteLength = Buffer.byteLength(serialized, "utf8");
    if (byteLength > maxBytes) {
      return new NextResponse(
        JSON.stringify({ code: "ACCOUNT_EXPORT_LIMIT_EXCEEDED" }),
        {
          status: 413,
          headers: {
            ...NO_STORE_HEADERS,
            "content-type": "application/json",
          },
        },
      );
    }

    return new Response(serialized, {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="lasoviet-account-export.json"',
      },
    });
  };
}

export const GET = createAccountExportRouteHandler();
