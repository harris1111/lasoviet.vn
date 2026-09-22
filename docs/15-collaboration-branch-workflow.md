# Lá Số Việt — Branch Workflow

Version 2.0, 2026-09-22 (FD-097). Replaces the two-integration-branch flow.

## Roles

- **Harris / Product ("anh"):** concept, brand, sitemap, UX, copy, acceptance.
- **An / Development:** code, tests, fixes.
- FD-084: An and Lãm have equal authority; the latest explicit instruction wins.

## Flow

1. Start every change on its own short-lived branch from `master`
   (`docs/…`, `feat/…`, `fix/…`).
2. Commit small, single-purpose commits: `docs:`, `feat:`, `fix:`, `test:`,
   `refactor:`.
3. Push and open a pull request straight into `master`.
4. CI must pass. A separate review runs only when the founder asks for one or
   an approved plan requires it.
5. Merge only after the founder or An explicitly authorises it.

Never commit or push directly to `master`. If work lands on local `master` by
mistake, move it to a branch before pushing and reset local `master` to the
remote.

## UI work

Build user-facing UI against a founder-approved prototype in `prototype/`. Any
branch may carry UI work.

## Conflicts

Brand, copy, sitemap, user flow, acceptance → Harris. Implementation,
framework, components, test strategy → An. URL, data contracts, privacy,
analytics, accessibility → both. Revenue beats trust concerns when lawful
(FD-064); the FD-089 banned list, privacy (FD-053), payment integrity (FD-043),
and locked-content security (FD-059) always win.
