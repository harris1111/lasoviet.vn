# Homepage audit implementation checkpoint — 2026-10-02

Branch: `feature/homepage-audit-execution-20261002`.
Base: `ee1cdb4` (current master at checkout). No merge or deployment.

## Implemented

- Comparison uses an ordinary wrapper with permanently visible evidence; shared legacy disclosure remains available.
- FAQ retains its existing q1-open state. Testimonials use one bounded track, physically leftward automatic movement, preserved original data, expansion/filter/dialog, separate hover and keyboard focus states, visibility and reduced-motion guards, and inert clipped/incoming cards.
- Mobile hero disclosure keeps the original form hook/subtree mounted. Hash, header, and section CTAs open the same form; modified clicks retain normal anchor behavior. One focus authority handles Trời Nam CTA requests.
- Compact Needs uses semantic IDs rather than DOM order. Secondary methods keep their allowed native disclosure.
- Exact compatible audit copy cuts applied in both locales. Nine chapters combine story/topics and comparison/USP, with retired decorative loops removed. Local spacing/control/readability tokens and a single Story scrim replace stacked padding/scrims.
- Dirty-only world rendering preserves lifecycle/fallback behavior and excludes idle time from active-frame degradation.

## Verification

- i18n parity: passed.
- Full workspace typecheck: passed after building workspace packages.
- Production web build: passed (Next.js 16.3.4 Turbopack).
- VI and EN server rendering: HTTP 200 on `/` and `/en`.
- Focused homepage, navigation, copy, and private API checks: 148 passed, 1 skipped.
- Full lint: zero errors, five warnings (four existing warnings elsewhere and one decorative hero image warning).
- Full test run: 3252 passed, 5 failed, 419 skipped; 39 failing files. Remaining failures require Docker/container runtime (missing Docker binary or PostgreSQL Testcontainers runtime). Exact failures below.
- Protected testimonial file SHA256: `3b2ae337b8be52f7521c4c33aeb60a6cc732c32510e34887f78301ead447b00f`; byte-for-byte equal to base.
- Fresh independent review identified clipped preview focus, heading reflow and CSS specificity defects; repaired. Browser verification of those repairs remains open.

## Unverified gates

Chromium installation failed with a truncated/invalid download. All three new Playwright cases fail at browser launch, before exercising application behavior. Do not claim carousel direction, keyboard behavior, measured height, screenshots, contrast or device performance passed from static markup tests. `tests/e2e/homepage-audit.spec.ts` is the executable browser handoff.

Next steps: run that suite against this branch in an environment with Chromium; measure VI/EN at 360/390/430/768/1024/1440, all carousel windows and expanded form; compare actual height to 10128px collapsed/10950px expanded at 390×844 and adjust within approved geometry. Complete actual composite contrast, mobile GPU, screen-reader and reduced-motion checks. No post-release field metric can be collected before deployment.

No saved/global theme preference override was added. The separate temporary lacquer exception needs its review gate; this checkpoint preserves current theme routing.

## Rulings

- Previous session's reported uncommitted implementation was absent from accessible worktrees and branch history. Implemented missing behavior on current master rather than restoring an older snapshot; risk: differences from the lost unpublished edits require browser comparison.
- Applied source diffs individually after inspecting current interfaces; comparison and carousel follow the later owner clarification rather than obsolete audit patch mechanics.
- Updated existing navigation/chapter tests to assert canonical Vietnamese routes and approved nine-chapter structure; retained all underlying content/asset assertions.
- Database/deployment environment failures remain visible and were not disabled to obtain a green full suite.

## Full-suite failing cases/suites

