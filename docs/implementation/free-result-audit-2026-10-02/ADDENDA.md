# Phase B (B08–B21) — allowlist addenda and design decisions

Edits outside a card's allowlist, and decisions the handoff required to be explicit. English, append-only.

## Decisions (owner-confirmed 2026-10-03)

- **B08 outbox aggregate type:** extend `WorkflowEnvelopeV1.aggregateType` with `"chart"` (one-line change in `packages/database/src/schema/outbox.ts`). The DB column is plain `text`, so there is no migration. A chart-scoped gift event does not fit `order | report | asset | account`, and no cast was used.
- **B09 shared primitives:** option (A). The transaction-safe primitives (alias hash, lock keys, coordination/subject locks, clock sample, subject resolution) move down into `packages/database/src/free-ai-quota-link.ts`; `packages/backend` imports them from `@lasoviet/database`. The alias hash and lock keys therefore have exactly one definition.

## B08

- New shared test harness `tests/free-ai/free-ai-test-harness.ts` (disposable Postgres, independent pools, held-lock race helper, legacy-attempt seeding). Used by every later `tests/free-ai` integration suite.
- `packages/backend/src/index.ts` export is **deferred to B13**; until then the repository is intentionally unreachable from API/worker.
- Legacy "unique import key": no new table (that would need a migration). Each legacy `free_preview` attempt is imported exactly once because the chart row is locked `FOR UPDATE` under the global coordination lock and `legacy_reconciled_at` is written in the same transaction as the imported amounts. Any attempt without a resolved outcome has no provable bound and blocks admission (`legacy_unreconciled`); that refusal rolls back, so `legacy_reconciled_at` is never written for an unreconciled chart.
- `ai_call_attempts` / `ai_usage_outcomes` are append-only, so integration tests isolate by unique chart ids instead of deleting rows.
- Invariant for every later card: **every free-AI writer (admission, fence, settlement, publication, deletion, linking) takes `lockFreeAiCoordination` first.** Readers of slot state inside those transactions rely on it.
- The admission transaction also stores the frozen call in `free_ai_artifacts.frozen_call` with `content = NULL`. B15's reader must treat an artifact row with null content as "not ready", never as a hit.
- Fault injection is done with Postgres triggers in the test, so no test hook exists in production code.

## B09

- Files outside the allowlist: `packages/database/src/index.ts` (exports the moved primitives and `mergeFreeAiQuotaHistory`) and 🔶 `packages/backend/src/ziwei/free-ai-admission.service.ts` (now imports and re-exports the primitives from `@lasoviet/database`; `checkFreeAiQuota` stays there as a pure helper).
- Guest quota identity is keyed by the **anonymous actor id** (`authAnonymousActors.id`) and account identity by the **user id**. B18's composition must pass exactly those ids as `actor.id`, or linking will not find the guest history.
- Semantics of a merge racing an admission: the merge never deletes admitted history. If an account admission lands before the link, the account may show 4 distinct admissions in the window afterwards (each was legal when it ran); every later admission is refused until the window clears. If the link lands first, the new admission is refused at 3.
- Merging never crosses accounts: a guest subject that has already merged elsewhere is left alone, and a repeated merge returns `merged: false`.

## B10

