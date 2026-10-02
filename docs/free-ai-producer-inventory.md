# Free AI producer inventory — 2026-10-02

Scope: the audit baseline and the dedicated remediation branch. This is source inspection, not deployment evidence.

| Path | Actual generation and accounting | Pilot policy |
|---|---|---|
| `ZiweiQueryService.readPreview` / `ZiweiController.readPreview` | Calls `buildGuardedFreeIdentityPreview` without its optional generator. Current runtime reads chart/evidence and builds structural content; no provider dispatch. | Preserve read-only behavior. Never inject a generator into GET. |
| `buildGuardedFreeIdentityPreview` optional generator port | Library supports generated preview and legacy chart-only cost guard. No runtime caller currently supplies the generator. Guard is not an atomic global reservation or durable quota. | Disabled: no generator injection until every free producer uses shared admission/fence/settlement. |
| New free-palace gift | Contracts, durable schema, and bounded server modules under construction. No API/worker injection or production provider adapter. | Default OFF; do not admit or dispatch until DB, provider-bound, and release gates pass. |
| Worker `createOpenAiCompatibleAdapter` | Existing report-generation provider, approved pricing gate and cost recorder; retries derive from `environment.ai.maxRetries`. Paid report/critic/rewrite behavior remains authoritative. | Preserve paid behavior. Gift requires a separate instance with retries zero and frozen attempt/pricing. |
| Synthetic probe | Existing capability testing purpose may use synthetic pricing fallback. | Never reuse for free gift or bypass its pricing gate. |
| UI free insights | Deterministic structural chart facts, not an additional AI producer. | Remain provider-free. |

`free_preview` is an accounting purpose in `ai-cost.ts`; the enum alone does not establish a live producer. Historic attempts/outcomes still require reconciliation before new admissions. Unknown historic cost or lineage blocks new dispatch.

## Kill switch

`FREE_PALACE_GENERATION_ENABLED` is absent/false by default. Missing or malformed configuration must not enable it. OFF prohibits admission and fencing, while authorized supported cache remains readable. Setting it ON alone is not release approval: missing producer integration, guaranteed provider token bound, real DB concurrency/deletion tests, or rollout approval still keeps dispatch unavailable.

## Unmet gates

- Disposable PostgreSQL migration and multi-connection constraint/race tests: this environment has no container runtime.
- Reviewed production provider guarantee for exact serialized input and enforced maximum output: not established. Cost-context code accepts only explicit reviewed adapter proof and has no production wiring.
- Full Phase A browser/performance matrix and release review: pending.
- Legacy reconciliation and cross-producer admission wiring: pending. No pilot or provider spend is authorized by this inventory.
