# Requirements Traceability

| Requirement | Primary phase | Verification |
|---|---|---|
| Next.js 16 SSR/BFF | 00, 03 | Web build and SSR E2E |
| Private NestJS/Fastify API | 00 | Network and API contract tests |
| One general worker | 00, 04 | Queue-selection integration test |
| PostgreSQL source of truth | 01 | Transaction/outbox integration tests |
| Redis only for async work | 04 | Failure and replay tests |
| Better Auth database sessions | 01 | Session and authorization E2E |
| Email/password + Google | 01 | Verification, reset, OAuth E2E |
| Consent and deletion | 01, 06 | State-machine and purge tests |
| Canonical BirthProfile | 01 | Precision/timezone fixtures |
| Runtime VI/EN switch | 00, 03 | Key parity and locale E2E |
| iztro adapter and default rules | 02 | Golden/contract fixtures |
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
| Resend SMTP | 05 | Delivery and retry integration tests |
| Admin/support/audit | 05 | RBAC and audit tests |
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
