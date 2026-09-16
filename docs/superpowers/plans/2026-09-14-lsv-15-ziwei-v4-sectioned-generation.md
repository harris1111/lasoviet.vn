# LSV-15 Zi Wei V4 Sectioned Generation and Quality Gates Implementation Plan

**Date:** 2026-09-14
**Status:** Planning milestone only. Product decisions FD-072, FD-073, FD-076, and
FD-077 are approved. Implementation requires An's explicit technical approval
of this plan. Paid-order activation additionally requires the founder to approve
three generated reports and the FD-082 gate of 20 consecutive successful V4
generations. A founder scope decision on the deferred V4.1 birth-time
sensitivity presentation is also required before sectioned paid activation.

## 1. Scope and binding sources

This plan covers the remaining LSV-15 work on top of
`origin/product/experience-spec-v1` commit `ca15ea3`.

Binding sources:

- `AGENTS.md`
- `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`
- `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md`
- `docs/superpowers/specs/2026-09-13-ziwei-knowledge-editorial-ruleset.md`
- LSV-11 AI usage/cost implementation merged through PR 57
- LSV-29 bounded V4 recovery and validator corrections merged through PR 60

No product code, prompt, validator, migration, dependency, or runtime change is
authorized by this planning milestone.

## 2. Verified baseline and LSV-29 conflict map

### 2.1 Baseline facts

- Vietnamese paid orders currently resolve to report family V4 while retaining
  knowledge version `ziwei.comprehensive.knowledge.v3`.
- V4 still makes one `generateStructured` call with a 9,000-token output cap.
- The customer contract remains `ZiweiComprehensiveReportContentV2`.
- `report_reservations` stores immutable version lineage and one durable
  report-level rewrite-consumption timestamp.
- `report_versions` is immutable and is committed only after generation,
  validation, HTML rendering, queue fencing, and entitlement checks.
- LSV-11 records every provider attempt and supports the purposes `report`,
  `critic`, `rewrite`, and `free_preview`.
- LSV-16 and LSV-17 are both currently `to-do` in Kaneo.

### 2.2 LSV-29 work that LSV-15 must not repeat

LSV-29 already changed:

- `packages/backend/src/reports/comprehensive-report-critic-v4.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-validator-v4.ts`
- `packages/backend/src/reports/comprehensive-report-validator-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-writer-v4.ts`
- `packages/backend/src/reports/comprehensive-report-writer-v4.test.ts`
- `packages/backend/src/reports/report-generation.service.ts`
- `packages/backend/src/reports/report-generation.service.test.ts`
- `packages/backend/src/reports/report.service.ts`
- `packages/backend/src/reports/report.service.test.ts`

The following behavior is accepted baseline and is excluded from reimplementation:

- one durable whole-report rewrite after validator or critic rejection;
- terminal recovery for `AI_OUTPUT_INVALID` and `REPORT_SAFETY_REJECTED`;
- Unicode-aware disclaimer, methodology, fatalistic, and identifier checks;
- natural doctor/lawyer/professional referrals allowed under FD-082;
- standalone disclaimer labels rejected;
- death/lifespan terms and certainty-independent inevitability rejected;
- raw `ziwei.*` identifiers sanitized without changing `evidenceKeys`;
- practical-action and no-major-star repetition false positives corrected;
- writer, critic, and rewrite calls linked to the LSV-11 cost context.

LSV-15 may touch some of the same files only to route the new sectioned report
configuration. Characterization tests must preserve every accepted LSV-29 case.
The legacy V4 path remains available for reservations pinned to the existing
prompt and report-config versions.

### 2.3 Remaining decision coverage

| Decision | Complete at `ca15ea3` | Remaining LSV-15 work |
|---|---|---|
| FD-072 | `lasoviet.net`, exact allowed evidence keys, FD-082 referral wording | Restore no reflective questions, no calculation/retrieval narration, no repeated advice, no unsupported events/dates, no invented chart facts/identifiers, and the complete locale/brightness block |
| FD-077 | Han/brightness/repetition checks, death/fatalistic boundary, one bounded whole-report rewrite and recovery | Versioned quality config, syllable thresholds, discouraged terms, proper-name density, preparation framing, date boundary, chart anchoring, section-addressed critic findings, and section-only rewrites |
| FD-073 | No sectioned generation or checkpoint persistence exists | Per-section calls, deterministic context digest, checkpoint persistence, resume, bounded retries, assembly, and no regeneration of passed sections |
| FD-076 | Current prompt still uses the high-expert/professional register | Everyday Vietnamese section prompts, four-step claims, ruleset few-shot example, first-use explanations, and optional ReadingContext use |

