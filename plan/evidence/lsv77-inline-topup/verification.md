# LSV77 inline top-up verification

Base: master `1e49c1e055bd92e018221e9b103fb40c10487243`.

- Focused proxy, checkout, route, standalone action and real-PostgreSQL top-up suites: 5 files, 109 tests passed. The backend matching/credit/continuation implementation is reused; immutable intent/version fields were added to its authorized projection.
- Actual React components and repository styles with explicitly mocked network: 23 browser cases passed (15 new inline payment cases and 8 existing contextual unlock regressions), including 390/1440px, pack recommendation, server continuation completion, reopening the same order, restoration failure, blocked outcome, credited/pending network retry, wrong-target denial, expired-order recovery, stale restore/late-claim response disposal, self-claim non-authority, late-transfer refresh outcomes and pack-consent attribution.
- All payment instructions, order status and funding in tests are synthetic. QR fixtures are nonpayable. These results do not constitute real SePay or physical banking-app acceptance.
- Independent review found three initial recovery/binding gaps and an expired-claim refresh gap; terminal explicit reconfirmation, credited/pending error UI and exact intent/version/SKU/chart/order binding and claim-triggered authorized status refresh correct them. No automatic payment confirmation or second transfer is introduced.
- No production feature flag, operator configuration, real bank transfer, AI call or outbound notification is part of this implementation.

Required local gates, exact-head review, CI, deployment and smoke receipts are recorded separately after each succeeds. Full LSV77 retains the explicitly deferred SePay/banking-app acceptance; task closure is not claimed solely from mocked-browser results.

## Real-network CI correction

The initial exact-head topic run passed unit/component checks but the golden-path harness still expected the superseded external top-up link. The harness now exercises actual in-place pack selection, explicit order creation, immutable authorized continuation and readable same-chart completion; standalone pack controls are still tested after closing confirmation. All eleven event checks remain required. No production code or threshold was weakened to accept the old harness.

The local real-network run then exposed a production transport issue: Next reconstructs an internal HTTP request URL behind HTTPS termination, so comparing browser Origin against request.url rejected canonical callers. The BFF now checks the closed canonical origin (matching the established feedback boundary); only development may accept exact local origin. Dedicated regression checks reject reserve/internal origins in production. Real-network acceptance is rerun against rebuilt source.
