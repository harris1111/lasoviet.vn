# H. Implementation plan: Lá Số Việt Trời Nam light theme

Date:2026-10-02. Status: audit complete; implementation pending. Executor:Claude Sonnet in the full local/git repository. This package does not modify/deploy the website.

## Outcome and scope

A complete mobile-first paper/light homepage, with a working site-wide theme preference, readable painted world, active-theme-only image loading and preserved birth-chart conversion flow. Preserve Vietnamese/English content, section order, anchors, SEO, Colophon v5 logo, form state, concern context and all Eastern/Western discipline links.

Immediate priority is saved-light P0 containment. The static light release is an intermediate checkpoint and capability fallback. The full layered animated light world is required by the founder's follow-up. V2 supplies6new world assets plus25 original binaries; read docs/06 and tasks/3d-plan.md. Do not stop after a token-only half-theme. Do not merge the readiness marker before every section is complete.

## Read order and authority

1. Full repo's AGENTS.md/CLAUDE.md and existing incomplete tasks.
2. Package `README.md`, `docs/01-audit.md`, `docs/02-art-direction.md`.
3. `docs/03-token-css-spec.md`, `docs/04-image-inventory-and-briefs.md`.
4. `code-reference/README.md`, hotfix patch, theme/world contracts, regression tests.
5. Supplied original HANDOFF/docs/code evidence, available as `source-handoff/`.

Founder constraints in original handoff control product scope. This plan corrects verified technical omissions, not founder decisions. No repeated questions about OS-follow, warm brown-black ink or framed artworks. All technical implementation records are in English; existing UI copy remains Vietnamese/English as today.

## Decisions and dependencies

| Decision | Implementation consequence |
|---|---|
| preference ≠ effective theme | force non-ready dark without deleting saved light |
| dark no-regression | preserve exact dark token values; explicitly review proposed readability change |
| no inactive-theme-only fetch | inert SSR asset slots + selected responsive preload; no hidden img twins |
| old V3 components reused | semantic adapters, art props; do not duplicate form/chart |
| light static first | five supplied masters unblock complete light page; no dark canvas in light |
| full world required | 6supplied new assets + original-alpha RGB remap + generation-aware switching; required implementation |
| primitive bridge staged | guards now; audited consumer migration before final bridge removal |

Dependency chain:01→02/03→04/05/06→07→08/09/10→11/12→13→19/20. Animated14→15→16→17→18 can start only after static release and asset gate. Final20 must run again after animated implementation. Task14–18 details are superseded by tasks/3d-plan.md.

## Branch/PR flow

Follow handoff's current flow: short branches and PRs targeting `master`; never push directly to master. One founder sign-off per **reviewable slice**, not per task. Sonnet executes tasks/checkpoints inside a slice autonomously, then presents screenshots/results and stops before merge/deploy unless that exact action is separately authorized.

| Slice | Branch suggestion | Tasks | Founder reviews |
|---|---|---|---|
| PR1 urgent safety | `fix/troi-nam-theme-safety` |01–03 | saved-light now fully dark; ready routes preserved; no stale V10 preload |
| PR2 foundation | `feat/troi-nam-light-foundation` |04–06 | token/CTA regression, real exported art; homepage still guarded dark |
| PR3 complete static light | `feat/troi-nam-light-static` |07–13 | all sections390/1440 in both themes, toggle/no-FOUC/form, portraits preserved |
| PR4 required animated light | `feat/troi-nam-light-world` |14–18 | aligned world, five scroll positions, swap/failure/memory evidence |
| PR5 measured acceptance | `qa/troi-nam-light-release` |19–20 | actual contrast, Lighthouse/network/interaction evidence and remaining limits |

PR3 can be developed on an unmerged foundation branch when necessary; PR target remains master only after dependent commits are present there. Do not create overlapping token rewrites across branches. Compatibility cleanup may require additional small PRs; maintain its ledger and do not claim immutable architecture complete while bridge remains.

