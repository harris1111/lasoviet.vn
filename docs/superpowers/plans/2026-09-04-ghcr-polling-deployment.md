# GHCR Polling Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish atomic application releases from verified `master` commits and install a fail-closed, backup-gated polling deployment workflow on the existing VPS.

**Architecture:** GitHub Actions builds immutable API, web, worker, and release-marker images after the existing verification job succeeds, then moves the `production` marker last. The VPS polls that marker under `flock`, validates one release SHA, creates a verified PostgreSQL backup, deploys through a registry Compose overlay, checks application and worker health, and rolls application images back without downgrading the database.

**Tech Stack:** GitHub Actions, Docker Buildx, GHCR, Docker Compose, Bash, Node.js 24, TypeScript, Vitest, PostgreSQL 17, Redis 8, Nginx, cron, logrotate

**Spec:** `docs/superpowers/specs/2026-09-04-ghcr-polling-deployment-design.md`

## Global Constraints

- Production releases originate from `master` only and publish only after i18n, lint, typecheck, build, and tests pass.
- Immutable tags are `ghcr.io/harris1111/lasoviet-{api,web,worker,release}:sha-<40-character-lowercase-git-sha>`.
- `ghcr.io/harris1111/lasoviet-release:production` moves only after all immutable images and the immutable marker exist.
- The VPS stores no GHCR credential; missing anonymous pull access fails closed.
- Polling uses non-blocking `flock`, runs once per minute, and treats missing, unchanged, or malformed markers as non-deploying outcomes.
- Every deployment requires a validated PostgreSQL custom-format backup; retention is seven daily and ten pre-deploy archives.
- Application rollback never downgrades or restores the database automatically.
- Worker readiness requires Redis reachability, valid registered queues, and a recent poll heartbeat without exposing payloads or credentials.
- Repository scripts install under `/home/debian/infra/lasoviet/`; mutable state and logs use `/home/debian/infra/data/lasoviet-deploy/`.
- Nginx changes are limited to the LasoViet virtual host and must preserve unrelated virtual hosts and firewall rules.
- Offsite backups, restore drills, payment activation, AI activation, DNS changes, and automatic PR/merge behavior are excluded.
- Documents and commit messages are English. Do not push directly to `master`.

---

### Task 1: Repair The Deterministic CI Fixture Collision

**Files:**
- Modify: `packages/backend/src/admin-access/role-assignment.repository.integration-support.ts`
- Test: `packages/backend/src/admin-access/role-assignment.repository.integration.test.ts`

**Interfaces:**
- Consumes: migration-seeded active policy `("super_admin", "admin.roles.manage")`
- Produces: fixture result with the real seeded `policyId`, unique actor/subject rows, and no duplicate policy insertion

- [ ] **Step 1: Reproduce the failing integration suite**

Run:

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/admin-access/role-assignment.repository.integration.test.ts --maxWorkers=1 --no-file-parallelism
```

Expected: all seven cases fail while inserting the duplicate `super_admin/admin.roles.manage` capability policy.

- [ ] **Step 2: Change the fixture to resolve the migration-owned policy**

Replace the generated policy insertion with a query equivalent to:

```ts
const [policy] = await database
  .select({ id: adminCapabilityPolicies.id })
  .from(adminCapabilityPolicies)
  .where(
    and(
      eq(adminCapabilityPolicies.role, "super_admin"),
      eq(adminCapabilityPolicies.capability, "admin.roles.manage"),
      eq(adminCapabilityPolicies.active, true),
    ),
  )
  .limit(1);

if (policy === undefined) {
  throw new Error("ROLE_MUTATION_TEST_POLICY_MISSING");
}
```

Return `policy.id` as `policyId`. Keep the fixture-specific account and role-assignment identities unique.

- [ ] **Step 3: Verify the focused suite and full test suite**

Run:

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/admin-access/role-assignment.repository.integration.test.ts --maxWorkers=1 --no-file-parallelism
corepack pnpm@11.25.0 test
```

