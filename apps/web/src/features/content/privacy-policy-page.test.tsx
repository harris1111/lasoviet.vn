import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PrivacyPolicyPage } from "./privacy-policy-page";

const mockContent = {
  version: 1 as const,
  routeId: "trust.privacy",
  locale: "vi" as const,
  contentType: "SeoMetadata" as const,
  title: "Chính sách bảo mật",
  summary: "Thông tin về dữ liệu được sử dụng",
  intent: "trust.privacy.vi.public",
  authorId: "privacy-reviewer",
  reviewer: "privacy-reviewer",
  reviewerIds: ["privacy-reviewer"],
  sourceIds: ["brand-guideline"],
  sourceReferences: ["docs/13-brand-experience-guideline.md"],
  riskTags: ["privacy_boundary"],
  status: "published" as const,
  lastReviewed: "2026-09-14",
  relatedRouteIds: [],
  limitations: "Limitations text",
};

describe("PrivacyPolicyPage", () => {
  it("renders Vietnamese privacy policy page with effective date and all sections", () => {
    const html = renderToStaticMarkup(
      <PrivacyPolicyPage locale="vi" content={mockContent} />,
    );

    expect(html).toContain("Chính sách bảo mật");
    expect(html).toContain("14/09/2026");
    expect(html).toContain("1. Các nhóm dữ liệu thu thập");
    expect(html).toContain("2. Mục đích sử dụng dữ liệu");
    expect(html).toContain("3. Nhận diện visitor và liên kết dữ liệu");
    expect(html).toContain("4. Thời hạn lưu trữ và thanh lọc dữ liệu");
    expect(html).toContain("5. Ranh giới chia sẻ bên thứ ba (Quy chuẩn FD-053)");
    expect(html).toContain("6. Quyền của người dùng");
    expect(html).toContain("12 tháng");
  });

  it("renders English privacy policy page with effective date and all sections", () => {
    const html = renderToStaticMarkup(
      <PrivacyPolicyPage locale="en" content={{ ...mockContent, locale: "en", title: "Privacy Policy" }} />,
    );

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("September 14, 2026");
    expect(html).toContain("1. Collected Data Categories");
    expect(html).toContain("12 months");
  });
});
