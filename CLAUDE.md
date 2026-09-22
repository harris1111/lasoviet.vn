# CLAUDE.md — Repository Guidance

## Architecture & Monorepo
- **Workspace:** pnpm 11 monorepo with strict dependency builds.
- **Applications:**
  - `apps/web`: Next.js 16 (App Router, Tailwind CSS, next-intl for VI/EN).
  - `apps/api`: Fastify / Node API server with Better Auth, PostgreSQL (Drizzle ORM), Redis, and SePay webhook handling.
  - `apps/worker`: BullMQ worker for asynchronous report generation, PDF rendering, and outbox event dispatch.
- **Packages:** `packages/contracts`, `packages/backend`, `packages/config`, `packages/database`, `packages/engine-adapters`, `packages/observability`, `packages/test-fixtures`.
- **Primary Canonical Domain:** `https://lasoviet.net` (FD-057).
- **Route Catalog:** Sole source of truth is `config/route-registry.yml`.

## Git & PR Workflow
- **Never push or commit directly to `master`.** Always work on a dedicated branch.
- Standard flow: dedicated branch -> Pull Request targeting `product/experience-spec-v1` (or `master` for release) -> tests pass -> merge after founder authorization.
- Commit conventions: English conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`).
- **Owner Authority & Reference Role Split:**
  - An focuses on Technical, Lãm focuses on Business. This is an informational role reference, NOT a rigid rule or barrier.
  - Either person has full authority to decide, instruct, approve, and execute across technical or business tasks without cross-confirmation.
  - A direct instruction from either An or Lãm is immediately binding.

## Kaneo Project Management Defaults
- Workspace: `Cash Cow` (`Ey2EBYm4Oeq2rhZoVpGYKLLoXEeZfJ2G`)
- Project: `La so viet` (`rcaikczb8v3h693a37g0zlzl`)
- Use Kaneo API/tools for task resolution, comments, and status updates. Never move tasks to `Done` without verified deployment/smoke evidence.

## Archive Directory Boundary (Hard Rule)
- **Do not read or scan files in `docs/_archive/` or `prototype/_archive/`** unless explicitly requested by name by the user.
- Use active files in `docs/` and their stub pointers for current context and source of truth.

## Essential Commands
- Fast pre-push check: `pnpm i18n:check && pnpm lint && pnpm typecheck`
- i18n parity check: `pnpm i18n:check`
- Run all tests: `pnpm test`
- Package-specific tests: `pnpm --filter @lasoviet/backend test`
- Typecheck: `pnpm typecheck`
- Production build: `pnpm build`
- Public claim verification: `node scripts/public-claim-check.mjs`
- Check public content: `node scripts/check-public-content.mjs`