Expected: focused suite `7/7` passes and the full suite passes.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/admin-access/role-assignment.repository.integration-support.ts
git commit -m "fix: reuse seeded admin capability policy"
```

### Task 2: Add A Bounded Worker Progress Probe

**Files:**
- Create: `apps/worker/src/health/redis-ping.ts`
- Create: `apps/worker/src/health/worker-heartbeat.ts`
- Create: `apps/worker/src/health/worker-health-cli.ts`
- Create: `apps/worker/src/health/worker-heartbeat.test.ts`
- Modify: `apps/worker/src/main.ts`
- Modify: `apps/worker/package.json`
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: `REDIS_URL`, `WORKER_QUEUES`, successful worker polling cycles
- Produces: `/tmp/lasoviet-worker-heartbeat.json` with version, queue names, and ISO poll timestamp; `node dist/health/worker-health-cli.js` exits `0` only when Redis responds `PONG`, queue configuration is valid, and heartbeat age is at most 30 seconds

- [ ] **Step 1: Write failing unit tests**

Cover these behaviors using injected clock, file reader/writer, and Redis ping dependencies:

```ts
it("accepts a recent heartbeat for the configured queues");
it("rejects a heartbeat older than thirty seconds");
it("rejects missing or malformed heartbeat content");
it("rejects queue mismatch");
it("rejects Redis ping failure without printing connection details");
```

The production change that makes these pass is a validator returning only bounded status codes such as `WORKER_HEARTBEAT_STALE`, `WORKER_QUEUES_INVALID`, and `WORKER_REDIS_UNREACHABLE`.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
corepack pnpm@11.25.0 vitest run apps/worker/src/health/worker-heartbeat.test.ts
```

Expected: FAIL because the heartbeat and probe modules do not exist.

- [ ] **Step 3: Implement heartbeat recording and health CLI**

Implement:

```ts
type WorkerHeartbeatV1 = {
  version: 1;
  queues: string[];
  polledAt: string;
};
```

After each completed outbox/report polling cycle, atomically replace the heartbeat file using a sibling temporary file. The CLI must parse the configured queues with `resolveWorkerQueues`, ping the Redis URL using a bounded Node TCP RESP `PING`, validate the heartbeat with a 30-second maximum age, emit only one concise status code, and never emit URLs, job data, or environment maps.

- [ ] **Step 4: Add the Compose worker healthcheck**

Configure:

```yaml
healthcheck:
  test: ["CMD", "node", "dist/health/worker-health-cli.js"]
  interval: 10s
  timeout: 5s
  retries: 6
  start_period: 15s
```

Add a package script named `healthcheck` using the same command.

- [ ] **Step 5: Verify**

Run:

```bash
corepack pnpm@11.25.0 vitest run apps/worker/src/health/worker-heartbeat.test.ts tests/deployment/compose-config.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/worker... run build
corepack pnpm@11.25.0 --filter @lasoviet/worker run typecheck
```

Expected: tests, build, and typecheck pass.

- [ ] **Step 6: Commit**

```bash
git add apps/worker docker-compose.yml tests/deployment/compose-config.test.ts
git commit -m "feat: add worker progress health probe"
```

### Task 3: Publish Atomic GHCR Releases

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `docker/release-marker.Dockerfile`
- Create: `docker-compose.registry.yml`
- Create: `tests/deployment/release-publication.test.ts`
- Modify: `tests/deployment/compose-config.test.ts`

**Interfaces:**
- Consumes: successful `verify` job on a `push` to `refs/heads/master`
- Produces: three immutable application tags, one immutable marker, and the `production` marker moved last; registry Compose overlay parameterized by `LASOVIET_RELEASE_SHA`

- [ ] **Step 1: Write failing workflow and Compose contract tests**

Tests must assert:

