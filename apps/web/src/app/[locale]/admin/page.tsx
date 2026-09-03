import { notFound } from "next/navigation";

import { privateApiClient } from "../../../api/private-api-client";
import { resolveVerifiedAccountActor } from "../../../auth/resolve-current-actor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    const actor = await resolveVerifiedAccountActor();
    await privateApiClient(actor, actor.requestId).request<{ role: string }>(
      "/admin/access",
    );
  } catch {
    notFound();
  }
  return null;
}
