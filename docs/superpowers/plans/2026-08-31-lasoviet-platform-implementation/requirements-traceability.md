# Requirements Traceability

| Requirement | Primary phase | Verification |
|---|---|---|
| Next.js 16 SSR/BFF | 00, 03 | Web build and SSR E2E |
| Private NestJS/Fastify API | 00 | Network and API contract tests |
| One general worker | 00, 04 | Queue-selection integration test |
| PostgreSQL source of truth | 01 | Transaction/outbox integration tests |
| Redis only for async work | 04 | Failure and replay tests |
| Better Auth database sessions | 01 | Session and authorization E2E |
| Email/password + Google | 01 | Verification/reset SMTP delivery, session, and OAuth E2E |
| Guest chart before registration | 01, 03 | Better Auth anonymous session, ownership, linking, and full-flow E2E |
| Anonymous 24-hour retention | 01, 03, 06 | Expiry, immediate deletion, transactional linking, and purge tests |
| Consent and deletion | 01, 06 | State-machine and purge tests |
| Canonical BirthProfile | 01 | Precision/timezone fixtures |
| Runtime VI/EN switch | 00, 03 | Key parity and locale E2E |
| Blueprint v1.1 canonical route registry | 00, 03 | YAML/typed-loader parity, registry collision, state, canonical, robots, sitemap index/children, and alternate tests |
| Paper/Ink/Cinnabar design contract | 00, 03 | Token, contrast, focus, reduced-motion, and responsive UI tests |
| Gate 1 public trust/product surface | 03, 06 | SSR metadata, structured data, links, indexability, and production smoke |
| Ten reviewed foundation articles | 03 | Content completeness, source/reviewer, locale, link, and thin-content gates |
| Knowledge and Zi Wei hubs | 03, 06 | VI/EN content ownership, links, metadata, and production indexability |
| Privacy-safe canonical analytics funnel | 00, 03 | Ordered config, event schema, and forbidden-property tests |
| iztro adapter and default rules | 02 | P02-T02 adapter/provenance, PostgreSQL idempotency, authorization, migration, and later golden-fixture tests |
| Independent Zi Wei validation | 02 | Tianji/trusted-case comparison |
| Normalized chart contracts | 00, 02 | Schema compatibility tests |
| Evidence-only claims | 02, 04 | Claim validator tests |
| Curated knowledge retrieval | 04 | Retrieval version tests |
| OpenAI-compatible endpoint | 04 | Capability probe and report eval |
| AI provider privacy/terms review | 04, 06 | Due-diligence and release-evidence gate |
| SePay and idempotent webhook | 04 | Replay and amount-mismatch tests |
| Paid workflow event/job chain | 04-05 | `workflow-event-contracts.md` integration test |
| Immutable report versions | 04 | Persistence and regeneration tests |
| HTML and PDF reports | 04, 05 | Render and download E2E |
| Garage authoritative storage | 05 | Object lifecycle tests |
| Optional one-way S3 replica | 05 | Disabled/degraded/recovery tests |
| Founder-provided MXRouting SMTP | 01, 05 | Auth-email and report-delivery protocol, idempotency, and retry tests |
| Account center and admin/support/audit | 05 | Server authorization, noindex, ownership, RBAC, and audit tests |
| Loopback random host port | 06 | Compose config assertion |
| Stable external port persistence | 06 | Selection/reuse/collision tests |
| Founder-managed Nginx | 06 | Interface checklist, no repo mutation |
| Structured logs and health | 00, 06 | Log schema and readiness tests |
| Restart and capped Docker logs | 06 | Compose config assertion |
| PostgreSQL and Garage backup/restore | 06 | Encrypted isolated restore drill |
| Legal/accounting release approval | 06 | Signed release-evidence gate |
| Full paid flow | 06 | Playwright release E2E |
| Twenty-report rubric | 06 | Signed internal QA record |
| Remaining Zi Wei SKUs | 07 | Per-SKU report E2E |
| Numerology Wave 1.5 | 07 | Formula fixtures and free funnel |
| BaZi Wave 2 | 08 | Mingyu adapter fixtures and report E2E |
| Western Wave 3 | 09 | Celestine fixtures and natal E2E |
| Liu Yao Wave 4 | 10 | Replayable casting and cooldown E2E |
| Compatibility and Feng Shui | 11 | Source-system stability gates |
| Deferred founder decisions | 07-11 | `open-decisions.md` gate audit |

## P00-T01 Evidence (2026-09-01)

| Scope | Evidence | Boundary |
|---|---|---|
| Next.js web/BFF foundation | `@lasoviet/web` App Router composition root with exact Next.js 16.3.4 dependency; typecheck, lint, test, and build passed. | Records workspace foundation only; does not claim SSR, BFF behavior, or E2E coverage. |
| Private NestJS/Fastify API foundation | `@lasoviet/api` thin NestJS/Fastify composition root with exact approved dependencies; typecheck and build passed. | No health or product endpoint is claimed. |
| General worker foundation | `@lasoviet/worker` Nest application-context composition root with exact approved dependencies; typecheck and build passed. | No queue behavior or runtime job processing is claimed. |

## P02-T03 Evidence (2026-09-01)

| Requirement | Evidence | Boundary |
|---|---|---|
| iztro adapter and default rules | Manifest v1 runs 11 approved P0 fixtures through the real `IztroAdapter`, pins `iztro@2.6.0` and `ziwei.default`, and verifies the late-Zi vendor index boundary. | The approved current-day rule may yield the same normalized chart for early/late Zi; no alternate school is inferred. |
| Independent Zi Wei validation | Read-only Tianji lunar/early-Zi overlap agrees on Tiger life palace for `1988-01-15`; non-overlapping methods are recorded as not comparable. | Tianji is reference-only; Mingyu is not independent validation. |

## P02-T04 Evidence (2026-09-01)

| Requirement | Evidence | Boundary |
|---|---|---|
| Evidence-only claims | Three deterministic Zi Wei identity evidence IDs resolve only to normalized chart facts and attach confidence, limits, risk tags, and action categories. | No generated prose or AI claim is created. |
| Normalized chart contracts | Unsupported rule sets or missing normalized facts return typed errors and write no evidence set; concurrent duplicate persistence retains one immutable set and three items. | Only `ziwei.default` and `ZIWEI-IDENTITY-P0` are in scope. |

## Update Protocol

After every task:

1. Mark the task checkbox in its phase file.
2. Add or update the verification evidence link.
3. Record changed requirements here.
4. Record newly discovered risk in `risk-register.md`.
5. Record founder decisions or supersession in
   `rules-and-decisions-tracker.md`.
6. Evaluate whether a recurring error warrants an `AGENTS.md` rule.
7. Close or supersede any resolved item in `open-decisions.md`.
