import { describe, expect, it } from "vitest";
import { ZIWEI_PALACE_IDS, ZIWEI_THEMATIC_SYNTHESIS_IDS } from "@lasoviet/contracts";
import type { ComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";
import { validateComprehensiveZiweiReport } from "./comprehensive-report-validator.js";

const canonicalEvidenceKeys = [
  ...ZIWEI_PALACE_IDS,
  "ziwei.star.ziwei",
  "ziwei.star.tianfu",
  "ziwei.star.wuqu",
  "ziwei.transformation.prosperity",
  "ziwei.transformation.power",
  "zi-fu-tong-gong",
];

const mockFacts: ComprehensiveZiweiFacts = {
  palaces: [
    {
      palaceId: "ziwei.palace.life",
      earthlyBranchId: "ziwei.branch.tiger",
      isLifePalace: true,
      isBodyPalace: false,
      stars: [{ id: "ziwei.star.ziwei", type: "principal", brightness: "ziwei.brightness.temple" }],
      triadPalaceIds: ["ziwei.palace.career", "ziwei.palace.wealth"],
      oppositePalaceId: "ziwei.palace.travel",
      flankingPalaceIds: ["ziwei.palace.parents", "ziwei.palace.siblings"],
    },
  ],
  transformations: [],
  patterns: [{ id: "zi-fu-tong-gong", palaceIds: ["ziwei.palace.life"], starIds: ["ziwei.star.ziwei"] }],
  evidenceKeys: canonicalEvidenceKeys,
};

const palaceNarratives: Record<string, string> = {
  "ziwei.palace.life": "Cung Mệnh định hình nhân sinh quan độc lập, phong thái đĩnh đạc và bản lĩnh tự thân lập nghiệp.",
  "ziwei.palace.siblings": "Mối quan hệ anh chị em giữ được sự hòa thuận cơ bản, có sự trợ lực khi đối diện hoàn cảnh ngặt nghèo.",
  "ziwei.palace.spouse": "Hôn phối có trình độ chuyên môn tốt, là hậu phương vững chắc dù đôi khi có bất đồng quan điểm.",
  "ziwei.palace.children": "Hậu duệ thông minh, có xu hướng phát triển cá tính riêng từ sớm và cần phương pháp giáo dục kiên nhẫn.",
  "ziwei.palace.wealth": "Nguồn tài chính hình thành từ tích lũy chuyên môn bền bỉ, dòng tiền ổn định hơn là đầu cơ mạo hiểm.",
  "ziwei.palace.health": "Thể trạng tương đối tốt nhưng cần lưu ý hệ tiêu hóa và duy trì nhịp độ sinh hoạt điều độ.",
  "ziwei.palace.travel": "Không gian bên ngoài mở ra nhiều cơ hội hợp tác giá trị, đi xa được nhiều quý nhân tương trợ.",
  "ziwei.palace.friends": "Mạng lưới bạn bè và đồng nghiệp đáng tin cậy, hỗ trợ đắc lực trong những thời điểm then chốt.",
  "ziwei.palace.career": "Đường quan lộ hanh thông nhờ năng lực chuyên môn sâu và tác phong làm việc bài bản, chỉn chu.",
  "ziwei.palace.property": "Cơ ngơi điền sản gia tăng theo thời gian, có duyên gìn giữ đất đai hoặc bất động sản ổn định.",
  "ziwei.palace.fortune": "Đời sống tinh thần an định, có chiều sâu tâm tưởng và khả năng tự cân bằng trước nghịch cảnh.",
  "ziwei.palace.parents": "Song thân là tấm gương lớn về đạo đức, tạo nền tảng giáo dưỡng gia đình chu đáo từ thuở ấu thơ.",
};

const thematicNarratives: Record<string, string> = {
  career_wealth: "Sự kết hợp giữa tài năng điều hành và kiểm soát tài chính mang lại lợi thế cạnh tranh dài hạn.",
  relationships_family: "Nền tảng gia đình vững chắc tạo bệ phóng tinh thần cho mọi nỗ lực ngoài xã hội.",
  social_environment: "Môi trường làm việc mở rộng giúp tiếp cận các nguồn lực tri thức và đối tác uy tín.",
  wellbeing_inner_resources: "Nội lực bền bỉ giúp hóa giải áp lực bên ngoài, duy trì sức khỏe thể chất và tâm lý an nhiên.",
};

function createValidReport() {
  return {
    overview: {
      title: "Tổng quan lá số",
      narrative: "Lá số có cách cục vững vàng với Tử Vi tọa thủ, biểu thị năng lực dẫn dắt tự nhiên.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân thể hiện xu hướng chủ động, đề cao uy tín và tinh thần tự lập.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Phủ Đồng Cung",
        narrative: "Tử Vi cùng Thiên Phủ tương hội tạo nền tảng vững chắc cho sự nghiệp bền lâu.",
        evidenceKeys: ["ziwei.palace.life", "zi-fu-tong-gong"],
      },
    ],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: `Cung ${palaceId}`,
      narrative: palaceNarratives[palaceId] ?? "Nội dung cung riêng biệt.",
      evidenceKeys: [palaceId],
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: `Chuyên đề ${id}`,
      narrative: thematicNarratives[id] ?? "Nội dung chủ đề riêng biệt.",
      evidenceKeys: ["ziwei.palace.life"],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Nội lực kiên định là thế mạnh lớn, cần tránh sự áp đặt chủ quan trong tập thể.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    practicalDirection: [
      "Tập trung xây dựng hệ thống quản lý rõ ràng thay vì can thiệp vi mô.",
      "Duy trì kênh giao tiếp cởi mở với các đối tác chủ chốt.",
    ],
  };
}

