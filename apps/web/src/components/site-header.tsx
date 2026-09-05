import React from "react";
import Link from "next/link";

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
  accentColor?: string;
};

function route(locale: "en" | "vi", path: string) {
  return locale === "en" ? "/en" + path : path;
}

function homeAnchor(locale: "en" | "vi", hash: string) {
  return locale === "en" ? "/en#" + hash : "/#" + hash;
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
  accentColor,
}: SiteHeaderProps) {
  const isVietnamese = locale === "vi";
  const isDiscipline = variant === "discipline";

  const defaultLinks = [
    [isVietnamese ? "Lập lá số Tử Vi" : "Zi Wei Chart", homeAnchor(locale, "hero-form")],
    [isVietnamese ? "Các hệ quy chiếu" : "Frameworks", homeAnchor(locale, "he-quy-chieu")],
    [isVietnamese ? "Thư viện tri thức" : "Knowledge", homeAnchor(locale, "kien-thuc")],
    [isVietnamese ? "Về phương pháp" : "Method", homeAnchor(locale, "phuong-phap")],
  ] as const;

  const disciplineLinks = isDiscipline
    ? getDisciplineNavLinks(locale, currentPath)
    : [];

  const localeSwitcherHref = isVietnamese
    ? (currentPath ? (currentPath === "/" ? "/en" : "/en" + currentPath) : "/en")
    : (currentPath ? (currentPath === "/en" ? "/" : currentPath.replace(/^\/en/, "")) : "/");

  return React.createElement(
    React.Fragment,
    null,
    !isDiscipline &&
      React.createElement(
        "div",
        {
          className: "marquee",
          "aria-label": isVietnamese ? "Cam kết dịch vụ" : "Service commitments",
        },
        React.createElement(
          "div",
          { className: "marquee-track" },
          React.createElement(
            "div",
            { className: "marquee-group" },
            React.createElement(
              "span",
              null,
              isVietnamese
                ? "Lập lá số Tử Vi miễn phí - không cần tài khoản"
                : "Free chart creation - no account required",
            ),
            React.createElement(
              "span",
              null,
              isVietnamese
                ? "Căn cứ có thể mở cạnh nhận định"
                : "Evidence can be opened beside insights",
            ),
            React.createElement(
              "span",
              null,
              isVietnamese
                ? "Lá số của bạn riêng tư theo mặc định"
                : "Your chart is private by default",
            ),
            React.createElement(
              "span",
              null,
              isVietnamese
                ? "Thanh toán một lần - không tự động gia hạn"
                : "One-time payment - no automatic renewal",
            ),
          ),
          React.createElement(
            "div",
            { className: "marquee-group", "aria-hidden": "true" },
            React.createElement(
              "span",
              null,
              isVietnamese
                ? "Lập lá số Tử Vi miễn phí - không cần tài khoản"
                : "Free chart creation - no account required",
            ),
            React.createElement(
              "span",
              null,
              isVietnamese
                ? "Căn cứ có thể mở cạnh nhận định"
                : "Evidence can be opened beside insights",
            ),
            React.createElement(
              "span",
              null,
              isVietnamese
                ? "Lá số của bạn riêng tư theo mặc định"
                : "Your chart is private by default",
            ),
            React.createElement(
              "span",
              null,
              isVietnamese
                ? "Thanh toán một lần - không tự động gia hạn"
                : "One-time payment - no automatic renewal",
            ),
          ),
        ),
      ),
    React.createElement(
      "header",
      { className: "site-header" + (isDiscipline ? " site-header-discipline" : "") },
      React.createElement(
        "div",
        { className: "container header-inner" },
        React.createElement(
          Link,
          { className: "brand", href: route(locale, "/") },
          React.createElement(
            "span",
            { "aria-hidden": "true", className: "seal" },
            React.createElement("span", null),
          ),
          React.createElement(
            "span",
            null,
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
            ? disciplineLinks.map((item) =>
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
          React.createElement(
            Link,
            { className: "button button-small", href: route(locale, "/tu-vi") },
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
                ? disciplineLinks.map((item) =>
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
                Link,
                { className: "button", href: route(locale, "/tu-vi") },
                isVietnamese ? "Lập lá số Tử Vi" : "Build Zi Wei chart",
              ),
            ),
          ),
        ),
      ),
    ),
  );
}