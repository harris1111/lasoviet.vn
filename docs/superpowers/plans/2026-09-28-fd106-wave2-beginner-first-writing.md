# FD-106 Wave 2: Beginner-First Writing and Decadal Teasers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the report engine write the way the founder approved on 2026-09-28: flowing Vietnamese prose in an expert's voice that a reader with no Tử Vi background can follow, with a storytelling overview, no machine sub-headings, controlled Hán Việt, star names translated the moment they appear, and a short teaser for every decadal cycle, not just the current one.

**Founder decisions:** FD-106 (b, c, d) and the voice and vocabulary instructions of 2026-09-28.

**Specs (read both before starting):**
- `docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md`: the rules. §2b voice, §2c vocabulary, §3 star names, §4 where proof lives, §5 arc, §6 gates, §8 release gate.
- `docs/superpowers/specs/2026-09-27-interactive-report-reader-design.md` §7b.

**Target voice, verbatim:** `prototype/revamp-2026-09/doc-bao-cao-tuong-tac-palaces.js` (twelve palaces) and the `tong-quan`, `truc-menh-than`, `tu-hoa`, `dai-van`, `nam-2026` chapters in `prototype/revamp-2026-09/doc-bao-cao-tuong-tac-data.js`. These are the approved output. Use them as few-shot references in the prompt (Task 5) and as the reference texts that must pass the new gates (Task 3).

