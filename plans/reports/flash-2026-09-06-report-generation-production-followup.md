# Flash Report: Report Generation Production Followup

Date: 2026-09-06
Branch: fix/report-generation-production-followup
Base: 606bdb9846d25d6003ccbe42ea3ab8d58460ad4b

## Objective
Harden production report generation across three bounded domains with Test-Driven Development:
1. AI adapter output robustness against Markdown wrapping and trailing prose with retry and correction prompting.
2. Report writer structural contract enforcement in system instructions to guarantee canonical schema-valid section and claim structures.
3. Outbox durability on repeated terminal failures across recovery jobs, preventing event collision and transaction rollback.

## Root Cause Analysis
1. **Adapter Output Fragility**:
   - The provider endpoint can return HTTP 200 with model output in non-JSON Markdown or append trailing explanatory prose.
   - The adapter lacked retry handling for successful HTTP calls with invalid output payloads, immediately failing with non-retryable `AI_OUTPUT_INVALID`.
   - Full-string `JSON.parse` rejected otherwise valid JSON followed by trailing prose.
   - Prompts lacked concise generic instructions forbidding Markdown wrappers/prose and correction feedback on invalid retry attempts.
2. **Report Writer Contract Gap**:
   - Generic prompting allowed model deviations in section ordering, claim key structures, evidence linkage, and missing claims in required sections (e.g., `cycles_and_timing`).
   - The writer required exact structural rules in its system instruction specifying top-level keys, 11 canonical section IDs in sequence, exact claim skeleton keys, single evidence linkage, bound code copying, confidence capping, limitation counts, action constraints, and 7 mandatory claim sections.
   - **Review Finding (Terra Critical)**: Keyword-only instruction allowed models to emit prose descriptions of keys rather than concrete JSON container syntax. An explicit literal JSON claim skeleton showing exact container types (`[]`, `{}`) and key names was required in the system instruction, backed by strict substring assertions in tests.
3. **Repeated Terminal Failure Collision**:
   - `recordTerminalFailure` generated outbox IDs using `evt-failed-${reportVersionId}` and idempotency key `report-failed:${reportVersionId}:${stage}`.
   - If a report failed terminally, was subsequently recovered, and then the recovery job experienced a terminal failure, `enqueueOutbox` collided with the old failure event unique constraint, throwing `OutboxError` / `OUTBOX_DUPLICATE_KEY`.
   - The resulting transaction rollback prevented the recovery job and reservation from transitioning to terminal failure, leaving the job leased for repeated execution.
   - **CI Follow-up Finding**: Full suite execution revealed a legacy test assertion in `tests/jobs/report-worker-state.integration.test.ts` expecting the old `report-failed:${reportVersionId}:generation` format. The test required updating to assert the SHA-256 derived idempotency key and event ID.

## Implementation & Durability Fixes
1. **Adapter Robustness (`openai-compatible-adapter.ts`)**:
   - Added `extractFirstJsonObject` with a balanced scanner tracking string literals and escape sequences, rejecting leading prose or code fences while safely extracting the first complete JSON object when trailing prose exists.
   - Configured `generateStructured` to append a concise generic instruction (`Return strictly one JSON object only, with no Markdown, code fences, wrappers, or trailing prose.`) to the system prompt on all requests.
   - When HTTP succeeds but output is invalid, if retries remain (`attempt < options.retryCount`), `generateStructured` retries with a concise correction note (`Correction: The previous response was invalid. Return strictly one JSON object only with no Markdown or prose.`).
   - Preserved existing status (408/429/5xx) and network/timeout retry behaviors without adding correction notes on transport errors.
2. **Writer Output Contract (`identity-report-writer.ts`)**:
   - Extended the system instruction with exact structural rules without changing Zod schemas:
     - Top-level keys: `sections`, `reflectionQuestions`, `summaryActions`.
     - Exactly 11 canonical section IDs in exact canonical sequence.
     - Section keys: `id`, `title`, `narrative`, `claims`.
     - Claim skeleton keys with explicit literal JSON container example:
       `{"id":"claim-1","text":"...","evidenceIds":["ziwei.identity.example"],"interpretationBoundCode":"reflective_identity_only","confidence":"moderate","limitations":["..."],"suggestedActions":[{"category":"reflect","text":"..."}]}`
     - Each claim links exactly one supplied evidence item in evidenceIds, copies an allowed `interpretationBoundCode`, confidence does not exceed evidence confidence, action category is allowed for that evidence item.
     - `limitations` has 1-3 strings; `suggestedActions` has 0-2 objects with `category`, `text`.
     - 7 sections required to have at least one claim: `personal_summary`, `primary_evidence`, `strengths_and_resources`, `tensions_and_blind_spots`, `identity_analysis`, `cycles_and_timing`, `within_control`.
     - Explicit prohibition against translated, renamed, or invented keys, IDs, codes, or categories.
     - Maintained Vietnamese/English language directives.
3. **Repeated Terminal Failure Durability (`report.service.ts`)**:
   - Updated `recordTerminalFailure` to derive deterministic SHA-256 tokens from `${reportVersionId}::${jobId}::${failureStage}`.
   - Event identity formats:
     - `eventId: evt-failed-${failureToken}`
     - `traceId: trace-failed-${failureToken}`
     - `idempotencyKey: report-failed:${failureToken}`
   - Bounded (64-char SHA-256 hex) and deterministic per job attempt and stage, preventing collisions between distinct recovery jobs and legacy/earlier failure events while preserving full queue and attempt history.

## TDD Verification Evidence

