# Rules and Decisions Tracker

## Founder Decisions

| ID | Date | Decision | Status | Implemented in |
|---|---|---|---|---|
| FD-001 | 2026-08-31 | Use Superpowers only; no `/ck` or CK CLI | Approved | `AGENTS.md` |
| FD-002 | 2026-08-31 | Sol orchestrates, Terra reviews, Luna implements | Approved | `AGENTS.md` |
| FD-003 | 2026-08-31 | NestJS with Fastify | Approved | Phase 00 |
| FD-004 | 2026-08-31 | iztro `default` for public P0 | Approved | Phase 02 |
| FD-005 | 2026-08-31 | SePay | Approved | Phase 04 |
| FD-006 | 2026-08-31 | Balanced refund/regeneration policy | Approved | Phase 04-05 |
| FD-007 | 2026-08-31 | No paid Zi Wei with unresolved birth branch | Approved | Phase 01-03 |
| FD-008 | 2026-08-31 | Propagate Garage deletion to cloud S3 | Approved | Phase 05 |
| FD-009 | 2026-08-31 | Founder-provided OpenAI-compatible endpoint | Approved | Phase 04 |
| FD-010 | 2026-08-31 | Resend through SMTP | Superseded by FD-022 | Phase 05 |
| FD-011 | 2026-08-31 | Better Auth; email/password and Google | Approved | Phase 01 |
| FD-012 | 2026-08-31 | Follow master sequencing for D-019/D-020 | Approved | Phase 07, 11 |
| FD-013 | 2026-08-31 | Celestine for Western Wave 3 | Approved | Phase 09 |
| FD-014 | 2026-08-31 | Identity report is first paid SKU | Approved | Phase 04 |
| FD-015 | 2026-08-31 | Thirty-day account deletion recovery | Approved | Phase 01, 06 |
| FD-016 | 2026-08-31 | Free experience option A | Approved | Phase 03 |
| FD-017 | 2026-08-31 | Reuse founder-managed host Nginx | Approved | Phase 06 |
| FD-018 | 2026-08-31 | Stable random loopback host port | Approved | `AGENTS.md`, Phase 06 |
| FD-019 | 2026-08-31 | Approve Blueprint v1.1 as canonical UX, route, and SEO source while preserving approved technical decisions, including one-SKU-first | Approved | Architecture spec, Phase 00, Phase 03 |
| FD-020 | 2026-08-31 | Purge unlinked anonymous birth-profile and chart data after 24 hours; preserve it under account policy only after verified account linking | Approved | `AGENTS.md`, Phase 01, Phase 03 |
| FD-021 | 2026-09-01 | Review complete features, phases, or meaningful milestones instead of every small implementation task; keep focused core-flow verification | Approved | `AGENTS.md` |
| FD-022 | 2026-09-01 | Use the founder-provided MXRouting SMTP connection for authentication and report email; port 587 requires reviewed STARTTLS behavior | Approved | Phase 01, Phase 05 |
| FD-023 | 2026-09-01 | From P01-T02 onward, Terra medium directly implements, debugs, and runs focused tests; Sol xhigh orchestrates and reviews milestones; Luna is paused | Approved | `AGENTS.md`, P01-T02 onward |
| FD-024 | 2026-09-01 | Defer user-facing UI to a dedicated artifact branch and implement it only against the approved artifact; current branches focus on non-visual work | Approved | `AGENTS.md`, current implementation phases |
| FD-025 | 2026-09-02 | Promote `/du-bao-cung-hoang-dao` to the Gate 1 public `live_indexable` surface and keep `/horoscope` as an archived 301 redirect to it; other Horoscope routes remain reserved and visual rendering stays deferred by FD-024 | Approved | Phase 03 route registry, content metadata, and SEO contracts |
| FD-026 | 2026-09-02 | Use the founder-operated OpenAI-compatible provider identity `9router-an` through raw `fetch`; implement the non-visual AI/report foundation before SePay, and block production report calls until provider privacy due diligence is complete and approved | Approved | Phase 04 AI provider, capability probe, report writer, validator, critic, and compliance gate |
| FD-027 | 2026-09-02 | Approve Operations Dashboard V1 Option A as dedicated Phase 05A: private server-authorized `/admin/**`, database-backed RBAC/capabilities, redacted inspection, audited compensating domain commands, and no CMS; full CMS/back-office content editing is deferred | Approved | Admin dashboard spec, Phase 05A, Phases 04-06, contracts, risks, and release gates |
| FD-028 | 2026-09-02 | Rename the active implementation branch to `feature/paid-flow-admin-operations`; implement paid-flow and Admin/Operations work on this branch, begin provider-independent Phase 05A work now, and defer SePay-dependent checkout/webhook activation until the founder supplies the required environment values | Approved | `AGENTS.md`, master plan, Phase 04, Phase 05A |
| FD-029 | 2026-09-03 | Paid checkout requires an authenticated account with verified email. Anonymous actors remain free-flow only. Immutable commerce records use the durable account owner and must not reference anonymous/profile/chart lifecycle records with retention-blocking foreign keys. | Approved | Phase 04, `AGENTS.md`, commerce schema and checkout authorization |
| FD-030 | 2026-09-03 | Approve the Payment Gateway Sandbox for the first SePay external test. Hosted checkout omits `payment_method`, so SePay presents merchant-enabled methods such as VietQR or cards. Production payment activation remains a separate founder-controlled gate. | Approved | Phase 04 sandbox activation gate |

