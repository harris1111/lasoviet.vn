import { NextResponse } from "next/server";

import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../../auth/resolve-current-actor";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

/**
 * Browser-facing proxy that creates (or reuses) a wallet purchase intent for
 * the unlock confirm dialog (FD-105 package 1.2). Creating an intent is
 * idempotent server-side — a pending intent for the same chart+sku is
 * returned unchanged — so the dialog calls this every time it opens,
 * including after the customer tops up and comes back, without needing to
 * remember anything client-side.
 */
export async function POST(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      return new NextResponse(null, { status: 401, headers: NO_STORE_HEADERS });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "WALLET_INTENT_INVALID" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  let response: unknown;
  try {
    response = await privateApiClient(actor, actor.requestId).request<unknown>(
      "/commerce/wallet/purchase-intents",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch (error) {
    if (error instanceof PrivateApiClientError) {
      // Unreachable or malformed upstream replies carry no status; surface them as a coded 502
      // so the browser can tell the customer what failed instead of a bare 500.
      return NextResponse.json({ code: error.code }, { status: error.status ?? 502, headers: NO_STORE_HEADERS });
    }
    throw error;
  }

  if (typeof response !== "object" || response === null || !("ok" in response) || !response.ok) {
    return NextResponse.json({ code: "UPSTREAM_UNAVAILABLE" }, { status: 502, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json((response as unknown as { value: unknown }).value, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}
