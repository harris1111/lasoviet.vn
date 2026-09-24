import { CANONICAL_BRANCH_IDS, type CanonicalBranchId } from "../birth-profile/homepage-birth-prefill";

export const HOMEPAGE_V3_THEME_KEY = "lasoviet:theme";
export const HOMEPAGE_V3_IMAGE_ROOT = "/images/lasoviet/v3";

/** Han glyph per earthly branch, in CANONICAL_BRANCH_IDS order. */
export const BRANCH_GLYPHS: Record<CanonicalBranchId, string> = {
  zi: "子", chou: "丑", yin: "寅", mao: "卯", chen: "辰", si: "巳",
  wu: "午", wei: "未", shen: "申", you: "酉", xu: "戌", hai: "亥",
};

/** [row, column] of each branch on the 4x4 ring chart (1-indexed, Tý at the bottom). */
export const BRANCH_GRID: Record<CanonicalBranchId, [number, number]> = {
  zi: [4, 3], chou: [4, 2], yin: [4, 1], mao: [3, 1], chen: [2, 1], si: [1, 1],
  wu: [1, 2], wei: [1, 3], shen: [1, 4], you: [2, 4], xu: [3, 4], hai: [4, 4],
};

export const BRANCH_INDEX: Record<CanonicalBranchId, number> = Object.fromEntries(
  CANONICAL_BRANCH_IDS.map((id, index) => [id, index]),
) as Record<CanonicalBranchId, number>;

/** Palace id and the branch it sits on for the sample chart (Mệnh sits on Dần). */
export const PALACES = [
  { id: "menh", branch: 2 },
  { id: "huynh", branch: 1 },
  { id: "phuthe", branch: 0 },
  { id: "tutuc", branch: 11 },
  { id: "taibach", branch: 10 },
  { id: "tatach", branch: 9 },
  { id: "thiendi", branch: 8 },
  { id: "nobo", branch: 7 },
  { id: "quanloc", branch: 6 },
  { id: "dientrach", branch: 5 },
  { id: "phucduc", branch: 4 },
  { id: "phumau", branch: 3 },
] as const;

export type PalaceId = (typeof PALACES)[number]["id"];

export const PALACE_SHORTCUTS: readonly PalaceId[] = ["menh", "quanloc", "taibach", "phuthe"];

export function palaceOnBranch(branchIndex: number) {
  const normalized = ((branchIndex % 12) + 12) % 12;
  return PALACES.find((palace) => palace.branch === normalized) ?? PALACES[0];
}

/** Trine (tam hợp) and opposite (đối cung) branch indexes of a palace's branch. */
export function palaceRelations(branchIndex: number) {
  return {
    trine: [(branchIndex + 4) % 12, (branchIndex + 8) % 12] as const,
    opposite: (branchIndex + 6) % 12,
  };
}

/** Which branch an exact HH hour falls in (23:00–00:59 is Tý). Display hint only. */
export function branchIndexForHour(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12;
}

export const NEEDS = [
  { id: "self", icon: "lsv-v05-need-self.svg", chips: 2, wizard: true },
  { id: "work", icon: "lsv-v06-need-career.svg", chips: 3, wizard: true, secondaryHref: "/bat-tu" },
  { id: "love", icon: "lsv-v07-need-relationship.svg", chips: 2, wizard: true, secondaryHref: "/chiem-tinh" },
  { id: "decision", icon: "lsv-v08-need-decision.svg", chips: 1, wizard: false, href: "/kinh-dich" },
] as const;

export const DISCIPLINES = [
  { id: "batu", href: "/bat-tu", icon: "lsv-i-bat-tu.svg", art: "lsv-discipline-bat-tu.webp", tone: 1 },
  { id: "chiemtinh", href: "/chiem-tinh", icon: "lsv-i-chiem-tinh.svg", art: "lsv-discipline-chiem-tinh.webp", tone: 2 },
  { id: "kinhdich", href: "/kinh-dich", icon: "lsv-i-kinh-dich.svg", art: "lsv-discipline-kinh-dich.webp", tone: 3 },
  { id: "thansohoc", href: "/than-so-hoc", icon: "lsv-i-than-so.svg", art: "lsv-discipline-than-so.webp", tone: 4 },
] as const;

export const TUVI_ART = "lsv-discipline-tu-vi.webp";

export const COMPARE_ROW_IDS = ["strength", "own", "basis", "links", "return", "depth"] as const;

/** Hero paper topics, mapped to the wizard's top concern values. */
export const HERO_LENSES = [
  { id: "self", concern: "self_understanding" },
  { id: "career", concern: "career" },
  { id: "love", concern: "love" },
] as const;
export const FAQ_IDS = ["q1", "q2", "q3", "q4", "q5"] as const;

/** Lá top-up packs per FD-066. Hidden on the homepage unless enabled (FD-069). */
export const LA_PACKS = [
  { id: "nhap-mon", name: "Nhập Môn", vnd: 29000, base: 300, bonus: 0 },
  { id: "khoi-doc", name: "Khởi Đọc", vnd: 99000, base: 1000, bonus: 100 },
  { id: "kham-pha", name: "Khám Phá", vnd: 249000, base: 2500, bonus: 500 },
  { id: "tang-thu", name: "Tàng Thư", vnd: 599000, base: 6000, bonus: 2000 },
] as const;
