# Offline free-reading comparison inputs

`synthetic-comparisons.json` is a review artifact for the owner/Claude frontend workflow. It contains three synthetic engine cases (principal star, genuinely empty focus palace, uncertain birth time), each in Vietnamese and English. No customer data, paid narrative or provider output is included.

For each locale, compare `old.overview` and `old.focus` with `draft.content`. Display the `provisional` label prominently. The draft source is `rule_v2_draft`; `accepted` is false. Inline `basis` supplies the fixed facts adjacent to each claim. `teasers` are free-card excerpts; `yearHook` is null because temporal lineage is not ready. Do not present these samples as AI-generated or accepted production readings.

Review natural wording, whether each interpretation matches its card/facts, useful personal detail, and repetition. Report feedback by sample ID, locale and content path so it can change the compiler/card wording rather than patching individual samples.

The lexical checker reports structural/reference findings and editorial warnings. `quality.ok` means no implemented hard lexical failure, **not** semantic/editorial acceptance or a production publish decision. Remaining limitations: only the first canonical-ordered reviewed major-star card is used per domain, related stars only for proved empty palaces; multiple-star combinations, brightness/Hoa interpretations, unreviewed auxiliaries and temporal meanings are absent. Some source wording/advice still repeats. English length/voice and final portrait/paragraph targets need the corresponding review.

Reproduce from the repository root after producer builds:

```sh
pnpm --filter @lasoviet/contracts run build
pnpm --filter @lasoviet/engine-adapters run build
pnpm --filter @lasoviet/backend run build
node scripts/export-free-reading-review.mjs
```

Prompt construction is offline and deterministic. Hashes record preparation payloads only; no token-bound proof, measured provider usage, live evaluation budget, durable writer/cache integration or runtime activation is claimed. PR319 remains draft; LSV82 remains open.

## Owner R3 update (2026-10-08)

Style findings are advisory in both VI and EN: formula wording, self-reference,
untranslated/raw formatting, repeated prose, named-anchor wording and teaser
style remain visible for editing but do not reject the draft. Invalid contracts,
unresolved/invented facts, placement/brightness/Hoa mismatches, unsupported dates
or numeric scores, uncertainty disclosure and FD089 content fences remain hard.
The checker is lexical preparation, not proof of semantic truth or publication
acceptance. Draft cards and samples still have accepted:false and zero calls.