```ts
expect(publicationTrigger).toBe("push-to-master-only");
expect(publishJobNeeds).toContain("verify");
expect(markerPushOrder.at(-1)).toBe("ghcr.io/harris1111/lasoviet-release:production");
expect(allImageTags).toUseOneValidatedFortyCharacterSha();
expect(registryCompose).toSetImagesFor(["migrate", "api", "worker", "web"]);
expect(registryCompose).not.toContainBuildDefinitions();
```

Read YAML as normalized text or parse rendered Compose JSON. Normalize CRLF/LF before line assertions.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
corepack pnpm@11.25.0 vitest run tests/deployment/release-publication.test.ts tests/deployment/compose-config.test.ts
```

Expected: FAIL because publication and registry overlay do not exist.

- [ ] **Step 3: Implement master-only publication**

Keep `verify` unchanged as the gate. Add a `publish` job with:

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/master'
needs: verify
permissions:
  contents: read
  packages: write
concurrency:
  group: production-release-${{ github.ref }}
  cancel-in-progress: true
```

Use Docker Buildx and `docker/login-action` with `GITHUB_TOKEN`. Build and push API, web, and worker to `sha-${GITHUB_SHA}`. Build the release-marker image with `org.opencontainers.image.revision=${GITHUB_SHA}`, push its immutable SHA tag, and only then push `lasoviet-release:production`.

- [ ] **Step 4: Implement registry Compose overlay**

Use exact image expressions:

```yaml
services:
  migrate:
    image: ghcr.io/harris1111/lasoviet-api:sha-${LASOVIET_RELEASE_SHA:?Set LASOVIET_RELEASE_SHA}
    build: null
  api:
    image: ghcr.io/harris1111/lasoviet-api:sha-${LASOVIET_RELEASE_SHA:?Set LASOVIET_RELEASE_SHA}
    build: null
  worker:
    image: ghcr.io/harris1111/lasoviet-worker:sha-${LASOVIET_RELEASE_SHA:?Set LASOVIET_RELEASE_SHA}
    build: null
  web:
    image: ghcr.io/harris1111/lasoviet-web:sha-${LASOVIET_RELEASE_SHA:?Set LASOVIET_RELEASE_SHA}
    build: null
```

- [ ] **Step 5: Verify**

Run:

```bash
corepack pnpm@11.25.0 vitest run tests/deployment/release-publication.test.ts tests/deployment/compose-config.test.ts
corepack pnpm@11.25.0 lint
```

Expected: tests and lint pass.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml docker docker-compose.registry.yml tests/deployment
git commit -m "feat: publish atomic GHCR releases"
```

### Task 4: Implement Backup, Polling, Deployment, And Rollback Scripts

**Files:**
- Create: `scripts/deployment/lib/common.sh`
- Create: `scripts/deployment/backup-postgres.sh`
- Create: `scripts/deployment/deploy-release.sh`
- Create: `scripts/deployment/poll-release.sh`
- Create: `scripts/deployment/rollback-release.sh`
- Create: `tests/deployment/cd-scripts.test.ts`

**Interfaces:**
- Consumes: `/home/debian/infra/lasoviet/deploy.env`, external application env file, production release marker, three Compose files, existing current/previous state
- Produces: atomic release state, validated local backups, fail-closed deployments, and application-only rollback

- [ ] **Step 1: Write failing shell contract tests**

Use temporary directories and injected command paths to cover:

```ts
it("accepts only a forty-character lowercase release SHA");
it("serializes poll execution with non-blocking flock");
it("does not deploy for a missing, malformed, or unchanged marker");
it("uses one SHA for all immutable image references");
it("fails before migration when the pre-deploy backup fails");
it("does not promote state when migration or readiness fails");
it("rolls back application images after post-replacement health failure");
it("never invokes database downgrade or restore during rollback");
it("retains seven daily and ten pre-deploy archives only");
it("preserves unknown and failed backup files");
it("redacts environment values and job payloads from failures");
```

Tests provide fake `docker`, `curl`, `flock`, `sha256sum`, and clock commands through `PATH`; they assert command order and state files rather than contacting external services.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
corepack pnpm@11.25.0 vitest run tests/deployment/cd-scripts.test.ts
```