## 3. Technical approach

### 3.1 Preserve immutable version lineage

Do not change the meaning of the existing:

- `ziwei.comprehensive.prompt.v4`
- `ziwei.comprehensive.report.v4`
- `ziwei.comprehensive.knowledge.v3`

Add new immutable prompt, report-config, and quality-config identifiers for the
restored/sectioned implementation. The proposed literals are:

- `ziwei.comprehensive.prompt.v4.0.1` for the FD-072 legacy-generator patch
- `ziwei.comprehensive.prompt.v4.1`
- `ziwei.comprehensive.report.v4.1-sectioned`
- `ziwei.comprehensive.quality.v1`

An's plan approval must confirm these technical version literals. Existing
reservations continue on their pinned versions. No historical report or source
snapshot is rewritten.

`reportConfigVersion` is the durable quality-lineage pin. Define a closed,
one-to-one mapping:

- `ziwei.comprehensive.report.v4.1-sectioned`
  -> `ziwei.comprehensive.quality.v1`

The mapping is resolved before the first provider call and is repeated in every
section checkpoint. Recovery and replay must reject a missing or different
mapping. The immutable final report already persists `reportConfigVersion`, so
the quality version remains derivable without changing the public job or report
contract. Any quality-config change requires a new report-config version; a
report-config version can never be remapped.

### 3.2 Keep the customer contract unchanged

Each generation unit returns an internal section value. A deterministic
assembler produces the existing `ZiweiComprehensiveReportContentV2` shape and
then runs the existing final validator and renderer. No new field is exposed to
the customer within the current LSV-15 scope.

There is a binding source conflict that LSV-15 must not resolve silently:

- the original FD-058 V4 plan requires a three-frame
  `birthTimeSensitivity` customer section;
- the founder's later Kaneo #3 decision intentionally removed that section from
  the active V4 customer contract and deferred it to V4.1;
- current LSV-15 scope assigns FD-072, FD-073, FD-076, and FD-077 backend
  generation/quality work, but does not assign the sensitivity customer
  contract, report reader, PDF, entitlement scope, or UI artifact.

LSV-15 therefore preserves the live contract during its bounded implementation
and treats sensitivity completion as an explicit dependency before sectioned
paid activation. Lãm must decide whether the deferred sensitivity presentation
is included in this V4.1 release or moved to a separately named later release.
If included, it requires a separately approved plan/slice and the dedicated UI
artifact workflow; it must not be invented in this backend planning branch.

Closed section keys:

- `overview`
- `coreAxis`
- `keyConfigurations`
- `palace:<ZiweiPalaceId>` for all 12 palaces
- `thematic:<ZiweiThematicSynthesisId>` for all four themes
- `strengthsAndTensions`
- `currentDecadal`
- `annualSnapshot`
- `practicalDirection`

`keyConfigurations` is one call for all items. `practicalDirection` is one call
for all three to five actions, matching FD-073.

### 3.3 Versioned quality and generation configuration

Add a founder-editable JSON source with a typed loader. It contains:

- the quality-config version;
- minimum syllables and target ranges by section kind;
- maximum output tokens by section kind;
- discouraged Sino-Vietnamese terms from ruleset section 3.3;
- death/lifespan and deterministic-language terms;
- allowed proper-name vocabulary and density limit;
- misfortune terms, certainty phrases, adverse-date patterns, and preparation
  indicators;
- minimum chart anchors;
- generation retry and rewrite caps;
- bounded digest and retrieval limits.

