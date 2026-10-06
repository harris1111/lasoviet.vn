# LSV68 owner-approved API reference pricing

## Bounded brief

On 2026-10-06 the owner explicitly chose official API pricing instead of investigating the connected account's subscription or actual invoice. Record this as FD-114 and apply the Google Gemini Developer API Standard tariff to the lifetime v4.2 campaign on `ag/gemini-3.8-flash`. This resolves the accounting-basis question; do not ask for subscription/billing evidence again.

Allowed files: this brief, the active rules-and-decisions tracker, `scripts/lib/native-campaign-api-pricing.mjs`, `scripts/lib/native-campaign-preflight.mjs`, their two focused tests, and root script-test registration. Dedicated branch targets master. No gateway, production adapter, runtime flag, credential loader, ledger transition, or live dispatch changes. The primary session executes under Interactive Mode because the configured Flash executor is unsupported by this Codex account; Sol independently reviews the bounded change.

## Pricing contract

Source checked 2026-10-06: https://ai.google.dev/gemini-api/docs/pricing.md, Gemini 3.8 Flash, Standard tier. USD per million tokens: uncached input 0.75; output including thinking 3.75; cached input 0.075. The introductory rates end on December 31, 2026; announced January 1, 2027 rates are 1.50/7.50/0.15 and must be reverified before use. Keep the existing frozen FX reference of 26,110 VND/USD. Version and hash the immutable reference snapshot. Use exact integer/rational arithmetic, round micro-VND up, then whole VND up. Charge thinking at the same output rate exactly once; cached input is a subset of prompt input, not an extra input charge.

Only the current, closed Standard text-only protocol is supported. It has no tools, grounding or explicit cache-creation/storage operations. Reject malformed, missing, unsafe or inconsistent counters and wrong model receipts. Quote time is explicit and frozen in tests. Quotes before the owner-decision date or at/after January 1, 2027 fail closed. The reference quote is accepted campaign accounting, not a claim of the provider's invoice or sufficient dispatch permission.

## Remaining execution gate

The existing 200,000 VND aggregate lifetime campaign cap including retries remains binding. One HTTP POST per isolated transport invocation is already tested. Default live HTTPS remains hard-gated while a provider-enforced total thinking/output bound and durable campaign identity are unresolved. Public API model limits alone do not prove the private Antigravity route enforces the same combined thinking/output ceiling. Engineering investigation continues without asking the owner to solve this technical gate.

## Acceptance and release

Money-specific tests cover known totals, cache subset arithmetic, thinking charged once, fractional rounding, large safe counters, wrong models, malformed usage, immutable metadata, and exact validity boundaries. Existing preflight/transport tests must pass and demonstrate that only the billing-basis blocker is removed. Required i18n/lint/typecheck, independent exact-head review, CI, deployment, and installed synthetic smoke precede milestone closure. Full LSV68/71 stay In Review until their real acceptance passes. No paid call is authorized by this pricing-only patch.
