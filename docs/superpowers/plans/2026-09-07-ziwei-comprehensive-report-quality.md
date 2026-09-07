# Zi Wei Comprehensive Report Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a polished Vietnamese whole-chart Zi Wei report, persist real birth-place context, repair the birth wizard UI, and remove technical report/disclaimer prose from the customer journey.

**Architecture:** Preserve legacy report V1/V2 and introduce a Vietnamese V3 family with richer additive chart fields, deterministic whole-chart facts, metadata-first retrieval, and one structured AI generation call. Keep technical evidence and limitation metadata internally while presenting only natural interpretations and concise chart facts to customers.

**Tech Stack:** TypeScript 6, Next.js 16 App Router, React 19, Zod, NestJS services, Drizzle/PostgreSQL, BullMQ worker, `iztro` 2.6.0, Vitest, Playwright, pnpm 11.25.0.

**Spec:** `docs/superpowers/specs/2026-09-07-ziwei-comprehensive-report-quality-design.md`

## Global Constraints

- Sol high owns orchestration, scope decisions, milestone acceptance, and founder communication.
- Gemini Flash high implements only exact bounded briefs with explicit file ownership.
- Terra high independently reviews each meaningful milestone and performs scoped re-review after corrections.
- Luna remains paused.
- Use Superpowers only. Never invoke `/ck` or CK CLI.
- Founder communication is Vietnamese. Repository documents and commit messages are English.
- Normal Vietnamese V3 generation uses exactly one AI call.
- One bounded retry is allowed only for provider failure or invalid structured output.
- Do not add an AI critic, broad rewrite loop, GraphRAG, new vector database, or fine-tuning.
- Do not display AI disclosure, methodology disclaimers, confidence labels, interpretation bounds, or technical limitation prose in the interactive Zi Wei flow.
- Keep legacy reports immutable and readable.
- Keep payment, authorization, queue durability, and report ownership behavior unchanged.
- Birth place is persisted as profile context. `iztro` continues to use submitted local civil time; do not implement or claim true-solar-time correction.
- Use `Asia/Ho_Chi_Minh` for the current Vietnamese birth flow.
- Runtime V3 knowledge is Vietnamese-first. New English orders continue using report V2 in this delivery.
- Do not ingest the complete 518,400-report sample archive into runtime knowledge.
- Testing is focused on core contracts, representative mappings, one-call generation, customer-visible output, build/typecheck, and a small output sample. Do not build a niche edge-case matrix.

## Pinned Knowledge Inputs

- `SylarLong/iztro@1ba89cca577c6d5d46754d6f49b6b51467c577d1`
- `ziwei-chat@ceef938a4ab8d50f864f690fa7d768b4294fcf77`
- `Renhuai123/nihai-tianji-corpus@c90006168195c0650328b7199669eb6a2d0cac93`
- `Renhuai123/ziwei-doushu@88194a404242bfe5c6d5cc512e4117e3e245cdd5`
- `cxw745/ziwei-astrology-skills@1cde63f65c84040cc5bdcb09fa4724be741fa007`
- `duandigi/tu-vi-dau-so-research@91f8a06f1bca2fb271791785937265ea78d7f858`

## Execution And Review Order

1. Gemini implements Task 1 and Task 2.
2. Terra reviews the complete birth-flow and presentation-cleanup milestone.
3. Gemini implements Task 3 through Task 5 one task at a time.
4. Terra reviews the evidence, corpus, and retrieval milestone.
5. Gemini implements Task 6 and Task 7.
6. Terra reviews the complete V3 generation milestone.
7. Sol runs Task 8, adjudicates only high-impact findings, and presents sample outputs to the founder.

---

### Task 1: Persist Birth Place And Repair The Birth Wizard

**Files:**
- Modify: `packages/contracts/src/birth-profile-v1.ts`
- Modify: `packages/contracts/src/ziwei-view-v1.ts`
- Modify: `packages/backend/src/birth-profile/birth-profile.service.ts`
- Modify: `packages/backend/src/birth-profile/birth-profile.service.test.ts`
- Modify: `packages/backend/src/ziwei/ziwei-query.service.ts`
- Modify: `packages/backend/src/ziwei/ziwei-query.service.test.ts`
- Modify: `apps/web/src/features/birth-profile/birth-profile-input.ts`
- Modify: `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- Modify: `apps/web/src/features/birth-profile/birth-profile-form.test.ts`
- Modify: `apps/web/src/features/birth-profile/birth-wizard-birth-step.tsx`
- Modify: `apps/web/src/features/ziwei/ziwei-result-summary.tsx`
- Modify: `apps/web/src/features/ziwei/ziwei-result-summary.test.tsx`
- Modify: `apps/web/src/styles/birth-profile-wizard.css`
- Modify: `apps/web/messages/vi/profile.json`
- Modify: `apps/web/messages/en/profile.json`

**Interfaces:**
- `BirthProfileV1.placeLabel?: string`
- `NormalizedBirthProfileV1.normalizedPlaceLabel?: string`
- `ZiweiBirthSummaryV1.placeLabel?: string`
- `buildBirthProfile(input: BirthProfileInput): BirthProfileV1`
- The current Vietnamese flow submits `timezone: { ianaZone: "Asia/Ho_Chi_Minh" }`.

- [ ] **Step 1: Add focused failing contract and normalization tests**

Add assertions equivalent to:

```ts
const result = normalizeBirthProfile({
  version: 1,
  calendar: { kind: "solar", date: "1992-08-18" },
  time: { precision: "exact_minute", localTime: "09:30" },
  timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
  placeLabel: "Hà Nội, Việt Nam",
  gender: "male",
  consentVersion: "2026-09-01",
  locale: "vi",
});

