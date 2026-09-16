import { createHmac } from "node:crypto";

import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_BODY_BINDING_PREFIX,
  ANALYTICS_SERVICE_AUDIENCE,
  ANALYTICS_SERVICE_COMMAND,
  ANALYTICS_SERVICE_ISSUER,
  ANALYTICS_SERVICE_SUBJECT,
  BrowserAnalyticsEventRequestV1Schema,
  canonicalizeAnalyticsIngestRequest,
  PrivateAnalyticsIngestRequestV1Schema,
  type PrivateAnalyticsIngestRequestV1,
} from "@lasoviet/contracts";

import {
  ANALYTICS_SERVICE,
  AnalyticsController,
} from "./analytics.controller.js";
import {
  ANALYTICS_SERVICE_SECRET,
  AnalyticsServiceGuard,
  verifyAnalyticsServiceToken,
} from "./analytics-service.guard.js";

const serviceSecret = "synthetic-analytics-service-secret";
const secret = new TextEncoder().encode(serviceSecret);

const sampleRequest: PrivateAnalyticsIngestRequestV1 = {
  version: 1,
  idempotencyKey: "synthetic-idempotency-key-001",
  occurredAt: "2026-09-14T10:00:00.000Z",
  event: {
    name: "landing",
    properties: {
      landing_page: "/vi",
    },
  },
  visitorId: "123e4567-e89b-12d3-a456-426614174000",
  userId: "user-synthetic-01",
  requestId: "req-synthetic-01",
  ip: "203.0.113.195",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  referrer: "https://example.com/ref",
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "spring_promo",
  utmContent: "banner",
  utmTerm: "ziwei",
  deviceClass: "desktop",
  locale: "vi",
  pathname: "/vi",
};

function computeBodyBinding(body: PrivateAnalyticsIngestRequestV1): string {
  return createHmac("sha256", secret)
    .update(ANALYTICS_BODY_BINDING_PREFIX)
    .update(canonicalizeAnalyticsIngestRequest(body))
    .digest("hex");
}

async function generateServiceToken(
  body: PrivateAnalyticsIngestRequestV1,
  options?: {
    issuer?: string;
    audience?: string;
    subject?: string;
    command?: string;
    jti?: string;
    requestId?: string;
    expiresIn?: string;
    alterBinding?: boolean;
  },
): Promise<string> {
  const binding = options?.alterBinding
    ? "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    : computeBodyBinding(body);

  const jwt = new SignJWT({
    command: options?.command ?? ANALYTICS_SERVICE_COMMAND,
    requestId: options?.requestId ?? body.requestId,
    bodyBinding: binding,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(options?.issuer ?? ANALYTICS_SERVICE_ISSUER)
    .setAudience(options?.audience ?? ANALYTICS_SERVICE_AUDIENCE)
    .setSubject(options?.subject ?? ANALYTICS_SERVICE_SUBJECT)
    .setJti(options?.jti ?? body.idempotencyKey)
    .setIssuedAt();

  if (options?.expiresIn) {
    jwt.setExpirationTime(options.expiresIn);
  } else {
    jwt.setExpirationTime("60s");
  }

  return jwt.sign(secret);
}

const mockIngest = vi.fn();

class AnalyticsHttpTestModule {}

Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsServiceGuard,
    {
      provide: ANALYTICS_SERVICE,
      useValue: { ingest: mockIngest },
    },
    {
      provide: ANALYTICS_SERVICE_SECRET,
      useValue: serviceSecret,
    },
  ],
})(AnalyticsHttpTestModule);

describe("analytics contract schemas and canonicalization (acceptance 1)", () => {
  it("rejects browser payloads containing identity, IP, or context fields", () => {
    const invalidBrowserPayloads = [
      {
        version: 1,
        idempotencyKey: "k1",
        occurredAt: "2026-09-14T10:00:00.000Z",
        event: { name: "landing", properties: {} },
        ip: "203.0.113.1",
      },
      {
        version: 1,
        idempotencyKey: "k2",
        occurredAt: "2026-09-14T10:00:00.000Z",
        event: { name: "landing", properties: {} },
        userId: "u123",
      },
      {
        version: 1,
        idempotencyKey: "k3",
        occurredAt: "2026-09-14T10:00:00.000Z",
        event: { name: "landing", properties: {} },
        visitorId: "123e4567-e89b-12d3-a456-426614174000",
      },
      {
        version: 1,
        idempotencyKey: "k4",
        occurredAt: "2026-09-14T10:00:00.000Z",
        event: { name: "landing", properties: {} },
        context: { device: "desktop" },
      },
    ];

    for (const payload of invalidBrowserPayloads) {
      const result = BrowserAnalyticsEventRequestV1Schema.safeParse(payload);
      expect(result.success).toBe(false);
    }
  });

  it("produces deterministic canonicalization regardless of property key insertion order", () => {
    const reqA: PrivateAnalyticsIngestRequestV1 = {
      ...sampleRequest,
      event: {
        name: "landing",
        properties: { alpha: "1", beta: 2, gamma: true },
      },
    };
    const reqB: PrivateAnalyticsIngestRequestV1 = {
      ...sampleRequest,
      event: {
        name: "landing",
        properties: { gamma: true, alpha: "1", beta: 2 },
      },
    };
    expect(canonicalizeAnalyticsIngestRequest(reqA)).toBe(
      canonicalizeAnalyticsIngestRequest(reqB),
    );
  });
});

