import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { HeaderAccountUser } from "./site-header-sign-in-link";
import { SiteHeaderSignInLink } from "./site-header-sign-in-link";
import { ThemeToggle } from "./theme-toggle";
export type { HeaderAccountUser };

export type DisciplineNavLink = {
  label: string;
  href: string;
  active: boolean;
};

export function getDisciplineNavLinks(
  locale: "en" | "vi",
  currentPath?: string,
): DisciplineNavLink[] {
  const isVietnamese = locale === "vi";
  const items: Array<{ label: string; subpath: string }> = isVietnamese
    ? [
        { label: "Trang chủ", subpath: "" },
        { label: "Tử Vi", subpath: "/tu-vi" },
        { label: "Bát Tự", subpath: "/bat-tu" },
        { label: "Kinh Dịch", subpath: "/kinh-dich" },
        { label: "Chiêm Tinh", subpath: "/chiem-tinh" },
        { label: "Thần Số Học", subpath: "/than-so-hoc" },
        { label: "Kiến thức", subpath: "/kien-thuc" },
        { label: "Công cụ miễn phí", subpath: "/cong-cu-mien-phi" },
      ]
    : [
        { label: "Home", subpath: "" },
        { label: "Zi Wei", subpath: "/tu-vi" },
        { label: "BaZi", subpath: "/bat-tu" },
        { label: "I Ching", subpath: "/kinh-dich" },
        { label: "Astrology", subpath: "/chiem-tinh" },
        { label: "Numerology", subpath: "/than-so-hoc" },
        { label: "Knowledge", subpath: "/kien-thuc" },
        { label: "Free tools", subpath: "/cong-cu-mien-phi" },
      ];

  return items.map(({ label, subpath }) => {
    const href = isVietnamese
      ? (subpath === "" ? "/" : subpath)
      : (subpath === "" ? "/en" : "/en" + subpath);
    const active = currentPath === href;
    return { label, href, active };
  });
}

export type SiteHeaderProps = {
  locale: "en" | "vi";
  variant?: "default" | "discipline";
  currentPath?: string;
  signInReturnPath?: string;
  contactPath?: string;
  accentColor?: string;
  account?: HeaderAccountUser | null;
};

function route(locale: "en" | "vi", path: string) {
  return locale === "en" ? "/en" + path : path;
}

function renderHeaderIcon(name: "menu" | "chevron-right") {
  return React.createElement(
    "svg",
    {
      "aria-hidden": "true",
      className: "icon",
      viewBox: "0 0 24 24",
      focusable: "false",
    },
    React.createElement("path", {
      d:
        name === "menu"
          ? "M3.5 6.5h17M3.5 12h17M3.5 17.5h17"
          : "M9 5.5l6.5 6.5L9 18.5",
    }),
  );
}

