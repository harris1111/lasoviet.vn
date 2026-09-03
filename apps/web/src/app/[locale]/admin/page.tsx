import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import {
  privateAdminAuditClient,
  privateApiClient,
} from "../../../api/private-api-client";
import { resolveVerifiedAccountActor } from "../../../auth/resolve-current-actor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
  return null;
}
