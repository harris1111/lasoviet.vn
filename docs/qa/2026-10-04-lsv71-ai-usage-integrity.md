# LSV71 / LSV68 incomplete AI usage integrity

## Scope and behavior

A response with one missing prompt/completion counter previously became a resolved cost with an invented zero. The adapter now requires complete safe integer counters, a consistent optional total, valid cached-token subsets and consistent cache aliases. The immutable three-rate tariff cannot resolve explicitly reported reasoning, cache-creation/read, audio or prediction dimensions; nonzero or malformed counters stay unknown at top level and in every supported detail record.

Verified installed 9router 0.5.95 `handlers/chatCore/nonStreamingHandler.js` saves raw usage before translating it, folds thoughts into client prompt, drops cached-token evidence and applies `utils/usageTracking.js`'s 2,000-token buffer. Apparently complete client usage does not establish the billed AG/Gemini cost. Requests or identifiable resolved aliases for 9router-an Gemini therefore stay unknown even with zero reasoning/cache counters; subtracting a guessed buffer or inferring zero cache is insufficient. Other provider/model classification remains unchanged. The broker buffer also affects other non-stream models, so synthetic controls prove fixture arithmetic only; any future non-Gemini 9router activation needs its own authoritative accounting gate.

Structured content is still validated and returned by the existing generation path. The free-gift writer retains its unknown reservation and withholds publication. Complete supported input/output/cache controls retain exact integer micro-VND arithmetic under the fixture tariff. No historical records, tariffs, payment configuration or generation flags change.

## Local validation

- Required `pnpm i18n:check`, `pnpm lint` (four pre-existing warnings, zero errors) and producer-rebuilding `pnpm typecheck` passed.
- 116 focused adapter, cost-ledger and free-gift tests passed: `/tmp/lsv71-usage-quarantine-tests.log`.
- Regression evidence uses synthetic fetch with the real in-memory cost recorder, not external model calls. Seven unsupported dimensions across five locations remain unknown with no resolved cost. Missing input/output, malformed or inconsistent counters and HTTP-error usage remain unknown.
- Complete-looking Gemini requests/resolved aliases retain unknown cost and structured output, with or without a recorder. The actual free-gift writer withholds Gemini publication and retains its unknown hold. Different-provider and ordinary-model controls preserve the existing synthetic arithmetic.
- Supported cache aliases resolve to 41,625,000 micro-VND; complete uncached usage resolves to 45,000,000 micro-VND under the synthetic fixture tariff.
- New cost and gift settlement cases freeze Date, retaining real timers. Free-gift cases make exactly one synthetic attempt, retain the unknown hold and produce no publication.
- An initial regression assertion referenced a field absent from the per-chart DTO; it was corrected to inspect actual record status and absence of cost. The accepted run above passed all cases.

## Release gate

Independent source review corrected omitted nested cache-creation fields and frozen clocks. Required local checks, exact-head CI, merge/deploy and the installed compiled adapter smoke must pass before accepting the release milestone. The published smoke must use synthetic fetch only and record the installed SHA, unknown outcomes and exact supported costs.

This is a bounded accounting correction, not completion of LSV71/68. Authoritative raw broker accounting, complete internal retry/fallback bounds, five-dimensional tariff normalization and a durable aggregate 200,000-VND campaign reservation remain technical gates before real quality sampling. The already-approved budget includes reruns; no actual paid model call has been made for this correction.
