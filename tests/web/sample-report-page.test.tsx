import { describe, expect, it } from "vitest";
import { SampleReportPage } from "../../apps/web/src/features/content/sample-report-page";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";

const mockRouteVi: RouteDefinitionV1 = {
  id: "sample-report.tu-vi",
  path: "/bao-cao-mau/tu-vi",
  template: "sample-report",
  intent: "sample-report.tu-vi",
  discipline: "tu-vi",
  localeBehavior: "localized",
  localeOwners: ["vi", "en"],
  owner: "content-product",
  indexing: "index_follow",
  canonical: "self",
  robots: "index,follow",
  schemaTypes: ["Article", "BreadcrumbList"],
  redirect: { disposition: "none" },
  status: "live_indexable",
  sitemap: true,
  private: false,
  purchasable: false,
};

const mockContentVi: PublicContentV1 = {
  id: "sample-report.tu-vi-vi",
  routeId: "sample-report.tu-vi",
  locale: "vi",
  title: "Báo cáo mẫu Tử Vi",
  summary: "Xem cách một báo cáo Tử Vi trình bày dữ liệu, căn cứ, diễn giải và giới hạn tham khảo.",
  category: "sample",
  tags: ["tu-vi", "sample"],
  metadata: {},
};

const mockContentEn: PublicContentV1 = {
  id: "sample-report.tu-vi-en",
  routeId: "sample-report.tu-vi",
  locale: "en",
  title: "Tu Vi sample report",
  summary: "See how a Tu Vi report presents chart data, evidence, interpretation, and practical limits.",
  category: "sample",
  tags: ["tu-vi", "sample"],
  metadata: {},
};

function extractAllText(element: any): string {
  let text = "";
  function walk(node: any) {
    if (!node) return;
    if (typeof node === "string" || typeof node === "number") {
      text += " " + String(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === "object" && node.props) {
      if (node.props.children) {
        walk(node.props.children);
      }
    }
  }
  walk(element);
  return text;
}

function extractAllLinks(element: any): Array<{ href: string; text?: string; className?: string }> {
  const links: Array<{ href: string; text?: string; className?: string }> = [];

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.props?.href) {
      links.push({
        href: node.props.href,
        text: extractAllText(node.props.children).trim(),
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

describe("SampleReportPage component", () => {
  it("renders sample report page in Vietnamese with all required sections", () => {
    const page = SampleReportPage({
      content: mockContentVi,
      locale: "vi",
      route: mockRouteVi,
    });
    const text = extractAllText(page);
    const links = extractAllLinks(page);

    // First viewport signals sample reading experience
    expect(text).toContain("Bản luận giải mẫu");
    expect(text).toContain("Báo cáo mẫu Tử Vi");

    // Primary product signal with exact price
    expect(text).toContain("79.000 ₫");
    expect(text).toContain("Thanh toán một lần");

    // Direct chart CTA in hero
    expect(links.some((l) => l.href === "/tao-la-so/tu-vi")).toBe(true);

    // All twelve palace names present
    const viPalaces = [
      "Cung Mệnh",
      "Cung Phụ Mẫu",
      "Cung Phúc Đức",
      "Cung Điền Trạch",
      "Cung Quan Lộc",
      "Cung Nô Bộc",
      "Cung Thiên Di",
      "Cung Tật Ách",
      "Cung Tài Bạch",
      "Cung Tử Tức",
      "Cung Phu Thê",
      "Cung Huynh Đệ",
    ];
    for (const palace of viPalaces) {
      expect(text).toContain(palace);
    }

    // Synthesis preview
    expect(text).toContain("Nhận định tổng hợp đa cung");
    expect(text).toContain("Mệnh · Tài · Quan · Thiên Di");

    // Content overview
    expect(text).toContain("Các phần trong báo cáo luận giải chính thức");
    expect(text).toContain("Đồ hình bản mệnh & Trục chính");

    // Previews for upcoming disciplines
    expect(text).toContain("Bát Tự (BaZi)");
    expect(text).toContain("Kinh Dịch (I Ching)");
    expect(text).toContain("Chiêm Tinh Tây Phương");
    expect(text).toContain("Thần Số Học");
    expect(text).toContain("Bản mẫu cấu trúc · Sắp ra mắt");

    // Explicit state distinction
    expect(text).toContain("Phân định trạng thái dịch vụ");
    expect(text).toContain("Đang mở chính thức");
    expect(text).toContain("Bản mẫu cấu trúc · Chưa mở bán");

    // Final chart CTA
    expect(text).toContain("Bắt đầu với lá số của chính bạn");
  });

  it("renders sample report page in English with localized content and prices", () => {
    const page = SampleReportPage({
      content: mockContentEn,
      locale: "en",
      route: mockRouteVi,
    });
    const text = extractAllText(page);
    const links = extractAllLinks(page);

    // First viewport signals sample reading experience
    expect(text).toContain("Sample Report");
    expect(text).toContain("Tu Vi sample report");

    // Primary product signal with English price format
    expect(text).toContain("79,000 VND");
    expect(text).toContain("One-time payment");

    // Direct chart CTA in hero with /en route
    expect(links.some((l) => l.href === "/en/tao-la-so/tu-vi")).toBe(true);

    // English twelve palace names present
    const enPalaces = [
      "Life Palace",
      "Parents Palace",
      "Fortune Palace",
      "Property Palace",
      "Career Palace",
      "Friends Palace",
      "Travel Palace",
      "Health Palace",
      "Wealth Palace",
      "Children Palace",
      "Spouse Palace",
      "Siblings Palace",
    ];
    for (const palace of enPalaces) {
      expect(text).toContain(palace);
    }

    // Synthesis preview
    expect(text).toContain("Cross-palace Synthesis Preview");

    // Upcoming disciplines in English
    expect(text).toContain("BaZi (Four Pillars)");
    expect(text).toContain("I Ching");
    expect(text).toContain("Western Natal Astrology");
    expect(text).toContain("Numerology");
    expect(text).toContain("Sample structure · Upcoming");

    // Availability distinction
    expect(text).toContain("Officially available");
    expect(text).toContain("Sample structure · Not for sale");
  });

  it("does not render customer data, private reports, hidden evidence, internal source paths, or fake output", () => {
    const page = SampleReportPage({
      content: mockContentVi,
      locale: "vi",
      route: mockRouteVi,
    });
    const text = extractAllText(page);

    expect(text).not.toMatch(/customer[-_]id/i);
    expect(text).not.toMatch(/secret/i);
    expect(text).not.toMatch(/bearer/i);
    expect(text).not.toMatch(/\/home\/debian\//i);
    expect(text).not.toMatch(/database/i);
    expect(text).not.toMatch(/SELECT\s+/i);
    expect(text).not.toContain("giới hạn tham khảo");
  });
});
