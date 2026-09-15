# LSV-16 Zi Wei Knowledge V4 Editorial Corpus Implementation Plan

**Date:** 2026-09-15
**Status:** Awaiting owner technical-plan approval. This is a planning-only
milestone; no corpus, runtime, migration, dependency, configuration, or
production change is authorized by this document.
**Baseline:** `origin/product/experience-spec-v1`
`946d1bbb586d8e90a3790c228eb81957d00ddfa5` (2026-09-15 local ref; no
merge or rebase performed).
**Kaneo:** LSV-16, opaque task ID `f9we6kllqzs3zuu6wavy3pa5`.
**Authority sources:** live `AGENTS.md` including FD-084; the decision tracker;
Kaneo LSV-16 and its 2026-09-13 founder approval comment; and
`docs/superpowers/specs/2026-09-13-ziwei-knowledge-editorial-ruleset.md`.

## 1. Purpose, Scope, and Gates

The approved editorial ruleset authorizes the V4.1 content direction: rewrite
the Vietnamese Zi Wei knowledge corpus into clear Vietnamese; remove
death/lifespan content; retain non-death adverse-event warnings as practical
preparation guidance; and obtain
founder review of approximately 50 samples. It does not authorize technical
implementation. This plan is the required technical design and bounded-work
record for a later approved implementation.

### In scope after explicit technical approval

- An immutable V4 editorial candidate and deterministic assembly pipeline.
- Versioned provenance, validation, approved ingestion, V4 retrieval support,
  and inactive side-by-side provisioning.
- A deterministic founder sample-50 artifact and a freeze transition after
  explicit Kaneo approval.
- A narrow handoff of an approved V4 knowledge version and retrieval caps to
  LSV-15.

### Explicit exclusions for this wave

- No `comprehensive-report.v4.json` or other V4 corpus content.
- No product, worker, API, retrieval, report-generation, or runtime code.
- No database migration, dependency, configuration, test, provisioning, or
  activation change.
- No deployment, production database action, merge, or resolver switch.
- No change to any V3 file, V3 database row, V3 reservation, or historical
  report provenance.
- No ReadingContext persistence, consumption, or storage. Luna remains paused.

### Required approval sequence

1. Terra high independently reviews this plan; Sol records only evidence-backed
   corrections to this file.
2. An explicitly approves the resulting technical plan, including the V4
   manifest/provenance contract.
3. Bounded implementation slices run with their named ownership and checks.
4. Terra high independently reviews the complete implementation milestone.
5. Founder reviews the deterministic sample-50 candidate in Kaneo. V4 remains
   draft and cannot be ingested or selected before the explicit approval.
6. An separately authorizes migration execution, deployment, and any resolver
   switch. These are distinct decisions; a migration existing in source is not
   deployment authorization.

## 2. Verified Live Baseline

### 2.1 V3 corpus and source registry

`content/knowledge/vi/ziwei/comprehensive-report.v3.json` is an approved
`KnowledgeManifestV1` document:

| Field | Verified value |
|---|---|
| document ID | `ziwei-comprehensive-report-vi` |
| knowledge version | `ziwei.comprehensive.knowledge.v3` |
| locale / discipline | `vi` / `ziwei` |
| chunk count | 3,258 |
| document content hash | `10e0b50fad713fea4a4c479a29a542c0a1c8303f4dda64fdf495ef65968ed968` |
| approval | `approved`, `phase04-content-review`, `2026-09-07T00:00:00.000Z` |
| permitted use | `reference_rewrite` |
| source path | `content/knowledge/vi/ziwei/comprehensive-report.v3.json` |

The first V3 chunk contains Han ideographs and has `languageOrigin: "zh"`,
which confirms why V4 must be a new immutable version rather than a relabeling
or in-place cleanup.

`content/knowledge/ziwei/comprehensive-report-sources.v3.json` records six
pinned source registries and the following totals:

| Source ID | Emitted chunks |
|---|---:|
| `nihai-tianji-corpus` | 1,125 |
| `ziwei-doushu` | 520 |
| `ziwei-astrology-skills` | 1,056 |
| `tu-vi-dau-so-research` | 109 |
| `iztro` | 374 |
| `ziwei-chat` | 74 |
| **Total** | **3,258** |

The V3 registry reports 56 selected files, 3,283 extracted/candidate units,
and 25 duplicates removed. V4 must retain V3 passage IDs as provenance inputs
and must account for every one of the 3,258 V3 passage IDs in a disposition
ledger.

