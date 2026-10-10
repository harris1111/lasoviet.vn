# Explicit natal-versus-decadal coordinate guard review

Date: 2026-10-10 (UTC). Base: `e4ee69b510710c53b5f72a286af169c7008b5ea0` (PR382). Dedicated branch: `feature/lsv58-palace-coordinate-quality-20261009`.

## Behavior

The retained relationship 1 report claims `cung Phúc Đức gốc tại Thìn trong đại vận`. Its natal Fortune source is at Monkey; its active decadal Fortune role is at Dragon. Explicit natal and decadal coordinate claims now bind to their separate source roles. Immediate denials are excluded per occurrence, while nested denials and subsequent affirmative claims remain checked. NFC/NFD, Unicode boundaries, genuinely coincident coordinates and unavailable decadal roles have focused coverage. Unqualified coordinates and general semantic accuracy remain outside this narrow guard.

Topic quality metadata advances to v4; historical quality constants remain exported. The writer prompt distinguishes natal coordinates from decadal role coordinates. Historical recovery fixtures must reject this newly discovered error; the original prose and historical journal entries stay unchanged. An unknown dispatched career rewrite remains ineligible for recovery. No operator, provider, budget, ledger, migration, FE or commerce implementation changed.

## Initial sandbox verification

- Producer rebuild: contracts, config, database, engine adapters and backend passed.
- Four focused Vitest files: 102/102 passed, independently repeated by the milestone reviewer with the same result.
- Required i18n parity, lint and workspace typecheck passed. Lint has four pre-existing FE warnings, zero errors.
- Read-only actual-output diagnostic passed: two known source mismatches rejected, four other available continuation rows pass default quality. All four original/continuation authority-file SHA256 identities are unchanged. Zero provider calls and ledger writes; manual acceptance is false.
- The actual unknown career dispatch regression independently of the budget subprocess passed (one test, standard Node runner with `--test-isolation=none`).
- Full `test:scripts` did **not** pass here. The managed sandbox denies `execFileSync` subprocess operations (`spawnSync node EPERM` and budget storage subprocess `BUDGET_STORAGE_UNAVAILABLE`). The full non-isolated recovery replay also failed/timed out under those restrictions. Tests, assertions, budget and sandbox controls were not altered. Historical budget-backed recovery regressions require a successful replay in restored CI before merge.
- `git diff --check` passed. The reviewer found no concrete working-source implementation blocker and issued a conditional working GO; this is not release approval.

Exact cached pnpm 11.25.0 was used through Corepack. Cached dependencies were copied into a writable isolated checkout; `pnpm_config_verify_deps_before_run=false` and `npm_config_update_notifier=false` were per-process flags to prevent relocation-triggered auto-install into a read-only global store. No repository config or dependency version changed. Fresh CI must verify the normal install and full suite.

## Actual trial and release state

FD123 stays stopped at the unknown career 1 corrective dispatch: six logical slots, eight dispatch permissions, seven known completed native responses, five historical automatic passes, three slots unrun. The conservative continuation API-reference exposure remains 266,944 VND with one unresolved reservation; this is not a provider invoice. The two known factual errors remain held. No call was replayed, reservation released or authority file rewritten. The original FD121 unresolved hold is also preserved.

At the initial sandbox checkpoint, GitHub networking and the Docker socket were inaccessible. PR382 final CI runs 37987945371 and 37987951384 are presently unverified. At that checkpoint the follow-up was local only, unpushed, unmerged and undeployed. Kaneo read was rejected because approval is required while the current approval policy is never; no ticket write or status change was made.

Restore access, reconcile PR382 and current remote master, run full CI and independent exact-source review, then merge only after the gates pass. Deploy the immutable audited release and record production smoke evidence before runtime closure. Parent LSV58/63, public adapter/free-flow work, real delivery, manual reading, FE and held commerce gates remain open. No model, pricing or monetary decision is pending.

Evidence: `plan/evidence/2026-10-10-palace-coordinate-offline-preflight.json`. Portable handoff and raw local verification logs are retained separately under the project handoff directory.

## Restored-access verification

At 2026-10-10 02:42 UTC the owner resumed in an unrestricted network/filesystem session. GitHub, Docker and Kaneo access were confirmed. The unchanged source from `0f6ef637530652cebb1c63f6ddbe0fbfb01d89d3` passed the normal full script suite: **129/129 tests, exit 0**. The previous subprocess-related failures remain historical evidence; no test or safety control was changed to obtain this pass.

Remote master is still `30ed8a82f485fa5af4f43f33684882e1736fa8a3`; PR382 remains open at `e4ee69b510710c53b5f72a286af169c7008b5ea0`. Its two final CI runs completed with failure at the isolated funnel QA Docker pull before fixtures started; the captured Python error does not identify the image or registry cause. Both failed verification jobs were requested to rerun. No CI success, merge or deployment is claimed here. Production still has all four application containers healthy at `5d42c2d11f997fddc012192d9247c9ec694d66b5`.

Continue the dedicated follow-up directly into master, reconcile it after PR382, and require successful full CI, exact-source review and deployed smoke before runtime closure. No additional paid call or authority mutation is part of this release.
