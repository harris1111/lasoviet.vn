export type SupportedLocale = "vi" | "en";
export type Locale = SupportedLocale;

export const SUPPORTED_LOCALES = ["vi", "en"] as const;

export function resolveLocale(
  pathname: string,
  cookieLocale?: string,
): SupportedLocale {
  const path = pathname.split(/[?#]/, 1)[0] || "/";

  if (path === "/en" || path.startsWith("/en/")) {
    return "en";
  }
  if (path === "/vi" || path.startsWith("/vi/")) {
    return "vi";
  }
  return cookieLocale === "en" ? "en" : "vi";
}
