# FD-104 Wave 1: Report Reader Structure and Chart Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every comprehensive report (including reports already sold) readable: split walls of text into paragraphs, fix read tracking, turn actions into cards, make the 12 palaces collapsible, and add star chips, a mini chart and a decadal timeline drawn from the report's frozen chart data.

**Founder decisions (FD-104, 2026-09-27):** approach C in 3 waves; wave 1 first so sold reports improve immediately; keep depth, layer it; sold reports get the UI upgrade only (no regeneration); no invented scores or good/bad colouring (FD-063).

**Spec:** `docs/superpowers/specs/2026-09-27-interactive-report-reader-design.md` (§1 causes, §5 wave 1).
**Prototype (visual source):** `prototype/revamp-2026-09/doc-bao-cao-tuong-tac.html`. Use the "Báo cáo đã bán" toggle: that mode is exactly what wave 1 ships. Star chips, mini chart, timeline and palace cards follow the prototype's CSS (`doc-bao-cao-tuong-tac.css`).

**Architecture:** Web gets two pure, unit-tested helpers (`report-paragraphs.ts`, `report-reading-position.ts`) and one visuals module (`report-chart-visuals.tsx`). Backend gets one pure module (`report-chart-snapshot.ts`) that builds an optional `chartSnapshot` from the immutable chart version plus the frozen report source snapshot. The query service attaches it to v2/v3 ready views; any failure yields `null` and never blocks a report. Labels are resolved on the web with the existing `ziweiPresentation("vi")`, so the payload carries canonical IDs only (no birth data).

**Tech stack:** Next.js 16 client component (`comprehensive-report-reader.tsx`), zod contracts, Drizzle, vitest from repo root, Playwright (already in `node_modules`) for screenshots. No new dependency.

**Branch:** `feat/fd104-wave1-reader-structure`, cut from `origin/master`. PR to `master`. Merge only after An or Lãm approves.

**Out of scope (separate plans after wave 1 ships):** wave 2 structured writing contract (portrait, conclusion, key points, sub-headings, do/avoid, per-section star refs, cross-section repetition gate); wave 3 chart-as-navigation rail, tam phương tứ chính SVG overlay, full-screen chart sheet.

**Changes from the first spec draft (decided while planning, already folded into the spec §5):**
1. Section star refs from `evidenceKeys` move to wave 2. Wave 1 derives chips from `chartSnapshot` alone: palace cards use their own palace, Overview uses the life palace, Core axis the body palace, Current decadal the decadal palace, Annual the annual palace. Key configurations and themes get no chips in wave 1.
2. The full decadal list is **derived**, not persisted: cycle ordinal comes from the current cycle's start age (first cycle starts at age 2 to 6, so `ordinal = k` where `ageStart - 10k ∈ [2, 6]`), direction from whether the life palace plus `k` steps lands on the current palace forward or backward. Works for sold and new reports, no snapshot schema change. When ambiguous (ordinal 0 or 6, `not_started`, or inconsistent data) the timeline shows the current cycle only.

---

## Task 0: Verify production facts (read-only, no code)

Findings go in the Kaneo task as a comment before Task 2 is merged.

- [ ] **Step 1: Do stored narratives contain paragraph breaks?**

Run against production read replica (read-only):

```sql
SELECT prompt_version,
       count(*) AS reports,
       count(*) FILTER (WHERE structured_content::text LIKE '%\\n\\n%') AS with_blank_lines,
       count(*) FILTER (WHERE structured_content::text LIKE '%\\n%') AS with_any_newline
FROM report_versions
WHERE sku = 'ZIWEI-IDENTITY-P0'
GROUP BY prompt_version
ORDER BY prompt_version;
```

Expected: a table per prompt version. Either answer is fine: Task 1 handles both. Record the numbers.

- [ ] **Step 2: Where does "Đã đọc 23/10 phần" come from?**

Compare the deployed web image SHA with `origin/master`. In `master`, `readCount` is capped at `tocSections.length`, so "23/10" and the chip "Đã hoàn thành 23/24 phần (96%)" cannot come from this code. Open the founder's report URL in a clean browser profile with no extensions. Record: deployed SHA, whether the chip appears in a clean profile.

---

## File map

| File | Change |
|---|---|
| `apps/web/src/features/reports/report-paragraphs.ts` (+ `.test.ts`) | New: `splitNarrative`, `splitLeadSentence` |
| `apps/web/src/features/reports/report-narrative.tsx` (+ `.test.tsx`) | New: `ReportNarrative` component |
| `apps/web/src/features/reports/report-reading-position.ts` (+ `.test.ts`) | New: `resolveActiveSectionIndex` |
| `apps/web/src/features/reports/report-chart-visuals.tsx` (+ `.test.tsx`) | New: `ReportStarChips`, `ReportMiniChart`, `ReportDecadalTimeline` |
| `apps/web/src/features/reports/comprehensive-report-reader.tsx` | Use the above; action cards; collapsible palaces; scroll-based read tracking |
| `apps/web/src/features/reports/comprehensive-report-reader.test.tsx` | New assertions |
| `apps/web/src/styles/report-reader-structure.css` | New: styles ported from the prototype; imported in `global.css` |
| `apps/web/messages/{vi,en}/reports.json` | New `reader.*` keys |
| `packages/contracts/src/report-chart-snapshot-v1.ts` (+ `.test.ts`) | New schema |
| `packages/contracts/src/identity-report-v1.ts` | Optional `chartSnapshot` on V2 and V3 comprehensive ready views |
| `packages/contracts/src/index.ts` | Export the new schema and types |
| `packages/backend/src/reports/report-chart-snapshot.ts` (+ `.test.ts`) | New: `findDecadalOrdinal`, `deriveDecadalCycles`, `buildReportChartSnapshot`, `buildReportChartSnapshotFromStored` |
| `packages/backend/src/reports/report-query.repository.ts` | Load chart `normalizedOutput` and source `snapshot` for the version |
| `packages/backend/src/reports/report-query.service.ts` | Attach `chartSnapshot` for `v4` and `v4_1` families |

---

## Task 1: Narrative splitter (TDD)

**Files:**
- Create: `apps/web/src/features/reports/report-paragraphs.ts`
- Test: `apps/web/src/features/reports/report-paragraphs.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";

import { splitLeadSentence, splitNarrative } from "./report-paragraphs";

const seven = "Một là một. Hai là hai. Ba là ba. Bốn là bốn. Năm là năm. Sáu là sáu. Bảy là bảy.";

describe("splitNarrative", () => {
  it("returns no paragraphs for blank text", () => {
    expect(splitNarrative("  \n ")).toEqual([]);
  });

  it("keeps the model's blank-line paragraphs", () => {
    expect(splitNarrative("Câu một. Câu hai.\n\nCâu ba.")).toEqual(["Câu một. Câu hai.", "Câu ba."]);
  });

  it("treats single newlines as paragraph breaks", () => {
    expect(splitNarrative("Câu một.\nCâu hai.")).toEqual(["Câu một.", "Câu hai."]);
  });

  it("groups unbroken text into three-sentence paragraphs", () => {
    expect(splitNarrative(seven).map((p) => p.split(". ").length)).toEqual([3, 3, 1]);
  });

  it("does not split inside decimals", () => {
    expect(splitNarrative("Thu nhập tăng 2.5 lần. Chi tiêu giữ nguyên.")).toEqual([
      "Thu nhập tăng 2.5 lần. Chi tiêu giữ nguyên.",
    ]);
  });

  it("chunks an over-long model paragraph", () => {
    expect(splitNarrative(`${seven}\n\nCâu cuối.`)).toHaveLength(4);
  });

  it("splits before Vietnamese capitals with diacritics", () => {
    expect(splitNarrative("A. B. C. D. Đây là câu năm.")).toEqual(["A. B. C.", "D. Đây là câu năm."]);
  });
});

describe("splitLeadSentence", () => {
  it("separates the first sentence", () => {
    expect(splitLeadSentence("Câu một. Câu hai.")).toEqual({ lead: "Câu một.", rest: " Câu hai." });
  });

  it("returns the whole paragraph when it has one sentence", () => {
    expect(splitLeadSentence("Chỉ một câu.")).toEqual({ lead: "Chỉ một câu.", rest: "" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run apps/web/src/features/reports/report-paragraphs.test.ts`
Expected: FAIL, cannot resolve `./report-paragraphs`.

- [ ] **Step 3: Implement**

