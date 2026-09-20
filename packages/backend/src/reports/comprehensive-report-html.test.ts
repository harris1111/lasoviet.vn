import { describe, expect, it } from "vitest";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  type ZiweiComprehensiveReportContentV1,
  type ZiweiComprehensiveReportContentV3,
} from "@lasoviet/contracts";
import { CANONICAL_PALACE_TITLES_VI, CANONICAL_THEMATIC_TITLES_VI } from "./identity-report-config.js";
import {
  COMPREHENSIVE_REPORT_HTML_TITLE,
  renderComprehensiveZiweiHtml,
} from "./comprehensive-report-html.js";

function createSampleV3Report() {
  return {
    overview: {
      title: "Tổng quan bản mệnh",
      narrative: "Tổng quan cuộc đời với Tử Vi đắc địa, tạo phong thái đĩnh đạc và uy tín tự nhiên.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân thể hiện ý chí quật cường, kiên trì theo đuổi mục tiêu lớn dài hạn.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Phủ Đồng Cung",
        narrative: "Tử Vi và Thiên Phủ cùng hội tụ đem lại sự vững vàng về tài chính và sự nghiệp.",
        evidenceKeys: ["ziwei.palace.life", "zi-fu-tong-gong"],
      },
    ],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: CANONICAL_PALACE_TITLES_VI[palaceId],
      narrative: `Luận giải chi tiết cho ${CANONICAL_PALACE_TITLES_VI[palaceId]} với các sao tọa thủ.`,
      evidenceKeys: [palaceId],
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: CANONICAL_THEMATIC_TITLES_VI[id],
      narrative: `Phân tích trọng tâm cho chuyên đề ${CANONICAL_THEMATIC_TITLES_VI[id]}.`,
      evidenceKeys: ["ziwei.palace.life"],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Thế mạnh là tính kỷ luật, điểm cần lưu ý là tránh thái độ độc đoán trong làm việc nhóm.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    practicalDirection: [
      "Ưu tiên phát triển năng lực chuyên môn sâu trong 3 năm tới.",
      "Xây dựng mạng lưới cộng sự đáng tin cậy dựa trên sự minh bạch.",
    ],
  };
}