### 2.2 Current manifest, ingestion, and immutability boundaries

`packages/backend/src/knowledge/knowledge-ingestion.service.ts` exposes a
strict `KnowledgeManifestV1Schema`. It requires a versioned document ID,
content hashes for every chunk and the document, report section IDs, optional
strict `KnowledgeChunkMetadataV1`, source attribution/path/permitted-use, and
an `approved` approval record.

Current validation:

- recomputes every chunk and document SHA-256;
- rejects duplicate `passageId` values in one manifest;
- rejects unapproved manifests;
- rejects absolute, traversal, missing, and realpath/symlink-escaping source
  paths outside the canonical repository root;
- deep-compares every persisted document and chunk field on replay;
- returns reuse only for an exact immutable match; and
- rejects attempts to overwrite an existing document/version or collide a
  passage ID within a knowledge version.

`KnowledgeChunkMetadataV1` is strict and currently contains canonical metadata
arrays (`topics`, `palaces`, `stars`, `brightness`, `transformations`,
`relations`, `patterns`) plus `sourceType`, `languageOrigin`, and priority.
V4 must not weaken that contract or reinterpret rows already persisted for V3.

### 2.3 Current persistence and migration state

`knowledge_documents` and `knowledge_chunks` were created by migration
`0013_approved_knowledge.sql`. The tables have version/document uniqueness,
per-version passage uniqueness, version/discipline/locale lookup, document,
JSONB report-section, and PostgreSQL `simple` full-text indexes.
Migration `0016_ziwei_knowledge_metadata.sql` added non-null `metadata JSONB`
with `{}` default and the metadata GIN index.

The inspected `origin/product/experience-spec-v1` baseline includes LSV-15
through `0030_report_section_checkpoint_revisions`. The implementation must
allocate the next migration number only after integrating the approved target
branch and re-reading its journal. This plan intentionally reserves no number.

`report_reservations` and immutable `report_versions` persist
`knowledgeVersionId`. Existing reservation/version comparisons require it to
match exactly. A V3 or later V4 reservation is therefore historical lineage,
not a mutable pointer.

### 2.4 Current retrieval and report wiring

The generic retrieval path filters approved documents by discipline, locale,
knowledge version, and report section. It uses PostgreSQL `simple` FTS,
rank-descending then `passageId`-ascending ordering, optional vector-only
appendage after FTS candidates, deduplication, and deterministic character and
passage caps.

The specialized `ZiweiKnowledgeQueryV3` currently:

- accepts only `locale: "vi"` and
  `knowledgeVersion: "ziwei.comprehensive.knowledge.v3"`;
- scores metadata first (patterns, palace, stars, transformations, brightness,
  relations, topics, then priority), with deterministic FTS and passage-ID
  tie-breakers; and
- defaults to two passages and 1,800 characters, although its validation
  maximum is larger.

`packages/backend/src/reports/comprehensive-report-retrieval.ts` hard-codes
V3 and `maxPassages: 2`, `maxTotalChars: 1800` for every pack. LSV-15's
approved planning contract defines an inactive, versioned quality/retrieval
configuration with intended V4 pack caps of six passages and 4,000 characters.
The live runtime has no such configuration yet.

`packages/backend/src/reports/identity-report-config.ts` already declares
`REPORT_KNOWLEDGE_VERSION_V4 =
"ziwei.comprehensive.knowledge.v4"`, but `ReportVersionSelectionV4` and
`v4ReportVersions()` still select V3. This dormant constant is not activation.

Worker provisioning currently loads only V3 at
`content/knowledge/vi/ziwei/comprehensive-report.v3.json` plus English V2.
It validates both manifests and ingests them synchronously. V4 must be added
side-by-side, not substituted into this default path before all gates pass.

## 3. Later Technical Architecture

### 3.1 Immutable V3 and versioned V4 candidate model

V3 files, source registry, manifest hashes, and database rows are immutable.
V4 is a new knowledge version, never an edit, metadata rewrite, or approval
change to V3.

After technical approval, Slice 16C owns these draft candidate paths beneath
`content/knowledge/vi/ziwei/v4-candidate/`:

- `comprehensive-report.v4.candidate.json`;
- `comprehensive-report.v4.disposition-ledger.json`; and
- `comprehensive-report.v4.validation.json`.

The final immutable output path is
`content/knowledge/vi/ziwei/comprehensive-report.v4.json`. No draft candidate
path is a runtime provisioning path.

Introduce:

