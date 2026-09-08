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

  describe("locale integrity validation", () => {
    it("rejects Han ideographs in every model-owned visible category without echoing prose", () => {
      const hanProse = "Đoạn văn chứa chữ Hán bí mật không được xuất hiện trong lỗi.";

      // 1. overview narrative
      {
        const report = createValidReport();
        report.overview.narrative = `${hanProse} Tử Vi 紫.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors).toBeDefined();
        expect(res.errors!.some((e) => e === "Han ideograph detected in overview")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(hanProse))).toBe(true);
      }

      // 2. coreAxis narrative
      {
        const report = createValidReport();
        report.coreAxis.narrative = `${hanProse} Mệnh Thân 命身.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Han ideograph detected in coreAxis")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(hanProse))).toBe(true);
      }

      // 3. keyConfigurations[0].title
      {
        const report = createValidReport();
        report.keyConfigurations[0]!.title = "Cách cục 紫府";
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Han ideograph detected in keyConfigurations[0].title")).toBe(true);
        expect(res.errors!.every((e) => !e.includes("Cách cục"))).toBe(true);
      }

      // 4. keyConfigurations[0] narrative
      {
        const report = createValidReport();
        report.keyConfigurations[0]!.narrative = `${hanProse} Cấu trúc 帝星.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Han ideograph detected in keyConfigurations[0]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(hanProse))).toBe(true);
      }

      // 5. palaceReadings narrative
      {
        const report = createValidReport();
        report.palaceReadings[0]!.narrative = `${hanProse} Cung Mệnh 命.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Han ideograph detected in palaceReadings[ziwei.palace.life]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(hanProse))).toBe(true);
      }

      // 6. thematicSynthesis narrative
      {
        const report = createValidReport();
        report.thematicSynthesis[0]!.narrative = `${hanProse} Quan Lộc 官.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Han ideograph detected in thematicSynthesis[career_wealth]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(hanProse))).toBe(true);
      }

      // 7. strengthsAndTensions narrative
      {
        const report = createValidReport();
        report.strengthsAndTensions.narrative = `${hanProse} Cường nhược 強.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Han ideograph detected in strengthsAndTensions")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(hanProse))).toBe(true);
      }

      // 8. practicalDirection item
      {
        const report = createValidReport();
        report.practicalDirection[0] = `${hanProse} Hành động 行.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Han ideograph detected in practicalDirection[0]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(hanProse))).toBe(true);
      }

      // CJK Extension A character (\u3400) and Compatibility Ideograph (\uF900)
      {
        const reportExtA = createValidReport();
        reportExtA.overview.narrative = "Ký tự mở rộng \u3400 trong câu.";
        const resExtA = validateComprehensiveZiweiReport(reportExtA, mockFacts);
        expect(resExtA.ok).toBe(false);
        expect(resExtA.errors!.some((e) => e === "Han ideograph detected in overview")).toBe(true);

        const reportCompat = createValidReport();
        reportCompat.coreAxis.narrative = "Ký tự tương thích \uF900 trong câu.";
        const resCompat = validateComprehensiveZiweiReport(reportCompat, mockFacts);
        expect(resCompat.ok).toBe(false);
        expect(resCompat.errors!.some((e) => e === "Han ideograph detected in coreAxis")).toBe(true);
      }
    });

    it("rejects each of the six English brightness descriptors across relevant categories without echoing prose", () => {
      const sampleSentence = "Câu văn chi tiết về dự đoán không được lặp lại trong lỗi.";

      // 1. exalted in overview
      {
        const report = createValidReport();
        report.overview.narrative = `${sampleSentence} Sao Tử Vi ở trạng thái exalted tại Mệnh.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "English brightness descriptor detected in overview: exalted")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 2. prosperous (all caps) in coreAxis
      {
        const report = createValidReport();
        report.coreAxis.narrative = `${sampleSentence} Thiên Phủ PROSPEROUS hội chiếu.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "English brightness descriptor detected in coreAxis: prosperous")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 3. favorable in keyConfigurations[0].title
      {
        const report = createValidReport();
        report.keyConfigurations[0]!.title = "Cấu trúc sao Favorable";
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "English brightness descriptor detected in keyConfigurations[0].title: favorable")).toBe(true);
        expect(res.errors!.every((e) => !e.includes("Cấu trúc"))).toBe(true);
      }

      // 4. neutral in palaceReadings
      {
        const report = createValidReport();
        report.palaceReadings[0]!.narrative = `${sampleSentence} Vị trí sao mang tính (neutral) bình thường.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "English brightness descriptor detected in palaceReadings[ziwei.palace.life]: neutral")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 5. unfavorable in thematicSynthesis
      {
        const report = createValidReport();
        report.thematicSynthesis[0]!.narrative = `${sampleSentence} Cục diện rơi vào Unfavorable khó phát triển.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "English brightness descriptor detected in thematicSynthesis[career_wealth]: unfavorable")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 6. weak in practicalDirection
      {
        const report = createValidReport();
        report.practicalDirection[0] = `${sampleSentence} Cần cải thiện điểm weak này.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "English brightness descriptor detected in practicalDirection[0]: weak")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }
    });

    it("accepts Vietnamese brightness labels (Miếu, Vượng, Đắc, Bình, Hãm, Nhược)", () => {
      const report = createValidReport();
      report.overview.narrative = "Tử Vi Miếu địa tại Mệnh, kết hợp Thiên Phủ Vượng địa tạo cách cục vững bền.";
      report.coreAxis.narrative = "Vũ Khúc Đắc địa trợ lực, các sao phụ tinh Bình hòa không gây xung đột.";
      report.strengthsAndTensions.narrative = "Dù có sát tinh Hãm địa hay rơi vào thế Nhược vẫn có năng lực chuyển hóa.";
      const res = validateComprehensiveZiweiReport(report, mockFacts);
      expect(res.ok).toBe(true);
      expect(res.errors).toBeUndefined();
    });

    it("retains validity for normal Vietnamese Tử Vi terminology", () => {
      const report = createValidReport();
      report.overview.narrative =
        "Lá số hội tụ Tử Vi, Thất Sát, Liêm Trinh, Phá Quân và Tham Lang cùng tứ hóa Khoa Quyền Lộc Kỵ phân bố hài hòa.";
      report.coreAxis.narrative =
        "Trục Mệnh Thân có Tả Phù, Hữu Bật, Văn Xương, Văn Khúc và Thiên Khôi, Thiên Việt đồng độ gia tăng khí chất chỉ huy.";
      const res = validateComprehensiveZiweiReport(report, mockFacts);
      expect(res.ok).toBe(true);
      expect(res.errors).toBeUndefined();
    });

    it("rejects U+FFFD replacement characters across customer-visible sections without echoing prose", () => {
      const sampleSentence = "Đoạn văn có ký tự hỏng không được xuất hiện trong lỗi.";

      // 1. overview narrative
      {
        const report = createValidReport();
        report.overview.narrative = `${sampleSentence} Ký tự lỗi \uFFFD ở đây.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Unicode replacement character detected in overview")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 2. coreAxis narrative
      {
        const report = createValidReport();
        report.coreAxis.narrative = `${sampleSentence} Dấu thay thế \uFFFD xuất hiện.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Unicode replacement character detected in coreAxis")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 3. keyConfigurations[0].title
      {
        const report = createValidReport();
        report.keyConfigurations[0]!.title = "Cách cục \uFFFD Tử Phủ";
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Unicode replacement character detected in keyConfigurations[0].title")).toBe(true);
        expect(res.errors!.every((e) => !e.includes("Tử Phủ"))).toBe(true);
      }

      // 4. keyConfigurations[0] narrative
      {
        const report = createValidReport();
        report.keyConfigurations[0]!.narrative = `${sampleSentence} Hỏng mã \uFFFD.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Unicode replacement character detected in keyConfigurations[0]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 5. palaceReadings narrative
      {
        const report = createValidReport();
        report.palaceReadings[0]!.narrative = `${sampleSentence} Cung mệnh lỗi \uFFFD.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Unicode replacement character detected in palaceReadings[ziwei.palace.life]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 6. thematicSynthesis narrative
      {
        const report = createValidReport();
        report.thematicSynthesis[0]!.narrative = `${sampleSentence} Chuyên đề \uFFFD.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Unicode replacement character detected in thematicSynthesis[career_wealth]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 7. strengthsAndTensions narrative
      {
        const report = createValidReport();
        report.strengthsAndTensions.narrative = `${sampleSentence} Thế mạnh \uFFFD.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Unicode replacement character detected in strengthsAndTensions")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 8. practicalDirection item
      {
        const report = createValidReport();
        report.practicalDirection[0] = `${sampleSentence} Hành động \uFFFD.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Unicode replacement character detected in practicalDirection[0]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }
    });

    it("rejects common UTF-8-as-Latin-1 mojibake sequences including corrupted Tài Bạch and Đắc without echoing prose", () => {
      const sampleSentence = "Câu văn chi tiết về mã hóa không được xuất hiện trong thông báo lỗi.";

      // 1. corrupted Tài Bạch in overview narrative
      {
        const report = createValidReport();
        report.overview.narrative = `${sampleSentence} Xuất hiện cung TÃ\u00A0i Báº¡ch bị lỗi mã hóa.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Encoding corruption detected in overview")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 2. corrupted Đắc in keyConfigurations[0].title
      {
        const report = createValidReport();
        report.keyConfigurations[0]!.title = "Sao Tử Vi Ä\x90áº¯c Địa";
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Encoding corruption detected in keyConfigurations[0].title")).toBe(true);
        expect(res.errors!.every((e) => !e.includes("Địa"))).toBe(true);
      }

      // 3. corrupted đất đai in palaceReadings
      {
        const report = createValidReport();
        report.palaceReadings[0]!.narrative = `${sampleSentence} Cơ nghiệp Ä‘áº¥t Ä‘ai rộng lớn.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Encoding corruption detected in palaceReadings[ziwei.palace.life]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 4. corrupted Mệnh (Má»‡nh) in coreAxis
      {
        const report = createValidReport();
        report.coreAxis.narrative = `${sampleSentence} Bản Má»‡nh có nhiều nét đặc sắc.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Encoding corruption detected in coreAxis")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 5. corrupted Mãi (MÃ£i) in thematicSynthesis
      {
        const report = createValidReport();
        report.thematicSynthesis[0]!.narrative = `${sampleSentence} Nỗ lực MÃ£i không ngừng nghỉ.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Encoding corruption detected in thematicSynthesis[career_wealth]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 6. corrupted Âm (Ã‚m) in strengthsAndTensions
      {
        const report = createValidReport();
        report.strengthsAndTensions.narrative = `${sampleSentence} Khí thế Ã‚m Dương cân xứng.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Encoding corruption detected in strengthsAndTensions")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }

      // 7. corrupted smart quote (â€™) in practicalDirection
      {
        const report = createValidReport();
        report.practicalDirection[0] = `${sampleSentence} Lời khuyên â€™chân thànhâ€™ cho bạn.`;
        const res = validateComprehensiveZiweiReport(report, mockFacts);
        expect(res.ok).toBe(false);
        expect(res.errors!.some((e) => e === "Encoding corruption detected in practicalDirection[0]")).toBe(true);
        expect(res.errors!.every((e) => !e.includes(sampleSentence))).toBe(true);
      }
    });

    it("accepts valid Vietnamese text containing proper Âm, Mãi, Đắc, đất đai, and normal NFC accents", () => {
      const report = createValidReport();
      report.overview.narrative =
        "Cung Tài Bạch có sao Đắc địa, đất đai rộng mở, Âm Dương thuận lý, mãi mãi bền vững.";
      report.coreAxis.narrative =
        "Trục Mệnh Thân vững vàng với các sao Đắc địa; người này ĐÃ từng vượt qua nhiều thử thách MÃI ghi dấu ấn.";
      report.keyConfigurations[0]!.title = "Cách cục Đắc địa Tử Phủ";
      report.keyConfigurations[0]!.narrative =
        "Phối hợp Âm Dương hài hòa, đất đai phì nhiêu, giữ gìn danh tiếng mãi mãi.";
      report.palaceReadings[0]!.narrative =
        "Cung Mệnh có Thái Âm và Thái Dương chiếu rọi, gia tăng phúc khí và đất đai tổ nghiệp.";
      report.thematicSynthesis[0]!.narrative =
        "Lĩnh vực tài chính đạt thế Đắc lợi, tích lũy đất đai lâu dài.";
      report.strengthsAndTensions.narrative =
        "Nội lực vững vàng, biết nắm bắt thời cơ để đạt thành công mãi về sau.";
      report.practicalDirection[0] =
        "Quản lý đất đai và tài sản cẩn trọng theo đúng quy hoạch.";
      report.practicalDirection[1] =
        "Trích dẫn danh ngôn: «Tử Vi đắc địa» và “Thiên Phủ triều viên” để giữ tâm thế tích cực.";

      const res = validateComprehensiveZiweiReport(report, mockFacts);
      expect(res.ok).toBe(true);
      expect(res.errors).toBeUndefined();
    });
  });
});
