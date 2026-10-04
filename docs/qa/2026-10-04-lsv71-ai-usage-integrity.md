# LSV71 / LSV68 incomplete AI usage integrity

## Scope and behavior

A response with one missing prompt/completion counter previously became a resolved cost with an invented zero. The adapter now requires complete safe integer counters, a consistent optional total, valid cached-token subsets and consistent cache aliases. The immutable three-rate tariff cannot resolve explicitly reported reasoning, cache-creation/read, audio or prediction dimensions; nonzero or malformed counters stay unknown at top level and in every supported detail record.

Structured content is still validated and returned by the existing generation path. The free-gift writer retains its unknown reservation and withholds publication. Complete supported input/output/cache usage retains exact integer micro-VND cost. No historical records, tariffs, payment configuration or generation flags change.

## Local validation

- Required `pnpm i18n:check`, `pnpm lint` (four pre-existing warnings, zero errors) and producer-rebuilding `pnpm typecheck` passed.
- 109 focused adapter, cost-ledger and free-gift tests passed: `/tmp/lsv71-usage-tests-accepted.log`.
- Regression evidence uses synthetic fetch with the real in-memory cost recorder, not external model calls. Seven unsupported dimensions across five locations remain unknown with no resolved cost. Missing input/output, malformed or inconsistent counters and HTTP-error usage remain unknown.
- Supported cache aliases resolve to 41,625,000 micro-VND; complete uncached usage resolves to 45,000,000 micro-VND under the synthetic fixture tariff.
- New cost and gift settlement cases freeze Date, retaining real timers. Free-gift cases make exactly one synthetic attempt, retain the unknown hold and produce no publication.
- An initial regression assertion referenced a field absent from the per-chart DTO; it was corrected to inspect actual record status and absence of cost. The accepted run above passed all cases.

## Release gate

Independent source review corrected omitted nested cache-creation fields and frozen clocks. Required local checks, exact-head CI, merge/deploy and the installed compiled adapter smoke must pass before accepting the release milestone. The published smoke must use synthetic fetch only and record the installed SHA, unknown outcomes and exact supported costs.

This is a bounded accounting correction, not completion of LSV71/68. Five-dimensional tariff normalization and a durable aggregate 200,000-VND campaign reservation remain technical gates before real quality sampling. The already-approved budget includes reruns; no actual paid model call has been made for this correction.
