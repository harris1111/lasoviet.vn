# Phase 06 Production Readiness and Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`.

**Goal:** Prove the complete P0 flow in the target Docker Compose topology and
prepare a controlled founder-operated launch.

**Architecture:** Host Nginx points to one stable loopback web port. Compose
keeps all other services private. Release evidence combines tests, security,
backup/restore, operational smoke, and internal report review.

**Tech Stack:** Docker Compose, PostgreSQL, Redis, Garage, Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Task Contracts:** Task N maps to `P06-T0N` in
`task-contracts-and-test-vectors.md`.

## Global Constraints

- Repository automation does not modify Nginx, Cloudflare, DNS, or production.
- Deployment requires explicit founder approval and credentials.
- Optional AI/cloud failures degrade report work without taking down free
  calculation.
- No launch with an open severity-1 calculation/payment/privacy defect.

---

### Task 1 [P06-T01]: Build production images and Compose topology

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `apps/api/Dockerfile`
- Create: `apps/worker/Dockerfile`
- Create: `docker-compose.yml`
- Create: `docker-compose.production.yml`
- Create: `.env.example`
- Create: `scripts/select-web-host-port.mjs`
- Create: `scripts/validate-web-host-port.mjs`
- Create: `docs/runbooks/web-port-and-nginx-handoff.md`
- Test: `tests/deployment/compose-config.test.ts`
- Test: `tests/deployment/web-host-port.test.ts`

**Interfaces:**
- Produces services `web`, `api`, `worker`, `migrate`, `postgres`, `redis`,
  `garage`.
- Produces a selected-once, externally persisted, validated `WEB_HOST_PORT`.
- Produces explicit restart and capped Docker log-retention configuration.

- [ ] **Step 1: Write failing Compose assertions**

Assert web loopback binding, port range, no host ports for private services,
persistent volumes, health checks, one-shot migration, and no Nginx service or
config mutation. Assert `unless-stopped` for long-lived services,
`restart: "no"` for migrations, and `json-file` limits `10m`/`5`.

Write port tests proving first selection, external-file persistence, restart
reuse, occupied-port rejection, repository-path rejection, missing
`DEPLOY_ENV_FILE`, and unresolved `WEB_HOST_PORT`.

- [ ] **Step 2: Run deployment tests**

