import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));

vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  return {
    useTranslations: () => {
      return (key: string, values?: Record<string, unknown>) => {
        let val: unknown = viMessages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        if (typeof val === "string") {
          if (values) {
            return Object.entries(values).reduce(
              (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
              val,
            );
          }
          return val;
        }
        return key;
      };
    },
  };
});

import type { ReportComprehensiveReadyViewV1 } from "@lasoviet/contracts";
import { ComprehensiveReportReader } from "./comprehensive-report-reader";

const tier1Report: ReportComprehensiveReadyViewV1 = {
  version: 1,
  state: "ready",
  contentVersion: "ziwei-comprehensive.v1",
  reportId: "report-tier1-123",
  reportVersionId: "version-tier1-123",
  locale: "vi",
  sku: "ZIWEI-NATAL-EXCERPT-P0",
  fulfillmentStatus: "complete",
  lineage: { supersedesReportVersionId: null },
  content: {
    overview: {
      title: "Tổng quan bản mệnh",
      narrative: "Bản mệnh vững vàng, cốt cách đĩnh đạc và tinh thần tự chủ.",
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân kiên định, nỗ lực đạt mục tiêu bền bỉ.",
    },
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Thế mạnh là tầm nhìn dài hạn; cần lưu tâm tính nguyên tắc thái quá.",
    },
    practicalDirection: [
      "Tập trung nâng cao chuyên môn sâu trong 3 năm tới.",
    ],
    lockedSections: [
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
    ],
  },
};

const tier2Report: ReportComprehensiveReadyViewV1 = {
  version: 1,
  state: "ready",
  contentVersion: "ziwei-comprehensive.v1",
  reportId: "report-tier2-456",
  reportVersionId: "version-tier2-456",
  locale: "vi",
  sku: "ZIWEI-IDENTITY-P0",
  fulfillmentStatus: "complete",
  lineage: { supersedesReportVersionId: null },
  content: {
    overview: {
      title: "Tổng quan bản mệnh",
      narrative: "Bản mệnh vững vàng, cốt cách đĩnh đạc và tinh thần tự chủ.",
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân kiên định, nỗ lực đạt mục tiêu bền bỉ.",
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Phủ Đồng Cung",
        narrative: "Tử Vi và Thiên Phủ cùng hội tụ đem lại vị thế vững chắc.",
      },
    ],
    palaceReadings: [
      { palaceId: "ziwei.palace.life", title: "Cung Mệnh", narrative: "Luận giải chi tiết cung Mệnh." },
      { palaceId: "ziwei.palace.siblings", title: "Cung Huynh Đệ", narrative: "Luận giải chi tiết cung Huynh Đệ." },
      { palaceId: "ziwei.palace.spouse", title: "Cung Phu Thê", narrative: "Luận giải chi tiết cung Phu Thê." },
      { palaceId: "ziwei.palace.children", title: "Cung Tử Tức", narrative: "Luận giải chi tiết cung Tử Tức." },
      { palaceId: "ziwei.palace.wealth", title: "Cung Tài Bạch", narrative: "Luận giải chi tiết cung Tài Bạch." },
      { palaceId: "ziwei.palace.health", title: "Cung Tật Ách", narrative: "Luận giải chi tiết cung Tật Ách." },
      { palaceId: "ziwei.palace.travel", title: "Cung Thiên Di", narrative: "Luận giải chi tiết cung Thiên Di." },
      { palaceId: "ziwei.palace.friends", title: "Cung Nô Bộc", narrative: "Luận giải chi tiết cung Nô Bộc." },
      { palaceId: "ziwei.palace.career", title: "Cung Quan Lộc", narrative: "Luận giải chi tiết cung Quan Lộc." },
      { palaceId: "ziwei.palace.property", title: "Cung Điền Trạch", narrative: "Luận giải chi tiết cung Điền Trạch." },
      { palaceId: "ziwei.palace.fortune", title: "Cung Phúc Đức", narrative: "Luận giải chi tiết cung Phúc Đức." },
      { palaceId: "ziwei.palace.parents", title: "Cung Phụ Mẫu", narrative: "Luận giải chi tiết cung Phụ Mẫu." },
    ],
    thematicSynthesis: [
      { id: "career_wealth", title: "Sự Nghiệp Và Tài Lộc", narrative: "Phân tích cụm sự nghiệp và tài lộc." },
      { id: "relationships_family", title: "Tình Duyên Và Gia Đạo", narrative: "Phân tích cụm tình duyên." },
      { id: "social_environment", title: "Môi Trường Xã Hội Và Quan Hệ", narrative: "Phân tích cụm quan hệ xã hội." },
      { id: "wellbeing_inner_resources", title: "Nội Tâm Và Sức Khỏe Tinh Thần", narrative: "Phân tích cụm nội tâm." },
    ],
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Thế mạnh là tầm nhìn dài hạn; cần lưu tâm tính nguyên tắc thái quá.",
    },
    practicalDirection: [
      "Tập trung nâng cao chuyên môn sâu trong 3 năm tới.",
    ],
  },
};

