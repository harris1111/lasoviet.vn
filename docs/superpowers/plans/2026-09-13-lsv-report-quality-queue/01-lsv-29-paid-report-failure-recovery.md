# LSV-29 Paid Report Failure Recovery Plan

**Date:** 2026-09-13
**Status:** Planning only; blocked on production evidence and founder approval
**Dependency:** First item in the report-quality queue

## Goal

Fulfill invoice `LSV-ee72fd8e-adbe-4650-a2d6-ff473dc4ccf2`, correct only the
verified failure path, and prevent a paid V4 report from becoming permanently
failed before its bounded recovery budget is used.

## Verified Facts

1. Kaneo records payment at 20:04 and failure at 20:05 Vietnam time on
   2026-09-13. This is founder-reported evidence, not a production log.
2. Current V4 uses prompt `ziwei.comprehensive.prompt.v4`, corpus
   `ziwei.comprehensive.knowledge.v3`, and one 9,000-token writer call.
3. V4 validator failure becomes non-retryable `AI_OUTPUT_INVALID`.
4. V4 critic safety/correctness failure becomes non-retryable
   `REPORT_SAFETY_REJECTED`; other score failures become non-retryable
   `AI_OUTPUT_INVALID`.
5. The validator has verified defects: the fatalistic regex can span unrelated
   text, several Vietnamese phrase checks use ASCII word boundaries, technical
   IDs fail instead of being normalized before validation, and short action
   fields participate in near-duplicate comparison.
6. `recoverInvalidOutputGeneration` supports only `AI_OUTPUT_INVALID`;
   `recoverEvidenceInvalidGeneration` supports only
   `REPORT_EVIDENCE_INVALID`. Neither is exposed through an audited private
   command.
7. `admin.reports.regenerate` already exists as a capability, but the planned
   report-recovery admin command has not been implemented.
8. The failure page promises priority support through
   `support@lasoviet.net`. Kaneo reports no working MX evidence. Repository
   evidence cannot prove inbox delivery.
9. FD-072 keeps V4 active and rejects an unapproved rollback to V3. If the paid
   flow cannot self-recover, FD-043 requires sales to halt rather than silently
   accept more payments.

## Assumptions

- The failed reservation and immutable report version can be correlated from
  the invoice by an authorized production operator.
- The reservation still has no committed `report_versions` row.
- A correction can reuse the same report and report-version identity without
  charging the customer again.

These assumptions must be verified before recovery.

## Production Evidence Required

An authorized operator must return one sanitized incident record containing:

- invoice number; order status and `paid_at`;
- report ID, report-version ID, entitlement ID;
- reservation status, state version, attempt count, `last_error_code`,
  `prompt_version`, `knowledge_version_id`, and `report_config_version`;
- queue job name/status/attempt count/last error;
- generation attempt status/error and timestamps;
- failure stage and alert delivery status;
- whether a report version or source snapshot already exists.

The same operator must return aggregate counts from
`2026-09-13T10:13:40Z` onward for Vietnamese V4 paid reservations:
ready, terminal failure by error code, retryable/in-progress, and total paid.
Do not include emails, birth data, chart bodies, report bodies, credentials,
tokens, complete environment maps, or raw provider payloads.

## Recommendations

1. Branch recovery by the observed error. Do not label validator or critic as
   the customer root cause until production evidence proves it.
2. Correct the independently verified validator defects even if the customer
   failed elsewhere, but do not claim they caused this incident.
3. Add one audited, capability-checked private recovery command using expected
   state version and idempotency. Do not add a public endpoint, direct queue
   operation, or unaudited script.
4. For legacy V4 only, allow one bounded full-report correction attempt when
   the observed failure is `AI_OUTPUT_INVALID` or
   `REPORT_SAFETY_REJECTED`. Revalidate and re-run the critic before commit.
   #15 replaces this temporary whole-report mechanism with section recovery.
5. Replace the unsupported priority-handling promise unless a working,
   monitored mailbox is externally verified.
6. If the measured failure rate shows the flow cannot self-recover, halt new
   paid V4 checkout under FD-043. Do not switch to V3 unless the founder
   explicitly reopens FD-072.

## Open Decisions

### NEEDS_FOUNDER_INPUT

1. Authorize a named operator to return the sanitized production record and V4
   aggregate counts above.
2. Choose the support disposition:
   - configure and verify a monitored `support@lasoviet.net` mailbox; or
   - approve truthful VI/EN copy that says the system retries automatically and
     removes the priority/manual-review promise.
3. Authorize the production recovery command after Terra approval.
4. If the incident is `REPORT_SAFETY_REJECTED` after the bounded correction,
   choose between customer refund or a newly approved recovery approach.
   V3 fallback is not available under current FD-072.

## Bounded Flash Executor Slices

### Slice 29A: Validator Correctness

**Owned files**

- `packages/backend/src/reports/comprehensive-report-validator-v4.ts`
- `packages/backend/src/reports/comprehensive-report-validator-v4.test.ts`

**Behavior**

