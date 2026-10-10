import { describe, expect, it } from "vitest";
import {
  ZIWEI_TOPIC_DEEP_DIVE_IDS,
  ZIWEI_TOPIC_SKU_MAP,
  ZiweiTopicDeepDiveContentV1Schema,
  ZiweiTopicDecadalTimingActiveSchema,
  ZiweiTopicDecadalTimingNotStartedSchema,
  type ZiweiTopicDeepDiveContentV1,
} from "./ziwei-topic-deep-dive-v1.js";

describe("ZiweiTopicDeepDive contracts", () => {
  it("defines canonical topic IDs and SKU mapping", () => {
    expect(ZIWEI_TOPIC_DEEP_DIVE_IDS).toEqual([
      "relationship_marriage",
      "career_wealth",
      "business_enterprise",
      "career_transition",
      "family_children",
      "education_career",
      "property_home",
    ]);
    expect(ZIWEI_TOPIC_SKU_MAP.relationship_marriage).toBe("ZIWEI-RELATIONSHIP-P0");
    expect(ZIWEI_TOPIC_SKU_MAP.career_wealth).toBe("ZIWEI-CAREER-P0");
  });

  const validRelationshipReport: ZiweiTopicDeepDiveContentV1 = {
    topicId: "relationship_marriage",
    title: "Luận giải chuyên sâu Tình duyên & Hôn nhân",
    overview: {
      title: "Tổng quan cung duyên",
      narrative: "Nhận định tổng quan tình duyên vững vàng.",
      evidenceKeys: ["natal.ziwei.palace.spouse", "natal.ziwei.palace.life"],
    },
    palaceAnchors: [
      {
        palaceId: "ziwei.palace.spouse",
        title: "Cung Phu Thê",
        narrative: "Phu Thê có các sao hội chiếu.",
        evidenceKeys: ["natal.ziwei.palace.spouse", "natal.ziwei.star.tianfu"],
      },
      {
        palaceId: "ziwei.palace.fortune",
        title: "Cung Phúc Đức",
        narrative: "Phúc Đức tương hỗ tình cảm gia đạo.",
        evidenceKeys: ["natal.ziwei.palace.fortune", "natal.ziwei.star.taiyin"],
      },
    ],
    thematicDimensions: [
      {
        key: "emotional_needs",
        title: "Nhu cầu cảm xúc và gắn kết",
        narrative: "Xu hướng tìm kiếm sự đồng điệu và an toàn tâm lý.",
        evidenceKeys: ["natal.ziwei.palace.spouse", "natal.ziwei.star.tianfu"],
      },
      {
        key: "relational_tensions",
        title: "Điểm nhạy cảm và xung đột",
        narrative: "Cần chú ý cách bày tỏ khi gặp áp lực gia đình.",
        evidenceKeys: ["natal.ziwei.palace.spouse", "natal.ziwei.palace.life"],
      },
    ],
    decadalTiming: {
      title: "Đại vận hiện hành đối với hôn nhân",
      state: "active",
      index: 2,
      ageRange: [24, 33],
      yearRange: [2024, 2033],
      palaceId: "ziwei.palace.fortune",
      narrative: "Giai đoạn 10 năm chuyển dịch tình cảm trọng điểm.",
      evidenceKeys: ["decadal.timing.decadal.state:active", "natal.ziwei.palace.spouse"],
    },
    actions: [
      {
        recommendation: "Lắng nghe chủ động và đối thoại cởi mở.",
        rationale: "Giúp giải tỏa hiểu lầm từ các sao đối xung.",
        avoid: "Tránh im lặng kéo dài khi có bất đồng ý kiến.",
        evidenceKeys: ["natal.ziwei.palace.spouse"],
      },
      {
        recommendation: "Thống nhất ranh giới tài chính chung trước khi kết hôn.",
        rationale: "Cung phối ngẫu chịu ảnh hưởng từ cung Tài Bạch tam hợp.",
        avoid: "Tránh quyết định vội vàng khi chưa rõ quan điểm của đối phương.",
        evidenceKeys: ["natal.ziwei.palace.spouse", "natal.ziwei.palace.wealth"],
      },
      {
        recommendation: "Cùng xây dựng các mục tiêu dài hạn chung.",
        rationale: "Tăng cường gắn kết bền vững.",
        avoid: "Tránh áp đặt kỳ vọng một chiều.",
        evidenceKeys: ["natal.ziwei.palace.fortune"],
      },
    ],
  };

  it("validates a compliant relationship deep dive report", () => {
    const parsed = ZiweiTopicDeepDiveContentV1Schema.safeParse(validRelationshipReport);
    expect(parsed.success).toBe(true);
  });

  it("validates a compliant career & wealth deep dive report", () => {
    const careerReport: ZiweiTopicDeepDiveContentV1 = {
      ...validRelationshipReport,
      topicId: "career_wealth",
      title: "Luận giải chuyên sâu Công việc & Tài lộc",
      palaceAnchors: [
        {
          palaceId: "ziwei.palace.career",
          title: "Cung Quan Lộc",
          narrative: "Quan Lộc hội ngộ quý tinh.",
          evidenceKeys: ["natal.ziwei.palace.career", "natal.ziwei.star.ziwei"],
        },
        {
          palaceId: "ziwei.palace.wealth",
          title: "Cung Tài Bạch",
          narrative: "Tài Bạch biểu thị dòng tiền ổn định.",
          evidenceKeys: ["natal.ziwei.palace.wealth", "natal.ziwei.star.wuqu"],
        },
      ],
      thematicDimensions: [
        {
          key: "vocational_drivers",
          title: "Định hướng sự nghiệp cốt lõi",
          narrative: "Phù hợp các lĩnh vực đòi hỏi chuyên môn cao.",
          evidenceKeys: ["natal.ziwei.palace.career"],
        },
        {
          key: "wealth_mechanisms",
          title: "Cơ chế quản lý tài chính và tích lũy",
          narrative: "Khả năng quản trị dòng tiền bài bản.",
          evidenceKeys: ["natal.ziwei.palace.wealth"],
        },
      ],
    };
    const parsed = ZiweiTopicDeepDiveContentV1Schema.safeParse(careerReport);
    expect(parsed.success).toBe(true);
  });

  it("rejects relationship deep dive without ziwei.palace.spouse in palaceAnchors", () => {
    const invalid = {
      ...validRelationshipReport,
      palaceAnchors: [
        {
          palaceId: "ziwei.palace.career",
          title: "Cung Quan Lộc",
          narrative: "Thiếu cung phu thê.",
          evidenceKeys: ["natal.ziwei.palace.career"],
        },
      ],
    };
    const parsed = ZiweiTopicDeepDiveContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain(
      "must include ziwei.palace.spouse",
    );
  });

  it("rejects career deep dive without ziwei.palace.career or ziwei.palace.wealth", () => {
    const invalid = {
      ...validRelationshipReport,
      topicId: "career_wealth" as const,
      palaceAnchors: [
        {
          palaceId: "ziwei.palace.spouse",
          title: "Cung Phu Thê",
          narrative: "Sai cung cho chuyên đề công việc.",
          evidenceKeys: ["natal.ziwei.palace.spouse"],
        },
      ],
    };
    const parsed = ZiweiTopicDeepDiveContentV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain(
      "must include ziwei.palace.career or ziwei.palace.wealth",
    );
  });

  it("rejects decadal timing with invalid ageRange or yearRange span", () => {
    const invalidTiming = {
      title: "Đại vận",
      state: "active" as const,
      index: 1,
      ageRange: [24, 30] as [number, number], // span 6, not 9
      yearRange: [2024, 2033] as [number, number],
      palaceId: "ziwei.palace.career" as const,
      narrative: "Luận giải đại vận",
      evidenceKeys: ["k1"],
    };
    const parsed = ZiweiTopicDecadalTimingActiveSchema.safeParse(invalidTiming);
    expect(parsed.success).toBe(false);
  });

  it("validates not_started decadal timing", () => {
    const notStartedTiming = {
      title: "Giai đoạn tiền đại vận",
      state: "not_started" as const,
      firstCycleStartAge: 4,
      firstCycleStartYear: 2028,
      narrative: "Thời thơ ấu trước khi khởi đại vận đầu tiên.",
      evidenceKeys: ["timing.decadal.state:not_started"],
    };
    const parsed = ZiweiTopicDecadalTimingNotStartedSchema.safeParse(notStartedTiming);
    expect(parsed.success).toBe(true);
  });

  it("enforces action items between 3 and 5 items", () => {
    const fewActions = {
      ...validRelationshipReport,
      actions: validRelationshipReport.actions.slice(0, 2),
    };
    expect(ZiweiTopicDeepDiveContentV1Schema.safeParse(fewActions).success).toBe(false);

    const manyActions = {
      ...validRelationshipReport,
      actions: [
        ...validRelationshipReport.actions,
        validRelationshipReport.actions[0]!,
        validRelationshipReport.actions[1]!,
        validRelationshipReport.actions[2]!,
      ],
    };
    expect(ZiweiTopicDeepDiveContentV1Schema.safeParse(manyActions).success).toBe(false);
  });
});
