# LSV-16 Vietnamese V4.1 Knowledge Corpus Plan

**Date:** 2026-09-13
**Status:** Planning only; ruleset signed off
**Dependency:** Starts after #15 quality gates and generator are merged

## Goal

Create an immutable, provenance-complete Vietnamese corpus
`ziwei.comprehensive.knowledge.v4`, pass the signed editorial gates, obtain
founder sample approval, and activate it only for new sectioned-generator
reservations.

## Verified Facts

1. The current V3 manifest has 3,258 chunks and is about 2.8 MiB.
2. The design audit counted 2,918 chunks with Han content, a median length of
   49 characters, and 372 chunks containing death/disaster terms.
3. Current manifest metadata has no per-output source-passage provenance.
4. Current ingestion supports only a strict V1 manifest and immutable
   knowledge-version reuse.
5. Current retrieval and worker provisioning accept only knowledge V3.
6. `REPORT_KNOWLEDGE_VERSION_V4` is declared but not selected.
7. The founder signed off the term table and warning format on 2026-09-13.
8. V3 must remain immutable and available for historical/recovery paths.

## Assumptions

- Each V3 source chunk will be accounted for by either at least one V4 rewritten
  chunk or a deterministic dropped-chunk record with reason.
- Existing `reference_rewrite` permission remains the approved use basis.
- Corpus generation may require an approved external model and budget, but no
  customer data is involved.

## Recommendations

1. Add a V2 knowledge manifest with explicit source passage IDs and optional
   structured warning metadata; do not overload strict V1 metadata.
2. Keep draft generation outside the approved runtime path. Only the
   founder-approved final manifest has `approval.status: approved`.
3. Use stable V4 passage IDs derived from source passage IDs, not generation
   order.
4. Maintain a provenance ledger that proves every V3 chunk is mapped or
   intentionally dropped.
5. Use the shared #15 lexical config. Corpus-specific checks also require:
   2-4 sentences, no oral filler, Vietnamese language, meaningful tags, and
   two or three preparation steps for warning chunks.
6. Switch new sectioned reservations to V4 knowledge without changing legacy
   V4+V3 resolution or stored reports.

## Open Decisions

### NEEDS_FOUNDER_INPUT

1. Approve the corpus-generation provider/model and maximum spend before any
   credentialed generation run.
2. Confirm the named approver value and approval timestamp to write into the
   final manifest after the 50-chunk review.
3. Authorize retrieval activation and deployment after Terra and founder
   acceptance.

## Bounded Flash Executor Slices

### Slice 16A: Manifest V2 and Provenance Storage

**Owned files**

- Modify `packages/backend/src/knowledge/knowledge-ingestion.service.ts`
- Modify `packages/backend/src/knowledge/knowledge-ingestion.service.test.ts`
- Modify `packages/database/src/schema/knowledge.ts`
- Modify `packages/database/src/index.ts`
- Add the next Drizzle migration and metadata
- Add or modify knowledge manifest contracts in `packages/contracts/src/`
- Modify `packages/contracts/src/index.ts`

**Behavior and acceptance**

- V1 manifests remain valid and immutable.
- V2 chunks require source knowledge version and non-empty source passage IDs.
- Optional warning metadata contains area and two or three preparation steps.
- Ingestion persists provenance, rejects unknown/duplicate source IDs, and
  deep-compares immutable reuse.
- Schema, migration-layout, ingestion, path-boundary, and immutable-reuse tests
  pass.

**Recovery boundary**

Stop on any need to mutate existing V3 document/chunk rows.

### Slice 16B: Deterministic Rewrite and Gate Tooling

**Owned files**

- Create `scripts/rewrite-ziwei-knowledge-v4.mjs`
- Create `scripts/build-ziwei-knowledge-v4.mjs`
- Create `scripts/check-ziwei-knowledge-v4.mjs`
- Create focused script tests under `tests/knowledge/`
- Create `content/knowledge/ziwei/comprehensive-report-sources.v4.json`
  only after source accounting is complete

**Behavior and acceptance**

- Input is the committed V3 manifest and signed #15 quality config.
- Resume state is local and non-secret; reruns do not regenerate completed
  source IDs.
