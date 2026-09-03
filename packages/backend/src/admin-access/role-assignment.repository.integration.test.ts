import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { and, eq, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminAuditLogs,
  adminRoleAssignments,
  adminRoleMutationRequests,
  createDatabase,
  runMigrations,
  type Database,
} from "@lasoviet/database";

import { createDatabaseRoleAssignmentRepository } from "./role-assignment.repository.js";
import { seedRoleMutationFixture } from "./role-assignment.repository.integration-support.js";

describe("database role assignment repository", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_role_assignment_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    if (container) await container.stop();
  }, 30_000);

  async function repository() {
    const database = createDatabase(databaseUrl);
    return { database, repository: createDatabaseRoleAssignmentRepository(database) };
  }

  it("keeps assignment history monotonic with exactly one active assignment", async () => {
    const { database, repository: roles } = await repository();
    const fixture = await seedRoleMutationFixture(database);
    const assigned = await roles.mutate({
      kind: "assign", context: fixture.context, subjectAccountId: fixture.subjectId,
      role: "operations", expectedVersion: 0,
    });
    if (!assigned.ok) throw new Error("Expected assignment");
    const revoked = await roles.mutate({
      kind: "revoke", context: { ...fixture.context, idempotencyKey: `${fixture.context.idempotencyKey}-revoke` },
      assignmentId: assigned.value.assignmentId, expectedVersion: 1,
    });
    expect(revoked).toMatchObject({ ok: true });
    const reassigned = await roles.mutate({
      kind: "assign", context: { ...fixture.context, idempotencyKey: `${fixture.context.idempotencyKey}-reassign` },
      subjectAccountId: fixture.subjectId, role: "support", expectedVersion: 1,
    });
    expect(reassigned).toMatchObject({ ok: true, value: { version: 2 } });
    expect(await database.select().from(adminRoleAssignments).where(
      eq(adminRoleAssignments.userId, fixture.subjectId),
    )).toEqual(expect.arrayContaining([
      expect.objectContaining({ assignmentVersion: 1, revokedAt: expect.any(Date) }),
      expect.objectContaining({ assignmentVersion: 2, revokedAt: null }),
    ]));
    await database.$client.end();
  }, 120_000);

  it("replays matching results and stores one receipt with two success audits", async () => {
    const { database, repository: roles } = await repository();
    const fixture = await seedRoleMutationFixture(database);
    const command = {
      kind: "assign" as const, context: fixture.context, subjectAccountId: fixture.subjectId,
      role: "operations" as const, expectedVersion: 0,
    };
    const [first, replay] = await Promise.all([roles.mutate(command), roles.mutate(command)]);
    expect(first).toMatchObject({ ok: true });
    expect(replay).toMatchObject({ ok: true, value: { replayed: true } });
    expect(await database.select().from(adminRoleMutationRequests).where(
      eq(adminRoleMutationRequests.actorId, fixture.actorId),
    )).toHaveLength(1);
    expect(await database.select().from(adminAuditLogs).where(
      eq(adminAuditLogs.actorId, fixture.actorId),
    )).toHaveLength(2);
    await database.$client.end();
  }, 120_000);

  it("records and replays conflict outcomes for unknown revokes and payload mismatches", async () => {
    const { database, repository: roles } = await repository();
    const fixture = await seedRoleMutationFixture(database);
    const unknown = {
      kind: "revoke" as const, context: fixture.context,
      assignmentId: "missing-assignment", expectedVersion: 1,
    };
    await expect(roles.mutate(unknown)).resolves.toMatchObject({
      ok: false, error: { code: "ROLE_ASSIGNMENT_CONFLICT" },
    });
    await expect(roles.mutate(unknown)).resolves.toMatchObject({
      ok: false, error: { code: "ROLE_ASSIGNMENT_CONFLICT" },
    });
    const changed = await roles.mutate({
      kind: "assign", context: fixture.context, subjectAccountId: fixture.subjectId,
      role: "operations", expectedVersion: 0,
    });
    expect(changed).toMatchObject({ ok: false, error: { code: "ROLE_ASSIGNMENT_CONFLICT" } });
    expect(await database.select().from(adminRoleMutationRequests).where(
      eq(adminRoleMutationRequests.actorId, fixture.actorId),
    )).toHaveLength(2);
    expect(await database.select().from(adminAuditLogs).where(
      eq(adminAuditLogs.actorId, fixture.actorId),
    )).toHaveLength(2);
    await database.$client.end();
  }, 120_000);

  it("records and replays a nonexistent assignment target without mutating roles", async () => {
    const { database, repository: roles } = await repository();
    const fixture = await seedRoleMutationFixture(database);
    const command = {
      kind: "assign" as const,
      context: fixture.context,
      subjectAccountId: "missing-role-subject",
      role: "operations" as const,
      expectedVersion: 0,
    };

    await expect(roles.mutate(command)).resolves.toMatchObject({
      ok: false, error: { code: "ROLE_ASSIGNMENT_CONFLICT" },
    });
    await expect(roles.mutate(command)).resolves.toMatchObject({
      ok: false, error: { code: "ROLE_ASSIGNMENT_CONFLICT" },
    });
    expect(await database.select().from(adminRoleAssignments).where(
      eq(adminRoleAssignments.userId, command.subjectAccountId),
    )).toHaveLength(0);
    expect(await database.select().from(adminAuditLogs).where(
      eq(adminAuditLogs.actorId, fixture.actorId),
    )).toHaveLength(1);
    expect(await database.select().from(adminRoleMutationRequests).where(
      eq(adminRoleMutationRequests.actorId, fixture.actorId),
    )).toHaveLength(1);
    await database.$client.end();
  }, 120_000);

  it("replays self-escalation denial with the active authority references", async () => {
    const { database, repository: roles } = await repository();
    const fixture = await seedRoleMutationFixture(database);
    const command = {
      kind: "assign" as const, context: fixture.context, subjectAccountId: fixture.actorId,
      role: "super_admin" as const, expectedVersion: 1,
    };
    await expect(roles.mutate(command)).resolves.toMatchObject({
      ok: false, error: { code: "ROLE_ASSIGNMENT_SELF_ESCALATION_DENIED" },
    });
    await expect(roles.mutate(command)).resolves.toMatchObject({
      ok: false, error: { code: "ROLE_ASSIGNMENT_SELF_ESCALATION_DENIED" },
    });
    expect(await database.select().from(adminAuditLogs).where(and(
      eq(adminAuditLogs.actorId, fixture.actorId),
      eq(adminAuditLogs.roleAssignmentId, fixture.actorAssignmentId),
      eq(adminAuditLogs.capabilityPolicyId, fixture.policyId),
    ))).toHaveLength(1);
    await database.$client.end();
  }, 120_000);

  it("does not replay a prior success after the actor authority becomes stale", async () => {
    const { database, repository: roles } = await repository();
    const fixture = await seedRoleMutationFixture(database);
    const command = {
      kind: "assign" as const, context: fixture.context, subjectAccountId: fixture.subjectId,
      role: "operations" as const, expectedVersion: 0,
    };
    await expect(roles.mutate(command)).resolves.toMatchObject({ ok: true });
    await database.update(adminRoleAssignments).set({ revokedAt: new Date() }).where(
      eq(adminRoleAssignments.id, fixture.actorAssignmentId),
    );
    await expect(roles.mutate(command)).resolves.toMatchObject({
      ok: false, error: { code: "ROLE_ASSIGNMENT_FORBIDDEN" },
    });
    await database.$client.end();
  }, 120_000);

  it("rolls back the mutation, both audits, and receipt when an audit insert fails", async () => {
    const { database, repository: roles } = await repository();
    const fixture = await seedRoleMutationFixture(database);
    await database.execute(sql`
      CREATE FUNCTION admin_role_test_fail_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.operation = 'admin.role.assigned' THEN RAISE EXCEPTION 'forced audit failure'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await database.execute(sql`
      CREATE TRIGGER admin_role_test_fail_audit_trigger
      BEFORE INSERT ON admin_audit_logs
      FOR EACH ROW EXECUTE FUNCTION admin_role_test_fail_audit();
    `);
    await expect(roles.mutate({
      kind: "assign", context: fixture.context, subjectAccountId: fixture.subjectId,
      role: "operations", expectedVersion: 0,
    })).resolves.toMatchObject({ ok: false, error: { code: "ROLE_ASSIGNMENT_CONFLICT" } });
    expect(await database.select().from(adminRoleAssignments).where(and(
      eq(adminRoleAssignments.userId, fixture.subjectId),
      isNull(adminRoleAssignments.revokedAt),
    ))).toHaveLength(0);
    expect(await database.select().from(adminAuditLogs).where(
      eq(adminAuditLogs.actorId, fixture.actorId),
    )).toHaveLength(0);
    expect(await database.select().from(adminRoleMutationRequests).where(
      eq(adminRoleMutationRequests.actorId, fixture.actorId),
    )).toHaveLength(0);
    await database.$client.end();
  }, 120_000);
});
