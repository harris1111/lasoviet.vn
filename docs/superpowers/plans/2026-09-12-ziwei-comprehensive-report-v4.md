# Zi Wei Comprehensive Report V4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Zi Wei Comprehensive Natal Report V4 for the VND 79,000 offer (`ZIWEI-IDENTITY-P0`), including full natal interpretation, current 10-year decadal cycle, immutable current annual snapshot, three-frame birth-time sensitivity analysis, and 3-5 structured personalized actions.

**Founder Authority:** Approved on 2026-09-12 by the founder. Recorded as FD-058 in `rules-and-decisions-tracker.md`. Supersedes the 2026-09-07 quality design exclusion of decadal and annual forecasting for this SKU. Cancels the separate annual SKU `ZIWEI-YEAR-P0`.

**Architecture & Version Fencing:**
- Public content discriminator: New version `ziwei-comprehensive.v2`.
- Legacy reports: V1, V2, and V3 reports remain immutable and readable via version-branched readers.
- Tier-1 offer: The VND 19,000 natal excerpt (`ZIWEI-NATAL-EXCERPT-P0`) remains strictly natal-only and does not receive timing or sensitivity sections.
- Timing snapshot freezing: Reservation creation freezes `asOfDate` (calendar date in `Asia/Ho_Chi_Minh`) and `targetYear` into `report_reservations` (`reportReservations`) and job payloads. Worker retries crossing January 1 must produce identical deterministic annual output.
- Deterministic timing engine: The timing calculator cannot derive timing from the normalized natal chart alone. It consumes the immutable normalized birth-profile revision plus frozen `asOfDate`, recreates the exact `iztro` astrolabe using approved exact version `iztro 2.6.0` (`horoscope()`, `decadalList()`, `dayDivide: current`), and emits only normalized timing output with explicit engine configuration and provenance recorded.
- Three-frame birth-time sensitivity: Evaluates selected birth-time branch plus immediately preceding and succeeding branches (3 frames total). Comparison partitions stable factors (invariant, high confidence) from sensitive factors (variant, precision-dependency noted). Uses chronological 13-frame semantics: early Zi (`00:xx`, index 0), standard branches Sửu through Hợi (indexes 1..11), and late Zi (`23:xx`, index 12). Early Zi previous frame is late Zi on previous civil date; late Zi next frame is early Zi on next civil date. No modulo-12 formulas are used.
- Privacy & PII minimization: Raw birth date, birth time, and birth location must never enter AI provider prompts or payloads; only normalized chart facts, diffs, and evidence keys are transmitted.
- Structured personalized actions: Exactly 3 to 5 actions inside the root field `practicalDirection`. Each action contains 4 fixed fields: `recommendation`, `rationale`, `avoid`, and `evidenceKeys`. No goal picker, no 7-day or 30-day tracking mechanics.
- Dormancy and release gate: Current active generation, default fulfillment versions, and public routes are not switched to V4. V4 contracts, schemas, jobs, and readers remain dormant until the Knowledge Base V4 editorial rewrite, quarantine audit, and founder release gates are fully passed.
- Editorial gate: Knowledge Base V4 editorial rewrite is a release blocker. Editorial work begins only after founder supplies the editorial ruleset (preferred schools, allowed Sino-Vietnamese terminology, quarantine list).
- Deployment gate: Production deployment and public activation are excluded from this plan and require separate explicit authorization.

---

## Milestones

### Milestone 1: Decision Reconciliation and Planning Governance

Reconcile repository planning records and product configuration with the 2026-09-12 founder decisions:
1. Add FD-058 in `rules-and-decisions-tracker.md` and annotate OD-001 with historical supersession.
2. Add dated founder override to `docs/superpowers/specs/2026-09-07-ziwei-comprehensive-report-quality-design.md`, moving decadal and current annual snapshot to included scope while keeping monthly/daily/hourly excluded.
3. Remove `ZIWEI-YEAR-P0` from Phase 07 Task 1 in `phase-07-remaining-ziwei-and-wave-1-5.md`.
4. Update `open-decisions.md` OD-001 to cover only relationship and career offers.
5. Remove annual period provenance requirements from P07-T01 in `task-contracts-and-test-vectors.md`.
6. Remove `ZIWEI-YEAR-P0` object from `config/product-catalog.json` and validate JSON structure.
7. Update `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md` WP-05 test assertions to reflect V4 timing scope while forbidding monthly/daily/hourly or recurring refresh promises.

