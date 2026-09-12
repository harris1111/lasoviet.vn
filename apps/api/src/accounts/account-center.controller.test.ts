import { createHash, randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
  TIER_2_ENTITLEMENT_SCOPE,
} from "@lasoviet/contracts";
import {
  authSessions,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  consents,
  deletionRequests,
  createDatabase,
  runMigrations,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";
import { createAccountCenterService } from "@lasoviet/backend";

import {
  ACCOUNT_CENTER_DATABASE,
  ACCOUNT_CENTER_SERVICE,
  ACCOUNT_CENTER_SERVICE_SECRET,
  AccountCenterController,
} from "./account-center.controller.js";

const serviceSecret = "synthetic-account-secret";
const secret = new TextEncoder().encode(serviceSecret);

describe("AccountCenterController HTTP boundary with real database", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  let database: Database;
  let app: NestFastifyApplication;

  const owner1 = "user-http-owner-1";
  const owner2 = "user-http-owner-2";

  async function createToken(kind: "account" | "anonymous", subject = owner1, sessionId?: string): Promise<string> {
    const claims: Record<string, unknown> = {
      version: 1,
      kind,
      requestId: "request-1",
    };
    if (kind === "account") {
      claims.sid = sessionId ?? (subject === owner2 ? "session-owner-2" : "session-owner-1");
    }

    return new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(INTERNAL_ACTOR_ISSUER)
      .setAudience(INTERNAL_ACTOR_AUDIENCE)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(secret);
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_controller_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    database = createDatabase(databaseUrl);

    // Seed Owner 1
    await database.insert(authUsers).values([
      { id: owner1, name: "Owner One", email: "owner1@example.test", emailVerified: true },
      { id: owner2, name: "Owner Two", email: "owner2@example.test", emailVerified: true },
    ]);

    await database.insert(authSessions).values([
      {
        id: "session-owner-1",
        userId: owner1,
        token: "token-owner-1",
        expiresAt: new Date(Date.now() + 86400000),
      },
      {
        id: "session-owner-2",
        userId: owner2,
        token: "token-owner-2",
        expiresAt: new Date(Date.now() + 86400000),
      },
    ]);

    const validCalendar = { kind: "solar" as const, date: "1990-01-01" };
    const validTime = { precision: "exact_minute" as const, localTime: "09:30" };
    const validTimezone = { ianaZone: "Asia/Ho_Chi_Minh" };
    const validOriginalInput = {
      version: 1 as const,
      calendar: validCalendar,
      time: validTime,
      timezone: validTimezone,
      consentVersion: "2026-09-01",
      gender: "male",
    };

    await database.insert(birthProfiles).values({ id: "p-http-1", userId: owner1 });
    await database.insert(birthProfileRevisions).values({
      id: "rev-http-1",
      profileId: "p-http-1",
      revisionNumber: 1,
      originalInput: validOriginalInput,
      consentVersion: "2026-09-01",
    });

    const order1Id = randomUUID();
    await database.insert(commerceOrders).values({
      id: order1Id,
      ownerId: owner1,
      invoiceNumber: "INV-HTTP-1",
      chartId: "chart-1",
      chartVersionId: "cv-1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: randomUUID(),
      orderId: order1Id,
      chartId: "chart-1",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: owner1,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(consents).values({
      id: "c-http-1",
      userId: owner1,
      documentKey: "privacy",
      documentVersion: "2026-09-01",
      purpose: "birth_profile",
      grantedAt: new Date(),
    });

    // Create real service using real DB
    const service = createAccountCenterService(database);

    class AccountCenterHttpRealModule {}
    Module({
      controllers: [AccountCenterController],
      providers: [
        { provide: ACCOUNT_CENTER_SERVICE, useValue: service },
        { provide: ACCOUNT_CENTER_SERVICE_SECRET, useValue: serviceSecret },
        { provide: ACCOUNT_CENTER_DATABASE, useValue: database },
      ],
    })(AccountCenterHttpRealModule);

    app = await NestFactory.create<NestFastifyApplication>(
      AccountCenterHttpRealModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 120_000);

  afterAll(async () => {
    if (app) await app.close();
    if (database) await (database as unknown as { $client?: { end: () => Promise<void> } }).$client?.end();
    if (container) await container.stop();
  }, 30_000);

  it("rejects unauthenticated request with ACCOUNT_AUTH_REQUIRED", async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/overview",
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("ACCOUNT_AUTH_REQUIRED");
  });

  it("rejects anonymous token with ACCOUNT_AUTH_REQUIRED", async () => {
    const token = await createToken("anonymous", "anon-1");
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/overview",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("ACCOUNT_AUTH_REQUIRED");
  });

  it("returns real overview projection for verified account actor", async () => {
    const token = await createToken("account", owner1);
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/overview",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.account.email).toBe("owner1@example.test");
    expect(body.counts.profileCount).toBe(1);
    expect(body.counts.orderCount).toBe(1);
    expect(body.counts.consentActiveCount).toBe(1);
  });

  it("returns real profiles projection for verified account actor", async () => {
    const token = await createToken("account", owner1);
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/profiles",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.profiles).toHaveLength(1);
    expect(body.profiles[0].calendar.date).toBe("1990-01-01");
    expect(body.profiles[0].gender).toBe("male");
  });

  it("proves owner isolation: owner2 receives zero records of owner1", async () => {
    const token = await createToken("account", owner2);
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/profiles",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.profiles).toHaveLength(0);
  });

  it("denies token without valid active session with 401 ACCOUNT_AUTH_REQUIRED", async () => {
    const token = await createToken("account", "user-no-session");
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/overview",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("ACCOUNT_AUTH_REQUIRED");
  });

  it("denies unverified account actor with 401 ACCOUNT_AUTH_REQUIRED", async () => {
    const unverifiedUser = "user-unverified";
    await database.insert(authUsers).values({
      id: unverifiedUser,
      name: "Unverified User",
      email: "unverified@example.test",
      emailVerified: false,
    });
    await database.insert(authSessions).values({
      id: "session-unverified",
      userId: unverifiedUser,
      token: "token-unverified",
      expiresAt: new Date(Date.now() + 86400000),
    });

    const token = await createToken("account", unverifiedUser, "session-unverified");
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/overview",
      headers: { authorization: "Bearer " + token },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.code).toBe("ACCOUNT_AUTH_REQUIRED");
  });

  it("returns real export projection for verified account actor", async () => {
    const token = await createToken("account", owner1);
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/export",
      headers: { authorization: "Bearer " + token },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.account.email).toBe("owner1@example.test");
    expect(body.profiles).toHaveLength(1);
    expect(body.orders).toHaveLength(1);
  });

  it("allows privacy read during active deletion recovery while keeping overview denied", async () => {
    const delUser = "user-deletion-recovery";
    const delSessionId = randomUUID();

    await database.insert(authUsers).values({
      id: delUser,
      name: "Deletion User",
      email: "deletion@example.test",
      emailVerified: true,
    });

    const now = new Date();
    const futureSession = new Date(now.getTime() + 3600 * 1000);
    const recoverUntil = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    await database.insert(authSessions).values({
      id: delSessionId,
      userId: delUser,
      token: randomUUID(),
      expiresAt: futureSession,
      createdAt: now,
      updatedAt: now,
    });

    await database.insert(deletionRequests).values({
      id: randomUUID(),
      userId: delUser,
      status: "requested",
      requestedAt: now,
      recoverUntil,
      purgeAfter: recoverUntil,
      createdAt: now,
      updatedAt: now,
    });

    const token = await createToken("account", delUser, delSessionId);

    // Overview is DENIED during deletion
    const overviewResponse = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/overview",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(overviewResponse.statusCode).toBe(401);
    const overviewBody = JSON.parse(overviewResponse.body);
    expect(overviewBody.code).toBe("ACCOUNT_AUTH_REQUIRED");

    // Privacy read is ALLOWED with allowDeletionRecovery=true to show requested status & enable cancellation
    const privacyResponse = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/account-center/privacy",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(privacyResponse.statusCode).toBe(200);
    const privacyBody = JSON.parse(privacyResponse.body);
    expect(privacyBody.deletionRequest).toBeDefined();
    expect(privacyBody.deletionRequest.status).toBe("requested");
  });
});
