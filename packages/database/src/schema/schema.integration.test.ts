import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { and, asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createDatabase,
  linkAnonymousActorToAccount,
} from "../runtime.js";
import {
  authAccounts,
  authAnonymousActors,
  authSessions,
  authUsers,
} from "./auth.js";
import {
  commerceOrders,
  commerceEntitlements,
} from "./commerce.js";
import { reportReservations } from "./reports.js";
import {
  TIER_1_ENTITLEMENT_SCOPE,
  TIER_2_ENTITLEMENT_SCOPE,
} from "@lasoviet/contracts";
import {
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  ziweiCharts,
  ziweiChartVersions,
} from "./birth-profile.js";
import { consents, deletionRequests } from "./privacy.js";
import { enqueueOutbox, outbox } from "./outbox.js";
import { auditLogs } from "./audit.js";
import {
  adminAuditLogs,
  adminCapabilityPolicies,
  adminRoleAssignments,
  adminRoleMutationRequests,
} from "./admin-access.js";
import { runMigrations } from "../migrate.js";
import { notificationDeliveries } from "./notifications.js";
import { reportAssets } from "./assets.js";
import { supportCases } from "./support-cases.js";
import { aiModelPricing, aiCallAttempts, aiUsageOutcomes } from "./ai-cost.js";
import {
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsFraudIpRecords,
  analyticsVisitors,
} from "./analytics.js";