### Milestone 2: Immutable V4 Contracts and Version Fencing

Introduce typed, immutable schemas for timing, birth-time sensitivity, structured actions, and the V4 comprehensive report payload without mutating legacy contracts:
- Schema file `packages/contracts/src/ziwei-report-snapshot-v1.ts`:
  - `ZiweiTimingDecadalLayerV1Schema`: strict discriminated union by `state`:
    - `active`: index, age range, year range, palace stem/branch, mutagens/transformations, key stars, cycle state ID with exact 10-year span checks.
    - `not_started`: pre-decadal childhood state when `targetYear` precedes the earliest first-cycle year, with `firstCycleStartAge` (positive integer) and `firstCycleStartYear` (integer). Strictly forbids active-cycle palace/stem/branch/stars fields.
  - `ZiweiTimingAnnualLayerV1Schema`: target year, palace stem/branch, name, annual mutagens/transformations, key stars, cycle state ID, isOriginalPalace.
  - `ZiweiTimingSnapshotV1Schema`: `decadal`, `annual`, `provenance`.
  - `ZiweiTimeFrameSchema`: position (`previous | selected | next`), vendorTimeIndex (0..12), civilDateOffset (-1 | 0 | 1), frameId.
  - `ZiweiSensitivitySnapshotV1Schema`: selectedFrame, previousFrame, nextFrame, stableFactKeys, sensitiveFacts.
  - `ZiweiReportSnapshotV1Schema`: combines timing, sensitivity, and provenance.
- Schema file `packages/contracts/src/ziwei-comprehensive-report-v2.ts`:
  - Schema with discriminator `ziwei-comprehensive.v2`.
  - Preserves core natal sections (`overview`, `coreAxis`, `keyConfigurations`, `palaceReadings`, `thematicSynthesis`, `strengthsAndTensions`).
  - Adds `birthTimeSensitivity`, `currentDecadal` (strict discriminated union by `state`: `active` with full decadal cycle metadata or `not_started` with first cycle start parameters), and `annualSnapshot`.
  - Action items schema `ZiweiComprehensiveReportActionItemV2Schema` contained in root field `practicalDirection` bounded to 3–5 items, each with `recommendation`, `rationale`, `avoid`, and `evidenceKeys`.
- Re-export new contracts from `packages/contracts/src/index.ts` and verify contract tests in `packages/contracts/src/ziwei-report-snapshot-v1.test.ts` and `packages/contracts/src/ziwei-comprehensive-report-v2.test.ts`.
- Verify legacy reader compatibility: Existing reports with discriminator `ziwei-comprehensive.v1` continue to validate against `ZiweiComprehensiveReportContentV1Schema`.

### Milestone 3: Reservation-Frozen Timing Lineage

Ensure timing context is immutable and deterministic across job lifecycle and calendar boundaries:
- Extend `report_reservations` (`reportReservations`) schema in `packages/database/src/schema/reports.ts`:
  - Capture `as_of_date` (`YYYY-MM-DD` in `Asia/Ho_Chi_Minh`) and `target_year` (`YYYY` integer) at report reservation creation.
  - Add typed columns to `report_reservations` with additive migration.
- Add V2 event and job contracts in `packages/contracts/src/jobs.ts`:
  - Create `ReportGenerationRequestedV2Schema` / `ReportGenerationRequestedV2` carrying `asOfDate` and `targetYear` alongside existing linkage fields.
  - Create `ReportGenerateJobEnvelopeV2Schema` (`schemaVersion: 2`, `name: "report.generate.v2"`) wrapping `ReportGenerationRequestedV2Schema`.
  - Do not mutate `ReportGenerationRequestedV1Schema` or `ReportGenerateJobEnvelopeV1Schema`.
- Worker and retry determinism:
  - Worker reads `asOfDate` and `targetYear` from reservation/job payload.
  - If a job is created on December 31 and processed/retried on January 1, `asOfDate` and `targetYear` must remain fixed to the reservation date.
