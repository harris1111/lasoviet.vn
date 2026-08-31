# Current-State Audit

**Audit date:** 2026-08-31
**Primary repository:** `harris1111/lasoviet.vn` at `d89bfc1`

## Starting State

- The product repository contains research, requirements, configuration, and
  product documents but no application workspace.
- `AGENTS.md` now defines language, Superpowers-only workflow, role authority,
  approval gates, review closure, rule distillation, and deployment publishing.
- Existing Vietnamese documents remain legacy source material. New planning
  artifacts are English.
- No implementation dependency, migration, runtime service, or infrastructure
  has been created in this planning phase.

## Verified Corrections

| Existing assumption | Corrected planning truth |
|---|---|
| Public `api.lasoviet.vn` in P0 | Next.js BFF calls a private API |
| Mingyu Zi Wei is independent of iztro | Mingyu delegates Zi Wei to iztro |
| Western engine unresolved | Celestine approved for Wave 3 |
| Silence may approve D-019/D-020 | Silence never approves; both are explicitly resolved |
| `config/sitemap.json` is authoritative | One route registry generates the sitemap |
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
- `docs/10-decision-log.md` contains stale approval wording that must be
  corrected when legacy docs are substantively updated.
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
- SePay sandbox and production credentials.
- Optional cloud S3 configuration.
- VPS resource inventory, backup target, and selected `WEB_HOST_PORT`.
- Founder-managed Nginx configuration.
- Final legal/accounting review of refund and transaction retention wording.
