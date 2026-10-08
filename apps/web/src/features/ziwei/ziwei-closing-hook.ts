import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

export type ClosingFact =
  | { kind: "hoa"; palaceId: string; starId: string; transformationId: string }
  | { kind: "empty"; palaceId: string }
  | { kind: "pair"; palaceId: string; starIds: string[] }
  | { kind: "alone"; palaceId: string; starId: string }
  | { kind: "months"; year: number; count: number };

export type ClosingHook = { facts: ClosingFact[]; lockedCount: number };

/**
 * Picks the facts that the closing block names. Every fact is read straight from the calculated chart
 * (or the annual month counts), so the sentence can only mention a star, palace or transformation the
 * chart really has. Nothing here interprets meaning.
 */
export function buildClosingHook(input: {
  chart: NormalizedZiweiChartV1;
  lockedPalaceIds: string[];
  annual: { year: number; caution: number } | null;
}): ClosingHook | null {
  const { chart, lockedPalaceIds, annual } = input;
  if (lockedPalaceIds.length === 0) return null;
  const candidates: { priority: number; order: number; fact: ClosingFact }[] = [];
  lockedPalaceIds.forEach((palaceId, order) => {
    const palace = chart.palaces.find((item) => item.id === palaceId);
    if (!palace) return;
    const major = palace.stars.filter((star) => star.category === "major");
    const withHoa = major.map((star) => ({ star, hoa: chart.transformations.find((item) => item.starId === star.id) }))
      .find((item) => item.hoa);
    if (withHoa?.hoa) candidates.push({ priority: 4, order, fact: { kind: "hoa", palaceId, starId: withHoa.star.id, transformationId: withHoa.hoa.id } });
    else if (major.length === 0) candidates.push({ priority: 3, order, fact: { kind: "empty", palaceId } });
    else if (major.length >= 2) candidates.push({ priority: 2, order, fact: { kind: "pair", palaceId, starIds: major.slice(0, 2).map((star) => star.id) } });
    else candidates.push({ priority: 1, order, fact: { kind: "alone", palaceId, starId: major[0]!.id } });
  });
  const facts: ClosingFact[] = candidates.sort((a, b) => b.priority - a.priority || a.order - b.order).slice(0, 2).map((item) => item.fact);
  // Caution months are grounded in the engine now (no forced month), so any count above zero is a real finding.
  if (annual && !chart.provisional && annual.caution >= 1) facts.push({ kind: "months", year: annual.year, count: annual.caution });
  return facts.length ? { facts, lockedCount: lockedPalaceIds.length } : null;
}
