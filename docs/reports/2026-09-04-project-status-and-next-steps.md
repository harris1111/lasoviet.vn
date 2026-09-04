# Project Status and Next Steps

**Date:** 2026-09-04
**Repository:** `harris1111/lasoviet.vn`
**Active branch:** `feature/paid-flow-admin-operations`
**Audited HEAD:** `8393f4a3fda31ff6aa50c5ad4390bcc4e5bf9e3c`

## Audit Scope

This report reconciles Git metadata, the master plan, phase files, decision
tracker, milestone reports, and recent commits. It does not claim that tests
were rerun or that the VPS was re-probed during this documentation task.

## Git Status

A fresh `origin` fetch established:

- The worktree was clean at audit start.
- The active branch matched its upstream branch.
- The branch was 31 commits ahead and 0 behind `origin/master`.
- `origin/master` was `b5ac65b63a11d5be1f11d9d1855f21d2a4f69b37`.
- No pull request existed for the active branch.

All new repository documentation must remain on the feature branch. No merge or
deployment is authorized by this report.

## Executive Summary

The free MVP, core Zi Wei calculation, identity/privacy foundation, Compose
topology, SePay checkout/webhook foundation, and half of the Admin/Operations V1
task set are present. A real authenticated SePay sandbox payment successfully
created the complete commerce transaction through a processed report outbox
event.

The project is not yet a complete paid MVP. The first runtime gap is the absent
P04-T03 report worker consumer: the sandbox-created report job remains
`waiting`. The remaining paid path requires worker state, knowledge retrieval,
complete AI generation and persistence, private HTML, PDF/storage/email
delivery, owner access, admin recovery workflows, and release evidence.

## Phase Reconciliation

| Phase | Current assessment | Evidence quality |
|---|---|---|
| 00 | Complete | All task steps checked with documented focused and workspace verification |
| 01 | Functionally implemented; formal bookkeeping incomplete | Identity, privacy, SMTP, recovery, and birth-profile evidence exists; P01-T02 retains stale unchecked steps |
| 02 | Complete | All calculation, fixture, persistence, and evidence tasks checked |
| 03 | Functionally delivered; phase file stale | UI artifact merged, free MVP deployed, and browser smoke recorded, while old task checkboxes still describe UI deferral |
| 04 | In progress | T01-T02 complete; AI foundation partial; T03, T04, T06 open; T05 explicitly incomplete |
| 05 | Remaining | PDF, storage, replication, report email, and account center tasks remain unchecked |
| 05A | In progress | T01, T02, and T05 complete; T03, T04, and T06 open |
| 06 | Infrastructure foundation present; release remaining | Compose and free-MVP deployment evidence exists, but all paid-release tasks remain open |
| 07-11 | Not started | Later product waves remain behind the P0 release gate |

## Delivered Capabilities

- Next.js web/BFF, private NestJS/Fastify API, BullMQ worker shell, PostgreSQL,
  Redis, shared contracts, CI, health, logging, and Docker Compose.
- Vietnamese and English routing/content foundations.
- Better Auth email/password flow, SMTP verification and recovery, Google OAuth
  integration surface, consent, account deletion policy, and birth profiles.
- Deterministic Zi Wei calculation through the owned iztro adapter, immutable
  calculation runs, approved fixtures, capability registry, and evidence.
- Artifact-driven free MVP with public trust/content surfaces and private chart
  flow.
- AI provider adapter, capability probe, deterministic outline/writer/validator
  and critic foundations, protected by a production privacy gate.
- SePay hosted checkout, authenticated IPN processing, idempotent order/payment
  handling, entitlement creation, report reservation, and outbox dispatch.
- Private admin route enforcement, database-backed RBAC/capabilities,
  append-only audit, redacted operations overview, role administration, and
  audit inspection.

## Current Runtime Evidence

Latest recorded deployment evidence, not freshly re-probed here:

- Domain `https://lasoviet.vn` was served through founder-managed Nginx.
- Docker published web only at `127.0.0.1:63423`.
- PostgreSQL, Redis, API, and web were healthy; the worker container was
  running.
- A sandbox card payment delivered authenticated `ORDER_PAID`.
- Exactly one paid order, payment event, entitlement, report reservation, and
  processed `report.generation.requested.v1` outbox event were recorded.
- The resulting report job remained `waiting`.
- The auth recovery fix was deployed and one password-reset email was delivered.

## Active Gaps and Blockers

### Paid Report Runtime

- P04-T03 does not yet consume and execute the waiting report job.
- P04-T04 knowledge ingestion and PostgreSQL retrieval are absent.
- P04-T05 lacks approved production provider privacy terms and its complete
  worker/persistence integration.
- P04-T06 immutable report versions and private HTML are absent.

### Delivery and Owner Experience

- PDF rendering is absent.
- Garage authoritative storage and optional one-way cloud replication are
  absent.
- Report delivery email and owner account center are absent.

### Operations and Release

- Admin detailed inspections, compensating commands, and production-like
  incident evidence are incomplete.
- Security hardening, purge execution, metrics, backup/restore drills, complete
  paid E2E, degraded-mode E2E, and indexing activation remain.
- Twenty internally reviewed reports and legal/accounting release evidence
  remain mandatory release gates.

### Founder or External Gates

- Production AI requires written provider privacy and operational approval.
- Production payment activation remains founder-controlled.
- Google OAuth lacks recorded full-flow verification.
- Password-reset email delivery is verified, but successful reset completion
  and subsequent sign-in have not been recorded.

## Recommended Execution Order

1. Implement P04-T03 report worker and durable report state transitions.
2. Implement P04-T04 knowledge ingestion and retrieval.
3. Complete P04-T05 generation, validation, critic, and persistence integration
   after its privacy gate is resolved.
4. Implement P04-T06 private immutable HTML reports.
5. Execute Phase 05 PDF, storage, replication, email, and account-center tasks.
6. Complete P05A-T03 and P05A-T04 against the real Phase 04/05 domains.
7. Run P05A-T06 with the full Phase 06 production-like release gate.
8. Obtain founder approval for production payment, AI, and launch activation
   only after the release evidence passes.

## Documentation Drift Corrected

This documentation update corrects:

- The master-plan statement that SePay dashboard testing was still pending.
- The obsolete handoff branch `feature/site-foundation`.
- The generic unfilled next-agent prompt.
- The missing global Flash Executor role and dispatch boundary.

Phase 01 and Phase 03 task checkboxes still require a later bookkeeping
reconciliation against their implementation evidence. That cleanup should not
block P04-T03.

## Global Flash Executor

Global Codex configuration now defines `flash_executor` with:

- Model `ag/gemini-3.8-flash-high`.
- Reasoning effort `high`; no `xhigh` catalog option.
- Existing global custom provider reuse without credential duplication.
- Explicit Sol/Terra assignment requirement.
- Exact file ownership and literal implementation.
- No self-assignment, planning, proposing, scope expansion, deep debugging,
  deployment, or external effects without an exact brief.
- One direct local correction before returning ambiguous work as `BLOCKED` or
  `NEEDS_CONTEXT`.

An exact-model read-only no-file probe returned
`FLASH_EXECUTOR_MODEL_OK`. A second probe invoked the registered role, recorded
an actual child-agent spawn, and received `FLASH_ROLE_OK`.

## Open Questions

None for the next recommended engineering task. The later production AI,
payment, and release gates remain intentionally founder-controlled.
