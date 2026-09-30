# Backlog execution — 2026-09-30

## Authorization and boundaries

The owner authorized Kaneo reconciliation and all implementation that can proceed without further owner decisions. Preserve existing untracked files, dirty worktrees, divergent local master commits and stashes. Use one ticket branch/PR per bounded implementation. Do not mark Done without deployment and recorded smoke evidence. Hold explicit founder decisions, including ticket 70 and the ticket 68 production writing-tuple activation gate, and report them together.

Baseline: origin/master `223aa5d0`; 16 open PRs, 21 worktrees, 39 local branches, 9 stashes. Main worktree remains on the already-merged wallet-dialog branch with three untracked handoff plans.

Snapshot updated at 2026-09-30 11:17 UTC. CI statuses below are an audit snapshot; current checks are on the linked PRs.

## Work packages and evidence

| Ticket | Bounded brief | State / evidence |
|---|---|---|
| 50 | Verify release and payment smoke evidence | In Review; authenticated payment sandbox smoke remains outstanding |
| 51 | Complete kept intent, automatic continuation and residual balance UX | PR230 bfb42e39: authenticated settlement continuation, immutable QR binding, shared natal refund recovery and safe residual balance UX; 208 authority/schema +44 money lifecycle checks; both CI verify jobs pass |
| 52 | Reconcile merged catalog against closure evidence | PR 207 merged; returned Done to In Review because task lacks catalog/rollover deployment smoke |
| 53 | Refresh PR 208; verify secure projections and build | PR208 refreshed; 42 focused tests, required checks and production build pass; both GitHub verify jobs pass |
| 54 | Share natal generation across palace purchases; enforce exact owned scope | PR227 opened (45fe4149); shared immutable natal reservation, exact palace projection, full-PDF authority; focused/security and25 schema tests pass |
| 55 | Refresh PR 203; verified-session grant and receipt-backed notice | PR203 8f0a9b23: verified-session grant and receipt notice with semantic theme tokens; focused and required checks pass; both CI verify jobs pass |
| 57 | Refresh PR 209; retain serializable dialog labels and analytics hooks | PR209 updated773a5978; current dialog/analytics preserved;58 focused checks and both GitHub verify jobs pass |
| 58 | Complete topic writing plumbing and real-generation acceptance runner | Draft PR211: immutable topic delivery, owned projection/export, atomic480La/refund/relock;187 focused +13 database +4 campaign +3 browser checks. Real provider campaigns are blocked by absent configuration; sale remains reserved |
| 59 | Refresh PR 210; atomic restore/revoke/claim and feedback UI | PR210 f81d9809: atomic refund/revoke, report-to-chart ownership checks, full-PDF guard and semantic feedback UI; focused/database/browser and required checks pass. Both latest CI verify jobs pass after retrying a transient font build failure |
| 60 | Reconcile PR 212; complete delivery integrations when dependencies exist | PR236 bba285d5: confirmed top-up plus absent presence plus ready owned report; durable verified-sign-in nurture; engine-grounded annual reminders, consent/unsubscribe/deduplication and dispatch rechecks. 87 focused +30 boundary checks and required gates pass; CI pending |
| 61 | Reader locked previews, rollover upgrade and locale links | PR228 77d545dc; backend price quotes, secure placeholders, locale links;79 regressions +3 browser +required checks and both CI verify jobs pass |
| 62 | Complete daily endpoint, persistence and expiry enforcement | PR213 d0c0333e:60La per-date atomic delivery, persisted bonus expiry, private reader and daily guarantee; schema25 and commerce34 regressions, production build and both CI verify jobs pass |
| 63 | Month/year writers grounded in engine periods | Draft PR232 a096f9f8: exact lunar/leap-month facts, immutable dedicated writer, per-period purchase identity, owned reader/export, monthly rollover guards and report-specific refunds; focused money/content/database/browser checks and both CI verify jobs pass. Real provider acceptance remains gated |
| 64 | Atomic membership purchase, best-price discount and expiry reminder | PR234 04b14fef: atomic30/365-day manual membership, catalog-derived best-price discount, daily and per-period monthly included benefits, durable expiry reminders; 240 focused checks, production build and required gates pass. Full suite had three5s timeouts; unchanged-timeout isolated rerun31/31 passed. Paid-tool variants remain forthcoming |
| 65 | Atomic lifetime + annual combo | Draft PR235 96c7bceb: atomic1300La one-spend/two-entitlement purchase (1040 member price), shared natal reuse, closed annual provenance, rollback/replay/concurrency and restoration revocation; 66 focused +102 regressions and required gates pass. Migration replay correction verified with25 schema tests; reserved until annual content acceptance |
| 66 | Two-chart compatibility with explicit consent | Planning-only PR231 cbac4ab8,10 contract tests and both CI checks pass. OD005 requires combined Zi Wei plus BaZi and both stability gates; BaZi source adapter is absent, so runtime implementation remains blocked |
| 68 | Implement approved beginner writing plan beside existing tuple | DraftPR226 f450771d implemented;1069 focused +privacy checks, required checks pass; default tuple unchanged; real20/owner5 activation gate remains |
| 69 | Mobile chart navigation, triad geometry and print | PR229 d1adbf32;128 reader +3 browser tests, Next build, required checks and both CI verify jobs pass |
| 70 | Free result redesign | Hold: explicit final founder confirmation and free-palace generation scope/cost |