- `KnowledgeManifestV2` as an additive strict manifest contract for V4,
  retaining every V1 field and adding `manifestSchemaVersion`, `candidateHash`,
  `assemblyVersion`, `provenanceSchemaVersion`, and a repository-relative
  disposition-ledger path/hash.
- a strict `KnowledgeEditorialRecordV1` source format for a candidate chunk:
  stable V4 `passageId`, report sections, content, canonical metadata,
  `sourcePassageIds` containing one or more V3 IDs, and a bounded disposition
  rationale code.
- a strict whole-corpus `V3DispositionLedgerV1`, exactly one record per V3
  passage ID. Allowed closed dispositions are `rewritten`, `merged`,
  `split`, `omitted_oral_filler`, and `omitted_death_only`. A source passage
  may be referenced by many V4 records but must have one ledger disposition.

All candidate text and metadata strings are NFC-normalized before validation,
hashing, duplicate detection, ID calculation, and sorting. Assemblers sort V4
records by `passageId` in bytewise code-point order, sort set-like metadata and
`sourcePassageIds` likewise, serialize canonical JSON, recompute each content
hash, then calculate the ordered document content hash. Stable V4 IDs derive
from the canonical record payload and a fixed assembler version; the
implementation must reject an input-supplied ID that differs from the derived
ID.

`candidateHash` is SHA-256 over a canonical object containing, in this order:
the ordered canonical chunks, ordered canonical provenance edges, the
disposition-ledger SHA-256, the corpus-validation policy version, and the
assembler version. It explicitly excludes approval fields, `sourcePath`, and
all physical output paths. The candidate manifest, ledger, and validation
report each record this same hash.

This design makes parallel editorial work mergeable without making content
order, hashes, or the final candidate dependent on executor timing.

### 3.2 Provenance persistence

Add required normalized provenance relation
`knowledge_chunk_provenance_edges`; do not add a provenance projection to V3
rows. Each edge has:

- output key `(output_knowledge_version, output_passage_id)`;
- source key `(source_knowledge_version, source_passage_id)`;
- a primary edge ID and a unique identity across all four key columns;
- a composite foreign key from the output key to existing unique
  `knowledge_chunks(knowledge_version, passage_id)`; and
- a composite foreign key from the source key to the same existing unique key.

The migration enforces `output_knowledge_version =
'ziwei.comprehensive.knowledge.v4'` and
`source_knowledge_version = 'ziwei.comprehensive.knowledge.v3'` with database
checks. Ingestion inserts V4 chunks and their edges atomically in one
transaction. Every emitted V4 record must have at least one FK-backed source
edge; the immutable disposition ledger remains the complete coverage record
for V3 sources that are omitted and therefore have no emitted edge. V3 rows,
metadata, hashes, and their absence of edges remain untouched.

The manifest remains `draft` through all candidate assembly, validation, and
sample selection. The existing ingest service rejects it until the founder
approval transition records approver and timestamp. Only an approved, frozen
candidate hash can produce an approved V4 manifest.

### 3.3 Deterministic V4 retrieval and configuration

Replace the V3-only query type with a closed versioned Zi Wei query that permits
only supported V3 and V4 versions. Preserve the current Vietnamese FTS,
metadata-first ranking semantics, content-hash duplicate suppression, and
deterministic tie-breakers. V4 must be queryable only by explicit version; no
fallback to V3 or implicit resolver switch is permitted.

LSV-16's configuration is corpus-validation-only: it contains normalized
editorial terms, structured exemptions, sentence/syllable rules, warning and
oral-filler patterns, provenance/disposition constraints, and a policy version.
It contains no report-quality IDs, report-config mapping, retrieval caps, or
runtime resolver values.

`config/ziwei-comprehensive-report-quality.v1.json`, owned by LSV-15, is the
sole canonical runtime source for `retrievalMaxPassages=6` and
`retrievalMaxChars=4000`, bound through LSV-15's immutable
report-config/quality mapping. The LSV-16 retrieval primitive supports explicit
V3/V4 versions and caller-supplied already-validated caps. LSV-15 consumes the
primitive and applies its canonical runtime caps.

### 3.4 Provisioning and activation boundary

Provision V4 only after the manifest is approved and frozen. Legacy invocation
without V4 preserves the current V3-plus-English behavior. Once V4 is supplied
or configured, provisioning validates V3, English, and V4 before any ingestion
call. An invalid V4 candidate fails the entire invocation with zero ingestion
calls; it is never silently skipped. Only after all three validations pass may
the service ingest the manifests without deleting or modifying V3. Idempotent
replay of either version must use deep immutable equality.

