# LSV82 disconnected native evidence verifier

Base: master 1466aeb081c26be640225e6ff70956e2765ae2e3. Dedicated branch: feature/lsv82-native-evidence-verifier-20261010. Implement interactively; the configured Flash executor is unavailable in this account, as recorded by the preceding wire preparation milestone. Independent review precedes implementation and release.

## Bounded brief

Add a private pure diagnostic module and focused tests in packages/backend/src/ziwei/free-reading-native-evidence.ts and free-reading-native-evidence.test.ts, plus this plan. No index export or runtime imports, caller, native capture supplier, network, filesystem, credential, database, authority, retry, pricing or activation changes. Existing wire preparation/admission/writer/cache remain unchanged. This is an evidence inspection slice, not a token proof or full LSV82 acceptance.

The inspector accepts unknown input and closed, redacted envelopes. A wire descriptor binds client request SHA, native request SHA, serializer SHA, installed image SHA and five source module SHAs, the fixed native endpoint/model, requested output 10000, observed effective output and thinking configuration, and transport retry capability. Compare the descriptor with independently provided expected pins; descriptive hashes and counters never prove source enforcement. Always return executionReady=false, tokenBoundProof=null, singlePhysicalCallBoundProof=null, and explicit unproven_bound reasons. Report 10000->16384 drift and retry-capable routing. Even a caller-supplied single-send claim must not mint a proof or authorize replay.

An optional closed native response envelope binds request/response/visible-output hashes and one STOP completion to expected request/output hashes. Preserve raw native prompt/candidate/cache/thinking/total counter presence; require explicit zeros, safe nonnegative integers, cache<=input and total=input+candidate+thinking. Billable output=candidate+thinking exactly once. Reject translated aliases, extra metadata fields, nonstandard tier/traffic, nonzero tool usage, nontext modality details, contradictory totals and hash/model/completion mismatch as unknown_usage. Return only validated closed counters/presence/reason enums, not raw input, product prose, birth data, identity, credentials or thoughts. Matching synthetic metadata is diagnostic usage completeness, never authenticated billing or settlement evidence.

## Verification

Focused offline cases cover VI/EN descriptors from existing exact serializer fixtures, installed known output-floor parity (not live module execution), wrong hashes/pins/configuration, missing versus zero counters, contradictory aliases/cache/totals, thinking counted once, tool/modality/tier/completion/model mismatch, forged send claims and repeated inspection without authorization. Existing adapter/wire/writer/preparation/admission/cache suites must still pass; build producer packages then i18n:check, lint and typecheck before push. Independent working/exact source review and fresh CI remain gates. No real provider sends for this slice.

## Retained boundaries

FD120/121 free 3000 VND/chart, 50000 VND/UTC day, one attempt/cache and approved 30-chart aggregate 180000 VND remain unchanged. Native final input<=16000 and all billable output/thinking<=10000 enforcement, authentic native capture, durable single physical send, final-body admission/public cache composition, full actual free prose and deployment smoke remain unresolved. Paid FD124 samples do not substitute for free acceptance. Full LSV82 stays open.

## Local evidence

207 focused checks PASS across native diagnostics, exact wire/adapter, whole writer/preparation and free admission/budget suites. 19 actual isolated PostgreSQL admission/cache regressions PASS, including ownership, quota, unknown accounting, expiry/manual delete and no late cache resurrection. Independent reviewer ran all42 new diagnostic cases PASS and issued corrected working-source GO. Producer build and i18n:check/lint/typecheck PASS; four existing frontend warnings, zero errors. An initial fresh-workspace config-before-contracts build and tests started before producer builds failed on missing dist entries; corrected topological build and complete rerun passed. No native/provider calls, credential or private-authority operations occurred. Exact head review, fresh CI and any eventual deployment evidence remain separate gates; this does not close LSV82.
