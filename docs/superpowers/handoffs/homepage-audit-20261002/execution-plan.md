# Lá Số Việt Homepage — Claude Sonnet Implementation Plan

> **For agentic workers:** Execute this plan task by task. Use the repository's installed execution workflow, such as `superpowers:executing-plans`, if available; do not install a plugin just to execute it. This handoff selects sequential implementation by one Claude Sonnet worker. Checkboxes track verified work, not intentions. The Plan plugin was used to prepare this document; no product implementation has been performed here.

**Goal:** Ship a reviewable homepage branch that makes chart creation clear on phones, reduces wasted height and improves readability while preserving Trời Nam, real quotations and the complete birth-to-wizard contract.

**Architecture:** Keep the server page and its interactive client islands. Use scoped plain CSS, one mounted birth form, compact optional shared-component variants, native disclosures where allowed and the existing Three.js fallback/lifecycle. The comparison evidence is permanently visible; testimonials use a bounded-window carousel moving right to left. Preserve business logic and asset identity; change presentation in small verified increments.

**Tech stack:** Existing Next.js 16 App Router, React, next-intl, TypeScript, plain CSS custom properties and Three.js 0.186. No Tailwind, GSAP, Motion, new analytics or new dependency is prescribed.

**Spec:** `lasoviet-homepage-ui-audit-2026-10-02.md`, especially Parts C–H, plus `HANDOFF.md` and `docs/13-brand-experience-guideline.md`, `docs/22-art-direction.md`, `docs/24-light-theme-color-spec.md`. The bundle contains the original evidence pack under `source/`, `docs/` and `screenshots/`. `source/` is a reference snapshot, not a buildable application or the working repository.

**Task list target:** `tasks/todo.md`. If the real repository explicitly requires an external tracker, map these exact task IDs there and retain one authoritative status list. Do not overwrite a different incomplete plan.

## 1. Execution contract

The user requested a plan that Sonnet can execute immediately. Proceed with the recommended composition and mobile form disclosure on an isolated implementation branch. Routine CSS choices and fixing failures inside an approved task do not need repeated questions. This handoff does **not** authorise merge, deployment or external messages.

**Authoritative clarification, 2026-10-02:** Only the comparison table must not collapse. Keep the initial audit's other progressive disclosures: mobile form and secondary methods may start closed; FAQ opens q1 initially and the other questions start closed. Testimonials autoplay from right to left, retain the three-line excerpt card/full-quote dialog and all-reader expansion. The earlier broad “no hide/collapse anywhere” instruction was explicitly withdrawn. Do not render all full quotations/all FAQs/all Needs paths at once. This clarification overrides audit PR4's comparison disclosure and PR5's static-gallery mechanics, not the entire original UI composition.

For motion, this right-to-left carousel is the one automatic marketing track; the topic ribbon remains static. It lets visitors discover reader evidence, stops while reading/interacting, and fully stops in reduced motion. Do not reintroduce a second marquee.

The temporary lacquer homepage policy is an exception to the earlier both-theme direction, FD-088. Prepare that change in a separately reversible commit for owner review. Keep global theme preference and other light-ready pages intact. Do not silently record FD-088 as revoked or claim production approval. If the owner explicitly rejects the exception, omit only that commit, record the remaining mixed-skin gate and continue independent tasks. Do not invent a paper-art redesign.

Read this plan and the audit first; then implement **one task at a time**. Do not apply all eight audit diffs in one operation. They were textually checked against the supplied snapshot, but were not built in a complete Next.js repository. Their intent, copy and geometry are authoritative; adapt syntax/context to the inspected real branch. This plan's refinements override the corresponding audit patch mechanics.

At each task: load its referenced files → inspect the current implementation → reproduce the relevant defect → make the smallest scoped change → run focused verification → inspect the diff → update the task ledger. For behavior changes, add a regression test that fails before the change and passes after it. Pure spacing/copy changes use computed-style and screenshot checks; do not create tests that merely repeat a CSS declaration.

Use a single temporary correction region in `troi-nam.css`, clearly labelled with the audit date. Update that region on retries rather than appending duplicate overrides. Do not move distant selector declarations or purge unseen state rules. Cleanup later removes only branches intentionally retired by this plan.

### Precedence and narrow stop conditions

1. Current explicit owner instructions, then the real repository's applicable `AGENTS.md`/`CLAUDE.md`.
2. HANDOFF business/form/route/quote constraints and approved brand decisions.
3. This execution plan, including corrections to the audit mechanics.
4. Audit component specifications, copy cut sheet and reference diffs.
5. Current source wins for newer behavior not addressed by this plan; preserve it and document the adaptation.

Stop only the dependent task when a required interface is missing, a newer behavior conflicts with the spec, a quote/field-order change is necessary, or the verified fix requires an unapproved dependency. State the exact file, conflict and minimal decision required. Continue tasks that do not depend on that decision. Missing hardware/field metrics are evidence gates; they do not prevent preparing and testing the branch locally. Missing the **actual repository** blocks implementation: never bootstrap an app from the partial `source/` directory.

## 2. Global constraints and exact targets