```ts
// Splits a stored report narrative into readable paragraphs (FD-104 wave 1).
// Stored narratives are one string; the model may or may not have written
// line breaks between paragraphs.

const SENTENCE_BOUNDARY = /(?<=[.!?…])\s+(?=\p{Lu})/u;
const LEAD_SENTENCE = /^(.+?[.!?…])(?=\s|$)/su;
const MAX_SENTENCES_PER_BLOCK = 4;

export const SENTENCES_PER_PARAGRAPH = 3;

function chunkSentences(block: string, size: number): string[] {
  const sentences = block.split(SENTENCE_BOUNDARY);
  if (sentences.length <= MAX_SENTENCES_PER_BLOCK) return [block];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += size) {
    chunks.push(sentences.slice(i, i + size).join(" "));
  }
  return chunks;
}

export function splitNarrative(text: string, size = SENTENCES_PER_PARAGRAPH): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return [];
  const blocks = /\n\s*\n/.test(normalized) ? normalized.split(/\n\s*\n/) : normalized.split("\n");
  return blocks
    .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
    .filter((block) => block.length > 0)
    .flatMap((block) => chunkSentences(block, size));
}

export function splitLeadSentence(paragraph: string): { lead: string; rest: string } {
  const match = LEAD_SENTENCE.exec(paragraph);
  if (!match || match[1]!.length === paragraph.length) return { lead: paragraph, rest: "" };
  return { lead: match[1]!, rest: paragraph.slice(match[1]!.length) };
}
```

Note: the unbroken case goes through `chunkSentences` too, so a 7-sentence string becomes 3/3/1 and a 3-sentence string stays whole.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run apps/web/src/features/reports/report-paragraphs.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/reports/report-paragraphs.ts apps/web/src/features/reports/report-paragraphs.test.ts
git commit -m "feat(web): split report narratives into readable paragraphs"
```

---

## Task 2: `ReportNarrative` and wire it into the reader

**Files:**
- Create: `apps/web/src/features/reports/report-narrative.tsx`, `report-narrative.test.tsx`
- Modify: `apps/web/src/features/reports/comprehensive-report-reader.tsx`
- Create: `apps/web/src/styles/report-reader-structure.css`; Modify: `apps/web/src/styles/global.css`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ReportNarrative } from "./report-narrative";

const seven = "Một là một. Hai là hai. Ba là ba. Bốn là bốn. Năm là năm. Sáu là sáu. Bảy là bảy.";

describe("ReportNarrative", () => {
  it("renders one <p> per paragraph with a lead line on the first", () => {
    const html = renderToStaticMarkup(<ReportNarrative text={seven} className="report-section-narrative" />);
    expect(html.match(/<p>/g)).toHaveLength(3);
    expect(html).toContain('<span class="report-narrative-lead">Một là một.</span>');
    expect(html).toContain('class="report-narrative report-section-narrative"');
  });

  it("can skip the lead line", () => {
    const html = renderToStaticMarkup(<ReportNarrative text="Câu một. Câu hai." lead={false} />);
    expect(html).not.toContain("report-narrative-lead");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run apps/web/src/features/reports/report-narrative.test.tsx`
Expected: FAIL, cannot resolve `./report-narrative`.

- [ ] **Step 3: Implement the component**

```tsx
import { splitLeadSentence, splitNarrative } from "./report-paragraphs";

export type ReportNarrativeProps = {
  text: string;
  className?: string;
  lead?: boolean;
};

export function ReportNarrative({ text, className, lead = true }: ReportNarrativeProps) {
  const paragraphs = splitNarrative(text);
  return (
    <div className={className ? `report-narrative ${className}` : "report-narrative"}>
      {paragraphs.map((paragraph, index) => {
        if (index === 0 && lead) {
          const parts = splitLeadSentence(paragraph);
          return (
            <p key={index}>
              <span className="report-narrative-lead">{parts.lead}</span>
              {parts.rest}
            </p>
          );
        }
        return <p key={index}>{paragraph}</p>;
      })}
    </div>
  );
}
```

- [ ] **Step 4: Replace every single-`<p>` narrative in `comprehensive-report-reader.tsx`**

Add `import { ReportNarrative } from "./report-narrative";`. Then replace (line numbers from `origin/master` `4bd25c3`):

| Lines | Before | After |
|---|---|---|
| 615-617 | `<div className="report-section-narrative"><p>{report.content.overview.narrative}</p></div>` | `<ReportNarrative className="report-section-narrative" text={report.content.overview.narrative} />` |
| 630-632 | same pattern, `coreAxis` | `<ReportNarrative className="report-section-narrative" text={report.content.coreAxis.narrative} />` |
| 652 | `<p className="report-subcard-narrative">{config.narrative}</p>` | `<ReportNarrative className="report-subcard-narrative" text={config.narrative} />` |
| 676 | same, `palace.narrative` | replaced in Task 5 |
| 697 | same, `theme.narrative` | `<ReportNarrative className="report-subcard-narrative" text={theme.narrative} />` |
| 714-716 | `strengthsAndTensions` | `<ReportNarrative className="report-section-narrative" text={report.content.strengthsAndTensions.narrative} />` |
| 769-771 | `currentDecadal` | `<ReportNarrative className="report-section-narrative" text={v4_1Content.currentDecadal.narrative} />` |
| 783-785 | `annualSnapshot` | `<ReportNarrative className="report-section-narrative" text={v4_1Content.annualSnapshot.narrative} />` |
| 802, 808 | `<p>{...stableFactors.narrative}</p>` and `sensitiveFactors` | `<ReportNarrative lead={false} text={v4_1Content.birthTimeSensitivity.stableFactors.narrative} />` (and the sensitive one) |

- [ ] **Step 5: Add the stylesheet**

Create `apps/web/src/styles/report-reader-structure.css`:

```css
/* FD-104 wave 1: structure for the comprehensive report reader. */
.report-narrative p { margin: 0 0 1em; line-height: 1.75; }
.report-narrative p:last-child { margin-bottom: 0; }
.report-narrative-lead { color: var(--text-heading); font-weight: 500; }
```

Append `@import "./report-reader-structure.css";` as the last `@import` in `apps/web/src/styles/global.css`.

- [ ] **Step 6: Run reader tests**

Run: `pnpm vitest run apps/web/src/features/reports/`
Expected: PASS. Existing assertions use `toContain(narrative)`; single-sentence fixtures still render contiguous text.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/reports/report-narrative.tsx apps/web/src/features/reports/report-narrative.test.tsx apps/web/src/features/reports/comprehensive-report-reader.tsx apps/web/src/styles/report-reader-structure.css apps/web/src/styles/global.css
git commit -m "feat(web): render report narratives as paragraphs with a lead line"
```

---

## Task 3: Scroll-based read tracking (TDD)

Cause: `IntersectionObserver` with `threshold: 0.1` inside a 30%-high root band never fires for sections taller than ~3 viewports (the 12-palace section), so section 04 is never marked read and the TOC stays on 03.

**Files:**
- Create: `apps/web/src/features/reports/report-reading-position.ts`, `report-reading-position.test.ts`
- Modify: `apps/web/src/features/reports/comprehensive-report-reader.tsx:202-242, 360`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { resolveActiveSectionIndex } from "./report-reading-position";

describe("resolveActiveSectionIndex", () => {
  it("returns -1 before the first section reaches the reading line", () => {
    expect(resolveActiveSectionIndex([500, 1400], 1000, false)).toBe(-1);
  });

  it("keeps a very tall section active while it fills the screen", () => {
    expect(resolveActiveSectionIndex([-15000, -12000, -9000, -6000, 900], 1000, false)).toBe(3);
  });

  it("activates the last section at the bottom of the page", () => {
    expect(resolveActiveSectionIndex([-3000, -1000, 700], 1000, true)).toBe(2);
  });

  it("returns -1 for no sections", () => {
    expect(resolveActiveSectionIndex([], 1000, false)).toBe(-1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run apps/web/src/features/reports/report-reading-position.test.ts`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement**

```ts
// A section is "being read" once its top passes 35% of the viewport.
export const READING_LINE_RATIO = 0.35;

export function resolveActiveSectionIndex(
  sectionTops: readonly number[],
  viewportHeight: number,
  atBottom: boolean,
): number {
  if (sectionTops.length === 0) return -1;
  if (atBottom) return sectionTops.length - 1;
  const line = viewportHeight * READING_LINE_RATIO;
  let active = -1;
  sectionTops.forEach((top, index) => {
    if (top < line) active = index;
  });
  return active;
}
```

- [ ] **Step 4: Replace the observer effect (lines 202-242)**

Add `import { resolveActiveSectionIndex } from "./report-reading-position";` and replace the whole `// Section observer ...` `useEffect` with:

```tsx
  // Scroll-based section tracking: works for sections taller than the viewport.
  useEffect(() => {
    const reportId = report.reportId;
    let frame = 0;
    const update = () => {
      frame = 0;
      const tops = tocSections.map((section) => {
        const el = document.getElementById(section.id);
        return el ? el.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
      });
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
      const idx = resolveActiveSectionIndex(tops, window.innerHeight, atBottom);
      if (idx < 0) return;
      const section = tocSections[idx]!;
      setActiveSectionIdx(idx);
      setReadSectionIds((prev) => {
        if (prev.has(section.id)) return prev;
        const next = new Set(prev);
        next.add(section.id);
        try {
          localStorage.setItem(`lsv-reader-read-${reportId}`, JSON.stringify(Array.from(next)));
          localStorage.setItem(`lsv-reader-active-${reportId}`, section.id);
        } catch {
          // Local storage failure must not block reading
        }
        return next;
      });
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [tocSections, report.reportId]);
```

