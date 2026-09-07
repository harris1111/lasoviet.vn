# Flash Report: Zi Wei Report Content Quality Hardening (Task 2)

Date: 2026-09-07
Branch: fix/ziwei-result-and-report-clarity
Task: Task 2 - Phase 04 report content quality hardening
Commit: 5a1d9fc

## 1. Changed Files

### Created
- `content/knowledge/vi/ziwei/identity-report-foundation.v2.json`: Approved first-party Vietnamese V2 manifest covering all 11 canonical report sections with verified SHA-256 hashes.
- `content/knowledge/en/ziwei/identity-report-foundation.v2.json`: Approved first-party English V2 manifest covering all 11 canonical report sections with verified SHA-256 hashes.
- `apps/worker/src/reports/provision-report-knowledge.ts`: DI-friendly provisioning helper reading both V2 manifests and executing idempotent knowledge ingestion before worker report job processing.
- `apps/worker/src/reports/provision-report-knowledge.test.ts`: Unit tests verifying successful manifest ingestion, error failure code mapping, and non-logging of manifest content on errors.
- `packages/backend/src/reports/identity-report-config.ts`: Central report version constants (`ziwei.identity.knowledge.v2`, `ziwei.identity.prompt.v2`, `ziwei.identity.report.v1`, template/render versions), 11 canonical localized section titles in VI/EN, and deterministic cycles narrative.
- `packages/backend/src/reports/identity-report-config.test.ts`: Unit tests verifying version constants, title dictionaries, deterministic narratives, and full schema/hash validation of both V2 manifests.
- `packages/backend/src/reports/identity-report-prompt-context.ts`: Localized prompt facts builder, section retrieval query generator (bounded <= 500 chars), and re-exported bounded knowledge helper.
- `packages/backend/src/reports/identity-report-prompt-context.test.ts`: Unit tests verifying privacy boundaries, section retrieval queries, and bounded knowledge metadata preservation.
- `packages/backend/src/reports/report-generation.service.test.ts`: Integration unit tests for generation service verifying single rewrite attempt on non-safety critic failure, no rewrite on safety failure, and rejection when second attempt fails.

### Modified
- `apps/worker/Dockerfile`: Added runtime copy of `/app/content` to `./content`.
- `apps/worker/src/main.ts`: Awaited `provisionReportKnowledge()` before initializing report generation queue runner.
- `apps/worker/src/worker.module.ts`: Exported `provisionReportKnowledge`.
- `packages/backend/src/commerce/commerce.repository.ts`: Switched report reservation creation to consume `CURRENT_REPORT_KNOWLEDGE_VERSION`, `CURRENT_REPORT_PROMPT_VERSION`, and `CURRENT_REPORT_CONFIG_VERSION`.
- `packages/backend/src/index.ts`: Re-exported report configuration constants and prompt context helpers.
- `packages/backend/src/reports/identity-report-outline.ts`: Removed `cycles_and_timing` from evidence-required claim lists.
- `packages/backend/src/reports/identity-report-writer.ts`: Implemented prompt V2 with claim progression sequence, style bans, max output tokens 6000, optional revision input, canonical title overwrite during trusted assembly, and deterministic cycles narrative.
- `packages/backend/src/reports/identity-report-writer.test.ts`: Tested canonical title overwriting, revision input propagation, deterministic cycles narrative, and max output tokens.
- `packages/backend/src/reports/report-critic.ts`: Enforced all 8 dimensions >= 4 gating; correctness/safety < 4 returns `REPORT_SAFETY_REJECTED`; other dimension < 4 returns `AI_OUTPUT_INVALID` with bounded notes.
- `packages/backend/src/reports/report-critic.test.ts`: Tested all-dimension critic gating and notes exposure.
- `packages/backend/src/reports/report-generation.repository.ts`: Integrated `buildSectionRetrievalQuery` combining localized section purpose and localized frozen facts.
- `packages/backend/src/reports/report-generation.service.ts`: Implemented one rewrite maximum on initial `AI_OUTPUT_INVALID` quality rejection with critic notes passed to writer revision input.
- `packages/backend/src/reports/report-source.ts`: Updated `boundedKnowledge` to preserve `reportSections` and `sourceAttribution`, bounded to 11 passages, 900 chars each, 9600 total chars, with deterministic natural numeric sorting.

## 2. RED Evidence

Failing tests observed prior to implementation:
1. `packages/backend/src/reports/identity-report-config.test.ts`:
   - Command: `pnpm vitest run packages/backend/src/reports/identity-report-config.test.ts`
   - Failure: `Error: Cannot find module './identity-report-config.js'`
2. `apps/worker/src/reports/provision-report-knowledge.test.ts`:
   - Command: `pnpm vitest run apps/worker/src/reports/provision-report-knowledge.test.ts`
   - Failure: `Error: Cannot find module './provision-report-knowledge.js'`
3. `packages/backend/src/reports/identity-report-prompt-context.test.ts`:
   - Command: `pnpm vitest run packages/backend/src/reports/identity-report-prompt-context.test.ts`
   - Failure: `Error: Cannot find module './identity-report-prompt-context.js'`