describe("renderComprehensiveZiweiHtml", () => {
  it("keeps the historical V1 output byte-compatible", () => {
    const report = {
      overview: { title: "Overview", narrative: "Narrative" },
      coreAxis: { title: "Core", narrative: "Axis" },
      keyConfigurations: [],
      palaceReadings: [],
      thematicSynthesis: [],
      strengthsAndTensions: { title: "Strengths", narrative: "Tensions" },
      practicalDirection: ["Act"],
    } as unknown as ZiweiComprehensiveReportContentV1;

    expect(renderComprehensiveZiweiHtml(report)).toBe(
      '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Báo Cáo Luận Giải Toàn Diện Tử Vi</title></head><body><main class="comprehensive-report"><h1>Báo Cáo Luận Giải Toàn Diện Tử Vi</h1><section class="report-overview"><h2>Overview</h2><p>Narrative</p></section><section class="report-core-axis"><h2>Core</h2><p>Axis</p></section><section class="report-key-configurations"><h2>Cấu Trúc Và Cách Cục Trọng Yếu</h2></section><section class="report-palace-readings"><h2>Luận Giải Chi Tiết Mười Hai Cung</h2></section><section class="report-thematic-synthesis"><h2>Tổng Hợp Các Lĩnh Vực Đời Sống</h2></section><section class="report-strengths-tensions"><h2>Strengths</h2><p>Tensions</p></section><section class="report-practical-direction"><h2>Định Hướng Và Hành Động Thực Tế</h2><ul><li>Act</li></ul></section></main></body></html>',
    );
  });

  it("renders non-empty HTML in the exact 7-group canonical sequence", () => {
    const report = createSampleV3Report();
    const html = renderComprehensiveZiweiHtml(report);

    expect(html).toContain(`<h1>${COMPREHENSIVE_REPORT_HTML_TITLE}</h1>`);

    const overviewIdx = html.indexOf(`<section class="report-overview">`);
    const coreAxisIdx = html.indexOf(`<section class="report-core-axis">`);
    const keyConfigsIdx = html.indexOf(`<section class="report-key-configurations">`);
    const palaceReadingsIdx = html.indexOf(`<section class="report-palace-readings">`);
    const thematicSynthesisIdx = html.indexOf(`<section class="report-thematic-synthesis">`);
    const strengthsTensionsIdx = html.indexOf(`<section class="report-strengths-tensions">`);
    const practicalDirectionIdx = html.indexOf(`<section class="report-practical-direction">`);

    expect(overviewIdx).toBeGreaterThan(-1);
    expect(coreAxisIdx).toBeGreaterThan(overviewIdx);
    expect(keyConfigsIdx).toBeGreaterThan(coreAxisIdx);
    expect(palaceReadingsIdx).toBeGreaterThan(keyConfigsIdx);
    expect(thematicSynthesisIdx).toBeGreaterThan(palaceReadingsIdx);
    expect(strengthsTensionsIdx).toBeGreaterThan(thematicSynthesisIdx);
    expect(practicalDirectionIdx).toBeGreaterThan(strengthsTensionsIdx);
  });

  it("renders all twelve canonical palace titles", () => {
    const report = createSampleV3Report();
    const html = renderComprehensiveZiweiHtml(report);

    for (const palaceId of ZIWEI_PALACE_IDS) {
      const canonicalTitle = CANONICAL_PALACE_TITLES_VI[palaceId];
      expect(html).toContain(`<h3>${canonicalTitle}</h3>`);
    }
  });

  it("renders all four thematic synthesis titles and practical directions", () => {
    const report = createSampleV3Report();
    const html = renderComprehensiveZiweiHtml(report);

    for (const themeId of ZIWEI_THEMATIC_SYNTHESIS_IDS) {
      const canonicalTitle = CANONICAL_THEMATIC_TITLES_VI[themeId];
      expect(html).toContain(`<h3>${canonicalTitle}</h3>`);
    }

    for (const direction of report.practicalDirection) {
      expect(html).toContain(`<li>${direction}</li>`);
    }
  });

  it("properly escapes hostile input so model text never becomes raw markup", () => {
    const hostileReport = {
      ...createSampleV3Report(),
      overview: {
        title: "Tiêu đề <script>alert(1)</script>",
        narrative: 'Nội dung <img src=x onerror=alert("xss")> & "quote" \'apostrophe\'',
        evidenceKeys: ["ziwei.palace.life"],
      },
      practicalDirection: ["Hành động <b onclick=\"evil()\">độc hại</b> & nguy hiểm"],
    };

    const html = renderComprehensiveZiweiHtml(hostileReport);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<img src=x onerror=");
    expect(html).toContain("&lt;img src=x onerror=alert(&quot;xss&quot;)&gt;");
    expect(html).toContain("&amp; &quot;quote&quot; &#39;apostrophe&#39;");
    expect(html).not.toContain("<b onclick=");
    expect(html).toContain("&lt;b onclick=&quot;evil()&quot;&gt;độc hại&lt;/b&gt;");
  });

  it("omits technical evidence keys, AI disclosures, disclaimers, confidence, and limitation copy", () => {
    const report = createSampleV3Report();
    const html = renderComprehensiveZiweiHtml(report);

    // Evidence keys must not appear in HTML
    expect(html).not.toContain("ziwei.palace.");
    expect(html).not.toContain("ziwei.star.");
    expect(html).not.toContain("evidenceKeys");
    expect(html).not.toContain("factReferences");

    // Prohibited disclosure / disclaimer copy
    expect(html).not.toContain("trí tuệ nhân tạo");
    expect(html).not.toContain("ChatGPT");
    expect(html).not.toContain("Gemini");
    expect(html).not.toContain("miễn trừ trách nhiệm");
    expect(html).not.toContain("disclaimer");
    expect(html).not.toContain("độ tin cậy");
    expect(html).not.toContain("confidence");
    expect(html).not.toContain("giới hạn nhận định");
    expect(html).not.toContain("limitation");
    expect(html).not.toContain("phương pháp luận");
    expect(html).not.toContain("providerId");
    expect(html).not.toContain("modelId");
  });

  it("renders V3 birth-time sensitivity exactly once after annual snapshot with escaped customer prose only", () => {
    const report: ZiweiComprehensiveReportContentV3 = {
      ...createSampleV3Report(),
      currentDecadal: {
        title: "Đại hạn hiện tại",
        state: "active",
        index: 2,
        ageRange: [21, 30],
        yearRange: [2020, 2029],
        narrative: "Giai đoạn đang diễn ra.",
        evidenceKeys: ["ziwei.timing.current"],
      },
      annualSnapshot: {
        title: "Lưu niên",
        targetYear: 2026,
        asOfDate: "2026-01-01",
        narrative: "Tổng quan năm.",
        evidenceKeys: ["ziwei.timing.annual"],
      },
      practicalDirection: [
        {
          recommendation: "Chủ động.",
          rationale: "Phù hợp.",
          avoid: "Vội vàng.",
          evidenceKeys: ["ziwei.palace.life"],
        },
        {
          recommendation: "Quan sát.",
          rationale: "Cân bằng.",
          avoid: "Cực đoan.",
          evidenceKeys: ["ziwei.palace.life"],
        },
        {
          recommendation: "Kiên trì.",
          rationale: "Bền vững.",
          avoid: "Bỏ dở.",
          evidenceKeys: ["ziwei.palace.life"],
        },
      ],
      birthTimeSensitivity: {
        title: 'Độ nhạy giờ sinh <script>alert("x")</script>',
        stableFactors: {
          title: "Yếu tố ổn định",
          narrative: "Nội dung ổn định & an toàn.",
          evidenceKeys: ["sensitivity.stable.life"],
        },
        sensitiveFactors: {
          title: "Yếu tố nhạy cảm",
          narrative: 'Nội dung <img src=x onerror=alert("xss")>.',
          evidenceKeys: ["sensitivity.sensitive.career"],
        },
      },
    };

    const html = renderComprehensiveZiweiHtml(report);
    const annualSnapshotIndex = html.indexOf('<section class="report-annual-snapshot">');
    const sensitivityIndex = html.indexOf('<section class="report-birth-time-sensitivity">');
    const practicalDirectionIndex = html.indexOf('<section class="report-practical-direction">');

    expect(html.match(/report-birth-time-sensitivity/g)).toHaveLength(1);
    expect(sensitivityIndex).toBeGreaterThan(annualSnapshotIndex);
    expect(practicalDirectionIndex).toBeGreaterThan(sensitivityIndex);
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(&quot;xss&quot;)&gt;");
    expect(html).not.toContain("sensitivity.stable.life");
    expect(html).not.toContain("sensitivity.sensitive.career");
    expect(html).not.toContain("providerId");
    expect(html).not.toContain("modelId");
  });
});