## FD-028 Execution Boundary

- The prior remote branch `plan/admin-operations-dashboard` was renamed to
  `feature/paid-flow-admin-operations`.
- Phase 05A access, RBAC, redaction, audit, route, and provider-independent
  operational foundations may proceed immediately.
- Missing SePay environment values block only the SePay adapter, checkout,
  webhook activation, and external provider smoke. They do not authorize
  mocks, fake payment success, committed secrets, or unverified defaults.
- Production payment activation remains a separate founder-controlled gate.

## FD-027 Planning Evidence

- The detailed design is
  `docs/superpowers/specs/2026-09-02-admin-operations-dashboard-design.md`.
- Phase 05 keeps storage, delivery, and owner account-center scope; Phase 05A
  owns staff operations, support, RBAC, audit, and recovery.
- Foundation may begin after Phase 03; closure depends on Phases 04 and 05;
  Phase 06 paid release depends on Phase 05A.
- Admin V1 uses redacted projections only. Unredacted sensitive-detail reveal
  requires a separate founder-approved privacy scope and is deferred.
- CMS editing, arbitrary SQL, direct BullMQ requeue, secrets display, direct
  payment mutation, and in-place chart/report mutation remain prohibited.

## FD-024 Completion Evidence

- The approved UI artifact was implemented on a dedicated feature branch and
  merged to `master` through pull request #3 on 2026-09-02.
- FD-024 remains the artifact-first rule for future visual work, but it no
  longer blocks the implemented free-MVP interface.

## Durable Rule Evaluation Log

This log records evaluation. It does not replace `AGENTS.md`.

