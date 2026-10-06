# LSV77: in-context top-up

## Bounded brief

Implement the approved phase-6 direction on a dedicated branch from master `1e49c1e055bd92e018221e9b103fb40c10487243`. Owner notification delivered before UI implementation. Reuse existing backend pending-order matching, settlement, wallet ledger, continuation and QR checkout; introduce no new payment confirmation mechanism.

Allowed changes: verified-account JSON top-up proxy and route registry/tests; commerce inline top-up/pack picker and checkout completion callback; short-balance dialog and associated styles; matching vi/en reports messages; focused proxy/polling/pack/real-browser tests; this brief, release evidence, owner acceptance tracker and Vietnamese owner worksheet. Contract and authorized continuation projection may add immutable intent/version fields for exact restore binding. Backend changes only if a demonstrated existing-reuse defect requires correction.

Requirements: smallest sufficient pack selected, all four packs selectable, concrete remaining balance; explicit purchase consent before POST; one pending order reused server-side for the same owner/intent/pack; authorized status restoration after reopening; show existing QR/countdown/copy/poll/recovery within the existing modal; completed server continuation closes sheet and refreshes the current reader without a full page load. Keep standalone checkout behavior. Authenticated webhook/validated self-claim remain the only payment confirmation sources.

Verify local i18n/lint/typecheck, focused contracts/polling/browser cases at 390/1440px and existing commerce integration regressions with isolated databases and injected clocks. Independent review required before merge/deploy. Record exact deployment health and synthetic smoke. Real SePay sandbox is explicitly deferred and no bank transfer is authorized. Preserve all held SKU/notification/AI flags.

Closure: move to In Review when implemented and deployed; do not call deferred provider/bank-app acceptance a pass. Owner-input worksheet explains only remaining concrete choices or tests.
