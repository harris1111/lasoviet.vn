"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "../auth/auth-client";

const DUMMY_BASE = "https://lasoviet.local";

export type HeaderAccountUser = {
  name?: string | null;
  email: string;
  image?: string | null;
};

export function getAccountInitials(
  name?: string | null,
  email?: string | null,
): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];
    if (parts.length >= 2 && firstPart && lastPart) {
      const first = Array.from(firstPart)[0];
      const last = Array.from(lastPart)[0];
      if (first && last) {
        return `${first}${last}`.toUpperCase();
      }
    }
    if (firstPart) {
      const chars = Array.from(firstPart);
      if (chars.length >= 2 && chars[0] && chars[1]) {
        return `${chars[0]}${chars[1]}`.toUpperCase();
      }
      if (chars[0]) {
        return chars[0].toUpperCase();
      }
    }
  }

  if (email && email.trim().length > 0) {
    const username = email.trim().split("@")[0] || "";
    const chars = Array.from(username);
    if (chars.length >= 2 && chars[0] && chars[1]) {
      return `${chars[0]}${chars[1]}`.toUpperCase();
    }
    if (chars[0]) {
      return chars[0].toUpperCase();
    }
  }

  return "TK";
}

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
  account?: HeaderAccountUser | null;
  children?: ReactNode;
};

export function SiteHeaderSignInLink({
  locale,
  currentPath,
  className,
  style,
  account,
  children,
}: SiteHeaderSignInLinkProps) {
  const pathname = usePathname();
  const session = authClient.useSession();

  let activeAccount: HeaderAccountUser | null = null;
  if (account !== undefined) {
    activeAccount = account;
  } else if (session?.data?.user && (session.data.user as { isAnonymous?: boolean }).isAnonymous !== true) {
    activeAccount = {
      name: session.data.user.name,
      email: session.data.user.email,
      image: session.data.user.image,
    };
  }

  if (activeAccount) {
    const isVi = locale === "vi";
    const accountHref = isVi ? "/tai-khoan" : "/en/tai-khoan";
    const initials = getAccountInitials(activeAccount.name, activeAccount.email);
    const isMobile = Boolean(className && className.includes("mobile-login-link"));
    const labelText = isVi ? "Tài khoản" : "Account";

    const avatar = activeAccount.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={activeAccount.name || labelText}
        className="header-avatar-image"
        height={28}
        src={activeAccount.image}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
        }}
        width={28}
      />
    ) : (
      <span
        aria-hidden="true"
        className="header-avatar-initials"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: "var(--lacquer-800, #201b15)",
          border: "1px solid var(--lacquer-line, #383025)",
          color: "var(--gold-400, #f2dca0)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 600,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {initials}
      </span>
    );

    if (isMobile) {
      return (
        <Link
          aria-label={labelText}
          className={className ? `${className} mobile-account-link` : "mobile-account-link"}
          href={accountHref}
          style={style}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
            {avatar}
            <span>{labelText}</span>
          </span>
          <svg
            aria-hidden="true"
            className="icon"
            focusable="false"
            viewBox="0 0 24 24"
          >
            <path d="M9 5.5l6.5 6.5L9 18.5" />
          </svg>
        </Link>
      );
    }

    return (
      <Link
        aria-label={labelText}
        className={className ? `${className} account-link` : "login-link account-link"}
        href={accountHref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          ...style,
        }}
      >
        {avatar}
        <span className="account-link-label">{labelText}</span>
      </Link>
    );
  }

  const effectivePath = currentPath ?? (pathname ?? undefined);
  const href = buildSignInCallbackUrl(locale, effectivePath);

  return (
    <Link className={className} href={href} style={style}>
      {children}
    </Link>
  );
}
