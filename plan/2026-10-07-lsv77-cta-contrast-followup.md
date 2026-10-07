# LSV77 published-image CTA contrast follow-up

## Bounded brief

Published-image acceptance of PR #313 exposed a contrast regression in the actual chart page: `.fd109 button` overrides the primary top-up button label with heading ink, creating dark text on the light-theme gold background. Owner authorization covers fixing mobile purchase UX and review failures. Restrict the correction to chart button color scoping, the contextual/wallet primary CTA regression fixtures and this evidence. Keep the existing brand palette, payment authority, flags, routes and report behavior.

Keep the chart heading-color rule on ordinary controls only: exclude the shared `.button` class so primary and secondary actions retain their existing global foreground tokens. This covers contextual opening, wallet confirmation, inline top-up and retry actions without changing the palette. Load the actual chart stylesheet and `.fd109` ancestor in the test fixture, then measure contrast against every rendered gradient stop in both themes for VI/EN at 390/412/1440px. Require at least 4.5:1. Run required pre-push checks and the focused browser suite; obtain independent exact-head review and CI before merge/deploy. Repeat published-image acceptance and record runtime/operator checks before returning LSV77 to In Review. Real-bank acceptance remains deferred.

The initial published smoke already verified the test-mode purchase flow. Direct replay of a completed top-up command was rejected with HTTP 502 and no additional order or spend; this is rejection evidence, not a successful idempotent response or bank acceptance.

## Local validation

- Focused browser acceptance: 42 cases passed across inline top-up and contextual unlock, including the actual chart ancestor and stylesheet.
- Independent review: 16 relevant rendered-contrast cases passed; final approval must bind the committed head.
- Required pre-push checks passed: `pnpm i18n:check && pnpm lint && pnpm typecheck`. Lint reports four existing warnings and no errors.
- Production build, exact-head CI, deployment and fresh published-image acceptance remain release gates.

Private evidence: `cta-contrast-final-browser.log` and `cta-final-prepush.log` in the operator's LSV77 evidence directory. No owner account identifiers or private configuration are included here.
