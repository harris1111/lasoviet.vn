"use server";

import { randomUUID } from "node:crypto";

import {
  AssignAdminRoleV1Schema,
  RevokeAdminRoleV1Schema,
} from "@lasoviet/contracts";

import { privateApiClient } from "../../api/private-api-client";
import { resolveVerifiedAccountActor } from "../../auth/resolve-current-actor";

export async function submitRoleAssignment(formData: FormData): Promise<void> {
  const actor = await resolveVerifiedAccountActor();
  const operation = formData.get("operation");
  const payload = {
    subjectAccountId: String(formData.get("subjectAccountId") ?? ""),
    assignmentId: String(formData.get("assignmentId") ?? ""),
    role: formData.get("role"),
    expectedVersion: Number(formData.get("expectedVersion")),
    idempotencyKey: String(formData.get("idempotencyKey") || randomUUID()),
    reasonCode: formData.get("reasonCode"),
  };
  if (operation === "revoke") {
    const body = RevokeAdminRoleV1Schema.safeParse(payload);
    if (!body.success) throw new Error("ROLE_ASSIGNMENT_INVALID");
    await privateApiClient(actor, actor.requestId).request(
      `/admin/roles/${encodeURIComponent(body.data.assignmentId)}/revoke`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body.data) },
    );
    return;
  }
  const body = AssignAdminRoleV1Schema.safeParse(payload);
  if (!body.success) throw new Error("ROLE_ASSIGNMENT_INVALID");
  await privateApiClient(actor, actor.requestId).request("/admin/roles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body.data),
  });
}
