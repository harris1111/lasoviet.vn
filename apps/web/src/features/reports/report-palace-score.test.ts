import { describe, expect, it } from "vitest";
import type { ReportChartSnapshotV1 } from "@lasoviet/contracts";
import { ZIWEI_PALACE_IDS } from "@lasoviet/contracts";

import { computePalaceScores, scoreBand, SCORE_BASE } from "./report-palace-score";

type Star = ReportChartSnapshotV1["palaces"][number]["stars"][number];

function snapshotWith(stars: Record<number, Star[]>): ReportChartSnapshotV1 {
  return {
    version: 1,
    palaces: ZIWEI_PALACE_IDS.map((palaceId, i) => ({
      palaceId,
      earthlyBranchId: "ziwei.branch.rat",
      isLife: i === 0,
      isBody: i === 6,
      triadPalaceIds: [ZIWEI_PALACE_IDS[(i + 4) % 12]!, ZIWEI_PALACE_IDS[(i + 8) % 12]!],
      oppositePalaceId: ZIWEI_PALACE_IDS[(i + 6) % 12]!,
      stars: stars[i] ?? [],
    })),
    decadal: { currentOrdinal: null, cycles: [] },
    annual: { targetYear: 2026, palaceId: "ziwei.palace.life" },
  } as ReportChartSnapshotV1;
}

const main = (starId: string, brightnessId: string, transformationId?: string): Star =>
  ({ starId, kind: "main", brightnessId, ...(transformationId ? { transformationId } : {}) }) as Star;
const aux = (starId: string, transformationId?: string): Star =>
  ({ starId, kind: "aux", ...(transformationId ? { transformationId } : {}) }) as Star;

describe("computePalaceScores", () => {
  it("gives an empty chart the base score everywhere", () => {
    const scores = computePalaceScores(snapshotWith({}));
    expect(scores.size).toBe(12);
    for (const s of scores.values()) expect(s.score).toBe(SCORE_BASE);
  });

  it("adds brightness and the transformation of a main star", () => {
    // Miếu +12, Hóa Lộc +10, nên riêng cung này là 22. Cung Thiên Di đối diện
    // không có chính tinh nên mượn lại 11, và chiếu về một phần ba, tức gần 4.
    const scores = computePalaceScores(
      snapshotWith({ 0: [main("ziwei.star.tianfu", "ziwei.brightness.exalted", "ziwei.transformation.prosperity")] }),
    );
    expect(scores.get("ziwei.palace.life")!.parts.own).toBe(22);
    expect(scores.get("ziwei.palace.life")!.score).toBe(76);
  });

  it("subtracts for an unfavourable main star and a blocking aux star", () => {
    const scores = computePalaceScores(
      snapshotWith({ 0: [main("ziwei.star.tanlang", "ziwei.brightness.unfavorable"), aux("ziwei.star.qingyang")] }),
    );
    expect(scores.get("ziwei.palace.life")!.parts.own).toBe(-11);
  });

  it("passes a third of a palace score to the palaces that face it", () => {
    // Cung đối của Mệnh là Thiên Di, cách 6 bước.
    const scores = computePalaceScores(
      snapshotWith({ 6: [main("ziwei.star.qisha", "ziwei.brightness.exalted")] }),
    );
    expect(scores.get("ziwei.palace.life")!.parts.chieu).toBe(4);
    // 50 nền, cộng 6 mượn từ cung đối, cộng 4 chiếu về.
    expect(scores.get("ziwei.palace.life")!.score).toBe(60);
  });

  it("lets a palace with no main star borrow the opposite one at half weight", () => {
    const scores = computePalaceScores(
      snapshotWith({ 6: [main("ziwei.star.qisha", "ziwei.brightness.exalted")] }),
    );
    // Mệnh không có chính tinh, mượn Thất Sát Miếu của Thiên Di: 12 / 2 = 6.
    expect(scores.get("ziwei.palace.life")!.parts.own).toBe(6);
  });

  // Audit finding 3 (2026-10-02): a transformation attached to an auxiliary
  // star was silently dropped, so Văn Khúc scored the same with or without
  // Hóa Kỵ. FD-107 publishes the -10 Hóa Kỵ weight for every star it lands
  // on, main or auxiliary; this fixture reproduces the audit's exact numbers.
  it("applies a transformation on an auxiliary star exactly like the formula publishes", () => {
    const plain = computePalaceScores(snapshotWith({ 0: [aux("ziwei.star.wenqu")] }));
    expect(plain.get("ziwei.palace.life")!.parts.own).toBe(4);
    expect(plain.get("ziwei.palace.life")!.score).toBe(54);

    const withHoaKy = computePalaceScores(
      snapshotWith({ 0: [aux("ziwei.star.wenqu", "ziwei.transformation.obstacle")] }),
    );
    expect(withHoaKy.get("ziwei.palace.life")!.parts.own).toBe(-6);
    expect(withHoaKy.get("ziwei.palace.life")!.score).toBe(44);
  });

  it("applies a favourable transformation on an auxiliary star too", () => {
    const withHoaLoc = computePalaceScores(
      snapshotWith({ 0: [aux("ziwei.star.lucun", "ziwei.transformation.prosperity")] }),
    );
    // Lộc Tồn +6, Hóa Lộc +10.
    expect(withHoaLoc.get("ziwei.palace.life")!.parts.own).toBe(16);
  });

  it("still applies a main star's transformation only once when the palace also has aux stars", () => {
    const scores = computePalaceScores(
      snapshotWith({
        0: [
          main("ziwei.star.tianfu", "ziwei.brightness.exalted", "ziwei.transformation.prosperity"),
          aux("ziwei.star.zuofu"),
        ],
      }),
    );
    // Miếu +12, Hóa Lộc +10 cho chính tinh (không lặp), cộng Tả Phù +4.
    expect(scores.get("ziwei.palace.life")!.parts.own).toBe(26);
  });

  it("never leaves the nought to one hundred range", () => {
    const wall = Array.from({ length: 12 }, (_, i) => i).reduce<Record<number, Star[]>>((acc, i) => {
      acc[i] = [
        main("ziwei.star.tanlang", "ziwei.brightness.weak", "ziwei.transformation.obstacle"),
        aux("ziwei.star.qingyang"), aux("ziwei.star.tuoluo"), aux("ziwei.star.huoxing"),
        aux("ziwei.star.lingxing"), aux("ziwei.star.dikong"), aux("ziwei.star.dijie"),
      ];
      return acc;
    }, {});
    for (const s of computePalaceScores(snapshotWith(wall)).values()) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic", () => {
    const snap = snapshotWith({ 0: [main("ziwei.star.ziwei", "ziwei.brightness.prosperous")] });
    const a = computePalaceScores(snap);
    const b = computePalaceScores(snap);
    for (const [id, score] of a) expect(b.get(id)!.score).toBe(score.score);
  });
});

describe("scoreBand", () => {
  it("labels each range", () => {
    expect(scoreBand(78)).toBe("manh");
    expect(scoreBand(60)).toBe("thuan");
    expect(scoreBand(50)).toBe("can");
    expect(scoreBand(35)).toBe("canh");
    expect(scoreBand(12)).toBe("kho");
  });
});
