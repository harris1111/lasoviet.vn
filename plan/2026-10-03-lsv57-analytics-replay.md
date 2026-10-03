# LSV57: Analytics replay correction

## Bounded brief

Owner authorized autonomous overnight work on To Do and In Review tickets on 2026-10-03. Correct the known analytics replay failure without changing wallet, purchase, consent or paid-generation semantics. Current code generates a new delivery timestamp for repeated deterministic welcome/feedback keys; repository comparison treats that as a different event and returns HTTP409.

Owned files: analytics repository and PostgreSQL integration tests; browser/server ingestion focused contract tests if needed; this record and funnel runbook reconciliation. No product UI, new event payload data, actor/retention weakening, payment activation, provider calls or catalog activation.

Proposed identity: same event key, exact event name/properties and authorized actor scope replay the original stored event despite a fresh delivery timestamp. Preserve original event time/id/visitor attribution and avoid reapplying behavior updates. Anonymous visitor changes and cross-account events stay conflicting. Review authenticated cross-device replay separately; do not introduce it without exact ownership evidence. Existing skew validation remains intact.

Acceptance: reproduce failure with a later injected clock, prove one stored event and immutable first timestamp; ensure changed properties/name/actor/explicit profile still conflict; concurrent retries remain safe. Run focused analytics/HTTP/BFF checks, required fast checks, independent review, PR to master, deployment and scoped anonymous browser replay with DB counts. Full LSV57 remains In Review if authoritative upgrade-purchase delivery or complete real money-path evidence remains open.

## Candidate evidence

A frozen-clock PostgreSQL regression reproduced the failure before the fix. Source correction removes only timestamp equality from replay identity; all visitor/name/properties/explicit actor/profile guards remain. Two prior timestamp-conflict tests are intentionally reconciled with the corrected transport semantics. New tests prove unchanged linked-account behavior, scrubbed context remains scrubbed, cross-user/visitor rejection, and three concurrent different-clock attempts create one event. Focused analytics/repository/API/browser/BFF suite: 6 files, 76 tests passed. Required i18n/lint/typecheck passed (four existing lint warnings). Independent corrected-source review: GO conditional on exact-head CI and deployed replay smoke.

Read-only aggregate funnel snapshot now recorded in the runbook. It is not customer conversion or bank revenue evidence: instrumentation ages differ, QA/customer traffic is not reliably separable, and SePay is disabled with auto-approved test top-ups. Current API container logs contain no WALLET error codes since its start at16:48UTC; earlier-container log evidence was not established. Full LSV57 and LSV80 remain open for their broader acceptance gates.
