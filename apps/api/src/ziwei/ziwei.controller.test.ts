import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
} from "@lasoviet/contracts";

import {
  ZIWEI_CALCULATION_DATABASE,
  ZIWEI_CALCULATION_SERVICE,
  ZIWEI_CALCULATION_SERVICE_SECRET,
  ZIWEI_QUERY_SERVICE,
  ZiweiController,
} from "./ziwei.controller.js";
import type { AnalyticsEventV1 } from "@lasoviet/config";
import { createApiAnalyticsSink } from "../api.module.js";

const serviceSecret = "synthetic-ziwei-secret";
const secret = new TextEncoder().encode(serviceSecret);
const calculate = vi.fn().mockResolvedValue({
  ok: true,
  value: { chartId: "chart-1", chartVersionId: "chart-version-1" },
});
const readChart = vi.fn().mockResolvedValue({
  ok: true,
  value: {
    version: 1,
    chartId: "chart-1",
    chartVersionId: "chart-version-1",
    chart: {},
    evidenceIndex: {
      version: 1,
      evidenceSetId: "evidence-set-1",
      capabilityId: "ziwei.identity.p0",
      chartVersionId: "chart-version-1",
      ruleVersion: "ziwei.identity.v1",
      itemIds: [
        "ziwei.identity.soul",
        "ziwei.identity.body",
        "ziwei.identity.configuration",
      ],
    },
  },
});
const readEvidence = vi.fn().mockResolvedValue({
  ok: true,
  value: {
    version: 1,
    chartId: "chart-1",
    chartVersionId: "chart-version-1",
    evidence: { id: "ziwei.identity.soul" },
  },
});
const readPreview = vi.fn().mockResolvedValue({ ok: true, value: { version: 1 } });
const listTopics = vi.fn().mockResolvedValue({ ok: true, value: { version: 1 } });
const selectTopic = vi.fn().mockResolvedValue({ ok: true, value: { version: 1 } });

async function actorToken(): Promise<string> {
  return new SignJWT({
    version: 1,
    kind: "account",
    sid: "session-1",
    requestId: "request-1",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ACTOR_ISSUER)
    .setAudience(INTERNAL_ACTOR_AUDIENCE)
    .setSubject("verified-account")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);
}

class ZiweiHttpTestModule {}

Module({
  controllers: [ZiweiController],
  providers: [
    { provide: ZIWEI_CALCULATION_SERVICE, useValue: { calculate, readChart, readEvidence } },
    { provide: ZIWEI_CALCULATION_SERVICE_SECRET, useValue: serviceSecret },
    { provide: ZIWEI_CALCULATION_DATABASE, useValue: undefined },
    { provide: ZIWEI_QUERY_SERVICE, useValue: { readChart, readEvidence, readPreview, listTopics, selectTopic } },
  ],
})(ZiweiHttpTestModule);

describe("Zi Wei private HTTP flow", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      ZiweiHttpTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("uses the verified actor and does not accept a browser owner id", async () => {
    calculate.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/ziwei/revisions/revision-1/calculate",
      headers: { authorization: `Bearer ${await actorToken()}` },
      payload: { userId: "untrusted-account" },
    });

    expect(response.statusCode).toBe(200);
    expect(calculate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "revision-1",
    );
  });

  it("derives the chart query actor from the bearer token", async () => {
    readChart.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/ziwei/charts/chart-1?userId=untrusted-account",
      headers: { authorization: `Bearer ${await actorToken()}` },
    });

    expect(response.statusCode).toBe(200);
    expect(readChart).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "chart-1",
    );
  });

  it("returns only selected evidence through the private evidence endpoint", async () => {
    readEvidence.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/ziwei/charts/chart-1/evidence/evidence-row-1",
      headers: { authorization: `Bearer ${await actorToken()}` },
    });

    expect(response.statusCode).toBe(200);
    expect(readEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "chart-1",
      "evidence-row-1",
    );
  });

  it("derives preview and topic actors from the signed token", async () => {
    readPreview.mockClear();
    listTopics.mockClear();
    selectTopic.mockClear();
    const authorization = `Bearer ${await actorToken()}`;

    await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/ziwei/charts/chart-1/preview?userId=untrusted-account",
      headers: { authorization },
    });
    await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/ziwei/charts/chart-1/topics?userId=untrusted-account",
      headers: { authorization },
    });
    await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/ziwei/charts/chart-1/topics",
      headers: { authorization },
      payload: { sku: "ZIWEI-IDENTITY-P0", userId: "untrusted-account" },
    });

    expect(readPreview).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "chart-1",
    );
    expect(listTopics).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "chart-1",
    );
    expect(selectTopic).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "chart-1",
      { sku: "ZIWEI-IDENTITY-P0", userId: "untrusted-account" },
    );
  });
});

describe("API analytics sink", () => {
  it("emits the already validated event through the structured Nest logger", async () => {
    const logger = { log: vi.fn() };
    const event: AnalyticsEventV1 = {
      name: "paid_topic_selected",
      properties: {
        sku: "ZIWEI-IDENTITY-P0",
        method: "ziwei",
        recommendation_source: "topic_selection",
      },
    };

    await createApiAnalyticsSink(logger).write(event);

    expect(logger.log).toHaveBeenCalledWith({
      event: "analytics_event",
      analytics: event,
    });
  });
});
