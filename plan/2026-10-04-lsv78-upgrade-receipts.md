# LSV78 committed upgrade attribution

## Bounded brief

Prepare committed upgrade attribution and cover the direct authenticated wallet-command producer without changing product availability, prices, payment providers or refund behavior. Persist qualifying rollover spend identities and the exact applied credit inside the existing atomic wallet command receipt when a lifetime unlock commits. Replays validate that proof against the original same-owner/chart posted spends and committed target lineage; they do not recompute attribution from today's ownership or membership price. Restored/ineligible sources are excluded at commit. Later source restoration must not invalidate the historical credit proof or a still-authorized target replay.

Return a strict redacted upgrade projection containing an opaque receipt key, committed timestamp, actual charged La, applied credit and closed catalog source SKUs. Old receipts and non-rollover/member/included access produce no invented upgrade attribution. Allocate applied credit oldest-spend-first, breaking equal timestamps by SKU and spend ID, and stop at the actual credit ceiling. Store both original and applied amounts. A single financial upgrade event represents one committed target purchase; the primary source is the largest applied credited amount, with SKU and spend-ID tie breakers. Optional `source_skus` preserves the full unique sorted actually credited source set without duplicating revenue across sources.

The authenticated web proxy validates the complete upstream customer DTO and emits the event from that committed projection with a stable receipt key and occurrence time, independently of browser-supplied pricing or command keys. Existing analytics consent/privacy and failure isolation remain binding. Browser navigation, quotes and an uncommitted/failed command cannot emit the financial event. Delivery remains best effort: a replay can retry the same event but a committed command with no subsequent proxy response/replay can remain unobserved. The server top-up settlement continuation bypasses this proxy; durable delivery and full continuation-producer acceptance remain open and are not claimed by this direct-command milestone.

## Assigned files and verification

Changes are limited to wallet-unlock contracts and exports/tests, the wallet-unlock service and its PostgreSQL tests, the commerce controller and its tests, the wallet-unlock proxy and tests, the server funnel helper and its tests, the analytics event registry, browser analytics ingest contract and public-route regression tests, and the funnel runbook/review evidence and owner worksheet status. No migrations, provider calls, UI layout, automatic compensation or historical receipt rewriting are included.

Use frozen clocks. Prove a real 120+120+720 debit, exact committed credit, replay after expiry, zero-price full credit, membership exclusion, restored/ineligible source exclusion, corrupt receipt/foreign-source denial, legacy compatibility, malformed upstream rejection and stable event replay behavior. Run required i18n/lint/typechecks, focused contracts/API/PostgreSQL/proxy analytics tests and applicable build/registry checks. Independent exact-head GO, CI and deployed smoke are release gates. Full LSV78 remains open for terminal compensation/recovery and the remaining applicable content/guarantee/notification criteria.

## Browser producer boundary

The public analytics proxy currently signs canonical browser events, including `upgrade_purchased`. Reject that event at the browser request schema before signing or ingestion, while preserving the trusted private server schema. This closes client forgery of the new committed financial projection. Other event producer policies are outside this milestone.