## Task 1: Ground repository and baseline

**Files likely touched (docs only):** `docs/qa/2026-10-02-light-route-inventory.md`, `tasks/todo.md` (or preserve existing tracker convention).

Read working tree status, branch, instructions, package scripts, test paths, current route readiness markers and image pipeline. Compare snapshot with actual code; enumerate **all** known ready routes and representative non-ready routes including both locales. Capture before screenshots and network inventory. Locate four SVG preload declarations. Do not infer route readiness from pathname or dark-looking screenshots.

**Acceptance:** route/capability table saved; baseline dark390/1440 retained; actual focused test/build commands copied from package scripts.

**Verification:** run existing relevant tests/baseline build if feasible; record pre-existing failures separately. State any missing tools accurately. Scope:S; dependency:none.

## Task 2: Contain saved-light bug

**Files:** `styles/tokens.css`, `styles/homepage-v3.css`, `styles/global.css`, `app/[locale]/layout.tsx`, existing E2E test file (≤5).

Read/adapt `01-hotfix.patch`, including global.css guards. Resolve effective dark on no-readiness pages; don't overwrite preference. Keep dark literals unchanged; keep ready routes light. Remove old V10 preload from bootstrap, keep real hero fetchPriority high. Use guarded CSS as first-paint defense, not only hydration.

**Acceptance:** saved light on non-ready homepage results effective dark, hidden toggle and unchanged saved key; no mixed primitive/V3/chrome values; dark baseline preserved.

**Verification:** hotfix test fails before/passes after at390/1440; ready→non-ready→ready and hard reload; snapshot diff. Scope:M; dependency:01.

## Task 3: Remove obsolete homepage scheduling

**Files:** actual preload owner identified in01 (1–2 files), regression test/report (1).

Remove four V3 need SVG preload declarations for Trời Nam, preserving actual assets/usage elsewhere. Audit hidden replaced images to list for10; do not delete assets. No replacement world preload before active art contract exists.

**Acceptance:** no V10 hero/four obsolete SVG preload declarations on home; true primary art begins normally; no missing icon on reused V3 consumers.

**Verification:** cold-cache request log; no stale image URL in preload list; both themes and locales. Scope:S; dependency:02. **Checkpoint/PR1 review.**

## Task 4: Reconcile ink and immutable CTA semantics

**Files:** `styles/tokens.css`, `styles/global.css`, regression test if needed (≤3).

Replace four ink values with FD-110 values. Define fixed CTA ramp/ink semantics before component migration. Change shared `.button` to semantic ramp/fg; prevent legacy primitive remap from flattening ramp. Preserve dark gold stop values and foreground exactly. Recompute contrast for ready pages and header/mobile-menu button.

**Acceptance:** global ink scale correct; CTA light ramp has distinct original stops and dark foreground; no dark pixel regression.

**Verification:** computed gradient/foreground values and contrast across ramp; `/tu-vi`, `/kien-thuc`, wizard and actual ready routes from01. Scope:S; dependencies:03.

## Task 5: Add TN semantic tokens and V3 adapter

**Files:** `styles/tokens.css`, `styles/troi-nam.css`, `styles/homepage-v3.css` (3).

Implement docs/03 token/edit map. Move effect literals to token source retaining exact dark values. Replace TN primitive uses by semantic role, remove local six primitive aliases that would shadow root TN layer. V3 light values become semantic adapters including chart colors. Keep guarded primitive bridge for old audited routes; no global deletion. Record bridge consumers/migration completion in01 ledger.

**Acceptance:** no new hex/rgb outside token source; no undefined tokens; dark effect output identical before intentional readability work.

**Verification:** source search plus computed values; dark390/1440 screenshots; light-ready other routes remain correct. Scope:M; dependency:04. **Internal checkpoint foundation color safety.**

## Task 6: Export five supplied masters and light manifest

