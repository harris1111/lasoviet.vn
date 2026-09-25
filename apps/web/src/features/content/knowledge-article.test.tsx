import { routeRegistry } from "@lasoviet/config";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KnowledgeArticle } from "./knowledge-article";
import { renderContentBlocks } from "./public-content-page";
import type { PublicContentRepository } from "./public-content-repository";

function createMockRepository(): PublicContentRepository {
  const mockContents: Record<string, PublicContentV1> = {
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
      body: "## Bài này giải thích\n\nBài này giải thích một lá số đã chuẩn hóa dựa trên ranh giới triển khai đã được version hóa.\n\n## Ví dụ độc lập\n\nDùng fixture chuyển đổi dương âm để kiểm chứng.",
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
  };

  return {
    get(routeId, locale) {
      const found = mockContents[`${routeId}:${locale}`];
      if (!found) throw new Error(`Not found ${routeId}:${locale}`);
      return found;
    },
  };
}

describe("KnowledgeArticle Component (UI-10)", () => {
  const repository = createMockRepository();
  const articleContent = repository.get("knowledge.tu-vi.definition", "vi");
  const articleRoute = routeRegistry.find((r) => r.id === "knowledge.tu-vi.definition") as RouteDefinitionV1;

  it("renders breadcrumbs, title, summary and meta bar", () => {
    const html = renderToStaticMarkup(
      <KnowledgeArticle
        content={articleContent}
        locale="vi"
        repository={repository}
        route={articleRoute}
        routes={routeRegistry}
        contentBlocksRenderer={renderContentBlocks}
      />,
    );

    expect(html).toContain('aria-label="Đường dẫn liên kết"');
    expect(html).toContain("Lá số Tử Vi là gì?");
    expect(html).toContain("Lá Số Việt biên tập");
    expect(html).toContain("01/09/2026");
  });

  it("renders 16:9 featured image with proper alt text", () => {
    const html = renderToStaticMarkup(
      <KnowledgeArticle
        content={articleContent}
        locale="vi"
        repository={repository}
        route={articleRoute}
        routes={routeRegistry}
        contentBlocksRenderer={renderContentBlocks}
      />,
    );

    expect(html).toContain('alt="Lá số Tử Vi là gì?"');
    expect(html).toContain("cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp");
  });

  it("renders article body content blocks", () => {
    const html = renderToStaticMarkup(
      <KnowledgeArticle
        content={articleContent}
        locale="vi"
        repository={repository}
        route={articleRoute}
        routes={routeRegistry}
        contentBlocksRenderer={renderContentBlocks}
      />,
    );

    expect(html).toContain("Bài này giải thích");
    expect(html).toContain("Bài này giải thích một lá số đã chuẩn hóa");
    expect(html).toContain("Ví dụ độc lập");
  });

  it("renders the free chart cross-sell CTA box", () => {
    const html = renderToStaticMarkup(
      <KnowledgeArticle
        content={articleContent}
        locale="vi"
        repository={repository}
        route={articleRoute}
        routes={routeRegistry}
        contentBlocksRenderer={renderContentBlocks}
      />,
    );

    expect(html).toContain("Đối chiếu bài viết trên lá số của bạn");
    expect(html).toContain("/tao-la-so/tu-vi");
    expect(html).toContain("Lập lá số miễn phí");
  });

  it("renders related articles section with cards", () => {
    const html = renderToStaticMarkup(
      <KnowledgeArticle
        content={articleContent}
        locale="vi"
        repository={repository}
        route={articleRoute}
        routes={routeRegistry}
        contentBlocksRenderer={renderContentBlocks}
      />,
    );

    expect(html).toContain("Bài viết cùng chuyên đề");
    expect(html).toContain("Cách lập lá số Tử Vi");
    expect(html).toContain("Cách đọc lá số Tử Vi");
  });
});
