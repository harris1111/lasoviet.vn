import { NextResponse } from "next/server";
import { WalletUnlockRequestV1Schema, WalletUnlockResultV1Schema } from "@lasoviet/contracts";
import { sendServerAnalyticsEvent } from "../../../../../analytics/server-analytics";
import { sendServerUpgradePurchasedEvent } from "../../../../../features/analytics/server-funnel-analytics";

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
  const command = WalletUnlockRequestV1Schema.safeParse(body);
  if (!command.success) {
    return NextResponse.json({code: "WALLET_INTENT_INVALID"}, {status: 400, headers: NO_STORE_HEADERS});
  }

  let response: unknown;
  try {
    response = await privateApiClient(actor, actor.requestId).request<unknown>(
      "/commerce/wallet/unlock",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command.data),
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

  if (typeof response !== "object" || response === null || !("ok" in response) || response.ok !== true || !("value" in response)) {
    return NextResponse.json({ code: "UPSTREAM_UNAVAILABLE" }, { status: 502, headers: NO_STORE_HEADERS });
  }

  const parsed = WalletUnlockResultV1Schema.safeParse(response.value);
  if (!parsed.success || parsed.data.intent.id !== command.data.purchaseIntentId) {
    return NextResponse.json({code: "UPSTREAM_UNAVAILABLE"}, {status: 502, headers: NO_STORE_HEADERS});
  }
  const value = parsed.data;
  const idempotencyKey = command.data.idempotencyKey;
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
  }).catch(() => undefined);

  if (value.upgradePurchase) {
    const upgrade = value.upgradePurchase;
    await sendServerUpgradePurchasedEvent({
      userId: actor.userId, requestId: actor.requestId,
      sourceSku: upgrade.sourceSku, sourceSkus: upgrade.sourceSkus,
      targetSku: upgrade.targetSku, amount: upgrade.chargedLa, creditLa: upgrade.creditLa,
      currency: upgrade.currency, occurredAt: upgrade.occurredAt,
      idempotencyKey: `upgrade-purchased:${upgrade.eventKey}`,
    }).catch(() => undefined);
  }

  return NextResponse.json(value, { status: 200, headers: NO_STORE_HEADERS });
}
