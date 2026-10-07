# LSV77 mobile top-up repair verification

## Accepted scope

The owner reported a confusing short-balance flow on a physical K90 Pro Max, with Google sign-in passing. Private read-only diagnosis confirmed existing test auto-approval while SePay is disabled; no real payment or QR acceptance is inferred. The latest purchased report subsequently completed. Account identity and diagnostic records remain outside Git.

The repair exposes a closed server-authorized top-up mode through an authenticated balance response header without weakening the strict balance contract. It explains test credit before consent, defaults to one sufficient pack with deliberate comparison of all four packs, and shows the balance/gap/remaining amount. Unknown modes block new top-ups while preserving authorized order restoration. Receipt identity includes chart/version/locale/SKU; only an exact-owned quote can show a report link or processing status. Ready stops polling; missing authorization, errors and mismatches receive explicit recovery.

## Local evidence

- Focused API/proxy/contracts/payment-state tests: **135 passed**.
- Actual-component/CSS Playwright acceptance: **48 passed**, including VI/EN at 390/412/1440px in light/dark themes, explicit test-mode consent, default/other packs, blocked unavailable mode, pending-order reuse, cancel/duplicate commands, late claims and late responses, preparing-to-ready, guest/error/ownership loss/report mismatch, and chart-version changes.
- The fixture includes the application's `data-light-ready` marker so light-theme token activation matches the deployed page boundary. Browser network is mocked and no live wallet/account is mutated.
- Required `pnpm i18n:check && pnpm lint && pnpm typecheck`: **passed**; lint retains four pre-existing warnings and no errors.
- API and web production builds: **passed**. Private logs retain initial fixture failures and the corrected final runs. Exact-head review and release receipts follow once complete.

## Remaining boundary

Published deployment and isolated published-image smoke must be recorded in Kaneo before returning the repair to In Review. SePay/real-bank and physical banking-app acceptance remain deferred. This repair does not change financial authority, operator flags, model routes, report-generation policy or FD116 holds. LSV77 full Done is not claimed.