expect(result).toMatchObject({
  ok: true,
  value: {
    normalizedPlaceLabel: "Hà Nội, Việt Nam",
    timezoneProvenance: {
      source: "iana",
      ianaZone: "Asia/Ho_Chi_Minh",
    },
  },
});
```

Also assert that whitespace is trimmed and the optional field remains absent
for historical payloads.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/birth-profile/birth-profile.service.test.ts packages/backend/src/ziwei/ziwei-query.service.test.ts apps/web/src/features/birth-profile/birth-profile-form.test.ts
```

Expected: FAIL because the schemas and builder do not preserve `placeLabel`.

- [ ] **Step 3: Extend the additive birth-profile and chart-view contracts**

Implement optional fields without changing version numbers so old stored
profiles remain valid:

```ts
placeLabel: z.string().trim().min(1).max(120).optional()
```

Add `normalizedPlaceLabel` to `NormalizedBirthProfileV1Schema`, derive it from
the parsed input, and add `placeLabel` to `ZiweiBirthSummaryV1Schema`.

- [ ] **Step 4: Send the real place value and IANA timezone**

Change `BirthProfileInput` to accept `placeLabel?: string`. Build:

```ts
return {
  version: 1 as const,
  calendar: { kind: "solar" as const, date: input.date },
  time,
  timezone: { ianaZone: "Asia/Ho_Chi_Minh" },
  ...(input.placeLabel?.trim()
    ? { placeLabel: input.placeLabel.trim() }
    : {}),
  gender: input.gender,
  consentVersion: "2026-09-01",
  locale: input.locale,
};
```

Pass `place` from `BirthProfileForm` into `buildBirthProfile`. Replace the
review value `UTC+7` with `Asia/Ho_Chi_Minh`.

- [ ] **Step 5: Return and render the persisted place**

Populate `birthSummary.placeLabel` in `ziwei-query.service.ts`. Add a localized
`Nơi sinh` / `Birth place` row to `ZiweiResultSummary` only when the value is
present.

- [ ] **Step 6: Remove redundant copy and correct the CSS specificity**

Remove the `formatHint` prop and its parenthetical label rendering. Remove
`placeNote` from the component contract and delete its temporary-context copy
from both locale files.

Use selectors at least as specific as the generic text input rule:

```css
.wizard-field-group .wizard-date-row input {
  width: auto;
  min-width: 0;
  padding-inline: 8px;
}

.wizard-field-group .wizard-place-input-wrap input {
  padding: 0 14px 0 42px;
}

.wizard-place-input-wrap svg {
  top: 50%;
  transform: translateY(-50%);
}
```

Keep stable date widths with grid or constrained flex tracks so placeholders
cannot resize the row.

- [ ] **Step 7: Run focused verification**

Run:

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/birth-profile/birth-profile.service.test.ts packages/backend/src/ziwei/ziwei-query.service.test.ts apps/web/src/features/birth-profile/birth-profile-form.test.ts apps/web/src/features/ziwei/ziwei-result-summary.test.tsx
corepack pnpm@11.25.0 --filter @lasoviet/web run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/contracts/src/birth-profile-v1.ts packages/contracts/src/ziwei-view-v1.ts packages/backend/src/birth-profile packages/backend/src/ziwei apps/web/src/features/birth-profile apps/web/src/features/ziwei/ziwei-result-summary.tsx apps/web/src/features/ziwei/ziwei-result-summary.test.tsx apps/web/src/styles/birth-profile-wizard.css apps/web/messages
git commit -m "fix(profile): persist birth place context"
```

### Task 2: Remove Technical Report Chrome From The Zi Wei Customer Flow

**Files:**
- Modify: `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx`
- Modify: `apps/web/src/features/reports/free-identity-preview.tsx`
- Modify: `apps/web/src/features/evidence/evidence-drawer.tsx`
- Modify: `apps/web/src/features/reports/report-reader.tsx`
- Modify: `apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx`
- Modify: `apps/web/src/features/ziwei/ziwei-presentation.ts`
- Modify: `apps/web/src/features/ziwei/ziwei-presentation.test.ts`
- Modify: `apps/web/messages/vi/reports.json`
- Modify: `apps/web/messages/en/reports.json`
- Modify: `apps/web/messages/vi/ziwei.json`
- Modify: `apps/web/messages/en/ziwei.json`
- Modify: `apps/web/src/styles/global.css`

**Interfaces:**
- Legacy report data remains unchanged.
- `EvidenceDrawer` continues to consume `ZiweiEvidenceViewV1`.
- Customer rendering exposes evidence names and concrete fact values only.

- [ ] **Step 1: Add focused rendering assertions**

Update the report page test to assert that rendered HTML does not contain:

```ts
expect(html).not.toContain("Giới hạn ghi nhận");
expect(html).not.toContain("Tuyên Bố Miễn Trừ");
expect(html).not.toContain("Độ tin cậy");
expect(html).not.toContain("Giới hạn diễn giải");
expect(html).not.toContain("Trường dữ liệu căn cứ");
expect(html).not.toContain("reflective identity");
```

Assert that a real palace/star evidence label remains visible.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
corepack pnpm@11.25.0 vitest run "apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx" apps/web/src/features/ziwei/ziwei-presentation.test.ts
```