4. `packages/backend/src/reports/report-critic.test.ts`:
   - Command: `pnpm vitest run packages/backend/src/reports/report-critic.test.ts`
   - Failure: 8 failed tests (`REPORT_EVIDENCE_INVALID` due to `cycles_and_timing` claim requirement in outline, and lack of all-score >= 4 gating).
5. `packages/backend/src/reports/identity-report-writer.test.ts`:
   - Command: `pnpm vitest run packages/backend/src/reports/identity-report-writer.test.ts`
   - Failure: `Error: Cannot find module './identity-report-config.js'`
6. `packages/backend/src/reports/report-generation.service.test.ts`:
   - Command: `pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts`
   - Failure: 3 failed tests (`expected false to be true` on single rewrite cycle).

## 3. GREEN Commands and Results

- Focused unit test suite:
  - Command: `pnpm vitest run packages/backend/src/reports/ packages/contracts/ packages/backend/src/commerce/ apps/worker/`
  - Result: 25 test files passed, 200 tests passed (0 failed).
- Web unit tests:
  - Command: `pnpm vitest run apps/web/src/features/ziwei/ apps/web/src/features/reports/`
  - Result: 6 test files passed, 24 tests passed (0 failed).
- Package builds:
  - `pnpm --filter @lasoviet/contracts run build`: Clean exit (0 errors).
  - `pnpm --filter @lasoviet/database run build`: Clean exit (0 errors).
  - `pnpm --filter @lasoviet/backend run build`: Clean exit (0 errors).
  - `pnpm --filter @lasoviet/worker run build`: Clean exit (0 errors).
- Workspace typecheck:
  - Command: `pnpm run typecheck`
  - Result: Clean exit across all 9 workspace projects (0 errors).
- i18n parity check:
  - Command: `pnpm run i18n:check`
  - Result: `i18n parity passed` (0 missing keys).
- Web production build:
  - Command: `pnpm --filter @lasoviet/web run build`
  - Result: Next.js 16.3.4 (Turbopack) production build completed, 25 static/dynamic routes compiled successfully.
- Git diff whitespace & format check:
  - Command: `git diff --check`
  - Result: Clean (0 warnings or errors).

## 4. Knowledge, Privacy, and Versioning Notes

- Knowledge Manifests (V2):
  - Created first-party approved VI and EN manifests with date 2026-09-07, approver `phase04-content-review`, approval status `approved`, permittedUse `first_party`.
  - Repository-relative source paths point to manifest files themselves, ensuring worker runtime availability.
  - All chunk and document hashes computed with SHA-256 (`utf8`, hex, lowercase).
  - Content covers all 11 canonical sections with strictly current evidence vocabulary (Life Palace, Body Palace, Earthly Branches, Four Transformations, reflective interpretation limits, practical observation).
- Privacy Preservation:
  - `buildLocalizedPromptFacts` and `buildSectionRetrievalQuery` strictly extract only frozen chart evidence symbols (palace IDs, branch IDs, star transformations).
  - Completely excludes all personal birth profile fields (birth date, time, calendar kind, coordinates, gender, email, user ID, actor ID).
  - Retrieval queries bounded to <= 500 characters, well within 512 character context limit.
- Model Context & Bounded Knowledge:
  - Preserves `id`, `content`, `reportSections`, and `sourceAttribution`.
  - Context strictly bounded to maximum 11 passages, maximum 900 characters per passage, maximum 9600 characters total across all passages.
  - Natural numeric sorting guarantees 100% deterministic passage ordering across runs.
- Writer Prompt V2 & Trusted Assembly:
  - System prompt requires short natural sentences and strict claim sequence: concrete evidence -> possible daily manifestation -> self-check/action.
  - Bans unexplained jargon, Barnum filler, academic abstraction, deterministic claims, and repeated disclaimers.
  - Model max output tokens increased to 6000.
  - Trusted assembly unconditionally overwrites section titles with canonical localized titles in VI and EN.
  - `cycles_and_timing` narrative is deterministically populated and claims forced to empty array `[]`.
- Critic Gating & Single Rewrite Loop:
  - Critic strictly enforces all 8 dimensions score >= 4.
  - Correctness or safety < 4 returns terminal `REPORT_SAFETY_REJECTED`.
  - Any other dimension < 4 returns `AI_OUTPUT_INVALID` with maximum 8 bounded notes.
  - `report-generation.service` permits exactly one rewrite on initial `AI_OUTPUT_INVALID`. Re-runs validation and critic; persists only if second attempt passes. Persists neither draft on failure.
- Worker Startup & Container Packaging:
  - Worker awaits `provisionReportKnowledge()` before polling report queue jobs.
  - Ingestion failure throws stable `REPORT_KNOWLEDGE_PROVISION_FAILED` without logging sensitive manifest content.
  - Worker Dockerfile copies repository `/app/content` into `./content`.
- Commerce Reservations:
  - Reservations now populate `knowledgeVersionId: "ziwei.identity.knowledge.v2"`, `promptVersion: "ziwei.identity.prompt.v2"`, and `reportConfigVersion: "ziwei.identity.report.v1"` via imported constants.

## 5. Unresolved Questions / Remaining Concerns
None. Task 2 implementation, TDD test suites, and verification checks are complete.