The loader must reject duplicate terms after NFC/case normalization, invalid
thresholds, unknown section keys, empty lists, or an unrecognized version.
It must also enforce the immutable one-to-one report-config/quality-config
mapping described in section 3.1.
LSV-29 regex behavior remains locked by its current regression tests. The new
section gate uses the versioned lists before assembly; the existing final
validator remains defense in depth.

### 3.4 Durable section checkpoints

Add one report-section checkpoint table. The planned migration is
`0028_report_section_checkpoints.sql`, after LSV-12 takes the next migration
number (`0027`). Before implementation, integrate the latest target and
regenerate/rename to the actual next number if that sequence changed.

Checkpoint identity is `(report_version_id, section_key)`. Each row records:

- pinned prompt, knowledge, report-config, and quality-config versions;
- section order and state version;
- status (`pending`, `generating`, `passed`, or `terminal_failure`);
- generation and rewrite attempt counts;
- active job/worker ownership for queue-lease fencing;
- schema-valid section content and SHA-256 content hash only after it passes;
- provider/model lineage for the accepted section;
- bounded failure code and timestamps.

Repository rules:

- passed content is immutable;
- a retry reads and reuses every passed checkpoint;
- claiming an unfinished section is compare-and-set and fenced by the current
  queue job lease;
- the allowed attempt/rewrite count is reserved durably before a provider call;
- an expired worker cannot overwrite a passed section;
- matching replay returns the existing checkpoint;
- mismatched version lineage or content returns `REPORT_VERSION_CONFLICT`;
- final `report_versions` commit remains the existing atomic completion point.

A provider call that finishes immediately before a process crash may be called
again because no passed checkpoint exists. LSV-11 records both attempts. The
customer is not charged again, and any already-passed section is never called
again.

### 3.5 Generation order and context

1. Generate `overview`.
2. Generate `coreAxis`.
3. Generate `keyConfigurations` as one checkpointed call for all items.
4. Build a deterministic bounded digest containing accepted headline claims,
   evidence keys, and advice already used.
5. Generate the 12 palace sections with bounded concurrency.
6. Rebuild the digest from all passed palace checkpoints.
7. Generate the four thematic sections with bounded concurrency. Every theme
   receives the passed palace digest required by the binding spec.
8. Generate `strengthsAndTensions`, `currentDecadal`, `annualSnapshot`, and
   `practicalDirection` using the accepted earlier-section digest.
9. Assemble the V2 customer contract in canonical order.
10. Run the final deterministic validator.
11. Run the retained V4 critic once on the assembled report.
12. If the critic returns section-addressed quality findings, rewrite only those
   sections whose durable rewrite budget remains, reassemble, revalidate, and
   run one final critic pass.
13. Commit the immutable report version and continue the existing PDF and
    notification workflow.

The critic schema must return bounded findings with a closed section key and a
bounded note. An unaddressed low critic score cannot trigger a whole-report
rewrite on the sectioned configuration; it terminal-fails into the existing
recovery path.

### 3.6 Cost and idempotency

Every provider request uses the merged LSV-11 wrapper and a deterministic
per-call cost-context idempotency key derived from:

`reportVersionId + sectionKey + generation-or-rewrite + ordinal + critic-pass`

Purposes:

- initial paid section: `report`;
- failed-section rewrite: `rewrite`;
- assembled critic calls: `critic`;
- later FD-068 preview use: `free_preview`.

The sectioned generator never creates an order, entitlement, Lá spend, or
second report reservation. Existing commerce/reservation idempotency remains
the customer no-double-charge boundary.

### 3.7 Activation gate instead of a new runtime flag

Use the existing immutable report-version resolver as the activation switch:

- Slice 1 may be merged and deployed inactive after review;
- after 20 consecutive successful V4 generations using prompt `v4.0.1`, An may
  separately authorize new paid reservations to use that prompt with the
  existing legacy report config and knowledge V3; the binding spec permits this
  FD-072 patch before the larger sectioned generator, so the separate founder
  three-report gate does not apply to this legacy-generator prompt-only switch;
- implement and test `v4SectionedReportVersions()` without changing
  the current report config to sectioned;
- generate samples by injecting the sectioned resolver in an approved
  non-production/staging path;
