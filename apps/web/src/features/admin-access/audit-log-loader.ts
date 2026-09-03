import "server-only";

import {
  AdminAuditPageV1Schema,
  type AdminAuditSearchFiltersV1,
  type CurrentActor,
} from "@lasoviet/contracts";

import {
  privateApiClient,
  type PrivateApiClient,
} from "../../api/private-api-client";

export function createAdminAuditLoader(dependencies: {
  privateApiClient(actor: CurrentActor, requestId: string): PrivateApiClient;
}) {
  return {
    async load(actor: CurrentActor, filters: AdminAuditSearchFiltersV1) {
      const query = new URLSearchParams(
        Object.entries(filters).flatMap(([key, value]) =>
          value === undefined ? [] : [[key, String(value)]]),
      );
      const response = await dependencies.privateApiClient(actor, actor.requestId)
        .request<unknown>(`/admin/audit?${query.toString()}`);
      const parsed = AdminAuditPageV1Schema.safeParse(response);
      if (!parsed.success) throw new Error("ADMIN_AUDIT_PROJECTION_INVALID");
      return parsed.data;
    },
  };
}

export const loadAdminAudit = createAdminAuditLoader({ privateApiClient });
