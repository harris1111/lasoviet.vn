# Wave 2: Pricing, Sample, Paid Reader, and Free-Tool Cross-Sell

**Tickets:** LSV-23, LSV-24, LSV-25, LSV-27
**Entry gate:** Wave 1 merged; LSV-12, LSV-13, LSV-18, LSV-19, and applicable
LSV-22/LSV-8 dependencies merged to `master`.

Downstream UI code consumes shared wallet, analytics, result, secure-preview,
bottom-sheet, tab, card, and support primitives. It must stop if those
contracts are absent or incompatible.

## LSV-23: Topic Selection and Lá Packs

### Slice 23.1: Public Pricing and SEO Reconciliation

**Owned files**

- `content/public/vi/pages/commercial.ziwei.identity.mdx`
- `content/public/en/pages/commercial.ziwei.identity.mdx`
- `config/public-content.json`
- `packages/config/src/gate-one-public-content.ts`
- `packages/config/src/gate-one-public-content.test.ts`
- `apps/web/src/seo/structured-data.ts`
- `apps/web/src/seo/structured-data.test.ts`

**Behavior**

- Remove the legacy 79,000 VND content price and one-time VND purchase contract
  from public content.
- Represent approved content prices in Lá only, using the LSV-18 catalog
  contract as authority. Do not duplicate pack or balance rules in MDX.
- Keep the public commercial route indexable and canonical.
- Emit truthful Product structured data without a fabricated monetary Offer
  for a service purchased only with proprietary credits. Keep the Product
  node only if the validator permits a no-`offers` Product with name,
  description, and SKU; otherwise change the route schema contract in the
  same bounded slice and test the resulting type explicitly. Top-up packs
  retain VND only on their private purchase surface.

**Acceptance criteria**

- Public commercial content contains no VND content price or Lá/VND exchange
  rate.
- Product schema contains no false VND content offer.
- Metadata parity and content checks pass.

### Slice 23.2: Segmented Pricing Surface

**Owned files**

- `apps/web/src/features/reports/paid-topic-selector.tsx`
- `apps/web/src/features/reports/paid-topic-selector.test.tsx`
- `apps/web/src/features/reports/purchase-offer-presentation.ts`
- `apps/web/src/features/reports/purchase-offer-presentation.test.ts`
- `apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.tsx`
- `apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.test.tsx`
- `apps/web/messages/vi/reports.json`
- `apps/web/messages/en/reports.json`
- `apps/web/src/styles/topic-selection.css` (new, only from approved artifact)

**Behavior**

- Add `Luận giải` and `Gói Lá` segmented tabs.
- Show 240 Lá Tier 1, 960 Lá Tier 2, and an in-window 720 Lá upgrade. VND is
  absent from the content tab.
- Show the four FD-066 top-up packs with exact VND price, base Lá, truthful
  bonus, and `Gợi ý` only where approved. No crossed-out price or unsupported
  popularity claim.
- Render the benefits panel, tab-specific FAQ, and LSV-26 support card.
- Preserve existing ownership states and the current VND flow while the
  LSV-18 feature flag is off. Do not activate the Lá path in this slice.
- Emit only LSV-12-registered view, tab, selection, and CTA events.

**Acceptance criteria**

- 390px shows the recommended card and actionable CTA without horizontal
  overflow.
- VND appears only on `Gói Lá` and later order/payment views.
- Existing entitlements remain readable with the flag off or on.
- All numbers come from the LSV-18 catalog/projection, not JSX constants.

### Slice 23.3: Balance, Intent, and Checkout Integration

**Owned files**

- `apps/web/src/features/reports/paid-topic-selector.tsx`
- `apps/web/src/features/reports/paid-topic-selector.test.tsx`
- `apps/web/src/features/commerce/checkout-purchase-form.tsx`
- `apps/web/src/features/commerce/checkout-purchase-form.test.tsx`
- `tests/e2e/lsv-23-la-purchase-flow.e2e.ts` (new)

**Behavior**

- Consume LSV-18 server actions for balance check, atomic spend/unlock, and
  top-up-intent creation.
- If balance is insufficient, open the approved bottom sheet with current
  balance, required Lá, the smallest covering pack as primary, next pack as
  secondary, and truthful residual balance.
- Preserve opaque chart/offer/section intent through sign-in, top-up,
  banking-app return, and refresh. Never put birth data or protected text in
  the intent.