- keep paid new orders on a legacy one-call V4 configuration until
  dependencies, checks, Terra review, and founder acceptance are complete;
- after 20 consecutive successful sectioned V4 generations, founder approval
  of three reports, resolution and completion of the deferred
  `birthTimeSensitivity` release dependency, and An's activation authorization,
  change only the current Vietnamese version selection to the sectioned
  configuration;
- rollback affects only new reservations by selecting legacy V4 again; pinned
  sectioned reservations continue on their recorded versions.

No new environment variable or dependency is proposed.

## 4. Bounded implementation slices

Each slice requires an exact Sol brief and Flash Executor implementation after
An approves this plan.

### Slice 1: FD-072 prompt restoration

May start before LSV-16, LSV-17, or founder sample approval.

Owned files:

- `packages/backend/src/reports/comprehensive-report-writer-v4.ts`
- `packages/backend/src/reports/comprehensive-report-writer-v4.test.ts`
- `packages/backend/src/reports/identity-report-config.ts`
- `packages/backend/src/reports/identity-report-config.test.ts`
- `packages/backend/src/reports/identity-report-version-family.ts`
- `packages/backend/src/reports/identity-report-version-family.test.ts`

Behavior:

- add prompt version `ziwei.comprehensive.prompt.v4.0.1` while preserving
  `ziwei.comprehensive.prompt.v4`;
- restore every missing FD-072 rule;
- retain `lasoviet.net`, FD-082 referral advice, strict evidence-key copying,
  existing V2 shape, and frozen timing;
- do not add FD-076 examples or ReadingContext yet.

Acceptance:

- prompt tests assert every restored rule and reject the dropped wording;
- both legacy V4 and the new prompt version resolve to family V4;
- old version selection is unchanged;
- all LSV-29 writer tests remain green;
- no paid version switch occurs until 20 consecutive successful V4 generations
  using the exact new prompt version are recorded.

Focused checks:

```text
pnpm vitest run packages/backend/src/reports/comprehensive-report-writer-v4.test.ts
pnpm vitest run packages/backend/src/reports/identity-report-config.test.ts
pnpm vitest run packages/backend/src/reports/identity-report-version-family.test.ts
```

### Slice 2: FD-077 versioned deterministic section gates

May start before LSV-16, LSV-17, or founder sample approval.

Owned files:

- `config/ziwei-comprehensive-report-quality.v1.json`
- `packages/config/src/ziwei-report-quality.ts`
- `packages/config/src/ziwei-report-quality.test.ts`
- `packages/config/src/index.ts`
- `packages/backend/src/reports/comprehensive-report-quality-v4.ts`
- `packages/backend/src/reports/comprehensive-report-quality-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-validator-v4.ts`
- `packages/backend/src/reports/comprehensive-report-validator-v4.test.ts`

Behavior:

- count whitespace-separated Vietnamese syllables after the existing prose
  normalizer;
- perform whole-word, case-insensitive, NFC term matching;
- enforce every deterministic FD-077 threshold per section;
- validate at least two actual palace stars, or the true no-major-star state;
- require at least two evidence-backed chart facts in non-palace sections;
- preserve every LSV-29 pass/fail case and the final full-report gate;
- provide section-keyed bounded findings suitable for a section rewrite.

Acceptance:

- config loader rejects malformed and normalization-equivalent duplicates;
- config tests prove that each report-config version maps to exactly one
  immutable quality-config version and that unknown/remapped pairs fail closed;
- table-driven tests cover every ruleset term and section threshold;
- no discouraged/death term, Han ideograph, English brightness term, certain
  adverse outcome, or explicit adverse day/month can pass;
- a qualifying warning contains at least two concrete preparation indicators;
- proper-name density is at most eight per 100 syllables;
- current LSV-29 professional-referral and false-positive cases still pass.

Focused checks:

```text
pnpm --filter @lasoviet/contracts build
pnpm --filter @lasoviet/config build
pnpm vitest run packages/config/src/ziwei-report-quality.test.ts
pnpm vitest run packages/backend/src/reports/comprehensive-report-quality-v4.test.ts
pnpm vitest run packages/backend/src/reports/comprehensive-report-validator-v4.test.ts
```

