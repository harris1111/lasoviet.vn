import { NextResponse } from "next/server";
import { WalletBalanceV1Schema } from "@lasoviet/contracts";

import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../../auth/resolve-current-actor";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

/**
 * Browser-facing proxy for the real wallet balance, used by the unlock
 * confirm dialog to show "current balance" and "balance after" before
 * spending (FD-105 package 1.2). The private API requires a server-signed
 * actor token the browser never holds, so this route resolves the verified
 * account server-side and forwards the request.
 */
export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      return new NextResponse(null, { status: 401, headers: NO_STORE_HEADERS });
    }
    throw error;
  }

  let response: unknown;
  try {
    response = await privateApiClient(actor, actor.requestId).request<unknown>(
      "/commerce/wallet/balance",
    );
  } catch (error) {
    if (error instanceof PrivateApiClientError && error.status !== undefined) {
      return NextResponse.json({ code: error.code }, { status: error.status, headers: NO_STORE_HEADERS });
    }
    throw error;
  }

  if (typeof response !== "object" || response === null || !("ok" in response) || !response.ok) {
    return new NextResponse(null, { status: 502, headers: NO_STORE_HEADERS });
  }

  const parsed = WalletBalanceV1Schema.safeParse((response as { value?: unknown }).value);
  if (!parsed.success) {
    return new NextResponse(null, { status: 502, headers: NO_STORE_HEADERS });
  }

  const headers = new Headers(NO_STORE_HEADERS);
  const grant = (response as { welcomeGrant?: { grantedAt?: unknown; promotionalLa?: unknown } }).welcomeGrant;
  if (grant?.promotionalLa === 60 && typeof grant.grantedAt === "string" && Number.isFinite(Date.parse(grant.grantedAt))) {
    headers.set("x-wallet-welcome-granted-at", new Date(grant.grantedAt).toISOString());
  }
  return NextResponse.json(parsed.data, { status: 200, headers });
}