- Write a focused Vitest unit test asserting that worker execution with an injected clock different from `asOfDate` uses `asOfDate` for annual snapshot calculation.

### Milestone 4: Deterministic `iztro 2.6.0` Timing Normalization

Implement normalized timing extraction from the exact approved engine dependency:
- Location: `packages/engine-adapters/src/ziwei/iztro-timing.ts`.
- Deterministic calculation boundary:
  - The timing calculator cannot derive decadal and annual cycles from the normalized natal chart alone. Timing layers require original birth parameters and engine calendar math.
  - It consumes the immutable normalized birth-profile revision plus frozen `asOfDate` and `targetYear`.
  - Recreates the exact `iztro` astrolabe via `createAstrolabe()` with pinned configuration (`horoscopeDivide: normal`, `dayDivide: current`).
- Functions:
  - `calculateZiweiTimingSnapshot(profileRevision, asOfDate, targetYear)`:
    - Invokes `astrolabe.decadalList()` to locate the current 10-year decadal cycle matching age on `asOfDate`.
    - If `targetYear` matches a decadal list range, emits `state: "active"`.
    - If `targetYear` is before the earliest first-cycle year (pre-decadal childhood evaluation), emits `state: "not_started"` with `firstCycleStartAge` and `firstCycleStartYear` derived from the earliest decadal cycle, continuing annual calculation and sensitivity normally without fabricating active decadal fields.
    - If `targetYear` is after all supported decadal cycles, returns fail-closed `ENGINE_INPUT_INVALID`.
    - Invokes `astrolabe.horoscope(asOfDate, timeIndex)` or `astrolabe.yearlyList()` to extract the annual palace and mutagens for `targetYear`.
    - Normalizes palace names, stem/branch, mutagens (Lộc, Quyền, Khoa, Kỵ), and stars into typed contracts.
    - Preserves `isOriginalPalace` and `cycleStateId`.
    - Records engine version `iztro@2.6.0`, horoscopeDivide `normal`, and calculation timestamps.
- Fixture tests:
  - Verify timing normalization against 5 known charts across different age decennials and calendar years.
  - Verify boundary case: chart at the transition year between two 10-year decadal cycles.
  - Verify pre-decadal childhood evaluation (e.g. infant evaluated before first cycle start) emitting `not_started` with no fabricated active fields, and post-decadal range fail-closed rejection.

### Milestone 5: Three-Frame Birth-Time Sensitivity Normalization

Implement deterministic comparison across three neighboring birth-hour frames:
- Location: `packages/engine-adapters/src/ziwei/iztro-sensitivity.ts`.
- Chronological 13-frame semantics (vendor `iztro` mapping):
  - Vendor `iztro` represents 13 time frames:
    - Early Zi (`00:00-00:59`): `vendorTimeIndex = 0`
    - Standard branches Sửu through Hợi (`01:00-22:59`): `vendorTimeIndex = 1..11`
    - Late Zi (`23:00-23:59`): `vendorTimeIndex = 12`
  - Chronological neighboring frame transitions:
    - For middle frames `T` in 1..10: previous frame is `T - 1` (`civilDateOffset = 0`); next frame is `T + 1` (`civilDateOffset = 0`).
    - For Hợi (`vendorTimeIndex = 11`): previous frame is Tuất (`vendorTimeIndex = 10`, `civilDateOffset = 0`); next frame is late Zi (`vendorTimeIndex = 12`, `civilDateOffset = 0`).
    - For late Zi (`vendorTimeIndex = 12`): previous frame is Hợi (`vendorTimeIndex = 11`, `civilDateOffset = 0`); next frame is early Zi (`vendorTimeIndex = 0`, `civilDateOffset = 1` on next civil day).
    - For early Zi (`vendorTimeIndex = 0`): previous frame is late Zi (`vendorTimeIndex = 12`, `civilDateOffset = -1` on previous civil date); next frame is Sửu (`vendorTimeIndex = 1`, `civilDateOffset = 0`).
    - No modulo-12 formulas are used; chronological 13-frame progression is strictly enforced.
