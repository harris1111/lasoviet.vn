# Next Agent Prompt

## 2026-09-09 update — content/UX merged on product/experience-spec-v1, two pages blocked on you

Read this section first; the rest of this file is a prior, unrelated task snapshot (Phase 04 / Windows
worktree) kept below for continuity — reconcile it with your own current state before acting on it.

Liêu Lãm (product/founder) ran a UX/content polish pass reconciling the independent
`lasoviet-ux-content-handoff` audit with the same-day FD-036…FD-056 product-ladder decisions. Merged into
`product/experience-spec-v1` and **pushed to origin** (commits `00f3470`, `862b5a7`, `2351584`, `79a1595`,
merge `7c42211`). Verified before merge: `tsc --noEmit` clean, `next build` clean, `node
scripts/check-public-content.mjs` clean (54 docs), full `tests/web` + `tests/i18n` green (47 tests).

**Shipped (frontend/content only, no backend dependency):**
- Homepage: hero/lenses/trust-strip voice rewrite, tier-pricing grid removed entirely (product decision:
  no price shown on homepage — pricing lives only on sample/commercial pages), new "Về Lá Số Việt" excerpt
  section before the final CTA.
- `/la-so/[chartId]` (free result): removed the hardcoded `79.000 ₫ · Bản mệnh & Tiềm năng` CTA block
  (stale single-SKU copy, duplicated the ladder's source of truth) and added the missing 24h anonymous-
  data notice.
- 5 MDX pages (`/phuong-phap`, `/phuong-phap/tu-vi`, `/phuong-phap/ai-va-can-cu`, `/nguon-tri-thuc`,
  `/ve-la-so-viet`) rewritten out of internal-engineering language. **Note:** these MDX bodies still are
  not rendered by the runtime (`public-content-page.tsx` only shows title/summary — this is the
  `lasoviet-ux-content-handoff` audit's Must-fix 1, still open, not part of this pass).

Full record: `docs/superpowers/specs/2026-09-09-content-ux-polish/` — `voice-and-positioning.md` for the
site-wide direction (heritage framing, banned/allowed persuasion techniques), `vi/*.md` for per-page
before/after analysis, `final-copy/vi/*.md` for clean shipped-text-only versions.

**Blocked on your side — content is drafted and ready, do not write new copy for these:**
- `/la-so/[chartId]/chon-luan-giai` (topic selection) — needs WP-01 (multi-SKU contract) and WP-02 before
  it can render two offers instead of `topics.offers[0]`. Copy already written:
  `docs/superpowers/specs/2026-09-09-content-ux-polish/final-copy/vi/private.chart.topic.md` — includes the
  mandatory 7-day upgrade-credit disclosure (FD-041) at the tier-1 purchase point, and state variants for
  returning upgraders / already-owns-tier-2 / unverified.
- `/thanh-toan/[orderId]` (checkout) — needs WP-01/WP-02/WP-02B (payment safety redesign: immutable
  `invoice_number`, new short `payment_code`, 24h TTL, self-claim flow). Copy already written:
  `docs/superpowers/specs/2026-09-09-content-ux-polish/final-copy/vi/private.checkout.md` —
  assumes the new `payment_code` + 24h TTL mechanism from the product-ladder spec (R-PAY-1…7, R-AUTO-1…7);
  do not try to patch it onto the current `invoice_number`-as-transfer-content flow. Deliberately has no
  persuasion/urgency copy — reassurance and clarity only.

When you build these two, wire the drafted copy in rather than writing new copy — it already went through
the same review as everything above.

---

Continue the `harris1111/lasoviet.vn` project from:

- Worktree: `G:\Dev\Repos-Windows\tuvi-a-lam\lasoviet-admin-operations-plan`
- Branch: `feature/paid-flow-admin-operations`
- Audited implementation baseline:
  `8393f4a3fda31ff6aa50c5ad4390bcc4e5bf9e3c`

Before changing anything:

1. Read `AGENT_HANDOFF.md`.
2. Read `AGENTS.md` and `README.md`.
3. Read the master plan, decision tracker, P04-T03 phase section, and matching
   task contract.
4. Fetch `origin`, verify the actual branch/HEAD/worktree state, and report any
   drift from the handoff.
5. Summarize the exact files, behavior, checks, and exclusions for P04-T03.

Use Superpowers only; never invoke `/ck` or CK CLI. Communicate with the founder
in Vietnamese. Keep repository documents and commit messages in English.

Agent roles:

- Sol xhigh orchestrates and reviews meaningful milestones.
- Terra medium implements, debugs, and runs focused checks.
- Global Flash Executor high (`ag/gemini-3.8-flash-high`) may execute only an
  exact bounded Sol/Terra brief. It must not plan, propose, infer scope, or debug
  deeply.
- Luna remains paused.

Primary task: implement **P04-T03 report worker and report state machine** so the
existing `report.generation.requested.v1` path has a durable consumer. Do not
expand into P04-T04 knowledge retrieval, full P04-T05 AI generation, P04-T06
HTML persistence, deployment, production payment activation, or production AI
activation.

Do not push to `master`. Do not create a PR, merge, deploy, expose credentials,
or trigger external side effects unless the founder explicitly requests that
operation.
