import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { INTERNAL_ACTOR_AUDIENCE, INTERNAL_ACTOR_ISSUER } from "@lasoviet/contracts";
import {
  ZIWEI_CALCULATION_DATABASE, ZIWEI_CALCULATION_SERVICE, ZIWEI_CALCULATION_SERVICE_SECRET, ZIWEI_QUERY_SERVICE, ZiweiController,
} from "./ziwei.controller.js";

const serviceSecret = "synthetic-free-palace-secret";
const secret = new TextEncoder().encode(serviceSecret);
const readFreePalaceGift = vi.fn();
const recordFreePalaceEngagement = vi.fn();
const calculate = vi.fn();
const otherReads = { readChart: vi.fn(), readEvidence: vi.fn(), readPreview: vi.fn(), listTopics: vi.fn(), selectTopic: vi.fn(), readHoroscope: vi.fn() };

async function token() {
  return new SignJWT({ version: 1, kind: "account", sid: "session-1", requestId: "request-1" })
    .setProtectedHeader({ alg: "HS256" }).setIssuer(INTERNAL_ACTOR_ISSUER).setAudience(INTERNAL_ACTOR_AUDIENCE)
    .setSubject("verified-account").setIssuedAt().setExpirationTime("60s").sign(secret);
}

class FreePalaceHttpTestModule {}
Module({
  controllers: [ZiweiController],
  providers: [
    { provide: ZIWEI_CALCULATION_SERVICE, useValue: { calculate } },
    { provide: ZIWEI_CALCULATION_SERVICE_SECRET, useValue: serviceSecret },
    { provide: ZIWEI_CALCULATION_DATABASE, useValue: undefined },
    { provide: ZIWEI_QUERY_SERVICE, useValue: { ...otherReads, readFreePalaceGift, recordFreePalaceEngagement } },
  ],
})(FreePalaceHttpTestModule);

describe("free palace gift private endpoint", () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(FreePalaceHttpTestModule, new FastifyAdapter(), { logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { vi.clearAllMocks(); recordFreePalaceEngagement.mockResolvedValue({ ok: true, value: { recorded: true } }); readFreePalaceGift.mockResolvedValue({ ok: true, value: { version: 1, status: "unavailable" } }); });
  const inject = async (options: { url?: string; method?: "GET" | "POST" | "PUT" | "DELETE"; auth?: boolean }) =>
    app.getHttpAdapter().getInstance().inject({
      method: options.method ?? "GET", url: options.url ?? "/ziwei/charts/chart-1/free-palace",
      headers: options.auth === false ? {} : { authorization: `Bearer ${await token()}` },
    });

  it("derives the actor from the bearer token, ignores a browser owner id and defaults the locale", async () => {
    const response = await inject({ url: "/ziwei/charts/chart-1/free-palace?userId=untrusted" });
    expect(response.statusCode).toBe(200);
    expect(readFreePalaceGift).toHaveBeenCalledWith(expect.objectContaining({ kind: "account", userId: "verified-account" }), "chart-1", "vi");
  });

  it("is private and uncacheable", async () => {
    const response = await inject({});
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["x-robots-tag"]).toBe("noindex, nofollow");
  });

  it("rejects a missing or invalid token and an unsupported locale before reading", async () => {
    expect((await inject({ auth: false })).statusCode).toBe(401);
    expect((await inject({ url: "/ziwei/charts/chart-1/free-palace?locale=fr" })).statusCode).toBe(400);
    expect(readFreePalaceGift).not.toHaveBeenCalled();
  });

  it("row 47: a GET only reads; no generation, calculation or other query is reachable from it", async () => {
    await inject({ url: "/ziwei/charts/chart-1/free-palace?locale=en" });
    expect(readFreePalaceGift).toHaveBeenCalledWith(expect.anything(), "chart-1", "en");
    expect(calculate).not.toHaveBeenCalled();
    for (const read of Object.values(otherReads)) expect(read).not.toHaveBeenCalled();
  });

  it("exposes no write verb on the route", async () => {
    for (const method of ["POST", "PUT", "DELETE"] as const) expect((await inject({ method })).statusCode).toBe(404);
    expect(readFreePalaceGift).not.toHaveBeenCalled();
  });

  it("row 47: missing, not-owned and deleted charts share one indistinguishable envelope", async () => {
    const notFound = { ok: false, error: { code: "CHART_NOT_FOUND", messageKey: "ziwei.chart_not_found", retryable: false } };
    readFreePalaceGift.mockResolvedValue(notFound);
    const [missing, notOwned] = await Promise.all([inject({ url: "/ziwei/charts/missing/free-palace" }), inject({ url: "/ziwei/charts/not-mine/free-palace" })]);
    expect(missing.statusCode).toBe(notOwned.statusCode);
    expect(missing.body).toBe(notOwned.body);
    expect(JSON.parse(missing.body)).toEqual(notFound);
  });

  describe("engagement report (explicit user action)", () => {
    const post = async (body: unknown, auth = true) => app.getHttpAdapter().getInstance().inject({
      method: "POST", url: "/ziwei/charts/chart-1/free-palace/engagement", payload: body as never,
      headers: auth ? { authorization: `Bearer ${await token()}` } : {},
    });
    it("uses the verified actor, forwards only a tab and a locale, and is uncacheable", async () => {
      const response = await post({ tab: "palaces", locale: "en", userId: "untrusted", count: 99 });
      expect(response.statusCode).toBe(200);
      expect(response.headers["cache-control"]).toBe("private, no-store");
      expect(response.headers["x-robots-tag"]).toBe("noindex, nofollow");
      expect(recordFreePalaceEngagement).toHaveBeenCalledWith(expect.objectContaining({ kind: "account", userId: "verified-account" }), "chart-1", "palaces", "en");
    });
    it("rejects a missing token and a malformed body before doing anything", async () => {
      expect((await post({ tab: "palaces", locale: "vi" }, false)).statusCode).toBe(401);
      expect((await post({ locale: "vi" })).statusCode).toBe(400);
      expect((await post({ tab: "palaces", locale: "fr" })).statusCode).toBe(400);
      expect([400, 415]).toContain((await post("nonsense")).statusCode); // not JSON: refused before the handler
      expect(recordFreePalaceEngagement).not.toHaveBeenCalled();
    });
    it("is a POST only: a GET on the same path reads nothing and records nothing", async () => {
      const response = await app.getHttpAdapter().getInstance().inject({ method: "GET", url: "/ziwei/charts/chart-1/free-palace/engagement", headers: { authorization: `Bearer ${await token()}` } });
      expect(response.statusCode).toBe(404);
      expect(recordFreePalaceEngagement).not.toHaveBeenCalled();
    });
  });
});

