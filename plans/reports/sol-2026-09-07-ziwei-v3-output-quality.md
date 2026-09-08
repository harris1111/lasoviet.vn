# Sol Quality Evaluation Report: Comprehensive Zi Wei V3 Reports

- **Document:** `plans/reports/sol-2026-09-07-ziwei-v3-output-quality.md`
- **Execution Date:** 2026-09-08
- **Phase:** Phase 04 Zi Wei Quality Hardening (Task 8A Correction Pass 1)
- **Worktree:** `/home/debian/projects/lasoviet.vn-ziwei-v3`
- **Branch:** `handoff/ziwei-report-quality-20260907`
- **Baseline HEAD:** `6648d288e2803d68e4615dd85efb1500a80df22c`

## 1. Executive Summary

This report records the safe, provider-independent preparation of the private output-quality evaluation for Vietnamese comprehensive Zi Wei V3 reports following Task 8A remediation.

- **Local Preparation:** Completed using deterministic calculation, fact extraction, live chart greedy selection from a runtime-generated candidate grid, production manifest validation (`validateKnowledgeManifest`), and faithful in-memory V3 corpus retrieval honoring Task 5 query limits and priority ordering. Five qualifying synthetic charts were selected and prepared across all 19 report knowledge packs (95 total packs, 190 total passages) with zero network calls, zero committed private birth data, and zero private report artifacts in the repository.
- **Provider Execution Gate:** BLOCKED as required because runtime `AI_*` provider credentials are not present in this worktree environment. In accordance with repository policy, no credentials were fabricated, committed, or requested. Output quality acceptance is strictly withheld pending actual provider generation and human scoring.

## 2. Sample Preparation & Coverage Metrics

The candidate pool is generated at runtime via numeric loops without any hardcoded dates or times in the source. Selection deterministically verified all plan coverage criteria without leaking birth data, report prose, full prompts, or private paths:

| Metric | Target | Result | Status |
|---|:---:|:---:|:---:|
| Candidate Pool Evaluated | Runtime Grid | 40 candidates evaluated | PASS |
| Samples Selected | Exactly 5 | 5 | PASS |
| Sample Identifiers | Synthetic only | `SAMPLE-01`, `SAMPLE-02`, `SAMPLE-03`, `SAMPLE-04`, `SAMPLE-05` | PASS |
| Distinct Life Palace Placements | >= 5 | 5/5 | PASS |
| Distinct Body Palace Placements | >= 5 | 5/5 | PASS |
| Favorable Brightness Values | Present | Exalted, prosperous, favorable | PASS |
| Difficult Brightness Values | Present | Weak, unfavorable | PASS |
| Four Transformations Coverage | 4/4 | 4/4 (Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ) | PASS |
| Supported Named Patterns Covered | >= 2 | 3 (`ji-yue-tong-liang`, `san-qi-jia-hui`, `sha-po-lang`) | PASS |
| Sparse Principal-Star Palaces | Present | 60 empty palaces across samples | PASS |
| Total Knowledge Packs Prepared | 95 (19 per sample) | 95 | PASS |
| Total Passages Prepared (Task 5 bounded) | Bounded | 190 (max 2 passages/pack) | PASS |
| External Network Calls | 0 | 0 | PASS |
| Committed Private Report Artifacts | 0 | 0 | PASS |

## 3. Provider Execution Guard & Security Invariants

The sampler script (`scripts/generate-ziwei-quality-samples.mjs`) enforces hardened boundary rules:

1. **Mutually Exclusive CLI Flags:**
   `--prepare-only` and `--execute-provider` are mutually exclusive and immediately abort execution if both are passed, before checking environment variables or touching adapter code.

2. **Eight Environment Invariants:**
   Provider mode strictly requires:
   - `AI_BASE_URL`
   - `AI_API_KEY`
   - `AI_MODEL`
   - `AI_TIMEOUT`
   - `AI_MAX_RETRIES`
   - `AI_FEATURE_JSON_SCHEMA=true`
   - `AI_FEATURE_TOOL_CALLING`
   - `AI_PRODUCTION_ENABLED=true`
   Missing any variable aborts execution immediately before any adapter instantiation or HTTP request.

3. **External Output Boundary & Symlink Defense:**
   `--output-dir` is required for provider execution and must be an absolute path strictly outside the repository root.
   - Nearest existing ancestor resolution prevents symlink-based redirection into the repository prior to directory creation.
   - Post-creation `realpath` revalidation prevents escape.
   - Enforces mode `0700` on both newly created and pre-existing target directories.
   - Enforces mode `0600` on private files and fails closed if private output files already exist, preventing silent overwriting.

