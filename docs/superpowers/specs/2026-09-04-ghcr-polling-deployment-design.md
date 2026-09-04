# GHCR Polling Deployment Design

**Date:** 2026-09-04  
**Status:** Founder-approved in chat on 2026-09-04  
**Scope:** Master-only GHCR publication, VPS polling deployment, local
PostgreSQL backups, application rollback, and LasoViet-specific origin access
control.

## 1. Goal

Publish one atomic LasoViet application release after `master` passes CI, then
let the existing VPS discover and deploy that release without granting GitHub
SSH access to the server.

The deployment must preserve the current one-VPS topology:

```text
Cloudflare
    -> founder-managed host Nginx
    -> 127.0.0.1:63423
    -> web
    -> private API
    -> PostgreSQL / Redis
    -> worker
```

## 2. Boundaries

This design includes:

- fixing the deterministic admin role-assignment integration-test collision;
- publishing API, web, worker, and release-marker images to GHCR;
- polling the production marker once per minute from the VPS;
- backing up PostgreSQL before every deployment and once per day;
- rolling application images back to the previous immutable release;
- restricting the LasoViet Nginx virtual host to Cloudflare source ranges;
- adding worker progress verification to the deployment health gate;
- installing the approved scripts, cron entries, and log rotation on the VPS.

This design does not include:

- direct pushes to `master`;
- pull request creation or merge automation;
- database downgrade automation;
- offsite backup, backup encryption, or a restore drill;
- production payment activation;
- production AI activation;
- DNS, Cloudflare account, or unrelated Nginx virtual-host changes;
- deployment from pull requests or feature branches.

Local backups are operational recovery inputs, not disaster-recovery evidence.
Offsite encrypted replication and isolated restore drills remain deferred.

## 3. Release Publication

The existing CI verification job remains the release gate. Image publication
runs only for a `push` to `master` after i18n, lint, typecheck, build, and test
all succeed.

CI publishes these immutable tags:

```text
ghcr.io/harris1111/lasoviet-api:sha-<git-sha>
ghcr.io/harris1111/lasoviet-web:sha-<git-sha>
ghcr.io/harris1111/lasoviet-worker:sha-<git-sha>
ghcr.io/harris1111/lasoviet-release:sha-<git-sha>
```

After all application images and the immutable release marker exist, CI moves
this channel tag last:

```text
ghcr.io/harris1111/lasoviet-release:production
```

The release marker carries the full Git commit SHA in
`org.opencontainers.image.revision`. Updating the marker last is the atomic
publication boundary: a poller never derives a release from independently
moving API, web, or worker tags.

Workflow concurrency is scoped to the Git ref. A newer `master` run may cancel
an older run; an incomplete run cannot update the production marker.

GHCR packages are intended to be public and linked to the public repository.
The VPS therefore pulls anonymously and stores no long-lived GitHub package
token. If anonymous pull is unavailable after first publication, deployment
stays fail-closed until the founder approves either public visibility or a
read-only credential stored outside the repository.

## 4. Registry Compose Overlay

A production registry overlay assigns immutable image references to:

- `migrate` and `api`: the API image for the selected release;
- `worker`: the worker image for the selected release;
- `web`: the web image for the selected release.

The deployment script exports the four image references derived from one
release SHA and invokes Compose with:

```text
docker-compose.yml
docker-compose.production.yml
docker-compose.registry.yml
```

Deployment uses `--no-build`. A VPS rollout never compiles application source
and never deploys the mutable state of the server checkout.

The Compose files installed on the VPS remain an operator-managed deployment
contract. A release that changes service topology or Compose semantics requires
a reviewed manual update before its production marker may advance.

## 5. Polling And Locking

The `debian` user runs the poller every minute through cron. The poller:

1. obtains an exclusive non-blocking `flock`;
2. validates required paths and external environment metadata;
3. pulls the production release marker;
4. reads and validates its 40-character lowercase Git SHA;
5. exits successfully when no marker exists or the SHA already matches the
   recorded current release;
6. calls the deployment command for a new release.

Only one poll or deployment may run at a time. Expected no-change polls do not
write routine log messages. Failures write a timestamped concise record without
environment values, credentials, user data, report content, or signed URLs.

The state directory is outside Git and owner-readable only. It records:

```text
current release SHA
previous release SHA
last attempted release SHA
last successful deployment time
last failure code and time
```

State replacement is atomic.

## 6. Deployment Transaction

For a new release, the deployment script performs:

1. verify Compose configuration and required image references;
2. verify minimum free disk space and current required-service health;
3. create and validate a pre-deployment PostgreSQL backup;
4. pull all immutable application images;
5. run the one-shot migration service;
6. replace API and worker, then web;
7. wait for PostgreSQL, Redis, API, and web readiness;
8. verify worker queue progress;
9. verify loopback web readiness;
10. verify public HTTPS readiness;
11. atomically promote release state.

The migration image is the API image for the selected SHA. Migration failure
stops before release state promotion. Destructive or backward-incompatible
migrations are incompatible with unattended deployment and must block
publication until auto-deploy is disabled or a separate founder-approved
rollout exists.

