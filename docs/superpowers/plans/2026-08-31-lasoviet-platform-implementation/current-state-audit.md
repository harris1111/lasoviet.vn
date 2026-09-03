# Current-State Audit

**Audit date:** 2026-08-31
**Primary repository:** `harris1111/lasoviet.vn` at `c0574cc`

## Starting State

- The product repository contains research, requirements, configuration, and
  product documents but no application workspace.
- `AGENTS.md` now defines language, Superpowers-only workflow, role authority,
  approval gates, review closure, rule distillation, and deployment publishing.
- Existing Vietnamese documents remain legacy source material. New planning
  artifacts are English.
- No implementation dependency, migration, runtime service, or infrastructure
  has been created in this planning phase.

## Current Implementation Reconciliation (2026-09-03)

- The original starting-state note is historical. Phase 00 foundations, Phase
  01 identity/privacy services, Phase 02 calculation/evidence services,
  the artifact-driven Phase 03 free-MVP experience, the Phase 04 AI/report
  foundation, reviewed SePay Tasks 1-2, and production-like free-MVP Compose
  smoke evidence now exist.
- The approved UI artifact was implemented and merged through the dedicated
  feature branch. FD-024 therefore remains an artifact-first rule for future
  visual work, not an active blocker on the current MVP interface.
- The corrected explicit gender flow is approved and real-stack smoke reaches
  persisted birth profile, Zi Wei calculation, chart, evidence, and free
  preview. This is not evidence of paid-release readiness.
- Phase 04 commerce/report completion, Phase 05 storage/delivery/account
  center, Phase 05A Operations Dashboard, and Phase 06 paid-release gates
  remain uncompleted unless their task-level records expressly say otherwise.
- FD-030 approves the first SePay external sandbox test. The Windows host
  cannot run the PostgreSQL Testcontainers suite without a container runtime,
  but the Docker VPS gate passed on
  `200b85222a8b6eedb4692a76f31aed27c73bd214` and the sandbox endpoint is
  deployed. The remaining external step is the founder clicking SePay
  dashboard `Send test`; production payment activation remains
  founder-controlled.

## Verified Corrections

| Existing assumption | Corrected planning truth |
|---|---|
| Public `api.lasoviet.vn` in P0 | Next.js BFF calls a private API |
| Mingyu Zi Wei is independent of iztro | Mingyu delegates Zi Wei to iztro |
| Western engine unresolved | Celestine approved for Wave 3 |
| Silence may approve D-019/D-020 | Silence never approves; both are explicitly resolved |
| `config/sitemap.json` is authoritative | `config/route-registry.yml` is the sole route-definition source; a typed loader generates crawl/navigation behavior |
| Cloud S3 may behave as another authority | Garage is authoritative; replication is one-way |
| Unknown time may receive a default | No silent time default; paid Zi Wei is blocked |
| Host port may use framework default | Loopback-only stable deployment-selected high port |

## Repository Findings

- `config/product-catalog.json` defines four VND 79,000 Zi Wei SKU hypotheses.
- `ZIWEI-IDENTITY-P0` is the approved first complete paid flow.
- `docs/04-phase-1-product-spec.md` provides concrete calculation, report,
  commerce, privacy, and release gates.
- `docs/05-report-system.md` defines evidence-backed report structure and the
  quality rubric.
- `docs/10-decision-log.md` is a business-facing summary; binding founder
  approvals live only in `rules-and-decisions-tracker.md`.
- The decision IDs in workbook material and Markdown are not consistently
  aligned; new tracking uses stable IDs and supersession records.

## Upstream Findings

- iztro 2.6.0 is the primary Zi Wei engine and supports Vietnamese output,
  natal charts, 12 palaces, stars, transformations, brightness, and multiple
  horoscope scopes.
- iztro supports `default` and `zhongzhou`; P0 uses `default`.
- iztro does not natively accept location, timezone, or true-solar-time input.
- Mingyu `packages/core` 0.2.0 is the Eastern/divination production package.
- Celestine 0.2.1 is the Western production package and does not expose Solar
  Return in the audited source.
- Tianji is a genuinely independent Eastern reference.
- GPL/AGPL and unclear-license repositories are reference-only and are not
  copied or imported.

## Planning Inputs Deferred to Their Phase

- AI endpoint URL, key, model, and capability behavior.
- SMTP connection details and verified sender.
- SePay production activation inputs; the sandbox provider contract and
  checkout/webhook implementation are complete for Phase 04 Tasks 1-2.
- Optional cloud S3 configuration.
- VPS resource inventory, backup target, and selected `WEB_HOST_PORT`.
- Founder-managed Nginx configuration.
- Final legal/accounting review of refund and transaction retention wording.

## Post-Audit Founder Decision

- `FD-019` records the binding founder approval of Blueprint v1.1 as the
  canonical UX, route, and SEO source.
- `FD-020` records the approved 24-hour retention boundary for unlinked
  anonymous birth-profile and chart data.
- Approved technical decisions remain authoritative where legacy business
  documents conflict, including iztro `default`, SePay, the private API,
  unknown-time purchase restrictions, and `ZIWEI-IDENTITY-P0` as the only first
  purchasable SKU.
- The implementation plan now reconciles route paths/states, YAML route
  ownership, analytics ordering, guest retention, public content, SMTP auth
  sequencing, private account routes, and release-indexing tasks before code.
