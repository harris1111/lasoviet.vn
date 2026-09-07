# Zi Wei Comprehensive Report Quality Design

**Date:** 2026-09-07
**Status:** Founder-approved direction; written spec pending review

## Goal

Replace the narrow identity-report interpretation with a polished Vietnamese
whole-chart reading. The report must interpret all twelve palaces, explain the
dominant chart structures and tensions, and synthesize related palaces into
useful life themes without sounding like a technical evidence report.

Delivery speed and output quality are the priorities. Normal generation uses
one AI call, compact section-specific retrieval, and only lightweight
deterministic validation.

## Founder Decisions

- The report is a comprehensive natal Zi Wei reading, not only an identity
  summary.
- Runtime knowledge may be assembled from the approved open-source research
  repositories and rewritten or normalized for this product.
- Source provenance remains internal for versioning, retrieval, and debugging.
  It is not rendered as citations in the customer report.
- The report UI and generated content contain no AI disclosure, methodology
  disclaimer, or repeated defensive language.
- Do not add an AI critic, multi-pass polishing pipeline, or broad technical
  edge-case suite.
- Verification focuses on representative output quality, the core generation
  path, compilation, and a small set of high-value deterministic checks.

## Scope

### Included

- A richer immutable chart-evidence snapshot derived from the complete `iztro`
  natal chart.
- Deterministic palace relationships and high-value pattern detection.
- A versioned, metadata-rich Zi Wei knowledge corpus.
- Retrieval packs tailored to each report section and chart configuration.
- A new Vietnamese comprehensive-report prompt and structured report schema.
- One-call report generation with a narrow retry only for provider or schema
  failure.
- Representative output-quality evaluation before release.

### Excluded

- Deep decadal, yearly, monthly, daily, or hourly forecasting.
- Other divination disciplines.
- Fine-tuning a model on the large generated chart-sample dataset.
- A new vector database or GraphRAG subsystem.
- Multiple AI agents, critic calls, automatic editorial rewrites, or thick
  quality gates.
- Payment changes, report authorization changes, PDF work, UI redesign,
  deployment, and production activation.

## Knowledge Sources

The runtime corpus is layered rather than treating one repository as complete.

### Primary interpretation corpus

`Renhuai123/nihai-tianji-corpus` supplies the main structured traditional
statements. Import the Zi Wei subset from its machine-readable entries and
retain the source book, heading, lesson, section, and original language.

### Calculation and classical reference

The pinned `SylarLong/iztro` source remains the calculation authority. Import
selected learning and classical documents covering:

- twelve palaces and palace relationships;
- fourteen principal stars and fixed combinations;
- auxiliary, miscellaneous, and temporal stars;
- brightness;
- Four Transformations;
- documented patterns;
- natal synthesis order.

Generated documentation duplicates and hosted API wrappers are not corpus
inputs.

### Coverage completion

Use `cxw745/ziwei-astrology-skills` as a reference for the principal-star by
palace matrix, brightness overlays, Four Transformation overlays, malefic
overlays, pattern coverage, and comprehensive report structure.

Use selected structured rules from `Renhuai123/ziwei-doushu`, especially
pattern definitions, classical material, and topic-oriented principal-star
knowledge.

### Vietnamese reasoning and terminology

Use `duandigi/tu-vi-dau-so-research` for the normalized knowledge shape and
whole-chart reasoning sequence. Retain the current curated `ziwei-chat`
Vietnamese corpus as a terminology, style, and focused-topic supplement.

### Evaluation-only material

Use a small stratified subset of the 518,400 released chart samples from
`Renhuai123/ziwei-doushu` for coverage discovery and comparison. Do not place
the complete generated dataset in runtime retrieval.

## Knowledge Model

Normalize imported passages into a versioned corpus with stable identifiers
and metadata:

- `source_id`, `source_path`, `source_type`, and `language_origin`;
- `topic` and `scope`;
- `palaces` and `star_set`;
- `brightness`;
- `transformations`;
- `relations`, including triad, opposition, and flanking;
- `patterns`;
- `polarity` and `priority`;
- original text plus an optional curated Vietnamese summary.

The first delivery may retrieve multilingual source passages. Canonical
Vietnamese names and metadata must be available before runtime so the writer
does not invent terminology. Vietnamese summaries can be expanded
incrementally without changing the report contract.

Knowledge versions are immutable. Corrections produce a new version rather
than mutating reports already generated.

## Full-Chart Evidence

The comprehensive evidence snapshot contains enough deterministic material to
retrieve and write all report sections:

- all twelve palaces, their heavenly stems and earthly branches;
- Life Palace, Body Palace, and Origin Palace markers where available;
- principal, auxiliary, malefic, adjective, and relevant cycle stars;
- star brightness and Four Transformations;
- palace-level cycle state used by the natal interpretation;
- triads, oppositions, and flanking relationships;
- detected named patterns with their matched and missing conditions;
- engine, rule-set, locale, and chart version provenance.

The AI never calculates a placement, relationship, brightness value,
transformation, or pattern. It receives only frozen facts and retrieved
knowledge.

The adapter should preserve useful `iztro` fields rather than flattening them
into prose. Existing normalized-chart consumers remain compatible; the richer
report projection may be versioned independently where a contract expansion
would otherwise be breaking.

## Retrieval

Build deterministic retrieval keys from the frozen chart before using text
similarity. Exact metadata matches have priority over generic semantic
similarity.

Create compact context packs for:

1. Mệnh, Thân, Cục, and the chart's central temperament.
2. Each of the twelve palaces with its principal stars, supporting stars,
   brightness, transformations, and related-palace evidence.
