import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";
import { createElement } from "react";

import {
  privateAdminAuditClient,
  privateApiClient,
} from "../../../api/private-api-client";
import { resolveVerifiedAccountActor } from "../../../auth/resolve-current-actor";
import { loadAdminOverview } from "../../../features/admin-overview/admin-overview-loader";
import { AdminOverviewTable } from "../../../features/admin-overview/admin-overview-table";
import { parseAdminOverviewFiltersV1 } from "@lasoviet/contracts";

export const dynamic = "force-dynamic";

export default async function AdminPage(props: {
  searchParams?: Promise<{ page?: string; pageSize?: string }>;
} = {}) {
  const {
    searchParams = Promise.resolve<{ page?: string; pageSize?: string }>({}),
  } = props;
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch {
    try {
      await privateAdminAuditClient(randomUUID()).recordPreflightDenial();
    } finally {
      notFound();
    }
  }
  try {
    await privateApiClient(actor, actor.requestId).request<{ role: string }>(
      "/admin/access",
    );
  } catch {
    notFound();
  }
  const parsedFilters = parseAdminOverviewFiltersV1(await searchParams);
  if (!parsedFilters.success) {
    return createElement(AdminOverviewTable, {
      error: "invalid_filters",
    });
  }
  let overview;
  try {
    overview = await loadAdminOverview.load(actor, parsedFilters.data);
  } catch {
    overview = undefined;
  }
  return createElement(AdminOverviewTable, {
    overview,
    filters: parsedFilters.data,
  });
}
