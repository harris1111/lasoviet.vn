# LSV74: Deployed Homepage Entry Acceptance

## Bounded brief

Close the remaining acceptance evidence for merged PR270/271 on the current deployed release. The approved flow is homepage data entry, then the wizard's review/privacy step with consent initially unticked, then a real chart. Historical direct-create/no-wizard and third-party-homepage requirements are superseded by the recorded owner implementation decision; do not restore them.

Owned scope, if corrections are required:
- `tests/e2e/homepage-one-step-entry.spec.ts`: strengthen real backend handoff/result coverage, maintaining precise synthetic-fixture cleanup.
- `apps/web/src/styles/troi-nam.css`: only viewport corrections to the approved hero/form layout if live measurements show a regression.
- `apps/web/messages/en/homepage-v3.json`: concise birth-time mode labels matching the existing Vietnamese control meaning.
- Phase 3's active implementation/acceptance document and this evidence record.

No new routes, provider calls, payment operations, consent wording, analytics policy, theme architecture or generation activation. PR197/231 and LSV71 activation gates remain unchanged. Preserve operator checkout, external env, Compose and Nginx.

## Acceptance

1. Real deployed VI/EN homepage data enters the review step directly, with exact entered birth data/name/concern and unchecked consent. No profile/chart is created before affirmative consent. Consent submission creates an authorized 12-palace chart with the expected saved source/context.
2. Validate narrow-phone first field/CTA visibility and tablet widths 600/768/879. Check desktops 1024x768, 1280x720, 1366x768, 1440x900 and 1920x1080. No horizontal overflow, clipped controls or unreachable CTA; record actual hero/fold measurements and screenshots. Review the existing full-hero fold limitation against the approved criteria before changing layout.
3. Record current host/image SHA, container health and OFF flags. Synthetic profiles/charts are deleted through the official anonymous privacy API with DB absence verified; retain legitimate audit/outbox records.
4. Any source correction gets focused checks, i18n/lint/typecheck, independent review, PR to master, approved deployment and post-deploy smoke. Verification-only closure records independent acceptance review against the deployed source.
5. Move LSV74 to Done only when its approved scope and all required deployed evidence pass. Do not claim Safari/physical-device/member/AI/payment acceptance from this homepage Chromium pass.

## Evidence

Private artifacts: `/home/debian/projects/lasoviet-lsv74-evidence-20261003/` (directory mode 0700, evidence files 0600). Independent Sol medium approved the synthetic harness before execution.

Pre-deploy backend flow passed VI/EN: direct review, unticked consent, zero actor profiles before consent, exact saved date/time/gender/name/locale and career concern after consent, authorized 12-palace result. Official DELETE cleaned two synthetic actors and their charts; DB absence verified. No provider calls or generation activation.

Initial live audit: 22 viewport combinations, no horizontal overflow. Desktop submit bottom was 884/837/843px on VI at 1024x768/1280x720/1366x768. Client-only candidate CSS measurement reduces it to 742/685/709px (EN 743/686/710px). Tablet 768/879 naturally scrolls; browser regression checks verify the CTA can be reached and clicked. Candidate injection is preliminary evidence, not deployment evidence.

Source correction: short-height desktop heading/spacing only, preserving controls and taller/mobile/tablet presentation. Added 16 VI/EN desktop/tablet browser regressions. Active phase document now reflects the latest owner-approved review-consent/name/three-chip flow rather than superseded initial proposals.

Independent correction review, CI and corrected deployment smoke remain pending. Starting production SHA: `3d4cb478d92d42e680f1c17b3dcc1b78404c8195`.

Independent review initially returned NO GO: long English time-mode labels overlapped HH/MM at 1024px. The correction uses concise English labels (“Exact time”, “Time range”) matching the existing Vietnamese modes, allows time-selector labels to wrap within their own cells, and adds geometric non-overlap plus successful branch-mode selection assertions. No change to consent copy or payload semantics. The compact spacing applies below 900px viewport height, avoiding an intermediate-height fold gap. Final candidate measurements and release evidence supersede the preliminary injection figures above.

Final local source audit: 22/22 viewport combinations passed horizontal bounds, time-mode/hour non-overlap, range-mode selection and CTA reachability. Initial desktop CTA is visible at all five requested sizes. Required `pnpm i18n:check && pnpm lint && pnpm typecheck` passed; lint reports four existing warnings. Independent corrected-source review is GO conditional on final browser checks, CI and deployed smoke.
