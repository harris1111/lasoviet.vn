# Claude integration contract and ownership

The owner authorized this completion package and Claude's local continuation. Repository founder decisions still take precedence. Source baseline is `a227f9fd14c523627579c9185e5a36974dd3abd3`; local changes may be newer. Inspect them before copying.

## Owned boundaries

| Work | Delivered here | Claude local owns |
|---|---|---|
| Phase and scroll math | `troi-nam-motion-math.ts` + tests | Calling it from shaders/timelines; evidence-based phase tuning |
| Native measurement | `troi-nam-scroll-progress.ts` | React mounting, virtual scroll adapters, pin/layout coordination |
| Preview verification | Node checks, browser fixture checks, smoke CLI | Actual browser runs, screenshots and full repo compatibility checks |
| Motion | No GSAP/Lenis code or dependencies | Installed skills, version preflight, reveals, scrolling clock, focus/nested-scroll rules |
| World | No Three imports, shaders, meshes, world types or renderer files | Terrain/water/rays/mist/stars, prototype, scene API, disposal, capability tiers |
| Existing page/CSS | No replacements or patches supplied | Additive integration into current local page/CSS without losing work |
| Release | Plans/checklists only | Registry/SEO changes, PR, authorized merge/deployment and smoke evidence |

This package includes no earlier Plan 2 payload, no accumulated stylesheet, no rewritten testimonials and no live homepage replacement. D/E and portraits already exist on git. Do not apply old A/B/C/D installers again.

## Native bridge API

```ts
createTroiNamProgress(root: HTMLElement): TroiNamProgressController | null

type TroiNamProgressController = {
  read(): TroiNamProgressSnapshot;
  refresh(): void;
  subscribe(listener: (value: TroiNamProgressSnapshot) => void): () => void;
  dispose(): void;
};
```

`snapshot` is immutable and contains `progress: number`, `range: {start,end}`, `rangeValid: boolean`, `reducedMotion: boolean`. `subscribe` immediately calls with the latest value, then on semantic changes. `refresh` remeasures on the next animation frame. It emits the same snapshot in root-local `troi-nam:progress` and stores the latest numeric value in `data-troi-nam-progress`. This bridge only measures: it does not hide content, intercept wheel, create animation readiness flags, import libraries or allocate GPU resources.

One owner per root; duplicate creation throws before changing attributes. Missing anchors/defaultView returns null without touching the DOM. Disposing is idempotent and restores the prior progress attribute. Native listeners are passive where appropriate, RAF is demand-driven, hidden tabs pause and resume with fresh geometry. Fonts and section/root size changes remeasure. If content above the `.tn` root changes without changing observed sizes, explicitly call `refresh`; no promise of an automatic arbitrary DOM layout-shift detector is made.

Claude's React controller creates it in its existing client effect with the actual `.tn` root ref, subscribes, then unsubscribes/disposes in that effect's cleanup. If local code already implements an equivalent bridge, reconcile the API in place and run these tests; **do not mount two bridges**. Consumer callbacks must handle renderer failure; an exception in a scene update must revert to static, not leave readiness flags active. Dispose late-resolving scene handles after unmount.

For world progress, use snapshot plus `scenePhases(snapshot.progress)`. If `snapshot.reducedMotion` or `!snapshot.rangeValid`, do not allocate the scene; keep static plates. Scroll geometry is native document coordinates. Refresh after any GSAP pin/reparent/layout operation and fonts settle. Choose one animation clock for Lenis/ScrollTrigger/world scheduling; no competing global RAF drivers. Stage resizing/target rect updates have their own ResizeObserver; unchanged p does not imply unchanged canvas size.

## Corrections to the first proposed effects handoff

1. Explore is a rectangular twelve-palace chart, not a circle. Use `.tn-explore .hv3-chart` bounds; each `.hv3-cell` is a real interactive button. A decorative ring may be an intermediate visual, followed by a crossfade toward the grid; never replace the chart or fake personal star/house labels.
2. `HomepageV3GoWizard` currently scrolls to the hero and focuses `#hv3-day`. The final CTA does not open a wizard modal. Keep that behavior. Testimonial dialogs are actual modal/nested-scroll surfaces.
3. Phase/FPS/payload constants in the effects spec are proposed defaults, not approved render results. Claude may simplify techniques to satisfy real device budgets, recording changes; no extra founder confirmation for routine implementation choices already in scope.
4. External library versions/imports remain intentionally unpinned here; the repo has no GSAP/Lenis/Three dependency at baseline. Verify actual local APIs from installed docs/official sources before implementing them.

## Local source findings to resolve at integration

- The preview page passes `SiteHeader` only locale. The header derives the locale switch destination from `currentPath`; absent that prop, switching language leaves preview for the live homepage. In the page Claude already owns, pass `currentPath={locale === "en" ? "/en/troi-nam" : "/troi-nam"}` using the inspected header's normalized path convention, then verify both locale directions and actual middleware redirects. Do not blindly prepend `/vi` to that prop.
- No `data-light-ready` marker is present in the inspected Trời Nam page/wrappers. The theme toggle is controlled by CSS light-readiness. Verify current rendered behavior and complete light-theme contrast/layout before enabling that marker. The smoke CLI `--full` checks actual requested/observed theme and toggle availability; it does not force a DOM theme to fake a pass.
- Hero scrim currently uses dark photographic grading while primitive tokens adapt in light mode. Measure actual ivory/dark-text contrast on those plates before declaring light-ready. Keep text readable with existing brand tokens; do not infer a pass merely from no overflow.
- VI/EN key parity is intact at baseline: 265 leaves per `homepage-v3`, four per `troi-nam`. This is a structural source check, not proof of editorial equivalence or rendered EN layout.

## Merge safety and completion evidence

Copy only new files whose local target is absent. If a same-name file exists, compare and reconcile; never overwrite automatically. Stage only intended paths. Read installed Next docs before React/page integration. Preserve noindex preview, current live homepage and any uncommitted local world work.

At each stage record commit, complete command exit status, real screenshots/errors, browser/device and unresolved limits in the execution log. No grep-filtered errors, marker echoes or placeholder PASS rows. Run browser fixtures, preview smoke and required repo checks locally. Source/math success does not count as 3D visual acceptance, production build success or release authorization.
