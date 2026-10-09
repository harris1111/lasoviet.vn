# LSV58/63 native accounting evidence capture

Base673c7900; dedicated branch feature/lsv58-native-receipt-capture-20261009. PR379's first real attempt stopped correctly but its failure journal retained only selected counters, insufficient to exclude other billable usage/tier fields. Preserve trustworthy bounded accounting evidence for future attempts before the strict parser can reject it. This cannot reconstruct the first response or authorize continuation.

Allowed: existing private child, parent and runner persistence, focused existing transport tests, this brief/review evidence. No ledger/pricing/resume/settlement implementation, provider request, credentials refresh, runtime app/FE/SQL/operator or activation change.

Reconciled with reviewed FD120 master5d42c2d1. One associated evidence-tool correction lets the FD120 synthetic smoke resolve backend dist from the actual pnpm-deploy layout (`node_modules/@lasoviet/backend/dist`) as well as a monorepo checkout. Read-only inspection confirms both deployed module paths exist. No product runtime code changes in this correction.

The private child fingerprints the original response bytes, validates the complete accounting envelope against a closed field/type allowlist, and returns original safe usage metadata with completion/model/envelope verification flags. Never persist raw response, thoughts/signatures, credentials, project IDs or unsupported string values. Any unrecognized/redacted metadata makes the evidence explicitly incomplete. Preserve absent cache counters without inventing zero. Revalidate the proof in the parent before persistence; capture it on both successful and stopped future attempts. Strict parser, open-attempt stop, first33368 exposure and180000cap remain unchanged. Evidence declares no settlement or continuation authority.

Meaningful tests cover absent-cache original metadata persistence while the budget stays blocked, extra/conflicting/tier/modality evidence, secret/thought redaction, fingerprint binding and invalid child proof refusal. Run full script regression, producers and required i18n/lint/typecheck; independent plan/working/exact-head review and fresh CI before merging. No historical first-receipt repair or application deployment claim.

Owner policy assessment: retaining full33368 exposure does not waive FD121's stop-on-unknown-cost rule. A separately documented owner exception is needed before any remaining physical trial. Receipt capture engineering can proceed now; it grants no such exception.
