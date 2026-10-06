import { NextResponse } from "next/server";
import { WalletTopUpOrderCreateV1Schema, PaymentSelfClaimRequestV1Schema, PaymentSelfClaimSuccessV1Schema } from "@lasoviet/contracts";
import { privateApiClient, PrivateApiClientError } from "./private-api-client";
import { VerifiedAccountResolutionError, resolveVerifiedAccountActor } from "../auth/resolve-current-actor";
import { safeParseCheckoutStatus } from "../features/commerce/checkout-status";
import { sendServerAnalyticsEvent } from "../analytics/server-analytics";
import { CANONICAL_ORIGIN } from "../routing/canonical-origin";

const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

/** Both commands reuse the private commerce boundary; neither browser reply confirms payment. */
export async function topupProxy(request: Request, command: "create" | "self-claim" = "create") {
  const origin = request.headers.get("origin");
  const devLocal = process.env.NODE_ENV === "development" && origin === new URL(request.url).origin;
  // HTTPS terminates at the host proxy; Next's request URL may be an internal HTTP origin.
  if ((origin && origin !== CANONICAL_ORIGIN && !devLocal) || request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse(null, { status: 403, headers });
  }
  try {
    const actor = await resolveVerifiedAccountActor();
    let input: unknown;
    try { input = await request.json(); } catch { return NextResponse.json({ code: "TOP_UP_INVALID" }, { status: 400, headers }); }
    const parsed = command === "create" ? WalletTopUpOrderCreateV1Schema.safeParse(input) : PaymentSelfClaimRequestV1Schema.safeParse(input);
    if (!parsed.success) return NextResponse.json({ code: "TOP_UP_INVALID" }, { status: 400, headers });
    const result = await privateApiClient(actor, actor.requestId).request<{ ok: boolean; value?: unknown; code?: string; error?: { code?: string } }>(
      command === "create" ? "/commerce/wallet/top-up-orders" : "/commerce/payments/self-claim",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) },
    );
    if (!result?.ok || result.value === undefined) return NextResponse.json({ code: result?.code ?? result?.error?.code ?? "UPSTREAM_UNAVAILABLE" }, { status: 502, headers });
    if (command === "self-claim") {
      const receipt = PaymentSelfClaimSuccessV1Schema.safeParse(result.value);
      if (!receipt.success) return NextResponse.json({ code: "UPSTREAM_UNAVAILABLE" }, { status: 502, headers });
      return NextResponse.json(receipt.data, { headers });
    }
    const checkout = safeParseCheckoutStatus(result.value);
    if (!checkout.ok || checkout.value.order.kind !== "wallet_topup") return NextResponse.json({ code: "UPSTREAM_UNAVAILABLE" }, { status: 502, headers });
    await sendServerAnalyticsEvent({ name: "checkout_created", idempotencyKey: `checkout-created:${checkout.value.order.id}`,
      occurredAt: checkout.value.order.createdAt, userId: actor.userId, requestId: actor.requestId,
      properties: { sku: (parsed.data as { packId: string }).packId, amount: checkout.value.order.amount, currency: checkout.value.order.currency } });
    return NextResponse.json(checkout.value, { headers });
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) return new NextResponse(null, { status: 401, headers });
    if (error instanceof PrivateApiClientError) return NextResponse.json({ code: error.code }, { status: error.status ?? 502, headers });
    throw error;
  }
}
