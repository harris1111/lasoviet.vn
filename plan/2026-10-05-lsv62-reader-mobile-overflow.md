# LSV62 published reader mobile overflow correction

## Bounded brief

The owner authorized review, correction, merge and deployment of the included daily-reading milestone. PR #298 deployed release `37ab785a85df9a39f669a793e76cfdb9b2a07f43`. Published-image acceptance exposed horizontal overflow in the surrounding scored palace cards at 390px, even after replacing synthetic internal-ID titles with ordinary Vietnamese titles. The daily bonus panel itself fits. The earlier fixture-only explanation was insufficient.

The navigation stylesheet is loaded after the structure stylesheet and reinstates an 88px thumbnail column on mobile. Correct only the palace summary layout at widths up to 600px: hide its inline thumbnail, keep text and score bands in the single flexible column, and preserve the full chart/modal navigation. No report prose, chart calculations, commerce permissions or SKU activation changes.

Allowed files: `apps/web/src/styles/report-reader-navigation.css`, `tests/e2e/report-chart-navigation.spec.ts`, `tests/e2e/helpers/report-reader-native-snapshot.json`, and this evidence record. Upgrade the existing real-component browser case with an ordinary Vietnamese title and its existing chart-derived score, retaining whole-page overflow, focus, navigation and print assertions at 320/390/1440px. Reproduce failure before correction. Independent review, required local gates, green PR CI, merge, published deployment and isolated published-image acceptance remain required. Full LSV62 stays In Review; standalone daily 60-La sales remain reserved.

## Local regression evidence

The upgraded fixture is a schema-validated display snapshot from native Iztro 2.6.0, calculated from a synthetic 1992-06-15 08:30 male profile with the generation clock frozen at 2026-10-05T03:00:00Z and timing as of 2026-10-05. It contains 12 palaces and 102 native stars; score badges and bands use the existing published formula, with no mocked score. The original abbreviated fixture passed the page overflow assertion without detecting this layout. The upgraded pre-fix test confirmed incorrectly visible inline thumbnails at 320/390px; published-image evidence separately reproduces the actual 390→459px overflow. The initial desktop click probe hit a nested interactive control; the test now uses the summary keyboard toggle and preserves its original state.

After the mobile correction, all three existing navigation/focus/print cases pass at 320/390/1440px. They additionally verify score bands, native thumbnails hidden on mobile and visible on desktop, palace-card viewport bounds, and opening/closing summaries without page overflow. Published-image acceptance is still required; no claim that fixture-only changes fixed production CSS.

Independent Sol review: GO for the four-file working diff after focused regression and required local gates. `pnpm i18n:check`, `pnpm lint` and `pnpm typecheck` pass; lint reports four existing unrelated warnings and zero errors. All producer packages were rebuilt by the required typecheck command. `git diff --check` passes.

## Full published-fixture regression

A pre-release diagnostic using the complete published synthetic narrative and its retained private-tail marker exposed a second min-content contributor: an unbroken token expanded the card after the single-column correction (390→412px). The same whole-page assertions now reproduce failure at 320/390px in the committed real-component test, while 1440px passes. The bounded mobile rule additionally lets palace grid items shrink and wraps long tokens with `min-width: 0; overflow-wrap: anywhere`, without clipping or deleting the privacy marker. The final test retains the complete long Vietnamese fixture narrative. The earlier conditional review/CI for head `59916aed` is superseded by the final correction head.

Final full-fixture 320/390/1440 regressions pass after both mobile rules; required i18n/lint/type checks pass again (zero lint errors, four existing unrelated warnings). The embedded esbuild template was independently evaluated: paragraph copies end with two actual newlines, never literal backslash-n text. Local Next.js CSS guidance confirms import order and recommends production-build checks because CSS ordering can differ; exact published-image acceptance remains mandatory.