- [ ] **Step 5: Count only known sections (line 360)**

Stored ids from an older layout must not inflate the count. Replace:

```tsx
  const readCount = Math.min(tocSections.length, Math.max(readSectionIds.size, activeSectionIdx + 1));
```

with:

```tsx
  const readCount = tocSections.filter((section) => readSectionIds.has(section.id)).length;
```

- [ ] **Step 6: Run tests**

Run: `pnpm vitest run apps/web/src/features/reports/`
Expected: PASS. If the existing "displays human-readable reading progress count" test asserted `1/…` from `activeSectionIdx + 1`, update it to expect `0/…` for a fresh render (no scroll has happened in static markup).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/reports/report-reading-position.ts apps/web/src/features/reports/report-reading-position.test.ts apps/web/src/features/reports/comprehensive-report-reader.tsx apps/web/src/features/reports/comprehensive-report-reader.test.tsx
git commit -m "fix(web): track report reading position by scroll so tall sections count as read"
```

---

## Task 4: Practical direction as action cards

**Files:**
- Modify: `apps/web/src/features/reports/comprehensive-report-reader.tsx:825-835`
- Modify: `apps/web/messages/vi/reports.json`, `apps/web/messages/en/reports.json` (inside `"reader"`)
- Modify: `apps/web/src/styles/report-reader-structure.css`
- Test: `apps/web/src/features/reports/comprehensive-report-reader.test.tsx`

- [ ] **Step 1: Add i18n keys** (both files, inside `"reader": { ... }`)

vi: `"action_why": "Vì sao:", "action_avoid": "Nên tránh:"`
en: `"action_why": "Why:", "action_avoid": "Avoid:"`

- [ ] **Step 2: Write the failing test** (append inside the existing `describe`, using the existing v3 fixture in the file; if none exists, build one by copying the Tier-2 fixture with `contentVersion: "ziwei-comprehensive.v3"` and `practicalDirection: [{ recommendation: "Chia việc lớn thành chặng", rationale: "Liêm Trinh ở Mệnh.", avoid: "Bắt đầu khi chưa rõ đích." }]`)

```tsx
  it("renders v3 practical directions as action cards (FD-104)", () => {
    const html = renderToStaticMarkup(<ComprehensiveReportReader report={v3Report} />);
    expect(html).toContain('class="report-action-card"');
    expect(html).toContain("Vì sao:");
    expect(html).toContain("Nên tránh:");
  });
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run apps/web/src/features/reports/comprehensive-report-reader.test.tsx`
Expected: FAIL on `report-action-card`.

- [ ] **Step 4: Implement** (replace the `<ul className="report-directions-list">…</ul>` block)

```tsx
                {report.contentVersion === "ziwei-comprehensive.v3" ? (
                  <ol className="report-action-cards">
                    {report.content.practicalDirection.map((direction, index) => (
                      <li key={index} className="report-action-card">
                        <h4 className="report-action-title">{direction.recommendation}</h4>
                        <p>
                          <span className="report-action-label">{t("reader.action_why")}</span>{" "}
                          {direction.rationale}
                        </p>
                        <p>
                          <span className="report-action-label">{t("reader.action_avoid")}</span>{" "}
                          {direction.avoid}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="report-directions-list">
                    {report.content.practicalDirection.map((direction, index) => (
                      <li key={index}>{direction}</li>
                    ))}
                  </ul>
                )}
```

Append to `report-reader-structure.css`:

```css
.report-action-cards { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 12px; }
.report-action-card { border: 1px solid var(--border-soft, var(--border-hairline)); border-radius: 16px; padding: 16px 18px; background: var(--surface-panel); display: grid; gap: 8px; }
.report-action-title { margin: 0; font: 600 18px/1.35 var(--font-ui); color: var(--text-heading); }
.report-action-card p { margin: 0; line-height: 1.55; }
.report-action-label { color: var(--text-muted); font-weight: 500; }
```

- [ ] **Step 5: Run tests, i18n check, commit**

Run: `pnpm vitest run apps/web/src/features/reports/ && pnpm i18n:check`
Expected: PASS; i18n parity OK.

```bash
git add apps/web/src/features/reports/comprehensive-report-reader.tsx apps/web/src/features/reports/comprehensive-report-reader.test.tsx apps/web/messages/vi/reports.json apps/web/messages/en/reports.json apps/web/src/styles/report-reader-structure.css
git commit -m "feat(web): show report practical directions as action cards"
```

---

## Task 5: Collapsible palace cards

Native `<details>`/`<summary>`: accessible, works without JS, SSR-friendly. First two palaces open. One "open all" toggle. Print opens everything.

**Files:**
- Modify: `apps/web/src/features/reports/comprehensive-report-reader.tsx:658-680`
- Modify: `apps/web/messages/{vi,en}/reports.json`, `apps/web/src/styles/report-reader-structure.css`
- Test: `apps/web/src/features/reports/comprehensive-report-reader.test.tsx`

- [ ] **Step 1: i18n keys** (inside `"reader"`)

vi: `"palaces_expand_all": "Mở tất cả 12 cung", "palaces_collapse_all": "Thu gọn tất cả"`
en: `"palaces_expand_all": "Open all 12 palaces", "palaces_collapse_all": "Collapse all"`

- [ ] **Step 2: Write the failing test**

```tsx
  it("renders the 12 palaces as details cards with the first two open (FD-104)", () => {
    const html = renderToStaticMarkup(<ComprehensiveReportReader report={tier2Report} />);
    const cards = html.match(/<details[^>]*class="report-subcard report-palace-card"[^>]*>/g) ?? [];
    expect(cards).toHaveLength(12);
    expect(cards.filter((tag) => tag.includes('open=""'))).toHaveLength(2);
    expect(html).toContain("Mở tất cả 12 cung");
  });
```

(`tier2Report` is the existing Tier-2 fixture in the file; it has 12 `palaceReadings`.)

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run apps/web/src/features/reports/comprehensive-report-reader.test.tsx`
Expected: FAIL, 0 cards.

- [ ] **Step 4: Implement state and print handler** (near the other `useState` calls)

```tsx
  const [openPalaces, setOpenPalaces] = useState<Set<string>>(() =>
    new Set(isTier2Content(report.content) ? report.content.palaceReadings.slice(0, 2).map((p) => p.palaceId) : []),
  );
  const palaceCount = isTier2Content(report.content) ? report.content.palaceReadings.length : 0;
  const allPalacesOpen = palaceCount > 0 && openPalaces.size === palaceCount;
  const setPalaceOpen = (palaceId: string, open: boolean) => {
    setOpenPalaces((prev) => {
      if (prev.has(palaceId) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(palaceId);
      else next.delete(palaceId);
      return next;
    });
  };
  const toggleAllPalaces = () => {
    if (!isTier2Content(report.content)) return;
    setOpenPalaces(allPalacesOpen ? new Set() : new Set(report.content.palaceReadings.map((p) => p.palaceId)));
  };

  // Printing and PDF export must include every palace.
  useEffect(() => {
    const openAll = () => {
      document.querySelectorAll<HTMLDetailsElement>(".report-palace-card").forEach((card) => {
        card.open = true;
      });
    };
    window.addEventListener("beforeprint", openAll);
    return () => window.removeEventListener("beforeprint", openAll);
  }, []);
```

Add `splitLeadSentence, splitNarrative` to the imports: `import { splitLeadSentence, splitNarrative } from "./report-paragraphs";`.

- [ ] **Step 5: Replace the palace list** (the `report.content.palaceReadings.map(...)` block)

```tsx
                    <div className="report-palace-tools">
                      <button type="button" className="report-palace-toggle-all" onClick={toggleAllPalaces} aria-pressed={allPalacesOpen}>
                        {allPalacesOpen ? t("reader.palaces_collapse_all") : t("reader.palaces_expand_all")}
                      </button>
                    </div>
                    <div className="report-subcard-group">
                      {report.content.palaceReadings.map((palace) => (
                        <details
                          key={palace.palaceId}
                          id={`palace-${palace.palaceId.replace("ziwei.palace.", "")}`}
                          className="report-subcard report-palace-card"
                          open={openPalaces.has(palace.palaceId)}
                          onToggle={(event) => setPalaceOpen(palace.palaceId, event.currentTarget.open)}
                        >
                          <summary className="report-palace-summary">
                            <span className="report-subcard-title">{palace.title}</span>
                            <span className="report-palace-lead">
                              {splitLeadSentence(splitNarrative(palace.narrative)[0] ?? "").lead}
                            </span>
                          </summary>
                          <ReportNarrative className="report-subcard-narrative" text={palace.narrative} lead={false} />
                        </details>
                      ))}
                    </div>
```

Append to `report-reader-structure.css`:

```css
.report-palace-tools { display: flex; justify-content: flex-end; margin: 0 0 12px; }
.report-palace-toggle-all { height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--border-hairline); background: transparent; color: var(--accent-gold); font: 600 14.5px var(--font-ui); cursor: pointer; }
.report-palace-card > summary { list-style: none; cursor: pointer; display: grid; gap: 4px; padding-right: 28px; position: relative; }
.report-palace-card > summary::-webkit-details-marker { display: none; }
.report-palace-card > summary::after { content: ""; position: absolute; right: 4px; top: 8px; width: 8px; height: 8px; border-right: 2px solid var(--text-muted); border-bottom: 2px solid var(--text-muted); transform: rotate(45deg); transition: transform 180ms ease; }
.report-palace-card[open] > summary::after { transform: rotate(-135deg); }
.report-palace-lead { color: var(--text-body); font-size: 15px; line-height: 1.5; }
.report-palace-card[open] .report-palace-lead { display: none; }
.report-palace-card[open] > summary { margin-bottom: 12px; }
@media print { .report-palace-tools { display: none; } }
```

- [ ] **Step 6: Run tests, commit**

Run: `pnpm vitest run apps/web/src/features/reports/ && pnpm i18n:check`
Expected: PASS.

```bash
git add apps/web/src/features/reports/comprehensive-report-reader.tsx apps/web/src/features/reports/comprehensive-report-reader.test.tsx apps/web/messages/vi/reports.json apps/web/messages/en/reports.json apps/web/src/styles/report-reader-structure.css
git commit -m "feat(web): make the 12 palace readings collapsible cards"
```

---

## Task 6: `ReportChartSnapshotV1` contract (TDD)

**Files:**
- Create: `packages/contracts/src/report-chart-snapshot-v1.ts`, `report-chart-snapshot-v1.test.ts`
- Modify: `packages/contracts/src/identity-report-v1.ts:765-778`, `packages/contracts/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { ReportComprehensiveV3ReadyViewV1Schema } from "./identity-report-v1.js";
import { ReportChartSnapshotV1Schema } from "./report-chart-snapshot-v1.js";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";

function validSnapshot() {
  return {
    version: 1,
    palaces: ZIWEI_PALACE_IDS.map((palaceId, i) => ({
      palaceId,
      earthlyBranchId: "ziwei.branch.rat",
      isLife: i === 0,
      isBody: i === 6,
      triadPalaceIds: [ZIWEI_PALACE_IDS[(i + 4) % 12], ZIWEI_PALACE_IDS[(i + 8) % 12]],
      oppositePalaceId: ZIWEI_PALACE_IDS[(i + 6) % 12],
      stars: i === 0
        ? [{ starId: "ziwei.star.lianzhen", kind: "main", brightnessId: "ziwei.brightness.neutral" }]
        : [],
    })),
    decadal: {
      currentOrdinal: 2,
      cycles: [{ ordinal: 2, palaceId: "ziwei.palace.spouse", ageRange: [25, 34], yearRange: [2017, 2026] }],
    },
    annual: { targetYear: 2026, palaceId: "ziwei.palace.fortune" },
  };
}

describe("ReportChartSnapshotV1Schema", () => {
  it("accepts a valid snapshot", () => {
    expect(ReportChartSnapshotV1Schema.safeParse(validSnapshot()).success).toBe(true);
  });

  it("rejects a snapshot without 12 palaces", () => {
    const snapshot = validSnapshot();
    snapshot.palaces.pop();
    expect(ReportChartSnapshotV1Schema.safeParse(snapshot).success).toBe(false);
  });

  it("rejects unknown fields such as birth data", () => {
    expect(ReportChartSnapshotV1Schema.safeParse({ ...validSnapshot(), birthDate: "1993-01-01" }).success).toBe(false);
  });

  it("is optional and nullable on the v3 ready view", () => {
    const field = ReportComprehensiveV3ReadyViewV1Schema.shape.chartSnapshot;
    expect(field.safeParse(undefined).success).toBe(true);
    expect(field.safeParse(null).success).toBe(true);
    expect(field.safeParse(validSnapshot()).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/contracts/src/report-chart-snapshot-v1.test.ts`
Expected: FAIL, cannot resolve `./report-chart-snapshot-v1.js`.

- [ ] **Step 3: Implement the schema**

```ts
import { z } from "zod";

import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";

// Display-only projection of a report's frozen chart (FD-104). Canonical IDs
// only; labels are resolved by the web. Never carries birth date, time or place.

const PalaceId = z.enum(ZIWEI_PALACE_IDS);
const Year = z.number().int();
const Age = z.number().int().positive();

export const ReportChartStarV1Schema = z
  .object({
    starId: z.string().regex(/^ziwei\.star\.[a-z0-9-]+$/),
    kind: z.enum(["main", "aux"]),
    brightnessId: z.string().regex(/^ziwei\.brightness\.[a-z]+$/).optional(),
    transformationId: z.string().regex(/^ziwei\.transformation\.[a-z]+$/).optional(),
  })
  .strict();

export const ReportChartPalaceV1Schema = z
  .object({
    palaceId: PalaceId,
    earthlyBranchId: z.string().regex(/^ziwei\.branch\.[a-z]+$/),
    heavenlyStemId: z.string().regex(/^ziwei\.stem\.[a-z0-9-]+$/).optional(),
    isLife: z.boolean(),
    isBody: z.boolean(),
    triadPalaceIds: z.tuple([PalaceId, PalaceId]),
    oppositePalaceId: PalaceId,
    stars: z.array(ReportChartStarV1Schema),
  })
  .strict();

export const ReportDecadalCycleV1Schema = z
  .object({
    ordinal: z.number().int().nonnegative(),
    palaceId: PalaceId,
    ageRange: z.tuple([Age, Age]),
    yearRange: z.tuple([Year, Year]),
  })
  .strict();

export const ReportChartSnapshotV1Schema = z
  .object({
    version: z.literal(1),
    palaces: z.array(ReportChartPalaceV1Schema).length(12),
    decadal: z
      .object({
        currentOrdinal: z.number().int().nonnegative().nullable(),
        cycles: z.array(ReportDecadalCycleV1Schema).max(12),
      })
      .strict(),
    annual: z.object({ targetYear: Year, palaceId: PalaceId }).strict(),
  })
  .strict();

export type ReportChartStarV1 = z.infer<typeof ReportChartStarV1Schema>;
export type ReportChartPalaceV1 = z.infer<typeof ReportChartPalaceV1Schema>;
export type ReportDecadalCycleV1 = z.infer<typeof ReportDecadalCycleV1Schema>;
export type ReportChartSnapshotV1 = z.infer<typeof ReportChartSnapshotV1Schema>;
```

- [ ] **Step 4: Add the optional field to both comprehensive ready views** (`identity-report-v1.ts`)

Add `import { ReportChartSnapshotV1Schema } from "./report-chart-snapshot-v1.js";` at the top, then add one line inside both `.extend({ ... })` objects of `ReportComprehensiveV2ReadyViewV1Schema` (line 765) and `ReportComprehensiveV3ReadyViewV1Schema` (line 774):

```ts
  chartSnapshot: ReportChartSnapshotV1Schema.nullable().optional(),
```

- [ ] **Step 5: Export from the package** (append to `packages/contracts/src/index.ts`)

```ts
export {
  ReportChartPalaceV1Schema,
  ReportChartSnapshotV1Schema,
  ReportChartStarV1Schema,
  ReportDecadalCycleV1Schema,
  type ReportChartPalaceV1,
  type ReportChartSnapshotV1,
  type ReportChartStarV1,
  type ReportDecadalCycleV1,
} from "./report-chart-snapshot-v1.js";
```

- [ ] **Step 6: Run, build, commit**

Run: `pnpm vitest run packages/contracts/ && pnpm --filter @lasoviet/contracts build`
Expected: PASS; build succeeds (other packages typecheck against `dist`).

```bash
git add packages/contracts/src/report-chart-snapshot-v1.ts packages/contracts/src/report-chart-snapshot-v1.test.ts packages/contracts/src/identity-report-v1.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): add optional report chart snapshot to comprehensive ready views"
```

---

## Task 7: Build the chart snapshot and derive decadal cycles (TDD)

**Files:**
- Create: `packages/backend/src/reports/report-chart-snapshot.ts`, `report-chart-snapshot.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { ZIWEI_PALACE_IDS } from "@lasoviet/contracts";

import {
  buildReportChartSnapshot,
  buildReportChartSnapshotFromStored,
  deriveDecadalCycles,
  findDecadalOrdinal,
} from "./report-chart-snapshot.js";

const RING = [
  "ziwei.branch.rat", "ziwei.branch.ox", "ziwei.branch.tiger", "ziwei.branch.rabbit",
  "ziwei.branch.dragon", "ziwei.branch.snake", "ziwei.branch.horse", "ziwei.branch.goat",
  "ziwei.branch.monkey", "ziwei.branch.rooster", "ziwei.branch.dog", "ziwei.branch.pig",
] as const;

// Founder's 2026-09-27 chart: Mệnh at Thìn, palaces run backward, Thân at Thiên Di (Tuất).
function founderChart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: ZIWEI_PALACE_IDS.map((id, i) => ({
      id,
      earthlyBranchId: RING[(4 - i + 12) % 12]!,
      heavenlyStemId: "ziwei.stem.bing",
      isBodyPalace: id === "ziwei.palace.travel",
      stars:
        id === "ziwei.palace.life"
          ? [
              { id: "ziwei.star.lianzhen", brightness: "ziwei.brightness.neutral", category: "major" },
              { id: "ziwei.star.tianfu", brightness: "ziwei.brightness.exalted", category: "major" },
            ]
          : id === "ziwei.palace.spouse"
            ? [{ id: "ziwei.star.pojun", brightness: "ziwei.brightness.favorable", category: "major" }]
            : [],
    })),
    transformations: [{ starId: "ziwei.star.pojun", id: "ziwei.transformation.prosperity" }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.travel",
    horoscopeCapabilities: [{ id: "ziwei.horoscope.decadal", supported: true }],
    warnings: [],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart-v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: [],
    },
  };
}

const activeTiming = {
  decadal: {
    state: "active" as const,
    earthlyBranchId: "ziwei.branch.tiger",
    palaceId: "ziwei.palace.spouse" as const,
    ageRange: [25, 34] as [number, number],
    yearRange: [2017, 2026] as [number, number],
  },
  annual: { targetYear: 2026, palaceId: "ziwei.palace.fortune" as const },
};

describe("findDecadalOrdinal", () => {
  it("finds the cycle number from the start age", () => {
    expect(findDecadalOrdinal(25)).toBe(2);
    expect(findDecadalOrdinal(6)).toBe(0);
    expect(findDecadalOrdinal(62)).toBe(6);
  });

  it("returns null for impossible start ages", () => {
    expect(findDecadalOrdinal(1)).toBeNull();
    expect(findDecadalOrdinal(18)).toBeNull();
  });
});

describe("deriveDecadalCycles", () => {
  it("derives a backward run from the founder's chart", () => {
    const cycles = deriveDecadalCycles("ziwei.branch.dragon", activeTiming.decadal);
    expect(cycles?.[0]).toEqual({ ordinal: 0, branchId: "ziwei.branch.dragon", ageRange: [5, 14], yearRange: [1997, 2006] });
    expect(cycles?.[3]).toEqual({ ordinal: 3, branchId: "ziwei.branch.ox", ageRange: [35, 44], yearRange: [2027, 2036] });
    expect(cycles).toHaveLength(12);
  });

  it("derives a forward run", () => {
    const cycles = deriveDecadalCycles("ziwei.branch.rat", {
      earthlyBranchId: "ziwei.branch.tiger", ageRange: [23, 32], yearRange: [2010, 2019],
    });
    expect(cycles?.[1]?.branchId).toBe("ziwei.branch.ox");
    expect(cycles?.[1]?.ageRange).toEqual([13, 22]);
  });

  it("returns null when the direction cannot be known", () => {
    expect(deriveDecadalCycles("ziwei.branch.rat", { earthlyBranchId: "ziwei.branch.rat", ageRange: [4, 13], yearRange: [2000, 2009] })).toBeNull();
    expect(deriveDecadalCycles("ziwei.branch.rat", { earthlyBranchId: "ziwei.branch.horse", ageRange: [62, 71], yearRange: [2040, 2049] })).toBeNull();
  });

  it("returns null for inconsistent data", () => {
    expect(deriveDecadalCycles("ziwei.branch.rat", { earthlyBranchId: "ziwei.branch.dragon", ageRange: [25, 34], yearRange: [2017, 2026] })).toBeNull();
  });
});

describe("buildReportChartSnapshot", () => {
  it("projects palaces, stars, transformations and the full decadal run", () => {
    const snapshot = buildReportChartSnapshot(founderChart(), activeTiming);
    const life = snapshot.palaces.find((p) => p.palaceId === "ziwei.palace.life")!;
    expect(life.isLife).toBe(true);
    expect(life.earthlyBranchId).toBe("ziwei.branch.dragon");
    expect(life.stars.map((s) => s.starId)).toEqual(["ziwei.star.lianzhen", "ziwei.star.tianfu"]);
    const spouse = snapshot.palaces.find((p) => p.palaceId === "ziwei.palace.spouse")!;
    expect(spouse.stars[0]).toMatchObject({ kind: "main", transformationId: "ziwei.transformation.prosperity" });
    expect(snapshot.decadal.currentOrdinal).toBe(2);
    expect(snapshot.decadal.cycles[3]).toMatchObject({ palaceId: "ziwei.palace.children", ageRange: [35, 44] });
    expect(snapshot.annual).toEqual({ targetYear: 2026, palaceId: "ziwei.palace.fortune" });
  });

  it("falls back to the current cycle only when the run cannot be derived", () => {
    const timing = { ...activeTiming, decadal: { ...activeTiming.decadal, earthlyBranchId: "ziwei.branch.dog", palaceId: "ziwei.palace.travel" as const, ageRange: [62, 71] as [number, number], yearRange: [2054, 2063] as [number, number] } };
    const snapshot = buildReportChartSnapshot(founderChart(), timing);
    expect(snapshot.decadal.cycles).toEqual([{ ordinal: 6, palaceId: "ziwei.palace.travel", ageRange: [62, 71], yearRange: [2054, 2063] }]);
    expect(snapshot.decadal.currentOrdinal).toBe(6);
  });

  it("shows only the first cycle before decadal cycles start", () => {
    const snapshot = buildReportChartSnapshot(founderChart(), {
      decadal: { state: "not_started", firstCycleStartAge: 5, firstCycleStartYear: 1997 },
      annual: { targetYear: 1995, palaceId: "ziwei.palace.life" },
    });
    expect(snapshot.decadal).toEqual({
      currentOrdinal: null,
      cycles: [{ ordinal: 0, palaceId: "ziwei.palace.life", ageRange: [5, 14], yearRange: [1997, 2006] }],
    });
  });
});

describe("buildReportChartSnapshotFromStored", () => {
  it("returns null instead of throwing on bad stored data", () => {
    expect(buildReportChartSnapshotFromStored({ nope: true }, null, "chart-1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/backend/src/reports/report-chart-snapshot.test.ts`
Expected: FAIL, cannot resolve `./report-chart-snapshot.js`.

- [ ] **Step 3: Implement**

```ts
import {
  NormalizedZiweiChartV1Schema,
  ReportChartSnapshotV1Schema,
  ZiweiReportSnapshotV1Schema,
  type NormalizedZiweiChartV1,
  type ReportChartSnapshotV1,
  type ZiweiPalaceId,
} from "@lasoviet/contracts";

import { buildComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";

// Display projection of a report's frozen chart for the reader (FD-104 wave 1).

const BRANCH_RING = [
  "ziwei.branch.rat", "ziwei.branch.ox", "ziwei.branch.tiger", "ziwei.branch.rabbit",
  "ziwei.branch.dragon", "ziwei.branch.snake", "ziwei.branch.horse", "ziwei.branch.goat",
  "ziwei.branch.monkey", "ziwei.branch.rooster", "ziwei.branch.dog", "ziwei.branch.pig",
] as const;

// The first decadal cycle starts at the bureau number: age 2 to 6.
const FIRST_CYCLE_MIN_AGE = 2;
const FIRST_CYCLE_MAX_AGE = 6;

type Range = [number, number];

export type DecadalAnchor = { earthlyBranchId: string; ageRange: Range; yearRange: Range };
export type DerivedDecadalCycle = { ordinal: number; branchId: string; ageRange: Range; yearRange: Range };

export type ChartSnapshotTimingInput = {
  decadal:
    | ({ state: "active"; palaceId: ZiweiPalaceId } & DecadalAnchor)
    | { state: "not_started"; firstCycleStartAge: number; firstCycleStartYear: number };
  annual: { targetYear: number; palaceId: ZiweiPalaceId };
};

export function findDecadalOrdinal(ageStart: number): number | null {
  for (let k = 0; k < 12; k++) {
    const first = ageStart - 10 * k;
    if (first >= FIRST_CYCLE_MIN_AGE && first <= FIRST_CYCLE_MAX_AGE) return k;
  }
  return null;
}

export function deriveDecadalCycles(lifeBranchId: string, anchor: DecadalAnchor): DerivedDecadalCycle[] | null {
  const ordinal = findDecadalOrdinal(anchor.ageRange[0]);
  const life = BRANCH_RING.indexOf(lifeBranchId as (typeof BRANCH_RING)[number]);
  const current = BRANCH_RING.indexOf(anchor.earthlyBranchId as (typeof BRANCH_RING)[number]);
  if (ordinal === null || life < 0 || current < 0) return null;
  const forward = (life + ordinal) % 12 === current;
  const backward = (life - ordinal + 120) % 12 === current;
  if (forward === backward) return null; // ordinal 0 or 6, or inconsistent data
  const step = forward ? 1 : -1;
  return Array.from({ length: 12 }, (_, k) => {
    const shift = 10 * (k - ordinal);
    return {
      ordinal: k,
      branchId: BRANCH_RING[(life + step * k + 120) % 12]!,
      ageRange: [anchor.ageRange[0] + shift, anchor.ageRange[1] + shift] as Range,
      yearRange: [anchor.yearRange[0] + shift, anchor.yearRange[1] + shift] as Range,
    };
  });
}

export function buildReportChartSnapshot(
  chart: NormalizedZiweiChartV1,
  timing: ChartSnapshotTimingInput,
): ReportChartSnapshotV1 {
  const facts = buildComprehensiveZiweiFacts(chart);
  const transformationByStar = new Map(chart.transformations.map((t) => [t.starId, t.id]));
  const palaces = facts.palaces.map((p) => ({
    palaceId: p.palaceId,
    earthlyBranchId: p.earthlyBranchId,
    ...(p.heavenlyStemId ? { heavenlyStemId: p.heavenlyStemId } : {}),
    isLife: p.isLifePalace,
    isBody: p.isBodyPalace,
    triadPalaceIds: [p.triadPalaceIds[0]!, p.triadPalaceIds[1]!] as [ZiweiPalaceId, ZiweiPalaceId],
    oppositePalaceId: p.oppositePalaceId,
    stars: p.stars.map((s) => {
      const transformationId = transformationByStar.get(s.id);
      return {
        starId: s.id,
        kind: s.category === "major" ? ("main" as const) : ("aux" as const),
        brightnessId: s.brightness,
        ...(transformationId ? { transformationId } : {}),
      };
    }),
  }));
  const palaceByBranch = new Map(palaces.map((p) => [p.earthlyBranchId, p.palaceId]));
  const life = palaces.find((p) => p.isLife)!;

  let decadal: ReportChartSnapshotV1["decadal"];
  if (timing.decadal.state === "active") {
    const anchor = timing.decadal;
    const derived = deriveDecadalCycles(life.earthlyBranchId, anchor);
    const ordinal = findDecadalOrdinal(anchor.ageRange[0]) ?? 0;
    decadal = derived
      ? {
          currentOrdinal: ordinal,
          cycles: derived.map((c) => ({
            ordinal: c.ordinal,
            palaceId: palaceByBranch.get(c.branchId)!,
            ageRange: c.ageRange,
            yearRange: c.yearRange,
          })),
        }
      : {
          currentOrdinal: ordinal,
          cycles: [{ ordinal, palaceId: anchor.palaceId, ageRange: anchor.ageRange, yearRange: anchor.yearRange }],
        };
  } else {
    const { firstCycleStartAge: age, firstCycleStartYear: year } = timing.decadal;
    decadal = {
      currentOrdinal: null,
      cycles: [{ ordinal: 0, palaceId: life.palaceId, ageRange: [age, age + 9], yearRange: [year, year + 9] }],
    };
  }

  return ReportChartSnapshotV1Schema.parse({
    version: 1,
    palaces,
    decadal,
    annual: { targetYear: timing.annual.targetYear, palaceId: timing.annual.palaceId },
  });
}

// Read path: stored rows are untrusted; any problem hides the visuals, never the report.
export function buildReportChartSnapshotFromStored(
  normalizedOutput: unknown,
  storedSnapshot: unknown,
  chartVersionId: string,
): ReportChartSnapshotV1 | null {
  try {
    const chart = NormalizedZiweiChartV1Schema.safeParse(normalizedOutput);
    const snapshot = ZiweiReportSnapshotV1Schema.safeParse(storedSnapshot);
    if (!chart.success || !snapshot.success || snapshot.data.chartVersionId !== chartVersionId) {
      return null;
    }
    return buildReportChartSnapshot(chart.data, snapshot.data.timing);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/backend/src/reports/report-chart-snapshot.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/reports/report-chart-snapshot.ts packages/backend/src/reports/report-chart-snapshot.test.ts
git commit -m "feat(backend): build report chart snapshot with derived decadal cycles"
```

---

## Task 8: Attach the snapshot in the report query

**Files:**
- Modify: `packages/backend/src/reports/report-query.repository.ts:9-36, 489-496, 514-521, 534-541`
- Modify: `packages/backend/src/reports/report-query.service.ts` (v4 and v4_1 branches)
- Test: `packages/backend/src/reports/report-query.service.test.ts`

- [ ] **Step 1: Repository: load the two inputs**

Add `reportSourceSnapshots` to the `@lasoviet/database` import. Extend the common record type:

```ts
type AuthorizedReportQueryCommon = {
  reservation: typeof reportReservations.$inferSelect;
  version: typeof reportVersions.$inferSelect | null;
  evidenceItems: Array<typeof evidenceItems.$inferSelect>;
  entitlements: AuthorizedReportEntitlement[];
  // FD-104: raw inputs for the display-only chart snapshot. Optional so existing fixtures stay valid.
  chartNormalizedOutput?: unknown;
  sourceSnapshot?: unknown;
};
```

Inside `createDatabaseReportQueryRepository`, next to `loadActiveChartEntitlements`, add:

```ts
  async function loadChartSnapshotInputs(version: typeof reportVersions.$inferSelect | null) {
    if (!version) return { chartNormalizedOutput: null, sourceSnapshot: null };
    const [chartRow] = await database
      .select({ normalizedOutput: ziweiChartVersions.normalizedOutput })
      .from(ziweiChartVersions)
      .where(eq(ziweiChartVersions.id, version.chartVersionId))
      .limit(1);
    const [snapshotRow] = await database
      .select({ snapshot: reportSourceSnapshots.snapshot })
      .from(reportSourceSnapshots)
      .where(eq(reportSourceSnapshots.reportVersionId, version.reportVersionId))
      .limit(1);
    return {
      chartNormalizedOutput: chartRow?.normalizedOutput ?? null,
      sourceSnapshot: snapshotRow?.snapshot ?? null,
    };
  }
```

Spread it into the two returns that carry a version: `...(await loadChartSnapshotInputs(version)),` in the order return at line 489, and `...(await loadChartSnapshotInputs(record.version)),` in the wallet return at line 534. The version-less return at line 514 stays unchanged.

- [ ] **Step 2: Write the failing service test**

In `report-query.service.test.ts`, add two cases right after `it("reads V4.1 content only from its exact tuple ...")` (line 1842). They reuse the file's `v4_1Record()` fixture and `accountActor`:

```ts
    it("attaches chartSnapshot: null when chart inputs are missing (FD-104)", async () => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(v4_1Record()),
      };
      const result = await createReportQueryService({ repository }).getReport(
        accountActor,
        "834e9e89-19cb-44a6-bc59-ba7741374553",
      );
      expect(result.ok).toBe(true);
      if (!result.ok || result.value.state !== "ready") return;
      expect((result.value as { chartSnapshot?: unknown }).chartSnapshot).toBeNull();
    });

    it("never fails the report when stored chart data is invalid (FD-104)", async () => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue({
          ...v4_1Record(),
          chartNormalizedOutput: { broken: true },
          sourceSnapshot: { also: "broken" },
        }),
      };
      const result = await createReportQueryService({ repository }).getReport(
        accountActor,
        "834e9e89-19cb-44a6-bc59-ba7741374553",
      );
      expect(result.ok).toBe(true);
      if (!result.ok || result.value.state !== "ready") return;
      expect((result.value as { chartSnapshot?: unknown }).chartSnapshot).toBeNull();
    });
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run packages/backend/src/reports/report-query.service.test.ts`
Expected: first new case FAILS (`chartSnapshot` absent).

- [ ] **Step 4: Service: attach the snapshot**

Add `import { buildReportChartSnapshotFromStored } from "./report-chart-snapshot.js";`. In both the `family === "v4_1"` and `family === "v4"` branches, add this field to the object passed to `ReportReadyViewV1Schema.safeParse({ ... })`:

```ts
          chartSnapshot: buildReportChartSnapshotFromStored(
            record.chartNormalizedOutput,
            record.sourceSnapshot,
            version.chartVersionId,
          ),
```

- [ ] **Step 5: Run backend tests, commit**

Run: `pnpm vitest run packages/backend/src/reports/`
Expected: PASS.

```bash
git add packages/backend/src/reports/report-query.repository.ts packages/backend/src/reports/report-query.service.ts packages/backend/src/reports/report-query.service.test.ts
git commit -m "feat(backend): attach frozen chart snapshot to comprehensive report views"
```

---

## Task 9: Star chips, mini chart, decadal timeline

Visual source: prototype classes `.chip`, `.hoa`, `.board.thumb`, `.seg-c`. Port them into `report-reader-structure.css` with a `report-` prefix. FD-063: the timeline uses position styling only (current, past, future); no colour means good or bad.

**Files:**
- Create: `apps/web/src/features/reports/report-chart-visuals.tsx`, `report-chart-visuals.test.tsx`
- Modify: `apps/web/src/features/reports/comprehensive-report-reader.tsx`, `apps/web/messages/{vi,en}/reports.json`, `apps/web/src/styles/report-reader-structure.css`

- [ ] **Step 1: i18n keys** (inside `"reader"`)

vi:
```json
"stars_label": "Sao trong cung",
"no_main_star": "Vô chính diệu",
"timeline_title": "Các chặng đại vận",
"timeline_note": "Mỗi chặng 10 năm, tính theo tuổi âm. Chỉ chặng hiện tại có phần luận giải riêng.",
"timeline_current": "Hiện tại",
"timeline_age": "{from}-{to} tuổi",
"chart_thumb_label": "Vị trí {palace} trên lá số"
```
en:
```json
"stars_label": "Stars in this palace",
"no_main_star": "No main star",
"timeline_title": "Decadal cycles",
"timeline_note": "Each cycle spans 10 years by lunar age. Only the current cycle has its own reading.",
"timeline_current": "Current",
"timeline_age": "Age {from}-{to}",
"chart_thumb_label": "Position of {palace} on the chart"
```

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReportChartSnapshotV1 } from "@lasoviet/contracts";
import { ZIWEI_PALACE_IDS } from "@lasoviet/contracts";

import { ReportDecadalTimeline, ReportMiniChart, ReportStarChips } from "./report-chart-visuals";

const RING = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

const snapshot: ReportChartSnapshotV1 = {
  version: 1,
  palaces: ZIWEI_PALACE_IDS.map((palaceId, i) => ({
    palaceId,
    earthlyBranchId: `ziwei.branch.${RING[(4 - i + 12) % 12]}`,
    isLife: i === 0,
    isBody: i === 6,
    triadPalaceIds: [ZIWEI_PALACE_IDS[(i + 4) % 12]!, ZIWEI_PALACE_IDS[(i + 8) % 12]!],
    oppositePalaceId: ZIWEI_PALACE_IDS[(i + 6) % 12]!,
    stars: i === 2
      ? [{ starId: "ziwei.star.pojun", kind: "main", brightnessId: "ziwei.brightness.favorable", transformationId: "ziwei.transformation.prosperity" }, { starId: "ziwei.star.dijie", kind: "aux" }]
      : [],
  })),
  decadal: {
    currentOrdinal: 2,
    cycles: [0, 1, 2, 3].map((k) => ({ ordinal: k, palaceId: ZIWEI_PALACE_IDS[k]!, ageRange: [5 + 10 * k, 14 + 10 * k] as [number, number], yearRange: [1997 + 10 * k, 2006 + 10 * k] as [number, number] })),
  },
  annual: { targetYear: 2026, palaceId: "ziwei.palace.fortune" },
};
const t = (key: string, values?: Record<string, unknown>) =>
  key === "reader.timeline_age" ? `${values?.from}-${values?.to} tuổi` : key === "reader.no_main_star" ? "Vô chính diệu" : key;

describe("report chart visuals", () => {
  it("renders star chips with Vietnamese brightness and transformation labels", () => {
    const html = renderToStaticMarkup(<ReportStarChips palace={snapshot.palaces[2]!} t={t} />);
    expect(html).toContain("Phá Quân");
    expect(html).toContain("Đắc");
    expect(html).toContain("Hóa Lộc");
    expect(html).toContain('class="report-chip is-main"');
  });

  it("says when a palace has no main star", () => {
    const html = renderToStaticMarkup(<ReportStarChips palace={snapshot.palaces[1]!} t={t} />);
    expect(html).toContain("Vô chính diệu");
  });

  it("lights the palace and marks its triad and opposite on the mini chart", () => {
    const html = renderToStaticMarkup(<ReportMiniChart snapshot={snapshot} palaceId="ziwei.palace.life" t={t} />);
    expect(html.match(/report-mini-cell/g)).toHaveLength(12);
    expect(html.match(/is-lit/g)).toHaveLength(1);
    expect(html.match(/is-related/g)).toHaveLength(3);
  });

  it("renders every cycle and marks the current one without good/bad styling", () => {
    const html = renderToStaticMarkup(<ReportDecadalTimeline snapshot={snapshot} t={t} />);
    expect(html.match(/report-cycle"|report-cycle /g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain("25-34 tuổi");
    expect(html).toContain("aria-current=\"true\"");
    expect(html).not.toMatch(/is-good|is-bad|is-risk/);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run apps/web/src/features/reports/report-chart-visuals.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 4: Implement**

```tsx
import type { ReportChartPalaceV1, ReportChartSnapshotV1 } from "@lasoviet/contracts";

import { ziweiPresentation } from "../ziwei/ziwei-presentation";

type Translate = (key: string, values?: Record<string, string | number>) => string;

const vi = ziweiPresentation("vi", { strict: false });

// Board positions (row, column) by earthly branch, same layout as the free chart.
const BRANCH_POSITION: Record<string, [number, number]> = {
  snake: [1, 1], horse: [1, 2], goat: [1, 3], monkey: [1, 4],
  dragon: [2, 1], rooster: [2, 4], rabbit: [3, 1], dog: [3, 4],
  tiger: [4, 1], ox: [4, 2], rat: [4, 3], pig: [4, 4],
};

function branchKey(branchId: string): string {
  return branchId.split(".").at(-1) ?? "";
}

export function ReportStarChips({ palace, t }: { palace: ReportChartPalaceV1; t: Translate }) {
  const hasMain = palace.stars.some((star) => star.kind === "main");
  return (
    <ul className="report-chips" aria-label={t("reader.stars_label")}>
      {!hasMain && <li className="report-chip is-empty">{t("reader.no_main_star")}</li>}
      {palace.stars.map((star) => (
        <li key={star.starId} className={star.kind === "main" ? "report-chip is-main" : "report-chip"}>
          {vi.star(star.starId)}
          {star.kind === "main" && star.brightnessId && <small>{vi.brightness(star.brightnessId)}</small>}
          {star.transformationId && (
            <span className={`report-hoa report-hoa-${branchKey(star.transformationId)}`}>{vi.transformation(star.transformationId)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ReportMiniChart({ snapshot, palaceId, t }: { snapshot: ReportChartSnapshotV1; palaceId: string; t: Translate }) {
  const lit = snapshot.palaces.find((p) => p.palaceId === palaceId);
  if (!lit) return null;
  const related = new Set<string>([...lit.triadPalaceIds, lit.oppositePalaceId]);
  return (
    <div className="report-mini-chart" role="img" aria-label={t("reader.chart_thumb_label", { palace: vi.palace(palaceId) })}>
      {snapshot.palaces.map((p) => {
        const [row, column] = BRANCH_POSITION[branchKey(p.earthlyBranchId)] ?? [1, 1];
        const state = p.palaceId === palaceId ? " is-lit" : related.has(p.palaceId) ? " is-related" : "";
        return <span key={p.palaceId} className={`report-mini-cell${state}`} style={{ gridRow: row, gridColumn: column }} />;
      })}
      <span className="report-mini-center" aria-hidden="true" />
    </div>
  );
}

export function ReportDecadalTimeline({ snapshot, t }: { snapshot: ReportChartSnapshotV1; t: Translate }) {
  const current = snapshot.decadal.currentOrdinal;
  return (
    <section className="report-timeline" aria-labelledby="report-timeline-title">
      <h4 id="report-timeline-title" className="report-timeline-title">{t("reader.timeline_title")}</h4>
      <ol className="report-cycles">
        {snapshot.decadal.cycles.slice(0, 9).map((cycle) => {
          const isCurrent = cycle.ordinal === current;
          const isPast = current !== null && cycle.ordinal < current;
          const palace = snapshot.palaces.find((p) => p.palaceId === cycle.palaceId);
          return (
            <li
              key={cycle.ordinal}
              className={`report-cycle${isCurrent ? " is-current" : ""}${isPast ? " is-past" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
            >
              {isCurrent && <span className="report-cycle-tag">{t("reader.timeline_current")}</span>}
              <span className="report-cycle-age">{t("reader.timeline_age", { from: cycle.ageRange[0], to: cycle.ageRange[1] })}</span>
              <span className="report-cycle-palace">
                {vi.palace(cycle.palaceId).replace(/^Cung /, "")}
                {palace ? ` (${vi.branch(palace.earthlyBranchId)})` : ""}
              </span>
              <span className="report-cycle-years">{cycle.yearRange[0]}-{cycle.yearRange[1]}</span>
            </li>
          );
        })}
      </ol>
      <p className="report-timeline-note">{t("reader.timeline_note")}</p>
    </section>
  );
}
```

Check `ziweiPresentation` accepts `{ strict: false }` (`ZiweiPresentationOptions` at `ziwei-presentation.ts:308`); non-strict avoids throwing on an unknown star id inside a paid report.

- [ ] **Step 5: Styles** (append to `report-reader-structure.css`; values ported from `prototype/revamp-2026-09/doc-bao-cao-tuong-tac.css`)

```css
.report-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 14px; padding: 0; list-style: none; }
.report-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--border-hairline); background: var(--surface-panel); font-size: 13.5px; color: var(--text-body); }
.report-chip.is-main { border-color: var(--accent-gold); color: var(--text-heading); font-weight: 500; }
.report-chip.is-empty { font-style: italic; color: var(--text-muted); }
.report-chip small { color: var(--text-muted); font-size: 12px; font-weight: 400; }
.report-hoa { font: 600 10.5px/1 var(--font-ui); padding: 3px 5px; border-radius: 4px; }
.report-hoa-prosperity { background: rgba(79,122,104,.3); color: #9fd1ba; }
.report-hoa-power { background: rgba(206,91,69,.25); color: #f09c87; }
.report-hoa-fame { background: rgba(88,120,170,.3); color: #a9c3ea; }
.report-hoa-obstacle { background: rgba(120,90,160,.3); color: #c8b3ea; }
.report-mini-chart { display: grid; grid-template-columns: repeat(4, 22px); grid-template-rows: repeat(4, 16px); gap: 2px; flex: none; }
.report-mini-cell { border: 1px solid var(--border-hairline); border-radius: 3px; background: var(--surface-deep); }
.report-mini-cell.is-lit { border-color: var(--accent-seal); background: rgba(206,91,69,.2); }
.report-mini-cell.is-related { border: 1px dashed var(--accent-gold); }
.report-mini-center { grid-row: 2 / 4; grid-column: 2 / 4; }
.report-timeline { margin: 8px 0 24px; }
.report-timeline-title { margin: 0 0 10px; font: 600 16px var(--font-ui); color: var(--text-heading); }
.report-cycles { list-style: none; margin: 0; padding: 0 0 6px; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(112px, 1fr); gap: 6px; overflow-x: auto; scroll-snap-type: x mandatory; }
.report-cycle { scroll-snap-align: start; display: grid; gap: 4px; padding: 10px; border-radius: 12px; border: 1px solid var(--border-hairline); background: var(--surface-panel); }
.report-cycle.is-past .report-cycle-age, .report-cycle.is-past .report-cycle-palace { color: var(--text-muted); }
.report-cycle.is-current { border-color: var(--accent-gold); box-shadow: 0 0 0 1px var(--accent-gold) inset; }
.report-cycle-tag { justify-self: start; font: 600 10.5px/1 var(--font-ui); padding: 3px 6px; border-radius: 999px; background: var(--accent-seal); color: var(--pearl-50, #f6f1e6); }
.report-cycle-age { font: 600 16px/1.1 var(--font-display); color: var(--text-heading); }
.report-cycle-palace { font-size: 14px; }
.report-cycle-years { font: 500 12px var(--font-mono); color: var(--text-muted); }
.report-timeline-note { margin: 8px 0 0; font-size: 13.5px; color: var(--text-muted); }
.report-section-visual { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; }
```

- [ ] **Step 6: Wire into the reader**

In `comprehensive-report-reader.tsx`:

```tsx
import { ReportDecadalTimeline, ReportMiniChart, ReportStarChips } from "./report-chart-visuals";
```

After the `v4_1Content` constant:

```tsx
  const chartSnapshot =
    "chartSnapshot" in report && report.chartSnapshot ? report.chartSnapshot : null;
  const snapshotPalace = (palaceId: string | undefined) =>
    chartSnapshot && palaceId ? chartSnapshot.palaces.find((p) => p.palaceId === palaceId) ?? null : null;
  const lifePalace = chartSnapshot?.palaces.find((p) => p.isLife) ?? null;
  const bodyPalace = chartSnapshot?.palaces.find((p) => p.isBody) ?? null;
  const decadalPalace = chartSnapshot && chartSnapshot.decadal.currentOrdinal !== null
    ? snapshotPalace(chartSnapshot.decadal.cycles.find((c) => c.ordinal === chartSnapshot.decadal.currentOrdinal)?.palaceId)
    : null;
  const annualPalace = snapshotPalace(chartSnapshot?.annual.palaceId);
```

Then, only when the snapshot exists (sold reports without one render exactly as after Tasks 2-5):

| Place | Insert directly after the section's `report-section-header` div |
|---|---|
| Overview | `{lifePalace && <ReportStarChips palace={lifePalace} t={t} />}` |
| Core axis | `{bodyPalace && <ReportStarChips palace={bodyPalace} t={t} />}` |
| Current decadal | `{chartSnapshot && <ReportDecadalTimeline snapshot={chartSnapshot} t={t} />}` then `{decadalPalace && <ReportStarChips palace={decadalPalace} t={t} />}` |
| Annual | `{annualPalace && <ReportStarChips palace={annualPalace} t={t} />}` |

In each palace `<summary>` from Task 5, put the mini chart first and add chips at the top of the card body:

```tsx
                          <summary className="report-palace-summary">
                            {chartSnapshot && <ReportMiniChart snapshot={chartSnapshot} palaceId={palace.palaceId} t={t} />}
                            <span className="report-subcard-title">{palace.title}</span>
                            <span className="report-palace-lead">
                              {splitLeadSentence(splitNarrative(palace.narrative)[0] ?? "").lead}
                            </span>
                          </summary>
                          {snapshotPalace(palace.palaceId) && <ReportStarChips palace={snapshotPalace(palace.palaceId)!} t={t} />}
```

and change the summary grid in CSS to `grid-template-columns: auto 1fr` with the lead spanning the second column:

```css
.report-palace-summary { grid-template-columns: auto minmax(0, 1fr); column-gap: 14px; }
.report-palace-summary .report-mini-chart { grid-row: 1 / 3; }
@media (max-width: 600px) { .report-palace-summary .report-mini-chart { display: none; } }
```

`t` from `useTranslations("reports")` already matches the `Translate` shape.

- [ ] **Step 7: Run tests, i18n check, commit**

Run: `pnpm vitest run apps/web/src/features/reports/ && pnpm i18n:check`
Expected: PASS.

```bash
git add apps/web/src/features/reports/report-chart-visuals.tsx apps/web/src/features/reports/report-chart-visuals.test.tsx apps/web/src/features/reports/comprehensive-report-reader.tsx apps/web/messages/vi/reports.json apps/web/messages/en/reports.json apps/web/src/styles/report-reader-structure.css
git commit -m "feat(web): add star chips, mini chart and decadal timeline to the report reader"
```

---

## Task 10: Verification and PR

- [ ] **Step 1: Full local checks**

Run: `pnpm i18n:check && pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass. If `typecheck` fails on `@lasoviet/contracts` types, rebuild it first: `pnpm --filter @lasoviet/contracts build`.

- [ ] **Step 2: Browser check against a real report**

Start web + API locally against a database with at least one ready `ZIWEI-IDENTITY-P0` report (v4_1). Screenshot with Playwright at 1440×900 and 390×844:
1. Overview: paragraphs split, lead line, star chips.
2. 12 palaces: first two open, others closed; "Mở tất cả 12 cung" opens all; mini chart lit on the right palace.
3. Current decadal: timeline shows the current cycle with "Hiện tại"; for the founder's chart the run is Thìn, Mão, Dần (current), Sửu...
4. Scroll through section 04 slowly: TOC marks 04 read and moves to 05 when section 05 reaches 35% of the viewport.
5. Browser print preview: every palace expanded.
6. No horizontal scroll at 390 px: `document.documentElement.scrollWidth - innerWidth === 0`.

Compare with the prototype in "Báo cáo đã bán" mode. Attach the screenshots to the PR.

- [ ] **Step 3: Open the PR**

Branch `feat/fd104-wave1-reader-structure` → `master`. Title: `feat: FD-104 wave 1 report reader structure and chart visuals`. Body: summary, the two spec deviations above, Task 0 findings, screenshots, test commands run. Do not merge; An or Lãm approves.

---

## Terra review brief (independent)

Review the PR against spec §3 and §5 and this plan. Focus:
1. Privacy: `chartSnapshot` carries canonical chart IDs and ranges only; no birth date, time, place, or raw `evidenceKeys` reach the DOM. `ReportChartSnapshotV1Schema` is `.strict()`.
2. Robustness: any bad stored chart/snapshot row yields `chartSnapshot: null` and the report still renders (Task 8 tests).
3. Determinism: `deriveDecadalCycles` returns `null` rather than guessing when direction is ambiguous; the founder's chart yields Thìn, Mão, Dần (25-34, 2017-2026), Sửu.
4. FD-063: no score, rating or good/bad colour on the timeline, chips or chart.
5. Accessibility: `<details>/<summary>` keyboard-operable; timeline `aria-current`; mini chart has `role="img"` with a label; focus visible.
6. Regression: Tier-1 reader and v1/v2 content still render; TOC read count never exceeds total.

## Self-review against the spec

| Spec §5 item | Task |
|---|---|
| Paragraph rendering + fallback grouping | 1, 2 |
| Lead line for old reports | 2 |
| Collapsible palaces, first 2 open, open-all, print expands | 5 |
| Read tracking fix, `readCount ≤ total` | 3 |
| `StarChip`, `MiniChart`, `DecadalTimeline` | 9 |
| Practical direction → action cards | 4 |
| `chartSnapshot` on ready views from frozen data | 6, 7, 8 |
| Per-section refs from `evidenceKeys` | Moved to wave 2 (deviation 1) |
| Full decadal list for new and old reports | 7, derived (deviation 2) |
| Verify `\n\n` in stored data; "23/10" source | 0 |
