# LSV-36 Birth-Time Sensitivity V4.1 Implementation Plan

Date: 2026-09-16

## Status And Authority

This is a bounded planning artifact only. The 2026-09-16 founder decision is
recorded as a dated clarification under FD-058: `birthTimeSensitivity` is a
separate V4.1 slice and an activation gate for LSV-15 sectioned paid
generation.

No implementation may begin until An explicitly approves this technical plan
and its execution scope. This plan grants no authorization to merge, deploy,
enable paid fulfillment, create a database migration, or change production
configuration.

## Verified Baseline

- Baseline audited: `origin/product/experience-spec-v1` at `854fc7c`.
- `ZiweiSensitivitySnapshotV1` already persists deterministic selected,
  previous, and next frames, stable fact keys, sensitive variants, provenance,
  and source-snapshot hash lineage.
- `ComprehensiveZiweiFactsV4` already receives the deterministic sensitivity
  snapshot and the V4 evidence set. The engine/source-snapshot foundation is
  therefore not reimplemented by LSV-36.
- `ZiweiComprehensiveReportContentV2Schema`, the V4 writer, section registry,
  assembler, validator, critic, public projection, HTML renderer, and tests
  intentionally reject or omit `birthTimeSensitivity`.
- LSV-15 sectioned generation exists behind
  `ziwei.comprehensive.report.v4.1-sectioned`, but current paid generation
  remains on V4 and stored V4 content uses `ziwei-comprehensive.v2`.
- The existing V4 reader and HTML/PDF pipeline must continue to render all
  historical stored reports unchanged while V4.1 is inactive.

## Architectural Decision

Use an additive report-content and configuration fence:

- Introduce the exact dormant V4.1 tuple:
  - knowledge: `ziwei.comprehensive.knowledge.v4`;
  - prompt: `ziwei.comprehensive.prompt.v4.1-sensitivity`;
  - report config: `ziwei.comprehensive.report.v4.1-sectioned-sensitivity`;
  - quality config: `ziwei.comprehensive.quality.v2-sensitivity`;
  - content discriminator: `ziwei-comprehensive.v3`;
  - HTML template: `ziwei-comprehensive-html.v2`;
  - PDF render version: `identity-report-pdf.v2`, reserved until the separately
    approved PDF consumer can prove support for that immutable render version.
- Add a strict `ziwei-comprehensive.v3` schema rather than adding an optional field to
  `ZiweiComprehensiveReportContentV2Schema`.
- Resolve the tuple only as the exact combination above. Mixed prompt,
  report-config, quality, knowledge, content, template, or render versions fail
  closed. Stored content is resolved by immutable version lineage, not by a
  mutable current default.
- Leave all V2 contracts, V4 report versions, section checkpoints, public
  projections, readers, and rendered HTML byte-compatible for historical
  reports.
- Add exactly one V4.1 section/checkpoint, `birthTimeSensitivity`, to the
  canonical section registry. The completed V4.1 checkpoint set must include
  it exactly once; a V4 set remains exactly the current 23 keys.
- Reuse the stored `ZiweiSensitivitySnapshotV1` and its evidence items. The
  AI provider receives only normalized stable/sensitive comparison facts,
  allowed evidence keys, and approved knowledge passages. It never receives
  raw birth date, time, place, profile revision, or raw source snapshot.
- Do not add a database migration by default. Existing immutable
  `structuredContent`, report-version lineage, source snapshot, evidence, and
  checkpoint persistence appear sufficient. Add a migration only after an
  approved implementation audit proves a required V4.1 value cannot be
  represented or recovered from those existing persisted records.

## Scope

### Slice 1: Additive Contract And Version Fence

**Owned files**

- `packages/contracts/src/ziwei-comprehensive-report-v4-1.ts` (new)
- `packages/contracts/src/ziwei-comprehensive-report-v4-1.test.ts` (new)
- `packages/contracts/src/commerce.ts`
- `packages/contracts/src/commerce.test.ts`
- `packages/contracts/src/identity-report-v1.ts`
- `packages/contracts/src/identity-report-v1.test.ts`
- `packages/contracts/src/index.ts`
- `packages/backend/src/reports/identity-report-config.ts`
- `packages/backend/src/reports/identity-report-config.test.ts`
- `packages/backend/src/reports/identity-report-version-family.ts`
- `packages/backend/src/reports/identity-report-version-family.test.ts`

**Implementation**

1. Define a strict V4.1 content schema that copies the required V2 sections
   and adds a required `birthTimeSensitivity` object.
2. Keep the customer-facing object bounded to a title plus exactly two
   evidence-backed narratives: `stableFactors` and `sensitiveFactors`.
   The latter explains time precision dependency without raw dates, times,
   frame indexes, or provider/engine implementation details.
