# Trời Nam effects implementation contract

Status: proposed engineering defaults extending the existing Plan 1 roadmap, prepared at the owner's request. This is not a rendered or previously approved visual design. Claude should implement with its installed local Three.js skills and tune visual constants against renders, recording deviations. Existing founder decisions retain precedence.

## Intended experience

Keep the full static homepage and working birth form available immediately. On capable devices enhance the opening journey into a lacquer/gold Tràng An world: karst mountains across water, early sunlight through mist, dusk, night stars, then a decorative star/chart motif approaching the existing Explore section. The interactive chart and birth form remain ordinary DOM; animation never generates or interprets personal astrology data.

Authoritative sources: Plan 1 roadmap; Plan 2 brief; `docs/13-brand-experience-guideline.md`; `docs/22-art-direction.md`; current `troi-nam-hero.tsx` and asset manifest; approved v3 behaviors. The owner explicitly requested karst terrain, sun rays, water and scroll-controlled 3D and assigned real rendering to Claude's locally installed specialist skills. Neither their paths nor their contents can be inferred from GitHub.

## Source and ownership boundaries

Plans 3/4 add modules inside `apps/web/src/features/troi-nam/`, scoped CSS and preview-page integration. Existing v3 logic is reused. Do not mount `HomepageV3Motion`: it selects the first `.hv3` globally and would target only one Trời Nam wrapper. Do not modify that shared motion module to make the new page work.

The dependency snapshot has no gsap/lenis/three. Claude must read installed skills and local Next documentation, resolve compatible versions using package facts and official docs, install only in the correct workspace, commit manifest/lockfile changes, and record versions. Do not use an unversioned CDN or claim library APIs were checked from this document. Next integration follows the actual installed Next documentation, especially client-only loading and server/client boundaries.

## Scene and scroll contract

No artificial multi-screen runway or mandatory wheel capture. Native page content determines scroll distance. Plan 3 measures start at the hero's document top and end at Explore's document top; refresh after fonts/images/resize. `p = clamp((scrollY - start)/(end - start), 0, 1)`; if end <= start, use p=0. Anchor navigation, reverse scrolling and restored scroll position set the same deterministic state.

Proposed phase function uses cubic smoothstep `u*u*(3-2*u)` on each interval:

| Progress | Scene | Stable acceptance frame |
|---|---|---|
| 0.00–0.25 | Dawn; karst silhouettes, water, mist, diagonal warm rays | p=0.00 |
| 0.25–0.50 | Dusk; warm light recedes, sky darkens, camera slowly tilts upward | p=0.375 |
| 0.50–0.75 | Night; gold stars emerge as rays and ground fade | p=0.625 |
| 0.75–1.00 | Stars approach the rectangular twelve-palace chart frame; intermediate ring optional | p=1.00 |

Return phase blends `{ dusk, night, chart }`, each smoothstep over its own interval. Dawn/dusk/night opacity weights are `1-dusk`, `dusk*(1-night)`, `night`; chart is a morph weight, not an extra opacity weight. These weights sum to one. Keep progress math independent of GSAP/Three. `setProgress` clamps input and treats non-finite values as zero.

Canvas backdrop spans hero/story/ticker/explore: a stage group owns a non-flow absolute backdrop layer with a sticky 100svh child; real sections retain their normal flow and order. The canvas remains behind content, clipped to the stage, with pointer-events none. No extra pin spacing. It is hidden after the stage; Needs and all later sections keep static backgrounds. On reduced-motion/fallback no stage sticky behavior is required. At world-ready, selectively dim/replace only decorative hero/story plates; do not make text/form/controls transparent. Keep opaque legible copy panels and the original scrim. Never fade out content to expose the world.

The current Explore is a rectangular twelve-palace DOM grid (`.tn-explore .hv3-chart` with twelve `.hv3-cell` buttons), not a circular chart. Measure that grid's viewport box. At transition end project decorative points toward its outer cells or frame, then crossfade the canvas out to leave the original interactive chart as the sole foreground. P01/P05 may inspire an intermediate decorative ring, but it must not be treated as the live chart's geometry. Do not promise a personalised computed chart or replace its interactive DOM.

## Local world construction

- Karst: layered foreground/middle/background silhouettes, deterministic seeded irregular limestone geometry with vertical relief and flatter vegetation tops; no generic symmetric cones. Compare composition against L01/L03/L13. Use instancing/shared geometry where possible. Keep readable negative space behind hero copy/form.
- Water: one broad plane, subtle low-amplitude normal/displacement waves and gold reflection streaks. Start with a lightweight shader/normal approach; add planar reflection only if measured budget permits. No forced full-scene reflection render every frame on phones.
- Rays: sparse additive translucent planes or a skill-supported inexpensive volumetric approximation from one dawn sun direction; fade through dusk. No large full-resolution raymarch pass as the default.
- Mist: few depth-separated translucent layers, not dozens of overdraw-heavy sprites. Use T11 only if its processed texture is suitable; never assume an image is a depth map.
- Stars: seeded buffer geometry with a fixed point count, precompute start and target coordinates once; interpolate on GPU or existing buffers without per-frame allocation. Proposed high tier 1200 points / low tier 400. Decorative target points may form an intermediate gold ring before approaching the twelve-palace grid; no fabricated astrological labels.
- Materials/colors: derive palette from existing lacquer/gold/pearl tokens. Read computed colors after theme changes; do not hardcode a competing palette. Existing manifest plates are references/fallbacks, not 3D models. Any generated meshes/materials/assets get descriptive SEO filenames and documented provenance/licenses.
- Camera: perspective, proposed FOV 40°, avoid fast forward travel and roll. Establish dawn composition first; move slowly upward toward sky then flatten toward the rectangular chart target, interpolating deterministic poses from p. Tune to keep DOM legible at 390/1440; the canvas never owns focus.