| Contract | Required value/behavior |
|---|---|
| Product/brand | Preserve logo, gold/lacquer palette, approved painted assets and world-as-stage narrative. No new image needed. |
| Marketing | Tighten length/hierarchy only. No disclaimers, neutralising claims or inventing benefits. Apply exact proposed VI/EN text in audit Part D. |
| Real reader data | `homepage-v3-testimonials.ts` remains byte-for-byte unchanged; preserve all 15 excerpts, full quotes, names, locations and attributions. |
| Birth form | Same mounted hook/subtree, fields, names, order, validation, error linkage, draft format, concern handling and wizard route `/tao-la-so/tu-vi`. No second form. |
| Routes/SEO | `/`, `/en`; retain generated metadata from route registry/public content. No page-local SEO rewrite. |
| IDs | `lap-la-so`, `la-so-mau`, `dich-vu`, `nhu-cau`, `so-sanh`, `gia-tri`, `cau-hoi`, `faq`; also retain useful `bo-mon` and `cta-cuoi`. Each occurs once. |
| Outer rhythm | 48 px per side phone; 64 at ≥768; 80 at ≥1024. Nested `.hv3-container` block padding 0. Gutters 20/32/48. Hero has its own 32 px phone top padding. |
| Readability | Body ≥16 px, line-height 1.5–1.6, measure ≤64ch; metadata 14 px allowed. Body contrast ≥4.5:1, large text ≥3:1 over actual composite pixels. |
| Legibility treatment | #0F0D0A at alpha .86 throughout text bounds; 32 px feather outside them. Pearl-200 #DCD4C3 body. Supplementary shadow is not a contrast fix. |
| Shape | Controls 12 px; panels/dialog/form 16; thumbnail 8; pill/circle 999. No universal radius rule. |
| Input/touch | ≥44×44 effective targets and ≥8 px between adjacent controls; time segments ≥48 px, mobile hero primary ≥52. Test hit area, not checkbox input alone. |
| Responsive matrix | VI and EN at 360,390,430,768,1024,1440. Hero breakpoint 880; carousel slots 768/1024; comparison table stays at its existing 1180 breakpoint. Do not unify these blindly. |
| Phone hero | Two H1 lines, support ≤20 whitespace units, four copy elements, primary action in first 390×844 and 360×800 viewport. |
| Page budget | Revised planning ceiling sum 9,722 px (11.52 screens); release ceiling remains 10,128 px = 12 screens at 390×844; form-expanded ceiling 10,950. These are targets, not rendered measurements. |
| Phone main copy | Aim for the original 900–1,100 units; revised settled-state ceiling 1,250 to accommodate always-visible comparison evidence. During carousel transition only, ≤1,350 including the incoming card. Test every queue window with initial LSV selected. Longest other competitor: ≤1,350 settled /1,450 in transition. No filler if lower. |
| Default states | Phone form closed; methods closed; comparison evidence always visible with initial LSV selected on phones; FAQ q1 open/others closed; carousel autoplay enabled unless paused/reduced/offscreen. |
| Carousel | Right-to-left advance every 6,000 ms while eligible; transform transition 600 ms; 16 px gap. Phone renders two queue records (one full card + preview), tablet two, desktop three; one incoming record only during transition. No permanently cloned 15-item tracks. |
| Density | Marketing H2 ≤8 units and lead ≤25 unless the audit states an exception; ≤4 uppercase marketing microlabels. No em/en-dash separators in marketing. Real quotations are exempt and unchanged. |
| Start intent | VI `Lập lá số miễn phí`; EN `Start my free chart`. Form submit is a different intent: `Tiếp tục lập lá số`; keep its EN equivalent from Part D. Demo/sample/Kinh Dịch actions remain distinct. |
| Three.js | Keep existing DPR 1.5 high / 1 low, dynamic loading, cancellation, visibility/intersection pause, static fallback and resource disposal. No claim that caps prove device performance. |
| Performance | Representative Android/4G release targets LCP <2.5 s, CLS <.1, INP <200 ms. Label lab vs field. One trace cannot establish field p75. |

### Review focus: five failure conditions to test

1. Restored birth details/concern must survive disclosure opening, responsive switching and returning from the wizard: Tasks 03–05.
2. Native/header/deep-link and modified-click paths must open/reach the form without focus or scroll races: Task 04.
3. Compact shared variants must preserve non-TN defaults; all 15 readers stay reachable, carousel cannot remove a focused card and modal focus returns correctly: Tasks 05–07.
4. Stored light theme, mid-session reduced motion, unavailable WebGL and late rejected assets must retain readable controls/content: Tasks 12–14 and 16.
5. An idle/hidden/resumed world must not falsely downgrade, render stale resize/debug state or leak resources: Task 14 and device gate 18.

## 3. File ownership and verification conventions

All paths below are relative to the **actual repository root**. `TN` means `apps/web/src/features/troi-nam/`; `HV` means `apps/web/src/features/homepage-v3/`; `CSS` means `apps/web/src/styles/troi-nam.css`; `PAGE` means `apps/web/src/app/[locale]/page.tsx`. These abbreviations never refer to files in the bundle's read-only `source/` folder.

| File family | Responsibility; preserve |
|---|---|
| PAGE + `components/site-header.tsx` | Composition, homepage-only CTA label and canonical locale navigation; preserve RSC and metadata. |
| TN hero + HV go-wizard | Presentation disclosure and explicit opening/focus bridge; preserve birth form/draft APIs. |
| HV needs/compare/gallery + TN wrappers | Optional compact/full-evidence/carousel presentation; preserve selection, routes and existing default consumers. |
| Messages `{vi,en}/{homepage-v3,troi-nam}.json` | Exact marketing/form label strings from audit Part D; no broad translation rewrite. |
| CSS + real reduced-motion guard file | Scoped rhythm, legibility, controls and component variants; preserve other pages. |
| TN world stage/scene/runtime | Existing lifecycle and render cadence; dirty optimization only after tests. |
| Birth profile/draft/concern files | Read/test their contract. No implementation edits expected. |
| `tasks/verification.md` | Exact run commands, baseline, per-task evidence, external gates and branch handoff. |

Test files must use the real runner and configured test directory. Task 00 resolves these identifiers **once**: `HOME_E2E` = existing related homepage browser spec, else `troi-nam-homepage.spec.ts` under the configured browser test directory; `WORLD_TEST` = existing scene/runtime regression file, else `troi-nam-world-render.spec.ts` beside the repository's existing world tests. Record their exact repository paths. If the runner cannot discover those paths, fix the mapping before writing tests; do not silently introduce a framework.

Every later `Run FOCUSED`, `Run TYPES`, `Run LINT`, `Run BUILD` refers to the full command strings recorded in Task 00, with required flags and working directory. The evidence ZIP contains no package manifest/runner configuration, so guessing `npm test`, `pnpm --filter web` or a test path here would be unreliable. Command discovery is an explicit first deliverable, not delegated guesswork.

### Task 00 — Bind the real repository and capture a baseline

**Depends on:** none. **Scope:** read-only code; task documents. **Files:** applicable agent rules, root/web manifests, lockfile, test/CI configuration; create/update `tasks/verification.md` only.

**Consumes:** actual repository checkout, original spec and audit. **Produces:** base SHA, isolated branch/workspace, command/path mapping, baseline evidence and protected-file checksums.

- [ ] Read root and nested agent rules; inspect `git status --short` and `git rev-parse HEAD`. Preserve existing user edits. Use the repository's isolation convention; do not switch/delete work behind the user.
- [ ] Read `package.json`, `apps/web/package.json`, the actual lockfile, browser/unit-test configuration and CI commands. Record exact install-if-needed, dev, focused test, typecheck, lint and production build commands and their working directories. Use the pinned package-manager version. Do not alter lockfile/CI to get a green run.
- [ ] Resolve HOME_E2E and WORLD_TEST as above. Inspect the real imported `troi-nam-reduced-motion-guards.css`; it is referenced by supplied global.css but absent from the ZIP. Check whether each audit change already exists on HEAD.
- [ ] Run the current required checks. Record existing failures separately with logs; do not attribute them to this change or hide them. Capture VI/EN at 390 and 1440 in default state, page height/main units and current form-to-wizard behavior.
- [ ] Record checksums and contract evidence for quote data, birth form/draft/concern files and metadata generation. Read actual enum/storage schemas; use existing draft fixtures, not an invented localStorage key or an invented concern value.

