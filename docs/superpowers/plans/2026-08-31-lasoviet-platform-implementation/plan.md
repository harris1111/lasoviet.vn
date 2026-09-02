# Lá Số Việt Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Lá Số Việt from an empty product repository to a
domain-ready P0 on one VPS, then expand through the approved public waves
without weakening calculation, payment, privacy, or evidence gates.

**Architecture:** A `pnpm` modular monorepo contains a Next.js 16 web/BFF,
private NestJS/Fastify API, BullMQ worker, and shared backend/contracts/adapters.
PostgreSQL is the business source of truth; Redis handles background work;
Garage is authoritative object storage with optional one-way cloud S3
replication.

**Tech Stack:** TypeScript, pnpm, Next.js 16, NestJS, Fastify, Drizzle,
PostgreSQL, Better Auth, Redis, BullMQ, Garage, Zod, Vitest, Playwright,
Docker Compose, SePay, SMTP, and a founder-provided OpenAI-compatible endpoint.

**Spec:** `docs/superpowers/specs/2026-08-31-lasoviet-platform-architecture-design.md`

**Status:** Planning reconciliation is current through 2026-09-02. The
repository has implemented Phase 00 foundations, Phase 01 identity/privacy
services, Phase 02 calculation/evidence services, the artifact-driven Phase 03
free-MVP experience, the Phase 04 AI/report foundation, and production-like
free-MVP Compose smoke evidence. The FD-024 artifact-first UI gate was
satisfied by the merged MVP UI branch; it remains the rule for future visual
work. No later phase is marked complete merely because a foundation exists;
paid-release closure remains blocked by the unimplemented Phase 04/05
workflows and Phase 05A evidence.

## Global Constraints

- This plan does not authorize implementation until the founder explicitly
  approves the completed planning package.
- Source precedence is controlled by `AGENTS.md`. `FD-019` is the sole binding
  Blueprint v1.1 approval record. Blueprint route/UX/SEO decisions supersede
  conflicting material in `MASTER_CONCEPT.md`, `docs/01-*` through
  `docs/12-*`, and deprecated `config/sitemap.json`; approved technical
  decisions remain authoritative.
- Communicate with the founder in Vietnamese; repository artifacts and commits
  are English.
- Use only Superpowers workflows; do not invoke `/ck` or CK CLI.
- Sol orchestrates, Terra reviews, and Luna implements only Terra-approved
  instructions.
- P0 uses Next.js 16 latest stable 16.x at implementation time.
- P0 uses NestJS with the Fastify adapter.
- Browser traffic terminates at Next.js; the API remains private.
- Docker publishes web only on
  `127.0.0.1:${WEB_HOST_PORT}:3000`, where `WEB_HOST_PORT` is a stable,
  deployment-selected unused port in `49152-65535`.
- Repository automation never edits host Nginx.
- PostgreSQL is the source of truth; Redis is not a business ledger.
- All calculation engines are accessed through owned adapters.
- Zi Wei P0 uses iztro `default`.
- Unknown or multi-branch birth time cannot buy a Zi Wei report.
- Unlinked anonymous birth-profile and chart data is purged within 24 hours;
  account linking transfers ownership without duplicating calculation data.
- SePay webhook confirmation is authoritative after signature and amount
  validation.
- AI interprets frozen facts/evidence; it never calculates a chart.
- Garage is authoritative; cloud S3 is optional and one-way.
- Deletions propagate to cloud S3.
- Private reports are noindex and owner-authorized.
- P0 release requires 100% approved fixtures, zero open severity-1
  calculation/payment/privacy defects, and twenty internally reviewed reports.
- Highly niche tests may be deferred only when they do not affect calculation,
  payment, authorization, privacy, or data integrity.
- Every task ends with tests, Terra review evidence, docs impact, and a focused
  English conventional commit.

## Plan Package

