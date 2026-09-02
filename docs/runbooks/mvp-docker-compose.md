# Founder-Run MVP Compose

## Scope

This runbook starts the free MVP locally through Docker Compose. It publishes
only the web service on loopback; API, worker, PostgreSQL, and Redis stay on
the private Compose network. No Nginx, DNS, public deployment, SePay, object
storage, or production AI call is involved.

## External Environment

Create one deploy environment file outside the repository. Keep it private and
reuse it across restarts. It must include:

- `DEPLOY_ENV_FILE` with the same external file path
- `WEB_HOST_PORT`, selected once by `scripts/select-web-host-port.mjs`
- strong PostgreSQL credentials, `INTERNAL_ACTOR_SECRET`, and
  `BETTER_AUTH_SECRET`
- `DATABASE_URL=postgresql://...@postgres:5432/...`
- `REDIS_URL=redis://redis:6379`
- `PRIVATE_API_URL=http://api:3001`
- `BETTER_AUTH_URL=http://127.0.0.1:<WEB_HOST_PORT>`

For the founder SMTP verification, copy authorized SMTP values from the local
source into the external deploy file. Translate legacy `SMTP_FROM` to
`SMTP_FROM_ADDRESS`; omit legacy `SMTP_MAX_SIZE` and `SMTP_SERVER_TYPE`.
Add the founder-approved `MVP_TEST_RECIPIENT` only to this external file.

## Start

```powershell
node scripts/validate-web-host-port.mjs --env-file $env:DEPLOY_ENV_FILE
docker compose --env-file $env:DEPLOY_ENV_FILE -f docker-compose.yml -f docker-compose.production.yml up -d --build
docker compose --env-file $env:DEPLOY_ENV_FILE -f docker-compose.yml -f docker-compose.production.yml ps
```

Wait for `postgres`, `redis`, `api`, and `web` to become healthy and for
`migrate` to exit successfully. The runtime URL is
`http://127.0.0.1:<WEB_HOST_PORT>`.

## Verify

```powershell
node scripts/run-mvp-smoke.mjs --env-file $env:DEPLOY_ENV_FILE --origin http://127.0.0.1:<WEB_HOST_PORT>
```

The smoke triggers one registration verification email to the approved
recipient, confirms unverified sign-in is not accepted, and exercises birth
profile submission, Zi Wei calculation, chart rendering, evidence, and free
preview.

## Stop

```powershell
docker compose --env-file $env:DEPLOY_ENV_FILE -f docker-compose.yml -f docker-compose.production.yml down
```

Do not add `--volumes` unless deliberate local data removal is approved.
