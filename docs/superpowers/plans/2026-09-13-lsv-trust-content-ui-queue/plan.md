# LSV Trust, Content, and Dependent UI Queue Implementation Plan

**Date:** 2026-09-13
**Status:** Planning complete; implementation is not authorized
**Queue:** LSV-9, LSV-14, LSV-23, LSV-24, LSV-25, LSV-26, LSV-27, LSV-28
**Planning branch:** `plan/lsv-9-trust-ui-20260913`
**Pull-request target:** `master`

## Goal

Deliver the trust/content foundation first, then the support and conversion
surfaces, and finally the knowledge-library UI without inventing claims,
shipping locked plaintext, duplicating wallet behavior, or bypassing the
approved UI artifact and founder sign-off gates.

This plan is documentation only. It does not authorize product code, UI,
dependency changes, migrations, external AI calls, deployment, or merge.

## Binding Sources

1. Founder decisions in
   `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`,
   especially FD-057, FD-059 through FD-071, and FD-081.
2. Repository `AGENTS.md`, with the explicit founder override dated
   2026-09-13: every delegated ticket branch starts from the latest
   `origin/master`, pushes its branch, and opens a pull request directly to
   `master`; no agent merges. PR #51 documents the pending durable-rule update.
3. `docs/superpowers/specs/2026-09-13-progressive-reveal-la-credits-and-conversion-ui-design.md`,
   reading section 18 first.
4. `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md`.
5. `docs/13-brand-experience-guideline.md`,
   `docs/14-sitemap-seo-wireframes.md`, and live repository behavior.

When older content or UI material conflicts, the founder-decision tracker and
the 2026-09-13 specifications win.

## Verified Baseline

- `origin/master` and this planning branch started at
  `a3003bbac64f0bfd24c7df1b478c231d6f04cc28`.
- The public-content validator already parses and validates MDX bodies, but the
  web runtime repository loads only `config/public-content.json`; body content
  is therefore discarded before rendering.
- The corpus is Markdown-only MDX today: no JSX, imports, exports, or
  expressions were found. It uses headings, lists, emphasis, one table, and
  `route:<id>` links.
- Public trust pages and knowledge articles expose false review wording.
  Feng Shui preview copy exposes internal founder language and promises expert
  review.
- `config/route-registry.yml` is the canonical route source. The sample route
  is public/indexable; chart, topic-selection, checkout, report, and account
  routes are private/noindex.
- Current analytics validation implements the pre-FD-081 model. UI tickets
  must consume the LSV-12 analytics contract and must not weaken analytics
  validation themselves.
- All free-tool routes currently render preview or gated illustrative content;
  no free-tool model is marked functional.
- The repository has no article-card image set for LSV-28.

## Dependency and Merge Order

```text
Founder approves this plan
    |
    +--> LSV-19 approved UI foundation/artifact
    +--> LSV-12 FD-081 analytics contract
    +--> LSV-13 claim registry and policy wording
    |
    +--> LSV-9 trust/content runtime and attribution
            |
            +--> LSV-14 domain audit + baseline readability
            +--> LSV-26 support configuration and support surfaces
                    |
                    +--> LSV-23 pricing and Lá selection
                            requires LSV-18 wallet/ledger
                    +--> LSV-24 public sample
                            requires LSV-22 result UI
                    +--> LSV-25 paid reader
                            requires LSV-18 and LSV-22
                    +--> LSV-27 free-tool cross-sell
                            visible only after a functional tool exists
                                    |
                                    +--> LSV-28 knowledge library
                                          after UI-02 through UI-07
                                          and LSV-20 through LSV-25
```

LSV-8 is an indirect gate for any sample/result screenshot that includes the
mobile twelve-palace chart. LSV-20 and LSV-21 are part of the main purchase
flow that must precede LSV-28 under FD-070.

Dependent work does not start from an unmerged prerequisite branch. After the
founder authorizes a prerequisite PR merge, the next ticket branch is created
from a freshly fetched `origin/master`.

## Delegated Branch Protocol

For every implementation ticket:

1. Sol runs one no-file probe through
   `ag/gemini-3.8-flash-high` with `high` reasoning.
2. Sol verifies the assigned worktree root and exact branch before any edit.
3. The ticket branch starts from the latest fetched `origin/master`.
4. Flash Executor receives only one bounded slice at a time, with the owned
   files, behavior, acceptance criteria, and checks listed in the wave plans.
5. Flash may make one direct correction for a failure caused by its edit.
   Otherwise it returns `BLOCKED` or `NEEDS_CONTEXT`.
6. After all slices for a ticket pass, the branch is committed, pushed, and a
   PR is opened directly to `master`.
7. No agent merges. Founder authorization is required for every merge and all
   deployment or external smoke activity.

## UI Artifact Gate

- LSV-19 must provide the approved shared primitives and responsive artifact
  before any slice creates or changes user-facing layout, styling, responsive
  behavior, bottom sheets, sticky controls, cards, tabs, or article imagery.
- LSV-22 must provide the approved result-page composition and secure-preview
  presentation before LSV-24 or LSV-25 reuses it.
- Downstream branches consume those components and tokens. They do not fork,
  restyle, or reinterpret the artifact.
