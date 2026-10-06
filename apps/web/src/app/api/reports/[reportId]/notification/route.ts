import { authorizeCanonicalMutation } from "../../../../../api/authorize-canonical-mutation";
import { NextResponse } from "next/server";
import { ReportNotificationCommandV1Schema, ReportNotificationViewV1Schema } from "@lasoviet/contracts";
import { privateApiClient, PrivateApiClientError } from "../../../../../api/private-api-client";
import { resolveVerifiedAccountActor, VerifiedAccountResolutionError } from "../../../../../auth/resolve-current-actor";
const headers = {"cache-control": "no-store", "x-robots-tag": "noindex, nofollow"};
type Context = {params: Promise<{reportId: string}>};
async function handle(request: Request, context: Context, mutation: boolean): Promise<Response> {
  const {reportId} = await context.params;
  const url = new URL(request.url);
  if (!/^[0-9a-f-]{36}$/i.test(reportId) || url.searchParams.size) return new NextResponse(null, {status: 400, headers});
  if (mutation && !authorizeCanonicalMutation(request)) return new NextResponse(null, {status: 403, headers});
  try {
    const actor = await resolveVerifiedAccountActor();
    let body;
    if (mutation) {
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return new NextResponse(null, {status: 400, headers});
      const text = await request.text();
      if (text.length > 4096) return new NextResponse(null, {status: 400, headers});
      try { body = ReportNotificationCommandV1Schema.parse(JSON.parse(text)); }
      catch { return new NextResponse(null, {status: 400, headers}); }
    }
    const result = await privateApiClient(actor, actor.requestId).request<{ok: boolean; value?: unknown}>(`/reports/${reportId}/notification`,
      mutation ? {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)} : undefined);
    const parsed = ReportNotificationViewV1Schema.safeParse(result?.ok ? result.value : null);
    if (!parsed.success || parsed.data.reportId !== reportId || (body && parsed.data.reportVersionId !== body.reportVersionId)) return new NextResponse(null, {status: 502, headers});
    return NextResponse.json(parsed.data, {headers});
  } catch (error) {
    if (error instanceof VerifiedAccountResolutionError) return new NextResponse(null, {status: 401, headers});
    if (error instanceof PrivateApiClientError) return new NextResponse(null, {status: [404,409,503].includes(error.status ?? 0) ? error.status : 502, headers});
    throw error;
  }
}
export const GET = (request: Request, context: Context) => handle(request, context, false);
export const POST = (request: Request, context: Context) => handle(request, context, true);
