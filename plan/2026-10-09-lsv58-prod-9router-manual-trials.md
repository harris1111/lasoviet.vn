# LSV58/63: production 9Router manual trial transport

## Bounded brief

Owner instruction on 2026-10-09 authorizes using the existing production 9Router. This resolves the session-tool availability issue without changing FD114's model/pricing, FD121's separate ten-report aggregate 180,000 VND cap, or sale/runtime/manual acceptance gates. Frontend remains with Lam. SePay, customer email and held products remain disabled.

Base: `28180a75`; branch: `feature/lsv58-prod-9router-transport-20261009`. Allowed changes: private scripts and their focused tests, this brief, decision provenance and redacted synthetic review artifacts. No public/provider configuration, router database, OAuth refresh, production application database, host Nginx or frontend changes.

## Verified local integration facts

- Production `9router` image digest `sha256:edb54b1be50b4c4e518b138c859e957cf16f80539e88731928d1a4e918fe33e3`, installed version 0.5.99, loopback port 52107; authenticated model discovery succeeds.
- Active configuration is `/app/data/db/data.sqlite`, opened read-only. The retained `db.json` is historical and must not determine readiness. The main instance has an active Antigravity OAuth connection with project identity; credentials stay inside the container process.
- Installed model resolver maps `gemini-3.8-flash-medium` to `gemini-3.8-flash-medium(medium)`. Thinking normalization strips the parenthesized suffix and writes native medium/includeThoughts with an output floor of 16,384. Capabilities declare context 1,048,576 and maximum output 65,536; the Antigravity executor clamps output to 64,000.
- The ordinary HTTP handler/executor can retry, change endpoint or refresh/re-dispatch. It cannot prove a single physical attempt. A private two-phase bridge uses the installed request transformer/headers/endpoint resolver, then one native HTTPS POST, without calling `execute`, refresh or router HTTP fallback. This uses the existing connection while preserving dispatch accounting.
- Raw source import requires two isolated, process-local substitutions because the image retains source whose compiled DB/OAuth dependencies are absent: `shouldRefreshCredentials` and `getGeminiThoughtSignatureSync` always throw. The text-only transformer never invokes either; tools, refresh, signature persistence and `execute` are forbidden. No server files or settings are modified.
- Primary references checked 2026-10-09: [Google model limits](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) and [Google thinking token limits](https://ai.google.dev/gemini-api/docs/generate-content/thinking). Public documentation describes the combined generated-token cutoff. This private adapter additionally reserves separate full output and reasoning allowances, verifies the pinned native wire and rejects receipts outside the conservative bounds. Reference accounting does not assert an invoice or undocumented private-service billing contract.

## Required behavior

1. Pin installed version and relevant source hashes. Prepare and validate the final native body, closed endpoint, model, medium thinking, no tools, request identity, expiry and output bounds before dispatch. Return only redacted metadata to the parent. Never export access/refresh tokens or persist thoughts, raw provider bodies or real customer birth data.
2. Parent durably reserves and marks the attempt under flock/fsync before acknowledging dispatch. Child rechecks expiry and final body hash, uses one HTTPS request with redirect refusal, finite deadline and body-size limit. Every ambiguous response remains unresolved and blocks subsequent attempts. No automatic network retries or fallback.
3. Use fixed authority `/home/debian/.lasoviet/fd121-paid-manual-trials/`, execution UID 1000, and a separate FD121 ledger with immutable aggregate 180,000 VND configuration. HOME, sudo and environment overrides cannot select a new campaign ledger. Existing FD112 ledgers retain their conservative settlement semantics. The new explicit actual-usage mode releases unused reservation only on a complete verified native receipt and reference quote. Missing zero counters remain unknown; do not manufacture billing facts.
4. Reserve conservatively using the entire declared context plus separate maximum output and reasoning allowances, at the frozen FD114 tariff. Reject any response exceeding verified bounds. This deliberately avoids an inferred input-token count or an assumption that thinking shares the visible-output cap.
5. Generate two synthetic actual-engine reports each for relationship, career, monthly, current lunar annual and next lunar annual using the existing strict writers. Schema contracts are included in requests. Persist restart-stable attempt identity and stop on cost/accounting/cap/quality failure. Any bounded rewrite consumes the same ledger and is not an accepted report. Do not label artifacts owner accepted.
6. Preserve the old unbounded CLI block and all public provider gates. Produce a concise English review receipt with physical dispatch count, model/wire/hash, raw token counters, API-reference quote and quality findings, plus visible synthetic reports for one owner review batch.

## Verification and release gates

Meaningful tests cover no dispatch before reservation, one physical request, source/model/body mismatch, expiry, unknown-cost restart fence, actual-usage settlement/replay, parallel ledger isolation, cap and distinct current/next lunar years. Frozen/injected clocks are mandatory. Rebuild workspace producers and run i18n, lint, typecheck and relevant scripts. Independent review precedes live calls; exact-head review and CI precede merge. Private campaign evidence is not a deployed application feature, a billing invoice, full ticket closure or sale authorization.

## Open acceptance

Owner manual report review, any failed technical/quality gate, application integration and release smoke remain separate. LSV89 decadal purchase/delivery and the annual pair remain subsequent bounded implementation work.

## Native receipt recovery follow-up

One actual attempt returned visible text and complete billable input/output/thinking/total counters, but omitted the cache-discount counter. The reviewed strict runner stopped and retains its full 33,368 VND exposure. Selected-counter diagnostics do not preserve enough original usage metadata to exclude all tier/tool/extra-usage ambiguity; they cannot release that reservation, reopen its key or resume the campaign.

Bounded follow-up permits only a pure `scripts/lib/fd121-reference-maximum.mjs` receipt preparation helper and focused tests, plus evidence/documentation. With trustworthy complete native response/completion/model/tier/tool/modality evidence, missing cache discount alone permits a conservative API-reference maximum: all input at the uncached rate, output plus thinking once. Preserve cache as unknown; do not invent zero or claim exact billing. Other missing counters or unexpected usage remain hard stops. The helper has no transport, ledger mutation, settlement or continuation authority and stays disconnected from the live runner. Legacy strict parsing remains unchanged. Independent financial review permits preparing this technical change; further calls remain held pending trustworthy first-receipt reconciliation and quality/format correction.