**Acceptance:** (1) Full repository and actual commands/runner paths known. (2) Baseline and protected contracts recorded. (3) No unrelated edit overwritten and no app bootstrapped from the pack.

**Verify:** read the resulting command table; execute each available baseline command and record exit status. If no runnable repository, stop implementation here with the concrete missing access.

### Task 01 — Give spacing and painted copy one owner

**Depends on:** 00. **PR:** 1. **Files:** CSS; real reduced-motion guard stylesheet only if its inspected scope needs it. **Reference:** audit PR1, Parts B/E.

**Interface:** scoped TN token authority; no shared global skin change.

- [ ] Reproduce outer/inner padding stack with computed styles. Apply 48/64/80 outer spacing and 20/32/48 gutters; reset nested containers to 0. Preserve world bleed while assigning the content inset exactly once.
- [ ] Apply readable pearl body and one local .86 lacquer scrim to Story/Explore copy. Its fully opaque-alpha interior covers the whole text rectangle; feather extends 32 px outside. Keep decorative art continuous; no rounded card around the prose.
- [ ] Add pseudo-element and pending-reveal reduced-motion guards only where the real cascade lacks them. Inspect whether the existing Story panel scrim combines with the new treatment; choose one readability treatment instead of an accidental darker double overlay.
- [ ] Verify selected, focused and WebGL-fallback states; capture same-pose before/after at 390 and 1440 and computed padding at 768/1024. Update the correction region, never append a duplicate retry block.

**Acceptance:** (1) Outer/inner spacing exactly matches tokens. (2) Text rectangle reliably backed; actual contrast gate remains recorded until measured. (3) All reveal content readable in reduced/static mode.

**Verify:** computed styles and synchronized composite captures; Run TYPES/LINT if the repository requires them for this change. No fabricated AA certification from token ratios.

### Task 02 — Contain controls, targets and component shapes

**Depends on:** 01. **PR:** 1. **Files:** CSS. **Reference:** audit PR1, F03/F18/F19/F22.

- [ ] Map TN action/pressed tokens to gold + lacquer text and control/panel/thumbnail radii to 12/16/8. Keep cinnabar relationship semantics and approved discipline accents.
- [ ] Set hero time-mode buttons to equal flexible tracks, min-width 0, wrapping allowed, ≥48 px high and 8 px gap. Keep the original field behavior and enum values; shorter text arrives in Task 08.
- [ ] Enlarge actual sample/start/header/footer link and unknown-checkbox label hit areas to ≥44×44. Check the actual selectors: do not assume every footer link has `.footer-group`. Respect header width at 360; avoid merely hiding its overflow.
- [ ] Verify VI/EN 360/390/430 control labels, keyboard focus ring, hover/pressed distinction and desktop CTA nowrap. Check effective hit geometry with browser hit testing.

**Acceptance:** (1) No clipped time labels/page overflow. (2) Required targets/gaps meet geometry and can be activated. (3) Radii/accent roles match the token system without changing form semantics.

**Verify:** screenshots + effective target checks; run existing form smoke tests. Do not change fields to fix a visual overflow.

### Checkpoint A — After 00–02

- [ ] Required checks available and baseline failures isolated; both locales render.
- [ ] No quote/draft/metadata change; inspect the exact changed-file list.
- [ ] Record screenshots and missing composite/device measurements. Continue after evidence review; no routine user-confirmation pause.

### Task 03 — Mobile hero disclosure around the same form

**Depends on:** 02. **PR:** 2. **Files:** TN `troi-nam-hero.tsx`; CSS; messages VI/EN `troi-nam.json`; HOME_E2E. **Reference:** audit PR2 with this plan's focus refinements.

**Interfaces:** local `formOpen: boolean`; wrapper ID `tn-birth-form`; event `tn:open-form`; one existing `HomepageV3BirthForm` mounted throughout. Declare `sectionRef` before effects using it.

- [ ] Add failing tests: phone CTA visible before scroll; one form subtree; values survive opening and resize to/from desktop; direct wizard fallback works with JavaScript disabled.
- [ ] Add the exact new `hero.startCta` keys from Part D. Add the ≥52 px primary button with aria-controls/expanded. Hide the form through responsive CSS, not conditional JSX. Desktop ≥880 shows it immediately without hydration viewport guessing.
- [ ] Apply 32 px phone top padding, 32–40 px two-line H1, UI support text and visible sample link. Keep first dawn picture high-priority and reserve dimensions. No height animation or automatic reopening merely because a draft exists.
- [ ] Keep no-JS readable markup and a working localized wizard link; verify its computed visibility. Do not rely on an unhydrated client submit handler to navigate.

**Acceptance:** (1) Primary action fully inside 390×844 and 360×800, both locales. (2) Exactly one preserved form/hook with no draft loss. (3) Desktop/no-JS paths work without missing translations or hydration warnings.

**Verify:** Run FOCUSED for hero tests, then TYPES/LINT. Include width resize after entering an exact minute.

### Task 04 — Connect every chart-start path without focus races

**Depends on:** 03. **PR:** 2. **Files:** TN hero; HV `homepage-v3-go-wizard.tsx`; HOME_E2E.

**Interface:** keep exported `scrollToHeroForm(): void`, real `#lap-la-so` href, optional `topConcern` and non-TN behavior. All TN openings use the same opening/focus behavior, not competing timers.

- [ ] Add failing tests for primary CTA, later chapter CTA, header/native hash link, cold `/#lap-la-so`, repeated same-hash click, keyboard Enter, modified click and wizard return.
- [ ] Connect the existing `tn:open-form` bridge plus initial/hash navigation. Native links that point to the same hash must still be handled when hashchange does not fire. Scope delegated click handling to same-origin/current-page `#lap-la-so`; ignore unrelated links and meta/ctrl/shift/alt/non-primary clicks. Leave modified clicks native.
- [ ] Opening sets state before requesting focus. After React commits, choose one scroll/focus owner: focus day with preventScroll where the helper owns scrolling; for the primary button, make the revealed first field visible. Cancel stale scheduled work on cleanup. Do not combine immediate auto-scrolling focus with the old 450 ms helper and hope it settles.
- [ ] Preserve explicit concern selection, local draft write and wizard payload. Compare existing fixtures before/after for exact, branch-only, unknown, lunar leap month, invalid date, storage failure and restored draft. Do not alter validators to simplify the tests.

