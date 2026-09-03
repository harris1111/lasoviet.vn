import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";
import { createElement } from "react";

import { parseAdminAuditSearchFiltersV1 } from "@lasoviet/contracts";
import {
  privateAdminAuditClient,
  privateApiClient,
} from "../../../../api/private-api-client";
import { resolveVerifiedAccountActor } from "../../../../auth/resolve-current-actor";
import { AuditLogTable } from "../../../../features/admin-access/audit-log-table";
import { loadAdminAudit } from "../../../../features/admin-access/audit-log-loader";
import { RoleAssignmentForm } from "../../../../features/admin-access/role-assignment-form";

const h = createElement;
export const dynamic = "force-dynamic";

export default async function AdminAuditPage(props: {
  searchParams?: Promise<Record<string, string | undefined>>;
} = {}) {
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
  let access: { canReadAudit: boolean; canManageRoles: boolean };
  try {
    access = await privateApiClient(actor, actor.requestId)
      .request("/admin/audit/access");
  } catch {
    notFound();
  }
  const filters = parseAdminAuditSearchFiltersV1(await (
    props.searchParams ?? Promise.resolve({})
  ));
  if (!filters.success) return h("main", null, h(AuditLogTable, {
    filters: { pageSize: 25 },
  }));
  let page;
  if (access.canReadAudit) {
    try {
      page = await loadAdminAudit.load(actor, filters.data);
    } catch {
      page = undefined;
    }
  }
  return h("main", { className: "admin-overview container" },
    h("header", { className: "admin-overview-header" },
      h("div", null, h("p", { className: "eyebrow" }, "Private operations"),
        h("h1", null, "Audit inspection"))),
    access.canManageRoles ? h(RoleAssignmentForm) : null,
    !access.canReadAudit ? null : page === undefined ? h("p", { role: "alert" }, "Audit records are unavailable.")
      : h(AuditLogTable, { page, filters: filters.data }));
}
