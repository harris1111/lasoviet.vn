# LSV-14 Domain and Readability Audit

Date: 2026-09-14

Audited base: `ca15ea361ee6abfe2ed84d01a0573b334e04af49`

Branch: `ticket/lsv-14-20260914`

Mode: planning and evidence only

## Executive Summary

- The backend and its workspace producers rebuilt successfully. The stale
  `packages/backend/dist` match reported in the ticket is gone.
- No `lasoviet.vn` match remains in a customer-facing application, email
  template, prompt, metadata, robots, sitemap, OG, or environment-default
  surface. The remaining 128 workspace matches are intentional redirect/test
  references or historical documentation, repository paths, and prototypes.
- Definite customer-facing findings are: the 320 px homepage comparison table
  requires horizontal scrolling; account tabs require horizontal scrolling at
  320 px and slightly overflow the 200%-equivalent viewport; and the wizard
  privacy notice has a measured contrast ratio of 3.29:1 at 11 px.
- The knowledge article reading region passes at 17 px / 1.75. The public sample
  report mixes 14-17 px body text, while paid-reader source CSS is 17 px / 1.8.
- The existing typography suite passed bundled Vietnamese font loading for both
  locales. Successfully rendered audited routes used the configured stacks with
  generic Android-capable fallbacks.
- The private ready-report browser check is blocked by the reused WP-13 fixture,
  which predates the current V4 query contract. This is test evidence debt, not
  proof that a production report route is broken.
- Axe could not resolve color contrast for most text rendered over images,
  gradients, opacity layers, or lacquer textures. Those surfaces remain pending
  evidence from An and exclusive visual sign-off from Harris under FD-056.

## Invocation and Scope Evidence

- The requested no-file probe for `cx/gpt-5.6-sol` with `high` reasoning was
  accepted, but the harness did not expose invocation metadata. The model and
  effort therefore remain explicitly requested but metadata-unverified.
- The branch fast-forwarded from `a3003bb` to the authorized target `ca15ea3`.
  The pre-existing dirty `AGENTS.md` was preserved and was not staged.
- A scope correction arrived after a local measurement harness had been created.
  `tests/e2e/lsv14-readability-audit.spec.ts` is intentionally left untracked,
  unmodified, unstaged, and excluded from this milestone.

## Domain Match Classification

The broad post-build scan used `rg --hidden --no-ignore`, excluding `.git`
internals, `node_modules`, `.next`, Playwright output, and this evidence
directory. It also excludes the two LSV-14 documents that describe the audit
term itself. The scan found 128 matches in 63 files.

| Classification | Matches | Files | Result |
|---|---:|---:|---|
| Customer-facing bug | 0 | 0 | PASS |
| Approved redirect reserve or negative guard | 10 | 5 | PASS |
| Historical/docs/path/prototype | 118 | 58 | ACCEPTED |
| Generated artifact after rebuild | 0 | 0 | PASS |

Approved redirect and negative-guard files:

- `config/domain-routing.json`
- `apps/web/src/routing/canonical-origin.ts`
- `tests/i18n/runtime-routing.test.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-writer-v4.test.ts`

Historical/docs/path/prototype matches comprise:

- repository and worktree names in `AGENTS.md`, `README.md`,
  `MASTER_CONCEPT.md`, handoffs, historical reports, and architecture records;
- explicit FD-057 supersession and redirect-reserve explanations;
- old source quotations, superseded examples, GitHub repository links, and
  negative audit evidence;
- files under `prototype/`, `docs/visualizations/`, `.superpowers/`, and the
  guideline document generator.

The detailed raw match output is reproducible with:

```bash
rg -n -i --hidden --no-ignore \
  --glob '!.git/**' --glob '!node_modules/**' --glob '!**/.next/**' \
  --glob '!docs/reports/2026-09-14-lsv-14-domain-readability-audit.md' \
  --glob '!docs/superpowers/plans/2026-09-14-lsv-14-domain-readability-remediation.md' \
  --glob '!docs/reports/evidence/lsv-14/**' \
  --glob '!test-results/**' --glob '!playwright-report/**' \
  'lasoviet\.vn' .
```

## Canonical Surface Checks

| Surface | Evidence | Result |
|---|---|---|
| Backend generated output | Direct grep of `packages/backend/dist` after dependency-ordered build | PASS |
| Runtime application source | Only reserve-host allowlist remains | PASS |
| Auth email templates | URLs are supplied through canonical action URLs; no `.vn` literal | PASS |
| Checkout/report support copy | No `.vn` literal | PASS |
| Robots | `https://lasoviet.net` and canonical sitemap | PASS |
| Sitemap index | All listed sitemap URLs use `https://lasoviet.net` | PASS |
| Public metadata and OG origin | `PRODUCTION_ORIGIN = "https://lasoviet.net"` | PASS |
| Environment example | Documents canonical `https://lasoviet.net` | PASS |
| Report prompts | V3 and V4 prompts use `lasoviet.net` | PASS |

Separate technical gap: failed-report projection still exposes
`lasoviet.net@gmail.com`, not a mailbox hosted at `@lasoviet.net`. LSV-26 owns
the founder-approved domain support channel and external mail readiness.

## Readability Matrix

The `200% proxy` evidence uses a 640 x 450 CSS viewport, the reflow-equivalent
of a 1280 x 900 desktop viewport at 200% browser zoom. It is preliminary reflow
evidence, not native browser-chrome zoom verification.

