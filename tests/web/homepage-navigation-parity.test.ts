import { describe, expect, it } from "vitest";
import { SiteHeader } from "../../apps/web/src/components/site-header";
import {
  buildSignInCallbackUrl,
  SiteHeaderSignInLink,
} from "../../apps/web/src/components/site-header-sign-in-link";
import { routing } from "../../apps/web/src/i18n/routing";
import { HomepageLenses } from "../../apps/web/src/features/homepage/homepage-lenses";
import { PublicContentPage } from "../../apps/web/src/features/content/public-content-page";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import type { PublicContentRepository } from "../../apps/web/src/features/content/public-content-repository";

function extractAllLinks(element: any): Array<{ href: string; text?: string; className?: string }> {
  const links: Array<{ href: string; text?: string; className?: string }> = [];

  function extractText(node: any): string {
    let text = "";

    function appendText(childNode: any) {
      if (!childNode) return;
      if (typeof childNode === "string" || typeof childNode === "number") {
        text += String(childNode);
      } else if (Array.isArray(childNode)) {
        childNode.forEach(appendText);
      } else if (childNode.props?.children) {
        appendText(childNode.props.children);
      }
    }

    appendText(node);
    return text.trim();
  }

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.type === SiteHeaderSignInLink) {
      links.push({
        href: buildSignInCallbackUrl(node.props.locale, node.props.currentPath),
        text: extractText(node.props.children),
        className: node.props.className,
      });
      return;
    }

    if (node.props?.href) {
      links.push({
        href: node.props.href,
        text: extractText(node.props.children),
        className: node.props.className,
      });
    }

    if (typeof node.type === "function") {
      try {
        walk(node.type(node.props));
      } catch {
        // ignore
      }
    }

    if (node.props?.children) {
      const children = Array.isArray(node.props.children)
        ? node.props.children
        : [node.props.children];
      children.forEach(walk);
    }
  }

  walk(element);
  return links;
}

