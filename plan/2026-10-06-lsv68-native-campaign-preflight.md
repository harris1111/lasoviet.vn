# LSV68 native campaign preflight

## Bounded authorization

The owner authorized continuing the two AI acceptance blockers on 2026-10-06. FD-112 permits only lifetime v4.2 on `ag/gemini-3.8-flash`, with an aggregate 200,000 VND cap including retries, after routing and pricing verification. This milestone supplies a scripts-only native request/receipt preflight and single-POST transport with synthetic/local TLS acceptance. It does not expose a live campaign entry point, load credentials, activate pricing, alter the gateway/production adapter/quarantine, or send a paid request.

Allowed files: this brief, `scripts/lib/native-campaign-preflight.mjs`, `scripts/lib/native-campaign-transport.mjs`, their focused tests, and root script-test registration. Dedicated branch targets master; independent review, required local checks, CI, deployment and installed synthetic smoke precede milestone closure. Full LSV68/71 stay In Review.

## Verified installed facts

Read-only audit of 9router 0.5.95 found that one executor can make four logical generation calls; auth replay can double that. Account inventory is reread while rotating credentials, and transport can retry/fallback below the logical-call layer. No fixed whole-request HTTP-send bound or trusted one-attempt header was established. The native endpoint converts through the same handler and rebuilds usage from normalized OpenAI counters, so it does not preserve authoritative raw billing usage.

The configured alias maps to wire model `gemini-3.8-flash-medium`, lowercase thinking level `medium`, includeThoughts true, endpoint `https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent`. The gateway raises medium output caps to at least 16,384 before applying a 64,000 ceiling. Source dependency imports patch global fetch and include a missing storage module; do not import that executor into the private harness. Reimplement only the closed, text-only request shape without tools, cache-creation, project discovery, refresh, rotation or fallback.

Raw usage keeps prompt, visible candidates, thoughts, cached input and total separately. Missing fields remain missing. Require consistent nonnegative safe-integer counters and the exact model allowlist before producing even a conservative quote. Never reinterpret normalized `.usage` as native counters or fold reasoning into input/output twice. No thought text is projected.

## Remaining financial gate

Installed static rates are input/output/cache-read/reasoning/cache-creation USD 1.5/7.5/0.15/11.25/1.875 per million. They are an estimate configuration, not authenticated billing evidence for this private route. Direct Google Developer API prices do not establish Antigravity charges. The preflight reports `executionReady:false`; a conservative token quote cannot settle a sent reservation or authorize a real call.

Google's public generateContent schema separates prompt, candidate and thought counts. A September 14 Developer Forum response describes maxOutputTokens as combined, but a September 25 same-thread reproduction reports nearly twice that cap. Neither is a bound for the private Antigravity endpoint. Do not assume the combined thinking/output ceiling from a client parameter. Sources: https://ai.google.dev/api/generate-content and https://discuss.ai.google.dev/t/gemini-3-8-flash-high-does-maxoutputtokens-include-thinking-tokens/181077 .

Before any real campaign, obtain the applicable billing basis and a provider-enforced bound including thinking. Then review an integration that reserves that bound, durably marks dispatch and audits a request hash before each single POST; unknown outcomes retain exposure. No guessed per-call rate, same-path reset or unverified refund is allowed. The existing durable budget primitive remains unchanged here.

## Acceptance

Pure builder/parser tests use an injected frozen clock. Local TLS tests count actual POSTs for success, 401/429/5xx, redirect, body timeout and connection reset. Fresh HTTPS connections use agent:false and TLS verification; no redirects/retries, body deadline and byte bound apply. Invalid credentials/project and expired tokens fail before constructing a request. Every fixture uses synthetic credentials and owned temporary files only. A live endpoint/credential loader, paid-quality claims and full-ticket closure are outside this milestone.

Independent working-diff review and focused execution passed 16/16 tests. The one-POST claim is per invocation; durable one-use campaign identity across processes/restarts belongs to the later live integration. `requestImpl` is a trusted fixture hook, not a boundary against a caller wrapping a live transport. Default HTTPS dispatch is hard-gated before the authorization callback. Required i18n/lint/producer-rebuilding typecheck pass. Exact-head CI and installed smoke remain release gates.

Unresolved: applicable Antigravity billing basis and enforced thinking/output bound. No additional campaign budget approval is requested.