- Difference engine:
  - Recreates astrolabes for all 3 frames from normalized profile revision with adjusted time index and civil date offsets.
  - Computes normalized facts for all 3 charts.
  - Identifies invariant facts across all 3 frames -> `stableFactKeys` (Mệnh/Thân palace location, specific major star placements, unchanged patterns).
  - Identifies frame-dependent facts -> `sensitiveFactVariants` (palace shifts, star migrations, mutagen shifts).
  - Outputs structured `ZiweiSensitivitySnapshotV1`.
- Strict PII check:
  - Unit test scanning sensitivity output payload asserts zero occurrences of raw birth date, birth time, or location strings.

### Milestone 6: Comprehensive Facts, Evidence, and Retrieval

Extend report facts and retrieval packs to support V4 generation:
- Extend `ComprehensiveZiweiFacts`:
  - Add `timing: ZiweiTimingSnapshotV1`.
  - Add `sensitivity: ZiweiSensitivitySnapshotV1`.
  - Preserve palace-level `cycleStateId` and `isOriginalPalace`.
- Evidence contract:
  - Define dedicated V4 evidence schema rather than overloading legacy `ziwei.identity.v1`.
  - Evidence keys include timing keys (`decadal.*`, `annual.*`) and sensitivity keys (`sensitivity.stable.*`, `sensitivity.sensitive.*`).
- Retrieval packs:
  - Add retrieval packs for:
    - Decadal cycle interpretation pack.
    - Annual snapshot interpretation pack.
    - Birth-time sensitivity guidance pack.
    - Structured action synthesis pack.

### Milestone 7: Blocked Knowledge Base V4 Editorial Milestone

**RELEASE BLOCKER:** Gated on founder providing the editorial ruleset.
- Required inputs from founder before starting:
  1. Preferred Zi Wei schools (e.g., Nam Phái, Bắc Phái, Trung Châu).
  2. Allowed Sino-Vietnamese terminology (proper star names, palace names, pattern names).
  3. Quarantine list (fatalistic, catastrophic, medical, or absolute pronouncements to exclude).
- Implementation scope (when unblocked):
  - Build corpus `content/knowledge/vi/ziwei/comprehensive-report.v4.json`.
  - Rewrite chunks into natural conversational Vietnamese.
  - Quarantine prohibited extreme claims.
  - Tag chunks by school and timing dimension.
  - Update knowledge retrieval service to prioritize editorial Vietnamese chunks.

### Milestone 8: Generation, Validation, HTML/PDF, and Web Reader

Integrate end-to-end report generation and customer presentation:
- Prompt engineering:
  - System prompt enforcing V4 output schema `ziwei-comprehensive.v2`.
  - Instructions for 3–5 personalized actions with exactly 4 fields each inside `practicalDirection`.
  - Explicit instructions to present stable factors with high confidence and sensitive factors with precision notes.
  - Vietnamese conversational tone with restricted Sino-Vietnamese vocabulary.
  - PII boundary check: payload to AI provider contains only normalized facts, sensitivity diffs, and retrieval chunks.
- Output validator:
  - Validates `ZiweiComprehensiveReportContentV2Schema`.
  - Validates that every evidence key referenced in actions exists in the facts evidence set.
  - Validates no Han characters appear in customer-facing text.
  - Validates `practicalDirection` action count is between 3 and 5, each with non-empty recommendation, rationale, avoid, and evidenceKeys.
- Presentation and Web Reader:
  - `report-reader.tsx` branches by content discriminator:
    - `ziwei-comprehensive.v1` renders legacy reader components.
    - `ziwei-comprehensive.v2` renders V4 reader with:
      - Birth-time sensitivity panel (stable vs time-sensitive factors).
      - Current 10-year decadal cycle card.
      - Current annual snapshot card with explicit year badge.
      - 3–5 structured action cards in `practicalDirection` (What to do, Why it fits, What to avoid).
  - Print/PDF styling updated for new V4 sections.
  - Tier-1 reader continues to gate and omit timing/sensitivity sections.
  - Keep V4 flow dormant; do not switch default product generation or fulfillment from V3 until release approval.

### Milestone 9: Focused QA, Frozen-Clock Tests, and Terra High Milestone Review

