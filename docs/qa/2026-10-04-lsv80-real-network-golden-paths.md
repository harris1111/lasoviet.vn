# LSV80 real-network CI milestone — 2026-10-04

Disposition: verification milestone; full LSV80 remains In Review.

The six Phase9 paths run at 390×844 and 1440×900 against the actual production build of web/API, an isolated PostgreSQL database and TLS SMTP capture. Supported signup, captured verification delivery and sign-in establish accounts; actual birth forms create charts. Canonical HTTPS uses the reviewed first-party QA proxy. No API responses are mocked and no auth sessions are manually minted.

| Path | Boundary exercised |
| --- | --- |
| Guest → chart → preview → email sign-in | Original owned chart, tab and palace preserved after sign-in |
| Funded → palace confirmation → reader | Actual120-La debit and entitlement, paid reservation-bound synthetic reader |
| Short balance → pack → simulated paid → unlock | Smallest pack selected; original immutable continuation completed; same preview and reader link |
| Excerpt → reader → lifetime upgrade | Actual240-La debit, meaningful reading before upsell,720-La quoted/confirmed upgrade, committed upgrade and retained readable report |
| Soft navigation → offer controls → top-up controls | Both active fixed offers, all12 palace choices, held products non-purchasable, all3 tabs and4 packs interactive |
| Owned missing evidence → readable error → retry | Actual API failure on an owned fault-injected evidence row; restore in finally; retry succeeds without debit |

Funding uses the trusted wallet kernel with synthetic paid orders in the owned QA database. Disabled-provider auto-approval exercises orchestration only; it is not SePay acceptance or real revenue. The reader fixture validates actual chart ownership/version, completed purchase, exact SKU, live entitlement, posted negative ledger sum and immutable command receipt before inserting contract-valid, explicitly synthetic content and a pending PDF asset. No worker or AI provider runs; AI attempt count must remain zero. Writer quality and PDF storage are not accepted by this fixture.

The browser clock starts at a fixed injected instant with advancing timers. Framework/auth transport clocks remain operational; expiry/pricing contracts use their existing frozen clocks. Test retries, video, screenshot and trace recording are disabled. Private identities, verification links, environment files and raw failure data remain outside Git; CI does not upload them. Four exact owned container/image identities and an internal-only network are checked before cleanup; setup failures also remove attempted owned resources and private credentials. Existing or unrelated resources are never deleted.

## Validation

Local twelve-path acceptance passed at both widths with zero AI calls and successful fixture cleanup. Early-certificate, network-created/client-failure and web-created/client-failure injection verify guarded cleanup. Required i18n/lint/typecheck passed (four existing lint warnings). Exact-head CI results and deployed smoke are recorded in the pull request and Kaneo. Local exploratory failures were corrected test assumptions: reservation status is requested, successful offer purchase requires clicking its progress link, a modal obscures background receipt links, upgrade appears after reading, and palace selection uses the picker. Those failed runs remain private and are not accepted results.

## Reproduction

After pnpm install --frozen-lockfile and pnpm build, install Chromium with pnpm exec playwright install --with-deps chromium and run node scripts/run-funnel-golden-paths.mjs. The runner creates a private temporary evidence directory; optionally set LSV_FUNNEL_EVIDENCE_DIRECTORY to a private path outside the repository. Docker and OpenSSL are required. CI runs the same command after the full suite.

## Remaining closure

Physical Google/4G acceptance, authenticated SePay acceptance, real writer-quality gates, clean customer baseline and staged-rollout comparison remain separate requirements. No customer conversion rate or bank revenue is inferred from synthetic data. Keep the full ticket In Review until all applicable criteria have evidence.
