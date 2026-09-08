import { describe, expect, it } from "vitest";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportContentV1Schema,
  type ZiweiComprehensiveReportContentV1,
} from "./ziwei-comprehensive-report-v1.js";

function createValidReportContent(): ZiweiComprehensiveReportContentV1 {
  return {
    overview: {
      title: "Tổng quan lá số",
      narrative: "Bản mệnh vững vàng, cách cục phối hợp hài hòa giữa các chính tinh miếu vượng.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Mệnh Thân đồng cung tại Dần tạo nên tính cách kiên định, giàu nội lực và tinh thần tự chủ.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei", "ziwei.star.tianfu"],
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Phủ Đồng Cung",
        narrative: "Tử Vi và Thiên Phủ cùng hội tụ đem lại vị thế lãnh đạo và khả năng tích lũy tài nguyên vững chắc.",
        evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei", "ziwei.star.tianfu", "zi-fu-tong-gong"],
      },
    ],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: `Luận giải ${palaceId}`,
      narrative: `Nội dung giải đoán chi tiết cho ${palaceId} dựa trên chính tinh và phụ tinh tọa thủ.`,
      evidenceKeys: [palaceId, "ziwei.star.ziwei"],
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: `Tổng hợp ${id}`,
      narrative: `Phân tích chuyên sâu về lĩnh vực ${id} qua các cung tam phương tứ chính.`,
      evidenceKeys: ["ziwei.palace.career", "ziwei.palace.wealth"],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Điểm mạnh là tầm nhìn chiến lược; cần lưu ý tính bảo thủ khi gặp biến động bất ngờ.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.transformation.power"],
    },
    practicalDirection: [
      "Ưu tiên phát triển năng lực quản lý dài hạn thay vì các cơ hội ngắn hạn.",
      "Duy trì sự minh bạch trong hợp tác tài chính để hóa giải mâu thuẫn.",
    ],
  };
}

describe("ZiweiComprehensiveReportContentV1Schema", () => {
  it("parses a valid comprehensive report content object successfully", () => {
    const valid = createValidReportContent();
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.palaceReadings).toHaveLength(12);
      expect(parsed.data.thematicSynthesis).toHaveLength(4);
      expect(parsed.data.practicalDirection).toHaveLength(2);
    }
  });

  it("rejects when palaceReadings does not have exactly 12 items", () => {
    const invalid = createValidReportContent();
    invalid.palaceReadings.pop();
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate palace IDs in palaceReadings", () => {
    const invalid = createValidReportContent();
    invalid.palaceReadings[1] = { ...invalid.palaceReadings[0]! };
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects when palaceReadings is missing a canonical palace ID", () => {
    const invalid = createValidReportContent();
    invalid.palaceReadings[11] = {
      ...invalid.palaceReadings[11]!,
      palaceId: "ziwei.palace.unknown" as never,
    };
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects when thematicSynthesis does not have exactly 4 items", () => {
    const invalid = createValidReportContent();
    invalid.thematicSynthesis.pop();
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate thematic synthesis IDs", () => {
    const invalid = createValidReportContent();
    invalid.thematicSynthesis[1] = { ...invalid.thematicSynthesis[0]! };
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects customer-facing disclaimers, reflection questions, or unknown extra fields", () => {
    const invalid = {
      ...createValidReportContent(),
      professionalAdviceDisclaimer: "Nội dung này chỉ mang tính tham khảo.",
      reflectionQuestions: ["Bạn nghĩ sao?"],
    };
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects empty practicalDirection", () => {
    const invalid = createValidReportContent();
    invalid.practicalDirection = [];
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects empty evidenceKeys in sections", () => {
    const invalid = createValidReportContent();
    invalid.overview.evidenceKeys = [];
    const parsed = ZiweiComprehensiveReportContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
