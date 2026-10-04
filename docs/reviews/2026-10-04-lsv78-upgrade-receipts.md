# LSV78 committed upgrade receipt milestone

## Scope

Persist exact applied rollover sources atomically with the existing immutable wallet receipt and return a strict redacted customer projection. The authenticated web proxy records one receipt-bound upgrade event with stable committed time and key, exact charged La and credited sources. Public browser ingestion rejects forged upgrade events. No availability, pricing, provider, automatic refund or report content changes are included.

Historical proof validates posted same-owner/chart source spends and original committed timing. Source restoration after purchase cannot invalidate a still-authorized target replay. Applied allocation stops at 960 La and preserves partial credit. Missing legacy proof remains null; no historical rewrite or fabricated events.

## Verification

Required i18n parity, lint and typecheck passed (four existing lint warnings, no errors). Production web build passed. Focused contracts/API/actual PostgreSQL/proxy/public analytics/helper checks passed: 174 tests in eight files. Full repository verification passed: 4,098 tests in 450 files, with three existing skips. All 17 script checks passed. Independent draft review returned GO and independently passed 44 contracts/public-route/proxy/helper cases; final exact-head review and CI remain release gates.

The PostgreSQL checks include real 120+120+720 debits, replay after eight days, subsequent source restoration preserving historical credit, ten-source capped credit with 24 La partial credit, zero charge, actual membership purchase followed by 768 La/null credit proof, legacy proof omission and corrupt/foreign-source denial. Proxy/controller compatibility covers daily 60/48 La with null report IDs, included monthly zero-price, palace 96 La, excerpt 192 La and pre-authorized combo 1,300/1,040 La. Public forged upgrade ingestion is rejected before authentication/signing. Analytics replay stores one event at the original committed time; altered amounts conflict. Rejected analytics delivery preserves HTTP 200 for the committed wallet unlock. Disposable PostgreSQL fixtures exercise actual wallet kernels and immutable-receipt guards. Deliberate proof corruption temporarily bypasses only the receipt immutability trigger in the disposable test database; production guards are unchanged. Frozen clocks cover replay after expiry and analytics occurrence time.

## Acceptance limits

This is the direct authenticated wallet-command producer milestone. Top-up settlement continuations bypass this proxy; complete producer coverage and durable delivery remain open. Best-effort delivery can miss a committed response without replay, while analytics failure must preserve the successful wallet response. Full LSV78 remains in progress for automatic terminal compensation/recovery and remaining applicable content, guarantee and notification criteria. SePay sandbox acceptance is owner-deferred. No paid-provider, model-quality or physical-device acceptance is claimed.