**Acceptance:** (1) All normal start paths open and reach day without jumping back afterward. (2) Modified clicks/native destinations preserved. (3) Draft, validation and concern-to-wizard payload equal baseline.

**Verify:** Run FOCUSED, existing birth/draft tests and TYPES. Repeat with reduced motion and from the page bottom. This task supersedes the audit patch's simplistic focus timing.

### Task 05 — Compact Needs with semantic assets

**Depends on:** 04. **PR:** 3. **Files:** HV `homepage-v3-needs.tsx`; TN `troi-nam-needs.tsx`; CSS; HOME_E2E.

**Interface:** `HomepageV3Needs({locale, compact = false})`; `data-need-id` = actual NEEDS ID; TN alone passes compact. Original `concernForNeed` and selection logic unchanged.

- [ ] Test all four selections and draft restoration. `self` maps to `self_understanding`, `work` to `career`, `love` to `love`; decision stays a direct Kinh Dịch route and must not set a Tử Vi concern. Mount must not overwrite a restored concern.
- [ ] Render four ≥64 px rows, 60 px thumbs and one selected 160 px illustration. Remove icon/question repetition from compact display; keep exact selected path/chips/actions. Replace nth-child asset mapping with semantic IDs.
- [ ] Add a closed native method disclosure in compact mode; retain all five method destinations. Noncompact mode remains open and preserves existing content/order. Use details summary as `bo-mon` target; test expansion remains open after a need selection rerender.
- [ ] Remove **both complete** presentation observer effects from the TN wrapper, including cleanup statements and imports, then remove its client directive. Reconstruct the small wrapper if safer than substring deletion. Do not stop at the first `return () => observer.disconnect()`; that is not the JSX return.
- [ ] Apply ≥880 choice/detail columns and two method columns. Set compact image sizes to 80 px while keeping legacy sizes for noncompact consumers.

**Acceptance:** (1) Closed ≤1,050 px / expanded ≤1,800 px at 390 for longest selection. (2) Correct assets, concern and all destinations. (3) Server wrapper has no effect/window/ref leftovers; shared default still works.

**Verify:** Run FOCUSED + TYPES; test noncompact fixture/real consumer too. If dimensions exceed target, fix repetition/padding, not font size.

### Checkpoint B — After 03–05

- [ ] The complete visitor → selected concern → valid wizard handoff works in VI/EN.
- [ ] Build/typecheck catches wrapper syntax/RSC errors; form subtree/data contract intact.
- [ ] Review 360/390/430 hero/Needs and exact/branch/unknown states before moving on.

### Task 06 — Comparison evidence stays visible; no collapse control

**Depends on:** 05. **PR:** 4. **Files:** HV `homepage-v3-compare.tsx`; TN `troi-nam-compare.tsx`; CSS; HOME_E2E. **Reference:** audit PR4 visual treatment, overridden disclosure behavior.

**Interface:** add `disclosure?: boolean = true` alongside existing `lead?: string` and `defaultOpen?: boolean`. TN passes `disclosure={false}`; other consumers retain their existing default. When false, use an ordinary wrapper, not an open details that the visitor can still close.

- [ ] Add a failing test: comparison evidence is visible immediately on both locales/phone/desktop, there is no summary/toggle/collapse affordance for it, and selecting a competitor cannot hide the comparison block. A legacy consumer still has its original disclosure.
- [ ] Define the existing table/mobile evidence body once. Render it inside details + summary only when disclosure is true; otherwise render it inside a plain full-evidence wrapper. Do not duplicate the business/data rendering, use CSS to hide a summary on a closable details, or simply pass defaultOpen=true.
- [ ] Retain four phone competitor selectors with six visible criteria for the selected option, one positive/five limitations per alternative and LSV fixes. Desktop retains the semantic six-row/four-option matrix (24 cells), caption/scope and existing 1180 responsive switch. The table component is always on the page; phone competitor selection remains the initial audit's responsive browsing interaction, not a new collapse.
- [ ] Remove inset texture and flatten header/benefit/card surfaces. Keep three benefit rows and one subtle LSV band. Set axis/fix/body to ≥16 px, 1.5 line-height, single rules instead of nested cards. Defer JSON lead authority to Task 09.
- [ ] Measure comparison + merged USP together: default initial-LSV phone state ≤1,700 px; longest selected competitor ≤2,100 px. No disclosure-based word/height exclusions are permitted here.

**Acceptance:** (1) Evidence always visible and cannot collapse, all data intact. (2) One canvas with readable phone rows/desktop matrix and preserved non-TN default. (3) Default/longest-state heights meet the distinct budgets without text clipping.

**Verify:** Run FOCUSED/TYPES; count six row headers/24 cells in desktop representation and six criteria in each phone selection. Click the section heading and all controls to verify nothing closes the evidence.

### Task 07 — Right-to-left carousel with bounded mounted content

**Depends on:** 06. **PR:** 5. **Files:** HV `homepage-v3-testimonials-section.tsx`; TN `troi-nam-testimonials.tsx`; CSS; HOME_E2E.

**Interfaces:** optional `compact = false`, `autoRotate = true`, `presentation?: "legacy" | "carousel" = "legacy"`. TN passes compact, autoRotate=true and presentation="carousel". Legacy presentation keeps the original grid/phone behavior. Use existing ROTATION_QUEUE, TESTIMONIALS and identity helpers; quote data is unchanged.

- [ ] Add failing tests for physical right-to-left autoplay, all queue IDs being visited, mounted-count limit, pause conditions, all-15 expansion/filtering, full dialog and focus return. Verify legacy presentation remains unchanged.
- [ ] Use one clipped carousel viewport/track at all widths in carousel mode, instead of rendering both legacy grid and row. Maintain a queue start index. Settled window contains two records on phone/tablet, three desktop; phone displays one full card plus a 32 px next-card preview. Use record IDs as keys; never randomise initial order. Keep SSR order deterministic and reserve stable card/viewport height across hydration, font loading and slot-count changes; do not stretch/shrink the chapter on every quote.
- [ ] During forward advance, mount one incoming record to the right, measure actual card width plus the 16 px gap, translate track left by that distance over 600 ms, then commit the next index and reset transform without a visible jump. Advance modulo all 15 IDs, including last→first. Prev may move right because it is explicit user navigation; autoplay always moves left. Mount at most 3 phone/tablet or 4 desktop records during transition. Do not permanently mount/clone two complete 15-card tracks.
- [ ] Use the existing six-second interval only while in view, document visible, not manually paused, not hovered, no focus inside, no full-quote dialog, not all-reader-expanded and not reduced motion. Track pointer hover and focus-within separately; pointerleave must not resume autoplay while keyboard focus remains on a card. Cancel timers/transition work on unmount. Resize/breakpoint changes cancel or settle the transition deterministically, retain queue position and remeasure card width.
- [ ] Keep a visible ≥44 px pause/play control with existing translated labels and pressed state, plus previous/next controls. Automatic changes must not repeatedly announce whole quotes; user-driven navigation may announce position through a separate polite status. If reduced motion is active, stop autoplay and use instant manual navigation. A mid-session preference change cancels movement and leaves a valid readable window.
- [ ] Clamp painted card quote to three lines, preserve exact excerpt and full dialog quote. Keep Vietnamese lang attributes on reader text in EN. All 15 remain available through the existing all-reader expander/filter path. Auto pause while expanded; never unmount the invoking read button while its modal is open or focus is inside the carousel.
- [ ] Test hydration/mobile sizing, dialog Escape/Tab/Shift+Tab/focus return, and the longest stable/in-flight queue windows. If focus enters a card or its dialog opens mid-transition, cancel the pending index commit, restore the current-start window and retain that record/button. Manual pause/reduced-motion/resize must also settle a valid window; no timer may commit a removed card after cancellation. Do not pass the audit PR5 autoRotate=false hunk.