export function SiteHeader({
  locale,
  variant = "default",
  currentPath,
  signInReturnPath,
  contactPath = "/lien-he",
  accentColor,
  account,
}: SiteHeaderProps) {
  const contactHref = route(locale, contactPath);
  const isVietnamese = locale === "vi";
  const isDiscipline = variant === "discipline";

  const defaultLinks = [
    [isVietnamese ? "Dịch vụ" : "Services", isVietnamese ? "/#dich-vu" : "/en#dich-vu"],
    [isVietnamese ? "Công cụ miễn phí" : "Free tools", route(locale, "/cong-cu-mien-phi")],
    [isVietnamese ? "Kiến thức" : "Knowledge", route(locale, "/kien-thuc")],
    [isVietnamese ? "Liên hệ" : "Contact", contactHref],
  ] as const;

  const disciplineNavItems = isDiscipline
    ? [
        ...getDisciplineNavLinks(locale, currentPath),
        {
          label: isVietnamese ? "Liên hệ" : "Contact",
          href: contactHref,
          active: currentPath === contactHref,
        },
      ]
    : [];

  const localeSwitcherHref = isVietnamese
    ? (currentPath ? (currentPath === "/" ? "/en" : "/en" + currentPath) : "/en")
    : (currentPath ? (currentPath === "/en" ? "/vi" : "/vi" + currentPath.replace(/^\/en/, "")) : "/vi");

  return React.createElement(
    React.Fragment,
    null,
    // The scrolling trust-commitment marquee was removed here (revamp wave 1a,
    // FD-091 spec: "bỏ dải chữ chạy"). The same four commitments now live as
    // static trust-strip copy inside the homepage hero.
    React.createElement(
      "header",
      { className: "site-header" + (isDiscipline ? " site-header-discipline" : "") },
      React.createElement(
        "div",
        { className: "container header-inner" },
        React.createElement(
          Link,
          {
            className: "brand",
            href: route(locale, "/"),
            "aria-label": isVietnamese ? "Lá Số Việt" : "La So Viet",
          },
          React.createElement(Image, {
            alt: isVietnamese ? "Lá Số Việt" : "La So Viet",
            className: "brand-logo",
            height: 28,
            priority: true,
            src: "/brand/lasoviet-logo-ngang-vang-son.svg",
            width: 160,
          }),
          React.createElement(Image, {
            alt: "",
            "aria-hidden": true,
            className: "brand-logo-light",
            height: 28,
            src: "/brand/lasoviet-logo-ngang-dao-muc.svg",
            width: 160,
          }),
          React.createElement(
            "span",
            { className: "sr-only" },
            isVietnamese ? "Lá Số Việt" : "La So Viet",
          ),
        ),
        React.createElement(
          "nav",
          {
            className: "desktop-nav" + (isDiscipline ? " ls-nav-links" : ""),
            "aria-label": isVietnamese ? "Điều hướng chính" : "Primary navigation",
          },
          isDiscipline
            ? disciplineNavItems.map((item) =>
                React.createElement(
                  Link,
                  {
                    key: item.href,
                    href: item.href,
                    className: item.active ? "nav-link-active" : undefined,
                    style:
                      item.active && accentColor
                        ? {
                            color: accentColor,
                            borderBottom: "1px solid " + accentColor,
                            paddingBottom: "2px",
                          }
                        : undefined,
                  },
                  item.label,
                ),
              )
            : defaultLinks.map(([label, href]) =>
                React.createElement(Link, { href, key: href }, label),
              ),
        ),
        React.createElement(
          "div",
          { className: "header-actions" },
          React.createElement(
            "a",
            { className: "locale-link", href: localeSwitcherHref },
            isVietnamese ? "English" : "Tiếng Việt",
          ),
          React.createElement(ThemeToggle, { locale }),
          React.createElement(
            SiteHeaderSignInLink,
            {
              className: "login-link",
              locale,
              currentPath,
              signInReturnPath,
              account,
              style: { color: "var(--pearl-200)", textDecoration: "none", fontSize: "14.5px" },
            },
            isVietnamese ? "Đăng nhập" : "Sign in",
          ),
          React.createElement(
            Link,
            { className: "button button-small", href: route(locale, isDiscipline ? "/tu-vi" : "/tao-la-so/tu-vi") },
            isVietnamese ? "Lập lá số Tử Vi" : "Build Zi Wei chart",
          ),
          React.createElement(
            "details",
            { className: "mobile-menu" },
            React.createElement(
              "summary",
              { "aria-label": isVietnamese ? "Mở điều hướng" : "Open navigation" },
              renderHeaderIcon("menu"),
            ),
            React.createElement(
              "nav",
              {
                id: "mobile-navigation",
                "aria-label": isVietnamese ? "Điều hướng chính" : "Primary navigation",
              },
              isDiscipline
                ? disciplineNavItems.map((item) =>
                    React.createElement(
                      Link,
                      {
                        key: item.href,
                        href: item.href,
                        className: item.active ? "nav-link-active" : undefined,
                      },
                      item.label,
                      renderHeaderIcon("chevron-right"),
                    ),
                  )
                : defaultLinks.map(([label, href]) =>
                    React.createElement(
                      Link,
                      { href, key: href },
                      label,
                      renderHeaderIcon("chevron-right"),
                    ),
                  ),
              React.createElement(
                "a",
                { className: "mobile-locale-link", href: localeSwitcherHref },
                isVietnamese ? "English" : "Tiếng Việt",
                renderHeaderIcon("chevron-right"),
              ),
              React.createElement(
                SiteHeaderSignInLink,
                {
                  className: "mobile-login-link",
                  locale,
                  currentPath,
                  signInReturnPath,
                  account,
                },
                isVietnamese ? "Đăng nhập" : "Sign in",
                renderHeaderIcon("chevron-right"),
              ),
              React.createElement(
                Link,
                { className: "button", href: route(locale, isDiscipline ? "/tu-vi" : "/tao-la-so/tu-vi") },
                isVietnamese ? "Lập lá số Tử Vi" : "Build Zi Wei chart",
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