Expected: FAIL because legacy technical metadata is still rendered.

- [ ] **Step 3: Simplify the free chart result**

Remove interpretation-bound paragraphs from `FreeIdentityPreview`. Replace the
result-page side note headline with concise chart language and keep the
evidence action only when it opens useful palace/star facts.

- [ ] **Step 4: Simplify the evidence drawer**

Render:

```tsx
<dl className="evidence-detail-list">
  <dt>{presentation.chrome.chartFacts}</dt>
  <dd>{evidence.factReferences.map(presentation.fact).join("; ")}</dd>
</dl>
```

Do not render confidence, bounds, allowed action categories, limitations, or
raw fallback English strings.

- [ ] **Step 5: Hide legacy report-only sections and metadata**

For V1/V2 customer rendering, omit these section IDs:

```ts
const LEGACY_HIDDEN_SECTION_IDS = new Set([
  "data_and_method",
  "primary_evidence",
  "limitations_and_disclaimer",
]);
```

Do not render:

- per-claim limitations;
- per-evidence confidence and bounds;
- `professionalAdviceDisclaimer`;
- right-rail confidence/bounds/fact-field metadata;
- the right-rail disclaimer note.

Keep claims, narratives, suggested actions, and evidence titles that read as
useful interpretations.

- [ ] **Step 6: Remove dead translations and CSS**

Delete locale keys and styles used only by removed customer metadata. Keep
internal presentation mappings only if an operations path still consumes
them.

- [ ] **Step 7: Run focused verification**

Run:

```bash
corepack pnpm@11.25.0 vitest run "apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx" apps/web/src/features/ziwei/ziwei-presentation.test.ts apps/web/src/features/reports/load-free-identity-preview.test.ts
corepack pnpm@11.25.0 run i18n:check
corepack pnpm@11.25.0 --filter @lasoviet/web run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "fix(web): simplify Zi Wei interpretation surfaces"
```

**Milestone Review:** Terra high reviews Task 1-2 for birth-place persistence,
mobile form rendering, absence of customer-facing technical prose, and no
authorization regression. Sol sends only scoped corrections back to Gemini.

### Task 3: Preserve Whole-Chart Data And Build Deterministic Report Facts

**Files:**
- Modify: `packages/contracts/src/normalized-ziwei-chart-v1.ts`
- Modify: `packages/contracts/src/normalized-ziwei-chart-v1.test.ts`
- Modify: `packages/engine-adapters/src/ziwei/iztro-mapping.ts`
- Modify: `packages/engine-adapters/src/ziwei/iztro-adapter.test.ts`
- Create: `packages/backend/src/reports/comprehensive-ziwei-facts.ts`
- Create: `packages/backend/src/reports/comprehensive-ziwei-facts.test.ts`
- Modify: `packages/backend/src/index.ts`

**Interfaces:**
- Additive palace fields remain optional for historical chart JSON.
- `buildComprehensiveZiweiFacts(chart: NormalizedZiweiChartV1): ComprehensiveZiweiFacts`
- `ComprehensiveZiweiFacts` contains all twelve palace facts, relationships,
  transformations, and supported pattern matches.

- [ ] **Step 1: Add a representative raw-chart mapping test**

Build one raw palace fixture containing principal, minor, adjective, and
decorative stars plus heavenly stem and cycle state. Assert preservation:

```ts
expect(chart.palaces[0]).toMatchObject({
  heavenlyStemId: "ziwei.stem.jia",
  isBodyPalace: true,
  stars: expect.arrayContaining([
    {
      id: "ziwei.star.ziwei",
      category: "major",
      brightness: "ziwei.brightness.prosperous",
    },
  ]),
});
```

- [ ] **Step 2: Run mapping tests and confirm RED**

Run:

```bash
corepack pnpm@11.25.0 vitest run packages/contracts/src/normalized-ziwei-chart-v1.test.ts packages/engine-adapters/src/ziwei/iztro-adapter.test.ts
```

Expected: FAIL because optional whole-chart fields and extra star groups are
not mapped.

- [ ] **Step 3: Add backward-compatible chart fields**

Add optional canonical fields to the strict schemas:

```ts
category: z.enum(["major", "minor", "adjective", "decorative"]).optional()
heavenlyStemId: z.string().regex(/^ziwei\.stem\.[a-z0-9-]+$/).optional()
isBodyPalace: z.boolean().optional()
isOriginalPalace: z.boolean().optional()
cycleStateId: z.string().regex(/^ziwei\.cycle\.[a-z0-9-]+$/).optional()
```

