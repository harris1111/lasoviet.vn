import "server-only";

import {
  AdminOverviewV1Schema,
  type AdminOverviewFiltersV1,
  type AdminOverviewV1,
  type CurrentActor,
} from "@lasoviet/contracts";

import {
  privateApiClient,
  type PrivateApiClient,
} from "../../api/private-api-client";

export type AdminOverviewLoaderDependencies = {
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
};

export function createAdminOverviewLoader(
  dependencies: AdminOverviewLoaderDependencies,
) {
  return {
    async load(
      actor: CurrentActor,
      filters: AdminOverviewFiltersV1,
    ): Promise<AdminOverviewV1> {
      const response = await dependencies
        .privateApiClient(actor, actor.requestId)
        .request<unknown>(
          `/admin/overview?page=${filters.page}&pageSize=${filters.pageSize}`,
        );
      const overview = AdminOverviewV1Schema.safeParse(response);
      if (!overview.success) throw new Error("ADMIN_PROJECTION_INVALID");
      return overview.data;
    },
  };
}

export const loadAdminOverview = createAdminOverviewLoader({ privateApiClient });