4. **Faithful Local Corpus Retrieval (Task 5 Semantics):**
   - Validates the committed corpus using production `validateKnowledgeManifest(rawJson, { repositoryRoot: REPO_ROOT })`.
   - Implements Task 5 priority ordering: pattern (+100), palace (+40), star (+30), transformation (+20), brightness (+10), relation (+8), topic (+4); then `metadata.priority` descending; then lexical overlap rank descending; then stable `passageId` ascending.
   - Enforces content-hash then passage-ID deduplication and query bounds (`query.maxPassages` and `query.maxTotalChars`), continuing past non-fitting candidates.

5. **Strict Single-Call Accounting & Metric Isolation:**
   - Every provider sample strictly asserts `generateStructuredCalls === 1` and `sampleHttpRequests === 1` before file writing or metrics recording.
   - Computes explicit `duplicateParagraphCount`, `prohibitedPhraseCount`, and `rawTechnicalIdentifierCount` from deterministic validation findings.

## 4. Human Review Worksheet Format

For execution when credentials are provided, the script outputs a private worksheet with 1-5 scoring for:

1. **Chart-fact correctness:** Are star placements, palace positions, and transformations faithfully represented?
2. **Vietnamese naturalness:** Is the prose fluid, idiomatic, and professionally composed?
3. **Specificity:** Does the reading provide concrete, nuanced observations tailored to the chart?
4. **Cross-palace synthesis:** Are interactions between palaces, triads, and opposing palaces integrated?
5. **Low repetition:** Does the report avoid formulaic loops and redundant advice across sections?
6. **Useful priorities:** Are practical actions realistic, actionable, and grounded?
7. **Absence of mechanical language:** Are AI meta-disclosures, disclaimers, and technical IDs completely absent?

## 5. Verification Evidence

The full verification suite was executed against the clean repository state:

- **Quality Sampler Local Preparation:**
  ```bash
  node scripts/generate-ziwei-quality-samples.mjs --prepare-only
  ```
  *Result:* PASS (5 samples selected, 95 knowledge packs prepared, 190 total passages, 0 network calls, 0 private artifacts).

- **Conflicting Flags Guard:**
  ```bash
  node scripts/generate-ziwei-quality-samples.mjs --prepare-only --execute-provider
  ```
  *Result:* PASS (aborted with `BLOCKED: Conflicting arguments: --prepare-only and --execute-provider are mutually exclusive.`).

- **Security Probes (Ancestor-Symlink Rejection & Directory Mode Repair):**
  *Result:* PASS (existing directory mode 755 repaired to 700; ancestor symlink into repository correctly rejected; temporary artifacts removed).

- **Task 1-7 Regression & Integration Suite (11 test files, 103 passed):**
  ```bash
  corepack pnpm@11.25.0 vitest run packages/backend/src/birth-profile/birth-profile.service.test.ts packages/backend/src/ziwei/ziwei-query.service.test.ts packages/engine-adapters/src/ziwei/iztro-adapter.test.ts packages/backend/src/reports/comprehensive-ziwei-facts.test.ts packages/backend/src/reports/comprehensive-report-retrieval.test.ts packages/backend/src/reports/comprehensive-report-writer.test.ts packages/backend/src/reports/comprehensive-report-validator.test.ts packages/backend/src/reports/comprehensive-report-html.test.ts packages/backend/src/reports/report-generation.service.test.ts packages/backend/src/reports/report-query.service.test.ts "apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx"
  ```
  *Result:* PASS (103/103 tests passed).

- **i18n Parity Check:**
  ```bash
  corepack pnpm@11.25.0 run i18n:check
  ```
  *Result:* PASS (`i18n parity passed`).

- **Workspace-Wide Typecheck:**
  ```bash
  corepack pnpm@11.25.0 run typecheck
  ```
  *Result:* PASS (0 errors across contracts, observability, config, database, engine-adapters, backend, web, api, worker).

- **Web Production Build:**
  ```bash
  corepack pnpm@11.25.0 --filter @lasoviet/web run build
  ```
  *Result:* PASS (Turbopack production build succeeded in 8.4s).

- **Git Diff Check:**
  ```bash
  git diff --check
  ```
  *Result:* PASS (clean, no whitespace issues).

## 6. Unresolved / Blocked Gate

- **Provider Output Review Gate:** BLOCKED pending provision of external provider credentials (`AI_*`) in an authorized execution environment. The local preparation infrastructure, calculation pipelines, local corpus retriever, pack builder, and validator are verified and operational.
