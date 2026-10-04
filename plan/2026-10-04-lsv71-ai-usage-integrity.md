# LSV71 / LSV68 AI usage integrity brief

## Problem and verified facts

The installed broker (9router 0.5.95) exposes separate reasoning/cache-creation pricing and inconsistent stream/non-stream Gemini token placement. Its non-stream handler adds thoughts to prompt_tokens and emits completion_tokens_details.reasoning_tokens; the current three-rate application ledger cannot prove the complete cost of those dimensions. Separately, the application adapter fills a missing prompt or completion counter with zero and marks that partial usage known.

## Bounded correction

Change only adapter usage classification and focused adapter/free-gift settlement tests. Known usage requires both finite safe nonnegative integer counters, consistent optional total, valid cache subset and consistent supported cache aliases. Missing/malformed/contradictory counters or nonzero unsupported reasoning/cache-creation/audio/prediction dimensions must stay unknown rather than produce a partial resolved cost. Keep structured output behavior unchanged; the existing free-gift writer must retain its unknown reservation and omit publication. No model/tariff migration, historical cost rewrite, generation flag, provider call or operator setting changes.

## Validation and release

Use mocked responses with real in-memory cost recording and free-gift settlement; freeze business clocks. Verify partial/unsupported usage has unknown cost and no invented zero; complete supported usage retains its exact cost. Run focused tests, i18n/lint/producer-rebuilding typecheck/build, independent exact-head review and green CI before merge/deploy. Published compiled adapter smoke uses a synthetic fetch only, with no external model calls.

This correction does not implement five-dimensional pricing or a durable aggregate 200,000-VND campaign guard. Those technical gates remain before the real-quality campaign or free-AI activation; the owner already approved the campaign budget and must not be asked to approve it again.
