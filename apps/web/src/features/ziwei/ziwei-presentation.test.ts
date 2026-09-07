import { describe, expect, it } from "vitest";

import { ziweiPresentation } from "./ziwei-presentation";

describe("localized Zi Wei presentation", () => {
  it("presents canonical chart and evidence identifiers without exposing raw IDs", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.palace("ziwei.palace.travel")).toBe("Travel Palace");
    expect(vi.palace("ziwei.palace.travel")).toBe("Cung Thiên Di");
    expect(en.branch("ziwei.branch.tiger")).toBe("Tiger");
    expect(vi.branch("ziwei.branch.tiger")).toBe("Dần");
    expect(en.star("ziwei.star.pojun")).toBe("Po Jun");
    expect(vi.star("ziwei.star.pojun")).toBe("Phá Quân");
    expect(en.action("reflect")).toBe("Reflect");
    expect(vi.action("explore")).toBe("Khám phá thêm");
    expect(en.confidence("moderate")).toBe("Moderate");
    expect(vi.confidence("high")).toBe("Cao");
    expect(en.chrome.chartFacts).toBe("Chart facts");
    expect(vi.chrome.chartFacts).toBe("Dữ liệu lá số");
    expect(en.evidence("ziwei.identity.life-palace")).toBe(
      "Life Palace evidence",
    );
    expect(en.fact("palaces.ziwei.palace.life.earthlyBranchId")).toBe(
      "Life Palace branch",
    );
    expect(en.limitation("IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION")).toBe(
      "True solar time correction is not applied.",
    );
    expect(en.insight("body-palace-transformations-tension")).toBe(
      "Body Palace and transformations tension",
    );
    expect(en.offer("ZIWEI-IDENTITY-P0")).toBe("Identity and potential");
  });

  it("localizes interpretation bounds without rendering raw English text for supported codes", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.interpretationBound("reflective_identity_only")).toBe(
      "Use only as a reflective identity signal; does not predict deterministic events or replace professional counsel.",
    );
    expect(vi.interpretationBound("reflective_identity_only")).toBe(
      "Chỉ dùng để tự phản chiếu bản mệnh; không dự đoán biến cố có tính quyết định hay thay thế tham vấn chuyên môn.",
    );
    expect(en.interpretationBound("unknown_code")).toBe(
      "Interpretation bound recorded.",
    );
    expect(vi.interpretationBound("unknown_code")).toBe(
      "Giới hạn luận giải đã ghi nhận.",
    );
  });

  it("localizes brightness levels without exposing raw IDs", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.brightness("ziwei.brightness.exalted")).toBe("Exalted");
    expect(vi.brightness("ziwei.brightness.exalted")).toBe("Miếu");
    expect(en.brightness("ziwei.brightness.prosperous")).toBe("Prosperous");
    expect(vi.brightness("ziwei.brightness.prosperous")).toBe("Vượng");
    expect(en.brightness("ziwei.brightness.favorable")).toBe("Favorable");
    expect(vi.brightness("ziwei.brightness.favorable")).toBe("Đắc");
    expect(en.brightness("ziwei.brightness.neutral")).toBe("Neutral");
    expect(vi.brightness("ziwei.brightness.neutral")).toBe("Bình");
    expect(en.brightness("ziwei.brightness.unfavorable")).toBe("Unfavorable");
    expect(vi.brightness("ziwei.brightness.unfavorable")).toBe("Hãm");
    expect(en.brightness("ziwei.brightness.weak")).toBe("Weak");
    expect(vi.brightness("ziwei.brightness.weak")).toBe("Nhược");
    expect(en.brightness("unknown")).toBe("Standard brightness");
    expect(vi.brightness("unknown")).toBe("Độ sáng tiêu chuẩn");
  });

  it("localizes transformations without exposing raw IDs", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.transformation("ziwei.transformation.prosperity")).toBe("Prosperity");
    expect(vi.transformation("ziwei.transformation.prosperity")).toBe("Hóa Lộc");
    expect(en.transformation("ziwei.transformation.power")).toBe("Power");
    expect(vi.transformation("ziwei.transformation.power")).toBe("Hóa Quyền");
    expect(en.transformation("ziwei.transformation.fame")).toBe("Fame");
    expect(vi.transformation("ziwei.transformation.fame")).toBe("Hóa Khoa");
    expect(en.transformation("ziwei.transformation.obstacle")).toBe("Obstacle");
    expect(vi.transformation("ziwei.transformation.obstacle")).toBe("Hóa Kỵ");
    expect(en.transformation("unknown")).toBe("Transformation");
    expect(vi.transformation("unknown")).toBe("Hóa khí");
  });

  it("localizes gender, calendar kind, and time precision", () => {
    const en = ziweiPresentation("en");
    const vi = ziweiPresentation("vi");

    expect(en.gender("male")).toBe("Male");
    expect(vi.gender("male")).toBe("Nam");
    expect(en.gender("female")).toBe("Female");
    expect(vi.gender("female")).toBe("Nữ");
    expect(en.gender(undefined)).toBe("Unspecified");
    expect(vi.gender(undefined)).toBe("Chưa xác định");

    expect(en.calendarKind("solar")).toBe("Solar calendar");
    expect(vi.calendarKind("solar")).toBe("Dương lịch");
    expect(en.calendarKind("lunar")).toBe("Lunar calendar");
    expect(vi.calendarKind("lunar")).toBe("Âm lịch");

    expect(en.timePrecision("exact_minute")).toBe("Exact minute");
    expect(vi.timePrecision("exact_minute")).toBe("Chính xác theo phút");
    expect(en.timePrecision("branch_only")).toBe("Earthly branch");
    expect(vi.timePrecision("branch_only")).toBe("Theo địa chi");
    expect(en.timePrecision("range")).toBe("Time range");
    expect(vi.timePrecision("range")).toBe("Khoảng giờ");
    expect(en.timePrecision("unknown")).toBe("Unknown");
    expect(vi.timePrecision("unknown")).toBe("Chưa rõ");
  });
});
