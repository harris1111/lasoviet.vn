# Terra High Milestone Review: Zi Wei Result and Report Clarity

Date: 2026-09-07
Reviewer: Terra high
Review range: `3372d08aecef541cb505b085593b9a4d71a518d3..16944438d7db308d19e2cf6dd529792f9e96e246`
Worktree: `G:\Dev\Repos-Windows\tuvi-a-lam\lasoviet-admin-operations-plan\.worktrees\ziwei-result-and-report-clarity`

## Code Review Summary

### Scope

- Files: 45 changed files, 2,964 additions, 91 deletions.
- Focus: approved Phase 04 result projection, report generation, worker provisioning, and report rendering.
- Anchor: `git rev-parse --show-toplevel` matched the requested worktree.
- Evidence reviewed: approved spec and plan, both Flash reports, supplied full diff package, changed code/tests, dependent queue/version/retrieval paths, V1 manifests and existing job fixtures.
- Checks: did not rerun recorded test/build/typecheck commands. Reviewed the supplied passing evidence and inspected the corresponding tests.

### Scout Findings

- The chart result path preserves owner authorization and joins the exact immutable `profileRevisionId`; its output is narrowed to a strict birth summary.
- Report generation is versioned in reservations and persists those version identifiers, so writer behavior must remain coupled to the reservation version.
- A quality rewrite can cross a retry boundary because retry state is durable but rewrite usage is not.
- Worker startup awaits provisioning before constructing the report runner, but only result-shaped ingestion failures are normalized.
- Retrieval makes a fixed eleven section calls, keeps vector retrieval disabled, preserves section/source metadata, and is bounded before the model call.

### Overall Assessment

The implementation substantially meets the Phase 04 intent: chart-specific localized presentation, frozen-evidence-only AI context, V2 manifest provisioning, deterministic bounded retrieval, canonical section assembly, and all-eight-dimension critic gating are present. It is not ready to approve because three failure/version paths break explicit rollout guarantees.

## Critical Issues

None.

## Important Issues

### I1. Thrown knowledge-ingestion failures do not become the required stable startup error

Evidence:
- `apps/worker/src/reports/provision-report-knowledge.ts:54`
- `apps/worker/src/reports/provision-report-knowledge.ts:60`
- `packages/backend/src/knowledge/knowledge-ingestion.service.ts:443`
- `apps/worker/src/main.ts:16`

`provisionReportKnowledge()` maps only `{ ok: false }` ingestion results to `REPORT_KNOWLEDGE_PROVISION_FAILED`. The ingestion service deliberately rethrows unexpected database/transaction failures. A rejected VI or EN ingestion promise therefore escapes with its original error rather than the required stable provisioning error. The awaited call still prevents report polling, but the failure contract is broken and any upstream error text can reach the worker's unhandled bootstrap-rejection path.

Fix: wrap manifest loading and each `await ingestKnowledge(...)` in one failure boundary that logs only a stable safe code and throws `new Error("REPORT_KNOWLEDGE_PROVISION_FAILED")`. Add tests for a throwing manifest loader and a rejecting VI/EN ingestion call.

### I2. The one-rewrite limit is reset after a retryable revision failure

Evidence:
- `packages/backend/src/reports/report-generation.service.ts:253`
- `packages/backend/src/reports/report-generation.service.ts:280`
- `apps/worker/src/processors/report-generate.processor.ts:152`
- `packages/database/src/schema/reports.ts:96`

After the first non-safety critic failure, the service starts its one revision. If that revision call or revision critic throws, it records retryable `AI_TIMEOUT`. The processor requeues the job, and the next queue attempt enters a fresh `generateReport()` invocation with no durable rewrite-used marker. A second non-safety critic failure can therefore trigger another revision. `report_generation_attempts` records only job attempt number/status, not rewrite budget.

This violates the binding "only one rewrite" rule and can multiply provider calls while a report remains unresolved. No rejected draft is persisted, but the durable budget is still required to enforce the policy across worker retries.

Fix: make rewrite consumption durable per report version, not per in-memory service invocation. After a quality rejection, later retries must either continue within the already-consumed budget without another rewrite or terminate the report safely. Add an integration test where the first revision times out and the retried job receives another quality rejection.

### I3. Versioned reservations can be generated with V2 writer behavior while recorded as V1

Evidence:
- `packages/backend/src/reports/identity-report-config.ts:3`
- `packages/backend/src/reports/identity-report-config.ts:5`
- `packages/backend/src/reports/identity-report-writer.ts:58`
- `packages/backend/src/reports/identity-report-writer.ts:109`
- `packages/backend/src/reports/report-generation.service.ts:192`
- `packages/backend/src/reports/report-version.repository.ts:140`
- `content/knowledge/vi/ziwei/identity-report-foundation.v1.json:3`