- tests/birth-profile/birth-profile.integration.test.ts > BirthProfile persistence
- tests/jobs/pdf-asset-state.integration.test.ts > PDF asset state integration
- tests/jobs/report-generation.integration.test.ts > report generation source loading integration
- tests/jobs/report-generation.integration.test.ts > immutable report version repository integration
- tests/jobs/report-generation.integration.test.ts > report generation orchestration and worker integration (Slice B)
- tests/jobs/report-worker-state.integration.test.ts > report worker state integration and lease recovery
- tests/knowledge/knowledge-retrieval.integration.test.ts > knowledge ingestion and retrieval integration
- tests/payments/sepay-webhook.integration.test.ts > SePay payment transaction
- tests/privacy/account-deletion.integration.test.ts > account deletion integration
- tests/reports/report-query.integration.test.ts > report query integration test with real database
- apps/api/src/admin-access/admin-bootstrap-cli.test.ts > first super admin bootstrap
- apps/api/src/auth/internal-actor-live.integration.test.ts > internal actor live authorization
- apps/api/src/accounts/account-center.controller.test.ts > AccountCenterController HTTP boundary with real database
- packages/backend/src/accounts/account-center.analytics.integration.test.ts > account-center analytics export integration with PostgreSQL
- packages/backend/src/accounts/account-center.service.test.ts > account-center service with PostgreSQL Testcontainers
- packages/backend/src/admin-access/report-recovery.repository.integration.test.ts > database admin report recovery repository
- packages/backend/src/admin-access/role-assignment.repository.integration.test.ts > database role assignment repository
- packages/backend/src/admin-business-metrics/business-metrics.repository.integration.test.ts > AdminBusinessMetricsRepository integration
- packages/backend/src/analytics/analytics.repository.integration.test.ts > AnalyticsRepository integration
- packages/backend/src/birth-profile/birth-profile.repository.test.ts > BirthProfileRepository composite creation
- packages/backend/src/birth-profile/reading-context.repository.test.ts > ReadingContextRepository
- packages/backend/src/commerce/commerce.repository.integration.test.ts > commerce repository - library and order history (WP-03)
- packages/backend/src/commerce/guarantee-feedback.integration.test.ts > guarantee atomicity and authority
- packages/backend/src/commerce/membership.integration.test.ts > membership wallet and expiry integration
- packages/backend/src/commerce/reconciliation-operations.test.ts > reconciliation operations and circuit breaker
- packages/backend/src/commerce/wallet-topup.integration.test.ts > wallet top-up money path (FD-105 package 1.1)
- packages/backend/src/commerce/wallet-unlock.repository.integration.test.ts > wallet unlock repository integration
- packages/backend/src/consent/consent.repository.integration.test.ts > ConsentRepository integration
- packages/backend/src/notifications/nurture-signin.integration.test.ts > VerifiedSignInNurtureService and NotificationPreferences integration
- packages/backend/src/privacy/anonymous-retention.service.test.ts > anonymous retention with PostgreSQL Testcontainers
- packages/backend/src/wallet/wallet-welcome-grant.integration.test.ts > wallet welcome grant (FD-105 package 1.6)
- packages/backend/src/wallet/wallet.repository.integration.test.ts > wallet repository
- packages/backend/src/ziwei/ziwei.repository.integration.test.ts > Ziwei calculation repository
- packages/backend/src/reports/report-query.repository.integration.test.ts > report query repository wallet authority
- packages/backend/src/reports/report-section-checkpoint.repository.test.ts > createDatabaseReportSectionCheckpointRepository
- packages/backend/src/reports/report.service.test.ts > createDatabaseReportQueueStore renewLease
- packages/database/src/schema/knowledge-v4-provenance.integration.test.ts > V4 knowledge provenance persistence
- packages/database/src/schema/reading-context.integration.test.ts > reading context database schema
- packages/database/src/schema/schema.integration.test.ts > database schema integration
- tests/deployment/compose-config.test.ts > founder-run Compose topology > keeps browser authentication same-origin without a public auth build argument
- tests/deployment/compose-config.test.ts > founder-run Compose topology > keeps every service except web private and declares the required lifecycle policy
- tests/deployment/compose-config.test.ts > founder-run Compose topology > keeps the credential-gated Garage PDF profile private and persistent
- tests/deployment/compose-config.test.ts > founder-run Compose topology > applies registry overlay images and clears build definitions from rendered configuration
- packages/backend/src/knowledge/knowledge-ingestion.service.test.ts > knowledge ingestion V4 persistence > persists approved V4 chunks and provenance edges atomically and reuses exact replay
