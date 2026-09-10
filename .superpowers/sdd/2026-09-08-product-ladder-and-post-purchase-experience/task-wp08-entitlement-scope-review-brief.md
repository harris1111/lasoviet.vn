# WP-08 Terra Review Brief

Review the complete WP-08 implementation against:

- `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
- `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`
- `task-wp08-entitlement-scope-brief.md`
- live repository code and tests

Review only the WP-08 commit range supplied by Sol. Do not implement, commit,
push, merge, deploy, activate payment externally, or broaden scope.

## Review Questions

1. Does the database migration safely add non-null entitlement scope and
   backfill existing immutable entitlements to complete Tier-2 scope?
2. Is there one exact, validated scope vocabulary shared by contracts,
   entitlement creation, catalog activation, and report projection?
3. Do both paid-confirmation and self-claim paths atomically create the correct
   scope, reservation, and one generation request?
4. Is the 19k excerpt the only newly activated offer, while all other reserved
   SKUs remain rejected before database access?
5. Does the report query derive effective scope from all non-refunded
   entitlements for the same owner and chart, with no cross-owner or
   cross-chart leakage?
6. For Tier 1, are all locked titles, IDs, narratives, arrays, evidence keys,
   and hidden full-content fields absent from the serialized response?
7. Does Tier 2 preserve all 12 palace readings, all four thematic synthesis
   entries, key configurations, and practical direction?
8. Does unlock/upgrade read existing immutable generated content without a
   second report version, AI call, or generation outbox request?
9. Are legacy V1/V2 reports unchanged and still readable?
10. Are tests focused and sufficient for schema, integration, authorization,
    migration, and serialization boundaries?

## Finding Classification

Return evidence-backed findings only:

- `must-fix`: correctness, security, privacy, acceptance, or release issue
  inside WP-08.
- `defer`: valid but outside WP-08 go-live scope.
- `rejected`: unsupported, duplicate, contradicted by source, or speculative.

Prioritize Critical and Important findings. Include file/line evidence and
focused reproduction commands. State APPROVED only when no Critical/Important
finding remains.