describe("homepage and navigation prototype parity", () => {
  it("renders homepage default header with prototype links, login, and chart CTA in VI", () => {
    const header = SiteHeader({ locale: "vi" });
    const links = extractAllLinks(header);

    // Nav links
    expect(links.some((l) => l.href === "/#dich-vu" && l.text.includes("Dịch vụ"))).toBe(true);
    expect(links.some((l) => l.href === "/cong-cu-mien-phi" && l.text.includes("Công cụ miễn phí"))).toBe(true);
    expect(links.some((l) => l.href === "/kien-thuc" && l.text.includes("Kiến thức"))).toBe(true);
    expect(links.some((l) => l.href === "/lien-he" && l.text.includes("Liên hệ"))).toBe(true);

    // Desktop and mobile locale switch links
    const desktopLocale = links.find((l) => l.className === "locale-link");
    expect(desktopLocale).toBeDefined();
    expect(desktopLocale?.href).toBe("/en");
    expect(desktopLocale?.text).toContain("English");

    const mobileLocale = links.find((l) => l.className?.includes("mobile-locale-link"));
    expect(mobileLocale).toBeDefined();
    expect(mobileLocale?.href).toBe("/en");
    expect(mobileLocale?.text).toContain("English");

    // Login link
    expect(links.some((l) => l.href === "/dang-nhap" && l.text.includes("Đăng nhập"))).toBe(true);

    // CTA button preserves chart flow
    const ctas = links.filter((l) => l.className?.includes("button") && l.href === "/tao-la-so/tu-vi");
    expect(ctas.length).toBeGreaterThanOrEqual(1);
    expect(ctas[0]?.text).toBe("Lập lá số Tử Vi");
  });

  it("renders homepage default header with prototype links, login, and chart CTA in EN", () => {
    const header = SiteHeader({ locale: "en" });
    const links = extractAllLinks(header);

    // Nav links
    expect(links.some((l) => l.href === "/en#dich-vu" && l.text.includes("Services"))).toBe(true);
    expect(links.some((l) => l.href === "/en/cong-cu-mien-phi" && l.text.includes("Free tools"))).toBe(true);
    expect(links.some((l) => l.href === "/en/kien-thuc" && l.text.includes("Knowledge"))).toBe(true);
    expect(links.some((l) => l.href === "/en/lien-he" && l.text.includes("Contact"))).toBe(true);

    // Desktop and mobile locale switch links
    const desktopLocale = links.find((l) => l.className === "locale-link");
    expect(desktopLocale).toBeDefined();
    expect(desktopLocale?.href).toBe("/vi");
    expect(desktopLocale?.text).toContain("Tiếng Việt");

    const mobileLocale = links.find((l) => l.className?.includes("mobile-locale-link"));
    expect(mobileLocale).toBeDefined();
    expect(mobileLocale?.href).toBe("/vi");
    expect(mobileLocale?.text).toContain("Tiếng Việt");

    // Login link
    expect(links.some((l) => l.href === "/en/dang-nhap" && l.text.includes("Sign in"))).toBe(true);

    // CTA button preserves chart flow
    const ctas = links.filter((l) => l.className?.includes("button") && l.href === "/en/tao-la-so/tu-vi");
    expect(ctas.length).toBeGreaterThanOrEqual(1);
    expect(ctas[0]?.text).toBe("Build Zi Wei chart");
  });

  it("renders discipline variant header with prototype contact link and login route", () => {
    const headerVi = SiteHeader({ locale: "vi", variant: "discipline", currentPath: "/bat-tu" });
    const linksVi = extractAllLinks(headerVi);

    expect(linksVi.some((l) => l.href === "/lien-he" && l.text.includes("Liên hệ"))).toBe(true);
    expect(linksVi.some((l) =>
      l.href === "/dang-nhap?callbackURL=%2Fbat-tu" &&
      l.text.includes("Đăng nhập")
    )).toBe(true);
    expect(linksVi.some((l) => l.href === "/tu-vi" && l.className?.includes("button"))).toBe(true);
    const mobileVi = linksVi.find((l) => l.className?.includes("mobile-locale-link"));
    expect(mobileVi?.href).toBe("/en/bat-tu");
    expect(mobileVi?.text).toContain("English");

    const headerEn = SiteHeader({ locale: "en", variant: "discipline", currentPath: "/en/chiem-tinh" });
    const linksEn = extractAllLinks(headerEn);

    expect(linksEn.some((l) => l.href === "/en/lien-he" && l.text.includes("Contact"))).toBe(true);
    expect(linksEn.some((l) =>
      l.href === "/en/dang-nhap?callbackURL=%2Fen%2Fchiem-tinh" &&
      l.text.includes("Sign in")
    )).toBe(true);
    expect(linksEn.some((l) => l.href === "/en/tu-vi" && l.className?.includes("button"))).toBe(true);
    const mobileEn = linksEn.find((l) => l.className?.includes("mobile-locale-link"));
    expect(mobileEn?.href).toBe("/vi/chiem-tinh");
    expect(mobileEn?.text).toContain("Tiếng Việt");
  });

  it("renders homepage discipline cards linking directly to built production routes and free tools in VI", () => {
    const lenses = HomepageLenses({ locale: "vi" });
    expect(lenses.props.id).toBe("dich-vu");

    const links = extractAllLinks(lenses);
    const hrefs = links.map((l) => l.href);

    // Built discipline routes
    expect(hrefs).toContain("/tao-la-so/tu-vi");
    expect(hrefs).toContain("/bat-tu");
    expect(hrefs).toContain("/chiem-tinh");
    expect(hrefs).toContain("/than-so-hoc");
    expect(hrefs).toContain("/kinh-dich");

    // Free tools hub and individual free tools
    expect(hrefs).toContain("/cong-cu-mien-phi");
    expect(hrefs).toContain("/ngay-tot");
    expect(hrefs).toContain("/12-con-giap");
    expect(hrefs).toContain("/phong-thuy/huong-nha");
    expect(hrefs).toContain("/giai-ma-giac-mo");
    expect(hrefs).toContain("/boi-bai");
    expect(hrefs).toContain("/lich-am");
    expect(hrefs).toContain("/xem-chi-tay");
  });

  it("renders homepage discipline cards and free tools with localized paths in EN", () => {
    const lenses = HomepageLenses({ locale: "en" });
    expect(lenses.props.id).toBe("dich-vu");

    const links = extractAllLinks(lenses);
    const hrefs = links.map((l) => l.href);

    expect(hrefs).toContain("/en/tao-la-so/tu-vi");
    expect(hrefs).toContain("/en/bat-tu");
    expect(hrefs).toContain("/en/chiem-tinh");
    expect(hrefs).toContain("/en/than-so-hoc");
    expect(hrefs).toContain("/en/kinh-dich");

    expect(hrefs).toContain("/en/cong-cu-mien-phi");
    expect(hrefs).toContain("/en/ngay-tot");
    expect(hrefs).toContain("/en/12-con-giap");
    expect(hrefs).toContain("/en/phong-thuy/huong-nha");
    expect(hrefs).toContain("/en/giai-ma-giac-mo");
    expect(hrefs).toContain("/en/boi-bai");
    expect(hrefs).toContain("/en/lich-am");
    expect(hrefs).toContain("/en/xem-chi-tay");
  });

  it("disables cookie and browser locale detection in routing while defaulting to vi", () => {
    expect(routing.defaultLocale).toBe("vi");
    expect(routing.locales).toEqual(["vi", "en"]);
    expect(routing.localeDetection).toBe(false);
  });

  it("renders mobile language switch preserving currentPath on VI and EN", () => {
    const headerVi = SiteHeader({ locale: "vi", currentPath: "/tu-vi" });
    const linksVi = extractAllLinks(headerVi);
    const mobileVi = linksVi.find((l) => l.className?.includes("mobile-locale-link"));
    expect(mobileVi).toBeDefined();
    expect(mobileVi?.href).toBe("/en/tu-vi");
    expect(mobileVi?.text).toContain("English");

    const headerEn = SiteHeader({ locale: "en", currentPath: "/en/tu-vi" });
    const linksEn = extractAllLinks(headerEn);
    const mobileEn = linksEn.find((l) => l.className?.includes("mobile-locale-link"));
    expect(mobileEn).toBeDefined();
    expect(mobileEn?.href).toBe("/vi/tu-vi");
    expect(mobileEn?.text).toContain("Tiếng Việt");
  });

  it("renders PublicContentPage preserving currentPath in mobile language switch for VI and EN", () => {
    const routeVi: RouteDefinitionV1 = {
      id: "terms",
      path: "/dieu-khoan",
      template: "generic",
      intent: "informational",
      localeBehavior: "localized",
      localeOwners: ["vi", "en"],
      owner: "legal",
      indexing: "index_follow",
      canonical: "self",
      robots: "index,follow",
      schemaTypes: ["WebPage"],
      redirect: { disposition: "none" },
      status: "live_indexable",
      sitemap: true,
      private: false,
      purchasable: false,
    };

    const contentVi: PublicContentV1 = {
      id: "terms",
      routeId: "terms",
      locale: "vi",
      title: "Điều khoản dịch vụ",
      summary: "Tóm tắt điều khoản",
      body: "Nội dung điều khoản",
      category: "legal",
      tags: [],
      metadata: {},
    };

    const dummyRepo: PublicContentRepository = {
      getBySlug: () => null,
      listAll: () => [],
    } as unknown as PublicContentRepository;

    const pageVi = PublicContentPage({
      content: contentVi,
      locale: "vi",
      repository: dummyRepo,
      route: routeVi,
      routes: [routeVi],
    });

    const linksVi = extractAllLinks(pageVi);
    const mobileVi = linksVi.find((l) => l.className?.includes("mobile-locale-link"));
    expect(mobileVi).toBeDefined();
    expect(mobileVi?.href).toBe("/en/dieu-khoan");
    expect(mobileVi?.text).toContain("English");

    const contentEn: PublicContentV1 = {
      id: "terms-en",
      routeId: "terms",
      locale: "en",
      title: "Terms of Service",
      summary: "Summary of terms",
      body: "Terms content",
      category: "legal",
      tags: [],
      metadata: {},
    };

    const pageEn = PublicContentPage({
      content: contentEn,
      locale: "en",
      repository: dummyRepo,
      route: routeVi,
      routes: [routeVi],
    });

    const linksEn = extractAllLinks(pageEn);
    const mobileEn = linksEn.find((l) => l.className?.includes("mobile-locale-link"));
    expect(mobileEn).toBeDefined();
    expect(mobileEn?.href).toBe("/vi/dieu-khoan");
    expect(mobileEn?.text).toContain("Tiếng Việt");
  });
});
