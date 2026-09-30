import "server-only";

import { NextResponse } from "next/server";
import {
  GuaranteeClaimRequestV1Schema, GuaranteeClaimResultV1Schema,
  PartFeedbackCreateV1Schema, PartFeedbackResultV1Schema,
} from "@lasoviet/contracts";
import { privateApiClient, PrivateApiClientError } from "../../api/private-api-client";
import { CurrentActorResolutionError, VerifiedAccountResolutionError, resolveCurrentActor, resolveVerifiedAccountActor } from "../../auth/resolve-current-actor";

const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

export async function submitFeedbackCommand(request: Request, kind: "feedback" | "guarantee"): Promise<Response> {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ code: "REQUEST_ORIGIN_INVALID" }, { status: 403, headers });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ code: "FEEDBACK_INVALID" }, { status: 400, headers }); }
  const input = (kind === "feedback" ? PartFeedbackCreateV1Schema : GuaranteeClaimRequestV1Schema).safeParse(body);
  if (!input.success) return NextResponse.json({ code: "FEEDBACK_INVALID" }, { status: 400, headers });
  try {
    const actor = await (kind === "feedback" ? resolveCurrentActor() : resolveVerifiedAccountActor());
    const result = await privateApiClient(actor, actor.requestId).request<{ ok: boolean; value: unknown }>(
      kind === "feedback" ? "/commerce/feedback/parts" : "/commerce/wallet/guarantee-claim",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) },
    );
    const parsed = (kind === "feedback" ? PartFeedbackResultV1Schema : GuaranteeClaimResultV1Schema).safeParse(result?.value);
    if (!result?.ok || !parsed.success) return NextResponse.json({ code: "FEEDBACK_RESPONSE_INVALID" }, { status: 502, headers });
    return NextResponse.json(parsed.data, { headers });
  } catch (error) {
    if (error instanceof CurrentActorResolutionError || error instanceof VerifiedAccountResolutionError) {
      return NextResponse.json({ code: "FEEDBACK_AUTH_REQUIRED" }, { status: 401, headers });
    }
    if (error instanceof PrivateApiClientError) {
      return NextResponse.json({ code: error.code }, { status: error.status ?? 503, headers });
    }
    throw error;
  }
}