3. Add the exact immutable tuple named in the architectural decision and a
   dormant resolver that accepts only that complete tuple. Do not alter
   `currentReportVersions()` or the active paid resolver in this slice.
4. Add `birthTimeSensitivity` to the section-ID contract and define an
   additive V4.1 Tier-2 entitlement scope. Keep the existing V4 scope constant
   unchanged so historical entitlements do not gain or lose sections.
5. Extend report-ready view unions and public type guards so V2 and V4.1 are
   parsed and rendered by their immutable content discriminator.

**Acceptance criteria**

- V2 rejects `birthTimeSensitivity` as it does now.
- V4.1 requires it and rejects unknown top-level fields.
- V4.1 Tier-2 scope requires `birthTimeSensitivity`; V4 Tier-2 scope remains
  byte-for-byte unchanged.
- Historical V1, V2/V4, and V3 stored content remains valid through its
  existing parser and reader path.
- No active resolver selects V4.1.

### Slice 2: Facts, Evidence, And Sectioned Generation

**Owned files**

- `config/ziwei-comprehensive-report-quality.v2-sensitivity.json` (new)
- `packages/config/src/ziwei-report-quality.ts`
- `packages/config/src/ziwei-report-quality.test.ts`
- `packages/config/src/index.ts`
- `packages/backend/src/evidence/ziwei-v4-evidence.ts`
- `packages/backend/src/evidence/ziwei-v4-evidence.test.ts`
- `packages/backend/src/reports/comprehensive-ziwei-facts-v4.ts`
- `packages/backend/src/reports/comprehensive-ziwei-facts-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-section-v4.ts`
- `packages/backend/src/reports/comprehensive-report-section-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts`
- `packages/backend/src/reports/comprehensive-report-section-writer-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-section-digest-v4.ts`
- `packages/backend/src/reports/comprehensive-report-section-digest-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-quality-v4.ts`
- `packages/backend/src/reports/comprehensive-report-quality-v4.test.ts`
- `packages/backend/src/reports/report-section-checkpoint.repository.ts`
- `packages/backend/src/reports/report-section-checkpoint.repository.test.ts`
- `packages/backend/src/reports/report-generation.service.ts`
- `packages/backend/src/reports/report-generation.service.test.ts`
- `packages/backend/src/reports/identity-report-config.ts`
- `apps/worker/src/processors/report-generate.processor.ts`
- `apps/worker/src/processors/report-generate.processor.test.ts`

**Implementation**

1. Audit the existing V4 evidence builder and name the current stable and
   sensitive evidence keys consumed by the V4.1 section. If the existing
   evidence schema already persists an exact, normalized mapping for both
   dimensions, reuse it. Additive evidence keys are allowed only when needed
   for exact frame/evidence integrity; do not rebuild snapshots or infer
   evidence from prose.
2. Make the V4.1 writer payload contain only the sensitivity comparison subset,
   its allowed evidence keys, bounded relevant knowledge passages, and optional
   reading context under the existing context rules.
3. Add `birthTimeSensitivity` to the V4.1 section registry, accepted-section
   parser, scoped writer schema, section digest, quality/checkpoint lifecycle,
   and generation retry/rewrite flow. Preserve the current 23-section registry
   for V4.0 content/configuration.
4. Add the immutable
   `config/ziwei-comprehensive-report-quality.v2-sensitivity.json` file with a
   required `birthTimeSensitivity` section threshold. Extend the config loader
   and schema to accept only the two exact pairs:
   `report.v4.1-sectioned` + `quality.v1`, or
   `report.v4.1-sectioned-sensitivity` + `quality.v2-sensitivity`.
   Unknown, cross-mapped, incomplete, or injected alternate pairs fail closed.
5. Preserve source-snapshot lineage through checkpoint resumes and rewrites:
   the selected/previous/next frames, sensitivity rule version, and snapshot
   hash must remain those frozen for the report reservation.
6. Make the worker recognize the exact V4.1 report-config literal as sectioned,
   apply the approved sectioned wall-clock and lease-heartbeat policy, and
   fail closed for an incomplete or mixed tuple. The existing
   `ziwei.comprehensive.report.v4.1-sectioned` path remains unchanged.

**Acceptance criteria**

- A V4.1 run has exactly the canonical existing sections plus one sensitivity
  checkpoint; duplicate, missing, or V4/V4.1 mixed checkpoint sets fail
  closed.
- The section may cite only evidence belonging to the frozen sensitivity
  snapshot and permitted evidence set.
- Provider request serialization contains no raw birth date, local time, place,
  chart/profile identifiers, or unbounded source snapshot.
