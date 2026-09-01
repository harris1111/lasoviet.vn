# Risk Register

| ID | Risk | Phase | Trigger | Mitigation | Release effect |
|---|---|---|---|---|---|
| R-01 | Incorrect Zi Wei result | 02 | Fixture mismatch | Pin engine/config, inspect school difference, trusted comparison | Block |
| R-02 | Normalization drift | 02 | Contract snapshot changes | Explicit adapter review and version bump | Block |
| R-03 | Time/calendar error | 01-02 | Boundary fixture fails | Preserve precision and timezone provenance | Block |
| R-04 | Unsupported AI claim | 04 | Missing/invalid evidence ID | Deterministic rejection and critic | Block |
| R-05 | Harmful report language | 04-06 | Safety rubric failure | Prohibited-category validator and QA | Block |
| R-06 | AI endpoint outage | 04 | Timeout/error threshold | Persisted retry, no fake fallback | Degrade |
| R-07 | Duplicate payment event | 04 | Webhook replay | Signature, amount validation, unique event key | Block |
| R-08 | Entitlement without payment | 04 | Transaction inconsistency | One DB transaction and outbox | Block |
| R-09 | Redis job loss | 04 | Queue outage | PostgreSQL outbox and reconciliation | Degrade |
| R-10 | Garage unavailable | 05 | Object write/read failure | HTML remains available, retry PDF | Degrade |
| R-11 | Cloud S3 unavailable | 05 | Replication failure | Backoff and degraded state | No block |
| R-12 | Replica delete drift | 05 | Tombstone retry exhausted | Reconciliation job and alert | Privacy block |
| R-13 | Unauthorized report access | 03-06 | Access-control test failure | Server authorization and signed URL | Block |
| R-14 | Secret leakage | All | Scan/log finding | External secrets, redaction, rotation | Block |
| R-15 | Migration failure | 01, 06 | Staging migration fails | Expand/contract migration and backup | Block |
| R-16 | Host port collision | 06 | Bind unavailable | Select once, persist outside Git, block on later collision | Block deploy |
| R-17 | Nginx mismatch | 06 | Upstream smoke fails | Founder handoff checklist | Block deploy |
| R-18 | License change | Any engine | SBOM/license diff | Keep approved pin or replace adapter | Block import |
| R-19 | Scope dilution | 07+ | Later wave delays P0 | Gate by first paid flow and metrics | Defer wave |
| R-20 | Biometric privacy | Future | Palm/face work proposed | Separate approval, storage, consent, runtime | Block |
| R-21 | Deferred decision bypass | 07-11 | Checkout or public capability enabled before its OD item closes | Open-decision registry, non-public defaults, Terra gate | Block |
| R-22 | Compulsive repeated casting | 10 | Same question can silently reroll | Founder-approved cooldown, immutable history, replay tests | Block public release |
| R-23 | Cross-profile privacy breach | 11 | Compatibility uses a profile without valid access/consent | Two-profile authorization, revocation, deletion, audit tests | Block |
| R-24 | AI provider terms conflict | 04-06 | Retention/training/access/incident terms fail review | Written due diligence and production-use gate | Block production AI |
| R-25 | Public payment/legal evidence missing | 06 | Refund, retention, tax, or settlement responsibility unresolved | Signed legal/accounting release record | Block payment launch |
| R-26 | Garage disaster recovery incomplete | 06 | Backup or isolated restore cannot reproduce asset checksums | Independent encrypted backup, metadata snapshot, restore drill | Block deploy |
| R-27 | VPS capacity insufficient | 06 | Inventory lacks measured staging headroom | Capacity preflight with 30% RAM/disk headroom | Block deploy |
| R-28 | Garage upload orphan | 05 | Object upload succeeds but asset-state transaction fails | Reserved deterministic key, checksum adoption, orphan reconciliation | Block release if unreconciled |
| R-29 | Route, content, analytics, or sitemap drift | 00, 03, 06 | A second source defines different path, state, event, canonical, or index behavior | `config/route-registry.yml` plus typed loader, ordered analytics config, deprecated legacy sitemap, contract tests, production route inventory | Block public indexing |
| R-30 | Authentication email unavailable | 01 | Verification or reset cannot deliver through reviewed SMTP | Establish SMTP port/adapter in Phase 01, protocol integration test, no verification bypass | Block authentication release |
| R-31 | Anonymous birth data retained too long or orphaned during linking | 01, 03, 06 | Unlinked profile/chart survives 24 hours, manual deletion fails, or account linking duplicates ownership | Better Auth anonymous actor, explicit expiry, transactional ownership transfer, purge/reconciliation tests | Privacy block |

## P02-T03 Evidence (2026-09-02)

R-01 and R-03 remain release-blocking risks. The P0 fixture suite now exercises
11 approved calendar/time/precision boundaries through the real adapter,
including unknown-time rejection and late-Zi index handling. The one Tianji
overlap agrees; all method gaps remain explicit rather than being treated as
validation.

## Review Protocol

- Terra classifies a verified current-scope correctness/security/privacy issue
  as `must-fix`.
- Product hypotheses and later-wave concerns are `defer`.
- Unsupported or founder-contradicting concerns are `rejected`.
- Sol updates this register when a risk changes severity, owner, or trigger.
