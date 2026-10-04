# LSV76 contextual unlock and owner-approved execution brief

## Authority and scope

Owner instruction on 2026-10-04: "ok, hợp lý á, giờ làm theo đề xuất, test theo ticket, nếu oki thì báo done nha". This approves the recommendations in the Vietnamese owner worksheet at `4b6e57f9dd4e213c147c5172d194b1f96bf7bfae`, including the contextual preview/top-up/waiting-room direction. PR276 was independently reviewed and merged as the design prerequisite. Baseline: `f183dab1f4e0b71efd0415dfd686327a103bab03`.

This milestone implements LSV76: authorized read-only wallet quotes, contextual palace/lifetime confirmation, active/reserved offer ladder and palace selection. Record the narrow FD109 preview amendment, exact FD107 score-weight approval, and bounded acceptance campaign authorization. LSV77 inline top-up and LSV78 waiting/reader continuation are subsequent bounded milestones; do not claim their acceptance from this milestone.

## Allowed changes

- Contracts/backend/API: quote DTO, pure price projection shared with purchase pricing, owned chart/version and verified account validation, closed input, safe output, controller/repository wiring and focused tests.
- Web: private quote proxy, contextual unlock component using existing wallet commands, free-result preview integration, offer ladder/palace picker and API-driven rollover display, associated styles and matched VI/EN strings.
- Route registry and matching state/robots/sitemap tests for new API routes and offer query behavior.
- Tracker, active free-result spec, phase-5 plan, this brief and bounded release evidence.

No provider/catalog activation, free AI dispatch, historical purchase-date edits, host configuration changes or direct master commits. Reserved products remain unbuyable; English legacy report capabilities must not be broadened by a catalog label alone.

## Required behavior

1. Quote reads have no wallet, intent, entitlement, grant or provider writes. Existing monthly expiry cleanup belongs to purchase commands, not reads. Reject wrong owner/chart/version and unknown/duplicate query fields; never accept a client price.
2. Price and rollover credit derive from the same backend rules used at spend time. Quotes are advisory; confirmation always uses the server-created intent/version and current wallet version. Stale quotes cannot authorize a cheaper purchase.
3. A locked palace offers its own 120-La purchase and a lifetime alternative only inside its explicitly opened preview. Free body/map stays price-free; existing completion/sticky eligibility stays intact. Preserve secure clipped projections, native-dialog focus/history and consent behavior.
4. Active ladder: palace, natal excerpt where supported, lifetime. Reserved topic/annual/combo/member offers show truthful availability and have no purchase action. Deep-link selection uses closed offer/palace values. Owned content links to its actual reader/progress state.
5. Sufficient-balance purchase completes in place through existing atomic wallet commands; no duplicate debit or unauthorized content projection. Insufficient balance retains the existing safe return/intent flow until LSV77 lands.

## Acceptance and release

Run frozen-clock PostgreSQL quote/rollover/ownership/no-write tests and existing wallet settlement/continuation regressions. Cover VI/EN active/reserved rendering, quote errors/staleness, preview confirmation, duplicate actions, native focus/history, mobile overflow and locked-payload absence. Rebuild producers before dependent typechecking; run i18n/lint/typecheck before PR. Independent exact-head review and deployed smoke are mandatory.

Only mark LSV76 Done when every ticket criterion and target deployment smoke are recorded. Missing sandbox/account/device inputs remain explicit acceptance limits; no mock or auto-approved payment counts as authenticated provider acceptance. Paid quality campaigns and membership tool methodology remain separate gates.
