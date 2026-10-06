import { CANONICAL_ORIGIN } from "../routing/canonical-origin";

/** Browser financial commands trust the canonical Origin, never proxy Host headers. */
export function authorizeCanonicalMutation(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (origin === CANONICAL_ORIGIN) return true;
  if (process.env.NODE_ENV !== "development" || origin === null) return false;
  return origin === new URL(request.url).origin;
}
