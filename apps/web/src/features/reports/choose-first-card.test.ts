import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ZiweiPurchaseFactsV1Schema, type ZiweiPurchaseFactsV1 } from "@lasoviet/contracts";
import { chooseFirstCard, type FirstCardKind } from "./choose-first-card";

// The seven synthetic charts of the LSV-89 acceptance export (evaluation date 22/09/2026, lunar month 8 of 2026).
const evidence = JSON.parse(readFileSync(new URL("../../../../../plan/evidence/lsv89/purchase-context-seven.json", import.meta.url), "utf8")) as {
  samples: { id: string; purchaseFacts: unknown }[];
};
const charts = evidence.samples.map((sample) => ({ id: sample.id, facts: ZiweiPurchaseFactsV1Schema.parse(sample.purchaseFacts) }));

/** A variation of a sample that still satisfies the contract's own consistency rules. */
function variant(facts: ZiweiPurchaseFactsV1, change: Partial<ZiweiPurchaseFactsV1>): ZiweiPurchaseFactsV1 {
  return ZiweiPurchaseFactsV1Schema.parse({ ...facts, ...change });
}
/** Move the person to year k of their current decade (keeps start/end, shifts the lunar year and the annual palaces). */
function atYearInDecade(facts: ZiweiPurchaseFactsV1, k: number): ZiweiPurchaseFactsV1 {
  const year = facts.currentDecade!.span.startYear + k - 1;
  return variant(facts, {
    lunarYear: year,
    annualPalaces: [{ year, palaceId: facts.annualPalaces[0]!.palaceId }, { year: year + 1, palaceId: facts.annualPalaces[1]!.palaceId }],
    currentDecade: { span: facts.currentDecade!.span, yearInCycle: k, remainingYears: 10 - k },
  });
}
const nearYearEnd = (facts: ZiweiPurchaseFactsV1) => variant(facts, { remainingLunarMonths: 3, nearYearEnd: true });

const everything = new Set<FirstCardKind>(["year", "year-next", "year-pair", "decade-current", "decade-next", "lifetime"]);
const noPair = new Set<FirstCardKind>(["year", "year-next", "decade-current", "decade-next", "lifetime"]);
const today = (fn: (chart: (typeof charts)[number]) => void) => charts.forEach(fn);

describe("chooseFirstCard on the seven acceptance charts", () => {
  it("has the seven charts, all on 22/09/2026 with four lunar months left", () => {
    expect(charts).toHaveLength(7);
    for (const { facts } of charts) {
      expect(facts.lunarYear).toBe(2026);
      expect(facts.remainingLunarMonths).toBe(4);
      expect(facts.nearYearEnd).toBe(false);
    }
  });

  it("year intent with months to spare leads with this year, then the current decade, and quotes the person's own cycle", () => {
    today(({ id, facts }) => {
      const choice = chooseFirstCard({ intent: "year", facts, offered: noPair });
      const decade = facts.currentDecade!;
      expect(choice.leading.slice(0, 2), id).toEqual(["year", "decade-current"]);
      expect(choice.facts[0], id).toEqual({
        kind: "year-in-decade", year: 2026, annualPalaceId: facts.annualPalaces[0]!.palaceId, yearInCycle: decade.yearInCycle,
        startAge: decade.span.startAge, endAge: decade.span.endAge, decadePalaceId: decade.span.palaceId,
      });
    });
  });

  it("stresses the current decade only for people who have just entered it (year 1 or 2 of 10)", () => {
    const stressed = charts.filter(({ facts }) => facts.currentDecade!.yearInCycle <= 2).map(({ id }) => id);
    expect(stressed).toEqual(["synthetic-02", "synthetic-04", "synthetic-05"]);
    today(({ id, facts }) => {
      const choice = chooseFirstCard({ intent: "year", facts, offered: noPair });
      expect(choice.emphasis, id).toBe(stressed.includes(id) ? "decade-current" : null);
      if (stressed.includes(id)) expect(choice.facts.at(-1)).toMatchObject({ kind: "decade-new", startYear: facts.currentDecade!.span.startYear });
    });
  });

  it("brings the next decade forward only when the current one has two years or fewer left", () => {
    today(({ id, facts }) => {
      const choice = chooseFirstCard({ intent: "year", facts, offered: noPair });
      expect(choice.leading, `${id} (3+ years left)`).not.toContain("decade-next");
      const closing = chooseFirstCard({ intent: "year", facts: atYearInDecade(facts, 9), offered: noPair });
      const decade = facts.currentDecade!.span;
      expect(closing.leading, id).toEqual(["year", "decade-current", "decade-next"]);
      expect(closing.emphasis, id).toBe("decade-next");
      expect(closing.facts.at(-1), id).toEqual({
        kind: "decade-ending", endYear: decade.endYear, startAge: decade.startAge, endAge: decade.endAge,
        nextStartYear: facts.nextDecade!.startYear, nextPalaceId: facts.nextDecade!.palaceId,
      });
    });
  });

  it("switches exactly at the decade thresholds: two years left brings the next decade, three does not; year 2 is new, year 3 is not", () => {
    const { facts } = charts[0]!;
    const kinds = (k: number) => chooseFirstCard({ intent: "year", facts: atYearInDecade(facts, k), offered: noPair });
    expect(kinds(7).leading).not.toContain("decade-next");
    expect(kinds(8).leading).toContain("decade-next");
    expect(kinds(10).leading).toContain("decade-next");
    expect(kinds(1).emphasis).toBe("decade-current");
    expect(kinds(2).emphasis).toBe("decade-current");
    expect(kinds(3).emphasis).toBeNull();
  });

  it("is deterministic and never reads the clock or mutates its input", () => {
    today(({ facts }) => {
      const frozen = JSON.stringify(facts);
      const first = chooseFirstCard({ intent: "year", facts, offered: everything });
      expect(chooseFirstCard({ intent: "year", facts, offered: everything })).toEqual(first);
      expect(JSON.stringify(facts)).toBe(frozen);
    });
  });
});

