# Zi Wei V4 Report Depth, Language, and Personalization — Design Spec

**Date:** 2026-09-13
**Status:** Founder-approved direction (FD-072 through FD-078). Implementation requires an implementation plan under `AGENTS.md`; the editorial ruleset was signed off by the founder on 2026-09-13.
**Owner:** An/Development (implementation). Harris/Product (ruleset approval, acceptance).
**Related:** FD-058 (V4), FD-064, FD-068, FD-071, `docs/superpowers/plans/2026-09-12-ziwei-comprehensive-report-v4.md`, `docs/superpowers/specs/2026-09-13-ziwei-knowledge-editorial-ruleset.md`.

## 1. Problem

The founder reviewed a live V4 comprehensive report and found it thin, not personalized, and overloaded with unnecessary Sino-Vietnamese vocabulary. A code audit on `origin/master` (2026-09-13) found six causes:

| # | Cause | Evidence |
|---|---|---|
| 1 | V4 launched on the V3 corpus by founder decision, with the corpus rewrite deferred | Kaneo #3 founder decision (2026-09-13 04:29, item 3): keep the V3 corpus for the V4 launch and move translation plus per-chunk provenance to a V4.1 fast-follow; `2886fe1` activated V4 for new Vietnamese orders; retrieval still pins `ziwei.comprehensive.knowledge.v3`. The older V4 plan text requiring the rewrite before activation was superseded by that decision |
| 2 | The `vi` knowledge corpus is mostly Chinese lecture transcript | `content/knowledge/vi/ziwei/comprehensive-report.v3.json`: 3,258 chunks; 2,918 (89.5%) contain Han characters; 278 Vietnamese chunks are rule stubs; median chunk 49 chars, p90 137; 372 chunks mention death/disaster terms (死/灾/凶/祸/刑/病/亡) |
| 3 | Retrieval text matching barely works | Vietnamese query text against Chinese content with PostgreSQL `to_tsvector('simple', …)`; palace packs capped at 2 passages / 1,800 chars |
| 4 | Output budget is too small | One `generateStructured` call with `maxOutputTokens: 9_000` for ~30 narrative blocks; V4 added decadal, annual, and structured actions without raising the budget. Estimated 150–200 Vietnamese words per palace |
| 5 | Prompt register invites Hán Việt | System prompt uses "chuyên gia luận giải Tử Vi Đẩu Số cao cấp", "cát hung", "chuyển hóa", "thân tâm", asks for "tiếng Việt chuyên nghiệp"; no vocabulary constraint. V4 prompt also dropped several V3 rules (see §2) |
| 6 | No depth or personalization gate | Narrative schema `min(1)`; V4 critic is model self-grading with no Sino-Vietnamese density, no chart-anchoring, no minimum-length check; no life context is collected |

## 2. FD-072 — Keep V4 live; restore missing rules

V4 stays active. No rollback to V3 (same corpus; V3 has the same budget with fewer sections).

Restore these V3 prompt rules that `VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT` no longer contains:

- no reflective questions or self-reflection exercises;
- no narration of calculation, retrieval, or algorithms;
- no repeating the same advice or warning across sections;
- no fabricated specific future events or unsupported dates;
- no invented identifiers or chart facts outside supplied facts;
- evidence keys copied verbatim from `allowedEvidenceKeys`;
- the locale-integrity block: natural Vietnamese, brightness only via `brightnessLabelsVi`, no Han ideographs, no English brightness descriptors.

Also fix the prompt identity line from `lasoviet.vn` to `lasoviet.net` (FD-057).

**FD-082 (2026-09-14) changes one existing rule:** remove the V3/V4 prohibition on professional advice ("KHÔNG đưa vào … cảnh báo pháp lý, y tế, tài chính hay khuyến cáo chuyên môn"). The writer should add natural, in-context referrals to a doctor, lawyer, or qualified professional when discussing health, legal matters, paperwork, large money decisions, or investment. Standalone legal-style disclaimer blocks ("Tuyên bố miễn trừ trách nhiệm: …") stay out.

These can ship before the larger changes below, as an immediate patch.

## 3. FD-073 — Section-by-section generation

Replace the single 9,000-token call with one generation call per section, assembled into the existing `ZiweiComprehensiveReportContentV2` contract (no customer-facing contract change).

### 3.1 Units and budgets

Length is counted in whitespace-separated Vietnamese syllables after `normalizeComprehensiveReportModelProse`.

| Section | Calls | Minimum syllables | Target | Suggested `maxOutputTokens` |
|---|---:|---:|---:|---:|
| `overview` | 1 | 600 | 700–900 | 2,500 |
| `coreAxis` | 1 | 600 | 700–900 | 2,500 |
| `keyConfigurations[]` | 1 (all items) | 250 per item | 300–400 | 3,500 |
| `palaceReadings[]` | 12 (one per palace) | 450 | 550–750 | 2,000 |
| `thematicSynthesis[]` | 4 (one per theme) | 550 | 650–850 | 2,500 |
| `strengthsAndTensions` | 1 | 500 | 600–800 | 2,000 |
| `currentDecadal` | 1 | 550 | 650–850 | 2,500 |
| `annualSnapshot` | 1 | 450 | 550–750 | 2,000 |
| `practicalDirection[]` | 1 (3–5 actions) | 120 per action across `recommendation` + `rationale` + `avoid` | 150–220 | 2,000 |

