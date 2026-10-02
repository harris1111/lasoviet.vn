# Trời Nam light V2 implementation and QA

Status: implementation available for review; code review approved. **Release acceptance remains pending** for physical GPU/field performance and the LCP target. No merge or deployment has been performed.

Branch: `feat/troi-nam-light-v2`. Base: `ee1cdb420a44b8bd30f5ef1356890451c906a106` (`master`). The approved execution plan is [2026-10-02-troi-nam-light-v2-implementation.md](../superpowers/plans/2026-10-02-troi-nam-light-v2-implementation.md).

## Delivered behavior

- One tested theme controller runs before paint and owns saved/session/system preference, effective capability, header toggle, OS/storage updates, matching theme-color and image activation. Unknown/non-ready owners use dark. The route inventory derives from the canonical registry; see [route inventory](2026-10-02-light-route-inventory.md).
- The complete homepage, shared header/footer/menu and preserved form/chart/needs/testimonials use light semantic roles. Five supplied static image families have responsive WebP derivatives. Inert picture/template slots emit active artwork only; no-JavaScript keeps responsive dark art.
- The light 3D world remains composed from separate authored layers. Six supplied new assets are included; original mountains, geometry, alpha, camera, anchors, UVs and chart projection are retained. [All 25 original hashes match](2026-10-02-world-source-hashes.json). No additional generation was necessary.
- Material-local linear RGB remapping changes painted color while preserving alpha. Sky plates composite over opaque dawn; water feathers its top edge. Light sun uses normal blending and fades in the chart chapter. Light rays and lantern halos are not constructed.
- Scene generations abort/dispose older owners before a new renderer loads. Pending/stale images use per-image generations. Form and concern state remain mounted. Reduced motion, saveData, context loss, allocation failure and texture-dimension failure show a matching static backdrop; capability re-enable creates a fresh canvas.
- One decoded image per URL is reused, with three independent T11 UV texture instances and one W11 texture for all six fleck keys. Explicit allocations constrain light texture and scene budgets. Resize lowers drawing DPR to available allocation; below viable DPR falls back. Driver/GPU overhead is not claimed to be precisely measured.

## Changes visible in dark

The homepage now exposes the requested theme toggle in dark as well as light, moving adjacent header controls. The time-mode controls wrap and have a 44px minimum height in both themes; the phone hero becomes approximately 11 CSS px taller. Fixed CTA ink changes to the approved `#0f0d0a`. These are explicit changes, not a claim of pixel-identical dark output.

An independent worktree built the actual base commit. Desktop FAQ static output was pixel-identical; desktop hero/story changed under 0.1 mean max-channel levels. Animated comparisons are not frozen, and the phone scroll interval changes with the control height. [Comparison measurements](assets/2026-10-02-light-v2/dark-comparison.json) and the [before](assets/2026-10-02-light-v2/dark-baseline-390-p0.5.webp)/[after](assets/2026-10-02-light-v2/dark-current-390-p0.5.webp) frames retain the original layered scene. This is evidence of preserved composition, not a blanket zero-regression assertion.

## Verified application behavior

Production build completed on Next 16.3.4 / React 19.2.8 / Three 0.186.1. Actual Chromium 142 headless shell used SwiftShader, single-process sandbox-compatible flags and an external Node interface shim. Those environment workarounds are not product code. The test runner starts its server and browser in the same network namespace.

- Eight production cases: 390/1440 × light/dark × static/world. All passed, no horizontal overflow or observed page/hydration/shader errors. All seven actual world scroll positions captured. Zero inactive-theme-only image requests. [Network/runtime results](assets/2026-10-02-light-v2/results.json).
- 48 static section images captured: 11 blocks plus footer × two themes × two widths. Compact selected frames are committed below; all captures can be regenerated with the QA runner.
- Seven additional production checks passed: 320px Vietnamese and 430px English control wrapping, mobile menu, keyboard FAQ, each need and each palace, testimonial dialog focus/Escape; ten rapid DOM theme-button activations with delayed textures and preserved form/concern/progress; live reduced-motion disable/re-enable; real `WEBGL_lose_context` fallback; saveData startup/re-enable; blocked storage; no JavaScript; unknown route dark default. Empty-form error and visible keyboard focus also checked. [Interaction evidence](assets/2026-10-02-light-v2/interactions.json).
- 547 light text samples passed their normal-text 4.5:1 or large-text 3:1 requirement: 364 settled static samples and 183 samples at seven 3D positions. Minimum sampled static ratio 4.929:1; animated ratio 5.913:1. The sampler compares actual screenshot backgrounds with glyph paint suppressed, handles mobile visual-viewport offsets and excludes hidden/decorative/disabled text. Coverage is one viewport per static section and seven scroll positions, not every possible text/control state. [Coordinates, colors and ratios](assets/2026-10-02-light-v2/contrast.json).
- Semantic control border `#958a7c` against the form paper `#fffdf7` is 3.328:1; focus ink `#755718` is visibly rendered in the keyboard error-state captures. Disabled/loading backend flows are not claimed as end-to-end acceptance without the configured backend.

| Light tier | Decoded textures | Scene allocation estimate | Texture/scene limit | Drawing buffer |
|---|---:|---:|---:|---|
| Low, 390px | 19.832 MiB | 22.370 MiB | 24 / 48 MiB | 390×844 |
| High, 1440px | 44.294 MiB | 54.326 MiB | 48 / 96 MiB | 1440×900 |

4K budget regression verifies DPR is reduced to approximately 0.895 and modeled total stays at 95 MiB, including 1 MiB headroom. Oversized allocation falls back. Uploaded `renderer.info.memory` is a separate count of currently used resources and is not a byte measurement. The pre-existing dark decoded allocations exceed the new light budget and have not been silently recompressed.

