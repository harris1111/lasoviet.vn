# Bậc Thang Lá funnel: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development
> or superpowers:executing-plans. One work package = one bounded brief = one
> short-lived branch and one PR into `master` (FD-097). Sol writes each brief
> from this plan; Flash implements; Terra reviews every package marked
> **Terra gate** before merge.

**Goal:** Ship the FD-105 customer journey: magnet offer, secure reveal with
blur, Lá spend with confirm dialog, working top-ups, the new Lá items,
guarantee and gifts, and a closed loop, on top of what already exists.

**Spec:** `docs/superpowers/specs/2026-09-27-la-ladder-funnel-design.md`.
**Decision:** FD-105 (tracker). **Parallel work:** FD-104 interactive reader;
package 1.12 ships inside its waves.

**Baseline audited:** `origin/master` at `4bd25c3` (2026-09-27).

## What already exists (reuse, do not rebuild)

| Capability | Where |
|---|---|
| Lá ledger: purchased and promotional buckets, spend order, idempotent receipts, compensating restore | `packages/backend/src/wallet/wallet.repository.ts` (`grant` ~386, `spend` ~455, `restore` ~578), `wallet.service.ts`, schema `packages/database/src/schema/wallet-commerce.ts`, migrations `0034`, `0036` |
| Atomic spend + entitlement; Tier 1/Tier 2/upgrade prices 240/960/720 | `packages/backend/src/commerce/wallet-unlock.service.ts` (prices hard-coded ~218-247) |
| Top-up order kind and pack SKUs in DB and contracts | `commerce_orders.kind = 'wallet_topup'` with pack CHECK (`packages/database/src/schema/commerce.ts:41-42`); packs in `packages/contracts/src/wallet-commerce-v1.ts:10-15` |
| Wallet API | `apps/api/src/commerce/commerce.controller.ts` `wallet/balance`, `wallet/history`, `wallet/purchase-intents`, `wallet/unlock` (not called by web) |
| Payment code, VietQR, SePay reconciliation, self-claim, circuit breaker | `packages/backend/src/commerce/{payment-code,payment-instructions,sepay-webhook.service,reconciliation-operations}.ts` |
| Entitlement scope rendering | `resolveEntitlementScopeForSku` in `packages/contracts/src/commerce.ts`; `packages/backend/src/reports/report-query.service.ts` |
| Year / month / day hạn engine | `packages/engine-adapters/src/ziwei/iztro-horoscope.ts` (merged #190) |
| Section-by-section generation with checkpoints | `packages/backend/src/reports/report-generation.service.ts`, `comprehensive-report-section-writer-v4.ts` |
| Guarded AI free preview (unused) | `buildGuardedFreeIdentityPreview` in `packages/backend/src/reports/free-identity-preview.ts` |
| Result tabs, topic selection with packs, top-up page, reader | `apps/web/src/features/ziwei/*`, `features/reports/paid-topic-selector.tsx`, `features/commerce/la-packs.ts`, `app/[locale]/nap-la`, `features/reports/comprehensive-report-reader.tsx` |
| Reading context (life stage, top concern) | `packages/backend/src/birth-profile/reading-context.*` |

## Waves

| Wave | Track 1 (funnel and money path) | Track 2 (time-based and continuity) |
|---|---|---|
| 1 | 1.1 → 1.2 → 1.3, then 1.4, 1.5, 1.6, 1.7, 1.8 | 2.1 |
| 2 | 1.9, 1.10, 1.11, 1.12 | 2.2, 2.3 |
| 3 | — | 2.4, 2.5 |

Wave 1 alone makes the funnel work end to end with existing products.

## Global rules for every package

- Contracts first (`packages/contracts`), then database migration, then
  backend service, then API, then web. Keep `vi`/`en` message parity
  (`pnpm i18n:check`).
- Prices come from one catalog source after 1.3; never add a new hard-coded
  price.
- No locked plaintext in any unauthorised response (FD-059).
- VND only on top-up packs, payment order, invoice (FD-065).
- Time-dependent tests use injected clocks.
- Pre-push: `pnpm i18n:check && pnpm lint && pnpm typecheck` and the focused
  tests of the package.
- Do not change `SEPAY_ENV` in any package.

## Track 1

### 1.1 Top-up money path — Terra gate, blocks everything else
**Files:** `packages/backend/src/commerce/{order.service,commerce.repository,sepay-webhook.service}.ts`,
`packages/backend/src/wallet/wallet.service.ts`, `apps/api/src/commerce/commerce.controller.ts`,
`apps/web/src/app/[locale]/nap-la/*`, `apps/web/src/features/commerce/la-packs.ts`,
`apps/web/src/features/reports/paid-topic-selector.tsx` (CTA ~708-716).
**Do:**
1. Create `wallet_topup` orders for the four pack SKUs through the existing
   order and payment-code path (verified account only, FD-029).
2. On authenticated SePay confirmation of a `wallet_topup` order, call
   `grant()` once per order: purchased Lá plus bonus Lá into their buckets,
   idempotency key derived from the order id.
3. Issue the invoice at top-up with the Lá service-credit line (FD-067;
   finance wording stays gated by the claims registry draft).
4. Web: balance pill and Lá history from `wallet/balance` and `wallet/history`;
   the top-up tab CTA creates a top-up order, not a content checkout.
**Accept:** paying a pack once credits exactly once (webhook replay, refresh,
two tabs); self-claim and circuit breaker work for top-ups; no VND outside
the pack, order, and invoice.

### 1.2 Lá unlock with confirm dialog and kept intent — Terra gate
**Files:** `wallet-unlock.service.ts`, `commerce.controller.ts` (`wallet/unlock`,
`wallet/purchase-intents`), web unlock sheet component (new) used by
`ziwei-topics-tab.tsx`, `paid-topic-selector.tsx`, reader upsell (1.12).
**Do:**
1. "Mở – N Lá" opens a confirm dialog: item, price, balance, balance after.
2. Enough Lá: call `wallet/unlock`; de-blur the part in place.
3. Short Lá: save a purchase intent server-side, open the pack sheet with the
   smallest covering pack pre-selected and the next pack beside it.
4. When the top-up from 1.1 is credited, complete the saved intent atomically
   and return the customer to the same chart, tab, and part (`?tab=`, `?open=`).
5. After unlock, show the residual-balance suggestion (spec §5.1).
**Accept:** one debit and one entitlement per confirmation under replay; the
intent survives sign-in and payment; screen readers announce the locked state
and the price.

### 1.3 Catalog, prices, rollover, rename
**Files:** `packages/contracts/src/{commerce,wallet-commerce-v1}.ts`,
`packages/database/src/schema/wallet-commerce.ts` (price CHECK ~110) + new
migration, `config/product-catalog.json`, `wallet-unlock.service.ts`,
`apps/web/messages/{vi,en}/*`.
**Do:**
1. One catalog source for Lá prices; the service reads it; DB CHECK matches it.
2. Add SKUs: single palace (with palace id in scope), Hôm nay, Tháng này,
   Vận hạn năm 2026, combo, membership month/year; activate
   `ZIWEI-RELATIONSHIP-P0` and `ZIWEI-CAREER-P0` at 480 Lá (sale stays off
   until 1.9 passes its gate). SKU ids are never shown to customers (FD-042).
3. Rollover: price of Tử Vi trọn đời = 960 − Lá spent on single palaces and
   Bản mệnh for the chart within 7 days of the first such spend (floor 0);
   720 remains the Bản mệnh-only case.
4. Display name of `ZIWEI-IDENTITY-P0`: "Tử Vi trọn đời" / "Lifetime Zi Wei reading".
**Accept:** contract tests for every price and the rollover arithmetic with a
frozen clock; no customer string contains a SKU id.

### 1.4 Magnet offer and secure reveal on the free result
**Files:** `packages/backend/src/ziwei/ziwei-query.service.ts` (~244),
`packages/backend/src/reports/free-identity-preview.ts`,
`apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`,
`apps/web/src/features/reports/free-identity-preview.tsx`,
`apps/web/src/features/ziwei/{ziwei-topics-tab,ziwei-result-tabs}.tsx`, new blur component.
**Do:**
1. Call `buildGuardedFreeIdentityPreview` (budget preflight and `free_preview`
   cost tracking already inside) to produce insight 1, insight 2 (by top
   concern), 12 palace title lines, and the Bản mệnh opening.
2. Guest sees insight 1 and palace titles; signed-in sees insight 2 and the
   Bản mệnh opening (FD-105 split).
3. Locked parts: server returns title, 1–2 clipped sentences, counts, and a
   length hint only; the client draws blurred placeholder bars.
4. Guest banner: chart deleted after 24 hours, save CTA.
5. Rename the magnet in copy per spec §3.
**Accept:** HTML, JSON, React payload, print, and accessibility tree contain
no locked plaintext (automated check); free preview cost stays under the cap.

### 1.5 Single palace 120 Lá
**Files:** `wallet-unlock.service.ts`, `resolveEntitlementScopeForSku`,
`report-generation.service.ts`, `report-query.service.ts`.
**Do:** first paid natal unlock for a chart triggers the one full generation;
scope for a palace SKU is that palace only; further natal unlocks reuse the
stored report without AI cost.
**Accept:** buying two palaces generates once; reader shows exactly the owned palaces.

### 1.6 Welcome grant 60 Lá
**Files:** auth account-verified hook, `wallet.service.ts` (promotional grant with
the trusted grant token), web toast.
**Accept:** exactly one grant per verified account across retries and devices; not revenue.

### 1.7 Tool-to-wizard birth data carry
**Files:** `apps/web/src/app/[locale]/tao-la-so/tu-vi/page.tsx`,
`apps/web/src/features/birth-profile/birth-profile-form.tsx`,
`free-tool-cross-sell-banner.tsx`.
**Do:** read `name`, `birthDay`, `birthMonth`, `birthYear` from the tool link
into the draft; keep `?from=` concern mapping.
**Accept:** from every tool, no field is asked twice.

### 1.8 Measurement
**Files:** `config/analytics-events.json`, `packages/contracts/src/analytics-event-v1.ts`,
`apps/web/src/features/analytics/*`, the components above.
**Do:** send `topup_view`, `pack_selected`, `la_spent`, `upgrade_view`,
`upgrade_purchased`, `return_visit`; add `unlock_confirm_view`,
`unlock_confirmed`, `part_feedback`, `guarantee_claimed`, `welcome_grant`.
Privacy boundaries FD-053 and FD-080/FD-081 apply.

### 1.9 Topic deep dives: Tình duyên, Công việc
**Files:** new section writers beside `comprehensive-report-section-writer-v4.ts`,
contracts for topic content, quality gates (FD-077).
**Do:** topic content deeper than the matching `thematicSynthesis` entry
(palaces, timing by decadal cycle, actions); no overlap copy.
**Accept:** 20 consecutive passing generations per topic before the SKU is sellable.

### 1.10 Part feedback and Lá-back guarantee — Terra gate
**Files:** new `part_feedback` table and API; `wallet.repository.ts` `restore`
exposed through a guarded customer command; entitlement revoke for the part.
**Do:** "Đúng / Một phần / Không đúng" on free and paid parts; guarantee when
all hold: first claim for the account, item price < 500 Lá, "Không đúng"
within 24 hours of the unlock. Restore Lá, revoke that part, show the related
palace suggestion.
**Accept:** second claim refused; claim after 24 hours refused; restore is
idempotent; revoked part renders locked.

### 1.11 Reminder and completion emails
**Files:** `packages/database/src/schema/notifications.ts` (new kinds), worker delivery.
**Do:** "Phần bạn chọn đã mở" after a delayed top-up; nurture email 2 days
after sign-in without purchase with one real palace title; engine-computed hạn
month reminder. Unsubscribe link on every non-transactional email.

### 1.12 In-reader upsell (inside FD-104 waves)
**Files:** `comprehensive-report-reader.tsx` (owned by FD-104).
**Do:** locked-part previews via 1.4 component; rollover upgrade module using
1.3 price; fix the `/nap-la` link locale prefix.

## Track 2

### 2.1 Hôm nay của bạn (60 Lá) and the 7-day bonus
**Files:** new daily reading writer using the daily scope of
`iztro-horoscope.ts`; `apps/web/src/features/free-tools/daily-horoscope-preview.tsx`
bridge; time-limited entitlement (valid until) for the 7-day bonus granted with
Tử Vi trọn đời.
**Accept:** only engine-computed facts; bonus expires on the 8th day by injected clock.

### 2.2 Tháng này (300) and Vận hạn năm 2026 (480)
**Files:** month and year writers from `monthlyList()` and the annual snapshot
code in `iztro-report-snapshot.ts`.
**Accept:** hạn months named only when computed (FD-089); 20 consecutive
passing generations each.

### 2.3 Membership — Terra gate
**Files:** per `docs/superpowers/specs/2026-09-25-membership-architecture-design.md`;
`la-packs.ts` `MEMBERSHIP_TIERS` (drop `comingSoon` when live).
**Do:** buy with Lá; 30/365-day entitlement; 20% off unlocks, not stacked
with rollover or other discounts (the customer gets the better price);
no auto-renew; reminder 3 days before expiry.

### 2.4 Combo Tử Vi trọn đời + Vận hạn năm 2026 (1,300 Lá)
One spend, two entitlements, atomic. Depends on 1.3 and 2.2.

### 2.5 Hợp đôi (600 Lá)
Two profiles, the other person's consent (OD-005), compatibility writer. Last.

## End-to-end acceptance (Wave 1 exit)

Playwright against a production-like stack with SePay sandbox:
chart → magnet → sign in → +60 Lá → open Hôm nay → open a palace with short
balance → pack pre-selected → sandbox webhook → palace opens in place →
residual suggestion → Tử Vi trọn đời at the rollover price. Checks: one debit
per confirm; no locked plaintext anywhere; return from a banking app on a real
phone; founder visual sign-off (FD-056).

## Open questions

1. Invoice wording for the Lá service credit still needs finance confirmation
   (claims registry `la-invoice-wording-draft`).
2. Who implements each package: An through Sol/Flash/Terra, or a Claude session
   assigned by the founder.
