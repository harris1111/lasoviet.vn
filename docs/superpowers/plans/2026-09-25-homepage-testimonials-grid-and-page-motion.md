# Homepage testimonials grid and page motion: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Replace the uneven testimonials layout with six equal cards that reveal on scroll and slowly rotate through all 15 quotes. Add quiet, premium scroll and pointer motion across the homepage.

**Founder decisions (2026-09-25):**
- Desktop shows 6 cards (3×2) at a time, and the grid cycles through all 15 quotes.
- Motion level is subtle, premium and understated. No bounce, no spin, nothing loud.

**Architecture:** Two pure, unit-tested modules hold the logic:
- `homepage-v3-testimonial-rotation.ts` decides which quote sits in which slot.
- `homepage-v3-motion-math.ts` holds the parallax and pointer math.

One client component, `HomepageV3Motion`, replaces `HomepageV3Reveal`. It runs the one-shot reveal (existing `[data-reveal]` contract, unchanged), plus scroll parallax, pointer light and the reading-progress bar. Every effect writes CSS custom properties only, and CSS turns them into `transform` or `opacity`. Nothing animates layout.

**Tech stack:** Next.js 16 client components, CSS in `apps/web/src/styles/`, vitest from the repo root, Playwright (already in `node_modules`) for browser QA. No new dependency.

**Branch:** `feat/homepage-testimonials-grid-motion`, cut from `origin/master` at `9bdc632`. Open a PR to `master`. Do not merge or deploy without An or Lãm.

## Rules for every motion
| Rule | Value |
|---|---|
| Duration | 300 to 600 ms; rotation crossfade 650 ms total |
| Easing | `cubic-bezier(0.2, 0.7, 0.2, 1)` (named `--hv3-ease` in CSS) |
| Distance | reveal 14 px; parallax at most 24 px; card lift 3 px; chart tilt at most 3°; magnetic button pull at most 4 px |
| Loops | Only the ticker and the testimonial rotation (every 6 s, one card at a time). Both can be paused. |
| Pointer effects | Only under `@media (hover: hover) and (pointer: fine)` |
| Reduced motion | `prefers-reduced-motion: reduce`: the script sets nothing, CSS drops all transitions, rotation does not start |
| Performance | One passive `scroll` listener and one `pointermove` handler, both batched through `requestAnimationFrame`. Effects only run on elements that are on screen (IntersectionObserver). Only `transform` and `opacity` change. `will-change` is set only while an element is active. |

## File map
| File | Change |
|---|---|
| `apps/web/src/features/homepage-v3/homepage-v3-testimonials.ts` | Shorter excerpts, `EXCERPT_MAX`, `ROTATION_QUEUE` |
| `apps/web/src/features/homepage-v3/homepage-v3-testimonials.test.ts` | Excerpt length and queue tests |
| `apps/web/src/features/homepage-v3/homepage-v3-testimonial-rotation.ts` (+ `.test.ts`) | New: pure rotation state |
| `apps/web/src/features/homepage-v3/homepage-v3-testimonials-section.tsx` | Rewrite: 6-slot grid, rotation, pause control, mobile row |
| `apps/web/src/features/homepage-v3/homepage-v3-motion-math.ts` (+ `.test.ts`) | New: `parallaxOffset`, `pointerVector`, `clamp` |
| `apps/web/src/features/homepage-v3/homepage-v3-motion.tsx` | New: replaces `homepage-v3-reveal.tsx` (deleted) |
| `apps/web/src/app/[locale]/page.tsx` | Use `HomepageV3Motion`; add the progress bar element |
| `apps/web/src/features/homepage-v3/*.tsx` | Add `data-parallax`, `data-glow`, `data-magnetic`, `data-reveal="title"` attributes (markup only) |
| `apps/web/src/styles/homepage-v3-motion.css` | New: all motion CSS; imported in `global.css` after `homepage-v3.css` |
| `apps/web/src/styles/homepage-v3.css` | Replace the testimonials block |
| `apps/web/messages/{vi,en}/homepage-v3.json` | `testimonials.pause`, `testimonials.play`, `testimonials.rotationLabel` |
| `apps/web/src/features/homepage-v3/homepage-v3-qa-a11y.test.tsx`, `tests/web/homepage-v3-performance.test.ts` | Update for the new markup |