describe("analytics token verifier (acceptance 2)", () => {
  it("accepts a valid <=60s body-bound request", async () => {
    const token = await generateServiceToken(sampleRequest);
    const verified = await verifyAnalyticsServiceToken(token, sampleRequest, secret);
    expect(verified.idempotencyKey).toBe(sampleRequest.idempotencyKey);
  });

  it("rejects an altered request body (ANALYTICS_BODY_MISMATCH)", async () => {
    const token = await generateServiceToken(sampleRequest);
    const altered = { ...sampleRequest, pathname: "/tampered" };
    await expect(verifyAnalyticsServiceToken(token, altered, secret)).rejects.toThrow(
      "ANALYTICS_BODY_MISMATCH",
    );
  });

  it("rejects token with wrong audience", async () => {
    const token = await generateServiceToken(sampleRequest, {
      audience: "wrong-audience",
    });
    await expect(verifyAnalyticsServiceToken(token, sampleRequest, secret)).rejects.toThrow(
      "ANALYTICS_TOKEN_AUDIENCE",
    );
  });

  it("rejects token with jti mismatching idempotencyKey", async () => {
    const token = await generateServiceToken(sampleRequest, {
      jti: "different-idempotency-key",
    });
    await expect(verifyAnalyticsServiceToken(token, sampleRequest, secret)).rejects.toThrow(
      "ANALYTICS_TOKEN_INVALID",
    );
  });

  it("rejects token with requestId mismatching body requestId", async () => {
    const token = await generateServiceToken(sampleRequest, {
      requestId: "different-request-id",
    });
    await expect(verifyAnalyticsServiceToken(token, sampleRequest, secret)).rejects.toThrow(
      "ANALYTICS_TOKEN_INVALID",
    );
  });

  it("rejects expired token", async () => {
    const token = await generateServiceToken(sampleRequest, { expiresIn: "-5s" });
    await expect(verifyAnalyticsServiceToken(token, sampleRequest, secret)).rejects.toThrow(
      "ANALYTICS_TOKEN_EXPIRED",
    );
  });

  it("rejects token issued in the future (iat > now)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const binding = computeBodyBinding(sampleRequest);
    const futureToken = await new SignJWT({
      command: ANALYTICS_SERVICE_COMMAND,
      requestId: sampleRequest.requestId,
      bodyBinding: binding,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(ANALYTICS_SERVICE_ISSUER)
      .setAudience(ANALYTICS_SERVICE_AUDIENCE)
      .setSubject(ANALYTICS_SERVICE_SUBJECT)
      .setJti(sampleRequest.idempotencyKey)
      .setIssuedAt(now + 10)
      .setExpirationTime(now + 50)
      .sign(secret);

    await expect(
      verifyAnalyticsServiceToken(futureToken, sampleRequest, secret, now),
    ).rejects.toThrow("ANALYTICS_TOKEN_INVALID");
  });

  it("rejects token exceeding 60s lifetime", async () => {
    const token = await generateServiceToken(sampleRequest, { expiresIn: "120s" });
    await expect(verifyAnalyticsServiceToken(token, sampleRequest, secret)).rejects.toThrow(
      "ANALYTICS_TOKEN_INVALID",
    );
  });
});

describe("analytics private HTTP ingress flow (acceptance 3)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AnalyticsHttpTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns minimal response without leaking stored DB rows, IP, or identity internals", async () => {
    mockIngest.mockResolvedValueOnce({
      ok: true,
      value: {
        event: {
          id: "internal-uuid-row-1",
          visitorId: sampleRequest.visitorId,
          userId: sampleRequest.userId,
          ip: "203.0.113.195",
          ipExpiresAt: new Date(),
          createdAt: new Date(),
        },
        replayed: false,
      },
    });

    const token = await generateServiceToken(sampleRequest);
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/internal/analytics/events",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: sampleRequest,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toEqual({
      ok: true,
      value: {
        replayed: false,
      },
    });
    // Ensure none of the internal fields leaked
    expect(body).not.toHaveProperty("event");
    expect(body).not.toHaveProperty("ip");
    expect(body).not.toHaveProperty("visitorId");
    expect(body).not.toHaveProperty("userId");
  });
});
