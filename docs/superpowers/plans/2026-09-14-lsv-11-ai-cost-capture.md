# LSV-11 AI Usage and Contribution Margin Implementation Plan

**Status:** Founder-approved for implementation on 2026-09-14 via Kaneo LSV-11 comment.

## Scope

- Persist provider token usage for every production AI request, including retries,
  provider errors, critic calls, rewrites, and free-preview generation.
- Snapshot the effective model price at usage-record creation so historical
  cost does not change when pricing configuration changes.
- Keep prompt, response, chart content, and generated text out of the cost
  ledger.
- Enforce the founder-approved free-preview budget: at most 3 sections per
  chart, 24,000 billable tokens per chart, and 3,000 VND per chart; allow one
  rewrite per section and fall back to structural preview when capped or
  generation fails.
- Expose typed repository/service functions for AI COGS and contribution-margin
  reporting, including Tier 1/Tier 2 and free-preview cohorts.

## Boundaries

- Preserve existing report, payment, entitlement, queue, and immutable-output
  behavior.
- Do not add UI, analytics, prompt/response storage, or production deployment.
- Payment cost remains zero in V1 and support cost is reported explicitly as
  contribution margin before support cost.
- Model pricing and FX source are a release gate. No production activation or
  `Done` status is allowed until the founder supplies or approves the source
  and deployment smoke evidence is recorded.

## Expected Write Set

- `packages/database/src/schema/ai-cost.ts`
- `packages/database/src/index.ts`
- `packages/database/src/client.ts`
- `packages/database/drizzle/0026_ai_usage_and_cost.sql`
- `packages/contracts/src/ai-cost-v1.ts`
- `packages/contracts/src/index.ts`
- `packages/backend/src/ai/*`
- `packages/backend/src/reports/*` only where request context and preview cap
  integration are required
- focused tests for contracts, schema, adapter, cost service, and report/preview
  budget behavior

## Acceptance Checks

- Usage rows exist for successful, retry, error, critic, and rewrite calls.
- Provider usage is normalized from `prompt_tokens`/`completion_tokens` and
  cached-token variants without storing request or response content.
- Cost is calculated from a versioned effective price and persisted as a
  historical snapshot.
- Preview cap and structural fallback are deterministic and covered by tests.
- `disabled-autopay:` revenue and promotional bonus Lá are excluded by the
  contribution-margin query contract; refunds reduce revenue but not AI COGS.
- Database build, backend build/typecheck, focused Vitest tests, and
  `git diff --check` pass.

## Release Blocker

The implementation must report the missing approved model pricing/FX source to
the founder in Kaneo. Until resolved, the task remains `In Review` or
`In Progress`; it must not be deployed or moved to `Done`.

## Free Preview Runtime Wiring Note

On this branch, free preview is deterministic structural preview (`buildFreeIdentityPreview`).
No runtime production AI generator caller exists for free preview. The helper
`buildGuardedFreeIdentityPreview` implements the binding preview guard boundary and preflight
reservation contract, ensuring deterministic fallback to structural preview when budget caps
would be exceeded or generation fails, without claiming runtime integration for nonexistent
production callers.
