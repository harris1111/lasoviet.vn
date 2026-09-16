import { randomUUID } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";

import {
  adminAuditLogs,
  adminRoleAssignments,
  authUsers,
  createDatabase,
  type Database,
} from "@lasoviet/database";

const BOOTSTRAP_OPERATION = "admin.bootstrap.first_super_admin";
const BOOTSTRAP_LOCK = "admin_bootstrap:first_super_admin";
const BOOTSTRAP_REASON = "access_onboarding";

export type AdminBootstrapInput = {
  accountId: string;
  requestId: string;
  idempotencyKey: string;
  reasonCode: typeof BOOTSTRAP_REASON;
};

export type AdminBootstrapResult = {
  assignmentId: string;
  replayed: boolean;
};

export async function closeDatabase(database: Database): Promise<void> {
  await (
    database as Database & { $client: { end(): Promise<unknown> } }
  ).$client.end();
}

function fail(code: string): never {
  throw new Error(code);
}

function requiredArgument(
  argumentsList: string[],
  name: string,
): string {
  const prefix = `--${name}=`;
  const value = argumentsList.find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
  if (value === undefined || value === "" || value.length > 128) {
    fail("ADMIN_BOOTSTRAP_INVALID_INPUT");
  }
  return value;
}

export function parseAdminBootstrapArguments(
  argumentsList: string[],
): AdminBootstrapInput {
  const allowed = new Set([
    "--account-id",
    "--request-id",
    "--idempotency-key",
    "--reason",
  ]);
  const argumentNames = argumentsList.map((argument) =>
    argument.slice(0, argument.indexOf("=")),
  );
  if (
    argumentsList.length !== 4 ||
    new Set(argumentNames).size !== allowed.size ||
    argumentNames.some((name) => !allowed.has(name)) ||
    argumentsList.some((argument) => !argument.includes("="))
  ) {
    fail("ADMIN_BOOTSTRAP_INVALID_INPUT");
  }

  const accountId = requiredArgument(argumentsList, "account-id");
  const requestId = requiredArgument(argumentsList, "request-id");
  const idempotencyKey = requiredArgument(argumentsList, "idempotency-key");
  const reasonCode = requiredArgument(argumentsList, "reason");
  if (reasonCode !== BOOTSTRAP_REASON) {
    fail("ADMIN_BOOTSTRAP_INVALID_REASON");
  }
  return { accountId, requestId, idempotencyKey, reasonCode };
}

async function replay(
  transaction: Database,
  input: AdminBootstrapInput,
): Promise<AdminBootstrapResult | undefined> {
  const [prior] = await transaction
    .select({
      assignmentId: adminAuditLogs.roleAssignmentId,
    })
    .from(adminAuditLogs)
    .where(
      and(
        eq(adminAuditLogs.operation, BOOTSTRAP_OPERATION),
        eq(adminAuditLogs.targetType, "admin_account"),
        eq(adminAuditLogs.targetId, input.accountId),
        eq(adminAuditLogs.requestId, input.requestId),
        eq(adminAuditLogs.idempotencyKey, input.idempotencyKey),
        eq(adminAuditLogs.reasonCode, input.reasonCode),
        eq(adminAuditLogs.policyResult, "allowed"),
      ),
    )
    .limit(1)
    .for("update");
  if (prior?.assignmentId === null || prior === undefined) return undefined;

  const [assignment] = await transaction
    .select({ id: adminRoleAssignments.id })
    .from(adminRoleAssignments)
    .where(
      and(
        eq(adminRoleAssignments.id, prior.assignmentId),
        eq(adminRoleAssignments.userId, input.accountId),
        eq(adminRoleAssignments.role, "super_admin"),
        eq(adminRoleAssignments.assignmentVersion, 1),
        isNull(adminRoleAssignments.revokedAt),
      ),
    )
    .limit(1)
    .for("update");
  return assignment === undefined
    ? undefined
    : { assignmentId: assignment.id, replayed: true };
}

export async function bootstrapFirstSuperAdmin(
  database: Database,
  input: AdminBootstrapInput,
): Promise<AdminBootstrapResult> {
  return database.transaction(async (transaction) => {
    const tx = transaction as Database;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${BOOTSTRAP_LOCK}))`,
    );

    const prior = await replay(tx, input);
    if (prior !== undefined) return prior;

    const [target] = await tx
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(
        and(
          eq(authUsers.id, input.accountId),
          eq(authUsers.emailVerified, true),
          eq(authUsers.isAnonymous, false),
        ),
      )
      .limit(1)
      .for("update");
    if (target === undefined) fail("ADMIN_BOOTSTRAP_TARGET_INELIGIBLE");

    const [active] = await tx
      .select({ id: adminRoleAssignments.id })
      .from(adminRoleAssignments)
      .where(isNull(adminRoleAssignments.revokedAt))
      .limit(1)
      .for("update");
    if (active !== undefined) fail("ADMIN_BOOTSTRAP_ALREADY_INITIALIZED");

    const assignmentId = randomUUID();
    await tx.insert(adminRoleAssignments).values({
      id: assignmentId,
      userId: target.id,
      role: "super_admin",
      assignmentVersion: 1,
    });
    await tx.insert(adminAuditLogs).values({
      actorId: target.id,
      roleAssignmentId: assignmentId,
      capability: "admin.roles.manage",
      operation: BOOTSTRAP_OPERATION,
      targetType: "admin_account",
      targetId: target.id,
      requestId: input.requestId,
      traceId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      reasonCode: input.reasonCode,
      policyResult: "allowed",
      redactionLevel: "redacted",
      beforeVersion: 0,
      afterVersion: 1,
      resultSummary: { outcome: "allowed", role: "super_admin" },
    });
    return { assignmentId, replayed: false };
  });
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.trim() === "") {
    fail("ADMIN_BOOTSTRAP_DATABASE_UNAVAILABLE");
  }
  const database = createDatabase(databaseUrl);
  try {
    const result = await bootstrapFirstSuperAdmin(
      database,
      parseAdminBootstrapArguments(process.argv.slice(2)),
    );
    process.stdout.write(
      `${JSON.stringify({ assignmentId: result.assignmentId, replayed: result.replayed })}\n`,
    );
  } finally {
    await closeDatabase(database);
  }
}

if (process.argv[1]?.endsWith("admin-bootstrap-cli.js")) {
  void main().catch((error: unknown) => {
    const code = error instanceof Error ? error.message : "ADMIN_BOOTSTRAP_FAILED";
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}