## Decisions and closure evidence still needed

- Ticket 70 final design/copy approval, including pending PR 220, and free-palace generation budget/scope.
- Ticket 68 founder review of five real passing samples before switching production tuple. The approved ordinal0–7 teaser window yields eight teasers when the current cycle is outside that window; preserve this conflict for a founder decision rather than silently shifting it.
- Ticket66 requires the missing stable BaZi source system and finalized combined compatibility contract (OD005); the current PR is design only.
- Real AI output acceptance for58/63/68 requires configured provider, allowed model IDs, knowledge database and the existing production gate; no substitute fixture acceptance.
- Monthly membership inclusion is implemented behind the monthly catalog gate. Paid-tool variants still need exact approved contracts: FD-093 calls the inclusions a starting hypothesis, with methodology/privacy gates for feng shui and palmistry and undefined personalized output/evidence rules for other tools. Keep membership sale reserved until promised benefits and review gates are met.
- Authenticated payment/catalog/unlock smoke evidence before Done transitions.
- Policy-changing legacy documentation PRs require checking against current recorded decisions; do not merge obsolete instructions mechanically.

This is the active execution ledger. The three untracked September 27–28 handoff files are historical working notes and are preserved, but their PR/status statements are superseded by the live audit above.

## Integration observations

- New migration journal indices must stay contiguous on each branch; reserved filenames do not justify journal gaps. Historical schema rewind tests must remove all newer journal rows and dependent test tables.
- Topic real-provider acceptance cannot run from the current shell: AI provider and database environment variables are absent. The recorded engine preflight is explicitly not sellability evidence.
- Package63 verified local iztro monthlyList returns12 regular periods,13 or14 with leap months. Preserve actual lunar month, leap flag and half-month range instead of array positions.

## Read-only live availability

The anonymous production probe returned200 for homepage, top-up, sign-in, robots and sitemap; the account page redirected to sign-in with callbackURL. See `plan/evidence/2026-09-30-public-availability.json`. This does not prove authenticated webhook replay, new branch deployment or payment smoke. No payment, email or deployment was triggered by this probe.

## Combined integration candidate

Draft PR237 (`feature/backlog-integration-20260930`) composes the ticket implementations without activating reserved products or changing the production writer tuple. It retains both verified-session grant and notification sign-in hooks, reconciles shared reader projections and theme styles, orders migrations0053/0054 contiguously and preserves confirmed top-up consent plus analytics. Twenty isolated browser cases pass across feedback, wallet confirmation, upgrades, chart navigation, period/topic readers and print. Required i18n/lint/typecheck, content checks and full production build pass. Migration replay correction220b6d0e passes25 schema tests; Full run:389 files/3487 tests passed, with10 failures isolated to schema upgrade replay; after correction all25 schema tests pass on integration and combo branches. The17 Node script tests also pass; two existing Vitest tests remain skipped. See `plan/evidence/2026-09-30-integration-validation.json`. Latest remote CI is still running.

## Workspace audit

The final implementation set has35 worktrees and52 local branches. The main worktree remains `fix/wallet-dialog-viewport` atd383fa93 with the same three untracked handoff files. All9 stashes remain, and local `master` remains4 commits ahead /64 behind `origin/master`. Seven legacy worktrees retain their uncommitted policy/tracker edits; the old unlock-state worktree retains its generated `next-env.d.ts` edit. No branch, worktree, stash or untracked file was deleted. Ticket implementation worktrees are clean.

## Older pull requests

PR31,51,52,53,54,152,177,197 and220 are preserved. PR152 still targets the old `product/experience-spec-v1` branch; policy/workflow and older plan PRs must be reconciled against current founder decisions before adoption. PR220 belongs to the explicit ticket70 confirmation hold. Passing CI alone does not approve a policy reversal or the held free-result design. No obsolete policy or older plan was merged into the integration candidate.
