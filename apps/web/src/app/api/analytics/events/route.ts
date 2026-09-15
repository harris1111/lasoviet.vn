import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";

import { AnalyticsEventV1Schema } from "@lasoviet/config";
import {
  BrowserAnalyticsEventRequestV1Schema,
  type PrivateAnalyticsIngestRequestV1,
} from "@lasoviet/contracts";

import { sendAnalyticsIngestCommand } from "../../../../analytics/analytics-client";
import {
  generateVisitorId,
  resolveVisitorId,
  setVisitorCookie,
  VISITOR_COOKIE_NAME,
} from "../../../../analytics/visitor-cookie";
import { getAuth } from "../../../../auth/auth";

export function classifyDevice(
  userAgent: string | null,
): "mobile" | "tablet" | "desktop" | "bot" | "unknown" {
  if (!userAgent) {
    return "unknown";
  }
  const ua = userAgent.toLowerCase();
  if (
    ua.includes("bot") ||
    ua.includes("crawl") ||
    ua.includes("spider") ||
    ua.includes("slurp") ||
    ua.includes("bingpreview") ||
    ua.includes("facebookexternalhit") ||
    ua.includes("google-read-aloud")
  ) {
    return "bot";
  }
  if (
    ua.includes("ipad") ||
    ua.includes("tablet") ||
    (ua.includes("android") && !ua.includes("mobi"))
  ) {
    return "tablet";
  }
  if (
    ua.includes("mobile") ||
    ua.includes("iphone") ||
    ua.includes("ipod") ||
    ua.includes("android") ||
    ua.includes("webos") ||
    ua.includes("blackberry") ||
    ua.includes("opera mini") ||
    ua.includes("iemobile")
  ) {
    return "mobile";
  }
  if (
    ua.includes("mozilla") ||
    ua.includes("chrome") ||
    ua.includes("safari") ||
    ua.includes("edge") ||
    ua.includes("windows") ||
    ua.includes("macintosh") ||
    ua.includes("linux")
  ) {
    return "desktop";
  }
  return "unknown";
}

export function extractTrustedClientIp(headers: Headers): string | null {
  const headerValue = headers.get("x-lasoviet-client-ip");
  if (!headerValue) {
    return null;
  }
  const trimmed = headerValue.trim();
  if (trimmed.includes(",") || trimmed.includes(" ") || isIP(trimmed) === 0) {
    return null;
  }
  return trimmed;
}

export function extractRefererContext(
  headers: Headers,
  requestOrigin: string,
): {
  referrer: string | null;
  pathname: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  locale: "vi" | "en";
} {
  const rawReferer = headers.get("referer");
  if (!rawReferer) {
    return {
      referrer: null,
      pathname: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      locale: "vi",
    };
  }
  try {
    const url = new URL(rawReferer);
    const boundedReferrer = rawReferer.trim().slice(0, 2048);

    // Cross-origin referer must not contribute first-party pathname or UTM params
    if (url.origin.toLowerCase() !== requestOrigin.toLowerCase()) {
      return {
        referrer: boundedReferrer,
        pathname: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        utmTerm: null,
        locale: "vi",
      };
    }

    const pathname = url.pathname.slice(0, 512);
    const locale =
      pathname === "/en" || pathname.startsWith("/en/") ? "en" : "vi";
    return {
      referrer: boundedReferrer,
      pathname,
      utmSource: url.searchParams.get("utm_source")?.trim().slice(0, 128) ?? null,
      utmMedium: url.searchParams.get("utm_medium")?.trim().slice(0, 128) ?? null,
      utmCampaign:
        url.searchParams.get("utm_campaign")?.trim().slice(0, 128) ?? null,
      utmContent:
        url.searchParams.get("utm_content")?.trim().slice(0, 128) ?? null,
      utmTerm: url.searchParams.get("utm_term")?.trim().slice(0, 128) ?? null,
      locale,
    };
  } catch {
    return {
      referrer: null,
      pathname: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      locale: "vi",
    };
  }
}

async function observeAccountUserId(headers: Headers): Promise<string | null> {
  try {
    const session = await getAuth().api.getSession({
      headers,
      query: { disableCookieCache: true },
    });
    const sessionUserId = session?.session?.userId;
    const user = session?.user;
    if (
      typeof sessionUserId === "string" &&
      typeof user?.id === "string" &&
      sessionUserId.trim() !== "" &&
      user.id.trim() !== "" &&
      sessionUserId === user.id &&
      user.isAnonymous !== true
    ) {
      return user.id;
    }
    return null;
  } catch {
    return null;
  }
}