---

## Task 1: Shorter, even excerpts (TDD)
Every excerpt stays one contiguous passage from the founder's verbatim quote. The full text is unchanged. The "80–90%" sentence (05) and "giải quyết triệt để" (14) never appear on a card.

| id | New excerpt (verbatim) | chars |
|---|---|---|
| 01 | Không hề phán bừa mà có luận điểm logic, chỉ rõ nguyên nhân – hệ quả. | 69 |
| 02 | Bản luận giải xâu chuỗi được toàn bộ bức tranh cuộc đời mình, từ điểm nghẽn tính cách cho tới chiến lược đường dài trong sự nghiệp. | 131 |
| 03 | Cái hay là không hù dọa tam tai hay sao xấu, mà hướng dẫn cách ứng biến, tu dưỡng. | 82 |
| 04 | Cách dùng từ hiện đại, văn minh, dễ hiểu chứ không dùng thuật ngữ cổ làm người trẻ bị ngợp. | 91 |
| 05 | Luận giải sâu sắc, đáng tin cậy hơn hẳn mặt bằng chung. | 55 |
| 06 | Chi tiết nhưng vẫn giữ được sự tinh tế, hướng người đọc về sự chữa lành và hoàn thiện bản thân. | 95 |
| 07 | Độ nhất quán từ đầu đến cuối rất cao, không bị 'tiền hậu bất nhất' như các trang dịch tự động. | 94 |
| 08 | Ngôn ngữ trang trọng, học thuật chuẩn mực, kế thừa đúng tinh thần Nam phái và chính tông Á Đông mà không hề pha tạp dị đoan. | 124 |
| 09 | Điểm vượt trội nhất của Lá Số Việt là trải nghiệm đọc cực kỳ mượt mà. | 69 |
| 10 | Chi tiết và mang tính ứng dụng thực chiến cực kỳ cao. | 53 |
| 11 | Giọng văn văn minh, khách quan, mang tính khai sáng hơn là bói toán may rủi. | 76 |
| 12 | Cái hay nhất của Lá Số Việt là tính liên kết cung. | 50 |
| 13 | Tôi lấy lá số cho cả hai đứa con trên Lá Số Việt. Đọc bản luận giải thấy nhẹ lòng hẳn ra. | 89 |
| 14 | Độ sắc nét và nhất quán vượt trội hoàn toàn. | 44 |
| 15 | Bản luận giải của Lá Số Việt vượt qua được sự khó tính đó của tôi nhờ tính mạch lạc và lập luận chặt chẽ. | 105 |

- [ ] **Step 1: add failing tests** to `homepage-v3-testimonials.test.ts`:

```ts
import { EXCERPT_MAX, ROTATION_QUEUE } from "./homepage-v3-testimonials";

it("keeps every card excerpt short enough for equal cards", () => {
  for (const item of TESTIMONIALS) expect(item.excerpt.length, item.id).toBeLessThanOrEqual(EXCERPT_MAX);
});

it("never puts the unverifiable figures on a card", () => {
  for (const item of TESTIMONIALS) {
    expect(item.excerpt).not.toMatch(/80–90%|triệt để/);
  }
});

it("rotation queue lists all 15 ids once, opening with 13, 12, 09, 01", () => {
  expect([...ROTATION_QUEUE].sort()).toEqual(TESTIMONIALS.map((item) => item.id).sort());
  expect(ROTATION_QUEUE.slice(0, 4)).toEqual(["13", "12", "09", "01"]);
});
```

- [ ] **Step 2:** run `pnpm vitest run apps/web/src/features/homepage-v3/homepage-v3-testimonials.test.ts`. Expect FAIL, because `EXCERPT_MAX` is not exported yet.
- [ ] **Step 3:** in `homepage-v3-testimonials.ts`:
  - Replace each `excerpt` with the table above.
  - Add `export const EXCERPT_MAX = 135;`.
  - Add `export const ROTATION_QUEUE: readonly string[] = ["13", "12", "09", "01", "02", "06", "04", "10", "03", "11", "07", "08", "15", "05", "14"];`. The first six cover all four groups.
  - Delete `FEATURED_TESTIMONIAL` and `SECONDARY_TESTIMONIALS`, and update the old test that used them.