### Slice 3: FD-073 checkpoint schema and repository

May start before LSV-16, LSV-17, or founder sample approval. It must integrate
after LSV-12's migration ordering is stable.

Owned files:

- `packages/database/src/schema/reports.ts`
- `packages/database/src/index.ts`
- `packages/database/drizzle/0028_report_section_checkpoints.sql`
- `packages/database/drizzle/meta/_journal.json`
- `packages/database/src/schema/report-generation-migration-layout.test.ts`
- `packages/database/src/schema/schema.integration.test.ts`
- `packages/backend/src/reports/report-section-checkpoint.repository.ts`
- `packages/backend/src/reports/report-section-checkpoint.repository.test.ts`

Behavior:

- add the checkpoint model and compare-and-set repository operations described
  in section 3.4;
- preserve all existing report, attempt, queue, and immutable-version rows;
- do not backfill old reports;
- do not modify commerce or AI usage tables.

Acceptance:

- clean-database migration and upgrade-from-current migration both pass;
- duplicate claims cannot exceed the configured attempt/rewrite cap;
- passed rows replay without update or provider work;
- stale leases cannot overwrite or terminal-fail a current checkpoint;
- lineage mismatch returns conflict;
- checkpoint deletion is not part of normal retry or recovery behavior.

Focused checks:

```text
pnpm --filter @lasoviet/contracts build
pnpm --filter @lasoviet/database build
pnpm --filter @lasoviet/backend build
pnpm vitest run packages/database/src/schema/report-generation-migration-layout.test.ts
pnpm vitest run packages/database/src/schema/schema.integration.test.ts
pnpm vitest run packages/backend/src/reports/report-section-checkpoint.repository.test.ts
```

### Slice 4: FD-073 internal section writer, assembler, and orchestration

May start with test providers and V3 knowledge packs before LSV-16, LSV-17, or
founder sample approval. It must remain inactive for paid orders.

Owned files:

- `packages/backend/src/reports/comprehensive-report-section-v4.ts`
- `packages/backend/src/reports/comprehensive-report-section-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts`
- `packages/backend/src/reports/comprehensive-report-section-writer-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-section-digest-v4.ts`
- `packages/backend/src/reports/comprehensive-report-section-digest-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-assembler-v4.ts`
- `packages/backend/src/reports/comprehensive-report-assembler-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`
- `packages/backend/src/reports/identity-report-config.ts`
- `packages/backend/src/reports/identity-report-config.test.ts`
- `packages/backend/src/reports/identity-report-version-family.ts`
- `packages/backend/src/reports/identity-report-version-family.test.ts`
- `packages/backend/src/reports/report.service.ts`
- `packages/backend/src/reports/report.service.test.ts`
- `packages/backend/src/reports/report-generation.service.ts`
- `packages/backend/src/reports/report-generation.service.test.ts`
- `apps/worker/src/processors/report-generate.processor.ts`
- `apps/worker/src/processors/report-generate.processor.test.ts`

Behavior:

- implement the closed section registry, per-section schema, call budgets,
  deterministic digest, canonical assembly, and checkpoint resume;
- keep provider concurrency bounded by configuration;
- send only the section's required facts, evidence keys, knowledge pack, prior
  digest, and optional ReadingContext;
- preserve frozen timing and final V2 validation/rendering;
- keep the legacy one-call V4 route selected for existing report config;
- emit section-addressed critic findings for section-only rewrites;
- use LSV-11 purposes and deterministic per-call cost context;
- extend the queue store with compare-and-set lease renewal for the same
  `jobId` and `workerId`;
- renew the 10-minute queue lease at a bounded interval while section
  generation is active, stop renewal when the processor finishes, and stop
  starting provider calls/checkpoint writes after renewal failure;
- enforce a versioned maximum report wall-clock duration so a worker cannot
  renew indefinitely; lease loss or wall-clock exhaustion leaves passed
  checkpoints reusable and prevents the stale worker from final commit.

Acceptance:

- exactly the expected section calls occur in canonical dependency order;
- `keyConfigurations` is exactly one durable call, participates in the digest,
  resumes from its passed checkpoint, and is never regenerated after passing;