**Files:** `public/images/troi-nam/manifest-light.json`, asset pipeline source if required, asset ledger; image derivative family counts as assets, not unexplained product subsystems.

Use exact PNG masters in assets/generated. Export existing pipeline WebP sizes defined in docs/04, record actual dimensions/bytes and paths. New siblings under light/; no overwrites. Add static mode asset list validation. Map light T01 logical texture to existing T08 paper. Do not add guessed full-world entries.

**Acceptance:** five families present, valid SEO names/srcsets; static required IDs validate; no dark text-background fallback.

**Verification:** decode every export, compare dimensions and fine brushwork, measure byte targets and contrast after export. Scope:M; dependency:05. **Checkpoint/PR2 review.**

## Task 7: Implement one theme controller

**Files:** new theme types/controller modules, locale layout, theme-toggle, existing regression test (≤5).

Follow code-reference/03. Replace hotfix observer ownership rather than add another controller. Resolve saved/session/system/effective; implement live OS/storage/capability/navigation events. Early-ready map comes from01; unknown routes dark. Update root/color-scheme/theme-color. useSyncExternalStore or existing supported store; stable snapshots/subscriptions and server default matching markup.

**Acceptance:** all resolution matrix cases pass; non-ready preserves saved key; toggle labels reflect live effective theme.

**Verification:** cold first visit, blocked storage, invalid value, OS changes, cross-tab deletion and ready/non-ready navigation. Scope:M; dependencies:06.

## Task 8: Hero/stage active-asset host

**Files:** theme image-slot module, `troi-nam-hero.tsx`, `troi-nam-world-stage.tsx`, asset helper (≤4).

Render inert SSR image slots; activate only effective-theme primary art, responsive preload matches880px. Light mode static backdrop spans hero/story/ticker and early explore; dark stage behavior unchanged. Light static: no dark world import/texture requests; clear readiness and DOM chart opacity1. Disable light phase swaps until14–18. Keep form/concern components mounted; no `key={theme}`.

**Acceptance:** inactive-theme-only hero/world requests zero on cold entry; image/currentSrc matches preload; form survives toggle.

**Verification:** 390/1440 cold network trace, no-FOUC filmstrip, reduced-motion/noWebGL/saveData; enter fields then toggle. Scope:M; dependency:07.

## Task 9: Theme-aware section assets

**Files:** `troi-nam-about.tsx`, `troi-nam-value.tsx`, `troi-nam-explore.tsx`, image-slot host if needed (≤4).

Remove module-scope dark-only palace CSS and per-component dark rgba. Bind active L06/07/L13, T01→T08, shared artwork and masks. Preserve static section server text; avoid turning whole page client. Build no src-bearing hidden twin elements.

**Acceptance:** light CTA/value art correct, explore no black texture; no inactive-theme-only URL requested by active pseudo-elements.

**Verification:** scroll all sections; inspect network and computed background URLs, mobile/Desktop crop; dark image paths unchanged. Scope:M; dependency:08. **Internal checkpoint image ownership.**

## Task 10: Stop hidden legacy art downloads; preserve icon identity

**Files:** `homepage-v3-needs.tsx`, `homepage-v3-static-sections.tsx`, TN wrappers needing passed props (max3 more; split if >5).

Add backwards-compatible optional props for actual icon/image slots and legacy artwork. Defaults preserve other V3 consumers. TN suppresses old hidden imgs while keeping selected needs and correct decision icon. Use existing native SVG for functional identities where available. Raster decorative alpha masks need original-file matte validation; no arbitrary redesign of palace meanings. Check inherited discipline art and USP art as well as manifest inventory.

**Acceptance:** old hidden art nodes no longer emitted in TN; correct functional icon identity; other V3 routes unchanged.

**Verification:** DOM+network trace, select every need and palace; verify concern transfer; test masks on paper/dark. Scope:M; dependency:09.