Run:
`pnpm vitest run tests/deployment/compose-config.test.ts tests/deployment/web-host-port.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement multi-stage images and Compose**

Images run non-root where supported and contain only runtime files.

- [ ] **Step 4: Implement operator-run port selection**

`select-web-host-port.mjs` writes only to an explicit path outside the
repository. It reuses an existing valid value and never edits Nginx. A later
collision blocks deployment until the founder coordinates a new upstream.

Run:
`node scripts/select-web-host-port.mjs --output "$DEPLOY_ENV_FILE"`
Expected: the external file contains one reusable valid `WEB_HOST_PORT`.

- [ ] **Step 5: Validate configuration**

Run:
```bash
pnpm vitest run tests/deployment/compose-config.test.ts tests/deployment/web-host-port.test.ts
docker compose --env-file "$DEPLOY_ENV_FILE" -f docker-compose.yml -f docker-compose.production.yml config
```
Expected: valid config with only loopback web publication.

- [ ] **Step 6: Build images**

Run:
`docker compose --env-file "$DEPLOY_ENV_FILE" -f docker-compose.yml -f docker-compose.production.yml build`
Expected: PASS.

- [ ] **Step 7: Update deployment plan and commit**

```bash
git add apps/*/Dockerfile docker-compose*.yml .env.example scripts tests/deployment docs/runbooks docs/superpowers/plans
git commit -m "build: add production Compose topology"
```

### Task 2 [P06-T02]: Complete security, rate limiting, and purge execution

**Files:**
- Create: `apps/api/src/security/rate-limit.guard.ts`
- Create: `apps/api/src/security/security-headers.ts`
- Create: `packages/backend/src/privacy/purge-orchestrator.ts`
- Create: `apps/worker/src/processors/account-purge.processor.ts`
- Test: `tests/security/authorization-and-rate-limit.integration.test.ts`
- Test: `tests/privacy/purge.integration.test.ts`

**Interfaces:**
- Produces endpoint-specific rate-limit policies.
- Produces complete profile/report/asset purge with retained transaction
  projection.

- [ ] **Step 1: Write failing security tests**

Cover auth brute force, birth-form abuse, checkout abuse, webhook exemption
with signature enforcement, owner authorization, ID enumeration, CSRF/session
behavior, noindex, and secret/log redaction.

- [ ] **Step 2: Write failing purge tests**

Cover 30-day eligibility, session revocation, profile/chart/evidence/report
deletion, Garage/cloud tombstones, anonymized analytics, and retained minimal
transaction record.

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run tests/security tests/privacy`
Expected: FAIL.

- [ ] **Step 4: Implement reviewed controls**

Do not add broad security middleware that breaks SePay raw-body verification.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run tests/security tests/privacy`
Expected: PASS.

- [ ] **Step 6: Update risk/rule trackers and commit**

```bash
git add apps/api/src/security packages/backend/src/privacy apps/worker/src/processors tests/security tests/privacy docs/superpowers/plans
git commit -m "feat: enforce production privacy and security controls"
```

### Task 3 [P06-T03]: Add operations metrics, backup, restore, and runbooks

**Files:**
- Create: `packages/observability/src/metrics.ts`
- Create: `apps/api/src/metrics/metrics.controller.ts`
- Create: `scripts/backup-postgres.ps1`
- Create: `scripts/verify-postgres-backup.ps1`
- Create: `scripts/check-vps-capacity.mjs`
- Create: `scripts/backup-garage.ps1`
- Create: `scripts/verify-garage-backup.ps1`
- Create: `docs/runbooks/deployment.md`
- Create: `docs/runbooks/backup-and-restore.md`
- Create: `docs/runbooks/vps-capacity-and-backup-preflight.md`
- Create: `docs/runbooks/payment-incidents.md`
- Create: `docs/runbooks/report-generation-incidents.md`
- Test: `tests/operations/metrics-contract.test.ts`
- Test: `tests/operations/backup-and-capacity-contract.test.ts`

**Interfaces:**
- Produces queue, report, engine, payment, Garage, replication, and email
  metrics.
- Produces founder handoff without editing Nginx.
- Produces a VPS capacity verdict using measured staging peak plus 30% RAM and
  disk headroom.
- Produces encrypted PostgreSQL and Garage backup manifests and isolated
  restore evidence.

- [ ] **Step 1: Write failing metrics, capacity, and backup tests**

Assert expected metric names and absence of high-cardinality PII labels.
Assert the capacity check rejects missing inventory or insufficient headroom;
backup manifests reject missing encryption, checksum, retention, or offsite
destination fields.

- [ ] **Step 2: Run tests**

Run:
`pnpm vitest run tests/operations/metrics-contract.test.ts tests/operations/backup-and-capacity-contract.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement metrics and runbooks**

Backup scripts must fail loudly, produce checksums, and avoid embedding
credentials. Garage backup copies immutable objects through S3 to a separate
versioned offsite target with checksum-pinned `rclone copy --immutable`, runs
`garage meta snapshot --all`, then encrypts and copies the complete snapshot
directory, cluster layout, node IDs and node keys, bucket/key policies, and
required recovery config into the offsite set. Rclone configuration and
secrets stay outside Git.

- [ ] **Step 4: Validate VPS and backup inputs**

Sol obtains VPS CPU/RAM/disk inventory and an offsite backup destination.
Require measured staging peak plus 30% RAM and disk headroom; unresolved
capacity or backup destination blocks deployment.

- [ ] **Step 5: Perform clean PostgreSQL and Garage restore drills**

Restore into separate disposable PostgreSQL and Garage targets. Recreate
Garage from the copied metadata/configuration artifacts, restore objects, and
compare every object checksum to the PostgreSQL asset manifest.

- [ ] **Step 6: Run tests**

Run:
`pnpm vitest run tests/operations/metrics-contract.test.ts tests/operations/backup-and-capacity-contract.test.ts`
Expected: PASS.

- [ ] **Step 7: Update trackers and commit**

```bash
git add packages/observability apps/api/src/metrics scripts docs/runbooks tests/operations docs/superpowers/plans
git commit -m "ops: add metrics backup and incident runbooks"
```

### Task 4 [P06-T04]: Run the release-critical E2E flow

**Files:**
- Test: `tests/e2e/full-paid-flow.spec.ts`
- Test: `tests/e2e/degraded-services.spec.ts`
- Test: `tests/e2e/account-lifecycle.spec.ts`
- Create: `scripts/run-release-smoke.mjs`

**Interfaces:**
- Produces machine-readable release evidence for the complete user flow.

- [ ] **Step 1: Write the full paid-flow E2E**

```text
landing
-> birth form
-> consent
-> free chart
-> evidence
-> paid preview
-> checkout
-> signed SePay webhook
-> entitlement
-> report
-> critic
-> HTML
-> PDF
-> Garage download
-> email
```

- [ ] **Step 2: Add degraded-mode E2E**

Cover AI unavailable, Redis unavailable/recovered, Garage unavailable,
optional cloud unavailable, repeated webhook, and SMTP unavailable.

- [ ] **Step 3: Start the production-like stack**

Run:

```bash
docker compose --env-file "$DEPLOY_ENV_FILE" -f docker-compose.yml -f docker-compose.production.yml up -d
```

Expected: all required readiness checks pass.

- [ ] **Step 4: Run E2E and smoke**

Run: `pnpm playwright test tests/e2e/full-paid-flow.spec.ts tests/e2e/degraded-services.spec.ts tests/e2e/account-lifecycle.spec.ts`
Expected: PASS.

- [ ] **Step 5: Update trackers and commit**

```bash
git add tests/e2e scripts/run-release-smoke.mjs docs/superpowers/plans
git commit -m "test: verify the complete paid report flow"
```

### Task 5 [P06-T05]: Complete internal report QA and release review

**Files:**
- Create: `docs/qa/p0-report-rubric.md`
- Create: `docs/qa/p0-report-review-log.md`
- Create: `docs/compliance/release-legal-accounting-approval.md`
- Create: `docs/release/p0-release-checklist.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/risk-register.md`
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/requirements-traceability.md`
- Test: `tests/release/release-evidence-gate.test.ts`

**Interfaces:**
- Produces signed review evidence for twenty internal reports.
- Produces a release verdict that requires approved AI due diligence and
  written legal/accounting confirmation.

- [ ] **Step 1: Write the failing release-evidence gate**

Assert release is blocked when the AI provider due-diligence record,
refund/regeneration wording approval, transaction-retention approval, or
payment/accounting confirmation is missing or unsigned.

- [ ] **Step 2: Generate twenty controlled internal reports**

Use approved fixtures and test profiles. Do not use private production user
data.

- [ ] **Step 3: Review every report**

Score chart correctness, evidence coverage, specificity, Vietnamese clarity,
internal consistency, actionability, safety/non-fatalism, and repetition.

- [ ] **Step 4: Enforce release thresholds**

Require correctness and safety at least 4/5 for every report, 100% approved P0
fixtures, and no open severity-1 calculation/payment/authorization/privacy
issue.

- [ ] **Step 5: Verify public support material**

Confirm sample report, methodology, privacy, terms, refund/regeneration, and
support workflow are ready.

- [ ] **Step 6: Record legal and accounting release evidence**

The record identifies reviewer/role/date, approved public refund and
regeneration wording, transaction and payment-event retention periods,
tax/receipt handling, SePay settlement/reconciliation responsibility, and any
launch conditions. An unresolved item blocks public payment activation.

- [ ] **Step 7: Run the release-evidence test**

Run: `pnpm vitest run tests/release/release-evidence-gate.test.ts`
Expected: PASS only with complete signed evidence.

- [ ] **Step 8: Terra release review**

Terra reviews tests, runbooks, QA log, risks, and unresolved findings. Sol
escalates any release blocker to the founder.

- [ ] **Step 9: Commit release evidence**

```bash
git add docs/qa docs/compliance docs/release tests/release docs/superpowers/plans
git commit -m "test: record P0 release evidence"
```

### Task 6 [P06-T06]: Activate and verify the Gate 1 public indexing surface

**Files:**
- Create: `docs/release/p0-public-route-inventory.md`
- Create: `docs/runbooks/search-console-and-indexing.md`
- Create: `scripts/verify-public-surface.mjs`
- Modify: `config/route-registry.yml`
- Test: `tests/seo/release-indexability.spec.ts`
- Test: `tests/e2e/production-public-surface.spec.ts`

**Interfaces:**
- Consumes the production origin, canonical route registry, Gate 1 content
  evidence, and founder-controlled Search Console access.
- Produces a signed route inventory with status, HTTP result, canonical,
  robots, sitemap membership, schema, language alternate, content review, and
  owner.
- Produces no automated DNS, Nginx, Cloudflare, or Search Console ownership
  mutation.

- [ ] **Step 1: Write failing release-indexability tests**

Assert every `live_indexable` route returns 200, self-canonicalizes, has valid
VI/EN alternates, appears once in the correct child sitemap and index, and has
content/schema agreement. Include `/kien-thuc` and `/kien-thuc/tu-vi`. Assert
every private or `live_noindex` route is absent from sitemaps and emits noindex
plus server-side access control.

- [ ] **Step 2: Run the production-like SEO test**

Run:

```bash
pnpm vitest run tests/seo/release-indexability.spec.ts
pnpm playwright test tests/e2e/production-public-surface.spec.ts
```

Expected: FAIL until release-ready route states and production responses agree.

- [ ] **Step 3: Promote only release-ready Gate 1 routes**

Change a route to `live_indexable` only when its page, reviewed content,
canonical, schema, navigation links, owner, and readiness evidence pass.
Keep every later commercial or expansion route `reserved`. Do not publish
placeholder or roadmap pages.

- [ ] **Step 4: Verify production HTTP, performance, and crawl controls**

Run:

```bash
node scripts/verify-public-surface.mjs --origin "$PUBLIC_ORIGIN"
pnpm playwright test tests/e2e/production-public-surface.spec.ts
```

Verify real mobile LCP/INP/CLS budgets where traffic data exists, or record
controlled lab evidence before launch. Verify private PDFs use
`X-Robots-Tag: noindex, noarchive`.

- [ ] **Step 5: Complete founder-owned indexing handoff**

Document sitemap submission, Search Console ownership, URL inspection for
priority routes, and monitoring responsibilities. The founder performs or
explicitly authorizes external-account changes; repository automation does not
claim ownership or submit credentials.

- [ ] **Step 6: Commit the public release evidence**

```bash
git add config/route-registry.yml scripts/verify-public-surface.mjs tests/seo tests/e2e docs/release docs/runbooks docs/superpowers/plans
git commit -m "test: verify Gate 1 public indexing"
```

## Phase Exit Criteria

- Production images and Compose config pass.
- Only web publishes a loopback host port.
- Backup restore drill passes.
- Security, purge, full-flow, and degraded-mode tests pass.
- Twenty reports meet the rubric.
- Gate 1 public routes, ten foundation articles, sitemaps, canonicals, schema,
  and noindex boundaries pass production verification.
- No severity-1 release blocker remains.
- Founder receives the Nginx/Cloudflare handoff and explicitly approves any
  production deployment.
