# WP-13 Authenticated Visual QA Brief

## Role

- Executor: Flash Executor using `ag/gemini-3.8-flash-high` with `high`
  reasoning.
- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp13-visual-qa-20260909`
- Base: `4666bb6c4055171b3e4bbc1f558ebe5dfb827d29`
- Implement and execute only this bounded local QA fixture milestone.
- Do not commit, push, merge, deploy, access production, activate payments or
  Telegram, use provider credentials, or inspect any other worktree/session.

## Objective

Create screenshot-backed browser evidence for the remaining locally testable
WP-13 authenticated states through the real production web routes and real
local private API. Use an isolated local PostgreSQL database, Redis instance,
verified Better Auth account/session, and synthetic commerce/report rows.

The physical mobile banking-app return and Harris sign-off remain outside this
brief.

## Fixed Local Runtime

- Web: `http://127.0.0.1:3011`
- Private API: `http://127.0.0.1:3012`
- PostgreSQL: `127.0.0.1:55435`
- Redis: `127.0.0.1:63424`
- Container names:
  - `lasoviet-wp13-postgres`
  - `lasoviet-wp13-redis`

Before starting, verify these three new ports are unused. Do not inspect,
attach, stop, or modify any unrelated container or service. The orchestrator
will stop the existing web-only runtime on port `3011` before the full-stack
run.

Use only fresh synthetic local secrets. Never print complete environment maps
or secret values.

## Owned Files

- `scripts/wp13-seed-authenticated-fixture.mjs`
- `tests/e2e/wp13-authenticated-visual-qa.spec.ts`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp13-visual-qa-report.md`
- `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/**`

Stop before editing any other file. Do not modify application source, package
manifests, migrations, route registry, or existing WP-13 test assertions.

## Fixture Requirements

1. Build current `@lasoviet/database`, `@lasoviet/contracts`,
   `@lasoviet/backend`, and `@lasoviet/api` producers before consuming their
   current `dist` exports.
2. Start fresh PostgreSQL 16 Alpine and Redis 7 Alpine containers using only
   the fixed names and loopback ports above.
3. Apply the repository migrations to the isolated PostgreSQL database.
4. The seed CLI must:
   - refuse non-loopback/non-WP-13 database URLs;
   - use deterministic UUIDs and customer-safe fixture copy;
   - insert one verified, non-anonymous Better Auth user and one unexpired
     session;
   - output only a JSON fixture manifest containing route IDs and the signed
     `better-auth.session_token` cookie value, with no database URL or secret;
   - sign the session token exactly as Better Auth 1.7.2 does: HMAC-SHA256 over
     the raw session token with `BETTER_AUTH_SECRET`, standard Base64, joined
     as `<token>.<signature>`;
   - seed the minimum valid profile, revision, calculation, chart version,
     evidence, order, entitlement, reservation, and optional report-version
     lineage required by the existing repositories.
5. Seed these visual states:
   - account overview with a latest readable report plus recent orders;
   - report library grouped by birth profile;
   - immutable order history including paid, pending, expired, failed, and
     refunded rows;
   - checkout `pending` with synthetic VietQR instructions;
   - checkout `paid` with no report ID;
   - checkout `expired`;
   - checkout `failed`;
   - checkout `refunded`;
   - report `pending` using a real pending reservation;
   - report `terminal_failure` using a paid order and real terminal
     reservation.
6. Use only the existing active/reserved SKU rules and valid entitlement
   scopes. Never expose raw SKU values in screenshots, URLs, fixture copy, or
   the report.
7. Start the real API on `3012` and the real production web build on `3011`
   with matching synthetic `INTERNAL_ACTOR_SECRET`, `BETTER_AUTH_SECRET`,
   isolated database/Redis URLs, canonical local Better Auth URL, private API
   URL, and synthetic `SEPAY_ENV=sandbox` bank configuration. Omit AI, SMTP,
   S3, Google, and Telegram variables. Do not send provider requests.

## Playwright Coverage

Use the signed fixture cookie through Playwright storage state or context
cookies. Exercise the canonical Vietnamese routes, not component-only fixture
pages.

Capture viewport screenshots at:

- mobile: `390x844`;
- desktop: `1440x900`.

Cover:

1. `/tai-khoan`
2. `/tai-khoan/bao-cao`
3. `/tai-khoan/don-hang`
4. every seeded `/thanh-toan/:orderId` state
5. seeded `/bao-cao/:reportId` pending state
6. seeded `/bao-cao/:reportId` terminal-failure state

For every screen:

- assert the expected semantic state marker, heading, or status role;
- assert no horizontal overflow;
- on mobile, assert every visible `button`, `a`, `input`, `select`, and
  `summary` has both rendered width and height at least 44px;
- assert visible focus for a deterministic, meaningful Tab sequence;
- assert customer-facing text and URLs do not contain `ZIWEI-`, raw report
  status codes, model/provider detail, or internal report/version identifiers;
- assert actions and sticky/fixed surfaces do not overlap visible final
  content;
- save viewport screenshots and measured JSON evidence under the existing
  WP-13 artifact directory.

Polling pages must be captured deterministically. Route the browser-side
checkout polling endpoint to return the same seeded state, or otherwise
prevent state drift without changing application code.

## Report Update

Update the existing English WP-13 report:

- preserve the already Terra-approved public/wizard evidence;
- replace locally testable authenticated `BLOCKED - NOT VERIFIED` items with
  the exact pass/fail evidence and screenshot paths;
- leave only physical banking-app return as
  `BLOCKED - NOT VERIFIED (EXTERNAL DEVICE)`;
- state that Harris alone provides final sign-off under FD-056;
- do not label overall WP-13 complete before that sign-off.

## Focused Checks

```bash
corepack pnpm@11.25.0 --filter @lasoviet/database run build
corepack pnpm@11.25.0 --filter @lasoviet/contracts run build
corepack pnpm@11.25.0 --filter @lasoviet/backend run build
corepack pnpm@11.25.0 --filter @lasoviet/api run build
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
corepack pnpm@11.25.0 --filter @lasoviet/web run build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011 \
  corepack pnpm@11.25.0 exec playwright test \
  tests/e2e/wp13-authenticated-visual-qa.spec.ts --workers=1
git diff --check
```

After checks, stop and remove only the two named WP-13 containers and stop
only the API/web processes started for this brief.

## Return

- Exact changed files.
- Exact seeded visual states.
- Focused check results and screenshot paths.
- Any blocker or measured defect.
- Confirmation that unrelated services, application behavior, production,
  providers, Telegram, payment activation, push, merge, and deploy remained
  untouched.
