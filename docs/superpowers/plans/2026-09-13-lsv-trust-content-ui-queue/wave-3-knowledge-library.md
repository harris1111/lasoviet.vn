# Wave 3: Knowledge Library and Final Queue QA

**Ticket:** LSV-28
**Entry gate:** LSV-9 and LSV-19 merged; main purchase flow UI-02 through UI-07
complete, including LSV-20 through LSV-25; founder resolves initial cluster and
image-source decisions.

## Verified Content Gap

The current public corpus has ten VI/EN Zi Wei articles. It can strongly
populate `Hiểu mình`, `Học đọc lá số`, and `Phương pháp`, but it does not
contain enough route-backed content for the requested `Quan hệ` and `Công việc`
clusters. The repository also has no dedicated 16:9 article-card image set.

LSV-28 must not invent thin routes, reuse irrelevant imagery, or publish
AI-generated images without founder-approved provenance.

## LSV-28: Knowledge Hub

### Slice 28.1: Editorial Card Metadata and Cluster Registry

**Owned files**

- `packages/contracts/src/knowledge-card-v1.ts` (new)
- `packages/contracts/src/knowledge-card-v1.test.ts` (new)
- `packages/contracts/src/public-content-v1.ts`
- `packages/contracts/src/public-content-v1.test.ts`
- `packages/contracts/src/index.ts`
- `packages/config/src/gate-one-public-content.ts`
- `packages/config/src/gate-one-public-content.test.ts`
- `config/knowledge-clusters.json` (new)
- `packages/config/src/knowledge-clusters.ts` (new)
- `packages/config/src/knowledge-clusters.test.ts` (new)
- `packages/config/src/index.ts`
- `config/public-content.json`
- the existing 20 article MDX files under `content/public/vi/articles/` and
  `content/public/en/articles/`

**Behavior**

- Add strict optional public article-card metadata: publication date, image
  source, localized alt text, dimensions/aspect ratio, and cluster ID.
- Make every live knowledge article supply complete VI/EN card metadata.
- Define cluster order and featured/list ordering in one validated content
  registry. Do not duplicate route paths; entries reference route IDs from the
  canonical route registry.
- Reject unknown, private, reserved, duplicate, locale-incomplete, or
  image-missing entries.
- Keep empty clusters hidden unless the founder explicitly approves placeholder
  behavior.

**Acceptance criteria**

- Every rendered card maps to one live indexable route and one existing 16:9
  image.
- VI/EN records remain paired.
- No new route is activated in this slice.

### Slice 28.2: Approved Image Asset Set

**Owned files**

- approved lowercase-hyphen assets under
  `apps/web/public/images/knowledge/ziwei/`
- `docs/reports/2026-09-13-lsv-28-image-provenance.md` (new)

**Behavior**

- Use founder-provided/licensed images or a separately authorized image
  generation brief.
- Record source, license or generation provenance, prompt/version where
  applicable, filename, route ID, and crop approval.
- Images show the actual article subject, chart concept, method, or reading
  state. Do not use lottery numbers, fake historical manuscripts, unsupported
  Chinese characters, or atmospheric filler.
- Optimize responsive dimensions without runtime remote image dependency.

**Acceptance criteria**

- Every asset is 16:9, inspectable at 320-1440 widths, and has localized alt
  text.
- Provenance is complete and no license is ambiguous.

### Slice 28.3: Hub, Cards, and Homepage Reuse

**Owned files**

- `apps/web/src/features/content/knowledge-card.tsx` (new)
- `apps/web/src/features/content/knowledge-card.test.tsx` (new)
- `apps/web/src/features/content/knowledge-hub.tsx`
- `apps/web/src/features/content/knowledge-hub.test.tsx` (new)
- `apps/web/src/features/content/knowledge-article.tsx`
- `apps/web/src/features/content/knowledge-article.test.tsx`
- `apps/web/src/features/homepage/homepage-knowledge.tsx`
- `apps/web/src/features/homepage/homepage-knowledge.test.tsx` (new)
- `apps/web/src/styles/knowledge-library.css` (new, only from approved artifact)

**Behavior**

- Render breadcrumb, cluster headings, one featured card plus compact list for
  the primary cluster, and three-column card grids where enough content exists.
- Mobile renders one column with stable 16:9 media, no nested cards, no text
  below 14px, and no layout shift from long titles.
- Clamp card title and excerpt to two lines without hiding the accessible name.
- Article pages keep the LSV-9 byline.
- Homepage knowledge reuses the same card component and registry, not a second
  hand-maintained article list.
- Use the LSV-12 landing/CTA analytics contract. Do not introduce unregistered
  knowledge event names.

**Acceptance criteria**

- Long VI/EN titles do not overflow at 320, 390, or 1440.
- Keyboard order follows visual order; card links have visible focus and
  descriptive names.
- Images have fixed aspect ratio and dimensions; no cumulative layout shift
  from late media sizing.
- Only populated founder-approved clusters render.

### Slice 28.4: SEO and Browser Evidence

**Owned files**

- `apps/web/src/seo/structured-data.ts`
- `apps/web/src/seo/structured-data.test.ts`
- `apps/web/src/seo/sitemap-registry.test.ts`
- `tests/e2e/lsv-28-knowledge-library.e2e.ts` (new)

**Behavior**

- Extend Article schema with truthful publication/modification date and image
  only when validated metadata exists.
- Preserve canonical and hreflang from the route registry.
- Keep the current sitemap membership unless a separately approved route
  activation owns the registry change and state/robots/sitemap tests.
- Capture the shared viewport matrix and verify zoom, focus, font loading,
  image sizing, no horizontal overflow, and no card nesting.

**Focused checks**

```bash
corepack pnpm@11.25.0 run content:check
corepack pnpm@11.25.0 exec vitest run packages/contracts/src/knowledge-card-v1.test.ts packages/config/src/knowledge-clusters.test.ts apps/web/src/features/content/knowledge-card.test.tsx apps/web/src/features/content/knowledge-hub.test.tsx apps/web/src/features/content/knowledge-article.test.tsx apps/web/src/features/homepage/homepage-knowledge.test.tsx apps/web/src/seo/structured-data.test.ts apps/web/src/seo/sitemap-registry.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/web run build
corepack pnpm@11.25.0 exec playwright test tests/e2e/lsv-28-knowledge-library.e2e.ts
git diff --check
```

## Final Queue QA

After LSV-28:

1. Re-run the final LSV-14 domain/readability matrix on the integrated target
   environment after explicit deployment authorization.
2. Verify all public trust, commercial, sample, and knowledge routes for
   canonical, hreflang, robots, sitemap, and schema behavior.
3. Verify private topic, checkout, report, and account routes remain noindex
   and server-authorized.
4. Verify no public review claim, hidden support field, legacy VND content
   price, internal founder language, or locked plaintext has returned.
5. Submit the complete queue to Terra M4 review and founder visual sign-off.

## NEEDS_FOUNDER_INPUT

1. Choose either:
   - launch with the three currently supportable clusters and keep `Quan hệ`
     and `Công việc` hidden; or
   - authorize separate content/route tasks to create sufficient articles
     before LSV-28.
2. Provide an approved/licensed 16:9 image set or authorize a bounded image
   generation run with provenance recording.
