function countOccurrences(source: string, target: string): number {
  return source.split(target).length - 1;
}

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";
import {
  buildSignInCallbackUrl,
  SiteHeaderSignInLink,
} from "./site-header-sign-in-link";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("buildSignInCallbackUrl", () => {
  it("returns default sign-in route when path is not provided or not a string", () => {
    expect(buildSignInCallbackUrl("vi")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("en")).toBe("/en/dang-nhap");
    expect(buildSignInCallbackUrl("vi", undefined)).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", null)).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "")).toBe("/dang-nhap");
  });

  it("encodes valid same-site pathnames for VI and EN", () => {
    expect(buildSignInCallbackUrl("vi", "/la-so/chart-123")).toBe(
      "/dang-nhap?callbackURL=%2Fla-so%2Fchart-123",
    );
    expect(buildSignInCallbackUrl("en", "/en/la-so/chart-123")).toBe(
      "/en/dang-nhap?callbackURL=%2Fen%2Fla-so%2Fchart-123",
    );
  });

  it("strips query string and hash, preserving only the clean pathname", () => {
    expect(buildSignInCallbackUrl("vi", "/la-so/chart-123?utm=1#section")).toBe(
      "/dang-nhap?callbackURL=%2Fla-so%2Fchart-123",
    );
  });

  it("rejects leading or trailing whitespace rather than silently trimming it", () => {
    expect(buildSignInCallbackUrl("vi", " /la-so/chart-123")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "/la-so/chart-123 ")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "\t/la-so/chart-123")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("en", " /en/la-so/chart-123 ")).toBe("/en/dang-nhap");
  });

  it("rejects protocol-relative, absolute, or control-character paths", () => {
    expect(buildSignInCallbackUrl("vi", "//evil.com")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "https://evil.com")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "/path\\traversal")).toBe("/dang-nhap");
    expect(buildSignInCallbackUrl("vi", "/path\u0000null")).toBe("/dang-nhap");
  });
});

describe("SiteHeader sign-in links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue(null);
  });

  it("renders desktop and mobile sign-in links with exact chart callback (count 2) in VI", () => {
    const chartPath = "/la-so/c-test-456";
    const header = SiteHeader({ locale: "vi", currentPath: chartPath });
    const html = renderToStaticMarkup(header);

    const expectedHref = "/dang-nhap?callbackURL=" + encodeURIComponent(chartPath);

    expect(html).toContain("class=\"login-link\"");
    expect(html).toContain("class=\"mobile-login-link\"");

    expect(countOccurrences(html, `href="${expectedHref}"`)).toBe(2);
  });

  it("renders desktop and mobile sign-in links with exact chart callback (count 2) in EN", () => {
    const chartPath = "/en/la-so/c-test-456";
    const header = SiteHeader({ locale: "en", currentPath: chartPath });
    const html = renderToStaticMarkup(header);

    const expectedHref = "/en/dang-nhap?callbackURL=" + encodeURIComponent(chartPath);

    expect(html).toContain("class=\"login-link\"");
    expect(html).toContain("class=\"mobile-login-link\"");

    expect(countOccurrences(html, `href="${expectedHref}"`)).toBe(2);
  });

  it("falls back to default sign-in path on desktop and mobile (count 2) when no path is supplied", () => {
    const headerVi = SiteHeader({ locale: "vi" });
    const htmlVi = renderToStaticMarkup(headerVi);
    expect(countOccurrences(htmlVi, 'href="/dang-nhap"')).toBe(2);

    const headerEn = SiteHeader({ locale: "en" });
    const htmlEn = renderToStaticMarkup(headerEn);
    expect(countOccurrences(htmlEn, 'href="/en/dang-nhap"')).toBe(2);
  });

  it("uses client pathname when currentPath is omitted from header caller", () => {
    mockUsePathname.mockReturnValue("/tao-la-so/tu-vi");
    const headerVi = SiteHeader({ locale: "vi" });
    const htmlVi = renderToStaticMarkup(headerVi);

    const expectedHref = "/dang-nhap?callbackURL=" + encodeURIComponent("/tao-la-so/tu-vi");
    expect(countOccurrences(htmlVi, `href="${expectedHref}"`)).toBe(2);
  });
});