describe("database schema integration", () => {
  let container:
    | Awaited<ReturnType<PostgreSqlContainer["start"]>>
    | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  }, 30_000);

  it("applies empty and repeat migrations to one converged schema", async () => {
    const first = await runMigrations(databaseUrl);
    const second = await runMigrations(databaseUrl);

    expect(first.appliedMigrations).toEqual(second.appliedMigrations);
    expect(first.appliedMigrations.length).toBeGreaterThan(0);
  });

  it("exposes PDF asset, support case, and report_failed delivery schema exactly once", () => {
    expect(reportAssets.id).toBeDefined();
    expect(reportAssets.reportVersionId).toBeDefined();
    expect(reportAssets.objectKey).toBeDefined();
    expect(reportAssets.replicaStatus).toBeDefined();
    expect(supportCases.assetId).toBeDefined();
    expect(supportCases.failureStage).toBeDefined();
    expect(notificationDeliveries.kind).toBeDefined();
  });

  it("enforces identity, ownership, privacy, and outbox integrity", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_schema_test";
    const anonymousActorId = "anonymous_schema_test";
    const accountId = "account_schema_test";
    const profileId = "profile_schema_test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Schema Test User",
      email: "schema-test@example.test",
    });

    await expect(
      database.insert(authUsers).values({
        id: "user_schema_duplicate",
        name: "Duplicate User",
        email: "schema-test@example.test",
      }),
    ).rejects.toBeDefined();

    await database.insert(authAccounts).values({
      id: accountId,
      userId,
      providerId: "credential",
      accountId: "schema-test@example.test",
      issuer: "local",
    });

    await expect(
      database.insert(authAccounts).values({
        id: "account_schema_duplicate",
        userId,
        providerId: "credential",
        accountId: "schema-test@example.test",
      }),
    ).rejects.toBeDefined();

    await database.insert(consents).values({
      id: "consent_schema_test",
      userId,
      documentKey: "privacy",
      documentVersion: "2026-09-01",
      purpose: "birth_profile",
    });
    await expect(
      database.insert(consents).values({
        id: "consent_schema_test_duplicate",
        userId,
        documentKey: "privacy",
        documentVersion: "2026-09-01",
        purpose: "birth_profile",
      }),
    ).rejects.toBeDefined();
    await database.insert(deletionRequests).values({
      id: "deletion_schema_test",
      userId,
      requestedAt: new Date("2026-09-01T00:00:00Z"),
      recoverUntil: new Date("2026-10-01T00:00:00Z"),
      purgeAfter: new Date("2026-10-01T00:00:00Z"),
    });

    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await expect(
      database.insert(birthProfiles).values({
        id: "profile_schema_missing_expiry",
        anonymousActorId,
      }),
    ).rejects.toBeDefined();
    await expect(
      database.insert(birthProfiles).values({
        id: "profile_schema_account_expiry",
        userId,
        anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
      }),
    ).rejects.toBeDefined();
    await database.insert(consents).values({
      id: "consent_schema_anonymous",
      anonymousActorId,
      documentKey: "privacy",
      documentVersion: "2026-09-01",
      purpose: "birth_profile",
    });
    await expect(
      database.insert(consents).values({
        id: "consent_schema_anonymous_duplicate",
        anonymousActorId,
        documentKey: "privacy",
        documentVersion: "2026-09-01",
        purpose: "birth_profile",
      }),
    ).rejects.toBeDefined();
    await database.insert(birthProfileRevisions).values({
      id: "profile_revision_schema_test",
      profileId,
      revisionNumber: 1,
      originalInput: { localDate: "1990-01-01", timePrecision: "unknown" },
      normalizedInput: { timePrecision: "unknown" },
      consentVersion: "2026-09-01",
    });

    const insertedEvent = await enqueueOutbox(database, {
      schemaVersion: 1,
      type: "profile.created.v1",
      eventId: "event_schema_test",
      occurredAt: "2026-09-01T00:00:00+00:00",
      traceId: "trace_schema_test",
      actorId: anonymousActorId,
      aggregateType: "account",
      aggregateId: profileId,
      idempotencyKey: "profile-created:profile_schema_test",
      payload: { profileId },
    });

    expect(insertedEvent).toMatchObject({
      eventId: "event_schema_test",
      status: "pending",
      attemptCount: 0,
      leasedUntil: null,
      leasedBy: null,
    });
    await expect(
      enqueueOutbox(database, {
        schemaVersion: 1,
        type: "profile.created.v1",
        eventId: "event_schema_duplicate",
        occurredAt: "2026-09-01T00:00:00+00:00",
        traceId: "trace_schema_test",
        actorId: anonymousActorId,
        aggregateType: "account",
        aggregateId: profileId,
        idempotencyKey: "profile-created:profile_schema_test",
        payload: { profileId },
      }),
    ).rejects.toMatchObject({ code: "OUTBOX_DUPLICATE_KEY" });

    await database.insert(auditLogs).values({
      actorId: anonymousActorId,
      action: "profile.created",
      targetType: "birth_profile",
      targetId: profileId,
      requestId: "request_schema_test",
      metadata: { source: "integration-test" },
    });
    await database.insert(adminRoleAssignments).values({
      id: "admin_assignment_schema_test",
      userId,
      role: "read_only",
    });
    await expect(
      database.insert(adminRoleAssignments).values({
        id: "admin_assignment_duplicate",
        userId,
        role: "operations",
      }),
    ).rejects.toBeDefined();
    await database.insert(adminRoleMutationRequests).values({
      actorId: userId,
      operation: "admin.role.assigned",
      targetId: "admin_assignment_schema_test",
      idempotencyKey: "schema-role-change-1",
      requestFingerprint: "fingerprint-1",
      result: { assignmentId: "admin_assignment_schema_test", version: 1 },
    });
    await database.insert(adminRoleMutationRequests).values({
      actorId: userId,
      operation: "admin.role.assigned",
      targetId: "admin_assignment_schema_test",
      idempotencyKey: "schema-role-change-1",
      requestFingerprint: "fingerprint-2",
      result: { assignmentId: "admin_assignment_schema_test", version: 1 },
    });
    await expect(
      database.insert(adminRoleMutationRequests).values({
        actorId: userId,
        operation: "admin.role.assigned",
        targetId: "admin_assignment_schema_test",
        idempotencyKey: "schema-role-change-1",
        requestFingerprint: "fingerprint-2",
        result: { assignmentId: "admin_assignment_schema_test", version: 1 },
      }),
    ).rejects.toBeDefined();
    expect(
      await database
        .select({
          idempotencyKey: adminRoleMutationRequests.idempotencyKey,
          requestFingerprint: adminRoleMutationRequests.requestFingerprint,
        })
        .from(adminRoleMutationRequests)
        .where(
          and(
            eq(adminRoleMutationRequests.actorId, userId),
            eq(
              adminRoleMutationRequests.idempotencyKey,
              "schema-role-change-1",
            ),
          ),
        )
        .orderBy(asc(adminRoleMutationRequests.requestFingerprint)),
    ).toEqual([
      {
        idempotencyKey: "schema-role-change-1",
        requestFingerprint: "fingerprint-1",
      },
      {
        idempotencyKey: "schema-role-change-1",
        requestFingerprint: "fingerprint-2",
      },
    ]);
    expect(
      await database
        .select({ capability: adminCapabilityPolicies.capability })
        .from(adminCapabilityPolicies)
        .where(eq(adminCapabilityPolicies.role, "read_only"))
        .orderBy(asc(adminCapabilityPolicies.capability)),
    ).toEqual([
      { capability: "admin.audit.read" },
      { capability: "admin.overview.read" },
      { capability: "admin.readiness.read" },
      { capability: "admin.reports.read" },
    ]);
    const [adminAudit] = await database
      .insert(adminAuditLogs)
      .values({
        actorId: userId,
        roleAssignmentId: "admin_assignment_schema_test",
        capability: "admin.overview.read",
        operation: "admin.overview.read",
        targetType: "admin_overview",
        targetId: "overview",
        requestId: "admin-request-schema-test",
        traceId: "admin-trace-schema-test",
        policyResult: "allowed",
        redactionLevel: "redacted",
        resultSummary: { count: 1 },
      })
      .returning();
    await expect(
      database
        .update(adminAuditLogs)
        .set({ operation: "admin.audit.mutated" })
        .where(eq(adminAuditLogs.id, adminAudit!.id)),
    ).rejects.toBeDefined();
    await expect(
      database.delete(adminAuditLogs).where(eq(adminAuditLogs.id, adminAudit!.id)),
    ).rejects.toBeDefined();
    await expect(
      database.insert(adminAuditLogs).values({
        actorId: null,
        roleAssignmentId: null,
        capability: "admin.overview.read",
        operation: "admin.access.read",
        targetType: "admin_overview",
        targetId: "overview",
        requestId: "admin-denied-request",
        traceId: "admin-denied-trace",
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: { outcome: "denied" },
      }),
    ).resolves.toBeDefined();
    const [notification] = await database
      .insert(notificationDeliveries)
      .values({
        idempotencyKey: "auth-email:verification:schema-test",
        kind: "email_verification",
        recipientFingerprint: "recipient-fingerprint-schema-test",
        requestPayload: {
          version: 1,
          kind: "email_verification",
          idempotencyKey: "auth-email:verification:schema-test",
          recipient: "schema-test@example.test",
          locale: "en",
          actionUrl: "https://lasoviet.example/verify",
          requestId: "schema-test-request",
        },
      })
      .returning();

    const [profile] = await database
      .select()
      .from(birthProfiles);
    expect(profile).toMatchObject({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    expect(notification).toMatchObject({
      idempotencyKey: "auth-email:verification:schema-test",
      kind: "email_verification",
      status: "pending",
      attemptCount: 0,
      sendingLeaseExpiresAt: null,
      sentAt: null,
    });

    const [reportReadyNotification] = await database
      .insert(notificationDeliveries)
      .values({
        idempotencyKey: "report-ready-email:ver-schema-test:acc-schema-test",
        kind: "report_ready",
        recipientFingerprint: "recipient-fingerprint-schema-test",
        requestPayload: {
          version: 1,
          kind: "report_ready",
          idempotencyKey: "report-ready-email:ver-schema-test:acc-schema-test",
          recipient: "schema-test@example.test",
          locale: "vi",
          actionUrl: "https://lasoviet.net/bao-cao/report-schema-test",
          requestId: "trace-schema-test",
        },
      })
      .returning();
    expect(reportReadyNotification).toMatchObject({
      idempotencyKey: "report-ready-email:ver-schema-test:acc-schema-test",
      kind: "report_ready",
      status: "pending",
      attemptCount: 0,
      sendingLeaseExpiresAt: null,
      sentAt: null,
    });

    await database.$client.end();
  }, 120_000);

  it("links an anonymous profile to an account without duplication", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_link_test";
    const anonymousActorId = "anonymous_link_test";
    const profileId = "profile_link_test";
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await database.insert(authUsers).values({
      id: userId,
      name: "Linked User",
      email: "linked-user@example.test",
    });
    await database.insert(authUsers).values({
      id: anonymousActorId,
      name: "Anonymous Link User",
      email: "anonymous-link-user@example.test",
      isAnonymous: true,
    });
    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: futureExpiry,
    });
    await database.insert(authSessions).values({
      id: "anonymous_link_session",
      userId: anonymousActorId,
      token: "anonymous-link-token",
      expiresAt: futureExpiry,
    });
    await database.insert(auditLogs).values({
      actorId: anonymousActorId,
      action: "anonymous.profile.created",
      targetType: "birth_profile",
      targetId: profileId,
      requestId: "anonymous-link-request",
      metadata: {},
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: futureExpiry,
    });

    await expect(
      linkAnonymousActorToAccount(database, anonymousActorId, userId),
    ).resolves.toMatchObject({
      ok: true,
      value: { anonymousActorId, userId },
    });

    const [profile] = await database
      .select()
      .from(birthProfiles)
      .where(eq(birthProfiles.id, profileId));
    const [actor] = await database
      .select()
      .from(authAnonymousActors)
      .where(eq(authAnonymousActors.id, anonymousActorId));

    expect(profile).toMatchObject({
      id: profileId,
      userId,
      anonymousActorId: null,
      anonymousExpiresAt: null,
    });
    expect(actor).toMatchObject({ id: anonymousActorId, linkedUserId: userId });
    expect(
      (await database.select().from(authUsers)).find(
        (user) => user.id === anonymousActorId,
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(authSessions)).find(
        (session) => session.id === "anonymous_link_session",
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(auditLogs)).find(
        (audit) =>
          audit.actorId === anonymousActorId &&
          audit.action === "anonymous.profile.created",
      ),
    ).toBeDefined();

    await database.$client.end();
  }, 120_000);

  it("refuses to link an expired anonymous actor", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "user_expired_link_test",
      name: "Expired Link User",
      email: "expired-link-user@example.test",
    });
    await database.insert(authAnonymousActors).values({
      id: "anonymous_expired_link_test",
      expiresAt: new Date("2026-08-31T23:59:59Z"),
    });

    await expect(
      linkAnonymousActorToAccount(
        database,
        "anonymous_expired_link_test",
        "user_expired_link_test",
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_LINK_CONFLICT" },
    });
    await database.$client.end();
  }, 120_000);

  it("links an anonymous actor with no profile and removes its old identity", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_no_profile_link_test";
    const anonymousActorId = "anonymous_no_profile_link_test";
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await database.insert(authUsers).values([
      {
        id: userId,
        name: "No Profile Link Account",
        email: "no-profile-link-account@example.test",
      },
      {
        id: anonymousActorId,
        name: "No Profile Anonymous User",
        email: "no-profile-anonymous@example.test",
        isAnonymous: true,
      },
    ]);
    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: futureExpiry,
    });
    await database.insert(authSessions).values({
      id: "anonymous_no_profile_link_session",
      userId: anonymousActorId,
      token: "anonymous-no-profile-link-token",
      expiresAt: futureExpiry,
    });

    await expect(
      linkAnonymousActorToAccount(database, anonymousActorId, userId),
    ).resolves.toMatchObject({
      ok: true,
      value: { anonymousActorId, userId },
    });
    const [actor] = await database
      .select()
      .from(authAnonymousActors)
      .where(eq(authAnonymousActors.id, anonymousActorId));
    expect(actor).toMatchObject({ linkedUserId: userId });
    expect(
      (await database.select().from(authUsers)).find(
        (user) => user.id === anonymousActorId,
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(authSessions)).find(
        (session) => session.id === "anonymous_no_profile_link_session",
      ),
    ).toBeUndefined();
    await database.$client.end();
  }, 120_000);
  it("enforces non-null entitlement scope and supports Tier-1 and Tier-2 scopes (Acceptance test 1)", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_entitlement_scope_test";
    const orderId1 = "11111111-2222-3333-4444-555555555551";
    const orderId2 = "11111111-2222-3333-4444-555555555552";
    const chartId = "chart_scope_test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Scope Test User",
      email: "scope-test@example.test",
    });

    await database.insert(commerceOrders).values([
      {
        id: orderId1,
        invoiceNumber: "LSV-scope-test-1",
        paymentCode: "LSV123456781",
        chartId,
        chartVersionId: "cv-1",
        ownerId: userId,
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        currency: "VND",
        locale: "vi",
        status: "paid",
      },
      {
        id: orderId2,
        invoiceNumber: "LSV-scope-test-2",
        paymentCode: "LSV123456782",
        chartId,
        chartVersionId: "cv-1",
        ownerId: userId,
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        amount: 19000,
        currency: "VND",
        locale: "vi",
        status: "paid",
      },
    ]);

    // 1. Rejects inserting null scope (NOT NULL constraint)
    await expect(
      database.insert(commerceEntitlements).values({
        id: "22222222-2222-3333-4444-555555555551",
        orderId: orderId1,
        chartId,
        sku: "ZIWEI-IDENTITY-P0",
        ownerId: userId,
        scope: null as any,
      }),
    ).rejects.toBeDefined();

    // 2. Persists Tier-2 entitlement scope
    await database.insert(commerceEntitlements).values({
      id: "22222222-2222-3333-4444-555555555551",
      orderId: orderId1,
      chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    // 3. Persists Tier-1 entitlement scope
    await database.insert(commerceEntitlements).values({
      id: "22222222-2222-3333-4444-555555555552",
      orderId: orderId2,
      chartId,
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      ownerId: userId,
      scope: TIER_1_ENTITLEMENT_SCOPE,
    });

    const rows = await database
      .select()
      .from(commerceEntitlements)
      .where(eq(commerceEntitlements.chartId, chartId));

    expect(rows).toHaveLength(2);
    const tier2Row = rows.find((r) => r.sku === "ZIWEI-IDENTITY-P0");
    const tier1Row = rows.find((r) => r.sku === "ZIWEI-NATAL-EXCERPT-P0");

    expect(tier2Row?.scope).toEqual(TIER_2_ENTITLEMENT_SCOPE);
    expect(tier1Row?.scope).toEqual(TIER_1_ENTITLEMENT_SCOPE);

    await database.$client.end();
  }, 120_000);

  it("migrates and validates ai_model_pricing, ai_call_attempts, ai_usage_outcomes and append-only triggers", async () => {
    const database = createDatabase(databaseUrl);

    // 1. Persists versioned model pricing
    await database.insert(aiModelPricing).values({
      pricingVersion: "v1-20260914",
      providerId: "9router-an",
      modelId: "qwen-2.5-72b-instruct",
      currency: "VND",
      inputPricePerMillion: 15_000n,
      outputPricePerMillion: 60_000n,
      cachedInputPricePerMillion: 3_750n,
      effectiveFrom: new Date("2026-09-14T00:00:00Z"),
      source: "founder_approved_20260914",
      sourceCurrency: "VND",
      sourceReference: "founder_decision_20260914",
      fxSource: "direct_vnd",
      fxRate: 1n,
      fxTimestamp: new Date("2026-09-14T00:00:00Z"),
      referenceMetadata: { note: "test pricing" },
      status: "active",
    });

    // 2. Persists immutable call attempt
    const [attempt] = await database
      .insert(aiCallAttempts)
      .values({
        callId: "call-pg-001",
        attemptNumber: 0,
        purpose: "report",
        providerId: "9router-an",
        requestedModelId: "qwen-2.5-72b-instruct",
        maxOutputTokens: 9_000,
        pricingVersion: "v1-20260914",
        inputPricePerMillion: 15_000n,
        outputPricePerMillion: 60_000n,
        cachedInputPricePerMillion: 3_750n,
        currency: "VND",
        sourceCurrency: "VND",
        sourceReference: "founder_decision_20260914",
        fxSource: "direct_vnd",
        fxRate: 1n,
        fxTimestamp: new Date("2026-09-14T00:00:00Z"),
        pricingSource: "founder_approved_20260914",
      })
      .returning();

    expect(attempt.callId).toBe("call-pg-001");

    // 3. Persists outcome referencing attempt
    const [outcome] = await database
      .insert(aiUsageOutcomes)
      .values({
        attemptId: attempt.id,
        responseModelId: "qwen-2.5-72b-instruct",
        httpStatus: 200,
        inputTokens: 10_000,
        outputTokens: 1_000,
        cachedTokens: 3_000,
        totalTokens: 11_000,
        tokensUnknown: false,
        costMicroVnd: 176250000000n,
        costVnd: 177,
        costStatus: "resolved",
      })
      .returning();

    expect(outcome.costVnd).toBe(177);
    expect(outcome.costMicroVnd).toBe(176250000000n);

    // 4. Verifies append-only triggers reject UPDATE and DELETE
    await expect(
      database
        .update(aiModelPricing)
        .set({ status: "retired" })
        .where(eq(aiModelPricing.pricingVersion, "v1-20260914")),
    ).rejects.toThrow();

    await expect(
      database.delete(aiCallAttempts).where(eq(aiCallAttempts.id, attempt.id)),
    ).rejects.toThrow();

    await expect(
      database.delete(aiUsageOutcomes).where(eq(aiUsageOutcomes.id, outcome.id)),
    ).rejects.toThrow();

    await database.$client.end();
  }, 120_000);

  it("enforces analytics schema constraints, unique idempotency, and foreign key deletion behavior", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_analytics_test";
    const profileId = "profile_analytics_test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Analytics Test User",
      email: "analytics-test@example.test",
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      userId,
    });

    const unlinkedVisitorId = "vis_unlinked_1";
    const unlinkedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 1. Unlinked visitor with expiresAt set succeeds
    await database.insert(analyticsVisitors).values({
      id: unlinkedVisitorId,
      expiresAt: unlinkedExpiry,
    });

    // Unlinked visitor with null expiresAt fails check constraint
    await expect(
      database.insert(analyticsVisitors).values({
        id: "vis_unlinked_invalid",
        expiresAt: null,
      }),
    ).rejects.toBeDefined();

    // Anonymous consented visitor with birthProfileId and 30-day expiry is valid
    const anonymousActorId = "anon_actor_analytics_test";
    const anonymousProfileId = "profile_anon_analytics_test";
    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: unlinkedExpiry,
    });
    await database.insert(birthProfiles).values({
      id: anonymousProfileId,
      anonymousActorId,
      anonymousExpiresAt: unlinkedExpiry,
    });

    const consentedVisitorId = "vis_anonymous_consented";
    const consentedAt = new Date();
    await database.insert(analyticsVisitors).values({
      id: consentedVisitorId,
      birthProfileId: anonymousProfileId,
      consentedAt,
      expiresAt: unlinkedExpiry,
    });

    const [consentedVisitor] = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, consentedVisitorId));
    expect(consentedVisitor).toMatchObject({
      id: consentedVisitorId,
      birthProfileId: anonymousProfileId,
      consentedAt,
      expiresAt: unlinkedExpiry,
      userId: null,
      linkedAt: null,
    });

    // Consented unlinked visitor with null expiresAt still fails check constraint
    await expect(
      database.insert(analyticsVisitors).values({
        id: "vis_consented_no_expiry_invalid",
        birthProfileId: anonymousProfileId,
        consentedAt,
        expiresAt: null,
      }),
    ).rejects.toBeDefined();

    // 2. Linked visitor with userId, linkedAt set, and null expiresAt succeeds
    const linkedVisitorId = "vis_linked_1";
    await database.insert(analyticsVisitors).values({
      id: linkedVisitorId,
      userId,
      linkedAt: new Date(),
      expiresAt: null,
      birthProfileId: profileId,
      consentedAt,
    });

    // Linked visitor with expiresAt set fails check constraint
    await expect(
      database.insert(analyticsVisitors).values({
        id: "vis_linked_invalid",
        userId,
        linkedAt: new Date(),
        expiresAt: unlinkedExpiry,
      }),
    ).rejects.toBeDefined();

    const [linkedVisitor] = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, linkedVisitorId));
    expect(linkedVisitor).toMatchObject({
      id: linkedVisitorId,
      userId,
      birthProfileId: profileId,
      consentedAt,
      expiresAt: null,
    });

    // 3. Analytics events: unlinked event with unlinkedExpiresAt set succeeds
    await database.insert(analyticsEvents).values({
      id: "evt_unlinked_1",
      idempotencyKey: "idemp_unlinked_1",
      visitorId: unlinkedVisitorId,
      name: "landing",
      properties: { landing_page: "/tra-cuu" },
      ip: "192.168.1.1",
      ipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      unlinkedExpiresAt: unlinkedExpiry,
    });

    // Unlinked event with null unlinkedExpiresAt fails check constraint
    await expect(
      database.insert(analyticsEvents).values({
        id: "evt_unlinked_invalid",
        idempotencyKey: "idemp_unlinked_invalid",
        visitorId: unlinkedVisitorId,
        name: "landing",
        properties: {},
        unlinkedExpiresAt: null,
      }),
    ).rejects.toBeDefined();

    // Duplicate idempotency key fails unique constraint
    await expect(
      database.insert(analyticsEvents).values({
        id: "evt_unlinked_duplicate",
        idempotencyKey: "idemp_unlinked_1",
        visitorId: unlinkedVisitorId,
        name: "landing",
        properties: {},
        unlinkedExpiresAt: unlinkedExpiry,
      }),
    ).rejects.toBeDefined();

    // Linked event with userId and null unlinkedExpiresAt succeeds
    await database.insert(analyticsEvents).values({
      id: "evt_linked_1",
      idempotencyKey: "idemp_linked_1",
      visitorId: linkedVisitorId,
      userId,
      birthProfileId: profileId,
      name: "chart_success",
      properties: { engine_version: "v3" },
      ip: "10.0.0.1",
      ipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      unlinkedExpiresAt: null,
    });

    // Linked event with unlinkedExpiresAt set fails check constraint
    await expect(
      database.insert(analyticsEvents).values({
        id: "evt_linked_invalid",
        idempotencyKey: "idemp_linked_invalid",
        visitorId: linkedVisitorId,
        userId,
        name: "chart_success",
        properties: {},
        unlinkedExpiresAt: unlinkedExpiry,
      }),
    ).rejects.toBeDefined();

    // Event with IP but null ipExpiresAt fails check constraint
    await expect(
      database.insert(analyticsEvents).values({
        id: "evt_ip_invalid",
        idempotencyKey: "idemp_ip_invalid",
        visitorId: unlinkedVisitorId,
        name: "landing",
        properties: {},
        ip: "1.2.3.4",
        ipExpiresAt: null,
        unlinkedExpiresAt: unlinkedExpiry,
      }),
    ).rejects.toBeDefined();

    // 4. Account behavior profile succeeds and enforces unique userId
    await database.insert(accountBehaviorProfiles).values({
      id: "beh_1",
      userId,
      lockedSectionsViewed: ["section_career"],
      topupPacksViewed: ["pack_50k"],
      laBalance: 20,
      interestTopics: ["career"],
    });

    await expect(
      database.insert(accountBehaviorProfiles).values({
        id: "beh_duplicate",
        userId,
        lockedSectionsViewed: [],
        topupPacksViewed: [],
        interestTopics: [],
      }),
    ).rejects.toBeDefined();

    // 5. Fraud IP record with inet succeeds
    await database.insert(analyticsFraudIpRecords).values({
      id: "fraud_1",
      ip: "203.0.113.195",
      action: "auth.register",
      userId,
      visitorId: linkedVisitorId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // 6. Deleting birthProfile sets birthProfileId to null
    await database.delete(birthProfiles).where(eq(birthProfiles.id, profileId));
    const [visitorAfterProfileDelete] = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, linkedVisitorId));
    expect(visitorAfterProfileDelete?.birthProfileId).toBeNull();

    const [eventAfterProfileDelete] = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.id, "evt_linked_1"));
    expect(eventAfterProfileDelete?.birthProfileId).toBeNull();

    // 7. Deleting authUsers cascades and removes linked visitor, event, behavior profile, and fraud record
    await database.delete(authUsers).where(eq(authUsers.id, userId));

    const visitorsForUser = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, linkedVisitorId));
    expect(visitorsForUser).toHaveLength(0);

    const eventsForUser = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.id, "evt_linked_1"));
    expect(eventsForUser).toHaveLength(0);

    const profilesForUser = await database
      .select()
      .from(accountBehaviorProfiles)
      .where(eq(accountBehaviorProfiles.id, "beh_1"));
    expect(profilesForUser).toHaveLength(0);

    const fraudForUser = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_1"));
    expect(fraudForUser).toHaveLength(0);

    // Unlinked visitor and event are preserved
    const unlinkedVisitors = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, unlinkedVisitorId));
    expect(unlinkedVisitors).toHaveLength(1);

    await database.$client.end();
  }, 120_000);

  it("keeps migration journal identifiers sequential and unique", async () => {
    const journalUrl = new URL("../../drizzle/meta/_journal.json", import.meta.url);
    const journal = JSON.parse(await readFile(journalUrl, "utf8")) as {
      entries: Array<{ idx: number; when: number; tag: string }>;
    };

    expect(journal.entries.length).toBeGreaterThanOrEqual(29);
    for (let i = 1; i < journal.entries.length; i++) {
      const prev = journal.entries[i - 1]!;
      const curr = journal.entries[i]!;
      expect(curr.idx).toBe(prev.idx + 1);
      expect(curr.when).toBeGreaterThan(prev.when);
    }

    const indexes = journal.entries.map((entry) => entry.idx);
    const tags = journal.entries.map((entry) => entry.tag);
    const timestamps = journal.entries.map((entry) => entry.when);
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(new Set(tags).size).toBe(tags.length);
    expect(new Set(timestamps).size).toBe(timestamps.length);
    expect(journal.entries.slice(-8)).toEqual([
      {
        idx: 26,
        version: "7",
        when: 1789718400000,
        tag: "0026_ai_usage_and_cost",
        breakpoints: true,
      },
      {
        idx: 27,
        version: "7",
        when: 1789804800000,
        tag: "0027_birth_profile_reading_context",
        breakpoints: true,
      },
      {
        idx: 28,
        version: "7",
        when: 1789891200000,
        tag: "0028_account_linked_analytics",
        breakpoints: true,
      },
      {
        idx: 29,
        version: "7",
        when: 1789977600000,
        tag: "0029_report_section_checkpoints",
        breakpoints: true,
      },
      {
        idx: 30,
        version: "7",
        when: 1790064000000,
        tag: "0030_report_section_checkpoint_revisions",
        breakpoints: true,
      },
      {
        idx: 31,
        version: "7",
        when: 1790553600000,
        tag: "0031_report_reading_context_freeze",
        breakpoints: true,
      },
      {
        idx: 32,
        version: "7",
        when: 1790640000000,
        tag: "0032_admin_report_recovery",
        breakpoints: true,
      },
      {
        idx: 33,
        version: "7",
        when: 1790726400000,
        tag: "0033_report_assets_and_report_failure_delivery",
        breakpoints: true,
      },
    ]);
  });

  it("applies 0026 AI cost, 0027 reading context, 0028 analytics, and 0029 checkpoints to a clean database", async () => {
    const client = postgres(databaseUrl);

    const migrations = await client<{ created_at: string }[]>`
      SELECT created_at
      FROM drizzle.__drizzle_migrations
      WHERE created_at IN (1789718400000, 1789804800000, 1789891200000, 1789977600000)
      ORDER BY created_at ASC
    `;
    expect(migrations.map((migration) => Number(migration.created_at))).toEqual([
      1789718400000,
      1789804800000,
      1789891200000,
      1789977600000,
    ]);

    const tables = await client<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'ai_model_pricing',
          'ai_call_attempts',
          'ai_usage_outcomes',
          'analytics_visitors',
          'analytics_events',
          'account_behavior_profiles',
          'analytics_fraud_ip_records',
          'report_section_checkpoints',
          'report_section_checkpoint_revisions'
        )
      ORDER BY table_name ASC
    `;
    expect(tables.map((table) => table.table_name)).toEqual([
      "account_behavior_profiles",
      "ai_call_attempts",
      "ai_model_pricing",
      "ai_usage_outcomes",
      "analytics_events",
      "analytics_fraud_ip_records",
      "analytics_visitors",
      "report_section_checkpoint_revisions",
      "report_section_checkpoints",
    ]);

    await client.end();
  });

  it("upgrades 0030 through 0033 from the 0029 checkpoint boundary without losing ReadingContext, analytics, or AI data", async () => {
    const client = postgres(databaseUrl);
    const database = createDatabase(databaseUrl);
    const upgradeNow = new Date("2026-09-15T00:00:00.000Z");
    const userId = "checkpoint-upgrade-user";
    const profileId = "checkpoint-upgrade-profile";
    const revisionId = "checkpoint-upgrade-revision";
    const visitorId = "checkpoint-upgrade-visitor";
    const eventId = "checkpoint-upgrade-event";

    await database.insert(authUsers).values({
      id: userId,
      name: "Checkpoint Upgrade User",
      email: "checkpoint-upgrade@example.test",
      createdAt: upgradeNow,
      updatedAt: upgradeNow,
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      userId,
      createdAt: upgradeNow,
      updatedAt: upgradeNow,
    });
    await database.insert(birthProfileReadingContextRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      lifeStage: "early_career",
      topConcern: "career",
      createdAt: upgradeNow,
    });
    await database.insert(birthProfileReadingContexts).values({
      profileId,
      currentRevisionId: revisionId,
      stateVersion: 1,
      lastRevisionNumber: 1,
      updatedAt: upgradeNow,
    });
    await database.insert(analyticsVisitors).values({
      id: visitorId,
      userId,
      birthProfileId: profileId,
      linkedAt: upgradeNow,
      firstSeenAt: upgradeNow,
      lastSeenAt: upgradeNow,
      createdAt: upgradeNow,
      updatedAt: upgradeNow,
    });
    await database.insert(analyticsEvents).values({
      id: eventId,
      idempotencyKey: "checkpoint-upgrade-event-key",
      visitorId,
      userId,
      birthProfileId: profileId,
      name: "birth_profile_saved",
      properties: { source: "checkpoint-upgrade" },
      occurredAt: upgradeNow,
      createdAt: upgradeNow,
    });

    await client`
      ALTER TABLE report_reservations
      DROP CONSTRAINT IF EXISTS report_reservations_reading_context_revision_id_birth_profile_reading_context_revisions_id_fk
    `;
    await client`DROP INDEX IF EXISTS report_reservations_reading_context_revision_idx`;
    await client`
      ALTER TABLE report_reservations
      DROP COLUMN IF EXISTS reading_context_revision_id
    `;
    await client`DROP TABLE IF EXISTS admin_report_recovery_receipts`;
    await client`DROP TABLE IF EXISTS report_section_checkpoint_revisions`;
    await client`DROP TABLE IF EXISTS support_cases`;
    await client`DROP TABLE IF EXISTS report_assets`;
    await client`
      DELETE FROM drizzle.__drizzle_migrations
      WHERE created_at IN (1790064000000, 1790553600000, 1790640000000, 1790726400000)
    `;

    const [latestBefore] = await client<{ created_at: string }[]>`
      SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
    `;
    expect(Number(latestBefore?.created_at)).toBe(1789977600000);

    await runMigrations(databaseUrl);

    const [latestAfter] = await client<{ created_at: string }[]>`
      SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
    `;
    expect(Number(latestAfter?.created_at)).toBe(1790726400000);

    const reappliedMigrations = await client<{ created_at: string }[]>`
      SELECT created_at
      FROM drizzle.__drizzle_migrations
      WHERE created_at IN (1790064000000, 1790553600000, 1790640000000, 1790726400000)
      ORDER BY created_at ASC
    `;
    expect(reappliedMigrations.map((migration) => Number(migration.created_at))).toEqual([
      1790064000000,
      1790553600000,
      1790640000000,
      1790726400000,
    ]);

    const [recoveryReceiptTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admin_report_recovery_receipts'
      ) as exists
    `;
    expect(recoveryReceiptTableCheck?.exists).toBe(true);

    const [checkpointTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'report_section_checkpoints'
      ) as exists
    `;
    expect(checkpointTableCheck?.exists).toBe(true);

    const [revisionTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'report_section_checkpoint_revisions'
      ) as exists
    `;
    expect(revisionTableCheck?.exists).toBe(true);

    const [revisionForeignKey] = await client<{ delete_rule: string }[]>`
      SELECT delete_rule
      FROM information_schema.referential_constraints
      WHERE constraint_name = 'report_section_checkpoint_revisions_checkpoint_fk'
    `;
    expect(revisionForeignKey?.delete_rule).toBe("RESTRICT");

    const [aiTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ai_model_pricing'
      ) as exists
    `;
    expect(aiTableCheck?.exists).toBe(true);

    const [aiDataCheck] = await client<{ count: string }[]>`
      SELECT count(*) FROM ai_model_pricing WHERE pricing_version = 'v1-20260914'
    `;
    expect(Number(aiDataCheck?.count)).toBeGreaterThan(0);

    const [readingContextTableCheck] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'birth_profile_reading_contexts'
      ) as exists
    `;
    expect(readingContextTableCheck?.exists).toBe(true);

    const [context] = await database.select().from(birthProfileReadingContexts).where(
      eq(birthProfileReadingContexts.profileId, profileId),
    );
    const [revision] = await database.select().from(birthProfileReadingContextRevisions).where(
      eq(birthProfileReadingContextRevisions.id, revisionId),
    );
    const [visitor] = await database.select().from(analyticsVisitors).where(
      eq(analyticsVisitors.id, visitorId),
    );
    const [event] = await database.select().from(analyticsEvents).where(
      eq(analyticsEvents.id, eventId),
    );
    expect(context).toMatchObject({
      profileId,
      currentRevisionId: revisionId,
      stateVersion: 1,
      lastRevisionNumber: 1,
    });
    expect(revision).toMatchObject({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      lifeStage: "early_career",
      topConcern: "career",
    });
    expect(visitor).toMatchObject({
      id: visitorId,
      userId,
      birthProfileId: profileId,
      linkedAt: upgradeNow,
    });
    expect(event).toMatchObject({
      id: eventId,
      visitorId,
      userId,
      birthProfileId: profileId,
      name: "birth_profile_saved",
      properties: { source: "checkpoint-upgrade" },
    });

    await client.end();
  });

  it("nulls a reservation context reference when profile hard purge cascades its revision", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "reservation-context-purge-user";
    const profileId = "reservation-context-purge-profile";
    const profileRevisionId = "reservation-context-purge-profile-revision";
    const contextRevisionId = "reservation-context-purge-context-revision";
    const runId = "reservation-context-purge-run";
    const chartId = "reservation-context-purge-chart";
    const chartVersionId = "reservation-context-purge-chart-version";
    const orderId = "00000000-0000-4000-8000-000000000034";
    const entitlementId = "00000000-0000-4000-8000-000000000035";
    const reservationId = "00000000-0000-4000-8000-000000000031";

    await database.insert(authUsers).values({
      id: userId,
      name: "Reservation Context Purge User",
      email: "reservation-context-purge@example.test",
    });
    await database.insert(birthProfiles).values({ id: profileId, userId });
    await database.insert(birthProfileRevisions).values({
      id: profileRevisionId,
      profileId,
      revisionNumber: 1,
      originalInput: {},
      normalizedInput: {},
      consentVersion: "privacy.v1",
    });
    await database.insert(birthProfileReadingContextRevisions).values({
      id: contextRevisionId,
      profileId,
      revisionNumber: 1,
      lifeStage: "early_career",
    });
    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      profileRevisionId,
      idempotencyKey: "reservation-context-purge-run",
      engineId: "ziwei.iztro",
      engineVersion: "1",
      adapterId: "iztro",
      adapterVersion: "1",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
    });
    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId,
      profileRevisionId,
    });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId,
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: "LSV-RESERVATION-CONTEXT-PURGE",
      chartId,
      chartVersionId,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    await database.insert(reportReservations).values({
      id: reservationId,
      reportId: "00000000-0000-4000-8000-000000000032",
      reportVersionId: "00000000-0000-4000-8000-000000000033",
      entitlementId,
      chartVersionId,
      evidenceVersionId: "reservation-context-purge-evidence",
      knowledgeVersionId: "knowledge.v1",
      promptVersion: "prompt.v1",
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      readingContextRevisionId: contextRevisionId,
    });

    await database.delete(birthProfiles).where(eq(birthProfiles.id, profileId));

    const [reservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.id, reservationId));
    expect(reservation).toBeDefined();
    expect(reservation?.readingContextRevisionId).toBeNull();
  });
});
