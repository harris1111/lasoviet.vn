import { NextResponse } from "next/server";
import { WalletQuoteRequestV1Schema, WalletQuotesV1Schema } from "@lasoviet/contracts";
import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client";
import { VerifiedAccountResolutionError, resolveVerifiedAccountActor } from "../../../../../auth/resolve-current-actor";

const HEADERS = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const keys = [...query.keys()];
  if (new Set(keys).size !== keys.length) {
    return NextResponse.json({ code: "WALLET_INTENT_INVALID" }, { status: 400, headers: HEADERS });
  }
  const parsed = WalletQuoteRequestV1Schema.safeParse(Object.fromEntries(query));
  if (!parsed.success) return NextResponse.json({ code: "WALLET_INTENT_INVALID" }, { status: 400, headers: HEADERS });
  let actor;
  try {
    actor = await resolveVerifiedAccountActor();
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) return new NextResponse(null, { status: 401, headers: HEADERS });
    throw error;
  }
  try {
    const response = await privateApiClient(actor, actor.requestId).request<unknown>(
      `/commerce/wallet/quotes?${new URLSearchParams(parsed.data).toString()}`,
    );
    const envelope = response as { ok?: unknown; value?: unknown } | null;
    const result = WalletQuotesV1Schema.safeParse(envelope?.ok === true ? envelope.value : undefined);
    if (!result.success || result.data.chartId !== parsed.data.chartId ||
      result.data.chartVersionId !== parsed.data.chartVersionId || result.data.locale !== parsed.data.locale) {
      return NextResponse.json({ code: "PRIVATE_API_RESPONSE_INVALID" }, { status: 502, headers: HEADERS });
    }
    return NextResponse.json(result.data, { headers: HEADERS });
  } catch (error) {
    if (error instanceof PrivateApiClientError) return NextResponse.json({ code: error.code }, { status: error.status ?? 502, headers: HEADERS });
    throw error;
  }
}
