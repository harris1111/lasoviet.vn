import { describe, expect, it } from "vitest";

import {
  PersonalDailyReadingV1Schema,
  type PersonalDailyReadingV1,
} from "./personal-daily-reading-v1.js";

describe("PersonalDailyReadingV1Schema", () => {
  const validReading: PersonalDailyReadingV1 = {
    version: 1,
    chartId: "chart-123",
    chartVersionId: "cv-456",
    asOfDate: "2026-09-22",
    calendar: {
      solarDate: "2026-09-22",
      solarDateFormatted: "Thứ Ba, 22/9/2026",
      lunarDateFormatted: "12/8 Bính Ngọ",
      dayStemBranch: "Kỷ Hợi",
      solarTerm: "Bạch Lộ",
    },
    chartGrounding: {
      touchedPalaceId: "ziwei.palace.spouse",
      touchedPalaceName: "Phu Thê",
      earthlyBranch: "Hợi",
      majorStars: ["Thiên Cơ", "Cự Môn"],
      dailyStars: ["Văn Xương"],
      dailyMutagens: [
        { mutagen: "loc", starName: "Thiên Cơ" },
        { mutagen: "ky", starName: "Cự Môn" },
      ],
    },
    reading: {
      headline: "Ngày Kỷ Hợi chạm cung Phu Thê của bạn",
      overview:
        "Hôm nay dòng khí nhật lưu kích hoạt cung Phu Thê. Có cơ hội thấu hiểu đối phương nhưng cần cẩn trọng ngôn từ.",
      aspects: [
        {
          key: "work",
          title: "Công việc & Đối tác",
          guidance: "Cần lưu ý kiểm tra các trao đổi đối tác bằng văn bản.",
          evidenceKeys: ["daily.palace.ziwei.palace.spouse", "daily.aspect.work"],
        },
        {
          key: "finances",
          title: "Tài chính",
          guidance: "Giữ ngân sách ổn định, hạn chế chi tiêu bốc đồng.",
          evidenceKeys: [
            "daily.palace.ziwei.palace.spouse",
            "daily.aspect.finances",
          ],
        },
        {
          key: "relationships",
          title: "Tình cảm & Gia đạo",
          guidance: "Lắng nghe chân thành, tránh tranh cãi về chuyện cũ.",
          evidenceKeys: [
            "daily.palace.ziwei.palace.spouse",
            "daily.aspect.relationships",
          ],
        },
        {
          key: "wellbeing",
          title: "Thân tâm & Sức khỏe",
          guidance: "Dành thời gian nghỉ ngơi vào cuối ngày để tái tạo năng lượng.",
          evidenceKeys: [
            "daily.palace.ziwei.palace.spouse",
            "daily.aspect.wellbeing",
          ],
        },
      ],
      actionPlan: {
        recommendations: ["Lắng nghe trước khi phản hồi", "Rà soát điều khoản hợp tác"],
        cautions: ["Tránh tranh cãi gay gắt", "Không ký duyệt vội vàng"],
        evidenceKeys: ["daily.action.recommendations", "daily.action.cautions"],
      },
    },
    evidenceKeys: [
      "daily.date.2026-09-22",
      "daily.palace.ziwei.palace.spouse",
      "daily.branch.hai",
    ],
    qualityGate: {
      passed: true,
      checkedAt: "2026-09-22T06:00:00.000Z",
      rulesChecked: [
        "no_death_lifespan",
        "no_rituals_amulets",
        "evidence_anchored",
        "no_lottery_superstition",
      ],
    },
  };

  it("validates a compliant personal daily reading contract", () => {
    const parsed = PersonalDailyReadingV1Schema.safeParse(validReading);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const invalid = { ...validReading, asOfDate: "22-09-2026" };
    const parsed = PersonalDailyReadingV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects aspect array with missing aspects (must be 4)", () => {
    const invalid = {
      ...validReading,
      reading: {
        ...validReading.reading,
        aspects: validReading.reading.aspects.slice(0, 3),
      },
    };
    const parsed = PersonalDailyReadingV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown properties in strict mode", () => {
    const invalid = { ...validReading, unauthorizedExtra: "banned" };
    const parsed = PersonalDailyReadingV1Schema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