- already-passed sections cause zero provider calls after restart;
- killing the worker after a passed section resumes at the next unfinished
  section;
- validator failure rewrites only the failing section within its durable cap;
- critic findings rewrite only named sections;
- final assembly is byte-stable for the same accepted checkpoints;
- no commerce write or second entitlement/report reservation occurs;
- every provider call, retry, rewrite, error, and critic call has a usage row;
- fake-clock tests cover renewal before expiry, expiry during a provider call,
  renewal failure, wall-clock exhaustion, timer cleanup, stale-worker
  non-overwrite, and successful final commit under a live renewed lease.

Focused checks:

```text
pnpm vitest run packages/backend/src/reports/comprehensive-report-section-v4.test.ts
pnpm vitest run packages/backend/src/reports/comprehensive-report-section-writer-v4.test.ts
pnpm vitest run packages/backend/src/reports/comprehensive-report-section-digest-v4.test.ts
pnpm vitest run packages/backend/src/reports/comprehensive-report-assembler-v4.test.ts
pnpm vitest run packages/backend/src/reports/comprehensive-report-critic-v4.test.ts
pnpm vitest run packages/backend/src/reports/report.service.test.ts
pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts
pnpm vitest run apps/worker/src/processors/report-generate.processor.test.ts
```

### Slice 5: FD-076 everyday Vietnamese prompts

May start after slices 1, 2, and 4, before LSV-16 or LSV-17. Full acceptance
waits for both dependencies.

Owned files:

- `packages/backend/src/reports/comprehensive-report-section-prompt-v4.ts`
- `packages/backend/src/reports/comprehensive-report-section-prompt-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-section-writer-v4.ts`
- `packages/backend/src/reports/comprehensive-report-section-writer-v4.test.ts`

Behavior:

- add prompt version `ziwei.comprehensive.prompt.v4.1` for the sectioned
  generator without changing the text of prompt `v4.0.1`;
- remove the high-expert/professional register;
- use the approved ruleset's bad/good pair as the few-shot anchor;
- require real chart detail, two-sided observation, concrete everyday
  situation, and one actionable suggestion for each claim;
- explain allowed proper names on first use in each section;
- follow FD-075 warning framing and FD-082 referral guidance;
- accept optional enum-only ReadingContext without repeating it as a chart fact.

Acceptance:

- prompt characterization tests contain every FD-076 rule;
- prompt payload contains no free-text context or raw personal data;
- output remains bound to allowed evidence keys and section facts;
- the deterministic quality gate, not prompt wording alone, enforces delivery.

Focused checks:

```text
pnpm vitest run packages/backend/src/reports/comprehensive-report-section-prompt-v4.test.ts
pnpm vitest run packages/backend/src/reports/comprehensive-report-section-writer-v4.test.ts
```

### Slice 6: LSV-16 corpus and LSV-17 ReadingContext integration

Must wait for the reviewed LSV-16 and LSV-17 contracts/data to be merged. LSV-15
must consume those outputs and must not recreate either ticket.

Owned LSV-15 integration files:

- `packages/backend/src/reports/report-source.ts`
- `packages/backend/src/reports/report-generation.repository.ts`
- `packages/backend/src/reports/report-generation.repository.test.ts`
- `packages/backend/src/reports/comprehensive-report-retrieval.ts`
- `packages/backend/src/reports/comprehensive-report-retrieval.test.ts`
- `packages/backend/src/reports/identity-report-config.ts`
- `packages/backend/src/reports/identity-report-config.test.ts`
- `packages/backend/src/reports/report-generation.service.test.ts`

Behavior:

- consume `ReadingContextV1` from LSV-17 as optional enum codes only;
- never add ReadingContext to chart facts, evidence keys, calculation hashes,
  or prices;
- send only its enum codes to the configured AI provider; do not send it to any
  other third-party tool or service;
- select V4 knowledge and the approved retrieval caps only after LSV-16 exists;
- keep the generator callable with absent context;
- expose the same section-generator boundary for later FD-068 preview wiring;
- do not implement the wizard, context persistence lifecycle, corpus builder,
  corpus content, or public preview surface.

