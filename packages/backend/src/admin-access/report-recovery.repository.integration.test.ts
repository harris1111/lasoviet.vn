import { randomUUID } from "node:crypto";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TIER_2_ENTITLEMENT_SCOPE,
  type AdminReportRecoveryContextV1,
} from "@lasoviet/contracts";
import {
  adminAuditLogs,
  adminCapabilityPolicies,
  adminReportRecoveryReceipts,
  adminRoleAssignments,
  authUsers,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  outbox,
  reportReservations,
  reportVersions,
  runMigrations,
  type Database,
} from "@lasoviet/database";

import { createDatabaseReportRecoveryRepository } from "./report-recovery.repository.js";

describe("database admin report recovery repository", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  let sequence = 0;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_admin_report_recovery_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    if (container) await container.stop();
  }, 30_000);

  function database() {
    return createDatabase(databaseUrl);
  }

  async function seedFixture(options: {
    errorCode?: string;
    stateVersion?: number;
    timing?: "v1" | "v2";
  } = {}) {
    sequence += 1;
    const suffix = `${sequence}-${randomUUID()}`;
    const actorId = `report-recovery-actor-${suffix}`;
    const assignmentId = `report-recovery-assignment-${suffix}`;
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const orderId = randomUUID();
    const entitlementId = randomUUID();

    const db = database();
    await db.insert(authUsers).values({
      id: actorId,
      name: "Report Recovery Administrator",
      email: `${actorId}@example.test`,
      emailVerified: true,
    });
    await db.insert(adminRoleAssignments).values({
      id: assignmentId,
      userId: actorId,
      role: "super_admin",
      assignmentVersion: 1,
    });
    const [policy] = await db
      .select({ id: adminCapabilityPolicies.id })
      .from(adminCapabilityPolicies)
      .where(and(
        eq(adminCapabilityPolicies.role, "super_admin"),
        eq(adminCapabilityPolicies.capability, "admin.reports.regenerate"),
      ))
      .limit(1);
    if (policy === undefined) throw new Error("REPORT_RECOVERY_POLICY_MISSING");

    await db.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `INV-REPORT-RECOVERY-${suffix}`,
      chartId: `chart-${suffix}`,
      chartVersionId: `chart-version-${suffix}`,
      ownerId: actorId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await db.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `chart-${suffix}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: actorId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    await db.insert(reportReservations).values({
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId: `chart-version-${suffix}`,
      evidenceVersionId: `evidence-${suffix}`,
      knowledgeVersionId: `knowledge-${suffix}`,
      promptVersion: `prompt-${suffix}`,
      reportConfigVersion: `config-${suffix}`,
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "terminal_failure",
      stateVersion: options.stateVersion ?? 3,
      lastErrorCode: options.errorCode ?? "AI_TIMEOUT",
      ...(options.timing === "v2"
        ? {
            asOfDate: "2026-09-16",
            targetYear: 2026,
            timingRuleVersion: "ziwei.timing.v1",
            sensitivityRuleVersion: "ziwei.sensitivity.v1",
          }
        : {}),
    });
    await db.$client.end();

    const context: AdminReportRecoveryContextV1 = {
      access: {
        actorId,
        roleAssignmentId: assignmentId,
        role: "super_admin",
        capabilities: ["admin.reports.regenerate"],
      },
      requestId: `request-${suffix}`,
      traceId: `trace-${suffix}`,
      idempotencyKey: `recovery-${suffix}`,
      reasonCode: "provider_transient_failure",
    };
    return {
      actorId,
      assignmentId,
      context,
      entitlementId,
      policyId: policy.id,
      reportId,
      reportVersionId,
      stateVersion: options.stateVersion ?? 3,
    };
  }

  function command(fixture: Awaited<ReturnType<typeof seedFixture>>) {
    return {
      context: fixture.context,
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: fixture.stateVersion,
    };
  }

  function invalidOutputCommand(
    fixture: Awaited<ReturnType<typeof seedFixture>>,
  ) {
    return {
      ...command(fixture),
      context: {
        ...fixture.context,
        reasonCode: "incident_recovery" as const,
      },
    };
  }

  async function rowsFor(
    db: Database,
    fixture: Awaited<ReturnType<typeof seedFixture>>,
  ) {
    return {
      audits: await db.select().from(adminAuditLogs).where(
        eq(adminAuditLogs.targetId, fixture.reportVersionId),
      ),
      receipts: await db.select().from(adminReportRecoveryReceipts).where(
        eq(
          adminReportRecoveryReceipts.targetReportVersionId,
          fixture.reportVersionId,
        ),
      ),
      events: await db.select().from(outbox).where(
        eq(outbox.aggregateId, fixture.reportVersionId),
      ),
      reservations: await db.select().from(reportReservations).where(
        eq(reportReservations.reportVersionId, fixture.reportVersionId),
      ),
    };
  }

  it("recovers once and replays the stored success without duplicate audits or outbox", async () => {
    const fixture = await seedFixture({ timing: "v2" });
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);

    await expect(repository.recoverTransientFailure(command(fixture))).resolves.toEqual({
      ok: true,
      value: {
        reportVersionId: fixture.reportVersionId,
        stateVersion: 4,
        replayed: false,
      },
    });
    await expect(repository.recoverTransientFailure(command(fixture))).resolves.toEqual({
      ok: true,
      value: {
        reportVersionId: fixture.reportVersionId,
        stateVersion: 4,
        replayed: true,
      },
    });

    const rows = await rowsFor(db, fixture);
    expect(rows.receipts).toHaveLength(1);
    expect(rows.events).toHaveLength(1);
    expect(rows.events[0]?.eventType).toBe("report.generation.requested.v2");
    expect(rows.audits).toHaveLength(2);
    expect(rows.audits.map((row) => row.operation).sort()).toEqual([
      "admin.report.recovery.authorization",
      "admin.report.recovery.requested",
    ]);
    expect(rows.audits).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actorId: fixture.actorId,
        roleAssignmentId: fixture.assignmentId,
        capabilityPolicyId: fixture.policyId,
        capability: "admin.reports.regenerate",
        targetType: "report_version",
        targetId: fixture.reportVersionId,
        beforeVersion: 3,
        afterVersion: 4,
        redactionLevel: "redacted",
        resultSummary: { outcome: "allowed" },
      }),
    ]));
    expect(rows.reservations).toEqual([
      expect.objectContaining({
        status: "requested",
        stateVersion: 4,
        lastErrorCode: null,
        activeJobId: null,
        nextAttemptAt: null,
        asOfDate: "2026-09-16",
        targetYear: 2026,
      }),
    ]);
    await db.$client.end();
  }, 120_000);

  it("revalidates the live capability before replaying a stored success", async () => {
    const fixture = await seedFixture();
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);
    await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
      ok: true,
    });

    await db.update(adminCapabilityPolicies).set({ active: false }).where(
      eq(adminCapabilityPolicies.id, fixture.policyId),
    );
    try {
      await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_RECOVERY_CONFLICT" },
      });
      const rows = await rowsFor(db, fixture);
      expect(rows.receipts).toHaveLength(1);
      expect(rows.audits).toHaveLength(2);
      expect(rows.events).toHaveLength(1);
    } finally {
      await db.update(adminCapabilityPolicies).set({ active: true }).where(
        eq(adminCapabilityPolicies.id, fixture.policyId),
      );
      await db.$client.end();
    }
  }, 120_000);

  it("persists one denied authorization audit and receipt when live authority is absent", async () => {
    const fixture = await seedFixture();
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);
    await db.update(adminCapabilityPolicies).set({ active: false }).where(
      eq(adminCapabilityPolicies.id, fixture.policyId),
    );
    try {
      await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_RECOVERY_FORBIDDEN" },
      });
      await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_RECOVERY_FORBIDDEN" },
      });
      const rows = await rowsFor(db, fixture);
      expect(rows.receipts).toHaveLength(1);
      expect(rows.events).toHaveLength(0);
      expect(rows.audits).toEqual([
        expect.objectContaining({
          operation: "admin.report.recovery.authorization",
          policyResult: "denied",
          resultSummary: {
            outcome: "denied",
            code: "REPORT_RECOVERY_FORBIDDEN",
          },
        }),
      ]);
    } finally {
      await db.update(adminCapabilityPolicies).set({ active: true }).where(
        eq(adminCapabilityPolicies.id, fixture.policyId),
      );
      await db.$client.end();
    }
  }, 120_000);

  it("rejects malformed or non-original stored success receipts without false replay", async () => {
    for (const corruptResult of [
      {
        reportVersionId: "placeholder",
        stateVersion: 4,
        replayed: false,
        unexpected: true,
      },
      {
        reportVersionId: "placeholder",
        stateVersion: 4,
        replayed: true,
      },
    ]) {
      const fixture = await seedFixture();
      const db = database();
      const repository = createDatabaseReportRecoveryRepository(db);
      await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
        ok: true,
      });
      await db.update(adminReportRecoveryReceipts).set({
        result: {
          ...corruptResult,
          reportVersionId: fixture.reportVersionId,
        },
      }).where(and(
        eq(adminReportRecoveryReceipts.actorId, fixture.actorId),
        eq(
          adminReportRecoveryReceipts.idempotencyKey,
          fixture.context.idempotencyKey,
        ),
      ));

      await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_RECOVERY_CONFLICT" },
      });
      const rows = await rowsFor(db, fixture);
      expect(rows.audits).toHaveLength(2);
      expect(rows.events).toHaveLength(1);
      await db.$client.end();
    }
  }, 120_000);

  it("rejects a stored success whose receipt target differs from the command target", async () => {
    const fixture = await seedFixture();
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);
    await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
      ok: true,
    });
    await db.update(adminReportRecoveryReceipts).set({
      targetReportVersionId: randomUUID(),
    }).where(and(
      eq(adminReportRecoveryReceipts.actorId, fixture.actorId),
      eq(
        adminReportRecoveryReceipts.idempotencyKey,
        fixture.context.idempotencyKey,
      ),
    ));

    await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    expect(await db.select().from(adminReportRecoveryReceipts).where(and(
      eq(adminReportRecoveryReceipts.actorId, fixture.actorId),
      eq(
        adminReportRecoveryReceipts.idempotencyKey,
        fixture.context.idempotencyKey,
      ),
    ))).toHaveLength(1);
    expect(await db.select().from(adminAuditLogs).where(
      eq(adminAuditLogs.targetId, fixture.reportVersionId),
    )).toHaveLength(2);
    expect(await db.select().from(outbox).where(
      eq(outbox.aggregateId, fixture.reportVersionId),
    )).toHaveLength(1);
    await db.$client.end();
  }, 120_000);

  it("replays a valid stored failure deterministically without new audit or outbox", async () => {
    const fixture = await seedFixture();
    const missingReportVersionId = randomUUID();
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);
    const missingCommand = {
      ...command(fixture),
      reportVersionId: missingReportVersionId,
    };

    await expect(repository.recoverTransientFailure(missingCommand)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_NOT_FOUND" },
    });
    await expect(repository.recoverTransientFailure(missingCommand)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_NOT_FOUND" },
    });
    expect(await db.select().from(adminReportRecoveryReceipts).where(and(
      eq(adminReportRecoveryReceipts.actorId, fixture.actorId),
      eq(
        adminReportRecoveryReceipts.idempotencyKey,
        fixture.context.idempotencyKey,
      ),
    ))).toHaveLength(1);
    expect(await db.select().from(adminAuditLogs).where(
      eq(adminAuditLogs.targetId, missingReportVersionId),
    )).toHaveLength(2);
    expect(await db.select().from(outbox).where(
      eq(outbox.aggregateId, missingReportVersionId),
    )).toHaveLength(0);
    await db.$client.end();
  }, 120_000);

  it("fails closed for malformed, extra-field, and unknown stored failure receipts", async () => {
    for (const corruptResult of [
      { code: "REPORT_NOT_FOUND", extra: true },
      { code: "REPORT_UNKNOWN" },
      { code: 42 },
    ]) {
      const fixture = await seedFixture();
      const missingReportVersionId = randomUUID();
      const db = database();
      const repository = createDatabaseReportRecoveryRepository(db);
      const missingCommand = {
        ...command(fixture),
        reportVersionId: missingReportVersionId,
      };
      await expect(repository.recoverTransientFailure(missingCommand)).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_NOT_FOUND" },
      });
      await db.update(adminReportRecoveryReceipts).set({
        result: corruptResult,
      }).where(and(
        eq(adminReportRecoveryReceipts.actorId, fixture.actorId),
        eq(
          adminReportRecoveryReceipts.idempotencyKey,
          fixture.context.idempotencyKey,
        ),
      ));

      await expect(repository.recoverTransientFailure(missingCommand)).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_RECOVERY_CONFLICT" },
      });
      expect(await db.select().from(adminAuditLogs).where(
        eq(adminAuditLogs.targetId, missingReportVersionId),
      )).toHaveLength(2);
      expect(await db.select().from(outbox).where(
        eq(outbox.aggregateId, missingReportVersionId),
      )).toHaveLength(0);
      await db.$client.end();
    }
  }, 120_000);

  it("fails closed when a stored failure receipt target differs from the command target", async () => {
    const fixture = await seedFixture();
    const missingReportVersionId = randomUUID();
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);
    const missingCommand = {
      ...command(fixture),
      reportVersionId: missingReportVersionId,
    };
    await expect(repository.recoverTransientFailure(missingCommand)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_NOT_FOUND" },
    });
    await db.update(adminReportRecoveryReceipts).set({
      targetReportVersionId: randomUUID(),
    }).where(and(
      eq(adminReportRecoveryReceipts.actorId, fixture.actorId),
      eq(
        adminReportRecoveryReceipts.idempotencyKey,
        fixture.context.idempotencyKey,
      ),
    ));

    await expect(repository.recoverTransientFailure(missingCommand)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    expect(await db.select().from(adminAuditLogs).where(
      eq(adminAuditLogs.targetId, missingReportVersionId),
    )).toHaveLength(2);
    expect(await db.select().from(outbox).where(
      eq(outbox.aggregateId, missingReportVersionId),
    )).toHaveLength(0);
    await db.$client.end();
  }, 120_000);

  it("returns conflict for the same actor key with a different request fingerprint", async () => {
    const fixture = await seedFixture();
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);
    await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
      ok: true,
    });

    await expect(repository.recoverTransientFailure({
      ...command(fixture),
      context: {
        ...fixture.context,
        reasonCode: "incident_recovery",
      },
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    const rows = await rowsFor(db, fixture);
    expect(rows.receipts).toHaveLength(1);
    expect(rows.audits).toHaveLength(2);
    expect(rows.events).toHaveLength(1);
    await db.$client.end();
  }, 120_000);

  it("persists and replays deterministic expected-state and domain failures", async () => {
    const stale = await seedFixture({ stateVersion: 5 });
    const unrelated = await seedFixture({ errorCode: "AI_OUTPUT_INVALID" });
    const immutable = await seedFixture();
    const missing = await seedFixture();
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);

    const staleCommand = {
      ...command(stale),
      expectedStateVersion: 4,
    };
    await expect(repository.recoverTransientFailure(staleCommand)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    await expect(repository.recoverTransientFailure(staleCommand)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    await expect(repository.recoverTransientFailure(command(unrelated))).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });

    await db.insert(reportVersions).values({
      reportId: immutable.reportId,
      reportVersionId: immutable.reportVersionId,
      entitlementId: immutable.entitlementId,
      chartVersionId: "immutable-chart-version",
      evidenceVersionId: "immutable-evidence",
      knowledgeVersionId: "immutable-knowledge",
      promptVersion: "immutable-prompt",
      reportConfigVersion: "immutable-config",
      templateVersion: "immutable-template",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "immutable-provider",
      modelId: "immutable-model",
      structuredContent: {},
      htmlContent: "<p>immutable</p>",
      contentHash: "a".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "immutable-render",
    });
    await expect(repository.recoverTransientFailure(command(immutable))).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_VERSION_CONFLICT" },
    });

    const missingReportVersionId = randomUUID();
    await expect(repository.recoverTransientFailure({
      ...command(missing),
      reportVersionId: missingReportVersionId,
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_NOT_FOUND" },
    });

    const staleRows = await rowsFor(db, stale);
    expect(staleRows.audits).toHaveLength(2);
    expect(staleRows.audits).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operation: "admin.report.recovery.authorization",
        policyResult: "allowed",
        resultSummary: { outcome: "allowed" },
      }),
      expect.objectContaining({
        operation: "admin.report.recovery.command_failed",
        policyResult: "allowed",
        resultSummary: {
          outcome: "failed",
          code: "REPORT_RECOVERY_CONFLICT",
        },
      }),
    ]));
    expect(staleRows.receipts).toHaveLength(1);
    expect(staleRows.events).toHaveLength(0);
    expect(staleRows.reservations[0]).toMatchObject({
      status: "terminal_failure",
      stateVersion: 5,
      lastErrorCode: "AI_TIMEOUT",
    });
    for (const fixture of [unrelated, immutable]) {
      const rows = await rowsFor(db, fixture);
      expect(rows.audits).toHaveLength(2);
      expect(rows.audits.map((row) => row.operation).sort()).toEqual([
        "admin.report.recovery.authorization",
        "admin.report.recovery.command_failed",
      ]);
      expect(rows.audits.every((row) => row.policyResult === "allowed")).toBe(true);
      expect(rows.receipts).toHaveLength(1);
      expect(rows.events).toHaveLength(0);
    }
    expect(await db.select().from(adminReportRecoveryReceipts).where(
      eq(
        adminReportRecoveryReceipts.targetReportVersionId,
        missingReportVersionId,
      ),
    )).toHaveLength(1);
    expect(await db.select().from(adminAuditLogs).where(
      eq(adminAuditLogs.targetId, missingReportVersionId),
    )).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operation: "admin.report.recovery.authorization",
        policyResult: "allowed",
      }),
      expect.objectContaining({
        operation: "admin.report.recovery.command_failed",
        policyResult: "allowed",
        resultSummary: {
          outcome: "failed",
          code: "REPORT_NOT_FOUND",
        },
      }),
    ]));
    await db.$client.end();
  }, 120_000);

  it("fails closed and records malformed legacy timing lineage", async () => {
    const fixture = await seedFixture({ timing: "v2" });
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);
    await db.execute(sql`
      ALTER TABLE "report_reservations"
      DROP CONSTRAINT "report_reservations_timing_lineage_presence"
    `);
    try {
      await db.update(reportReservations).set({ targetYear: null }).where(
        eq(reportReservations.reportVersionId, fixture.reportVersionId),
      );
      await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_TIMING_LINEAGE_INVALID" },
      });
      const rows = await rowsFor(db, fixture);
      expect(rows.audits).toHaveLength(2);
      expect(rows.audits).toEqual(expect.arrayContaining([
        expect.objectContaining({
          operation: "admin.report.recovery.authorization",
          policyResult: "allowed",
          resultSummary: { outcome: "allowed" },
        }),
        expect.objectContaining({
          operation: "admin.report.recovery.command_failed",
          policyResult: "allowed",
          resultSummary: {
            outcome: "failed",
            code: "REPORT_TIMING_LINEAGE_INVALID",
          },
        }),
      ]));
      expect(rows.receipts).toHaveLength(1);
      expect(rows.events).toHaveLength(0);
      expect(rows.reservations[0]).toMatchObject({
        status: "terminal_failure",
        stateVersion: 3,
        lastErrorCode: "AI_TIMEOUT",
      });
    } finally {
      await db.execute(sql`
        UPDATE "report_reservations"
        SET "as_of_date" = NULL,
            "target_year" = NULL,
            "timing_rule_version" = NULL,
            "sensitivity_rule_version" = NULL
        WHERE "report_version_id" = ${fixture.reportVersionId}
      `);
      await db.execute(sql`
        ALTER TABLE "report_reservations"
        ADD CONSTRAINT "report_reservations_timing_lineage_presence"
        CHECK (
          ("as_of_date" IS NULL AND "target_year" IS NULL AND "timing_rule_version" IS NULL AND "sensitivity_rule_version" IS NULL)
          OR
          ("as_of_date" IS NOT NULL AND "target_year" IS NOT NULL AND "timing_rule_version" IS NOT NULL AND "sensitivity_rule_version" IS NOT NULL)
        )
      `);
      await db.$client.end();
    }
  }, 120_000);

  it("rolls back recovery and outbox when required audit or receipt insertion fails", async () => {
    for (const failurePoint of ["audit", "receipt"] as const) {
      const fixture = await seedFixture();
      const db = database();
      const repository = createDatabaseReportRecoveryRepository(db);
      if (failurePoint === "audit") {
        await db.execute(sql`
          CREATE FUNCTION admin_report_recovery_fail_audit() RETURNS trigger AS $$
          BEGIN
            RAISE EXCEPTION 'forced admin report recovery audit failure';
          END;
          $$ LANGUAGE plpgsql
        `);
        await db.execute(sql`
          CREATE TRIGGER admin_report_recovery_fail_audit_trigger
          BEFORE INSERT ON admin_audit_logs
          FOR EACH ROW EXECUTE FUNCTION admin_report_recovery_fail_audit()
        `);
      } else {
        await db.execute(sql`
          CREATE FUNCTION admin_report_recovery_fail_receipt() RETURNS trigger AS $$
          BEGIN
            RAISE EXCEPTION 'forced admin report recovery receipt failure';
          END;
          $$ LANGUAGE plpgsql
        `);
        await db.execute(sql`
          CREATE TRIGGER admin_report_recovery_fail_receipt_trigger
          BEFORE INSERT ON admin_report_recovery_receipts
          FOR EACH ROW EXECUTE FUNCTION admin_report_recovery_fail_receipt()
        `);
      }

      try {
        await expect(repository.recoverTransientFailure(command(fixture))).resolves.toMatchObject({
          ok: false,
          error: { code: "REPORT_RECOVERY_CONFLICT" },
        });
        const rows = await rowsFor(db, fixture);
        expect(rows.audits).toHaveLength(0);
        expect(rows.receipts).toHaveLength(0);
        expect(rows.events).toHaveLength(0);
        expect(rows.reservations[0]).toMatchObject({
          status: "terminal_failure",
          stateVersion: 3,
          lastErrorCode: "AI_TIMEOUT",
        });
      } finally {
        if (failurePoint === "audit") {
          await db.execute(sql`DROP TRIGGER admin_report_recovery_fail_audit_trigger ON admin_audit_logs`);
          await db.execute(sql`DROP FUNCTION admin_report_recovery_fail_audit()`);
        } else {
          await db.execute(sql`DROP TRIGGER admin_report_recovery_fail_receipt_trigger ON admin_report_recovery_receipts`);
          await db.execute(sql`DROP FUNCTION admin_report_recovery_fail_receipt()`);
        }
        await db.$client.end();
      }
    }
  }, 120_000);

  it("recovers invalid output once, replays it, and records the distinct recovery operation", async () => {
    const fixture = await seedFixture({
      errorCode: "AI_OUTPUT_INVALID",
      timing: "v2",
    });
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);
    const recovery = invalidOutputCommand(fixture);

    await expect(repository.recoverInvalidOutputFailure(recovery)).resolves.toMatchObject({
      ok: true,
      value: { stateVersion: 4, replayed: false },
    });
    await expect(repository.recoverInvalidOutputFailure(recovery)).resolves.toMatchObject({
      ok: true,
      value: { stateVersion: 4, replayed: true },
    });

    const rows = await rowsFor(db, fixture);
    expect(rows.events).toHaveLength(1);
    expect(rows.receipts).toEqual([
      expect.objectContaining({
        operation: "admin.report.recovery.invalid_output.requested",
      }),
    ]);
    expect(rows.audits.map((row) => row.operation).sort()).toEqual([
      "admin.report.recovery.authorization",
      "admin.report.recovery.invalid_output.requested",
    ]);
    await db.$client.end();
  }, 120_000);

  it("fails closed for the wrong invalid-output class and stale state", async () => {
    const wrongClass = await seedFixture({ errorCode: "AI_TIMEOUT" });
    const stale = await seedFixture({
      errorCode: "REPORT_SAFETY_REJECTED",
      stateVersion: 5,
    });
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);

    await expect(
      repository.recoverInvalidOutputFailure(invalidOutputCommand(wrongClass)),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    await expect(repository.recoverInvalidOutputFailure({
      ...invalidOutputCommand(stale),
      expectedStateVersion: 4,
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });

    for (const fixture of [wrongClass, stale]) {
      const rows = await rowsFor(db, fixture);
      expect(rows.events).toHaveLength(0);
      expect(rows.receipts).toHaveLength(1);
      expect(rows.audits).toHaveLength(2);
    }
    await db.$client.end();
  }, 120_000);

  it("revalidates authority and rejects idempotency keys reused across recovery operations", async () => {
    const denied = await seedFixture({ errorCode: "AI_OUTPUT_INVALID" });
    const collision = await seedFixture({ errorCode: "AI_TIMEOUT" });
    const db = database();
    const repository = createDatabaseReportRecoveryRepository(db);

    await db.update(adminCapabilityPolicies).set({ active: false }).where(
      eq(adminCapabilityPolicies.id, denied.policyId),
    );
    try {
      await expect(
        repository.recoverInvalidOutputFailure(invalidOutputCommand(denied)),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "REPORT_RECOVERY_FORBIDDEN" },
      });
    } finally {
      await db.update(adminCapabilityPolicies).set({ active: true }).where(
        eq(adminCapabilityPolicies.id, denied.policyId),
      );
    }

    await expect(repository.recoverTransientFailure(command(collision))).resolves.toMatchObject({
      ok: true,
    });
    await expect(
      repository.recoverInvalidOutputFailure(invalidOutputCommand(collision)),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });

    const deniedRows = await rowsFor(db, denied);
    expect(deniedRows.audits).toEqual([
      expect.objectContaining({
        operation: "admin.report.recovery.authorization",
        policyResult: "denied",
      }),
    ]);
    const collisionRows = await rowsFor(db, collision);
    expect(collisionRows.receipts).toHaveLength(1);
    expect(collisionRows.events).toHaveLength(1);
    await db.$client.end();
  }, 120_000);
});
