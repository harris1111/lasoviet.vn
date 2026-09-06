import { describe, expect, it } from "vitest";
import { SiteHeader } from "../../apps/web/src/components/site-header";
import { HomepageLenses } from "../../apps/web/src/features/homepage/homepage-lenses";

function extractAllLinks(element: any): Array<{ href: string; text?: string; className?: string }> {
  const links: Array<{ href: string; text?: string; className?: string }> = [];

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.props?.href) {
      let text = "";
      function extractText(childNode: any) {
        if (!childNode) return;
        if (typeof childNode === "string" || typeof childNode === "number") {
          text += String(childNode);
        } else if (Array.isArray(childNode)) {
          childNode.forEach(extractText);
        } else if (childNode.props?.children) {
          extractText(childNode.props.children);
        }
      }
      extractText(node.props.children);

      links.push({
        href: node.props.href,
        text: text.trim(),
        className: node.props.className,
      });
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
    expect(links.some((l) => l.href === "/tu-vi" && l.text.includes("Dịch vụ"))).toBe(true);
    expect(links.some((l) => l.href === "/cong-cu-mien-phi" && l.text.includes("Công cụ miễn phí"))).toBe(true);
    expect(links.some((l) => l.href === "/kien-thuc" && l.text.includes("Kiến thức"))).toBe(true);
    expect(links.some((l) => l.href === "/lien-he" && l.text.includes("Liên hệ"))).toBe(true);

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
    expect(links.some((l) => l.href === "/en/tu-vi" && l.text.includes("Services"))).toBe(true);
    expect(links.some((l) => l.href === "/en/cong-cu-mien-phi" && l.text.includes("Free tools"))).toBe(true);
    expect(links.some((l) => l.href === "/en/kien-thuc" && l.text.includes("Knowledge"))).toBe(true);
    expect(links.some((l) => l.href === "/en/lien-he" && l.text.includes("Contact"))).toBe(true);

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
    expect(linksVi.some((l) => l.href === "/dang-nhap" && l.text.includes("Đăng nhập"))).toBe(true);
    expect(linksVi.some((l) => l.href === "/tu-vi" && l.className?.includes("button"))).toBe(true);

    const headerEn = SiteHeader({ locale: "en", variant: "discipline", currentPath: "/en/chiem-tinh" });
    const linksEn = extractAllLinks(headerEn);

    expect(linksEn.some((l) => l.href === "/en/lien-he" && l.text.includes("Contact"))).toBe(true);
    expect(linksEn.some((l) => l.href === "/en/dang-nhap" && l.text.includes("Sign in"))).toBe(true);
    expect(linksEn.some((l) => l.href === "/en/tu-vi" && l.className?.includes("button"))).toBe(true);
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
});
