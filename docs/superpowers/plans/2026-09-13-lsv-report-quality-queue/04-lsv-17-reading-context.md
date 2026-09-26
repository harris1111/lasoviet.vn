# LSV-17 Optional Reading Context Plan

**Date:** 2026-09-13
**Status:** Planning only; visual slice gated by an approved UI artifact
**Dependency:** Starts after #16 activation is complete

## Goal

Collect two optional enum-only reading-context answers, persist them outside
the immutable birth-profile identity, freeze the selected revision for each
new report, and use it only for examples, emphasis, and future free-preview
selection.

## Verified Facts

1. `BirthProfileV1Schema` is strict and its stored revisions feed calculation
   identity and normalization.
2. Birth profiles and their revisions cascade on hard deletion; anonymous
   actors expire within 24 hours and can be deleted immediately.
3. Account export currently returns birth-profile revisions and chart data but
   has no reading context.
4. The current wizard has three steps, starts at step one, and caches birth
   fields but not an independent context object or restored step.
5. LSV #6 owns full wizard autosave and OAuth step restoration.
6. LSV #21 owns the approved wizard visual redesign and explicitly references
   FD-078.
7. Current report reservations freeze chart/evidence/prompt/knowledge/timing
   identities but no reading-context revision.
8. FD-078 permits only the listed enum codes, never free text, and forbids use
   for chart facts, evidence, or prices.

## Assumptions

- Skipping is represented by absent/null answers, not a synthetic enum value.
- A context change creates a new immutable context revision.
- Existing charts and reports remain unchanged; only later report reservations
  use the latest owned context revision.

## Recommendations

1. Add `ReadingContextV1` as a separate strict contract with optional
   `lifeStage` and `topConcern`.
2. Store append-only context revisions by profile. Do not create a new birth
   profile revision or recalculate a chart when context changes.
3. Support atomic profile-plus-initial-context creation through a backward-
   compatible composite request; keep the existing bare birth-profile request
   valid.
4. Add a separate context update command for later chart-page changes.
5. Freeze `reading_context_revision_id` on each new report reservation/job.
   Retries reuse that immutable revision even if the customer changes answers.
6. Send only enum codes to the AI provider. Keep context outside facts/evidence
   and explicitly instruct the writer not to present it as chart-derived.
7. Include context revisions in account export and rely on profile/anonymous
   ownership cascade for deletion.
8. Implement visual controls only from a founder-approved UI artifact,
   coordinated with #21. The non-visual branch must not invent layout/styles.

## Open Decisions

### NEEDS_FOUNDER_INPUT

1. Designate the approved UI artifact/branch for the #17 wizard and chart-page
   controls, or explicitly assign the visual slice to LSV #21.
2. Approve the final VI/EN labels and screenshots under FD-056 before merge.
3. Confirm whether context editing on the chart page is included in the first
   UI artifact or intentionally follows the wizard release. The task cannot be
   marked complete without the approved disposition.

## External Dependencies

- LSV #6 must provide autosave and restored-step behavior before #17 UI lands.
- LSV #12 may change consent and privacy copy in the same wizard/messages.
- LSV #21 may change the same wizard components and CSS.
- The #15 generator must expose a stable optional personalization input.
- The #16 corpus must be active before context-driven examples are accepted.

## Bounded Flash Executor Slices

### Slice 17A: Contracts and Persistence

**Owned files**

- Create `packages/contracts/src/reading-context-v1.ts`
- Create `packages/contracts/src/reading-context-v1.test.ts`
- Modify `packages/contracts/src/index.ts`
- Modify `packages/database/src/schema/birth-profile.ts`
- Modify `packages/database/src/index.ts`
- Add the next Drizzle migration and metadata
- Create `packages/backend/src/birth-profile/reading-context.repository.ts`
- Create `packages/backend/src/birth-profile/reading-context.repository.test.ts`
- Create `packages/backend/src/birth-profile/reading-context.service.ts`
- Create `packages/backend/src/birth-profile/reading-context.service.test.ts`
- Modify `packages/backend/src/index.ts`

**Behavior and acceptance**

- Strict enum-only context; no free-text field exists.
- Revisions are append-only and owner-checked.
- Profile deletion/anonymous purge removes context by cascade.
- Updating context does not create a birth-profile revision or calculation run.
- Contract, migration, owner, revision, cascade, and expiry tests pass.

**Recovery boundary**

Stop if implementation would modify `BirthProfileV1` identity or existing
revision hashes.

### Slice 17B: Backward-Compatible API and Initial Save

**Owned files**

- Modify `apps/api/src/birth-profile/birth-profile.controller.ts`
- Modify `apps/api/src/birth-profile/birth-profile-http-flow.test.ts`
- Create `apps/api/src/birth-profile/reading-context.controller.ts`
- Create `apps/api/src/birth-profile/reading-context.controller.test.ts`
- Modify `apps/api/src/api.module.ts`
- Modify `packages/backend/src/birth-profile/birth-profile.repository.ts`
- Modify `packages/backend/src/birth-profile/birth-profile.service.ts`
- Modify their focused tests
- Modify `apps/web/src/features/birth-profile/save-birth-profile.ts`
- Modify `apps/web/src/features/birth-profile/save-birth-profile.test.ts`