- Every output is rewritten Vietnamese, not word-for-word translation.
- Oral filler and death-only chunks are dropped with explicit reason.
- Mixed chunks retain useful meaning and remove death/lifespan claims.
- Warning chunks follow the approved structure and record preparation steps.
- Builder produces stable ordering and hashes; `--check` detects drift.
- No credential, prompt/response log, or draft private artifact is committed.

**Recovery boundary**

The implementation slice builds and tests tooling only. A credentialed corpus
run requires a separate exact brief naming provider, model, budget, output
directory, and disposal rules.

### Slice 16C: Bounded Corpus Generation Batches

**Owned files**

- Local draft workspace outside Git during generation
- Final create target:
  `content/knowledge/vi/ziwei/comprehensive-report.v4.json`
- Final provenance registry:
  `content/knowledge/ziwei/comprehensive-report-sources.v4.json`

**Behavior and acceptance**

- Process deterministic source-ID ranges; each brief names the exact range.
- Stop the batch on provider mismatch, budget exhaustion, schema failure, or a
  gate-failure rate above the brief threshold.
- A batch may make one direct correction for its own malformed generated row.
- Final global checks prove complete source accounting, unique IDs, stable
  hashes, zero Han/death/discouraged terms, warning preparation, and tag
  coverage.

**Recovery boundary**

No production access and no customer data. Stop rather than silently switch
models, reasoning level, or generation rules.

### Slice 16D: Founder Sample Package

**Owned files**

- Create a concise English review report under this plan directory
- Do not commit generated customer reports or private model logs

**Behavior and acceptance**

- Select about 50 chunks with a recorded deterministic seed, stratified across
  source type, palace, star, topic, warning/non-warning, and dropped mappings.
- Report source IDs, V4 IDs, provenance, gate results, and founder disposition.
- Founder corrections return through a bounded regeneration range; they do not
  hand-edit immutable final chunks without provenance.

**Recovery boundary**

The corpus remains unapproved until founder sign-off is written.

### Slice 16E: Retrieval and Provisioning Activation

**Owned files**

- Modify `packages/backend/src/reports/identity-report-config.ts`
- Modify `packages/backend/src/reports/identity-report-version-family.ts`
- Modify `packages/backend/src/reports/report-generation.repository.ts`
- Modify `packages/backend/src/reports/comprehensive-report-retrieval.ts`
- Modify `packages/backend/src/knowledge/knowledge-retrieval.service.ts`
- Modify `apps/worker/src/reports/provision-report-knowledge.ts`
- Modify matching unit/integration tests
- Modify `scripts/generate-ziwei-quality-samples.mjs`

**Behavior and acceptance**

- Retrieval accepts V3 and V4, using the reservation's frozen version.
- V4 uses configurable initial caps of six passages and 4,000 characters per
  section.
- Fresh environments provision both V3 and V4 so legacy recovery remains
  possible.
- New sectioned reservations select V4 only after activation.
- Historical V4+V3 and legacy reports remain readable/recoverable.
- Vietnamese full-text queries return relevant V4 passages for representative
  palace/star/topic fixtures.

**Recovery boundary**

No paid-default switch until founder corpus and report-sample approval.

## Terra Milestones

1. Review 16A-16B for schema compatibility, immutable provenance, source
   boundary, and gate reuse.
2. Review the complete generated corpus and accounting report before founder
   sampling.
3. Review 16E for version fencing, fresh-environment provisioning, retrieval
   relevance, and legacy recovery.

## Focused Checks

- Contract, ingestion, migration, script, retrieval, and provisioning tests.
- `build-ziwei-knowledge-v4.mjs --check`
- `check-ziwei-knowledge-v4.mjs`
- Representative PostgreSQL retrieval integration tests.
- Sectioned fixture reports pass all #15 gates on corpus V4.
- Dependency-ordered builds/typechecks and `git diff --check`.

## Deployment Gates

- Founder signs off the 50-chunk sample and the reports generated on V4.
- Terra has no unresolved `must-fix`.
- Final manifest is approved, immutable, and provisioned successfully.
- Founder authorizes activation, merge, and deployment.
- Production smoke confirms both V3 and V4 are present, only new authorized
  reservations select V4, and no legacy read/recovery path regresses.
