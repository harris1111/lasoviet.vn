# LSV79 private free-chart recovery foundation

Base: `3472040d806ee99a954c83b08fe98ed7eaee6b73`. Dedicated branch: `feature/lsv79-free-chart-recovery-foundation-20261010`.

## Problem and authorized outcome

The approved second recovery loop is twenty-four hours after an actual viewed free chart, with the owner's own displayed teaser, contextual offer/palace/anchor and unsubscribe. Existing forty-eight-hour sign-in nurture, chart creation, analytics and private unaccepted reading drafts are not this source. Owner comment `lwhjq9gxcvqyhjp9ir8ys8k3` authorizes private capture only, default disabled, once/chart and combined maximum two recovery records/chart. Existing capture/in-app/click/financial milestones remain accepted; LSV85 retains real cohort/delivery/revenue. Frontend belongs to Lam/Claude.

Implement an immutable private source/first-view authority and disconnected capture service. A trusted server reader is an explicit dependency: it must retrieve an actual displayed-source receipt for the exact owner/chart/view receipt. No browser-supplied prose, timestamp or proof is accepted. With no trusted reader, both registration and capture refuse without database work. This milestone supplies the private implementation and isolated acceptance, not a claim that the actual public producer is already integrated or that full LSV79 is Done.

## Bounded files

- This brief.
- `packages/contracts/src/free-chart-recovery-source-v1.ts` and contracts root export: strict source DTO, explicitly not caller authorization.
- `packages/database/src/schema/free-chart-recovery.ts`, `schema/notifications.ts`, `client.ts`, `index.ts`.
- `packages/database/drizzle/0072_free_chart_recovery_source.sql` and `drizzle/meta/_journal.json`.
- `packages/backend/src/notifications/free-chart-recovery-source.repository.ts`, `free-chart-recovery-capture.ts`, `free-chart-recovery-email.ts`, `free-chart-recovery-purge.ts`, `recovery-capture-cap.ts`.
- Existing `pending-topup-recovery-capture.ts`, `pending-topup-recovery-runner.ts`, `auth-email.ts`: shared cap and generic sender exclusion only.
- `packages/backend/src/privacy/anonymous-retention.repository.ts` (pre-cascade coordination only), `privacy/deletion.repository.ts`, `ziwei/free-palace-artifact.repository.ts`, `birth-profile/birth-profile.repository.ts`: source/captured payload lifecycle purge and necessary existing coordination fences only.
- `packages/backend/src/notifications/free-chart-recovery.integration.test.ts`: meaningful real PostgreSQL acceptance.
- `packages/database/src/schema/schema.integration.test.ts`: disposable historical-schema rewind support for the new migration only.

No backend root export, API/BFF route, worker construction, frontend, runtime flag, operator, native campaign, SMTP, provider, wallet/order or held commercial policy change is allowed.

## Source and capture invariants

1. Strict DTO binds version/kind, owner/chart/version/locale, actual content and renderer identities, exact own teaser/hash, active closed-catalog offer key/SKU pair, canonical palace/anchor, opaque server view receipt and genuine first-view time. Validate hashes and identities after parsing. A private trusted server callback retrieves this data; input parsing never proves public display. Missing callback, private-draft/analytics/nurture substitutes and extra fields refuse. Timestamp comes from the trusted receipt, never a browser clock or chart creation inference.
2. Persist once/chart, with owner/chart/version cascade FKs, full canonical source hash and immutable first-view. New migration rejects all source UPDATEs; privacy DELETE remains possible. Duplicate registration cannot overwrite content or move the first-view time. Validate stored source/hash again and require fresh trusted-reader parity before capture.
3. Acquire existing free-AI then recovery coordination fences before authority reads. Existing calculation and consent writers use the recovery fence. Use nonblocking `commerce:chart:{chartId}` advisory acquisition, matching existing wallet/legacy/daily purchase mutexes, and skip busy owner/profile rows rather than invert commerce row locks. Sample clock after waits and source lookup; no future source/version/consent time. Verify nonanonymous verified owner, current profile/chart version, explicit latest offers consent, unsubscribe preferences, deletion/TTL and no chart purchase/access history after locks. No waiting on a wallet/order authority held by a buyer.
4. Capture exactly at or after first-view +24h, once/chart, with total pending/free recovery records <=2 under shared coordination. Existing pending capture and fresh-queue runner use the same shared count; no change to their delivery/control behavior.
5. Render only the stored exact own teaser and two existing canonical links: `teaserUrl` to `/la-so/{opaque_id}#trusted-anchor`, and `actionUrl` to `/la-so/{opaque_id}/chon-luan-giai?offer=closed-key&palace=canonical-palace&utm_source=followup`. Verified current free-reader canonicalization strips offer/palace/utm, so never claim that an invented query on that page opens a sheet. Current selection consumer accepts `ziwei-palace` with CANONICAL_PALACE_SKU_MAP, or `ziwei-comprehensive` with ZIWEI-IDENTITY-P0; restrict this foundation to these supported active key/SKU/palace pairs, not raw-SKU query values or unsupported next-year/topic keys. The source producer must bind a genuine displayed anchor; its integration and any complete sheet-ready frontend acceptance remain Lam scope. Include standard unsubscribe, escape HTML and add no forecast/paid prose. Product copy maintains VI/EN parity. No new route is created.
6. Insert captured delivery and past-tense processed outbox atomically. Never pending, sending or sent; zero attempts/provider message. Generic auth-email claim/read paths exclude the new kind even if a private database row is tampered to a retryable state. No mail provider is constructed.
7. Purge source, own captured payload/unsubscribe and processed receipt on official chart/profile/manual/account/anonymous lifecycle paths, including when no free-AI budget exists. Account deletion and consent prevent late queued capture; source registration cannot resurrect deleted profiles. Linking never duplicates sources; anonymous registration is refused, and an existing chart transferred to its verified owner must pass fresh authority checks.