- [ ] **Step 4:** run the test again. Expect PASS.
- [ ] **Step 5:** commit `feat(web): shorter verbatim testimonial excerpts and rotation queue`.

## Task 2: Rotation logic (TDD)
The grid always shows 6 slots. Every tick, **one** slot fades to the next quote not currently on screen. Slots change in the order `[4, 1, 5, 0, 3, 2]`, so the change moves around the grid instead of sweeping left to right. After 15 ticks every quote has been shown.

- [ ] **Step 1: write `homepage-v3-testimonial-rotation.test.ts`:**

```ts
import { describe, expect, it } from "vitest";
import { advanceRotation, createRotation, SLOT_ORDER } from "./homepage-v3-testimonial-rotation";

const QUEUE = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

describe("testimonial rotation", () => {
  it("starts with the first six ids in order", () => {
    expect(createRotation(QUEUE, 6).slots).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("replaces one slot per tick, following SLOT_ORDER", () => {
    const next = advanceRotation(createRotation(QUEUE, 6));
    expect(next.changedSlot).toBe(SLOT_ORDER[0]);
    expect(next.slots[SLOT_ORDER[0]]).toBe("g");
    expect(next.slots.filter((id, i) => id !== ["a", "b", "c", "d", "e", "f"][i])).toHaveLength(1);
  });

  it("never shows the same id twice at once", () => {
    let state = createRotation(QUEUE, 6);
    for (let i = 0; i < 40; i++) {
      state = advanceRotation(state);
      expect(new Set(state.slots).size).toBe(6);
    }
  });

  it("shows every id within one full cycle", () => {
    let state = createRotation(QUEUE, 6);
    const seen = new Set(state.slots);
    for (let i = 0; i < QUEUE.length; i++) {
      state = advanceRotation(state);
      state.slots.forEach((id) => seen.add(id));
    }
    expect(seen.size).toBe(QUEUE.length);
  });

  it("uses fewer slots when asked (tablet: 4)", () => {
    const state = advanceRotation(createRotation(QUEUE, 4));
    expect(state.slots).toHaveLength(4);
    expect(state.changedSlot).toBeLessThan(4);
  });
});
```

- [ ] **Step 2:** run the test. Expect FAIL, because the module is missing.
- [ ] **Step 3: implement `homepage-v3-testimonial-rotation.ts`:**

```ts
/** Order in which grid slots change, so the motion moves around the 3×2 grid instead of sweeping left to right. */
export const SLOT_ORDER: readonly number[] = [4, 1, 5, 0, 3, 2];

export type RotationState = {
  queue: readonly string[];
  slots: string[];
  /** Next queue index to bring in. */
  cursor: number;
  /** Position in SLOT_ORDER for the next change. */
  tick: number;
  changedSlot: number | null;
};

export function createRotation(queue: readonly string[], slotCount: number): RotationState {
  const count = Math.min(slotCount, queue.length);
  return { queue, slots: queue.slice(0, count), cursor: count % queue.length, tick: 0, changedSlot: null };
}

export function advanceRotation(state: RotationState): RotationState {
  const { queue, slots } = state;
  if (queue.length <= slots.length) return { ...state, changedSlot: null };
  const order = SLOT_ORDER.filter((slot) => slot < slots.length);
  const slot = order[state.tick % order.length] ?? 0;
  let cursor = state.cursor;
  // Skip ids already on screen so a quote is never shown twice at once.
  while (slots.includes(queue[cursor] ?? "")) cursor = (cursor + 1) % queue.length;
  const next = [...slots];
  next[slot] = queue[cursor] ?? next[slot]!;
  return { queue, slots: next, cursor: (cursor + 1) % queue.length, tick: state.tick + 1, changedSlot: slot };
}
```