**Behavior and acceptance**

- Existing bare profile POST remains valid.
- Composite profile plus selected context persists atomically.
- Later context update requires owner authorization and expected latest
  revision; matching retry is idempotent.
- If both answers are skipped, no context row is required and chart creation
  proceeds normally.
- No public unauthenticated context endpoint exists.

**Recovery boundary**

Stop if backward compatibility cannot be maintained without a new endpoint
version approved by Sol.

### Slice 17C: Freeze Context Into New Report Generation

**Owned files**

- Modify `packages/database/src/schema/reports.ts`
- Modify the next migration or add a narrowly scoped migration
- Modify `packages/contracts/src/jobs.ts`
- Modify `packages/contracts/src/jobs.test.ts`
- Modify `packages/backend/src/commerce/commerce.repository.ts`
- Modify its focused integration tests
- Modify `packages/backend/src/reports/report-generation.repository.ts`
- Modify `packages/backend/src/reports/report-source.ts`
- Modify `packages/backend/src/reports/comprehensive-report-section-writer.ts`
- Modify matching writer/source/generation tests

**Behavior and acceptance**

- New reservations freeze a nullable context revision owned by the same profile.
- Jobs and retries preserve the frozen ID.
- Source loading returns only enum codes and rejects ownership/version mismatch.
- Context changes alter examples/emphasis only; chart facts and evidence keys
  remain byte-identical for the same fixture.
- No context is sent to analytics or unrelated third-party payloads.

**Recovery boundary**

Stop on any requirement to rewrite existing reservations or reports.

### Slice 17D: Retention, Export, and Privacy Coverage

**Owned files**

- Modify `packages/backend/src/accounts/account-center.service.ts`
- Modify account export contracts/tests under `packages/contracts/src/`
- Modify account-center and privacy integration tests
- Modify anonymous-retention integration tests

**Behavior and acceptance**

- Account export includes context revision history with enum codes only.
- Profile/account deletion and anonymous 24-hour purge remove context.
- Anonymous-to-account linking preserves the same profile/context identity.
- No new retention clock is introduced.

**Recovery boundary**

Stop on any commerce-row cascade or retention-blocking foreign key.

### Slice 17E: Approved UI Artifact Integration

**Owned files**

- Create `apps/web/src/features/birth-profile/reading-context-step.tsx`
- Create `apps/web/src/features/birth-profile/reading-context-step.test.tsx`
- Create `apps/web/src/features/ziwei/reading-context-editor.tsx`
- Create `apps/web/src/features/ziwei/reading-context-editor.test.tsx`
- Modify `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- Modify `apps/web/src/features/birth-profile/birth-profile-form.test.ts`
- Modify `apps/web/src/features/birth-profile/birth-wizard-state.ts`
- Modify #6-owned cache/autosave files after they are merged
- Modify `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`
- Modify `apps/web/messages/vi/profile.json`
- Modify `apps/web/messages/en/profile.json`
- Modify only artifact-approved style files

**Behavior and acceptance**

- Use the exact approved artifact; do not invent visual design.
- Two single-choice lists, visible skip actions, keyboard/screen-reader
  semantics, and 320-430 px support.
- Autosave includes answers and current step; OAuth return restores both.
- Skipping both never blocks submit.
- Chart-page edits affect only future reports.
- VI/EN parity and focused browser tests pass.

**Recovery boundary**

Stop if #6, #12, or #21 has unresolved overlapping edits or if the approved
artifact is unavailable.

## Terra Milestones

1. Review 17A-17D for identity separation, ownership, immutable report
   freezing, retention, export, privacy, and provider payload boundaries.
2. Review 17E after the artifact is available for behavior, accessibility,
   autosave/OAuth restoration, and absence of unintended visual scope.
3. Re-review the integrated milestone after conflict checks against #6, #12,
   and #21.

## Focused Checks

- Contract, migration, repository, service, API, report-source, and account
  export tests.
- Same-chart/different-context fixture test: examples differ; facts and
  evidence keys are identical.
- Skip-both flow.
- Anonymous expiry/manual deletion/account linking tests.
- Wizard autosave/OAuth E2E from #6.
- 320, 390, and 430 px artifact screenshots plus keyboard/screen-reader checks.
- `pnpm i18n:check`, relevant typechecks, lint, and `git diff --check`.

## Deployment Gates

- #6 and relevant #12/#21 changes are merged or conflict-adjudicated.
- Founder approves the UI artifact and screenshots.
- Terra has no unresolved `must-fix`.
- Founder authorizes merge and deployment.
- Production smoke covers skip, one answer, two answers, OAuth restore,
  later edit, report generation, export, and anonymous deletion without
  exposing context to unrelated third parties.
