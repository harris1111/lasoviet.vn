import { NextResponse, type NextRequest } from "next/server";

export const LEGACY_DISCIPLINE_ALIASES: Readonly<Record<string, string>> = {
  "/la-so-tu-vi": "/tu-vi",
  "/la-so-bat-tu": "/bat-tu",
  "/gieo-que-kinh-dich": "/kinh-dich",
  "/ban-do-sao": "/chiem-tinh",
  "/boi-bai/tarot": "/boi-bai",
  // 2026-10-02: /troi-nam was promoted to be the root homepage.
  "/troi-nam": "/",
};

export function resolveLegacyAliasRedirect(
  request: NextRequest | Request,
): NextResponse | null {
  const url = new URL(request.url);
  const pathname =
    url.pathname.length > 1 && url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;

  let targetCanonical: string | undefined;
  let isEnglish = false;

  if (pathname.startsWith("/en/")) {
    const viSubpath = pathname.slice(3);
    targetCanonical = LEGACY_DISCIPLINE_ALIASES[viSubpath];
    isEnglish = true;
  } else {
    targetCanonical = LEGACY_DISCIPLINE_ALIASES[pathname];
  }

  if (targetCanonical === undefined) {
    return null;
  }

  const targetUrl = new URL(url.toString());
  const rawTargetPath = isEnglish ? `/en${targetCanonical}` : targetCanonical;
  // A root target (e.g. "/troi-nam" -> "/") combined with the English prefix
  // would otherwise produce "/en/" — strip the trailing slash so it's "/en".
  targetUrl.pathname =
    rawTargetPath.length > 1 && rawTargetPath.endsWith("/") ? rawTargetPath.slice(0, -1) : rawTargetPath;

  return NextResponse.redirect(targetUrl, 301);
}
