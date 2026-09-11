"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DUMMY_BASE = "https://lasoviet.local";

export function buildSignInCallbackUrl(
  locale: "en" | "vi",
  path?: string | null,
): string {
  const prefix = locale === "en" ? "/en" : "";
  const defaultPath = `${prefix}/dang-nhap`;

  if (typeof path !== "string") {
    return defaultPath;
  }

  // Reject callbacks with leading or trailing whitespace, matching auth resolver semantics
  if (path !== path.trim()) {
    return defaultPath;
  }

  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    return defaultPath;
  }

  if (/[\u0000-\u001F\u007F-\u009F]/.test(path)) {
    return defaultPath;
  }

  try {
    const parsed = new URL(path, DUMMY_BASE);
    if (
      parsed.origin !== DUMMY_BASE ||
      !parsed.pathname.startsWith("/") ||
      parsed.pathname.startsWith("//")
    ) {
      return defaultPath;
    }
    const cleanPathname = parsed.pathname;
    return `${defaultPath}?callbackURL=${encodeURIComponent(cleanPathname)}`;
  } catch {
    return defaultPath;
  }
}

export type SiteHeaderSignInLinkProps = {
  locale: "en" | "vi";
  currentPath?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export function SiteHeaderSignInLink({
  locale,
  currentPath,
  className,
  style,
  children,
}: SiteHeaderSignInLinkProps) {
  const pathname = usePathname();
  const effectivePath = currentPath ?? (pathname ?? undefined);
  const href = buildSignInCallbackUrl(locale, effectivePath);

  return (
    <Link className={className} href={href} style={style}>
      {children}
    </Link>
  );
}