Production AI and production payment behavior remain governed by their
existing fail-closed environment and compliance gates. Publishing an image
does not approve either external capability.

## 7. Rollback

The state file retains one previous successful SHA. Rollback derives all
application image tags from that SHA and may re-pull them from GHCR when local
Docker pruning removed cached images.

Automatic rollback runs when application replacement completes but a required
health or worker-progress check fails. It:

1. selects the previous successful release;
2. pulls its immutable images;
3. replaces API and worker, then web;
4. runs readiness checks;
5. leaves the failed candidate recorded as the last attempted release;
6. keeps the prior release as current only when rollback health passes.

Rollback never runs a database downgrade and never restores a database backup
automatically. Therefore every automatically published migration must remain
compatible with the previous application release.

A manual rollback command uses the same implementation and accepts only a
recorded immutable release SHA. It refuses an unknown or malformed target.

## 8. PostgreSQL Backup Policy

Backups run:

- immediately before every attempted deployment;
- once daily at 02:30 server time.

Each backup:

1. writes a custom-format `pg_dump` archive to a temporary `.partial` path;
2. validates the archive with the matching PostgreSQL container's
   `pg_restore --list`;
3. writes a SHA-256 checksum;
4. atomically renames the archive and checksum into place;
5. applies owner-only file permissions;
6. fails the deployment when any step fails.

Retention is:

- seven successful daily archives;
- ten successful pre-deployment archives.

Automatic retention removes only files matching the script-owned naming
contract inside the configured backup directory. It does not remove unknown,
manual, or offsite files. A failed or zero-byte temporary archive is preserved
with a failure suffix for diagnosis and is never counted as a valid backup.

## 9. Origin Access Control

The LasoViet Nginx virtual host currently accepts direct HTTP requests to the
origin. The corrected virtual host adds the complete current Cloudflare IPv4
and IPv6 ranges as `allow` rules followed by `deny all`.

The change is scoped to the LasoViet virtual host. Shared server firewall rules
and unrelated virtual hosts remain unchanged.

Installation:

1. save an owner-readable backup of the current LasoViet Nginx file;
2. install the reviewed allowlist include;
3. run `nginx -t`;
4. reload Nginx only when validation succeeds;
5. verify public HTTPS remains healthy;
6. verify a direct non-Cloudflare HTTP request with `Host: lasoviet.vn` is
   denied.

Cloudflare range refresh is a deliberate operator action. An invalid or empty
range set must never replace the last validated include.

## 10. Worker Progress Gate

Container `running` state is insufficient worker evidence. The poller requires
a bounded worker-progress probe that confirms:

- the worker process can reach Redis;
- registered queues can be inspected;
- the worker heartbeat or poll timestamp is recent.

The probe returns only operational status and timestamps. It does not emit job
payloads, report content, account identifiers, or queue credentials.

Failure blocks release promotion and triggers application rollback when a
previous successful release exists.

## 11. Server Installation

Repository-managed scripts are installed beneath:

```text
/home/debian/infra/lasoviet/
```

Mutable state and logs use:

```text
/home/debian/infra/data/lasoviet-deploy/
```

Cron entries:

```cron
* * * * * <poll command>
30 2 * * * <daily backup command>
```

Cron invokes scripts through absolute paths. Log rotation bounds deployment
and backup logs. Installation is idempotent and preserves unrelated user and
root cron entries.

The existing nightly global Docker prune may remove unused local images. This
does not remove running containers or volumes, and rollback remains available
by re-pulling immutable SHA tags from GHCR.

## 12. Verification

Repository verification covers:

- the existing deterministic CI failure reproduces before correction and
  passes afterward;
- publication is impossible for pull requests, feature branches, or failed
  verification;
- marker publication occurs after all immutable images;
- all release image references use one validated SHA;
- poll locking and no-change behavior;
- malformed and unavailable marker handling;
- backup temporary-file, validation, checksum, permission, and retention
  behavior;
- migration failure without release promotion;
- health failure with rollback;
- rollback failure without a false success state;
- secret and payload redaction;
- Compose registry overlay rendering;
- shell syntax and dry-run behavior.

VPS verification covers:

- scripts and cron entries installed with expected ownership and permissions;
- no duplicate cron entries;
- a no-release poll exits without deployment;
- backup creation and validation succeed;
- public health remains `200`;
- direct origin HTTP is denied after the Nginx change;
- current production containers remain unchanged until a valid new production
  marker appears.

## 13. Release And Approval Gates

Implementation occurs on `feature/paid-flow-admin-operations`. It may be
committed and reviewed there, but it must not be pushed directly to `master`.

The first production marker must not advance until:

- CI is green;
- GHCR image visibility and anonymous pulls are verified;
- the VPS poller passes dry-run and no-release checks;
- the local backup gate passes;
- Cloudflare-only origin access is verified;
- Terra high approves the implementation milestone;
- the founder explicitly authorizes the merge or production-marker-triggering
  push.

## 14. Deferred Work

- encrypted offsite backup replication;
- isolated PostgreSQL restore drills;
- Garage backup and restore;
- deployment notifications;
- image signing and admission verification;
- automatic Cloudflare range synchronization;
- production payment and AI activation.