- 🔶 `packages/backend/src/ziwei/free-ai-budget.repository.ts` (B08 file) was edited again: `clock` test seam (always sampled after the coordination lock), `dispatch_halted` refusal, and the shared day gate `readDailyGateTotal` + `isFreeAiDispatchHalted`, so admission, fence and settlement apply one rule. The day gate now counts the day's own exposure **plus every unresolved hold (reserved or unknown) on an earlier day**; a hold that is re-reserved at fence is moved off its old day row, so nothing is double counted or dropped at midnight.
- `tests/free-ai/free-ai-test-harness.ts` gained `admitRequest`.
- Gift cost recorder wrapper around `ai-cost.ts` stays in **B12** (the writer owns the provider call). B10 only takes an injected `activePricingSnapshotId(tx, now, provider, model)` and refuses to fence when it is not the reserved snapshot. No re-pricing and no re-freeze: a changed tariff **cancels** the unfenced request (hold released, admission stays consumed, no re-admission).
- Status after settlement: `resolved/publishable` stays `dispatching` with `settled_at` set — only B11's deletion-safe publication may move it to `ready`. `resolved/failed` → `terminal_failure`; `unknown` → `cost_unknown` (whole bound moved to unknown exposure).
- Overshoot halt has no new table: it is derived from the ledger (a resolved settlement above its reserved bound with no `free_ai.overshoot.acknowledged` audit row) and lifted only by `acknowledgeOvershoot` (attributed owner action). The incident is an `audit_logs` row `free_ai.overshoot` with ids and amounts only.
- Crash between fence and settlement: `settleAbandoned` converts stale `dispatching` requests to unknown exposure. B14's worker must schedule it (suggest every maintenance tick, `staleAfterMs` ≥ provider timeout + margin).
- Still deferred to B13: exporting these services from `packages/backend/src/index.ts`.

## B11

- Hooks added to the two privacy repositories (both in the allowlist): `anonymous-retention.repository.ts` `deleteActor` and `deletion.repository.ts` `purgeExpired` now take `lockFreeAiCoordination` **first** (same order as admission/publication), collect the owner's chart version ids before the cascade, and call `purgeFreePalaceForChartVersions` after the actor/account purge succeeds. An actor that is not yet expired or is already linked is **not** purged.
- "Immediate" account deletion is wired at the existing **final purge** (`purgeExpired`, after the recovery window), because that is where this codebase defines an account as purged; `request()` only opens the recovery window and deletes sessions. Purging gift payloads at request time would make a cancelled deletion lose a one-time gift, so it was not done. If the owner wants request-time purge, it is a one-line call in `request()`.
- Not covered by B11 (outside allowlist, no known caller): soft-deleting a single birth profile through `birth-profile.repository.ts`. The gift reader (B15) already re-authorizes the owner and TTL on every read via `readAuthorizedSlot`, so that path cannot expose prose, but the payload stays in `free_ai_artifacts` until TTL or account purge. Flagging it for B15/B20.
- Tombstone policy implemented: after deletion `free_ai_artifacts` keeps its row with `frozen_call/content/facts/content_hash` NULL; `free_ai_requests.concern` is NULLed; budgets, requests (ids, palace id, locale, status, amounts, days), admissions and settlements stay. A sentinel test proves no birth data or prose remains in any of those tables or in the outbox payload.
- `purgeExpiredPayloads` (guest TTL sweep) must be scheduled by B14's maintenance runner.
- Matrix row 31 (indistinguishable 404 for non-owner/status reads) is an endpoint property and is covered in B15/B16, not here.

## B12

- Gift cost recorder lives in `free-palace-writer.ts` (`createFreePalaceAttemptRecorder`), moved here from B10 as the B10 note allowed. It wraps the real `AiCostRecorder` for exactly one physical attempt: a second `beginAttempt` is refused, only `free_preview` is accepted (never `synthetic_probe`), the reserved pricing snapshot id must equal the tariff the inner recorder resolves (else the attempt is closed at zero and nothing is sent), and it captures usage even for invalid output so invalid output is still billed.
- Actual cost is computed in integer micro-VND from the reserved tariff with **no cached-input discount** (`input × inputPrice + output × outputPrice`). Missing/unknown usage ⇒ `unknown` settlement (whole hold kept). A response that never left the process ⇒ resolved 0, `failed`.
- The frozen `serializedPrompt` is a JSON document `{v, locale, palaceId, schemaName, system, user, facts}`: the authorized facts travel inside the frozen request, so the writer and the publication step need nothing else. B18 must build it with `buildFreePalacePrompt` + `serializeFreePalacePrompt`, and the `FreePalaceTokenBoundProof` must be established for exactly that string plus the adapter's added schema/wrapper text — **still an open gate; no proof supplier exists**.
- Versions to freeze at admission: `FREE_PALACE_PROMPT_VERSION`, `FREE_PALACE_RULES_VERSION` (= `free-palace-quality-v1`), `FREE_PALACE_SCHEMA_VERSION`.
- Quality gate `validateFreePalaceGift` is a new one-palace function; the mapping to the paid gates it mirrors is documented at the top of `free-palace-quality.ts`. No paid file was touched (`git diff -- packages/backend/src/ai packages/backend/src/reports` is empty). The gift allows no date/year/age unless a supplied fact carries it; English locale skips only the Vietnamese-brightness-label rule.
- Brand-voice review of the prompt text in `free-palace-writer.ts` (`RULES`) is still owed by the owner; the prompt is deliberately plain and prohibits promises.