- Existing V4 sectioned generation has the same 23-key behavior and output.
- Quality config tests prove the V4 config cannot consume the V4.1 sensitivity
  thresholds and the V4.1 config cannot resolve without its exact quality
  version and required sensitivity section.
- Worker replay, retry, lease renewal, and wall-clock behavior is covered for
  the exact V4.1 config without duplicating the existing provider-error matrix.

### Slice 3: Assembly, Validation, Critic, And Public Projection

**Owned files**

- `packages/backend/src/reports/comprehensive-report-assembler-v4.ts`
- `packages/backend/src/reports/comprehensive-report-assembler-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-validator-v4.ts`
- `packages/backend/src/reports/comprehensive-report-validator-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`
- `packages/contracts/src/identity-report-v1.ts`
- `packages/contracts/src/identity-report-v1.test.ts`
- `packages/contracts/src/commerce.ts`
- `packages/contracts/src/commerce.test.ts`
- `packages/backend/src/reports/report-query.service.ts`
- `packages/backend/src/reports/report-query.service.test.ts`

**Implementation**

1. Add V4.1-specific assembly that maps the named sensitivity checkpoint to
   the required V4.1 field and validates it against the frozen facts before
   returning immutable structured content.
2. Extend validation to require non-empty, allowed evidence keys for both
   stable and sensitive narratives; enforce customer-safe prose and keep the
   existing fatalistic, technical-identifier, locale, and AI-disclosure
   protections.
3. Give the critic normalized sensitivity facts and allowed evidence only; it
   must assess the new section for evidence coverage, precision framing, and
   no raw PII. A critic finding targets the one sensitivity checkpoint.
4. Add a separate V4.1 public projection and entitlement mapping. Resolve
   stored content and scope from the exact immutable config/content tuple,
   never merely from family `v4`. The Tier-1 natal excerpt still omits timing
   and sensitivity. A paid V4.1 Tier-2 view includes the section only when the
   immutable V4.1 content and matching V4.1 entitlement scope are both present;
   mixed V2/V4.1 content or scope fails closed.

**Acceptance criteria**

- Assembly fails if facts/snapshot lineage does not match the V4.1 section.
- V4.1 public content cannot expose internal evidence payloads, raw frame
  metadata, or PII.
- V2 public projection behavior is unchanged.
- Query compatibility tests cover historical V4 content with V4 scope, V4.1
  content with V4.1 scope, and rejection of both mixed combinations.

### Slice 4: Reader, HTML/PDF, And Approved UI Artifact

**Owned files**

- `apps/web/src/features/reports/report-reader.tsx`
- `apps/web/src/features/reports/report-reader.test.tsx`
- `apps/web/src/features/reports/comprehensive-report-reader.tsx`
- `apps/web/src/features/reports/comprehensive-report-reader.test.tsx`
- `apps/web/src/styles/global.css`
- `packages/backend/src/reports/comprehensive-report-html.ts`
- `packages/backend/src/reports/comprehensive-report-html.test.ts`
- `packages/backend/src/reports/report-version.repository.ts`
- `packages/backend/src/reports/report-version.repository.test.ts`
- the separately approved PDF consumer implementation and tests; no such
  consumer exists on the verified baseline
- the approved LSV-19 UI artifact branch files and screenshot manifest only
  after that artifact exists and is approved

**Implementation**

1. Branch reader rendering by `contentVersion`: keep the existing V2 reader
   unchanged and add a V4.1 reader branch that places the sensitivity section
   in the approved artifact order, table of contents, progress tracking, and
   mobile reader flow.
2. Render stable and time-sensitive factors as distinct accessible sections
   using the approved UI artifact. Do not invent visual treatment before the
   LSV-19 artifact and screenshot manifest approve it.
3. Add the V4.1 field to deterministic HTML output under
   `ziwei-comprehensive-html.v2`. Preserve the existing
   `ziwei-comprehensive-html.v1` output byte-for-byte.
4. On the current baseline, verify only immutable V4.1 HTML persistence and
   the `report.pdf.requested.v1` event carrying reserved render version
   `identity-report-pdf.v2`. Production activation remains blocked until a
   separately approved real PDF consumer proves it consumes that immutable
   HTML/render tuple and does not regenerate historical content.

**Acceptance criteria**

- Stored V2 reader and immutable HTML/event behavior remain unchanged.
- V4.1 reader and HTML include both sensitivity narratives exactly once.
- A real V4.1 PDF smoke is an activation gate supplied by the separately
  approved PDF consumer dependency, not claimed by this repository baseline.
