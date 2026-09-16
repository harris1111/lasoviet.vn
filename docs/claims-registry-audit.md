# Public Claims Registry Audit

**Date:** 2026-09-15
**Status:** Reconciled and independently approved against
`origin/product/experience-spec-v1` base `946d1bb`; pull request and deployment
remain pending.
**Scope:** 20 customer-facing privacy, Terms, payment, La credit,
upgrade/refund, and AI-content claims registered in `config/claims.json`.

## Current Evidence

Every active placement now carries a non-empty `sourceExcerpts` array.
Validation resolves the source through the canonical real repository root,
rejects symlink escapes, normalizes CRLF/LF and Unicode NFC, and requires every
excerpt to occur in that source. Claims or placements that were broader than
their source evidence were narrowed or returned to `planned`.

The registry records claims published on the current Privacy and Terms routes
as `approved`, `publishable: true`, and `active` only where source excerpts
substantiate the registered claim. This includes:

- FD-081 birth-data processing, account-linked measurement, and the 30-day
  unlinked-event retention boundary.
- Anonymous profile retention and immediate deletion, privacy export/deletion,
  the FD-053 third-party data boundary, and founder-operated AI processing.
- Purchased-La non-transferability, no cash withdrawal, non-expiry in the
  current release, and the seven-day upgrade-difference rule. Bonus-La
  non-expiry remains a separate approved inventory claim with planned
  placement because current Terms does not publish it.
- Approved report technical-failure wording: retries do not charge again; after
  retry failure, direct review may regenerate at no cost or refund case by
  case. Neither outcome is automatic and neither has a fixed SLA.

The published Vietnamese and English Privacy and Terms sources were approved,
merged, deployed, and smoke-tested on 2026-09-15 according to LSV-13 Kaneo
comments `hybr7mtl1kmt89604dgts2j1` and `a0qfk3hvz8krq68gfob7093l`. This
registry branch has not itself been deployed or smoke-tested.

## Approval Gate

`la-invoice-wording-draft` remains `draft_finance`, `publishable: false`, and
has no active placement. The unconfirmed invoice-line sentences have been
removed from both canonical Terms files. The scanner rejects those exact
Vietnamese and English invoice promises while permitting generic approved
descriptions of La as a service credit.

Finance/tax confirmation under FD-067 is the only remaining content-approval
gate for this ticket.

## Controls

- Registry validation rejects any non-approved claim with an `active`
  placement and rejects missing, empty, or stale active-placement evidence.
- Customer-facing file discovery and scanning fail closed before content reads
  when a directory or file symlink escapes the canonical repository root.
- The public-source scanner keeps the existing human-review, absolute-claim,
  privacy-boundary, prediction, price-anchor, and fake-scarcity controls.
- Focused regression tests cover draft-active rejection, exact and semantic
  invoice variants, permitted generic service-credit wording, canonical Terms
  absence, excerpt normalization/staleness, and directory/file symlink escapes.

## Review and Verification Evidence

The independent Terra high milestone review completed after the bounded
correction pass with `SPEC PASS / QUALITY APPROVED`, with 0 must-fix findings
and 0 optional findings.

Final verification recorded on 2026-09-15:

| Check | Result |
| :--- | :--- |
| Focused public-claim tests | 57 tests passed |
| Public content check | 20 claims validated; 0 violations |
| Internationalization check | Passed |
| Lint | Passed with 0 errors and one existing out-of-scope Tarot `<img>` warning |
| Dependency-ordered typecheck | Passed |
| Full build | Passed |
| Full Vitest suite | 242 files and 2,219 tests passed |
| `git diff --check` | Passed |

## Release Status

LSV-13 remains **In Review**. Pull request creation, deployment authorization,
deployment, and deployment smoke evidence remain pending. No claim in this
branch is treated as deployed solely because local verification and independent
review passed.