No resolver changes in LSV-16. New report reservations continue to pin their
currently selected version until LSV-15's approved integration, all gates, and
An's later activation authorization. Application rollback changes only the
version chosen for new reservations; it never deletes, rewrites, or mutates
V3/V4 knowledge rows, reservations, or reports.

## 4. Deterministic Whole-Corpus Validation

The later implementation creates one repository-local validation command with
machine-readable JSON output and a canonical validation report. It must run
before sample selection, before approval status changes, and before
provisioning.

| Gate | Deterministic rule |
|---|---|
| Manifest and build | Strict V2 schema passes; every hash is recomputed; a clean reassembly from the same records produces byte-identical manifest, candidate hash, ledger hash, content hash, and report. |
| Locale | After NFC normalization, zero Han ideographs are allowed. |
| Editorial vocabulary | Metadata and canonical-ID fields are validated separately and never scanned as prose. In prose, palace names are allowed only in exact `cung <PalaceName>` form; `Phu Thê` and `Tử Tức` outside that form fail. Exact star, transformation, brightness, pattern, `đại vận`, and `lưu niên` names are allowed. The prohibited phrase table still rejects `đắc địa`, `thất địa`, and every other ruleset §3.3 term outside an expressly approved label context. Positive and negative table-driven tests are required for every exemption. |
| Death/lifespan | Zero normalized, case-insensitive prohibited terms or phrases from ruleset §4, including death, lifespan, and indirect longevity prediction variants. |
| Warning form | A record containing a configured warning-domain term must contain: a domain plus period phrase, a chart-basis phrase, a likely-situation phrase, and at least two distinct configured concrete-preparation indicators. It must contain no certainty phrase, adverse event date/month pattern, named disease, reproductive claim, remedy/ritual language, or paywall pressure. |
| Useful chunk | Each non-omitted V4 record has at least 2 terminal sentences after NFC and whitespace normalization, targets 2 to 4 sentences, has at least 36 Vietnamese syllable tokens, remains within the manifest's 1,200-character maximum, and has at least one concrete chart anchor or approved topic/palace/star metadata anchor. A deterministic gate cannot establish factual usefulness or editorial naturalness; records passing it remain subject to critic/manual review. |
| Oral filler | No configured oral-lecture filler phrase is permitted in V4 prose. A source whose remaining meaning is only filler is ledgered as `omitted_oral_filler`. |
| Metadata | Canonical IDs are valid, arrays are sorted/unique after NFC, report-section coverage is nonempty, and language origin is `vi`. |
| Duplicates | No duplicate V4 passage ID, content hash, or canonical normalized content. Duplicate provenance sets with materially duplicate text are rejected for manual resolution. |
| Provenance | Every referenced V3 passage ID exists in the frozen V3 manifest. Every V3 ID appears exactly once in the ledger; reverse coverage, allowed disposition codes, and disposition-to-output consistency pass. |
| Repository boundary | All source, batch, ledger, report, and manifest paths are relative, non-traversing, exist beneath the realpath canonical repository root, and do not symlink-escape. |
| V3 non-mutation | Compare the V3 manifest and source-registry byte hashes against recorded baseline values and assert no V3 path is an output or write target. |

The term lists, structured contextual exemptions, warning indicators, and
oral-filler patterns must be versioned in the corpus-validation configuration.
Regexes must operate on NFC-normalized text and use whole-term semantics where
applicable. Validation reports must list record IDs and rule codes, never echo
full failing corpus prose into general logs.

## 5. Founder Sample-50 Gate and Freeze

The candidate sample is a review artifact, not ingestion evidence.

1. After all deterministic gates pass, derive a seed from the frozen candidate
   content hash and a fixed selector version.
2. Use that seed to select exactly 50 V4 records with deterministic minimum
   coverage: one record for each of the 12 palaces, one for each of the 14
   major stars, one for each of the seven warning domains in the ruleset, and
   one for each of the six V3 source registries. A single record may satisfy
   multiple quotas. Choose each quota record by the lowest seeded hash among
   eligible records, deduplicate selected IDs, then fill remaining slots by
   global seeded-hash order. The selector fails if the candidate lacks an
   eligible record for any required quota; it never silently relaxes coverage.
3. Write a reproducible artifact containing selector version, candidate hash,
   input manifest/ledger hashes, ordered sample passage IDs, coverage counts,
   and the Vietnamese sample content. Repository metadata and instructions are
   English; only the founder-review prose is Vietnamese.
