> Historical checkpoint preserved during the 2026-10-03 workspace reconciliation.
> Task, PR, deployment and operating instructions below describe the original date only.
> Follow current AGENTS.md, the decision tracker, Kaneo, and `plan/2026-10-03-workspace-reconciliation.md` for current status.

# FD-105 To Do Execution Plan

## Scope
Continue implementation of tickets that are currently `To Do` without changing tickets in `In Review`. Preserve dependency boundaries, create one branch/PR per ticket, and do not mark any ticket `Done` before deployment and authenticated smoke evidence.

## Sequence
1. **#59 / FD-105 1.10 — Part feedback and La-back guarantee**
   - Inspect existing entitlement ownership, report reservation, wallet restore, and reader projection paths.
   - Add bounded feedback contract/storage/API and account-owner authorization.
   - Implement the first-claim, item-price, 24-hour, `Khong dung`, idempotent restore, entitlement revocation, and related-palace suggestion gates.
   - Render revoked parts as locked and add focused unit/integration/UI tests.
   - Run i18n, lint, typecheck, focused tests, and diff checks; open PR and move Kaneo to `In Review` only when evidence is complete.

2. **#60 / FD-105 1.11 — Email notifications**
   - Inspect existing notification/outbox/worker infrastructure.
   - Add unlock-completed, two-day nurture, and hạn-month reminder delivery kinds with unsubscribe handling.
   - Use injected clocks and engine-computed dates; add privacy and duplicate-delivery tests.

3. **#58 / FD-105 1.9 — Topic deep dives**
   - Implement the two topic writers from existing palace/timing facts.
   - Add deterministic quality gates and 20-generation acceptance fixtures before sellability.
   - Keep content within FD-089 and avoid inventing evidence.

4. **#62 / FD-105 2.1 — Personal daily reading**
   - Start only after the catalog/entitlement dependency can be cleanly based on merged work, or isolate preparatory work without coupling to review branches.
   - Add personal daily writer, bridge from the generic daily page, and seven-day expiring entitlement with frozen-clock tests.

5. **Later dependency queue**
   - #54 and #61 after #52/#53 are merged.
   - #63–#66 after their catalog/entitlement dependencies are available.
   - #68/#69 according to the approved FD-104 reader plan.

## Progress
- #53 and #57 are already implemented and in `In Review` from PRs #208 and #209.
- #59 implementation is on PR #210 and Kaneo is `In Review`; browser feedback/claim UX and the wallet-restore-to-claim transaction boundary remain review gates.
- #58 has preparatory writer/quality-gate work on Draft PR #211; real 20-generation evidence and #52 catalog activation remain blocked.
- #60 has notification foundation on Draft PR #212; current offers-consent enforcement was corrected in commit `43bc86db`, but unsubscribe route handling remains a merge blocker.
- #62 has personal daily foundation on Draft PR #213; expiry is helper-only until entitlement persistence/API/UI integration is added.

## Safety Gates
- Do not modify or merge `In Review` branches.
- Keep all new user-facing strings in Vietnamese and English parity.
- Preserve privacy, account ownership, idempotency, and fail-closed behavior.
- Record blockers and incomplete integrations explicitly in Kaneo.
- No production deployment or `Done` status without authenticated smoke evidence.