describe("validateComprehensiveZiweiReport", () => {
  it("passes for a fully compliant report grounded in facts", () => {
    const report = createValidReport();
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.errors).toBeUndefined();
    }
  });

  it("rejects when an evidence key is not present in frozen facts", () => {
    const report = createValidReport();
    report.overview.evidenceKeys.push("ziwei.star.unsupported_star");
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("unsupported_star"))).toBe(true);
    }
  });

  it("rejects when an unsupported named pattern is referenced", () => {
    const report = createValidReport();
    report.keyConfigurations[0]!.evidenceKeys.push("sha-po-lang"); // not in mockFacts.evidenceKeys
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("sha-po-lang"))).toBe(true);
    }
  });

  it("rejects when duplicate narrative paragraphs are present", () => {
    const report = createValidReport();
    const duplicateText = "Đoạn văn này hoàn toàn giống nhau giữa hai phần luận giải.";
    report.overview.narrative = duplicateText;
    report.coreAxis.narrative = duplicateText;
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.toLowerCase().includes("duplicate") || e.toLowerCase().includes("trùng lặp"))).toBe(true);
    }
  });

  it("rejects when prohibited AI disclosure is found in narrative", () => {
    const report = createValidReport();
    report.overview.narrative = "Là một mô hình AI, tôi nhận thấy bản mệnh này rất đặc biệt.";
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("AI") || e.includes("prohibited"))).toBe(true);
    }
  });

  it("rejects when prohibited disclaimer language is found in narrative", () => {
    const report = createValidReport();
    report.strengthsAndTensions.narrative =
      "Bản báo cáo tuyên bố miễn trừ trách nhiệm y tế và pháp lý.";
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("disclaimer") || e.includes("miễn trừ"))).toBe(true);
    }
  });

  it("rejects when prohibited methodology or confidence labels are found", () => {
    const report = createValidReport();
    report.coreAxis.narrative = "Phương pháp luận này có độ tin cậy cao dựa trên cơ sở dữ liệu.";
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("phương pháp") || e.includes("độ tin cậy"))).toBe(true);
    }
  });

  it("rejects when raw technical identifiers are leaked into narrative text", () => {
    const report = createValidReport();
    report.overview.narrative = "Người này có ziwei.star.ziwei đóng tại ziwei.palace.life.";
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("identifier") || e.includes("ziwei.star.ziwei"))).toBe(true);
    }
  });

  it("rejects when palaceReadings is missing canonical palaces", () => {
    const report = createValidReport();
    report.palaceReadings.pop();
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
  });

  it("rejects when thematicSynthesis is missing required themes", () => {
    const report = createValidReport();
    report.thematicSynthesis.pop();
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
  });

  it("rejects when prohibited phrase is found in key-configuration title", () => {
    const report = createValidReport();
    report.keyConfigurations[0]!.title = "Phân tích AI về cách cục Tử Phủ";
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("AI") && e.includes("keyConfigurations[0].title"))).toBe(true);
    }
  });

  it("rejects when raw technical identifier is leaked in key-configuration title", () => {
    const report = createValidReport();
    report.keyConfigurations[0]!.title = "Cách cục với ziwei.star.ziwei tọa thủ";
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("ziwei.star.ziwei") && e.includes("keyConfigurations[0].title"))).toBe(true);
    }
  });

  it("does not treat short or identical titles as duplicate narrative prose", () => {
    const report = createValidReport();
    report.keyConfigurations = [
      {
        title: "Tử Phủ Đồng Cung",
        narrative: "Tử Vi cùng Thiên Phủ tương hội tạo nền tảng vững chắc cho sự nghiệp bền lâu.",
        evidenceKeys: ["ziwei.palace.life", "zi-fu-tong-gong"],
      },
      {
        title: "Tử Phủ Đồng Cung",
        narrative: "Một góc nhìn khác về cấu trúc này trong việc phát triển năng lực cá nhân.",
        evidenceKeys: ["ziwei.palace.life", "zi-fu-tong-gong"],
      },
    ];
    const result = validateComprehensiveZiweiReport(report, mockFacts);
    expect(result.ok).toBe(true);
  });
});