- Successful top-up returns to the pending spend; successful spend returns to
  the selected unlocked content. Retries replay the LSV-18 receipt.
- Keep the new path behind the LSV-18 kill switch until end-to-end smoke passes.

**Focused checks**

```bash
corepack pnpm@11.25.0 exec vitest run apps/web/src/features/reports/paid-topic-selector.test.tsx apps/web/src/features/reports/purchase-offer-presentation.test.ts apps/web/src/features/commerce/checkout-purchase-form.test.tsx apps/web/src/app/[locale]/la-so/[chartId]/chon-luan-giai/page.test.tsx
corepack pnpm@11.25.0 --filter @lasoviet/web run build
corepack pnpm@11.25.0 exec playwright test tests/e2e/lsv-23-la-purchase-flow.e2e.ts
```

## LSV-24: Real Anonymized Sample

### Slice 24.1: Sample Projection and Static Fixture

**Owned files**

- `packages/contracts/src/ziwei-sample-view-v1.ts` (new)
- `packages/contracts/src/ziwei-sample-view-v1.test.ts` (new)
- `packages/contracts/src/index.ts`
- `content/samples/ziwei/sample-report-v4.vi.json` (new)
- `content/samples/ziwei/sample-report-v4.en.json` (new)
- `apps/web/src/features/content/load-ziwei-sample.ts` (new)
- `apps/web/src/features/content/load-ziwei-sample.test.ts` (new)

**Behavior**

- Define a strict public sample projection: anonymized chart display, one full
  overview, two full public topics, clipped excerpts for remaining topics, and
  `sample_preview` labels.
- Generate the Vietnamese sample once through the approved V4 pipeline using a
  synthetic profile. Produce an English AI translation of the same sanitized
  sample unless the founder chooses a different English-route policy.
- Persist only static, schema-valid public projections. Do not persist or ship
  a real name, email, account, order, report ID, exact birth data, or hidden
  topic plaintext.
- The one-time provider call requires a separate founder-authorized brief and
  available credentials. It is not part of ordinary local code execution.

**Acceptance criteria**

- Both locale fixtures validate and contain no real-person identifiers.
- Locked sample records contain excerpts only.
- The fixture is immutable and does not regenerate during build or request.

### Slice 24.2: Shared Result UI Composition

**Owned files**

- `apps/web/src/features/content/sample-report-page.tsx`
- `apps/web/src/features/content/sample-report-page.test.tsx` (new)
- `apps/web/src/styles/sample-report.css`
- `tests/e2e/lsv-24-sample-report.e2e.ts` (new)

**Behavior**

- Replace generic palace cards with the approved LSV-22 result components in
  explicit sample mode.
- Label the page and each layer `Bản mẫu` / `Sample`.
- Open chart and overview layers, expose two complete topic samples, and show
  excerpt-only previews for the rest.
- Use `Lá Số Việt biên tập` / `Edited by La So Viet`.
- Remove every VND value and the legacy 79,000 copy. Use `Lập lá số của bạn` as
  the final and mobile-sticky CTA.
- Preserve H1, canonical `lasoviet.net`, Article schema, and indexability.
- Do not display the chart center fields that could reconstruct the synthetic
  birth profile.

**Acceptance criteria**

- Mobile readers can read one overview and two complete topics without zoom.
- View-source and RSC payloads contain no hidden topic plaintext.
- No VND, real-person name, internal ID, or personal birth field is present.
- LSV-12 sample-view, tab, and CTA events fire without prohibited properties.

## LSV-25: Paid Report Reader

### Slice 25.1: Cross-Device Reading State

**Owned files**

- `packages/contracts/src/report-reading-progress-v1.ts` (new)
- `packages/contracts/src/report-reading-progress-v1.test.ts` (new)
- `packages/contracts/src/index.ts`
- `packages/database/src/schema/reports.ts`
- `packages/database/src/schema/schema.integration.test.ts`
- one generated additive migration under `packages/database/drizzle/`
- `packages/backend/src/reports/report-reading-progress.repository.ts` (new)
- `packages/backend/src/reports/report-reading-progress.repository.test.ts` (new)
- `packages/backend/src/reports/report-reading-progress.service.ts` (new)
- `packages/backend/src/reports/report-reading-progress.service.test.ts` (new)

**Behavior**

- Persist owner-scoped report position as stable section ID plus bounded
  within-section progress, and persist real section completion separately.
- Enforce report ownership before read/write; no anonymous or cross-owner
  access.
