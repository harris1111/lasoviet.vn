import { NextResponse } from "next/server";
import { PendingUnlockHintV1Schema } from "@lasoviet/contracts";
import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client";
import { resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../../../../../auth/resolve-current-actor";
const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
export async function GET(request: Request): Promise<Response> {
  try {
    const query = new URL(request.url).searchParams;
    const locale = query.get("locale");
    if (query.size !== 1 || query.getAll("locale").length !== 1 || (locale !== "vi" && locale !== "en")) return new NextResponse(null, { status: 400, headers });
    const actor = await resolveVerifiedAccountActor();
    const result = await privateApiClient(actor, actor.requestId).request<{ ok: boolean; value?: unknown }>(`/commerce/wallet/pending-unlock?locale=${locale}`);
    if (!result?.ok || result.value === undefined) return new NextResponse(null, { status: 502, headers });
    if (result.value === null) return NextResponse.json(null, { headers });
    const parsed = PendingUnlockHintV1Schema.safeParse(result.value);
    if (!parsed.success || parsed.data.ownerId !== actor.userId || parsed.data.locale !== locale) return new NextResponse(null, { status: 502, headers });
    return NextResponse.json(parsed.data, { headers });
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) return new NextResponse(null, { status: 401, headers });
    if (error instanceof PrivateApiClientError) return new NextResponse(null, { status: 502, headers });
    throw error;
  }
}