- [ ] **Step 4:** run the test. Expect PASS.
- [ ] **Step 5:** commit `feat(web): pure rotation state for the testimonials grid`.

## Task 3: Testimonials section rewrite
Rewrite `homepage-v3-testimonials-section.tsx`. It keeps the header, the dialog (Esc and focus return, unchanged), the "Thêm góc nhìn" expander with the 5 filters, and the "Bắt đầu với lá số của bạn" link.

**Layout**
- Desktop (≥1024 px): `grid-template-columns: repeat(3, 1fr); grid-auto-rows: 1fr; gap: 16px`. Show 6 cards.
- Tablet (768–1023 px): 2 columns, 4 cards.
- Card: `display: grid; grid-template-rows: auto 1fr auto; min-height: 300px` (label, quote, footer). The footer stays pinned to the bottom, and every card in a row has the same height. Quote size is `clamp(17px, 1.35vw, 19px)`, line-height 1.6. The existing red accent bar goes on the first card only.
- Mobile (<768 px): one horizontal row of all 15 cards, each `flex: 0 0 min(82vw, 320px)` with a fixed `min-height: 300px`, scroll-snap, and ← → buttons.

**Rotation (desktop and tablet)**
- The state starts as `createRotation(ROTATION_QUEUE, slotCount)`, where `slotCount` comes from `matchMedia("(min-width: 1024px)")` (6, otherwise 4).
- A `window.setInterval(6000)` calls `advanceRotation`. It runs only while **all** of these hold:
  - The grid is on screen (IntersectionObserver, threshold 0.35).
  - `document.visibilityState === "visible"`.
  - No pointer hover and no focus inside the grid.
  - The dialog is closed and the expander is closed.
  - The visitor has not pressed Pause.
  - The visitor does not prefer reduced motion.
- The changed card leaves over 250 ms (`opacity 0`, `translateY(-6px)`, `filter: blur(2px)`), then the new quote enters over 400 ms from `translateY(8px)`. Implement this as `key={slotId}` on the card's inner content, plus `data-phase="out" | "in"` driven by a 250 ms timeout. The card frame never moves, so the layout does not shift.
- Pause/Play button: 44 px, placed next to the section actions, with `aria-pressed` and labels `t("pause")` / `t("play")`. WCAG 2.2.2 requires this for moving content that lasts more than 5 s.
- The grid has `aria-live="off"`, so rotating quotes are not announced. Every quote is still reachable through "Thêm góc nhìn" and the dialog.

**Mobile auto-advance**
- Every 6 s the row scrolls one card (`scrollBy`, smooth), wrapping to the start at the end. The same pause rules apply.
- The first `pointerdown`, `touchstart` or `wheel` inside the row stops auto-advance for the rest of the visit, so the page never fights the reader's finger.

**Reveal on scroll**
- Each card has `data-reveal` with `--i` 0–5. Existing CSS gives the stagger (80 ms steps, translateY 14 px, 360 ms), and it plays once.
- The heading uses `data-reveal="title"` (see Task 5).

**Filters**
- The expanded list keeps its filters. When a filter changes, cards fade in with a 40 ms stagger (`@keyframes hv3-tt-in`, 300 ms).

- [ ] **Step 1:** add i18n keys:
  - VI: `"pause": "Tạm dừng", "play": "Tiếp tục", "rotationLabel": "Lời người đọc, tự đổi sau vài giây"`
  - EN: `"pause": "Pause", "play": "Play", "rotationLabel": "Reader notes, changing every few seconds"`
- [ ] **Step 2:** rewrite the component as above. Replace the `.hv3-tt-*` CSS block in `homepage-v3.css` (remove `.hv3-tt-featured`, `.hv3-tt-side` and `.hv3-tt-track` at 1200 px).
- [ ] **Step 3:** run `pnpm --filter @lasoviet/web typecheck`, `pnpm exec eslint apps/web/src/features/homepage-v3` and `pnpm i18n:check`. Expect a clean result.
- [ ] **Step 4:** browser check with Playwright at 1440 and 390, dark and light:
  - 6 equal cards (compare the `getBoundingClientRect().height` of each card in a row).
  - One card changes after 6 s.
  - Rotation stops on hover and on Pause.
  - Nothing moves with `reducedMotion: "reduce"`.
  - The mobile row stops after a manual swipe.
  - No horizontal page scroll.
