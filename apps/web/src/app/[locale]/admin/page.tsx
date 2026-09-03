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
  const filters = await searchParams;
  let overview;
  try {
    overview = await loadAdminOverview.load(actor, filters);
  } catch {
    overview = undefined;
  }
  const page = Number(filters.page) || 1;
  const pageSize = Number(filters.pageSize) || 25;
  return createElement(AdminOverviewTable, { overview, page, pageSize });
}
