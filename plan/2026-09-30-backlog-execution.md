# Backlog execution — 2026-09-30

## Authorization and boundaries

The owner authorized Kaneo reconciliation and all implementation that can proceed without further owner decisions. Preserve existing untracked files, dirty worktrees, divergent local master commits and stashes. Use one ticket branch/PR per bounded implementation. Do not mark Done without deployment and recorded smoke evidence. Hold explicit founder decisions, including ticket 70 and the ticket 68 production writing-tuple activation gate, and report them together.

Baseline: origin/master `223aa5d0`; 16 open PRs, 21 worktrees, 39 local branches, 9 stashes. Main worktree remains on the already-merged wallet-dialog branch with three untracked handoff plans.

## Work packages and evidence

| Ticket | Bounded brief | State / evidence |
|---|---|---|
| 50 | Verify release and payment smoke evidence | In Review; authenticated payment sandbox smoke remains outstanding |
| 51 | Complete kept intent, automatic continuation and residual balance UX | PR230 ba645591: authenticated settlement continuation, immutable QR binding, safe return and residual suggestions; integrated daily/refund dependencies; both CI checks pass. Shared natal integration and refund recovery hardening continue |
| 52 | Reconcile merged catalog against closure evidence | PR 207 merged; returned Done to In Review because task lacks catalog/rollover deployment smoke |
| 53 | Refresh PR 208; verify secure projections and build | PR208 refreshed; 42 focused tests, required checks and production build pass; both GitHub verify jobs pass |
| 54 | Share natal generation across palace purchases; enforce exact owned scope | PR227 opened (45fe4149); shared immutable natal reservation, exact palace projection, full-PDF authority; focused/security and25 schema tests pass |
| 55 | Refresh PR 203; verified-session grant and receipt-backed notice | PR203 updated6f67a123; verified-session grant and receipt notice; required checks and both GitHub verify jobs pass |
| 57 | Refresh PR 209; retain serializable dialog labels and analytics hooks | PR209 updated773a5978; current dialog/analytics preserved;58 focused checks and both GitHub verify jobs pass |
| 58 | Complete topic writing plumbing and real-generation acceptance runner | Draft PR211: immutable topic delivery, owned projection/export, atomic480La/refund/relock;187 focused +13 database +4 campaign +3 browser checks. Real provider campaigns are blocked by absent configuration; sale remains reserved |
| 59 | Refresh PR 210; atomic restore/revoke/claim and feedback UI | PR210 b67a80c7; atomic refund/revoke, owned feedback UI, full-PDF guard;132 regressions +42 focused +11 asset +2 browser;25 schema tests and both CI verify jobs pass |
| 60 | Reconcile PR 212; complete delivery integrations when dependencies exist | PR212 foundation CI green; delayed-unlock delivery integration in progress after51/54 authority reconciliation |
| 61 | Reader locked previews, rollover upgrade and locale links | PR228 77d545dc; backend price quotes, secure placeholders, locale links;79 regressions +3 browser +required checks and both CI verify jobs pass |
| 62 | Complete daily endpoint, persistence and expiry enforcement | PR213 d0c0333e:60La per-date atomic delivery, persisted bonus expiry, private reader and daily guarantee; schema25 and commerce34 regressions, production build and both CI verify jobs pass |
| 63 | Month/year writers grounded in engine periods | Writer/facts/campaign checkpoint38022a90; exact lunar periods and leap-month halves, snapshot-hashed facts;27 focused +4 campaign tests and40 engine source preflights. Period-specific paid delivery/refund integration in progress; real output acceptance blocked by provider configuration |
| 64 | Atomic membership purchase, best-price discount and expiry reminder | Atomic30/365-day membership, catalog-derived best-price discount, daily benefit, expiry reminders and mobile UI implemented;9 membership and25 schema tests pass. Shared natal integration and final checks continue; unimplemented monthly/tools benefits stay forthcoming |
| 65 | Atomic lifetime + annual combo | In Progress; atomic one-spend/two-entitlement implementation follows period-specific annual delivery |
| 66 | Two-chart compatibility with explicit consent | Planning-only PR231 cbac4ab8,10 contract tests and both CI checks pass. OD005 requires combined Zi Wei plus BaZi and both stability gates; BaZi source adapter is absent, so runtime implementation remains blocked |
| 68 | Implement approved beginner writing plan beside existing tuple | DraftPR226 f450771d implemented;1069 focused +privacy checks, required checks pass; default tuple unchanged; real20/owner5 activation gate remains |
| 69 | Mobile chart navigation, triad geometry and print | PR229 d1adbf32;128 reader +3 browser tests, Next build, required checks and both CI verify jobs pass |
| 70 | Free result redesign | Hold: explicit final founder confirmation and free-palace generation scope/cost |

## Decisions and closure evidence still needed

- Ticket 70 final design/copy approval, including pending PR 220, and free-palace generation budget/scope.
- Ticket 68 founder review of five real passing samples before switching production tuple. The approved ordinal0–7 teaser window yields eight teasers when the current cycle is outside that window; preserve this conflict for a founder decision rather than silently shifting it.
- Ticket66 requires the missing stable BaZi source system and finalized combined compatibility contract (OD005); the current PR is design only.
- Real AI output acceptance for58/63/68 requires configured provider, allowed model IDs, knowledge database and the existing production gate; no substitute fixture acceptance.
- Membership monthly/paid-tool inclusions are not yet delivered; keep membership sale reserved until the promised benefits and review gates are met.
- Authenticated payment/catalog/unlock smoke evidence before Done transitions.
- Policy-changing legacy documentation PRs require checking against current recorded decisions; do not merge obsolete instructions mechanically.

This is the active execution ledger. The three untracked September 27–28 handoff files are historical working notes and are preserved, but their PR/status statements are superseded by the live audit above.

## Integration observations

- New migration journal indices must stay contiguous on each branch; reserved filenames do not justify journal gaps. Historical schema rewind tests must remove all newer journal rows and dependent test tables.
- Topic real-provider acceptance cannot run from the current shell: AI provider and database environment variables are absent. The recorded engine preflight is explicitly not sellability evidence.
- Package63 verified local iztro monthlyList returns12 regular periods,13 or14 with leap months. Preserve actual lunar month, leap flag and half-month range instead of array positions.

## Read-only live availability

The anonymous production probe returned200 for homepage, top-up, sign-in, robots and sitemap; the account page redirected to sign-in with callbackURL. See `plan/evidence/2026-09-30-public-availability.json`. This does not prove authenticated webhook replay, new branch deployment or payment smoke. No payment, email or deployment was triggered by this probe.