**Acceptance:** (1) Carousel advances right→left every 6 s when eligible, without jump/blank loop; default phone chapter ≤700 px. (2) Bounded records, accessible pause/reduced mode and unchanged legacy behavior. (3) All 15/full text reachable with exact data and correct focus; no lost focused card.

**Verify:** Run FOCUSED/TYPES and quote checksum; use fake clock for six-second cadence plus a real-browser visual check for transform direction. Cover 15 sequential advances, wraparound, hovered/focused/paused/tab-hidden/offscreen/modal/expanded/reduced/resize cases. A timer assertion alone does not prove direction.

### Task 08 — Apply the exact VI/EN cut sheet

**Depends on:** 07. **PR:** 6. **Files:** messages VI/EN `homepage-v3.json` and `troi-nam.json` (four files).

- [ ] Read Part D by locale. Apply every changed JSON leaf's exact proposed text, including form segment labels; keep existing keys and interpolation placeholders. New hero.startCta is already introduced by Task 03; do not add it twice.
- [ ] For every row whose current text differs on HEAD, compare the newer string's meaning before replacing it. If it contains a newer factual product term, preserve that term and record a narrowly scoped adaptation; do not revert newer features to the snapshot silently.
- [ ] Validate JSON and translation key/placeholder parity with the repository's existing command. Search visible marketing strings for em/en-dash separators; exclude real reader data. Verify claims such as absolute objectivity/transparency have not been softened.

**Acceptance:** (1) All Part D JSON rows covered in both languages with no lost keys/placeholders. (2) Marketing length/CTA wording matches approved sheet. (3) Real quote data, pricing mechanics and translation-independent enums unchanged.

**Verify:** Run message validation + TYPES/BUILD as configured; render both locales and watch missing-key logs. Current/proposed counts are whitespace units, not Vietnamese dictionary words.

### Checkpoint C — After 06–08

- [ ] Comparison is non-collapsible; the carousel moves left and all evidence/quotes are reachable.
- [ ] No missing translations; smoke noncompact shared consumers.
- [ ] Review updated copy and surfaces. Long page height is not yet a failure until composition tasks finish.

### Task 09 — Use one copy authority and canonical header intent

**Depends on:** 08. **PR:** 6. **Files:** TN compare; `apps/web/src/components/site-header.tsx`; PAGE; HOME_E2E.

- [ ] Remove the hardcoded LEAD in TN compare so the changed JSON lead is actually visible. Keep its public locale prop compatible with callers or remove it only with all callers checked; no unused-local lint failures.
- [ ] Add optional homepage-only `chartCtaLabel?: string` to SiteHeader. PAGE supplies exact start label per locale; other header consumers retain their current default.
- [ ] Correct EN → VI locale switch to `/` for home and strip `/en` on other supported paths without introducing `/vi`. Test `/en`, a real EN subroute, root VI and a real VI subroute; preserve route metadata generation byte-for-byte.

**Acceptance:** (1) Visible lead matches JSON. (2) Homepage start intent consistent without relabelling every page. (3) Correct canonical navigation and unchanged metadata source.

**Verify:** Run FOCUSED/TYPES; inspect actual destination/canonical on both locales, not just link text.

### Task 10 — Compose nine distinct chapters

**Depends on:** 09. **PR:** 6. **Files:** PAGE; TN `troi-nam-ticker.tsx`; CSS; HOME_E2E.

- [ ] Merge ticker inside Story and USP inside Compare. Keep every original ID on a useful target. The world stage still spans hero→Explore; do not move Explore outside it or remove the concern provider.
- [ ] Replace two auto marquee tracks with a server-rendered static eight-link topic ribbon. Copy exact ticker keys and their original href mapping from audit PR6; no cloned loops or changed destinations.
- [ ] Lay out Story questions as 2×2 phone/4 wide, and combined proof as three benefits + four compact annotations + always-visible comparison evidence. Hide the redundant second USP header, stop its internal 140 px-like spacer, remove decorative per-annotation motifs and use a single-rule ledger.
- [ ] Check nine top-level chapter blocks and unique anchors; recheck scroll-progress measured target after changed geometry. Keep section timing driven by measured content, not artificial spacer bands.

**Acceptance:** (1) Nine chapters with distinct Part C families and all IDs once. (2) No standalone ticker/USP empty stage. (3) Static/reduced narrative remains understandable and chart handoff aligns.

**Verify:** Run FOCUSED + BUILD; inspect default and WebGL fallback/reduced pages, then measured heights.

### Task 11 — Compact the value, FAQ and closing chapters

**Depends on:** 10. **PR:** 6. **Files:** CSS; TN `troi-nam-value.tsx`; HOME_E2E.

- [ ] Value becomes three informational timeline rows/columns, no individual illustration boxes or leaf loop. Remove value wrapper's hidden-step icon/leaf/valley asset-style injection now: its more specific step-3 background would beat a generic transparent row rule.
- [ ] Stack FAQ heading/hub link/list, keep q1 default open and multiple opens allowed, parent question controls ≥64 px. Do not change its answer IDs or convert content changes into network loading states.
- [ ] About uses a 180 px phone painted strip, concise colophon and one final action; ≥880 may use a 240 px strip/text split. Remove closing decorative motion and large final-inner padding, not the landscape itself.

**Acceptance:** (1) Value ≤750, FAQ ≤800, About ≤950 px at 390 default. (2) Step 3 shares the same canvas, no background override survives. (3) FAQ controls and final chart action work with/without motion.

