# Free result and purchase page revamp: interim acceptance (2026-10-09)

Measured on the local stack of the latest branch (PR chain #326 to #344 plus the icon and acceptance branches). Not released, so there is no funnel data. The readable version with screenshots is `prototype/revamp-2026-10/nghiem-thu.html`.

Repeatable measurement: `REVAMP_ACCEPTANCE_OUT=<dir> pnpm exec playwright test tests/e2e/revamp-acceptance.spec.ts` (needs the web and API running locally). It asserts no sideways scroll at six widths, no VND in the body, no "Sắp mở", the tab keyboard order, and writes tap-target, small-text and LCP numbers.

| Check | Result |
| --- | --- |
| vitest apps/web | 1463 passed, 3 skipped |
| i18n parity, lint, tsc | pass (4 old lint warnings) |
| Playwright money path (contextual-unlock, pending-unlock, inline-topup) | 88 / 88 |
| Playwright read-first (8 widths x 2 locales, history) | 19 / 20, URL history flaky (Back sometimes reloads the whole page) |
| Playwright feedback, guarantee, sign-in return | 8 / 8 |
| Stale pre-FD109 specs (chart-tabs-navigation, chart-topics-mobile-dialog, free-chart-flow) | 4 fail, need rewriting |
| funnel-golden-path | updated for the one-button flow; passes in GitHub CI (verify job of #345, which also runs the three money-path specs) |
| Decadal and Tet boundary (scripts/export-decadal-boundary-acceptance.mjs) | 30 charts x 8 dates, 107,280 invariants, 0 mismatches |
| Monthly attention (scripts/export-monthly-attention-review.mjs) | 200 charts, 0 forced, histogram 1:66 2:86 3:39 4:8 5:1 |
| Sideways scroll | none at 360/390/430/1024/1280/1440 |
| VND in body | none |
| Tap targets under 44 px | offer page 0; chart page 0 on phone, 7 header text links on desktop (shared header) |
| Text under 12 px | 13 elements on phone (radar chart labels, existing) |
| LCP (local, unthrottled) | chart 284 to 304 ms, offer 68 to 76 ms |

CI: all nine PRs (#326, #327, #339 to #345) have a passing `verify` job on their head commit. Not in CI and only run locally: free-result-read-first, revamp-acceptance.

Open: formula numbers still appear in the free overview body (rule-based text, LSV-82), price still 960 La (FD-119 not shipped), phase 6 products not in the catalog, no funnel before/after, real-site device and browser checks.