## Shared interfaces

`troi-nam-motion-math.ts` exports `clampProgress(value: number): number` and `scenePhases(value: number): { dusk: number; night: number; chart: number }`.

`troi-nam-world-types.ts` defines:

```ts
export type WorldQuality = "low" | "high";
export type WorldHandle = {
  setProgress(value: number): void;
  setChartTarget(rect: { x: number; y: number; width: number; height: number } | null): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setActive(active: boolean): void;
  dispose(): void;
};
```

`createTroiNamWorld(canvas: HTMLCanvasElement, options: { quality: WorldQuality; seed: number; onFailure: () => void }): Promise<WorldHandle>` lives in `world/troi-nam-world-scene.ts`. It resolves only after a first successful render; it rejects or calls failure on initialization errors. Integration keeps the static plate until that first successful frame. The stage owns the handle and cleanup; the supplied `createTroiNamProgress(root)` controller publishes progress to the stage through a root-scoped `troi-nam:progress` CustomEvent with immutable `detail: { progress, range, rangeValid, reducedMotion }`, stores the last progress in `root.dataset.troiNamProgress`, and publishes when progress, geometry or preference changes. `read()` and synchronous `subscribe()` supply current state to delayed initialization; the stage owns its own canvas/target ResizeObserver and must not wait for a progress change to resize. The stage reads that last value on delayed initialization; no lost initial scroll state. Use this same math and scene factory in prototype and Next integration.

## Enhancement, accessibility and lifecycle

- Interactive transition timing follows brand §5.8: 120ms feedback, 180ms standard, 240ms panels, using existing motion tokens. Scroll-scrubbed world phases are driven by progress rather than an invented timed autoplay sequence.
- Server renders all real content visible. Reveal readiness is opt-in only after the client controller successfully initializes. Failed dynamic imports leave the page visible.
- Reduced motion: native scroll, no Lenis, no parallax/tilt, no 3D allocation, no star morph. Show static L01/L02. React to changes during a session and restore all content/styles. The progress bridge only reports the preference; the stage/controller must enforce reduced-motion fallback before allocating effects.
- Proposed quality: coarse pointers default to low, fine pointers to high; respect saveData when available by using static fallback. Do not fingerprint GPUs or rely solely on user-agent. First WebGL initialization may still fail; catch and restore static plates. No WebGL means immediate fallback.
- DPR cap high=1.5, low=1.0. Start target active frames high=60fps, low=30fps; if sustained frame time exceeds 50ms for two seconds, step high to low once; if it remains slow another two seconds, dispose and show static. Measure only while active/visible, with a reset interval so background tabs do not trigger false degradation.
- Pause render loop while document hidden, backdrop outside viewport or a modal is open; resume without a large time delta. No continued render loop after unmount. Cancel frames/observers/listeners, dispose GPU geometry/materials/textures/render targets/renderer; dispose late-resolving initialization if component already unmounted.
- Context lost: prevent uncontrolled loop, restore static plates and release resources. A retry may be manual/local, never endless automatic reload.
- Keep normal wheel/touch/PageDown/Home/End/anchors usable. Lenis must not intercept birth-form input, selects, testimonial dialogs, mobile testimonial horizontal swipe, FAQ interaction or nested scrolling. Pause smooth scrolling while modal focus is active and use its native nested scroll. Restore body state on close/unmount.
- Maintain one heading hierarchy, accessible form labels and focus rings. Canvas aria-hidden, no tab stops and no new product copy. No flash bursts or rapid contrast oscillation.

## Verification and proposed performance targets

Prototype: same-origin HTML entry under `prototype/revamp-2026-09/troi-nam-world/`, served over local HTTP by a build tool using installed workspace packages; HTML source is independent of Next but uses the same scene factory. Do not claim file:// can import npm modules. Document exact run command and port; add development-only build configuration after version preflight, never unversioned CDN scripts. Include progress slider, native scroll, static fallback toggle, low/high toggle and deterministic phase capture buttons for local review only; these controls never ship in product.

Capture dawn/dusk/night/chart at 390/1440, and a short forward/reverse scroll video. Record browser, GPU/device, versions, canvas resolution, quality, draw calls/triangles, active FPS/frame-time percentiles and payload sizes. Proposed budget: high <=150 draw calls/200k triangles, low <=70/80k; scene-specific lazy JS <=300 KiB gzip excluding reusable app baseline; desktop frame p95 <=25ms / low <=40ms on named target devices. If not achieved, simplify effects or retain static rather than hide failure. These are proposed targets to validate, not measured claims.

Production verification: 320/390/879/880/1440, VI/EN, both themes; reduced-motion before load and toggled later; blocked import, no WebGL, context loss, tab hide/resume, navigation away/back, deep-link Explore, reload mid-scroll, slow network, dialog open during smooth scroll. Check content visible, controls usable, no horizontal overflow, no accumulating contexts/listeners. Compare static/mobile LCP and CLS before/after; proposed CLS <=0.1 and LCP <=2.5s on a documented comparable mobile profile. Only local measurements justify a completion claim.


## Completion package update

The native progress bridge and pure phase math are delivered and pass standalone logic/lifecycle checks. They are not mounted and are not a completed GSAP/Lenis controller or Three scene. Claude owns all React integration, external library APIs, world code, readiness CSS, runtime rendering and local verification. Follow the package integration contract before the older task prose. The final homepage CTA currently scrolls to `#lap-la-so` and focuses `#hv3-day`; it does not open a birth-wizard modal. Actual testimonial dialogs still require nested scrolling and focus handling.
