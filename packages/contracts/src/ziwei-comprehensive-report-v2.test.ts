import { describe, expect, it } from "vitest";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
} from "./ziwei-comprehensive-report-v1.js";
import {
  ZiweiComprehensiveReportContentV2Schema,
  type ZiweiComprehensiveReportContentV2,
  type ZiweiComprehensiveReportActionItemV2,
  type ZiweiComprehensiveReportCurrentDecadalActiveV2,
} from "./ziwei-comprehensive-report-v2.js";

function createValidAction(index: number): ZiweiComprehensiveReportActionItemV2 {
  return {
    recommendation: `Hành động cụ thể thứ ${index}: Tập trung phát triển năng lực chuyên môn cốt lõi.`,
    rationale: `Lý do phù hợp: Mệnh có Tử Vi hội Tướng Phủ cần thực lực chuyên môn để tạo uy tín bền vững.`,
    avoid: `Điều nên tránh: Không tham gia các dự án đầu cơ tài chính ngắn hạn thiếu kiểm chứng.`,
    evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
  };
}


function asActiveCurrentDecadal(report: ZiweiComprehensiveReportContentV2): ZiweiComprehensiveReportCurrentDecadalActiveV2 {
  if (report.currentDecadal.state !== "active") {
    throw new Error("Expected active currentDecadal");
  }
  return report.currentDecadal;
}

function createValidReportContentV2(): ZiweiComprehensiveReportContentV2 {
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
    currentDecadal: {
      title: "Đại vận hiện hành (22-31 tuổi)",
      state: "active",
      index: 2,
      ageRange: [22, 31],
      yearRange: [2022, 2031],
      narrative: "Đại vận 10 năm tại cung Phúc Đức mang đến cơ hội xây dựng nền tảng tư duy và uy tín chuyên nghiệp.",
      evidenceKeys: ["ziwei.palace.fortune", "ziwei.timing.decadal"],
    },
    annualSnapshot: {
      title: "Lưu niên năm 2026",
      targetYear: 2026,
      asOfDate: "2026-09-12",
      narrative: "Lưu niên năm Bính Ngọ kích hoạt cung Quan Lộc, thuận lợi cho việc nhận trọng trách mới.",
      evidenceKeys: ["ziwei.palace.career", "ziwei.timing.annual"],
    },
    practicalDirection: [
      createValidAction(1),
      createValidAction(2),
      createValidAction(3),
    ],
  };
}

