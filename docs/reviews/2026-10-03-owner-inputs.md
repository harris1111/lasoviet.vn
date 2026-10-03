# Owner replies needed — 2026-10-03

Reply by number, or fill the `Answer` lines. Either owner can decide; no separate handoff is required. Recommendations below are proposals, not recorded approvals. Never put passwords, API keys, bank credentials or customer birth data in this file.

## Work completed without owner input

- Homepage PR [274](https://github.com/harris1111/lasoviet.vn/pull/274): merged and deployed; VI/EN consent → real chart and 22 viewport checks passed.
- Analytics replay PR [275](https://github.com/harris1111/lasoviet.vn/pull/275): reviewed fix and 76 focused tests passed; final release evidence is tracked in Kaneo LSV57.
- Seven-day funnel counts are now in [the runbook](../runbooks/funnel-dashboard.md). Traffic includes QA, newer steps have incomplete windows, and payment provenance is unverified; these are not customer conversion or revenue figures.
- Guest browser acceptance and remaining limits are recorded against LSV72. Full member/physical-mobile acceptance remains open.

## Decisions and inputs

### 1. Buy a palace inside its locked preview — LSV75/76

**Context:** LSV76 says in-preview purchase was already approved but not recorded; its phase-5 plan still requests sign-off; higher-priority FD-109c/d still permits only a link to the offer page. These three sources conflict. Confirm the prior approval’s scope so it can be recorded, or explicitly supersede it. Homepage review and unticked consent are already settled.

**Proposal:** amend FD-109 to allow prices and purchase buttons inside an explicitly opened locked preview; keep the free page body price-free. Offer this palace at 120 Lá, with a secondary lifetime option at 960 Lá. Final price and rollover credit come from the API; reserved products remain unbuyable.

**Recommendation:** confirm the recorded ticket’s prior approval covers this narrow amendment, then reconcile the tracker/spec. Preserve today's flow until the conflict is resolved.

**Answer:** confirm prior approval and record this amendment / supersede prior approval and retain FD-109 / clarify scope or approval reference: ___

### 2. Review the proposed mobile flow — LSV75–78

**Context:** these tickets require a prototype review before production UI. A concrete [interactive proposal](../../prototype/revamp-2026-09/contextual-unlock-proposal-2026-10-03.html) now covers preview → top-up in the same sheet → waiting room, plus the offer ladder. Quick views: [preview](../../prototype/revamp-2026-09/contextual-unlock-proposal-preview-390.png), [top-up](../../prototype/revamp-2026-09/contextual-unlock-proposal-topup-390.png), [waiting](../../prototype/revamp-2026-09/contextual-unlock-proposal-waiting-390.png). Download/open the HTML alongside its directory. All transactions/balances are simulated.

**Recommendation:** accept this flow direction, then implement with real API quotes, existing intent continuation, order reuse, verified-account checkout, and automatic report readiness. This review does not approve fabricated content, a live provider switch or reserved-product activation.

**Answer:** accept direction / adjust these screens or copy: ___

### 3. Real payment test target and verified fixture — LSV50–54/59/80

**Context:** sandbox testing is already approved by FD-030. Current production has `SEPAY_ENV=disabled` and test auto-approval enabled; that cannot prove authenticated SePay payment, wallet credit, intended unlock, rollover or a real refund.

**Recommendation:** use an isolated SePay sandbox with auto-approval disabled and one verified owner-controlled test account. Supply the environment/merchant configuration through the secure deployment channel; reference its location here. Include an owned paid excerpt/two-palace fixture for rollover, PDF boundaries and guarantee tests. No changes to historical purchase dates to fake acceptance.

**Answer:** sandbox URL + secure configuration reference + test-account reference: ___

If no sandbox exists, choose: wait / authorize one owner-funded controlled live test with an explicit amount: ___

### 4. Paid writer campaign budget, model and five-report review — LSV58/62/63/68

**Context:** real quality gates remain open. Lifetime v4.2 needs 20 consecutive passing real reports and an owner review of 5. Topic writers need 20 per topic; monthly and annual each need 20. Short diagnostic previews do not satisfy these gates. Vietnamese v4.2 is already activated; do not approve it again.

**Recommendation:** start with lifetime v4.2, using the currently configured model alias `ag/gemini-3.8-flash`, with a hard **200,000 VND total campaign cap including retries**. Verify model routing/pricing first; stop on unknown cost or cap exhaustion. This is a proposed ceiling, not an estimate or a guarantee of 20 passes. Schedule the other campaigns separately after this result.

Review five complete reports for chart grounding, readable Vietnamese, useful specific advice, repeated/filler claims and banned content. Record per-report pass/fail and the sentence/section to fix; failed quality never becomes a saleable product.

**Answer:** model/alias: ___; lifetime cap: ___; reviewer: ___; approve this first campaign / defer: ___

### 5. Physical mobile Google return — LSV73

**Context:** deployed Chromium callback checks pass, but intercepted OAuth does not prove Google login on a real iPhone/Safari or Facebook/Messenger browser.

**Recommendation:** on each available browser: open a chart → open its offer → sign in with Google → confirm return to the same chart/offer → use Back/reopen the link. Check language and query/hash are preserved and there is no login loop. Use an owner-controlled account.

**Answer:** device/browser + pass/fail + failed step/observed return URL (remove tokens): ___

### 6. Member acceptance account — LSV72

**Context:** guest checks cannot prove the verified-member side of A17.

**Recommendation:** designate a verified owner-controlled account and a chart it owns on the controlled test environment. No password or session cookie in Git; provide access through the existing secure channel.

**Answer:** environment + account/owned-chart reference: ___

### 7. Exact structural-score weights before paid traffic — FD-107

**Context:** [the tracker](../superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md) still records exact-weight sign-off as pending. [The implemented formula](../../packages/backend/src/reports/structural-palace-score.ts) is deterministic, not an empirical prediction of a person's life.

**Proposal:** base 50; brightness Miếu/Vượng/Đắc/Bình/Hãm/Nhược =+12/+9/+6/+2/−6/−9; Lộc/Quyền/Khoa/Kỵ =+10/+8/+6/−10; six supporting stars +4 each, Lộc Tồn +6, Thiên Mã +3, six blocking stars −5 each, Tuần/Triệt −4 each. Borrowed main-star points count half; add one-third of the sum from the opposite and two triad palaces, round and clamp 0–100. Bands start at 30/45/55/70. The source is authoritative for exact star IDs and double-count prevention.

**Recommendation:** explicitly approve these exact weights for the published structural indicator, or keep the paid-traffic gate closed while revising them.

**Answer:** approve current weights / revise: ___

### 8. Notification test recipient and delivery scope — LSV60/79

**Context:** consent/unsubscribe infrastructure exists; real delivery needs a controlled recipient and sender setup. Recovery reminders must preserve the pending order and never target unconsented accounts.

**Recommendation:** first use sandbox capture or one explicitly designated consenting owner recipient. Keep broad recovery sending off until delivery, consent, deduplication and unsubscribe acceptance pass.

**Answer:** capture-only / authorize controlled test sends; recipient reference + sender/domain configuration reference: ___

### 9. First paid membership tool contract — LSV64

**Context:** the existing owner hold stays binding. Daily/monthly plumbing alone does not fulfill all FD-093 benefits, and the offer cannot quietly be reduced.

**Recommendation:** keep membership reserved; specify one tool first: user inputs → method/engine facts → output → usage limits/expiry → consent/deletion. Start with a calendar/good-day tool only after its method is approved; linking an existing daily reader alone is not a new paid tool.

**Answer:** first tool + method/source + promised output/limits: ___; or defer tooling: ___

## Already decided; no new reply needed

Free AI keeps the approved 3,000 VND/chart-version and 50,000 VND/global UTC-day ceilings, guest 1/verified 3 per rolling24h and one attempt. Generation remains off until pricing, token bounds, real quality, member acceptance and kill-switch evidence pass. Teaser Option B and Vietnamese v4.2 default are approved. Membership and Combo remain reserved; compatibility/BaZi remains deferred. PRs 197/231 stay untouched.

## Engineering work remaining

Authoritative `upgrade_purchased` emission, full real-payment continuation/refund acceptance, locked-preview security/quotes, long free-overview quality, full A17/browser/performance evidence and six golden CI paths remain engineering work. They are not questions for the owner to solve. No full ticket becomes Done from a prototype or partial smoke.
