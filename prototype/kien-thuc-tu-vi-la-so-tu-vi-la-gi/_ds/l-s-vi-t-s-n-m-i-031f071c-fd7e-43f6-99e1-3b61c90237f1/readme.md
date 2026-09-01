# Lá Số Việt Design System

Source: extracted from a single built page, `Trang chủ Lá Số Việt.dc.html` (the production homepage, iterated over 3 review rounds). No codebase, Figma, or brand guide was attached — full source material lives in `ds_src/` (kept for reference; some nested paths use decomposed Vietnamese Unicode filenames that this project's own tools can't address directly, hence the flattened copies at the project root).

## Product

Lá Số Việt (lasoviet.vn) — a Vietnamese-language platform for casting and interpreting Tử Vi (Vietnamese astrology) charts. Free calculator leading into a paid interpretation report (one-time purchase, no subscription).

## Art direction — "Tàng thư các dát vàng" (gilded archive)

An Eastern knowledge archive photographed in museum lighting: artifacts resting on dark lacquer, gold catching the light at the edges, cinnabar red appearing like a seal stamp. Three adjectives that gate every visual decision: **preserved · sourced · deliberately lit.**

Banned: crystal balls, incense smoke, tarot cards, Western zodiac glyphs, purple/neon cosmic backgrounds, front-facing human faces, unverified Han-Nôm script.

## Content fundamentals

- Copy never uses deterministic/fated language ("sẽ xảy ra", "chắc chắn") — always conditional: "có xu hướng", "có thể biểu hiện".
- No unverified Han-Nôm characters anywhere, including decorative motifs.
- Tone is measured and evidence-led rather than mystical; every claim in the product is meant to be traceable to a stated basis (see `EvidenceDrawer`, `Seal`).

## Visual foundations

- **Palette**: single dark theme (`color-scheme: dark`, deliberate — no light mode). Lacquer blacks (`--lacquer-900/800/700`) for surfaces, gold (`--gold-400..700`) reserved for headings/accents/CTAs, cinnabar (`--son`, aliased `--accent-seal`) used sparingly — only for the brand's seal mark and evidence-confidence cues. Pearl tones (`--pearl-50..600`) carry all reading text.
- **Type**: three voices — Source Serif 4 (display: headings, leads, quotes, step numerals), Be Vietnam Pro (UI: body, form, nav), JetBrains Mono (eyebrows, prices, labels, numerals).
- **Imagery**: real macro photography of lacquerware/paper/brass artifacts, single raking light source, shallow depth of field, warm-dark palette — never hand-drawn illustration, never generic stock.
- **Radii**: sm 4px (controls), md 8px (cards, images), lg 12px (panels), pill 999px (tags/badges).
- **Spacing**: 4/8/12/16/24/32/48/64/96/128px scale. Container max 1200px, reading column 720px.
- **Signature mark**: the `Seal` component — a small red double-bordered square ("dấu triện"), placed next to any evidence citation. Used sparingly, never decorative.

## Iconography

Two families: (1) a 24×24, 1.5px round-stroke glyph set (menu, chevrons, shield-lock, calendar, etc. — see `components/core/Icon.jsx`) for navigation/utility, and (2) the `Seal` mark for evidence/trust cues. No emoji, no icon font, no unicode-glyph icons — all icons are hand-built inline SVG (no icon library was available to copy from; there is no attached codebase). There is no separate brand logo file — the wordmark is set in the display serif wherever a mark is needed.

## Components

- `ArticleCard` — image + title + body teaser (cards/)
- `InsightCard` — annotated "margin note" style insight card (cards/)
- `Button` — primary / secondary / link variants (core/)
- `Icon` — 24×24 round-stroke glyph set (core/)
- `Seal` — the brand's signature evidence mark (core/)
- `EvidenceDrawer` — claim + confidence + supporting rows (disclosure/)
- `FaqItem` — expandable Q&A row (disclosure/)
- `TocRow` — priced table-of-contents row (lists/)
- `TrustItem` — numbered trust/benefit item with icon (lists/)

## Index

- `styles.css`, `tokens/` — colors, radii, spacing, typography (root-level, canonical import for consumers)
- `ds_src/Lá Số Việt hero update/` — full original export: `components/` (JSX + .d.ts + prompt.md + card HTML per group), `guidelines/` (Color/Type/Spacing/Brand specimen cards), `ui_kits/homepage/` (recreated homepage), `assets/images/` (7 sourced lacquerware/artifact photographs), `SKILL.md`, and `Trang chủ Lá Số Việt.dc.html` (the actual production page these were extracted from)
- `thumbnail.html` — project thumbnail
