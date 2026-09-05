import { NextResponse } from "next/server";

import { privateApiClient, PrivateApiClientError } from "../../../../../../api/private-api-client.js";
import {
  VerifiedAccountResolutionError,
  resolveVerifiedAccountActor,
} from "../../../../../../auth/resolve-current-actor.js";
import { type CheckoutStatus, safeParseCheckoutStatus } from "../../../../../../features/commerce/checkout-status.js";

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

  return NextResponse.json(parsed.value, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}
