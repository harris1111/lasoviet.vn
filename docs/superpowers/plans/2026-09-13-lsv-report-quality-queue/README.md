# LSV Report Quality Dependency Queue

**Date:** 2026-09-13
**Status:** Planning only; implementation is not approved by this document
**Queue:** LSV #29 -> #15 -> #16 -> #17
**Branch workflow override:** Founder instruction dated 2026-09-13 applies:
each delegated ticket branch starts from current `origin/master`, pushes its own
branch, and opens a pull request directly to `master`. No agent merges. PR #51
records the pending durable-policy update.

## Goal

Recover the failed paid V4 report without inventing production evidence, then
replace the fragile whole-report generation path, introduce the approved
Vietnamese V4.1 corpus, and finally add optional reading context without
changing immutable chart facts.

## Binding Sources

- `AGENTS.md`
- Founder decision tracker, especially FD-043, FD-053, FD-057, and FD-072
  through FD-078
- `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md`
- `docs/superpowers/specs/2026-09-13-ziwei-knowledge-editorial-ruleset.md`
- Kaneo LSV #29, #15, #16, and #17, including the 2026-09-13 founder comments
- PR #51 for the temporary direct-to-`master` branch workflow override

## Queue Gates

| Gate | Required evidence | Blocks |
|---|---|---|
| Q0 | Founder approves these implementation plans and the affected scope | All implementation |
| Q1 | Sanitized production evidence identifies the actual #29 error and stage | #29 recovery execution |
| Q2 | #29 correction is deployed and the affected report is fulfilled, or the founder records another disposition | #15 activation |
| Q3 | LSV #11 usage accounting records every writer, retry, rewrite, and critic call | #15 paid-default activation |
| Q4 | Founder signs off three generated reports from the sectioned generator | #15 paid-default activation |
| Q5 | #15 quality config and gates are merged and stable | #16 corpus generation |
| Q6 | Founder signs off the deterministic random sample of about 50 V4 corpus chunks | #16 retrieval activation |
| Q7 | #6 autosave is merged and the #17 UI artifact is founder-approved | #17 UI integration |

## Cross-Branch Rules

1. Each ticket branch starts from the latest fetched `origin/master`.
2. Related branches are not developed against one another. A later ticket
   starts only after the prior ticket is merged to `master`, unless the founder
   explicitly changes this queue.
3. Before each PR is declared ready, Sol runs non-mutating conflict and semantic
   overlap checks against current `origin/master` and any still-open related
   PRs, including PR #51.
4. Flash Executor receives only the bounded slice currently authorized. It
   stops on ambiguous evidence, unexpected source changes, provider
   credentials, production access, or failures outside the named checks.
5. Terra reviews complete milestones, not every small edit. Only adjudicated
   `must-fix` findings return through a narrowed Sol brief.
6. Merge, deployment, production data access, external email/DNS work, and
   production recovery each require explicit founder authorization.

## Plans

- `01-lsv-29-paid-report-failure-recovery.md`
- `02-lsv-15-v4-section-generation-and-quality-gates.md`
- `03-lsv-16-v4-knowledge-corpus.md`
- `04-lsv-17-reading-context.md`

## Queue-Level Conflict Risks

- #29 and #15 both touch V4 writer, validator, critic, generation, and recovery
  behavior. They must be sequential.
- #15 and #11 both change the AI provider response boundary. #11 must merge
  first or Sol must issue a reconciled brief after a semantic-overlap review.
- #15 and #16 both change report version selection, retrieval, provisioning,
  and quality checks. #16 activates only the already-reviewed #15 generator.
- #17 overlaps #6 autosave, #12 consent/privacy copy, and #21 wizard UI. The
  headless data work and the visual artifact work must remain separately owned.

## Production-Only Evidence

No production facts were collected in this planning run. Production failure
codes, report state, aggregate V4 success/failure counts, customer fulfillment,
mailbox delivery, deployment health, and smoke results remain external
evidence. They must be recorded with exact timestamps and sanitized fields
before any corresponding acceptance criterion is claimed.