| Route | 320 px reflow | 200% proxy | WCAG AA contrast | Reading type | Vietnamese fonts | Evidence |
|---|---|---|---|---|---|---|
| `/` | FAIL: `.table-responsive` is 403 px inside 288 px | PROXY PASS; native zoom unverified | MANUAL: 141-142 axe incomplete nodes over layered media | N/A | PASS | `homepage-*.png` |
| `/tao-la-so/tu-vi` | PASS | PROXY PASS; native zoom unverified | FAIL: `.wizard-privacy` is 3.29:1 at 11 px | N/A | PASS | `birth-wizard-*.png` |
| `/la-so/{chartId}` | PASS excluding ticket #8 board scroll | PROXY PASS excluding ticket #8; native zoom unverified | MANUAL: textured/layered surface | N/A | PASS | `chart-result-*.png` |
| `/la-so/{chartId}/chon-luan-giai` | PASS | PROXY PASS; native zoom unverified | MANUAL: axe incomplete on layered cards | N/A | PASS | `topic-selection-*.png` |
| `/thanh-toan/{orderId}` | PASS | PROXY PASS; native zoom unverified | MANUAL: no definite axe violation, unresolved layered nodes | N/A | PASS | `checkout-*.png` |
| `/bao-cao/{reportId}` ready | BLOCKED: stale WP-13 fixture returns 500 | BLOCKED | BLOCKED | Source is 17 px / 1.8; browser evidence blocked | BLOCKED | `paid-report-ready-*.png` |
| `/tai-khoan` | FAIL: tab strip is 613 px inside 288 px | PROXY FAIL: 613 px inside 608 px; native zoom unverified | MANUAL: no definite axe violation | N/A | PASS for present roles | `account-*.png` |
| Knowledge article | PASS | PROXY PASS; native zoom unverified | MANUAL: no definite axe violation | PASS: 17 px / 1.75 | PASS | `knowledge-article-*.png` |
| `/bao-cao-mau/tu-vi` | PASS | PROXY PASS; native zoom unverified | MANUAL: layered cards/media | FAIL as reading proxy: long copy ranges 14-17 px / 1.6-1.75 | PASS | `sample-report-*.png` |

All screenshots and machine-readable metrics are under
`docs/reports/evidence/lsv-14/`. The canonical metrics file is
`readability-metrics.json`.

## Technical Findings

### Must Fix After Implementation Approval

1. **Wizard privacy notice contrast**: foreground `rgb(110, 102, 86)` over
   `rgb(21, 18, 14)` measures 3.29:1 at 11 px. This fails WCAG AA normal-text
   contrast and also conflicts with the planned 14 px minimum in LSV-19.
2. **Homepage 320 px reflow**: `.table-responsive` requires horizontal
   scrolling. LSV-20 already plans to replace this table with responsive cards.
3. **Account 320 px and zoom reflow**: `.account-nav-tabs` requires horizontal
   scrolling at 320 px and retains a 5 px overflow at the 200%-equivalent size.
4. **Ready-report evidence fixture**: the WP-13 seed writes empty normalized
   chart output and an obsolete one-section ready report. Current query services
   fail closed with `ZIWEI_QUERY_DATA_INVALID` and `REPORT_QUERY_DATA_INVALID`.
5. **Clock-dependent checkout fixture**: the nominal pending order rendered as
   expired because the seed uses fixed historical timestamps. Runtime-clock
   fixtures must derive expiry from a captured clock.

### Follow-Up

1. The existing `free-chart-flow.spec.ts` reaches a valid generated chart but
   fails because `getByText("Lá số riêng tư")` now matches two elements.
2. Paid-reader CSS uses a 1.8 line-height, above the ticket target of
   approximately 1.65-1.75. LSV-25 owns the reader redesign and specifies 1.7.
3. Automated contrast remains inconclusive on image/texture surfaces. Harris's
   exclusive visual sign-off under FD-056 must use the screenshots plus a
   reviewed foreground/background sampling method before release.
4. The support mailbox domain gap belongs with LSV-26 and external mail setup.

## Concurrency Assessment

- **LSV-10**: no file or behavior conflict. It owns server-side commerce
  aggregates.
- **LSV-12**: no current file conflict. It may change wizard consent wording and
  analytics behavior, so final wizard screenshots must be regenerated after its
  approved implementation.
- **LSV-15**: direct evidence dependency. Its V4 report contract and generation
  changes make the old WP-13 ready-report fixture invalid. LSV-14 must not
  modify that fixture independently while LSV-15 is active.

## Verification Commands

- Dependency-ordered backend build: passed.
- Engine-adapters rebuild followed by API build: passed.
- Web typecheck and production build: passed.
- Existing typography Playwright suite: 2 passed.
- One-off LSV-14 browser measurement: completed, 18 route/viewport records.
- Live local robots, sitemap, homepage canonical checks: passed.

## Unresolved Questions

1. Harris's exclusive visual sign-off is still required for text over
   lacquer/image surfaces under FD-056; An supplies the evidence.
2. An must decide whether strict no-horizontal-scroll applies to account tab
   navigation or whether a documented accessible tab-scroller exception is
   acceptable.
3. Native browser-chrome zoom evidence should be added during implementation
   verification if the target CI/browser environment can control zoom reliably.
