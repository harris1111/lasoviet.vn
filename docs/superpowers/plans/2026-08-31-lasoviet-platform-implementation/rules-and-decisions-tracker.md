# Rules and Decisions Tracker

## Founder Decisions

| ID | Date | Decision | Status | Implemented in |
|---|---|---|---|---|
| FD-119 | 2026-10-08 | Owner decisions after FD-118 on the free-result and purchase-page revamp (plan `2026-10-07-free-result-purchase-revamp`): **(1) Compatibility legal gate REMOVED:** the owner states only the counterpart's birth date is collected, which is no violation; the Decree 13/2023/ND-CP legal-check gate, the `compat.counterpartyConsent` flag and the extra privacy constraints added for this product in FD-118 R11 are dropped from FD-118, plan.md, phase-06 and research/04 (BE-P1-16); one person enters both birth profiles and reads, like any other product. **(2) New prices (La):** Tu Vi lifetime 960 -> 1,200 (equal to 10 single palaces, since 1 palace = 120); NEW Bat Tu lifetime 840 (A/B later 720/840/960); NEW bundle "Tron doi kep" (Tu Vi lifetime + Bat Tu lifetime) 1,500; two-person compatibility product 600 -> 960; Chang 10 nam 360 -> 480. Combo "Lifetime + Year [Y]" stays 1,300 (now 23% below buying 1,200 + 480 = 1,680 separately; say so in sales copy). Year-this + year-next pack stays 780. **Guarantee extended:** La-back for "not accurate" within 24h stays a full refund for items under 500 La; items of 500 La or more get a partial refund of 50%. Basis: hormozi-pricing-strategy review on 2026-10-08 (anchoring vs AiTuVi 219k full reading; Thai Am app $19.99 lifetime; Vietnamese Bat Tu sites mostly free/unpriced); prices are a hypothesis to A/B. **(3) Two-person product NAME:** "Hop doi" is rejected by the owner as hard to understand and not a hook. Keyword evidence (`data/lasoviet_research_master.xlsx`, sheet "Keyword Master"): "boi tinh yeu" 500,000/month; "boi tinh duyen" 50,000; "boi tinh yeu theo ten" 50,000; "boi tinh yeu theo ngay sinh" 5,000; "coi boi tinh yeu" 5,000; "boi tuoi vo chong" 500; "boi tinh yeu theo tuoi" 500; "tu vi tinh duyen" / "tu vi hon nhan" / "tu vi tinh yeu" 500 each; "la so cap doi" 50; "hop tuoi vo chong" 50; "hop doi" absent; "xem tuoi vo chong", "xem do hop vo chong", "boi tinh yeu hai nguoi", "xem tuong hop hai nguoi" not shown. Working name "Tinh duyen doi ta" (subtitle "Hai la so, hop nhau den dau"), SEO landing targets "boi tinh yeu theo ngay sinh" / "xem tuoi vo chong". **The name is PENDING founder confirmation.** Amends: FD-105 prices for lifetime, compatibility and the guarantee (500+ La partial refund); FD-118 R7 Chang price (360 -> 480) and FD-118 R11 legal flag (removed; OD-005 second-person consent interpretation is no longer pending a legal check). Unchanged: Q6 (La only on content, VND only at the final payment step), Combo 1,300 and pair pack 780. | Approved (2026-10-08); product name PENDING; prices to A/B | Plan `docs/superpowers/plans/2026-10-07-free-result-purchase-revamp/plan.md` (section "Cap nhat gia va ten"), phase-05, phase-06, `research/04-ticket-be-cho-an.md` (BE-P1-16, BE-P1-18) |
| FD-118 | 2026-10-08 | Owner round-2 answers on the free-result and purchase-page revamp (plan `2026-10-07-free-result-purchase-revamp`), R1-R13: **R1** YES with a note: the "20 consecutive real generations" quality gate is dropped for the products in this revamp; each product needs only 2-3 manual test readings by the owner and colleagues (screenshots may be sent to Claude for evaluation), plus automated checks. Build code for ALL products now on top of the repo's engine. Work rule: UX/UI frontend = owner + Claude; any backend/engine code = Kaneo ticket for An. **R2** YES: per-chart free-AI cap stays 3,000 VND and the global daily cap stays 50,000 VND/day; when customer volume grows the system must ALERT so the daily cap can be raised (alert threshold and channel specified in the BE ticket). **R3** (no option chosen, owner note): English uses the same rules as Vietnamese - personalised, expert, advisory/coaching/confiding voice (so AI writes both locales; the earlier "AI Vietnamese only" rule is dropped). Do not over-restrict banned words where they hinder the ultimate goal (user trust + sales): only words forbidden by Vietnamese law and factually false claims about the chart are forbidden; phrase/style lists become soft warnings. **R4 NO** (forced "warn" month): the "months needing attention" must be computed from the real engine, exactly the months that need attention in that chart; the owner believes every chart has its own such months and asks to dig deep into the engine. The forced month 7 is removed and a real, engine-grounded rule is to be researched, specified and implemented by An (graded evidence rule over lunar-month palace, monthly/yearly/decadal Hoa Ky, sat tinh, opposite palace); if a chart truly has none the rule is refined, never faked. **R5, R6, R8, R9, R13 YES** (recommended options): R5 the 12-cell month strip marks months needing attention with a lock, in order; R6 mobile keeps one scrolling page plus a sticky 5-chip rail; R8 near Tet the lead card moves to next year and a pair pack "this year + next year" 780 La is built after the year product is live; R9 Combo becomes "Lifetime + Year [Y]" at 1,300 La and the 7-day credit stays as is; R13 Cuc, Menh chu, Than chu, nap am are built in the completion phase without blocking other work. **R7 YES** ("Chang 10 nam cua ban" at 360 La, current decade, or the next one when 2 years or fewer remain) with a note: verify the engine very carefully so time inferences and decade readings are correct for every chart (decadalList correctness, thuan/nghich direction, age ranges, current-decade detection around Tet). **R10 NO**: Membership stays "coming soon" (hidden) as now, AND the missing member tools are to be built now. **R11 NO**: build BOTH compatibility (Hop doi) and the second system (Bat Tu); the owner states compatibility does not need the other person's consent (one person can view for both). Legal flag (do not drop): the other person's birth data is personal data under Decree 13/2023/ND-CP; this is a LEGAL CHECK item for the owner (minimal data, no storage beyond the reading, privacy-policy wording) and, per the standing rule that only Vietnamese law is the boundary, the legal check decides the final consent design. **R12 NO**: build the next topics now, chosen from Claude's suggestions and the Google Keyword Planner research already in the repo (`data/lasoviet_research_master.xlsx`), see plan research/05. Amends: FD-082 and FD-112 (20-consecutive-pass gate and per-campaign caps) are replaced for this revamp by 2-3 owner/colleague manual tests plus automated gates (FD-077 length/anchor checks stay as automated gates); FD-109a caps are confirmed and gain a volume-growth alert; FD-089/FD-075/FD-077 content line: hard blocks limited to legal prohibitions and factually false chart claims (death/lifespan, specific disease diagnosis, rites/lottery topics stay excluded only until the owner's legal check says which of them the law actually requires); FD-117 Q9 "AI Vietnamese only" dropped; the forced warn month is removed (B1); Membership hold (FD-093, 30/09 choice A) is kept for sale but tool building is now in scope; OD-005 launch scope (Tu Vi plus BaZi) is now in build scope, and its second-person consent interpretation is pending the legal check under Decree 13/2023/ND-CP; FD-116 "held" products are no longer gated by 20 runs. Unchanged: Q6 (content prices in La only, VND only at the final payment step), SePay and real outbound email stay off, shared header/footer (FD-100), money path except year parametrisation and new SKUs, FD-105 prices (new: Chang 360 La), Sonnet writes / Opus reviews. | Approved (round 2), partly amended by FD-119 (R7 Chang price 360 -> 480; R11 legal flag removed); content-line legal check and BE tickets pending | Owner round-2 board https://claude.ai/artifact/Vfah8jkp58aqnfUn9D5rRu; plan `docs/superpowers/plans/2026-10-07-free-result-purchase-revamp/plan.md`; BE backlog `research/04-ticket-be-cho-an.md`; topics `research/05-chu-de-moi-tu-seo.md` |
| FD-117 | 2026-10-07 | Owner round-1 answers on the free-result and purchase-page revamp (plan `2026-10-07-free-result-purchase-revamp`), Q1-Q10: **Q1** do not merely hide "coming soon" items: audit the whole product lineup against how people read Tu Vi (AiTuVi and top sites, Hormozi offer/pitch), find per product whether it is held by UI or backend, and where the engine is ready plan to BUILD the missing products; an item stays hidden only until it passes its quality gate and then appears from the catalog. **Q2** remove the Evidence (Can cu) tab; evidence sits next to each claim and the AI writes an expert, personalised basis. **Q3** five time-ordered tabs: Overview (with the chart) -> This year -> Decade (Dai van) -> 12 palaces -> Topics; verify tab completeness against AiTuVi and the traditional order; strong visualisation on mobile and desktop. **Q4** approved: locked rows open a preview sheet with a real excerpt of the person's own chart (explained again in plain words in the round-2 page). **Q5** year logic is per person and by time cycle (current year, next year, clusters of years), not a fixed year. **Q6 NO**: content prices stay in La only; the VND equivalent appears only at the final confirmation step right before payment (FD-065 unchanged). **Q7** replace the 12-palace radar with "3 most supportive palaces / 3 palaces needing care", on-brand badges, asset briefs for ChatGPT if needed. **Q8** add a "Duong doi 10 nam" decadal strip WITH structural scores plus a "how this score is computed" box; a decade's score is the already published FD-107/FD-111 structural score of the palace that decade passes through (no new formula). **Q9** AI writes the free text (very strict prompt, natural Vietnamese, personalised, expert presence; goal: customers trust that La So Viet reads accurately). **Q10** double-bezel cards and pill CTA with arrow; every button needs intentional visible feedback (selection page cards currently give none). Amends: FD-109(e) tab set (Evidence tab removed, Decade tab added, six -> five tabs); FD-063 relaxed only for the decadal strip with the published formula above; FD-109(a) free AI is now intended to write the overview and the evidence (scope grows from the single-palace gift to one whole-reading call), subject to the existing cost/quality/privacy controls and the engineering gates; FD-116 year fallback revised (the lifetime fallback for year questions is replaced by per-person year/decade offers once each passes its gate; until then keep the fallback with honest wording); FD-116 "held" products (Combo, writer campaigns) stay held only until each passes its gate. Unchanged: SePay and real outbound email stay off, shared header/footer (FD-100), money path except parametrising the hard-coded year 2026. Work split: Sonnet executes, Opus only reviews; frontend UI/UX = owner + Claude; backend/engine = developer An via Kaneo tickets. Round-2 answers (R1-R13) are recorded in FD-118. | Approved (round 1); round 2 answered in FD-118 | Owner decision board artifact https://claude.ai/artifact/3CoD9LSUYyM7YUWtjyvQMQ; plan `docs/superpowers/plans/2026-10-07-free-result-purchase-revamp/plan.md` |
| FD-116 | 2026-10-07 | Owner accepts all recommendations in the 2026-10-06 overnight worksheet: the exact LSV75 phase-four prototype is approved for production UI implementation; LSV79 uses option A, retaining account/selection/paid-reader reminder surfaces without adding a free-reader reminder. Keep customer outbound off, SePay/physical-device acceptance deferred, membership/Combo/compatibility and other writer campaigns held, and PR197/231 held. Preserve the one-time 60 La welcome grant, 24-hour anonymous retention, deliberate-preview price boundary, catalog-driven lifetime fallback while annual sale is reserved, and existing free-AI cost/quality/privacy controls. Do not request API/model/pricing decisions again. Approval permits implementation and scoped acceptance; it does not infer bank, physical-device, live writer or outbound test results. | Approved; LSV75 implementation in progress | Direct owner instruction: “ok làm theo các đề xuất hết nha”; worksheet at `c6b60a009b46f81b51b64840824d06f74a5f0449` |
| FD-115 | 2026-10-06 | Owner accepts the deployed LSV68 and LSV71 implementations and explicitly instructs closing both tasks and continuing other work. Remaining API/token-bound/live campaign and owner reading acceptance are waived for this task closure; no live quality results are inferred. This supersedes the corresponding closure blockers in FD112/FD114 and task comments. Existing financial limits, quality enforcement in runtime, model routes, production feature flags and unrelated holds remain unchanged. Stop requesting API configuration or further API investigation for these closures. | Approved; LSV68 and LSV71 moved Done with owner acceptance and deployed PR303 evidence | Direct owner instruction: “nói chung là ko cần lo api, hiểu ko, vậy là ok rồi, kéo done đi, rồi làm ticket khác”; PR303 release `1e49c1e055bd92e018221e9b103fb40c10487243` |
| FD-114 | 2026-10-06 | Owner explicitly accepts official Gemini Developer API Standard pricing as the campaign accounting basis for `ag/gemini-3.8-flash`, instead of investigating the connected account subscription or invoice. Use the verified API tariff and existing frozen FX reference, with source/version/validity recorded; thinking is charged once at the output rate. Do not keep subscription/invoice evidence as an owner input or pricing blocker. This narrowly amends FD112 pricing verification and supersedes the PR301 billing-basis blocker; it does not assert actual provider invoice equivalence or waive the 200,000 VND aggregate cap including retries, one-attempt/unknown-outcome controls, token-bound verification, quality gates or owner reading acceptance. | Implemented and deployed in PR302; subsequent task closure accepted by FD115 | Direct owner instruction: “ko cần quan tâm, lấy giá theo api pricing là dc.”; `plan/2026-10-06-lsv68-api-reference-pricing.md` |
| FD-113 | 2026-10-04 | Preserve the already approved homepage fast path: submitted birth information goes directly to one review/confirmation view with consent initially unticked. Do not reintroduce the old three-step wizard after the homepage form. This records the worksheet's existing baseline alongside LSV76; it does not remove birth-input review, consent, optional context or privacy controls. | Approved baseline retained | Owner worksheet item1 at `4b6e57f9dd4e213c147c5172d194b1f96bf7bfae`; LSV74 deployed acceptance; direct owner execution instruction 2026-10-04 |
| FD-112 | 2026-10-04 | Owner approves executing the recommendations in the 2026-10-03 owner worksheet: start only the lifetime v4.2 real-quality campaign with configured alias `ag/gemini-3.8-flash` and a hard 200,000 VND aggregate cap including retries, after routing and pricing are verified. Stop on unknown cost, budget exhaustion or quality failure; fix quality before restarting the consecutive-pass count. Twenty consecutive full passes and owner review of five remain required. Other writer campaigns default to deferred. Use isolated SePay sandbox acceptance with auto-approval off; the owner explicitly deferred sandbox setup/acceptance later on 2026-10-04. Do not run dependent acceptance or live bank spending. Notification testing defaults to capture-only, with no outbound delivery authorization. Preserve the membership hold and specify a first tool before approving its method or activating benefits. Physical device/member evidence remains a separate acceptance requirement. The owner will run physical-device tests and requests client error observability (Sentry) before that session; no device pass is inferred. | Approved; execution and remaining test inputs pending | `docs/reviews/2026-10-03-owner-inputs.md` at `4b6e57f9dd4e213c147c5172d194b1f96bf7bfae`; direct owner instruction recorded in `plan/2026-10-04-lsv76-contextual-unlock.md` |
| FD-111 | 2026-10-04 | Owner approves the exact published FD107 structural-score weights: base50; brightness exalted/prosperous/favorable/neutral/unfavorable/weak +12/+9/+6/+2/-6/-9; prosperity/power/fame/obstacle +10/+8/+6/-10; six support stars +4 each, Lucun +6, Tianma +3, six blocking stars -5 each, Xunkong/Jielu/Kongwang/Jiekong -4 each. Borrowed main-star brightness/transformation counts half; auxiliary transformations remain local and are not double-counted. Add one third of the opposite and two triad palaces' own scores, round/clamp0..100; bands30/45/55/70. Exact IDs and implementation in `structural-palace-score.ts` are the approved baseline. This approves weights, not empirical prediction, paid writer quality, provider enablement or invented compatibility/time scores. Either owner can approve under FD084; no separate cross-confirmation is required. | Approved; exact-weight sign-off closed | `packages/backend/src/reports/structural-palace-score.ts`; owner worksheet item7 and direct owner instruction2026-10-04 |
| FD-110 | 2026-10-04 | Owner approves the contextual unlock prototype direction and narrowly amends FD109c/d: an explicitly opened locked preview may show the active item's API-derived La price and in-place purchase/confirmation, with the lifetime alternative and true rollover credit. Free page body/map stays price-free; asks remain eligible only after completion or a deliberate locked-preview open. Reuse existing authorized intents, verified-account checkout, order reuse and server settlement; inline top-up/waiting use the approved proposal. Reserved products remain unbuyable, and provider/free-generation switches remain gated. This new approval resolves the prior LSV76 claim/phase5 sign-off/FD109 conflict prospectively; it does not invent a date or scope for the earlier claimed approval. Homepage review and unticked consent remain unchanged. | Approved; implementation and deployed acceptance pending | `prototype/revamp-2026-09/contextual-unlock-proposal-2026-10-03.html` at approved worksheet head `4b6e57f9dd4e213c147c5172d194b1f96bf7bfae`; `plan/2026-10-04-lsv76-contextual-unlock.md`; Kaneo75-78 |
| FD-109a | 2026-10-01 | Owner confirms the FD-109 baseline and delegates simple delivery and free AI ceilings. Implement UI/projection/cache first; one concern-matched full palace per frozen chart version, no full paid-report generation solely as a gift, and no separate AI calls for the other eleven palaces. Retain the 3,000 VND total free-AI/chart-version ceiling; set 50,000 VND/global UTC day, guest one and verified account three new palaces per rolling 24 hours, one provider attempt for the free gift, cached views free. Require durable atomic worst-case reservations, single-flight/cache, fail-closed unknown pricing/cost, and truthful structural fallback before enabling new free calls. Staging test orders are not real revenue; this is a bounded pilot allowance, not proven profitability. Paid retry/quality rules stay unchanged. | Approved; runtime enforcement and deployment pending | `docs/superpowers/specs/2026-09-28-free-result-page-design.md` §2a; Kaneo #70 |
| FD-109 | 2026-09-28 | Free result page architecture, after the founder reviewed the first prototype and a design review against the 2026-09-13 reveal spec and the AiTuvi benchmark. (a) **Read first, ask once.** No prices, offer cards or purchase buttons anywhere in the page body. The free reading runs uninterrupted to a completion marker ("Bạn đã đọc xong phần miễn phí"), then one bridge block that states what was read against what exists, then a single door to the existing page `/la-so/{id}/chon-luan-giai`. (b) **Give as much as AiTuvi.** The free layer includes one palace read in full — the concern-matched palace, with its conclusion, key points, full prose and Nên làm/Nên tránh — so the reader learns exactly what a paid palace reading is. (c) Locked palaces and topics are a content map only: title, score, one real line, state chip. No price and no button on the rows, per the 2026-09-13 spec §6.7. A preview sheet may show the clipped excerpt and blur, and its only action is the same single door. (d) The money ask, including the mobile sticky bar, appears only after the reader reaches the completion block or opens a locked preview (2026-09-13 spec §8.1). The free save/sign-in gate is not a money ask and may appear earlier. (e) Desktop keeps the six tabs; the left rail holds the chart only | Approved; preview-only single-door clause superseded by FD-110 on 2026-10-04; other rules retained | `docs/superpowers/specs/2026-09-28-free-result-page-design.md`; `prototype/revamp-2026-09/la-so-ket-qua-v2.*` |
| FD-108 | 2026-09-28 | Free result page and every reveal surface: progressive reveal and secure blur ("mở dần và làm mờ") stay the core mechanism, and the free layer must give enough real personal value to convince before the ask. The self-imposed 2026-09-13 rules "curiosity is allowed, deception is not" and "every visual metric must be true" are dropped: any content or number the engine generates is valid when it is not illegal, and every choice maximizes the business goal. Legal limits (no fabricated reference prices, fake countdown or scarcity, misleading advertising) and the FD-089 content bans still apply. On the free result page: mobile is one scrolling page, desktop keeps the six tabs, content identical on both; the 12 palace scores (FD-107) are given free, the explanation and advice are paid | Approved | `docs/superpowers/specs/2026-09-28-free-result-page-design.md`; 2026-09-13 progressive reveal spec §3.1 and §3.3 rewritten |
| FD-107 | 2026-09-28 | (Renumbered from a duplicate FD-105 on 2026-09-28; FD-105 is the Bậc thang Lá funnel.) The FD-063 ban on scores is lifted for scores that are **computed from real chart structure by a published formula**. Palaces (and later decadal cycles and years) may carry a 0 to 100 "độ mạnh cấu trúc" derived from chính tinh and brightness, tứ hóa, supporting and blocking stars, and a weighted contribution from the opposite and triad palaces. Every score must be deterministic, reproducible from the same chart, traceable to real stars, and shown next to a plain-language band label and a "Điểm này tính thế nào" box that prints the whole formula. The score is presented as a measure of the star pattern, never as a rating of the person's life or luck. FD-063 still bans invented fortune or compatibility numbers with no published derivation, and predictive trend charts built on numbers the engine does not compute | Approved; exact weights approved by direct owner instruction on 2026-10-04 (FD-111) | `prototype/revamp-2026-09/doc-bao-cao-tuong-tac-score.js`; FD-063 amended |
| FD-106 | 2026-09-28 | Report reader round 2, after the founder compared the FD-104 prototype with AiTuvi. (a) The chart is redrawn as a real lá số sheet everywhere it appears: stem and branch plus decadal age on the top line, palace name on its own line, chính tinh centred with brightness and tứ hóa, phụ tinh in two columns, Mệnh/Thân/đại vận/lưu niên markers and vòng trường sinh along the bottom, star names coloured by ngũ hành from a reviewed lookup table (uncertain stars stay neutral), and the Lá Số Việt logomark as the centre watermark. Birth date and time stay hidden. (b) All eight decadal cycles get content: the current cycle keeps full depth, the other seven get a short teaser each, and the timeline links every cycle to its reading. [Owner clarification 2026-09-30: teaser cycle window selects 8 consecutive engine cycles containing the current cycle (3 before / 4 after clamped at boundaries 0..4 via start = current < 8 ? 0 : Math.max(0, Math.min(cycles.length - 8, current - 3))), returning 7 teasers excluding current; no invented cycles]. (c) New editorial rule set: a reader who knows nothing about Tử Vi must follow the text. Star names stay but each one is explained in ordinary language the moment it appears, density is capped, and the chart evidence moves to the star chips and the "Vì sao có nhận định này" box. (d) The overview follows a fixed narrative arc (who this person is, how they work, where it costs them, their second self, what life suits them) at unchanged length. The per-palace `minimumPalaceStars` gate moves from the prose to the section evidence refs | Approved | `docs/superpowers/specs/2026-09-27-interactive-report-reader-design.md`; `prototype/revamp-2026-09/doc-bao-cao-tuong-tac.html` |
| FD-105 | 2026-09-27 | Adopt the "Bậc thang Lá" funnel as the customer journey for every entry point: a free magnet offer (full 12-palace chart, first insight for guests, second insight and the Bản mệnh opening after sign-in), secure progressive reveal with blur at the point of curiosity (FD-059 unchanged: no locked plaintext reaches an unauthorised client), a confirm dialog showing price and balance before every Lá spend, and a closed loop where every exit has a return path. Content prices in Lá (FD-065 unchanged): single palace 120; Hôm nay của bạn 60; Tháng này của bạn 300; Tình duyên và hôn nhân 480; Công việc và tài lộc 480; Vận hạn năm 2026 480; Hợp đôi (two charts) 600; Tử Vi trọn đời 960; combo Tử Vi trọn đời + Vận hạn năm 2026 1,300. Rollover: all Lá spent on single palaces and Bản mệnh for the same chart within 7 days of the first such spend is credited against Tử Vi trọn đời (extends FD-041). The customer-facing name of `ZIWEI-IDENTITY-P0` becomes "Tử Vi trọn đời" (SKU id unchanged, FD-042). Welcome grant: 60 promotional Lá once per verified account. Tử Vi trọn đời includes 7 days of Hôm nay của bạn. Lá-back guarantee: once per account, items under 500 Lá, customer marks the unlocked part "Không đúng" within 24 hours of the unlock, the Lá is restored and the part locks again. The main funnel and the time-based products run as two parallel tracks. Supersedes the "single palace 120 Lá remains a hypothesis" clause of FD-066 | Approved | `docs/superpowers/specs/2026-09-27-la-ladder-funnel-design.md`; `docs/superpowers/plans/2026-09-27-la-ladder-funnel-implementation.md` |
| FD-104 | 2026-09-27 | The comprehensive report reader becomes an interactive report (approach C), shipped in 3 waves: (1) reader fixes and chart-data projection for every report, including already-sold ones; (2) a new structured writing contract for new reports (per section: one-sentence conclusion, 3 key points, 2–4 sub-headed paragraphs, do/avoid; a one-page portrait generated last; scope rules so sections stop repeating each other); (3) the chart as primary navigation with the tam phương tứ chính overlay. Current depth is kept but layered (summary visible, detail behind "Đọc chi tiết", print expands all). Sold reports get the UI upgrade only, with no regeneration. Visuals: mini chart, star chips, decadal timeline, tam phương tứ chính diagram, all drawn from the report's frozen snapshot; no invented scores or good/bad colouring (FD-063 stands) | Approved; prototype pending founder review | `docs/superpowers/specs/2026-09-27-interactive-report-reader-design.md`; `prototype/revamp-2026-09/doc-bao-cao-tuong-tac.html` |
| FD-102 | 2026-09-24 | The header supports a light/dark toggle. Theme is stored site-wide (`lasoviet:theme`, applied to `<html data-theme>` before paint); the header and footer are theme-aware everywhere through tokens, and the toggle appears on pages that are light-ready (the homepage first). Other pages join as they are converted per `docs/24-light-theme-color-spec.md` (FD-088); a page that is not light-ready always renders dark | Approved | `apps/web/src/components/site-header.tsx`, `apps/web/src/styles/homepage-v3.css` |
| FD-101 | 2026-09-24 | The homepage stays free of prices (FD-069 stands): the Gói Lá section is not shown. The Lá top-up pack figures in the 2026-09-23 homepage content spec were wrong and are replaced by the FD-066 values (Nhập Môn 29,000 đ → 300 Lá; Khởi Đọc 99,000 → 1,100; Khám Phá 249,000 → 3,000; Tàng Thư 599,000 → 8,000) for use on the topic-selection and commercial pages. The hidden `showPacks` code path in the homepage stays off | Approved | `apps/web/src/features/homepage-v3/homepage-v3-static-sections.tsx` |
| FD-100 | 2026-09-24 | Homepage V3 (`docs/superpowers/specs/2026-09-23-homepage-content-spec.md` plus the V3 handoff: HH:MM / time-range / unknown birth time, 12-palace explorer, four-way comparison, light and dark) replaces the homepage prototype `prototype/revamp-2026-09/trang-chu.html` approved in FD-098 and the homepage order in `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md` §4.1. The rest of FD-098 and FD-091 stands. Navigation stays identical to the live site (shared `SiteHeader`/`SiteFooter`) | Approved | `apps/web/src/app/[locale]/page.tsx`, `apps/web/src/features/homepage-v3/` |
| FD-099 | 2026-09-22 | Messenger appears as a floating bubble in the bottom-right corner of every page (official Meta logo, 52-56px), not as a header icon. On pages with a fixed bottom bar it sits above the bar so it never covers a primary CTA; it stays hidden until the fanpage link is set in `config/customer-contact.json`. Refines FD-095 | Approved | `prototype/revamp-2026-09/lsv-revamp.css` `.msgr-bubble` |
| FD-098 | 2026-09-22 | The single customer support email is **lasoviet.net@gmail.com**, replacing support@lasoviet.net everywhere (UI, reports, policies, prototypes). The founder approved the revamp prototypes in `prototype/revamp-2026-09/` (homepage, free tools hub, tool page template, and the 12-icon set) as the binding UI source for the revamp (the homepage prototype is superseded by FD-100); the sample reading text on the tool page is voice reference only | Approved | `config/customer-contact.json`; `prototype/revamp-2026-09/` |
| FD-097 | 2026-09-22 | Simplify the branch workflow: every change starts on its own short-lived branch and opens a pull request straight into `master`; the founder or An approves and authorises the merge. The fixed `product/experience-spec-v1` and `feature/site-foundation` integration branches and the dedicated UI artifact branch (FD-024, FD-055) are retired. UI is still built against a founder-approved prototype, which now lives in `prototype/` on any branch | Approved | `CLAUDE.md`, `AGENTS.md` branch section, `docs/15-collaboration-branch-workflow.md` |
| FD-096 | 2026-09-22 | No lawyer review of the FD-089 line. Strip old rules that slow down UX, UI, and page-content work from the business docs, keeping every rule that protects the quality of paid readings (FD-058, FD-072 to FD-077) and every backend, payment, privacy, and security rule. Page-level UI rules now come only from the FD-091 spec, `docs/22`, and `docs/24` | Approved | `docs/13`, `docs/14`, `docs/20` rewritten or trimmed on 2026-09-22 |
| FD-095 | 2026-09-22 | Add Facebook Messenger through the Lá Số Việt fanpage as a customer support channel beside email, with an icon in the header or footer and on support cards. The founder supplies the fanpage link later; until then the channel stays hidden: the fanpage link goes into the `social` field of `config/customer-contact.json` (single contact source) with `visible: false` until then. Supersedes the 2026-09-13 "email only, no floating contact" rule in the AITuvi adaptation spec §4.7 for Messenger only; the rule that a floating button must never cover a primary CTA stays | Approved; link pending | `config/customer-contact.json` `social`; icon wiring pending An |
| FD-094 | 2026-09-22 | Do not add "Tử vi hôm nay" to the main navigation; daily and other free or low-price tools live in the free tools hub (`/cong-cu-mien-phi`). Every hub tool gets its own icon drawn in the Lá Số Việt style, designed with the `design-taste-frontend` skill | Approved | Revamp plan; `prototype/cong-cu-mien-phi/` |
| FD-093 | 2026-09-22 | Add a membership tier priced in `Lá` (FD-065 unchanged: no VND on content): **Hội viên tháng 1,500 Lá / 30 days** and **Hội viên năm 8,000 Lá / 365 days**, bought from the Lá balance, never auto-renewed. Includes: "Hôm nay của bạn" (daily reading against the chart), monthly reading (nguyệt vận), the paid version of every hub tool, and 20% off report unlocks. Excludes the Toàn diện report, which stays a separate lifetime purchase. The monthly price makes the 249k pack (3,000 Lá) the natural top-up; the yearly price equals the 599k pack exactly | Approved; inclusions and discount are a starting hypothesis | Revamp plan product ladder |
| FD-092 | 2026-09-22 | Do not notify the Ministry of Industry and Trade (Bộ Công Thương) for the website at this stage and do not add a notification badge; other certifications will be added later. The legal-entity and address fields stay hidden | Approved | Revamp plan |
| FD-091 | 2026-09-22 | Keep `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md` **in full** as the binding page-level baseline (type scale, word budgets, section rhythm, components, homepage order, page specs, "do not copy" list) for the 2026-09-22 UI/content revamp. The revamp plan extends it and may add sections, but does not silently drop any of its rules. Where FD-089 now allows content the spec's §3.5 bans for fear reasons, FD-089 wins; the spec's legal bans (fake reference prices, fake testimonials, lottery wording, invented scores under FD-063) stay | Approved | Detail section below; revamp plan |
| FD-090 | 2026-09-22 | Amend `docs/23-index-eligibility-gate.md` §0: a **free tools hub** of simple tools that need no complex calculation engine (static lookup tables, lunar-calendar conversion, random draw from a fixed deck, pure formulas) may be built now, alongside the Zi Wei flow. Each tool must carry a designed bridge into a paid Zi Wei offer. Engine disciplines (Bát Tự, Kinh Dịch readings, Chiêm Tinh, Thần Số Học paid) stay gated by `docs/23` unchanged, and a tool page is indexable only once it returns real computed results | Approved | Detail section below; `docs/23-index-eligibility-gate.md` §0 note |
| FD-089 | 2026-09-22 | Content boundary reset for revenue: write readings the way traditional Tử Vi does, including bad news (hạn, bad stars, hard years, money loss, relationship trouble, legal trouble, accident risk) with traditional directness. Daily-return features (daily horoscope, reminders, streaks) are allowed. Paywall and upsell copy may name a misfortune period **only when the engine actually computed it for that chart**. Still banned, as the Vietnamese-law line: death, lifespan, and "khắc chết" content (FD-075 kept on this point); named-disease diagnosis (health warnings stay allowed in measured wording); selling rituals, "giải hạn", "hoá giải", or feng-shui objects; invented events or dates not produced by the engine; false scarcity, countdowns, fabricated reference prices, fake reviews or experts (FD-064, FD-071); lottery numbers. Supersedes the fear-based-claim clause of FD-064, the misfortune-framing parts of FD-075, and the matching FD-077 gate | Approved; prompt and validator changes pending An | Detail section below; `CLAUDE.md`, `MASTER_CONCEPT.md` §8, `docs/13` §4.5/§6.1/§7.4, `docs/20` §9/§11 notes |
| FD-088 | 2026-09-20 | Ratify the shipped lacquer palette as the product's **default theme**, and establish the colour contract that makes a second **light theme** buildable later. `apps/web/src/styles/tokens.css` holds primitive values; a semantic layer (`--surface-*`, `--text-*`, `--border-*`, `--accent-*`) is the only thing components may reference, and each theme supplies its own mapping of semantic names to primitives. This supersedes the `LOCKED` Paper/Ink/Cinnabar palette in `docs/13-brand-experience-guideline.md` §5.2 **as the default theme**, but that palette is retained as the approved starting point for the future light theme rather than discarded. The §5.8 line stating dark mode is out of MVP scope is superseded: the product ships dark-first and a light theme is planned. `docs/13` §5.3 typography, §5.4 grid/spacing/shape, §5.6 iconography, and §5.8 motion stay binding and already match the tokens. Four implementation rules bind from this date: components reference semantic tokens only, never primitives; every semantic token must be defined before use; no new bare hex outside the token files; and contrast is measured per theme, never carried between themes. The full measured two-theme system is `docs/24-light-theme-color-spec.md`. | Approved | `docs/13-brand-experience-guideline.md` §05, `docs/22-art-direction.md`, `apps/web/src/styles/tokens.css`, `apps/web/src/styles/discipline-pages-foundation.css`, `docs/24-light-theme-color-spec.md` |
| FD-084 | 2026-09-15 | An and Lãm have equal authority across all business, product, workflow, UI, technical, security, Git, infrastructure, deployment, production, migration, and release matters. A direct written instruction from either is binding without confirmation from the other; when explicit instructions conflict, the latest explicit instruction controls. Replace Gemini Flash high as bounded coder with a `cx/gpt-5.6-terra` medium bounded executor while retaining a separate `cx/gpt-5.6-terra` high session for independent milestone review. The former Flash scope, correction, stop, and side-effect limits transfer unchanged to Terra medium. Supersedes FD-031, FD-032, and FD-083 where they conflict. | Approved by direct owner instruction | `AGENTS.md`, all active Git worktrees |
| FD-001 | 2026-08-31 | Use Superpowers only; no `/ck` or CK CLI | Approved | `AGENTS.md` |
| FD-002 | 2026-08-31 | Sol orchestrates, Terra reviews, Luna implements | Approved | `AGENTS.md` |
| FD-003 | 2026-08-31 | NestJS with Fastify | Approved | Phase 00 |
| FD-004 | 2026-08-31 | iztro `default` for public P0 | Approved | Phase 02 |
| FD-005 | 2026-08-31 | SePay | Approved | Phase 04 |
| FD-006 | 2026-08-31 | Balanced refund/regeneration policy | Approved | Phase 04-05 |
| FD-007 | 2026-08-31 | No paid Zi Wei with unresolved birth branch | Approved | Phase 01-03 |
| FD-008 | 2026-08-31 | Propagate Garage deletion to cloud S3 | Approved | Phase 05 |
| FD-009 | 2026-08-31 | Founder-provided OpenAI-compatible endpoint | Approved | Phase 04 |
| FD-010 | 2026-08-31 | Resend through SMTP | Superseded by FD-022 | Phase 05 |
| FD-011 | 2026-08-31 | Better Auth; email/password and Google | Approved | Phase 01 |
| FD-012 | 2026-08-31 | Follow master sequencing for D-019/D-020 | Approved | Phase 07, 11 |
| FD-013 | 2026-08-31 | Celestine for Western Wave 3 | Approved | Phase 09 |
| FD-014 | 2026-08-31 | Identity report is first paid SKU | Approved | Phase 04 |
| FD-015 | 2026-08-31 | Thirty-day account deletion recovery | Approved | Phase 01, 06 |
| FD-016 | 2026-08-31 | Free experience option A | Approved | Phase 03 |
| FD-017 | 2026-08-31 | Reuse founder-managed host Nginx | Approved | Phase 06 |
| FD-018 | 2026-08-31 | Stable random loopback host port | Approved | `AGENTS.md`, Phase 06 |
| FD-019 | 2026-08-31 | Approve Blueprint v1.1 as canonical UX, route, and SEO source while preserving approved technical decisions, including one-SKU-first | Approved | Architecture spec, Phase 00, Phase 03 |
| FD-020 | 2026-08-31 | Purge unlinked anonymous birth-profile and chart data after 24 hours; preserve it under account policy only after verified account linking | Approved | `AGENTS.md`, Phase 01, Phase 03 |
| FD-021 | 2026-09-01 | Review complete features, phases, or meaningful milestones instead of every small implementation task; keep focused core-flow verification | Approved | `AGENTS.md` |
| FD-022 | 2026-09-01 | Use the founder-provided MXRouting SMTP connection for authentication and report email; port 587 requires reviewed STARTTLS behavior | Approved | Phase 01, Phase 05 |
| FD-023 | 2026-09-01 | From P01-T02 onward, Terra medium directly implements, debugs, and runs focused tests; Sol xhigh orchestrates and reviews milestones; Luna is paused | Superseded by FD-032 | Historical P01-T02 through P05A work |
| FD-024 | 2026-09-01 | Defer user-facing UI to a dedicated artifact branch and implement it only against the approved artifact; current branches focus on non-visual work | Superseded by FD-097 | `AGENTS.md`, current implementation phases |
| FD-025 | 2026-09-02 | Promote `/du-bao-cung-hoang-dao` to the Gate 1 public `live_indexable` surface and keep `/horoscope` as an archived 301 redirect to it; other Horoscope routes remain reserved and visual rendering stays deferred by FD-024 | Approved | Phase 03 route registry, content metadata, and SEO contracts |
| FD-026 | 2026-09-02 | Use the founder-operated OpenAI-compatible provider identity `9router-an` through raw `fetch`; implement the non-visual AI/report foundation before SePay, and block production report calls until provider privacy due diligence is complete and approved | Approved | Phase 04 AI provider, capability probe, report writer, validator, critic, and compliance gate |
| FD-027 | 2026-09-02 | Approve Operations Dashboard V1 Option A as dedicated Phase 05A: private server-authorized `/admin/**`, database-backed RBAC/capabilities, redacted inspection, audited compensating domain commands, and no CMS; full CMS/back-office content editing is deferred | Approved | Admin dashboard spec, Phase 05A, Phases 04-06, contracts, risks, and release gates |
| FD-028 | 2026-09-02 | Rename the active implementation branch to `feature/paid-flow-admin-operations`; implement paid-flow and Admin/Operations work on this branch, begin provider-independent Phase 05A work now, and defer SePay-dependent checkout/webhook activation until the founder supplies the required environment values | Approved | `AGENTS.md`, master plan, Phase 04, Phase 05A |
| FD-029 | 2026-09-03 | Paid checkout requires an authenticated account with verified email. Anonymous actors remain free-flow only. Immutable commerce records use the durable account owner and must not reference anonymous/profile/chart lifecycle records with retention-blocking foreign keys. | Approved | Phase 04, `AGENTS.md`, commerce schema and checkout authorization |
| FD-030 | 2026-09-03 | Approve the Payment Gateway Sandbox for the first SePay external test. Hosted checkout omits `payment_method`, so SePay presents merchant-enabled methods such as VietQR or cards. Production payment activation remains a separate founder-controlled gate. | Approved | Phase 04 sandbox activation gate |
| FD-031 | 2026-09-04 | Add global Flash Executor on `ag/gemini-3.8-flash-high` with `high` reasoning as an execution-only subagent. It accepts exact bounded briefs from Sol or Terra, does not plan, propose, broaden scope, or debug deeply, and stops when work exceeds one direct local correction. Luna remains paused. | Approved | Global Codex configuration, `AGENTS.md`, master plan |
| FD-032 | 2026-09-05 | Use Sol high as orchestrator/adjudicator, Gemini Flash high as the bounded coder, and Terra high as the independent milestone reviewer. Luna remains paused. | Approved | `AGENTS.md`, master plan, P04-T06 onward |
| FD-033 | 2026-09-05 | For the production discipline-page integration, use Sol high for orchestration, Gemini Flash strict for implementation, and one Terra xhigh milestone review after the complete batch; the implementation PR targets `product/discipline-flagship-pages` | Approved | `docs/superpowers/plans/2026-09-05-production-discipline-flagship-pages.md` |
| FD-034 | 2026-09-05 | Port every completed page and gated state from `product/discipline-flagship-pages`; keep Vietnamese prototype copy unchanged, expose previews as public `live_noindex`, preserve legacy routes with locale-aware HTTP 301 redirects, and leave the private Tử Vi wizard unchanged | Approved | `docs/19-sitemap-v2-discipline-pages.md`, production discipline-page plan |
| FD-035 | 2026-09-06 | Approve the Phase 04 provider privacy due-diligence gate for self-hosted/founder-operated `9router-an`; founder explicitly accepts operational/privacy responsibility and waives separate term investigation. Production AI/payment activation, deployment, and release activation remain separately founder-controlled. | Approved | `docs/compliance/ai-provider-due-diligence.md`, Phase 04 plan |
| FD-036 | 2026-09-08 | Phased direction B: Free → micro-offer OR 79k comprehensive report, VND only; wallet/points deferred to a later gated phase | Partially superseded by FD-060; product ladder retained | `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` |
| FD-037 | 2026-09-08 | Tier-1 micro-offer is a defined natal excerpt with upgrade credit; no situational-question engine this round | Approved | Same spec |
| FD-038 | 2026-09-08 | Primary 90-day KPI is 30-day contribution margin per chart-creating customer; first-purchase rate and return revenue are secondary and must not be optimized at the primary KPI's expense | Approved | Same spec |
| FD-039 | 2026-09-08 | Exclude the "Điểm Việt" wallet/points system from this round's spec; data design must not block adding a wallet later | Superseded by FD-060 | Same spec |
| FD-040 | 2026-09-09 | `invoice_number` is immutable for the life of an order row; the commerce order table becomes append-only (reopening an order inserts a new row rather than overwriting the old one) | Approved | `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md` |
| FD-041 | 2026-09-09 | Upgrade credit (tier 1 → tier 2) expires 7 days after the tier-1 `paid_at` (paid timestamp), overriding An's no-expiry recommendation; must be disclosed at the tier-1 purchase point before payment confirmation | Approved | Same round-2 doc |
| FD-042 | 2026-09-09 | SKU ID is an immutable technical identifier and must never be exposed to the customer in any form (backend-only); only the customer-facing display name changes | Approved | Same round-2 doc |
| FD-043 | 2026-09-08 | No staffed payment reconciliation exists. Every step after checkout must self-recover automatically; anything that cannot self-recover must self-halt sales rather than silently accept payment | Approved | `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` |
| FD-044 | 2026-09-09 | Replace the 40-character transfer-memo invoice number with a short 12-character anti-noise payment code (`LSV` + 8 Crockford base32 chars + 1 checksum char), stored separately from `invoice_number` | Approved | `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md` |
| FD-045 | 2026-09-09 | Reject any odd-cent amount surcharge for payment reconciliation — displayed/charged prices must always be round, no exceptions. Replace the amount-only auto-match tier with a customer self-claim flow gated by an exact-amount match within a narrow customer-declared transfer time window (plus/minus 15 minutes around declared timestamp to minute precision in `Asia/Ho_Chi_Minh`) | Approved (revised) | Same round-2 doc |
| FD-046 | 2026-09-09 | Funds that cannot be matched to a customer, with no bank auto-refund capability available, remain held pending indefinite customer self-claim; no manual refund process is required | Approved | Same round-2 doc |
| FD-047 | 2026-09-09 | Out-of-band alert channel for the circuit breaker and stale unmatched transactions (>6h) is a Telegram bot posting to the shared Harris/An operations group (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`); founder SLA is to check within 6 hours | Approved | Same round-2 doc |
| FD-048 | 2026-09-09 | Tier-1 micro-offer sells at a single price point, 19,000 VND only; no 19k/29k A/B test this round (WP-12 deprioritized) | Superseded by FD-066 (Tier-1 is now priced in Lá; no single VND price point) | Same round-2 doc |
| FD-049 | 2026-09-09 | Fully migrate the legacy analytics event set (`config/analytics-events.json`) to the new WP-10 funnel event names; no dual event system running in parallel | Approved | Same round-2 doc |
| FD-050 | 2026-09-09 | Only anonymous technical events (not tied to user behavior) may be logged before analytics consent; no canonical funnel event fires pre-consent | Approved | Same round-2 doc |
| FD-051 | 2026-09-09 | Long-term analytics storage is PostgreSQL in existing infrastructure; no third-party SaaS as the primary store and no ClickHouse this round | Approved | Same round-2 doc |
| FD-052 | 2026-09-09 | Pseudonymous analytics session ID does not require periodic rotation; it only needs to be a value distinct from the account ID/internal primary key | Approved | Same round-2 doc |
| FD-053 | 2026-09-09 | Third-party analytics/optimization tools may receive behavioral and commercial data freely, but must never receive name, exact birth date/time/place, free-text question content, or `chart_id`; deep joins with birth-chart data stay on self-hosted BI only | Approved | Same round-2 doc |
| FD-054 | 2026-09-09 | Analytics dashboard and the legacy-to-new event mapping are jointly owned by Harris and An | Approved | Same round-2 doc |
| FD-055 | 2026-09-09 | The approved UI artifact branch for WP-03/WP-06/WP-11/WP-13 (per FD-024) is `product/discipline-flagship-pages`; verified that `product/bg-texture-consistency` and `product/homepage-content-rewrite` are ancestors, so no preliminary merge is required | Superseded by FD-097 | Same round-2 doc |
| FD-056 | 2026-09-09 | Harris alone signs off on the cross-cutting visual QA pass (WP-13); An executes the checks and supplies pass/fail evidence with screenshots | Approved | Same round-2 doc |
| FD-057 | 2026-09-11 | https://lasoviet.net supersedes lasoviet.vn as the sole canonical public domain for master brand, public SEO, web application, Better Auth, checkout, and customer support email; lasoviet.vn, lasoviet.cloud, and lasoviet.xyz serve as non-canonical redirect reserves once externally configured; the GitHub repository name and local filesystem paths remain lasoviet.vn | Approved | `AGENTS.md`, `config/domain-routing.json`, `config/sitemap.json`, documentation |
| FD-058 | 2026-09-12 | Zi Wei comprehensive report V4 (`ZIWEI-IDENTITY-P0`, 79k) adds current decadal cycle, annual snapshot, three-frame birth-time sensitivity, and 3–5 structured actions; cancels `ZIWEI-YEAR-P0`; Knowledge Base V4 editorial rewrite (plain Vietnamese, school categorization, fatalistic-content quarantine) is a release prerequisite | Approved (table row added 2026-09-13; decision recorded 2026-09-12) | `docs/superpowers/plans/2026-09-12-ziwei-comprehensive-report-v4.md`; evidence section below |
| FD-059 | 2026-09-13 | Adopt secure progressive reveal as a core conversion pattern: complete free value first, then truthful titles/excerpts and visual blur/fade for deeper content; locked plaintext must never be shipped to an unauthorized client | Approved | `docs/superpowers/specs/2026-09-13-progressive-reveal-la-credits-and-conversion-ui-design.md` |
| FD-060 | 2026-09-13 | Adopt `Lá` as the proprietary internal service credit at the nominal reference `1 Lá = 1,000 VND`; every paywall, top-up confirmation, and payment order must also show the VND equivalent. This supersedes the VND-only clause of FD-036 and supersedes FD-039's wallet deferral | Partially superseded by FD-065 (no published exchange rate; VND shown only at top-up); `Lá` credit concept and FD-036/FD-039 supersession retained | Same 2026-09-13 design spec |
| FD-061 | 2026-09-13 | Purchased and promotional Lá do not expire in the first release; credits are non-transferable, non-withdrawable, and recorded in an append-only ledger with separate paid/promotional buckets, deterministic spend order, atomic entitlement grant, idempotency, and compensating restoration on failure | Approved | Same 2026-09-13 design spec |
| FD-062 | 2026-09-13 | Map the current 19k/79k/60k Tier-1/Tier-2/upgrade values to 19/79/60 Lá and always offer exact-missing-amount top-up; individual-section, AI-answer, and multi-pack prices remain hypotheses until their separate release gates pass | Superseded by FD-066 (new Lá price list and pack ladder; exact top-up removed) | Same 2026-09-13 design spec |
| FD-063 | 2026-09-13 | Use real chart structure, palace relationships, evidence counts/categories, reading coverage, entitlement state, and report facts as conversion and upsell surfaces; prohibit invented fortune/compatibility scores and keep predictive trend charts deferred until a reviewed time-based engine exists | Approved; score clause narrowed by FD-107 (published-formula structural scores are allowed) | Same 2026-09-13 design spec |
| FD-064 | 2026-09-13 | Commercial and conversion decisions are optimized for maximum revenue. Persuasion techniques commonly classed as dark patterns (decoy tiers, anchoring, bonus framing, default pre-selection, curiosity gaps) are permitted when lawful under Vietnamese law. The legal boundary is binding: no fabricated reference/crossed-out prices, no false scarcity or countdowns, no misleading promotion terms, and no fear-based fortune claims that risk superstition-business sanctions. For commercial conversion decisions this overrides the "trust/safety wins" conflict rule; privacy (FD-053), payment integrity (FD-043), and entitlement correctness remain binding | Approved; fear-based-claim clause superseded by FD-089 | This tracker; conflict rule amended 2026-09-13 in `CLAUDE.md`, `docs/15-collaboration-branch-workflow.md`, and `docs/13-brand-experience-guideline.md` |
| FD-065 | 2026-09-13 | Two-layer pricing: `Lá` has no published exchange rate to VND. VND appears only on top-up packs, the payment order, and the invoice. Content, unlock, and upgrade prices are shown in `Lá` only, with no "tương đương X đồng" line. Lá is used to buy and view all services from one shared balance | Approved | 2026-09-13 design spec §18 |
| FD-066 | 2026-09-13 | Top-up packs: Nhập Môn 29,000 VND → 300 Lá; Khởi Đọc 99,000 → 1,000 + 100 bonus = 1,100 Lá; Khám Phá 249,000 → 2,500 + 500 = 3,000 Lá; Tàng Thư 599,000 → 6,000 + 2,000 = 8,000 Lá. Content prices: Tier 1 240 Lá, Tier 2 960 Lá, Tier 1→Tier 2 upgrade within the FD-041 window 720 Lá; single palace 120 Lá remains a hypothesis. Exact-missing-amount top-up is removed; the primary insufficient-balance CTA is the smallest pack that covers the item. Supersedes FD-048 and FD-062 | Approved | 2026-09-13 design spec §18 |
| FD-067 | 2026-09-13 | The invoice is issued immediately when a Lá top-up payment is confirmed, with the line item described as a `Lá` service credit, not as a report. Revenue is recognized when Lá is spent on content (deferred revenue until spend); bonus/promotional Lá is not revenue. Content unlocks paid with Lá issue no second invoice | Approved; finance/tax confirmation of the line-item wording still required before production | 2026-09-13 design spec §18 |
| FD-068 | 2026-09-13 | Generate a small set of real personalized report sections for free chart users so locked previews show genuine, server-clipped text rather than structural teasers, to maximize "this is exactly me" recognition before purchase; the AI cost on non-buying users is accepted | Approved; section count and COGS cap to be set in the implementation plan | 2026-09-13 design spec §18 |
| FD-069 | 2026-09-13 | Keep the homepage free of prices (neither VND nor `Lá`): the homepage states only what the visitor receives and links to the sample report; tier comparison lives on the topic-selection page (`chon-luan-giai`) and commercial pages. Reaffirms the 2026-09-09 content-ux-polish decision and rejects the AITuvi audit's homepage tier-matrix recommendation | Approved | AITuvi pattern audit review, 2026-09-13 |
| FD-070 | 2026-09-13 | The first detailed page-family spec derived from the AITuvi pattern audit covers the core funnel (homepage fast path → birth wizard → free result → offer/topic selection → checkout → paid report → account library) before the knowledge hub | Approved | AITuvi pattern audit review, 2026-09-13 |
| FD-071 | 2026-09-13 | All interpretation and public content is AI-generated with no human reviewer. The only customer-facing attribution is "Lá Số Việt biên tập" (EN: "Edited by La So Viet"); no on-page source lists or reviewer workflow are required. No surface may claim human, expert, or team review ("đã được xem xét", "chuyên gia", "đội ngũ") | Approved | AITuvi pattern audit review, 2026-09-13; revisit if Vietnamese law requires explicit AI-generated labeling |
| FD-072 | 2026-09-13 | Keep Zi Wei V4 active for new Vietnamese orders (no rollback to V3) and restore the V3 prompt rules the V4 prompt dropped: no reflective questions, no process narration, no repeated advice, no fabricated future events or dates, no invented identifiers, verbatim evidence keys, locale-integrity and brightness-label block; correct the prompt domain to lasoviet.net | Approved | `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §2 |
| FD-073 | 2026-09-13 | Generate the comprehensive report section by section (one call per palace/theme/section) with per-section token budgets and minimum lengths, independent retries, resumable persistence, and reuse of the same generator for FD-068 free previews | Approved | `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §3 |
| FD-074 | 2026-09-13 | The Knowledge Base V4 editorial rewrite follows the editorial ruleset draft (plain Vietnamese, proper-name whitelist, discouraged Sino-Vietnamese term list, mainstream school as base); the ruleset extends the founder's Kaneo #3 editorial input; the rewrite is the V4.1 fast-follow the founder deferred on Kaneo #3 | Approved; ruleset signed off by the founder 2026-09-13 (term table §3.3 and warning format §5) | `docs/superpowers/specs/2026-09-13-ziwei-knowledge-editorial-ruleset.md`; `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §4 |
| FD-075 | 2026-09-13 | Remove all death, lifespan, and "khắc chết" content from the corpus and output; keep misfortune warnings (money, health, accidents, travel, legal, relationships, work) written as preparation guidance with concrete steps, without certainty language, adverse-event dates, named diseases, remedies/rituals, or use in paywall copy. Narrows FD-058's fatalistic-content quarantine and the 2026-09-12 Kaneo #3 editorial input that deleted serious illness, accidents, imprisonment, and disasters outright | Partially superseded by FD-089 (death/lifespan ban kept) | Ruleset draft §4–§5; `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §5 |
| FD-076 | 2026-09-13 | Rewrite V4 prompts in everyday Vietnamese keeping only proper names; every claim pairs a real chart detail with a two-sided observation, a concrete everyday situation, and an actionable suggestion, using personal-sounding sentences anchored in the chart | Approved | `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §6 |
| FD-077 | 2026-09-13 | Add deterministic report quality gates: per-section minimum length, zero discouraged Sino-Vietnamese terms, proper-name density cap, zero death terms, misfortune-framing check, chart-anchoring check, plus existing Han/locale and repetition checks; failing sections are rewritten, never delivered below gate. Replaces the Kaneo #3 V4 launch rule "no V4 rewrite pass" (the AI critic pass stays), because stricter gates without rewrite would fail paid reports under FD-043 | Partially superseded by FD-089 (misfortune-framing gate removed; death-term gate kept) | `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §8 |
| FD-078 | 2026-09-13 | Add two optional single-choice reading-context questions to the birth wizard as a tappable list with a skip option (current life stage; top concern), stored as enum codes separate from the birth profile, used for examples, emphasis, and free-preview section choice, never for chart facts or prices, and never sent to third-party tools | Approved | `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §7 |
| FD-080 | 2026-09-13 | No analytics consent UI of any kind (no banner, popup, checkbox, or consent step). Behavioral funnel measurement is first-party and anonymous by design so that it does not process personal data: no stored raw IP, no full user agent or fingerprinting, unique visitors counted with a daily-rotating salted hash whose salt is destroyed after 24 hours, per-visit random ID in `sessionStorage` only, and no link to account ID, birth profile, `chart_id`, or order ID. Account-linked business metrics come from transaction data. Disclosure is one privacy-policy paragraph only. Third-party ad pixels carrying identifiers require a separate founder decision. Supersedes FD-050 and the no-rotation session-ID clause of FD-052; FD-051 and FD-053 remain binding | Superseded by FD-081 | Kaneo LSV #10 (WP-10A), #11 (WP-10C), #12 (WP-10B) |
| FD-081 | 2026-09-13 | Behavioral tracking is identified and account-linked to optimize upsell and revenue: first-party persistent `visitor_id` cookie, stored IP/user agent/referrer/UTM, and events linked to the account and birth profile once the visitor accepts the wizard consent or signs in, with prior visitor history merged into the customer profile. No new consent UI: the existing required wizard birth-data checkbox is re-worded to also cover analytics, personalization, and offers (versioned purposes), sign-in shows a one-line terms/privacy notice without a checkbox, and the privacy policy describes the data, purposes, and retention. Unlinked visitor IPs and events are deleted after 30 days without consent or sign-in; IP may be kept separately for fraud and abuse prevention. FD-053 third-party field limits remain binding; third-party ad pixels and marketing email rules require their own decisions. Supersedes FD-080 and FD-050 | Approved | Kaneo LSV #12 (WP-10B); UI tickets #19–#28 |
| FD-082 | 2026-09-14 | Reports may and should include natural, in-context advice to consult a doctor, lawyer, or qualified professional when discussing health, legal matters, paperwork, large money decisions, or investment; this removes the V3/V4 prompt and validator ban on professional-advice phrases. Standalone legal-style disclaimer blocks remain excluded. Also approves the Kaneo #29 fix plan (bounded rewrite on validator/critic failure, false-positive regex fixes, Unicode-aware boundaries, 20 consecutive successful V4 generations before paid launch) | Approved | `docs/superpowers/specs/2026-09-13-ziwei-knowledge-editorial-ruleset.md` §6, §8; `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §2, §8; Kaneo #29, #15 |
| FD-085 | 2026-09-14 | Account-linked behavioral events and customer behavior profiles remain identifiable while the account exists and are purged when the account or customer data is deleted. Raw IP has one 12-month retention period for both analytics/personalization and the separately bounded fraud/security purpose. The exact LSV-12 wizard and sign-in wording plus the matching VI/EN privacy disclosure ship atomically with collection; LSV-13 adopts the resulting claim record afterward. Clarifies FD-081. | Approved | Kaneo LSV #12 comment `wca61lezzekqbi4xayi1msi1`; LSV-12 implementation plan |

## FD-028 Execution Boundary

- The prior remote branch `plan/admin-operations-dashboard` was renamed to
  `feature/paid-flow-admin-operations`.
- Phase 05A access, RBAC, redaction, audit, route, and provider-independent
  operational foundations may proceed immediately.
- Missing SePay environment values block only the SePay adapter, checkout,
  webhook activation, and external provider smoke. They do not authorize
  mocks, fake payment success, committed secrets, or unverified defaults.
- Production payment activation remains a separate founder-controlled gate.

## FD-027 Planning Evidence

- The detailed design is
  `docs/superpowers/specs/2026-09-02-admin-operations-dashboard-design.md`.
- Phase 05 keeps storage, delivery, and owner account-center scope; Phase 05A
  owns staff operations, support, RBAC, audit, and recovery.
- Foundation may begin after Phase 03; closure depends on Phases 04 and 05;
  Phase 06 paid release depends on Phase 05A.
- Admin V1 uses redacted projections only. Unredacted sensitive-detail reveal
  requires a separate founder-approved privacy scope and is deferred.
- CMS editing, arbitrary SQL, direct BullMQ requeue, secrets display, direct
  payment mutation, and in-place chart/report mutation remain prohibited.

## FD-024 Completion Evidence

- The approved UI artifact was implemented on a dedicated feature branch and
  merged to `master` through pull request #3 on 2026-09-02.
- FD-024 remains the artifact-first rule for future visual work, but it no
  longer blocks the implemented free-MVP interface.

## Durable Rule Evaluation Log

This log records evaluation. It does not replace `AGENTS.md`.

| Candidate | Evidence | Terra result | Disposition |
|---|---|---|---|
| Normalize line endings in repository-text assertions | Fresh Windows worktree baseline passed 268/269 tests after build; the sole failure compared raw LF against CRLF in `.github/workflows/ci.yml` | Approved technical correction | Added to `AGENTS.md`; baseline fix assigned before P05A-T01 |
| Superpowers-only workflow | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Role authority and stop protocol | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Durable-rule distillation process | Direct founder instruction | Approved | Added to `AGENTS.md` |
| Loopback stable high host port | Direct founder deployment invariant dated 2026-08-31 | Approved with clarification that randomness is not security | Added to `AGENTS.md` |
| Phase-scoped founder decision gates | Repeated open commercial and safety choices in Phases 07-11 | Terra approved minimal operational rule | Added to `AGENTS.md`; tracked in `open-decisions.md` |
| Single route-definition source | Terra found Blueprint YAML and TypeScript catalogs competing | Approved after source reconciliation | Added to `AGENTS.md`; YAML data plus typed loader |
| Anonymous chart retention | Founder approved the recommended 24-hour privacy boundary | Approved | Added to `AGENTS.md`; tracked as `FD-020` |
| Integration-branch-aware PR targets | Terra found direct-to-master wording conflicting with approved feature-to-product flow | Approved clarification | Updated in `AGENTS.md` and collaboration workflow |
| Route activation ownership | Final Terra review found private pages created without registry promotion ownership | Approved recurring invariant | Added to `AGENTS.md`; route tasks now own registry and crawl-state tests |
| Milestone-based review cadence | Direct founder instruction after task-level review caused unacceptable delivery delay | Approved | Added to `AGENTS.md`; per-task review is no longer the default |
| Delegated Windows worktree anchoring | Required reads repeatedly resolved from the controller root instead of the assigned worktree, stopping P00-T02 and P00-T03 | Approved recurring invariant | Added to `AGENTS.md`; delegated commands must anchor and verify the absolute worktree |
| Missing create-target handling | Discovery stopped when `rg` inspected `.github` before the task created it | Approved recurring ambiguity | Added to `AGENTS.md`; absent create-targets are expected, while missing required sources remain blocking |
| Exact-version integration preflight | P01-T01 repeatedly used unverified Drizzle, Vitest, and Testcontainers integration behavior | Terra approved narrowed task-critical rule | Added to `AGENTS.md`; approved briefs must record only task-relevant exact-version facts |
| Authentication anti-enumeration success versus delivery | A repeated sign-up for an existing unverified account returned Better Auth's generic success without creating a new notification delivery, while the UI presented that response as proof that verification email was sent | Sol confirmed the provider response intentionally hides account existence and approved an explicit provider-backed resend path with conditional copy | Added to `AGENTS.md` under repository and operational safety |
| Ambient anonymous sessions on public auth recovery | Production resend verification returned HTTP 400 because Better Auth received the anonymous session cookie and switched from its public constant-time anti-enumeration branch to the session-bound email-mismatch branch | Terra verified Better Auth 1.7.2 client and route behavior; recovery calls now omit ambient credentials when public semantics are required | Clarified the existing authentication anti-enumeration rule in `AGENTS.md` |
| Terra direct-execution workflow | Founder changed the active role model from P01-T02 to reduce implementation latency while preserving milestone review | Direct founder decision | Updated `AGENTS.md`; Terra medium implements/debugs/tests, Sol xhigh reviews milestones, Luna paused |
| Global bounded execution subagent | Founder requested a reusable fast coding role that cannot self-assign, infer scope, propose changes, or debug deeply | Direct founder decision plus exact-model no-file probe | Added to `AGENTS.md`; global `flash_executor` uses `ag/gemini-3.8-flash-high` at `high` and returns ambiguous work to Sol or Terra |
| UI artifact branch boundary | Founder reserved visual implementation for a later artifact branch | Direct founder decision | Added to `AGENTS.md`; non-UI branches may implement server routes and headless flows but not visual UI |
| File-like dynamic route params | P03-T01 tests initially passed an extensionless sitemap key instead of the emitted `.xml` filename | Terra fixed the localized regression and added production-shaped coverage | Not added to `AGENTS.md`; one isolated incident does not meet section 9, and the regression test is the durable guard |
| BFF error provenance | P03-T01 briefly reclassified missing private API configuration as a caller path error | Terra separated base configuration resolution from caller path validation and added regression coverage | Not added to `AGENTS.md`; one localized defect does not meet section 9 |
| Immutable normalized read authority | P03-T02 initially recomputed eligibility from mutable original input instead of the stored normalized revision | Terra added the shared normalized schema and a disagreement regression test | Not added to `AGENTS.md`; the architecture already requires immutable revisions and one localized defect does not meet section 9 |
| Async session liveness clock | P03-T02 initially reused a timestamp captured before the authoritative session read | Terra moved clock capture to the live-row lookup and added a sequenced-clock regression test | Not added to `AGENTS.md`; one localized TOCTOU defect does not meet section 9 |
| Evidence-gated calculation completion | P03-T03 found the evidence service existed but successful calculation responses did not ensure required evidence persistence | Terra wired idempotent evidence persistence to calculation completion; the pattern applies to future calculation engines and report consumers | Added to `AGENTS.md` under calculation completion and evidence |
| Workspace declaration freshness | P01-T02 and P03-T04 independently encountered dependent typechecks reading stale workspace declarations from producer `dist` output | Sol confirmed the recurring producer-consumer build-order failure and narrowed the action to packages consumed through exports/generated declarations | Added to `AGENTS.md` under repository and operational safety |
| Generated public-content publication boundaries | P03-T06 initially allowed mixed-locale, encoding-corrupted, unsupported-source, and localized unsafe copy across the Gate 1 corpus | Sol confirmed one severe repository-wide incident and narrowed the rule to deterministic locale integrity plus canonical repository source containment before publication | Added to `AGENTS.md` under repository and operational safety |
| AI provider privacy production gate | FD-026 confirmed a founder-operated provider (terms historically unknown; superseded for Phase 04 closure on 2026-09-06 by FD-035 founder operational/privacy risk acceptance; production AI activation remains founder-controlled) | Existing architecture sections 18-19, `AGENTS.md` privacy/secret gates, and R-24 already require written due diligence before production use | No `AGENTS.md` change; Phase 04 privacy gate closed per FD-035; retain fail-closed gate for production activation |
| Pre-controller authorization denial audit | P05A-T01 initially returned `notFound()` for missing, anonymous, and unverified admin sessions before the private API could record the denial | Sol confirmed a severe access-audit gap and approved a trusted server-to-private-API denial path without anonymous session creation or a public audit-write endpoint | Added to `AGENTS.md` under administrative and operational surface safety |
| Aggregate admin projection capability enforcement | P05A-T02 twice allowed aggregate data to outlive or bypass active database capability narrowing: first through role-only module visibility, then through unconditional readiness data | Sol required a new projection-boundary cycle with active entry capability selection plus per-field/module query and response gating | Added to `AGENTS.md` under administrative and operational surface safety |
| Transactional admin command outcome ownership | P05A-T05 repeatedly allowed deterministic post-authentication role-command outcomes to bypass atomic receipt/audit persistence through pre-transaction classification, stale receipt replay, and database-constraint fallthrough | Sol approved authority revalidation before replay plus repository ownership of every deterministic result, with atomic bounded receipt/audit evidence and duplicate-free replay | Added to `AGENTS.md` under administrative and operational surface safety |
| SePay payment confirmation boundary | Verified SePay contract and Sol review require provider hosts/actions to come from a closed environment enum; hosted return URLs are navigation-only, while only an authenticated provider notification validated against order identity, state, amount, and currency can mutate or confirm payment | Approved combined payment-boundary rule | Added to `AGENTS.md` under repository and operational safety |
| SePay sandbox VPS gate correction and deployment | Test-only commit `200b852` aligned migration `0010` command receipts and made the outbox fixture use persisted runtime time with row/event isolation; VPS verification then passed focused tests, Compose deployment, structural database checks, health checks, synthetic non-paid IPN probes, and browser callback smoke | Existing workspace producer build-order, runtime-clock fixture, and payment-boundary rules cover the issues | No `AGENTS.md` change; FD-030 already authorizes the first external sandbox test |
| Unauthenticated provider setup probes | SePay Sandbox `Send test` omitted `X-Secret-Key` before provider-side authentication was configured and received `401`; after configuring `SECRET_KEY`, a real Sandbox card transaction delivered an authenticated `ORDER_PAID` and completed the commerce transaction | A setup probe is not payment verification and must never justify weakening the live webhook | Added to `AGENTS.md` under repository and operational safety |

## Per-Task Rule Check

Every task completion report includes:

```text
Docs impact: none | minor | major
Rule candidate: none | describe recurring failure condition
Evidence: source/test/incident
AGENTS.md action: none | clarify existing rule | add reviewed rule
Open questions: none | list
```

Sol may propose a rule only when the condition meets `AGENTS.md` section 9.
Terra checks evidence, duplication, conflicts, and scope. Temporary workarounds
and task history remain in plans/reports, not `AGENTS.md`.

Open founder decisions are tracked in `open-decisions.md`. Package approval
does not silently close them.

## FD-031 Global Flash Executor Evidence

Date: 2026-09-04

- Added a global `flash_executor` Codex role outside project-specific
  configuration. Its model is `ag/gemini-3.8-flash-high` with `high` reasoning.
- The role reuses the existing global `custom` provider. No provider credential,
  base URL, or secret was copied into the agent file or this repository.
- The execution contract requires an explicit Sol or Terra brief, exact file
  ownership, literal implementation, focused checks, and a stop after at most
  one direct local correction.
- A read-only ephemeral no-file CLI probe selected the exact model, global
  provider, and `high` reasoning, then returned `FLASH_EXECUTOR_MODEL_OK`.
- A second no-file CLI probe invoked the registered `flash_executor` role,
  recorded an actual `spawn_agent` call, and received `FLASH_ROLE_OK` from the
  child agent.
- Luna remains paused. Open questions: none.

## P04-T04 Approved Knowledge Retrieval Evidence

Date: 2026-09-04

- Implemented approved repository knowledge manifests (`content/knowledge/vi/ziwei/identity-report-foundation.v1.json` and `content/knowledge/en/ziwei/identity-report-foundation.v1.json`) using exact version `ziwei.identity.knowledge.v1` and repository-relative method guidance covering all 11 identity report sections.
- Created `packages/database/src/schema/knowledge.ts` with immutable `knowledge_documents` and `knowledge_chunks` tables, registered in `client.ts`, `index.ts`, `drizzle.config.ts`, and migration `0013_approved_knowledge.sql` with journal entry `idx: 13`.
- Implemented `packages/backend/src/knowledge/knowledge-ingestion.service.ts` with Zod validation, content hash recomputation, source path containment verification, approval verification, idempotent re-ingestion, and fail-closed immutable protection.
- Implemented `packages/backend/src/knowledge/knowledge-retrieval.service.ts` with PostgreSQL `simple` text search, metadata filtering (discipline, locale, report section, exact version), rank desc and passageId asc deterministic ordering, hard limit enforcement (8 passages, 1,200 chars/passage, 9,600 total chars, 512 query chars, no mid-passage splitting), and silent fallback for unindexed/disabled vector dependency.
- Implemented `apps/worker/src/processors/knowledge-embed.processor.ts` skipping with no side effect when disabled or unindexed, validating input, and embedding approved versioned chunks idempotently when enabled.
- Focused verification passed 26 tests across 4 test files (`knowledge-retrieval.service.test.ts`, `knowledge-migration-layout.test.ts`, `knowledge-embed.processor.test.ts`, `knowledge-retrieval.integration.test.ts`). Real PostgreSQL integration verified with Testcontainers. Builds (`@lasoviet/database`, `@lasoviet/backend`), worker typecheck, scoped ESLint, and `git diff --check` all passed clean.
- Rule candidate: none. Open questions: none.

## FD-030 Sandbox Deployment Evidence

Date: 2026-09-03

- Branch `feature/paid-flow-admin-operations` deployed at
  `200b85222a8b6eedb4692a76f31aed27c73bd214` after Sol's scoped re-review
  verdict `SAFE_TO_PUSH_AND_RERUN_VPS_GATE` with no open findings.
- The verified PostgreSQL pre-deploy backup existed before deployment. The
  workspace producer build passed; the focused Docker VPS gate passed four
  files, 18 tests, and zero failures.
- Compose deployment succeeded: migration exited `0`; PostgreSQL, Redis, API,
  and web were healthy; and the worker was running. The database reported 12
  applied migrations, requested commerce/report tables, and both report
  outbox indexes. Loopback and public HTTPS health returned `200`.
- Public synthetic IPN probes rejected a wrong secret with `401` and
  acknowledged an authenticated non-paid `TRANSACTION_VOID` with exact HTTP
  `200` success without changing commerce order, payment, entitlement, or
  reservation aggregate counts.
- Browser smoke rendered live VI/EN home pages and kept EN and VI checkout
  login callbacks locale-correct. Production Playwright was not a pass: the
  existing specs set their locale cookie for `127.0.0.1` and failed before the
  exercised form flow. This is a local-runtime harness limitation, not a
  production defect; no scope expansion is authorized.
- A real Sandbox card transaction was completed on 2026-09-03 for 79,000 VND;
  no real money moved. SePay delivered an authenticated `ORDER_PAID` to the
  public endpoint and received `200`. PostgreSQL recorded one paid order, one
  payment event, one entitlement, one report reservation, and a processed
  `report.generation.requested.v1` outbox event. The durable report worker
  consumer (P04-T03) was implemented and approved on the active branch on
  2026-09-04 (commits `2f9ef12`, `d585bba`, `d2c64f7`; 21 tests, 6 real
  PostgreSQL integration scenarios, Terra APPROVED). The previously published
  sandbox report job on the remote Docker VPS remains `waiting` pending a
  separately authorized deployment.
- Production payment activation remains a separate founder-controlled gate.

## P04 AI Execution Design

Date: 2026-09-02

- The founder selected the provider identity `9router-an` and confirmed that
  the provider is founder-operated.
- The implementation uses the existing OpenAI-compatible environment group and
  raw `fetch`; no OpenAI SDK dependency is added.
- A synthetic no-PII probe confirmed the configured model, Chat Completions,
  strict JSON Schema output, and forced tool calling.
- The probe is operational evidence only. Request retention, training use,
  processing regions, subprocessors, access controls, deletion behavior, and
  incident-notification terms were historically unknown and blocked production AI
  (superseded on 2026-09-06 by FD-035: founder waived separate enumeration for
  self-hosted `9router-an` and accepted operational/privacy responsibility;
  production AI activation remains a separate founder-controlled gate).
- The current milestone owns pure AI/report contracts and services only.
  Queue, persistence, private report UI, PDF events, and knowledge retrieval
  remain with their existing Phase 04 tasks.
- Final implementation evidence passed 10 AI/report files with 37 tests and 14
  dependent files with 52 tests, focused ESLint, contracts/config builds,
  backend typecheck/build, and one controlled synthetic endpoint smoke.
  Commit range `45119e4..8ec6442` contains the foundation and reviewed
  corrections.
- Sol's final scoped review approved the checkpoint with zero open Critical or
  Important findings. P04-T05 remains incomplete only for its explicitly
  deferred privacy, worker, knowledge, persistence, duplicate-job, and PDF-event
  dependencies.
- Rule candidate: none. The existing privacy gate and R-24 already cover the
  reusable behavior; strict source-snapshot and locale-integrity rules already
  cover the implementation lessons. Open questions: provider privacy terms were
  pending at this checkpoint (superseded on 2026-09-06 by FD-035: resolved by
  founder privacy approval; no open Phase 04 questions).

## P04 Tasks 1-5 In-Page VietQR Flow Evidence

Date: 2026-09-05

- Implemented an in-page VietQR payment experience on the checkout route
  (`/[locale]/thanh-toan/[orderId]`), superseding the hosted SePay redirect flow
  while preserving backward-compatible hosted IPN handling.
- Added five server-only environment variables (`SEPAY_BANK_CODE`,
  `SEPAY_ACCOUNT_NUMBER`, `SEPAY_ACCOUNT_HOLDER`, `SEPAY_ORDER_TTL_SECONDS`,
  `SEPAY_WEBHOOK_SECRET`) with strict schema validation. Bank code, account
  number, and account holder are intentionally projected to the authenticated
  owner on checkout to display transfer instructions, while webhook and gateway
  secrets remain strictly server-only and redacted from client bundles and logs.
- Enforced an initial order time-to-live (TTL) of exactly 900 seconds (15
  minutes) with deterministic database compare-and-set transitions to `expired`
  and rejection of late payments via `PAYMENT_STATE_CONFLICT`.
- Added dual-mode webhook authentication at `/api/webhooks/sepay`:
  - Bank webhook: `X-SePay-Signature: sha256=<hex>`, `X-SePay-Timestamp`,
    canonical `<unix-seconds>.<raw-body>`, constant-time comparison, and maximum
    drift of 300 seconds.
  - Hosted IPN: `X-Secret-Key` verified with constant-time comparison against
    `SEPAY_SECRET_KEY`.
  - Modes are mutually exclusive and fail closed.
- Implemented owner-only checkout status projection (`GET /api/commerce/orders/[orderId]/status`)
  with `cache-control: no-store`, strict client parsing, and 2500 ms
  polling while pending and visible. Polling pauses on document hide, refreshes
  immediately upon visibility, and terminates on `expired`, `failed`, or
  `refunded`.
- When order status becomes `paid` with a valid `reportId`, checkout navigates to
  the localized private report route: VI `/bao-cao/<encoded reportId>` and EN `/en/bao-cao/<encoded reportId>`.
- `recordPaid` remains the single atomic payment-event, entitlement,
  report-reservation, and `report.generation.requested.v1` handoff across all
  payment paths.
- Reopened expired and failed orders retain their stable order ID but receive a
  fresh transfer description/invoice (`LSV-<uuid>`) so stale attempt
  references cannot confirm the reopened order.
- Public webhook bodies at `/api/webhooks/sepay` are capped at 64 KiB (65,536
  bytes) before private API forwarding; oversized or malformed declared
  content lengths fail closed with 413 or 400 without private API forwarding.
- Task 5 review evidence: commit `9543450`, 19/19 focused tests, web typecheck,
  i18n parity, scoped ESLint, and diff check passed; Terra high reported spec
  PASS and quality APPROVED with no findings.
- Local Compose validation remains synthetic-only and must not send a payment or
  call SePay. Production payment activation remains a separate founder gate.

## P04 Tasks 3-6 Implementation and Browser Acceptance Evidence

Date: 2026-09-05 (updated 2026-09-06)

- P04-T03 added the durable PostgreSQL report consumer and state machine,
  ending at the authoritative `generating` handoff. Terra high approved 21
  focused tests, including 6 PostgreSQL integration scenarios.
- P04-T04 added approved, versioned repository knowledge ingestion and bounded
  PostgreSQL retrieval with optional vector augmentation disabled by default.
  Terra high approved 43 focused tests.
- P04-T05 connected the worker to frozen evidence/knowledge, bounded AI
  generation, deterministic validation and critic checks, immutable structured
  and escaped HTML persistence, replay fencing, and one idempotent
  `report.pdf.requested.v1` event. Production AI remained fail-closed while
  provider privacy due diligence was pending (superseded on 2026-09-06 by FD-035:
  provider privacy gate approved; production AI activation remains a separate
  founder-controlled gate).
- P04-T06 added strict private report views, owner-filtered repository/API/BFF
  reads, pending/failed state rendering, artifact-backed responsive HTML,
  report-bound evidence disclosure, locale authority, noindex coverage,
  reduced-motion behavior, and mobile keyboard focus management. Initial
  implementation was approved in commit `c702a91` by Terra high.
- Browser test execution (RED) with controlled fixtures exposed two issues:
  persisted-VI wrong-locale redirect loop on English private reports and a broad
  failed-alert selector.
- Final code fix commit `63f3823c7d630f690588e23de45ad03bec1e2559` (`fix(web): prevent private report locale redirect loops`)
  was independently reviewed and approved by Terra high: SPEC PASS, QUALITY
  APPROVED, with zero open Critical or Important findings.
- Controlled browser acceptance:
  `corepack pnpm@11.25.0 playwright test tests/e2e/paid-report-html.spec.ts --fully-parallel --workers=7`
  passed with 7 passed, 0 failed, 0 skipped, duration 11.2s on 2026-09-06.
  Covered signed-out redirect, cross-owner/missing 404 equivalence, VI
  evidence/noindex/canonical locale, EN locale, pending-to-ready refresh
  retaining path, safe static failed state, and mobile TOC focus lifecycle.
- Fixture harness safety: 16 passed, 0 failed (12 pure + 4 command-level tests);
  loopback-only base URL enforcement; duplicate setup refusal; manifest, path,
  and ID validation; and PostgreSQL ownership verification before promote,
  reset, or cleanup mutations. Terra final scoped review: SPEC PASS / QUALITY
  APPROVED.
- Fixture cleanup: synthetic users, report reservations, report versions, outbox,
  and report queue counts all verified zero; temporary storage states and
  manifest absent. No real SePay, payment, AI, PDF/storage, email delivery, or
  deployment activity.
- Full repository verification after code fix: workspace typecheck PASS;
  workspace production build PASS; full Vitest 121/121 files and 723/723 tests
  PASS; i18n parity PASS; repository ESLint PASS; `git diff --check` PASS.
- Phase 04 closure status: Phase 04 implementation, controlled browser
  acceptance, and provider privacy due diligence approval (FD-035) are complete
  on the isolated branch. Phase 04 is closed. Production payment activation,
  production AI activation, deployment, merge, push, and release activation
  remain separately authorized founder-controlled gates.

## FD-035 Provider Privacy Due Diligence Approval Evidence

Date: 2026-09-06

- The founder formally confirmed that `9router-an` is self-hosted and
  founder-operated.
- The founder waived separate contractual enumeration (retention, training,
  regions, subprocessors, access, deletion, incident notification) and
  explicitly accepted operational and privacy responsibility for this provider
  as configured.
- This approved the Phase 04 provider privacy due-diligence decision gate in
  `docs/compliance/ai-provider-due-diligence.md` and closed Phase 04.
- Scope boundary: FD-035 approves the Phase 04 privacy gate only. It does not
  authorize production AI activation, production payment activation, deployment,
  merge, push, release activation, or credentials changes. Those remain
  separate founder-controlled operations.
- Terra high completed the due-diligence record completeness review in
  `docs/compliance/ai-provider-due-diligence.md` on 2026-09-06 with
  `SPEC PASS / QUALITY APPROVED`.

## P03 Non-Visual Slice 1 Evidence

Date: 2026-09-02

- Implemented the server-only private BFF client and registry-derived robots,
  sitemap index, and section sitemap contracts without modifying visual UI.
- Corrected production `.xml` route-param handling, canonical English root
  output, same-origin token confinement, safe non-success error propagation,
  and current-build browser-boundary verification.
- Fresh verification passed: web build, web typecheck, and 4 focused files
  with 14 tests. Commit range `09fa19c..b637891` is pushed.
- P03-T01 visual layouts, home presentation, navigation, and browser UI checks
  remain deferred by FD-024.
- Rule candidates were evaluated above; neither meets the durable-rule
  threshold. Open questions: none.

## P03 Non-Visual Slice 3 Evidence

Date: 2026-09-02

- Implemented evidence-gated Zi Wei calculation completion, actor-authorized
  latest chart and selected-evidence reads, private API endpoints, and
  server-only BFF loaders without visual UI changes.
- Cross-owner and missing chart IDs are indistinguishable; evidence remains
  bound to the exact latest chart version, capability, and rule version.
- Strict contracts prevent chart responses from carrying full evidence
  payloads and prevent evidence responses from carrying unrelated items.
- Fresh verification passed: 4 focused files with 17 tests plus contracts,
  backend, API, and web typechecks and backend build. Commit range
  `6af39a4..f595dc4` is pushed.
- P03-T03 visual chart/drawer/page/message/browser work remains deferred by
  FD-024.
- The evidence-gated completion rule was added to `AGENTS.md`. Open questions:
  none.

## P03 Non-Visual Slice 4 Evidence

Date: 2026-09-01

- Implemented strict free-preview and topic-selection contracts, deterministic
  evidence-backed preview construction, server-authoritative product catalog,
  privacy-safe analytics emission, actor-authorized private API operations,
  and server-only web loaders/actions without visual UI changes.
- Milestone review found and corrected production evidence-ID mismatch,
  authorize-before-SKU ordering, incomplete relational evidence validation,
  and a no-op production analytics sink.
- Fresh implementation evidence passed 9 focused files with 32 tests plus
  contracts, config, backend, API, and web typechecks. Commit range
  `d050475..11fcda8` is ready to push.
- Sol scoped re-review approved all four corrections with zero open
  Critical/Important findings.
- The repeated workspace declaration freshness failure was added to
  `AGENTS.md`. Open questions: none.

## P03 Non-Visual Slice 5 Evidence

Date: 2026-09-02

- Implemented server-only public-content loading, locale-aware route
  resolution, canonical/alternate/robots metadata, and pure JSON-LD builders
  without visual UI changes.
- Milestone review found and corrected embedded route placeholders, missing
  stable route errors, ignored explicit canonicals, collapsed robots policy,
  and an archived redirect targeting a reserved route.
- FD-025 promoted only `/du-bao-cung-hoang-dao` to `live_indexable`, added
  published VI/EN metadata, and retained `/horoscope` as a 301 redirect to the
  now-live canonical. Other Horoscope routes remain reserved.
- Fresh implementation evidence passed 7 focused files with 25 tests plus
  config build and web typecheck. Commit range `ea95a8f..5377db9` is ready to
  push.
- Sol scoped re-reviews approved all five findings with zero open
  Critical/Important issues. Rule candidate: none. Open questions: none.

## P03 Non-Visual Slice 6 Evidence

Date: 2026-09-02

- Added 54 reviewed VI/EN public documents for all 27 current Gate 1 routes:
  34 core pages and 20 Zi Wei foundation articles.
- Initial milestone review rejected mixed-locale/template-thin copy, an
  incomplete sample report, unsupported sources, and incomplete publication
  gates. Two correction passes rebuilt the corpus, source registry, schemas,
  public-link checks, FAQ parity, and canonical source containment.
- The two-pass breaker kept locale integrity open. Sol replanned with exact
  `franc-min@6.2.0` trigram detection rather than repeating the wordlist
  approach. Whole-document, block, heading-free, and rolling-window analysis
  now rejects linked, heading-prefixed, fragmented, ASCII-stripped, and
  accent-injected foreign prose while preserving current technical Vietnamese.
- Fresh focused evidence passed 6 Gate 1 content tests, config build and
  typecheck, and the checker validated all 54 documents. Sol approved the new
  detector cycle with zero open Critical/Important findings.
- The generated public-content publication-boundary rule was added to
  `AGENTS.md`. Visual rendering and browser checks remain deferred by FD-024.
  Open questions: none.

## P03 Non-Visual Slice 2 Evidence

Date: 2026-09-02

- Implemented authoritative current-actor resolution, consent-first
  BirthProfile submission, shared Zi Wei eligibility contracts, and strict
  server result projection without visual UI changes.
- Stored normalized revisions now remain authoritative on reads; validation,
  ownership, anonymous expiry, and operational errors preserve distinct
  contracts.
- Anonymous actor and Better Auth session expiry are both checked using a fresh
  lookup clock.
- Fresh verification passed: 3 focused files with 26 tests plus contracts,
  backend, and web typechecks. Commit range `9138b15..59c587d` is pushed.
- P03-T02 visual form/page/message/browser work remains deferred by FD-024.
- Rule candidates were evaluated above; neither meets the durable-rule
  threshold. Open questions: none.

## Task 5 Founder-Run MVP Packaging And Gender Correction

Date: 2026-09-02

- Added production-like Docker images and Compose topology for web, API,
  worker, one-shot migrations, PostgreSQL, and Redis. Only web binds to a
  configurable loopback host port; service data persists in named volumes.
- Added focused Compose and host-port invariants, a deployment runbook, and a
  real-stack smoke path. Images run as non-root, app services restart unless
  stopped, and Docker logs are capped.
- Founder approved the explicit Zi Wei gender input on 2026-09-02. Step 2 now
  requires `Nam`/`Nữ`, serializes `male`/`female` without defaulting or
  inference, explains cycle direction, and shows the selected value in Step 3.
- Fresh real-stack smoke passed: profile persistence, Zi Wei calculation,
  chart, evidence drawer, and free identity preview. The founder-authorized
  registration email remains recorded as sent.
- No durable AGENTS.md rule was added. This was one corrected product-input
  omission, not a repeated or repository-wide failure pattern. Open questions:
  none.

## P01-T02 Evidence

Date: 2026-09-01

- Scope: non-visual authentication, identity, SMTP, and API/BFF work only;
  no pages, forms, components, navigation, layouts, styling, or visual states.
- Database migration and ownership-transfer acceptance passed: 3 tests.
- Focused auth/config/backend checks passed: 44 tests. Full repository suite
  passed: 83 tests. Root typecheck and build passed after rebuilding producer
  declarations.
- Browser E2E is not marked green. The exact Playwright command found no
  controlled Next/PostgreSQL runtime at `http://127.0.0.1:3000/`; a later
  authorized runtime must run that gate.
- No external SMTP send or Google request occurred. Rule candidate: none.

## MVP Verification Email Resend Correction

Date: 2026-09-03

- Production evidence showed that Better Auth returned its intentional generic
  success for a repeated sign-up using an existing unverified email address,
  but did not create another notification delivery. SMTP DNS and TCP port 587
  remained reachable, and the account's earlier verification delivery was
  recorded as sent.
- The browser auth adapter no longer treats generic sign-up success as email
  delivery confirmation. The sign-up panel now uses conditional,
  enumeration-safe copy and exposes an explicit Better Auth-backed resend
  verification command without automatically sending a duplicate email for a
  newly created account.
- TDD evidence: the focused auth action suite first failed four assertions
  against the previous behavior, then passed all five tests after the
  correction. Web typecheck, production build, and i18n parity also passed.
- Commit `d7f85ee` was deployed to the VPS web service while API, worker,
  PostgreSQL, and Redis remained running. The replacement web container became
  healthy and the public health route returned HTTP 200.
- One founder-authorized resend request returned HTTP 200 with
  `{"status":true}`. The matching verification-delivery count increased from
  one to two; the new delivery reached `sent` on its first attempt with a
  provider message ID present. The founder confirmed inbox receipt on
  2026-09-03.
- The authentication anti-enumeration rule was added to `AGENTS.md`. Open
  questions: none.

## MVP Auth Recovery Correction

Date: 2026-09-03

- Production access logs showed verification resend returned HTTP 400 while
  the browser carried an anonymous session. Better Auth 1.7.2 source confirmed
  that the cookie selected its session-bound email-mismatch branch instead of
  the public constant-time anti-enumeration branch.
- The account verification callback completed successfully. The subsequent
  sign-in returned HTTP 401, and server logs identified an invalid password;
  the account remained verified with a credential account present.
- Resend verification now omits ambient credentials. Sign-in distinguishes
  invalid credentials from unverified-account recovery without identifying
  whether the email or password was wrong. Password reset request and
  completion routes use Better Auth's existing server configuration, preserve
  enumeration-safe request copy, and remain noindex and outside sitemaps.
- Focused implementation verification covers auth actions and canonical route
  state. Deployment and one live password-reset smoke remain founder-authorized
  external steps. Open questions: none.

## P01-T03 Evidence

Date: 2026-09-01

- Implemented the approved FD-015 recovery state machine and FD-020 anonymous
  retention policy through database-backed services and private API routes.
- Verified actor tokens, not browser-provided identifiers, control account
  deletion. The headless Fastify boundary test rejects anonymous actors.
- Purge orchestration writes audits and opaque versioned outbox events; later
  Phase 06 object-purge work remains responsible for retained legal
  transaction fields and downstream asset deletion.
- Focused and root verification passed. No external side effect occurred.
- Rule candidate: none. Existing durable rules cover this implementation.

## P01-T04 Evidence

Date: 2026-09-01

- Implemented the canonical `BirthProfileV1` contract and normalization path
  without inventing a birth minute for branch-only, ranged, or unknown input.
- Exact solar minutes preserve UTC derivation and timezone provenance; lunar
  inputs remain explicitly unconverted pending a reviewed calendar adapter.
- Profile commands use verified internal actors, append immutable revisions,
  retain anonymous expiry, and reject browser-provided ownership fields.
- Focused birth-profile and migration verification passed. No external side
  effect occurred. Rule candidate: none.

## MVP Vietnamese Typography Correction

Date: 2026-09-02

- Live production diagnostics confirmed that the remote Google Fonts CSS import
  produced no registered font faces or font resources, so Vietnamese UI and
  display text rendered through system and Georgia fallbacks.
- Replaced the runtime import with Next.js-bundled Be Vietnam Pro, Source Serif
  4, and JetBrains Mono faces with Vietnamese subsets and role-specific CSS
  variables.
- The focused typography regression failed against the previous Compose image,
  then passed after rebuilding only the web service. Fresh web typecheck and
  production build also passed.
- Sol xhigh review found zero Critical or Important issues and marked the fix
  ready. The production typography rule was added to `AGENTS.md`. Open
  questions: none.

## MVP VPS Release Integration Gate

Date: 2026-09-02

- The release branch was verified as 87 commits ahead and zero commits behind
  `origin/master` before integration.
- Fresh Docker builds completed for web, API, worker, and migration images.
  Compose started PostgreSQL and Redis healthy, completed migrations, started
  the worker, and gated healthy API and web services in dependency order.
- Deployment tests confirmed that only web publishes on
  `127.0.0.1:${WEB_HOST_PORT}`, while API, worker, PostgreSQL, and Redis remain
  private with persistent data volumes and bounded container logs.
- Release review found that the web image baked the local Better Auth loopback
  URL into browser code. The client now uses same-origin auth, the image has no
  public auth build argument, and VPS guidance requires
  `BETTER_AUTH_URL=https://lasoviet.vn` (superseded on 2026-09-11 by FD-057 to `BETTER_AUTH_URL=https://lasoviet.net`) while Nginx retains the loopback
  upstream.
- A stale E2E chart fixture was replaced with a real anonymous chart flow.
  Focused no-email release verification passed with five tests and one
  intentionally skipped registration-email test.
- Initial GitHub CI failed because production ESLint rules scanned generated
  `prototype/**/support.js` bundles. The prototype artifact tree is now excluded
  from production lint without modifying generated files; local i18n and lint
  gates pass.
- The full local CI run then exposed one brittle layout source assertion and
  anonymous-link success fixtures whose fixed expiries had become past dates.
  The assertion now verifies the locale attribute independently of unrelated
  HTML props, and success expiries derive from the captured test clock. The
  complete Vitest suite passed 267 tests across 68 files at that correction
  point.
- GitHub CI then exposed that a clean checkout had no generated package
  declarations before consumer typechecks. The root typecheck command now
  builds `packages/**` producers topologically before recursive typechecks.
  A detached fresh-worktree verification passed without pre-existing `dist`
  output, and the final full local check passes 268 tests across 68 files.
- The next clean CI run exposed that the browser-boundary test requires current
  `.next/static` artifacts while both the root check and workflow ran tests
  before the build. Build now precedes tests in both paths, and a focused
  workspace regression locks that order. Fresh local verification passes 269
  tests across 68 files.
- The public-origin versus internal-upstream rule was added to `AGENTS.md`.
  Runtime Compose inspection was also restricted to structural fields so
  external deploy environments are never emitted wholesale. The generated
  prototype lint-boundary and runtime-clock fixture rules were added as well.
  Open questions: none.

## Open Decisions OD-001 Through OD-006 Resolved

Date: 2026-09-05

- The founder resolved all six items in `open-decisions.md` directly, in
  Vietnamese, through the founder-facing Claude Code session (no Sol/Terra/Luna
  dispatch was used for this resolution round; the founder answered each gate
  explicitly rather than through silence or a status change).
- OD-001 (remaining Zi Wei SKUs): Option A. Launch
  `ZIWEI-RELATIONSHIP-P0`, `ZIWEI-CAREER-P0`, `ZIWEI-YEAR-P0` one topic at a
  time at VND 79,000 each, matching the existing hypothesis price. Still
  blocked on Phase 07 Task 1 checkout enablement; this only fixes price/order.
  *Historical supersession note (2026-09-12):* The `ZIWEI-YEAR-P0` portion was
  superseded and cancelled by FD-058. Current decadal and annual timing snapshot
  are merged into the base VND 79,000 comprehensive report (V4); OD-001 applies
  only to `ZIWEI-RELATIONSHIP-P0` and `ZIWEI-CAREER-P0`.
- OD-002 (BaZi paid offer): Option A. One comprehensive BaZi report at VND
  79,000, contingent on the report passing the common release QA gate. Still
  blocked on Phase 08 Task 4 checkout enablement.
- OD-003 (Western natal paid offer): Option A. One natal interpretation
  covering planets, angles, houses, and aspects at VND 79,000, contingent on
  natal fixtures and twenty-report QA passing. Still blocked on Phase 09 Task 3
  checkout enablement.
- OD-004 (Liu Yao cooldown): Option A. One active cast per normalized question
  every 24 hours; recasting within the window shows the existing cast instead
  of generating a new one. Still blocked on Phase 10 Task 3 public release
  (the casting engine itself is not built), but the policy language may now be
  stated concretely in the public-facing Kinh Dich page instead of "chua chot"
  (undecided).
- OD-005 (compatibility launch scope): **Founder chose Option C**, diverging
  from the doc's Option A recommendation — launch Zi Wei plus BaZi
  compatibility synthesis together rather than staging one system first. This
  is a deliberate, informed override: the founder was shown the recommendation
  and its rationale (smallest independently reviewable launch) before
  deciding. Still blocked on compatibility contract finalization, synthesis
  implementation, and both source systems' individual stability gates per the
  original blocking condition — resolving this decision unblocks UI planning
  and contract design work, not implementation or public launch.
- OD-006 (first Feng Shui utility): Option A. House-direction utility. Still
  blocked on the Phase 11 Feng Shui contract, fixtures, and public page, but
  the flagship preview page's stub may now be built as a real L0 page instead
  of a 40-line placeholder, since a method scope is confirmed.
- Immediate follow-on prototype work from this resolution: add BaZi and
  Western natal SKUs to `config/product-catalog.json` at `reserved`
  availability (pricing recorded, not yet launched); firm up the Kinh Dich
  cooldown copy; build `/phong-thuy/huong-nha` as a real flagship preview; and
  scope a Compatibility flagship preview reflecting the two-source-system
  choice. None of this enables paid checkout or public release for any of the
  six gates — those remain blocked on their stated implementation-phase
  conditions. Open questions: whether the OD-005 override needs a second,
  written sign-off before compatibility contract work begins in the real
  implementation phases (recommended given it diverges from the documented
  recommendation), and the production BaZi/Western SKU display names shown to
  users (currently reusing the report scope description, not a marketed
  product name).


## FD-057 Canonical Domain Migration to lasoviet.net Evidence

Date: 2026-09-11

- Founder decision: `https://lasoviet.net` supersedes `lasoviet.vn` as the sole
  canonical public web, SEO, Better Auth, checkout, and customer support email
  domain.
- Secondary domains (`lasoviet.vn`, `lasoviet.cloud`, `lasoviet.xyz`) serve as
  non-canonical redirect reserves once externally configured with Cloudflare DNS.
- GitHub repository name (`harris1111/lasoviet.vn`) and local filesystem paths
  (such as `/home/debian/projects/lasoviet.vn`) remain `lasoviet.vn`.
- External DNS/mail gates recorded: `lasoviet.vn` currently has no DNS records
  configured, and `lasoviet.net` currently has no MX or TXT records configured.
  Code and documentation migration does not complete external DNS redirects or
  inbound customer support email delivery until these external records are
  provisioned.
- Runtime configuration (`config/domain-routing.json`, `config/sitemap.json`),
  public metadata, auth client actions, report writer, contracts, E2E tests,
  and deployment specifications are aligned to `lasoviet.net`.


## FD-058 Zi Wei Comprehensive Report V4 Timing Scope, Sensitivity, And Editorial Gate Evidence

Date: 2026-09-12

- Founder decision and override: The base VND 79,000 Zi Wei comprehensive natal
  report (`ZIWEI-IDENTITY-P0`, V4) includes natal interpretation, current
  10-year decadal cycle, current annual snapshot, and three-frame birth-time
  sensitivity analysis. This overrides the 2026-09-07 quality design exclusion
  of decadal and yearly forecasting for this SKU.
- Cancellation of separate annual SKU: `ZIWEI-YEAR-P0` is cancelled as an
  independent offer and removed from `config/product-catalog.json`, Phase 07
  Task 1, and OD-001. OD-001 now applies only to `ZIWEI-RELATIONSHIP-P0` and
  `ZIWEI-CAREER-P0`.
- Timing bounds and brand guideline compliance: The annual section is an
  immutable snapshot tied strictly to the creation year (frozen at report
  reservation). It does not auto-update across new calendar years, and there is
  no recurring annual return loop or reminder. The decadal cycle is considered
  stable across 10 years without expiry warnings. Deep monthly, daily, and
  hourly forecasting remain strictly excluded.
- Birth-time sensitivity and PII minimization: The engine calculates 3
  neighboring time frames (selected hour branch, immediately preceding branch,
  and immediately succeeding branch) and normalizes them into stable factors
  (presented with high confidence) versus birth-time-sensitive factors
  (presented with precision-dependency notes). Raw birth date, time, and
  location must never be transmitted to external AI providers; only normalized
  chart facts and comparison outputs are sent.
- Clarification (2026-09-16): The founder decided that `birthTimeSensitivity`
  is a separate V4.1 implementation slice and an activation gate for LSV-15
  sectioned paid generation. Existing V4 stored reports and current production
  behavior remain unchanged and readable until the V4.1 slice is approved,
  implemented, reviewed, and explicitly activated.
- Structured personalized actions: The report concludes with 3 to 5
  personalized actions. Each action must contain exactly 4 fixed fields: What
  to do (`recommendation`), Why it fits this chart (`rationale`), What to
  avoid (`avoid`), and `evidenceKeys`. No 7-day or 30-day tracking mechanics and
  no goal picker are introduced.
- Tier-1 scope: The VND 19,000 natal excerpt (`ZIWEI-NATAL-EXCERPT-P0`) scope
  remains strictly natal-only and does not receive timing sections.
- Knowledge base editorial prerequisite: Rewriting the Vietnamese knowledge
  corpus into plain conversational Vietnamese, categorizing by school, and
  quarantining extreme or fatalistic content is a prerequisite for V4 release.
  Editorial work is gated on the founder providing the editorial ruleset

## FD-059 Through FD-063 Progressive Reveal, Lá Credits, and Conversion UI

Date: 2026-09-13

- The founder explicitly approved the recommended hybrid secure-blur direction,
  the proprietary `Lá` credit concept, exact-amount top-up alongside stepped
  credit packs, and corresponding brand/spec changes.
- The founder additionally required the AItuvi-derived conversion UI findings
  to be incorporated: chart and diagram surfaces, real counts and status,
  locked content maps, curiosity cues, and contextual upsell.
- The binding design is
  `docs/superpowers/specs/2026-09-13-progressive-reveal-la-credits-and-conversion-ui-design.md`.
- This approval authorizes documentation and implementation planning only. It
  does not authorize runtime wallet/payment/UI implementation, production
  activation, deployment, or migration.
- Exact top-up is approved behavior. Credit-pack prices, individual palace
  prices, and contextual AI-answer prices remain validation hypotheses and are
  not production-authorized SKUs. (Later the same day, FD-065 and FD-066
  superseded the exchange-rate display, exact top-up, and price mapping.)
- Existing trust, privacy, entitlement, payment integrity, and predictive-
  engine gates remain active. Open questions: none for spec review.

## FD-059 Through FD-063 Numbering Note

Date: 2026-09-13

- The AItuvi monetization handoff originally numbered its decisions FD-058
  through FD-062. FD-058 was already assigned to the Zi Wei V4 decision on
  2026-09-12, so the handoff decisions were renumbered to FD-059 through
  FD-063 when imported. Every handoff document was updated accordingly.

## FD-064 Through FD-068 Monetization Round 2 Evidence

Date: 2026-09-13

- Founder decision after reviewing the AItuvi handoff and a verified read of
  AItuvi's public catalog endpoints (`/fastapi/v2/payment/bundles` with
  `type=xu|direct|subscription|chatbot`, `platform=web`) on 2026-09-13.
- FD-064: The founder explicitly rejected avoiding dark patterns on brand or
  ethics grounds and asked that every decision maximize revenue, including
  tricks, provided they are lawful. Reviews must evaluate legality, not taste.
- FD-065: The founder judged `1 Lá = 1,000 VND` to be a parallel currency in
  disguise and chose the two-layer model with no published exchange rate.
- FD-066: The founder approved the proposed pack ladder and content prices,
  and confirmed removal of exact-amount top-up and of the 19,000 VND price
  point. Effective VND per Lá by pack is 96.7 / 90.0 / 83.0 / 74.9.
- FD-067: The founder set invoice timing at the moment of the Lá purchase,
  following comparable international services.
- FD-068: The founder approved pre-generating real content for free users to
  power real-text secure previews.
- Unchanged and still binding: FD-043 self-recovery, FD-053 analytics privacy,
  FD-059 no locked plaintext to unauthorized clients, FD-061 ledger rules,
  FD-041 upgrade window. FD-063's real-numbers rule stands until the founder
  revisits it under FD-064.
- This approval authorizes documentation and implementation planning only; it
  does not authorize runtime implementation, activation, deployment, or
  migration.

## FD-069 Through FD-071 AITuvi Pattern Audit Review

Date: 2026-09-13

- Founder decisions after reviewing
  `aituvi-pattern-audit-lasoviet-recommendations.md` against the current
  repository state.
- FD-069: The founder accepted keeping prices off the homepage; the audit's
  homepage Free/19k/79k matrix is not adopted. Under FD-065/FD-066 any tier
  comparison is expressed in `Lá` and appears only on topic-selection and
  commercial pages.
- FD-070: The founder accepted core-funnel-first sequencing for page-family
  specs; the knowledge hub follows.
- FD-071: The founder stated that all content is AI-generated and no human
  reviewer exists, and that "Lá Số Việt biên tập" is sufficient attribution
  without on-page source lists. Existing "reviewed" wording on public surfaces
  must be replaced; internal `reviewer` metadata values do not render to
  customers and are not a customer claim.
- Cost input for the analytics contribution-margin work (WP-10): the founder
  confirmed SePay runs on the free plan, so the payment-fee cost is recorded as
  0 VND until the plan changes.
- WP-10 split (approved 2026-09-13): WP-10A transaction-derived business and
  operations metrics, WP-10C per-call AI usage and cost capture with a
  30-day contribution margin before support cost, WP-10B anonymous behavioral
  funnel. A drafted analytics consent banner and copy were rejected by the
  founder as high-friction and deleted; see FD-080.

## FD-080 Frictionless Anonymous Measurement

Date: 2026-09-13

- The founder rejected any customer-facing permission step for measurement,
  stating that invisible system optimizations should be built without asking
  users, because consent UI adds friction and drives visitors away.
- The legally safe version that needs no consent is anonymous-by-design
  measurement: data that cannot identify a specific person is not personal
  data. The constraints in FD-080 are therefore binding implementation
  requirements, not optional hardening; relaxing any of them (raw IP storage,
  persistent per-person IDs, joins to account or chart data) would bring the
  data back under Vietnamese personal-data consent rules.
- Third-party advertising pixels that transmit identifiers remain outside this
  decision and require a separate founder decision.

## FD-072 Through FD-078 Zi Wei V4 Report Depth, Language, and Personalization Evidence

Date: 2026-09-13

- Trigger: the founder reviewed a live V4 comprehensive report and judged the
  interpretation thin, insufficiently personalized, and overloaded with
  unnecessary Sino-Vietnamese vocabulary.
- Audit on `origin/master` found: V4 is active (`2886fe1`) on the V3 corpus,
  as the founder decided on Kaneo #3 (2026-09-13, decision 3: corpus
  translation and provenance deferred to a V4.1 fast-follow); the `vi` corpus
  in use is 89.5% Chinese-language chunks (2,918 of 3,258) with a
  49-character median and 372 death/disaster chunks; one 9,000-token call
  covers about 30 narrative blocks; the V4 prompt lacks several V3 rules; no
  depth, vocabulary, or personalization gate exists.
