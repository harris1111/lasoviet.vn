# LSV-70 Stage 1 verification — 2026-10-01

## Delivered scope

Read-first private result page with a shared mobile block order, six desktop URL
tabs, a deterministic concern-matched structural palace preview, and one final
offer destination. The server projection excludes unauthorized narratives and
locked month identities. Guests receive one insight; verified accounts receive
two. English uses localized structural fallback when source prose is not marked
as English.

This is **Stage 1**, not the complete free-palace AI feature. There is no wired
standalone writer, durable free-budget reservation, or frozen free-palace cache.
New free provider calls remain disabled. The approved ceilings are policy, not
implemented enforcement, and test orders are not real revenue.

## Verification

- `pnpm i18n:check`: passed.
- `pnpm lint`: passed, zero errors and five existing warnings.
- `pnpm run typecheck`: passed for all workspaces.
- `pnpm content:check`: passed, 54 documents and 20 claims, zero violations.
- `pnpm --filter @lasoviet/web build`: passed.
- Focused model/page/score/security/legacy tests: 46 passed.
- `pnpm exec vitest run --maxWorkers=4`: 394 files passed, two skipped;
  3,530 tests passed, two skipped.
- `pnpm run test:scripts`: 17 passed.
- Final production-build local browser suite: 17 passed, covering VI/EN at
  360/390/430/768/1023/1024/1280, layout, sticky eligibility, preview keyboard/focus
  and scroll behavior, private 404, direct links, history and evidence navigation.
- Existing verified founder account against the local production build:
  VI and EN HTTP 200; two insights, no guest save gate, no overflow, sticky
  initially hidden. No purchase or provider call was made; no session secrets or
  account screenshots are committed.
- `git diff --check`: passed.

The first full run overlapped the production build and reported two existing
5-second timeout failures plus one stale adversarial test that still expected the
replaced component. That test now inspects the actual result model and preserves
sentinel/redaction checks. The complete rerun above passed with four workers,
without increasing timeouts.

Screenshot review caught clipped desktop chart columns despite the original
document overflow checks passing. A scoped four-column `minmax(0, 1fr)` grid fix
and wrapping palace headers close this issue. The final 17 browser checks also
assert no internal board scrolling and all 12 palace cells within wrapper bounds.
Both synthetic screenshots were refreshed after that correction.

## Visual evidence

Synthetic guest charts only:

- [Vietnamese mobile, 390 px](read-first-vi-390.png)
- [Vietnamese desktop, 1280 px](read-first-vi-1280.png)

## Release boundary

These browser checks exercised a local production build using the staging API,
not a deployed LSV-70 release. Deployment and post-deployment smoke evidence are
still required. Keep LSV-70 out of Done; keep the full reading/cache/budget gap
explicit in its ticket. LSV-64 and LSV-66 remain on hold.
The engine follow-up is LSV-71, currently To Do, with the approved ceilings and
fail-closed behavior recorded.
