# WP-13 Authenticated Visual QA Terra Review Report

## Scope

- Reviewer: independent Terra-context reviewer
- Founder authorization: September 9, 2026
- Base: `4666bb6c4055171b3e4bbc1f558ebe5dfb827d29`
- Reviewed tip: `14ab86a5506757d9b5abe7c86ddf3e50385c5dd7`
- Review range: `4666bb6..14ab86a`

## Verdict

`CHANGES_REQUIRED`

## Important Finding

### Fixture database guard accepted partial WP-13 names

The seed script accepted any loopback URL on port `55435` whose pathname
contained `wp13`, including `/other_wp13`. The script later deletes rows from
auth, commerce, report, chart, and evidence tables.

Require the exact canonical pathname `/lasoviet_wp13` before migrations,
database connection, or deletion. Add no-side-effect probes for partial names,
wrong ports, and non-loopback hosts.

## Verified Evidence

- The fixture used synthetic data and kept the signed session manifest
  Git-ignored and uncommitted.
- Real Better Auth resolution and the standard internal private-API token path
  rendered the canonical authenticated routes.
- Metrics contained all 20 authenticated mobile and desktop states with no
  failed touch-target or focus assertion.
- Inspected screenshots matched account overview, pending VietQR, immutable
  order history, and terminal report-failure states.
- Customer-visible evidence omitted SKU IDs, raw report statuses,
  provider/model details, internal version IDs, and real customer data.
- The report retained physical banking-app return as externally blocked and
  Harris as sole final sign-off authority.

## Focused Checks

- Database, contracts, backend, and API builds: passed.
- Web typecheck and production build: passed.
- Authenticated Playwright evidence: 20 passed.
- `git diff --check`: passed.

## Required Follow-Up

Apply the exact database-path guard correction and run a scoped re-review.

Open questions: none.