- Founder decisions: keep V4 and add the missing rules (FD-072); approve
  section-by-section generation (FD-073); approve drafting the editorial
  ruleset for sign-off (FD-074); remove death content but keep misfortune
  warnings so customers can prepare (FD-075); approve the everyday-language and
  personal-sounding prompt style (FD-076); approve automated gates (FD-077);
  approve two context questions as a list picker inside the wizard (FD-078).
- FD-075 legal boundary was set under FD-064: warnings avoid certainty,
  adverse-event dates, named diseases, remedies, and paywall use.
- Implementation is assigned to An via a Kaneo ticket and requires an
  implementation plan under `AGENTS.md`. The editorial rewrite starts after the
  founder signs the ruleset.

## FD-081 Identified Account-Linked Tracking

Date: 2026-09-13

- The founder first rejected consent banners (FD-080), then rejected the
  anonymous-by-design constraints as preventing upsell optimization ("không lưu
  IP, không gắn thông tin với tài khoản thì làm sao tracking và tối ưu up sell").
- A parallel session recorded the founder choosing to keep FD-080 at 11:31. The
  founder was then shown both options side by side and explicitly chose
  account-linked tracking ("Gắn tài khoản"). FD-081 is the latest decision.
- Legal basis chosen: consent folded into the existing required wizard checkbox
  and a sign-in notice, so no additional customer step is added. Data collected
  before any consent or sign-in is kept for at most 30 days unless linked.
- The drafted analytics consent copy remains deleted; wording for the widened
  checkbox and privacy-policy section is specified in Kaneo #12 and goes through
  the claim registry (#13).

## FD-082 Professional Referral Advice Allowed

Date: 2026-09-14

- Trigger: auditing the first terminal V4 failure (Kaneo #29) showed the V4
  validator's disclaimer regex both rejects natural sentences and, because it
  uses `\b` without the `u` flag, fails to match phrases with Vietnamese
  diacritics at their edges.
- Founder decision: sentences such as "hãy hỏi ý kiến bác sĩ" or "không phải tư
  vấn pháp lý" are desirable. Advising users to consult qualified people makes
  the interpretation more trustworthy and humane, so they must not be blocked.
- The founder approved the Kaneo #29 next steps recorded on 2026-09-14 (pilot:
  no customer is charged yet; keep V4; fix rejection handling first; gate paid
  launch on 20 consecutive successful V4 generations).

## FD-085 Tracking Retention And Disclosure Clarification

Date: 2026-09-14

- The founder selected account-lifetime retention for identifiable linked
  behavioral history, with complete purge on account or customer-requested
  data deletion.
- Raw IP uses one 12-month retention period for analytics/personalization and
  the separately bounded fraud/security purpose.
- The LSV-12 wizard/auth wording and matching VI/EN privacy disclosure ship in
  the same change that begins collection. LSV-13 adopts the claim record after
  LSV-12 integration.
- An approved the LSV-12 technical plan, migration `0027_account_linked_analytics`, service-token
  boundary, focused test scope, and current limited artifact branch in chat on
  2026-09-14.

## FD-086 Terra Medium Implementation Route

Date: 2026-09-16

- The founder explicitly instructed Sol to stop using Gemini/Flash Executor
  and use GPT 5.6 Terra with `medium` reasoning for bounded implementation.
- A separate GPT 5.6 Terra session with `high` reasoning remains the mandatory
  independent milestone reviewer. The implementor and reviewer sessions must
  remain independent.
- Flash Executor is paused from this decision onward and may be reactivated
  only by another explicit founder instruction.
- Existing scope, approval, review, merge, deployment, activation, and
  external-side-effect gates remain unchanged.

## FD-087 LSV-36 Private PDF Delivery And Immutable Storage Attempts

Date: 2026-09-16

- The founder approved the LSV-36 web BFF as the only browser-facing PDF
  delivery path: after private API owner authorization, the BFF streams or
  proxies the PDF server-side. Garage remains private with no host-published
  port, and its internal signed URL is never returned to the browser.
- The founder approved per-attempt immutable Garage object keys. PostgreSQL
  atomically selects the winning stored key during fenced finalization; objects
  written by losing or expired attempts remain orphans for later authorized
  reconciliation and are never overwritten by a later attempt.
- The founder approved Be Vietnam Pro under the SIL Open Font License 1.1 for
  LSV-36 PDF output.
- This decision does not authorize deployment, activation, use of credentials,
  or external smoke. Each still requires separate founder authorization and
  actual configured credentials.

## FD-088 Two-Theme Colour Contract

Date: 2026-09-20

- Trigger: the 2026-09-20 business-source consolidation found that
  `docs/13-brand-experience-guideline.md` §5.2 carries a `LOCKED` Paper/Ink/
  Cinnabar palette that no shipped component uses. `tokens.css` defines only
  the lacquer scale. The change shipped with no founder decision authorising
  it, which `AGENTS.md` forbids ("Never silently reverse, reinterpret, or
  weaken a founder-confirmed decision"), and `docs/22` §6 had carried the
  unresolved item since 2026-09-02.
- The founder confirmed on 2026-09-20 that a light theme is planned. This
  decision therefore ratifies the lacquer system as the default theme rather
  than declaring a single permanent surface, and records the colour rules now
  so the light theme has a contract to build against from the start.
- The Paper/Ink/Cinnabar palette is **not discarded**. It is a coherent,
  already-reasoned light system whose contrast ratios were measured against a
  light surface, which is exactly the context a light theme needs. It is
  retained in `docs/13` §5.2 as the approved starting point for that theme.
- Audit evidence that a light theme is not currently possible without the
  contract below:
  - The semantic alias layer (`--surface-deep`, `--text-body`, `--accent-gold`
    and others) is defined in `apps/web/src/styles/discipline-pages-foundation.css`,
    scoped to discipline pages, not in the global `tokens.css`.
  - **14 tokens are referenced but never defined anywhere, across 104 uses.**
    Six of them carry no fallback either (`--pearl-100` 12 uses, `--pearl-300`
    13 uses, `--pearl-500`, `--gold-300`, `--pearl-800`, `--lacquer-950`), so
    the declaration is invalid at computed-value time and the text inherits its
    parent's colour instead of the intended one. This is a live rendering bug
    on the privacy policy page, `.palace-title`, `.report-fact-item dd`, and
    the birth-profile wizard, not merely theming debt.
  - `--accent-seal` falls back to *different* colours at different call sites:
    `#CE5B45` (son) in three places and `#c9a44d` (gold) at
    `good-days-preview.tsx:804`. One token name, two colours.
  - 43 bare hex values across 7 `.tsx` files sit outside any token and would
    not change when a theme switches. A further 319 hex values are `var()`
    fallbacks, which are acceptable as a safety net but must not be relied on.
  - Components also reference primitives directly (`var(--lacquer-800, ...)`),
    which bypasses any theme layer by construction.
- Binding rules from this date:
  1. **Semantic-only.** Components reference semantic tokens
     (`--surface-*`, `--text-*`, `--border-*`, `--accent-*`). Referencing a
     primitive (`--lacquer-*`, `--gold-*`, `--pearl-*`, `--son`) directly from a
     component is not allowed in new work.
  2. **Define before use.** A semantic token must be defined in the global
     token layer before any component references it. `--accent-seal` is the
     existing violation and must be fixed.
  3. **No new bare hex.** New components must not introduce hex literals
     outside the token files. The existing 43 are technical debt to be paid
     down, not a precedent.
  4. **Contrast is per theme.** The lacquer theme was measured for the first
     time on 2026-09-20 and mostly passes, with two exceptions now binding:
     `--text-faint` reaches only 3.29:1 on canvas and 3.11:1 on panel, so it
     must not carry meaningful text; and `--accent-seal` reaches 4.38:1 on
     `--surface-panel`, so it must not be used for normal-size text there. The ratios recorded in §5.2 were measured
     against Paper 100 and are valid only for the light theme. Ratios for the
     lacquer theme must be measured against lacquer surfaces. This decision
     does **not** assert that the shipped lacquer pairs currently pass
     WCAG 2.2 AA; that is unverified and must be measured.
- Scope boundary: colour, surface, and theming only. No change to typography,
  spacing, iconography, motion, or any UX, privacy, payment, or content rule.
- The full light-theme colour system is specified, measured, and build-ready in
  `docs/24-light-theme-color-spec.md`. Every value there carries its WCAG 2.2 AA
  ratio. The light theme reuses the `docs/13` §5.2 Paper/Ink palette almost
  unchanged, which passes; the single exception is gold, since `--gold-500`
  reaches only 2.10:1 on paper, so `--gold-800 #755718` is added for light-theme
  text. The gold gradient CTA passes in both themes unchanged and stays a
  shared brand anchor.
- The light theme itself is **not** authorised for build by this decision. It
  is planned; timing stays with the founder, and the Zi Wei flow remains the
  current priority per `docs/23-index-eligibility-gate.md` §0.

## FD-089 Content Boundary Reset For Revenue

Date: 2026-09-22

- Trigger: the founder's 2026-09-22 revamp interview. Both reference
  competitors (aituvi.com, huyenmenh.com) run daily-return features and state
  bad news plainly. The founder instructed: stop being overly gentle, write
  bad and unlucky readings the way ordinary Tử Vi does, and allow everything
  that Vietnamese law does not forbid, to maximise conversion and revenue. The
  founder asked for the rules and docs to be changed to match.
- Allowed from this date:
  1. Traditional Tử Vi readings, including negative ones: hạn years and
     months, bad stars, hard periods, money loss, relationship trouble,
     family conflict, legal or paperwork trouble, travel and accident risk.
     Traditional directness and certainty wording are allowed.
  2. Health: measured warnings are allowed (for example "năm này nên chú ý
     sức khoẻ, nghỉ ngơi và khám định kỳ"). Naming a specific disease as a
     prediction stays banned.
  3. Daily-return features: daily horoscope, "hôm nay của bạn", reminders,
     streaks, and repeat-visit prompts. This removes `docs/13` §6.1 rule 15
     ("No dependency loops").
  4. Paywall and upsell copy may name a misfortune period (for example
     "Năm 2027 có 2 tháng hạn — mở để xem cách chuẩn bị") **only when the
     engine computed that period for this chart**.
- Still banned — the Vietnamese-law line, which always beats revenue:
  1. Death, lifespan, "thọ yểu", and "khắc chết" content. FD-075 stays binding
     on this point.
  2. Selling or recommending rituals, offerings, "giải hạn", "hoá giải",
     "cải vận" packages, or feng-shui objects. Advice about behaviour and
     preparation is fine.
  3. Events, dates, or misfortunes not produced by the engine.
  4. False scarcity, countdowns, fabricated reference or crossed-out prices,
     misleading promotion terms, fake reviews, and fake experts or teams
     (FD-064, FD-071).
  5. Lottery or "lô đề" numbers in any form, including dream pages.
- Legal context: fortune-telling can be treated as "hành nghề mê tín, dị
  đoan", with administrative fines and, on repeat, criminal liability under
  Criminal Code Article 320. The banned list above is the operating line. A
  Vietnamese lawyer has not reviewed it.
- Superseded: the fear-based-claim clause of FD-064; FD-075's bans on
  certainty language, adverse-event dates, and paywall use of misfortune; the
  FD-077 "misfortune-framing check" gate. FD-077's zero-death-terms gate stays.
- Follow-up for An (not done by this decision): update the Zi Wei V4 prompts
  and the FD-077 validator to the new boundary, keeping the death-term gate
  and adding a "misfortune must cite an engine-computed period" check.

## FD-090 Free Tools Hub Exception To The Index Gate

Date: 2026-09-22

- The founder asked for a free tools hub modelled on competitor practice and
  on the repository keyword research (`data/lasoviet_research_master.xlsx`),
  limited to tools that need no complex engine, each designed to lead into a
  paid offer.
- Scope of the exception: tools whose results come from static lookup tables,
  lunar-calendar conversion, a random draw from a fixed deck, or a pure
  formula. The specific tool list and order are set in the revamp plan and
  confirmed by the founder.
- Unchanged: Bát Tự, Kinh Dịch readings, Chiêm Tinh, and paid Thần Số Học stay
  gated by `docs/23-index-eligibility-gate.md`. A tool page moves from
  `live_noindex` to indexable only when it returns real computed results, never
  as a "coming soon" shell.
- Every tool result page must include a bridge into the Zi Wei funnel (for
  example "Ngày tốt chung — nhưng có hợp lá số của bạn?") that carries the
  tool context into the wizard.

## FD-091 Keep The 2026-09-13 AITuvi Adaptation Spec In Full

Date: 2026-09-22

- The founder chose to keep
  `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md`
  whole, including its homepage order, rather than keep only its rules.
- As of 2026-09-22 none of it had shipped: the live homepage is 20,284 px tall
  at 390 px width (spec target ≤ 12,000 px), still has the marquee, and the
  sample report still prints "79.000 ₫" against FD-065.
- The revamp plan builds on this spec. FD-089 overrides its §3.5 only where
  §3.5 banned content for fear reasons; its legal bans stay.

## FD-103 Provisional Zi Wei Chart Fallback For Unknown Birth Time

Date: 2026-09-24

- **Context:** The homepage and wizard allow users to indicate an unknown birth hour ("Tôi không biết giờ sinh"). Previously, the engine rejected calculation with `ENGINE_INPUT_INVALID` / `TIME_UNKNOWN`, completely blocking chart viewing and report purchases.
- **Fallback Hour Index:** When birth hour precision is `unknown`, calculation proceeds with the documented fallback hour index 6 (Giờ Ngọ / Wu, mid-day 11:00–13:00, the astronomical midpoint of the day).
- **Provisional Flagging & Limitations:** The chart snapshot must carry `provisional: true` and `timePrecision: "unknown"`. Provenance must record `BIRTH_TIME_UNKNOWN_PROVISIONAL` in `limitations`, and warnings must include `ziwei.warning.birth-time-unknown-provisional`.
- **Eligibility:** `ZiweiEligibilityV1` returns `eligible: true, timeIndex: 6, provisional: true` so the wizard does not block calculation or purchases.
- **UX & Honesty:** Provisional charts must be prominently labeled "Lá số tạm tính" / "Provisional chart". Hour-dependent claims (Mệnh position, Thân, Đại Vận start, moving palaces) must be framed as provisional reference estimates rather than established facts (following FD-089).
- **Recalculation & Immutability:** When the user later provides their exact or branch birth hour, a new revision and chart are generated; existing provisional charts and paid report snapshots remain permanently immutable in history.


## FD-105 Bậc Thang Lá Funnel, Prices, And Guarantees

Date: 2026-09-27

- **Context:** The founder reviewed the "Bậc thang Lá" customer-journey proposal
  (funnel, magnet offer, AITuvi-style reveal and blur, Hormozi money model,
  Lá-only pricing, closed loop) and approved all of it in one interview on
  2026-09-27. Keyword demand behind the product list comes from
  `data/lasoviet_research_master.xlsx` (Google Keyword Planner, Vietnam,
  2025-08 to 2026-07); demand is not proof of willingness to pay.
- **Prices:** listed in the table row. VND still appears only on top-up packs,
  the payment order, and the invoice (FD-065). Pack values stay FD-066.
- **Rollover:** extends FD-041 from Bản mệnh to single palaces for the same
  chart; the 7-day window starts at the first qualifying spend.
- **Guarantee:** the Lá-back restore uses the existing wallet compensating
  restore; the restored part locks again so the guarantee cannot be used to
  read content for free.
- **Gifts:** 60 promotional Lá at the first verified sign-in (not revenue,
  FD-067); 7 days of Hôm nay của bạn with Tử Vi trọn đời. The founder did not
  approve a 12-month summary gift for membership.
- **Unknown birth time:** follows FD-103 (provisional chart, purchases allowed,
  hour-dependent claims framed as provisional). The older FD-007 exit path in
  the proposal is superseded.
- **Sequencing:** main funnel (Track 1) and time-based products plus
  membership (Track 2) run in parallel. The year, month, and day hạn engine is
  already merged (#190), so Track 2 does not wait for an engine.
- **Interaction with FD-104:** the interactive reader is owned by FD-104; the
  in-reader upsell module of this funnel ships inside FD-104's waves.