- Use NFC and Unicode-aware boundaries for Vietnamese phrase checks.
- Limit fatalistic matching to one sentence.
- Exclude short `recommendation`, `rationale`, and `avoid` values from
  near-duplicate comparison using an explicit syllable threshold.
- Return structured finding codes and section paths needed by correction.
- Do not weaken Han, encoding, evidence, timing, or schema checks.

**Acceptance and focused checks**

- Normal contract-warning prose does not false-positive across sentences.
- Real certainty plus adverse-event language in one sentence still fails.
- Vietnamese accented prohibited phrases match.
- Duplicate substantive palace narratives still fail.
- `pnpm vitest run packages/backend/src/reports/comprehensive-report-validator-v4.test.ts`

**Recovery boundary**

One direct correction for failures caused by this slice. Stop on an ambiguous
policy term or any required change outside the two files.

### Slice 29B: Legacy V4 Bounded Correction

**Owned files**

- `packages/backend/src/reports/comprehensive-report-writer-v4.ts`
- `packages/backend/src/reports/comprehensive-report-writer-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`
- `packages/backend/src/reports/report-generation.service.ts`
- `packages/backend/src/reports/report-generation.service.test.ts`
- `packages/backend/src/reports/report-version.repository.ts`
- `packages/backend/src/reports/report-version.repository.test.ts`

**Behavior**

- Consume the existing one-time rewrite budget atomically.
- Pass bounded validator/critic findings into one legacy V4 correction call.
- Preserve timing, evidence keys, report identity, and source lineage.
- Re-run deterministic validation and one final critic after correction.
- Never commit a safety-rejected or below-gate report.
- Provider/network failure follows existing retry classification.

**Acceptance and focused checks**

- A first V4 quality failure corrects once and can complete.
- A second failure becomes terminal without an infinite loop.
- Concurrent workers cannot consume the same correction budget twice.
- Existing immutable versions replay without new provider calls.
- Focused writer, critic, generation-service, repository, and report-generation
  integration tests pass.

**Recovery boundary**

Stop if the production error is not output/safety related, if the reservation
already has an immutable version, or if the change requires a new product or
provider policy.

### Slice 29C: Audited Private Recovery Command

**Owned files**

- Create `packages/contracts/src/admin-report-recovery.ts`
- Modify `packages/contracts/src/index.ts`
- Create `packages/backend/src/admin-commands/report-recovery.service.ts`
- Create `packages/backend/src/admin-commands/report-recovery.service.test.ts`
- Modify `packages/backend/src/reports/report.service.ts`
- Modify `packages/backend/src/reports/report.service.test.ts`
- Create `apps/api/src/admin-commands/report-recovery.controller.ts`
- Create `apps/api/src/admin-commands/report-recovery.controller.test.ts`
- Modify `apps/api/src/api.module.ts`
- Modify `packages/backend/src/index.ts`
- Add focused security/workflow integration tests under `tests/security/` and
  `tests/workflow/`

**Behavior**

- Require authenticated account actor, active
  `admin.reports.regenerate`, reason code, request/trace IDs, idempotency key,
  expected reservation state version, and exact allowed error code.
- Revalidate capability inside the transactional command boundary.
- Persist command receipt, redacted audit, reservation transition, and outbox
  request atomically; matching retries replay the receipt.
- Never expose report content, customer PII, a public write endpoint, or direct
  BullMQ access.

**Acceptance and focused checks**

- Unauthorized, stale-version, wrong-error, and idempotency-conflict requests
  change nothing.
- Authorized matching replay creates no duplicate audit or outbox event.
- The exact failed reservation returns to `requested` with frozen timing
  lineage preserved.

**Recovery boundary**

No production execution. Stop if current admin command tables cannot provide
atomic receipt/audit semantics without a separately approved migration.

### Slice 29D: Truthful Support Copy

**Owned files**

- `apps/web/messages/vi/reports.json`
- `apps/web/messages/en/reports.json`
- `apps/web/src/features/reports/report-progress.test.tsx`
- `apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx`

**Behavior**

- Apply only founder-approved wording.
- Preserve invoice/support reference details.
- Do not add visual components or claim human priority handling.

**Focused checks**

- Report progress and report page rendering tests.
- `pnpm i18n:check`
- `pnpm content:check`

## Terra Milestones

1. Review 29A and 29B together against the observed production failure and
   FD-043/FD-072.
2. Review 29C independently for authorization, idempotency, audit atomicity,
   redaction, and replay.
3. Re-review the final recovery candidate after production evidence is
   attached, before any recovery execution.

## Deployment Gates

- Founder authorizes merge and deployment.
- Migration, if any, passes before API/worker rollout.
- Production smoke verifies health and private authorization without printing
  environment maps.
- Authorized recovery is executed once with a recorded command receipt.
- The affected report becomes readable and notification/delivery evidence is
  recorded, or the founder records refund/other disposition.
- Kaneo remains `In Progress` or `In Review` until deployment and fulfillment
  evidence exists.