Reservations and immutable versions retain `knowledgeVersionId` and `promptVersion`, including existing V1 identifiers. The generation service forwards the reservation's `promptVersion` to provenance, but `writeIdentityReportDraft()` unconditionally applies the new localized-facts prompt, V2 quality/style requirements, canonical-title overwrite, deterministic cycle replacement, and 6,000-token behavior. There is no V1/V2 prompt dispatch or guard. An already-reserved V1 job can consequently produce V2 semantics while immutable provenance and version fencing record `ziwei.identity.prompt.v1`.

This is a real compatibility and auditability defect because V1 manifests remain in the repository and report reservations were explicitly designed to preserve generation versions.

Fix: dispatch writer behavior by the reserved prompt/config version, or explicitly reject/upgrade only reservations covered by a reviewed migration policy. Add an integration test for a pre-existing V1 reservation proving either V1 behavior is retained or it fails with an intentional stable compatibility error. Keep V2 selection limited to newly created reservations after provisioning succeeds.

## Minor Issues

None.

## Spec Compliance

| Requirement | Status | Evidence |
|---|---|---|
| Exact immutable birth-summary projection without profile/account/coordinate disclosure | Pass | `packages/backend/src/ziwei/ziwei-query.repository.ts:60`, `packages/backend/src/ziwei/ziwei-query.service.ts:76` |
| Code-first localized evidence bounds, including report rendering | Pass | `packages/contracts/src/evidence.ts:13`, `apps/web/src/features/reports/report-reader.tsx:407` |
| Deterministic chart-specific free result content | Pass | `apps/web/src/features/reports/free-identity-preview.tsx:27` |
| Immutable existing report/evidence records stay readable | Pass | render-time localization only; immutable version fencing remains in `report-version.repository.ts:126` |
| V2 manifest provisioning before report polling | Partial | awaited before runner at `apps/worker/src/main.ts:16`; stable failure contract is incomplete (I1) |
| Frozen-evidence-only, approved-knowledge AI context | Pass | `frozen-identity-report-facts.ts:25`, `identity-report-writer.ts:86`, `report-generation.repository.ts:149` |
| Metadata-preserving deterministic 11/900/9600 RAG, without vector search | Pass | `report-source.ts:61`, `report-generation.repository.ts:160` |
| Canonical localized titles and deterministic no-cycle disclosure | Pass | `identity-report-writer.ts:102` |
| All eight critic scores and one bounded rewrite | Partial | all-score gate passes at `report-critic.ts:45`; rewrite limit fails across retries (I2) |
| New V2 reservations without silently changing prior versioned behavior | Partial | V2 reservation creation passes at `commerce.repository.ts:302`; prior prompt behavior is not version-dispatched (I3) |
| Exclusions: no vector, evidence migration, open web, SKU, push, deploy, production action | Pass | `enableVector: false` at `report-generation.repository.ts:169`; diff contains no prohibited implementation or operational action |

**SPEC COMPLIANCE: FAIL**

## Code Quality

Strengths:

- The owner filter and chart/profile-revision join are preserved; no authorization regression found.
- The birth-summary contract is strict and the presentation layer uses localized generic fallbacks instead of raw unknown identifiers.
- V2 manifests are first-party, approved, hash-validated, section-complete, and copied into the worker runtime image.
- Retrieval has existing FTS and JSONB indexes, uses a fixed bounded loop, and explicitly disables vector retrieval.
- Final report persistence occurs only after deterministic validation and critic success; rejected drafts are not committed.

Risks requiring correction:

- I1 error-boundary failure.
- I2 retry-state/race-boundary failure.
- I3 version-contract compatibility failure.

**CODE QUALITY: CHANGES_REQUIRED**

## Recommended Actions

1. Fix I1 with a total provisioning error boundary and rejection-path tests.
2. Fix I2 with durable rewrite-budget state and a retry-crossing integration test.
3. Fix I3 with explicit V1/V2 generation dispatch or an approved migration/terminal-handling policy, then test a pending V1 reservation.
4. Re-run only the focused provisioning, generation, reservation/version, and integration tests affected by the corrections, followed by the recorded typecheck/build/i18n/diff gates.

## Metrics

- Type coverage: not independently measured; supplied workspace typecheck was recorded as clean.
- Test coverage: not independently measured; supplied focused suites were recorded as 224 passing tests.
- Linting issues: no lint run recorded or independently run.

## Unresolved Questions

None. The V1 compatibility concern is evidenced by retained V1 manifests, versioned reservation fields, and the absence of writer dispatch.
