import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { resolveLocale } from "@lasoviet/contracts";
import { routing } from "./i18n/routing";
import { resolveCanonicalOriginRedirect } from "./routing/canonical-origin";
import {
  isExplicitVietnamesePath,
  isUnprefixedCanonicalReportPath,
} from "./routing/explicit-vietnamese-path";
import { resolveLegacyAliasRedirect } from "./routing/legacy-alias";
import { ensureVisitorCookie } from "./analytics/visitor-cookie";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const canonicalRedirect = resolveCanonicalOriginRedirect(request);
  if (canonicalRedirect !== null) {
    ensureVisitorCookie(request, canonicalRedirect);
    return canonicalRedirect;
  }

  const aliasRedirect = resolveLegacyAliasRedirect(request);
  if (aliasRedirect !== null) {
    ensureVisitorCookie(request, aliasRedirect);
    return aliasRedirect;
  }

  const pathname = request.nextUrl.pathname;
  if (isExplicitVietnamesePath(pathname)) {
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", "vi", {
      maxAge: 31_536_000,
      path: "/",
      sameSite: "lax",
    });
    ensureVisitorCookie(request, response);
    return response;
  }

  if (isUnprefixedCanonicalReportPath(pathname)) {
    request.cookies.set("NEXT_LOCALE", "vi");
  }

  const response = handleI18nRouting(request);
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = resolveLocale(request.nextUrl.pathname, cookieLocale);

  response.cookies.set("NEXT_LOCALE", locale, {
    maxAge: 31_536_000,
    path: "/",
    sameSite: "lax",
  });
  ensureVisitorCookie(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!api|health|trpc|_next|_vercel|.*\\..*).*)"],
};
