# LSV72: stable header session hydration

## Problem and evidence

Unmodified published release e5f1690 records intermittent WebKit React418 errors during document hydration. A separately identified diagnostic React asset preserves the original error path and localizes four failures to the header account avatar: the client expects a span where the server emitted sign-in text. The header reads the shared Better Auth session cache before its own hydration; another mounted session consumer can populate that cache first.

Private evidence is outside Git under `/home/debian/projects/lasoviet-lsv72-hydration-fiber-probe-v2-20261004`. This modified diagnostic asset is not release acceptance. Native controls and failed development probes are retained separately.

## Bounded implementation

- Change only the client session fallback in `site-header-sign-in-link.tsx` so its first hydration render uses the server snapshot, then reads the live session after hydration.
- Keep explicitly supplied account/null props authoritative. Preserve guest/anonymous behavior, callbacks, locale, markup and account links after hydration.
- Add rendered-header regression evidence for an already populated session cache. No dependency, route, translation, payment, provider or operator changes.

## Validation and closure

Run focused header tests, i18n/lint/typecheck and production build; verify actual authenticated header updates and strict client-error checks against candidate and published images. Review exact diff and CI before merge, then install and record deployed smoke/fixture cleanup. LSV72 stays In Review until its remaining transport observations and physical Google/device/4G acceptance are also satisfied. Do not classify unmatched failures as harmless cancellation.
