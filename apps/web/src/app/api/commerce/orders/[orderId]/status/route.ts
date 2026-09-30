import { NextResponse } from "next/server";
import { sendServerAnalyticsEvent } from "../../../../../../analytics/server-analytics";

import { privateApiClient, PrivateApiClientError } from "../../../../../../api/private-api-client";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../../../auth/resolve-current-actor";
import { type CheckoutStatus, safeParseCheckoutStatus } from "../../../../../../features/commerce/checkout-status";

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) {
      return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
    }
    throw error;
  }

  const { orderId } = await params;
  const client = privateApiClient(actor, actor.requestId);

  let response: unknown;
  try {
    response = await client.request<unknown>(
      `/commerce/orders/${encodeURIComponent(orderId)}`,
    );
  } catch (error) {
    if (
      error instanceof PrivateApiClientError &&
      (error.code === "ORDER_NOT_FOUND" || error.status === 404)
    ) {
      return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
    }
    throw error;
  }

  if (
    typeof response !== "object" ||
    response === null ||
    !("ok" in response)
  ) {
    return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
  }

  const result = response as { ok: boolean; value?: unknown; error?: { code: string } };
  if (!result.ok || result.value === undefined) {
    return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
  }

  const parsed = safeParseCheckoutStatus(result.value);
  if (!parsed.ok) {
    return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (parsed.value.order.status === "paid") {
    await sendServerAnalyticsEvent({
      name: "payment_confirmed",
      idempotencyKey: `payment-confirmed:${parsed.value.order.id}`,
      userId: actor.userId,
      requestId: actor.requestId,
      properties: {
        amount: parsed.value.order.amount,
        currency: parsed.value.order.currency,
      },
    });
  }

  return NextResponse.json(parsed.value, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }): Promise<Response> {
  const headers = { ...NO_STORE_HEADERS, "x-robots-tag": "noindex, nofollow" };
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse(null, { status: 403, headers });
  }
  try {
    const actor = await resolveVerifiedAccountActor();
    const { orderId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return new NextResponse(null, { status: 404, headers });
    const result = await privateApiClient(actor, actor.requestId).request<{ ok: boolean }>(
      `/commerce/orders/${encodeURIComponent(orderId)}/presence`, { method: "POST" },
    );
    return new NextResponse(null, { status: result.ok ? 204 : 404, headers });
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError || error instanceof PrivateApiClientError) {
      return new NextResponse(null, { status: 404, headers });
    }
    throw error;
  }
}
