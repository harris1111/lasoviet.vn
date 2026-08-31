# Docker Compose Deployment Plan

## Topology

```text
Cloudflare
    -> founder-managed host Nginx
    -> 127.0.0.1:${WEB_HOST_PORT}
    -> web
    -> private api
    -> postgres / redis / garage
                     -> worker
```

Compose services:

```text
web
api
worker
migrate
postgres
redis
garage
```

## Publishing Rules

- `web`: `127.0.0.1:${WEB_HOST_PORT}:3000`.
- `WEB_HOST_PORT`: required, validated unused `49152-65535`, stable per
  environment, stored outside Git.
- No host ports for API, PostgreSQL, Redis, or Garage.
- Nginx configuration is not created or edited by repository automation.

## Port Selection And Persistence

1. The operator runs
   `node scripts/select-web-host-port.mjs --output "$DEPLOY_ENV_FILE"`.
2. The script rejects output paths inside the repository, reuses a valid
   existing `WEB_HOST_PORT`, or selects an unused port in `49152-65535`.
3. The external env file is owner-readable only and is supplied to Compose
   with `--env-file "$DEPLOY_ENV_FILE"` for every production `config`,
   `build`, `up`, `run`, `exec`, `logs`, `ps`, `stop`, and `down` command.
4. The selected value is included in the founder Nginx handoff.
5. A later collision stops deployment. The script never silently rotates the
   port because doing so would invalidate the founder-managed Nginx upstream.
6. Missing `DEPLOY_ENV_FILE`, unreadable external file, or unresolved
   `WEB_HOST_PORT` is a hard preflight failure.

## Volumes

| Service | Persistent data |
|---|---|
| PostgreSQL | database cluster |
| Redis | AOF/RDB queue durability as configured |
| Garage | metadata and object data |

Application containers are immutable and replaceable.

## Backup And Restore

- PostgreSQL backups are encrypted, checksummed, and written to the approved
  offsite destination.
- Garage objects are copied through the S3 API to a separate encrypted,
  versioned backup target with pinned-checksum `rclone copy --immutable`
  semantics; normal replica deletions do not delete retained backups.
- Garage metadata uses a clean `garage meta snapshot --all` operation. Backup
  tooling encrypts and copies the complete snapshot directory, cluster layout,
  node IDs and node keys, bucket/key policy definitions, and required
  configuration recovery files into the same offsite backup set.
- Restore drills create isolated PostgreSQL and Garage targets, restore both,
  restore the metadata/configuration artifacts before object import, and
  compare every restored object SHA-256 against the PostgreSQL asset manifest.
- Rclone configuration, credentials, encryption passwords, and backup target
  details remain outside Git. The script verifies the approved executable
  checksum before use.
- The optional cloud replica is not accepted as backup evidence.

## Startup

1. Validate required environment variables without printing secrets.
2. Confirm PostgreSQL, Redis, and Garage health.
3. Run `migrate` once.
4. Start API and wait for readiness.
5. Start worker and verify heartbeat.
6. Start web and verify private API connectivity.
7. Founder verifies Nginx upstream against the selected loopback port.

## Health

- `web /health/live`: process running.
- `web /health/ready`: BFF can reach API.
- `api /health/live`: process running.
- `api /health/ready`: PostgreSQL, Redis, and required config ready.
- Worker heartbeat: queue connection and recent poll.
- Garage: S3 health probe.

Optional cloud S3 and AI availability do not make API readiness fail.

## Restart And Logging

- `web`, `api`, `worker`, `postgres`, `redis`, and `garage` use
  `restart: unless-stopped`.
- `migrate` uses `restart: "no"` and must exit successfully before application
  replacement continues.
- Every service writes structured logs to stdout/stderr.
- Compose uses the Docker `json-file` driver with `max-size: 10m` and
  `max-file: 5`; application log retention outside Docker is an operator
  responsibility documented in the deployment runbook.
- Log tests reject secrets, full birth profiles, report content, signed URLs,
  and high-cardinality personal labels.

## Upgrade

1. Back up PostgreSQL and verify backup completion.
2. Build and scan immutable images.
3. Run migration compatibility tests.
4. Pull/load images and run `migrate`.
5. Replace API/worker, then web.
6. Run smoke tests.
7. Roll back application images if needed.

Schema removal uses expand/contract releases; do not rely on rolling back a
destructive migration.

## Secrets

- Production secrets live outside Git.
- AI, SMTP, SePay, database, Redis, Garage, S3, auth, and actor-token secrets
  are separate variables.
- Startup logs report only whether a secret is configured.

## Founder Handoff

The repository provides:

- selected `WEB_HOST_PORT`;
- external env-file path and file-permission check;
- expected upstream protocol;
- health URL;
- required forwarded headers;
- maximum request/body timeout needs;
- WebSocket requirement, if any;
- rollback port/process notes.
- verified PostgreSQL and Garage backup manifests and restore-drill result.

The founder owns Nginx, TLS, and Cloudflare configuration.