4. Keep the manifest approval `draft`, forbid ingestion, and forbid resolver
   selection. Sol posts the artifact reference and candidate hash to Kaneo in
   Vietnamese for explicit founder approval.
5. If a sample is rejected or editorial records change, produce a new
   candidate hash and a newly selected sample. The prior sample never approves
   the new candidate.
6. Only explicit Kaneo approval changes the final manifest to `approved`,
   records the approver/time, and freezes the V4 version. The approved
   candidate hash, manifest hash, ledger hash, and sample artifact hash become
   release evidence.

## 6. Bounded Implementation Slices

Every slice requires an explicit Sol brief after owner technical approval.
Paths marked `create` do not exist today and must be checked before search or
write. Migration number `00XX` is allocated only after the target journal is
current. No slice assigns work to Luna.

### [ ] Slice 16A: Contracts, configuration, and validator

**Owned files**

- Create `config/ziwei-knowledge-v4-validation.v1.json`
- Create `packages/config/src/ziwei-knowledge-v4-validation.ts`
- Create `packages/config/src/ziwei-knowledge-v4-validation.test.ts`
- Modify `packages/config/src/index.ts`
- Modify `packages/backend/src/knowledge/knowledge-ingestion.service.ts`
- Create `packages/backend/src/knowledge/ziwei-knowledge-v4-validator.ts`
- Create `packages/backend/src/knowledge/ziwei-knowledge-v4-validator.test.ts`
- Modify `packages/backend/src/knowledge/knowledge-ingestion.service.test.ts`

**Behavior and acceptance**

- Add strict V2 candidate/ledger/provenance schemas without changing V1
  behavior.
- Load a normalized, closed validation policy including ruleset vocabulary,
  structured contextual exemptions, warning grammar, oral fillers,
  provenance/disposition rules, and selected useful-chunk thresholds.
- Do not include report quality IDs, report-config mappings, retrieval caps, or
  runtime resolver values in the corpus-validation configuration.
- Reject malformed, unknown, or duplicate-normalized validation
  configuration. Prove positive and negative table-driven cases for every
  palace, star, transformation, brightness, pattern, `đại vận`, and `lưu
  niên` exemption, including rejected bare `Phu Thê`, bare `Tử Tức`, `đắc
  địa`, and `thất địa`.
- Prove every validation row in section 4 and V1 regression behavior.

**Focused commands**

```text
corepack pnpm@11.25.0 --filter @lasoviet/contracts build
corepack pnpm@11.25.0 --filter @lasoviet/config build
corepack pnpm@11.25.0 --filter @lasoviet/backend build
corepack pnpm@11.25.0 vitest run packages/config/src/ziwei-knowledge-v4-validation.test.ts
corepack pnpm@11.25.0 vitest run packages/backend/src/knowledge/ziwei-knowledge-v4-validator.test.ts packages/backend/src/knowledge/knowledge-ingestion.service.test.ts
```

### [ ] Slice 16B: Additive persistence and approved ingestion

**Owned files**

- Modify `packages/database/src/schema/knowledge.ts`
- Modify `packages/database/src/index.ts`
- Create `packages/database/drizzle/00XX_ziwei_knowledge_v4_provenance.sql`
- Modify `packages/database/drizzle/meta/_journal.json`
- Modify `packages/database/src/schema/knowledge-migration-layout.test.ts`
- Create `packages/database/src/schema/knowledge-v4-provenance.integration.test.ts`
- Modify `packages/backend/src/knowledge/knowledge-ingestion.service.ts`
- Modify `packages/backend/src/knowledge/knowledge-ingestion.service.test.ts`
- Modify `packages/backend/src/index.ts`

**Behavior and acceptance**

- Allocate the actual next migration number from the integrated target journal.
- Add `knowledge_chunk_provenance_edges` with its composite V4-output and
  V3-source FKs, unique edge identity, version checks, and required indexes;
  preserve all V3 rows and existing constraints/indexes.
- Ingest approved V4 idempotently; reject draft candidates, changed replay,
  missing/invalid V3 provenance edges, cross-document passage collisions, and
  a V3 mutation. Insert chunks and edges atomically; reject an emitted V4
  record with zero edges.
- Verify clean and upgrade migrations, composite-FK enforcement, V3/V4 version
  check enforcement, concurrent same-candidate ingestion, exact replay, and
  immutable failure paths.

**Focused commands**

