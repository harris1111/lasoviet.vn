# Sol Quality Evaluation Report: Comprehensive Zi Wei V3 Reports

- **Document:** `plans/reports/sol-2026-09-07-ziwei-v3-output-quality.md`
- **Execution Date:** 2026-09-08
- **Phase:** Phase 04 Zi Wei Quality Hardening (Task 8B Diagnostics)
- **Worktree:** `/home/debian/projects/lasoviet.vn-ziwei-v3`
- **Branch:** `handoff/ziwei-report-quality-20260907`
- **Baseline HEAD:** `2b4ec1193c59dc28ec5a4235265362878703de60`

## 1. Executive Summary

This report records the private output-quality evaluation and diagnostic preparation for Vietnamese comprehensive Zi Wei V3 reports following Task 8B diagnostic hardening.

- **Local Preparation:** Successfully verified using deterministic calculation, fact extraction, live chart greedy selection from a runtime-generated candidate grid, production manifest validation (`validateKnowledgeManifest`), and faithful in-memory V3 corpus retrieval honoring Task 5 query limits and priority ordering. Five qualifying synthetic charts were selected and prepared across all 19 report knowledge packs (95 total packs, 190 total passages) with zero network calls, zero committed private birth data, and zero private report artifacts in the repository.
- **First Provider Call Outcome:** The first authorized provider call for `SAMPLE-01` returned `AI_OUTPUT_INVALID` after approximately 87 seconds. The sampler stopped safely; zero report files were written, and 4 of the 5 authorized provider calls remain.
- **Diagnostic Capability Added:** Implemented single-sample execution (`--sample-id SAMPLE-01` through `SAMPLE-05`) and private raw HTTP response capture (`<sampleId>-response.raw`) in mode `0600` inside the validated external output directory with collision protection. On provider failure, only synthetic sample ID, normalized error code, call counts, HTTP status, and captured response byte count are reported.
- **Provider Execution Gate:** BLOCKED. Output quality acceptance is strictly withheld pending successful provider generation, diagnostic triage, and human review of all 5 outputs.

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
| External Network Calls (prepare-only) | 0 | 0 | PASS |
| Committed Private Report Artifacts | 0 | 0 | PASS |

## 3. Provider Execution Guard & Security Invariants

The sampler script (`scripts/generate-ziwei-quality-samples.mjs`) enforces hardened boundary rules:

1. **Mutually Exclusive CLI Flags & Single-Sample Targeting:**
   - `--prepare-only` and `--execute-provider` are mutually exclusive and abort immediately if both are supplied.
   - `--sample-id` is valid only with `--execute-provider` and accepts only `SAMPLE-01` through `SAMPLE-05`. Unknown, missing, or duplicate values fail closed before environment checking or network access.

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
   - Enforces mode `0600` on private files and fails closed if private output files already exist, preventing silent overwriting. Throws a path-free, synthetic-sample-safe message (`BLOCKED: Private output file already exists and cannot be overwritten (<sampleId>)`) that never leaks private output paths or filenames in errors or logs.

4. **Raw HTTP Response Diagnostic Capture:**
   - The counting `fetchImpl` intercepts and clones the exact HTTP response body for every provider request (both successful and non-success).
   - Writes the body to `${sampleBaseName}-response.raw` with mode `0600` inside `--output-dir`.
   - On provider failure, logs only synthetic sample ID, error code, provider calls, HTTP requests, HTTP status, and captured response byte count. Never logs response body text, report prose, prompts, knowledge passages, credentials, or private paths.

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

- **Conflicting CLI Flags Guard:**
  ```bash
  node scripts/generate-ziwei-quality-samples.mjs --prepare-only --sample-id SAMPLE-01
  node scripts/generate-ziwei-quality-samples.mjs --execute-provider --sample-id SAMPLE-99
  node scripts/generate-ziwei-quality-samples.mjs --prepare-only --execute-provider
  ```
  *Result:* PASS (all invalid combinations failed with descriptive `BLOCKED` messages before environment checking or network calls).

- **Security Probes (Ancestor-Symlink Rejection, Directory Mode Repair & Path-Free Collision):**
  *Result:* PASS (existing directory mode 755 repaired to 700; ancestor symlink into repository correctly rejected; collision fail-close verified to throw path-free, synthetic-sample-safe error messages with mode 0600 enforcement; temporary artifacts removed).

- **Focused Unit & Integration Tests (3 test files, 20 passed):**
  ```bash
  corepack pnpm@11.25.0 vitest run packages/backend/src/reports/comprehensive-report-writer.test.ts packages/backend/src/reports/comprehensive-report-validator.test.ts packages/backend/src/reports/comprehensive-report-html.test.ts
  ```
  *Result:* PASS (20/20 tests passed).

- **Git Diff Check:**
  ```bash
  git diff --check
  ```
  *Result:* PASS (clean, no whitespace issues).

## 6. Unresolved / Blocked Gate

- **First Provider Call Status:** Failed with `AI_OUTPUT_INVALID` on `SAMPLE-01`. The sampler stopped safely; zero report files were written; 4 authorized calls remain.
- **Provider Output Review Gate:** BLOCKED pending single-sample diagnostic investigation using `--sample-id SAMPLE-01` and private response capture in an authorized execution environment. Output quality acceptance is not claimed.
