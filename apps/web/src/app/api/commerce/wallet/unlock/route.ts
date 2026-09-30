import { NextResponse } from "next/server";
import { sendServerAnalyticsEvent } from "../../../../../analytics/server-analytics";

import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../../auth/resolve-current-actor";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

/**
 * Browser-facing proxy for spending Lá on a confirmed purchase intent
 * (FD-105 package 1.2). A short balance surfaces here as
 * `WALLET_INSUFFICIENT_BALANCE` with HTTP 400; the dialog then opens the
 * pack sheet instead of showing a generic error.
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
      "/commerce/wallet/unlock",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
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

  const value = (response as unknown as {
    value: {
      intent: { sku: string; amountLa: number };
      balance: { totalLa: number };
      reportId: string | null;
    };
  }).value;
  const idempotencyKey =
    typeof (body as { idempotencyKey?: unknown })?.idempotencyKey === "string"
      ? (body as { idempotencyKey: string }).idempotencyKey
      : actor.requestId;
  await sendServerAnalyticsEvent({
    name: "la_spent",
    idempotencyKey: `la-spent:${actor.userId}:${idempotencyKey}`,
    userId: actor.userId,
    requestId: actor.requestId,
    properties: {
      sku: value.intent.sku,
      amount: value.intent.amountLa,
      balance_after: value.balance.totalLa,
      feature_id: "wallet_unlock_dialog",
    },
  });

  return NextResponse.json(value, { status: 200, headers: NO_STORE_HEADERS });
}