Add optional chart-level relationship and pattern arrays. Old chart JSON
without the fields must still parse.

- [ ] **Step 4: Preserve supported `iztro` values**

Extend the raw adapter types and map:

- palace heavenly stem;
- body/origin flags;
- major, minor, adjective, and decorative stars;
- brightness and mutation values;
- relevant natal cycle state.

Unknown decorative data that has no canonical ID is skipped with a stable
internal mapping count; it must not fail the complete chart calculation.

- [ ] **Step 5: Implement deterministic relationships and high-value patterns**

`buildComprehensiveZiweiFacts` must emit:

```ts
type ComprehensiveZiweiPalaceFact = {
  palaceId: ZiweiPalaceId;
  earthlyBranchId: string;
  heavenlyStemId?: string;
  isLifePalace: boolean;
  isBodyPalace: boolean;
  stars: NormalizedZiweiChartV1["palaces"][number]["stars"];
  triadPalaceIds: ZiweiPalaceId[];
  oppositePalaceId: ZiweiPalaceId;
  flankingPalaceIds: [ZiweiPalaceId, ZiweiPalaceId];
};

type ComprehensiveZiweiFacts = {
  palaces: ComprehensiveZiweiPalaceFact[];
  transformations: NormalizedZiweiChartV1["transformations"];
  patterns: Array<{
    id: string;
    palaceIds: ZiweiPalaceId[];
    starIds: string[];
  }>;
  evidenceKeys: string[];
};
```

Start with patterns whose conditions are explicit in the pinned source rules.
Do not add speculative or fuzzy pattern detection.

- [ ] **Step 6: Add focused fact-builder assertions**

Assert exactly twelve palace facts, correct triad/opposition/flanking
relationships, transformation preservation, stable evidence keys, and one
known pattern match.

- [ ] **Step 7: Run focused verification and commit**

```bash
corepack pnpm@11.25.0 vitest run packages/contracts/src/normalized-ziwei-chart-v1.test.ts packages/engine-adapters/src/ziwei/iztro-adapter.test.ts packages/backend/src/reports/comprehensive-ziwei-facts.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/engine-adapters run typecheck
git add packages/contracts packages/engine-adapters packages/backend/src/reports/comprehensive-ziwei-facts* packages/backend/src/index.ts
git commit -m "feat(ziwei): preserve whole-chart report evidence"
```

### Task 4: Build The Versioned V3 Knowledge Corpus

**Files:**
- Create: `packages/database/drizzle/0016_ziwei_knowledge_metadata.sql`
- Modify: `packages/database/src/schema/knowledge.ts`
- Modify: `packages/backend/src/knowledge/knowledge-ingestion.service.ts`
- Modify: `packages/backend/src/knowledge/knowledge-retrieval.service.ts`
- Modify: `packages/backend/src/knowledge/knowledge-retrieval.service.test.ts`
- Create: `scripts/build-ziwei-knowledge-v3.mjs`
- Create: `content/knowledge/ziwei/comprehensive-report-sources.v3.json`
- Create: `content/knowledge/vi/ziwei/comprehensive-report.v3.json`
- Modify: `apps/worker/src/reports/provision-report-knowledge.ts`
- Modify: `apps/worker/src/reports/provision-report-knowledge.test.ts`

**Interfaces:**
- `KnowledgeChunkMetadataV1`
- `KnowledgeChunkManifest.metadata?: KnowledgeChunkMetadataV1`
- `KnowledgePassageV1.metadata?: KnowledgeChunkMetadataV1`
- Knowledge version: `ziwei.comprehensive.knowledge.v3`

- [ ] **Step 1: Add a focused metadata ingestion test**

Use:

```ts
const metadata = {
  topics: ["career"],
  palaces: ["ziwei.palace.career"],
  stars: ["ziwei.star.wuqu"],
  brightness: ["ziwei.brightness.prosperous"],
  transformations: [],
  relations: ["triad"],
  patterns: [],
  sourceType: "classical",
  languageOrigin: "zh",
  priority: 3,
};
```

Assert that ingestion preserves metadata and retrieval returns it unchanged.

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/knowledge/knowledge-retrieval.service.test.ts
```

- [ ] **Step 3: Add optional JSONB metadata**

Migration:

```sql
ALTER TABLE "knowledge_chunks"
  ADD COLUMN "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX "knowledge_chunks_metadata_idx"
  ON "knowledge_chunks" USING gin ("metadata");
```

Define:

```ts
export const PERMITTED_USE_BASES = [
  "first_party",
  "licensed",
  "public_domain",
  "reference_rewrite",
] as const;