| File | Purpose |
|---|---|
| `current-state-audit.md` | Verified starting state and corrections |
| `requirements-traceability.md` | Spec-to-phase coverage |
| `dependency-integration-matrix.md` | Production and reference boundaries |
| `docker-compose-deployment-plan.md` | One-VPS runtime and rollout |
| `storage-replication-plan.md` | Garage and cloud S3 lifecycle |
| `risk-register.md` | Risks, owners, triggers, and mitigations |
| `rules-and-decisions-tracker.md` | Founder decisions and durable-rule checks |
| `open-decisions.md` | Deferred founder decisions and exact task blockers |
| `task-contracts-and-test-vectors.md` | Exact task inputs, outputs, errors, effects, and failing vectors |
| `workflow-event-contracts.md` | Versioned paid-report event and job map |
| `reports/terra-final-review.md` | Historical review of the original 51-task package |
| `reports/terra-blueprint-integration-review.md` | Final 55-task Blueprint reconciliation review |

## Phase Index

| Phase | Outcome | Depends on |
|---|---|---|
| [00](phase-00-repository-foundation.md) | Workspace, runtime/route/content contracts, design tokens, i18n, CI, observability | Plan approval |
| [01](phase-01-data-identity-and-birth-profile.md) | PostgreSQL, Better Auth, consent, BirthProfile | 00 |
| [02](phase-02-ziwei-calculation-and-evidence.md) | iztro adapter, normalized chart, fixtures, evidence | 01 |
| [03](phase-03-free-web-experience.md) | Gate 1 public surface, foundational content, private funnel, and free chart | 02 |
| [04](phase-04-commerce-and-report-generation.md) | SePay, entitlement, worker, knowledge, AI report | 03 |
| [05](phase-05-storage-delivery-and-account-center.md) | PDF, Garage, replication, email, and owner account center | 04 |
| [05A](phase-05a-admin-operations-dashboard.md) | Admin and Operations Console: RBAC, redacted inspection, audited recovery commands, and release evidence | Foundation may begin after 03; closure requires 04 and 05 |
| [06](phase-06-production-readiness-and-launch.md) | Compose deployment, security, E2E, release gates, and Gate 1 indexing | 05 and 05A |
| [07](phase-07-remaining-ziwei-and-wave-1-5.md) | Remaining Zi Wei SKUs and acquisition tools | 06 plus P0 stability evidence |
| [08](phase-08-bazi-wave-2.md) | BaZi calculator and paid report | 07 public gate; engineering may prepare after 06 |
| [09](phase-09-western-wave-3.md) | Celestine natal chart and interpretation | 06 for engineering; 08 public gate for launch |
| [10](phase-10-iching-wave-4.md) | Liu Yao/I Ching casting and reading | 06 for engineering; 09 public gate for launch |
| [11](phase-11-compatibility-fengshui-and-extraction.md) | Later product waves and extraction gates | Task-specific stable-source gates; 10 public gate |

## Execution Rules

1. Execute phases in dependency order.
2. Within a phase, Sol gives Terra the phase goal and acceptance criteria.
3. Terra converts approved work into exact Luna instructions.
4. Luna writes only the assigned files and stops on unexpected behavior.
5. Terra reviews the change and test evidence.
6. Sol updates phase status, traceability, risk, decision, and rule trackers.
7. A phase closes only when its exit criteria pass in the intended environment.
8. No later-wave feature may delay the first complete paid Zi Wei flow.
9. A task listed in `open-decisions.md` cannot cross its named decision gate
   until the founder resolves that decision in writing.
10. Each phase task and its matching `Pxx-Tyy` record in
    `task-contracts-and-test-vectors.md` form one normative implementation
    instruction.

## Approval Boundary

Founder approval of this package authorizes implementation only for the scope
explicitly named in that approval. Credentials, production changes, DNS,
Nginx, payment activation, and deployment still require their phase-specific
approval and inputs. Approval of this package does not resolve decisions listed
as open in `open-decisions.md`.