Acceptance:

- the same fixture chart with different ReadingContext codes changes only
  examples/emphasis, while facts and evidence keys remain identical;
- skipped context remains valid;
- V4 corpus retrieval returns section-relevant Vietnamese passages under the
  versioned cap;
- LSV-16 provenance and locale-integrity validation remain intact;
- provider payload tests contain enum codes only, with no label or free text;
- no ReadingContext reaches a third-party tool other than the configured AI
  provider explicitly allowed by FD-078.

Focused checks:

```text
pnpm vitest run packages/backend/src/reports/report-generation.repository.test.ts
pnpm vitest run packages/backend/src/reports/comprehensive-report-retrieval.test.ts
pnpm vitest run packages/backend/src/reports/identity-report-config.test.ts
pnpm vitest run packages/backend/src/reports/report-generation.service.test.ts
```

### Slice 7: sample evidence and paid activation

Must wait for all prior slices, LSV-16, LSV-17, Terra milestone approval, and
an approved non-production provider environment.

Implementation evidence:

- generate founder-review reports from frozen fixture IDs
  `solar-lunar-conversion`, `leap-lunar-month`, and `timezone-difference` in
  `packages/test-fixtures/ziwei/p0-fixtures.json`;
- write redacted, non-Git acceptance artifacts containing one HTML report per
  fixture plus a manifest with fixture ID, content hash, prompt/report/quality/
  knowledge versions, gate result, provider/model lineage, and usage summary;
- record report/prompt/quality/knowledge versions and LSV-11 usage summaries;
- verify every section passes deterministic gates without manual edits;
- verify every palace has at least 450 syllables;
- verify restart/resume and no-double-charge evidence;
- record 20 consecutive successful sectioned V4 generations with zero manual
  edits and no terminal failure;
- provide the three readable reports to the founder for acceptance.

Activation is blocked until:

- the founder explicitly approves all three reports;
- the FD-082 20-consecutive-generation gate passes for the exact sectioned
  prompt/report/quality/knowledge version set;
- Lãm resolves the V4.1 `birthTimeSensitivity` scope conflict and any required
  separately approved contract/reader/UI dependency is complete;
- An authorizes the version-resolver switch and deployment;
- the target environment has the approved LSV-16 corpus;
- deployment smoke confirms section checkpoints, usage capture, report
  completion, PDF, notification, and customer query behavior.

Only after those gates may `currentReportVersions("vi")` select the sectioned
configuration for new paid reservations.

## 5. Producer build order and verification

Whenever a changed workspace package is consumed through package exports, build
producers from current source before dependent typechecks:

1. `@lasoviet/contracts`
2. `@lasoviet/config`
3. `@lasoviet/database`
4. `@lasoviet/backend`
5. `@lasoviet/api` and `@lasoviet/worker` if runtime wiring changes
6. `@lasoviet/web` only for final unchanged-contract compatibility checks

Full milestone checks:

```text
corepack pnpm@11.25.0 --filter @lasoviet/contracts build
corepack pnpm@11.25.0 --filter @lasoviet/config build
corepack pnpm@11.25.0 --filter @lasoviet/database build
corepack pnpm@11.25.0 --filter @lasoviet/backend build
corepack pnpm@11.25.0 run lint
corepack pnpm@11.25.0 run typecheck
corepack pnpm@11.25.0 run build
corepack pnpm@11.25.0 run test
corepack pnpm@11.25.0 run content:check
corepack pnpm@11.25.0 run i18n:check
git diff --check
```

Migration verification must cover both a clean database and upgrade from the
latest integrated schema. Runtime-clock tests must use an injected/frozen clock.
Text-fixture assertions must normalize CRLF/LF.

## 6. Data and migration compatibility

- Migration is additive; no existing row is rewritten or backfilled.
- Existing V4 reservations and reports remain readable and complete on legacy
  code paths.
- New checkpoints are private operational state and are not returned by public
  report queries.
- `ZiweiComprehensiveReportContentV2` and existing HTML/PDF projections do not
  change within LSV-15. This does not cancel the open V4.1 sensitivity
  dependency.