| Candidate | Evidence | Terra result | Disposition |
|---|---|---|---|
| Normalize line endings in repository-text assertions | Fresh Windows worktree baseline passed 268/269 tests after build; the sole failure compared raw LF against CRLF in `.github/workflows/ci.yml` | Approved technical correction | Added to `AGENTS.md`; baseline fix assigned before P05A-T01 |
| Superpowers-only workflow | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Role authority and stop protocol | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Durable-rule distillation process | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Loopback stable high host port | Direct founder deployment invariant dated 2026-08-31 | Approved with clarification that randomness is not security | Added to `AGENTS.md` |
| Phase-scoped founder decision gates | Repeated open commercial and safety choices in Phases 07-11 | Terra approved minimal operational rule | Added to `AGENTS.md`; tracked in `open-decisions.md` |
| Single route-definition source | Terra found Blueprint YAML and TypeScript catalogs competing | Approved after source reconciliation | Added to `AGENTS.md`; YAML data plus typed loader |
| Anonymous chart retention | Founder approved the recommended 24-hour privacy boundary | Approved | Added to `AGENTS.md`; tracked as `FD-020` |
| Integration-branch-aware PR targets | Terra found direct-to-master wording conflicting with approved feature-to-product flow | Approved clarification | Updated in `AGENTS.md` and collaboration workflow |
| Route activation ownership | Final Terra review found private pages created without registry promotion ownership | Approved recurring invariant | Added to `AGENTS.md`; route tasks now own registry and crawl-state tests |
| Milestone-based review cadence | Direct founder instruction after task-level review caused unacceptable delivery delay | Approved | Added to `AGENTS.md`; per-task review is no longer the default |
| Delegated Windows worktree anchoring | Required reads repeatedly resolved from the controller root instead of the assigned worktree, stopping P00-T02 and P00-T03 | Approved recurring invariant | Added to `AGENTS.md`; delegated commands must anchor and verify the absolute worktree |
| Missing create-target handling | Discovery stopped when `rg` inspected `.github` before the task created it | Approved recurring ambiguity | Added to `AGENTS.md`; absent create-targets are expected, while missing required sources remain blocking |
| Exact-version integration preflight | P01-T01 repeatedly used unverified Drizzle, Vitest, and Testcontainers integration behavior | Terra approved narrowed task-critical rule | Added to `AGENTS.md`; approved briefs must record only task-relevant exact-version facts |
| Authentication anti-enumeration success versus delivery | A repeated sign-up for an existing unverified account returned Better Auth's generic success without creating a new notification delivery, while the UI presented that response as proof that verification email was sent | Sol confirmed the provider response intentionally hides account existence and approved an explicit provider-backed resend path with conditional copy | Added to `AGENTS.md` under repository and operational safety |
| Terra direct-execution workflow | Founder changed the active role model from P01-T02 to reduce implementation latency while preserving milestone review | Direct founder decision | Updated `AGENTS.md`; Terra medium implements/debugs/tests, Sol xhigh reviews milestones, Luna paused |
| UI artifact branch boundary | Founder reserved visual implementation for a later artifact branch | Direct founder decision | Added to `AGENTS.md`; non-UI branches may implement server routes and headless flows but not visual UI |
| File-like dynamic route params | P03-T01 tests initially passed an extensionless sitemap key instead of the emitted `.xml` filename | Terra fixed the localized regression and added production-shaped coverage | Not added to `AGENTS.md`; one isolated incident does not meet section 9, and the regression test is the durable guard |
| BFF error provenance | P03-T01 briefly reclassified missing private API configuration as a caller path error | Terra separated base configuration resolution from caller path validation and added regression coverage | Not added to `AGENTS.md`; one localized defect does not meet section 9 |
| Immutable normalized read authority | P03-T02 initially recomputed eligibility from mutable original input instead of the stored normalized revision | Terra added the shared normalized schema and a disagreement regression test | Not added to `AGENTS.md`; the architecture already requires immutable revisions and one localized defect does not meet section 9 |
| Async session liveness clock | P03-T02 initially reused a timestamp captured before the authoritative session read | Terra moved clock capture to the live-row lookup and added a sequenced-clock regression test | Not added to `AGENTS.md`; one localized TOCTOU defect does not meet section 9 |
| Evidence-gated calculation completion | P03-T03 found the evidence service existed but successful calculation responses did not ensure required evidence persistence | Terra wired idempotent evidence persistence to calculation completion; the pattern applies to future calculation engines and report consumers | Added to `AGENTS.md` under calculation completion and evidence |
| Workspace declaration freshness | P01-T02 and P03-T04 independently encountered dependent typechecks reading stale workspace declarations from producer `dist` output | Sol confirmed the recurring producer-consumer build-order failure and narrowed the action to packages consumed through exports/generated declarations | Added to `AGENTS.md` under repository and operational safety |
| Generated public-content publication boundaries | P03-T06 initially allowed mixed-locale, encoding-corrupted, unsupported-source, and localized unsafe copy across the Gate 1 corpus | Sol confirmed one severe repository-wide incident and narrowed the rule to deterministic locale integrity plus canonical repository source containment before publication | Added to `AGENTS.md` under repository and operational safety |
| AI provider privacy production gate | FD-026 confirms a founder-operated provider but retention, training, region, subprocessors, deletion, access, and incident terms remain unknown | Existing architecture sections 18-19, `AGENTS.md` privacy/secret gates, and R-24 already require written due diligence before production use | No `AGENTS.md` change; implement the existing fail-closed gate and retain R-24 |
| Pre-controller authorization denial audit | P05A-T01 initially returned `notFound()` for missing, anonymous, and unverified admin sessions before the private API could record the denial | Sol confirmed a severe access-audit gap and approved a trusted server-to-private-API denial path without anonymous session creation or a public audit-write endpoint | Added to `AGENTS.md` under administrative and operational surface safety |
| Aggregate admin projection capability enforcement | P05A-T02 twice allowed aggregate data to outlive or bypass active database capability narrowing: first through role-only module visibility, then through unconditional readiness data | Sol required a new projection-boundary cycle with active entry capability selection plus per-field/module query and response gating | Added to `AGENTS.md` under administrative and operational surface safety |
| Transactional admin command outcome ownership | P05A-T05 repeatedly allowed deterministic post-authentication role-command outcomes to bypass atomic receipt/audit persistence through pre-transaction classification, stale receipt replay, and database-constraint fallthrough | Sol approved authority revalidation before replay plus repository ownership of every deterministic result, with atomic bounded receipt/audit evidence and duplicate-free replay | Added to `AGENTS.md` under administrative and operational surface safety |
| SePay payment confirmation boundary | Verified SePay contract and Sol review require provider hosts/actions to come from a closed environment enum; hosted return URLs are navigation-only, while only an authenticated provider notification validated against order identity, state, amount, and currency can mutate or confirm payment | Approved combined payment-boundary rule | Added to `AGENTS.md` under repository and operational safety |
| SePay sandbox VPS gate correction and deployment | Test-only commit `200b852` aligned migration `0010` command receipts and made the outbox fixture use persisted runtime time with row/event isolation; VPS verification then passed focused tests, Compose deployment, structural database checks, health checks, synthetic non-paid IPN probes, and browser callback smoke | Existing workspace producer build-order, runtime-clock fixture, and payment-boundary rules cover the issues | No `AGENTS.md` change; FD-030 already authorizes the first external sandbox test |
| Unauthenticated provider setup probes | SePay Sandbox `Send test` omitted `X-Secret-Key` before provider-side authentication was configured and received `401`; after configuring `SECRET_KEY`, a real Sandbox card transaction delivered an authenticated `ORDER_PAID` and completed the commerce transaction | A setup probe is not payment verification and must never justify weakening the live webhook | Added to `AGENTS.md` under repository and operational safety |