Numbers are initial values; put them in versioned config, not in business code.

### 3.2 Ordering and context passing

1. Generate `overview` and `coreAxis` first.
2. Pass a short, deterministic digest of already-generated sections (headline claims and advice already given) into later calls, so later sections do not repeat advice (repetition rule, §2).
3. Palaces and themes may run concurrently after step 1, bounded by provider rate limits.
4. `thematicSynthesis`, `strengthsAndTensions`, and `practicalDirection` receive the palace digests.

### 3.3 Retrieval per section

Each call receives only the knowledge relevant to that section (the palace pack for a palace call, etc.), raising the per-section passage cap from 2 to a configurable value (initial 6 passages / 4,000 chars) once the V4 corpus exists.

### 3.4 Failure and recovery (FD-043)

- Each section is retried independently; a failed section does not regenerate passing sections.
- Section outputs are persisted as they pass gates, so a worker crash resumes from the last passing section.
- If a section still fails after the bounded retry cap, the report enters the existing terminal-failure path with alerting; no partial or below-gate report is delivered.

### 3.5 Reuse for free previews (FD-068)

The per-section generator is the same unit used to pre-generate free-user sections. The free flow generates a small set of sections (count and COGS cap set in the implementation plan; section choice should prefer the customer's selected concern from §7) and stores them so a later purchase reuses them instead of regenerating.

### 3.6 Cost

Expect roughly 3–4× the current output tokens per comprehensive report. WP-10C (Kaneo #11) must record usage per section call, including retries and gate rewrites.

## 4. FD-074 — Knowledge Base V4 editorial rewrite

This is the V4.1 fast-follow corpus rewrite the founder deferred in Kaneo #3 (decision item 3), now approved to proceed. Follow `docs/superpowers/specs/2026-09-13-ziwei-knowledge-editorial-ruleset.md`, which extends the founder's editorial input already recorded in Kaneo #3 (2026-09-12 23:59 comment and 2026-09-13 04:29 decisions). The founder signed off the ruleset on 2026-09-13, so implementation may start.

- Build `content/knowledge/vi/ziwei/comprehensive-report.v4.json`.
- Every chunk is Vietnamese, rewritten (not translated word-for-word) per the ruleset; oral filler removed; chunks tagged with star, palace, topic.
- Minimum useful chunk length: roughly 2–4 sentences.
- Update retrieval to `ziwei.comprehensive.knowledge.v4` with Vietnamese full-text search that actually matches the corpus.
- Record provenance: source chunk IDs each rewritten chunk derives from.

## 5. FD-075 — Death content removed; misfortune warnings kept

This narrows FD-058's "quarantine extreme or fatalistic content" and the founder's 2026-09-12 editorial input (Kaneo #3), which deleted serious illness, accidents, imprisonment, and disasters outright. From 2026-09-13 only death content is deleted; the others become preparation-style warnings.

- **Remove** all death, lifespan, and "khắc chết" content from the corpus and block it in output (ruleset §4).
- **Keep** warnings about misfortune (money, health, accidents, travel, legal/paperwork, relationship breakdown, work) so the reader can prepare, written in the ruleset §5 format: area and period → chart basis → likely situation → 2–3 concrete preparation steps.
- Legal boundary (binding under FD-064): no certainty language, no specific dates for adverse events, no named diseases or reproductive predictions, no remedies/rituals, and no use of misfortune in paywall or unlock copy.

## 6. FD-076 — Prompt rewrite

Rewrite the V4 section prompts:

- Everyday Vietnamese. Keep only proper names: palaces, stars, transformations, brightness labels, pattern names, đại vận, lưu niên. Explain each proper name in plain words the first time it appears in a section.
- Every claim follows: real chart detail → two-sided observation (strength with its catch) → concrete everyday situation → one actionable suggestion.
- "Personal-sounding sentence" technique: anchor each observation in this chart's actual stars/palaces, phrased so the reader readily recognizes themself.
- Remove the "chuyên gia … cao cấp" / "tiếng Việt chuyên nghiệp" framing; describe the voice as a knowledgeable friend explaining clearly.
- Include the ruleset's good/bad example pair as a few-shot anchor.
- When reading context (§7) is present, pick life situations that fit it; never state the context back as if the chart revealed it.

## 7. FD-078 — Optional reading-context questions in the wizard

Add two optional, single-choice questions to the birth wizard as a list/radio picker, after birth details and before submit, each with a visible "Bỏ qua" option.

**Q1 — `Hiện tại bạn đang…`**

| Code | Label |
|---|---|
| `studying` | Đang đi học |
| `early_career` | Mới đi làm (dưới 3 năm) |
| `established_career` | Đi làm lâu năm |
| `business_owner` | Tự kinh doanh, làm chủ |
| `between_paths` | Đang nghỉ hoặc tìm hướng đi mới |
| `retired` | Đã nghỉ hưu |

**Q2 — `Điều bạn quan tâm nhất lúc này`**

| Code | Label |
|---|---|
| `career` | Công việc, sự nghiệp |
| `money` | Tiền bạc |
| `love` | Tình cảm, hôn nhân |
| `family` | Gia đình, con cái |
| `wellbeing` | Sức khỏe, tinh thần |
| `self_understanding` | Hiểu rõ bản thân |

Rules:

- Store as a separate versioned `ReadingContextV1` (enum codes only), **not** inside `BirthProfileV1`, so chart identity, dedupe, and immutable calculation hashes are unaffected (`BirthProfileV1Schema` is `.strict()`).
- Same retention and deletion lifecycle as the birth profile it belongs to (anonymous 24-hour boundary applies).
- Sent to the AI provider only as enum codes; never free text.
- Not sent to third-party tools; self-hosted analytics only (FD-053).
- Used to (a) choose life-situation examples, (b) order emphasis within thematic synthesis, (c) choose which free sections to pre-generate under FD-068. It never changes chart facts, evidence, or prices.
- Mobile: tappable list rows, no dropdown; keyboard and screen-reader accessible.
- Customer can change answers later from the chart page; a changed answer affects only reports generated afterward.

## 8. FD-077 — Automated quality gates

Add deterministic gates to the V4 validator, evaluated per section before assembly. A failing section triggers a bounded rewrite of that section only (§3.4).

This replaces the Kaneo #3 launch rule "validator plus one AI critic pass, no V4 rewrite pass". Stricter gates without a rewrite would turn gate failures into failed paid reports, which FD-043 does not allow. The AI critic pass stays.

| Gate | Rule | Source of truth |
|---|---|---|
| Minimum length | Section meets §3.1 minimum syllables | Versioned config |
| Discouraged Sino-Vietnamese terms | 0 occurrences of any term in the ruleset §3.3 list (whole-word, case-insensitive, NFC) | Versioned term list config, founder-editable |
| Proper-name density | Allowed proper names (ruleset §3.1) ≤ 8 per 100 syllables | Config |
| Death terms | 0 occurrences of ruleset §4 terms | Config |
| Misfortune framing | Any section containing misfortune terms must also contain at least 2 preparation suggestions; no certainty phrases ("chắc chắn sẽ", "không tránh khỏi"); no explicit day/month for adverse events | Config + critic check |
| Chart anchoring | Each palace section names at least 2 stars actually present in that palace (or states the palace has no major star when true); each other section names at least 2 chart facts from its evidence keys | `facts.natal` |
| Han and locale | Existing Han-ideograph and English brightness checks | Existing validator |
| Professional referral allowed | Remove `bác sĩ`, `chuyên gia y tế`, `tư vấn y tế`, `tư vấn pháp lý`, `lời khuyên pháp lý`, `lời khuyên y tế`, `tư vấn tài chính chuyên nghiệp`, `không thay thế tư vấn` from the prohibited-disclaimer pattern; keep blocking standalone disclaimer labels (`miễn trừ trách nhiệm`, `tuyên bố miễn trừ`, English `disclaimer`) with Unicode-aware boundaries. The critic must not penalize in-context referrals (FD-082) | Validator + critic config |
| Repetition | Existing near-duplicate check, extended across per-section outputs | Existing validator |

Extend `critiqueComprehensiveZiweiReportV4` scoring notes with two model-judged checks that feed a rewrite (not a hard fail on their own): "a sentence that would fit any chart" and "claim without an everyday situation".

## 9. Acceptance

1. The §2 rule restoration ships and is covered by prompt tests.
2. A generated comprehensive report for each fixture chart passes every §8 gate with no manual edits.
3. Fixture reports show 0 discouraged terms, 0 death terms, and every palace ≥ 450 syllables.
4. The same fixture chart with different §7 answers produces different life-situation examples while chart facts and evidence keys stay identical.
5. Killing the worker mid-generation resumes from the last passing section without regenerating passing sections or double-charging (FD-043).
6. WP-10C records usage for every section call, retry, and rewrite.
7. Founder reviews 3 generated fixture reports against the editorial ruleset and signs off (FD-056 pattern) before the new generator becomes the default for paid orders.

## 10. Sequencing

1. §2 restore missing V4 rules (small, immediate).
2. §8 deterministic gates (can run against current output to measure the baseline).
3. §3 section-by-section generation.
4. §6 prompt rewrite.
5. §7 wizard questions.
6. §4/§5 knowledge rewrite, after founder signs the ruleset.
7. §3.5 free pre-generation hook for FD-068 (coordinate with the progressive-reveal implementation plan).