**Architecture:** A new version tuple, prompt `v4.2-beginner`, report config `v4.2-sectioned-beginner`, quality `v2.4-beginner`, runs beside the live `v4.1.2` tuple, which stays untouched so reports in flight are not affected. The tuple adds five deterministic gates, moves two existing gates from counting star names in the prose to counting stars in the evidence refs, and adds one array section `decadalTeasers`. The reader already accepts teasers (`ReportDecadalTimeline` has a `teasers` prop since PR #214); this plan fills it.

**Tech stack:** Existing section writer and quality gate modules in `packages/backend/src/reports/`, config JSON in `config/`, zod contracts, vitest. No new dependency.

**Branch:** `feat/fd106-wave2-beginner-writing`, from `master`. PR to `master`.

**Release gate (FD-082, unchanged, plus one founder check):** 20 consecutive generations on the new tuple with every section passing, then five of those twenty read by the founder against the spec §2 test ("could someone who has never read Tử Vi follow this?"). Only then switch new orders to the new tuple (Task 12).

---

## Why the text reads the way it does today

Read this before touching the prompt. Three facts from the code, not opinions:

1. **The gate forces star names into prose.** `validateComprehensiveReportSectionQualityV4` (`packages/backend/src/reports/comprehensive-report-quality-v4.ts:355-380`) fails a palace section unless at least `minimumPalaceStars: 2` stars appear **by name in the text** (`wholeWord(text, label)`), and fails every other section unless `minimumEvidenceAnchors: 2` evidence facts appear by name in the text. The model is doing what the gate demands. Tasks 3 and 4 change what the gate demands.
2. **The density check was switched off.** `PROPER_NAME_DENSITY` exists but only runs when `qualityVersion !== v2.3-sensitivity` (line 344). The live tuple is v2.3, so there is no density limit at all today. The last config that had one, v2.2, allowed 10 names per 100 syllables, which is no limit in practice.
3. **Length is not the problem.** Current targets are already 700 to 900 syllables for the overview and 550 to 750 per palace (`config/ziwei-comprehensive-report-quality.v2.3-sensitivity.json`). Keep them. This plan changes how the words are spent, not how many.

---

## File map

| File | Change |
|---|---|
| `config/ziwei-comprehensive-report-quality.v2.4-beginner.json` | New quality config |
| `packages/config/src/ziwei-report-quality.ts` | v2.4 schema, `decadalTeasers` section kind, resolver entry |
| `packages/backend/src/reports/identity-report-config.ts` | Three new version constants |
| `packages/backend/src/reports/comprehensive-report-beginner-gates.ts` (+ `.test.ts`) | New: five pure gate functions |
| `packages/backend/src/reports/comprehensive-report-quality-v4-reference.test.ts` | New: founder-approved texts must pass every new gate |
| `packages/backend/src/reports/comprehensive-report-decadal-teasers.ts` (+ `.test.ts`) | New: which cycles get a teaser |
| `packages/backend/src/reports/comprehensive-report-critic-v4.ts` | Advisory `beginner` warnings for v4.2 |
| `packages/backend/src/reports/comprehensive-report-quality-v4.ts` | Call the new gates for v2.4; move the two anchor gates to evidence refs for v2.4 |
| `packages/backend/src/reports/comprehensive-report-voice-v4-2.ts` (+ `.test.ts`) | New: voice, vocabulary and arc prompt block, few-shot references |
| `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts` | Use the voice block for v4.2; `decadalTeasers` scope, schema, per-item length |
| `packages/backend/src/reports/comprehensive-report-section-v4.ts` | `COMPREHENSIVE_REPORT_SECTION_KEYS_V4_2`, resolver entry |
| `packages/contracts/src/ziwei-comprehensive-report-v4-1.ts` | Optional `decadalTeasers` on stored content V3 |
| `packages/contracts/src/identity-report-v1.ts` | Optional `decadalTeasers` on the Tier 2 public content V3 and its projection |
| `packages/backend/src/reports/comprehensive-report-assembler-v4.ts` | Freeze teaser ordinals, palaces, ranges from derived cycles |
| `packages/backend/src/reports/report-generation.service.ts` | Accept the new tuple in `groupedActiveTuple`; put `decadalTeasers` in G3 |
| `packages/backend/src/reports/identity-report-version-family.ts`, `report-query.service.ts` | Recognise the new tuple as family `v4_1` |
| `apps/api/src/operations/fd082-v41-gate.ts` | Parameterise the expected tuple so the gate can run on v4.2 |
| `apps/web/src/features/reports/comprehensive-report-reader.tsx` | Pass teasers into `ReportDecadalTimeline` |

---

## Task 1: Version constants

**Files:** Modify `packages/backend/src/reports/identity-report-config.ts` (next to lines 27-36).

- [ ] **Step 1: Add the constants**

```ts
// FD-106 wave 2: beginner-first writing. Runs beside the v4.1.2 tuple, which stays live
// until the FD-082 gate passes on this one.
export const REPORT_PROMPT_VERSION_V4_2_BEGINNER = "ziwei.comprehensive.prompt.v4.2-beginner" as const;
export const REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER = "ziwei.comprehensive.report.v4.2-sectioned-beginner" as const;
export const REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_4_BEGINNER = "ziwei.comprehensive.quality.v2.4-beginner" as const;
```

Export all three from `packages/backend/src/index.ts` beside the existing v4.1.2 exports.

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/reports/identity-report-config.ts packages/backend/src/index.ts
git commit -m "feat(backend): add the v4.2 beginner-first version tuple constants"
```

---

## Task 2: Quality config v2.4 (TDD)

**Files:**
- Create: `config/ziwei-comprehensive-report-quality.v2.4-beginner.json`
- Modify: `packages/config/src/ziwei-report-quality.ts`
- Test: `packages/config/src/ziwei-report-quality.test.ts`

- [ ] **Step 1: Write the failing test** (append to the existing test file)

```ts
describe("quality v2.4 beginner", () => {
  const config = resolveZiweiReportQualityConfig(
    "ziwei.comprehensive.report.v4.2-sectioned-beginner",
    "ziwei.comprehensive.quality.v2.4-beginner",
  );

  it("keeps the v2.3 section lengths", () => {
    expect(config.sections.overview).toMatchObject({ minimumSyllables: 600, targetMinimumSyllables: 700, targetMaximumSyllables: 900 });
    expect(config.sections.palace).toMatchObject({ minimumSyllables: 450, targetMinimumSyllables: 550, targetMaximumSyllables: 750 });
  });

  it("adds a short per-cycle length for decadal teasers", () => {
    expect(
      resolveZiweiReportQualitySectionThreshold(
        "ziwei.comprehensive.report.v4.2-sectioned-beginner",
        "ziwei.comprehensive.quality.v2.4-beginner",
        "decadalTeasers",
      ),
    ).toMatchObject({ minimumSyllables: 100, targetMinimumSyllables: 120, targetMaximumSyllables: 200 });
  });

  it("carries the beginner-first gate settings", () => {
    if (config.version !== "ziwei.comprehensive.quality.v2.4-beginner") throw new Error("wrong version");
    expect(config.maxDistinctStarNamesPer80Syllables).toBe(1.5);
    expect(config.overviewMinimumParagraphs).toBe(5);
    expect(config.bannedPhrases).toContain("mặt sau");
    expect(config.bannedOpeners).toContain("chỗ dễ va chạm");
    expect(config.bannedPhrases).not.toContain("chỗ dễ va chạm");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/config/src/ziwei-report-quality.test.ts`
Expected: FAIL with `ZIWEI_REPORT_QUALITY_VERSION_MISMATCH`.

- [ ] **Step 3: Create the config file**

Copy `config/ziwei-comprehensive-report-quality.v2.3-sensitivity.json` to `config/ziwei-comprehensive-report-quality.v2.4-beginner.json`, then:

1. Set `"version": "ziwei.comprehensive.quality.v2.4-beginner"` and `"reportConfigVersion": "ziwei.comprehensive.report.v4.2-sectioned-beginner"`.
2. Add to `sections`:
   ```json
   "decadalTeasers": { "minimumSyllables": 100, "targetMinimumSyllables": 120, "targetMaximumSyllables": 200, "maxOutputTokens": 5000 }
   ```
3. Add these top-level keys:
   ```json
   "maxDistinctStarNamesPer80Syllables": 1.5,
   "overviewMinimumParagraphs": 5,
   "minimumNamedAnchorsInProse": 1,
   "bannedOpeners": [
     "chỗ dễ va chạm", "chỗ đang mắc", "chỗ khiến bạn mệt", "chỗ phải giữ", "chỗ sinh lộc",
     "hai lực kéo", "cách dùng cả hai", "nơi bạn phát huy", "điều cần giữ", "loại việc hợp",
     "đường thăng tiến", "cách giữ tiền", "nhịp làm và nghỉ", "giao tiếp bên ngoài",
     "nếp sống hằng ngày", "với người xung quanh", "người quanh bạn", "điều chặng này mang lại",
     "tiền bạc và sức lực", "giữ gắn bó", "giữ sức lâu dài"
   ],
   "bannedPhrases": [
     "mặt sau", "người dưới tay", "kho lẫm", "cửa lộc", "chỗ tựa", "chỗ lùi", "sức vóc", "xô lệch",
     "bật chế độ", "chế độ nào", "nạp lại năng lượng", "kích hoạt", "tối ưu", "bạn vận hành",
     "lệch pha", "gu", "toang", "flex", "chill",
     "mức độ thận trọng", "xu hướng hành động", "khả năng ứng phó linh hoạt",
     "phương thức tiếp cận", "nền tảng vững chắc", "tinh thần trách nhiệm cao", "yếu tố quan trọng"
   ]
   ```
   Two lists, because the spec bans them differently. `bannedOpeners` is spec §2b.1: these are only wrong as a heading or at the start of a sentence. The approved texts use some of them mid-sentence and read fine (`đây là chỗ phải giữ`, `đường thăng tiến của bạn nghiêng về...`). `bannedPhrases` is spec §2b.2 and §2c.3: wrong anywhere.

   **Why 1.5 and not 1.** Spec §3.3 says one star name per 80 syllables. Measured on the twelve approved palace texts (2026-09-28), the densest one, Tử Tức, names 7 distinct stars in 388 syllables, which is 1.44 per 80, and the founder approved it because every name is explained on arrival. The gate is calibrated to the approved text, not the other way round; spec §3.3 is updated to match. The real defence against jargon is translate-on-arrival (Task 5 prompt plus the Task 11 critic check), not the count.
   Both lists are meant to grow: every phrase the founder flags goes into one of them, in the same commit as the fix.

- [ ] **Step 4: Add the schema and resolver entry** in `packages/config/src/ziwei-report-quality.ts`

Add `"decadalTeasers"` to `SECTION_KINDS`. Then, after `qualityV2_3SensitivitySchema`:

```ts
const qualityV2_4BeginnerSchema = qualityBaseSchema.omit({
  properNames: true,
  maxProperNamesPer100Syllables: true,
}).extend({
  version: z.literal("ziwei.comprehensive.quality.v2.4-beginner"),
  reportConfigVersion: z.literal("ziwei.comprehensive.report.v4.2-sectioned-beginner"),
  sections: qualityBaseSchema.shape.sections.extend({
    birthTimeSensitivity: sectionSchema,
    decadalTeasers: sectionSchema,
  }).strict(),
  bannedOpeners: z.array(z.string().trim().min(1)).min(1),
  bannedPhrases: z.array(z.string().trim().min(1)).min(1),
  maxDistinctStarNamesPer80Syllables: z.number().positive(),
  overviewMinimumParagraphs: z.number().int().min(1),
  minimumNamedAnchorsInProse: z.number().int().min(0),
});
```

Add it to the `qualitySchema` union and add `export type ZiweiReportQualityConfigV2_4Beginner = z.infer<typeof qualityV2_4BeginnerSchema>;` to the `ZiweiReportQualityConfig` union. In `validateZiweiReportQualityConfig`, add `if ("bannedPhrases" in config) { vocabularyLists.bannedPhrases = config.bannedPhrases; vocabularyLists.bannedOpeners = config.bannedOpeners; }` so duplicates inside each list are rejected. Also reject a phrase that sits in both lists (`ZIWEI_REPORT_QUALITY_CONFIG_INVALID`). Load the file beside the others:

```ts
export const ziweiComprehensiveReportQualityV2_4Beginner = validateZiweiReportQualityConfig(
  JSON.parse(readFileSync(configPath("ziwei-comprehensive-report-quality.v2.4-beginner.json"), "utf8")),
) as ZiweiReportQualityConfigV2_4Beginner;
```

and add the matching `if (...) return ziweiComprehensiveReportQualityV2_4Beginner;` branch in `resolveZiweiReportQualityConfig`. In `resolveZiweiReportQualitySectionThreshold`, throw `ZIWEI_REPORT_QUALITY_SECTION_UNAVAILABLE` for `decadalTeasers` on every version except v2.4, the same way v1 throws for `birthTimeSensitivity`.

- [ ] **Step 5: Run and commit**

Run: `pnpm vitest run packages/config/ && pnpm --filter @lasoviet/config build`
Expected: PASS.

```bash
git add config/ziwei-comprehensive-report-quality.v2.4-beginner.json packages/config/src/ziwei-report-quality.ts packages/config/src/ziwei-report-quality.test.ts
git commit -m "feat(config): add quality v2.4 beginner-first with banned phrases and star density"
```

---

## Task 3: Five beginner-first gates (TDD)

Pure functions, no model calls, easy to test. They live in their own file so the existing quality module only gains a few call sites.

**Files:**
- Create: `packages/backend/src/reports/comprehensive-report-beginner-gates.ts`, `comprehensive-report-beginner-gates.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";

import {
  findBannedOpener,
  findBannedPhrase,
  findMachineSubheading,
  overviewArcProblem,
  starDensityProblem,
} from "./comprehensive-report-beginner-gates.js";

const STAR_LABELS = ["Tử Vi", "Thiên Phủ", "Liêm Trinh", "Âm Sát", "Bệnh Phù", "Long Đức", "Thất Sát"];
const syllables = (n: number) => Array.from({ length: n }, () => "chữ").join(" ");

describe("findBannedPhrase", () => {
  it("catches a founder-flagged phrase anywhere, regardless of case", () => {
    expect(findBannedPhrase("Nhưng tính cách ấy có Mặt Sau của nó.", ["mặt sau"])).toBe("mặt sau");
  });
  it("does not match inside a longer word", () => {
    expect(findBannedPhrase("mặt sautrăm", ["mặt sau"])).toBeNull();
  });
  it("passes natural Vietnamese", () => {
    expect(findBannedPhrase("Nhưng tính cách ấy có mặt trái của nó.", ["mặt sau"])).toBeNull();
  });
});

describe("findBannedOpener", () => {
  it("flags a label phrase at the start of the text", () => {
    expect(findBannedOpener("Chỗ phải giữ là tiền chung.", ["chỗ phải giữ"])).toBe("chỗ phải giữ");
  });
  it("flags a label phrase at the start of a later sentence or line", () => {
    expect(findBannedOpener("Câu đầu đủ ý. Chỗ phải giữ là tiền chung.", ["chỗ phải giữ"])).toBe("chỗ phải giữ");
    expect(findBannedOpener("Câu đầu đủ ý\nĐường thăng tiến rộng.", ["đường thăng tiến"])).toBe("đường thăng tiến");
  });
  it("allows the same words inside a sentence, as the approved texts do", () => {
    expect(findBannedOpener("Hóa Kỵ rơi vào cung Phúc Đức, và đây là chỗ phải giữ.", ["chỗ phải giữ"])).toBeNull();
  });
});

describe("findMachineSubheading", () => {
  it("flags a short label line sitting above a paragraph", () => {
    expect(findMachineSubheading("Chỗ dễ va chạm\nĐịa Kiếp và Tiểu Hao cho thấy chi tiêu chung dễ phát sinh.")).toBe("Chỗ dễ va chạm");
  });
  it("accepts flowing paragraphs separated by blank lines", () => {
    expect(findMachineSubheading("Câu một dài đủ ý.\n\nCâu hai cũng dài đủ ý.")).toBeNull();
  });
  it("accepts a short final sentence that ends with punctuation", () => {
    expect(findMachineSubheading("Đoạn dài.\nNên đi.")).toBeNull();
  });
});

describe("starDensityProblem", () => {
  it("counts a repeated star once", () => {
    const text = `Thiên Phủ ${syllables(78)} Thiên Phủ lặp lại không tính thêm.`;
    expect(starDensityProblem(text, STAR_LABELS, 1.5)).toBeNull();
  });
  it("flags three distinct stars in about 80 syllables at 1.5 per 80", () => {
    const text = `Thiên Phủ, Liêm Trinh và Âm Sát ${syllables(74)}.`;
    expect(starDensityProblem(text, STAR_LABELS, 1.5)).toMatch(/3 distinct star names/);
  });
  it("does not count Tử Vi when it names the discipline", () => {
    const text = `Trong Tử Vi, Thiên Phủ là sao giữ kho. Sách Tử Vi Đẩu Số gọi đó là ${syllables(66)}.`;
    expect(starDensityProblem(text, STAR_LABELS, 1)).toBeNull();
  });
});

describe("overviewArcProblem", () => {
  const para = (s: string) => `${s} ${syllables(20)}.`;
  it("requires the configured number of paragraphs", () => {
    expect(overviewArcProblem([para("Một"), para("Hai")].join("\n\n"), STAR_LABELS, 5)).toMatch(/5 paragraphs/);
  });
  it("rejects an overview that opens on a star name", () => {
    const text = [para("Thiên Phủ đóng ở Mệnh"), para("b"), para("c"), para("d"), para("e")].join("\n\n");
    expect(overviewArcProblem(text, STAR_LABELS, 5)).toMatch(/opens with a star name/);
  });
  it("accepts five paragraphs that open on the person", () => {
    const text = [para("Lá số của bạn mở đầu bằng"), para("b"), para("c"), para("d"), para("e")].join("\n\n");
    expect(overviewArcProblem(text, STAR_LABELS, 5)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/backend/src/reports/comprehensive-report-beginner-gates.test.ts`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement**

```ts
// Deterministic beginner-first gates for FD-106 wave 2.
// Spec: docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md §2b, §2c, §3.3, §5.1.

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWhole(text: string, term: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, "iu").test(text);
}

// "Tử Vi" is both a star and the name of the discipline. Only the star counts.
const DISCIPLINE_NAME = /Tử Vi Đẩu Số|(?:trong|môn|lá số|xem|học|sách|người học) Tử Vi/giu;

/** First phrase from the anywhere-banned list (spec §2b.2, §2c.3) found in the text, or null. */
export function findBannedPhrase(text: string, bannedPhrases: readonly string[]): string | null {
  const normalized = text.normalize("NFC");
  return bannedPhrases.find((phrase) => containsWhole(normalized, phrase.normalize("NFC"))) ?? null;
}

/** First label phrase (spec §2b.1) that opens the text, a line, or a sentence, or null. */
export function findBannedOpener(text: string, bannedOpeners: readonly string[]): string | null {
  const normalized = text.normalize("NFC");
  return bannedOpeners.find((opener) =>
    new RegExp(`(?:^|[\\n.!?…])\\s*${escape(opener.normalize("NFC"))}(?![\\p{L}\\p{N}])`, "iu").test(normalized),
  ) ?? null;
}

/**
 * A machine sub-heading is a short line (2 to 6 words, no sentence punctuation) that is
 * immediately followed by more text on the next line. Flowing prose never has one.
 */
export function findMachineSubheading(text: string): string | null {
  const lines = text.normalize("NFC").split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i]!.trim();
    const next = lines[i + 1]!.trim();
    if (!line || !next) continue;
    const words = line.split(/\s+/u).length;
    if (words >= 2 && words <= 6 && !/[.!?:;,…]$/u.test(line)) return line;
  }
  return null;
}

/** Distinct star names allowed: `per80` per 80 syllables, rounded up, minimum one. */
export function starDensityProblem(
  text: string,
  starLabels: readonly string[],
  per80: number,
): string | null {
  const normalized = text.normalize("NFC");
  const syllables = normalized.trim() === "" ? 0 : normalized.trim().split(/\s+/u).length;
  const counted = normalized.replace(DISCIPLINE_NAME, " ");
  const distinct = new Set(starLabels.filter((label) => containsWhole(counted, label))).size;
  const allowed = Math.max(1, Math.ceil((syllables / 80) * per80));
  return distinct > allowed
    ? `${distinct} distinct star names in ${syllables} syllables; at most ${allowed} allowed.`
    : null;
}

/** Overview must have the five-beat arc as paragraphs and must not open on a star name. */
export function overviewArcProblem(
  text: string,
  starLabels: readonly string[],
  minimumParagraphs: number,
): string | null {
  const paragraphs = text
    .normalize("NFC")
    .split(/\n\s*\n/u)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length < minimumParagraphs) {
    return `Overview needs ${minimumParagraphs} paragraphs; found ${paragraphs.length}.`;
  }
  const opening = paragraphs[0]!.toLocaleLowerCase("vi-VN");
  if (starLabels.some((label) => opening.startsWith(label.toLocaleLowerCase("vi-VN")))) {
    return "Overview opens with a star name; it must open with the person or the pattern.";
  }
  return null;
}
```

- [ ] **Step 4: Run and commit**

Run: `pnpm vitest run packages/backend/src/reports/comprehensive-report-beginner-gates.test.ts`
Expected: PASS (15 tests).

```bash
git add packages/backend/src/reports/comprehensive-report-beginner-gates.ts packages/backend/src/reports/comprehensive-report-beginner-gates.test.ts
git commit -m "feat(backend): add beginner-first quality gates for FD-106"
```

---

## Task 4: Wire the gates into the quality module for v2.4 (TDD)

Today the quality input for a narrative section is `${title} ${narrative}` on one line (`report-generation.service.ts:270-308`, `qualityInputs`). For v2.4 that hides the paragraph breaks from the arc check and puts the title in front of the first paragraph. So v2.4 passes the title separately.

**Files:**
- Modify: `packages/backend/src/reports/comprehensive-report-quality-v4.ts`
- Modify: `packages/backend/src/reports/report-generation.service.ts` (`qualityInputs`, lines 270-308)
- Test: `packages/backend/src/reports/comprehensive-report-quality-v4.test.ts`, new `comprehensive-report-quality-v4-reference.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `comprehensive-report-quality-v4.test.ts`, reusing its `buildFacts`, `facts`, `evidenceKeyFor`, `gate` and `expectFinding` helpers)

```ts
import {
  REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_4_BEGINNER,
} from "./identity-report-config.js";

const V42 = [REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER, REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_4_BEGINNER] as const;
const flowing = (n: number) => Array.from({ length: 5 }, (_, i) =>
  `${i === 0 ? "Lá số của bạn cho thấy" : "Đoạn tiếp theo kể"} ${Array.from({ length: n }, () => "nội dung").join(" ")} sao Tử Vi.`,
).join("\n\n");

describe("comprehensive V4 section quality, v2.4 beginner-first", () => {
  it("passes five flowing paragraphs with one star named and the rest in evidence refs", () => {
    expect(gate({ text: flowing(70) }, facts, ...V42)).toEqual({ ok: true, findings: [] });
  });

  it.each([
    ["banned phrase", `${flowing(70)} Nhưng nó có mặt sau.`, "BANNED_PHRASE"],
    ["banned opener", `${flowing(70)}\n\nChỗ dễ va chạm là tiền chung.`, "BANNED_PHRASE"],
    ["machine sub-heading", `Chỗ dễ va chạm\n${flowing(70)}`, "MACHINE_SUBHEADING"],
    ["star density", `${flowing(70)} Thiên Phủ, Liêm Trinh, Thất Sát, Thiên Cơ, Thái Âm, Cự Môn, Thiên Đồng, Thiên Lương, Vũ Khúc, Tham Lang, Phá Quân, Thái Dương, Thiên Tướng, Văn Xương, Văn Khúc, Tả Phù, Hữu Bật.`, "STAR_DENSITY"],
    ["too few overview paragraphs", flowing(70).split("\n\n").slice(0, 3).join(" "), "OVERVIEW_ARC"],
    ["overview opens on a star", `Tử Vi ${flowing(70)}`, "OVERVIEW_ARC"],
  ])("rejects %s", (_name, text, code) => {
    expectFinding(gate({ text }, facts, ...V42), code);
  });

  it("anchors non-palace sections through evidence refs, with one named in prose", () => {
    const noName = flowing(70).replaceAll("sao Tử Vi", "điều ấy");
    expectFinding(gate({ text: noName }, facts, ...V42), "EVIDENCE_ANCHORS");
    expect(gate({ text: flowing(70) }, facts, ...V42).ok).toBe(true);
  });

  it("anchors palace sections through the palace stars, with one named in prose", () => {
    const text = flowing(70).split("\n\n").join(" ");
    expect(gate({ key: "palace:ziwei.palace.life", kind: "palace", palaceId: "ziwei.palace.life", text }, facts, ...V42).ok).toBe(true);
    expectFinding(
      gate({ key: "palace:ziwei.palace.life", kind: "palace", palaceId: "ziwei.palace.life", text: text.replaceAll("sao Tử Vi", "điều ấy") }, facts, ...V42),
      "PALACE_ANCHORS",
    );
  });

  it("checks the title for banned wording", () => {
    expectFinding(gate({ text: flowing(70), title: "Chỗ đang mắc" }, facts, ...V42), "BANNED_PHRASE");
  });

  it("leaves the live v2.3 tuple unchanged", () => {
    const v23 = gate({ text: `${prose(610)} mặt sau` }, facts, REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY, REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY);
    expect(v23.ok).toBe(true);
  });
});
```

`flowing(70)` is about 740 syllables (five paragraphs of 140 plus the fixed words), above the 600 overview minimum; at 1.5 per 80 it may name 14 distinct stars, which is why the density case names 18. If you change `n`, print `countVietnameseSyllables(flowing(n))` once and recheck both numbers.

Create `comprehensive-report-quality-v4-reference.test.ts`. This is the most important test in the plan: the founder-approved texts must pass every new gate, otherwise the gate is wrong, not the text.

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { resolveZiweiReportQualityConfig } from "@lasoviet/config";

import {
  findBannedOpener,
  findBannedPhrase,
  findMachineSubheading,
  overviewArcProblem,
  starDensityProblem,
} from "./comprehensive-report-beginner-gates.js";
import { KNOWN_CANONICAL_IDENTIFIERS_VI } from "./comprehensive-report-validator-v4.js";

const root = fileURLToPath(new URL("../../../../prototype/revamp-2026-09/", import.meta.url));
const context: { window: { LSV?: any }; LSV?: any } = { window: {} };
context.LSV = context.window.LSV = {};
vm.createContext(context);
for (const file of ["doc-bao-cao-tuong-tac-data.js", "doc-bao-cao-tuong-tac-palaces.js"]) {
  vm.runInContext(readFileSync(root + file, "utf8"), context);
}
const LSV = context.LSV;
const config = resolveZiweiReportQualityConfig(
  "ziwei.comprehensive.report.v4.2-sectioned-beginner",
  "ziwei.comprehensive.quality.v2.4-beginner",
);
if (config.version !== "ziwei.comprehensive.quality.v2.4-beginner") throw new Error("wrong config");
const STAR_LABELS = Object.entries(KNOWN_CANONICAL_IDENTIFIERS_VI)
  .filter(([id]) => id.startsWith("ziwei.star."))
  .map(([, label]) => label.replace(/^sao\s+/u, ""));

const references: Array<[string, string]> = [
  ...LSV.CHAPTERS.filter((c: any) => Array.isArray(c.detail)).map((c: any) => [c.id, c.detail.join("\n\n")]),
  ...Object.entries(LSV.PALACE_READINGS).map(([branch, r]: [string, any]) => [`palace ${branch}`, r.detail.join("\n\n")]),
];

describe("founder-approved reference texts pass the v2.4 gates", () => {
  it.each(references)("%s", (id, text) => {
    expect(findBannedPhrase(text, config.bannedPhrases)).toBeNull();
    expect(findBannedOpener(text, config.bannedOpeners)).toBeNull();
    expect(findMachineSubheading(text)).toBeNull();
    expect(starDensityProblem(text, STAR_LABELS, config.maxDistinctStarNamesPer80Syllables)).toBeNull();
    if (id === "tong-quan") expect(overviewArcProblem(text, STAR_LABELS, config.overviewMinimumParagraphs)).toBeNull();
  });
});
```

Measured on 2026-09-28 with the Task 2 values, all 17 references pass. If one fails later, someone edited either the prototype or the config: fix whichever one drifted from what the founder approved.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/backend/src/reports/comprehensive-report-quality-v4.test.ts packages/backend/src/reports/comprehensive-report-quality-v4-reference.test.ts`
Expected: the v2.4 block FAILS (unknown finding codes, gates not called); the reference test PASSES already (it only uses Task 2 and 3 code). That is correct: it guards the calibration.

- [ ] **Step 3: Implement in `comprehensive-report-quality-v4.ts`**

1. Add four codes to `COMPREHENSIVE_REPORT_QUALITY_FINDING_CODES_V4` (line 22), after `"EVIDENCE_ANCHORS"`: `"BANNED_PHRASE"`, `"MACHINE_SUBHEADING"`, `"STAR_DENSITY"`, `"OVERVIEW_ARC"`. Check `packages/contracts` for a mirrored enum of finding codes (`grep -rn "EVIDENCE_ANCHORS" packages/contracts/src`) and add them there too.
2. Add optional `title?: string` to `ComprehensiveReportQualitySectionV4`.
3. Build the star label list once at module scope:
   ```ts
   const STAR_LABELS_VI = Object.entries(KNOWN_CANONICAL_IDENTIFIERS_VI)
     .filter(([id]) => id.startsWith("ziwei.star."))
     .map(([, label]) => label.replace(/^sao\s+/u, ""));
   ```
4. In `validateComprehensiveReportSectionQualityV4`, right after the `ENGLISH_BRIGHTNESS` check, add:
   ```ts
   const beginner = qualityVersion === REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_4_BEGINNER;
   if (beginner) {
     if (!("bannedPhrases" in config)) throw new Error("ZIWEI_REPORT_QUALITY_VERSION_MISMATCH");
     const title = normalizeComprehensiveReportModelProse(section.title ?? "");
     const banned = findBannedPhrase(`${title}\n${text}`, config.bannedPhrases)
       ?? findBannedOpener(`${title}\n${text}`, config.bannedOpeners);
     if (banned) add("BANNED_PHRASE", `Contains banned wording: ${banned}.`);
     const heading = findMachineSubheading(text);
     if (heading) add("MACHINE_SUBHEADING", `Paragraph has a machine sub-heading: ${heading}.`);
     const density = starDensityProblem(text, STAR_LABELS_VI, config.maxDistinctStarNamesPer80Syllables);
     if (density) add("STAR_DENSITY", density);
     if (section.kind === "overview") {
       const arc = overviewArcProblem(text, STAR_LABELS_VI, config.overviewMinimumParagraphs);
       if (arc) add("OVERVIEW_ARC", arc);
     }
   }
   ```
   The existing `qualityVersion !== V2_3` density branch must also skip v2.4 (v2.4 has no `properNames`): change the condition to `qualityVersion !== V2_3 && !beginner`.
5. Change the two anchor checks (lines 355-380) for v2.4 only:
   - **Palace:** count stars of the palace that appear in `section.evidenceKeys` (use `referencedEvidenceFactIds(section.evidenceKeys, facts)` intersected with the palace's star ids) plus stars named in prose. Pass when `inEvidence.size >= config.minimumPalaceStars` and at least `config.minimumNamedAnchorsInProse` of them are named in prose, or the existing true no-major-star case. Palace sections on v2.4 must therefore carry evidence keys for their stars; the writer (Task 7) is told so.
   - **Non-palace:** pass when `referencedEvidenceFactIds(...)` has at least `config.minimumEvidenceAnchors` facts and at least `config.minimumNamedAnchorsInProse` of them are named in prose.
   Keep the old behaviour for every other quality version, byte for byte.

- [ ] **Step 4: Split title and narrative in `qualityInputs`** (`report-generation.service.ts:270`)

Give `qualityInputs` a second parameter `qualityVersion: string` and pass it from `sectionQualityFindings`. For v2.4 only, for entries with `title` and `narrative`, return `{ ..., title: entry.title, text: entry.narrative }` instead of `text: \`${entry.title} ${entry.narrative}\``. For `decadalTeasers` items (Task 6), `text: entry.narrative` and no title. All other versions keep the current string.

- [ ] **Step 5: Run and commit**

Run: `pnpm vitest run packages/backend/src/reports/`
Expected: PASS, including every pre-existing v2.x test.

```bash
git add packages/backend/src/reports/comprehensive-report-quality-v4.ts packages/backend/src/reports/comprehensive-report-quality-v4.test.ts packages/backend/src/reports/comprehensive-report-quality-v4-reference.test.ts packages/backend/src/reports/report-generation.service.ts
git commit -m "feat(backend): enforce beginner-first gates and evidence-ref anchors on quality v2.4"
```

---

## Task 5: Voice block for the v4.2 prompt (TDD)

The gates stop the worst output; the prompt is what makes good output likely. This block is Vietnamese, because the model writes Vietnamese, and it quotes the approved texts as examples.

**Files:**
- Create: `packages/backend/src/reports/comprehensive-report-voice-v4-2.ts`, `comprehensive-report-voice-v4-2.test.ts`
- Modify: `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts` (`SECTION_SYSTEM_PROMPT`, line 482, and the two `system:` builders at lines ~670 and ~760)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { resolveZiweiReportQualityConfig } from "@lasoviet/config";

import { buildVoiceBlockV4_2 } from "./comprehensive-report-voice-v4-2.js";

const config = resolveZiweiReportQualityConfig(
  "ziwei.comprehensive.report.v4.2-sectioned-beginner",
  "ziwei.comprehensive.quality.v2.4-beginner",
);

describe("buildVoiceBlockV4_2", () => {
  const block = buildVoiceBlockV4_2(config as never);

  it("states the voice, the no-sub-heading rule and translate-on-arrival", () => {
    expect(block).toContain("giọng tâm tình của người có nghề");
    expect(block).toContain("Không đặt tiêu đề nhỏ");
    expect(block).toContain("giải nghĩa ngay");
  });

  it("lists every banned phrase and opener from the config, so prompt and gate never drift", () => {
    for (const phrase of [...config.bannedPhrases!, ...config.bannedOpeners!]) expect(block).toContain(phrase);
  });

  it("carries the overview arc without printing beat names as headings", () => {
    expect(block).toContain("năm đoạn");
    expect(block).toContain("không có tiêu đề");
  });

  it("includes one good and one bad example from the spec", () => {
    expect(block).toContain("Ngôi lo kho là Thiên Phủ");
    expect(block).toContain("củng cố xu hướng hành động chặt chẽ");
  });

  it("does not contradict the old anchor rule", () => {
    expect(block).not.toContain("ít nhất hai sao thực có trong cung");
  });
});
```

(`config.bannedPhrases!` needs a narrowing cast because the union type includes v1 to v2.3; use `if (config.version !== "...v2.4-beginner") throw` at the top of the test file if the compiler complains.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/backend/src/reports/comprehensive-report-voice-v4-2.test.ts`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement**

```ts
// Voice, vocabulary and arc rules for prompt v4.2 (FD-106c, d).
// Source of truth: docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md.
// Banned lists come from the quality config so the prompt and the gate cannot drift apart.
import type { ZiweiReportQualityConfigV2_4Beginner } from "@lasoviet/config";

export function buildVoiceBlockV4_2(config: ZiweiReportQualityConfigV2_4Beginner): string {
  return `GIỌNG VĂN (bắt buộc cho mọi phần):
Viết bằng giọng tâm tình của người có nghề đang ngồi nói chuyện với người xem lá số. Tiếng Việt tự nhiên, câu có chủ ngữ là người, có việc người ấy làm. Nói với người đọc ("bạn"), không nói về người đọc. Được phép dặn dò, được phép nói rõ một sao KHÔNG có nghĩa là gì.
Người đọc chưa từng học Tử Vi. Mỗi đoạn phải hiểu được mà không cần biết trước tên sao nào.

Văn xuôi liền mạch. Không đặt tiêu đề nhỏ trong phần luận giải, không mở câu bằng nhãn. Không dùng các cụm sau làm tiêu đề hay làm chữ mở câu: ${config.bannedOpeners.join(" · ")}.
Không dùng các cụm sau ở bất kỳ đâu: ${config.bannedPhrases.join(" · ")}.
Không ghép danh từ trừu tượng thay cho câu. Nếu một câu có ba danh từ trừu tượng mà không ai làm gì, viết lại thành việc một người làm.
Từ Hán Việt chỉ dùng khi người Việt bình thường vẫn nói hằng ngày. Thuật ngữ Tử Vi (tên sao, tên cung, Hóa Lộc, đại vận) được giữ nhưng phải giải nghĩa.

TÊN SAO:
Lần đầu một sao xuất hiện trong phần, cùng câu đó hoặc câu ngay sau phải giải nghĩa ngay bằng lời đời thường. Không bao giờ để tên sao trơ trọi.
Nói nghĩa trước, cơ chế sau: điều người đọc nhận ra trong đời mình đi trước, căn cứ trên lá số theo sau.
Tối đa khoảng ${config.maxDistinctStarNamesPer80Syllables} tên sao khác nhau cho mỗi 80 âm tiết. Các sao còn lại vẫn là căn cứ: đưa vào evidenceKeys, không cần nêu tên trong bài. Mỗi phần nêu tên ít nhất ${config.minimumNamedAnchorsInProse} sao có trong evidenceKeys.
Độ sáng viết bằng lời ("ở vị trí sáng nhất"), không viết nhãn ("ở trạng thái Miếu").
Ví dụ sai: "Cung Mệnh có Liêm Trinh ở trạng thái Bình và Thiên Phủ ở trạng thái Miếu, củng cố xu hướng hành động chặt chẽ."
Ví dụ đúng: "Ngôi lo kho là Thiên Phủ, và nó ở vị trí sáng nhất trong lá số bạn. Nó khiến bạn có phản xạ tích luỹ, dự phòng, và rất không thích cảm giác tay trắng."

MẠCH KỂ:
Phần tổng quan (overview) gồm đúng năm đoạn văn xuôi, không có tiêu đề, cách nhau một dòng trống: (1) con người bạn nhìn từ xa, mở bằng con người hoặc cấu trúc nổi bật đã dịch ra lời thường, không mở bằng tên sao; (2) cách bạn làm việc và quyết định, có một cảnh đời thường cụ thể; (3) cái giá của chính nét tính cách ở đoạn một, viết như một phần của con người chứ không phải danh sách lỗi; (4) con người thứ hai của bạn, tức độ vênh giữa Mệnh và Thân hoặc một chế độ khác mà lá số cho thấy; (5) kiểu sống nào hợp với bạn, kết bằng một nhận định, không tóm tắt lại.
Phần cung và phần chủ đề: vùng đời này trông thế nào với bạn, chỗ nào khó, điều gì thật sự giúp. Viết thành các đoạn liền mạch, không tiêu đề.
decadalTeasers: mỗi chặng hai đến ba câu. Nói chặng đi qua cung nào (giải nghĩa cung đó bằng lời thường), mười năm ấy điều gì nổi lên, rồi dừng. Đây là lời mở, không phải bài luận.

MẪU VĂN ĐÃ ĐƯỢC DUYỆT (chỉ học giọng, không chép nội dung, không dùng facts trong mẫu):
${FEW_SHOT_V4_2}`;
}

// Verbatim from prototype/revamp-2026-09/doc-bao-cao-tuong-tac-palaces.js, "Thìn" detail[0..1]
// (177 syllables). Do not add more: longer few-shots make the model copy content.
const FEW_SHOT_V4_2 = `Nhìn vào cung Mệnh, điều thấy ngay là Thiên Phủ đóng ở vị trí sáng nhất. Thiên Phủ vốn là sao trông coi kho tàng. Người có Thiên Phủ sáng ở Mệnh thường mang sẵn một phản xạ: trước khi tiêu thì đã nghĩ đến phần còn lại, trước khi nhận việc thì đã nghĩ đến lúc phải trả. Đi cùng là Liêm Trinh, sao của phép tắc. Hai sao ghép lại thành một kiểu người mà thời nào cũng cần: nói được làm được, giữ lời, và không để sổ sách của mình lộn xộn.

Cho nên người quanh bạn có một thói quen mà có lẽ bạn chưa để ý: họ giao việc rồi thôi, không hỏi lại. Vì họ biết bạn sẽ làm, và làm xong sẽ báo. Cái uy ấy không đến từ việc bạn nói to hay quyết liệt. Nó đến từ chỗ bạn chưa bao giờ hứa suông. Đây là vốn liếng lớn nhất của lá số này, và nó tích dần theo năm tháng chứ không có sẵn từ đầu.`;
```

Add one more assertion to the Step 1 test: `expect(block).toContain("Thiên Phủ vốn là sao trông coi kho tàng")`.

- [ ] **Step 4: Use the block for v4.2 in the writer**

In `comprehensive-report-section-writer-v4.ts`:

1. Split `SECTION_SYSTEM_PROMPT` (line 482) into the shared lines and the anchor line `Phần không phải cung phải dùng ít nhất hai fact khác nhau có evidence. Phần cung phải nêu ít nhất hai sao thực có trong cung...`. Keep the old full string as `SECTION_SYSTEM_PROMPT` for every existing prompt version, unchanged.
2. Add:
   ```ts
   function sectionSystemPrompt(promptVersion: string): string {
     if (promptVersion !== REPORT_PROMPT_VERSION_V4_2_BEGINNER) return SECTION_SYSTEM_PROMPT;
     const config = ziweiComprehensiveReportQualityV2_4Beginner;
     return `${SECTION_SYSTEM_PROMPT_SHARED}
   Mỗi phần phải có ít nhất ${config.minimumEvidenceAnchors} fact khác nhau trong evidenceKeys (phần cung: ít nhất ${config.minimumPalaceStars} sao thực có trong cung), và nêu tên trong bài ít nhất ${config.minimumNamedAnchorsInProse} trong số đó; hoặc nói đúng trạng thái không có chính tinh khi facts thể hiện điều đó.
   ${buildVoiceBlockV4_2(config)}`;
   }
   ```
3. Replace every `${SECTION_SYSTEM_PROMPT}` inside `writeComprehensiveReportSectionV4` and `writeComprehensiveReportSectionGroupV4` with `${sectionSystemPrompt(input.promptVersion)}`.
4. In `acceptanceContract` (line 491), for v4.2: read thresholds from v2.4 (not the hard-coded v2.3 at line 500), set `contentBehavior.nonPalaceRequiresTwoDistinctEvidenceBackedFacts` and `palaceRequiresTwoActualStarsOrAccurateNoMajorStarState` to describe the evidence-ref rule, and add `beginnerFirst: { bannedPhrases, bannedOpeners, maxDistinctStarNamesPer80Syllables, noSubheadings: true, translateStarOnArrival: true }`.

Add a writer test (in the existing `comprehensive-report-section-writer-v4.test.ts`, which already fakes `provider.generateStructured`) asserting that for prompt v4.2 the captured `system` contains `giọng tâm tình` and not `ít nhất hai sao thực có trong cung`, and that for prompt v4.1.2 the captured `system` is unchanged (snapshot it before your change and compare).

- [ ] **Step 5: Run and commit**

Run: `pnpm vitest run packages/backend/src/reports/`
Expected: PASS.

```bash
git add packages/backend/src/reports/comprehensive-report-voice-v4-2.ts packages/backend/src/reports/comprehensive-report-voice-v4-2.test.ts packages/backend/src/reports/comprehensive-report-section-writer-v4.ts packages/backend/src/reports/comprehensive-report-section-writer-v4.test.ts
git commit -m "feat(backend): add the v4.2 beginner-first voice block to the section writer"
```

---

## Task 6: `decadalTeasers` in the contracts (TDD)

**Which cycles get a teaser:** the eight cycles of ordinals 0 to 7 (ages up to the mid-80s), minus the current one, so seven teasers. The current cycle keeps its full `currentDecadal` reading. When the timing is not active, or `deriveDecadalCycles` returns null (ordinal 0 or 6, or inconsistent data), there are no teasers and the array is empty. The reader already hides the list when it is empty.

**Files:**
- Modify: `packages/contracts/src/ziwei-comprehensive-report-v4-1.ts`, `packages/contracts/src/identity-report-v1.ts`
- Test: the contracts test files beside them (`grep -ln "ZiweiComprehensiveReportContentV3Schema" packages/contracts/src/*.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
describe("decadal teasers (FD-106b)", () => {
  const teaser = { ordinal: 1, palaceId: "ziwei.palace.parents", ageRange: [15, 24], yearRange: [2007, 2016], narrative: "Chặng này đi qua cung Phụ Mẫu.", evidenceKeys: ["e1"] };

  it("stored V3 accepts content without teasers (every report made before v4.2)", () => {
    expect(ZiweiComprehensiveReportContentV3Schema.safeParse(storedV3Fixture).success).toBe(true);
  });
  it("stored V3 accepts up to 7 teasers", () => {
    expect(ZiweiComprehensiveReportContentV3Schema.safeParse({ ...storedV3Fixture, decadalTeasers: [teaser] }).success).toBe(true);
    expect(ZiweiComprehensiveReportContentV3Schema.safeParse({ ...storedV3Fixture, decadalTeasers: Array(8).fill(teaser) }).success).toBe(false);
  });
  it("Tier 2 projection carries teasers without evidence keys", () => {
    const view = projectComprehensiveReportPublicContentV3({ ...storedV3Fixture, decadalTeasers: [teaser] }, null);
    expect("decadalTeasers" in view && view.decadalTeasers).toEqual([
      { ordinal: 1, palaceId: "ziwei.palace.parents", ageRange: [15, 24], yearRange: [2007, 2016], narrative: "Chặng này đi qua cung Phụ Mẫu." },
    ]);
  });
  it("Tier 1 projection never carries teasers", () => {
    const view = projectComprehensiveReportPublicContentV3({ ...storedV3Fixture, decadalTeasers: [teaser] }, ["overview"] as never);
    expect("decadalTeasers" in view).toBe(false);
  });
});
```

Use the V3 fixture the existing contract tests already build (search for `birthTimeSensitivity:` in the test file) as `storedV3Fixture`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/contracts/`
Expected: FAIL on the teaser cases.

- [ ] **Step 3: Implement**

In `ziwei-comprehensive-report-v4-1.ts`:

```ts
export const ZiweiComprehensiveReportDecadalTeaserV1Schema = z.object({
  ordinal: z.number().int().min(0).max(11),
  palaceId: z.enum(ZIWEI_PALACE_IDS),
  ageRange: z.tuple([z.number().int(), z.number().int()]),
  yearRange: z.tuple([z.number().int(), z.number().int()]),
  narrative: z.string().trim().min(1).max(2_000),
  evidenceKeys: z.array(z.string().trim().min(1)).min(1),
}).strict();

export const ZiweiComprehensiveReportContentV3Schema =
  ZiweiComprehensiveReportContentV2Schema.extend({
    birthTimeSensitivity: ZiweiComprehensiveReportBirthTimeSensitivityV2Schema,
    decadalTeasers: z.array(ZiweiComprehensiveReportDecadalTeaserV1Schema).max(7).optional(),
  }).strict();
```

In `identity-report-v1.ts`: add `ComprehensiveReportDecadalTeaserPublicSchema` (same object without `evidenceKeys`), add `decadalTeasers: z.array(ComprehensiveReportDecadalTeaserPublicSchema).max(7).optional()` to `ComprehensiveReportTier2PublicContentV3Schema`, and in `projectComprehensiveReportPublicContentV3`'s Tier 2 branch add `...(stored.decadalTeasers?.length ? { decadalTeasers: stored.decadalTeasers.map(({ evidenceKeys: _e, ...rest }) => rest) } : {})`. Teasers are Tier 2 because they belong to `currentDecadal`, which is Tier 2.

Optional is deliberate: stored reports from v4.1.2 have no teasers and must still parse. No content version bump.

- [ ] **Step 4: Run, build and commit**

Run: `pnpm vitest run packages/contracts/ && pnpm --filter @lasoviet/contracts build`
Expected: PASS.

```bash
git add packages/contracts/src/
git commit -m "feat(contracts): add optional decadal teasers to comprehensive content V3"
```

---

## Task 7: `decadalTeasers` section key, cycles helper and writer (TDD)

**Files:**
- Create: `packages/backend/src/reports/comprehensive-report-decadal-teasers.ts`, `.test.ts`
- Modify: `packages/backend/src/reports/comprehensive-report-section-v4.ts`, `comprehensive-report-section-writer-v4.ts`

- [ ] **Step 1: Write the failing test for the cycles helper**

```ts
import { describe, expect, it } from "vitest";

import { teaserCyclesFor } from "./comprehensive-report-decadal-teasers.js";

// Reuse the facts builder from comprehensive-report-quality-v4.test.ts: copy `buildFacts`
// into a shared test fixture file `comprehensive-report-test-facts.ts` and import it from both.
import { buildFacts } from "./comprehensive-report-test-facts.js";

describe("teaserCyclesFor", () => {
  it("returns the seven cycles of ordinals 0-7 other than the current one", () => {
    const cycles = teaserCyclesFor(buildFacts());
    expect(cycles.map((c) => c.ordinal)).toEqual([0, 1, 3, 4, 5, 6, 7]);
    expect(cycles.every((c) => c.palaceId.startsWith("ziwei.palace."))).toBe(true);
  });

  it("returns no cycles when timing is not active", () => {
    const facts = buildFacts();
    const notStarted = { ...facts, timing: { ...facts.timing, decadal: { state: "not_started", firstCycleStartAge: 5, firstCycleStartYear: 2010 } } };
    expect(teaserCyclesFor(notStarted as never)).toEqual([]);
  });
});
```

The fixture in `comprehensive-report-quality-v4.test.ts` has the current decadal at ageRange `[22, 31]`, palace fortune, branch rabbit, life palace at tiger. Check the expected ordinals by hand against `deriveDecadalCycles` before trusting the `[0, 1, 3, ...]` line; if the fixture yields `null` (direction ambiguous), change the fixture's decadal branch so it is consistent, and add a third test for the null case.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/backend/src/reports/comprehensive-report-decadal-teasers.test.ts`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement the helper**

```ts
// Which decadal cycles get a short teaser (FD-106b): ordinals 0-7 minus the current one.
import type { ZiweiPalaceId } from "@lasoviet/contracts";

import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import { deriveDecadalCycles } from "./report-chart-snapshot.js";

export type TeaserCycle = {
  ordinal: number;
  palaceId: ZiweiPalaceId;
  ageRange: [number, number];
  yearRange: [number, number];
};

const TEASER_ORDINALS = 8;

export function teaserCyclesFor(facts: ComprehensiveZiweiFactsV4): TeaserCycle[] {
  const decadal = facts.timing.decadal;
  if (decadal.state !== "active") return [];
  const life = facts.natal.palaces.find((p) => p.isLifePalace);
  if (!life) return [];
  const cycles = deriveDecadalCycles(life.earthlyBranchId, decadal);
  if (!cycles) return [];
  const palaceByBranch = new Map(facts.natal.palaces.map((p) => [p.earthlyBranchId, p.palaceId]));
  const current = cycles.find((c) => c.ageRange[0] === decadal.ageRange[0])?.ordinal;
  return cycles
    .filter((c) => c.ordinal < TEASER_ORDINALS && c.ordinal !== current)
    .flatMap((c) => {
      const palaceId = palaceByBranch.get(c.branchId);
      return palaceId ? [{ ordinal: c.ordinal, palaceId, ageRange: c.ageRange, yearRange: c.yearRange }] : [];
    });
}
```

- [ ] **Step 4: Section key and parsing** in `comprehensive-report-section-v4.ts`

```ts
const decadalTeasersSchema = z.array(z.object({
  ordinal: z.number().int().min(0).max(11),
  narrative: z.string().trim().min(1).max(2_000),
  evidenceKeys: z.array(z.string().trim().min(1)).min(1),
}).strict()).max(7);

export const COMPREHENSIVE_REPORT_SECTION_KEYS_V4_2 = [
  ...COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.slice(0, -1),
  "decadalTeasers",
  "practicalDirection",
] as const;
```

Add `"decadalTeasers"` to `ComprehensiveReportSectionKey` (as `ComprehensiveReportSectionKeyV4_2 = ComprehensiveReportSectionKeyV4_1 | "decadalTeasers"` and point `ComprehensiveReportSectionKey` at it), add `{ key: "decadalTeasers"; value: z.infer<typeof decadalTeasersSchema> }` to `ComprehensiveReportAcceptedSection`, add a branch in `parseComprehensiveReportAcceptedSection`, and in `resolveComprehensiveReportSectionKeys` return `COMPREHENSIVE_REPORT_SECTION_KEYS_V4_2` for `REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER`. The model only writes `ordinal`, `narrative`, `evidenceKeys`; palace and ranges come from `teaserCyclesFor`, never from the model (Task 8).

Add tests beside the existing section parser tests: v4.2 accepts `decadalTeasers` with 0 and 7 items and rejects 8; v4.1.1 rejects the key.

- [ ] **Step 5: Writer scope, schema and length** in `comprehensive-report-section-writer-v4.ts`

1. `scopeFor`: add
   ```ts
   case "decadalTeasers": {
     const cycles = teaserCyclesFor(facts);
     return { kind: "decadalTeasers", palaceIds: [...new Set(cycles.map((c) => c.palaceId))], packIds: [], includePatterns: false, includeTransformations: true, includeAllNatalConfigurations: false, includeDecadal: true, includeAnnual: false };
   }
   ```
   and in `scopedPayload`, when the key is `decadalTeasers`, add `teaserCycles: teaserCyclesFor(input.facts)` to the payload so the model sees exactly which ordinals, palaces and ages to write about.
2. `schemaFor`: `else if (key === "decadalTeasers") value = decadalTeasersSchema;`
3. `appliesLengthPerItem` and the `sectionLength.appliesPerItem` expression in `acceptanceContract`: include `decadalTeasers`.
4. `acceptanceContract`: add `decadalTeasers: { oneItemPerTeaserCycleInOrder: true, ordinalsMustMatchTeaserCycles: true }` when the key is `decadalTeasers`. If `teaserCycles` is empty, the instruction says: return `[]`.
5. Section kind: `"decadalTeasers"` must be a valid kind for `resolveZiweiReportQualitySectionThreshold` (Task 2 added it) and for `qualityInputs` in `report-generation.service.ts` (Task 4 Step 4).
6. Where the writer picks the quality version for thresholds (`maxOutputTokens`, line ~675, and line ~500 in `acceptanceContract`), add the v4.2 → v2.4 branch.

Writer tests (existing file): for v4.2 the `decadalTeasers` payload contains `teaserCycles` with seven entries for the standard fixture; the schema rejects an item with an unknown field.

- [ ] **Step 6: Run and commit**

Run: `pnpm vitest run packages/backend/src/reports/`
Expected: PASS.

```bash
git add packages/backend/src/reports/
git commit -m "feat(backend): add the decadalTeasers section for the v4.2 tuple"
```

---

## Task 8: Assemble teasers with frozen cycle data (TDD)

**Files:**
- Modify: `packages/backend/src/reports/comprehensive-report-assembler-v4.ts` (`assembleComprehensiveReportV4_1`, line 182)
- Test: `packages/backend/src/reports/comprehensive-report-assembler-v4.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("v4.2 attaches teasers with palace and ranges taken from the derived cycles", () => {
  const cycles = teaserCyclesFor(facts);
  const sections = [...v4_1Sections, {
    key: "decadalTeasers",
    value: cycles.map((c) => ({ ordinal: c.ordinal, narrative: `Chặng ${c.ordinal} đi qua một cung.`, evidenceKeys: [anyEvidenceKey] })),
  }];
  const report = assembleComprehensiveReportV4_1(sections, facts, REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER);
  expect(report.decadalTeasers).toEqual(cycles.map((c) => expect.objectContaining({
    ordinal: c.ordinal, palaceId: c.palaceId, ageRange: c.ageRange, yearRange: c.yearRange,
  })));
});

it("v4.2 rejects teasers whose ordinals do not match the derived cycles", () => {
  const sections = [...v4_1Sections, { key: "decadalTeasers", value: [{ ordinal: 11, narrative: "x", evidenceKeys: [anyEvidenceKey] }] }];
  expect(() => assembleComprehensiveReportV4_1(sections, facts, REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER)).toThrow();
});

it("v4.1.1 output has no decadalTeasers key", () => {
  expect("decadalTeasers" in assembleComprehensiveReportV4_1(v4_1Sections, facts, REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY)).toBe(false);
});
```

`v4_1Sections` and `anyEvidenceKey`: reuse whatever the existing assembler test uses to build a full set of accepted sections.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/backend/src/reports/comprehensive-report-assembler-v4.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Widen the `reportConfigVersion` parameter type to include `REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER`. Filter `decadalTeasers` out of the list passed to `assembleComprehensiveReportV4` the same way `birthTimeSensitivity` is filtered. Then:

```ts
const teaserSection = sections.find((s) => s.key === "decadalTeasers");
let decadalTeasers: ZiweiComprehensiveReportContentV3["decadalTeasers"];
if (teaserSection && teaserSection.key === "decadalTeasers") {
  const cycles = teaserCyclesFor(facts);
  const items = teaserSection.value;
  if (items.length !== cycles.length || items.some((item, i) => item.ordinal !== cycles[i]!.ordinal)) fail();
  decadalTeasers = items.map((item, i) => ({
    ...cycles[i]!,
    narrative: normalizeComprehensiveReportModelProse(item.narrative),
    evidenceKeys: [...item.evidenceKeys],
  }));
}
const report = {
  ...base,
  birthTimeSensitivity: { /* unchanged */ },
  ...(decadalTeasers && decadalTeasers.length > 0 ? { decadalTeasers } : {}),
};
```

- [ ] **Step 4: Run and commit**

Run: `pnpm vitest run packages/backend/src/reports/`
Expected: PASS.

```bash
git add packages/backend/src/reports/comprehensive-report-assembler-v4.ts packages/backend/src/reports/comprehensive-report-assembler-v4.test.ts
git commit -m "feat(backend): assemble decadal teasers from derived cycles"
```

---

## Task 9: Version plumbing (TDD)

The live tuple is checked by exact equality in about eight places. Each needs the v4.2 tuple added beside it, not instead of it. Find them all:

```bash
grep -rn "REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY\|REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY" packages apps --include=*.ts | grep -v "\.test\.ts" | grep -v /dist/
```

**Files (expected hits):**
- `packages/backend/src/reports/identity-report-config.ts` (selection type near line 182, `v4_1_2SensitivityReportVersions` near 293, and the chooser at line ~203)
- `packages/backend/src/reports/identity-report-version-family.ts` (line 58-64)
- `packages/backend/src/reports/report-query.service.ts` (tuple list, lines 60-80)
- `packages/backend/src/reports/report-generation.service.ts` (`groupedActiveTuple`, line 468; the v4_1_2 selection at 259; line 1041)
- `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts` (`isV4_1_2` at 647, `isActiveGroupedTuple` at 722, `isKeyConfigurationContractPrompt` at 239, `acceptanceContract` at 495, `keyConfigurationRequirements` at 226)
- `packages/backend/src/reports/comprehensive-report-critic-v4.ts` (`allowedSectionKeys`, line 190)
- `packages/backend/src/reports/report.service.ts` (line 617)
- `apps/api/src/operations/fd082-v41-gate.ts` (lines 4-7, 143-170)

- [ ] **Step 1: Write the failing tests**

```ts
// identity-report-config.test.ts
it("exposes the v4.2 beginner selection", () => {
  expect(v4_2BeginnerReportVersions()).toMatchObject({
    family: "v4_1",
    promptVersion: "ziwei.comprehensive.prompt.v4.2-beginner",
    reportConfigVersion: "ziwei.comprehensive.report.v4.2-sectioned-beginner",
    qualityVersion: "ziwei.comprehensive.quality.v2.4-beginner",
    contentVersion: REPORT_CONTENT_VERSION_COMPREHENSIVE_V3,
  });
});

// identity-report-version-family.test.ts
it("treats the v4.2 prompt as family v4_1", () => {
  expect(resolveReportVersionFamily({ promptVersion: "ziwei.comprehensive.prompt.v4.2-beginner", knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V4 } as never)).toBe("v4_1");
});

// fd082-v41-gate.test.ts
it("passes evidence only for the tuple it was asked to check", () => {
  expect(passesFd082Evidence(evidenceFor(V4_2_TUPLE), V4_2_TUPLE)).toBe(true);
  expect(passesFd082Evidence(evidenceFor(V4_2_TUPLE), V4_1_2_TUPLE)).toBe(false);
  expect(passesFd082Evidence(evidenceFor(V4_1_2_TUPLE))).toBe(true); // default stays v4.1.2
});
```

Use each file's existing function names; `resolveReportVersionFamily` is a placeholder name for whatever `identity-report-version-family.ts` exports at line ~55. `evidenceFor` builds the fixture the existing fd082 tests already use, with the tuple swapped.

Also a generation-service test: with the v4.2 selection, the grouped path runs (not the sequential one), `decadalTeasers` is in G3, and the G3 call uses a 20,000 token cap.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run packages/backend/src/reports/ apps/api/src/operations/`
Expected: FAIL on the new cases only.

- [ ] **Step 3: Implement**

1. `identity-report-config.ts`: add `ReportVersionSelectionV4_2Beginner` and `v4_2BeginnerReportVersions()` (copy of `v4_1_2SensitivityReportVersions` with the three new constants; same knowledge, content, template, render and timing versions). **Do not change what new orders use yet.** The chooser at line ~203 keeps returning v4.1.2 unless the environment flag `REPORT_TUPLE=v4.2-beginner` is set; that flag is how the FD-082 run in Task 11 generates on v4.2. Read the flag where the other report env settings are read (`grep -rn "process.env" packages/backend/src/reports | head`), not deep inside the function.
2. Version family and report query: add the v4.2 prompt and the v4.2 prompt/config pair to the lists.
3. Generation service: `groupedActiveTuple` true for either tuple; G3 keys for v4.2 are `["strengthsAndTensions", "currentDecadal", "decadalTeasers", "annualSnapshot", "birthTimeSensitivity", "practicalDirection"]`; line 1041 same. Pass `selection.qualityVersion` into `qualityInputs` (Task 4).
4. Writer: accept `isV4_2 = promptVersion === V4_2 && reportConfigVersion === V4_2_SECTIONED`; `isActiveGroupedTuple` true for it; `isKeyConfigurationContractPrompt` true for it; `acceptanceContract` runs for it. Group caps (lines 95-97): add a v4.2 table `{ G1: 24_000, G2: 30_000, G3: 20_000 }` and pick it by prompt version. The extra 6,000 on G3 covers seven teasers at about 200 syllables each plus JSON overhead.
5. Critic: `allowedSectionKeys` returns `COMPREHENSIVE_REPORT_SECTION_KEYS_V4_2` for the v4.2 config. The `SectionedWarningSchema` at line 55 uses the old key enum; switch it to the resolved keys.
6. FD-082 gate: `passesFd082Evidence(evidence, tuple = V4_1_2_TUPLE)` where `tuple` is `{ promptVersion, reportConfigVersion, qualityVersion }`; replace the six hard-coded comparisons (lines 148-170) with `tuple.*`. Add a CLI flag or env (`FD082_TUPLE=v4.2-beginner`) wherever the gate script reads its options. `MAX_RUNS` stays 20.

- [ ] **Step 4: Run everything and commit**

Run: `pnpm --filter "{packages/**}" -r --if-present run build && pnpm -r --if-present run typecheck && pnpm test`
Expected: PASS.

```bash
git add packages/backend/src apps/api/src/operations
git commit -m "feat(backend): plumb the v4.2 beginner tuple beside v4.1.2 behind REPORT_TUPLE"
```

---

## Task 10: Reader shows the teasers (TDD)

**Files:**
- Modify: `apps/web/src/features/reports/comprehensive-report-reader.tsx` (the `ReportDecadalTimeline` call at line ~903)
- Modify: `apps/web/src/features/reports/report-chart-visuals.tsx` (`cycles.slice(0, 9)` at line ~416)
- Test: `apps/web/src/features/reports/comprehensive-report-reader.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("lists a teaser for each past and future cycle, and links the current one to its full reading", async () => {
  const content = { ...tier2V3Content, decadalTeasers: [
    { ordinal: 0, palaceId: "ziwei.palace.life", ageRange: [5, 14], yearRange: [1997, 2006], narrative: "Chặng đầu đời đi qua cung Mệnh." },
    { ordinal: 3, palaceId: "ziwei.palace.children", ageRange: [35, 44], yearRange: [2027, 2036], narrative: "Chặng sau đi qua cung Tử Tức." },
  ] };
  render(<ComprehensiveReportReader {...readerProps} content={content} />);
  expect(screen.getByText("Chặng đầu đời đi qua cung Mệnh.")).toBeInTheDocument();
  expect(screen.getByText("Chặng sau đi qua cung Tử Tức.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /đọc trọn chặng này/i }));
  expect(document.getElementById("section-current-decadal")).toHaveFocus();
});

it("shows no teaser list for a report made before v4.2", () => {
  render(<ComprehensiveReportReader {...readerProps} content={tier2V3Content} />);
  expect(document.querySelector(".report-cycle-list")).toBeNull();
});
```

Use the fixture names the existing reader test already has; check the exact button label key `reader.timeline_read_full` in `apps/web/messages/vi/reports.json`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @lasoviet/web test -- comprehensive-report-reader`
Expected: FAIL (teasers are never passed).

- [ ] **Step 3: Implement**

```tsx
const teasers = useMemo(() => {
  const list = "decadalTeasers" in v4_1Content ? v4_1Content.decadalTeasers : undefined;
  if (!list?.length) return undefined;
  const map = new Map(list.map((t) => [t.ordinal, t.narrative]));
  const current = chartSnapshot?.decadal.currentOrdinal;
  if (current != null && v4_1Content.currentDecadal.state === "active") {
    map.set(current, firstSentences(v4_1Content.currentDecadal.narrative, 2));
  }
  return map;
}, [v4_1Content, chartSnapshot]);
```

`firstSentences(text, n)` is a small local helper that returns the first `n` sentences of the first paragraph. Then pass `teasers={teasers}` and `onOpenCurrent={() => focusSection("section-current-decadal")}` into `ReportDecadalTimeline`, using the same focus/scroll helper the table of contents uses.

In `report-chart-visuals.tsx`, change `cycles.slice(0, 9)` to `cycles.slice(0, 8)` so the strip and the teaser list show the same eight cycles.

No i18n change: the labels were added in PR #214. Run `pnpm i18n:check` anyway.

- [ ] **Step 4: Run and commit**

Run: `pnpm i18n:check && pnpm --filter @lasoviet/web test && pnpm --filter @lasoviet/web typecheck`
Expected: PASS.

```bash
git add apps/web/src/features/reports/
git commit -m "feat(web): show decadal teasers in the report reader"
```

---

## Task 11: Critic check for translate-on-arrival

Translate-on-arrival ("the star is explained in the same or the next sentence") cannot be checked by a regex. The sectioned critic (`comprehensive-report-critic-v4.ts:173`) already produces advisory warnings; give it this job for v4.2.

**Files:** Modify `packages/backend/src/reports/comprehensive-report-critic-v4.ts`; test in `comprehensive-report-critic-v4.test.ts`.

- [ ] **Step 1: Failing test:** for the v4.2 config, the captured `system` prompt of the critic contains `giải nghĩa ngay` and the warning schema accepts category `"beginner"`; for v4.1.1 neither appears.
- [ ] **Step 2: Implement:** add `"beginner"` to `SectionedWarningCategorySchema`; when the config is v4.2, append to the critic system prompt: `Với mỗi phần, kiểm tra: (1) tên sao nào xuất hiện lần đầu mà câu đó và câu sau không giải nghĩa bằng lời đời thường; (2) câu đọc như dịch từ tiếng Anh hoặc ghép danh từ trừu tượng; (3) từ Hán Việt ít người dùng hằng ngày. Mỗi lỗi là một warning category "beginner", note trích nguyên cụm lỗi.` Warnings stay advisory; they do not block a report. They are what the founder reads alongside the five samples in Task 12.
- [ ] **Step 3: Run** `pnpm vitest run packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`, expect PASS, **commit** `feat(backend): critic flags untranslated star names on v4.2`.

---

## Task 12: Release gate and switch-over

This task is operations, not code. Do it on production infrastructure with the real model, as for the v4.1.2 gate.

- [ ] **Step 1: Open the PR** from `feat/fd106-wave2-beginner-writing` to `master`. PR body: link this plan and the spec; state that new orders still use v4.1.2 until Step 4. Ask for a Terra review (brief below). Merge when green; deploy.
- [ ] **Step 2: Run the FD-082 gate on v4.2.** With `REPORT_TUPLE=v4.2-beginner` on the gate runner only (not on the live API), run the gate with `FD082_TUPLE=v4.2-beginner`. Pass: 20 consecutive generations with every section passing every gate. If a run fails, read the findings, fix the prompt (Task 5) or, if the gate is wrong, the config (Task 2) with a reference test proving the approved texts still pass, and restart the count at zero.
- [ ] **Step 3: Founder read.** Export five of the twenty reports (pick different charts: one with no main star in Mệnh, one with the decadal direction unknown, three ordinary) and send them to the founder with the critic's `"beginner"` warnings next to each. The founder answers one question per report: could someone who has never read Tử Vi follow this? Any "no" goes back to Step 2 with the flagged phrases added to the banned lists.
- [ ] **Step 4: Switch new orders.** Change the chooser in `identity-report-config.ts` (line ~203) to return `v4_2BeginnerReportVersions` by default, keep `REPORT_TUPLE=v4.1.2` as the rollback switch. Short PR, merge, deploy. Reports already generated keep their tuple and still render (Task 6 made teasers optional).
- [ ] **Step 5: Smoke on production.** Buy one comprehensive report on a test account, open it, check: overview is five paragraphs with no sub-headings, eight cycles with seven teasers and a link to the current one, no banned phrase in the page text (`node scripts/check-public-content.mjs` against the page if it supports a URL, otherwise search the page text for each banned phrase). Post the evidence on Kaneo #68 and move it to Done.

### Terra review brief (paste into the PR)

Review against `docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md`. Check in particular:
1. Every existing tuple (v1 to v2.3) behaves byte-for-byte as before: run the old test files unchanged, and diff the v4.1.2 system prompt before and after.
2. The reference test (`comprehensive-report-quality-v4-reference.test.ts`) runs the real prototype files, not copies.
3. Teaser palace ids and ranges come only from `teaserCyclesFor`, never from model output.
4. `decadalTeasers` is optional in stored and public content, so old reports parse.
5. No birth date, time or place reaches the prompt payload or the public content (FD-089 and the reader rule).
6. The banned lists appear in exactly one place (the config) and the prompt reads them from there.

---

## Self-review notes

- Spec §2b.1 (no sub-headings, label openers): Task 3 `findMachineSubheading`, `findBannedOpener`; Task 5 prompt.
- Spec §2b.2, §2c.3 (translation-like phrases, banned vocabulary): Task 2 `bannedPhrases`, Task 3 `findBannedPhrase`; Task 11 critic for what a list cannot catch.
- Spec §3.1 translate on arrival: Task 5 prompt, Task 11 critic.
- Spec §3.3 density: Task 3 `starDensityProblem`, calibrated in Task 2 (1.5, with the measurement).
- Spec §4 proof in evidence refs: Task 4 Step 3.5.
- Spec §5.1 overview arc: Task 3 `overviewArcProblem`, Task 5 prompt.
- Spec §5.3 and FD-106b decadal teasers: Tasks 6, 7, 8, 10.
- Spec §8 release gate: Task 12.
- Not in this plan: the free result page (founder will review the report first), wave 3 of FD-104 (Kaneo #69).