## Performance: measured, not accepted

Three production mobile cold 4G runs per theme were recorded by Lighthouse 12.8.2: simulated 150ms RTT, 1.6Mbps, 4× CPU, 390×844 DPR2. **All runs warned about the load time limit; four lacked trace screenshots and returned null performance scores. These results cannot establish release readiness.** Accessibility scores were 100 for light and 99 for dark (an existing redundant image-alt finding). TBT was zero; TBT is not INP. [Lighthouse summary](assets/2026-10-02-light-v2/performance.json).

A second measurement used actual CDP network/CPU throttling, empty HTTP cache and PerformanceObserver, with a 20s observation window after DOMContentLoaded. It measured LCP and CLS independently of Lighthouse's trace simulator. Container CPU/build/browser activity may affect results; the GPU is software-rendered.

| Theme | Observed LCP median | Range | CLS median |
|---|---:|---:|---:|
| Dark | 3.492s | 3.004–4.748s | 0.000828 |
| Light | 2.804s | 2.672–4.900s | 0.000828 |

**LCP <2.5s is not met in this lab; CLS <0.1 is met.** [Cold-load samples](assets/2026-10-02-light-v2/cold-load.json). On the final interaction run, maximum observed nonzero-interaction EventTiming durations were 96ms (Vietnamese), 56ms (English), and 96ms (world swap scenario). These are session samples, not field INP or physical mobile evidence. Under heavily throttled software rendering the existing slow-frame scheduler may switch the world to static; unthrottled production world readiness was verified in both tiers.

## Verification commands and limitations

```sh
pnpm i18n:check
pnpm lint
pnpm typecheck
pnpm --filter @lasoviet/web build
pnpm exec vitest run tests/web apps/web/src/features/theme apps/web/src/features/troi-nam apps/web/src/features/homepage-v3 'apps/web/src/app/[locale]/theme-bootstrap.test.ts'
pnpm test:scripts
```

Latest focused run: 176 passed, 1 skipped; script tests: 17 passed. i18n, typecheck and production build passed. Lint: zero errors, four pre-existing warnings in wallet navigation, evidence hooks and tarot imagery. Full-repository tests require Docker/PostgreSQL; exact final failure inventory is appended below. Local `/api/auth/get-session` responds `AUTH_CONFIG_INVALID` without the deployment secrets; it is recorded rather than masked. Public homepage checks still passed. No auth/commerce/backend behavior was modified.

Normal QA reproduction after package/web builds:

```sh
LSV_QA_SERVER_MODE=production node scripts/qa/troi-nam-light.mjs
LSV_QA_SERVER_MODE=production LSV_QA_INTERACTIONS_ONLY=1 node scripts/qa/troi-nam-light.mjs
LSV_QA_SERVER_MODE=production LSV_QA_CONTRAST_ONLY=1 node scripts/qa/troi-nam-light.mjs
LSV_QA_SERVER_MODE=production LSV_QA_COLD_LOAD_ONLY=1 node scripts/qa/troi-nam-light.mjs
```

Install Playwright Chromium normally, or provide `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Constrained environments may additionally set `LSV_QA_SINGLE_PROCESS=1` and `LSV_QA_NODE_PRELOAD` to an environment-owned shim. Lighthouse is optional tooling: set `LSV_LIGHTHOUSE_MODULE` to an installed `lighthouse/core/index.js` and `LSV_QA_PERFORMANCE_ONLY=1`. No production dependency was added for Lighthouse. Asset regeneration uses `node scripts/build-troi-nam-light-assets.mjs <approved-V2-package>`.

## Selected review frames

[Phone hero](assets/2026-10-02-light-v2/light-static-390-hero.webp) · [Static story](assets/2026-10-02-light-v2/light-390-story.webp) · [Animated layered scene](assets/2026-10-02-light-v2/light-world-1440-p0.5.webp) · [Explore](assets/2026-10-02-light-v2/light-1440-explore.webp) · [Footer](assets/2026-10-02-light-v2/light-1440-footer.webp) · [320px error/focus](assets/2026-10-02-light-v2/form-error-focus-320.webp) · [English error/focus](assets/2026-10-02-light-v2/form-error-focus-430.webp).

## Remaining release gates

1. Re-run valid Lighthouse traces and GPU measurements on a normal supported Chrome/device; record physical low/high frame pacing, allocations after swaps, and field/session INP. Do not label SwiftShader data as a phone benchmark.
2. Resolve the measured LCP target before release acceptance. Start with production request priority and the theme-matched hero request timing relative to global render-blocking CSS, then separately test offscreen CSS art/world work. Preserve pre-paint preference and zero inactive-theme-only downloads; do not remove full 3D to obtain a static score.
3. Founder visual acceptance of the supplied light paintings and explicit dark control/toggle changes.
4. Run Docker-backed tests in the configured integration environment and deployment smoke only after deployment is authorized.
5. The contained primitive compatibility bridge remains debt. Migrate each previously ready-route consumer group with its own screenshot/check, then remove the bridge only after every ready-route owner passes. Do not claim site-wide immutable primitives from this homepage implementation.

## Final full-suite inventory

`vitest run` completed with 367 passing files, 39 failed files and 3 skipped files; 3,231 tests passed, five failed and 419 were pending/skipped. Every failure is attributable to unavailable Docker/container setup (four Compose assertions, one knowledge-ingestion assertion, and suite setup failures). [Exact failed-file inventory](assets/2026-10-02-light-v2/full-suite-limits.json). This is a blocked integration suite, not a green full-suite claim.