## Per-Task Rule Check

Every task completion report includes:

```text
Docs impact: none | minor | major
Rule candidate: none | describe recurring failure condition
Evidence: source/test/incident
AGENTS.md action: none | clarify existing rule | add reviewed rule
Open questions: none | list
```

Sol may propose a rule only when the condition meets `AGENTS.md` section 9.
Terra checks evidence, duplication, conflicts, and scope. Temporary workarounds
and task history remain in plans/reports, not `AGENTS.md`.

Open founder decisions are tracked in `open-decisions.md`. Package approval
does not silently close them.

## FD-030 Sandbox Deployment Evidence

Date: 2026-09-03

- Branch `feature/paid-flow-admin-operations` deployed at
  `200b85222a8b6eedb4692a76f31aed27c73bd214` after Sol's scoped re-review
  verdict `SAFE_TO_PUSH_AND_RERUN_VPS_GATE` with no open findings.
- The verified PostgreSQL pre-deploy backup existed before deployment. The
  workspace producer build passed; the focused Docker VPS gate passed four
  files, 18 tests, and zero failures.
- Compose deployment succeeded: migration exited `0`; PostgreSQL, Redis, API,
  and web were healthy; and the worker was running. The database reported 12
  applied migrations, requested commerce/report tables, and both report
  outbox indexes. Loopback and public HTTPS health returned `200`.