## Task 11: Hero/world-text legibility and control states

**Files:** `styles/troi-nam.css`, token source, birth-form markup only if selector needed (≤3).

Implement feathered local mist per docs/02 and03. Local alpha floor behind all text, including last line; preserve art outside text zone. Fix canh-giờ pill wrapping/min-width with original label; min44px target. Contrast-test focused/error/disabled/loading states. Keep dark readability adjustment explicitly identifiable; no unannounced dark recomposition.

**Acceptance:** normal text≥4.5, large≥3, controls≥3 in actual composite; no clipped label at320/390/430; no hidden focus.

**Verification:** real pixel samples at hero/story/explore and crops; semantic contrast table, screenshots dark/light. Scope:M; dependency:10.

## Task 12: Finish lower sections and shared chrome

**Files:** `styles/troi-nam.css`, `styles/site-theme.css`, `styles/homepage-v3.css`, `styles/global.css` (4).

Frame S01–04/T10 art regions; paper cards/CTA/FAQ/testimonial modal; remove light-only panel stacking without changing table topology/copy. Move shared chrome rules, delete old duplicates and cover full footer/menu/logo states. Preserve dark values. Do not add avatar notes, shorten quotes or reorder sections.

**Acceptance:** all11sections+footer/header consistently light; meaningful dark paintings remain with outside text; no dark islands with overlay ink.

**Verification:** 48section captures at390/1440 (12areas×2themes×2sizes), menu/modal/FAQ/needs/compare states; no horizontal overflow. Scope:M; dependency:11. **Internal checkpoint complete static page.**

## Task 13: Enable homepage readiness atomically

**Files:** `app/[locale]/page.tsx`, initial capability source, E2E expectations (≤3).

Only now add data-light-ready and mark home ready in bootstrap capability map. Switch test expectations from forced-dark home to actual light home; retain forced-dark coverage on a real non-ready route. Enable toggle and responsive active-theme preload. Review English locale same layout; leave route-registry metadata unchanged.

**Acceptance:** first OS/saved selection correct before paint, all static behavior passes, dark no-regression except reviewed readability fix.

**Verification:** full matrix in02-regression-tests and actual repo build/focused tests. Scope:S; dependency:12. **Checkpoint/PR3 founder visual review. Static light deliverable complete after19–20 checks.**

## Task 14: Acquire and validate aligned animated art

**Files:** light manifest, asset review ledger, image export pipeline (≤3 code/docs).

V2 supplies original binaries and6new world assets. Execute14A–14D in tasks/3d-plan.md: compare hashes, export derivatives, preserve source alpha and camera/anchors/UVs, use the supplied per-layer linear RGB material ramps. Do not regenerate mountains or demand14more images. Compose actual layers before enabling animated readiness.

**Acceptance:** full required set exists, clean alpha, aligned0/.25/.5/.75/1 in390/1440 compositions, fits decoded memory estimates.

**Verification:** alpha bounds/dimensions/manual composite review; missing assets hold animated flag off. Scope:M; dependency:13; asset availability gate.

## Task 15: Parameterize scene/sky/karst/water

**Files:** world-types,scene,light,layers,water (5).

Pass explicit config per world contract; preserve dark config values, geometry, thresholds and water color-space. Light uses warm clear/pale phase tone and real light assets, never dark night. No new progress controller.

**Acceptance:** dark deterministic frame compares; light contains no dark-only sky/effect URLs; shader outputs match painted layers.

**Verification:** targeted constructor/config tests and rendered comparisons; build/typecheck actual scripts. Scope:M; dependency:14.

## Task 16: Adapt effects and projection

**Files:** stars,particles,ring,theme-config (4).

Normal light sun/motes; lantern halo not constructed in light; no additive light rays; darker clean ring; preserve same star-target math and DOM chart convergence. Do not recreate decorative shapes procedurally.