describe("ComprehensiveReportReader", () => {
  it("renders Tier-1 report with only four sections and no locked content (Correction check 4)", () => {
    const html = renderToStaticMarkup(
      <ComprehensiveReportReader locale="vi" report={tier1Report} />,
    );

    // Unlocked sections exist
    expect(html).toContain("Tổng quan bản mệnh");
    expect(html).toContain("Mệnh, Thân và động lực cốt lõi");
    expect(html).toContain("Điểm mạnh, điểm vướng và điều kiện phát huy");
    expect(html).toContain("Định Hướng Và Hành Động Thực Tế");
    expect(html).toContain("Tập trung nâng cao chuyên môn sâu");

    // TOC numerals in Tier-1 must contain only 01..04
    expect(html).toContain('<span class="report-toc-numeral">01</span>');
    expect(html).toContain('<span class="report-toc-numeral">02</span>');
    expect(html).toContain('<span class="report-toc-numeral">03</span>');
    expect(html).toContain('<span class="report-toc-numeral">04</span>');
    expect(html).not.toContain('<span class="report-toc-numeral">05</span>');
    expect(html).not.toContain('<span class="report-toc-numeral">06</span>');
    expect(html).not.toContain('<span class="report-toc-numeral">07</span>');

    // Section numeral tags in stream must be 01..04
    expect(html).toContain('<span class="report-section-numeral">01</span>');
    expect(html).toContain('<span class="report-section-numeral">02</span>');
    expect(html).toContain('<span class="report-section-numeral">03</span>');
    expect(html).toContain('<span class="report-section-numeral">04</span>');

    // Locked content must NOT be rendered anywhere in Tier-1
    expect(html).not.toContain("Cấu Trúc Và Cách Cục Trọng Yếu");
    expect(html).not.toContain("Luận Giải Chi Tiết Mười Hai Cung");
    expect(html).not.toContain("Tổng Hợp Các Lĩnh Vực Đời Sống");
    expect(html).not.toContain("Cách cục Tử Phủ Đồng Cung");
    expect(html).not.toContain("Cung Mệnh");
    expect(html).not.toContain("ziwei.palace.");
    expect(html).not.toContain('id="section-key-configurations"');
    expect(html).not.toContain('id="section-palace-readings"');
    expect(html).not.toContain('id="section-thematic-synthesis"');
  });

  it("renders Tier-2 report with all seven groups and full section numbering (Correction check 4)", () => {
    const html = renderToStaticMarkup(
      <ComprehensiveReportReader locale="vi" report={tier2Report} />,
    );

    // All 7 sections exist
    expect(html).toContain("Tổng quan bản mệnh");
    expect(html).toContain("Mệnh, Thân và động lực cốt lõi");
    expect(html).toContain("Cấu Trúc Và Cách Cục Trọng Yếu");
    expect(html).toContain("Luận Giải Chi Tiết Mười Hai Cung");
    expect(html).toContain("Tổng Hợp Các Lĩnh Vực Đời Sống");
    expect(html).toContain("Điểm mạnh, điểm vướng và điều kiện phát huy");
    expect(html).toContain("Định Hướng Và Hành Động Thực Tế");

    // TOC numerals include 01..07
    expect(html).toContain('<span class="report-toc-numeral">01</span>');
    expect(html).toContain('<span class="report-toc-numeral">07</span>');

    // Section numerals include 01..07
    expect(html).toContain('<span class="report-section-numeral">01</span>');
    expect(html).toContain('<span class="report-section-numeral">03</span>');
    expect(html).toContain('<span class="report-section-numeral">04</span>');
    expect(html).toContain('<span class="report-section-numeral">05</span>');
    expect(html).toContain('<span class="report-section-numeral">06</span>');
    expect(html).toContain('<span class="report-section-numeral">07</span>');

    // All 12 palaces and 4 themes rendered
    expect(html).toContain("Cách cục Tử Phủ Đồng Cung");
    expect(html).toContain("Cung Mệnh");
    expect(html).toContain("Cung Phụ Mẫu");
    expect(html).toContain("Sự Nghiệp Và Tài Lộc");
    expect(html).toContain("Nội Tâm Và Sức Khỏe Tinh Thần");
  });
});
