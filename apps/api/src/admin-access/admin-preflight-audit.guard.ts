import { errors, jwtVerify } from "jose";

import {
  INTERNAL_ADMIN_PREFLIGHT_AUDIT_AUDIENCE,
  INTERNAL_ADMIN_PREFLIGHT_AUDIT_ISSUER,
  InternalAdminPreflightAuditV1Schema,
} from "@lasoviet/contracts";

export async function verifyAdminPreflightAuditToken(
  token: string,
  secret: Uint8Array,
): Promise<void> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, secret, {
      issuer: INTERNAL_ADMIN_PREFLIGHT_AUDIT_ISSUER,
      audience: INTERNAL_ADMIN_PREFLIGHT_AUDIT_AUDIENCE,
      algorithms: ["HS256"],
    });
    if (protectedHeader.alg !== "HS256") throw new Error("INVALID_ALGORITHM");

    const { iss: _issuer, iat: _issuedAt, exp: _expiresAt, aud: _audience, ...claims } =
      payload;
    if (!InternalAdminPreflightAuditV1Schema.safeParse(claims).success) {
      throw new Error("INVALID_CLAIMS");
    }
  } catch (error) {
    if (error instanceof errors.JOSEError) throw new Error("INVALID_TOKEN");
    throw error;
  }
}
