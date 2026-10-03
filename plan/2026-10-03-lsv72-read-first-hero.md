# LSV72: remove the offer door before free reading

## Problem and authority

Independent A17 source review found a visible offer-page button in the result hero, before the free reading. FD-109 requires reading first and the existing completion door afterward. The guest matrix checked marked content blocks and missed this route-level button. Removing it implements the existing approved rule; the proposed in-preview purchase amendment remains unresolved and is outside this task.

## Bounded changes

- `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`: remove only the early hero offer button. Keep the completion/preview/sticky doors, save/sign-in, privacy deletion and payment completion.
- Matching page tests: full rendered page must have no offer link before the completion marker in VI/EN.
- `tests/e2e/free-result-read-first.spec.ts`: cover the full page's offer links, not only component block descendants.
- `tests/e2e/free-chart-flow.spec.ts`: move the legacy flow's offer navigation to the existing completion door; no unrelated legacy price assertions changed.
- This brief: validation and release evidence.

## Verification and release

Demonstrate the route regression fails before removal; run focused page/model/navigation tests and required i18n/lint/typecheck with producer builds. Independent source review, required PR CI, immutable-image deployment and a scoped production guest smoke must pass. Official synthetic deletion remains mandatory. No generation/payment/catalog flag changes, route changes or new translations. Full LSV72 stays open for member, WebKit/physical mobile and performance acceptance.

## Local evidence

The changed full-page VI/EN regressions failed before removal (2 failures/14 passes). After removal, 5 focused files/72 tests passed, including provenance, query state and result rendering. Required i18n/lint/typecheck passed with four existing lint warnings; producer packages rebuilt. Independent source/harness review GO, pending exact-head CI and deployed smoke. The whole-page deployment harness uses four synthetic charts across the32guest cases with official deletion finally and records its eligibility checks explicitly. No full A17 closure claim.