```text
corepack pnpm@11.25.0 --filter @lasoviet/database build
corepack pnpm@11.25.0 --filter @lasoviet/backend build
corepack pnpm@11.25.0 vitest run packages/database/src/schema/knowledge-migration-layout.test.ts packages/database/src/schema/knowledge-v4-provenance.integration.test.ts
corepack pnpm@11.25.0 vitest run packages/backend/src/knowledge/knowledge-ingestion.service.test.ts
```

### [ ] Slice 16C: Editorial batches and deterministic assembly

**Owned files**

- Create `content/knowledge/vi/ziwei/v4-candidate/README.md`
- Create `content/knowledge/vi/ziwei/v4-candidate/work-index.v1.json`
- Create deterministic shard files under
  `content/knowledge/vi/ziwei/v4-candidate/shards/source-SS-shard-NNN.json`
  as enumerated by the committed work index
- Create
  `content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.candidate.json`
- Create
  `content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.disposition-ledger.json`
- Create
  `content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.validation.json`
- Create `scripts/assemble-ziwei-knowledge-v4.mjs`
- Create `scripts/assemble-ziwei-knowledge-v4.test.mjs`
- Create `scripts/validate-ziwei-knowledge-v4.mjs`

**Behavior and acceptance**

- The work index sorts the 3,258 frozen V3 passage IDs by source-registry index
  then passage ID and partitions them into immutable shards of at most 75
  source passages. It records every exact shard path and source-ID write set.
- Each bounded editorial brief owns exactly one path named in the work index
  and no more than 75 source passages. A V4 record may reference only source
  IDs owned by that shard. Cross-shard synthesis is deferred to a separately
  named correction shard with an exact source-ID allowlist after the original
  shards are complete; no executor edits another shard.
- The assembler is the sole writer of the aggregate ledger, candidate
  manifest, validation reports, and hashes. Parallel editorial executors never
  share a writable file.
- The assembler rejects overlapping V3 IDs, missing ledger coverage,
  nondeterministic ordering, or an output path outside the repository root.
- Reassembly from shuffled batch input is byte-identical. No final
  `comprehensive-report.v4.json` is created until founder approval permits the
  dedicated finalization slice.

**Focused commands**

```text
node scripts/assemble-ziwei-knowledge-v4.mjs --check
node scripts/validate-ziwei-knowledge-v4.mjs --candidate-dir content/knowledge/vi/ziwei/v4-candidate
node --test scripts/assemble-ziwei-knowledge-v4.test.mjs
```

### [ ] Slice 16D: V4 retrieval primitive

**Owned files**

- Modify `packages/backend/src/knowledge/knowledge-retrieval.service.ts`
- Modify `packages/backend/src/knowledge/knowledge-retrieval.service.test.ts`

**Behavior and acceptance**

- Add explicit V4 query support without changing V3 semantics.
- Accept only explicit V3/V4 versions plus caller-supplied caps that have
  already passed caller-side validation. V4 uses Vietnamese FTS, metadata-first
  scoring, and existing deterministic rank/tie-break order.
- Preserve the V3 primitive. LSV-15 alone obtains its six/4,000 runtime caps
  from `config/ziwei-comprehensive-report-quality.v1.json`, applies them to
  report packs, and keeps the report resolver inactive until its later
  activation gate.
- Add no ReadingContext field to retrieval input, storage, queries, or
  provenance.

**Focused commands**

```text
corepack pnpm@11.25.0 --filter @lasoviet/backend build
corepack pnpm@11.25.0 vitest run packages/backend/src/knowledge/knowledge-retrieval.service.test.ts
```

### [ ] Slice 16E: Side-by-side provisioning

**Owned files**

- Modify `apps/worker/src/reports/provision-report-knowledge.ts`
- Modify `apps/worker/src/reports/provision-report-knowledge.test.ts`
- Create `apps/worker/src/reports/provision-report-knowledge.v4.test.ts`

**Behavior and acceptance**

- Preserve legacy invocation without V4: validate V3 and English first, then
  ingest those two manifests as today.
- Once V4 is supplied/configured, validate V3, English, and V4 before any
  ingestion. Draft, rejected, hash-changed, boundary-invalid, or failed V4
  validation aborts the complete invocation with zero ingestion calls; do not
  silently skip V4 or ingest only V3/English.
- V3 replay proves deep immutable reuse before and after V4 provisioning.
- No production invocation, environment change, or resolver update is part of
  this slice.

**Focused commands**