### RED Evidence
1. **Adapter Robustness Unit Tests**:
   - Command: `pnpm vitest run packages/backend/src/ai/openai-compatible-adapter.test.ts`
   - Result: 3 tests failed:
     - `retries invalid non-JSON output and succeeds when next attempt returns schema-valid JSON`: Expected retry on invalid Markdown HTTP 200 output, received immediate `AI_OUTPUT_INVALID`.
     - `extracts and validates the first complete JSON object when trailing prose is present`: Trailing prose failed whole-string `JSON.parse`.
     - `does not add correction note on retryable HTTP status retry`: Expected generic instruction on initial system prompt.
2. **Writer Structural Contract Test**:
   - Command: `pnpm vitest run packages/backend/src/reports/identity-report-writer.test.ts`
   - Initial Run: `instructs provider with exact structural constraints for top-level, sections, and claim skeleton` failed because system prompt lacked detailed skeleton and section constraints.
   - Review Fix Strengthening: Test strengthened to assert literal container substrings (`"evidenceIds":[`, `"limitations":[`, `"suggestedActions":[{"category":`); failed as expected before prompt enhancement.
3. **Worker State Integration Test Assertion (CI Failure)**:
   - Command: `pnpm vitest run tests/jobs/report-worker-state.integration.test.ts -t "marks terminal failure and emits report.fulfillment.failed.v1 upon third failed attempt"`
   - Result: Failed with `AssertionError` expecting legacy `report-failed:${reportVersionId}:generation` while receiving the new SHA-256 derived `report-failed:${hash}`.
4. **PostgreSQL Integration Test (Repeated Terminal Failure)**:
   - Command: `pnpm vitest run tests/jobs/report-generation.integration.test.ts -t "recovers terminal failure caused by missing knowledge"`
   - Result: Failed with `OutboxError: OUTBOX_DUPLICATE_KEY: event or idempotency key already exists` at `enqueueOutbox` during `recordTerminalFailure` on recovery job due to collision with old failure outbox event.

### GREEN Evidence
1. **Writer Unit Test (Review Fix)**:
   - Command: `pnpm vitest run packages/backend/src/reports/identity-report-writer.test.ts`
   - Result: `Test Files 1 passed (1) | Tests 3 passed (3) | Duration 311ms`
   - Verified: All 8 structural rules and exact literal JSON container syntax (`"evidenceIds":[`, `"limitations":[`, `"suggestedActions":[{"category":`) verified.
2. **Adapter & Writer Unit Tests**:
   - Command: `pnpm vitest run packages/backend/src/ai/openai-compatible-adapter.test.ts packages/backend/src/reports/identity-report-writer.test.ts`
   - Result: `Test Files 2 passed (2) | Tests 12 passed (12) | Duration 390ms`
3. **Worker State Integration Test (CI Follow-up)**:
   - Command: `pnpm vitest run tests/jobs/report-worker-state.integration.test.ts -t "marks terminal failure and emits report.fulfillment.failed.v1 upon third failed attempt"`
   - Result: `Test Files 1 passed (1) | Tests 1 passed | 5 skipped (6) | Duration 4.41s`
   - Verified: Verified SHA-256 deterministic idempotency key `report-failed:${hash}` and event ID `evt-failed-${hash}`.
4. **PostgreSQL Integration Test (Repeated Terminal Failure)**:
   - Command: `pnpm vitest run tests/jobs/report-generation.integration.test.ts -t "recovers terminal failure caused by missing knowledge"`
   - Result: `Test Files 1 passed (1) | Tests 1 passed | 25 skipped (26) | Duration 4.54s`
   - Verified: Initial terminal failure, successful recovery dispatch, recovery job leased and generating, second terminal failure transition succeeds with distinct event ID and idempotency key, both failure events preserved in outbox, reservation updated with new error code and incremented stateVersion.
5. **Backend Build**:
   - Command: `pnpm --filter @lasoviet/backend run build`
   - Result: Clean exit code 0.
6. **Backend Typecheck**:
   - Command: `pnpm --filter @lasoviet/backend run typecheck`
   - Result: Clean exit code 0.
7. **Whitespace and Formatting**:
   - Command: `git diff --check`
   - Result: Clean exit code 0.

## Files Changed
- `packages/backend/src/ai/openai-compatible-adapter.ts`: Balanced JSON object scanner, generic system instruction, invalid-output retry with correction prompt.
- `packages/backend/src/ai/openai-compatible-adapter.test.ts`: Unit tests for non-JSON retry, trailing prose extraction, leading prose rejection, and retry correction isolation.
- `packages/backend/src/reports/identity-report-writer.ts`: Structural constraint expansion in writer system instructions including literal JSON claim skeleton example.
- `packages/backend/src/reports/identity-report-writer.test.ts`: Unit test asserting structural constraints and literal JSON container substrings in writer system prompt.
- `packages/backend/src/reports/report.service.ts`: SHA-256 derived deterministic eventId, traceId, and idempotencyKey for terminal failure outbox records.
- `tests/jobs/report-generation.integration.test.ts`: Extended integration test covering repeated terminal failure across recovery jobs and distinct outbox event generation.
- `tests/jobs/report-worker-state.integration.test.ts`: Updated terminal failure assertion to verify SHA-256 derived idempotency key and event ID.
- `plans/reports/flash-2026-09-06-report-generation-production-followup.md`: Verification report.

## Unresolved Questions
None.

## Status Contract
**Status:** DONE
**Summary:** Resolved AI output fragility with balanced JSON scanning and invalid-output retry, enforced comprehensive report writer structural contracts with literal JSON claim container syntax in system instructions, and eliminated repeated terminal failure outbox collisions via job-scoped SHA-256 tokens.
**Concerns/Blockers:** None
