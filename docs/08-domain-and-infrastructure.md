# 08 — Domain & Infrastructure (Superseded)

> ⚠️ **ARCHIVED DOCUMENT — DO NOT READ UNLESS EXPLICITLY REQUESTED BY USER.**
> **Archive Path:** `docs/_archive/superseded/08-domain-and-infrastructure.md`
> **Current Sources of Truth:** `AGENTS.md` (Deployment Invariants), `docker-compose.yml`, `scripts/deployment/`

## Status Summary
This legacy domain document has been superseded. Under binding decision FD-057, `https://lasoviet.net` is the sole canonical public domain for SEO, web, Better Auth, and checkout. Services are deployed via Docker Compose with web published strictly on loopback `WEB_HOST_PORT` proxied by host Nginx.
