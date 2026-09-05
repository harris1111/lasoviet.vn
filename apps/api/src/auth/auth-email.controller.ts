import { createHmac, timingSafeEqual } from "node:crypto";

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
  Post,
} from "@nestjs/common";
import { errors, jwtVerify } from "jose";

import {
  AUTH_EMAIL_BODY_BINDING_PREFIX,
  AUTH_EMAIL_SERVICE_AUDIENCE,
  AuthEmailRequestSchema,
  AuthEmailServiceClaimsSchema,
  canonicalizeAuthEmailRequest,
  type AuthEmailRequest,
} from "@lasoviet/contracts";
import {
  createAuthEmailDeliveryService,
  type AuthEmailDeliveryOutcome,
} from "@lasoviet/backend";

export const AUTH_EMAIL_DELIVERY_SERVICE = Symbol("AUTH_EMAIL_DELIVERY_SERVICE");
export const AUTH_EMAIL_SERVICE_SECRET = Symbol("AUTH_EMAIL_SERVICE_SECRET");

export type AuthEmailCommandErrorCode =
  | "AUTH_EMAIL_REQUEST_INVALID"
  | "AUTH_EMAIL_TOKEN_EXPIRED"
  | "AUTH_EMAIL_TOKEN_AUDIENCE"
  | "AUTH_EMAIL_TOKEN_INVALID"
  | "AUTH_EMAIL_BODY_MISMATCH";

export class AuthEmailCommandError extends Error {
  constructor(readonly code: AuthEmailCommandErrorCode) {
    super(code);
    this.name = "AuthEmailCommandError";
  }
}

function bodyBinding(
  body: AuthEmailRequest,
  secret: Uint8Array,
): string {
  return createHmac("sha256", secret)
    .update(AUTH_EMAIL_BODY_BINDING_PREFIX)
    .update(canonicalizeAuthEmailRequest(body))
    .digest("hex");
}

function equalHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function verifyAuthEmailServiceCommand(
  token: string,
  body: unknown,
  secret: Uint8Array,
  now = Math.floor(Date.now() / 1000),
): Promise<AuthEmailRequest> {
  const parsedBody = AuthEmailRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    throw new AuthEmailCommandError("AUTH_EMAIL_REQUEST_INVALID");
  }

  try {
    const { payload, protectedHeader } = await jwtVerify(token, secret, {
      issuer: "lasoviet-web",
      audience: AUTH_EMAIL_SERVICE_AUDIENCE,
      algorithms: ["HS256"],
      currentDate: new Date(now * 1000),
    });
    if (protectedHeader.alg !== "HS256") {
      throw new AuthEmailCommandError("AUTH_EMAIL_TOKEN_INVALID");
    }

    const claims = AuthEmailServiceClaimsSchema.safeParse(payload);
    if (!claims.success) {
      throw new AuthEmailCommandError("AUTH_EMAIL_TOKEN_INVALID");
    }
    if (
      claims.data.exp - claims.data.iat > 60 ||
      claims.data.jti !== parsedBody.data.idempotencyKey ||
      claims.data.requestId !== parsedBody.data.requestId
    ) {
      throw new AuthEmailCommandError("AUTH_EMAIL_TOKEN_INVALID");
    }
    if (
      !equalHex(
        claims.data.bodyBinding,
        bodyBinding(parsedBody.data, secret),
      )
    ) {
      throw new AuthEmailCommandError("AUTH_EMAIL_BODY_MISMATCH");
    }
    return parsedBody.data;
  } catch (error) {
    if (error instanceof AuthEmailCommandError) {
      throw error;
    }
    if (error instanceof errors.JWTExpired) {
      throw new AuthEmailCommandError("AUTH_EMAIL_TOKEN_EXPIRED");
    }
    if (
      error instanceof errors.JWTClaimValidationFailed &&
      error.claim === "aud"
    ) {
      throw new AuthEmailCommandError("AUTH_EMAIL_TOKEN_AUDIENCE");
    }
    throw new AuthEmailCommandError("AUTH_EMAIL_TOKEN_INVALID");
  }
}

function bearerToken(authorization: string | undefined): string {
  if (authorization === undefined || !authorization.startsWith("Bearer ")) {
    throw new AuthEmailCommandError("AUTH_EMAIL_TOKEN_INVALID");
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (token === "") {
    throw new AuthEmailCommandError("AUTH_EMAIL_TOKEN_INVALID");
  }
  return token;
}

@Controller("internal/auth-email")
export class AuthEmailController {
  constructor(
    @Inject(AUTH_EMAIL_DELIVERY_SERVICE)
    private readonly deliveryService: ReturnType<
      typeof createAuthEmailDeliveryService
    >,
    @Inject(AUTH_EMAIL_SERVICE_SECRET)
    private readonly secret: string,
  ) {}

  @Post("send")
  @HttpCode(HttpStatus.OK)
  async send(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AuthEmailDeliveryOutcome> {
    try {
      const request = await verifyAuthEmailServiceCommand(
        bearerToken(authorization),
        body,
        new TextEncoder().encode(this.secret),
      );
      return this.deliveryService.send(request);
    } catch (error) {
      if (error instanceof AuthEmailCommandError) {
        throw new UnauthorizedException({ code: error.code });
      }
      throw error;
    }
  }
}
