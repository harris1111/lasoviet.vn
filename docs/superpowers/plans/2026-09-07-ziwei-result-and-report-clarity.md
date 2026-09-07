# Zi Wei Result and Report Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a fully localized, fact-specific Zi Wei result page and a clearer evidence-grounded Phase 04 paid report pipeline.

**Architecture:** Extend the strict owner-authorized chart projection with a minimal immutable birth summary, localize evidence through canonical codes, and derive free-result highlights from normalized chart facts. Provision a versioned first-party knowledge corpus in the worker, retrieve it with section and fact context, and enforce a prompt/critic/rewrite quality gate before immutable persistence.

**Tech Stack:** TypeScript 6, Next.js 16, React 19, NestJS 12, Drizzle ORM, Zod, Vitest, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-09-07-ziwei-result-and-report-clarity-design.md`

## Global Constraints

- Communicate with the founder in Vietnamese; repository files and commits are English.
- Sol high orchestrates, Gemini Flash high implements bounded briefs, Terra high reviews the completed milestone.
- Use Superpowers only; never invoke `/ck` or CK CLI.
- Preserve report authorization, evidence binding, immutable report versions, and owner privacy.
- Do not send birth date, account identity, email, location, or other unnecessary personal data to the AI provider.
- Do not add vector search, open-web retrieval, fine-tuning, new paid SKUs, deployment, or production side effects.
- Existing reports remain immutable; render-time localization may improve their evidence UI.
- Verification is focused: relevant tests, workspace typecheck, web build, i18n parity, and diff check.

---

### Task 1: Localized result data and deterministic value summary

**Files:**
- Modify: `packages/contracts/src/free-identity-preview-v1.ts`
- Modify: `packages/contracts/src/ziwei-view-v1.ts`
- Modify: `packages/contracts/src/free-identity-preview-v1.test.ts`
- Modify: `packages/backend/src/reports/free-identity-preview.ts`
- Modify: `packages/backend/src/ziwei/ziwei-query.repository.ts`
- Modify: `packages/backend/src/ziwei/ziwei-query.service.ts`
- Modify: `packages/backend/src/ziwei/ziwei-query.service.test.ts`
- Modify: `apps/web/src/features/ziwei/ziwei-presentation.ts`
- Modify: `apps/web/src/features/ziwei/ziwei-presentation.test.ts`
- Create: `apps/web/src/features/ziwei/ziwei-result-summary.tsx`
- Create: `apps/web/src/features/ziwei/ziwei-result-summary.test.tsx`
- Modify: `apps/web/src/features/reports/free-identity-preview.tsx`
- Modify: `apps/web/src/features/evidence/evidence-drawer.tsx`
- Modify: `apps/web/src/features/reports/report-reader.tsx`
- Modify: `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`
- Modify: `apps/web/messages/vi/ziwei.json`
- Modify: `apps/web/messages/en/ziwei.json`
- Modify: `apps/web/src/styles/global.css`

**Interfaces:**
- `ZiweiChartViewV1.birthSummary` contains only normalized calendar, normalized
  time, timezone provenance, and optional gender from the exact chart revision.
- Free-preview evidence references include `interpretationBoundCodes`.
- `ziweiPresentation(locale)` exposes localization for evidence bounds,
  brightness, transformations, gender, calendar type, and time precision.
- `ZiweiResultSummary` receives `chart`, `birthSummary`, and `locale`.

- [ ] Write failing contract and presentation tests proving the birth summary is
  required, interpretation-bound codes survive preview projection, and
  canonical values render in VI/EN without raw English evidence text.
- [ ] Run the focused tests and confirm they fail against the current behavior.
- [ ] Join `birthProfileRevisions` through the chart's exact
  `profileRevisionId`, parse `NormalizedBirthProfileV1`, and construct the
  minimal strict birth summary.
- [ ] Add localized presentation functions. Unknown canonical values must use a
  localized generic fallback and must not expose raw IDs.
- [ ] Implement `ZiweiResultSummary` with birth date/calendar, time, timezone,
  gender, Life Palace branch/stars, Body Palace placement, and Four
  Transformations.
- [ ] Replace raw interpretation-bound rendering in free preview, evidence
  drawer, and report reader with code-based localized text.
- [ ] Replace generic free-preview body text with chart-specific deterministic
  summaries while retaining evidence buttons.
- [ ] Add compact lacquer/gold responsive styles without redesigning the page.
- [ ] Run focused tests, contracts/backend/web typechecks, i18n parity, and
  `git diff --check`.
- [ ] Commit with `fix(ziwei): localize and enrich chart results`.

### Task 2: Phase 04 report content quality hardening

**Files:**
- Create: `content/knowledge/vi/ziwei/identity-report-foundation.v2.json`
- Create: `content/knowledge/en/ziwei/identity-report-foundation.v2.json`
- Create: `apps/worker/src/reports/provision-report-knowledge.ts`
- Create: `apps/worker/src/reports/provision-report-knowledge.test.ts`
- Modify: `apps/worker/src/main.ts`
- Modify: `apps/worker/src/worker.module.ts`
- Modify: `apps/worker/Dockerfile`
- Modify: `packages/backend/src/commerce/commerce.repository.ts`
- Create: `packages/backend/src/reports/identity-report-config.ts`
- Create: `packages/backend/src/reports/identity-report-config.test.ts`
- Create: `packages/backend/src/reports/identity-report-prompt-context.ts`
- Create: `packages/backend/src/reports/identity-report-prompt-context.test.ts`
- Modify: `packages/backend/src/reports/report-source.ts`
- Modify: `packages/backend/src/reports/report-generation.repository.ts`
- Modify: `packages/backend/src/reports/identity-report-outline.ts`
- Modify: `packages/backend/src/reports/identity-report-writer.ts`
- Modify: `packages/backend/src/reports/identity-report-writer.test.ts`
- Modify: `packages/backend/src/reports/report-critic.ts`
- Modify: `packages/backend/src/reports/report-critic.test.ts`
- Modify: `packages/backend/src/reports/report-generation.service.ts`
- Create: `packages/backend/src/reports/report-generation.service.test.ts`

**Interfaces:**
- New reservations use `ziwei.identity.knowledge.v2` and
  `ziwei.identity.prompt.v2` through exported report configuration constants.
- `provisionReportKnowledge()` reads both V2 manifests and idempotently calls
  `createKnowledgeIngestionService` before report polling starts.
- Writer knowledge context preserves `reportSections` and
  `sourceAttribution`, bounded to 11 passages, 900 characters each, and 9,600
  total characters.
- Writer accepts an optional single revision input containing the prior
  generated content and critic notes.
- Critic returns low safety/correctness as `REPORT_SAFETY_REJECTED`; any other
  score below four returns `AI_OUTPUT_INVALID` with bounded notes.

- [ ] Write failing tests for V2 manifest integrity, worker provisioning,
  section-preserving bounded knowledge, localized prompt facts, canonical
  titles, all-score critic gating, and exactly one rewrite attempt.
- [ ] Run the focused tests and confirm they fail for the expected missing
  behavior.
- [ ] Add first-party VI/EN V2 manifests covering all 11 report sections and
  only the current evidence vocabulary: Life Palace, Body Palace, earthly
  branches, Four Transformations, reflective limits, and practical actions.
- [ ] Provision both manifests before creating the report runner. Include
  `/content` in the worker runtime image and fail startup with a stable
  `REPORT_KNOWLEDGE_PROVISION_FAILED` error when either manifest fails.
- [ ] Build localized prompt facts from the frozen evidence values without
  adding personal profile data or unresolved chart facts.
- [ ] Preserve section/source metadata in bounded knowledge and build retrieval
  query text from section purpose plus localized frozen facts.
- [ ] Use exact localized canonical section titles and the approved plain
  language claim sequence in prompt V2. Overwrite model-provided titles during
  assembly.
- [ ] Require every critic dimension to score at least four. Keep
  correctness/safety failures terminal safety failures and classify other
  quality failures as invalid AI output with bounded feedback.
- [ ] On the first non-safety quality failure, generate one revision using the
  prior draft and critic notes, then rerun deterministic validation and critic
  exactly once. Never persist either failed draft.
- [ ] Run focused tests, workspace typecheck, web production build, i18n parity,
  and `git diff --check`.
- [ ] Commit with `fix(reports): improve grounded report clarity`.

### Milestone review

- [ ] Generate a diff package from `3372d08` to branch HEAD.
- [ ] Ask Terra high to review localization, privacy, evidence grounding,
  knowledge provisioning, rewrite bounds, compatibility, and exclusions.
- [ ] Return only evidence-backed must-fix findings to Gemini in one bounded
  correction brief, then request one scoped Terra re-review.
- [ ] Record final verification evidence. Do not push, merge, or deploy.