**Verify:** computed styles/section heights, both locales; Run FOCUSED. The whole-page budget is a release ceiling, not a reason to hide substantive copy.

### Checkpoint D — After 09–11

- [ ] Default 390 page measured against 10,128 px; settled main ≤1,250 units, carousel transition ≤1,350.
- [ ] All eight anchors, locale return and form/quotes work; required build/checks pass.
- [ ] Review latest evidence against Part C families and budgets before performance work.

### Task 12 — Make the scoped theme policy reviewable

**Depends on:** 11. **PR:** 7, isolated theme commit. **Files:** CSS; `tasks/verification.md`; HOME_E2E.

- [ ] Read actual theme variables and FD-088 context; verify the homepage still lacks data-light-ready and the toggle remains hidden. Inspect a cold page with the app's real persisted light setting, not an invented storage key.
- [ ] Prepare audit PR7's `.tn .hv3` lacquer exception for inherited light tokens. Preserve gold primary/pressed tokens from Task 02. Do not rewrite root data-theme, localStorage, SiteHeader light logos or other pages globally. Check header/footer/logo stay consistent under the stored preference; a form-only token override is not enough evidence of a whole-page theme pass.
- [ ] Record the exception and its independent commit/revert boundary for owner review. If it cannot provide a coherent scoped homepage without global changes, retain it as a blocked release decision rather than silently making paper artwork.

**Acceptance:** (1) Scoped policy and owner-review status explicit. (2) Stored preferences not overwritten and other light-ready pages unchanged. (3) Dark/light stored entry never mixes an unreadable form/chart with the stage in the proposed branch.

**Verify:** Run FOCUSED; cold VI/EN homepage plus one approved light-ready page. No production theme approval inferred from preparing this branch.

### Task 13 — Remove needless client wrappers and correct loading hints

**Depends on:** 12. **PR:** 7. **Files:** TN hero, Explore and FAQ; HV needs; HOME_E2E.

- [ ] Remove Explore wrapper's client directive only: it has no browser hooks; its interactive shared child stays client-side. Remove complete FAQ presentation reveal effect and make its wrapper server-capable; keep interactive FAQ child.
- [ ] Add lazy/low hints to the non-LCP dusk plate; retain high-priority dawn and existing night/source art direction. Verify desktop crossfade does not expose an undecoded plate when scrolling quickly; if necessary, preload only at the existing transition boundary without delaying LCP.
- [ ] Apply compact 80 px image sizes hints to both flagship and other discipline images, preserving noncompact values. Compare waterfall: display:none does not prove images weren't requested. Do not claim bytes saved without measurement.

**Acceptance:** (1) RSC build succeeds and inner interactions remain. (2) First image prioritised; later hints/art preserved without blank transitions. (3) Thumbnail hints correct, no invalid image dimensions.

**Verify:** Run TYPES/BUILD/FOCUSED; compare cold-load waterfall and fast-scroll desktop plus phone fallback.

### Task 14 — Dirty-only rendering without false GPU degradation

**Depends on:** 13. **PR:** 7. **Files:** TN world `troi-nam-world-scene.ts`; WORLD_TEST; runtime only if its existing reset API is needed.

**Interface:** preserve WorldHandle methods and lifecycle. Dirty means a changed progress/chart rectangle/resize/quality/debug pose requires a new draw; no intended clock-driven animation may be lost.

- [ ] Inspect every update call: current water/stars/particles derive time from progress. Add failing tests using the real renderer boundary/scheduler, not a mock of the behavior being tested: one initial draw; repeated equal progress/rect causes no extra draw; changed progress/rect/resize/debug renders correctly.
- [ ] Gate drawing by dirty AND existing scheduler cadence. Keep the visible scheduling rAF for this release. Clear lastFrame/slow-frame history for idle/paused periods via the existing reset API where needed; the next deliberate frame must not treat a 5-second idle gap as slow rendering. Debug updates mark dirty. Quality-change resize must still repaint.
- [ ] Test 5 seconds idle → scroll; hidden/offscreen → resume; slow continuous frames crossing the real 50 ms/2-second thresholds; resize and low-tier cadence. Preserve high→low→static fallback. Do not disable degradation to pass tests.
- [ ] Preserve first decoded frame reveal, init abort before/after allocation, texture failure fallback, reduced-motion mid-init cancellation and disposal. Run existing mount/unmount/context failure tests, including disposal after a rejected asynchronous load.

**Acceptance:** (1) No idle draw calls after stable first frame, changed poses repaint. (2) Idle/resume never falsely downgrades; sustained actual slow frames do. (3) All pause/abort/disposal/static protections preserved.

**Verify:** Run WORLD_TEST/FOCUSED/TYPES/BUILD. Hardware trace remains Task 18; a clean unit test does not prove GPU smoothness. If any time-driven visual needs continuous draws, omit only this optimisation and document evidence; keep the rest of PR7.

### Checkpoint E — After 12–14

- [ ] Required build and lifecycle regressions pass; no hydration/RSC errors.
- [ ] Static/reduced/stored-theme cases reviewed and theme exception isolated for owner review.
- [ ] No fabricated device score, byte savings or zero-idle-JS claim.

### Task 15 — Delete only retired decoration branches

**Depends on:** 14. **PR:** 8. **Files:** CSS; TN `troi-nam-about.tsx`; value wrapper only if Task 11 cleanup remains incomplete.

- [ ] Delete tn-leaf-fall and tn-lantern-float rules/keyframes and their removed pseudo-element positioning. Remove floating-lantern asset injection from About; keep T10 and L06/L07 closing landscape plates. Value injection is already removed by Task 11: don't recreate it to apply the original PR8 diff.
- [ ] Search remaining CSS/JSX references before deletion. Keep Three.js particles, state-specific chart/gallery/focus rules, shared legacy styles and asset manifest entries.
- [ ] Compare before/after this cleanup: no appearance change expected because the intentional step-3 background removal already occurred in Task 11. Do not fold distant identical selectors or move declarations across overlapping groups/media scopes.

**Acceptance:** (1) Retired loop references/injection gone. (2) World/landscape assets and active states retained. (3) No visual difference introduced by cleanup itself.

**Verify:** search references, TYPES/LINT and same-state screenshots at 390/1440. This task's dependency-aware diff supersedes original audit PR8's step-3 timing.

### Task 16 — Verify accessibility and adverse interaction states

**Depends on:** 15. **Scope:** regression verification; change only a demonstrated failure in its owning task/files. **Files:** HOME_E2E; verification ledger; at most one focused component/style repair per failure.