- Make updates idempotent and monotonic for completion. A stale device may
  update position but must not erase completed sections.
- Use injected clocks in tests.

**Acceptance criteria**

- The service derives truthful `read/owned` counts.
- Two devices on the same account observe the latest saved position.
- Cross-owner reads and writes fail closed.

### Slice 25.2: Private API and Web Loader

**Owned files**

- `apps/api/src/reports/report-reading-progress.controller.ts` (new)
- `apps/api/src/reports/report-reading-progress.controller.test.ts` (new)
- `apps/web/src/features/reports/report-reading-progress-client.ts` (new)
- `apps/web/src/features/reports/report-reading-progress-client.test.ts` (new)
- `apps/web/src/features/reports/load-report.ts`
- `apps/web/src/features/reports/load-report.test.ts`

**Behavior**

- Add authenticated private read/update endpoints through the trusted
  server-to-private-API path.
- Return only report ID, stable section state, counts, and timestamps.
- Do not return content, birth data, account identifiers, or analytics profile
  data.
- Debounce client updates and flush on visibility/page lifecycle where
  supported; reading must continue if persistence is temporarily unavailable.

### Slice 25.3: Reader Navigation, Resume, and Upgrade

**Owned files**

- `apps/web/src/features/reports/report-reader.tsx`
- `apps/web/src/features/reports/report-reader.test.tsx`
- `apps/web/src/features/reports/comprehensive-report-reader.tsx`
- `apps/web/src/features/reports/comprehensive-report-reader.test.tsx`
- `apps/web/src/features/reports/report-progress.tsx`
- `apps/web/src/features/reports/report-progress.test.tsx`
- `apps/web/messages/vi/reports.json`
- `apps/web/messages/en/reports.json`
- `apps/web/src/styles/report-reader.css` (new, only from approved artifact)
- `tests/e2e/lsv-25-reader-progress.e2e.ts` (new)

**Behavior**

- Use the approved sticky layer tabs/TOC and 720px reading measure.
- Mobile TOC uses the approved bottom sheet with focus trap and focus return.
- Show textual progress such as `Bạn đã đọc 2/4 phần`.
- `Đọc tiếp` restores the server-saved position across devices; local storage
  may remain only as a short-lived resilience cache, not authority.
- Locked sections consume LSV-22/LSV-18 excerpt-only projections.
- Show the upgrade module only after at least one owned section is completed
  and again at report end. Show real open/locked counts, one clipped excerpt,
  960 Lá list price, 240 Lá prior tier context, 720 Lá due, and the exact
  FD-041 deadline. Do not open a modal on report load.
- Emit LSV-12 `report_section_read`, upgrade-view, and upgrade-purchase events.

**Acceptance criteria**

- Refresh, back, and a second authenticated browser restore reading position.
- The upgrade module is absent before first-section completion.
- Locked plaintext is absent from all unauthorized payloads and print output.
- Mobile 390px is readable without zoom and returns focus correctly.

## LSV-27: Free-Tool Result Cross-Sell

### Slice 27.1: Dormant Shared Contract and Banner

**Owned files**

- `apps/web/src/features/free-tools/free-tool-cross-sell.tsx` (new)
- `apps/web/src/features/free-tools/free-tool-cross-sell.test.tsx` (new)
- `apps/web/src/features/free-tools/free-tools-page-model.ts`
- `apps/web/src/features/birth-profile/homepage-birth-prefill.ts`
- `apps/web/src/features/birth-profile/homepage-birth-prefill.test.ts`

**Behavior**

- Define a closed source enum for functional tools and validate the `from`
  query before carrying it into the wizard.
- Render the approved non-fearful banner only after a real tool result, never
  before the result and never on illustrative preview/gated pages.
- The current repository has no functional free tool, so this slice remains
  dormant and has no visible route behavior.
- Emit the LSV-12 source-to-`wizard_start` event only after an actual banner
  view/click.

### Slice 27.2: Per-Tool Activation

This slice is not dispatchable until a route's model is `isFunctional: true`
and the same route-activation task owns the required
`config/route-registry.yml` state/robots/sitemap tests.

For each activated tool, Sol issues a separate exact brief naming that tool's
result component and tests. Do not bulk-edit all illustrative previews.

## Wave 2 Terra Reviews

- **M2:** Review LSV-23 after a complete Lá purchase flow exists.
- **M3:** Review LSV-24 and LSV-25 together for shared result/preview behavior.
  Include LSV-27 only if a functional tool has actually been activated.
