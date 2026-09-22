# Lasoviet Repository Policy

## 0. Owner Authority & Reference Role Split

- **No Rigid Authority Barrier:** There is no restrictive permission wall or approval silo between An and Lãm.
- **Reference Roles Only:** As an operational reference (not a rigid rule), An focuses on Technical areas and Lãm focuses on Business/Product.
- **Interchangeable Execution:** Either owner has full authority to decide, instruct, authorize, implement, or review tasks across any technical or business domain without requiring separate cross-confirmation or waiting for handoff.
- A direct instruction from either An or Lãm is immediately binding. When explicit instructions conflict, the latest explicit instruction controls.

## 1. Scope And Precedence

This file applies to the entire `lasoviet.vn` repository.

Follow this precedence order:
1. Explicit founder/owner decisions recorded in `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`.
2. This repository policy (`AGENTS.md`).
3. Approved plans and architecture records.
4. Founder-approved experience sources: `docs/13-brand-experience-guideline.md`, `docs/14-sitemap-seo-wireframes.md`.
5. Existing repository conventions.

Blueprint v1.1 (`docs/14`) supersedes UX, route, and SEO material in older legacy documentation. The canonical route catalog is strictly maintained in `config/route-registry.yml`.

Never silently reverse, reinterpret, or weaken an owner-confirmed decision. When sources conflict, stop the affected decision, preserve the conflict in the record, and ask the owner.

### Archive Directory Boundary (Hard Rule)

- Any file located inside `docs/_archive/` or `prototype/_archive/` is archived material (either completed historical records or superseded baselines).
- AI agents MUST NOT read, inspect, search, grep, or cite files in `docs/_archive/` or `prototype/_archive/` unless the user explicitly names the archived file and requests reading it in their prompt.
- Never use archived files as active implementation context, current source of truth, or prompt input.
- When referencing historical documents that have been archived, refer to the active stub file in `docs/` and its specified current replacement source.

## 2. Language And Communication

- Communicate directly with the owner in Vietnamese.
- Write repository documentation, plans, reports, code comments, and commit messages in English.
- Write source identifiers and developer-facing text in English.
- Vietnamese product copy, localized content, proper names, and verbatim source quotations are allowed where the product or evidence requires them.
- Reports must be concise. List unresolved questions at the end.

## 3. Roles And Execution Chain

The active role delegation chain is:

```text
Owner goals and decisions
    -> GPT 5.6 Sol high (Orchestrator)
        -> Flash Executor high (ag/gemini-3.8-flash) for bounded implementation
        -> GPT 5.6 Terra high for independent milestone review
```

- **Interactive Mode:** When the user chats directly with Flash or any other active session model, that model manages the task directly with high factual rigor and executes without unnecessary subagent overhead.
- **Sol (Orchestrator):** Owns scope control, task decomposition, sequencing, and owner communication. Sol gives Flash Executor a fully specified, bounded brief and gives Terra the matching independent review brief.
- **Flash Executor (ag/gemini-3.8-flash at high):** Active primary executor for bounded implementation. Flash implements only the assigned files and behavior, runs focused checks, and returns structured evidence. Flash may make one local correction on immediate syntax/test failure; if ambiguous, it stops with `BLOCKED` or `NEEDS_CONTEXT`.
- **Terra high (Reviewer):** Performs independent adversarial milestone review on features, security/privacy boundaries, and test coverage before release gates. Terra does not write implementation code.
- **Luna:** Remains disabled unless explicitly reactivated by the owner.

## 4. Implementation Governance & Safety

- **Scope & Dedicated Branches:** Every implementation task requires an explicit bounded brief and runs on a dedicated feature branch. Never commit or push directly to `master`.
- **UI & i18n Parity:** When adding or changing user-facing strings in `apps/web/messages/`, always maintain matching key parity in both `vi/` and `en/` and verify with `pnpm i18n:check`.
- **Fast Pre-Push Verification:** Run `pnpm i18n:check && pnpm lint && pnpm typecheck` locally before opening a pull request to ensure CI passes cleanly on the first run.
- **Pre-implementation Verification:** Before implementing external package integrations whose exact-version behavior is unverified, verify task-relevant imports, configuration, and build scripts from local workspace facts; never rely on generic assumptions.
- **Review Closure Gate:** Do not move a Kaneo task to `Done` until the approved implementation has been deployed to its target environment and deployment smoke evidence has been recorded in the task.
- **Implementation & Testing Priorities:**
  1. Critical happy-path E2E flows;
  2. Complete core user and commerce flows;
  3. Deployment and production smoke tests;
  4. Focused unit, integration, fixture, and contract tests required for core correctness and safe vendor boundaries.
  Do not spend time exhaustively testing trivial edge cases unless they touch payments, privacy, calculation determinism, or known regressions. Tests with time dependencies must use frozen/injected clocks.

## 5. Architectural & Deployment Invariants

### Canonical Domain
- `https://lasoviet.net` is the sole canonical domain for public web, SEO, Better Auth, and checkout (FD-057). Non-canonical domains (`.vn`, `.cloud`, `.xyz`) are redirect reserves.

### Canonical Route Registry
- `config/route-registry.yml` is the sole versioned route-definition source.
- `packages/config/src/route-registry.ts` is the typed loader and validator. It must not contain a second hand-maintained route catalog.
- Any task that creates, exposes, retires, or redirects a route must update `config/route-registry.yml` and include matching state/robots/sitemap test coverage.

### Docker Compose Web Publishing
- The web service may use a fixed container port, but Docker Compose must publish it only on host loopback through required `WEB_HOST_PORT` in range `49152-65535`.
- Host Nginx proxies public HTTPS traffic to the loopback `WEB_HOST_PORT`. Repository automation must not alter host Nginx configuration.
- Never bake internal container origins (`127.0.0.1`, Compose service names) into browser code.

### UI Implementation Workflow
- Visual UI implementation proceeds directly on dedicated feature/ticket branches (e.g. `feature/lsv-20-...`) based on approved designs, mockups, or reference specs (such as the approved AITuvi benchmark). Separate artifact branches are not required.
- Do not implement user-facing visual UI in unrelated non-UI (backend/auth/engine) branches.

### Commerce & Payment Security
- Provider hosts and callback actions derive from a closed enum, never free-form user URLs.
- Success and return URLs are navigation-only and must never confirm orders or mutate balances.
- Only an authenticated SePay webhook validated against order identity, state, amount, and currency may confirm payment.

### Privacy & Anonymous Data Retention
- Anti-enumeration: Sign-up, sign-in, and recovery responses must not disclose account existence to anonymous callers.
- Anonymous birth profiles and charts expire and are purged within 24 hours of creation. The product must also provide an immediate manual delete action.
- Account linking transfers ownership into standard account retention without duplicating records.
- Paid checkout requires a verified non-anonymous account.

### Operational Safety & Monorepo Best Practices
- Administrative operations require server-authorized private tools with redacted projections and append-only audit logging.
- When changed workspace packages are consumed through `dist` exports, rebuild the producer package before typechecking dependents.
- Use English conventional commit messages without AI references.
- Do not run destructive git or filesystem commands (`git reset --hard`, `rm -rf`) without explicit instruction.