**Acceptance:** particles visible without washing out paper, projection aligns12palaces, dark effects unchanged.

**Verification:** scroll phases390/1440 low/high; compare glyph readability and ring targets. Scope:M; dependency:15. **Internal checkpoint world art/effect fidelity.**

## Task 17: Revision-safe live scene swap

**Files:** stage,theme controller subscription bridge if needed, lifecycle test (≤3).

Implement revision/abort/disposal protocol from04-world-contract. Matching static covers load; old completion cannot reveal/remove newer scene. Preserve progress, chartRect, active state, form. Theme-matched readiness; immediate reduced-motion/context-loss fallback.

**Acceptance:** ten rapid toggles latest-wins; no black/wrong-theme frame; stale failures cannot affect current scene.

**Verification:** controlled delayed/failing texture loads, context loss, live reduce, nav/unmount StrictMode. Scope:M; dependency:16.

## Task 18: Enforce decoded memory budget

**Files:** world-textures,quality config,diagnostics test (≤3).

Explicit lowSrc sizes; decoded source reuse with UV-safe texture clones; no two complete sets resident. Measure buffer/texture allocation and stable counts. Correct sprite dimensions. Document unavoidable in-flight network vs actual abort support.

**Acceptance:** budgets inworld contract met; memory/RAF/listener counts stable after swaps; low-tier fallback works.

**Verification:** renderer.info+diagnostics, real phone or supported benchmark; no extrapolated claim from software renderer. Scope:M; dependency:17. **Checkpoint/PR4 founder review.**

## Task 19: Accessibility and regression acceptance

**Files:** QA evidence/report, relevant E2E test (≤2; fixes open focused tasks).

Measure real plate contrast after export/crop, semantic chart/control states, focus/menu/modal, first-paint/no-FOUC, English labels and all preserved anchors. Confirm all meaningful content visible without animation. Fix failures in their owner task; do not weaken thresholds/tests.

**Acceptance:** no known AA/control/flow regression; any intentional dark readability adjustment separately shown and approved.

**Verification:** test matrix and48section images, background pixel coordinates+ratio record. Scope:S; dependency:18.

## Task 20: Performance measurement and handoff

**Files:** `docs/qa/2026-10-02-light-theme-release.md`, todo/progress file (2).

Actual production-build measurements: Lighthouse both themes/mobile cold4G profile, three runs/report median and spread; request list active vs shared vs inactive; real form/toggle/chart interactions. LCP<2.5s,CLS<.1,INP<200ms remain targets until measured. Lighthouse's TBT is not INP; record interaction/field evidence and limitations. Use regression test/build commands from01; don't invent passing checks.

**Acceptance:** actual measured values with environment and URLs; zero inactive-theme-only first-load images; complete static fallback and full animated deliverable; required animated status accurately reported; bridge cleanup ledger explicit.

**Verification:** evidence links, repo diff/PR description, final commit/branch record. Scope:S; dependency:19. **Checkpoint/PR5 founder release sign-off.**

## Compatibility cleanup tasks (generate from actual inventory)

For each ready-route primitive consumer group found in01, create a task with≤5files and matching ready-route screenshot/test. Replace primitive usages with semantic roles; preserve dark values and light output. Last task removes guarded primitive mappings, confirms fixed CTA/gradients/focus, and tests **every** previously ready route. Until last task passes, label bridge “contained compatibility debt”, not immutable-primitives completion. Do not expand unknown site-wide cleanup silently into this homepage plan.

## Reporting, resume and blocked work

Update `tasks/todo.md` after each task with actual files, checks/results and next task. After context limit, resume earliest unchecked task; do not restart audit or regenerate the five images. If a task exceeds5files, split it. V2 includes required sources. If the live repository differs, record the actual mismatch and continue independent tasks. A capable device always falling back to static is not completed full3D. If code/runtime tools are missing, mark specific checks not run and provide exact continuation task, never say done from code inspection alone.