type KnowledgeChunkMetadataV1 = {
  topics: string[];
  palaces: string[];
  stars: string[];
  brightness: string[];
  transformations: string[];
  relations: string[];
  patterns: string[];
  sourceType: "modern" | "classical" | "matrix" | "curated";
  languageOrigin: "vi" | "zh" | "en";
  priority: 1 | 2 | 3;
};
```

Keep metadata optional in old manifests and default it to empty arrays.
The generated V3 manifest uses `permittedUse: "reference_rewrite"` so internal
provenance is accurate without adding a license-screening gate.

- [ ] **Step 4: Add a deterministic corpus builder**

The script accepts exact source roots:

```bash
node scripts/build-ziwei-knowledge-v3.mjs \
  --nihai-root G:/Dev/Temp/lasoviet-ziwei-sources/nihai-tianji-corpus \
  --renhuai-root G:/Dev/Temp/lasoviet-ziwei-sources/ziwei-doushu \
  --skills-root G:/Dev/Temp/lasoviet-ziwei-sources/ziwei-astrology-skills \
  --research-root G:/Dev/Temp/lasoviet-ziwei-sources/tu-vi-dau-so-research \
  --iztro-root G:/Dev/Repos-Windows/tuvi-a-lam/iztro \
  --ziwei-chat-root G:/Dev/Repos-Windows/tuvi-a-lam/ziwei-chat
```

The script:

- verifies the six pinned commit SHAs;
- imports only Zi Wei material;
- excludes generated documentation duplicates and hosted API wrappers;
- chunks at paragraph/statement boundaries under 1,200 characters;
- deduplicates normalized content hashes;
- assigns canonical metadata and stable passage IDs;
- emits the source registry and the Vietnamese V3 manifest;
- fails if any palace has no dedicated knowledge or any manifest hash differs
  from recomputation.

Do not perform license filtering. Record source repository, path, and commit
for internal provenance.

- [ ] **Step 5: Build the initial corpus**

Clone missing research sources into the temporary source directory at their
pinned commits, then run the builder. Include:

- the complete Zi Wei subset from `nihai-tianji-corpus`;
- selected `iztro` palace, star, brightness, transformation, pattern,
  synthesis, and classical learning documents;
- the star-palace matrix and report-coverage references;
- explicit Renhuai patterns and topic knowledge;
- the Vietnamese reasoning structure and current promoted `ziwei-chat`
  content.

Do not download or ingest the complete 5.5 GB chart sample archive.

- [ ] **Step 6: Provision Vietnamese V3 and retain English V2**

Change worker provisioning to ingest:

- `content/knowledge/vi/ziwei/comprehensive-report.v3.json`;
- `content/knowledge/en/ziwei/identity-report-foundation.v2.json`.

The worker remains fail-closed when either configured manifest is invalid.

- [ ] **Step 7: Run focused verification and commit**

```bash
node scripts/build-ziwei-knowledge-v3.mjs --check
corepack pnpm@11.25.0 vitest run packages/backend/src/knowledge/knowledge-retrieval.service.test.ts apps/worker/src/reports/provision-report-knowledge.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/database run typecheck
git add packages/database packages/backend/src/knowledge apps/worker/src/reports scripts/build-ziwei-knowledge-v3.mjs content/knowledge
git commit -m "feat(knowledge): add comprehensive Zi Wei corpus"
```

### Task 5: Retrieve Compact Knowledge Packs For The Whole Chart

**Files:**
- Create: `packages/backend/src/reports/comprehensive-report-retrieval.ts`
- Create: `packages/backend/src/reports/comprehensive-report-retrieval.test.ts`
- Modify: `packages/backend/src/knowledge/knowledge-retrieval.service.ts`
- Modify: `packages/backend/src/reports/report-generation.repository.ts`
- Modify: `packages/backend/src/reports/report-generation.repository.test.ts`
- Modify: `packages/backend/src/reports/report-source.ts`
- Modify: `packages/backend/src/index.ts`

**Interfaces:**
- `retrieveZiweiKnowledge(query: ZiweiKnowledgeQueryV3): Promise<KnowledgePassageV1[]>`
- `buildComprehensiveKnowledgePacks(facts, retrieve): Promise<ZiweiReportKnowledgePack[]>`

```ts
type ZiweiKnowledgeQueryV3 = {
  locale: "vi";
  knowledgeVersion: "ziwei.comprehensive.knowledge.v3";
  topics?: string[];
  palaceIds?: string[];
  starIds?: string[];
  brightnessIds?: string[];
  transformationIds?: string[];
  relationIds?: string[];
  patternIds?: string[];
  text: string;
  maxPassages: number;
  maxTotalChars: number;
};

type ZiweiReportKnowledgePack = {
  id: string;
  evidenceKeys: string[];
  passages: Array<{
    passageId: string;
    content: string;
    metadata: KnowledgeChunkMetadataV1;
  }>;
};
```

- [ ] **Step 1: Add retrieval ranking tests**

Create three passages:

1. exact palace + star match;
2. palace-only match;
3. generic topic match.

Assert that the order is `exact`, `palace`, `generic`, regardless of passage
ID ordering.

- [ ] **Step 2: Run tests and confirm RED**

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/reports/comprehensive-report-retrieval.test.ts packages/backend/src/reports/report-generation.repository.test.ts
```

- [ ] **Step 3: Implement metadata-first retrieval**

Use approved document/version/locale filters first. Rank candidates with:

```text
+100 exact pattern
+40 exact palace
+30 exact star
+20 exact transformation
+10 brightness
+8 relation
+4 topic
+metadata priority
+PostgreSQL text rank as tie-breaker
```

Do not call an embedding provider. Deduplicate by `contentHash`, then
`passageId`.