describe("ZiweiComprehensiveReportContentV2Schema", () => {
  it("parses a valid comprehensive report content V2 object successfully", () => {
    const valid = createValidReportContentV2();
    const parsed = ZiweiComprehensiveReportContentV2Schema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.palaceReadings).toHaveLength(12);
      expect(parsed.data.thematicSynthesis).toHaveLength(4);
      expect(parsed.data.practicalDirection).toHaveLength(3);
      expect(parsed.data.currentDecadal.index).toBe(2);
      expect(parsed.data.annualSnapshot.targetYear).toBe(2026);
    }
  });

  describe("canonical ordering of palaces and themes", () => {
    it("enforces canonical order for palaceReadings", () => {
      const invalid = createValidReportContentV2();
      // Swap palace 0 and palace 1
      const temp = invalid.palaceReadings[0]!;
      invalid.palaceReadings[0] = invalid.palaceReadings[1]!;
      invalid.palaceReadings[1] = temp;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);
    });

    it("rejects when palaceReadings does not have exactly 12 items", () => {
      const invalid = createValidReportContentV2();
      invalid.palaceReadings.pop();
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);
    });

    it("enforces canonical order for thematicSynthesis", () => {
      const invalid = createValidReportContentV2();
      // Swap theme 0 and theme 1
      const temp = invalid.thematicSynthesis[0]!;
      invalid.thematicSynthesis[0] = invalid.thematicSynthesis[1]!;
      invalid.thematicSynthesis[1] = temp;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);
    });

    it("rejects when thematicSynthesis does not have exactly 4 items", () => {
      const invalid = createValidReportContentV2();
      invalid.thematicSynthesis.pop();
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("decadal range 10-value inclusive requirement (end - start === 9)", () => {
    it("accepts valid 10-year decadal ranges", () => {
      const valid = createValidReportContentV2();
      const decadal = asActiveCurrentDecadal(valid);
      decadal.ageRange = [12, 21];
      decadal.yearRange = [2012, 2021];
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(valid).success).toBe(true);
    });

    it("rejects currentDecadal ageRange not spanning 10 values", () => {
      const invalid = createValidReportContentV2();
      asActiveCurrentDecadal(invalid).ageRange = [22, 30]; // span 9
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);

      const invalid2 = createValidReportContentV2();
      asActiveCurrentDecadal(invalid2).ageRange = [22, 32]; // span 11
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid2).success).toBe(false);
    });

    it("rejects currentDecadal yearRange not spanning 10 values", () => {
      const invalid = createValidReportContentV2();
      asActiveCurrentDecadal(invalid).yearRange = [2022, 2030]; // span 9
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);

      const invalid2 = createValidReportContentV2();
      asActiveCurrentDecadal(invalid2).yearRange = [2022, 2032]; // span 11
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid2).success).toBe(false);
    });
  });


  describe("currentDecadal state discriminated union", () => {
    it("parses report with not_started currentDecadal successfully", () => {
      const valid = createValidReportContentV2();
      valid.currentDecadal = {
        title: "Đại vận chưa khởi (bắt đầu từ 6 tuổi)",
        state: "not_started",
        firstCycleStartAge: 6,
        firstCycleStartYear: 2030,
        narrative: "Đương số đang trong giai đoạn tiền đại vận (thời thơ ấu), đại vận 10 năm đầu tiên sẽ chính thức khởi sự vào năm 2030 (6 tuổi).",
        evidenceKeys: ["ziwei.palace.life", "ziwei.timing.decadal"],
      };
      const parsed = ZiweiComprehensiveReportContentV2Schema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.currentDecadal.state).toBe("not_started");
      }
    });

    it("rejects not_started currentDecadal with mixed active fields", () => {
      const invalid = createValidReportContentV2();
      invalid.currentDecadal = {
        title: "Đại vận",
        state: "not_started",
        firstCycleStartAge: 6,
        firstCycleStartYear: 2030,
        index: 0,
        narrative: "narrative",
        evidenceKeys: ["ziwei.timing.decadal"],
      } as any;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);

      const invalid2 = createValidReportContentV2();
      invalid2.currentDecadal = {
        title: "Đại vận",
        state: "not_started",
        firstCycleStartAge: 6,
        firstCycleStartYear: 2030,
        ageRange: [6, 15],
        narrative: "narrative",
        evidenceKeys: ["ziwei.timing.decadal"],
      } as any;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid2).success).toBe(false);
    });

    it("rejects active currentDecadal with mixed not_started fields", () => {
      const invalid = createValidReportContentV2();
      (invalid.currentDecadal as any).firstCycleStartAge = 6;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);
    });

    it("rejects currentDecadal with missing or invalid state discriminator", () => {
      const invalid = createValidReportContentV2();
      delete (invalid.currentDecadal as any).state;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);

      const invalid2 = createValidReportContentV2();
      (invalid2.currentDecadal as any).state = "pending";
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid2).success).toBe(false);
    });
  });

  describe("annualSnapshot targetYear vs asOfDate", () => {
    it("accepts matching targetYear and asOfDate year", () => {
      const valid = createValidReportContentV2();
      valid.annualSnapshot.asOfDate = "2026-09-12";
      valid.annualSnapshot.targetYear = 2026;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(valid).success).toBe(true);
    });

    it("rejects mismatch between annualSnapshot targetYear and asOfDate year", () => {
      const invalid = createValidReportContentV2();
      invalid.annualSnapshot.asOfDate = "2026-09-12";
      invalid.annualSnapshot.targetYear = 2025;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("required titles in stored report V2", () => {
    it("rejects missing or empty title on currentDecadal", () => {
      const invalid = createValidReportContentV2();
      delete (invalid.currentDecadal as any).title;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);

      const invalidEmpty = createValidReportContentV2();
      invalidEmpty.currentDecadal.title = "";
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalidEmpty).success).toBe(false);
    });

    it("rejects missing or empty title on annualSnapshot", () => {
      const invalid = createValidReportContentV2();
      delete (invalid.annualSnapshot as any).title;
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);

      const invalidEmpty = createValidReportContentV2();
      invalidEmpty.annualSnapshot.title = "  ";
      expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalidEmpty).success).toBe(false);
    });
  });

  it("enforces 3-5 action bounds on practicalDirection", () => {
    const valid3 = createValidReportContentV2();
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(valid3).success).toBe(true);

    const valid4 = createValidReportContentV2();
    valid4.practicalDirection.push(createValidAction(4));
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(valid4).success).toBe(true);

    const valid5 = createValidReportContentV2();
    valid5.practicalDirection.push(createValidAction(4));
    valid5.practicalDirection.push(createValidAction(5));
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(valid5).success).toBe(true);

    // Rejects fewer than 3 actions
    const invalid2 = createValidReportContentV2();
    invalid2.practicalDirection.pop(); // now 2
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid2).success).toBe(false);

    const invalidEmpty = createValidReportContentV2();
    invalidEmpty.practicalDirection = [];
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalidEmpty).success).toBe(false);

    // Rejects more than 5 actions
    const invalid6 = createValidReportContentV2();
    invalid6.practicalDirection.push(createValidAction(4));
    invalid6.practicalDirection.push(createValidAction(5));
    invalid6.practicalDirection.push(createValidAction(6));
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid6).success).toBe(false);
  });

  it("enforces exact four action keys: recommendation, rationale, avoid, evidenceKeys", () => {
    // Missing recommendation
    const missingRec = createValidReportContentV2();
    delete (missingRec.practicalDirection[0] as any).recommendation;
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(missingRec).success).toBe(false);

    // Missing rationale
    const missingRat = createValidReportContentV2();
    delete (missingRat.practicalDirection[0] as any).rationale;
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(missingRat).success).toBe(false);

    // Missing avoid
    const missingAvoid = createValidReportContentV2();
    delete (missingAvoid.practicalDirection[0] as any).avoid;
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(missingAvoid).success).toBe(false);

    // Missing evidenceKeys
    const missingEvidence = createValidReportContentV2();
    delete (missingEvidence.practicalDirection[0] as any).evidenceKeys;
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(missingEvidence).success).toBe(false);

    // Empty evidenceKeys
    const emptyEvidence = createValidReportContentV2();
    emptyEvidence.practicalDirection[0]!.evidenceKeys = [];
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(emptyEvidence).success).toBe(false);

    // Extra unauthorized field (strict rejection)
    const extraFieldAction = createValidReportContentV2();
    (extraFieldAction.practicalDirection[0] as any).goal = "career_advancement";
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(extraFieldAction).success).toBe(false);

    const milestoneAction = createValidReportContentV2();
    (milestoneAction.practicalDirection[0] as any).milestone30Days = "check status";
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(milestoneAction).success).toBe(false);
  });

  it("strictly rejects unknown fields at top-level", () => {
    const invalid = {
      ...createValidReportContentV2(),
      unexpectedField: "not_allowed",
    };
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalid).success).toBe(false);
  });

  it("enforces non-empty evidenceKeys across all narrative sections", () => {
    const emptyOverview = createValidReportContentV2();
    emptyOverview.overview.evidenceKeys = [];
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(emptyOverview).success).toBe(false);

    const withSensitivity = {
      ...createValidReportContentV2(),
      birthTimeSensitivity: {
        title: "Phân tích",
        stableFactors: { title: "Ổn định", narrative: "ổn định", evidenceKeys: ["k1"] },
        sensitiveFactors: { title: "Nhạy cảm", narrative: "nhạy cảm", evidenceKeys: ["k2"] },
      },
    };
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(withSensitivity).success).toBe(false);

    const emptyDecadal = createValidReportContentV2();
    emptyDecadal.currentDecadal.evidenceKeys = [];
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(emptyDecadal).success).toBe(false);

    const emptyAnnual = createValidReportContentV2();
    emptyAnnual.annualSnapshot.evidenceKeys = [];
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(emptyAnnual).success).toBe(false);
  });

  it("enforces ISO date format for annualSnapshot asOfDate", () => {
    const invalidDate = createValidReportContentV2();
    invalidDate.annualSnapshot.asOfDate = "not-a-date" as never;
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalidDate).success).toBe(false);

    const invalidFormat = createValidReportContentV2();
    invalidFormat.annualSnapshot.asOfDate = "2026/09/12" as never;
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(invalidFormat).success).toBe(false);
  });
});
