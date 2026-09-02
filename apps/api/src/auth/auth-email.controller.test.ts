import { createHmac } from "node:crypto";

import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import {
  AUTH_EMAIL_BODY_BINDING_PREFIX,
  AUTH_EMAIL_SERVICE_AUDIENCE,
  AUTH_EMAIL_SERVICE_COMMAND,
  AUTH_EMAIL_SERVICE_ISSUER,
  AUTH_EMAIL_SERVICE_SUBJECT,
  canonicalizeAuthEmailRequest,
  type AuthEmailRequest,
} from "@lasoviet/contracts";

import { verifyAuthEmailServiceCommand } from "./auth-email.controller.js";

const secret = new TextEncoder().encode("synthetic-service-secret");
const request: AuthEmailRequest = {
  version: 1,
  kind: "password_reset",
  idempotencyKey: "auth-email:reset:synthetic",
  recipient: "user@synthetic.test",
  locale: "vi",
  actionUrl: "https://lasoviet.example/vi/reset?token=synthetic",
  requestId: "request-synthetic",
};

function bodyBinding(body: AuthEmailRequest): string {
  return createHmac("sha256", secret)
    .update(AUTH_EMAIL_BODY_BINDING_PREFIX)
    .update(canonicalizeAuthEmailRequest(body))
    .digest("hex");
}

async function serviceToken(
  body: AuthEmailRequest,
  audience: string = AUTH_EMAIL_SERVICE_AUDIENCE,
): Promise<string> {
  return new SignJWT({
    command: AUTH_EMAIL_SERVICE_COMMAND,
    requestId: body.requestId,
    bodyBinding: bodyBinding(body),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(AUTH_EMAIL_SERVICE_ISSUER)
    .setAudience(audience)
    .setSubject(AUTH_EMAIL_SERVICE_SUBJECT)
    .setJti(body.idempotencyKey)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);
}

describe("auth email service command verification", () => {
  it("rejects a body-binding mismatch before delivery", async () => {
    const token = await serviceToken(request);
    const changed = { ...request, actionUrl: `${request.actionUrl}&changed=1` };

    await expect(
      verifyAuthEmailServiceCommand(token, changed, secret, 1_788_192_000),
    ).rejects.toMatchObject({ code: "AUTH_EMAIL_BODY_MISMATCH" });
  });

  it("rejects a token from the actor-token domain", async () => {
    const token = await serviceToken(request, "lasoviet-api");

    await expect(
      verifyAuthEmailServiceCommand(token, request, secret, 1_788_192_000),
    ).rejects.toMatchObject({ code: "AUTH_EMAIL_TOKEN_AUDIENCE" });
  });
});
