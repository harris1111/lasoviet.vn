import "server-only";

import {
  AccountOverviewProjectionV1Schema,
  AccountPrivacyProjectionV1Schema,
  AccountProfilesProjectionV1Schema,
  type AccountOverviewProjectionV1,
  type AccountPrivacyProjectionV1,
  type AccountProfilesProjectionV1,
  type CurrentActor,
  type Result,
} from "@lasoviet/contracts";

import {
  privateApiClient,
  type PrivateApiClient,
} from "../../api/private-api-client";

export type AccountCenterLoaderErrorCode =
  | "ACCOUNT_CENTER_UNAVAILABLE"
  | "ACCOUNT_CENTER_PROJECTION_INVALID";

export type AccountCenterDataLoaderDependencies = {
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
};

export function buildAccountSignInRedirect(locale: string, path: string): string {
  const prefix = locale === "en" ? "/en" : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const callback =
    prefix && !normalizedPath.startsWith(prefix)
      ? `${prefix}${normalizedPath}`
      : normalizedPath;
  return `${prefix}/dang-nhap?callbackURL=${encodeURIComponent(callback)}`;
}

export function createAccountCenterDataLoader(
  dependencies: AccountCenterDataLoaderDependencies = { privateApiClient },
) {
  async function fetchProjection<T>(
    actor: CurrentActor,
    path: string,
    schema: { safeParse(data: unknown): { success: boolean; data?: T } },
  ): Promise<Result<T, AccountCenterLoaderErrorCode>> {
    let response: unknown;
    try {
      response = await dependencies
        .privateApiClient(actor, actor.requestId)
        .request<unknown>(path);
    } catch {
      return {
        ok: false,
        error: {
          code: "ACCOUNT_CENTER_UNAVAILABLE",
          messageKey: "account.service_unavailable",
          retryable: true,
        },
      };
    }

    const raw =
      typeof response === "object" &&
      response !== null &&
      "ok" in response &&
      "value" in response
        ? (response as { value: unknown }).value
        : response;

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "ACCOUNT_CENTER_PROJECTION_INVALID",
          messageKey: "account.projection_invalid",
          retryable: false,
        },
      };
    }

    return {
      ok: true,
      value: parsed.data as T,
    };
  }

  return {
    loadOverview(
      actor: CurrentActor,
    ): Promise<Result<AccountOverviewProjectionV1, AccountCenterLoaderErrorCode>> {
      return fetchProjection(
        actor,
        "/account-center/overview",
        AccountOverviewProjectionV1Schema,
      );
    },

    loadProfiles(
      actor: CurrentActor,
    ): Promise<Result<AccountProfilesProjectionV1, AccountCenterLoaderErrorCode>> {
      return fetchProjection(
        actor,
        "/account-center/profiles",
        AccountProfilesProjectionV1Schema,
      );
    },

    loadPrivacy(
      actor: CurrentActor,
    ): Promise<Result<AccountPrivacyProjectionV1, AccountCenterLoaderErrorCode>> {
      return fetchProjection(
        actor,
        "/account-center/privacy",
        AccountPrivacyProjectionV1Schema,
      );
    },
  };
}

export const accountCenterDataLoader = createAccountCenterDataLoader({
  privateApiClient,
});

export async function loadAccountOverview(
  actor: CurrentActor,
  dependencies?: AccountCenterDataLoaderDependencies,
): Promise<Result<AccountOverviewProjectionV1, AccountCenterLoaderErrorCode>> {
  return (
    dependencies
      ? createAccountCenterDataLoader(dependencies)
      : accountCenterDataLoader
  ).loadOverview(actor);
}

export async function loadAccountProfiles(
  actor: CurrentActor,
  dependencies?: AccountCenterDataLoaderDependencies,
): Promise<Result<AccountProfilesProjectionV1, AccountCenterLoaderErrorCode>> {
  return (
    dependencies
      ? createAccountCenterDataLoader(dependencies)
      : accountCenterDataLoader
  ).loadProfiles(actor);
}

export async function loadAccountPrivacy(
  actor: CurrentActor,
  dependencies?: AccountCenterDataLoaderDependencies,
): Promise<Result<AccountPrivacyProjectionV1, AccountCenterLoaderErrorCode>> {
  return (
    dependencies
      ? createAccountCenterDataLoader(dependencies)
      : accountCenterDataLoader
  ).loadPrivacy(actor);
}