- [ ] **Step 5:** commit `feat(web): equal testimonial cards that reveal on scroll and rotate through all 15 quotes`.

## Task 4: Motion math (TDD)
- [ ] **Step 1: write `homepage-v3-motion-math.test.ts`:**

```ts
import { describe, expect, it } from "vitest";
import { clamp, parallaxOffset, pointerVector } from "./homepage-v3-motion-math";

describe("motion math", () => {
  it("clamps", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });

  it("parallax is 0 when the element is centred in the viewport and capped at ±max", () => {
    expect(parallaxOffset({ top: 400, height: 100 }, 900, 24)).toBeCloseTo(0, 5);
    expect(parallaxOffset({ top: 2000, height: 100 }, 900, 24)).toBe(24);
    expect(parallaxOffset({ top: -2000, height: 100 }, 900, 24)).toBe(-24);
  });

  it("pointer vector is -1..1 from the element centre", () => {
    const box = { left: 100, top: 100, width: 200, height: 100 };
    expect(pointerVector(200, 150, box)).toEqual({ x: 0, y: 0 });
    expect(pointerVector(300, 200, box)).toEqual({ x: 1, y: 1 });
    expect(pointerVector(0, 0, box)).toEqual({ x: -1, y: -1 });
  });
});
```

- [ ] **Step 2:** run the test. Expect FAIL.
- [ ] **Step 3: implement:**

```ts
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Offset in px, 0 when the element's centre is at the viewport centre, capped at ±max. */
export function parallaxOffset(box: { top: number; height: number }, viewportHeight: number, max: number): number {
  const centre = box.top + box.height / 2;
  const progress = (centre - viewportHeight / 2) / viewportHeight;
  return clamp(progress * max * 2, -max, max);
}

/** Pointer position relative to the element centre, each axis -1..1. */
export function pointerVector(x: number, y: number, box: { left: number; top: number; width: number; height: number }) {
  return {
    x: clamp(((x - box.left) / box.width) * 2 - 1, -1, 1),
    y: clamp(((y - box.top) / box.height) * 2 - 1, -1, 1),
  };
}
```

- [ ] **Step 4:** run the test. Expect PASS.
- [ ] **Step 5:** commit `feat(web): parallax and pointer math for homepage motion`.

## Task 5: `HomepageV3Motion` and page wiring
`homepage-v3-motion.tsx` replaces `homepage-v3-reveal.tsx`. It keeps the reveal code exactly as it is and adds four behaviours:
- **Title reveal:** `[data-reveal="title"]` uses the same observer. CSS reveals the heading with `clip-path: inset(0 0 100% 0)` → `inset(0)` plus a 10 px rise over 600 ms.
- **Parallax:** for each `[data-parallax="<max px>"]` on screen, set `--hv3-py` to `parallaxOffset(...)` rounded to 0.5 px. It runs on one passive scroll listener plus `requestAnimationFrame`, and only for elements an IntersectionObserver reports as on screen.
- **Pointer light and lift** (fine pointer only): for `[data-glow]`, `pointermove` sets `--hv3-mx` / `--hv3-my` (0–100%). CSS draws `radial-gradient(240px circle at var(--hv3-mx) var(--hv3-my), color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)` in a `::after` layer, and adds `translateY(-3px)` and a slightly brighter border on hover. `pointerleave` resets both.
- **Tilt and magnetic:**
  - `[data-tilt]` (the hero chart face) gets `--hv3-rx` / `--hv3-ry` = `pointerVector` × 3°. CSS applies `perspective(900px) rotateX(...) rotateY(...)`.
  - `[data-magnetic]` (the hero submit, the closing CTA and the header "Lập lá số" buttons) gets `translate(vector × 4px)`.
  - Both ease back over 400 ms on leave.
