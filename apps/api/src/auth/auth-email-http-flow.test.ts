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
  AUTH_EMAIL_BODY_BINDING_PREFIX,
  AUTH_EMAIL_SERVICE_AUDIENCE,
  AUTH_EMAIL_SERVICE_COMMAND,
  AUTH_EMAIL_SERVICE_ISSUER,
  AUTH_EMAIL_SERVICE_SUBJECT,
  canonicalizeAuthEmailRequest,
  type AuthEmailRequest,
} from "@lasoviet/contracts";

import {
  AUTH_EMAIL_DELIVERY_SERVICE,
  AUTH_EMAIL_SERVICE_SECRET,
  AuthEmailController,
} from "./auth-email.controller.js";

const serviceSecret = "synthetic-service-secret";
const secret = new TextEncoder().encode(serviceSecret);
const request: AuthEmailRequest = {
  version: 1,
  kind: "email_verification",
  idempotencyKey: "auth-email:verification:synthetic",
  recipient: "user@synthetic.test",
  locale: "en",
  actionUrl: "https://lasoviet.example/en/verify?token=synthetic",
  requestId: "request-synthetic",
};
const send = vi.fn().mockResolvedValue({
  status: "sent",
  attemptCount: 1,
  providerMessageId: null,
  errorCode: null,
});

function bodyBinding(body: AuthEmailRequest): string {
  return createHmac("sha256", secret)
    .update(AUTH_EMAIL_BODY_BINDING_PREFIX)
    .update(canonicalizeAuthEmailRequest(body))
    .digest("hex");
}

async function serviceToken(body: AuthEmailRequest): Promise<string> {
  return new SignJWT({
    command: AUTH_EMAIL_SERVICE_COMMAND,
    requestId: body.requestId,
    bodyBinding: bodyBinding(body),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(AUTH_EMAIL_SERVICE_ISSUER)
    .setAudience(AUTH_EMAIL_SERVICE_AUDIENCE)
    .setSubject(AUTH_EMAIL_SERVICE_SUBJECT)
    .setJti(body.idempotencyKey)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);
}

class AuthEmailHttpTestModule {}

Module({
  controllers: [AuthEmailController],
  providers: [
    {
      provide: AUTH_EMAIL_DELIVERY_SERVICE,
      useValue: { send },
    },
    {
      provide: AUTH_EMAIL_SERVICE_SECRET,
      useValue: serviceSecret,
    },
  ],
})(AuthEmailHttpTestModule);

describe("auth email private HTTP flow", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AuthEmailHttpTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("accepts only a body-bound service command", async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/internal/auth-email/send",
      headers: {
        authorization: `Bearer ${await serviceToken(request)}`,
      },
      payload: request,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "sent" });
    expect(send).toHaveBeenCalledWith(request);
  });

  it("rejects an altered request body before delivery", async () => {
    send.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/internal/auth-email/send",
      headers: {
        authorization: `Bearer ${await serviceToken(request)}`,
      },
      payload: { ...request, actionUrl: `${request.actionUrl}&altered=1` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "AUTH_EMAIL_BODY_MISMATCH",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("returns a retryable delivery outcome without converting it to success", async () => {
    send.mockResolvedValueOnce({
      status: "failed_retryable",
      attemptCount: 1,
      providerMessageId: null,
      errorCode: "SMTP_RETRYABLE",
    });
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/internal/auth-email/send",
      headers: {
        authorization: `Bearer ${await serviceToken(request)}`,
      },
      payload: request,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "failed_retryable",
      errorCode: "SMTP_RETRYABLE",
    });
  });
});