- Approved screenshot-manifest evidence covers the sensitivity reader at
  320px, 390px, and 1440px before activation review.

### Slice 5: Samples, Activation, And Rollback

**Owned files**

- `packages/backend/src/reports/identity-report-config.ts`
- `packages/backend/src/reports/identity-report-config.test.ts`
- `packages/backend/src/commerce/commerce.repository.ts`
- `packages/backend/src/commerce/commerce.repository.integration.test.ts`
- sample fixture/manifest files identified by the approved LSV-19 UI artifact
  and report-fixture audit
- `docs/superpowers/plans/2026-09-16-lsv-36-birth-time-sensitivity-v4-1.md`

**Implementation**

1. Keep V4.1 dormant while producing approved non-production sample reports
   from frozen fixtures. The sample gate requires three representative
   sensitivity outputs, including one stable-dominant and one
   time-sensitive-dominant result, all linked to their exact snapshots.
2. Obtain the approved LSV-19 reader artifact and screenshot manifest, then
   review the samples with that artifact. This is a dependency, not a new
   business decision.
3. Record 20 consecutive successful generations with zero manual edits and no
   terminal failure for the exact V4.1 knowledge/prompt/report/quality/content/
   template tuple. The three readable samples are product-review evidence
   within that gate and do not replace it.
4. Only after sample approval, the 20-run gate, focused verification,
   independent Terra high review, and explicit An activation/deployment
   authorization, switch the paid VI resolver from current V4 to the dormant
   V4.1 selection.
5. Rollback means restoring the resolver to the prior V4 selection for new
   reservations only. It never rewrites, deletes, reprojects as V2, or
   regenerates immutable V4.1 report versions. V2 and V4.1 remain readable by
   version branch.

**Activation gates**

1. An approves this technical plan and the implementation brief.
2. The LSV-19 approved UI artifact and screenshot manifest cover the reader.
3. Three linked sample reports pass product review and exact snapshot/evidence
   checks.
4. Twenty consecutive generations pass for the exact immutable V4.1 tuple
   with zero manual edits and no terminal failure.
5. The approved PDF consumer proves a V4.1 PDF from immutable HTML and the
   reserved `identity-report-pdf.v2` render version.
6. Focused automated checks pass and Terra high finds no unresolved must-fix.
7. An explicitly authorizes merge, production deployment, technical smoke,
   and activation. These are separate authorizations.

## Focused Verification

Run checks proportionate to this additive slice:

1. Contract tests for strict V2/V4.1 separation and historical compatibility.
2. Facts/evidence tests for exactly three frozen frames, stable/sensitive
   evidence integrity, source-snapshot hash lineage, and provider payload PII
   exclusion.
3. Section registry/checkpoint/assembly tests for exactly one V4.1 sensitivity
   section and unchanged V4 23-section behavior.
4. Writer, validator, and critic tests for allowed evidence keys, precision
   framing, and a sensitivity-only rewrite target.
5. Public projection and reader tests for Tier-1 omission, Tier-2 V4.1
   inclusion, and V2 reader compatibility.
6. One browser reader smoke and one immutable HTML/PDF-request-event smoke per
   content version, including the approved 320px, 390px, and 1440px
   screenshots for V4.1. A real PDF smoke remains an activation gate owned by
   the separately approved PDF consumer.
7. Dependency-ordered build/typecheck for `@lasoviet/contracts`,
   `@lasoviet/config`, `@lasoviet/backend`, `@lasoviet/worker`, and
   `@lasoviet/web`, plus the focused test files above.

This plan intentionally excludes an exhaustive birth-hour or provider-failure
matrix. The existing deterministic engine snapshot foundation is covered by
its own tests; LSV-36 verifies the exact three-frame contract and the new
consumer boundary.

## Non-Goals

- No reimplementation of `ZiweiSensitivitySnapshotV1`, engine time-frame
  calculation, or existing report-source snapshot persistence.
- No changes to payment, pricing, account/session behavior, production
  credentials, or external providers.
- No migration unless an approved implementation audit proves one is needed.
- No UI design before the LSV-19 artifact is approved.
- No merge, deployment, paid activation, or modification of historical report
  content under this planning task.

## Dependencies And Open Questions

- Required before implementation: explicit technical-plan approval from An.
- Required before reader implementation/activation: approved LSV-19 UI
  artifact and screenshot manifest.
- Required before activation: product review of three sample reports.
- Required before activation: 20 consecutive successful generations for the
  exact immutable V4.1 tuple.
- Required before activation: an approved PDF consumer and real V4.1 PDF smoke.
- The implementation audit must document whether current persisted evidence
  item dimensions expose exact stable/sensitive mapping. It must not introduce
  a migration speculatively.