- **Reading progress:** a 2 px gold bar, `.hv3-progress`, fixed at the top above the sticky header (`z-index: 21`). It uses `transform: scaleX(var(--hv3-progress))` and is updated from the same scroll frame.
- The script does nothing when `prefers-reduced-motion: reduce` is set or `IntersectionObserver` is missing. In that case it only marks reveals as in, exactly like today. All listeners are removed on unmount.

**Where the attributes go**
| Element | Attributes |
|---|---|
| Hero `.hv3-chart-paint` | `data-parallax="16"` |
| Hero `.hv3-chart-face` | `data-tilt` |
| Hero submit `.hv3-cta` | `data-magnetic` |
| Story art | `data-parallax="20"` |
| USP section (drives `::before` via `--hv3-py`) | `data-parallax="24"` |
| USP cards, Needs cards, Explore palace buttons, testimonial cards (desktop) | `data-glow` |
| Every section `h2.hv3-h2` | `data-reveal="title"` |
| Closing CTA `.hv3-final-cta-bg` | `data-parallax="12"` (edges drift inward) |
| Closing CTA button | `data-magnetic` |
| FAQ items, compare rows | `data-reveal` with `--i` |

- [ ] **Step 1:** create `homepage-v3-motion.tsx` and `styles/homepage-v3-motion.css`, add `@import "./homepage-v3-motion.css";` after `homepage-v3.css` in `global.css`, and delete `homepage-v3-reveal.tsx`.
- [ ] **Step 2:** in `page.tsx`, replace `<HomepageV3Reveal />` with `<HomepageV3Motion />` and add `<div className="hv3-progress" aria-hidden="true" />` as the first child of `.hv3`.
- [ ] **Step 3:** add the attributes from the table. This is markup only, with no logic changes to any section.
- [ ] **Step 4:** motion CSS rules:
  - All effects sit inside `@media (prefers-reduced-motion: no-preference)`.
  - Pointer effects are also inside `@media (hover: hover) and (pointer: fine)`.
  - Transforms compose via `translate` / `rotate` / `scale` individual properties, so they do not overwrite existing `transform` rules.
- [ ] **Step 5:** run typecheck, eslint, `pnpm i18n:check` and `pnpm vitest run tests/web tests/i18n apps/web`. Update the tests:
  - `homepage-v3-qa-a11y.test.tsx`: the reduced-motion rule for the marquee stays; add an assertion that `homepage-v3-motion.css` wraps effects in `prefers-reduced-motion: no-preference`.
  - `tests/web/homepage-v3-performance.test.ts`: assert that the motion script registers scroll with `{ passive: true }` and uses `requestAnimationFrame`.
- [ ] **Step 6:** commit `feat(web): subtle scroll and pointer motion across the homepage`.

## Task 6: Verify and hand over
- [ ] `pnpm --filter @lasoviet/web typecheck`, eslint (0 errors), `pnpm i18n:check`, `node scripts/check-public-content.mjs`, `node scripts/public-claim-check.mjs`, and `pnpm vitest run tests/web tests/i18n apps/web`.
- [ ] Performance: in a Playwright trace at 1440, scroll the full page and confirm no long task over 50 ms comes from the motion script, and that layout shift stays 0 during the testimonial rotation (`PerformanceObserver` `layout-shift`).
- [ ] Browser QA at 360, 390, 768 and 1440, in dark and light, in both VI and EN, with reduced motion both on and off. Check keyboard focus with the dialog open, rotation paused on focus, and no horizontal scroll.
- [ ] Record two short clips for the founder with Playwright `recordVideo`: desktop scroll plus pointer, and mobile scroll plus swipe.
- [ ] Push the branch and open a PR to `master` listing what changed and anything skipped. Do not merge or deploy without An or Lãm.

## Deliberately left out
- Ticker speed-up on scroll. Changing the animation duration mid-loop makes the ticker jump, which works against "smooth, natural".
- A motion library (Framer Motion, GSAP). The effects above fit in about 150 lines of our own code with no bundle cost.
- Autoplay on the full 15-card list after "Thêm góc nhìn" opens. Once the visitor asks to read everything, nothing should move under them.