- ReadingContext remains optional and separate from `BirthProfileV1`.
- Existing report-level rewrite consumption remains for legacy versions.
  Sectioned versions use per-section durable rewrite counts.
- Recovery never deletes immutable report output or a passed checkpoint.
- Schema rollback is not required for application rollback; selecting legacy
  versions stops new sectioned reservations while preserving additive tables.

## 7. Cross-ticket conflict map

### LSV-10

The live LSV-10 worktree currently has unresolved changes in
`packages/contracts/src/index.ts`, `packages/backend/src/index.ts`, the decision
tracker, API wiring, and new admin-business-metrics files.

LSV-15 has no semantic dependency on admin metrics and should avoid public
barrel exports unless required. A textual conflict is possible only if a later
LSV-15 slice must export new backend symbols through
`packages/backend/src/index.ts`. Integrate the reviewed LSV-10 branch first or
add the export after its conflict is resolved. Do not touch its decision-tracker
resolution.

### LSV-12

LSV-12 owns the migration immediately after `0026_ai_usage_and_cost.sql` and
currently has no stable committed diff in its worktree. LSV-15 must not create
another `0027` migration. Its planned checkpoint migration is `0028`, subject to
renumbering to the next available migration after target integration.

Expected textual overlap:

- `packages/database/drizzle/meta/_journal.json`
- possibly `packages/database/src/index.ts`

There is no expected semantic overlap between account-linked analytics and
report checkpoints. Migration ordering and journal validity require integration
and database verification before LSV-15 implementation review.

### LSV-14

The live LSV-14 worktree is planning/audit-only and currently changes only its
pre-existing dirty `AGENTS.md`. LSV-15 does not own `AGENTS.md`, UI, CSS, copy,
screenshots, or accessibility artifacts. No current file or semantic conflict
exists.

### LSV-29

LSV-29 is merged and is not an active implementation dependency. LSV-15 must
build on its behavior, retain its tests, and must not reopen its recovery or
validator decisions without new evidence and a narrowed review.

## 8. Exclusions

- No product UI, wizard UI, or visual interaction work.
- No implementation of LSV-16 corpus generation or editorial rewriting.
- No implementation of LSV-17 ReadingContext contract, persistence, retention,
  deletion, autosave, or UI.
- No `birthTimeSensitivity` customer contract, reader, PDF, entitlement, or UI
  implementation without the founder scope decision and a separately approved
  implementation slice.
- No FD-068 public preview activation, section-count decision, paywall, clipping,
  or secure-reveal UI; only a reusable internal section-generator boundary.
- No change to prices, Lá accounting, payment, entitlement creation, or order
  behavior.
- No new AI provider, model, dependency, vector database, GraphRAG, fine-tuning,
  or remote service.
- No production migration, deployment, provider call, DNS, payment, or external
  side effect during planning or unapproved implementation.
- No merge to `product/experience-spec-v1` or `master` without An's explicit
  authorization.

## 9. Approval and review gates

1. Terra independently reviews this plan against the binding sources and live
   `ca15ea3` baseline.
2. Sol adjudicates Terra findings and updates only this plan if needed.
3. An explicitly approves the technical implementation plan and version
   literals before any implementation slice starts.
4. Flash Executor implements bounded slices with named file ownership and
   focused checks.
5. Terra reviews the complete sectioned-generation milestone and any narrowed
   correction pass.
6. Lãm resolves the deferred V4.1 sensitivity scope and approves three generated
   reports before sectioned paid activation.
7. The exact activated version set passes the FD-082 gate of 20 consecutive
   successful V4 generations.
8. An separately authorizes merge, deployment, migration execution, and the
   paid-order version switch.

## 10. Unresolved questions

- Technical approval required from An: confirm the proposed immutable version
  literals and the additive checkpoint table design.
- Founder decision required from Lãm before sectioned paid activation: Kaneo #3
  deferred `birthTimeSensitivity` from active V4 to V4.1, but LSV-15 does not
  currently own its customer contract/reader/UI. Sol recommends keeping LSV-15
  bounded and creating a separate approved sensitivity-completion slice that
  must merge before sectioned paid activation, rather than silently broadening
  this backend ticket.
