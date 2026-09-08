import { randomUUID } from "node:crypto";
import { createElement } from "react";

import { submitRoleAssignment } from "./role-assignment-action";

const h = createElement;
const reasons = [
  "access_onboarding",
  "access_role_change",
  "access_offboarding",
  "access_review",
  "security_incident",
] as const;

export function RoleAssignmentForm() {
  return h("section", { "aria-labelledby": "role-assignment-heading" },
    h("h2", { id: "role-assignment-heading" }, "Role administration"),
    h("form", { action: submitRoleAssignment, className: "admin-role-form" },
      h("label", null, "Action",
        h("select", { name: "operation", defaultValue: "assign" },
          h("option", { value: "assign" }, "Assign or change"),
          h("option", { value: "revoke" }, "Revoke"))),
      h("label", null, "Account ID",
        h("input", { name: "subjectAccountId", maxLength: 128 })),
      h("label", null, "Assignment ID",
        h("input", { name: "assignmentId", maxLength: 128 })),
      h("label", null, "Role",
        h("select", { name: "role", defaultValue: "read_only" },
          ["super_admin", "operations", "support", "read_only"].map((role) =>
            h("option", { key: role, value: role }, role)))),
      h("label", null, "Expected version",
        h("input", { name: "expectedVersion", type: "number", min: 0, required: true })),
      h("label", null, "Reason",
        h("select", { name: "reasonCode", defaultValue: "access_review" },
          reasons.map((reason) => h("option", { key: reason, value: reason }, reason)))),
      h("input", { name: "idempotencyKey", type: "hidden", value: randomUUID() }),
      h("button", { type: "submit" }, "Confirm role change")));
}
