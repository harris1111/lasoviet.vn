import { randomUUID } from "node:crypto";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminAuditLogs,
  adminRoleAssignments,
  authUsers,
  createDatabase,
  runMigrations,
  type Database,
} from "@lasoviet/database";

import {
  bootstrapFirstSuperAdmin,
  closeDatabase,
} from "./admin-bootstrap-cli.js";

describe("first super admin bootstrap", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_admin_bootstrap_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    if (container !== undefined) await container.stop();
  }, 30_000);

  async function database(): Promise<Database> {
    return createDatabase(databaseUrl);
  }

  it("creates one first super admin and replays an exact rerun", async () => {
    const db = await database();
    const accountId = `bootstrap-account-${randomUUID()}`;
    await db.insert(authUsers).values({
      id: accountId,
      name: "Bootstrap Operator",
      email: `${accountId}@example.test`,
      emailVerified: true,
      isAnonymous: false,
    });
    const input = {
      accountId,
      requestId: "bootstrap-request-1",
      idempotencyKey: "bootstrap-key-1",
      reasonCode: "access_onboarding" as const,
    };

    const created = await bootstrapFirstSuperAdmin(db, input);
    const replayed = await bootstrapFirstSuperAdmin(db, input);

    expect(created).toMatchObject({ replayed: false });
    expect(replayed).toEqual({
      assignmentId: created.assignmentId,
      replayed: true,
    });
    expect(
      await db
        .select()
        .from(adminRoleAssignments)
        .where(eq(adminRoleAssignments.userId, accountId)),
    ).toEqual([
      expect.objectContaining({
        id: created.assignmentId,
        role: "super_admin",
        assignmentVersion: 1,
        revokedAt: null,
      }),
    ]);
    expect(
      await db
        .select()
        .from(adminAuditLogs)
        .where(eq(adminAuditLogs.roleAssignmentId, created.assignmentId)),
    ).toHaveLength(1);
    await closeDatabase(db);
  }, 120_000);

  it("denies bootstrap when any active admin assignment already exists", async () => {
    const db = await database();
    const existingId = `existing-admin-${randomUUID()}`;
    const targetId = `blocked-bootstrap-${randomUUID()}`;
    await db.insert(authUsers).values([
      {
        id: existingId,
        name: "Existing Administrator",
        email: `${existingId}@example.test`,
        emailVerified: true,
        isAnonymous: false,
      },
      {
        id: targetId,
        name: "Bootstrap Target",
        email: `${targetId}@example.test`,
        emailVerified: true,
        isAnonymous: false,
      },
    ]);
    await db.insert(adminRoleAssignments).values({
      id: `existing-assignment-${randomUUID()}`,
      userId: existingId,
      role: "operations",
      assignmentVersion: 1,
    });

    await expect(
      bootstrapFirstSuperAdmin(db, {
        accountId: targetId,
        requestId: "bootstrap-request-2",
        idempotencyKey: "bootstrap-key-2",
        reasonCode: "access_onboarding",
      }),
    ).rejects.toThrow("ADMIN_BOOTSTRAP_ALREADY_INITIALIZED");
    expect(
      await db
        .select()
        .from(adminRoleAssignments)
        .where(eq(adminRoleAssignments.userId, targetId)),
    ).toHaveLength(0);
    await closeDatabase(db);
  }, 120_000);
});