- [ ] Keyboard-test Tab/Shift+Tab/Enter/Space/Escape on form, Needs, disclosures, FAQ and quote dialog; verify returned focus and announced selections/errors. Use effective target tests, including checkbox label and header/footer links.
- [ ] On a healthy GPU, tap Explore cells without first focusing via keyboard at multiple handoff poses. The visible actionable labels and hit coordinates must agree; inspect opacity and overlays. Do not blindly force the chart opacity to 1 through the entire scroll story to avoid this test.
- [ ] Test reduced motion from cold entry and while content is pending/scene loading; saveData/no-WebGL, missing/rejected asset and browser back/restored draft. All important content must remain visible and operable. Check any repair on both locales and noncompact defaults.

**Acceptance:** (1) No invisible actionable controls or keyboard trap/focus loss. (2) Field errors/loading/disabled states remain meaningful without business-logic changes. (3) Reduced/static/failure modes keep complete readable content.

**Verify:** Run FOCUSED; actual mobile assistive-technology check if available. Otherwise record TalkBack/VoiceOver as pending rather than a pass. Repair logs identify the owner task and its rerun checks.

### Task 17 — Measure the responsive and content budgets

**Depends on:** 16. **Files:** verification ledger; existing visual/e2e specs as needed; scoped CSS repairs only for observed failures.

- [ ] Capture all six widths in both locales with fonts loaded. Compare default, expanded form, longest Needs selection/expanded methods, every competitor with evidence still visible, FAQ expansion, every settled/in-flight carousel window, reader expansion/dialog and restored draft. Check 200% text zoom/reflow; allow increased height rather than clipping text.
- [ ] Measure the default 390 page/main and per-section ceilings using §4. Record before/after values. If over budget, find the actual content box/padding/unused imagery; preserve ≥16 px text and substantive controls/copy. Fix the owning task and rerun affected checks.
- [ ] Verify ≤4 uppercase marketing labels, zero marketing dash separators, two-line phone H1, desktop CTA nowrap and all anchors once. All 15 hidden-on-default reader records must still be reachable on expansion; do not reduce the count by hiding everything with CSS.

**Acceptance:** (1) No clipping/page overflow at six widths/VI/EN. (2) Initial-LSV default ≤10,128 px/1,250 settled units; its in-flight carousel ≤1,350 units; expanded form ≤10,950. Longest other competitor ≤1,350 settled/1,450 in flight and comparison chapter ≤2,100 px. (3) Distinct families, copy/control budgets and complete expanded information preserved.

**Verify:** computed measurements + reviewed screenshots, not screenshot existence alone. Report 200% zoom separately from the 100% height benchmark.

### Checkpoint F — After 15–17

- [ ] Product regression and responsive evidence complete, or exact external limits labelled pending.
- [ ] Compare protected files/contracts to Task 00; quote checksum unchanged.
- [ ] Review changed files for extra features/dependencies/global theme mutations. No final “done” solely from compilation.

### Task 18 — Real composite/GPU/performance evidence

**Depends on:** 17. **Scope:** evidence gate; no new analytics/deploy action. **Files:** verification ledger and test evidence.

- [ ] Obtain healthy GPU and representative mid-range Android/4G traces for initial load and sustained scroll; verify caps, quality fallback, hidden/offscreen pause, stable-pose draw suppression and repeated disposal. Record device/browser/network settings and dates.
- [ ] Measure actual copy/focus/control contrast over synchronized text-free composite frames with scrim retained and glyph-area mask: dawn/dusk/night, responsive crops and selected/focused states. The original 5×5 near-text samples are risk evidence, not a complete AA pass. If this capture cannot be made, flag the contrast gate pending.
- [ ] Record lab LCP/CLS and interaction traces separately. Field INP p75 needs representative post-release monitoring; it cannot be measured for this unshipped branch. Use only already-approved analytics if monitoring exists; otherwise leave the field gate for the release owner. Do not claim one Lighthouse trace proves p75.

**Acceptance:** (1) Real device/composite results with reproducible settings or explicit unavailable status. (2) No lifecycle/paint degradation or accessibility blocker in measured states. (3) Field/lab distinction and release ownership explicit.

**Verify:** inspect trace/capture outputs; compare to LCP <2.5 s, CLS <.1, INP <200 ms in the appropriate evidence category. Missing hardware does not justify invented numbers.

### Task 19 — Final branch review and Sonnet handoff

**Depends on:** implementation tasks 00–17; consume Task 18's measured/pending gates. **Files:** `tasks/todo.md`; `tasks/verification.md`; PR descriptions per repository convention.

- [ ] Run full required checks once after the final repairs. Inspect the branch diff and protected-file comparisons; verify the eight PR scopes below, commits and rollback boundaries.
- [ ] Review final behavior against every audit finding F01–F38. Mark resolved/verified, resolved/unverified, preserved pass, or intentionally deferred with reason. Do not call device-gated issues fixed merely because CSS was added.
- [ ] Produce a concise handoff containing base/head SHA, tasks/PRs completed, full commands/exit statuses, before/after measurements, screenshot paths, quote/form/SEO invariants, actual remaining gates and the isolated theme exception. Create a draft PR only if the repository/user permits it; do not merge/deploy/send external messages.

**Acceptance:** (1) Implementation/check results and remaining external gates independently reviewable. (2) No unrequested scope or protected contract change. (3) Ready-for-review status accurately distinguished from production/field verification.

**Verify:** final diff review + command logs. Report `READY FOR REVIEW; [named external gates] pending` when hardware/field evidence is unavailable; never check off those gates as passed.

## 4. Measurement procedure and exact defaults

Use the existing dev/test server and configured browser runner. Navigate to `/` or `/en` with no hash, at 390×844, 100% text zoom, keyboard closed. Wait for `document.fonts.ready`, scroll through once to resolve lazy content/reveals, return to the top and let layout settle. Restore default state: form closed on phone, methods closed, comparison evidence visible with LSV selected, q1 open, other FAQ answers closed, all-reader expansion closed. Record each settled carousel window; also measure the incoming-card transition separately. Do not disable Three.js for the primary geometry run; record a separate static/reduced run.

The following is **read-only browser measurement**, not an installer or repo-mutating script:

```javascript
const main = document.querySelector('main');
({
  pageHeight: document.documentElement.scrollHeight,
  viewport: { width: innerWidth, height: innerHeight },
  mainUnits: (main?.innerText ?? '').trim().split(/\s+/u).filter(Boolean).length,
  pageOverflow: document.documentElement.scrollWidth > innerWidth,
  sections: [...document.querySelectorAll('[data-troi-nam-block]')].map(el => ({
    block: el.getAttribute('data-troi-nam-block'),
    height: Math.round(el.getBoundingClientRect().height),
    paddingTop: getComputedStyle(el).paddingTop,
    paddingBottom: getComputedStyle(el).paddingBottom,
    innerPadding: [...el.querySelectorAll('.hv3-container')].map(inner => ({
      top: getComputedStyle(inner).paddingTop,
      bottom: getComputedStyle(inner).paddingBottom
    }))
  }))
});
```

