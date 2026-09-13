function countOccurrences(source: string, target: string): number {
  return source.split(target).length - 1;
}

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

const mockUseSession = vi.fn();
vi.mock("../auth/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

import { SiteHeader } from "./site-header";
import {
  buildSignInCallbackUrl,
  getAccountInitials,
  SiteHeaderSignInLink,
  type HeaderAccountUser,
} from "./site-header-sign-in-link";

describe("getAccountInitials", () => {
  it("extracts first and last initials from multi-word names", () => {
    expect(getAccountInitials("Minh An")).toBe("MA");
    expect(getAccountInitials("Nguyen Van A")).toBe("NA");
    expect(getAccountInitials("  Le   Thi   B  ")).toBe("LB");
  });

  it("handles single-word names and extracts up to 2 characters", () => {
    expect(getAccountInitials("Admin")).toBe("AD");
    expect(getAccountInitials("A")).toBe("A");
  });

  it("handles Vietnamese diacritics and multibyte characters gracefully", () => {
    expect(getAccountInitials("Đức")).toBe("ĐỨ");
    expect(getAccountInitials("Ánh")).toBe("ÁN");
    expect(getAccountInitials("Đặng Văn Đức")).toBe("ĐĐ");
  });

  it("falls back to username from email when name is null, undefined, or empty", () => {
    expect(getAccountInitials(null, "minhan112001@gmail.com")).toBe("MI");
    expect(getAccountInitials(undefined, "user@example.com")).toBe("US");
    expect(getAccountInitials("   ", "a@example.com")).toBe("A");
  });

  it("falls back to TK when both name and email are empty or missing", () => {
    expect(getAccountInitials(null, null)).toBe("TK");
    expect(getAccountInitials("", "")).toBe("TK");
    expect(getAccountInitials(undefined, undefined)).toBe("TK");
  });
});

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

describe("SiteHeader sign-in links (anonymous state)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue(null);
    mockUseSession.mockReturnValue({ data: null, isPending: false });
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

  it("renders sign-in links when account is explicitly null", () => {
    const header = SiteHeader({ locale: "vi", account: null });
    const html = renderToStaticMarkup(header);

    expect(countOccurrences(html, 'href="/dang-nhap"')).toBe(2);
    expect(html).not.toContain("account-link");
    expect(html).not.toContain("/tai-khoan");
  });

  it("preserves anonymous sign-in state when session user is anonymous", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "anon-1", name: "Anonymous", email: "anon@example.com", isAnonymous: true },
        session: { id: "sess-1", userId: "anon-1" },
      },
      isPending: false,
    });
    const header = SiteHeader({ locale: "vi" });
    const html = renderToStaticMarkup(header);

    expect(countOccurrences(html, 'href="/dang-nhap"')).toBe(2);
    expect(html).not.toContain("/tai-khoan");
  });
});

describe("SiteHeader authenticated account state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue(null);
    mockUseSession.mockReturnValue({ data: null, isPending: false });
  });

  const accountWithAvatar: HeaderAccountUser = {
    name: "Nguyen Minh An",
    email: "minhan112001@gmail.com",
    image: "https://lh3.googleusercontent.com/a/avatar-123.jpg",
  };

  const accountWithoutAvatar: HeaderAccountUser = {
    name: "Minh An",
    email: "minhan@example.com",
    image: null,
  };

  const accountWithEmailOnly: HeaderAccountUser = {
    name: null,
    email: "harris1111@gmail.com",
    image: null,
  };

  it("renders desktop and mobile account links pointing to /tai-khoan with Google avatar in VI", () => {
    const header = SiteHeader({ locale: "vi", account: accountWithAvatar });
    const html = renderToStaticMarkup(header);

    // Both desktop and mobile should link to /tai-khoan
    expect(countOccurrences(html, 'href="/tai-khoan"')).toBe(2);
    // Sign-in links must NOT be rendered
    expect(html).not.toContain("/dang-nhap");

    // Accessible labels for Vietnamese
    expect(countOccurrences(html, 'aria-label="Tài khoản"')).toBe(2);
    expect(html).toContain("Tài khoản");

    // Avatar image is rendered with correct attributes
    expect(html).toContain('src="https://lh3.googleusercontent.com/a/avatar-123.jpg"');
    expect(html).toContain('alt="Nguyen Minh An"');
    expect(html).toContain("header-avatar-image");

    // Desktop and mobile classes
    expect(html).toContain("account-link");
    expect(html).toContain("mobile-account-link");
  });

  it("renders desktop and mobile account links pointing to /en/tai-khoan with avatar in EN", () => {
    const header = SiteHeader({ locale: "en", account: accountWithAvatar });
    const html = renderToStaticMarkup(header);

    expect(countOccurrences(html, 'href="/en/tai-khoan"')).toBe(2);
    expect(html).not.toContain("/en/dang-nhap");

    expect(countOccurrences(html, 'aria-label="Account"')).toBe(2);
    expect(html).toContain("Account");

    expect(html).toContain('src="https://lh3.googleusercontent.com/a/avatar-123.jpg"');
    expect(html).toContain('alt="Nguyen Minh An"');
  });

  it("renders deterministic initials fallback when avatar image is not present (VI)", () => {
    const header = SiteHeader({ locale: "vi", account: accountWithoutAvatar });
    const html = renderToStaticMarkup(header);

    expect(countOccurrences(html, 'href="/tai-khoan"')).toBe(2);
    expect(html).not.toContain("header-avatar-image");
    expect(html).toContain("header-avatar-initials");
    expect(html).toContain("MA");
    expect(countOccurrences(html, 'aria-label="Tài khoản"')).toBe(2);
  });

  it("renders deterministic initials fallback from email when name and avatar are missing", () => {
    const header = SiteHeader({ locale: "vi", account: accountWithEmailOnly });
    const html = renderToStaticMarkup(header);

    expect(countOccurrences(html, 'href="/tai-khoan"')).toBe(2);
    expect(html).not.toContain("header-avatar-image");
    expect(html).toContain("header-avatar-initials");
    expect(html).toContain("HA");
  });

  it("resolves authenticated account from authClient.useSession when account prop is omitted", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "usr-google-1",
          name: "Google User",
          email: "googleuser@gmail.com",
          image: "https://lh3.googleusercontent.com/user.jpg",
          isAnonymous: false,
        },
        session: { id: "sess-google-1", userId: "usr-google-1" },
      },
      isPending: false,
    });

    const header = SiteHeader({ locale: "vi" });
    const html = renderToStaticMarkup(header);

    expect(countOccurrences(html, 'href="/tai-khoan"')).toBe(2);
    expect(html).not.toContain("/dang-nhap");
    expect(html).toContain('src="https://lh3.googleusercontent.com/user.jpg"');
    expect(html).toContain("Tài khoản");
  });

  it("renders account link in discipline variant as well", () => {
    const header = SiteHeader({
      locale: "vi",
      variant: "discipline",
      currentPath: "/tu-vi",
      account: accountWithAvatar,
    });
    const html = renderToStaticMarkup(header);

    expect(countOccurrences(html, 'href="/tai-khoan"')).toBe(2);
    expect(html).not.toContain("/dang-nhap");
  });
});
