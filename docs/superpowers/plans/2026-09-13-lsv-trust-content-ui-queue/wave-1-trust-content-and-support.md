# Wave 1: Trust Content, Domain/Readability, and Support

**Tickets:** LSV-9, LSV-14, LSV-26
**Entry gate:** Founder-approved master plan; LSV-19 artifact available for any
visual change; LSV-13 owns shared claim-policy wording.

## LSV-9: Public MDX and Truthful Attribution

### Slice 9.1: Safe Server-Side Content Projection

**Owned files**

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/src/features/content/public-content-repository.ts`
- `apps/web/src/features/content/public-content-repository.test.ts`
- `apps/web/src/features/content/public-markdown.tsx` (new)
- `apps/web/src/features/content/public-markdown.test.tsx` (new)
- `packages/config/src/gate-one-public-content.ts`
- `packages/config/src/gate-one-public-content.test.ts`

**Behavior**

- Add exact dependencies `react-markdown@10.1.0` and
  `remark-gfm@4.0.1` (MIT; React >=18 peer support). Do not enable raw HTML.
- Load the already validated MDX body through
  `loadGateOnePublicContent()` on the server. Expose only the body and public
  metadata to rendering code; never expose repository paths, source IDs,
  reviewer IDs, or author IDs to the browser.
- Treat the current corpus as a restricted Markdown subset. Reject MDX JSX,
  ESM, and expressions in the content validation tests instead of executing
  them.
- Render headings, paragraphs, lists, emphasis, tables, and internal
  `route:<id>` links. Resolve route IDs through the validated registry and
  localize them; fail closed for unknown, private, reserved, or archived IDs.
- Remove the duplicate first body H1 only when it equals the validated content
  title. Preserve one semantic page H1.

**Acceptance criteria**

- The runtime repository returns the correct body for every route/locale key.
- No arbitrary HTML or JavaScript can execute from public content.
- `route:` links render as valid localized Next links.
- Invalid link IDs and unsupported MDX syntax fail tests.
- CRLF and LF fixtures produce the same result.

**Focused checks**

```bash
corepack pnpm@11.25.0 --filter @lasoviet/config... run build
corepack pnpm@11.25.0 exec vitest run packages/config/src/gate-one-public-content.test.ts apps/web/src/features/content/public-content-repository.test.ts apps/web/src/features/content/public-markdown.test.tsx
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
```

### Slice 9.2: Render Bodies and Remove False Review Claims

**Owned files**

- `apps/web/src/features/content/public-content-page.tsx`
- `apps/web/src/features/content/knowledge-article.tsx`
- `apps/web/src/features/content/public-content-page.test.tsx` (new)
- `apps/web/src/features/content/knowledge-article.test.tsx` (new)
- `apps/web/src/features/free-tools/feng-shui-preview.tsx`
- `apps/web/src/features/free-tools/free-tools-page-provider.ts`
- `content/public/vi/pages/sources.mdx`
- `content/public/en/articles/what-is-a-zi-wei-chart.mdx`
- `config/public-content.json`
- `tests/content/public-attribution.test.ts` (new)

**Behavior**

- Render the full validated body for `/phuong-phap`,
  `/phuong-phap/tu-vi`, `/phuong-phap/ai-va-can-cu`,
  `/nguon-tri-thuc`, `/ve-la-so-viet`, and their English routes.
- Render full knowledge-article bodies rather than the current generic scope
  paragraph.
- Use only `Lá Số Việt biên tập` / `Edited by La So Viet` as the visible
  attribution. Remove visible source lists and review claims.
- Rewrite Feng Shui preview copy as an unavailable feature with no founder
  language and no promise of expert review. Preserve architecture,
  engineering, mental-health, and other professional-advice disclaimers.
- Replace the public phrase `reviewed fixture` with neutral, verifiable wording
  such as `versioned test fixture`.
- Keep internal `reviewed`, `reviewer`, `reviewerIds`, and reviewer registry
  fields unchanged. They are validation state, not public claims, and the
  founder tracker explicitly permits them to remain internal.
- Update `lastReviewed` only for substantively changed MDX records and maintain
  metadata parity.
- Do not add or change visual styling in this slice. Any required typography or
  table treatment must come from the approved LSV-19 artifact.

**Acceptance criteria**

- All five trust pages expose body headings and prose in VI and EN.
- Knowledge articles expose their actual MDX body.
- No customer-facing surface claims human, expert, or team review.
- No visible `Founder` language remains in Feng Shui.
- Structured data contains no reviewer/source metadata.

**Focused checks**

```bash
corepack pnpm@11.25.0 run content:check
corepack pnpm@11.25.0 exec vitest run tests/content/public-attribution.test.ts apps/web/src/features/content/public-content-page.test.tsx apps/web/src/features/content/knowledge-article.test.tsx
corepack pnpm@11.25.0 --filter @lasoviet/web run build
rg -n "Nội dung đã được xem xét|Nguồn tham chiếu đã xem xét|Reviewed content|Reviewed references|This reviewed material|đội ngũ Lá Số Việt xem xét|Founder đã|chuyên gia.*rà soát|expert review" apps/web/src apps/web/messages content/public
```

The final `rg` may match internal test descriptions only if the regression test
explicitly allowlists them. It must not match a rendered-copy source.

### Slice 9.3: Browser and SEO Evidence

**Owned files**

- `tests/e2e/lsv-9-public-content.e2e.ts` (new)

**Behavior and checks**

- Verify the five trust routes in VI and EN return one H1, body headings,
  multiple body paragraphs, localized internal links, canonical metadata, and
  index/follow robots.
- Verify a knowledge article renders body content and the approved byline.
- Verify view-source and JSON payloads contain no reviewer IDs or source paths.
- Capture representative 390 and 1440 screenshots after the LSV-19 artifact is
  approved.

## LSV-14: Canonical Domain and Readability Audit

### Slice 14.1: No-File Domain Audit

**Owned files:** none.

**Behavior**

- Build `@lasoviet/backend` from current source before scanning generated
  output.
- Scan source, built output, public/email copy, robots, sitemap, structured
  data, OG/manifest data, and environment examples.
- Allow `lasoviet.vn` only as the documented redirect reserve in
  `config/domain-routing.json`, `apps/web/src/routing/canonical-origin.ts`,
  repository naming, and historical documentation.
- Return every other match to Sol. Do not broaden the correction brief.

**Focused checks**

```bash
corepack pnpm@11.25.0 --filter @lasoviet/backend run build
rg -n "lasoviet\.vn" apps packages config content scripts --glob '!packages/backend/dist/**'
rg -n "lasoviet\.vn" packages/backend/dist
```

### Slice 14.2: Known Domain Correction

**Owned files**

- `packages/backend/src/reports/comprehensive-report-writer-v4.ts`
- `packages/backend/src/reports/comprehensive-report-writer-v4.test.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.ts`
- `packages/backend/src/reports/comprehensive-report-critic-v4.test.ts`

**Behavior**

- Replace the stale public domain in V4 writer/critic prompts with
  `lasoviet.net`.
- Rebuild the producer; never hand-edit generated `dist`.
- If Slice 14.1 finds another source file, Sol issues a separate narrowed brief
  naming that file and its focused test.

**Focused checks**

```bash
corepack pnpm@11.25.0 exec vitest run packages/backend/src/reports/comprehensive-report-writer-v4.test.ts packages/backend/src/reports/comprehensive-report-critic-v4.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/backend run build
git diff --check
```

### Slice 14.3: Readability Evidence, Then Final Re-Run

**Owned files**

- `tests/e2e/lsv-14-readability.e2e.ts` (new)
- `docs/reports/2026-09-13-lsv-14-domain-readability-audit.md` (new)

**Behavior**

- First run after LSV-9/LSV-26 to establish a baseline.
- Final run after LSV-23 through LSV-25 and all applicable main-flow UI work.
- Test homepage, wizard, chart/result, topic selection, checkout, paid reader,
  and account routes. Exclude only the LSV-8-owned twelve-palace grid until
  LSV-8 merges.
- Measure 320px reflow, 200% browser zoom, touch targets, focus visibility,
  reader typography, Vietnamese glyph loading, and sticky/fixed overlap.
- Record solid-surface contrast programmatically. Record screenshot/manual
  pass/fail for text over textures or images, where computed CSS contrast is
  insufficient.
- Store screenshot artifacts outside Git and record filenames, viewport,
  commit SHA, route, criterion, and pass/fail in the English report. The
  matrix must contain a screenshot reference for every tested route ×
  criterion, not only one representative screenshot per viewport.
- Clear minor defects require a new exact Sol brief. Larger defects become
  separate Kaneo tasks.

**Acceptance criteria**

- No unexplained horizontal overflow at 320px.
- Zoom 200% preserves content and controls.
- Normal text reaches 4.5:1, large text and UI boundaries reach 3:1.
- Reader body is 17-18px with approximately 1.65-1.75 line height.
- UI/display font roles resolve to loaded Vietnamese-capable faces.
- Founder receives the pass/fail matrix and screenshots for FD-056 sign-off.

## LSV-26: Support Configuration and Surfaces

### Slice 26.1: Single Support Configuration

**Owned files**

- `config/support-contact.json` (new)
- `packages/contracts/src/support-contact-v1.ts` (new)
- `packages/contracts/src/support-contact-v1.test.ts` (new)
- `packages/contracts/src/index.ts`
- `packages/config/src/support-contact.ts` (new)
- `packages/config/src/support-contact.test.ts` (new)
- `packages/config/src/index.ts`
- `packages/contracts/src/identity-report-v1.ts`
- `packages/contracts/src/identity-report-v1.test.ts`
- `packages/backend/src/reports/report-query.service.ts`
- `packages/backend/src/reports/report-query.service.test.ts`

**Behavior**

- Define one versioned config with `email`, `zalo`, `phone`, `legalEntity`,
  `address`, and `social` fields, each carrying an explicit visibility flag.
- `support@lasoviet.net` is visible; all other fields are null and hidden.
- Validation requires a value when visible and forbids client output for hidden
  fields.
- Report support projections use the validated config rather than a hardcoded
  literal. The public contract validates an email address but does not become
  a second source of truth.
- Do not claim delivery or mailbox availability from configuration alone.

**Focused checks**

```bash
corepack pnpm@11.25.0 --filter @lasoviet/contracts run build
corepack pnpm@11.25.0 --filter @lasoviet/config run build
corepack pnpm@11.25.0 exec vitest run packages/contracts/src/support-contact-v1.test.ts packages/config/src/support-contact.test.ts packages/contracts/src/identity-report-v1.test.ts packages/backend/src/reports/report-query.service.test.ts
```

### Slice 26.2: Shared Support Card and Footer

**Owned files**

- `apps/web/src/components/support-card.tsx` (new)
- `apps/web/src/components/support-card.test.tsx` (new)
- `apps/web/src/components/site-footer.tsx`
- `apps/web/src/components/site-footer.test.tsx` (new)
- `apps/web/src/app/[locale]/page.tsx`
- `apps/web/src/features/account/order-history.tsx`
- `apps/web/src/features/account/order-history.test.tsx`
- `apps/web/src/features/commerce/vietqr-checkout.tsx`
- `apps/web/src/features/commerce/vietqr-checkout.test.tsx`
- `apps/web/src/features/reports/report-progress.tsx`
- `apps/web/src/features/reports/report-progress.test.tsx`
- `apps/web/messages/vi/account.json`
- `apps/web/messages/en/account.json`
- `apps/web/messages/vi/reports.json`
- `apps/web/messages/en/reports.json`

**Behavior**

- Render the approved email-only support card on the homepage before the final
  CTA, checkout recovery states, report failure, and account orders.
- Build `mailto:` subjects with the public order/invoice code where available.
  Do not include birth data, chart IDs, report content, internal UUIDs, or
  payment secrets.
- Footer shows logo, payment-policy anchor supplied by LSV-13, privacy, terms,
  and the visible support email. It shows no legal entity, address, phone,
  Zalo, or social link.
- LSV-23 later owns support-card integration on topic selection to avoid shared
  file ownership.
- Visual implementation must match the approved LSV-19 support-card artifact.

**Acceptance criteria**

- Every required stable surface renders the same configured email.
- Checkout/order mailto subjects include the public order code.
- Hidden contact fields are absent from HTML, JSON, email copy, and snapshots.
- The card and footer remain keyboard accessible with 44px targets.

### Slice 26.3: Public Contact and External Mailbox Smoke

**Owned files**

- `apps/web/src/features/content/public-content-page.tsx`
- `apps/web/src/features/content/public-content-page.test.tsx`
- `tests/e2e/lsv-26-support.e2e.ts` (new)

**Behavior**

- For `support.contact`, render the MDX body plus the configured email support
  card; do not hardcode the email into MDX.
- Verify the homepage, contact, checkout error/expired states, report failure,
  account orders, and footer.
- A founder-authorized external smoke sends a non-sensitive test message and
  records receipt evidence. This external smoke is required before activation,
  not before local implementation.

## Wave 1 Terra Review

Terra reviews LSV-9 and LSV-26 together with LSV-14 domain results. The review
must verify renderer safety, public claim removal, hidden metadata, config
single-source behavior, support PII boundaries, route/SEO integrity, and
focused/browser evidence.
