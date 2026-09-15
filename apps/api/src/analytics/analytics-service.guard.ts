import { createHmac, timingSafeEqual } from "node:crypto";

import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { errors, jwtVerify } from "jose";

import {
  ANALYTICS_BODY_BINDING_PREFIX,
  ANALYTICS_SERVICE_AUDIENCE,
  ANALYTICS_SERVICE_COMMAND,
  ANALYTICS_SERVICE_ISSUER,
  AnalyticsServiceClaimsSchema,
  canonicalizeAnalyticsIngestRequest,
  PrivateAnalyticsIngestRequestV1Schema,
  type PrivateAnalyticsIngestRequestV1,
} from "@lasoviet/contracts";

export const ANALYTICS_SERVICE_SECRET = Symbol("ANALYTICS_SERVICE_SECRET");

export type AnalyticsCommandErrorCode =
  | "ANALYTICS_REQUEST_INVALID"
  | "ANALYTICS_TOKEN_INVALID"
  | "ANALYTICS_TOKEN_EXPIRED"
  | "ANALYTICS_TOKEN_AUDIENCE"
  | "ANALYTICS_BODY_MISMATCH";

export class AnalyticsCommandError extends Error {
  constructor(readonly code: AnalyticsCommandErrorCode) {
    super(code);
    this.name = "AnalyticsCommandError";
  }
}

function bodyBinding(
  body: PrivateAnalyticsIngestRequestV1,
  secret: Uint8Array,
): string {
  return createHmac("sha256", secret)
    .update(ANALYTICS_BODY_BINDING_PREFIX)
    .update(canonicalizeAnalyticsIngestRequest(body))
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

export async function verifyAnalyticsServiceToken(
  token: string,
  body: unknown,
  secret: Uint8Array,
  now = Math.floor(Date.now() / 1000),
): Promise<PrivateAnalyticsIngestRequestV1> {
  const parsedBody = PrivateAnalyticsIngestRequestV1Schema.safeParse(body);
  if (!parsedBody.success) {
    throw new AnalyticsCommandError("ANALYTICS_REQUEST_INVALID");
  }

  try {
    const { payload, protectedHeader } = await jwtVerify(token, secret, {
      issuer: ANALYTICS_SERVICE_ISSUER,
      audience: ANALYTICS_SERVICE_AUDIENCE,
      algorithms: ["HS256"],
      currentDate: new Date(now * 1000),
    });

    if (protectedHeader.alg !== "HS256") {
      throw new AnalyticsCommandError("ANALYTICS_TOKEN_INVALID");
    }

    const claims = AnalyticsServiceClaimsSchema.safeParse(payload);
    if (!claims.success) {
      throw new AnalyticsCommandError("ANALYTICS_TOKEN_INVALID");
    }

    if (
      claims.data.exp - claims.data.iat > 60 ||
      claims.data.exp <= claims.data.iat ||
      claims.data.iat > now ||
      claims.data.command !== ANALYTICS_SERVICE_COMMAND ||
      claims.data.jti !== parsedBody.data.idempotencyKey ||
      claims.data.requestId !== parsedBody.data.requestId
    ) {
      throw new AnalyticsCommandError("ANALYTICS_TOKEN_INVALID");
    }

    if (!equalHex(claims.data.bodyBinding, bodyBinding(parsedBody.data, secret))) {
      throw new AnalyticsCommandError("ANALYTICS_BODY_MISMATCH");
    }

    return parsedBody.data;
  } catch (error) {
    if (error instanceof AnalyticsCommandError) {
      throw error;
    }
    if (error instanceof errors.JWTExpired) {
      throw new AnalyticsCommandError("ANALYTICS_TOKEN_EXPIRED");
    }
    if (
      error instanceof errors.JWTClaimValidationFailed &&
      error.claim === "aud"
    ) {
      throw new AnalyticsCommandError("ANALYTICS_TOKEN_AUDIENCE");
    }
    throw new AnalyticsCommandError("ANALYTICS_TOKEN_INVALID");
  }
}

@Injectable()
export class AnalyticsServiceGuard implements CanActivate {
  constructor(
    @Inject(ANALYTICS_SERVICE_SECRET)
    private readonly secret: string,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new UnauthorizedException({ code: "ANALYTICS_TOKEN_INVALID" });
    }
    const token = authorization.slice("Bearer ".length).trim();
    if (token === "") {
      throw new UnauthorizedException({ code: "ANALYTICS_TOKEN_INVALID" });
    }
    try {
      const verifiedRequest = await verifyAnalyticsServiceToken(
        token,
        request.body,
        new TextEncoder().encode(this.secret),
      );
      request.analyticsIngestRequest = verifiedRequest;
      return true;
    } catch (error) {
      if (error instanceof AnalyticsCommandError) {
        throw new UnauthorizedException({ code: error.code });
      }
      throw new UnauthorizedException({ code: "ANALYTICS_TOKEN_INVALID" });
    }
  }
}