3. Detected patterns and chart-wide transformation flows.
4. Thematic networks: career and wealth, relationships and family,
   environment and social support, wellbeing and inner resources.
5. Final synthesis of reinforcing factors, tensions, and dominant priorities.

Deduplicate overlapping passages by normalized content and source identity.
Cap each pack independently so one information-rich palace cannot consume the
entire context budget. Prefer specific star-palace-pattern material, then
star-palace material, then general palace or star doctrine.

Use the existing local knowledge infrastructure with metadata filters and
lexical or current semantic ranking. Do not introduce GraphRAG or another
remote retrieval service for this delivery.

## Report Contract

The generated report is approximately 2,200 to 3,200 Vietnamese words,
adaptive to available evidence. It contains:

1. **Tổng quan lá số**: the dominant configuration in clear everyday
   Vietnamese.
2. **Mệnh, Thân và động lực cốt lõi**: central temperament, internal drivers,
   and the relationship between Life and Body Palaces.
3. **Cấu trúc nổi bật**: major patterns, Four Transformation flows,
   reinforcing combinations, and meaningful tensions.
4. **Luận giải mười hai cung**: one substantive entry for every palace,
   grounded in that palace and its related palaces.
5. **Tổng hợp theo lĩnh vực**: career and wealth, relationships and family,
   social environment, wellbeing, and inner resources.
6. **Điểm mạnh, điểm vướng và điều kiện phát huy**: reconcile conflicting
   evidence instead of listing isolated traits.
7. **Định hướng thực tế**: concise priorities and practical observations
   derived from the preceding synthesis.

Each section stores internal evidence keys for traceability, but the prose
must read as a continuous expert interpretation rather than a database report.

## Writing Requirements

The writer must:

- write natural, idiomatic Vietnamese and explain specialist terms in context;
- lead with interpretation, using chart facts naturally as supporting reasons;
- connect each palace to relevant triads, oppositions, transformations, and
  patterns;
- describe how favorable and difficult factors modify one another;
- distinguish a dominant signal from a secondary or conditional signal;
- vary sentence structure and avoid repeating formulaic lead-ins;
- give concrete manifestations and useful priorities without inventing events.

The writer must not:

- narrate the calculation, retrieval, AI process, or evidence policy;
- include disclaimers, AI disclosure, self-reflection boilerplate, or
  statements such as "the report only uses the supplied data";
- repeat the same caution or conclusion across multiple sections;
- dump star and palace names without interpretation;
- write like an audit, database export, research summary, or generic
  personality report;
- create deterministic dates or events unsupported by the natal evidence.

Canonical Vietnamese section titles are enforced by the assembler rather than
trusted to the model.

## Generation Path

Normal processing is:

1. Load the immutable chart and comprehensive evidence snapshot.
2. Detect deterministic relationships and supported patterns.
3. Retrieve and deduplicate section-specific knowledge packs.
4. Make one provider call for the complete structured report.
5. Parse, assemble canonical titles, and run lightweight validation.
6. Persist a new immutable report version.

There is no normal-path critic or rewrite call. Existing queue retry behavior
handles provider failures. One bounded repair attempt is allowed only when the
provider response cannot be parsed or violates the required report schema.

The new prompt, knowledge manifest, evidence projection, and report schema use
new immutable version identifiers. Regeneration creates a superseding report
version; it never rewrites an existing customer report.

## Lightweight Validation

Validation protects obvious output failures without becoming a second
interpretation engine:

- valid structured report shape;
- Vietnamese locale and canonical section titles;
- all twelve palace entries present exactly once;
- referenced evidence keys exist in the frozen snapshot;
- no exact or near-duplicate paragraphs;
- no prohibited disclosure or disclaimer phrases;
- no unsupported palace, star, brightness, transformation, or named pattern.

Do not add broad rare-input matrices, speculative security tests, large
property-based suites, or extensive parser fuzzing for this quality release.

## Output-Quality Evaluation

Quality acceptance is based primarily on a small representative chart set
rather than technical test volume. Generate several contrasting charts that
exercise:

- different Life and Body Palace relationships;
- favorable and difficult principal-star configurations;
- transformed principal and supporting stars;
- at least a few recognized patterns;
- both dense and relatively sparse palaces.

Review the rendered Vietnamese reports for:

- factual agreement with chart evidence;
- complete and balanced twelve-palace coverage;
- depth of synthesis across related palaces;
- natural Vietnamese;
- low repetition;
- useful specificity;
- absence of mechanical, defensive, or report-like language.

The founder receives a small set of rendered samples for final output-quality
judgment. Technical verification is limited to focused evidence, retrieval,
schema, and generation tests, workspace typecheck or build as needed, and
`git diff --check`.

## Delivery Sequence

1. Expand the frozen report evidence and deterministic relationship layer.
2. Build and version the layered knowledge corpus.
3. Implement section-specific retrieval packs.
4. Introduce the comprehensive report schema and one-call writer.
5. Remove the normal critic and defensive prompt language from the new path.
6. Generate representative reports, correct the highest-impact quality
   problems, and stop once the founder-approved output bar is met.

## Success Criteria

- A new report interprets every palace and synthesizes the whole chart.
- Important conclusions are tied internally to real frozen evidence.
- Prose is natural Vietnamese and does not resemble a technical report.
- Runtime normally performs one AI generation call.
- Existing payment, authorization, immutable history, and queue durability are
  unchanged.
- Representative reports meet the founder's quality bar without delaying
  delivery for niche technical edge cases.