## Migration coordination

Independent audit `/tmp/lasoviet-lsv79-migration-coordination-audit-20261010.json`, SHA256 `1eeaba47103d44b05c5ef911ce7f1daf2d73ecdc037193701200a3435fc87d09`, reviewed actual open PR heads and installed Drizzle0.45.2 behavior. Allocate ONLY tag `0072_free_chart_recovery_source`, journal idx67, timestamp `1791529200001`: greater than applied66 and lower than all reserved held commercial67-71 timestamps. Preserve every applied SQL file/journal entry through66 byte-for-byte. No held SQL is imported.

Before held PR335/346/350/352/354/355/366 later merge, insert this identical journal entry after66 and shift only their unpublished journal indices67-71 to68-72; SQL filenames/bodies/timestamps remain unchanged. Never sort the journal by filename. Any changed remote reservation or externally applied held migration requires re-audit before allocating/applying this migration. Verify actual isolated migration/schema checks and complete journal monotonicity.

## Verification and release gates

Real disposable PostgreSQL with frozen/injected clock: missing/default-disabled producer, strict source/hash/extra-field refusal, immutable duplicate/update/once/chart, VI/EN links/unsubscribe/HTML, exact24h boundary and post-lock delayed clock, concurrent scans and mixed-kind cap in both pending paths, rollback if processed receipt insertion fails, no-purchase/source/version/owner/unverified/anonymous/consent/unsubscribe/delete/expiry cases, busy commerce/profile locks and queued purchase/deletion/consent, official immediate purge and no late resurrection, generic sender exclusion under tampered statuses, zero wallet/order/provider effects. Include existing pending capture/runner and lifecycle regressions appropriate to changed fences.

Verify task-relevant exact Zod4.5.4, Drizzle0.45.2, schema exports and producer dependency order from workspace. Build contracts/config/database/engine/backend before dependents. Run required `pnpm i18n:check && pnpm lint && pnpm typecheck`, meaningful focused PostgreSQL/checks, independent working/evidence/exact review and both fresh CI before merge. Reconcile QA-only PR396 and any new master composition without changing source authorities. Audited deployment, installed default-off and exact private source/capture parity smoke, unchanged flags/38operators/12campaign authorities and independent deployed review precede technical milestone acceptance. Full public producer/loop and LSV85 live gates remain open.

The approved private foundation is implemented on this branch. No new native sample, customer send or production fixture is authorized by this plan.

## Independent working-review lifecycle amendment

The first working review identified a real existing anonymous consent/delete lock cycle exposed by the new purge fence: actor DELETE/cascade before recovery coordination versus consent recovery coordination before FK insertion. Amend the bounded file list by exactly one existing file, `privacy/anonymous-retention.repository.ts`, to acquire existing free-AI then recovery coordination before collecting versions or deleting any actor/FK row. Include a real concurrent anonymous-consent FK insertion/manual delete regression in the existing new integration test. No auth policy, consent authority or retention change. This routine correction remains inside the owner-authorized privacy lifecycle outcome.

## Actual local implementation evidence

- Contracts/config/database/engine/backend producer builds passed in verified dependency order.
- Initial focused PostgreSQL run:44/48 PASS; all four failures were new synthetic fixture schema mistakes (reusing a calculation run, expiry preceding unfrozen createdAt, duplicate pending purchase intents). Preserve the initial log; corrections use real schema constraints without weakening assertions.
- Independent review found the anonymous consent/delete lock cycle above; pre-row fence and actual concurrent FK regression fix it. Corrected seven-file focused suite:136/136 PASS. Latest source additionally verifies actual official anonymous linking with a frozen Date and a committed purchase behind a busy chart mutex:50/50 free-chart integration cases PASS.
- Required i18n/lint/typecheck passed; four existing frontend warnings, zero lint errors. A final required-check run is binding to the final corrected source before push.
- Exact twenty-two bounded files: original twenty-one plus independently approved anonymous pre-cascade fence. No private service runtime caller/root export, public UI producer, worker construction, outbound/native/provider operation or commerce policy activation. These isolated private mechanics are not full LSV79 or LSV85 acceptance.

## CI historical-schema fixture amendment

Both original source CI runs (38087739778 push and 38087742758 pull request at 82346cec) actually failed in the existing historical-schema integration fixture. Its three checkpoint rewinds retained the new 0072 enum value/table/function, so replay failed on the duplicate enum value and subsequent tests observed the incomplete historical schema. Preserve these failures; they are not infrastructure cancellations.

Independent PLAN_GO authorizes exactly the existing database schema integration test and this brief. In its disposable PostgreSQL only, a transaction asserts no new-kind delivery exists, drops the new source table/function, recreates the notification enum with all nine previous labels, casts and preserves existing delivery rows, and removes the old enum without CASCADE. Invoke before each of the three historical journal rewinds, then verify the new enum/table/immutable trigger after normal forward migration. Production SQL, journal, migration runner and all runtime bytes remain unchanged. Run the entire database schema integration suite, mandatory checks and independent source/evidence review before a new push; both fresh CI remain mandatory.

Actual corrected full database schema PostgreSQL suite:25/25 PASS, process exit0 consumed. All three historical checkpoints replay normally and recover the source table, enum label and enabled immutable trigger. The earlier exact foundation50/50 PASS and all runtime hashes remain unchanged; the amendment adds only this QA file (twenty-three owned files total).
