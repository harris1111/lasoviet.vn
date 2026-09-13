import { NextResponse, type NextRequest } from "next/server";

export const CANONICAL_ORIGIN = "https://lasoviet.net";

export const RESERVE_HOSTS: ReadonlySet<string> = new Set([
  "lasoviet.vn",
  "lasoviet.cloud",
  "lasoviet.xyz",
]);

function parseHostname(rawHost: string): string | null {
  const trimmed = rawHost.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("[")) {
    const closeBracket = trimmed.indexOf("]");
    if (closeBracket === -1) {
      return null;
    }
    return trimmed.slice(1, closeBracket).toLowerCase();
  }

  const colonIndex = trimmed.indexOf(":");
  const hostWithoutPort =
    colonIndex !== -1 ? trimmed.slice(0, colonIndex) : trimmed;
  const lower = hostWithoutPort.toLowerCase();
  return lower.endsWith(".") ? lower.slice(0, -1) : lower;
}

function extractRequestHostname(request: NextRequest | Request): string | null {
  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const parsed = parseHostname(hostHeader);
    if (parsed) {
      return parsed;
    }
  }

  if ("nextUrl" in request && request.nextUrl?.hostname) {
    const parsed = parseHostname(request.nextUrl.hostname);
    if (parsed) {
      return parsed;
    }
  }

  try {
    const url = new URL(request.url);
    if (url.hostname) {
      return parseHostname(url.hostname);
    }
  } catch {
    // Malformed request URL
  }

  return null;
}

export function resolveCanonicalOriginRedirect(
  request: NextRequest | Request,
): NextResponse | null {
  const hostname = extractRequestHostname(request);
  if (!hostname || !RESERVE_HOSTS.has(hostname)) {
    return null;
  }

  try {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, CANONICAL_ORIGIN);
    return NextResponse.redirect(targetUrl, 301);
  } catch {
    return null;
  }
}