## B13

- **aggregateType decision closed:** `"chart"` (see B08). Event type is now `free_palace.generation.requested.v1` (the card's name); B08's earlier `free-palace.gift.requested.v1` was renamed, its tests updated.
- 🔶 Edits outside the allowlist: `free-ai-budget.repository.ts` (imports the constant from `free-palace-outbox.ts`), `free-ai-dispatch.service.ts` (`isSourceAvailable` now receives the request's `chartVersionId`), `free-palace-artifact.repository.ts` (a charged result that can no longer be published — wrong palace, bad content, expired — now ends `terminal_failure` instead of lingering as `dispatching`; new `closeStalePublications` sweep), `free-palace-runner.ts` also holds `createFreePalaceSourceCheck` and `createFreePalaceTariffPort` (DB ports for B14), `tests/free-ai/free-ai-test-harness.ts` (`seedChartVersion`). One B11 assertion was updated to the stronger behaviour (wrong-palace publish → `terminal_failure`); nothing was removed or weakened.
- The gift claim query uses `FOR UPDATE SKIP LOCKED`, a 5-minute lease, and parks malformed events as `failed`. It matches only the gift event type, so the paid dispatcher still cannot see it (tested), and it grants no entitlement or wallet spend.
- A flag switched off between claim and fence defers the event 60s (`FREE_PALACE_FLAG_OFF`); a halted dispatch defers 5 min. Runner errors defer 60s and are safe to redeliver because the DB fence decides.
- B14 must schedule on the maintenance tick: `settleAbandoned`, `closeStalePublications`, `purgeExpiredPayloads`.
- `packages/backend/src/index.ts` now exports the free-palace factories (additive; paid exports untouched).

## B14

- 🔶 `apps/worker/src/health/worker-heartbeat.ts` (declared in the card): `ExecuteWorkerPollingCycleDependencies` gained optional `runGift?()` and `onGiftError?()`. A gift rejection withholds the heartbeat exactly like the other runners; omitting it keeps every existing caller valid (tested).
- Gating (all must hold, else a no-op runner and **nothing dispatch-capable is constructed**): `FREE_PALACE_GENERATION_ENABLED=true`, AI enabled + `AI_PRODUCTION_ENABLED` + `AI_FEATURE_JSON_SCHEMA`, `DATABASE_URL`. The environment loader already rejects the flag without production AI. The gift is **not** coupled to `WORKER_QUEUES` (no new registered queue, so health/queue validation is untouched).
- The gift uses its own adapter instance with `retryCount: 0`; the paid adapter and `AI_MAX_RETRIES` are not touched (a test runs with `AI_MAX_RETRIES=3` and still observes one attempt).
- Runtime fail-closed beyond startup: every cycle checks that an approved, effective tariff exists for the configured provider/model; if not it claims nothing, so events wait instead of burning slots. A frozen call for a provider/model different from this process's config is cancelled **unsent** (hold released, slot stays consumed).
- Maintenance (every 15 min, same tick as the existing maintenance, flag-gated): `settleAbandoned`, `closeStalePublications`, `purgeExpiredPayloads`. Stale threshold = AI timeout + 10 min. Retention for deleted/expired owners does not depend on this (B11 hooks run in the privacy purge paths).
- `ai_model_pricing` and `ai_call_attempts` are append-only; worker integration tests isolate by unique model ids.

## B15

- **Real defect found by the reader test and fixed in `free-palace-artifact.repository.ts` (B11 file):** the content hash was taken over `JSON.stringify`, but `jsonb` does not preserve key order, so a stored artifact could never match the hash computed when it was written (every read would have degraded to "unavailable"). The hash is now taken over a canonical, sorted-key form. No hashes had been persisted outside tests.
- Reader requires `currentLineageHash(slot)` from its composition (B19): the artifact key the *current* code would produce. A stored `lineage_hash` that differs is a consumed-but-unsupported artifact → structural fallback, never regeneration.
- Status mapping (stored → contract): `reserved→requested`, `dispatching→generating`, `terminal_failure→terminal_failure`, `cost_unknown→cost_unknown`; no slot, `cancelled`, ready-but-invalid or unknown → `unavailable`. `budget_exhausted` is an admission refusal with no stored state, so the reader never emits it.
- `ready` additionally requires a resolved settlement, the requested locale, an unexpired artifact of the current deletion generation, an intact canonical hash and a passing `FreePalaceGiftViewV1Schema`. The response is only that view: no model, tariff, prompt or reservation field exists on it.
- `ziwei-query.service.ts` gained an optional `freePalaceGift` reader and `readFreePalaceGift`; `readPreview` is untouched and still has no generator. Without the reader wired, the method authorizes the chart and reports `unavailable`.

## B16

- **Route-registry finding (the card's open question):** internal API routes *are* represented in `config/route-registry.yml`, with `template: private-api`, `<<: *private_defaults`, `locale_behavior: unlocalized` (precedent: `api.ziwei.personal-daily-reading`). The older chart endpoints (`/ziwei/charts/{chartId}`, `/preview`, `/topics`, `/evidence`) are **not** registered; only the newer `daily-reading` pair is. The new endpoint follows the registered precedent: `api.ziwei.free-palace-gift` → `/ziwei/charts/{chartId}/free-palace`. No web-side `/api/...` proxy route exists for it (the web server calls the private API directly), so no second entry was added.
- Endpoint: `GET /ziwei/charts/:chartId/free-palace?locale=vi|en` (default `vi`, anything else → 400 before any read). Headers `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow` (same as `daily-reading`). Missing, not-owned and deleted all return the one `CHART_NOT_FOUND` envelope — the codebase's convention is a 200 envelope that the web layer turns into `notFound()`, so "indistinguishable" is enforced at that envelope (tested byte-identical).
- Loader (`load-free-palace-gift.ts`) never throws and returns `null` for every failure (backend down, auth error, malformed payload, extra field, unsupported version/status, a ready view for another chart version or locale); `null` means the Phase A structural fallback renders.
- `FreeIdentityPreviewV1` and the teaser API are untouched.

## B17

- **Founder notice:** raised before UI implementation began (mobile-first, 360–430px first). Mobile-first was stated in the task and verified in a real browser at 375px and 1280px against a temporary fixture page (removed, never committed): no horizontal overflow (document width = viewport width), 44px touch targets on the evidence references, single column on mobile, the two action lists side by side only from 768px.
- Files outside the card's list: `apps/web/messages/{vi,en}/ziwei.json` (new `freeResult.gift*` strings, both locales, `pnpm i18n:check` passes), `apps/web/src/styles/free-result-read-first.css` (gift styles, mobile-first), `free-result-analytics.ts` (+ test: the existing `free_result_interaction` event now reports `source_kind: validated_artifact` only when a ready gift is actually rendered; **no new event or property**, so `config/analytics-events.json` is unchanged).
- The page loads the gift **server-side** (`freePalaceGiftLoader.load`), projects only an allowlist into `FreeResultModel.gift` (prose + numbered facts; no request id, hash, lineage or operational field — tested), and follows the gift's frozen palace for the selected-palace section.
- States: ready → full one-palace gift and gift-specific bridge copy ("Bạn đã đọc trọn một cung"); `requested`/`generating` → one static "being prepared" note under the structural palace; everything else (unavailable, failure, cost unknown, budget, loader error) → unchanged Phase A copy. **No polling was added**, so nothing client-side can create work or hammer the endpoint; a reload re-reads the cache.
- The other eleven palaces keep the locked structural rows, and the gift carries an explicit scope note ("the other N palaces show the structural map, not a reading"); a test asserts exactly one gift block and the locked state of the rest.
- A real defect was found and fixed during the browser check: list items were keyed by their text, so repeated sentences produced duplicate React keys and could drop content; items are now keyed by index.
- The "Căn cứ" refs are in-page anchors to a numbered facts list; the facts list is a collapsed `<details>`.

## B18

- Hook point: `createZiweiCalculationService` gained optional `onChartReady(actor, {chartId, chartVersionId, reused})`, called **after** the chart source and its evidence are persisted and before the success return. It is raced against a 2 s timeout (`onChartReadyTimeoutMs`), wrapped in try/catch with an optional redacted `onChartReadyError`, and a throwing reporter is also swallowed. Omitting it leaves the result byte-identical (tested). The hook only *requests*: it reserves through the shared B08 path, which writes the typed outbox event; it never calls a provider.
- `createFreePalaceRequestService.request(actor, chartId)` never throws. Gates, in order: flag; identity (**account needs `emailVerified === true`; a guest needs `isTrustedGuest`, which the composition leaves unset, so guests cannot dispatch in the pilot** — the handoff's "unverifiable guest cannot dispatch" rule); authorized chart read; valid chart; palace selection (`selectFreePalace`); one-palace facts; frozen prompt; B07 cost freeze; shared reservation.
- **The token-bound proof gate is still open and is not bypassed:** `boundProofFor` is injected, and the production composition (B19) supplies none, so every request ends as `skipped: unproven_bound` and nothing can dispatch even with the flag on, until a reviewed adapter guarantee exists and is wired.
- Gift locale: requested in `vi` only (the calculation has no locale). An English reader gets the structural fallback because the reader reports `unavailable` for a locale with no request. Owner decision if English gifts are wanted.
- Facts are built from the chart only: the selected palace, its earthly branch, its **major** stars with brightness, and the transformation on each star (labels from the existing canonical Vietnamese label table). Minor stars are deliberately excluded.
- Versions frozen at admission: prompt, rules, schema from the writer; `free-palace-structural-facts-v1` (knowledge) and `structural-palace-score-v1` (scorer). `currentFreePalaceLineageHash(provider, model)` is the reader's counterpart and is tested equal to the frozen key.
- No legacy free producer was migrated; none is enabled (see the producer inventory). `tests/free-ai/free-ai-test-harness.ts`: `seedChartVersion` accepts a `normalizedOutput`.

## B19

- Composition lives in a small new file, `apps/api/src/free-palace-composition.ts` (🔶 outside the card's two-file allowlist; keeps `api.module.ts` edits to two factory call sites and makes the rules unit-testable). `api.module.ts`: the `ZIWEI_CALCULATION_SERVICE` factory passes `onChartReady`/`onChartReadyError` only when composed; the `ZIWEI_QUERY_SERVICE` factory passes the read-only `freePalaceGift` reader.
- Rules: the **reader** is composed whenever a database exists (the authorized cache must stay readable with the flag off and for rollback); the **request hook** exists only when `FREE_PALACE_GENERATION_ENABLED=true` and approved production AI is configured (the validated environment already rejects the flag without it). No writer, provider adapter, dispatch service or runner is ever constructed in the API (tested).
- `NO_REVIEWED_TOKEN_BOUND_PROOF` is the explicit, named supplier of "no proof". Combined with B18 it means the API reaches the shared request path when enabled but every request ends `unproven_bound`; nothing can dispatch until a reviewed provider guarantee is wired. `isTrustedGuest` is deliberately unset, so guests cannot dispatch.
- The reader's current lineage key follows the configured provider/model; with no AI config it is unknown and nothing reads as ready (structural fallback).
- `free-palace-runner.ts` (B13 file): the tariff port gained `loadActiveTariff(provider, model, now)` for the cost freeze.
- Hook error reporting logs the error *name* only.
