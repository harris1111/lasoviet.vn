import "server-only";

import { SignJWT } from "jose";

import { loadEnvironment } from "@lasoviet/config/load-environment";
import {
  INTERNAL_ADMIN_PREFLIGHT_AUDIT_AUDIENCE,
  INTERNAL_ADMIN_PREFLIGHT_AUDIT_ISSUER,
} from "@lasoviet/contracts";

function auditSecret(): string {
  const result = loadEnvironment(process.env);
  if (!result.ok || result.value.internalActorSecret === undefined) {
    throw new Error("ADMIN_PREFLIGHT_AUDIT_CONFIG_INVALID");
  }
  return result.value.internalActorSecret;
}

export async function createInternalAdminPreflightAuditToken(
  requestId: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 300;
  return new SignJWT({
    version: 1,
    purpose: "admin_preflight_denial",
    requestId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ADMIN_PREFLIGHT_AUDIT_ISSUER)
    .setAudience(INTERNAL_ADMIN_PREFLIGHT_AUDIT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(auditSecret()));
}
