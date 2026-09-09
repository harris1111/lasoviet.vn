import "server-only";

import {
  AccountLibraryV1Schema,
  OrderHistoryV1Schema,
  type AccountLibraryV1,
  type CurrentActor,
  type OrderHistoryV1,
  type Result,
} from "@lasoviet/contracts";

import {
  privateApiClient,
  type PrivateApiClient,
} from "../../api/private-api-client";

export type AccountDataLoaderErrorCode =
  | "COMMERCE_UNAVAILABLE"
  | "COMMERCE_PROJECTION_INVALID";

export type AccountDataLoaderDependencies = {
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
};

export function createAccountDataLoader(
  dependencies: AccountDataLoaderDependencies = { privateApiClient },
) {
  return {
    async loadLibrary(
      actor: CurrentActor,
    ): Promise<Result<AccountLibraryV1, AccountDataLoaderErrorCode>> {
      let response: unknown;
      try {
        response = await dependencies
          .privateApiClient(actor, actor.requestId)
          .request<unknown>("/commerce/library");
      } catch {
        return {
          ok: false,
          error: {
            code: "COMMERCE_UNAVAILABLE",
            messageKey: "account.service_unavailable",
            retryable: true,
          },
        };
      }

      if (
        typeof response !== "object" ||
        response === null ||
        !("ok" in response)
      ) {
        return {
          ok: false,
          error: {
            code: "COMMERCE_PROJECTION_INVALID",
            messageKey: "account.projection_invalid",
            retryable: false,
          },
        };
      }

      const res = response as { ok: boolean; value?: unknown };
      if (!res.ok) {
        return {
          ok: false,
          error: {
            code: "COMMERCE_UNAVAILABLE",
            messageKey: "account.service_unavailable",
            retryable: true,
          },
        };
      }

      const parsed = AccountLibraryV1Schema.safeParse(res.value);
      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: "COMMERCE_PROJECTION_INVALID",
            messageKey: "account.projection_invalid",
            retryable: false,
          },
        };
      }

      return {
        ok: true,
        value: parsed.data,
      };
    },

    async loadOrders(
      actor: CurrentActor,
    ): Promise<Result<OrderHistoryV1, AccountDataLoaderErrorCode>> {
      let response: unknown;
      try {
        response = await dependencies
          .privateApiClient(actor, actor.requestId)
          .request<unknown>("/commerce/orders");
      } catch {
        return {
          ok: false,
          error: {
            code: "COMMERCE_UNAVAILABLE",
            messageKey: "account.service_unavailable",
            retryable: true,
          },
        };
      }

      if (
        typeof response !== "object" ||
        response === null ||
        !("ok" in response)
      ) {
        return {
          ok: false,
          error: {
            code: "COMMERCE_PROJECTION_INVALID",
            messageKey: "account.projection_invalid",
            retryable: false,
          },
        };
      }

      const res = response as { ok: boolean; value?: unknown };
      if (!res.ok) {
        return {
          ok: false,
          error: {
            code: "COMMERCE_UNAVAILABLE",
            messageKey: "account.service_unavailable",
            retryable: true,
          },
        };
      }

      const parsed = OrderHistoryV1Schema.safeParse(res.value);
      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: "COMMERCE_PROJECTION_INVALID",
            messageKey: "account.projection_invalid",
            retryable: false,
          },
        };
      }

      return {
        ok: true,
        value: parsed.data,
      };
    },
  };
}

export const accountDataLoader = createAccountDataLoader({ privateApiClient });

export async function loadAccountLibrary(
  actor: CurrentActor,
  dependencies?: AccountDataLoaderDependencies,
): Promise<Result<AccountLibraryV1, AccountDataLoaderErrorCode>> {
  return (dependencies ? createAccountDataLoader(dependencies) : accountDataLoader).loadLibrary(actor);
}

export async function loadOrderHistory(
  actor: CurrentActor,
  dependencies?: AccountDataLoaderDependencies,
): Promise<Result<OrderHistoryV1, AccountDataLoaderErrorCode>> {
  return (dependencies ? createAccountDataLoader(dependencies) : accountDataLoader).loadOrders(actor);
}
