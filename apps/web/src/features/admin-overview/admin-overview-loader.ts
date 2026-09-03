import "server-only";

import {
  AdminOverviewV1Schema,
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

function boundedPage(value: string | undefined, fallback: number): number {
  return value === undefined || !/^\d{1,6}$/.test(value) ? fallback : Number(value);
}

export function createAdminOverviewLoader(
  dependencies: AdminOverviewLoaderDependencies,
) {
  return {
    async load(
      actor: CurrentActor,
      input: { page?: string; pageSize?: string },
    ): Promise<AdminOverviewV1> {
      const page = boundedPage(input.page, 1);
      const pageSize = boundedPage(input.pageSize, 25);
      const response = await dependencies
        .privateApiClient(actor, actor.requestId)
        .request<unknown>(`/admin/overview?page=${page}&pageSize=${pageSize}`);
      const overview = AdminOverviewV1Schema.safeParse(response);
      if (!overview.success) throw new Error("ADMIN_PROJECTION_INVALID");
      return overview.data;
    },
  };
}

export const loadAdminOverview = createAdminOverviewLoader({ privateApiClient });