```text
corepack pnpm@11.25.0 --filter @lasoviet/worker build
corepack pnpm@11.25.0 vitest run apps/worker/src/reports/provision-report-knowledge.test.ts apps/worker/src/reports/provision-report-knowledge.v4.test.ts
```

### [ ] Slice 16F: Founder sample, final manifest freeze, and LSV-15 handoff

**Owned files**

- Create `scripts/select-ziwei-knowledge-v4-sample.mjs`
- Create `scripts/select-ziwei-knowledge-v4-sample.test.mjs`
- Create
  `docs/superpowers/reports/YYYY-MM-DD-lsv-16-v4-sample-50-<candidate-hash-prefix>.md`
- Create `content/knowledge/vi/ziwei/comprehensive-report.v4.json`

**Behavior and acceptance**

- Generate and retain the deterministic sample artifact while the exact draft
  inputs remain at
  `content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.candidate.json`,
  `content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.disposition-ledger.json`,
  and
  `content/knowledge/vi/ziwei/v4-candidate/comprehensive-report.v4.validation.json`.
- On explicit founder approval only, finalization verifies the candidate,
  ledger, validation-report, validation-policy, assembler, content, and
  sample-artifact hashes. It writes exactly
  `content/knowledge/vi/ziwei/comprehensive-report.v4.json`, changing only
  the approval and `sourcePath` envelope fields from the canonical draft
  candidate before revalidation. A rejected sample requires a new
  candidate/sample identity.
- Handoff records only the exact V4 knowledge version and retrieval primitive
  compatibility for LSV-15. LSV-15 owns and supplies its six/4,000 runtime
  cap mapping. LSV-16 does not switch the resolver or alter a reservation.

**Focused commands**

```text
node scripts/select-ziwei-knowledge-v4-sample.mjs --check
node --test scripts/select-ziwei-knowledge-v4-sample.test.mjs
node scripts/validate-ziwei-knowledge-v4.mjs --manifest content/knowledge/vi/ziwei/comprehensive-report.v4.json
```

### [ ] Slice 16G: Integration handoff and milestone verification

**Owned files**

- No shared LSV-15/17 implementation file is owned until the integration
  order in section 8 is met.
- Create `docs/superpowers/reports/2026-09-15-lsv-16-v4-verification.md`

**Behavior and acceptance**

- Execute the matrix in section 9 against the integrated target.
- Hand LSV-15 the frozen V4 knowledge-version and retrieval-primitive
  compatibility evidence; LSV-15 alone owns report-quality cap configuration,
  report-generation resolver integration, and runtime cap application.
- Terra high independently reviews the complete LSV-16 implementation
  milestone. Corrections are narrowly assigned and re-reviewed.

## 7. Migration, Deployment, and Rollback Sequencing

1. During planning, do not rebase worktrees or reserve a migration number. At
   implementation, integrate approved prerequisite branches into the target,
   read `packages/database/drizzle/meta/_journal.json`, then allocate one
   unused next number and update its journal/snapshot artifacts as required by
   the reviewed local Drizzle workflow.
2. Add the provenance schema as an additive migration. Do not backfill,
   relabel, or update V3 rows.
3. Deploy code that understands V1/V2 manifests and explicit V3/V4 retrieval
   but continues to select V3 for new reservations.
4. After the founder-approved frozen manifest exists, provision V4 beside V3
   in an authorized non-production environment and prove idempotency.
5. Merge/report activation is a later LSV-15 operation. It requires V4
   provisioning evidence, LSV-15 and LSV-17 integration completion, Terra
   milestone review, all founder gates in LSV-15, and An's explicit deployment
   and resolver-switch authorization.
6. Roll back an activation by selecting the legacy version only for new
   reservations. Never delete V4, mutate V3, or rewrite any pinned
   reservation/report. Schema rollback is not required for this application
   rollback.

## 8. Cross-Ticket Ownership and Integration Order

| Area | LSV-16 owns | LSV-15 owns | LSV-17 owns |
|---|---|---|---|
| Corpus | V4 editorial records, manifest, provenance edges, validation, immutable ingestion, V4 retrieval primitive | Consumes the frozen V4 version and applies its own canonical runtime caps | None |
| Report generation | No section writer, report source, generation service, or resolver activation | Sectioned generation and shared report integration, especially `comprehensive-report-retrieval.ts`, `identity-report-config.ts`, and report-generation paths | Lifecycle fence integration after LSV-15 |
| Reading context | Must not consume, persist, query, or place it in provenance | May use enum-only context only after LSV-17 handoff | `ReadingContextV1`, persistence, privacy/lifecycle fences |
| Immutable lineage | Knowledge version/provenance only | Report/config/prompt/reservation lineage | Context revision freeze and lifecycle validity |

