# LSV-69: Chart navigation implementation brief

Scope: FD-104 wave 3, using the approved interactive reader spec §7 and `prototype/revamp-2026-09/doc-bao-cao-tuong-tac.*`. Implement on `feature/lsv-69-chart-navigation-20260930`, PR to `master`. The owner was notified of mobile-first UI work before implementation.

1. Add a mobile full-screen chart dialog with native modal focus containment, Escape, close, scroll locking, and palace-to-chapter focus handoff. Keep the existing TOC available.
2. Add a sticky compact chart above the desktop TOC at 1200px and larger. Follow the visible palace chapter while scrolling.
3. Draw computed triad and opposite connections on all chart surfaces. Add directional keyboard navigation and a visible focus ring to interactive chart cells.
4. Expand palace content for print, restore reading state afterwards, print the hero chart once, and remove sticky controls. Use semantic tokens for new surfaces and the approved chart light palette.
5. Verify i18n parity, focused geometry/rendering tests, browser interactions at phone/desktop sizes, print, lint and typecheck.

No route, payment, model generation, report contract, production mutation or sold-report regeneration changes. LSV-68 remains on its separate branch. Deployment and production smoke are required before Kaneo Done.

Validation: reader suite 18 files / 128 passing tests (one existing skipped); three isolated Playwright browser scenarios at 320, 390 and 1440px cover modal focus/Tab/Escape restoration, arrow activation and chapter focus, document overflow, print expansion/restoration, and one visible print chart. All browser network requests are intercepted. Manual dark/light screenshots were inspected. The compact desktop cells retain the approved prototype's palace names and primary-star text; the phone sheet scrolls horizontally to preserve full chart detail. The production Next build passed. Required i18n, lint and workspace typecheck passed (four existing unrelated lint warnings).

Release remains pending independent review, target deployment, and production smoke. No owner decision is needed for this bounded implementation.