- Public synthetic IPN probes rejected a wrong secret with `401` and
  acknowledged an authenticated non-paid `TRANSACTION_VOID` with exact HTTP
  `200` success without changing commerce order, payment, entitlement, or
  reservation aggregate counts.
- Browser smoke rendered live VI/EN home pages and kept EN and VI checkout
  login callbacks locale-correct. Production Playwright was not a pass: the
  existing specs set their locale cookie for `127.0.0.1` and failed before the
  exercised form flow. This is a local-runtime harness limitation, not a
  production defect; no scope expansion is authorized.
- A real Sandbox card transaction was completed on 2026-09-03 for 79,000 VND;
  no real money moved. SePay delivered an authenticated `ORDER_PAID` to the
  public endpoint and received `200`. PostgreSQL recorded one paid order, one
  payment event, one entitlement, one report reservation, and a processed
  `report.generation.requested.v1` outbox event. The published report job remains
  `waiting`; report-consumer execution is separate follow-up work.
- Production payment activation remains a separate founder-controlled gate.

## P04 AI Execution Design

Date: 2026-09-02

- The founder selected the provider identity `9router-an` and confirmed that
  the provider is founder-operated.
- The implementation uses the existing OpenAI-compatible environment group and
  raw `fetch`; no OpenAI SDK dependency is added.
- A synthetic no-PII probe confirmed the configured model, Chat Completions,
  strict JSON Schema output, and forced tool calling.
- The probe is operational evidence only. Request retention, training use,
  processing regions, subprocessors, access controls, deletion behavior, and
  incident-notification terms remain unknown and block production AI.
- The current milestone owns pure AI/report contracts and services only.
  Queue, persistence, private report UI, PDF events, and knowledge retrieval
  remain with their existing Phase 04 tasks.
- Final implementation evidence passed 10 AI/report files with 37 tests and 14
  dependent files with 52 tests, focused ESLint, contracts/config builds,
  backend typecheck/build, and one controlled synthetic endpoint smoke.
  Commit range `45119e4..8ec6442` contains the foundation and reviewed
  corrections.
- Sol's final scoped review approved the checkpoint with zero open Critical or
  Important findings. P04-T05 remains incomplete only for its explicitly
  deferred privacy, worker, knowledge, persistence, duplicate-job, and PDF-event
  dependencies.
- Rule candidate: none. The existing privacy gate and R-24 already cover the
  reusable behavior; strict source-snapshot and locale-integrity rules already
  cover the implementation lessons. Open questions: provider privacy terms
  remain pending.

## P03 Non-Visual Slice 1 Evidence

Date: 2026-09-02

- Implemented the server-only private BFF client and registry-derived robots,
  sitemap index, and section sitemap contracts without modifying visual UI.
- Corrected production `.xml` route-param handling, canonical English root
  output, same-origin token confinement, safe non-success error propagation,
  and current-build browser-boundary verification.
- Fresh verification passed: web build, web typecheck, and 4 focused files
  with 14 tests. Commit range `09fa19c..b637891` is pushed.
- P03-T01 visual layouts, home presentation, navigation, and browser UI checks
  remain deferred by FD-024.
- Rule candidates were evaluated above; neither meets the durable-rule
  threshold. Open questions: none.

## P03 Non-Visual Slice 3 Evidence

Date: 2026-09-02

