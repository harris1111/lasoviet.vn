# LSV72 Phase A acceptance — 2026-10-04

**Disposition: In Review; full acceptance remains NO GO.** This verification-only change records the published `a11637027a42f1390caa2933dfc1bfad1aaef190` artifact. It changes no application behavior and does not enable generation.

## Evidence

Actual published web/API images ran against an isolated PostgreSQL database and TLS SMTP capture on a Docker internal network. Supported email signup, captured verification delivery, verification and sign-in established real accounts; guest records used the actual birth form. Canonical HTTPS was routed through a loopback-only QA proxy. External destinations were blocked. No API response mocks, manually minted sessions, production payment fixtures, or AI calls were used.

| Criterion | Result |
| --- | --- |
| VI/EN × guest/account × 360/390/430/1280 × light/dark × Chromium/WebKit/Firefox | 96 cells executed; strict result 95/96 (Chromium 32/32, WebKit 31/32, Firefox 32/32) |
| Ordered nine result blocks, 11 palace previews, two topics, completion-only purchase links | Checked in the matrix before client protocol validation |
| Desktop tabs, Home/End, mobile enlarged 44px palace targets, overflow, disclosure, history/Escape focus | Checked in the matrix; failed cell reached the final client protocol check |
| Query aliases/unknown/duplicate parameters, deep dialogs, native keyboard/inert behavior, hydrated breakpoint transitions | 12/12 supplemental cases passed |
| Account-to-guest and guest-to-account ownership boundaries | Indistinguishable 404, checked before canonical query redirects |
| DTO provenance, provider-free structural output, query/render/analytics contracts | 61 focused tests passed; source review GO |
| Production build and i18n/lint/typecheck | Passed |
| 390px emulated network: 150ms, 1.6Mbps down/750Kbps up, CPU ×4 | Four VI/EN guest/account cases; cold LCP 1368–1492ms, warm 520–776ms; cold CLS 0.0291–0.0575, warm 0 |
| Physical Android/Safari/4G, Google sign-in | Not executed; owner-held acceptance |

Private raw evidence is stored outside Git in `/home/debian/projects/lasoviet-lsv72-acceptance-evidence-20261004`: `qa-app-identity.json`, `browser-matrix.json`, `supplemental-browser.json`, `throttled-performance.json`, failure state/stack and screenshots. Synthetic chart identities, cookies, birth payloads, email verification links and raw authenticated data are not published. Earlier candidate results are not used as published-artifact evidence.

## Open observations

1. WebKit VI/account/390/light failed strict client protocol validation on a wallet-balance fetch diagnostic. Its captured DOM error/unhandled-rejection list was empty. Cancellation of that exact balance request was not proved; this is an unresolved observation, not a production CORS diagnosis or a pass.
2. Passing cells recorded 30 unmatched same-origin RSC fetch diagnostics. They are tracked separately from actual DOM exceptions and exact observed cancellations. They prevent full protocol acceptance despite successful functional assertions. Raw failed-cell diagnostics are retained separately.
3. Browser emulation and local proxy overhead are not physical-device evidence. No metric is fabricated for engines without the relevant PerformanceObserver entry type.

A pre-hydration WebKit focus check was a harness error. Waiting for the desktop panel's `tabpanel` role proved readiness and the unchanged published image passed 12/12 transitions. The temporary application patch was removed.

## Reproduction

Use a private evidence directory outside the repository, permissions 0700, with `LSV_QA_EVIDENCE_DIRECTORY` pointing to it. `python3 scripts/fd109-qa-environment.py` pins the current deployed web/API/worker image identity, provisions owned isolated fixtures and writes private environment files. `node scripts/fd109-browser-acceptance.mjs` executes the real-network matrix and supplemental measurements. It exits nonzero on strict failures while preserving partial evidence. `python3 scripts/fd109-qa-environment.py cleanup` verifies owned identities before removing the four QA containers, internal network and private credentials. Playwright browsers must be installed locally.

Resume may reuse only identity-matching, previously passing cells; it must never discard a failed cell. Native dialog checks permit browser chrome focus, require return into the dialog, and verify page background inertness. Physical acceptance and unresolved protocol observations remain explicit release gates.

## Remaining closure

Investigate the recorded WebKit transport observations, run physical-device acceptance, and record deployed smoke and fixture cleanup in Kaneo before considering Done. This report is a verified milestone, not full ticket closure.