- [ ] **Step 4: Build bounded section packs**

Produce:

- one core Mệnh/Thân pack;
- twelve palace packs;
- one pattern/Tứ Hóa pack;
- four thematic packs;
- one final synthesis pack.

Each palace pack contains at most two passages and 1,800 characters. The
complete collection is capped at 32,000 characters. Specific material wins
over generic doctrine.

- [ ] **Step 5: Bind V3 source loading**

For V3, `report-generation.repository.ts` loads the immutable normalized chart,
builds comprehensive facts, and retrieves packs. V1/V2 retain their current
source loading unchanged.

- [ ] **Step 6: Run focused verification and commit**

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/reports/comprehensive-report-retrieval.test.ts packages/backend/src/reports/report-generation.repository.test.ts
git add packages/backend/src/knowledge packages/backend/src/reports packages/backend/src/index.ts
git commit -m "feat(reports): retrieve whole-chart knowledge packs"
```

**Milestone Review:** Terra high reviews Task 3-5 for chart-fact correctness,
source pinning, twelve-palace corpus coverage, retrieval ordering, context
budget, and absence of runtime external retrieval calls.

### Task 6: Add The Vietnamese V3 Report Contract And One-Call Writer

**Files:**
- Create: `packages/contracts/src/ziwei-comprehensive-report-v1.ts`
- Create: `packages/contracts/src/ziwei-comprehensive-report-v1.test.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/backend/src/reports/identity-report-config.ts`
- Modify: `packages/backend/src/reports/identity-report-version-family.ts`
- Modify: `packages/backend/src/reports/identity-report-version-family.test.ts`
- Modify: `packages/backend/src/reports/identity-report-config.test.ts`
- Create: `packages/backend/src/reports/comprehensive-report-writer.ts`
- Create: `packages/backend/src/reports/comprehensive-report-writer.test.ts`
- Create: `packages/backend/src/reports/comprehensive-report-validator.ts`
- Create: `packages/backend/src/reports/comprehensive-report-validator.test.ts`
- Modify: `packages/backend/src/reports/report-generation.service.ts`
- Modify: `packages/backend/src/reports/report-generation.service.test.ts`
- Modify: `packages/backend/src/commerce/commerce.repository.ts`
- Modify: `packages/backend/src/index.ts`

**Interfaces:**
- Prompt version: `ziwei.comprehensive.prompt.v3`
- Knowledge version: `ziwei.comprehensive.knowledge.v3`
- Config version: `ziwei.comprehensive.report.v3`
- Template version: `ziwei-comprehensive-html.v1`
- `currentReportVersions(locale)` returns V3 for `vi`, V2 for `en`.
- `writeComprehensiveZiweiReport(input)` makes one `generateStructured` call.

- [ ] **Step 1: Add the V3 schema test**

Define a separate immutable report content schema:

```ts
type ZiweiComprehensiveReportContentV1 = {
  overview: {
    title: string;
    narrative: string;
    evidenceKeys: string[];
  };
  coreAxis: {
    title: string;
    narrative: string;
    evidenceKeys: string[];
  };
  keyConfigurations: Array<{
    title: string;
    narrative: string;
    evidenceKeys: string[];
  }>;
  palaceReadings: Array<{
    palaceId: ZiweiPalaceId;
    title: string;
    narrative: string;
    evidenceKeys: string[];
  }>;
  thematicSynthesis: Array<{
    id: "career_wealth" | "relationships_family" | "social_environment" | "wellbeing_inner_resources";
    title: string;
    narrative: string;
    evidenceKeys: string[];
  }>;
  strengthsAndTensions: {
    title: string;
    narrative: string;
    evidenceKeys: string[];
  };
  practicalDirection: string[];
};
```

Require all twelve canonical palace IDs exactly once. Do not include
`professionalAdviceDisclaimer`, `confidence`, `limitations`,
`interpretationBoundCode`, or `reflectionQuestions`.

- [ ] **Step 2: Run schema and family tests and confirm RED**

```bash
corepack pnpm@11.25.0 vitest run packages/contracts/src/ziwei-comprehensive-report-v1.test.ts packages/backend/src/reports/identity-report-version-family.test.ts
```

- [ ] **Step 3: Add locale-aware current versions**

Implement:

```ts
export function currentReportVersions(locale: "vi" | "en") {
  return locale === "vi"
    ? {
        family: "v3" as const,
        knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
        promptVersion: "ziwei.comprehensive.prompt.v3",
        reportConfigVersion: "ziwei.comprehensive.report.v3",
      }
    : {
        family: "v2" as const,
        knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2,
        promptVersion: REPORT_PROMPT_VERSION_V2,
        reportConfigVersion: REPORT_CONFIG_VERSION_V1,
      };
}
```

Use it when creating new report reservations. Existing reservations retain
their stored version family.

- [ ] **Step 4: Implement the one-call writer**

The provider request uses:

```ts
await provider.generateStructured({
  schema: ZiweiComprehensiveReportContentV1Schema,
  schemaName: "ziwei_comprehensive_report_content_v1",
  use: "production_report_generation",
  maxOutputTokens: 9_000,
  system: VIETNAMESE_COMPREHENSIVE_REPORT_SYSTEM_PROMPT,
  user: JSON.stringify({
    facts: input.facts,
    knowledgePacks: input.knowledgePacks,
    requiredPalaceOrder: ZIWEI_PALACE_IDS,
  }),
});
```

The system prompt requires:

- natural expert Vietnamese;
- interpretation before technical naming;
- all twelve palaces;
- cross-palace synthesis;
- explicit handling of reinforcing and conflicting factors;
- concrete manifestations and priorities;
- no process narration, disclaimer, AI mention, report-policy text, repeated
  caution, or invented chart facts.

Assembler-owned canonical titles replace model-supplied titles.

- [ ] **Step 5: Implement lightweight deterministic validation**

Validate only:

- schema;
- twelve unique palace readings;
- every `evidenceKey` exists in comprehensive facts;
- no exact or normalized near-duplicate paragraphs;
- no English/disclaimer phrases from the prohibited phrase list;
- no star, palace, transformation, brightness, or pattern identifier absent
  from frozen facts.

Do not score prose with another model.

- [ ] **Step 6: Bypass the critic for V3**

Branch in `report-generation.service.ts`:

```ts
if (family === "v3") {
  const draft = await writeComprehensiveZiweiReport(source, provider);
  const validation = validateComprehensiveZiweiReport(draft.report, source.facts);
  if (!validation.ok) return failAttempt("AI_OUTPUT_INVALID", false);
  return persistV3(draft);
}
```

Keep current V1/V2 generation and replay behavior intact. A provider exception
remains retryable through the existing job state machine. Do not invoke
`critiqueIdentityReport` for V3.

- [ ] **Step 7: Assert one provider call**

Add:

```ts
expect(provider.writerCalls).toBe(1);
expect(provider.criticCalls).toBe(0);
```

Also assert that invalid structured output persists no report version and
returns the existing retry/terminal classification.

- [ ] **Step 8: Run focused verification and commit**

```bash
corepack pnpm@11.25.0 vitest run packages/contracts/src/ziwei-comprehensive-report-v1.test.ts packages/backend/src/reports/identity-report-config.test.ts packages/backend/src/reports/identity-report-version-family.test.ts packages/backend/src/reports/comprehensive-report-writer.test.ts packages/backend/src/reports/comprehensive-report-validator.test.ts packages/backend/src/reports/report-generation.service.test.ts
corepack pnpm@11.25.0 --filter @lasoviet/backend run typecheck
git add packages/contracts packages/backend/src/reports packages/backend/src/commerce packages/backend/src/index.ts
git commit -m "feat(reports): generate comprehensive Vietnamese readings"
```

### Task 7: Render V3 Reports And Preserve Legacy Readability

**Files:**
- Create: `packages/backend/src/reports/comprehensive-report-html.ts`
- Create: `packages/backend/src/reports/comprehensive-report-html.test.ts`
- Modify: `packages/backend/src/reports/report-generation.service.ts`
- Modify: `packages/backend/src/reports/report-query.service.ts`
- Modify: `packages/backend/src/reports/report-query.service.test.ts`
- Modify: `packages/contracts/src/identity-report-v1.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/web/src/features/reports/load-report.ts`
- Modify: `apps/web/src/features/reports/load-report.test.ts`
- Modify: `apps/web/src/features/reports/report-reader.tsx`
- Modify: `apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx`
- Modify: `apps/web/src/styles/global.css`

**Interfaces:**
- `ReportReadyView` becomes a discriminated union of legacy V1 and
  comprehensive V3 content.
- `renderComprehensiveZiweiHtml(report)` renders customer prose without
  technical metadata or disclaimer sections.

- [ ] **Step 1: Add V3 query and render tests**

Assert:

```ts
expect(view.contentVersion).toBe("ziwei-comprehensive.v1");
expect(view.content.palaceReadings).toHaveLength(12);
expect(html).toContain("Cung Mệnh");
expect(html).not.toContain("Giới hạn");
expect(html).not.toContain("Độ tin cậy");
expect(html).not.toContain("AI");
```

Retain one legacy V2 fixture assertion proving old reports still load.

- [ ] **Step 2: Run focused tests and confirm RED**

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/reports/comprehensive-report-html.test.ts packages/backend/src/reports/report-query.service.test.ts apps/web/src/features/reports/load-report.test.ts "apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx"
```