- A task-specific screenshot review may refine copy and data states, but any
  material visual departure requires renewed founder approval.

## Shared Release Gates

- Content attribution is exactly `Lá Số Việt biên tập` or
  `Edited by La So Viet`; no public human, expert, or team-review claim remains.
- Locked plaintext is absent from unauthorized HTML, JSON, React payloads,
  metadata, print output, clipboard output, and accessibility trees.
- Content prices use Lá only. VND appears only on top-up packs, payment orders,
  and invoices.
- Every route, robots, canonical, sitemap, and schema result continues to
  derive from `config/route-registry.yml`.
- UI events use the LSV-12 FD-081 client/server contract. No ticket adds a
  second analytics path or sends prohibited third-party fields.
- Public content remains server-rendered and indexable where the registry says
  `live_indexable`; private routes remain server-authorized and noindex.
- Screenshots cover 320, 375, 390, 768, 1024, and 1440 widths as applicable.
  Browser zoom 200%, keyboard operation, focus restoration, reduced motion,
  touch targets, and Vietnamese font loading are verified.
- A local build or screenshot is not deployment evidence. Kaneo tasks remain
  `In Progress` or `In Review` until explicitly authorized deployment and
  target-environment smoke evidence exist.

## Terra Review Milestones

| Milestone | Included work | Terra focus |
|---|---|---|
| M1 Trust foundation | LSV-9, LSV-14 domain results, LSV-26 | MDX safety, truthful claims, support source of truth, SEO, no scope leakage |
| M2 Purchase conversion | LSV-23 after LSV-18/19/12/13 | Lá/VND boundary, intent recovery, wallet correctness consumption, accessibility, analytics |
| M3 Proof and reading | LSV-24, LSV-25, eligible LSV-27 work | sample privacy, secure previews, reader persistence, upgrade timing, focus and cross-device behavior |
| M4 Knowledge and final QA | LSV-28 and final LSV-14 matrix | route/content integrity, imagery provenance, readability, SEO, complete screenshot evidence |

Terra reports evidence-backed `must-fix`, `defer`, or rejected findings to Sol.
Only adjudicated `must-fix` findings return to Flash through a narrowed brief.

## Cross-Branch Conflict Map

| Hotspot | Potential owners | Resolution |
|---|---|---|
| `apps/web/package.json`, `pnpm-lock.yaml` | LSV-9, LSV-19 | Merge LSV-19 first; LSV-9 adds only reviewed Markdown dependencies from the refreshed base |
| `apps/web/src/styles/global.css` | LSV-19, LSV-22, LSV-23/24/25/26/28 | LSV-19 owns shared primitives; downstream tickets use scoped style files or existing primitives |
| `apps/web/src/features/content/public-content-page.tsx` | LSV-9, LSV-27 | LSV-9 merges first; LSV-27 avoids dispatcher edits unless the functional-tool contract requires one |
| `config/public-content.json` | LSV-9, LSV-23, LSV-28 | Execute in that order from refreshed `master`; each branch edits only its route records |
| `config/analytics-events.json` | LSV-12 and all UI tickets | LSV-12 is sole owner; downstream branches stop if required events are absent |
| `apps/web/messages/*/reports.json` | LSV-23, LSV-25 | LSV-23 merges first; keys are namespaced by selection vs reader |
| `apps/web/src/features/reports/paid-topic-selector.tsx` | LSV-23, LSV-26 | LSV-26 creates the shared support card; LSV-23 owns selector integration |
| `apps/web/src/features/reports/report-reader.tsx` | LSV-25, other report work | LSV-25 starts only after current report work is merged and producer declarations are rebuilt |
| `apps/web/src/seo/structured-data.ts` | LSV-23, LSV-28 | LSV-23 removes false monetary content offers first; LSV-28 later adds article metadata |
| `config/route-registry.yml` | Route activation tasks, possible LSV-28 expansion | No queue task changes routes unless it also owns state/robots/sitemap tests |

Before any related PR is presented for merge, Sol runs non-mutating
`git merge-tree` checks against current `origin/master` and reports semantic
overlap even when Git finds no textual conflict.

## Completion Evidence

Each ticket PR must contain:

- scope and exclusions;
- exact checks and results;
- desktop/mobile screenshots for visual work;
- accessibility, SEO, privacy, and secure-preview evidence where applicable;
- known limitations and external blockers;
- explicit statement that the PR was not merged or deployed.

## NEEDS_FOUNDER_INPUT

1. Approve this plan version and its task/branch sequence before any
   implementation dispatch.
2. Approve the LSV-19 artifact and each task-specific visual milestone under
   FD-056.
3. Confirm that `support@lasoviet.net` is the intended public address and
   provide evidence that the mailbox accepts inbound mail before public
   activation.
4. Authorize the one-time external AI generation/translation run for the
   anonymized sample when LSV-24 is ready.
5. Decide the initial LSV-28 cluster scope because the current ten articles do
   not populate the requested `Quan hệ` and `Công việc` clusters.
6. Decide whether LSV-27 remains deferred until a free tool is functional or
   closes as dormant infrastructure with no public banner.
7. Legal/finance confirmation of Lá terms and invoice wording remains required
   before production activation through LSV-18/LSV-13.
