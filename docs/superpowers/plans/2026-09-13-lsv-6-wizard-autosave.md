# LSV-6 Wizard Autosave Closure

**Date:** 2026-09-16
**Task:** Kaneo LSV-6
**Branch:** `fix/lsv-6-wizard-autosave-closure-20260916`
**Status:** Implementation complete; browser verification blocked by missing local auth configuration

## Scope

Complete the approved LSV-6 browser-local draft behavior without changing
server persistence, routes, authentication security, dependencies, or the
LSV-17 `WizardDraftV2` ReadingContext handoff.

## Implemented Contract

- A distinct versioned `localStorage` draft uses
  `lasoviet:birth-wizard-draft:v1` and expires after 24 hours.
- Restored data is validated fail-closed, including timestamps, field bounds,
  explicit-consent exclusion, strict object shapes, canonical birth branches,
  malformed dates, future solar dates, and future lunar years.
- Homepage and wizard use the same draft boundary. Homepage updates only shared
  birth inputs and preserves wizard-only fields.
- Hydration restores a valid draft before autosave is enabled, so blank initial
  component state cannot overwrite saved input.
- Autosave is debounced and flushes on ordinary component unmount. Explicit
  clear, Exit, and successful chart-navigation cleanup cancel pending timers
  before clearing storage.
- The wizard restores the highest valid persisted step. Step 3 is restored only
  when both subject and birth prerequisites remain valid. Explicit final
  consent is never stored or restored.
- The existing localized header sign-in callback remains
  `/dang-nhap?callbackURL=/tao-la-so/tu-vi` for Vietnamese and its `/en`
  equivalent for English.

## Verification Plan

- Focused Vitest: draft round trip, expiry, malformed data, storage failure,
  consent exclusion, branch and lunar rejection, step restoration, homepage
  merge behavior, immediate flush, clear, and timer cancellation.
- Web typecheck after rebuilding producer declarations in dependency order:
  contracts, config, database, then web.
- Scoped lint and `git diff --check`.
- Dedicated-port Playwright: homepage reload restoration and mocked Google
  OAuth return to exact Review step with consent unchecked. This remains
  blocked locally because `/api/auth/get-session` returns `AUTH_CONFIG_INVALID`.

## Boundaries

- This change does not replace the LSV-17 `WizardDraftV2`/ReadingContext
  contract in `birth-wizard-state.ts`.
- A mocked provider confirms browser lifecycle and callback handling only. A
  real Google OAuth smoke remains an external deployment verification.
