import type { NormalizedZiweiChartV1, ReportChartPalaceV1, ReportChartSnapshotV1 } from "@lasoviet/contracts";
import { getPalaceRelations } from "../ziwei/ziwei-chart-relations";

// "Độ mạnh cấu trúc" của từng cung (FD-107).
//
// Đây không phải điểm tốt xấu của một đời người. Nó đo đúng một việc: bộ sao
// trong cung này, cộng phần các cung chiếu tới, đang hỗ trợ hay đang cản.
// Công thức được in nguyên văn cho người đọc xem, mọi con số truy ngược được
// về sao thật trên lá số, và cùng một lá số thì lúc nào tính cũng ra đúng một
// kết quả. Không có yếu tố ngẫu nhiên.
//
// Các trọng số dưới đây cần An và founder duyệt trước khi bật cho khách trả phí.

export const SCORE_BASE = 50;
export const CHIEU_WEIGHT = 1 / 3;

const BRIGHTNESS_POINTS: Record<string, number> = {
  "ziwei.brightness.exalted": 12,
  "ziwei.brightness.prosperous": 9,
  "ziwei.brightness.favorable": 6,
  "ziwei.brightness.neutral": 2,
  "ziwei.brightness.unfavorable": -6,
  "ziwei.brightness.weak": -9,
};

const TRANSFORMATION_POINTS: Record<string, number> = {
  "ziwei.transformation.prosperity": 10,
  "ziwei.transformation.power": 8,
  "ziwei.transformation.fame": 6,
  "ziwei.transformation.obstacle": -10,
};

const AUX_POINTS: Record<string, number> = {
  // Lục cát tinh
  "ziwei.star.zuofu": 4,
  "ziwei.star.youbi": 4,
  "ziwei.star.wenchang": 4,
  "ziwei.star.wenqu": 4,
  "ziwei.star.tiankui": 4,
  "ziwei.star.tianyue": 4,
  // Lộc Tồn, Thiên Mã
  "ziwei.star.lucun": 6,
  "ziwei.star.tianma": 3,
  // Lục sát tinh
  "ziwei.star.qingyang": -5,
  "ziwei.star.tuoluo": -5,
  "ziwei.star.huoxing": -5,
  "ziwei.star.lingxing": -5,
  "ziwei.star.dikong": -5,
  "ziwei.star.dijie": -5,
  // Tuần, Triệt
  "ziwei.star.xunkong": -4,
  "ziwei.star.jielu": -4,
  "ziwei.star.kongwang": -4,
  "ziwei.star.jiekong": -4,
};

export type PalaceScoreBandKey = "manh" | "thuan" | "can" | "canh" | "kho";

export type PalaceScore = {
  palaceId: string;
  score: number;
  band: PalaceScoreBandKey;
  parts: { base: number; own: number; chieu: number };
};

/** Điểm riêng của một cung, chưa cộng phần các cung chiếu tới. */
function ownScore(palace: ReportChartPalaceV1, opposite?: ReportChartPalaceV1): number {
  let mains = palace.stars.filter((s) => s.kind === "main");
  let borrowed = false;
  if (mains.length === 0 && opposite) {
    // Cung vô chính diệu mượn chính tinh của cung đối, tính nửa điểm.
    mains = opposite.stars.filter((s) => s.kind === "main");
    borrowed = true;
  }

  let total = 0;
  for (const star of mains) {
    let value = star.brightnessId ? BRIGHTNESS_POINTS[star.brightnessId] ?? 0 : 0;
    if (star.transformationId) {
      value += TRANSFORMATION_POINTS[star.transformationId] ?? 0;
    }
    total += borrowed ? value / 2 : value;
  }
  // Phụ tinh của chính cung này (không mượn): cộng điểm sao, cộng Tứ hóa nếu
  // sao đó có, đúng một lần mỗi sao. Trước bản sửa này, Hóa Kỵ trên phụ tinh
  // (ví dụ Văn Khúc Hóa Kỵ) bị bỏ qua vì chỉ chính tinh được cộng Tứ hóa.
  for (const star of palace.stars) {
    if (star.kind !== "aux") continue;
    total += AUX_POINTS[star.starId] ?? 0;
    if (star.transformationId) {
      total += TRANSFORMATION_POINTS[star.transformationId] ?? 0;
    }
  }
  return total;
}

export function scoreBand(score: number): PalaceScoreBandKey {
  if (score >= 70) return "manh";
  if (score >= 55) return "thuan";
  if (score >= 45) return "can";
  if (score >= 30) return "canh";
  return "kho";
}

export function computePalaceScores(snapshot: Pick<ReportChartSnapshotV1, "palaces">): Map<string, PalaceScore> {
  const byId = new Map(snapshot.palaces.map((p) => [p.palaceId, p]));
  const own = new Map<string, number>();
  for (const palace of snapshot.palaces) {
    own.set(palace.palaceId, ownScore(palace, byId.get(palace.oppositePalaceId)));
  }

  const result = new Map<string, PalaceScore>();
  for (const palace of snapshot.palaces) {
    const related = [palace.oppositePalaceId, ...palace.triadPalaceIds];
    const chieu = related.reduce((sum, id) => sum + (own.get(id) ?? 0), 0) * CHIEU_WEIGHT;
    const raw = SCORE_BASE + (own.get(palace.palaceId) ?? 0) + chieu;
    const score = Math.max(0, Math.min(100, Math.round(raw)));
    result.set(palace.palaceId, {
      palaceId: palace.palaceId,
      score,
      band: scoreBand(score),
      parts: {
        base: SCORE_BASE,
        own: Math.round(own.get(palace.palaceId) ?? 0),
        chieu: Math.round(chieu),
      },
    });
  }
  return result;
}

/** Use the same published formula without inventing annual or decadal timing. */
export function computeNormalizedPalaceScores(chart: NormalizedZiweiChartV1): Map<string, PalaceScore> {
  const transformations = new Map(chart.transformations.map((item) => [item.starId, item.id]));
  const palaces: ReportChartPalaceV1[] = chart.palaces.map((palace) => {
    const relations = getPalaceRelations(palace.id, chart.palaces);
    return {
      palaceId: palace.id,
      earthlyBranchId: palace.earthlyBranchId,
      isLife: palace.id === chart.soulPalaceId,
      isBody: palace.id === chart.bodyPalaceId,
      oppositePalaceId: (relations.oppositeId ?? palace.id) as ReportChartPalaceV1["palaceId"],
      triadPalaceIds: relations.trineIds as ReportChartPalaceV1["triadPalaceIds"],
      stars: palace.stars.map((star) => ({
        starId: star.id,
        kind: star.category === "major" ? "main" : "aux",
        brightnessId: star.brightness,
        transformationId: transformations.get(star.id),
      })),
    };
  });
  return computePalaceScores({ palaces });
}
