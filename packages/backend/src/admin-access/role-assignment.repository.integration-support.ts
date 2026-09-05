import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  adminCapabilityPolicies,
  adminRoleAssignments,
  authUsers,
  type Database,
} from "@lasoviet/database";
import type { AdminRoleMutationContextV1 } from "@lasoviet/contracts";

let fixtureNumber = 0;

export async function seedRoleMutationFixture(database: Database) {
  fixtureNumber += 1;
  const suffix = `${fixtureNumber}-${randomUUID()}`;
  const actorId = `role-actor-${suffix}`;
  const subjectId = `role-subject-${suffix}`;
  const actorAssignmentId = `role-actor-assignment-${suffix}`;

  await database.insert(authUsers).values([
    {
      id: actorId,
      name: "Role Administrator",
      email: `role-actor-${suffix}@example.test`,
      emailVerified: true,
    },
    {
      id: subjectId,
      name: "Role Subject",
      email: `role-subject-${suffix}@example.test`,
      emailVerified: true,
    },
  ]);
  await database.insert(adminRoleAssignments).values({
    id: actorAssignmentId,
    userId: actorId,
    role: "super_admin",
    assignmentVersion: 1,
  });
  const [policy] = await database
    .select({ id: adminCapabilityPolicies.id })
    .from(adminCapabilityPolicies)
    .where(
      and(
        eq(adminCapabilityPolicies.role, "super_admin"),
        eq(adminCapabilityPolicies.capability, "admin.roles.manage"),
        eq(adminCapabilityPolicies.active, true),
      ),
    )
    .limit(1);

  if (policy === undefined) {
    throw new Error("ROLE_MUTATION_TEST_POLICY_MISSING");
  }
  const policyId = policy.id;

  const context: AdminRoleMutationContextV1 = {
    access: {
      actorId,
      roleAssignmentId: actorAssignmentId,
      role: "super_admin",
      capabilities: ["admin.roles.manage"],
    },
    requestId: `request-${suffix}`,
    traceId: `trace-${suffix}`,
    idempotencyKey: `role-key-${suffix}`,
    reasonCode: "access_role_change",
  };

  return { actorId, actorAssignmentId, context, policyId, subjectId };
}
