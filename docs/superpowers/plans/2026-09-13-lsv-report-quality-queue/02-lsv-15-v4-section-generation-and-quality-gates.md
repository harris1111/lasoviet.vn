# LSV-15 V4 Section Generation and Quality Gates Plan

**Date:** 2026-09-13
**Status:** Planning only
**Dependency:** Starts after #29 is merged, deployed, and dispositioned

## Goal

Replace the fragile whole-report V4 generation path with a resumable
23-section pipeline, versioned deterministic quality gates, bounded per-section
rewrites, everyday Vietnamese prompts, and immutable assembly into the existing
`ziwei-comprehensive.v2` customer contract.

## Verified Facts

1. Current V4 makes one 9,000-token writer call for all report content.
2. Current report rows store only whole-attempt state and final immutable
   output; no passed-section persistence exists.
3. Current queue leases last 10 minutes and have no heartbeat/renew method.
4. Current V4 retrieval builds 19 packs on corpus V3, generally capped at two
   passages and 1,800 characters per pack.
5. Current V4 prompt omits FD-072 rules and still names `lasoviet.vn`.
6. The customer contract already supports the required sections and remains
   `ziwei-comprehensive.v2`.
7. The approved ruleset fixes the discouraged-term list and warning format.
8. The AI provider response currently has no usage metadata. LSV #11 owns that
   boundary and is required before paid-default activation.

## Assumptions

- PostgreSQL remains the durable state store.
- The existing report reservation, immutable report version, outbox, owner,
  entitlement, and notification boundaries remain authoritative.
- Sequential section generation is acceptable for the first release once lease
  renewal is implemented. Concurrency optimization is deferred.

## Recommendations

1. Introduce internal prompt/config generation version V5 while retaining
   customer content version V2. Legacy prompt V4 reservations keep the #29
   path; new V5 reservations use section generation.
2. Persist these 23 stable units:
   `overview`, `coreAxis`, `keyConfigurations`, 12 palace IDs, four theme IDs,
   `strengthsAndTensions`, `currentDecadal`, `annualSnapshot`, and
   `practicalDirection`.
3. Allow an initial call plus at most two rewrites per section. This is a
   technical cap, not a promise that below-gate content is delivered.
4. Store each passed section with input hash, output hash, prompt/config/
   knowledge versions, provider/model, attempt counters, and quality findings.
   Passed rows are reused only when all frozen identities match.
5. Renew and fence the queue lease before every provider call and after every
   passed-section commit. Lease loss stops further calls.
6. Run deterministic per-section gates before persistence. Run the adapted
   critic on the assembled report; section-scoped quality findings may rewrite
   named sections within remaining budgets, followed by final deterministic
   validation. A safety/correctness failure never bypasses review.
7. Keep the V5 path dormant until #11 telemetry, Terra review, and founder
   review of three samples are complete.

## Open Decisions

- No founder product decision is currently open for the planned behavior.
- Provider/model pricing and usage evidence come from LSV #11 and are not
  invented here.
- If the founder wants more than two rewrites per section, that changes the COGS
  envelope and must be approved before activation.

## Bounded Flash Executor Slices

### Slice 15A: FD-072 Prompt Restoration

**Owned files**

- `packages/backend/src/reports/comprehensive-report-writer-v4.ts`
- `packages/backend/src/reports/comprehensive-report-writer-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`

**Behavior and acceptance**

- Restore every FD-072 rule verbatim in behavior, use `lasoviet.net`, preserve
  the V2 JSON contract, and add prompt assertions.
- No runtime version switch.
- Focused writer and critic tests pass.

**Recovery boundary**

Stop on copy or rule conflicts with the approved ruleset.

### Slice 15B: Versioned Quality Configuration

**Owned files**

- Create `config/ziwei-report-quality-v1.json`
- Create `packages/config/src/ziwei-report-quality.ts`
- Create `packages/config/src/ziwei-report-quality.test.ts`
- Modify `packages/config/src/index.ts`
- Modify `packages/backend/src/reports/comprehensive-report-validator-v4.ts`
- Modify `packages/backend/src/reports/comprehensive-report-validator-v4.test.ts`

**Behavior and acceptance**

- Validate section budgets/minimum syllables, discouraged terms, death terms,
  proper-name density, certainty/adverse-date rules, Unicode/locale integrity,
  repetition, and chart anchoring.
- Export shared NFC/Unicode lexical checks for #16 without duplicating lists.
- Config is strict, versioned, repository-loaded, and founder-editable.
- Each failure has stable code and section key.
- Config and validator tests pass; `pnpm content:check` remains green.

**Recovery boundary**

Stop if a proposed lexical rule is absent from the signed ruleset.

### Slice 15C: Section Persistence and Lease Fencing

**Owned files**

- Modify `packages/database/src/schema/reports.ts`
- Modify `packages/database/src/index.ts`
- Add the next Drizzle migration and migration metadata
- Create `packages/backend/src/reports/report-section.repository.ts`
- Create `packages/backend/src/reports/report-section.repository.test.ts`
- Modify `packages/backend/src/reports/report.service.ts`
- Modify `packages/backend/src/reports/report.service.test.ts`
- Modify `apps/worker/src/processors/report-generate.processor.ts`
- Modify `apps/worker/src/processors/report-generate.processor.test.ts`
- Add focused integration coverage under `tests/jobs/`

