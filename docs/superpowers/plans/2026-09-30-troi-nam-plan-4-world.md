# Trời Nam Plan 4: Three.js World Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans and the installed local Three.js skills, task-by-task. Checkboxes record actual execution.

**Goal:** Render the scroll-controlled karst/water/sunray/day-night/star-chart world and integrate it behind the functional preview homepage.

**Architecture:** One reusable scene factory serves a standalone HTML prototype and a client-only Next stage. Pure Plan 3 progress math drives deterministic scene transitions. Canvas lifecycle never owns product interactions.

**Tech Stack:** Three.js and local specialist skills; versions/imports resolved during local preflight. Existing motion progress bridge; optional development-only bundler verified locally.

**Spec:** `docs/superpowers/specs/2026-09-30-troi-nam-effects-contract.md`.

## Global constraints

No effects rewrite of v3 logic, no real chart calculation in WebGL, no forced scroll runway, no unversioned CDN. Static fallback remains until first successful frame. No 3D initialization for reduced motion/saveData. Match existing lacquer/gold art direction. Keep preview noindex and root homepage unchanged.

## Review focus

- Failed/delayed initialization and late resolution after unmount: static content and disposal (Tasks 1, 4).
- Mountains/rays/water visual quality: render evidence, not source-only claims (Tasks 2, 3).
- Reverse/reloaded scroll: deterministic scene and chart alignment (Tasks 3, 4).
- Context loss, background tabs and sustained poor FPS: graceful fallback (Task 5).
- Mobile/theme changes: readable DOM, no obscured form/focus (Tasks 2, 4, 5).

### Task 1: Local skills, dependency and prototype harness

**Files:** create `troi-nam-world-types.ts`; `world/troi-nam-world-scene.ts`; prototype `prototype/revamp-2026-09/troi-nam-world/{index.html,main.ts,README.md}` and only the verified development configuration required to serve it. Modify workspace manifests/lockfile as needed after preflight.

**Interfaces:** `WorldQuality`, `WorldHandle`, `createTroiNamWorld` exactly as the spec. Prototype imports the same factory as production; no duplicated scene implementation.

- [ ] Locate and read Claude's actual installed terrain/sun/water/scroll Three.js skills. Inspect installed package versions and relevant official APIs; record paths/versions. Do not assume named skills or modules exist from this handoff.
- [ ] Add verified dependencies in correct workspace. Build the same-origin HTML harness with slider [0,1], quality/fallback toggles and phase captures. Serve through the locally verified build tool; document command, HTTP port and package source resolution. No npm imports via file://.
- [ ] Implement factory first-frame readiness, error rejection and idempotent disposal before heavy scene content. Force initialization failure and dispose before async initialization resolves; verify static fallback and zero surviving RAF/GPU allocation.

### Task 2: Dawn terrain, water, rays and mist

**Files:** create `world/{troi-nam-world-terrain,troi-nam-world-water,troi-nam-world-light}.ts`; extend factory. These builders own their resources and expose cleanup to the factory.

**Interfaces:** scene builders accept Three scene plus `{quality, seed}`; avoid global singleton resources. Factory controls camera, lights and all phase uniforms.

- [ ] Implement deterministic layered limestone forms, readable negative space and constrained camera composition from L01/L03/L13 references. Build shared/instanced geometry; render the dawn frame before adding more effects.
- [ ] Add lightweight water with restrained waves/reflections, sparse sunray planes and mist layers. High/low variants use the spec budgets; no default full-resolution raymarch/reflection chain.
- [ ] Capture p=0 at 390/1440 with DOM composition reference, both palettes. Record draw calls/triangles/FPS; adjust visual parameters from actual render. Commit dawn deliverable once it depicts karst/water/rays rather than generic cones or flat photograph planes.

### Task 3: Dusk, night and stars→chart choreography

**Files:** create `world/troi-nam-world-stars.ts`; extend factory; share motion math.

**Interfaces:** scene uses `scenePhases(p)` for deterministic lighting/camera/opacity/morph weights; `setChartTarget` accepts measured viewport rectangle or null, with null using centered decorative grid fallback (an intermediate ring is optional art).

- [ ] Implement dawn→dusk→night weights; rays/ground recede while sky/stars emerge. Use a seeded fixed buffer (1200 high/400 low proposed) and precomputed decorative targets; no allocation/reseed on progress updates.
- [ ] Interpolate star positions toward a decorative P01/P05-inspired intermediate motif using chart weight. Project toward Explore rectangular grid target when supplied, accounting for canvas dimensions and camera transforms; do not attach personalised labels or duplicate interactive chart DOM.
- [ ] Capture p=0, .375, .625, 1, then forward/reverse video. Slider revisits must reproduce exact composition for the same seed/p/viewport. Compare colors/lighting and absence of clipping at 390/1440. Commit stage only after actual phase evidence.

### Task 4: Next stage integration and static continuity

**Files:** create `troi-nam-world-stage.tsx`; modify preview page, scoped CSS, hero/story presentation wrappers only if required for selective plate dimming. Preserve original form hook/state and wrapper order.

**Interfaces:** client stage owns one handle, root-local progress subscription and Explore ResizeObserver. It consumes latest stored progress after async initialization, calls `setChartTarget` from the existing rectangular `.tn-explore .hv3-chart` bounds, and sets `data-troi-nam-world-ready` only after successful rendering.

- [ ] Read installed Next docs and implement verified client-only lazy loading; never import Three into server execution. Wrap hero/story/ticker/explore in the stage structure from the spec without new flow height or altered section order/anchors. Canvas is aria-hidden/pointer-events none behind actual DOM.
- [ ] Keep L01/L02 and story plates until ready; on success dim only decorative plates with scoped ready selectors. On failure or reduce, revert them immediately. Canvas crossfades out at Explore; original chart controls remain foreground and usable.
- [ ] Verify JS disabled/slow/blocked world import, deep link/reload mid-scroll, viewport resize, theme changes, form submissions and chart interaction. Confirm all content remains visible and usable; capture 390/1440 integrated frames. Commit.

### Task 5: Capability tiers, degradation and cleanup

**Files:** stage and factory; focused lifecycle tests in existing test harness where practical, browser evidence otherwise.

- [ ] Implement saveData/reduced/no-WebGL fallback; DPR and target FPS limits; active-only sampling for one high→low→static degradation path. Pause for visibility/offscreen/modal and reset deltas on resume.
- [ ] Handle context loss by reverting static and disposal. Unmount must remove observers/listeners, cancel RAF, dispose renderer/geometry/materials/textures/render targets, and dispose late-resolving handles. No hidden retry loop.
- [ ] Verify context loss with browser extension API, repeated navigation, background tab resume, modal nested scroll, reduced toggles and simulated slow frames. Record named hardware/browser and active p95 frame times, payload and renderer counters. If budgets fail, simplify or keep static on that tier.
- [ ] Run local typecheck/build and affected tests with full exit statuses, then provide prototype URL, preview URL, phase screenshots/video and performance table. Do not ship or claim scene quality without render evidence. Continue to Plan 5.