Same word-count convention as the handoff: whitespace units, not Vietnamese word segmentation. Method/all-reader disclosures and non-q1 FAQ answers are intentionally excluded in default state. Comparison evidence is always included. Whole clamped excerpts and any mounted incoming carousel card still count; do not hide those from the measurement to obtain a smaller number. Count visible marketing and quotation punctuation separately. Save section and total measurements together; do not cherry-pick the shortest selected state.

| Chapter | Default phone ceiling | Additional check |
|---|---:|---|
| Hero | 800 px collapsed | Expanded whole page ≤10,950 px |
| Story + topics | 600 | No standalone ticker gap |
| Explore | 1,200 | Visible interactive state and contrast |
| Needs | 1,050 | Expanded methods ≤1,800 |
| Compare + USP | 1,700, initial LSV, always visible | Longest other competitor ≤2,100; no collapse |
| Readers | 700 | Right→left carousel; all 15 available on expansion |
| Value | 750 | Transparent third step |
| FAQ | 800 | Expansion may intentionally increase height |
| About/final | 950 | No decorative looping spacer |

### Revised budget calculation for the final user clarification

The original audit sum was 7,900 px across nine default chapters. Increase comparison/proof from 1,100 closed to 1,700 visible (+600) and readers from 650 static to 700 carousel (+50): **8,550 px**. Adding 72 px header and the same 1,100 px footer allowance yields **9,722 px / 844 = 11.52 screens**. The 10,128 px release ceiling leaves 406 px tolerance. This arithmetic is a planning budget, not a measured implemented page. Measure the actual header/footer and all chapters after implementation.

The old 900–1,100 main-unit target assumed closed comparison. Source text counting of the proposed compact comparison is recorded in `tasks/budget-analysis.md`; it adds evidence to default state. Keep 900–1,100 as the copy-cut aim, use **1,250 settled / 1,350 in transition** as release ceilings and count every queue window. Do not fill below-target pages. Expanded form remains ≤10,950 px; an opened method/all-reader/extra-FAQ state may intentionally be taller. The longest alternative adds at most 75 source units in VI over initial LSV; allow ≤1,350 settled/1,450 in transition for that interaction. Selecting a different competitor changes content, but never closes the comparison section.

The audit's 3-line quotation card/full-dialog pattern remains: full quotations are not all placed inline. FAQ stays q1-open only on initial load, with normal toggles for all questions. Therefore the abandoned all-content-inline calculation does not apply.

## 5. PR/commit order and rollback boundaries

| Package | Tasks | Reviewable result |
|---|---|---|
| PR1 | 00–02 | Scoped rhythm/readability/targets, baseline evidence |
| PR2 | 03–04 | Mounted mobile disclosure + all opening paths + form regressions |
| PR3 | 05 | Compact semantic Needs and method disclosure |
| PR4 | 06 | Always-visible comparison on one canvas; no collapse |
| PR5 | 07 | Bounded right→left carousel, unchanged quote data |
| PR6 | 08–11 | Exact bilingual copy and nine-chapter composition |
| PR7 | 12–14 | Isolated theme proposal, server/image cleanup and tested runtime optimisation |
| PR8 | 15 | Retired decoration cleanup after prior visual removal |
| Validation | 16–19 | Evidence and scoped repairs belong in their owning PRs |

Use one focused commit per verified task or meaningful code slice; use the repository's own naming convention. Stage only its inspected files. Do not roll back other work if a gate fails. Theme exception and dirty-render optimisation must be independently reversible. Undoing a later package may require its dependent packages to be reverted or adapted; never blindly reverse a patch against unrelated newer HEAD edits.

## 6. Failure-handling rules and context checkpoints

| Failure | Required response |
|---|---|
| Patch hunk conflicts or already applied | Read the current semantic equivalent; implement only missing behavior. Do not restore old snapshot wholesale or append another override. |
| Type error after wrapper conversion | Check dangling effect cleanup/import, client hooks, prop signatures and JSX nesting first. Do not add use client to PAGE to silence it. |
| Form values disappear | Check unmount/duplicate hooks first; restore one mounted subtree. No field/draft rewrite. |
| Layout too tall | Inspect box heights, double padding, hidden-old image wrappers and repeated headers. Fix those; never shrink body below 16 or clip important content. |
| Step 3 retains a valley plate | Remove value's specific injected asset style; generic background:none may lose cascade. |
| Runtime becomes static after idle | Check lastFrame/slowSince reset and only count active rendering intervals; keep sustained-slow fallback. |
| Reduced motion still animates | Inspect imported guard + pseudo-elements + live preference change; remove retired loops, restore pending content. |
| Quote/payload checksum changes | Stop that commit; restore data/business behavior and preserve only presentation edits. |
| Existing unrelated check fails | Record baseline evidence; run focused checks for this work. Do not disable the check or claim all green. |
| Hardware/test infrastructure unavailable | Finish independent code/checks; name the exact unverified gate and required environment. Do not invent a pass. |

At the end of a focused session, write to `tasks/verification.md`: branch/base/head; last verified task; next task; exact changed files; run commands/results; evidence paths; open gates. Keep todo status `DONE`, `IN PROGRESS`, `BLOCKED` or `NOT STARTED`. Before resuming, read that ledger, the next task, its interfaces and relevant source; do not reapply completed diffs. Read the entire Part D only for the copy task, not before every small CSS edit.

## 7. Definition of done and planning provenance

For each code task, acceptance criteria plus focused runtime/tests, lint/types as applicable, scoped diff review and status evidence must pass. For the feature, also verify integrated form/concern/locale/quotes, RSC build and responsive behavior. For production, owner review and named device/contrast/theme/field gates apply separately. No new auth/payment/data flow or third-party transmission is introduced.

This plan follows the selected Engineering Suite Plan plugin's `entry-plan` and `planning-and-task-breakdown` workflows. It is a planning deliverable, not a tested deployed change. Relevant source: `engineering-suite-plan/2.0.0/skills/entry-plan/SKILL.md`, `skills/planning-and-task-breakdown/SKILL.md`, `references/definition-of-done.md`. Audit evidence remains snapshot + live observations dated 2026-10-02; the actual implementation branch must be independently inspected in Task 00.