function respond(
  body: unknown,
  status: number,
  cookieToSet?: string,
): NextResponse {
  const response = NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
  if (cookieToSet) {
    setVisitorCookie(response, cookieToSet);
  }
  return response;
}

export function createAnalyticsRouteHandler(options?: {
  now?: () => Date;
}) {
  const getNow = options?.now ?? (() => new Date());

  return async function POST(request: NextRequest): Promise<NextResponse> {
    const rawCookie = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    const { visitorId, isNew: cookieIsNew } = resolveVisitorId(rawCookie);
    const cookieToAttach = cookieIsNew ? visitorId : undefined;

    try {
      const rawRequestId = request.headers.get("x-request-id");
      const requestId =
        rawRequestId &&
        rawRequestId.trim().length > 0 &&
        rawRequestId.trim().length <= 128
          ? rawRequestId.trim()
          : randomUUID();

      const bodyJson = await request.json().catch(() => null);
      const parsed = BrowserAnalyticsEventRequestV1Schema.safeParse(bodyJson);
      if (!parsed.success) {
        return respond(
          { ok: false, error: { code: "ANALYTICS_REQUEST_INVALID" } },
          400,
          cookieToAttach,
        );
      }

      // Reject timestamps skewed more than 5 minutes relative to server clock
      const nowMs = getNow().getTime();
      const occurredAtMs = new Date(parsed.data.occurredAt).getTime();
      const maxSkewMs = 5 * 60 * 1000;
      if (
        isNaN(occurredAtMs) ||
        occurredAtMs > nowMs + maxSkewMs ||
        occurredAtMs < nowMs - maxSkewMs
      ) {
        return respond(
          { ok: false, error: { code: "ANALYTICS_REQUEST_INVALID" } },
          400,
          cookieToAttach,
        );
      }

      const configValidation = AnalyticsEventV1Schema.safeParse(
        parsed.data.event,
      );
      if (!configValidation.success) {
        return respond(
          { ok: false, error: { code: "ANALYTICS_EVENT_INVALID" } },
          400,
          cookieToAttach,
        );
      }

      const userId = await observeAccountUserId(request.headers);
      const ip = extractTrustedClientIp(request.headers);
      const userAgent =
        request.headers.get("user-agent")?.trim().slice(0, 512) ?? null;
      const deviceClass = classifyDevice(userAgent);
      const refererContext = extractRefererContext(
        request.headers,
        request.nextUrl.origin,
      );

      const ingestRequest: PrivateAnalyticsIngestRequestV1 = {
        version: 1,
        idempotencyKey: parsed.data.idempotencyKey,
        occurredAt: parsed.data.occurredAt,
        event: parsed.data.event,
        visitorId,
        userId,
        requestId,
        ip,
        userAgent,
        referrer: refererContext.referrer,
        utmSource: refererContext.utmSource,
        utmMedium: refererContext.utmMedium,
        utmCampaign: refererContext.utmCampaign,
        utmContent: refererContext.utmContent,
        utmTerm: refererContext.utmTerm,
        deviceClass,
        locale: refererContext.locale,
        pathname: refererContext.pathname,
      };

      const result = await sendAnalyticsIngestCommand(ingestRequest);

      if (result.ok) {
        return respond(
          { ok: true, value: { replayed: result.value.replayed } },
          200,
          cookieToAttach,
        );
      }

      if (result.error.code === "VISITOR_ACCOUNT_CONFLICT") {
        const rotatedVisitorId = generateVisitorId();
        return respond(
          { ok: false, error: { code: "VISITOR_ACCOUNT_CONFLICT" } },
          409,
          rotatedVisitorId,
        );
      }

      const status =
        result.error.code === "IDEMPOTENCY_KEY_CONFLICT"
          ? 409
          : result.error.code === "ANALYTICS_DELIVERY_FAILED"
            ? 503
            : 400;

      return respond(
        { ok: false, error: { code: result.error.code } },
        status,
        cookieToAttach,
      );
    } catch {
      return respond(
        { ok: false, error: { code: "ANALYTICS_DELIVERY_FAILED" } },
        503,
        cookieToAttach,
      );
    }
  };
}

export const POST = createAnalyticsRouteHandler();
