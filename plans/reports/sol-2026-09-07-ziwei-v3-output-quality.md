# Sol Quality Evaluation Report: Comprehensive Zi Wei V3 Reports

- **Document:** `plans/reports/sol-2026-09-07-ziwei-v3-output-quality.md`
- **Execution Date:** 2026-09-08
- **Phase:** Phase 04 Zi Wei Quality Hardening (Task 8A)
- **Worktree:** `/home/debian/projects/lasoviet.vn-ziwei-v3`
- **Branch:** `handoff/ziwei-report-quality-20260907`
- **Baseline HEAD:** `9830c1d37db5462d19065007d6d7d644766ce589`

## 1. Executive Summary

This report records the safe, provider-independent preparation of the private output-quality evaluation for Vietnamese comprehensive Zi Wei V3 reports.

- **Local Preparation:** Successfully completed using deterministic calculation, fact extraction, greedy coverage selection, and in-memory V3 corpus retrieval. Five diverse synthetic charts were selected and prepared across all 19 report knowledge packs (95 total packs, 764 passages) with zero network calls and zero committed private data.
- **Provider Execution Gate:** BLOCKED as expected in this sandboxed worktree because runtime `AI_*` provider credentials are not present. In accordance with repository policy, no credentials were fabricated, committed, or requested. Output quality acceptance is strictly withheld pending actual provider generation and human scoring.

## 2. Sample Preparation & Coverage Metrics

The candidate pool and selection algorithm deterministically verified all plan coverage criteria without leaking birth data, report prose, full prompts, or private paths:

| Metric | Target | Result | Status |
|---|:---:|:---:|:---:|
| Candidate Pool Evaluated | >= 5 | 10 | PASS |
| Samples Selected | Exactly 5 | 5 | PASS |
| Sample Identifiers | Synthetic only | `SAMPLE-01`, `SAMPLE-02`, `SAMPLE-03`, `SAMPLE-04`, `SAMPLE-05` | PASS |
| Distinct Life Palace Placements | >= 5 | 5/5 | PASS |
| Distinct Body Palace Placements | >= 5 | 5/5 | PASS |
| Favorable Brightness Values | Present | Exalted, prosperous, favorable | PASS |
| Difficult Brightness Values | Present | Weak, unfavorable | PASS |
| Four Transformations Coverage | 4/4 | 4/4 (Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ) | PASS |
| Supported Named Patterns Covered | >= 2 | 3 (`ji-yue-tong-liang`, `sha-po-lang`, `san-qi-jia-hui`) | PASS |
| Sparse Principal-Star Palaces | Present | 60 empty palaces across samples | PASS |
| Total Knowledge Packs Prepared | 95 (19 per sample) | 95 | PASS |
| Total Passages Prepared | Bounded | 764 | PASS |
| External Network Calls | 0 | 0 | PASS |
| Committed Private Report Artifacts | 0 | 0 | PASS |

## 3. Provider Execution Guard & Security Invariants

The sampler script (`scripts/generate-ziwei-quality-samples.mjs`) enforces strict boundaries:

1. **Eight Environment Invariants:**
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

2. **Explicit CLI Gate:**
   Normal generation requires both the complete environment and the `--execute-provider` flag.

3. **External Output Boundary:**
   `--output-dir` is required for provider execution and must be an absolute path strictly outside the repository root. Relative paths, in-repo paths, and symlink traversals are rejected. Private files are written with `0o600` permissions and never tracked by Git.

4. **Zero-Retry Request Accounting:**
   When provider execution runs, the adapter enforces `retryCount: 0` and tracks both `provider.generateStructured` calls and underlying `fetch` HTTP requests (exactly 1 of each per sample).

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
  *Result:* PASS (5 samples selected, 95 knowledge packs prepared, 0 network calls, 0 private artifacts).

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
  *Result:* PASS (Turbopack production build succeeded in 8.2s).

- **Git Diff Check:**
  ```bash
  git diff --check
  ```
  *Result:* PASS (clean, no whitespace issues).

## 6. Unresolved / Blocked Gate

- **Provider Output Review Gate:** BLOCKED pending provision of external provider credentials (`AI_*`) in an authorized execution environment. The local preparation infrastructure, calculation pipelines, local corpus retriever, pack builder, and validator are verified and operational.
