import { routeRegistry } from "@lasoviet/config";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KnowledgeCard } from "./knowledge-card";
import { KnowledgeHub } from "./knowledge-hub";
import type { PublicContentRepository } from "./public-content-repository";

function createMockRepository(): PublicContentRepository {
  const mockContents: Record<string, PublicContentV1> = {
    "knowledge.root:vi": {
      routeId: "knowledge.root",
      locale: "vi",
      contentType: "KnowledgeHub",
      title: "Kiến thức Tử Vi và các phương pháp",
      summary: "Tổng hợp kiến thức nền tảng để hiểu thuật ngữ, phương pháp và cách đọc lá số.",
      reviewer: "content-team",
      sourceReferences: ["brand-guideline"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi:vi": {
      routeId: "knowledge.tu-vi",
      locale: "vi",
      contentType: "KnowledgeHub",
      title: "Kiến thức Tử Vi",
      summary: "Lộ trình học Tử Vi từ khái niệm nền tảng đến cách lập, đọc và đối chiếu một lá số.",
      reviewer: "method-reviewer",
      sourceReferences: ["brand-guideline"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.definition:vi": {
      routeId: "knowledge.tu-vi.definition",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "Lá số Tử Vi là gì?",
      summary: "Giải thích lá số Tử Vi, các thành phần chính và cách tách dữ liệu tính toán khỏi phần diễn giải.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.calculation:vi": {
      routeId: "knowledge.tu-vi.calculation",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "Cách lập lá số Tử Vi",
      summary: "Quy trình chuyển đổi ngày giờ sinh sang can chi và an sao lên 12 cung.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.reading:vi": {
      routeId: "knowledge.tu-vi.reading",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "Cách đọc lá số Tử Vi",
      summary: "Thứ tự tiếp cận một lá số từ Mệnh Thân đến các cung tam hợp chiếu.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.foundations:vi": {
      routeId: "knowledge.tu-vi.foundations",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "Mệnh, Thân, Cục trong Tử Vi",
      summary: "Phân biệt bản mệnh, thân cư và cục số định hình xu hướng phát triển.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.accuracy:vi": {
      routeId: "knowledge.tu-vi.accuracy",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "Tử Vi có chính xác không?",
      summary: "Giới hạn dữ liệu, tính khả chứng và ranh giới giữa thống kê với dự đoán.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.palaces:vi": {
      routeId: "knowledge.tu-vi.palaces",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "12 cung trong lá số Tử Vi",
      summary: "Ý nghĩa và mối liên hệ giữa các cung chức trên biểu đồ.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.stars:vi": {
      routeId: "knowledge.tu-vi.stars",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "14 chính tinh trong Tử Vi",
      summary: "Đặc tính ngũ hành và phương thức tác động của các sao chủ chốt.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.cycles:vi": {
      routeId: "knowledge.tu-vi.cycles",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "Đại vận và tiểu vận trong Tử Vi",
      summary: "Cách tính chu kỳ 10 năm và vận trình từng năm.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.birth-time:vi": {
      routeId: "knowledge.tu-vi.birth-time",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "Giờ sinh ảnh hưởng thế nào đến lá số?",
      summary: "Tác động của việc nhớ nhầm hoặc không biết giờ sinh đến vị trí Mệnh Thân.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
    "knowledge.tu-vi.schools:vi": {
      routeId: "knowledge.tu-vi.schools",
      locale: "vi",
      contentType: "KnowledgeArticle",
      title: "Các trường phái Tử Vi",
      summary: "Điểm tương đồng và khác biệt giữa Nam phái, Bắc phái và Tứ hóa.",
      reviewer: "method-reviewer",
      sourceReferences: ["normalized-chart-contract"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-01",
    },
  };

  return {
    get(routeId, locale) {
      const found = mockContents[`${routeId}:${locale}`];
      if (!found) throw new Error(`Not found ${routeId}:${locale}`);
      return found;
    },
  };
}

describe("KnowledgeHub Component (UI-10)", () => {
  const repository = createMockRepository();
  const rootContent = repository.get("knowledge.root", "vi");
  const tuViRoute = routeRegistry.find((r) => r.id === "knowledge.tu-vi") as RouteDefinitionV1;

  it("renders breadcrumbs, hero title and lead description", () => {
    const html = renderToStaticMarkup(
      <KnowledgeHub
        content={rootContent}
        locale="vi"
        repository={repository}
        routes={routeRegistry}
        route={tuViRoute}
      />,
    );

    expect(html).toContain('aria-label="Đường dẫn liên kết"');
    expect(html).toContain("Kiến thức Tử Vi và các phương pháp");
    expect(html).toContain("Thư viện tri thức");
    expect(html).toContain("Trang chủ");
  });

  it("renders the spotlight section with featured article and compact list", () => {
    const html = renderToStaticMarkup(
      <KnowledgeHub
        content={rootContent}
        locale="vi"
        repository={repository}
        routes={routeRegistry}
        route={tuViRoute}
      />,
    );

    // Featured card
    expect(html).toContain("Bài nổi bật");
    expect(html).toContain("Lá số Tử Vi là gì?");

    // Compact list items
    expect(html).toContain("Cách lập lá số Tử Vi");
    expect(html).toContain("Cách đọc lá số Tử Vi");
    expect(html).toContain("Mệnh, Thân, Cục trong Tử Vi");
    expect(html).toContain("Tử Vi có chính xác không?");
  });

  it("renders the 5 thematic clusters with uppercase gold headings", () => {
    const html = renderToStaticMarkup(
      <KnowledgeHub
        content={rootContent}
        locale="vi"
        repository={repository}
        routes={routeRegistry}
        route={tuViRoute}
      />,
    );

    expect(html).toContain("HỌC ĐỌC LÁ SỐ");
    expect(html).toContain("HIỂU MÌNH");
    expect(html).toContain("QUAN HỆ");
    expect(html).toContain("CÔNG VIỆC &amp; VẬN TRÌNH");
    expect(html).toContain("PHƯƠNG PHÁP &amp; CĂN CỨ");
  });

  it("renders standard cards with byline 'Lá Số Việt biên tập'", () => {
    const html = renderToStaticMarkup(
      <KnowledgeHub
        content={rootContent}
        locale="vi"
        repository={repository}
        routes={routeRegistry}
        route={tuViRoute}
      />,
    );

    expect(html).toContain("Lá Số Việt biên tập");
  });

  it("renders the bottom bridge CTA into free Zi Wei chart", () => {
    const html = renderToStaticMarkup(
      <KnowledgeHub
        content={rootContent}
        locale="vi"
        repository={repository}
        routes={routeRegistry}
        route={tuViRoute}
      />,
    );

    expect(html).toContain("Đối chiếu kiến thức này trên lá số của bạn");
    expect(html).toContain("/tao-la-so/tu-vi");
    expect(html).toContain("Lập lá số miễn phí");
  });
});

describe("KnowledgeCard Component", () => {
  it("renders standard variant with 16:9 image and meta", () => {
    const html = renderToStaticMarkup(
      <KnowledgeCard
        variant="standard"
        href="/kien-thuc/tu-vi/la-so-tu-vi-la-gi"
        image="/images/lasoviet/cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp"
        title="Lá số Tử Vi là gì?"
        summary="Cấu trúc 12 cung và cách đọc biểu đồ."
        category="Học đọc lá số"
        date="01/09/2026"
        byline="Lá Số Việt biên tập"
      />,
    );

    expect(html).toContain("Lá số Tử Vi là gì?");
    expect(html).toContain("Cấu trúc 12 cung và cách đọc biểu đồ.");
    expect(html).toContain("01/09/2026");
    expect(html).toContain("Lá Số Việt biên tập");
    expect(html).toContain("cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp");
  });

  it("renders compact variant with numbered item", () => {
    const html = renderToStaticMarkup(
      <KnowledgeCard
        variant="compact"
        href="/kien-thuc/tu-vi/cach-lap-la-so-tu-vi"
        image=""
        title="Cách lập lá số Tử Vi"
        summary="Quy trình an sao can chi."
        itemNumber={2}
      />,
    );

    expect(html).toContain("02");
    expect(html).toContain("Cách lập lá số Tử Vi");
    expect(html).toContain("Quy trình an sao can chi.");
  });
});