LSV-16 first supplies a reviewed retrieval primitive and frozen V4 version
compatibility evidence; LSV-15 then changes `comprehensive-report-retrieval.ts`,
`identity-report-config.ts`, and report-generation paths on the latest merged
target. LSV-16 does not duplicate LSV-15's sectioned-generator, shared report
integration, or resolver refactor. LSV-17's Slice 17D follows LSV-15
integration and adds its lifecycle fence without changing corpus records.
Corpus/retrieval must neither consume nor persist ReadingContext.

Integration order:

1. Complete and review LSV-16 contracts, persistence, corpus, and inactive
   retrieval/provisioning.
2. Complete and review LSV-15's sectioned generation and its V4 retrieval
   handoff integration on the merged target.
3. Complete LSV-17's report lifecycle-fence integration after LSV-15 shared
   paths settle.
4. Run cross-ticket regression, founder sample evidence, and the later
   activation gates. No duplicate refactor of a file already owned by the
   preceding integration slice.

## 9. Verification Matrix

| Area | Required evidence |
|---|---|
| Config and schemas | Strict V2 schema and corpus-validation-config unit tests; NFC-equivalent duplicate rejection; structured exemption positive/negative behavior; no report-quality ID or retrieval-cap field allowed. |
| Database migration | Fresh database and upgrade-from-current-target migration tests; V3 rows remain without provenance edges; V4 additive provenance-edge persistence and constraints. |
| Ingestion | Draft rejection, approval transition, immutable replay, changed replay failure, V3 non-mutation, path/symlink escape rejection, concurrent same-candidate idempotency. |
| Retrieval | V3 regression; V4 FTS/filtering; metadata-first ranking; deterministic tie-breaks; duplicate filtering; explicit caller-supplied validated caps. LSV-15 separately verifies its sole runtime `retrievalMaxPassages=6` and `retrievalMaxChars=4000` configuration. |
| Corpus | Full validation report; all 3,258 ledger records; provenance referential/reverse coverage; no Han/death/discouraged/oral filler; warning grammar; duplicate detection; reproducible assembly. |
| Provisioning | Side-by-side V3/V4 validation and ingestion; all-or-nothing validation with zero ingestion when a configured V4 manifest is invalid; V3 deep-reuse regression. |
| Reservations | Characterization tests that V3 and V4 version identifiers remain pinned and no activation/rollback mutates prior reservations or reports. |
| Founder gate | Candidate-hash-seeded sample of exactly 50 with coverage report, reviewer artifact hash, explicit Kaneo approval, and frozen manifest evidence. |
| Milestone | Producer builds in dependency order, focused checks per slice, full relevant test suites, `git diff --check`, Terra high plan review before implementation, and a separate Terra high implementation milestone review later. |

Runtime-clock tests use injected/frozen clocks. Text-file assertions normalize
CRLF/LF before line-oriented checks. Public-content validation reports must
remain repository-root bounded and locale-safe.

## 10. Acceptance Criteria

- [ ] An explicitly approves this technical plan before implementation.
- [ ] V3 corpus, source registry, database rows, reservations, and report
  lineage remain immutable.
- [ ] V4 has a strict versioned record/manifest/provenance design and
  deterministic canonical assembly.
- [ ] Every V3 passage ID has referentially valid provenance or one allowed
  closed disposition.
- [ ] Whole-corpus validation satisfies every gate in section 4.
- [ ] V4 retrieval is explicit, Vietnamese FTS-capable, deterministic, and
  accepts only caller-supplied validated caps; LSV-15 retains sole ownership of
  its six/4,000 runtime configuration.
- [ ] V3 and V4 provision side-by-side with no implicit resolver switch.
- [ ] Founder receives exactly 50 deterministic Vietnamese samples tied to the
  candidate hash; V4 remains draft until explicit Kaneo approval.
- [ ] LSV-15 receives only the exact version/retrieval-primitive handoff;
  LSV-17 remains independent and ReadingContext-free at the corpus boundary.
- [ ] Terra high independently approves the plan, then later independently
  reviews the implementation milestone.

## 11. Unresolved Questions

1. **Technical owner An:** explicit technical-plan approval is required before
   implementation. No business decision remains open for this planning scope:
   the editorial ruleset, warning boundary, and founder sample gate are
   approved. A later founder approval is required only for the concrete
   candidate sample.