- [ ] **Step 3: Add a public report-content union**

Discriminate content with:

```ts
contentVersion: z.enum(["identity.v1", "ziwei-comprehensive.v1"])
```

For legacy stored content, query projection supplies `identity.v1`. For V3,
parse with `ZiweiComprehensiveReportContentV1Schema`. Do not rewrite stored V1
or V2 JSON.

- [ ] **Step 4: Render the comprehensive reading**

Render in this order:

1. overview;
2. Mệnh/Thân core axis;
3. key configurations;
4. twelve palace readings;
5. four thematic synthesis sections;
6. strengths and tensions;
7. practical direction.

Evidence keys remain in structured content for internal traceability but are
not printed in HTML.

- [ ] **Step 5: Add the V3 reader branch**

Use a dedicated small component inside `report-reader.tsx` or extract
`comprehensive-report-reader.tsx` if the existing file would exceed a clear
single responsibility. Keep the existing pending/failed states and owner
authorization unchanged.

- [ ] **Step 6: Run focused verification and commit**

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/reports/comprehensive-report-html.test.ts packages/backend/src/reports/report-query.service.test.ts apps/web/src/features/reports/load-report.test.ts "apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx"
corepack pnpm@11.25.0 --filter @lasoviet/web run build
git add packages/contracts packages/backend/src/reports apps/web
git commit -m "feat(web): render comprehensive Zi Wei reports"
```

**Milestone Review:** Terra high reviews Task 6-7 for exactly one normal AI
call, complete palace coverage, immutable legacy behavior, clean Vietnamese
reader output, and unchanged authorization/payment boundaries.

### Task 8: Evaluate Representative Output And Close Delivery

**Files:**
- Create: `scripts/generate-ziwei-quality-samples.mjs`
- Create: `plans/reports/sol-2026-09-07-ziwei-v3-output-quality.md`
- Modify only when a high-impact finding is confirmed: files owned by Task
  3-7.

**Interfaces:**
- The sample script generates local/private reports through the real V3 writer
  using configured provider credentials.
- No sample birth data, report body, or provider credential is committed.

- [ ] **Step 1: Prepare five representative private sample charts**

Select five charts covering:

- distinct Mệnh/Thân placements;
- both favorable and difficult brightness combinations;
- several Four Transformations;
- at least two named patterns;
- one chart with relatively sparse principal-star placement.

Use synthetic identities and remove generated database/report artifacts after
review.

- [ ] **Step 2: Generate one report per chart**

Run the V3 path and record:

- generation duration;
- provider call count;
- output word count;
- duplicate-paragraph count;
- prohibited-phrase count;
- twelve-palace completeness.

Expected for each report:

- one normal provider call;
- all twelve palace readings;
- no prohibited technical/disclaimer phrase;
- approximately 2,200-3,200 Vietnamese words unless the evidence is unusually
  sparse.

- [ ] **Step 3: Perform a human output review**

Score each report from 1-5 for:

- chart-fact correctness;
- Vietnamese naturalness;
- specificity;
- cross-palace synthesis;
- low repetition;
- useful priorities;
- absence of mechanical report language.

Record exact excerpts only in the private working notes. The committed review
contains findings and corrections without private birth data or full report
text.

- [ ] **Step 4: Correct only high-impact repeated failures**

Accept a correction only when it affects at least two samples or creates a
clear factual error. Limit corrections to:

- metadata/tagging;
- retrieval weights or context caps;
- prompt wording;
- deterministic validator false negatives;
- canonical presentation.

Do not add another AI pass or a broad technical test suite.

- [ ] **Step 5: Run final focused verification**

```bash
corepack pnpm@11.25.0 vitest run packages/backend/src/birth-profile/birth-profile.service.test.ts packages/backend/src/ziwei/ziwei-query.service.test.ts packages/engine-adapters/src/ziwei/iztro-adapter.test.ts packages/backend/src/reports/comprehensive-ziwei-facts.test.ts packages/backend/src/reports/comprehensive-report-retrieval.test.ts packages/backend/src/reports/comprehensive-report-writer.test.ts packages/backend/src/reports/comprehensive-report-validator.test.ts packages/backend/src/reports/comprehensive-report-html.test.ts packages/backend/src/reports/report-generation.service.test.ts packages/backend/src/reports/report-query.service.test.ts "apps/web/src/app/[locale]/bao-cao/[reportId]/page.test.tsx"
corepack pnpm@11.25.0 run i18n:check
corepack pnpm@11.25.0 run typecheck
corepack pnpm@11.25.0 --filter @lasoviet/web run build
git diff --check
```

Do not run the complete historical test suite unless a focused failure shows
shared behavior was changed.

- [ ] **Step 6: Terra final review and scoped correction**

Terra returns findings ordered by:

1. factual chart/report errors;
2. customer-visible Vietnamese quality;
3. missing twelve-palace or cross-palace synthesis;
4. runtime call count and latency;
5. compatibility regressions.

Sol rejects purely theoretical edge-case expansion that does not affect the
approved core flow.

- [ ] **Step 7: Commit the quality report and final corrections**

```bash
git add scripts/generate-ziwei-quality-samples.mjs plans/reports packages apps content
git commit -m "fix(reports): polish comprehensive Zi Wei output"
```

## Definition Of Done

- Birth place is persisted and shown back to the user.
- The birth date inputs and place icon render correctly on desktop and mobile.
- The interactive Zi Wei flow contains no technical limitation, confidence,
  disclaimer, or reflective-signal boilerplate.
- New Vietnamese orders reserve report V3; English remains on V2.
- V3 consumes whole-chart facts and metadata-ranked knowledge.
- Every V3 report covers all twelve palaces and provides cross-palace
  synthesis.
- Normal V3 generation makes one AI call and no critic call.
- Existing V1/V2 reports remain immutable, authorized, and readable.
- Five representative outputs meet the founder's quality bar.
- Focused tests, i18n parity, typecheck, web build, and `git diff --check`
  pass.