Verify end-to-end correctness before milestone review:
- Vitest test suite:
  - `tests/reports/ziwei-v4-timing.test.ts`: timing normalization, frozen clock, retry stability across year boundaries.
  - `tests/reports/ziwei-v4-sensitivity.test.ts`: three-frame diff, early/late Zi, date rollover, PII exclusion.
  - `tests/reports/ziwei-v4-validator.test.ts`: V2 schema validation, action count, evidence key integrity.
  - `tests/reports/ziwei-v4-legacy-compatibility.test.ts`: V1/V2/V3 historical reports render without regressions.
- Playwright E2E test:
  - Complete free-flow through report generation (using mock/sample provider) displaying V4 timing and action cards.
- Representative quality audit:
  - Generate 10 sample reports across diverse ages, decennial boundaries, and birth-time sensitivity levels.
- Terra High milestone review:
  - Submit completed milestone report to Sol and Terra high for independent review.
  - Production deployment remains separately gated.

---

## Detailed Step-by-Step Task Breakdown

### Foundation Milestone Status (2026-09-12)

The decision reconciliation, contract/version-fencing, reservation timing
lineage, deterministic timing normalization, and three-frame sensitivity
foundation work is complete. Terra's independent high-reasoning review
approved this milestone on 2026-09-12 with no remaining must-fix findings.

Verified focused checks include 157/157 tests for the final review scope,
33/33 correction and commerce integration tests, dependency-ordered package
builds/typechecks, valid product catalog JSON, and `git diff --check`.

The following remain intentionally deferred and are not release approval:
immutable report-scoped source snapshot persistence, worker snapshot
calculation/reuse, V4 facts/evidence/retrieval integration, the gated
Knowledge Base V4 editorial rewrite, V4 writer/validator/reader activation,
public activation, and deployment.

### Task 1: Decision Reconciliation
- [x] Update `rules-and-decisions-tracker.md` with FD-058 and OD-001 historical note.
- [x] Update `docs/superpowers/specs/2026-09-07-ziwei-comprehensive-report-quality-design.md` with founder override section.
- [x] Update `phase-07-remaining-ziwei-and-wave-1-5.md` to remove `ZIWEI-YEAR-P0`.
- [x] Update `open-decisions.md` to scope OD-001 to relationship and career.
- [x] Update `task-contracts-and-test-vectors.md` to remove annual period provenance from P07-T01.
- [x] Remove `ZIWEI-YEAR-P0` from `config/product-catalog.json` and verify valid JSON.
- [x] Update `docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md` WP-05 test assertions.

### Task 2: Contracts & Version Fencing
- [x] Implement and verify `packages/contracts/src/ziwei-report-snapshot-v1.ts` (timing, sensitivity, and report snapshot schemas).
- [x] Implement and verify `packages/contracts/src/ziwei-comprehensive-report-v2.ts` (V2 content schema with `practicalDirection` action items).
- [x] Re-export new contracts from `packages/contracts/src/index.ts`.
- [x] Run contract unit tests in `packages/contracts/src/ziwei-report-snapshot-v1.test.ts` and `packages/contracts/src/ziwei-comprehensive-report-v2.test.ts`.

### Task 3: Reservation Timing Lineage
- [x] Add `as_of_date` and `target_year` columns to `report_reservations` (`reportReservations`) in `packages/database/src/schema/reports.ts`.
- [x] Generate and verify database migration.
- [x] Create `ReportGenerationRequestedV2Schema` and `ReportGenerateJobEnvelopeV2Schema` in `packages/contracts/src/jobs.ts`.
- [x] Pass frozen `asOfDate` and `targetYear` in `commerce.repository.ts` and recovery paths for V2 reservations.
- [x] Add tests verifying that recovery and worker retries preserve frozen `asOfDate`.

### Task 4: Deterministic Timing Normalization
- [x] Implement deterministic timing normalization in `packages/engine-adapters/src/ziwei/iztro-report-snapshot.ts`.
- [x] Normalize decadal cycle list and current decadal matching.
- [x] Normalize annual horoscope palace, mutagens, and stars.
- [x] Add engine configuration and provenance metadata.
- [x] Add focused engine adapter tests for timing normalization and boundaries.

### Task 5: Three-Frame Birth-Time Sensitivity
- [x] Implement three-frame sensitivity normalization in `packages/engine-adapters/src/ziwei/iztro-report-snapshot.ts`.
- [x] Implement neighboring branch resolver with early/late Zi and date-shift handling.
- [x] Implement normalized fact difference engine.
- [x] Partition into stable fact keys and sensitive fact variants.
- [x] Add focused tests for frame adjacency and date rollover.
- [x] Add PII leakage regression test.

