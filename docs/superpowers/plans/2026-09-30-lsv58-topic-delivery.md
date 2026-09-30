# LSV-58: Paid topic delivery

Owner-authorized bounded completion of FD-105 package 1.9 on `feat/fd105-1-9-topic-writers`, PR #211. Preserve the existing topic contracts, quality gates and real-campaign runner; complete the missing wallet, immutable generation, authorized reader and guarantee integration. The approved source is package 1.9 in `2026-09-27-la-ladder-funnel-implementation.md` and FD-105 in the active decisions tracker.

## Implemented path

- The two topic SKUs select a dedicated prompt/config/template tuple. Their source family remains v4_1 so the worker derives facts from the same frozen chart/timing and knowledge snapshot. Exact SKU/locale/tuple checks dispatch before any natal writer.
- The existing wallet transaction atomically debits 480 Lá, creates the topic entitlement, reserves its own report/version and enqueues generation. Retries reuse the committed result. The production catalog remains reserved; only integration-test mocks enable the catalog while exercising fulfillment.
- Generation uses provider/cost recording, lifecycle and worker lease fences, one durable quality rewrite budget, and the existing immutable version repository. Topic prose never reuses a natal report id or payload.
- Authorized reads require the exact active topic SKU and scope, the expected stored tuple/template, and the matching topic id. The public projection strips internal evidence keys. Existing restoration/revocation checks remove authority.
- `/bao-cao/{reportId}` renders a dedicated topic reader with the current report styles, mobile sizing, library return path, print and exact-SKU feedback. Account exports support the public topic content.
- Dependency PR #210 / Kaneo #59 (`0782f906`) is merged for feedback and guarantee. Its existing guarantee endpoint restores the 480 Lá and relocks the report. No new route or database migration is required for topics.

## Verification and release gate

PostgreSQL integration exercises reserved default rejection, isolated activation, concurrent single debit, exact topic/version reservation and outbox, then guarantee restoration and query denial. Focused tests cover dispatch, incorrect tuple rejection, durable rewrite failure, lifecycle/lease fencing and authorized public projection. Phone/desktop Playwright scenarios cover 320/390/1440px, readable content, no horizontal document overflow, library navigation, feedback and print.

The real generation campaign, catalog activation, independent review and deployment smoke remain outstanding. Required acceptance remains **20 consecutive passing real generations per topic**. Mocked tests and engine-only preflight do not count. No paid provider calls, production mutation, merge or deployment were performed.

Recorded local evidence: 187 focused unit/contract/regression tests across eight files; 13 PostgreSQL wallet tests including the full topic refund/relock path; four campaign verifier tests; and three isolated Playwright scenarios passed. Required i18n/lint/typecheck passed (four pre-existing unrelated lint warnings). Browser fixture traffic is fully intercepted; the provider remains mocked for local functional tests.
