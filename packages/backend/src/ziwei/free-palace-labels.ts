import { KNOWN_CANONICAL_IDENTIFIERS_VI } from "../reports/comprehensive-report-validator-v4.js";

export type FreePalaceLocale = "vi" | "en";

// English labels for exactly what a one-palace gift may name: palaces, branches, brightness,
// transformations and the 14 principal stars. They mirror apps/web/src/features/ziwei/ziwei-presentation.ts
// (the backend cannot import the web app); tests/free-ai/free-palace-labels.parity.test.ts fails if they drift.
const EN: Record<string, string> = {
  "ziwei.palace.life": "Life Palace", "ziwei.palace.siblings": "Siblings Palace", "ziwei.palace.spouse": "Spouse Palace",
  "ziwei.palace.children": "Children Palace", "ziwei.palace.wealth": "Wealth Palace", "ziwei.palace.health": "Health Palace",
  "ziwei.palace.travel": "Travel Palace", "ziwei.palace.friends": "Friends Palace", "ziwei.palace.career": "Career Palace",
  "ziwei.palace.property": "Property Palace", "ziwei.palace.fortune": "Fortune Palace", "ziwei.palace.parents": "Parents Palace",
  "ziwei.branch.rat": "Rat", "ziwei.branch.ox": "Ox", "ziwei.branch.tiger": "Tiger", "ziwei.branch.rabbit": "Rabbit",
  "ziwei.branch.dragon": "Dragon", "ziwei.branch.snake": "Snake", "ziwei.branch.horse": "Horse", "ziwei.branch.goat": "Goat",
  "ziwei.branch.monkey": "Monkey", "ziwei.branch.rooster": "Rooster", "ziwei.branch.dog": "Dog", "ziwei.branch.pig": "Pig",
  "ziwei.brightness.exalted": "Exalted", "ziwei.brightness.prosperous": "Prosperous", "ziwei.brightness.favorable": "Favorable",
  "ziwei.brightness.neutral": "Neutral", "ziwei.brightness.unfavorable": "Unfavorable", "ziwei.brightness.weak": "Weak",
  "ziwei.transformation.prosperity": "Prosperity", "ziwei.transformation.power": "Power",
  "ziwei.transformation.fame": "Fame", "ziwei.transformation.obstacle": "Obstacle",
  "ziwei.star.ziwei": "Zi Wei", "ziwei.star.tianji": "Tian Ji", "ziwei.star.taiyang": "Tai Yang", "ziwei.star.wuqu": "Wu Qu",
  "ziwei.star.tiantong": "Tian Tong", "ziwei.star.lianzhen": "Lian Zhen", "ziwei.star.tianfu": "Tian Fu", "ziwei.star.taiyin": "Tai Yin",
  "ziwei.star.tanlang": "Tan Lang", "ziwei.star.jumen": "Ju Men", "ziwei.star.tianxiang": "Tian Xiang", "ziwei.star.tianliang": "Tian Liang",
  "ziwei.star.qisha": "Qi Sha", "ziwei.star.pojun": "Po Jun",
};
export const FREE_PALACE_EN_LABELS: Readonly<Record<string, string>> = EN;

export function freePalaceLabel(locale: FreePalaceLocale, id: string): string | undefined {
  return locale === "en" ? EN[id] : KNOWN_CANONICAL_IDENTIFIERS_VI[id];
}
// Principal-star names for the prose check ("invented star"), without the vi "sao " prefix.
export function freePalaceStarNames(locale: FreePalaceLocale): string[] {
  return Object.keys(locale === "en" ? EN : KNOWN_CANONICAL_IDENTIFIERS_VI).filter((id) => id.startsWith("ziwei.star."))
    .map((id) => freePalaceLabel(locale, id)!.replace(/^sao\s+/u, ""));
}
