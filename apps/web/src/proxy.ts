import createMiddleware from "next-intl/middleware";
import type {NextRequest} from "next/server";
import {resolveLocale} from "@lasoviet/contracts";
import {routing} from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = resolveLocale(request.nextUrl.pathname, cookieLocale);

  response.cookies.set("NEXT_LOCALE", locale, {
    maxAge: 31_536_000,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|health|trpc|_next|_vercel|.*\\..*).*)"],
};
