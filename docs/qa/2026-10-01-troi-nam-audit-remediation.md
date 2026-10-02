# Trời Nam audit remediation — evidence record

Date: 2026-10-01. Branch: `feat/troi-nam-homepage`. Baseline this work started from: `be5bffa` (master, after PR #239 merged).

Input: ChatGPT audit (`audit.md`) + execution plan (`2026-10-01-troi-nam-audit-remediation.md` / design spec / `copy-guidance.md` / `acceptance-checklist.md`), handed to Claude by the founder. The plan's own baseline SHA (`f6c06d69...`) does not exist in this repository's history; this does not affect the audit's live findings, which were taken directly from `https://lasoviet.net/troi-nam`.

## Scope decision (founder, 2026-10-01)

The founder reviewed the plan's Task 1 (bound copy claims — remove "tuyệt đối khách quan" etc., rewrite the four-way comparison to a neutral tone, soften USP/value/FAQ claims) and **declined it**: it reverses FD-108 (2026-09-28, revenue-max / legal-only boundary), which the founder confirmed is still the standing decision. Marketing copy, the comparison table wording, and FAQ claims are **unchanged** in this work.

Executed: the parts of Task 1 that are navigation/interaction accuracy rather than toned-down claims (CTA label/destination match, a visible sample-report link, a handoff note describing the actual next step), all of Task 2 (form validation/focus), all of Task 3 (concern continuity + existing-draft preservation), the footer-contrast half of Task 5, and the test-naming half of Task 7.

Deferred, not done in this pass: Task 1's claim rewrites (founder decision above), Task 4 (section reorder / comparison default-collapsed / page-height reduction), Task 5's hero-fold spacing tuning, Task 6 (nth-child → semantic data-attribute selector refactor), Task 8 (idle-render profiling — this environment has no real GPU; the plan itself gates this on real hardware), Task 9's staging-smoke/PR-release steps beyond what's recorded here.

## What changed

| Finding | Status | Files |
|---|---|---|
| F3 — editing one field wiped all validation errors; no error↔control association; no focus-on-fail | **Fixed** | `homepage-v3-form-validation.ts` (new), `homepage-v3-birth-form.tsx` |
| F2 — selecting a need on Trời Nam never reached the saved draft | **Fixed** | `homepage-v3-concern-context.tsx` (new), `homepage-v3-go-wizard.tsx`, `homepage-v3-needs.tsx`, `homepage-v3-birth-form.tsx` |
| Review Focus #1 — hero resubmit silently reset an in-progress "someone else" chart back to self/no-consent | **Fixed** (found verifying F2; not separately numbered in audit.md) | `homepage-v3-birth-profile.ts` (`toHomepageV3Draft` now takes `existing`) |
| F6 — "Lập lá số ngay" labelled the Tử Vi overview card but pointed at `/tu-vi`, not the chart flow | **Fixed** | `messages/{vi,en}/homepage-v3.json` (`needs.disciplines.tuvi.cta`) |
| F1/CXO — no visible proof before filling in the form | **Partially addressed** (sample link added; claim language itself not touched, see scope decision) | `troi-nam-hero.tsx`, `messages/{vi,en}/troi-nam.json` |
| F5 — hero submit implied an instant report | **Fixed** (label + handoff note only; wizard step-1 behavior unchanged) | `messages/{vi,en}/homepage-v3.json` (`hero.submit`), `troi-nam-hero.tsx` |
| F7 — footer supporting text 11px, 3.42:1 contrast | **Fixed** | `global.css` (`.copyright`, `.footer-grid h2`) |
| F9 — `homepage-v3-qa-a11y.test.tsx` names claimed real-device/AT coverage it never had | **Fixed** (renamed only; assertions unchanged) | `homepage-v3-qa-a11y.test.tsx` |

## Focused scenarios actually run (Playwright against `pnpm dev`, Chrome, headless, 1440×900 unless noted)

| ID | Result |
|---|---|
| F01 | PASS — empty submit shows date/time/gender errors, focus lands on `#hv3-day` |
| F02 | PASS — fixing only the date clears the date error; time and gender errors remain exactly as before |
| F03/F04 | PASS — fixing time and gender clears both; all three groups independently correct |
| F05 | PASS — `localStorage.setItem` made to throw: no navigation occurs, focus moves to `#hv3-storage-error`, its text renders |
| C01 | PASS — clicking the "work" need card then submitting a valid synthetic date saves `readingContext.topConcern: "career"` to the draft (previously absent) |
| C05 | PASS — the "decision" need's CTA renders `href="/kinh-dich"` directly; no `#lap-la-so` wizard hop, no concern side effect |
| C06 | PASS — seeded an existing `forWhom: "other", consentOther: true, place: "Đà Nẵng"` draft, reloaded, resubmitted the hero with new birth values: `forWhom`/`consentOther`/`place` unchanged after resubmit, birth fields updated to the new values |
| A03 | PASS — flagship card CTA on `/troi-nam` renders "Tìm hiểu Tử Vi", `href="/tu-vi"` |
| A02 | PASS — hero sample link renders `href="/bao-cao-mau/tu-vi"`, text "Xem bản luận giải mẫu"; visible without touching the form |
| Root regression | PASS — same empty-submit scenario on `/` (no `HomepageV3ConcernProvider` mounted) still shows all three errors and focuses `#hv3-day`; submit label updated there too (shared key); no console errors |
| V06 | PASS — `.copyright` computed style confirmed `rgb(138,130,112)` (`--pearl-500`) at `13px`, both via computed-style read and a visual capture; 5.09:1 contrast in dark theme (was 3.42:1), unchanged 5.17:1 in light theme (both `--pearl-500` and the old `--pearl-600` resolve to the same light-theme token, `--ink-400`) |

Not run this pass (plan Task 2/3's own E2E scenario list — C02/C03/C04/C07/C08, V01–V09): the scenarios above were chosen to directly verify each fixed finding with the least duplication; the remaining ones are extensions of the same code paths already exercised (group-based reconcile, concern precedence, draft adapter) and are lower-risk given the focused Vitest coverage below. Flagged here rather than silently treated as passed.

## Automated checks

```
pnpm i18n:check                 → pass
pnpm --filter web typecheck     → pass
pnpm lint                       → pass, 0 errors, 5 pre-existing warnings (unchanged files)
pnpm --filter @lasoviet/web build → pass, /vi, /en, /vi/troi-nam, /en/troi-nam all pre-render (●)
node scripts/public-claim-check.mjs    → pass, 0 violations
node scripts/check-public-content.mjs  → pass, 54 documents / 27 routes / 20 claims validated
npx vitest run apps/web/src/features/homepage-v3 apps/web/src/features/troi-nam apps/web/src/features/birth-profile
  → 291 passed, 1 skipped (0 failed)
```

New focused unit coverage: `homepage-v3-form-validation.test.ts` (16 cases — the exact clock-injected cases the plan specifies: 31/02 rejected, 29/02/2024 accepted, future-date rejected, HH=24/MM=60 rejected, unknown-time removes the time error, missing branch rejected, plus the reconcile-by-group behavior). `homepage-v3-birth-profile.test.ts` gained 5 cases for the `existing`-draft adapter (forWhom/consentOther/place preservation, lifeStage preservation, no-existing-draft default, no-topConcern-this-submission leaves readingContext untouched, never invents a readingContext from nothing).

## Untested — named honestly, not assumed passing

- Safari macOS + VoiceOver, iPhone Safari physical device, Android Chrome physical device: **UNTESTED**. No such devices in this environment. This is the same gap the audit itself recorded; it is not closed by this pass.
- Real-device 3D idle/scroll/hidden renderer profiling (plan Task 8): **UNTESTED / DEFERRED**, consistent with the plan's own gate ("Cloud WebGL failure is not proof of a production renderer defect and cannot satisfy this gate"). No renderer code was changed.
- Lighthouse / field Core Web Vitals / actual conversion impact: **not measured**, as before.
- `tests/e2e/troi-nam-form.spec.ts` and `tests/e2e/troi-nam-experience.spec.ts` (named by the plan's file-responsibility map) were **not created** this pass; the scenarios they would cover were instead verified directly via one-off Playwright scripts against the dev server (see table above) and recorded here rather than left as a permanent suite. If durable regression coverage for these flows is wanted, that is follow-up work, not completed by this record.

## Deployment

Not deployed by this pass. Changes are committed to `feat/troi-nam-homepage`; the founder's PR/merge/deploy authorization is a separate step (see repository FD-097 flow), same as the existing project convention.
