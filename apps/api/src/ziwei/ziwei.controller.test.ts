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
  ZiweiController,
} from "./ziwei.controller.js";

const serviceSecret = "synthetic-ziwei-secret";
const secret = new TextEncoder().encode(serviceSecret);
const calculate = vi.fn().mockResolvedValue({
  ok: true,
  value: { chartId: "chart-1", chartVersionId: "chart-version-1" },
});

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
    { provide: ZIWEI_CALCULATION_SERVICE, useValue: { calculate } },
    { provide: ZIWEI_CALCULATION_SERVICE_SECRET, useValue: serviceSecret },
    { provide: ZIWEI_CALCULATION_DATABASE, useValue: undefined },
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
});