describe("chooseFirstCard: near the end of the lunar year (R8)", () => {
  it("leads with next year, keeps this year, and says the true state of the year", () => {
    today(({ id, facts }) => {
      const late = nearYearEnd(facts);
      const choice = chooseFirstCard({ intent: "year", facts: late, offered: noPair });
      expect(choice.leading.slice(0, 3), id).toEqual(["year-next", "year", "decade-current"]);
      expect(choice.facts[0], id).toEqual({
        kind: "year-ending", year: 2026, remainingLunarMonths: 3, nextYear: 2027, nextAnnualPalaceId: facts.annualPalaces[1]!.palaceId,
      });
    });
  });

  it("offers the pair as the lead once it is on sale, and ignores it while it is not", () => {
    const { facts } = charts[0]!;
    expect(chooseFirstCard({ intent: "year", facts: nearYearEnd(facts), offered: everything }).leading[0]).toBe("year-pair");
    expect(chooseFirstCard({ intent: "year", facts: nearYearEnd(facts), offered: noPair }).leading[0]).toBe("year-next");
  });

  it("flips exactly at the threshold: three months left is near the end, four is not", () => {
    const { facts } = charts[0]!;
    expect(chooseFirstCard({ intent: "year", facts, offered: noPair }).leading[0]).toBe("year");
    expect(chooseFirstCard({ intent: "year", facts: nearYearEnd(facts), offered: noPair }).leading[0]).toBe("year-next");
  });
});

describe("chooseFirstCard: what is not on sale, not known, or not applicable", () => {
  const { facts } = charts[0]!;

  it("never returns a card that is not offered", () => {
    for (const offered of [new Set<FirstCardKind>(), new Set<FirstCardKind>(["lifetime"]), new Set<FirstCardKind>(["year"]), noPair]) {
      for (const person of [facts, nearYearEnd(facts), atYearInDecade(facts, 9)]) {
        const choice = chooseFirstCard({ intent: "year", facts: person, offered });
        for (const kind of choice.leading) expect(offered.has(kind)).toBe(true);
        if (choice.emphasis) expect(offered.has(choice.emphasis)).toBe(true);
      }
    }
  });

  it("falls back to the lifetime reading for a curious year buyer while no year card is on sale, and says what it really holds (FD-116)", () => {
    const choice = chooseFirstCard({ intent: "year", facts, offered: new Set<FirstCardKind>(["lifetime"]) });
    expect(choice.leading).toEqual(["lifetime"]);
    expect(choice.notes).toContain("lifetime-has-summary-only");
  });

  it("a person who already owns the lifetime reading is not sent back to buy it", () => {
    const choice = chooseFirstCard({ intent: "year", facts, offered: new Set<FirstCardKind>(["lifetime"]), ownsLifetime: true });
    expect(choice.leading).toEqual([]);
    expect(choice.notes).toEqual(["lifetime-owned"]);
    expect(chooseFirstCard({ intent: "year", facts, offered: noPair, ownsLifetime: true }).notes).toContain("lifetime-owned");
  });

  it("promotes nothing when the API gave no facts", () => {
    expect(chooseFirstCard({ intent: "year", facts: null, offered: everything })).toEqual({ leading: [], emphasis: null, facts: [], notes: [] });
  });

  it("before the first decade there is no decade card, only the truth about when it starts", () => {
    const early = variant(facts, { currentDecade: null });
    const choice = chooseFirstCard({ intent: "year", facts: early, offered: noPair });
    expect(choice.leading).toEqual(["year"]);
    expect(choice.facts).toEqual([{ kind: "first-decade-ahead", startYear: facts.nextDecade!.startYear, startAge: facts.nextDecade!.startAge }]);
  });

  it("marks a tentative birth time (FD-103)", () => {
    expect(chooseFirstCard({ intent: "year", facts: variant(facts, { provisional: true }), offered: noPair }).notes).toEqual(["provisional"]);
  });

  it("another intent (a palace, the core reading) keeps the visitor's own card in front and only adds what the cycle calls for", () => {
    const quiet = chooseFirstCard({ intent: "other", facts, offered: noPair });
    expect(quiet.leading).toEqual([]);
    expect(quiet.facts).toEqual([]);
    const closing = chooseFirstCard({ intent: "other", facts: atYearInDecade(facts, 9), offered: noPair });
    expect(closing.leading).toEqual(["decade-next"]);
    expect(closing.emphasis).toBe("decade-next");
  });
});
