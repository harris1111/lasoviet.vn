import type { ZiweiPurchaseFactsV1 } from "@lasoviet/contracts";

/**
 * Which card leads the offer page for THIS person (plan phase 5, "Chọn thẻ đầu theo từng người", research 01 table 4.4).
 *
 * A pure function over the read-only purchase facts of the chart (lunar year, months left, current/next decade,
 * annual palaces). It decides order and emphasis only. It never invents a number: every fact a card may quote is
 * returned in `facts`, taken straight from the input, and the caller words it. Which cards exist is the catalog's
 * business: pass the kinds that are on sale in `offered`; an unsold kind is never returned.
 */
export type FirstCardKind = "year" | "year-next" | "year-pair" | "decade-current" | "decade-next" | "lifetime";

export type FirstCardIntent = "year" | "other";

export type FirstCardFact =
  /** The year is almost over: say how many months are left, never a countdown. */
  | { kind: "year-ending"; year: number; remainingLunarMonths: number; nextYear: number; nextAnnualPalaceId: string }
  /** The year, where it falls in the current decade. */
  | { kind: "year-in-decade"; year: number; annualPalaceId: string; yearInCycle: number; startAge: number; endAge: number; decadePalaceId: string }
  /** The current decade closes soon and the next one has a palace already. */
  | { kind: "decade-ending"; endYear: number; startAge: number; endAge: number; nextStartYear: number; nextPalaceId: string }
  /** The person has only just entered the current decade. */
  | { kind: "decade-new"; startYear: number; startAge: number; endAge: number; palaceId: string }
  /** The first decade has not started: there is no decade to sell yet. */
  | { kind: "first-decade-ahead"; startYear: number; startAge: number };

export type FirstCardNote =
  /** The birth time is tentative (FD-103): every time-based card says "tạm tính". */
  | "provisional"
  /** The year card is not on sale, so the lifetime reading is the honest destination (FD-116): it holds a short year and decade summary, not the 12 months. */
  | "lifetime-has-summary-only"
  /** The person owns the lifetime reading: reopen it, and present the year (12 months) as an addition. */
  | "lifetime-owned";

export type FirstCardChoice = {
  /** Cards to place in front, most important first. Only kinds in `offered`. */
  leading: FirstCardKind[];
  /** The leading card the page should draw attention to (two gold borders); null when there is nothing to stress. */
  emphasis: FirstCardKind | null;
  facts: FirstCardFact[];
  notes: FirstCardNote[];
};

export type FirstCardInput = {
  intent: FirstCardIntent;
  /** Purchase facts of the chart, or null when the API gave none: then nothing is promoted. */
  facts: ZiweiPurchaseFactsV1 | null;
  /** Card kinds currently on sale. */
  offered: ReadonlySet<FirstCardKind>;
  ownsLifetime?: boolean;
};

/** A decade this close to its end (R = 10 − k years left) brings the next decade forward. */
export const DECADE_ENDING_WITHIN_YEARS = 2;
/** A decade this young (year k of 10) makes the current decade the card to stress. */
export const DECADE_NEW_WITHIN_YEARS = 2;

export function chooseFirstCard({ intent, facts, offered, ownsLifetime = false }: FirstCardInput): FirstCardChoice {
  const leading: FirstCardKind[] = [];
  const choice: FirstCardChoice = { leading, emphasis: null, facts: [], notes: [] };
  const lead = (kind: FirstCardKind) => { if (offered.has(kind) && !leading.includes(kind)) leading.push(kind); };

  if (ownsLifetime) choice.notes.push("lifetime-owned");
  if (!facts) return choice;
  if (facts.provisional) choice.notes.push("provisional");

  const decade = facts.currentDecade;
  const nextDecade = facts.nextDecade;
  const annual = (year: number) => facts.annualPalaces.find((entry) => entry.year === year);

  if (intent === "year") {
    const yearCardsOnSale = offered.has("year") || offered.has("year-next") || offered.has("year-pair");
    if (!yearCardsOnSale) {
      if (!ownsLifetime) { lead("lifetime"); choice.notes.push("lifetime-has-summary-only"); }
    } else if (facts.nearYearEnd) {
      // Only a few months left: lead with next year (or the pair), and say the true state of the year.
      if (offered.has("year-pair")) lead("year-pair"); else lead("year-next");
      lead("year");
      const next = annual(facts.lunarYear + 1);
      if (next) choice.facts.push({ kind: "year-ending", year: facts.lunarYear, remainingLunarMonths: facts.remainingLunarMonths, nextYear: next.year, nextAnnualPalaceId: next.palaceId });
    } else {
      lead("year");
      const current = annual(facts.lunarYear);
      if (current && decade) {
        choice.facts.push({ kind: "year-in-decade", year: current.year, annualPalaceId: current.palaceId, yearInCycle: decade.yearInCycle,
          startAge: decade.span.startAge, endAge: decade.span.endAge, decadePalaceId: decade.span.palaceId });
      }
    }
    if (decade) lead("decade-current");
  }

  if (decade) {
    // Before the first decade there is no current one (decade === null), so none of this applies.
    if (decade.remainingYears <= DECADE_ENDING_WITHIN_YEARS && nextDecade) {
      lead("decade-next");
      choice.facts.push({ kind: "decade-ending", endYear: decade.span.endYear, startAge: decade.span.startAge, endAge: decade.span.endAge,
        nextStartYear: nextDecade.startYear, nextPalaceId: nextDecade.palaceId });
      choice.emphasis = offered.has("decade-next") ? "decade-next" : choice.emphasis;
    } else if (decade.yearInCycle <= DECADE_NEW_WITHIN_YEARS) {
      lead("decade-current");
      choice.facts.push({ kind: "decade-new", startYear: decade.span.startYear, startAge: decade.span.startAge, endAge: decade.span.endAge, palaceId: decade.span.palaceId });
      choice.emphasis = offered.has("decade-current") ? "decade-current" : choice.emphasis;
    }
  } else if (nextDecade) {
    choice.facts.push({ kind: "first-decade-ahead", startYear: nextDecade.startYear, startAge: nextDecade.startAge });
  }

  return choice;
}