- Implemented evidence-gated Zi Wei calculation completion, actor-authorized
  latest chart and selected-evidence reads, private API endpoints, and
  server-only BFF loaders without visual UI changes.
- Cross-owner and missing chart IDs are indistinguishable; evidence remains
  bound to the exact latest chart version, capability, and rule version.
- Strict contracts prevent chart responses from carrying full evidence
  payloads and prevent evidence responses from carrying unrelated items.
- Fresh verification passed: 4 focused files with 17 tests plus contracts,
  backend, API, and web typechecks and backend build. Commit range
  `6af39a4..f595dc4` is pushed.
- P03-T03 visual chart/drawer/page/message/browser work remains deferred by
  FD-024.
- The evidence-gated completion rule was added to `AGENTS.md`. Open questions:
  none.

## P03 Non-Visual Slice 4 Evidence

Date: 2026-09-01

- Implemented strict free-preview and topic-selection contracts, deterministic
  evidence-backed preview construction, server-authoritative product catalog,
  privacy-safe analytics emission, actor-authorized private API operations,
  and server-only web loaders/actions without visual UI changes.
- Milestone review found and corrected production evidence-ID mismatch,
  authorize-before-SKU ordering, incomplete relational evidence validation,
  and a no-op production analytics sink.
- Fresh implementation evidence passed 9 focused files with 32 tests plus
  contracts, config, backend, API, and web typechecks. Commit range
  `d050475..11fcda8` is ready to push.
- Sol scoped re-review approved all four corrections with zero open
  Critical/Important findings.
- The repeated workspace declaration freshness failure was added to
  `AGENTS.md`. Open questions: none.

## P03 Non-Visual Slice 5 Evidence

Date: 2026-09-02

- Implemented server-only public-content loading, locale-aware route
  resolution, canonical/alternate/robots metadata, and pure JSON-LD builders
  without visual UI changes.
- Milestone review found and corrected embedded route placeholders, missing
  stable route errors, ignored explicit canonicals, collapsed robots policy,
  and an archived redirect targeting a reserved route.
- FD-025 promoted only `/du-bao-cung-hoang-dao` to `live_indexable`, added
  published VI/EN metadata, and retained `/horoscope` as a 301 redirect to the
  now-live canonical. Other Horoscope routes remain reserved.
- Fresh implementation evidence passed 7 focused files with 25 tests plus
  config build and web typecheck. Commit range `ea95a8f..5377db9` is ready to
  push.
- Sol scoped re-reviews approved all five findings with zero open
  Critical/Important issues. Rule candidate: none. Open questions: none.

## P03 Non-Visual Slice 6 Evidence

Date: 2026-09-02

- Added 54 reviewed VI/EN public documents for all 27 current Gate 1 routes:
  34 core pages and 20 Zi Wei foundation articles.
- Initial milestone review rejected mixed-locale/template-thin copy, an
  incomplete sample report, unsupported sources, and incomplete publication
  gates. Two correction passes rebuilt the corpus, source registry, schemas,
  public-link checks, FAQ parity, and canonical source containment.
- The two-pass breaker kept locale integrity open. Sol replanned with exact
  `franc-min@6.2.0` trigram detection rather than repeating the wordlist
  approach. Whole-document, block, heading-free, and rolling-window analysis
  now rejects linked, heading-prefixed, fragmented, ASCII-stripped, and
  accent-injected foreign prose while preserving current technical Vietnamese.
- Fresh focused evidence passed 6 Gate 1 content tests, config build and
  typecheck, and the checker validated all 54 documents. Sol approved the new
  detector cycle with zero open Critical/Important findings.
- The generated public-content publication-boundary rule was added to
  `AGENTS.md`. Visual rendering and browser checks remain deferred by FD-024.
  Open questions: none.

## P03 Non-Visual Slice 2 Evidence

Date: 2026-09-02

- Implemented authoritative current-actor resolution, consent-first
  BirthProfile submission, shared Zi Wei eligibility contracts, and strict
  server result projection without visual UI changes.
