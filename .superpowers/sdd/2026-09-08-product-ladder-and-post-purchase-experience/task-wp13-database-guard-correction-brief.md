# WP-13 Fixture Database Guard Correction Brief

## Role And Scope

- Executor: Flash Executor using `ag/gemini-3.8-flash-high` with `high`
  reasoning.
- Worktree:
  `/home/debian/projects/lasoviet.vn-ziwei-v3`
- Branch: `feature/wp13-visual-qa-20260909`
- Base implementation: `14ab86a`.
- Correct only the one Terra-confirmed Important database-target finding.
- Do not commit, push, merge, deploy, access production, start providers, or
  touch unrelated services/worktrees.

## Owned Files

- `scripts/wp13-seed-authenticated-fixture.mjs`

Stop before editing any other file.

## Required Correction

The fixture currently accepts any loopback database URL on port `55435` whose
pathname contains `wp13`. Because the script later deletes all rows from
multiple fixture tables, this boundary must be exact.

1. Require all three conditions before migrations or database connection:
   - hostname is exactly `127.0.0.1` or `localhost`;
   - port is exactly `55435`;
   - pathname is exactly `/lasoviet_wp13`.
2. Remove substring or partial-name acceptance.
3. Preserve the existing bounded error without printing credentials.
4. Preserve all seed data, session signing, output manifest, cleanup, and
   runtime behavior.

## Focused Verification

Run no-database validation probes that prove:

- canonical
  `postgres://...@127.0.0.1:55435/lasoviet_wp13` passes environment
  validation far enough to attempt a connection;
- `/other_wp13`, `/lasoviet_wp13_backup`, `/wp13`, wrong port, and a
  non-loopback hostname are rejected before migrations or database mutation;
- rejection output contains no password or full database URL.

Then run:

```bash
corepack pnpm@11.25.0 --filter @lasoviet/database run build
node --check scripts/wp13-seed-authenticated-fixture.mjs
git diff --check
```

Do not restart the full authenticated fixture runtime; the correction changes
only pre-connection URL validation.

## Return

- Exact changed lines.
- Accepted/rejected probe results.
- Focused check results.
- Confirmation that no database, container, provider, production, or external
  side effect occurred.
