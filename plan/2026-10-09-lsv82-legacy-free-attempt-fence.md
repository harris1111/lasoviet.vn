# LSV82 legacy free-attempt safety

Bounded brief: fix the existing private single-palace gift recorder's concurrent
begin race and outcome-persistence acknowledgement handling. Dedicated direct-
master fix branch. Do not change pricing, quotas, routes, FE, writer scope,
manual acceptance, provider activation, native campaigns or operator settings.

Claim the first eligible begin synchronously before awaiting persistence;
refuse concurrent/repeated begin. Bind completion to the actually authorized
attempt, refuse repeated/wrong completion, and accept billed counters only when
persistence acknowledges resolved cost. Failed/missing acknowledgement retains
unknown exposure. Preserve one physical send and historical contract behavior.

Use the acknowledged integer micro-VND cost (including the persisted actual cache
rate); never fabricate a settled result from unacknowledged local counters.
Verify concurrent begin, no publication after failed/mismatched completion,
cached actual charge, existing real HTTP-adapter gift acceptance, producer
rebuild, required checks, independent review, fresh CI and deployed smoke.
No native/customer send or sale/Done claim.

## Verification receipt (2026-10-09)

58 tests pass across legacy gift22, whole writer31 and runner5 checks. Covers
concurrent begin, mismatched/repeated completion, persistence failure and
acknowledged cached-input charge43875000microVND with actual HTTP adapter.
Independent reviewer replayed legacy22 and found no source/financial blocker.
Producer rebuild and i18n/lint/typecheck pass (four existing unrelated warnings).
Conservative worst-case admission/ceilings are unchanged; settlement now matches
the acknowledged actual bill. Failed acknowledgement retains unknown exposure.

Physical native calls0; customer sends0; activation0. Exact-head review, CI and
deployed synthetic smoke follow; no full LSV82/runtime acceptance claim.
