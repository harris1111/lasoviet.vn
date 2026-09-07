const DUMMY_BASE = "https://lasoviet.local";

export function resolveAuthCallbackUrl(
  rawUrl: unknown,
  locale: "vi" | "en" | string,
): string {
  const fallback =
    locale === "en" ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi";

  if (typeof rawUrl !== "string") {
    return fallback;
  }

  // Reject callbacks with leading or trailing whitespace
  if (rawUrl !== rawUrl.trim()) {
    return fallback;
  }

  if (
    !rawUrl.startsWith("/") ||
    rawUrl.startsWith("//") ||
    rawUrl.includes("\\")
  ) {
    return fallback;
  }

  if (/[\u0000-\u001F\u007F-\u009F]/.test(rawUrl)) {
    return fallback;
  }

  try {
    const parsed = new URL(rawUrl, DUMMY_BASE);
    if (parsed.origin !== DUMMY_BASE) {
      return fallback;
    }

    if (
      !parsed.pathname.startsWith("/") ||
      parsed.pathname.startsWith("//")
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
