# LSV72 header hydration regression

The shared Better Auth cache can resolve before the header's deferred hydration. Server sign-in text then conflicts with a cached authenticated avatar. The header now uses React's server hydration snapshot for that first render and reads the cached account after hydration. Explicit account/null props remain authoritative.

## Candidate evidence

- Source: `fb977eaa7feef358f8b62f0b6c17e582a48b3f2d`; production standalone mounted read-only onto an isolated web fixture, with published `e5f1690f6e8e7a63002fa7cb022e2fa15215a922` API images and a separate ephemeral database/TLS mail capture.
- Six native WebKit runs, Vietnamese authenticated account at 390px: six functional and strict client-error passes, zero unhandled exceptions and zero unmatched RSC diagnostics. Both actual header avatars have the expected synthetic account initials after cold navigation and reload. Existing chart, modal, back/forward, focus and overflow assertions also pass.
- React runtime and fetch remain unmodified. The earlier instrumented React asset only localized the defect; it is not acceptance evidence.
- The first candidate attempt failed because a single-element locator matched both desktop and mobile avatars. Its evidence is retained; the corrected assertion checks both rather than discarding an element.
- Focused header tests: 27 pass. The new warm-cache server-markup regression rejects the original component. Required i18n, lint, typecheck and production build pass; lint has four existing warnings.
- Owned fixture containers, internal network and private credentials were removed with no cleanup failures. No external AI, bank, real delivery or production business-data mutation.

Private evidence: `/home/debian/projects/lasoviet-lsv72-header-candidate-evidence-20261004`. This is candidate evidence, not published-image acceptance.

## Release and remaining gates

Exact-head CI, installed published-image smoke and independent release review remain mandatory. Record their actual revision and evidence in Kaneo. Full LSV72 stays In Review for its remaining transport observations and real-device Google login/4G acceptance; this bounded correction does not replace the previously recorded 96-cell matrix.