### Task 6: Facts, Evidence & Retrieval Packs
- [ ] Extend `ComprehensiveZiweiFacts` in `packages/backend/src/reports/comprehensive-ziwei-facts.ts`.
- [ ] Create V4 evidence rules in `packages/backend/src/evidence/ziwei-v4-evidence.ts`.
- [ ] Add timing and sensitivity packs in `packages/backend/src/reports/comprehensive-report-retrieval.ts`.
- [ ] Add unit tests for retrieval pack composition.

### Task 7: Knowledge Base V4 Editorial (Gated)
- [ ] Obtain founder editorial ruleset (preferred schools, allowed terms, quarantine criteria).
- [ ] Build `content/knowledge/vi/ziwei/comprehensive-report.v4.json`.
- [ ] Filter and rewrite chunks to conversational Vietnamese.
- [ ] Verify zero quarantined phrases remain in corpus.
- [ ] Update `knowledge-retrieval.service.ts` for V4 knowledge versioning.

### Task 8: Writer, Validator & Reader
- [ ] Implement V4 prompt template in `packages/backend/src/reports/comprehensive-report-writer.ts`.
- [ ] Implement V4 output validator in `packages/backend/src/reports/comprehensive-report-validator.ts`.
- [ ] Validate 3–5 actions and 4 fixed fields per action within root field `practicalDirection`.
- [ ] Update `report-reader.tsx` to branch on `ziwei-comprehensive.v2`.
- [ ] Implement V4 reader UI components: sensitivity panel, decadal card, annual snapshot card, structured `practicalDirection` cards.
- [ ] Verify Tier-1 reader continues to omit timing/sensitivity.
- [ ] Keep V4 flow dormant; do not switch default product generation or fulfillment from V3 until release approval.

### Task 9: QA, Testing & Milestone Review
- [ ] Run complete Vitest suite across contracts, engine adapters, backend, and web.
- [ ] Run Playwright E2E tests for guest and authenticated report reading.
- [ ] Generate and inspect 10 sample reports for diverse timing and sensitivity configurations.
- [ ] Prepare milestone report for Terra high independent review.

---

## Acceptance Criteria

1. **Product Scope:** The VND 79,000 Zi Wei comprehensive report includes full natal interpretation, current 10-year decadal cycle (or `not_started` pre-decadal state for infants), current annual snapshot with explicit year badge, and three-frame birth-time sensitivity.
2. **Single SKU:** No separate annual SKU exists in `config/product-catalog.json`, contracts, or Phase 07 planning.
3. **Immutable Annual Snapshot:** The annual section is permanently tied to the report creation year (`asOfDate` frozen in `Asia/Ho_Chi_Minh`). Worker retries or re-reads in subsequent calendar years do not shift the annual reading.
4. **No Dependency Loop:** No auto-updates, recurring yearly renewal mechanics, or decadal expiry warnings. Pre-decadal evaluation for infants cleanly represents `not_started` without fabricating an active cycle or triggering expiry alerts.
5. **Three-Frame Sensitivity:** Clearly separates invariant facts (high confidence) from time-sensitive facts (with precision caveats). Covers early/late Zi and civil-date rollover deterministically.
6. **Strict Privacy:** Zero raw birth date, time, or location values are transmitted to AI providers.
7. **Structured Actions:** Report ends with 3 to 5 personalized actions inside root field `practicalDirection`. Each action has exactly `recommendation`, `rationale`, `avoid`, and valid `evidenceKeys`.
8. **Legacy Compatibility:** Historical reports (V1, V2, V3) and Tier-1 natal excerpt reports remain fully viewable and unaffected.
9. **Editorial Prerequisite:** Knowledge Base V4 editorial rewrite is completed and verified against founder ruleset prior to public release.
10. **Dormant Until Release Gates:** Current active generation, default fulfillment versions, and public routes are not switched to V4; V4 remains dormant until Knowledge Base V4 editorial rewrite, quarantine audit, and founder release authorization are granted. Production deployment requires separate explicit authorization.