- Stored normalized revisions now remain authoritative on reads; validation,
  ownership, anonymous expiry, and operational errors preserve distinct
  contracts.
- Anonymous actor and Better Auth session expiry are both checked using a fresh
  lookup clock.
- Fresh verification passed: 3 focused files with 26 tests plus contracts,
  backend, and web typechecks. Commit range `9138b15..59c587d` is pushed.
- P03-T02 visual form/page/message/browser work remains deferred by FD-024.
- Rule candidates were evaluated above; neither meets the durable-rule
  threshold. Open questions: none.

## Task 5 Founder-Run MVP Packaging And Gender Correction

Date: 2026-09-02

- Added production-like Docker images and Compose topology for web, API,
  worker, one-shot migrations, PostgreSQL, and Redis. Only web binds to a
  configurable loopback host port; service data persists in named volumes.
- Added focused Compose and host-port invariants, a deployment runbook, and a
  real-stack smoke path. Images run as non-root, app services restart unless
  stopped, and Docker logs are capped.
- Founder approved the explicit Zi Wei gender input on 2026-09-02. Step 2 now
  requires `Nam`/`Nữ`, serializes `male`/`female` without defaulting or
  inference, explains cycle direction, and shows the selected value in Step 3.
- Fresh real-stack smoke passed: profile persistence, Zi Wei calculation,
  chart, evidence drawer, and free identity preview. The founder-authorized
  registration email remains recorded as sent.
- No durable AGENTS.md rule was added. This was one corrected product-input
  omission, not a repeated or repository-wide failure pattern. Open questions:
  none.

## P01-T02 Evidence

Date: 2026-09-01

- Scope: non-visual authentication, identity, SMTP, and API/BFF work only;
  no pages, forms, components, navigation, layouts, styling, or visual states.
- Database migration and ownership-transfer acceptance passed: 3 tests.
- Focused auth/config/backend checks passed: 44 tests. Full repository suite
  passed: 83 tests. Root typecheck and build passed after rebuilding producer
  declarations.
- Browser E2E is not marked green. The exact Playwright command found no
  controlled Next/PostgreSQL runtime at `http://127.0.0.1:3000/`; a later
  authorized runtime must run that gate.
- No external SMTP send or Google request occurred. Rule candidate: none.

## MVP Verification Email Resend Correction

Date: 2026-09-03

- Production evidence showed that Better Auth returned its intentional generic
  success for a repeated sign-up using an existing unverified email address,
  but did not create another notification delivery. SMTP DNS and TCP port 587
  remained reachable, and the account's earlier verification delivery was
  recorded as sent.
- The browser auth adapter no longer treats generic sign-up success as email
  delivery confirmation. The sign-up panel now uses conditional,
  enumeration-safe copy and exposes an explicit Better Auth-backed resend
  verification command without automatically sending a duplicate email for a
  newly created account.
- TDD evidence: the focused auth action suite first failed four assertions
  against the previous behavior, then passed all five tests after the
  correction. Web typecheck, production build, and i18n parity also passed.
- Commit `d7f85ee` was deployed to the VPS web service while API, worker,
  PostgreSQL, and Redis remained running. The replacement web container became
  healthy and the public health route returned HTTP 200.
- One founder-authorized resend request returned HTTP 200 with
  `{"status":true}`. The matching verification-delivery count increased from
  one to two; the new delivery reached `sent` on its first attempt with a
  provider message ID present. The founder confirmed inbox receipt on
  2026-09-03.
- The authentication anti-enumeration rule was added to `AGENTS.md`. Open
  questions: none.

## P01-T03 Evidence

Date: 2026-09-01

- Implemented the approved FD-015 recovery state machine and FD-020 anonymous
  retention policy through database-backed services and private API routes.
- Verified actor tokens, not browser-provided identifiers, control account
  deletion. The headless Fastify boundary test rejects anonymous actors.