Expected: FAIL because the deployment scripts do not exist.

- [ ] **Step 3: Implement shared validation and state primitives**

`common.sh` must:

- enable `set -Eeuo pipefail`;
- validate absolute configured paths and lowercase 40-character SHA values;
- build one `docker compose --env-file ... -f docker-compose.yml -f docker-compose.production.yml -f docker-compose.registry.yml` command;
- write state through a same-directory temporary file, `chmod 600`, and atomic `mv`;
- log UTC timestamp plus bounded status code only.

- [ ] **Step 4: Implement PostgreSQL backup**

Create `daily-YYYYmmddTHHMMSSZ.dump` or `pre-deploy-<sha>-YYYYmmddTHHMMSSZ.dump` through a `.partial` file. Use the running PostgreSQL service for `pg_dump --format=custom`, reject zero bytes, validate with `pg_restore --list`, create a `.sha256`, set mode `600`, atomically rename both files, and prune only matching successful archives beyond the configured retention.

- [ ] **Step 5: Implement deploy and rollback transactions**

Deployment order:

```text
config validation -> disk/health preflight -> pre-deploy backup -> pull
-> migrate -> replace api+worker -> replace web -> required health
-> worker health CLI -> loopback readiness -> public HTTPS -> promote state
```

On a post-replacement health failure and a valid previous SHA, call the shared application rollback path. Rollback pulls the target immutable images, replaces API/worker/web, repeats readiness checks, and never invokes migration, `pg_restore`, or database mutation.

- [ ] **Step 6: Implement marker polling**

Pull `ghcr.io/harris1111/lasoviet-release:production`, inspect `org.opencontainers.image.revision`, validate the SHA, compare it with current state, and invoke deployment only for a new valid SHA. Expected no-change and unavailable-marker outcomes exit successfully without routine output.

- [ ] **Step 7: Verify**

Run:

```bash
corepack pnpm@11.25.0 vitest run tests/deployment/cd-scripts.test.ts
bash -n scripts/deployment/lib/common.sh scripts/deployment/backup-postgres.sh scripts/deployment/deploy-release.sh scripts/deployment/poll-release.sh scripts/deployment/rollback-release.sh
```

Expected: all tests and shell syntax checks pass.

- [ ] **Step 8: Commit**

```bash
git add scripts/deployment tests/deployment/cd-scripts.test.ts
git commit -m "feat: add backup gated polling deployment"
```

### Task 5: Add Idempotent VPS Installation And Operations Runbooks

**Files:**
- Create: `scripts/deployment/install-vps.sh`
- Create: `scripts/deployment/config/deploy.env.example`
- Create: `scripts/deployment/config/lasoviet-deploy.logrotate`
- Create: `scripts/deployment/nginx/cloudflare-origin-allowlist.conf`
- Create: `scripts/deployment/nginx/install-origin-allowlist.sh`
- Create: `tests/deployment/vps-installation.test.ts`
- Create: `docs/runbooks/ghcr-polling-deployment.md`
- Modify: `docs/runbooks/mvp-docker-compose.md`

**Interfaces:**
- Consumes: repository scripts, existing LasoViet Nginx virtual-host path supplied at install time, `/home/debian/projects/.lasoviet-mvp.env`
- Produces: idempotent `/home/debian/infra/lasoviet/` installation, owner-only deploy config/state, one poll cron entry, one daily backup cron entry, bounded logs, and Cloudflare-only access for the LasoViet virtual host

- [ ] **Step 1: Write failing installation contract tests**

Tests assert:

```ts
it("installs scripts and configuration with owner-only mutable state");
it("adds exactly one one-minute poll entry and one 02:30 backup entry");
it("preserves unrelated user cron entries");
it("installs bounded log rotation");
it("refuses an empty Cloudflare range include");
it("backs up and validates the LasoViet Nginx file before reload");
it("does not modify unrelated virtual hosts or firewall rules");
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
corepack pnpm@11.25.0 vitest run tests/deployment/vps-installation.test.ts
```

Expected: FAIL because installer assets do not exist.

- [ ] **Step 3: Implement the idempotent installer**

Install executable scripts under `/home/debian/infra/lasoviet/`, create `/home/debian/infra/data/lasoviet-deploy/{state,logs,backups}` with owner-only access, install deploy configuration without overwriting an existing operator file, preserve unrelated crontab lines, and add exactly:

```cron
* * * * * /home/debian/infra/lasoviet/poll-release.sh
30 2 * * * /home/debian/infra/lasoviet/backup-postgres.sh daily
```

- [ ] **Step 4: Implement the scoped Nginx allowlist installer**

Ship the complete reviewed Cloudflare IPv4 and IPv6 ranges followed by `deny all;`. Require an explicit LasoViet virtual-host path, save a mode-`600` backup, install the include reference only in that file, run `sudo nginx -t`, and reload only after validation succeeds. Never edit UFW or another virtual host.

- [ ] **Step 5: Write operator runbooks**

Document exact install, dry-run, state inspection, backup, manual rollback, log inspection, cron validation, Nginx validation, public health, direct-origin denial, GHCR visibility, and disable-auto-deploy commands. State that offsite replication and restore drills remain deferred.

- [ ] **Step 6: Verify**

Run:

```bash
corepack pnpm@11.25.0 vitest run tests/deployment/vps-installation.test.ts
bash -n scripts/deployment/install-vps.sh scripts/deployment/nginx/install-origin-allowlist.sh
corepack pnpm@11.25.0 lint
corepack pnpm@11.25.0 typecheck
corepack pnpm@11.25.0 build
corepack pnpm@11.25.0 test
git diff --check
```

Expected: all repository checks pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/deployment tests/deployment docs/runbooks
git commit -m "feat: add VPS deployment installer"
```

### Task 6: Install And Verify The No-Release Production Baseline

**Files:**
- No repository source changes expected
- External installation target: `/home/debian/infra/lasoviet/`
- External state target: `/home/debian/infra/data/lasoviet-deploy/`

**Interfaces:**
- Consumes: Terra-approved implementation milestone and founder-authorized SSH access
- Produces: installed scripts, cron, log rotation, verified local backup, Cloudflare-only LasoViet origin access, and an unchanged application release while no valid production marker exists

- [ ] **Step 1: Capture pre-install evidence**

Record the current container image IDs, service health, LasoViet Nginx configuration checksum, user crontab, public readiness, and direct-origin response without printing environment values.

- [ ] **Step 2: Install scripts in disabled mode**

Copy the reviewed repository assets to `/home/debian/infra/lasoviet/`, create operator configuration, and keep the poll cron entry absent until dry-run and backup checks pass.

- [ ] **Step 3: Verify backup and dry-run behavior**

Run:

```bash
/home/debian/infra/lasoviet/backup-postgres.sh daily
/home/debian/infra/lasoviet/poll-release.sh --dry-run
```

Expected: backup archive is non-zero, `pg_restore --list` succeeds, checksum verifies, permissions are `600`, and poll does not replace containers.

- [ ] **Step 4: Install and verify origin access control**

Install the reviewed include into the LasoViet virtual host, require `nginx -t` success, reload Nginx, confirm `https://lasoviet.net/health/ready` returns `200`, and confirm a direct non-Cloudflare HTTP request with `Host: lasoviet.net` is denied.

- [ ] **Step 5: Enable cron and verify idempotency**

Run the installer twice, confirm exactly one poll entry and one daily backup entry, and confirm unrelated cron entries remain.

- [ ] **Step 6: Confirm production remains unchanged**

Verify current container image IDs match the pre-install evidence and no deployment state was promoted without a valid production marker.