**Behavior and acceptance**

- Add immutable-after-pass section rows keyed by report-version and section key.
- Claim/update uses report job lease and worker fencing.
- Add lease renewal; stale workers cannot call the provider or write sections.
- A killed worker resumes from passed sections and does not regenerate them.
- Input/version hash mismatch fails closed.
- Migration layout, repository, lease-race, kill/resume, and stale-worker tests
  pass.

**Recovery boundary**

One local migration/test correction. Stop on destructive migration, legacy-row
rewrite, or ownership changes.

### Slice 15D: Section Writer and Deterministic Assembly

**Owned files**

- Create `packages/backend/src/reports/comprehensive-report-section-writer.ts`
- Create `packages/backend/src/reports/comprehensive-report-section-writer.test.ts`
- Create `packages/backend/src/reports/comprehensive-report-section-digest.ts`
- Create `packages/backend/src/reports/comprehensive-report-section-digest.test.ts`
- Modify `packages/backend/src/reports/report-source.ts`
- Modify `packages/backend/src/reports/comprehensive-report-writer-v4.ts`
- Modify related exports in `packages/backend/src/index.ts`

**Behavior and acceptance**

- Generate the 23 units in deterministic order.
- Later calls receive bounded deterministic digests, not full prior prose.
- Each call receives only its matching facts/evidence/knowledge pack.
- Normalize technical IDs to approved display names before validation.
- Assemble canonical order/titles and unchanged V2 content contract.
- Different retries with persisted passed sections make no duplicate provider
  calls for those sections.

**Recovery boundary**

Stop if a required section cannot be represented by the existing V2 contract.

### Slice 15E: Bounded Rewrite and Critic Integration

**Owned files**

- Modify `packages/backend/src/reports/comprehensive-report-critic-v4.ts`
- Modify `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`
- Modify `packages/backend/src/reports/report-generation.service.ts`
- Modify `packages/backend/src/reports/report-generation.service.test.ts`
- Modify `packages/backend/src/reports/report-version.repository.ts`
- Modify focused report-generation integration tests

**Behavior and acceptance**

- Critic findings name stable section keys and bounded notes.
- Only failing sections rewrite; passed sections remain unchanged.
- Initial plus two rewrites is enforced atomically per section.
- Final commit occurs only after all sections and the assembled report pass.
- Failure preserves passed sections for authorized retry and emits one terminal
  alert after budgets are exhausted.
- Critic/safety, rewrite-budget, resume, and immutable-commit tests pass.

**Recovery boundary**

Stop if #11 has changed the provider result contract and the live branch has
not been reconciled by Sol.

### Slice 15F: Internal Version Fencing and Sample Harness

**Owned files**

- Modify `packages/backend/src/reports/identity-report-config.ts`
- Modify `packages/backend/src/reports/identity-report-config.test.ts`
- Modify `packages/backend/src/reports/identity-report-version-family.ts`
- Modify `packages/backend/src/reports/identity-report-version-family.test.ts`
- Modify `packages/backend/src/reports/report-generation.repository.ts`
- Modify `packages/backend/src/reports/report-generation.repository.test.ts`
- Modify `scripts/generate-ziwei-quality-samples.mjs`
- Add fixture/sample tests under `tests/reports/`

**Behavior and acceptance**

- Add dormant V5 prompt/config selection over V3 knowledge.
- Preserve legacy V4+V3 reservation recovery and historical readers.
- Sample harness uses fixtures only, writes no private report to Git, and
  reports gate results and usage IDs without secrets.
- Same chart with no reading context remains deterministic in facts/evidence.
- Producer builds and focused backend/report tests pass.

**Recovery boundary**

No default-version switch and no external provider call without an explicitly
approved sample run.

## Terra Milestones

1. Review 15A-15C: rule fidelity, config source of truth, migration, lease
   fencing, and resume semantics.
2. Review 15D-15F: provider payload privacy, per-section grounding, rewrite
   budgets, critic behavior, immutable assembly, legacy compatibility, and #11
   usage coverage.
3. Review the three sanitized sample reports and gate summaries before founder
   review.

## Focused Release Checks

- Config/contract/unit tests for all changed packages.
- Database migration layout and integration tests.
- Worker lease-loss and kill/resume integration tests.
- Fixture reports: every gate passes without manual edits; each palace has at
  least 450 syllables; zero discouraged/death terms.
- Usage ledger evidence from #11 for every writer/retry/rewrite/critic call.
- Dependency-ordered package builds and consumer typechecks.
- `pnpm lint`, `pnpm i18n:check`, and `git diff --check`.

## Deployment Gates

1. Deploy dormant V5 support only after Terra approval.
2. Generate three approved samples without changing the paid default.
3. Founder signs off all three samples.
4. #11 usage evidence is operational.
5. A separate founder-authorized activation changes only new Vietnamese paid
   reservations to V5; legacy reservations keep their frozen versions.
6. Production smoke proves one sandbox/authorized real flow resumes correctly,
   records all calls, commits once, and sends no duplicate notification.
