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

## Terra High Scoped Re-Review: Correction Round 1

Date: 2026-09-07
Review range: `16944438d7db308d19e2cf6dd529792f9e96e246..f71abe35d6abd43680cff2dc1b496876a83ee486`
Scope: correction round 1 only; no broad checks were rerun.

### Verdicts

#### I1: ADDRESSED

`provisionReportKnowledge()` now encloses manifest loading, configuration, database construction, and both ingestion calls in one catch boundary. A throwing loader or rejected VI/EN ingestion is logged without the original exception and converted to `REPORT_KNOWLEDGE_PROVISION_FAILED`; result-shaped ingestion failures remain blocked before queue polling.

Evidence:
- `apps/worker/src/reports/provision-report-knowledge.ts:21-67`
- `apps/worker/src/reports/provision-report-knowledge.test.ts:69-126`

#### I2: ADDRESSED

The nullable `rewrite_consumed_at` reservation field and atomic `WHERE rewrite_consumed_at IS NULL` update provide a durable, per-report-version rewrite claim. V2 consumes it before revision. A previously consumed budget terminates non-retryably without a writer call, and all revision-stage timeout/provider/critic failures after consumption are returned as non-retryable failures.

Evidence:
- `packages/database/drizzle/0015_report_rewrite_budget.sql:1`
- `packages/backend/src/reports/report-version.repository.ts:295-322`
- `packages/backend/src/reports/report-generation.service.ts:270-356`
- `tests/jobs/report-generation.integration.test.ts` correction test: concurrent consumption yields exactly one winner.

#### I3: NOT_ADDRESSED

The correction separates known V1 and V2 behavior for the normal matching pairs, but it does not enforce an exact supported prompt/knowledge pair before retrieval or a provider call.

Evidence:
- `packages/backend/src/reports/report-generation.service.ts:175-180` rejects an unknown `promptVersion` only; `knowledgeVersionId` is not allow-listed.
- `packages/backend/src/reports/report-generation.repository.ts:162-170` treats either a V1 prompt or a V1 knowledge ID as V1 (`||`), allowing mismatched pairs to combine V1 retrieval behavior with a V2 corpus, or V2 writer/critic behavior with a V1 corpus.
- `packages/backend/src/reports/identity-report-writer.ts:75-80` dispatches only on prompt version.
- `packages/backend/src/reports/report-critic.ts:30-55` has no unknown-version rejection and will call the provider for an unknown direct critic invocation.
- `packages/backend/src/reports/report-validator.ts:79-80` maps an unknown prompt to the V2 outline rather than rejecting it.

Impact: a job with a supported prompt and an unknown knowledge version can pass source input validation, retrieve an approved corpus of that unknown version if present, and then call the AI provider. Mismatched V1/V2 pairs also lack a single version family, so writer, critic, validator, and retrieval are not reliably coupled to the same reservation contract.

Required correction: introduce one exact-pair resolver that accepts only `(ziwei.identity.prompt.v1, ziwei.identity.knowledge.v1)` and `(ziwei.identity.prompt.v2, ziwei.identity.knowledge.v2)`. Invoke it before source retrieval in generation and use its resolved family in writer, critic, validator, and retrieval. Add tests for both mismatched pairs and unknown knowledge versions proving zero provider calls.

### New Critical or Important Findings

None outside the unresolved I3 version-coupling defect.

### Scoped Verdict

**SPEC COMPLIANCE: FAIL**

**CODE QUALITY: CHANGES_REQUIRED**

## Terra High Scoped Re-Review: Correction Round 2 (I3)

Date: 2026-09-07
Review range: `f71abe35d6abd43680cff2dc1b496876a83ee486..984e15b742d8af66450996aea7fa4430a0f8eef2`
Scope: I3 exact prompt/knowledge version-pair enforcement only.

### I3: ADDRESSED

`resolveIdentityReportVersionFamily()` admits only the exact supported pairs `(ziwei.identity.prompt.v1, ziwei.identity.knowledge.v1)` and `(ziwei.identity.prompt.v2, ziwei.identity.knowledge.v2)`; mismatched, unknown, and non-string values resolve to `null`.

Generation rejects a null family as non-retryable `AI_OUTPUT_INVALID` before `loadSource`; retrieval independently rejects it as `REPORT_EVIDENCE_INVALID` before database or RAG access. Writer and critic reject it as non-retryable `AI_OUTPUT_INVALID` before their providers; validator rejects it as `REPORT_EVIDENCE_INVALID`. The resolved family, rather than either individual version alone, selects V1 versus V2 retrieval, writer, critic, and validator behavior.

Evidence:
- `packages/backend/src/reports/identity-report-version-family.ts:10-35`
- `packages/backend/src/reports/report-generation.service.ts:174-182`
- `packages/backend/src/reports/report-generation.repository.ts:87-93,176-192`
- `packages/backend/src/reports/identity-report-writer.ts:76-90`
- `packages/backend/src/reports/report-critic.ts:30-45`
- `packages/backend/src/reports/report-validator.ts:83-89`
- Focused tests prove mismatched V1/V2 and unknown versions make zero source/retrieval/provider calls: `report-generation.service.test.ts:203-247`, `report-generation.repository.test.ts:12-47`, `identity-report-writer.test.ts:25-64`, `report-critic.test.ts:402-421`.

Focused verification: `pnpm vitest run` for the six I3 resolver/generation/retrieval/writer/critic/validator suites passed: 6 files, 83 tests.

### New Critical or Important Findings

None.

### Scoped Verdict

**SPEC COMPLIANCE: PASS**

**CODE QUALITY: APPROVED**