- Purge orchestration writes audits and opaque versioned outbox events; later
  Phase 06 object-purge work remains responsible for retained legal
  transaction fields and downstream asset deletion.
- Focused and root verification passed. No external side effect occurred.
- Rule candidate: none. Existing durable rules cover this implementation.

## P01-T04 Evidence

Date: 2026-09-01

- Implemented the canonical `BirthProfileV1` contract and normalization path
  without inventing a birth minute for branch-only, ranged, or unknown input.
- Exact solar minutes preserve UTC derivation and timezone provenance; lunar
  inputs remain explicitly unconverted pending a reviewed calendar adapter.
- Profile commands use verified internal actors, append immutable revisions,
  retain anonymous expiry, and reject browser-provided ownership fields.
- Focused birth-profile and migration verification passed. No external side
  effect occurred. Rule candidate: none.

## MVP Vietnamese Typography Correction

Date: 2026-09-02

- Live production diagnostics confirmed that the remote Google Fonts CSS import
  produced no registered font faces or font resources, so Vietnamese UI and
  display text rendered through system and Georgia fallbacks.
- Replaced the runtime import with Next.js-bundled Be Vietnam Pro, Source Serif
  4, and JetBrains Mono faces with Vietnamese subsets and role-specific CSS
  variables.
- The focused typography regression failed against the previous Compose image,
  then passed after rebuilding only the web service. Fresh web typecheck and
  production build also passed.
- Sol xhigh review found zero Critical or Important issues and marked the fix
  ready. The production typography rule was added to `AGENTS.md`. Open
  questions: none.

## MVP VPS Release Integration Gate

Date: 2026-09-02

- The release branch was verified as 87 commits ahead and zero commits behind
  `origin/master` before integration.
- Fresh Docker builds completed for web, API, worker, and migration images.
  Compose started PostgreSQL and Redis healthy, completed migrations, started
  the worker, and gated healthy API and web services in dependency order.
- Deployment tests confirmed that only web publishes on
  `127.0.0.1:${WEB_HOST_PORT}`, while API, worker, PostgreSQL, and Redis remain
  private with persistent data volumes and bounded container logs.
- Release review found that the web image baked the local Better Auth loopback
  URL into browser code. The client now uses same-origin auth, the image has no
  public auth build argument, and VPS guidance requires
  `BETTER_AUTH_URL=https://lasoviet.vn` while Nginx retains the loopback
  upstream.
- A stale E2E chart fixture was replaced with a real anonymous chart flow.
  Focused no-email release verification passed with five tests and one
  intentionally skipped registration-email test.
- Initial GitHub CI failed because production ESLint rules scanned generated
  `prototype/**/support.js` bundles. The prototype artifact tree is now excluded
  from production lint without modifying generated files; local i18n and lint
  gates pass.
- The full local CI run then exposed one brittle layout source assertion and
  anonymous-link success fixtures whose fixed expiries had become past dates.
  The assertion now verifies the locale attribute independently of unrelated
  HTML props, and success expiries derive from the captured test clock. The
  complete Vitest suite passed 267 tests across 68 files at that correction
  point.
- GitHub CI then exposed that a clean checkout had no generated package
  declarations before consumer typechecks. The root typecheck command now
  builds `packages/**` producers topologically before recursive typechecks.
  A detached fresh-worktree verification passed without pre-existing `dist`
  output, and the final full local check passes 268 tests across 68 files.
- The next clean CI run exposed that the browser-boundary test requires current
  `.next/static` artifacts while both the root check and workflow ran tests
  before the build. Build now precedes tests in both paths, and a focused
  workspace regression locks that order. Fresh local verification passes 269
  tests across 68 files.
- The public-origin versus internal-upstream rule was added to `AGENTS.md`.
  Runtime Compose inspection was also restricted to structural fields so
  external deploy environments are never emitted wholesale. The generated
  prototype lint-boundary and runtime-clock fixture rules were added as well.
  Open questions: none.
