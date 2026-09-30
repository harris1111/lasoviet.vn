import { NextResponse } from "next/server";
import { PersonalDailyReadingV1Schema } from "@lasoviet/contracts";
import { privateApiClient, PrivateApiClientError } from "../../../../../../api/private-api-client";
import { resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../../../../../../auth/resolve-current-actor";

const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
export async function GET(_request: Request, context: { params: Promise<{ chartId: string }> }) {
  try {
    const actor = await resolveVerifiedAccountActor();
    const { chartId } = await context.params;
    const response = await privateApiClient(actor, actor.requestId).request<unknown>(`/ziwei/charts/${encodeURIComponent(chartId)}/daily-reading`);
    if (!response || typeof response !== "object" || !("ok" in response)) return new NextResponse(null, { status: 502, headers });
    if (!response.ok) return new NextResponse(null, { status: 403, headers });
    const reading = PersonalDailyReadingV1Schema.safeParse("value" in response ? response.value : undefined);
    if (!reading.success || reading.data.chartId !== chartId || !reading.data.qualityGate.passed) return new NextResponse(null, { status: 502, headers });
    return NextResponse.json(reading.data, { headers });
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) return new NextResponse(null, { status: 401, headers });
    if (error instanceof PrivateApiClientError) return new NextResponse(null, { status: error.status ?? 502, headers });
    throw error;
  }
}
