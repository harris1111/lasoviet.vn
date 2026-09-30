import { NextResponse } from "next/server";
import { privateApiClient, PrivateApiClientError } from "./private-api-client";
import { VerifiedAccountResolutionError, resolveVerifiedAccountActor } from "../auth/resolve-current-actor";

const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
export async function membershipProxy(request: Request, command?: "intents" | "purchase") {
  try {
    const actor = await resolveVerifiedAccountActor();
    let body: unknown;
    if (command) {
      try { body = await request.json(); } catch { return NextResponse.json({ code: "WALLET_INTENT_INVALID" }, { status: 400, headers }); }
    }
    const result = await privateApiClient(actor, actor.requestId).request<{ ok: boolean; value?: unknown }>(
      `/commerce/membership${command ? `/${command}` : ""}`,
      command ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : { method: "GET" },
    );
    if (!result || !result.ok || result.value === undefined) return new NextResponse(null, { status: 502, headers });
    return NextResponse.json(result.value, { status: 200, headers });
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) return new NextResponse(null, { status: 401, headers });
    if (error instanceof PrivateApiClientError) return NextResponse.json({ code: error.code }, { status: error.status ?? 502, headers });
    throw error;
  }
}
