# Archive — Superseded Business And Concept Material

**DO NOT READ ANY FILE IN THIS DIRECTORY DURING NORMAL WORK.**

Agents and contributors must not open, cite, quote, or reason from files in
`docs/archive/`. These documents are retained for historical traceability only.
They contain decisions, prices, sitemaps, SKUs, brand language, and task
handoffs that have since been replaced. Reading them produces contradictory
instructions.

Read a file here only when the founder names that exact file and asks for it.

## Canonical business and concept sources

| Question | Read this |
|---|---|
| What has the founder actually decided? | `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md` (FD-001…FD-085) — **the only binding decision register** |
| Concept, positioning, brand voice, UX principles | `docs/13-brand-experience-guideline.md` (v1.1, `source_of_truth: true`) |
| Visual system: color, surfaces, imagery | `docs/22-art-direction.md` + `apps/web/src/styles/tokens.css` |
| Sitemap, SEO, wireframes | `docs/14-sitemap-seo-wireframes.md` (v1.2) |
| Navigation and per-discipline URLs | `docs/19-sitemap-v2-discipline-pages.md` (v1.1) |
| Which disciplines are in scope | `docs/11-discipline-expansion-specs.md` |
| Index eligibility; what is deliberately noindex | `docs/23-index-eligibility-gate.md` |
| Audience insight and content rules | `docs/20-deep-research-ta-social-listening-handoff.md` |
| Branch and PR workflow | `docs/15-collaboration-branch-workflow.md` |
| One-sentence concept and business model | `MASTER_CONCEPT.md` |

`docs/04-phase-1-product-spec.md` and `docs/05-report-system.md` are **evidence
sources cited by `config/claims.json` and `content/public/sources.yml`**, and are
validated by `scripts/public-claim-check.mjs`. They stay in `docs/` for that
reason. Do not treat them as current decision sources; the tracker governs.

## What was archived on 2026-09-20, and what replaced it

| Archived | Replaced by |
|---|---|
| `01-evidence-and-insights.md` | `docs/20-deep-research-ta-social-listening-handoff.md` |
| `02-brand-and-positioning.md` | `docs/13-brand-experience-guideline.md` |
| `03-sitemap-and-seo.md` | `docs/14-sitemap-seo-wireframes.md` + `docs/19-sitemap-v2-discipline-pages.md` |
| `07-content-and-growth.md` | `docs/20-deep-research-ta-social-listening-handoff.md` |
| `09-roadmap-and-metrics.md` | Phase files under `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/` |
| `10-decision-log.md` | `rules-and-decisions-tracker.md` — the file itself declared it was a non-binding summary |
| `16-claude-design-page-build-handoff.md` | Completed; the pages live in `content/public/{vi,en}/pages/` |
| `17-chatgpt-image-prompt-handoff.md` | Completed alongside `16` |
| `18-claude-design-logo-handoff.md` | Completed; the locked logo is in `brand/logo/` |
| `21-audit-tao-tai-khoan-luu-la-so-flow.md` | Resolved; see `docs/superpowers/plans/2026-09-13-lsv-7-oauth-canonical-return.md` |
| `2026-09-04-project-status-and-next-steps.md` | Superseded by the tracker and the current phase files |
| `AGENT_HANDOFF.md`, `NEXT_AGENT_PROMPT.md` | Stale Phase 04 / Windows-worktree snapshots |
| `README-concept-package-2026-08-31.md` | Root `README.md` (rewritten as a pointer index) |
| `prototype-logo/logo-concepts-v2.md` | Rejected by the founder ("quá kỹ thuật, kém sang") |
| `prototype-logo/logo-concepts-v3.md` | Superseded by the locked Colophon v5 mark in `brand/logo/` |
| `prototype-logo/image-prompts-logo.md` | The file itself recorded that this direction was dropped |
| `homepage-content-proposal-v5-2026-09-04.md` | Overtaken by the shipped homepage copy in `content/public/{vi,en}/pages/home.mdx` |
| `prototype-logo/logo-concepts-v2.md` | Rejected by the founder ("quá kỹ thuật, kém sang") |
| `prototype-logo/logo-concepts-v3.md` | Superseded by the locked Colophon v5 mark in `brand/logo/` |
| `prototype-logo/image-prompts-logo.md` | The file itself recorded that this direction was dropped |
| `homepage-content-proposal-v5-2026-09-04.md` | Overtaken by the shipped homepage copy in `content/public/{vi,en}/pages/home.mdx` |
