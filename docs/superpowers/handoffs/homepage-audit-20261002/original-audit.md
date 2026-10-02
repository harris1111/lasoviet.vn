# Lá Số Việt homepage: UI, UX and frontend audit

2026-10-02 · Target: https://lasoviet.net/ and https://lasoviet.net/en · Scope: **audit and execution plan only**.

Baseline: the supplied `lasoviet-homepage-ui-audit-handoff-2026-10-02.zip`, described by its HANDOFF as the homepage promoted in PR #248. Repository paths and line numbers below refer to that supplied snapshot, not a fetched Git HEAD. The snapshot's Git commit is not independently verified. Live inspection is separately labelled and is not silently substituted for the snapshot. No repo, deployment, pricing, metadata or quote record was changed.

## Part A — Executive verdict

The page has a distinctive visual asset system and a useful interactive product demonstration. It does not yet meet the requested premium consumer standard on phones. The principal weakness is composition: the painting, copy, controls and spacing compete for attention. Long explanatory introductions appear before practical choices; the largest mobile block repeats imagery and then adds five large method cards; proof and pricing explanation repeat benefits already demonstrated earlier.

This is an editorial assessment against the supplied Apple/Aesop/Airbnb/Stripe quality principles, **not a measured competitive ranking or an Awwwards score**. I would keep design variance at 7 and visual density at 3, lower mobile motion intensity from 6 to 3, and retain desktop 6 only where motion explains the landscape-to-chart handoff. Premium does not require additional scroll distance.

The five highest-impact changes are:

1. Establish one owner of section spacing and one feathered text-legibility treatment; remove the stacked vertical padding and verify contrast over real painted frames.
2. Put a single free-chart action in the first mobile viewport. Open the same mounted birth form on demand, with its current order, validation, draft and wizard handoff intact.
3. Replace four tall Needs image cards with four compact choices and one selected illustration; put secondary method links behind a compact disclosure.
4. Show three concise comparison benefits first; disclose the complete one-positive/five-negative comparison. Remove its inset texture panel and nested card surfaces.
5. Edit marketing for length and hierarchy, merge overlapping chapters, and use a calm reader gallery. Preserve persuasive claims and every real quote.

Keep the logo, approved landscape/painted assets, gold/lacquer family, Source Serif 4 and Be Vietnam Pro, sample-reading route, interactive 4×4 chart, all existing anchor IDs, concern continuity and form error handling. No new image is needed for this plan. Do not replace Trời Nam with a generic card template.

## Part B — Findings and rule coverage

Evidence shorthand: `TN` = `apps/web/src/features/troi-nam/`; `HV` = `apps/web/src/features/homepage-v3/`; `CSS/TN` = `apps/web/src/styles/troi-nam.css`; `CSS/HV` = `apps/web/src/styles/homepage-v3.css`; `MSG` = `apps/web/messages/{vi,en}/homepage-v3.json`. Screenshot paths are relative to the input pack. **L1** combines the supplied composited screenshot with live computed foreground styles; **L2–L6** identify live geometry, theme, targets, locale and interaction/fallback observations. They are not founder screenshot filenames. Short bare source names below resolve to the exact prefixed filenames in the pack; Part G spells those out.

Severity: P0 blocks accessibility sign-off or the conversion path; P1 is high impact; P2 medium; P3 polish. PASS and TEST rows record satisfied checks and unmeasured gates; they are not invented violations.

| ID | Severity | Viewports | Section | Finding | Evidence: screenshot + code/live | Rule | Precise fix |
|---|---|---|---|---|---|---|---|
| F01 | P0 | 390 painted; desktop painted | Explore | Muted body copy crosses bright Milky Way with no reliable local background. Pixel samples are far below 4.5:1 in several local patches. | `screenshots/mobile-390/mobile-04-explore.png`; `screenshots/founder/02-explore.png`; CSS/TN:630–635, 715–726; L1 | §7.1 contrast; §6 density/legibility | Use pearl-200 body over a 0.86 lacquer scrim covering the complete copy rectangle with a 32 px feather outside it; measure every pose, crop and responsive state. |
| F02 | P1 | 390 | Hero | First viewport has sample link but no primary chart action; form submit is below the fold. Top padding is unrelated to content needs. | `mobile-01-hero.png`; TN/troi-nam-hero.tsx:125–146; CSS/TN:130–141 | §6 hero; §7.8 progressive form | 32 px hero top padding, two-line H1, ≤20-unit subline, visible 52 px free-chart button; preserve the form as one mounted subtree and open it on demand. |
| F03 | P1 | 390, narrow EN | Hero | Canh giờ label overflows despite min-width:0 on the containing column. The button itself is nowrap. | `mobile-01-hero.png`; CSS/HV:109–112; HV/homepage-v3-birth-form.tsx:260–265 | §6 control overflow; §7.5 | Shorter two locale labels in D; equal minmax-equivalent flexible tracks, min-width:0, white-space:normal, 48 px minimum height and 8 px gap. |
| F04 | P1 | 390/1440 pack; 1363 live | Whole page | Height is excessive relative to the start-chart job. 19,398 px on phone is 22.98 screens. | `full-page/mobile-390-full.png`; HANDOFF §3; page.tsx:42–81; L2 | §6 density; §7.5 layout | Nine chapters, default mobile hard ceiling 10,128 px; expanded form ≤10,950 px. Do not shrink fonts to meet the budget. |
| F05 | P1 | All | Section boundaries | Double padding remains on Explore, Testimonials, USP, Value, FAQ and About. | `founder/07-empty-band-after-testimonials.png`, `08-usp-value-gap.png`, `09-faq-gap.png`, `10-about.png`; CSS/TN:17,24–27; CSS/HV:72; L2 | §6 rhythm; §7.5 | Outer sections own 48/64/80 px per side; all nested .hv3-container padding-block:0. Story/ticker grouped, USP/compare grouped. |
| F06 | P1 | 390 | Needs | Largest phone sink: 4,972 px includes both four repeated choice illustrations AND five full-width discipline cards. Focusing only on the four choice cards would miss much of the cause. | `mobile-05-needs.png`, full-page; CSS/TN:1012–1076,1097–1146; HV/homepage-v3-needs.tsx:47–150 | §6 long-list/card hierarchy | Four 64 px image-thumbnail rows; one selected 160 px image; disciplines inside disclosure with 80 px thumbnails. Default ≤1,050 px; expanded ≤1,800 px. |
| F07 | P1 | 390/desktop | Compare | Texture is confined to inset tn-compare, with another head surface and three card surfaces. | `founder/05-compare-head.png`, `mobile-06-compare.png`; TN/troi-nam-compare.tsx:16–32; CSS/TN:1163–1193 | §6 cards/surface consistency | Remove decorative texture from this block; transparent header/benefit rows on one lacquer canvas. |
| F08 | P1 | Desktop/mobile | Compare | Complete comparison opens before the visitor asks; desktop is six long text rows across four options plus a criterion column. Phone repeats the fix per competitor. | `founder/04-compare-table.png`; HV/homepage-v3-compare.tsx:40–100; TN/troi-nam-compare.tsx:31 | §6 comparison data; §7.5 | Default closed native details; three prominent benefits above it. Full mobile per-competitor view retains one strength + five limits and LSV fixes; desktop retains semantic matrix, shorter cells and 16 px type. |
| F09 | P1 | All | Marketing | Default main contains 2,276–2,291 units; headline and introduction often repeat the same thought. | HANDOFF §3; MSG story/needs/usp/value/about; live snapshot | §6 density/long lists | Apply complete D cut sheet. Keep the claims and product mechanics, cut the prose around them. Default accessible main ≤1,100 units; target 900–1,100 as a ceiling band, not filler to be added. |
| F10 | P1 | Desktop | Testimonials/USP/FAQ | Floating right paragraphs produce split text-only headers and compete with headlines. | `founder/06-testimonials.png`, `08-usp-value-gap.png`, `09-faq-gap.png`; CSS/TN:1563–1568,1908–1910 | §6 split-header ban | Stack testimonials heading/lead; merge USP into proof ledger with no second full header; FAQ heading above its list. |
| F11 | P1 | All | Content order | Story/ticker repeat questions, Explore is followed by more explanation, USP then Value restate “read deeper”. | page.tsx:42–81; MSG story/needs/usp/value | §6 layout diversity; §7 story guidance | Preserve world sequence; merge ticker into Story and USP into Compare. Distinct layouts specified in C. |
| F12 | P2 | All | CTA copy | Several labels share the same start-chart destination, while “Chạm thử” has a different demo intent. | HV/homepage-v3-go-wizard.tsx:40–44; MSG explore.cta/needs.*.cta/compare.cta/testimonials.start/about.cta; TN hero sample | §6 one label per intent | Free start = “Lập lá số miễn phí”; EN = “Start my free chart”. Form submit remains “Tiếp tục lập lá số”; sample/12-cung/Kinh Dịch remain separate intents. |
| F13 | P2 | 390/desktop | Eyebrows | 22–24 uppercase micro labels are reported; testimonial labels alone multiply across cards. | HANDOFF §3; HV/homepage-v3-testimonials-section.tsx:214,254,332; HV/homepage-v3-explore.tsx:50; CSS/HV type selectors | §6 eyebrow restraint | Remove redundant section eyebrows, sentence-case gallery labels, zero uppercase whole Vietnamese sentences; ≤4 marketing microlabels in default accessible state. Quotes are not re-cased. |
| F14 | P2 | All | Quotes | Card quote bodies can exceed three painted lines; all 15 mobile slides inflate the default main count even when horizontally offscreen. | `mobile-07-testimonials.png`; HV/homepage-v3-testimonials-section.tsx:215,286; CSS/HV:411–430 | §6 quotes; §7.6 | Three-line visual clamp with intact full text in dialog; two leading mobile cards, three desktop cards, all 15 behind expander. No rewritten excerpt is included. |
| F15 | P2 | All | Motion | Two marquee tracks, auto-moving testimonials, falling leaves and floating lanterns add ambient motion without advancing the chart-start narrative. | HV/homepage-v3-static-sections.tsx:72–85; HV/homepage-v3-testimonials-section.tsx:108–144; CSS/TN:1644–1696,1839–1882 | §6 max one marquee/justification; §7.7 | Static topic ribbon; manual gallery; remove leaf/closing-lantern loops. Keep landscape-to-chart scroll action, palette changes and 120 ms control feedback. |
| F16 | P2 | All | Theme | Handoff claims a visible toggle; live toggle is hidden. Nonetheless persisted light variables can invert shared form/chart independently of tn ink. | L3; CSS/HV:35–56,544–545; page root .tn lacks data-light-ready | §6 theme lock; §7.4 | Recommend a scoped lacquer homepage exception for this release, with founder approval because FD-088 approved both themes. Pin inherited .hv3 variables only within .tn; do not change saved theme. Full paper-homepage art direction is a separate approved-theme follow-up if exception declined. |
| F17 | P2 | All | Architecture | Old hv3 component skins plus tn overrides have two token authorities and index-dependent image selectors. | CSS/TN 1,935 lines, 214 qualified-rule blocks containing .hv3, 7 !important, six min-width media queries; TN/troi-nam-needs.tsx:89–105; TN/troi-nam-explore.tsx:24–28 | §6 color/radius consistency; §7.5–6 | Retain shared logic, use semantic identity for assets; one component token map; fold exact duplicates only after visual regression checks. No blanket rewrite. |
| F18 | P2 | All | Radii | 8/11/16/18/20 px and pill/circle values are inherited without a common role system. | CSS/HV:109–110,382,449; CSS/TN:1372,1487,1624 | §6 radius lock | Control 12, panel/dialog 16, thumbnail 8, pill/circle 999; each shape gets a semantic role, not one radius for every object. |
| F19 | P2 | All | Accent use | Shared action cinnabar and warm gold coexist with TN gold CTAs; method accent colors are already intentional brand tokens. | CSS/HV:6–8,25; CSS/TN:1087–1089,1220–1223 | §6 color lock | Gold for chart-start/selected/links, cinnabar for relationship emphasis only, keep d1–d4 on method identity. Token overrides must include the form/segmented state. |
| F20 | P2 | All | Filler copy | “ngổn ngang”, “soi tỏ”, “bóng hình”, “chốn trở về”, “căn duyên” recur as extended metaphors before practical meaning. | MSG needs.lead, usp.title/lead, value.title/lead, about.title/body | §6 copy self-audit | D substitutes concrete benefit-first headings and brief practical bodies without reducing claim strength. Keep only one literary motif in the painted-world opening. |
| F21 | P2 | All | Separators | Marketing has em dash separators; real quotations also contain en dashes. These must not be bulk-replaced together. | MSG story.body/explore.lead/usp.n3.body/about.body; HV/homepage-v3-testimonials.ts records | §6 em/en-dash ban vs §5 quote integrity | Remove marketing separators through D; original quotations are an explicit higher-priority exception unless founder approves punctuation edits separately. |
| F22 | P1 | Live 1363; mobile pack | Targets | Live main has sample link 197×23, checkbox input 20×20, testimonial start 187×22; header has 18–22 px high links. The checkbox label can enlarge its hit area, so the input size alone is not a proven hit-target failure. | L4; `mobile-01-hero.png`; CSS/HV:106,438; CSS/TN:333–344 | §7.2 | Minimum 44 px rendered link/label hit areas, checkbox whole label ≥44 px and 8 px control spacing. Check click geometry, not only input bounding boxes. |
| F23 | P2 | All | Typography | Comparison axis/fix overrides retain 13/14 px explanatory text; body palettes differ and long hero supporting copy uses display face. | CSS/HV:355–358; CSS/TN:1242–1255; CSS/TN:323–330 | §7.6 | 16 px body/fix/axis minimum; 1.5–1.6 line-height; body max 64ch. 14 px is allowed only for attribution metadata. UI/body Be Vietnam Pro, Source Serif 4 display. |
| F24 | P2 | All | Navigation | Start links prevent every click and do not preserve modified-click behavior; focus uses a hardcoded 450 ms after smooth scroll. | HV/homepage-v3-go-wizard.tsx:9–12,38–41 | §7.9 | Respect meta/ctrl/shift/alt and non-primary clicks; open mobile form before focusing day. Verify keyboard/focus on actual devices; fixed delay remains a compatibility limitation. |
| F25 | P2 | EN | Locale | English's Tiếng Việt link opens `/vi`, leaving that alias in the URL while canonical is `/`. It renders correctly, so this is consistency, not an outage. | L5; site-header.tsx localeSwitcherHref branch | §7.9; §5 routes | Link EN homepage back to `/`; other EN routes strip `/en` without adding `/vi`. Leave metadata generator intact. |
| F26 | P2 | All | Images | Dusk plate is eagerly loaded though hidden on phones; CSS backgrounds do not receive responsive srcSet/loading behavior. Old needs/USP img elements may exist while their replacements are CSS art. | TN/troi-nam-hero.tsx:90–100; TN/troi-nam-needs.tsx style map; CSS/TN:1078–1080,1492–1495; HV/homepage-v3-needs.tsx sizes hints | §7.3 | Low-priority lazy dusk; 80 px sizes for compact discipline thumbs. Inspect real network requests before claiming hidden old images were eliminated; do not assume display:none means zero bytes. |
| F27 | P2 | All | Lifecycle performance | Visible stage continuously schedules and renders even when scroll pose is clean; animation time is derived from progress, not clock. | TN/world/troi-nam-world-scene.ts:renderFrame,loop; applyPose(progress*60); L6 unavailable GPU | §7.3,7.7 | Dirty-only draw guard after profiling; keep visible lightweight rAF initially. Later event-driven scheduling only if it preserves smooth low-tier behavior. |
| F28 | TEST P1 | Mid-range Android | Runtime | DPR/particle caps are implemented, but field LCP/CLS/INP and real GPU frame-time/disposal are unmeasured. | TN/troi-nam-world-stage.tsx:48–49,62–65,125–154; TN/world/troi-nam-world-stars.ts:52; TN/world/troi-nam-world-particles.ts:15,31; TN/world/troi-nam-world-runtime.ts:38–44 | §7.3 | Needs device test: LCP <2.5 s, CLS <0.1, INP <200 ms, real low-GPU fallback and sustained-scroll profile. No pass based on cloud Chromium. |
| F29 | P1 gate | Painted phone/desktop | Explore interaction | Ready-state opacity can hide the HTML chart while its 12 buttons remain present; focus restores it, but touch discoverability needs inspection during the handoff. | CSS/TN:705–711; `mobile-04-explore.png` shows painted ring; HV/homepage-v3-explore.tsx:66–90 | §7.1–2,7.7 | No invisible actionable surface during final interactive state. Test tap first without keyboard focus; preserve decorative transition and reveal visible labels no later than first actionable chart frame. |
| F30 | TEST P2 | All | Reduced motion | The supplied TN .tn * rule misses pseudo-element loops and pending reveals. global.css imports troi-nam-reduced-motion-guards.css, but that file is absent from the pack, so completeness of the final live cascade cannot be inferred. | CSS/TN:446–449,1644–1696,1839–1882; TN/troi-nam-needs.tsx:29,61; TN/troi-nam-faq.tsx:18 | §7.7; §5.7 | Verify the imported guard file first; retain explicit scoped pseudo-element/pending-content guards in PR1 if missing. Keep live world cancellation. Test changing OS preference mid-session. |
| F31 | PASS / device gate | All | Form errors | Date/time errors are associated, failures focus a relevant control, edits reconcile errors. Don't undo the previous remediation. | HV/homepage-v3-birth-form.tsx:103–127,129–162,183–257; remediation doc F3 | §7.8 | Keep code unchanged; regression the paths in PR2. Persistent visible day/month/year labels remain a future improvement if fields can be mistaken after filling. |
| F32 | PASS / device gate | All | Keyboard/dialog | Gallery has read buttons, dialog role/aria-modal, Escape and Tab handling; FAQ uses expanded/controls and hidden answers. One quote card itself is pointer-clickable, but its labelled read button supplies keyboard access. | HV/homepage-v3-testimonials-section.tsx:155–190,239,329–338; HV/homepage-v3-faq.tsx:29–44; L6 dialog/FAQ | §7.1–2 | Retain labeled controls, verify focus return/VO/TalkBack and inert background on devices; no new focus-trap library is necessary for one control. |
| F33 | PASS | All | Alt/decorative markup | Hero has landscape alt; decorative texture/portraits use empty alt and canvas backdrop is aria-hidden. | TN/troi-nam-hero.tsx:83,97–98,114–115; TN/troi-nam-world-stage.tsx:195–198; HV/homepage-v3-testimonials-section.tsx:227 | §7.1 | Keep decorative alt empty, don't add SEO words to decorations. Informative charts retain named groups and actual text. |
| F34 | PASS / responsive gate | 390/1440 pack;1363 live | Layout | No page-level horizontal overflow was reported or observed. TN CSS is base + six min-width queries; legacy HV includes max-width rules. Control clipping still exists. | HANDOFF §3; L1 overflow:false; CSS/TN media inventory; CSS/HV:426–430 | §7.5 | Preserve no overflow, test 360/390/430/768/1024/1440; distinguish clipped text from scrollWidth. Base mobile corrections first. |
| F35 | PASS with correction | All | Runtime ownership | Dynamic import, abort barrier, reduced-motion/saveData gates, first-frame reveal, visibility/stage pause and resource disposal already exist. DPR is 1.5 high/1 low, stricter than requested cap 2. | TN/troi-nam-world-stage.tsx:35–49,98–122,145–190; TN/world/troi-nam-world-scene.ts:dispose/resize; TN/world/troi-nam-world-runtime.ts:4–23 | §7.3,7.7 | Preserve these protections. Do not report them as missing. Scheduler only reacts to >50 ms intervals sustained for 2 s; this is coarse, not a complete frame profiler. |
| F36 | PASS / measured exceptions | All | Style fit | Landscape/gold/lacquer remain coherent; method d1–d4 accents are approved exceptions. Additional inset comparison surfaces and old v3 icon/photo slots undermine the hierarchy, not the basic brand idea. | docs/13,22,24; `founder/01-story.png`, `05-compare-head.png`; CSS/HV:25 | §7.4; §6 color lock | Keep approved art and accents. Resolve F07/F19 instead of removing the Vietnamese painted-world premise. |
| F37 | PASS / correction | All | Rules for lists/rows | FAQ uses one top border per row and a final bottom border, so the “double border every row” claim would be wrong. Comparison uses multiple surface/card layers. | CSS/HV:486; CSS/TN:1723–1729,1226–1235 | §6 long lists/row borders | Keep single-rule FAQ rhythm; remove nested comparison/card borders in PR4. |
| F38 | TEST P2 | Keyboard phone/desktop | Focus/state feedback | Focus CSS and aria-pressed exist, but contrast of outlines on painted light pixels, disabled visibility and mobile loading feedback are not fully measured. | CSS/HV:61–64,112; CSS/TN:968–970,1343–1345; HV/homepage-v3-birth-form.tsx | §7.1–2,7.8 | Needs device test: focus ring ≥3:1 against surrounding composite, disabled labels understandable, submit state prevents accidental duplicate actions if navigation is slow. Do not silently alter submit behavior in visual PRs. |

### Live context and measurement limits

**Evidence and measurement limits.** The supplied mobile benchmark is 390×844, page height 19,398 px (22.98 screens), `<main>` 2,276 whitespace-delimited units. Vietnamese spacing counts syllable-like units rather than linguistic words; the same counting convention is used throughout this report. The live cloud browser was 1363×936, not 1440×900: page height 15,938 px (17.03 screens), main 2,291 units; English was 15,958 px / 1,819 units. These live counts were collected before expanding FAQ/reader content. GPU, mobile hardware and field Web Vitals were not available.

Live confirmed: Quan Lộc selection updates the correct selected state, heading, Tam hợp and opposite relationship; FAQ expands the free-reading answer; the reader dialog displays the intact full quote and closes with Escape; `/en` renders English. The theme toggle is actually `display:none`, correcting handoff root cause #8. Its CSS exposure requires `data-light-ready`, which this homepage does not declare. An existing light preference is still a source-level risk because `html[data-theme="light"] .hv3` remains applicable.

### Pixel-sample method and reproducible contrast limits

L1 uses the **actual supplied composite** `screenshots/mobile-390/mobile-04-explore.png`, 780×1688 physical pixels (@2×). With foreground `(167,158,139)` / `#A79E8B`, matching live computed Explore lead color, average 5×5 pixel patches near the text yield:

| Patch centre (physical x,y) | Composite RGB | Nominal foreground/background ratio |
|---|---|---|
| (150,654) | (177,114,60) | 1.48:1 |
| (400,757) | (90,43,19) | 4.42:1 |
| (480,865) | (168,113,64) | 1.55:1 |
| (120,918) | (195,135,91) | 1.14:1 |

Ratios use WCAG sRGB linearisation and `(Llighter+.05)/(Ldarker+.05)`. These patches are near glyphs/interline spaces, with the last immediately below the paragraph; they establish local background risk, **not the exact unobscured pixel beneath every glyph**. They include the artwork's existing composite treatment. They cannot certify the entire animated paragraph or prove every sampled patch is directly behind a glyph. For release: on a test-only scene capture, obtain an identical frame with text removed but scrim retained; map the glyph-area mask to that background and check the worst pixel. Repeat dawn, dusk, night, all scroll poses and responsive crops. If exact synchronized background capture is unavailable: **needs device test**, never stamp AA from palette tokens.

The proposed 0.86 lacquer overlay over a worst-case white RGB pixel produces approximately #312F2C in its fully covered interior. Pearl-200 has ample nominal margin there. Feather must be outside text bounds. Actual composite minimum still governs acceptance.

### Live measurements (L2–L6)

| Block | Live 1363×936 height | Main-section units | Outer top/bottom | Inner .hv3-container top/bottom |
|---|---:|---:|---|---|
| hero | 1,071 | 129 | 0/0 | none |
| story | 1,072 | 128 | 127.41/127.41 | 0/0 |
| ticker | 447 | 1* | 127.41/127.41 | none |
| explore | 1,449 | 214 | 127.41/127.41 | 120/120 |
| needs | 2,795 | 383 | 127.41/127.41 | 0/0 |
| compare | 1,571 | 495 | 127.41/127.41 | 0/0 |
| testimonials | 1,409 | 252 | 127.41/127.41 | 120/120 |
| usp | 1,487 | 224 | 127.41/127.41 | 120/120 |
| value | 1,312 | 197 | 127.41/127.41 | 120/120 |
| faq | 985 | 143 | 127.41/127.41 | 120/120 |
| about | 1,705 | 126 | 127.41/127.41 | 80/80 |

*Empty ticker text split produces one empty unit with a naive regex; it is not actual one-word content. Full page height includes header/footer. Absolute images/canvas do not explain the section gaps: the measurable outer/inner padding stack does.

L3: header theme button label “Chuyển sang giao diện sáng”, computed display:none. L4: 3 small main element boxes reproduced; also brand/nav/locale/sign-in header boxes under 44 px. Effective checkbox hit area and target spacing remain to be measured. L5: `/en` → `/vi`, Vietnamese H1 renders and canonical remains `https://lasoviet.net/`. L6: cloud console explicitly reports WebGL context creation unavailable (GL_VENDOR/GL_RENDERER Disabled); `data-troi-nam-world-ready` stays absent and static content remains operable. This is an environment limit, not evidence that the public site lacks WebGL.

### Checklist disposition

| Checklist | Status | Findings |
|---|---|---|
| Hero first fold and copy elements | FAIL | F02–F03 |
| Density and long-list components | FAIL | F04,F06,F08,F09 |
| Eyebrow restraint | FAIL | F13 |
| No text-only split headers | FAIL | F10 |
| Layout families/no repeated section family | FAIL currently; specified in C | F11 |
| Cards communicate hierarchy | FAIL | F06–F08 |
| Radius system | FAIL | F18 |
| Accent system, including method exception | PARTIAL | F19,F36 |
| Theme consistency | PARTIAL; toggle premise corrected | F16 |
| One CTA label per intent | FAIL | F12 |
| Desktop CTA nowrap / phone control containment | PARTIAL / FAIL | F03,F38 |
| Quote ≤3 painted lines / intact full quote | PARTIAL | F14,F32 |
| Zero marketing dash separators | FAIL; real quotes exempt unless approved | F21 |
| Max one marquee / justified motion | FAIL | F15,F30 |
| Comparison pattern | FAIL | F08 |
| One rule per row / long lists | FAQ PASS, compare FAIL | F06,F08,F37 |
| Copy avoids filler | FAIL | F20 |
| UX1 Accessibility | PARTIAL FAIL; pixel/focus device gate | F01,F29,F32,F33,F38 |
| UX2 Touch and interaction | PARTIAL FAIL; effective hit area gate | F03,F22,F32,F38 |
| UX3 Performance | Existing lifecycle PASS; metrics UNVERIFIED | F26–F28,F35 |
| UX4 Style fit | PASS concept, FAIL surface execution | F07,F19,F36 |
| UX5 Layout and responsive | PARTIAL FAIL; six widths need device/browser suite | F02–F06,F34 |
| UX6 Typography/color | PARTIAL FAIL | F01,F18,F19,F23 |
| UX7 Animation | PARTIAL FAIL | F15,F27,F29,F30,F35 |
| UX8 Forms/feedback | Validation PASS; density/labels require work | F02,F03,F31,F38 |
| UX9 Navigation | PARTIAL | F24,F25,F34 |

## Part C — Target information architecture

Keep the painted world from hero through Explore; shorten the scroll range by content and spacing changes, then recheck chapter timing against the measured chart target. The order below keeps that art-direction relationship intact. Each row is a distinct **section layout family**, even where a repeated control or typography token appears within it.

| Order | Chapter / old blocks | Single job | Unique layout family | Content budget (headline / lead / items) | One action | Phone section ceiling |
|---|---|---|---|---|---|---:|
| 1 | Hero | Start the birth-input journey | Cinematic title tableau with responsive form disclosure | H1 8 units max, two lines; subline 20 max; four copy elements excluding form fields | Lập lá số miễn phí; secondary proof link remains a different intent | 800 px collapsed |
| 2 | Story + ticker | Recognise the visitor's question | Editorial question ribbon, four short questions in 2×2, static horizontal topic links | H2 8; body 25; four questions ≤8 each; eight existing ribbon links ≤12 each | Topic links, no second chart button | 600 px |
| 3 | Explore | Demonstrate what the chart does | Square interactive chart plus changing annotation | H2 8; lead 25; one selected palace description ≤35; twelve native controls; two relation lines | Lập lá số miễn phí; sample link secondary | 1,200 px |
| 4 | Needs + secondary methods | Pick the reading concern | Compact choice rail and one selected detail; optional method disclosure | H2 8; lead 25; four choice labels ≤6; selected path 25; max three chips; five method rows in disclosure | Lập lá số miễn phí for three chart needs; existing Kinh Dịch action for decision | 1,050 px closed |
| 5 | Compare + USP | Establish why LSV wins | Featured benefit ledger with four short supporting annotations and evidence disclosure | H2 8; lead 25; three benefits; four annotations ≤25; matrix six criteria × four options behind disclosure | Lập lá số miễn phí inside disclosed comparison; heading summary itself has no extra start button | 1,100 px closed |
| 6 | Testimonials | Show reader recognition | Manual snap gallery and full-quote dialog | Existing H2 ≤10 accepted as reader-proof exception; lead ≤15; two phone cards / three desktop; ≤3 painted quote lines; 15 behind expander | Read full; chart-start link is the one optional chapter CTA | 650 px |
| 7 | Value | Explain free → save → paid depth | Three-stage timeline, no stacked elevated cards | H2 8; lead 25; three steps with title ≤6 and body ≤20 | No extra chart CTA; next chapter resolves objections | 750 px |
| 8 | FAQ | Remove remaining hesitation | Single-rule accordion | H2 8; five questions ≤10 (longer exception only if meaning needs it); one default answer; answers ≤30 except privacy ≤35 | Existing FAQ hub link | 800 px |
| 9 | About + final CTA | Close on the brand promise | Compact painted colophon ending in one central action | H2 8; body ≤30; final line ≤8; logo once; landscape strip ≤180 px on phone | Lập lá số miễn phí; About is secondary | 950 px |

Sum of section ceilings: 7,900 px. Reserve 72 px header + ≤1,100 px footer: **9,072 px, 10.75 screens at 390×844**. Release ceiling 10,128 px (12 screens); target about 10–11 screens. This includes legitimate content, not artificial spacer sections. A longer keyboard-open phone viewport is not the benchmark. At 200% text zoom content may exceed the nominal budget; reflow and legibility win.

Default main copy target: **900–1,100 whitespace-delimited units maximum**, measured after hydration/fonts, with default state restored and gallery at the beginning. Do not add prose if it lands below 900. Two/three default gallery records prevent all 15 from inflating the initial DOM budget. Fully expanded quotes, all method descriptions, full comparison and alternate palace descriptions are an intentional information library outside this default budget. Separately count the distinct marketing strings: reduction must come from D and structure, not just line-clamping. Do not sell “900 words” based on only text currently in the viewport.

| Existing ID | Sensible retained target |
|---|---|
| `#lap-la-so` | Hero section; chapter CTAs open and focus its birth form |
| `#la-so-mau` | Interactive Explore; sample-report route remains `/bao-cao-mau/tu-vi` |
| `#dich-vu` | Outer Needs section |
| `#nhu-cau` | Needs choice/detail component |
| `#so-sanh` | Combined comparison/proof chapter |
| `#gia-tri` | Free/save/Lá timeline |
| `#faq` | Outer FAQ section |
| `#cau-hoi` | FAQ inner wrapper on same chapter |

Also retain `#bo-mon` on method disclosure summary and `#cta-cuoi` on final action. `/` and `/en` stay; source metadata remains in the route registry/public-content generator. No route is renamed.

## Part D — Copy cut sheet

Vietnamese first, English second. Exact current values below are read from the supplied JSON, including non-breaking spaces. Counts use whitespace-separated units; ICU `{name}` is counted as one literal unit, not its eventual interpolated length. `[new]` means a new key and has no before count. No testimonial quote, excerpt, name, city or attribution is rewritten. The compact gallery uses existing records; visual clipping is not a quote edit.

The removed hardcoded comparison LEAD is listed separately because editing the JSON alone would otherwise fail to change the visible text. Existing link destinations remain unchanged except canonical locale return. “Tiếp tục lập lá số” stays as a distinct wizard-next-step intent. Decision/Kinh Dịch CTAs and method-learn-more links retain their own wording. Changes to omitted headings remain listed because they become visible if the component is later used outside the combined proof chapter.

### Vietnamese

| Key / source | Current | Proposed | Units before → after |
|---|---|---|---|
| `troi-nam.hero.startCta` | [new] | Lập lá số miễn phí | 0 → 5 |
| `homepage-v3.hero.modeExact` | Biết rõ giờ sinh | Biết rõ giờ | 4 → 3 |
| `homepage-v3.hero.modeBranch` | Nhớ khoảng giờ (Canh giờ) | Nhớ canh giờ | 5 → 3 |
| `homepage-v3.story.title` | Có những câu hỏi cứ khiến ta trăn trở mãi không thôi... | Bạn đang tìm câu trả lời nào? | 12 → 7 |
| `homepage-v3.story.body` | Chúng ghé lại vào những đêm khuya mất ngủ, chen vào dòng người tan tầm vội vã, hay dấy lên ngay giữa một buổi họp tưởng chừng bình yên. Giữa những ngổn ngang đó, điều bạn cần không phải một lời phán xét hay hứa hẹn viển vông—mà là một góc nhìn đủ sâu sắc để thấy rõ căn nguyên và tự tin bước tiếp. | Công việc, tình cảm hay bước ngoặt trước mắt: lá số giúp bạn thấy căn nguyên và chọn cách bước tiếp. | 65 → 21 |
| `homepage-v3.story.q1` | Bao giờ thì thời vận mỉm cười với sự nỗ lực của mình? | Khi nào thời vận đổi thay? | 13 → 6 |
| `homepage-v3.story.q2` | Vì sao mình cứ lặp đi lặp lại một sai lầm trong chuyện tình cảm? | Vì sao tình cảm cứ lặp lại? | 15 → 7 |
| `homepage-v3.story.q3` | Công việc đang làm liệu có phù hợp với mình không? | Công việc nào hợp với mình? | 11 → 6 |
| `homepage-v3.story.q4` | Mình thực sự sinh ra để làm gì giữa cuộc đời này? | Đâu là thế mạnh của mình? | 12 → 6 |
| `homepage-v3.explore.title` | Một đồ hình lá số. Mười hai nếp đời người. | Mười hai cung. Một đời người. | 10 → 6 |
| `homepage-v3.explore.lead` | Đừng để những thuật ngữ xa lạ làm bạn băn khoăn. Bắt đầu từ cung Mệnh để thấu suốt bản tính, rồi mở sang Quan Lộc, Tài Bạch hay Phu Thê. Bạn sẽ thấy từng sự kiện trong đời chưa bao giờ diễn ra rời rạc—chúng đan cài và nâng đỡ lẫn nhau. | Chạm một cung để thấy tính cách, sự nghiệp, tiền bạc và tình duyên liên kết trên cùng một lá số. | 53 → 21 |
| `homepage-v3.explore.cycles` | Bên cạnh 12 cung tĩnh tại là nhịp chảy của thời gian: mười năm một đại vận đổi thay, một năm một lưu niên thử thách. | Đại vận là chu kỳ 10 năm. Lưu niên cho biết thời vận từng năm. | 26 → 15 |
| `homepage-v3.explore.cta` | Lập lá số để soi chiếu đời mình | Lập lá số miễn phí | 8 → 5 |
| `homepage-v3.explore.sample` | Xem thử một lá số mẫu hoàn chỉnh → | Xem bản luận giải mẫu | 9 → 5 |
| `homepage-v3.needs.title` | Hôm nay, lòng bạn đang ngổn ngang điều gì nhất? | Điều gì khiến bạn bận tâm? | 10 → 6 |
| `homepage-v3.needs.lead` | Một quyết định chuyển hướng dở dang. Một mối quan hệ buông không đành, giữ chẳng xong. Hay đơn giản là chính bạn, sau những năm tháng miệt mài mà bỗng thấy chông chênh. | Chọn một điều bạn muốn hiểu rõ. Bản luận giải sẽ bắt đầu từ đó. | 34 → 15 |
| `homepage-v3.needs.items.self.title` | Thấu hiểu chính mình | Hiểu chính mình | 4 → 3 |
| `homepage-v3.needs.items.work.title` | Sự nghiệp & Tiền tài | Công việc và tiền bạc | 5 → 5 |
| `homepage-v3.needs.items.love.title` | Chuyện tình cảm | Tình cảm | 3 → 2 |
| `homepage-v3.needs.items.decision.title` | Một quyết định trước mắt | Quyết định trước mắt | 5 → 4 |
| `homepage-v3.needs.items.self.path` | Soi chiếu từ cung Mệnh và cung Thân để thấy rõ căn cơ, điểm tựa nội tại và những nút thắt tâm lý bạn chưa từng đặt tên. | Cung Mệnh và cung Thân chỉ rõ thế mạnh, điểm tựa và những nút thắt trong cách bạn sống. | 28 → 19 |
| `homepage-v3.needs.items.work.path` | Quan Lộc chỉ rõ cách làm việc và môi trường phát huy; Tài Bạch soi sáng dòng tiền; Đại vận 10 năm chỉ rõ nhịp thịnh suy để đi đúng thời điểm. | Quan Lộc soi sự nghiệp. Tài Bạch soi dòng tiền. Đại vận chỉ nhịp thịnh suy để chọn thời điểm. | 32 → 20 |
| `homepage-v3.needs.items.love.path` | Đọc cung Phu Thê phối chiếu cùng cung Mệnh để bóc tách mẫu người bạn dễ rung động và cách hòa giải xung đột từ gốc rễ. | Phu Thê phối chiếu cùng Mệnh, chỉ rõ mẫu người bạn dễ rung động và cách tháo gỡ xung đột. | 27 → 20 |
| `homepage-v3.needs.items.decision.path` | Khi cần lời khuyên cho một thời điểm cụ thể, trí tuệ dịch lý giúp bạn nhận diện thời thế: nên quyết đoán tiến hay điềm tĩnh thủ. | Kinh Dịch giúp bạn đọc thời thế trước một việc cụ thể: nên tiến hay nên giữ. | 28 → 17 |
| `homepage-v3.needs.items.self.cta` | Khám phá căn cốt bản thân | Lập lá số miễn phí | 6 → 5 |
| `homepage-v3.needs.items.work.cta` | Xem thời vận công danh | Lập lá số miễn phí | 5 → 5 |
| `homepage-v3.needs.items.love.cta` | Soi tỏ duyên tình | Lập lá số miễn phí | 4 → 5 |
| `homepage-v3.needs.lensTitle` | Mỗi môn phái, một góc nhìn sáng rõ. | Khám phá các bộ môn | 8 → 5 |
| `homepage-v3.needs.disciplines.tuvi.desc` | Bản đồ 12 cung và hơn 100 tinh tú, giải mã toàn diện tính cách, nhân duyên và từng bước ngoặt đời người. | 12 cung và hơn 100 tinh tú, giải mã tính cách, nhân duyên và những bước ngoặt đời người. | 23 → 19 |
| `homepage-v3.needs.disciplines.batu.desc` | Bốn trụ Năm - Tháng - Ngày - Giờ, luận giải sự cân bằng âm dương và chu kỳ ngũ hành thịnh suy. | Bốn trụ ngày giờ sinh, luận âm dương và nhịp ngũ hành thịnh suy. | 23 → 14 |
| `homepage-v3.needs.disciplines.chiemtinh.desc` | Vị trí các vì tinh tú thời khắc chào đời qua 12 cung hoàng đạo, soi tỏ thế giới nội tâm và tiềm năng vô thức. | 12 cung hoàng đạo soi nội tâm và tiềm năng từ thời khắc chào đời. | 26 → 15 |
| `homepage-v3.needs.disciplines.kinhdich.desc` | Trí tuệ thời vị qua 64 quẻ dịch, soi sáng lẽ biến dịch và gợi mở ứng xử trước từng tình huống cụ thể. | 64 quẻ giúp đọc thời thế và chọn cách ứng xử trước một việc cụ thể. | 24 → 16 |
| `homepage-v3.needs.disciplines.thansohoc.desc` | Khám phá tần số rung động của họ tên và ngày sinh cùng nhịp điệu của các chu kỳ năm cá nhân. | Họ tên, ngày sinh và các chu kỳ năm cá nhân giúp bạn hiểu nhịp sống. | 22 → 16 |
| `homepage-v3.compare.title` | Tốc độ hay cuộc trò chuyện? Điều gì sẽ thực sự ở lại cùng bạn? | Vì sao chọn Lá Số Việt? | 15 → 6 |
| `homepage-v3.compare.lead` | Trang tử vi phổ thông cho sự nhanh chóng. Hỏi đáp AI cho sự linh hoạt. Gặp thầy cho sự lắng nghe. Lá Số Việt trao bạn một bản đồ vận mệnh chuẩn xác, có căn cứ cổ thư và đồng hành trọn đời. | Lá số chuẩn xác. Luận giải có căn cứ. Đồng hành trọn đời. | 44 → 13 |
| `homepage-v3.compare.cardTitle` | {name} có gì đáng để bạn lựa chọn? | {name}: điểm đáng chọn | 8 → 4 |
| `homepage-v3.compare.ctaDesktop` | Khai mở lá số của tôi → | Lập lá số miễn phí | 7 → 5 |
| `homepage-v3.compare.cta` | Bắt đầu với lá số của tôi → | Lập lá số miễn phí | 8 → 5 |
| `homepage-v3.compare.rows.strength.lsv` | Bản đồ vận mệnh chuẩn xác, cá nhân hóa sâu sắc và lưu trữ đồng hành trọn đời. | Lá số chuẩn xác, cá nhân hóa sâu và lưu trữ trọn đời. | 18 → 13 |
| `homepage-v3.compare.rows.strength.web` | Tra cứu miễn phí, trả kết quả lá số thô và bài đọc tự động tức thì. | Tra cứu miễn phí, trả lá số và bài đọc tức thì. | 17 → 12 |
| `homepage-v3.compare.rows.strength.ai` | Trò chuyện linh hoạt 24/7 bằng lời văn tự nhiên, phản hồi ngay tức thì. | Trò chuyện tự nhiên, linh hoạt 24/7. | 15 → 7 |
| `homepage-v3.compare.rows.strength.thay` | Đối thoại 1-1 trực tiếp, được lắng nghe và an ủi cảm xúc tại chỗ. | Đối thoại trực tiếp, được lắng nghe tại chỗ. | 15 → 9 |
| `homepage-v3.compare.rows.own.lsv` | An sao chuẩn từng phút sinh; bóc tách đúng trăn trở bạn đang bận tâm. | An sao chuẩn từng phút, đọc đúng trăn trở của bạn. | 15 → 11 |
| `homepage-v3.compare.rows.own.web` | Văn mẫu đóng sẵn; hai người cùng sao nhận bài đọc giống hệt nhau. | Văn mẫu đóng sẵn, cùng sao nhận cùng bài đọc. | 14 → 10 |
| `homepage-v3.compare.rows.own.ai` | Phụ thuộc câu lệnh tự nhập; dễ bị định kiến người dùng dẫn dắt. | Phụ thuộc câu lệnh, dễ bị định kiến dẫn dắt. | 14 → 10 |
| `homepage-v3.compare.rows.own.thay` | Phụ thuộc lớn vào kinh nghiệm, tâm trạng và cảm quan cá nhân của thầy. | Phụ thuộc kinh nghiệm, tâm trạng và cảm quan của thầy. | 15 → 11 |
| `homepage-v3.compare.rows.basis.lsv` | Minh bạch tuyệt đối. Mọi luận giải đều gắn đường dẫn đối chiếu sao và cung. | Minh bạch tuyệt đối, đối chiếu từng sao và cung. | 16 → 10 |
| `homepage-v3.compare.rows.basis.web` | Dữ liệu đại trà chưa kiểm chứng; buông lời phán mơ hồ gây hoang hoảng. | Dữ liệu chưa kiểm chứng, lời phán mơ hồ gây hoang mang. | 15 → 12 |
| `homepage-v3.compare.rows.basis.ai` | Dễ bị 'ảo giác' an sai vị trí sao nhưng vẫn trả lời rất tự tin. | Có thể an sai sao nhưng vẫn trả lời tự tin. | 16 → 11 |
| `homepage-v3.compare.rows.basis.thay` | Truyền miệng thiếu cơ sở logic chuẩn hóa; khó kiểm chứng tính đúng sai. | Truyền miệng, thiếu chuẩn hóa và khó kiểm chứng. | 14 → 9 |
| `homepage-v3.compare.rows.links.lsv` | Đồ hình tương tác trực quan: chạm một cung để thấy trọn vẹn Tam hợp, Xung chiếu. | Chạm một cung, thấy trọn Tam hợp và Xung chiếu. | 17 → 10 |
| `homepage-v3.compare.rows.links.web` | Nội dung cắt vụn; các cung phán mâu thuẫn buộc bạn tự chắp vá. | Các cung bị cắt vụn, mâu thuẫn phải tự chắp vá. | 14 → 11 |
| `homepage-v3.compare.rows.links.ai` | Mỗi lần hỏi là một lát cắt rời rạc, mất đi tính nhất quán toàn cục. | Mỗi câu hỏi là một lát cắt, thiếu toàn cảnh. | 16 → 10 |
| `homepage-v3.compare.rows.links.thay` | Lời phán thoảng qua, khó hình dung rõ bức tranh tổng thể mười hai cung. | Lời phán thoáng qua, khó thấy toàn bộ 12 cung. | 15 → 10 |
| `homepage-v3.compare.rows.return.lsv` | Khách quan & Nhất quán tuyệt đối; chuẩn hóa dữ liệu, loại bỏ hoàn toàn cảm tính. | Khách quan, nhất quán tuyệt đối; loại bỏ hoàn toàn cảm tính. | 17 → 12 |
| `homepage-v3.compare.rows.return.web` | Thông tin thiếu ổn định; các bài tra cứu mâu thuẫn nhau giữa các lần đọc. | Bài tra cứu thiếu ổn định, mâu thuẫn giữa các lần đọc. | 16 → 12 |
| `homepage-v3.compare.rows.return.ai` | Thiếu tính nhất quán; mỗi lượt hỏi lại cho ra một kết quả mâu thuẫn. | Hỏi lại có thể nhận kết quả mâu thuẫn. | 15 → 9 |
| `homepage-v3.compare.rows.return.thay` | Thiếu tính đồng nhất; cùng lá số nhưng mỗi thầy phán một kiểu khác nhau. | Cùng lá số, mỗi thầy có thể phán khác nhau. | 15 → 10 |
| `homepage-v3.compare.rows.depth.lsv` | Xem miễn phí nền tảng; chủ động mở sâu đúng phần bạn cần với chi phí minh bạch. | Xem nền tảng miễn phí, mở sâu theo nhu cầu và chi phí rõ ràng. | 18 → 15 |
| `homepage-v3.compare.rows.depth.web` | Giao diện tràn ngập quảng cáo; bài viết đóng gói cứng nhắc, thừa thãi. | Nhiều quảng cáo, bài đọc cứng nhắc và thừa nội dung. | 14 → 11 |
| `homepage-v3.compare.rows.depth.ai` | Tốn phí thuê bao tháng; người dùng phải tự gánh rủi ro tự kiểm chứng. | Tốn phí thuê bao, phải tự kiểm chứng. | 15 → 8 |
| `homepage-v3.compare.rows.depth.thay` | Chi phí đắt đỏ từ trăm nghìn đến tiền triệu; khó đặt lịch để hỏi thêm. | Chi phí cao, khó đặt lịch hỏi thêm. | 16 → 8 |
| `homepage-v3.usp.title` | Càng nhìn sâu, càng thấy rõ bóng hình mình trong đó. | Đọc sâu trên chính lá số của bạn | 11 → 8 |
| `homepage-v3.usp.lead` | Một lá số chân chính không bao giờ kết thúc ở vài lời phán xét nông cạn. Nó là hành trình bóc tách từng lớp căn duyên, hiểu từng mối dây ràng buộc, để rồi mỗi khi chông chênh, bạn luôn có một chốn trở về soi chiếu. | Cổ thư, thời khắc sinh và quan hệ giữa các cung cùng tạo nên một bản luận giải riêng cho bạn. | 48 → 21 |
| `homepage-v3.usp.n1.title` | Kế thừa tinh hoa cổ thư. | Có gốc từ cổ thư | 6 → 5 |
| `homepage-v3.usp.n1.body` | Mỗi lời luận giải đều được đúc kết từ thuật số chính tông phương Đông, hệ thống hóa lớp lang để từng câu chữ đều có gốc có ngọn, tuyệt đối không suy diễn hàm hồ. | Thuật số chính tông được hệ thống hóa rõ ràng. Mỗi lời luận đều có gốc, tuyệt đối không suy diễn hàm hồ. | 36 → 23 |
| `homepage-v3.usp.n2.title` | Khởi phát từ chính bạn. | Khởi đầu từ bạn | 5 → 4 |
| `homepage-v3.usp.n2.body` | Thời khắc bạn cất tiếng khóc chào đời dựng nên đồ hình số phận. Nhưng chính nỗi bận tâm của bạn ở hiện tại mới là chiếc chìa khóa mở lối cho câu chuyện. | Ngày giờ sinh dựng nên lá số. Điều bạn đang bận tâm dẫn đường cho bản luận giải. | 34 → 18 |
| `homepage-v3.usp.n3.title` | Mạch ngầm liên kết. | Thấy mối liên kết | 4 → 4 |
| `homepage-v3.usp.n3.body` | Chạm vào một cung số để thấy thế tam hợp, nhị hợp và xung chiếu cùng lúc bừng sáng. Mười hai cung không bao giờ cô lập—chúng cùng kể một câu chuyện về đời bạn. | Tam hợp, nhị hợp và xung chiếu hiện rõ. Mười hai cung cùng kể câu chuyện của bạn. | 35 → 18 |
| `homepage-v3.usp.n3.link` | Chạm thử vào lá số → | Khám phá 12 cung | 6 → 4 |
| `homepage-v3.usp.n4.title` | Thong dong theo nhịp riêng. | Chọn độ sâu bạn cần | 5 → 5 |
| `homepage-v3.usp.n4.body` | Sự nghiệp, tình cảm hay vận hạn một năm trước mắt: bạn làm chủ hoàn toàn hành trình khám phá, thấy rõ từng giá trị và chi phí trước khi quyết định mở đọc. | Sự nghiệp, tình cảm hay vận hạn: mở đúng phần bạn cần, thấy rõ giá trị và chi phí trước khi đọc. | 34 → 22 |
| `homepage-v3.testimonials.lead` | Mỗi người tìm đến Lá Số Việt mang theo một trăn trở riêng. Nhưng rời đi, họ đều mang theo một điểm tựa an lòng. | Những điều người đọc giữ lại sau khi xem lá số. | 25 → 11 |
| `homepage-v3.testimonials.start` | Bắt đầu với lá số của bạn ↗ | Lập lá số miễn phí | 8 → 5 |
| `homepage-v3.value.title` | Thấu hiểu trước một phần. Đi sâu khi lòng đã tỏ. | Bắt đầu miễn phí. Đi sâu bằng Lá. | 11 → 8 |
| `homepage-v3.value.lead` | Bạn hoàn toàn có thể khởi đầu bằng việc lập lá số và đọc những nhận định cốt lõi nhất về mình mà không tốn một đồng. Khi thấy hữu ích và muốn giữ lại cho riêng mình, bạn đăng nhập lưu trữ. Những tầng luận giải chuyên sâu chỉ mở ra khi bạn thực sự cần, bằng Lá, với chi phí minh bạch đến từng con số. | Xem lá số và nhận định cốt lõi miễn phí. Đăng nhập để lưu. Dùng Lá khi muốn đọc sâu hơn. | 68 → 21 |
| `homepage-v3.value.s1.title` | Bước 1: Trải nghiệm trọn vẹn đồ hình | 1. Xem miễn phí | 8 → 4 |
| `homepage-v3.value.s1.body` | Xem đầy đủ lá số 12 cung an sao chuẩn xác cùng 2 nhận định trọng tâm về bản mệnh. Hoàn toàn miễn phí, không cần đăng ký tài khoản. | Đầy đủ lá số 12 cung và 2 nhận định trọng tâm. Không cần đăng ký. | 30 → 16 |
| `homepage-v3.value.s2.title` | Bước 2: Ghi dấu & Lưu giữ | 2. Lưu lá số | 7 → 4 |
| `homepage-v3.value.s2.body` | Đăng nhập một chạm để lưu lại lá số trọn đời, mở khóa bản tóm lược vận khí tổng quan và những lưu ý quan trọng trong năm. | Đăng nhập để lưu trọn đời, mở tóm lược vận khí và những lưu ý trong năm. | 28 → 17 |
| `homepage-v3.value.s3.title` | Bước 3: Mở khóa theo nhu cầu riêng | 3. Mở sâu bằng Lá | 8 → 5 |
| `homepage-v3.value.s3.body` | Dùng Lá để mở đúng phần bạn muốn thấu tỏ: Đại vận 10 năm, thời vận từng năm hay chuyên sâu từng cung. Số Lá và số tiền hiện rõ ràng trước khi bạn bấm xác nhận. | Chọn Đại vận, vận hạn từng năm hoặc một cung. Chi phí hiện rõ trước khi xác nhận. | 37 → 18 |
| `homepage-v3.faq.title` | Những điều bạn có thể muốn hỏi trước khi khởi tạo. | Bạn muốn hỏi thêm điều gì? | 11 → 6 |
| `homepage-v3.faq.items.q1.q` | Tôi không nhớ chính xác giờ sinh thì có lập lá số được không? | Không nhớ giờ sinh, có bắt đầu được không? | 14 → 9 |
| `homepage-v3.faq.items.q1.a` | Bạn vẫn có thể bắt đầu. Hãy chọn 'Tôi chưa nhớ rõ giờ sinh'. Hệ thống vẫn sẽ lập đồ hình cơ bản và chỉ rõ cho bạn thấy giờ sinh quyết định đến những cung vị nào, để bạn có thể hỏi lại người thân và hoàn thiện lá số sau mà không mất dữ liệu đã tạo. | Có. Chọn “Tôi chưa nhớ rõ giờ sinh”. Bạn có thể bổ sung sau và giữ lại dữ liệu đã tạo. | 59 → 21 |
| `homepage-v3.faq.items.q2.q` | Xem miễn phí thì tôi đọc được những gì? | Tôi được xem gì miễn phí? | 9 → 6 |
| `homepage-v3.faq.items.q2.a` | Bạn được xem trọn vẹn đồ hình lá số 12 cung an sao chuẩn xác theo thiên văn, tra cứu ý nghĩa các sao khi chạm vào cung, và nhận ngay 2 nhận định đúc kết quan trọng về bản mệnh. Bạn không phải trả bất kỳ chi phí nào và cũng không cần nhập thông tin thẻ. | Trọn lá số 12 cung, ý nghĩa các sao khi chạm vào cung và 2 nhận định bản mệnh. Không cần nhập thẻ. | 58 → 23 |
| `homepage-v3.faq.items.q3.q` | "Lá" trong hệ thống dùng để làm gì và tính phí thế nào? | Lá dùng để làm gì? | 13 → 5 |
| `homepage-v3.faq.items.q3.a` | Lá là đơn vị để bạn tùy ý mở đọc các phần luận giải chuyên sâu (như phân tích đại vận, dự báo chi tiết năm hạn hay đối chiếu cung phối). Mỗi gói Lá đều hiển thị song song số tiền VNĐ tương ứng rõ ràng, thanh toán qua chuyển khoản VietQR tự động trong vài giây. Chúng tôi tuyệt đối không tạo tỷ giá ảo hay thu phí duy trì ngầm. | Lá mở các phần luận giải chuyên sâu. Gói nạp hiển thị số Lá và giá VNĐ; thanh toán qua VietQR. Không thu phí duy trì ngầm. | 73 → 27 |
| `homepage-v3.faq.items.q4.q` | Sau này muốn xem lại lá số của mình thì tìm ở đâu? | Tôi tìm lại lá số ở đâu? | 13 → 7 |
| `homepage-v3.faq.items.q4.a` | Chỉ cần đăng nhập bằng tài khoản cá nhân, lá số và toàn bộ các phần luận giải bạn đã mở sẽ được lưu giữ vĩnh viễn trong mục Tài khoản. Bạn có thể mở lại trên điện thoại hay máy tính bất cứ khi nào cần chiêm nghiệm. | Đăng nhập, mở Tài khoản để xem lại lá số và các phần đã mở trên điện thoại hoặc máy tính. | 49 → 21 |
| `homepage-v3.faq.items.q5.q` | Thông tin ngày giờ sinh của tôi có được bảo mật không? | Ngày giờ sinh của tôi có được bảo mật? | 12 → 9 |
| `homepage-v3.faq.items.q5.a` | Lá Số Việt coi sự riêng tư của bạn là nguyên tắc tối thượng. Dữ liệu ngày sinh của người dùng ẩn danh sẽ tự động xóa sau 24 giờ. Chúng tôi không gửi ngày giờ sinh, họ tên hay nội dung lá số của bạn cho bất kỳ công cụ bên thứ ba nào, và bạn luôn có quyền bấm xóa vĩnh viễn hồ sơ của mình bất kỳ lúc nào. | Dữ liệu ẩn danh tự xóa sau 24 giờ. Ngày giờ sinh, họ tên và nội dung lá số không gửi tới công cụ bên thứ ba. | 72 → 27 |
| `homepage-v3.about.title` | Đơn giản hóa tinh hoa huyền học Đông Tây, đưa tri thức cổ học đúc kết ngàn năm đến gần hơn với người Việt. | Tri thức cổ học, gần hơn với bạn | 24 → 8 |
| `homepage-v3.about.body` | Lá Số Việt hội tụ tinh hoa các bộ môn thuật số kim cổ—từ Tử Vi, Bát Tự đến Chiêm Tinh, Kinh Dịch và Thần Số Học. Bằng ngôn ngữ tiếng Việt thuần túy, dễ hiểu và có căn cứ minh bạch, Lá Số Việt giúp bạn thấu hiểu sâu sắc chính mình, nhìn rõ những cột mốc vận hạn để luôn có sự chuẩn bị chủ động và vững vàng nhất cho cuộc sống. | Lá Số Việt đưa tinh hoa huyền học Đông Tây đến gần người Việt, bằng bản luận giải dễ hiểu, có căn cứ và cách chuẩn bị rõ ràng. | 75 → 29 |
| `homepage-v3.about.link` | Tìm hiểu thêm về Lá Số Việt → | Về Lá Số Việt | 8 → 4 |
| `homepage-v3.about.ctaTitle` | Chặng đường phía trước của bạn đã sẵn sàng được soi tỏ. | Lập lá số. Hiểu vận mệnh. | 12 → 6 |
| `homepage-v3.about.cta` | Khai mở lá số của bạn ngay | Lập lá số miễn phí | 7 → 5 |
| `troi-nam.hero.sub` | Mỗi người được sinh ra đều là một vì sao trên bầu trời. | Lá số riêng của bạn, giải mã tính cách và thời vận bằng tiếng Việt dễ hiểu. | 13 → 17 |
| `troi-nam-compare.tsx LEAD.vi [remove hardcoded source]` | Lá Số Việt trao bạn một bản đồ vận mệnh có căn cứ cổ thư và đồng hành trọn đời. | Lá số chuẩn xác. Luận giải có căn cứ. Đồng hành trọn đời. | 20 → 13 |
| `site-header.tsx chartCtaLabel [homepage only]` | Lập lá số ngay | Lập lá số miễn phí | 4 → 5 |



### English

| Key / source | Current | Proposed | Units before → after |
|---|---|---|---|
| `troi-nam.hero.startCta` | [new] | Start my free chart | 0 → 4 |
| `homepage-v3.hero.modeExact` | I know the exact time | Exact time | 5 → 2 |
| `homepage-v3.hero.modeBranch` | I know the time range (shichen) | Two-hour window | 6 → 2 |
| `homepage-v3.story.title` | Some questions just won't stop nagging at you... | What are you trying to understand? | 8 → 6 |
| `homepage-v3.story.body` | They visit in the sleepless hours of the night, slip in with the crowd on the way home, or surface in the middle of what seemed like a calm meeting. In the middle of all that, what you need is not a verdict or an empty promise—it is a view deep enough to see the real cause and step forward with confidence. | Work, love or a turning point: your chart reveals the roots and helps you choose your next step. | 62 → 18 |
| `homepage-v3.story.q1` | When will fortune finally meet my effort? | When will my fortune change? | 7 → 5 |
| `homepage-v3.story.q2` | Why do I keep repeating the same mistake in love? | Why do my relationships repeat? | 10 → 5 |
| `homepage-v3.story.q3` | Is the work I'm doing right now actually right for me? | Which work suits me? | 11 → 4 |
| `homepage-v3.story.q4` | What was I really put on this earth to do? | What are my strengths? | 10 → 4 |
| `homepage-v3.explore.title` | One chart. Twelve folds of a life. | Twelve palaces. One life. | 7 → 4 |
| `homepage-v3.explore.lead` | Don't let unfamiliar terms hold you back. Start with the Life palace to understand your nature, then move on to Career, Wealth or Spouse. You'll see that no event in your life ever stood alone—each one is woven into and held up by the others. | Tap a palace to see how character, career, money and relationships connect in one chart. | 45 → 15 |
| `homepage-v3.explore.cycles` | Beyond the 12 still palaces there is the rhythm of time itself: a ten-year cycle that reshapes a decade, an annual cycle that tests each year. | Major periods cover ten years. Annual periods reveal each year’s fortune. | 26 → 11 |
| `homepage-v3.explore.cta` | Build a chart to see your own life | Start my free chart | 8 → 4 |
| `homepage-v3.explore.sample` | Try a full sample chart → | View a sample reading | 6 → 4 |
| `homepage-v3.needs.title` | What's weighing on you the most today? | What is on your mind? | 7 → 5 |
| `homepage-v3.needs.lead` | A half-made decision to change direction. A relationship you can't quite let go of, or hold onto either. Or simply yourself, feeling unsteady after years of pushing forward. | Choose what you want to understand. Your reading starts there. | 28 → 10 |
| `homepage-v3.needs.items.self.title` | Understand yourself | Understand myself | 2 → 2 |
| `homepage-v3.needs.items.work.title` | Career & money | Work and money | 3 → 3 |
| `homepage-v3.needs.items.decision.title` | A decision right in front of you | A decision ahead | 7 → 3 |
| `homepage-v3.needs.items.self.path` | Look through the Life palace and the Body palace to see your true footing, your inner anchor, and the psychological knots you've never quite named. | Life and Body palaces reveal your strengths, inner resources and recurring patterns. | 25 → 12 |
| `homepage-v3.needs.items.work.path` | The Career palace shows how you work and where you thrive; the Wealth palace reveals your cash flow; the ten-year cycle shows the rise and fall so you can move at the right moment. | Career reveals your working path. Wealth reveals money patterns. Major periods show when to act. | 34 → 15 |
| `homepage-v3.needs.items.love.path` | Read the Spouse palace alongside the Life palace to uncover the type of person you fall for, and how to resolve conflict at its root. | Spouse and Life palaces reveal attraction patterns and ways to resolve conflict. | 25 → 12 |
| `homepage-v3.needs.items.decision.path` | When you need guidance for one specific moment, the wisdom of the I Ching helps you read the times: whether to act decisively or hold steady. | The I Ching reads the timing of a specific situation: move forward or hold back. | 26 → 15 |
| `homepage-v3.needs.items.self.cta` | Discover your core self | Start my free chart | 4 → 4 |
| `homepage-v3.needs.items.work.cta` | See your career fortune | Start my free chart | 4 → 4 |
| `homepage-v3.needs.items.love.cta` | See your love fortune | Start my free chart | 4 → 4 |
| `homepage-v3.needs.lensTitle` | Each discipline, a clear lens of its own. | Explore the traditions | 8 → 3 |
| `homepage-v3.needs.disciplines.tuvi.desc` | A map of 12 palaces and over 100 stars, fully decoding your character, relationships and every turning point in life. | Twelve palaces and over 100 stars reveal character, relationships and life’s turning points. | 20 → 13 |
| `homepage-v3.needs.disciplines.batu.desc` | Four pillars—Year, Month, Day, Hour—reading the balance of yin and yang and the rise and fall of the five elements. | Four birth pillars reveal yin, yang and the cycles of the five elements. | 20 → 13 |
| `homepage-v3.needs.disciplines.chiemtinh.desc` | Where the stars stood at the moment you were born, read through the 12 zodiac signs to reveal your inner world and unconscious potential. | Twelve zodiac signs reveal your inner world and potential from the moment of birth. | 24 → 14 |
| `homepage-v3.needs.disciplines.kinhdich.desc` | The wisdom of timing through 64 hexagrams, illuminating the nature of change and suggesting how to act in a specific situation. | Sixty-four hexagrams reveal timing and how to respond to a specific situation. | 21 → 12 |
| `homepage-v3.needs.disciplines.thansohoc.desc` | Discover the vibration frequency of your name and birth date, and the rhythm of your personal-year cycles. | Your name, birth date and personal-year cycles reveal the rhythm of your life. | 17 → 13 |
| `homepage-v3.compare.title` | Speed or a conversation? What will truly stay with you? | Why choose Lá Số Việt? | 10 → 5 |
| `homepage-v3.compare.lead` | General horoscope sites offer speed. AI chatbots offer flexibility. Meeting a master offers a listening ear. Lá Số Việt provides an accurate, grounded destiny map that stays with you for life. | An accurate chart. Readings with clear foundations. A lifelong companion. | 31 → 10 |
| `homepage-v3.compare.cardTitle` | What makes {name} worth choosing? | {name}: the key strength | 5 → 4 |
| `homepage-v3.compare.ctaDesktop` | Create my chart → | Start my free chart | 4 → 4 |
| `homepage-v3.compare.cta` | Start with my chart → | Start my free chart | 5 → 4 |
| `homepage-v3.compare.rows.strength.lsv` | Accurate destiny map, deeply personalized and permanently stored for life. | Accurate charts, deep personalisation and lifelong storage. | 10 → 7 |
| `homepage-v3.compare.rows.strength.web` | Free lookup, returning a raw chart and automated reading instantly. | Free lookup with instant charts and readings. | 10 → 7 |
| `homepage-v3.compare.rows.strength.ai` | Flexible 24/7 Q&A in natural prose, responding instantly to any prompt. | Natural, flexible conversation, available 24/7. | 11 → 5 |
| `homepage-v3.compare.rows.strength.thay` | Live 1-on-1 dialogue, offering immediate listening and emotional relief. | Face-to-face conversation and immediate personal attention. | 9 → 6 |
| `homepage-v3.compare.rows.own.lsv` | Exact calculation down to the minute; unravels your exact current focus. | Precise star placement by birth minute; readings focused on your concern. | 11 → 11 |
| `homepage-v3.compare.rows.own.web` | Template text; different people with the same stars get identical readings. | Preset text gives people with the same stars the same reading. | 11 → 11 |
| `homepage-v3.compare.rows.own.ai` | Relies entirely on user prompts; easily biased by user framing. | Depends on your prompt and can follow your biases. | 10 → 9 |
| `homepage-v3.compare.rows.own.thay` | Heavily depends on the individual reader's subjective mood and bias. | Depends on the reader’s experience, mood and personal judgement. | 10 → 9 |
| `homepage-v3.compare.rows.basis.lsv` | 100% transparent logic. Every insight links back to its exact palace and star. | Complete transparency, with each star and palace available for comparison. | 13 → 10 |
| `homepage-v3.compare.rows.basis.web` | Unverified generic data; drops vague predictions causing unnecessary anxiety. | Unverified data and vague predictions create confusion. | 9 → 7 |
| `homepage-v3.compare.rows.basis.ai` | Prone to AI hallucinations—misplacing stars while sounding confident. | Can place stars incorrectly while still answering confidently. | 8 → 8 |
| `homepage-v3.compare.rows.basis.thay` | Spoken advice lacks standardized logic, making verification difficult. | Oral traditions lack standardisation and are difficult to verify. | 8 → 9 |
| `homepage-v3.compare.rows.links.lsv` | Interactive chart: tap a palace to see trine and opposite links instantly. | Tap one palace to see its trine and opposition relationships. | 12 → 10 |
| `homepage-v3.compare.rows.links.web` | Fragmented claims; contradictory statements force you to guess. | Fragmented palaces leave you to reconcile contradictory readings. | 8 → 8 |
| `homepage-v3.compare.rows.links.ai` | Isolated prompts drift away from overall 12-palace consistency. | Each question gives a fragment without a coherent overall picture. | 8 → 10 |
| `homepage-v3.compare.rows.links.thay` | Spoken words fade quickly, making complex palace links hard to visualize. | Spoken readings make the full twelve-palace picture difficult to see. | 11 → 10 |
| `homepage-v3.compare.rows.return.lsv` | 100% objective and consistent; standardized data eliminates all personal bias. | Absolute objectivity and consistency; subjective judgement is eliminated. | 10 → 8 |
| `homepage-v3.compare.rows.return.web` | Unstable info; lookups yield conflicting readings across different visits. | Lookup articles are inconsistent and contradict one another. | 9 → 8 |
| `homepage-v3.compare.rows.return.ai` | Lacks consistency; asking again yields conflicting and shifting responses. | Asking again can produce a contradictory answer. | 9 → 7 |
| `homepage-v3.compare.rows.return.thay` | Lacks uniformity; different masters give contradictory readings for the same chart. | Different readers can interpret the same chart differently. | 11 → 8 |
| `homepage-v3.compare.rows.depth.lsv` | Free base access; open deeper sections as needed with clear upfront pricing. | Start free, then unlock the depth you need at a clear cost. | 12 → 12 |
| `homepage-v3.compare.rows.depth.web` | Cluttered with popup ads; rigid one-size-fits-all paid articles. | Heavy advertising and rigid readings with unnecessary content. | 8 → 8 |
| `homepage-v3.compare.rows.depth.ai` | Monthly subscriptions required; you absorb the risk of accuracy. | Subscription costs leave you responsible for checking the answers. | 9 → 9 |
| `homepage-v3.compare.rows.depth.thay` | Costly session fees ($20-$100+); appointment queues limit follow-ups. | High fees and difficulty scheduling follow-up questions. | 8 → 7 |
| `homepage-v3.usp.title` | The deeper you look, the more clearly you see yourself in it. | Read deeper into your own chart | 12 → 6 |
| `homepage-v3.usp.lead` | A true chart never ends with a few shallow verdicts. It is a journey of peeling back every layer of causation, understanding every thread that binds you, so that whenever you feel unsteady, you always have a place to return to and see clearly. | Classical texts, your birth moment and palace relationships form a reading that is yours alone. | 44 → 15 |
| `homepage-v3.usp.n1.title` | Built on the wisdom of the old texts. | Rooted in classical texts | 8 → 4 |
| `homepage-v3.usp.n1.body` | Every reading is distilled from authentic Eastern methods, structured layer by layer so every line has a clear origin—never a vague or arbitrary guess. | Authentic traditions are clearly organised. Every interpretation has a foundation, with no baseless speculation. | 24 → 14 |
| `homepage-v3.usp.n2.title` | It begins with you. | Starting with you | 4 → 3 |
| `homepage-v3.usp.n2.body` | The moment you drew your first breath shaped your destiny map. But what's on your mind right now is the key that opens the story. | Your birth details build the chart. Your present concern guides the reading. | 25 → 12 |
| `homepage-v3.usp.n3.title` | A living web of connections. | See the connections | 5 → 3 |
| `homepage-v3.usp.n3.body` | Tap a palace and watch its trine, half-trine and opposite links light up at once. The twelve palaces are never isolated—they tell one single story about your life. | Trines, paired relationships and oppositions become visible. Twelve palaces tell your story together. | 28 → 13 |
| `homepage-v3.usp.n3.link` | Try touching a chart → | Explore the twelve palaces | 5 → 4 |
| `homepage-v3.usp.n4.title` | Move through it at your own pace. | Choose the depth you need | 7 → 5 |
| `homepage-v3.usp.n4.body` | Career, love, or the fortune of the year ahead: you're fully in control of the journey, seeing exactly what each part offers and costs before you decide to open it. | Career, love or yearly fortune: unlock what you need, with value and cost clear before you read. | 30 → 17 |
| `homepage-v3.testimonials.lead` | Everyone who comes to Lá Số Việt carries a different worry. But everyone leaves carrying something to hold onto. | What readers take with them after exploring their charts. | 19 → 9 |
| `homepage-v3.testimonials.start` | Start with your own chart ↗ | Start my free chart | 6 → 4 |
| `homepage-v3.value.title` | Understand a part of it first. Go deeper once your heart is sure. | Start free. Go deeper with Lá. | 13 → 6 |
| `homepage-v3.value.lead` | You can start completely free by building your chart and reading the most essential insights about yourself. When you find it useful and want to keep it, sign in to save. The deeper layers of interpretation only open when you truly need them, using Lá, with pricing that is transparent down to the last figure. | See your chart and core insights free. Sign in to save it. Use Lá to read deeper. | 55 → 17 |
| `homepage-v3.value.s1.title` | Step 1: Experience the full chart | 1. Explore free | 6 → 3 |
| `homepage-v3.value.s1.body` | See your complete 12-palace chart, accurately calculated, along with 2 core insights about your destiny. Completely free, no account required. | Your complete twelve-palace chart and two core insights. No registration required. | 20 → 11 |
| `homepage-v3.value.s2.title` | Step 2: Mark it & keep it | 2. Save your chart | 7 → 4 |
| `homepage-v3.value.s2.body` | Sign in with one tap to save your chart for life, unlocking a general fortune summary and the key things to note this year. | Sign in for lifelong storage, a fortune overview and the year’s key points. | 24 → 13 |
| `homepage-v3.value.s3.title` | Step 3: Unlock exactly what you need | 3. Unlock depth with Lá | 7 → 5 |
| `homepage-v3.value.s3.body` | Use Lá to open exactly the part you want to understand: the ten-year cycle, a specific year's fortune, or a deep dive into one palace. The Lá cost and the money amount are both shown clearly before you confirm. | Choose major periods, yearly fortune or a single palace. Costs are clear before you confirm. | 39 → 15 |
| `homepage-v3.faq.title` | What you might want to ask before you begin. | What else would you like to know? | 9 → 7 |
| `homepage-v3.faq.items.q1.q` | I don't remember my exact birth time—can I still build a chart? | Can I start without my birth time? | 12 → 7 |
| `homepage-v3.faq.items.q1.a` | You can still begin. Choose 'I don't remember the exact birth time'. The system will still build a basic chart and show you exactly which palaces depend on your birth time, so you can ask your family later and complete the chart without losing what you've already created. | Yes. Choose “I don’t remember my birth time”. Add it later without losing the details you have entered. | 48 → 18 |
| `homepage-v3.faq.items.q2.q` | What can I read for free? | What can I see for free? | 6 → 6 |
| `homepage-v3.faq.items.q2.a` | You get to see the complete 12-palace chart, accurately calculated by astronomy, look up the meaning of each star by tapping a palace, and receive 2 essential insights about your destiny right away. You don't pay anything and you don't need to enter any card details. | Your complete twelve-palace chart, star meanings when you tap a palace, and two core insights. No card required. | 46 → 18 |
| `homepage-v3.faq.items.q3.q` | What is "Lá" used for in the system, and how is it priced? | What is Lá for? | 13 → 4 |
| `homepage-v3.faq.items.q3.a` | Lá is the unit you use to freely unlock deeper interpretations (such as ten-year cycle analysis, detailed yearly forecasts, or palace compatibility readings). Every Lá pack shows its matching VND price clearly, paid via automatic VietQR bank transfer in seconds. We never create a hidden exchange rate or charge silent maintenance fees. | Lá unlocks deeper readings. Top-up packs show Lá and VND prices; payment uses VietQR. There are no hidden maintenance fees. | 52 → 20 |
| `homepage-v3.faq.items.q4.q` | Where can I find my chart again later? | Where can I find my chart again? | 8 → 7 |
| `homepage-v3.faq.items.q4.a` | Just sign in with your personal account—your chart and every interpretation you've unlocked are stored permanently under Account. You can reopen it on your phone or computer anytime you want to reflect. | Sign in and open your account to revisit your chart and unlocked readings on phone or computer. | 32 → 17 |
| `homepage-v3.faq.items.q5.q` | Is my birth date and time information kept private? | Are my birth details private? | 9 → 5 |
| `homepage-v3.faq.items.q5.a` | Lá Số Việt treats your privacy as an absolute principle. Anonymous users' birth data is automatically deleted after 24 hours. We do not send your birth date and time, your name, or your chart's content to any third-party tool, and you always have the right to permanently delete your profile at any time. | Anonymous data is deleted after 24 hours. Birth details, names and chart content are not sent to third-party tools. | 53 → 19 |
| `homepage-v3.about.title` | Simplifying Eastern and Western esoteric wisdom, bringing ancient knowledge closer to Vietnamese users. | Classical knowledge, closer to you | 13 → 5 |
| `homepage-v3.about.body` | Lá Số Việt unifies classic disciplines—from Ziwei and BaZi to Astrology, I Ching, and Numerology. Delivered in clear, accessible Vietnamese with transparent logic, Lá Số Việt helps you deeply understand yourself and prepare proactively for every life milestone. | Lá Số Việt brings Eastern and Western traditions closer to Vietnamese readers through clear, grounded readings and practical preparation. | 38 → 19 |
| `homepage-v3.about.link` | Learn more about Lá Số Việt → | About Lá Số Việt | 7 → 4 |
| `homepage-v3.about.ctaTitle` | Your journey ahead is ready to be illuminated. | Cast your chart. Read your life. | 8 → 6 |
| `homepage-v3.about.cta` | Create your chart now | Start my free chart | 4 → 4 |
| `troi-nam.hero.sub` | Every person is born as a star in the sky. | Your own chart, revealing character and fortune in clear language. | 10 → 10 |
| `troi-nam-compare.tsx LEAD.en [remove hardcoded source]` | La So Viet gives you a chart-backed reading that stays with you for life. | An accurate chart. Readings with clear foundations. A lifelong companion. | 14 → 10 |
| `site-header.tsx chartCtaLabel [homepage only]` | Build my chart | Start my free chart | 3 → 4 |



### Display removals, unchanged wording and approval list

| Source | Display action | Wording action |
|---|---|---|
| `homepage-v3.explore.eyebrow` | Omit redundant eyebrow on TN | None |
| `homepage-v3.testimonials.eyebrow` | Omit gallery eyebrow | None |
| `homepage-v3.usp.title/lead` | Omit second header in merged proof chapter | Proposed compact replacements remain in the JSON cut sheet |
| `homepage-v3.needs.items.*.question` | Omit from four choice rows; selected path explains the need | None |
| `homepage-v3.needs.lensLead` | Omit duplicate method introduction in compact disclosure | None |
| `homepage-v3.ticker.*` | Keep exact strings, drop decorative appended arrows and duplicate cycles | None |
| `homepage-v3-testimonials.ts` all 15 excerpt/quote/header values | Three-line card display; full quotation in dialog/all-reader expansion | **Zero wording changes proposed** |

**Founder approval for real quotations:** none is needed for wording in this delivered plan because none changes. If the founder later wants shorter excerpts or zero en dash punctuation inside quoted speech, review each exact old/new quotation separately before changing that data file. Do not infer permission from approval of marketing cuts.

## Part E — Design-system corrections

### Tokens and geometry

| Role | Phone base | ≥768 px | ≥1024 px |
|---|---|---|---|
| Outer section padding per side | 48 px | 64 px | 80 px |
| Inner container block padding | 0 px | 0 px | 0 px |
| Page gutter | 20 px | 32 px | 48 px |
| Normal section-to-section content gap | 96 px | 128 px | 160 px |
| Internal heading → body / body → visual | 16 / 24 px | 16 / 32 px | 16 / 32 px |
| Control gap / gallery snap gap | 8 / 16 px | same | same |
| Sticky-anchor offset | 88 px | 88 px | 88 px; measure actual header if it changes |
| H1 phone | 32–40 px, 1.02, 600 | 40 px until hero breakpoint | existing responsive display, bounded by width |
| H2 | 30 px, 1.15, 600 | 36–44 px | max 56 px |
| H3 | 20 px, 1.25, 600 | 22 px | 24 px |
| UI/body | 16 px, 1.5–1.6 | 16 px | 16–18 px only where space warrants |
| Metadata | 14 px, 1.5 | same | same |
| Control / panel / thumbnail radius | 12 / 16 / 8 px | same | same |
| Pill/round portrait | 999 px | same | same |

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 80. No 128 px section token remains. No inherited 140 px USP header spacer remains. Component margins must not reintroduce an unaccounted section-sized gap.

Fonts: Source Serif 4 for display and quotations; Be Vietnam Pro for UI, body and comparison. Keep Vietnamese diacritics and tabular dates. H1 at 360 px must be two lines without clipping in both locales; a fixed nowrap declaration is conditional on that test and must be removed if translation changes invalidate it.

### Surfaces, accents and legibility

| Semantic role | Value / authority | Use |
|---|---|---|
| `--tn-ink` / canvas | lacquer-950, #080706 | Page canvas |
| Local readable backing | lacquer-900, #0F0D0A at .86 | Feathered copy scrim over world, no rounded panel edge |
| Panel | lacquer-800, #15120E | Form, selected need and quote dialog/gallery card only |
| Selected control | gold-400, #F2DCA0 with lacquer text | Chart-start or pressed control |
| `--tn-text` | pearl-100, #EAE4D5 | Headings |
| `--tn-body-text` | pearl-200, #DCD4C3 | Body over world |
| `--tn-text-muted` | pearl-400, #A79E8B | Metadata on opaque dark backing only |
| Gold detail | gold-500, #C9A44D | Rule/selected ornament |
| Hairline | lacquer-line, #3A3227 | Non-essential grouping; not the sole control-state indicator |
| Cinnabar | son, #CE5B45 | Relationship emphasis / error distinction with text |
| Method identity | existing d1–d4 | Approved isolated method exception |

**Surface count is two opaque UI levels:** canvas + panel. Scrim is a legibility overlay, selected color is a state; neither creates another nested elevated panel. The painting itself is the continuous stage. Use at most one local panel around an interaction, never header-on-card-on-texture-on-section.

Scrim minimum: .86 lacquer alpha in the entire text rectangle, with 32 px feather outside, never through letter areas. Hero retains its full-bleed directional scrim, but put no body over a brighter region without the same measured standard. Shadow may be 0 1px 3px rgb(5 4 3/.9) as supplementary separation; shadow alone is not proof of contrast. Text opacity is always 1. Require 4.5:1 body, 3:1 large display and focus/control boundaries where applicable against actual composite frames.

### Light-theme decision

Recommended release choice: **an intentional lacquer-only Trời Nam homepage**, with the global light preference preserved for approved light-ready pages. Hiding the toggle alone is insufficient; inherited hv3 light variables still need a scoped override. The theme hunk in PR7 provides that override without changing localStorage or root data-theme. This is a **founder decision**, since docs/22 and docs/24 approve both themes; do not treat it as a permanent abandonment of light support.

If the founder chooses full paper support now, do not land that hunk: first approve a second art-direction composition for the whole homepage, using paper-100 #F7F1E5, panel paper-50 #FFFDF7, ink-900 #14263D, ink-600 #5E6873, gold-800 #755718 and cinnabar-700 #A63D2F from docs/24. Map semantic tokens uniformly across form, matrix, quotes, header/footer and painted-world legibility. Do not mix a paper form into a lacquer chapter or invert the image as a shortcut. The supplied diff is for the recommended lacquer release; it is not an untested full-paper implementation.

## Part F — Component specifications

**Shared states:** Default controls have real labels and ≥44 px effective targets with 8 px separation. Hover changes gold/rule emphasis only; focus uses a 2 px gold ring, 3–4 px offset, measured ≥3:1; active uses pressed fill/border and aria-pressed where selection applies. Disabled native controls remain disabled and receive a text explanation already present in the birth form; do not use opacity as the only signal. No new component pretends to have a loading/error state when it only changes local content. Network submission stays in the existing birth form/wizard; if its slow transition has no pending feedback, address it in a separate behaviour-tested PR, not by inventing fake timers.

| Component | Mobile first (390 px) | min-width enhancement | States and behavior | Motion / reduced fallback |
|---|---|---|---|---|
| Hero | 20 px gutter, 32 px top, two-line H1, ≤20-unit support, 52 px primary button, 44 px sample link. Form remains mounted but CSS-hidden until button or chapter CTA requests it. | ≥880: hide disclosure button, show same form through CSS regardless initial React state, form/chart two columns; no SSR viewport guessing. | Default closed; open gives aria-expanded=true and focuses day; later chart CTAs reopen/focus. Restored draft survives. No close control that might strand dirty data. No-JS shows fallback form/link. Errors remain next to fields; native disabled time controls follow unknown checkbox. | User-triggered expansion is immediate, no height tween. Landscape motion remains decorative; static painted fallback/reduced mode stays readable. |
| Time segmented control | Two equal flexible tracks, min-width:0, wrap permitted, 48 px high, 8 px gap; labels from D. Unknown-time entire label ≥44 px. | ≥880 uses same containment; one line if it actually fits. | Default exact, branch pressed toggles underlying fields; unknown disables both; invalid time points to same existing error ID. Keyboard Tab/Space works. No loading state. | 120 ms fill feedback; reduce: immediate. |
| Story/topic ribbon | Four questions in 2×2; retain eight destination links in static horizontal overflow within the component. No blank ticker stage. | ≥880 questions can be one row of four; ribbon stays local and scrollable if necessary. | Links show focus and optional underline; no autoplay/pause state. | No movement unless user scrolls. Reduced identical. |
| Explore | Visible square 4×4 HTML chart (central four cells merged), local-readable intro, four shortcuts, one selected annotation; all twelve palace controls retain glyphs from verified BRANCH_GLYPHS. | ≥880 chart + annotation split; preserve the actual min-width layout. | aria-pressed selected palace; textual Tam hợp/opposite descriptions mean color isn't sole signal. Content change is polite. First touch must not target an invisible cell during world handoff. | Scroll-driven stars converge to chart; meaningful transition justified by the demonstration. At final action frame labels visible; reduce: static chart and complete annotations. |
| Needs | Four ≥64 px compact choice rows with 60 px thumb; selected image 160 px, path ≤25 units, ≤3 chips, one CTA. Method disclosure starts closed, five 80 px thumbnail rows available. | ≥880 choices/detail two columns; method rows two-column inside disclosure; no featured card spanning all columns. | Only explicit choice sets concern. Default self highlight does not silently overwrite saved concern. Direct decision action stays `/kinh-dich`. Native summary expands; no live region around all five links. | Immediate choice update / ≤180 ms opacity if measured stable; no scale/parallax on controls. Reduced: same content immediately. |
| Comparison + proof | Three benefit rows on one canvas, four short supporting annotations, complete evidence in closed native details. Open view has four pressed competitor selectors, one positive and five limits; LSV fix shown per limit for other options. | ≥880 benefits three-column; annotations two-column. ≥1180 details use semantic five-column matrix including row labels, 16 px, short cells and one subtle LSV band. | Default closed; summary click/Enter opens; competitor pressed state changes only evidence region. Desktop table caption/headers remain. No loading/error state. | Native disclosure instantaneous, no ambient effects. Reduced identical. |
| Testimonials | Two leading records in one snap row with 16 px gap, visible arrows, existing all-15 expander; quote visually ≤3 lines, intact full quotation in dialog. | ≥768 two records; ≥1024 three record gallery, one row. Head/lead stacked. | AutoRotate false only for TN; read button works by keyboard; dialog Escape/Tab/Shift+Tab + focus-return. All-reader filters/expander preserve records. Card pointer click duplicates button affordance. | Manual swipe only, no auto-scrolling/rotation. Reduced uses instant arrow scroll. |
| Value | Three timeline rows with single rule; no illustration box on each step. Free/save/Lá names and body explain progression once. | ≥880 three horizontal stages. | Informational, not buttons; no hover/disabled/loading state. | None; no falling leaves. |
| Empty-band fix | Exactly one outer-padding token each side; inner container 0. No spacer/min-height used to manufacture transition length. | Tokens 64/80 per side; short components use content height. | Measure from preceding content box bottom to next content box top, excluding sticky header and overlay canvas. FAQ expansion intentionally increases content height. | World duration follows measured section geometry, not inserted dead space. Reduced all chapters remain in document order. |
| FAQ | Single stacked heading, hub link, five ≥64 px question controls, q1 open by default; answers ≤30/35. | Same stacked header; body measure ≤64ch even on wide screens. | Expanded/controls + native hidden answers preserved; multiple opens remain allowed; focus stays on question. No added loading/error state. | Arrow feedback 180 ms; reduce none. |
| About/final | 180 px existing painted crop, compact colophon with ≤30-unit body; one final chart action on same chapter. | ≥880 crop/text small split with ≥240 px image; central final action after 48 px local gap. | About link and start link distinct intents; no fabricated audience metrics or new endorsements. | No bobbing lantern loop; static paint in reduced mode. |

Every animation has one rationale: landscape-to-chart scroll reveals the product metaphor; selection/focus feedback reveals state; native user-driven horizontal browsing reveals additional records/topics. Decorative loops that do not satisfy one of those rationales are removed. No GSAP/Motion/Tailwind install is required. Use existing Three.js, React state, native CSS and native details.

## Part G — Frontend code audit

### CSS architecture and specificity

The supplied TN stylesheet has **1,935 lines**, **214 qualified-rule blocks with .hv3 in their selector text**, **7 !important occurrences**, **6 min-width media queries**, and **no max-width media query**. Only one raw hex occurrence remains outside comments in that file, in the encoded decorative SVG; this is not a “raw hex everywhere in TN components” finding. The older HV sheet contains extensive raw skin primitives and a separate `html[data-theme="light"] .hv3` mapping (CSS/HV:3–56). TN is already largely mobile-base CSS; the defect is inherited geometry and skin ownership, not absence of mobile CSS.

- CSS/TN:24–27 and CSS/HV:72 establish competing vertical rhythm. Needs/Compare reset it at CSS/TN:943–949, Story at :475; other components do not. Live inner padding confirms exact winners.
- CSS/TN:1563–1568 adds a specific desktop grid after earlier .hv3-tt-head/.hv3-usp-head rules. Merely editing the base `.hv3-head` would not correct those headers.
- CSS/TN:1097–1099 uses a section token as an internal method-heading margin; :1892 uses it again inside final CTA. These reinflate gaps after an outer reset.
- CSS/TN:1372/:1487 use 16 px panels, while CSS/HV:109–110/382/449 contain different control/art/dialog radii. Fix by roles, not a global universal border-radius.
- TN/troi-nam-needs.tsx:89–105 ties assets to nth-child; HV/homepage-v3-needs.tsx selects semantic NEEDS.id. PR3 moves only identity selectors, keeps concern logic unchanged.
- TN/troi-nam-explore.tsx:24–28 also uses nth-child; current canonical branch rendering makes it valid today, but semantic data-palace-id is the next safe identity refactor. No guessed palace reordering is included.
- **Verified hidden/inactive current TN presentation:** CSS/TN:1078–1080 hides old detail img; :1492–1495 hides USP photo/scrim/icon; :1795–1808 replaces About picture with a pseudo plate. Their JSX is still rendered. These are overridden visual branches, not proof their resources or styles are globally dead.
- World readiness, selected/focused charts, gallery 768/1024 switching and dialogs use state-specific branches. Do not purge them because one screenshot does not show them. Static ring at CSS/TN:665–674 has opacity var(--tn-ring,0); whether that custom property is ever set must be checked before removal.

PR1–PR7 supply bounded corrections, PR8 removes only decoration branches made inactive by this plan. They are a migration layer, not the final claim of a fully native TN CSS architecture. One PR at a time can then extract stable visual components without duplicating form/concern logic. Do not rename every .hv3 class in one commit.

### Server and Client boundaries

`page.tsx:23–82` is an async Server Component. A client concern provider with server-rendered children does not automatically turn that whole page into a client component. `TroiNamWorldStage` is a justified client boundary: observer lifecycle, media, canvas and dynamic Three import. Hero/birth form, Explore, Needs, FAQ and gallery have interactive inner islands. Story/USP/Value/About wrappers mainly compose HTML/style/asset mappings; many are already server-capable.

TN/troi-nam-explore.tsx has `"use client"` but no hooks or browser use: it can be a server wrapper around the existing client Explore. TN/troi-nam-needs.tsx and TN/troi-nam-faq.tsx have browser-dependent reveal effects; removing those optional reveals permits server wrappers while retaining the interactive shared child. Their controls should be visible by default; observer-driven hiding is not needed for conversion. Keep birth-form hook and concern provider client-side.

### Three.js lifecycle and performance

- TN/troi-nam-world-stage.tsx:35–42 gates reduced motion, saveData and missing WebGL before importing the scene. Quality comes from pointer:coarse, not an actual benchmark; a mouse does not prove a strong GPU.
- :48–49 and :62–65 cap DPR **1.5 high / 1 low**, better than the requested maximum 2. TN/world/troi-nam-world-scene.ts also caps at 1.5. Stars allocate **1,200 high / 400 low** at TN/world/troi-nam-world-stars.ts:52. Gold fragment instance capacity is **40 / 15** and lantern count **8 / 5** in TN/world/troi-nam-world-particles.ts:15,31. Counts are source facts, not evidence of acceptable Android frame rate.
- :98–113 cancels in-flight init and disposes on a live reduced-motion change. It does not re-enable animation when preference is later disabled; retaining static mode for that session is safe and should be documented, not forced back on.
- :125–154 pauses for document visibility and whole-stage intersection, observes sticky/chart resize, and measures the moving chart target at progress cadence. Stage spans hero→Explore, so it remains active throughout those chapters. CSS comment :98–115 says hero photo remains opaque even while world runs behind it: profile the cost of drawing a scene the hero hides before making the renderer more complex.
- TN/world/troi-nam-world-scene.ts:dispose reverses resource disposal, releases textures/renderer/context; texture owner caches URLs, tracks a ready barrier and disposes. Runtime initialization checks cancellation both before allocation and after creation. Stage cleanup disconnects both observers, removes listeners and aborts pending work.
- TN/world/troi-nam-world-runtime.ts:38–44 downgrades after **frame interval >50 ms for 2 seconds**. It is a coarse <20 fps safeguard; it does not certify smooth 30/60 fps. Frame CPU duration exists in diagnostics, but that timing alone is not GPU cost.
- TN/world/troi-nam-world-scene.ts `loop` draws at scheduler cadence even if applyPose is not dirty; pose animation time is progress*60. PR7 adds a dirty draw guard. It intentionally retains one visible-stage rAF scheduling loop, so it does not claim zero idle CPU. Validate that no intended time-driven animation needs continuous draw before applying it.
- **Cloud test:** context creation failed because this browser's WebGL was disabled. The painting/static form/chart stayed accessible. Therefore lifecycle fallback is observed in this one failure mode; healthy GPU rendering, low tier, context loss, texture rejection and repeated mount disposal still need device tests.

### Images, loading and composition

Hero uses responsive picture sources, explicit dimensions, high fetch priority and async decode (TN/troi-nam-hero.tsx:74–85); preserve this. Dusk lacks lazy/low priority (:90–100), even though CSS only displays it at ≥880; PR7 changes its loading hints. Night already lazy (:105–117). Below-fold img markup mostly reserves dimensions and uses lazy. CSS background asset styles in Needs/Value/About do not have native lazy loading or srcSet; load should be audited with the network waterfall. Hidden img elements must not be assumed free. `sizes="(max-width:768px) 50vw,280px"` on legacy discipline images mismatches the old full-width phone cards and the proposed 80 px thumbnails; compact-specific sizes are included.

No claim is made about actual asset transfer bytes, decoded GPU texture memory, LCP element identity, unused chunk byte count, Lighthouse score or page field p75: none was captured by an appropriate profiler here.

### Accessibility, form and navigation

Hero date inputs have accessible labels, grouped calendar/gender controls, linked errors and focus-on-failure. Day/month labels currently rely on placeholder + group; once filled, persistent visible individual labels would improve discoverability, but that is separate from preserving input order. TN control overflow comes from nowrap buttons, not broken date validation.

Quote dialog has one close button, role/aria-modal, Escape and Tab containment (HV/homepage-v3-testimonials-section.tsx:167–190,327–338). A native modal or inert-background change is an optional future improvement after TalkBack/VoiceOver tests; do not claim the current background was made inert. FAQ hidden answers and aria-controls are correct. The 32 px plus icon is not itself the touch target; the ≥64 px parent button is.

Start-chart helper (HV/homepage-v3-go-wizard.tsx:7–12) scrolls the hero and focuses day after 450 ms; its onClick always prevented modified clicks. PR2 retains its destination, opens mobile disclosure and respects modified clicks. Anchor offset is unrelated to section spacing after PR1: 88 px, measured against the current fixed/sticky header. English locale return opens `/vi` though canonical `/`; PR6 normalises links without moving SEO metadata.

Do not regress existing remediation: date validation, reconciliation, local-draft preservation, concern transfer, sample link, next-step handoff note and footer contrast. No marketing-claim audit or legal research is part of this plan.

## Part H — Ordered execution plan and manual code

The following are **plain-text unified diffs**, one complete baseline-to-result diff per PR. Apply by hand in the stated order to the supplied snapshot, after checking the active branch's files have not diverged. This document contains no installer, shell script or repo-mutating tooling. Source paths are the actual stack's files; no Tailwind, new dependency, metadata source or asset set is introduced.

The patches were checked for textual applicability against a private copy of the supplied source and JSON validity and CSS block/string balance; this is not a Next.js build, browser visual test or deployed implementation. The ZIP does not supply a complete buildable repository/dependency graph. **After application, run the repository's required checks and the measurable acceptance tests below before claiming success.** Founder gates for the final composition/theme are listed in I; those decisions gate implementation, not this completed audit.

Highest impact/lowest risk first: rhythm/readability → hero → Needs → compare → gallery → copy/composition → runtime → retired decoration cleanup. Quote data, validation/payloads, route-registry metadata and existing asset binaries are excluded from every patch.

### PR1 — Rhythm, readable copy and control containment

Touch only `apps/web/src/styles/troi-nam.css`. Append the scoped correction once; PR8 removes retired decoration branches after the composition is approved. No shared page styles change.

Acceptance criteria:

- At 390 px every outer section uses 48 px top/bottom; inner .hv3-container uses 0 px. At 768/1024 those values are 64/80 px. Adjacent normal sections therefore have 96/128/160 px content gaps, not a sum of two systems.

- Canh giờ labels fit at 360/390/430 and in EN; no clipped glyphs or horizontal overflow. Targets and their labels are at least 44 px high; adjacent form controls have 8 px gaps.

- Actual painted-state text contrast is at least 4.5:1 across every background pose; large text at least 3:1. Capture patches as described in B; do not approve by token math alone.

- Reduced motion shows every reveal item and stops pseudo-element loops. No desktop CTA wraps. No split text-only section headers.

```diff
--- a/apps/web/src/styles/troi-nam.css
+++ b/apps/web/src/styles/troi-nam.css
@@ -1933,3 +1933,125 @@
   border-radius: 50%;
   object-fit: cover;
 }
+
+/* Audit PR1: outer section owns rhythm; inner containers own measure. */
+.tn {
+  --tn-section-y: 48px;
+  --tn-gutter: 20px;
+  --tn-text: var(--pearl-100, #eae4d5);
+  --tn-body-text: var(--pearl-200, #dcd4c3);
+  --tn-text-muted: var(--pearl-400, #a79e8b);
+  --tn-hair: var(--lacquer-line, #3a3227);
+  --tn-radius-control: 12px;
+  --tn-radius-panel: 16px;
+  --tn-h2: clamp(1.875rem, 1.4rem + 2vw, 3.5rem);
+  --tn-body: 1rem;
+  --tn-anchor-offset: 88px;
+  color-scheme: dark;
+}
+.tn .tn-section .hv3-container {
+  max-width: var(--tn-max);
+  margin-inline: auto;
+  padding: 0;
+}
+.tn .hv3 {
+  --action: var(--tn-gold-light);
+  --action-h: var(--tn-gold);
+  --action-t: var(--tn-ink);
+  --seg-bg: var(--tn-gold-light);
+  --seg-t: var(--tn-ink);
+}
+.tn .hv3-btn, .tn .hv3-cta, .tn .button,
+.tn .hv3-seg button, .tn .hv3-tabs button {
+  border-radius: var(--tn-radius-control);
+}
+.tn .hv3-form { border-radius: var(--tn-radius-panel); }
+.tn .tn-world-content .tn-section {
+  padding-inline: var(--tn-gutter);
+}
+.tn .tn-section [id], .tn [data-troi-nam-block] {
+  scroll-margin-top: var(--tn-anchor-offset);
+}
+.tn .tn-explore .hv3-chart-wrap { scroll-margin-top: var(--tn-anchor-offset); }
+.tn .tn-hero-sample-cta, .tn .hv3-tt-start,
+.tn .site-header .brand, .tn .desktop-nav a,
+.tn .locale-link, .tn .login-link, .tn .footer-group a,
+.tn .footer-support-email {
+  display: inline-flex;
+  align-items: center;
+  min-height: 44px;
+  min-width: 44px;
+}
+.tn .hv3-check { min-height: 44px; gap: 8px; }
+.tn .hv3-seg { gap: 8px; }
+.tn .tn-hero-form .hv3-seg button {
+  flex: 1 1 0;
+  min-width: 0;
+  min-height: 48px;
+  white-space: normal;
+  overflow-wrap: break-word;
+  padding: 8px;
+  line-height: 1.35;
+  border-radius: var(--tn-radius-control);
+}
+.tn .hv3-btn, .tn .hv3-cta { min-height: 48px; }
+.tn .hv3-eyebrow, .tn .hv3-mono, .tn .hv3-tt-label {
+  text-transform: none;
+  letter-spacing: normal;
+}
+.tn .tn-explore .hv3-eyebrow, .tn .tn-testimonials .hv3-eyebrow { display: none; }
+.tn .tn-testimonials .hv3-tt-head, .tn .tn-usp .hv3-usp-head {
+  display: block;
+}
+.tn .tn-testimonials .hv3-tt-lead, .tn .tn-usp .hv3-usp-lead { margin-top: 16px; }
+.tn .tn-usp .hv3-usp-head { padding-top: 0; }
+.tn .tn-explore .hv3-head, .tn .tn-story .hv3-story-copy {
+  position: relative;
+  isolation: isolate;
+  color: var(--tn-text);
+}
+.tn .tn-explore .hv3-head::before, .tn .tn-story .hv3-story-copy::before {
+  content: "";
+  position: absolute;
+  z-index: -1;
+  inset: -32px;
+  pointer-events: none;
+  background: linear-gradient(90deg, transparent,
+    rgb(15 13 10 / .86) 32px,
+    rgb(15 13 10 / .86) calc(100% - 32px), transparent);
+  mask-image: linear-gradient(180deg, transparent,
+    #000 32px, #000 calc(100% - 32px), transparent);
+}
+.tn .tn-explore .hv3-lead, .tn .tn-story .hv3-story-body {
+  color: var(--tn-body-text);
+  font-size: var(--tn-body);
+  line-height: 1.6;
+  max-width: 64ch;
+}
+/* A local, edge-free text scrim, never a rounded panel over the painting. */
+.tn .tn-explore .hv3-shortcuts {
+  padding: 8px;
+  background: rgb(15 13 10 / .86);
+  border-radius: var(--tn-radius-control);
+}
+@media (min-width: 768px) {
+  .tn { --tn-section-y: 64px; --tn-gutter: 32px; }
+}
+@media (min-width: 1024px) {
+  .tn { --tn-section-y: 80px; --tn-gutter: 48px; }
+  .tn .hv3-btn, .tn .hv3-cta { white-space: nowrap; }
+}
+@media (prefers-reduced-motion: reduce) {
+  .tn *, .tn *::before, .tn *::after {
+    animation: none !important;
+    transition: none !important;
+    scroll-behavior: auto !important;
+  }
+  .tn [data-need-reveal] .hv3-need,
+  .tn [data-reveal-ready] .hv3-disc-slot,
+  .tn [data-faq-reveal] .hv3-faq-item {
+    opacity: 1;
+    transform: none;
+  }
+}
+
```

### PR2 — Mobile hero: one visible path to the unchanged form

Files: troi-nam-hero.tsx; homepage-v3-go-wizard.tsx; messages/{vi,en}/troi-nam.json; troi-nam.css. The existing form stays mounted with the same hook, fields, field order, validators and submit handler. Only its mobile visibility changes. `tn:open-form` opens it before existing chapter CTAs focus the first field; initial #lap-la-so and native hash navigation also open it. No storage mutation is introduced.

Acceptance criteria:

- At 390×844 and 360×800 the free-chart button is entirely visible without scrolling; H1 has two lines and hero copy has four elements (H1, subline, primary action, sample link). EN also fits two lines.

- All eight legacy anchors still work; any chart-start link opens the form and focuses day. Modified clicks retain native behavior. At ≥880 px the form remains visible from SSR onward.

- Verify empty/invalid dates, exact time, branch time, unknown time, lunar leap month, gender, storage failure, restored draft, selected concern and wizard back behavior. Payloads and routes match baseline exactly.

- Opening is user initiated and introduces no auto-open layout shift. No second form, duplicate IDs, field reorder, hidden required input bypass or extra network submission.

```diff
--- a/apps/web/messages/en/troi-nam.json
+++ b/apps/web/messages/en/troi-nam.json
@@ -5,6 +5,7 @@
     "sub": "Every person is born as a star in the sky.",
     "plateAlt": "Dawn over the Trang An river, limestone karst in mist and a small wooden boat",
     "sampleCta": "View a sample reading",
-    "handoffNote": "Your details will be kept for the next step."
+    "handoffNote": "Your details will be kept for the next step.",
+    "startCta": "Start my free chart"
   }
 }
--- a/apps/web/messages/vi/troi-nam.json
+++ b/apps/web/messages/vi/troi-nam.json
@@ -5,6 +5,7 @@
     "sub": "Mỗi người được sinh ra đều là một vì sao trên bầu trời.",
     "plateAlt": "Bình minh trên sông nước Tràng An, núi đá vôi trong sương và một chiếc thuyền nhỏ",
     "sampleCta": "Xem bản luận giải mẫu",
-    "handoffNote": "Thông tin bạn nhập sẽ được giữ lại ở bước tiếp theo."
+    "handoffNote": "Thông tin bạn nhập sẽ được giữ lại ở bước tiếp theo.",
+    "startCta": "Lập lá số miễn phí"
   }
 }
--- a/apps/web/src/styles/troi-nam.css
+++ b/apps/web/src/styles/troi-nam.css
@@ -2055,3 +2055,37 @@
   }
 }
 
+
+/* Audit PR2: CSS is the responsive visibility authority, no SSR media guess. */
+.tn .tn-hero-content {
+  min-height: calc(100svh - 72px);
+  justify-content: flex-start;
+  padding-block: 32px;
+}
+.tn .tn-hero { min-height: calc(100svh - 72px); }
+.tn .tn-hero-title { font-size: clamp(2rem, 8vw, 2.5rem); max-width: 100%; }
+.tn .tn-hero-sub { font-family: var(--font-ui); font-size: 1rem; line-height: 1.5; }
+.tn .tn-hero-start {
+  display: flex; align-items: center; justify-content: center;
+  width: 100%; min-height: 52px; margin-top: 24px;
+  padding: 12px 16px; border: 0; border-radius: var(--tn-radius-control);
+  background: var(--tn-gold-light); color: var(--tn-ink);
+  font: 600 1rem/1.4 var(--font-ui); cursor: pointer;
+}
+.tn .tn-hero-start:hover { background: var(--tn-gold); }
+.tn .tn-hero-start:active { transform: translateY(1px); }
+.tn .tn-hero-start:focus-visible { outline: 2px solid var(--tn-gold-light); outline-offset: 4px; }
+.tn .tn-hero-form[data-open="false"] { display: none; }
+.tn .tn-hero-form[data-open="true"] { display: block; }
+.tn .tn-hero-sample-cta { margin-top: 8px; }
+.tn .tn-hero-title span { white-space: nowrap; }
+@media (min-width: 880px) {
+  .tn .tn-hero-content {
+    min-height: 100svh; align-items: center; justify-content: flex-start;
+    padding-block: 64px;
+  }
+  .tn .tn-hero-title { font-size: var(--tn-display); }
+  .tn .tn-hero-form[data-open] { display: block; }
+  .tn .tn-hero-start { display: none; }
+}
+
--- a/apps/web/src/features/troi-nam/troi-nam-hero.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-hero.tsx
@@ -1,6 +1,6 @@
 "use client";
 
-import { useEffect, useRef } from "react";
+import { useEffect, useRef, useState } from "react";
 import { useTranslations } from "next-intl";
 
 import {
@@ -19,6 +19,25 @@
 export function TroiNamHero({ locale }: { locale: "en" | "vi" }) {
   const t = useTranslations("troi-nam");
   const state = useHomepageV3BirthForm(locale);
+  const [formOpen, setFormOpen] = useState(false);
+  const [focusRequest, setFocusRequest] = useState(0);
+
+  useEffect(() => {
+    const root = sectionRef.current?.closest(".tn");
+    const open = () => { setFormOpen(true); setFocusRequest((n) => n + 1); };
+    const onHash = () => { if (window.location.hash === "#lap-la-so") open(); };
+    root?.addEventListener("tn:open-form", open);
+    window.addEventListener("hashchange", onHash);
+    onHash();
+    return () => {
+      root?.removeEventListener("tn:open-form", open);
+      window.removeEventListener("hashchange", onHash);
+    };
+  }, []);
+
+  useEffect(() => {
+    if (formOpen && focusRequest > 0) document.getElementById("hv3-day")?.focus();
+  }, [formOpen, focusRequest]);
   const desktop = troiNamAsset("L01");
   const mobile = troiNamAsset("L02");
   const dusk = troiNamAsset("L03");
@@ -130,6 +149,14 @@
               <span>{t("hero.h1b")}</span>
             </h1>
             <p className="tn-hero-sub">{t("hero.sub")}</p>
+            <noscript><style>{".tn .tn-hero-form[data-open] { display: block; } .tn .tn-hero-start { display: none; }"}</style>
+              <a href={localizedPath(locale, "/tao-la-so/tu-vi")}>{t("hero.startCta")}</a>
+            </noscript>
+            <button type="button" className="tn-hero-start"
+              aria-expanded={formOpen} aria-controls="tn-birth-form"
+              onClick={() => { setFormOpen(true); setFocusRequest((n) => n + 1); }}>
+              {t("hero.startCta")}
+            </button>
             {/* Visible without filling in the form — the audit's strongest trust gap was
                 marketing claims outrunning anything the visitor could actually see
                 (2026-10-01, F1/CXO). The sample report is real proof, not another adjective. */}
@@ -138,7 +165,7 @@
             </a>
           </div>
 
-          <div className="hv3 tn-hero-form">
+          <div id="tn-birth-form" className="hv3 tn-hero-form" data-open={formOpen ? "true" : "false"}>
             <HomepageV3BirthForm state={state} />
             {/* The hero submits into step 1 of a multi-step wizard, not an instant report
                 (2026-10-01 audit, F5) — the handoff note says so instead of implying otherwise. */}
--- a/apps/web/src/features/homepage-v3/homepage-v3-go-wizard.tsx
+++ b/apps/web/src/features/homepage-v3/homepage-v3-go-wizard.tsx
@@ -8,6 +8,7 @@
 export function scrollToHeroForm() {
   const target = document.getElementById("lap-la-so");
   if (!target) return;
+  target.closest(".tn")?.dispatchEvent(new Event("tn:open-form"));
   const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
   target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
   window.setTimeout(() => document.getElementById("hv3-day")?.focus({ preventScroll: true }), reduce ? 0 : 450);
@@ -31,6 +32,7 @@
 }) {
   const concernCtx = useHomepageV3Concern();
   function onClick(event: MouseEvent<HTMLAnchorElement>) {
+    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
     event.preventDefault();
     if (topConcern) concernCtx?.setTopConcern(topConcern);
     scrollToHeroForm();
```

### PR3 — Needs: reduce the largest mobile block first

Files: homepage-v3-needs.tsx; troi-nam-needs.tsx; troi-nam.css. Preserve selection/concern logic and the direct Kinh Dịch destination. Four 64 px choice rows, one 160 px selected image, one CTA; all five discipline links remain inside a native disclosure. Replace nth-child asset identity with data-need-id. Removing presentation-only observers lets the wrapper become a Server Component.

Acceptance criteria:

- At 390 px Needs is ≤1,050 px with disciplines closed and longest selected detail; ≤1,800 px with discipline disclosure expanded. No four stacked image cards. All four selections update the correct asset, copy and concern.

- Opening the native disclosure reaches all five discipline destinations by keyboard. The four non-Tử Vi methods do not acquire a chart-start CTA.

- Shared HomepageV3Needs without compact keeps its existing discipline content open and hides the extra summary; regression screenshot that consumer. Unknown persisted concerns are not reset on mount.

- At 360/390/430 longest VI/EN CTA fits, there is no horizontal overflow and text remains 16 px.

```diff
--- a/apps/web/src/styles/troi-nam.css
+++ b/apps/web/src/styles/troi-nam.css
@@ -2089,3 +2089,44 @@
   .tn .tn-hero-start { display: none; }
 }
 
+
+/* Audit PR3: compact choice rows plus one selected visual. */
+.tn .tn-needs .hv3-need-list { display: grid; grid-template-columns: 1fr; gap: 8px; }
+.tn .tn-needs .hv3-needs-body { gap: 24px; }
+.tn .tn-needs .hv3-need, .tn .tn-needs .hv3-need[aria-pressed="true"] {
+  min-height: 64px; padding: 12px 16px 12px 84px;
+  flex-direction: row; align-items: center; gap: 12px;
+  border-radius: var(--tn-radius-control);
+}
+.tn .tn-needs .hv3-need::before { inset: 8px auto 8px 8px; width: 60px; height: auto; border-radius: 8px; }
+.tn .tn-needs .hv3-need-icon, .tn .tn-needs .hv3-need-question { display: none; }
+.tn .tn-needs .hv3-need-title { font-size: 1rem; }
+.tn .tn-needs .hv3-need-detail { padding: 20px; border-radius: var(--tn-radius-panel); gap: 16px; }
+.tn .tn-needs .hv3-need-art { height: 160px; margin: -20px -20px 0; }
+.tn .tn-needs .hv3-need-actions { gap: 8px; }
+.tn .tn-needs .hv3-discipline-disclosure { margin-top: 24px; }
+.tn .tn-needs .hv3-discipline-disclosure summary {
+  min-height: 48px; padding-block: 12px; color: var(--tn-gold-light); cursor: pointer;
+}
+.tn .tn-needs .hv3-disciplines { grid-template-columns: 1fr; gap: 12px; margin-top: 16px; }
+.tn .tn-needs .hv3-disc-slot-flagship { grid-column: auto; }
+.tn .tn-needs .hv3-disc, .tn .tn-needs .hv3-disc-flagship {
+  flex-direction: row; min-height: 96px; border-radius: var(--tn-radius-control);
+}
+.tn .tn-needs .hv3-disc-art,
+.tn .tn-needs .hv3-disc-slot:not(.hv3-disc-slot-flagship) .hv3-disc-art,
+.tn .tn-needs .hv3-disc-flagship .hv3-disc-art {
+  flex: 0 0 80px; width: 80px; aspect-ratio: auto;
+  border: 0; border-right: 1px solid var(--tn-hair);
+}
+.tn .tn-needs .hv3-disc-body { padding: 12px; }
+.tn .tn-needs .hv3-disc-name, .tn .tn-needs .hv3-disc-name-lg { font-size: 1.125rem; }
+.tn .tn-needs .hv3-disc-body .hv3-mask { display: none; }
+.tn .tn-needs .hv3-disc-body .hv3-muted { font-size: 1rem; }
+.tn .tn-needs .hv3-disc-flagship-cta { min-height: 44px; padding: 8px 0; background: none; color: var(--tn-gold-light); }
+@media (min-width: 880px) {
+  .tn .tn-needs .hv3-needs-body { grid-template-columns: 1fr 1fr; align-items: start; }
+  .tn .tn-needs .hv3-need-list { grid-template-columns: 1fr; }
+  .tn .tn-needs .hv3-disciplines { grid-template-columns: 1fr 1fr; }
+}
+
--- a/apps/web/src/features/troi-nam/troi-nam-needs.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-needs.tsx
@@ -1,7 +1,3 @@
-"use client";
-
-import { useLayoutEffect, useRef } from "react";
-
 import { HomepageV3Needs } from "../homepage-v3/homepage-v3-needs";
 import { troiNamAsset } from "./troi-nam-assets";
 
@@ -15,98 +11,29 @@
     // Keep the original decision icon; the year icon would mislabel this CTA.
     { id: "decision", plate: troiNamAsset("S04"), icon: null },
   ];
-  const wrapRef = useRef<HTMLDivElement>(null);
-
-  // Runs before paint (not useEffect) so the very first render already shows
-  // the correct state: if the card row is already on screen at mount, reveal
-  // it immediately with no hide-then-show flash; otherwise hide instantly
-  // (no transition yet) and let the observer animate it in on scroll.
-  useLayoutEffect(() => {
-    const wrap = wrapRef.current;
-    const list = wrap?.querySelector<HTMLElement>(".hv3-need-list");
-    if (!wrap || !list) return;
-    if (typeof IntersectionObserver !== "function") return;
-    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
-
-    const rect = list.getBoundingClientRect();
-    if (rect.top < window.innerHeight && rect.bottom > 0) {
-      wrap.setAttribute("data-need-reveal", "in");
-      return;
-    }
-
-    wrap.setAttribute("data-need-reveal", "pending");
-    const observer = new IntersectionObserver(
-      (entries) => {
-        if (!entries[0]?.isIntersecting) return;
-        wrap.setAttribute("data-need-reveal", "in");
-        observer.disconnect();
-      },
-      { threshold: 0.2 },
-    );
-    observer.observe(list);
-    return () => observer.disconnect();
-  }, []);
-
-  // The discipline links below already carry `data-reveal` + `--i` (set by
-  // the shared HomepageV3Needs for the older homepage's HomepageV3Motion
-  // system), but that system isn't mounted here, so those attributes
-  // currently do nothing. This reveals the same markup directly instead of
-  // introducing a second, parallel attribute scheme, and stays
-  // forward-compatible if HomepageV3Motion is ever mounted here too.
-  useLayoutEffect(() => {
-    const wrap = wrapRef.current;
-    const slots = wrap ? Array.from(wrap.querySelectorAll<HTMLElement>(".hv3-disc-slot[data-reveal]")) : [];
-    if (!wrap || slots.length === 0) return;
-    if (typeof IntersectionObserver !== "function") return;
-    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
-
-    wrap.setAttribute("data-reveal-ready", "");
-    const viewportHeight = window.innerHeight;
-    const pending: HTMLElement[] = [];
-    for (const slot of slots) {
-      const rect = slot.getBoundingClientRect();
-      if (rect.top < viewportHeight && rect.bottom > 0) slot.setAttribute("data-in", "");
-      else pending.push(slot);
-    }
-    if (pending.length === 0) return;
-
-    const observer = new IntersectionObserver(
-      (entries) => {
-        for (const entry of entries) {
-          if (!entry.isIntersecting) continue;
-          entry.target.setAttribute("data-in", "");
-          observer.unobserve(entry.target);
-        }
-      },
-      { threshold: 0.1 },
-    );
-    pending.forEach((slot) => observer.observe(slot));
-    return () => observer.disconnect();
-  }, []);
-
   return (
-    <div className="hv3 tn-needs" id="nhu-cau" ref={wrapRef}>
-      {assets.map((asset, index) => (
+    <div className="hv3 tn-needs" id="nhu-cau">
+      {assets.map((asset) => (
         <style key={asset.id}>
           {`
-            .tn .tn-needs .hv3-need:nth-child(${index + 1})::before {
+            .tn .tn-needs .hv3-need[data-need-id="${asset.id}"]::before {
               background-image: url("${asset.plate.src}");
             }
-            .tn .tn-needs:has(.hv3-need:nth-child(${index + 1})[aria-pressed="true"]) .hv3-need-art {
+            .tn .tn-needs:has(.hv3-need[data-need-id="${asset.id}"][aria-pressed="true"]) .hv3-need-art {
               background-image: url("${asset.plate.src}");
             }
             ${asset.icon ? `
-              .tn .tn-needs .hv3-need:nth-child(${index + 1}) .hv3-need-icon {
+              .tn .tn-needs .hv3-need[data-need-id="${asset.id}"] .hv3-need-icon {
                 background-image: url("${asset.icon.src}");
               }
-              .tn .tn-needs .hv3-need:nth-child(${index + 1}) .hv3-need-icon img {
+              .tn .tn-needs .hv3-need[data-need-id="${asset.id}"] .hv3-need-icon img {
                 display: none;
               }
             ` : ""}
           `}
         </style>
       ))}
-      <HomepageV3Needs locale={locale} />
+      <HomepageV3Needs locale={locale} compact />
     </div>
   );
 }
--- a/apps/web/src/features/homepage-v3/homepage-v3-needs.tsx
+++ b/apps/web/src/features/homepage-v3/homepage-v3-needs.tsx
@@ -15,7 +15,7 @@
   decision: "/images/lasoviet/v11/son-mai-nga-re-quyet-dinh-homepage.webp",
 } as const;
 
-export function HomepageV3Needs({ locale }: { locale: "en" | "vi" }) {
+export function HomepageV3Needs({ locale, compact = false }: { locale: "en" | "vi"; compact?: boolean }) {
   const t = useTranslations("homepage-v3.needs");
   const [active, setActive] = useState(0);
   const concernCtx = useHomepageV3Concern();
@@ -46,7 +46,7 @@
       <div className="hv3-needs-body">
         <div role="group" aria-label={t("groupLabel")} className="hv3-need-list">
           {NEEDS.map((item, index) => (
-            <button key={item.id} type="button" className="hv3-need" aria-pressed={active === index} onClick={() => selectNeed(index)}>
+            <button key={item.id} type="button" className="hv3-need" data-need-id={item.id} aria-pressed={active === index} onClick={() => selectNeed(index)}>
               <span className="hv3-need-icon">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={`${HOMEPAGE_V3_IMAGE_ROOT}/${item.icon}`} alt="" width={34} height={34} />
@@ -83,7 +83,9 @@
         </div>
       </div>
 
-      <div id="bo-mon" className="hv3-lens-head">
+      <details className="hv3-discipline-disclosure" open={compact ? undefined : true}>
+      <summary id="bo-mon" hidden={!compact}>{t("lensTitle")}</summary>
+      <div className="hv3-lens-head" hidden={compact}>
         <h3 className="hv3-h3">{t("lensTitle")}</h3>
         <p className="hv3-lead">{t("lensLead")}</p>
       </div>
@@ -137,6 +139,7 @@
           </div>
         ))}
       </div>
+      </details>
     </div>
   );
 }
```

### PR4 — Comparison: summary first, complete evidence on demand

Files: troi-nam-compare.tsx; troi-nam.css. Stop passing defaultOpen; existing table, competitor controls, one strength and five limitations remain intact. Remove the texture rectangle and nested surfaces. On phones the disclosed view is per-competitor rows with Lá Số Việt fixes; the existing semantic desktop table is retained at 1180 px.

Acceptance criteria:

- On initial load compare disclosure is closed on VI/EN, phone and desktop. All 24 data cells and six row headers remain available when opened; each competitor retains one positive and five negative criteria.

- Zero inset texture rectangle; header, benefits and matrix share one canvas. No double border on every row, no separate card background per criterion, no per-cell left shadow.

- At 390 px disclosed longest competitor view is readable without page-level horizontal overflow. At 1440 px matrix body is 16 px with 1.5 line-height; caption, scope and headers remain accessible.

- Keyboard opens/closes summary; competitor choice announces only changed content. Height budget for closed proof chapter including USP after PR6 is ≤1,100 px.

```diff
--- a/apps/web/src/styles/troi-nam.css
+++ b/apps/web/src/styles/troi-nam.css
@@ -2130,3 +2130,42 @@
   .tn .tn-needs .hv3-disciplines { grid-template-columns: 1fr 1fr; }
 }
 
+
+/* Audit PR4: one canvas; benefits before a closed native disclosure. */
+.tn .tn-compare-texture { display: none; }
+.tn .tn-compare .hv3-compare-head {
+  padding: 0; background: transparent; border: 0; border-radius: 0;
+}
+.tn .tn-compare .hv3-compare-points { gap: 16px; margin-block: 24px; }
+.tn .tn-compare .hv3-compare-points span {
+  display: flex; align-items: center; gap: 16px; padding: 0;
+  min-height: 56px; background: transparent; border: 0; border-radius: 0;
+}
+.tn .tn-compare .hv3-compare-details { border: 0; padding: 0; }
+.tn .tn-compare .hv3-compare-details > summary { min-height: 48px; padding: 12px 0; cursor: pointer; }
+.tn .tn-compare .hv3-tabs { gap: 8px; }
+.tn .tn-compare .hv3-tabs button { min-height: 48px; min-width: 0; padding: 8px 12px; font-size: 1rem; }
+.tn .tn-compare .hv3-cmp-card {
+  background: transparent; border: 0; border-bottom: 1px solid var(--tn-hair);
+  border-radius: 0; padding: 16px 0;
+}
+.tn .tn-compare .hv3-cmp-top { border-top: 2px solid var(--tn-gold); }
+.tn .tn-compare .hv3-cmp-fix { border: 0; padding-top: 8px; }
+.tn .tn-compare .hv3-cmp-card p,
+.tn .tn-compare .hv3-cmp-card .hv3-cmp-axis,
+.tn .tn-compare .hv3-cmp-card .hv3-cmp-fix { font-size: 1rem !important; line-height: 1.5; }
+.tn .tn-compare .hv3-compare-table { border-collapse: collapse; table-layout: fixed; }
+.tn .tn-compare .hv3-compare-table th,
+.tn .tn-compare .hv3-compare-table td {
+  padding: 16px 12px; font-size: 1rem; line-height: 1.5; vertical-align: top;
+  border: 0; border-bottom: 1px solid var(--tn-hair); overflow-wrap: normal;
+  color: var(--tn-body-text);
+}
+.tn .tn-compare .hv3-compare-table [data-col="lsv"] {
+  background: rgb(201 164 77 / .06); box-shadow: none; color: var(--tn-text);
+}
+.tn .tn-compare .hv3-compare-table thead [data-col="lsv"] { border-top: 2px solid var(--tn-gold); }
+@media (min-width: 880px) {
+  .tn .tn-compare .hv3-compare-points { grid-template-columns: repeat(3, minmax(0, 1fr)); }
+}
+
--- a/apps/web/src/features/troi-nam/troi-nam-compare.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-compare.tsx
@@ -24,7 +24,7 @@
         loading="lazy"
         decoding="async"
       />
-      <HomepageV3Compare lead={LEAD[locale]} defaultOpen />
+      <HomepageV3Compare lead={LEAD[locale]} />
     </div>
   );
 }
```

### PR5 — Reader proof: calm gallery, unchanged quotes

Files: homepage-v3-testimonials-section.tsx; troi-nam-testimonials.tsx; troi-nam.css. Add optional compact/static presentation only for Trời Nam. Keep all 15 records, AVATARS, excerpt strings, full quotes, names, locations and lang="vi" unchanged. Desktop shows three cards, tablet two, phone retains the 16 px snap row and arrow geometry with two cards; all 15 remain behind the existing expander.

Acceptance criteria:

- No automatic rotation on this homepage; shared default autoRotate remains true. Two mobile cards in one row, three desktop cards, maximum three painted lines per card, all 15 reachable through the expander and full text reachable in dialogs.

- Keyboard opens full quote, Escape closes, focus returns to the invoking read button; test Tab and Shift+Tab. Full quote and attribution exactly match baseline bytes.

- At 390 px Testimonials is ≤650 px by default; expanded all-reader list is excluded from default page-height budget but must remain usable.

- No edits to homepage-v3-testimonials.ts, no new portraits and no quote wording changes.

```diff
--- a/apps/web/src/styles/troi-nam.css
+++ b/apps/web/src/styles/troi-nam.css
@@ -2169,3 +2169,24 @@
   .tn .tn-compare .hv3-compare-points { grid-template-columns: repeat(3, minmax(0, 1fr)); }
 }
 
+
+/* Audit PR5: fixed gallery with intact text in the detail dialog. */
+.tn .tn-testimonials .hv3-tt-card { min-height: 0; padding: 20px; border-radius: var(--tn-radius-panel); }
+.tn .tn-testimonials .hv3-tt-quote {
+  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3;
+  overflow: hidden; line-height: 1.6; min-height: 4.8em;
+}
+.tn .tn-testimonials .hv3-tt-foot { margin-top: 20px; }
+.tn .tn-testimonials .hv3-tt-label,
+.tn .tn-testimonials .hv3-tt-name,
+.tn .tn-testimonials .hv3-tt-read { font-size: 1rem; }
+.tn .tn-testimonials .hv3-tt-city { font-size: .875rem; }
+.tn .tn-testimonials .hv3-tt-row { gap: 16px; }
+.tn .tn-testimonials .hv3-tt-dialog { border-radius: var(--tn-radius-panel); }
+@media (min-width: 768px) {
+  .tn .tn-testimonials [data-compact="true"] .hv3-tt-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
+}
+@media (min-width: 1024px) {
+  .tn .tn-testimonials [data-compact="true"] .hv3-tt-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
+}
+
--- a/apps/web/src/features/troi-nam/troi-nam-testimonials.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-testimonials.tsx
@@ -23,7 +23,7 @@
 export function TroiNamTestimonials() {
   return (
     <div className="hv3 tn-testimonials">
-      <HomepageV3Testimonials avatars={AVATARS} />
+      <HomepageV3Testimonials avatars={AVATARS} compact autoRotate={false} />
     </div>
   );
 }
--- a/apps/web/src/features/homepage-v3/homepage-v3-testimonials-section.tsx
+++ b/apps/web/src/features/homepage-v3/homepage-v3-testimonials-section.tsx
@@ -66,8 +66,10 @@
  * 15 quotes gets shown. Mobile gets one swipeable row of all 15. Reader quotes stay in Vietnamese
  * on both locales, so quote and attribution carry lang="vi".
  */
-export function HomepageV3Testimonials({ avatars }: {
+export function HomepageV3Testimonials({ avatars, compact = false, autoRotate = true }: {
   avatars?: Readonly<Record<string, { src: string; srcSet?: string; width?: number; height?: number }>>;
+  compact?: boolean;
+  autoRotate?: boolean;
 }) {
   const t = useTranslations("homepage-v3.testimonials");
   const [expanded, setExpanded] = useState(false);
@@ -82,9 +84,9 @@
   const mobile = useMedia("(max-width: 767px)", false);
   const wide = useMedia("(min-width: 1024px)", true);
   const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => true);
-  const slotCount = wide ? 6 : 4;
-
-  const [rotation, setRotation] = useState<RotationState>(() => createRotation(ROTATION_QUEUE, 6));
+  const slotCount = compact ? (wide ? 3 : 2) : (wide ? 6 : 4);
+
+  const [rotation, setRotation] = useState<RotationState>(() => createRotation(ROTATION_QUEUE, compact ? 3 : 6));
   const [setGridNode, gridInView] = useInView<HTMLDivElement>(0.35);
   const [setRowNode, rowInView] = useInView<HTMLDivElement>(0.5);
   const rowRef = useRef<HTMLDivElement | null>(null);
@@ -92,13 +94,13 @@
   const returnFocus = useRef<HTMLElement | null>(null);
 
   // Tablet shows four slots; rebuild the rotation when the breakpoint changes.
-  const [builtFor, setBuiltFor] = useState(6);
+  const [builtFor, setBuiltFor] = useState(compact ? 3 : 6);
   if (builtFor !== slotCount) {
     setBuiltFor(slotCount);
     setRotation(createRotation(ROTATION_QUEUE, slotCount));
   }
 
-  const blocked = reduced || paused || hovered || Boolean(openId) || expanded || !pageVisible;
+  const blocked = !autoRotate || reduced || paused || hovered || Boolean(openId) || expanded || !pageVisible;
   const gridRunning = !mobile && gridInView && !blocked;
   const rowRunning = mobile && rowInView && !rowTouched && !blocked;
 
@@ -245,10 +247,10 @@
     );
   }
 
-  const showPause = !reduced && !expanded;
+  const showPause = autoRotate && !reduced && !expanded;
 
   return (
-    <div className="hv3-container hv3-tt">
+    <div className="hv3-container hv3-tt" data-compact={compact ? "true" : undefined}>
       <div className="hv3-tt-head">
         <div>
           <p className="hv3-eyebrow">{t("eyebrow")}</p>
@@ -283,7 +285,7 @@
           onPointerDown={() => setRowTouched(true)}
           onWheel={() => setRowTouched(true)}
         >
-          {QUEUE_ITEMS.map((item, index) => card(item, "row", index))}
+          {(compact ? slots : QUEUE_ITEMS).map((item, index) => card(item, "row", index))}
         </div>
         <div className="hv3-tt-arrows">
           <button type="button" aria-label={t("prev")} onClick={() => scrollRow(-1)}>←</button>
```

### PR6 — Copy density and nine-chapter composition

Files: messages/{vi,en}/homepage-v3.json and troi-nam.json; page.tsx; site-header.tsx; troi-nam-compare.tsx; troi-nam-ticker.tsx; troi-nam.css. Part D is the complete string decision sheet. Merge ticker into Story and USP into Compare, keep all eight required IDs, make topic ribbon static, shorten marketing only, and standardise chart-start intent. Keep submit as “Tiếp tục lập lá số” because it proceeds to the wizard. No metadata edits.

Acceptance criteria:

- Default mobile page including header/footer is 8,440–10,128 px (10–12 screens of 844 px), hard ceiling 10,128 px. Measure after fonts load, one default FAQ answer open, disclosures closed, mobile form collapsed. Expanded form ≤10,950 px. These are release targets, not measured outcomes.

- Main default accessible copy ≤1,100 whitespace-delimited units. For expanded method, quote and comparison content use the distinct-copy budget in C; do not count CSS-clipped whole text as reduced DOM words.

- Nine top-level blocks, eight unique required anchors, at least four layout families, no repeated section family. No missing direct Kinh Dịch link or method destinations.

- At most four uppercase marketing microlabels. Zero em/en dash separators in marketing copy; unchanged real quotes remain an explicit exception pending founder approval. One chart-start label per locale.

- English source does not reuse Vietnamese marketing strings; real quotes keep lang="vi". Check VI/EN, empty state and disclosure states at all six prescribed widths.

```diff
--- a/apps/web/messages/en/homepage-v3.json
+++ b/apps/web/messages/en/homepage-v3.json
@@ -13,8 +13,8 @@
     "year": "Year",
     "leap": "Leap month",
     "timeLabel": "Birth time",
-    "modeExact": "I know the exact time",
-    "modeBranch": "I know the time range (shichen)",
+    "modeExact": "Exact time",
+    "modeBranch": "Two-hour window",
     "hourSr": "Birth hour, 00 to 23",
     "minuteSr": "Birth minute, 00 to 59",
     "branchSr": "Birth time range",
@@ -48,12 +48,12 @@
     "close": "Collapse the chart"
   },
   "story": {
-    "title": "Some questions just won't stop nagging at you...",
-    "body": "They visit in the sleepless hours of the night, slip in with the crowd on the way home, or surface in the middle of what seemed like a calm meeting. In the middle of all that, what you need is not a verdict or an empty promise—it is a view deep enough to see the real cause and step forward with confidence.",
-    "q1": "When will fortune finally meet my effort?",
-    "q2": "Why do I keep repeating the same mistake in love?",
-    "q3": "Is the work I'm doing right now actually right for me?",
-    "q4": "What was I really put on this earth to do?"
+    "title": "What are you trying to understand?",
+    "body": "Work, love or a turning point: your chart reveals the roots and helps you choose your next step.",
+    "q1": "When will my fortune change?",
+    "q2": "Why do my relationships repeat?",
+    "q3": "Which work suits me?",
+    "q4": "What are my strengths?"
   },
   "ticker": {
     "label": "Every piece of your life is waiting to be opened",
@@ -68,8 +68,8 @@
   },
   "explore": {
     "eyebrow": "Explore the 12 palaces",
-    "title": "One chart. Twelve folds of a life.",
-    "lead": "Don't let unfamiliar terms hold you back. Start with the Life palace to understand your nature, then move on to Career, Wealth or Spouse. You'll see that no event in your life ever stood alone—each one is woven into and held up by the others.",
+    "title": "Twelve palaces. One life.",
+    "lead": "Tap a palace to see how character, career, money and relationships connect in one chart.",
     "shortcutsLabel": "Palaces most people open first",
     "mobileHint": "Tap the grid to open the other 8 palaces.",
     "chartLabel": "12 palaces",
@@ -78,9 +78,9 @@
     "palacePrefix": "Palace of",
     "trine": "Trine",
     "opposite": "Opposite (facing palace)",
-    "cycles": "Beyond the 12 still palaces there is the rhythm of time itself: a ten-year cycle that reshapes a decade, an annual cycle that tests each year.",
-    "cta": "Build a chart to see your own life",
-    "sample": "Try a full sample chart →"
+    "cycles": "Major periods cover ten years. Annual periods reveal each year’s fortune.",
+    "cta": "Start my free chart",
+    "sample": "View a sample reading"
   },
   "palaces": {
     "menh": {
@@ -145,23 +145,23 @@
     }
   },
   "needs": {
-    "title": "What's weighing on you the most today?",
-    "lead": "A half-made decision to change direction. A relationship you can't quite let go of, or hold onto either. Or simply yourself, feeling unsteady after years of pushing forward.",
+    "title": "What is on your mind?",
+    "lead": "Choose what you want to understand. Your reading starts there.",
     "groupLabel": "What you want to understand",
     "items": {
       "self": {
-        "title": "Understand yourself",
+        "title": "Understand myself",
         "question": "Where am I truly strong? Why do I keep hesitating and missing out at the important turning points?",
-        "path": "Look through the Life palace and the Body palace to see your true footing, your inner anchor, and the psychological knots you've never quite named.",
-        "cta": "Discover your core self",
+        "path": "Life and Body palaces reveal your strengths, inner resources and recurring patterns.",
+        "cta": "Start my free chart",
         "c1": "Life",
         "c2": "Body"
       },
       "work": {
-        "title": "Career & money",
+        "title": "Work and money",
         "question": "Should I quit and start over? Is this the stage to push hard, or to hold back and wait for the right time?",
-        "path": "The Career palace shows how you work and where you thrive; the Wealth palace reveals your cash flow; the ten-year cycle shows the rise and fall so you can move at the right moment.",
-        "cta": "See your career fortune",
+        "path": "Career reveals your working path. Wealth reveals money patterns. Major periods show when to act.",
+        "cta": "Start my free chart",
         "secondary": "Or explore BaZi",
         "c1": "Career",
         "c2": "Wealth",
@@ -170,53 +170,53 @@
       "love": {
         "title": "Relationships",
         "question": "Why do I keep running into the same pattern that hurts me? What kind of person is truly my safe harbor?",
-        "path": "Read the Spouse palace alongside the Life palace to uncover the type of person you fall for, and how to resolve conflict at its root.",
-        "cta": "See your love fortune",
+        "path": "Spouse and Life palaces reveal attraction patterns and ways to resolve conflict.",
+        "cta": "Start my free chart",
         "secondary": "Or explore Astrology",
         "c1": "Spouse",
         "c2": "Life"
       },
       "decision": {
-        "title": "A decision right in front of you",
+        "title": "A decision ahead",
         "question": "Standing at a fork in the road: sign this contract, accept this trip, or take a step back?",
-        "path": "When you need guidance for one specific moment, the wisdom of the I Ching helps you read the times: whether to act decisively or hold steady.",
+        "path": "The I Ching reads the timing of a specific situation: move forward or hold back.",
         "cta": "Consult the I Ching",
         "c1": "I Ching"
       }
     },
-    "lensTitle": "Each discipline, a clear lens of its own.",
+    "lensTitle": "Explore the traditions",
     "lensLead": "Zi Wei helps you read the whole picture of your life. When you want a wider view for a specific situation, explore these other refined ancient disciplines.",
     "disciplines": {
       "tuvi": {
         "name": "Zi Wei Dou Shu",
-        "desc": "A map of 12 palaces and over 100 stars, fully decoding your character, relationships and every turning point in life.",
+        "desc": "Twelve palaces and over 100 stars reveal character, relationships and life’s turning points.",
         "cta": "Explore Zi Wei"
       },
       "batu": {
         "name": "BaZi (Four Pillars)",
-        "desc": "Four pillars—Year, Month, Day, Hour—reading the balance of yin and yang and the rise and fall of the five elements.",
+        "desc": "Four birth pillars reveal yin, yang and the cycles of the five elements.",
         "cta": "Explore BaZi"
       },
       "chiemtinh": {
         "name": "Western Astrology",
-        "desc": "Where the stars stood at the moment you were born, read through the 12 zodiac signs to reveal your inner world and unconscious potential.",
+        "desc": "Twelve zodiac signs reveal your inner world and potential from the moment of birth.",
         "cta": "Explore Astrology"
       },
       "kinhdich": {
         "name": "I Ching",
-        "desc": "The wisdom of timing through 64 hexagrams, illuminating the nature of change and suggesting how to act in a specific situation.",
+        "desc": "Sixty-four hexagrams reveal timing and how to respond to a specific situation.",
         "cta": "Explore the I Ching"
       },
       "thansohoc": {
         "name": "Numerology",
-        "desc": "Discover the vibration frequency of your name and birth date, and the rhythm of your personal-year cycles.",
+        "desc": "Your name, birth date and personal-year cycles reveal the rhythm of your life.",
         "cta": "Explore Numerology"
       }
     }
   },
   "compare": {
-    "title": "Speed or a conversation? What will truly stay with you?",
-    "lead": "General horoscope sites offer speed. AI chatbots offer flexibility. Meeting a master offers a listening ear. Lá Số Việt provides an accurate, grounded destiny map that stays with you for life.",
+    "title": "Why choose Lá Số Việt?",
+    "lead": "An accurate chart. Readings with clear foundations. A lifelong companion.",
     "tableLabel": "One key advantage and practical limits of each approach",
     "groupLabel": "The options you are considering",
     "colLsv": "Lá Số Việt",
@@ -227,52 +227,52 @@
     "tabWeb": "Horoscope sites",
     "tabAi": "Asking an AI",
     "tabThay": "Meeting a master",
-    "cardTitle": "What makes {name} worth choosing?",
+    "cardTitle": "{name}: the key strength",
     "fixLabel": "At Lá Số Việt:",
-    "ctaDesktop": "Create my chart →",
-    "cta": "Start with my chart →",
+    "ctaDesktop": "Start my free chart",
+    "cta": "Start my free chart",
     "rows": {
       "strength": {
         "k": "Key advantage",
-        "lsv": "Accurate destiny map, deeply personalized and permanently stored for life.",
-        "web": "Free lookup, returning a raw chart and automated reading instantly.",
-        "ai": "Flexible 24/7 Q&A in natural prose, responding instantly to any prompt.",
-        "thay": "Live 1-on-1 dialogue, offering immediate listening and emotional relief."
+        "lsv": "Accurate charts, deep personalisation and lifelong storage.",
+        "web": "Free lookup with instant charts and readings.",
+        "ai": "Natural, flexible conversation, available 24/7.",
+        "thay": "Face-to-face conversation and immediate personal attention."
       },
       "own": {
         "k": "Personalization",
-        "lsv": "Exact calculation down to the minute; unravels your exact current focus.",
-        "web": "Template text; different people with the same stars get identical readings.",
-        "ai": "Relies entirely on user prompts; easily biased by user framing.",
-        "thay": "Heavily depends on the individual reader's subjective mood and bias."
+        "lsv": "Precise star placement by birth minute; readings focused on your concern.",
+        "web": "Preset text gives people with the same stars the same reading.",
+        "ai": "Depends on your prompt and can follow your biases.",
+        "thay": "Depends on the reader’s experience, mood and personal judgement."
       },
       "basis": {
         "k": "Academic basis",
-        "lsv": "100% transparent logic. Every insight links back to its exact palace and star.",
-        "web": "Unverified generic data; drops vague predictions causing unnecessary anxiety.",
-        "ai": "Prone to AI hallucinations—misplacing stars while sounding confident.",
-        "thay": "Spoken advice lacks standardized logic, making verification difficult."
+        "lsv": "Complete transparency, with each star and palace available for comparison.",
+        "web": "Unverified data and vague predictions create confusion.",
+        "ai": "Can place stars incorrectly while still answering confidently.",
+        "thay": "Oral traditions lack standardisation and are difficult to verify."
       },
       "links": {
         "k": "Holistic picture",
-        "lsv": "Interactive chart: tap a palace to see trine and opposite links instantly.",
-        "web": "Fragmented claims; contradictory statements force you to guess.",
-        "ai": "Isolated prompts drift away from overall 12-palace consistency.",
-        "thay": "Spoken words fade quickly, making complex palace links hard to visualize."
+        "lsv": "Tap one palace to see its trine and opposition relationships.",
+        "web": "Fragmented palaces leave you to reconcile contradictory readings.",
+        "ai": "Each question gives a fragment without a coherent overall picture.",
+        "thay": "Spoken readings make the full twelve-palace picture difficult to see."
       },
       "return": {
         "k": "Consistency & Objectivity",
-        "lsv": "100% objective and consistent; standardized data eliminates all personal bias.",
-        "web": "Unstable info; lookups yield conflicting readings across different visits.",
-        "ai": "Lacks consistency; asking again yields conflicting and shifting responses.",
-        "thay": "Lacks uniformity; different masters give contradictory readings for the same chart."
+        "lsv": "Absolute objectivity and consistency; subjective judgement is eliminated.",
+        "web": "Lookup articles are inconsistent and contradict one another.",
+        "ai": "Asking again can produce a contradictory answer.",
+        "thay": "Different readers can interpret the same chart differently."
       },
       "depth": {
         "k": "Cost & Ethics",
-        "lsv": "Free base access; open deeper sections as needed with clear upfront pricing.",
-        "web": "Cluttered with popup ads; rigid one-size-fits-all paid articles.",
-        "ai": "Monthly subscriptions required; you absorb the risk of accuracy.",
-        "thay": "Costly session fees ($20-$100+); appointment queues limit follow-ups."
+        "lsv": "Start free, then unlock the depth you need at a clear cost.",
+        "web": "Heavy advertising and rigid readings with unnecessary content.",
+        "ai": "Subscription costs leave you responsible for checking the answers.",
+        "thay": "High fees and difficulty scheduling follow-up questions."
       }
     }
   },
@@ -280,12 +280,12 @@
     "eyebrow": "Honest words from readers",
     "titleA": "What stays with you",
     "titleB": "after being truly seen.",
-    "lead": "Everyone who comes to Lá Số Việt carries a different worry. But everyone leaves carrying something to hold onto.",
+    "lead": "What readers take with them after exploring their charts.",
     "readFull": "Read in full ↗",
     "readFullAria": "Read the full note from {name}",
     "more": "See more notes from readers ↓",
     "less": "Show fewer notes ↑",
-    "start": "Start with your own chart ↗",
+    "start": "Start my free chart",
     "filterLabel": "Filter notes by topic",
     "filterAll": "All",
     "group": {
@@ -307,77 +307,77 @@
     "rotationLabel": "Notes from readers, changing automatically every few seconds"
   },
   "usp": {
-    "title": "The deeper you look, the more clearly you see yourself in it.",
-    "lead": "A true chart never ends with a few shallow verdicts. It is a journey of peeling back every layer of causation, understanding every thread that binds you, so that whenever you feel unsteady, you always have a place to return to and see clearly.",
+    "title": "Read deeper into your own chart",
+    "lead": "Classical texts, your birth moment and palace relationships form a reading that is yours alone.",
     "n1": {
-      "title": "Built on the wisdom of the old texts.",
-      "body": "Every reading is distilled from authentic Eastern methods, structured layer by layer so every line has a clear origin—never a vague or arbitrary guess."
+      "title": "Rooted in classical texts",
+      "body": "Authentic traditions are clearly organised. Every interpretation has a foundation, with no baseless speculation."
     },
     "n2": {
-      "title": "It begins with you.",
-      "body": "The moment you drew your first breath shaped your destiny map. But what's on your mind right now is the key that opens the story."
+      "title": "Starting with you",
+      "body": "Your birth details build the chart. Your present concern guides the reading."
     },
     "n3": {
-      "title": "A living web of connections.",
-      "body": "Tap a palace and watch its trine, half-trine and opposite links light up at once. The twelve palaces are never isolated—they tell one single story about your life.",
-      "link": "Try touching a chart →"
+      "title": "See the connections",
+      "body": "Trines, paired relationships and oppositions become visible. Twelve palaces tell your story together.",
+      "link": "Explore the twelve palaces"
     },
     "n4": {
-      "title": "Move through it at your own pace.",
-      "body": "Career, love, or the fortune of the year ahead: you're fully in control of the journey, seeing exactly what each part offers and costs before you decide to open it."
+      "title": "Choose the depth you need",
+      "body": "Career, love or yearly fortune: unlock what you need, with value and cost clear before you read."
     }
   },
   "value": {
-    "title": "Understand a part of it first. Go deeper once your heart is sure.",
-    "lead": "You can start completely free by building your chart and reading the most essential insights about yourself. When you find it useful and want to keep it, sign in to save. The deeper layers of interpretation only open when you truly need them, using Lá, with pricing that is transparent down to the last figure.",
+    "title": "Start free. Go deeper with Lá.",
+    "lead": "See your chart and core insights free. Sign in to save it. Use Lá to read deeper.",
     "s1": {
-      "title": "Step 1: Experience the full chart",
-      "body": "See your complete 12-palace chart, accurately calculated, along with 2 core insights about your destiny. Completely free, no account required."
+      "title": "1. Explore free",
+      "body": "Your complete twelve-palace chart and two core insights. No registration required."
     },
     "s2": {
-      "title": "Step 2: Mark it & keep it",
-      "body": "Sign in with one tap to save your chart for life, unlocking a general fortune summary and the key things to note this year."
+      "title": "2. Save your chart",
+      "body": "Sign in for lifelong storage, a fortune overview and the year’s key points."
     },
     "s3": {
-      "title": "Step 3: Unlock exactly what you need",
-      "body": "Use Lá to open exactly the part you want to understand: the ten-year cycle, a specific year's fortune, or a deep dive into one palace. The Lá cost and the money amount are both shown clearly before you confirm."
+      "title": "3. Unlock depth with Lá",
+      "body": "Choose major periods, yearly fortune or a single palace. Costs are clear before you confirm."
     },
     "packsTitle": "Lá top-up packs",
     "packsNote": "Each pack shows both the Lá amount and the VND price side by side. Scan the VietQR code to pay automatically in seconds.",
     "packBonus": "{base} Lá + {bonus} bonus Lá"
   },
   "faq": {
-    "title": "What you might want to ask before you begin.",
+    "title": "What else would you like to know?",
     "more": "See more frequently asked questions →",
     "items": {
       "q1": {
-        "q": "I don't remember my exact birth time—can I still build a chart?",
-        "a": "You can still begin. Choose 'I don't remember the exact birth time'. The system will still build a basic chart and show you exactly which palaces depend on your birth time, so you can ask your family later and complete the chart without losing what you've already created."
+        "q": "Can I start without my birth time?",
+        "a": "Yes. Choose “I don’t remember my birth time”. Add it later without losing the details you have entered."
       },
       "q2": {
-        "q": "What can I read for free?",
-        "a": "You get to see the complete 12-palace chart, accurately calculated by astronomy, look up the meaning of each star by tapping a palace, and receive 2 essential insights about your destiny right away. You don't pay anything and you don't need to enter any card details."
+        "q": "What can I see for free?",
+        "a": "Your complete twelve-palace chart, star meanings when you tap a palace, and two core insights. No card required."
       },
       "q3": {
-        "q": "What is \"Lá\" used for in the system, and how is it priced?",
-        "a": "Lá is the unit you use to freely unlock deeper interpretations (such as ten-year cycle analysis, detailed yearly forecasts, or palace compatibility readings). Every Lá pack shows its matching VND price clearly, paid via automatic VietQR bank transfer in seconds. We never create a hidden exchange rate or charge silent maintenance fees."
+        "q": "What is Lá for?",
+        "a": "Lá unlocks deeper readings. Top-up packs show Lá and VND prices; payment uses VietQR. There are no hidden maintenance fees."
       },
       "q4": {
-        "q": "Where can I find my chart again later?",
-        "a": "Just sign in with your personal account—your chart and every interpretation you've unlocked are stored permanently under Account. You can reopen it on your phone or computer anytime you want to reflect."
+        "q": "Where can I find my chart again?",
+        "a": "Sign in and open your account to revisit your chart and unlocked readings on phone or computer."
       },
       "q5": {
-        "q": "Is my birth date and time information kept private?",
-        "a": "Lá Số Việt treats your privacy as an absolute principle. Anonymous users' birth data is automatically deleted after 24 hours. We do not send your birth date and time, your name, or your chart's content to any third-party tool, and you always have the right to permanently delete your profile at any time.",
+        "q": "Are my birth details private?",
+        "a": "Anonymous data is deleted after 24 hours. Birth details, names and chart content are not sent to third-party tools.",
         "linkLabel": "Privacy Policy"
       }
     }
   },
   "about": {
-    "title": "Simplifying Eastern and Western esoteric wisdom, bringing ancient knowledge closer to Vietnamese users.",
-    "body": "Lá Số Việt unifies classic disciplines—from Ziwei and BaZi to Astrology, I Ching, and Numerology. Delivered in clear, accessible Vietnamese with transparent logic, Lá Số Việt helps you deeply understand yourself and prepare proactively for every life milestone.",
-    "link": "Learn more about Lá Số Việt →",
-    "ctaTitle": "Your journey ahead is ready to be illuminated.",
-    "cta": "Create your chart now"
+    "title": "Classical knowledge, closer to you",
+    "body": "Lá Số Việt brings Eastern and Western traditions closer to Vietnamese readers through clear, grounded readings and practical preparation.",
+    "link": "About Lá Số Việt",
+    "ctaTitle": "Cast your chart. Read your life.",
+    "cta": "Start my free chart"
   }
 }
--- a/apps/web/messages/en/troi-nam.json
+++ b/apps/web/messages/en/troi-nam.json
@@ -2,7 +2,7 @@
   "hero": {
     "h1a": "Cast your chart.",
     "h1b": "Read your life.",
-    "sub": "Every person is born as a star in the sky.",
+    "sub": "Your own chart, revealing character and fortune in clear language.",
     "plateAlt": "Dawn over the Trang An river, limestone karst in mist and a small wooden boat",
     "sampleCta": "View a sample reading",
     "handoffNote": "Your details will be kept for the next step.",
--- a/apps/web/messages/vi/homepage-v3.json
+++ b/apps/web/messages/vi/homepage-v3.json
@@ -13,8 +13,8 @@
     "year": "Năm",
     "leap": "Tháng nhuận",
     "timeLabel": "Khung giờ sinh",
-    "modeExact": "Biết rõ giờ sinh",
-    "modeBranch": "Nhớ khoảng giờ (Canh giờ)",
+    "modeExact": "Biết rõ giờ",
+    "modeBranch": "Nhớ canh giờ",
     "hourSr": "Giờ sinh, từ 00 đến 23",
     "minuteSr": "Phút sinh, từ 00 đến 59",
     "branchSr": "Khoảng giờ sinh",
@@ -48,12 +48,12 @@
     "close": "Thu gọn đồ hình lá số"
   },
   "story": {
-    "title": "Có những câu hỏi cứ khiến ta trăn trở mãi không thôi...",
-    "body": "Chúng ghé lại vào những đêm khuya mất ngủ, chen vào dòng người tan tầm vội vã, hay dấy lên ngay giữa một buổi họp tưởng chừng bình yên. Giữa những ngổn ngang đó, điều bạn cần không phải một lời phán xét hay hứa hẹn viển vông—mà là một góc nhìn đủ sâu sắc để thấy rõ căn nguyên và tự tin bước tiếp.",
-    "q1": "Bao giờ thì thời vận mỉm cười với sự nỗ lực của mình?",
-    "q2": "Vì sao mình cứ lặp đi lặp lại một sai lầm trong chuyện tình cảm?",
-    "q3": "Công việc đang làm liệu có phù hợp với mình không?",
-    "q4": "Mình thực sự sinh ra để làm gì giữa cuộc đời này?"
+    "title": "Bạn đang tìm câu trả lời nào?",
+    "body": "Công việc, tình cảm hay bước ngoặt trước mắt: lá số giúp bạn thấy căn nguyên và chọn cách bước tiếp.",
+    "q1": "Khi nào thời vận đổi thay?",
+    "q2": "Vì sao tình cảm cứ lặp lại?",
+    "q3": "Công việc nào hợp với mình?",
+    "q4": "Đâu là thế mạnh của mình?"
   },
   "ticker": {
     "label": "Từng mảnh ghép cuộc đời đang chờ bạn mở lối",
@@ -68,8 +68,8 @@
   },
   "explore": {
     "eyebrow": "Khám phá 12 cung số",
-    "title": "Một đồ hình lá số. Mười hai nếp đời người.",
-    "lead": "Đừng để những thuật ngữ xa lạ làm bạn băn khoăn. Bắt đầu từ cung Mệnh để thấu suốt bản tính, rồi mở sang Quan Lộc, Tài Bạch hay Phu Thê. Bạn sẽ thấy từng sự kiện trong đời chưa bao giờ diễn ra rời rạc—chúng đan cài và nâng đỡ lẫn nhau.",
+    "title": "Mười hai cung. Một đời người.",
+    "lead": "Chạm một cung để thấy tính cách, sự nghiệp, tiền bạc và tình duyên liên kết trên cùng một lá số.",
     "shortcutsLabel": "Những cung vị thường được mở xem trước",
     "mobileHint": "Chạm vào lưới để mở 8 cung còn lại.",
     "chartLabel": "12 cung số",
@@ -78,9 +78,9 @@
     "palacePrefix": "Cung",
     "trine": "Tam hợp",
     "opposite": "Xung chiếu (Đối cung)",
-    "cycles": "Bên cạnh 12 cung tĩnh tại là nhịp chảy của thời gian: mười năm một đại vận đổi thay, một năm một lưu niên thử thách.",
-    "cta": "Lập lá số để soi chiếu đời mình",
-    "sample": "Xem thử một lá số mẫu hoàn chỉnh →"
+    "cycles": "Đại vận là chu kỳ 10 năm. Lưu niên cho biết thời vận từng năm.",
+    "cta": "Lập lá số miễn phí",
+    "sample": "Xem bản luận giải mẫu"
   },
   "palaces": {
     "menh": {
@@ -145,78 +145,78 @@
     }
   },
   "needs": {
-    "title": "Hôm nay, lòng bạn đang ngổn ngang điều gì nhất?",
-    "lead": "Một quyết định chuyển hướng dở dang. Một mối quan hệ buông không đành, giữ chẳng xong. Hay đơn giản là chính bạn, sau những năm tháng miệt mài mà bỗng thấy chông chênh.",
+    "title": "Điều gì khiến bạn bận tâm?",
+    "lead": "Chọn một điều bạn muốn hiểu rõ. Bản luận giải sẽ bắt đầu từ đó.",
     "groupLabel": "Điều bạn muốn thấu tỏ",
     "items": {
       "self": {
-        "title": "Thấu hiểu chính mình",
+        "title": "Hiểu chính mình",
         "question": "Mình thực sự mạnh ở đâu? Vì sao trước những khúc ngoặt quan trọng, mình cứ chần chừ bỏ lỡ?",
-        "path": "Soi chiếu từ cung Mệnh và cung Thân để thấy rõ căn cơ, điểm tựa nội tại và những nút thắt tâm lý bạn chưa từng đặt tên.",
-        "cta": "Khám phá căn cốt bản thân",
+        "path": "Cung Mệnh và cung Thân chỉ rõ thế mạnh, điểm tựa và những nút thắt trong cách bạn sống.",
+        "cta": "Lập lá số miễn phí",
         "c1": "Mệnh",
         "c2": "Thân"
       },
       "work": {
-        "title": "Sự nghiệp & Tiền tài",
+        "title": "Công việc và tiền bạc",
         "question": "Có nên nghỉ việc để bắt đầu lại? Giai đoạn này nên dốc lực tiến công hay thu mình chờ thời?",
-        "path": "Quan Lộc chỉ rõ cách làm việc và môi trường phát huy; Tài Bạch soi sáng dòng tiền; Đại vận 10 năm chỉ rõ nhịp thịnh suy để đi đúng thời điểm.",
-        "cta": "Xem thời vận công danh",
+        "path": "Quan Lộc soi sự nghiệp. Tài Bạch soi dòng tiền. Đại vận chỉ nhịp thịnh suy để chọn thời điểm.",
+        "cta": "Lập lá số miễn phí",
         "secondary": "Hoặc tìm hiểu Bát Tự",
         "c1": "Quan Lộc",
         "c2": "Tài Bạch",
         "c3": "Đại vận"
       },
       "love": {
-        "title": "Chuyện tình cảm",
+        "title": "Tình cảm",
         "question": "Vì sao cứ va vào cùng một mẫu hình làm mình đau lòng? Người như thế nào mới thực sự là bến đỗ bình yên?",
-        "path": "Đọc cung Phu Thê phối chiếu cùng cung Mệnh để bóc tách mẫu người bạn dễ rung động và cách hòa giải xung đột từ gốc rễ.",
-        "cta": "Soi tỏ duyên tình",
+        "path": "Phu Thê phối chiếu cùng Mệnh, chỉ rõ mẫu người bạn dễ rung động và cách tháo gỡ xung đột.",
+        "cta": "Lập lá số miễn phí",
         "secondary": "Hoặc tìm hiểu Chiêm Tinh",
         "c1": "Phu Thê",
         "c2": "Mệnh"
       },
       "decision": {
-        "title": "Một quyết định trước mắt",
+        "title": "Quyết định trước mắt",
         "question": "Đứng trước một ngã ba đường: Ký hợp đồng này, nhận lời chuyến đi này, hay nên lùi lại một bước?",
-        "path": "Khi cần lời khuyên cho một thời điểm cụ thể, trí tuệ dịch lý giúp bạn nhận diện thời thế: nên quyết đoán tiến hay điềm tĩnh thủ.",
+        "path": "Kinh Dịch giúp bạn đọc thời thế trước một việc cụ thể: nên tiến hay nên giữ.",
         "cta": "Tham vấn Kinh Dịch",
         "c1": "Kinh Dịch"
       }
     },
-    "lensTitle": "Mỗi môn phái, một góc nhìn sáng rõ.",
+    "lensTitle": "Khám phá các bộ môn",
     "lensLead": "Tử Vi giúp bạn đọc trọn bức tranh đời mình. Khi muốn mở rộng góc nhìn trước những sự việc đặc thù, hãy khám phá các bộ môn cổ học tinh hoa.",
     "disciplines": {
       "tuvi": {
         "name": "Tử Vi Đẩu Số",
-        "desc": "Bản đồ 12 cung và hơn 100 tinh tú, giải mã toàn diện tính cách, nhân duyên và từng bước ngoặt đời người.",
+        "desc": "12 cung và hơn 100 tinh tú, giải mã tính cách, nhân duyên và những bước ngoặt đời người.",
         "cta": "Tìm hiểu Tử Vi"
       },
       "batu": {
         "name": "Bát Tự (Tứ Trụ)",
-        "desc": "Bốn trụ Năm - Tháng - Ngày - Giờ, luận giải sự cân bằng âm dương và chu kỳ ngũ hành thịnh suy.",
+        "desc": "Bốn trụ ngày giờ sinh, luận âm dương và nhịp ngũ hành thịnh suy.",
         "cta": "Tìm hiểu Bát Tự"
       },
       "chiemtinh": {
         "name": "Chiêm Tinh Học",
-        "desc": "Vị trí các vì tinh tú thời khắc chào đời qua 12 cung hoàng đạo, soi tỏ thế giới nội tâm và tiềm năng vô thức.",
+        "desc": "12 cung hoàng đạo soi nội tâm và tiềm năng từ thời khắc chào đời.",
         "cta": "Tìm hiểu Chiêm Tinh"
       },
       "kinhdich": {
         "name": "Kinh Dịch",
-        "desc": "Trí tuệ thời vị qua 64 quẻ dịch, soi sáng lẽ biến dịch và gợi mở ứng xử trước từng tình huống cụ thể.",
+        "desc": "64 quẻ giúp đọc thời thế và chọn cách ứng xử trước một việc cụ thể.",
         "cta": "Tìm hiểu Kinh Dịch"
       },
       "thansohoc": {
         "name": "Thần Số Học",
-        "desc": "Khám phá tần số rung động của họ tên và ngày sinh cùng nhịp điệu của các chu kỳ năm cá nhân.",
+        "desc": "Họ tên, ngày sinh và các chu kỳ năm cá nhân giúp bạn hiểu nhịp sống.",
         "cta": "Tìm hiểu Thần Số Học"
       }
     }
   },
   "compare": {
-    "title": "Tốc độ hay cuộc trò chuyện? Điều gì sẽ thực sự ở lại cùng bạn?",
-    "lead": "Trang tử vi phổ thông cho sự nhanh chóng. Hỏi đáp AI cho sự linh hoạt. Gặp thầy cho sự lắng nghe. Lá Số Việt trao bạn một bản đồ vận mệnh chuẩn xác, có căn cứ cổ thư và đồng hành trọn đời.",
+    "title": "Vì sao chọn Lá Số Việt?",
+    "lead": "Lá số chuẩn xác. Luận giải có căn cứ. Đồng hành trọn đời.",
     "tableLabel": "Một điểm đáng chọn và các giới hạn thực tế của mỗi cách tìm câu trả lời",
     "groupLabel": "Cách bạn đang cân nhắc",
     "colLsv": "Lá Số Việt",
@@ -227,52 +227,52 @@
     "tabWeb": "Trang tử vi",
     "tabAi": "Hỏi đáp AI",
     "tabThay": "Gặp thầy",
-    "cardTitle": "{name} có gì đáng để bạn lựa chọn?",
+    "cardTitle": "{name}: điểm đáng chọn",
     "fixLabel": "Tại Lá Số Việt:",
-    "ctaDesktop": "Khai mở lá số của tôi →",
-    "cta": "Bắt đầu với lá số của tôi →",
+    "ctaDesktop": "Lập lá số miễn phí",
+    "cta": "Lập lá số miễn phí",
     "rows": {
       "strength": {
         "k": "Điểm đáng chọn nhất",
-        "lsv": "Bản đồ vận mệnh chuẩn xác, cá nhân hóa sâu sắc và lưu trữ đồng hành trọn đời.",
-        "web": "Tra cứu miễn phí, trả kết quả lá số thô và bài đọc tự động tức thì.",
-        "ai": "Trò chuyện linh hoạt 24/7 bằng lời văn tự nhiên, phản hồi ngay tức thì.",
-        "thay": "Đối thoại 1-1 trực tiếp, được lắng nghe và an ủi cảm xúc tại chỗ."
+        "lsv": "Lá số chuẩn xác, cá nhân hóa sâu và lưu trữ trọn đời.",
+        "web": "Tra cứu miễn phí, trả lá số và bài đọc tức thì.",
+        "ai": "Trò chuyện tự nhiên, linh hoạt 24/7.",
+        "thay": "Đối thoại trực tiếp, được lắng nghe tại chỗ."
       },
       "own": {
         "k": "Độ cá nhân hóa",
-        "lsv": "An sao chuẩn từng phút sinh; bóc tách đúng trăn trở bạn đang bận tâm.",
-        "web": "Văn mẫu đóng sẵn; hai người cùng sao nhận bài đọc giống hệt nhau.",
-        "ai": "Phụ thuộc câu lệnh tự nhập; dễ bị định kiến người dùng dẫn dắt.",
-        "thay": "Phụ thuộc lớn vào kinh nghiệm, tâm trạng và cảm quan cá nhân của thầy."
+        "lsv": "An sao chuẩn từng phút, đọc đúng trăn trở của bạn.",
+        "web": "Văn mẫu đóng sẵn, cùng sao nhận cùng bài đọc.",
+        "ai": "Phụ thuộc câu lệnh, dễ bị định kiến dẫn dắt.",
+        "thay": "Phụ thuộc kinh nghiệm, tâm trạng và cảm quan của thầy."
       },
       "basis": {
         "k": "Căn cứ học thuật",
-        "lsv": "Minh bạch tuyệt đối. Mọi luận giải đều gắn đường dẫn đối chiếu sao và cung.",
-        "web": "Dữ liệu đại trà chưa kiểm chứng; buông lời phán mơ hồ gây hoang hoảng.",
-        "ai": "Dễ bị 'ảo giác' an sai vị trí sao nhưng vẫn trả lời rất tự tin.",
-        "thay": "Truyền miệng thiếu cơ sở logic chuẩn hóa; khó kiểm chứng tính đúng sai."
+        "lsv": "Minh bạch tuyệt đối, đối chiếu từng sao và cung.",
+        "web": "Dữ liệu chưa kiểm chứng, lời phán mơ hồ gây hoang mang.",
+        "ai": "Có thể an sai sao nhưng vẫn trả lời tự tin.",
+        "thay": "Truyền miệng, thiếu chuẩn hóa và khó kiểm chứng."
       },
       "links": {
         "k": "Nhìn nhận toàn diện",
-        "lsv": "Đồ hình tương tác trực quan: chạm một cung để thấy trọn vẹn Tam hợp, Xung chiếu.",
-        "web": "Nội dung cắt vụn; các cung phán mâu thuẫn buộc bạn tự chắp vá.",
-        "ai": "Mỗi lần hỏi là một lát cắt rời rạc, mất đi tính nhất quán toàn cục.",
-        "thay": "Lời phán thoảng qua, khó hình dung rõ bức tranh tổng thể mười hai cung."
+        "lsv": "Chạm một cung, thấy trọn Tam hợp và Xung chiếu.",
+        "web": "Các cung bị cắt vụn, mâu thuẫn phải tự chắp vá.",
+        "ai": "Mỗi câu hỏi là một lát cắt, thiếu toàn cảnh.",
+        "thay": "Lời phán thoáng qua, khó thấy toàn bộ 12 cung."
       },
       "return": {
         "k": "Tính nhất quán & Khách quan",
-        "lsv": "Khách quan & Nhất quán tuyệt đối; chuẩn hóa dữ liệu, loại bỏ hoàn toàn cảm tính.",
-        "web": "Thông tin thiếu ổn định; các bài tra cứu mâu thuẫn nhau giữa các lần đọc.",
-        "ai": "Thiếu tính nhất quán; mỗi lượt hỏi lại cho ra một kết quả mâu thuẫn.",
-        "thay": "Thiếu tính đồng nhất; cùng lá số nhưng mỗi thầy phán một kiểu khác nhau."
+        "lsv": "Khách quan, nhất quán tuyệt đối; loại bỏ hoàn toàn cảm tính.",
+        "web": "Bài tra cứu thiếu ổn định, mâu thuẫn giữa các lần đọc.",
+        "ai": "Hỏi lại có thể nhận kết quả mâu thuẫn.",
+        "thay": "Cùng lá số, mỗi thầy có thể phán khác nhau."
       },
       "depth": {
         "k": "Chi phí & Trải nghiệm",
-        "lsv": "Xem miễn phí nền tảng; chủ động mở sâu đúng phần bạn cần với chi phí minh bạch.",
-        "web": "Giao diện tràn ngập quảng cáo; bài viết đóng gói cứng nhắc, thừa thãi.",
-        "ai": "Tốn phí thuê bao tháng; người dùng phải tự gánh rủi ro tự kiểm chứng.",
-        "thay": "Chi phí đắt đỏ từ trăm nghìn đến tiền triệu; khó đặt lịch để hỏi thêm."
+        "lsv": "Xem nền tảng miễn phí, mở sâu theo nhu cầu và chi phí rõ ràng.",
+        "web": "Nhiều quảng cáo, bài đọc cứng nhắc và thừa nội dung.",
+        "ai": "Tốn phí thuê bao, phải tự kiểm chứng.",
+        "thay": "Chi phí cao, khó đặt lịch hỏi thêm."
       }
     }
   },
@@ -280,12 +280,12 @@
     "eyebrow": "Lời hồi đáp chân thực",
     "titleA": "Điều đọng lại",
     "titleB": "sau một lần soi tỏ.",
-    "lead": "Mỗi người tìm đến Lá Số Việt mang theo một trăn trở riêng. Nhưng rời đi, họ đều mang theo một điểm tựa an lòng.",
+    "lead": "Những điều người đọc giữ lại sau khi xem lá số.",
     "readFull": "Đọc trọn vẹn ↗",
     "readFullAria": "Đọc trọn vẹn chia sẻ của {name}",
     "more": "Xem thêm chia sẻ từ người đọc ↓",
     "less": "Thu gọn chia sẻ ↑",
-    "start": "Bắt đầu với lá số của bạn ↗",
+    "start": "Lập lá số miễn phí",
     "filterLabel": "Lọc chia sẻ theo chủ đề",
     "filterAll": "Tất cả",
     "group": {
@@ -307,77 +307,77 @@
     "rotationLabel": "Chia sẻ từ người đọc, tự động chuyển sau vài giây"
   },
   "usp": {
-    "title": "Càng nhìn sâu, càng thấy rõ bóng hình mình trong đó.",
-    "lead": "Một lá số chân chính không bao giờ kết thúc ở vài lời phán xét nông cạn. Nó là hành trình bóc tách từng lớp căn duyên, hiểu từng mối dây ràng buộc, để rồi mỗi khi chông chênh, bạn luôn có một chốn trở về soi chiếu.",
+    "title": "Đọc sâu trên chính lá số của bạn",
+    "lead": "Cổ thư, thời khắc sinh và quan hệ giữa các cung cùng tạo nên một bản luận giải riêng cho bạn.",
     "n1": {
-      "title": "Kế thừa tinh hoa cổ thư.",
-      "body": "Mỗi lời luận giải đều được đúc kết từ thuật số chính tông phương Đông, hệ thống hóa lớp lang để từng câu chữ đều có gốc có ngọn, tuyệt đối không suy diễn hàm hồ."
+      "title": "Có gốc từ cổ thư",
+      "body": "Thuật số chính tông được hệ thống hóa rõ ràng. Mỗi lời luận đều có gốc, tuyệt đối không suy diễn hàm hồ."
     },
     "n2": {
-      "title": "Khởi phát từ chính bạn.",
-      "body": "Thời khắc bạn cất tiếng khóc chào đời dựng nên đồ hình số phận. Nhưng chính nỗi bận tâm của bạn ở hiện tại mới là chiếc chìa khóa mở lối cho câu chuyện."
+      "title": "Khởi đầu từ bạn",
+      "body": "Ngày giờ sinh dựng nên lá số. Điều bạn đang bận tâm dẫn đường cho bản luận giải."
     },
     "n3": {
-      "title": "Mạch ngầm liên kết.",
-      "body": "Chạm vào một cung số để thấy thế tam hợp, nhị hợp và xung chiếu cùng lúc bừng sáng. Mười hai cung không bao giờ cô lập—chúng cùng kể một câu chuyện về đời bạn.",
-      "link": "Chạm thử vào lá số →"
+      "title": "Thấy mối liên kết",
+      "body": "Tam hợp, nhị hợp và xung chiếu hiện rõ. Mười hai cung cùng kể câu chuyện của bạn.",
+      "link": "Khám phá 12 cung"
     },
     "n4": {
-      "title": "Thong dong theo nhịp riêng.",
-      "body": "Sự nghiệp, tình cảm hay vận hạn một năm trước mắt: bạn làm chủ hoàn toàn hành trình khám phá, thấy rõ từng giá trị và chi phí trước khi quyết định mở đọc."
+      "title": "Chọn độ sâu bạn cần",
+      "body": "Sự nghiệp, tình cảm hay vận hạn: mở đúng phần bạn cần, thấy rõ giá trị và chi phí trước khi đọc."
     }
   },
   "value": {
-    "title": "Thấu hiểu trước một phần. Đi sâu khi lòng đã tỏ.",
-    "lead": "Bạn hoàn toàn có thể khởi đầu bằng việc lập lá số và đọc những nhận định cốt lõi nhất về mình mà không tốn một đồng. Khi thấy hữu ích và muốn giữ lại cho riêng mình, bạn đăng nhập lưu trữ. Những tầng luận giải chuyên sâu chỉ mở ra khi bạn thực sự cần, bằng Lá, với chi phí minh bạch đến từng con số.",
+    "title": "Bắt đầu miễn phí. Đi sâu bằng Lá.",
+    "lead": "Xem lá số và nhận định cốt lõi miễn phí. Đăng nhập để lưu. Dùng Lá khi muốn đọc sâu hơn.",
     "s1": {
-      "title": "Bước 1: Trải nghiệm trọn vẹn đồ hình",
-      "body": "Xem đầy đủ lá số 12 cung an sao chuẩn xác cùng 2 nhận định trọng tâm về bản mệnh. Hoàn toàn miễn phí, không cần đăng ký tài khoản."
+      "title": "1. Xem miễn phí",
+      "body": "Đầy đủ lá số 12 cung và 2 nhận định trọng tâm. Không cần đăng ký."
     },
     "s2": {
-      "title": "Bước 2: Ghi dấu & Lưu giữ",
-      "body": "Đăng nhập một chạm để lưu lại lá số trọn đời, mở khóa bản tóm lược vận khí tổng quan và những lưu ý quan trọng trong năm."
+      "title": "2. Lưu lá số",
+      "body": "Đăng nhập để lưu trọn đời, mở tóm lược vận khí và những lưu ý trong năm."
     },
     "s3": {
-      "title": "Bước 3: Mở khóa theo nhu cầu riêng",
-      "body": "Dùng Lá để mở đúng phần bạn muốn thấu tỏ: Đại vận 10 năm, thời vận từng năm hay chuyên sâu từng cung. Số Lá và số tiền hiện rõ ràng trước khi bạn bấm xác nhận."
+      "title": "3. Mở sâu bằng Lá",
+      "body": "Chọn Đại vận, vận hạn từng năm hoặc một cung. Chi phí hiện rõ trước khi xác nhận."
     },
     "packsTitle": "Gói nạp Lá",
     "packsNote": "Mỗi gói hiển thị song song số Lá và số tiền VNĐ. Quét mã VietQR tự động trong vài giây.",
     "packBonus": "{base} Lá + {bonus} Lá tặng thêm"
   },
   "faq": {
-    "title": "Những điều bạn có thể muốn hỏi trước khi khởi tạo.",
+    "title": "Bạn muốn hỏi thêm điều gì?",
     "more": "Xem thêm câu hỏi thường gặp →",
     "items": {
       "q1": {
-        "q": "Tôi không nhớ chính xác giờ sinh thì có lập lá số được không?",
-        "a": "Bạn vẫn có thể bắt đầu. Hãy chọn 'Tôi chưa nhớ rõ giờ sinh'. Hệ thống vẫn sẽ lập đồ hình cơ bản và chỉ rõ cho bạn thấy giờ sinh quyết định đến những cung vị nào, để bạn có thể hỏi lại người thân và hoàn thiện lá số sau mà không mất dữ liệu đã tạo."
+        "q": "Không nhớ giờ sinh, có bắt đầu được không?",
+        "a": "Có. Chọn “Tôi chưa nhớ rõ giờ sinh”. Bạn có thể bổ sung sau và giữ lại dữ liệu đã tạo."
       },
       "q2": {
-        "q": "Xem miễn phí thì tôi đọc được những gì?",
-        "a": "Bạn được xem trọn vẹn đồ hình lá số 12 cung an sao chuẩn xác theo thiên văn, tra cứu ý nghĩa các sao khi chạm vào cung, và nhận ngay 2 nhận định đúc kết quan trọng về bản mệnh. Bạn không phải trả bất kỳ chi phí nào và cũng không cần nhập thông tin thẻ."
+        "q": "Tôi được xem gì miễn phí?",
+        "a": "Trọn lá số 12 cung, ý nghĩa các sao khi chạm vào cung và 2 nhận định bản mệnh. Không cần nhập thẻ."
       },
       "q3": {
-        "q": "\"Lá\" trong hệ thống dùng để làm gì và tính phí thế nào?",
-        "a": "Lá là đơn vị để bạn tùy ý mở đọc các phần luận giải chuyên sâu (như phân tích đại vận, dự báo chi tiết năm hạn hay đối chiếu cung phối). Mỗi gói Lá đều hiển thị song song số tiền VNĐ tương ứng rõ ràng, thanh toán qua chuyển khoản VietQR tự động trong vài giây. Chúng tôi tuyệt đối không tạo tỷ giá ảo hay thu phí duy trì ngầm."
+        "q": "Lá dùng để làm gì?",
+        "a": "Lá mở các phần luận giải chuyên sâu. Gói nạp hiển thị số Lá và giá VNĐ; thanh toán qua VietQR. Không thu phí duy trì ngầm."
       },
       "q4": {
-        "q": "Sau này muốn xem lại lá số của mình thì tìm ở đâu?",
-        "a": "Chỉ cần đăng nhập bằng tài khoản cá nhân, lá số và toàn bộ các phần luận giải bạn đã mở sẽ được lưu giữ vĩnh viễn trong mục Tài khoản. Bạn có thể mở lại trên điện thoại hay máy tính bất cứ khi nào cần chiêm nghiệm."
+        "q": "Tôi tìm lại lá số ở đâu?",
+        "a": "Đăng nhập, mở Tài khoản để xem lại lá số và các phần đã mở trên điện thoại hoặc máy tính."
       },
       "q5": {
-        "q": "Thông tin ngày giờ sinh của tôi có được bảo mật không?",
-        "a": "Lá Số Việt coi sự riêng tư của bạn là nguyên tắc tối thượng. Dữ liệu ngày sinh của người dùng ẩn danh sẽ tự động xóa sau 24 giờ. Chúng tôi không gửi ngày giờ sinh, họ tên hay nội dung lá số của bạn cho bất kỳ công cụ bên thứ ba nào, và bạn luôn có quyền bấm xóa vĩnh viễn hồ sơ của mình bất kỳ lúc nào.",
+        "q": "Ngày giờ sinh của tôi có được bảo mật?",
+        "a": "Dữ liệu ẩn danh tự xóa sau 24 giờ. Ngày giờ sinh, họ tên và nội dung lá số không gửi tới công cụ bên thứ ba.",
         "linkLabel": "Chính sách bảo mật"
       }
     }
   },
   "about": {
-    "title": "Đơn giản hóa tinh hoa huyền học Đông Tây, đưa tri thức cổ học đúc kết ngàn năm đến gần hơn với người Việt.",
-    "body": "Lá Số Việt hội tụ tinh hoa các bộ môn thuật số kim cổ—từ Tử Vi, Bát Tự đến Chiêm Tinh, Kinh Dịch và Thần Số Học. Bằng ngôn ngữ tiếng Việt thuần túy, dễ hiểu và có căn cứ minh bạch, Lá Số Việt giúp bạn thấu hiểu sâu sắc chính mình, nhìn rõ những cột mốc vận hạn để luôn có sự chuẩn bị chủ động và vững vàng nhất cho cuộc sống.",
-    "link": "Tìm hiểu thêm về Lá Số Việt →",
-    "ctaTitle": "Chặng đường phía trước của bạn đã sẵn sàng được soi tỏ.",
-    "cta": "Khai mở lá số của bạn ngay"
+    "title": "Tri thức cổ học, gần hơn với bạn",
+    "body": "Lá Số Việt đưa tinh hoa huyền học Đông Tây đến gần người Việt, bằng bản luận giải dễ hiểu, có căn cứ và cách chuẩn bị rõ ràng.",
+    "link": "Về Lá Số Việt",
+    "ctaTitle": "Lập lá số. Hiểu vận mệnh.",
+    "cta": "Lập lá số miễn phí"
   }
 }
--- a/apps/web/messages/vi/troi-nam.json
+++ b/apps/web/messages/vi/troi-nam.json
@@ -2,7 +2,7 @@
   "hero": {
     "h1a": "Lập lá số.",
     "h1b": "Hiểu vận mệnh.",
-    "sub": "Mỗi người được sinh ra đều là một vì sao trên bầu trời.",
+    "sub": "Lá số riêng của bạn, giải mã tính cách và thời vận bằng tiếng Việt dễ hiểu.",
     "plateAlt": "Bình minh trên sông nước Tràng An, núi đá vôi trong sương và một chiếc thuyền nhỏ",
     "sampleCta": "Xem bản luận giải mẫu",
     "handoffNote": "Thông tin bạn nhập sẽ được giữ lại ở bước tiếp theo.",
--- a/apps/web/src/components/site-header.tsx
+++ b/apps/web/src/components/site-header.tsx
@@ -56,6 +56,7 @@
   contactPath?: string;
   accentColor?: string;
   account?: HeaderAccountUser | null;
+  chartCtaLabel?: string;
 };
 
 function route(locale: "en" | "vi", path: string) {
@@ -88,6 +89,7 @@
   contactPath = "/lien-he",
   accentColor,
   account,
+  chartCtaLabel,
 }: SiteHeaderProps) {
   const contactHref = route(locale, contactPath);
   const isVietnamese = locale === "vi";
@@ -113,7 +115,7 @@
 
   const localeSwitcherHref = isVietnamese
     ? (currentPath ? (currentPath === "/" ? "/en" : "/en" + currentPath) : "/en")
-    : (currentPath ? (currentPath === "/en" ? "/vi" : "/vi" + currentPath.replace(/^\/en/, "")) : "/vi");
+    : (currentPath ? (currentPath === "/en" ? "/" : currentPath.replace(/^\/en/, "") || "/") : "/");
 
   return React.createElement(
     React.Fragment,
@@ -210,7 +212,7 @@
           React.createElement(
             Link,
             { className: "button button-small", href: route(locale, isDiscipline ? "/tu-vi" : "/tao-la-so/tu-vi") },
-            isVietnamese ? "Lập lá số ngay" : "Build my chart",
+            chartCtaLabel ?? (isVietnamese ? "Lập lá số ngay" : "Build my chart"),
           ),
           React.createElement(
             "details",
@@ -268,7 +270,7 @@
               React.createElement(
                 Link,
                 { className: "button", href: route(locale, isDiscipline ? "/tu-vi" : "/tao-la-so/tu-vi") },
-                isVietnamese ? "Lập lá số ngay" : "Build my chart",
+                chartCtaLabel ?? (isVietnamese ? "Lập lá số ngay" : "Build my chart"),
               ),
             ),
           ),
--- a/apps/web/src/styles/troi-nam.css
+++ b/apps/web/src/styles/troi-nam.css
@@ -2190,3 +2190,61 @@
   .tn .tn-testimonials [data-compact="true"] .hv3-tt-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
 }
 
+
+/* Audit PR6: one job and one layout family per chapter. */
+.tn .tn-topic-ribbon {
+  display: flex; gap: 8px; overflow-x: auto; padding: 8px 0;
+  margin-top: 24px; scroll-snap-type: x proximity;
+}
+.tn .tn-topic-ribbon a {
+  flex: 0 0 auto; display: flex; align-items: center;
+  min-height: 44px; padding: 8px 16px; border: 1px solid var(--tn-hair);
+  border-radius: 999px; color: var(--tn-gold-light); scroll-snap-align: start;
+  font-size: 1rem; text-decoration: none;
+}
+.tn .tn-topic-ribbon a:focus-visible { outline: 2px solid var(--tn-gold-light); outline-offset: 2px; }
+.tn .tn-story .hv3-story-panel { min-height: 0; padding: 0; }
+.tn .tn-story .hv3-story-copy { padding: 0; max-width: 64ch; }
+.tn .tn-story .hv3-questions { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
+.tn .tn-story .hv3-questions p { margin: 0; padding: 0; border: 0; font-size: 1rem; line-height: 1.5; }
+.tn .tn-explore .hv3-panel { padding: 20px; border-radius: var(--tn-radius-panel); }
+.tn .tn-explore .hv3-panel-note { margin-block: 16px; }
+.tn .tn-usp .hv3-usp-head { display: none; }
+.tn .tn-usp .hv3-usp-grid { display: grid; grid-template-columns: 1fr; gap: 0; margin-top: 32px; }
+.tn .tn-usp .hv3-usp-card {
+  min-height: 0; padding: 16px 0; border: 0; border-top: 1px solid var(--tn-hair);
+  background: transparent; border-radius: 0;
+}
+.tn .tn-usp .hv3-usp-body { padding: 0; }
+.tn .tn-usp .hv3-usp-body::before { display: none; }
+.tn .tn-usp .hv3-usp-card h3 { font-size: 1.25rem; margin: 0 0 8px; }
+.tn .tn-usp .hv3-usp-card p { font-size: 1rem; line-height: 1.5; max-width: 64ch; }
+.tn .tn-value .hv3-steps { gap: 0; margin-top: 24px; }
+.tn .tn-value .hv3-steps li {
+  padding: 16px 0; border: 0; border-top: 1px solid var(--tn-hair);
+  background: transparent; border-radius: 0;
+}
+.tn .tn-value .hv3-step-visual { display: none; }
+.tn .tn-value .hv3-steps li[data-step="3"]::before,
+.tn .tn-value .hv3-steps li[data-step="3"]::after,
+.tn .tn-about .hv3-final-cta::before,
+.tn .tn-about .hv3-final-cta::after { display: none; animation: none; }
+.tn .tn-value .hv3-steps p { margin: 8px 0 0; line-height: 1.5; max-width: 64ch; }
+.tn .tn-faq .hv3-faq-layout { display: block; }
+.tn .tn-faq .hv3-faq-list { margin-top: 24px; }
+.tn .tn-faq .hv3-faq-q { font-size: 1rem; padding-block: 16px; min-height: 64px; }
+.tn .tn-faq .hv3-faq-a { padding-right: 0; line-height: 1.6; }
+.tn .tn-about .hv3-about-panel { border: 0; border-radius: 0; background: transparent; }
+.tn .tn-about .hv3-about-panel::before { min-height: 180px; }
+.tn .tn-about .hv3-about-body { padding: 24px 0 0; }
+.tn .tn-about .hv3-about-body p { max-width: 64ch; line-height: 1.6; }
+.tn .tn-about .hv3-final-cta-inner { padding: 48px 0 0; }
+.tn .tn-about .hv3-final-cta { margin-top: 24px; }
+@media (min-width: 880px) {
+  .tn .tn-story .hv3-questions { grid-template-columns: repeat(4, minmax(0, 1fr)); }
+  .tn .tn-usp .hv3-usp-grid { grid-template-columns: 1fr 1fr; gap: 0 32px; }
+  .tn .tn-value .hv3-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
+  .tn .tn-about .hv3-about-panel::before { min-height: 240px; }
+  .tn .tn-about .hv3-about-body { padding: 0 0 0 32px; align-self: center; }
+}
+
--- a/apps/web/src/features/troi-nam/troi-nam-compare.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-compare.tsx
@@ -3,12 +3,7 @@
 
 // Shorter than the live homepage's lead: the table itself now makes the three-way
 // comparison, so the intro no longer needs to restate it before the reader sees it.
-const LEAD = {
-  vi: "Lá Số Việt trao bạn một bản đồ vận mệnh có căn cứ cổ thư và đồng hành trọn đời.",
-  en: "La So Viet gives you a chart-backed reading that stays with you for life.",
-} as const;
-
-export function TroiNamCompare({ locale }: { locale: "en" | "vi" }) {
+export function TroiNamCompare(_props: { locale: "en" | "vi" }) {
   const texture = troiNamAsset("T08");
 
   return (
@@ -24,7 +19,7 @@
         loading="lazy"
         decoding="async"
       />
-      <HomepageV3Compare lead={LEAD[locale]} />
+      <HomepageV3Compare />
     </div>
   );
 }
--- a/apps/web/src/features/troi-nam/troi-nam-ticker.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-ticker.tsx
@@ -1,9 +1,19 @@
-import { HomepageV3Ticker } from "../homepage-v3/homepage-v3-static-sections";
+import { useTranslations } from "next-intl";
+
+const ITEMS = [
+  { key: "a1", href: "#nhu-cau" },
+  { key: "a2", href: "#nhu-cau" },
+  { key: "a3", href: "#la-so-mau" },
+  { key: "a4", href: "#nhu-cau" },
+  { key: "b1", href: "#la-so-mau" },
+  { key: "b2", href: "#la-so-mau" },
+  { key: "b3", href: "#la-so-mau" },
+  { key: "b4", href: "#nhu-cau" },
+] as const;
 
 export function TroiNamTicker() {
-  return (
-    <div className="hv3 tn-ticker">
-      <HomepageV3Ticker />
-    </div>
-  );
+  const t = useTranslations("homepage-v3.ticker");
+  return <nav className="tn-topic-ribbon" aria-label={t("label")}>
+    {ITEMS.map(({ key, href }) => <a key={key} href={href}>{t(key)}</a>)}
+  </nav>;
 }
--- a/apps/web/src/app/[locale]/page.tsx
+++ b/apps/web/src/app/[locale]/page.tsx
@@ -34,7 +34,8 @@
 
   return (
     <div className="tn">
-      <SiteHeader locale={locale} currentPath={locale === "en" ? "/en" : "/"} />
+      <SiteHeader locale={locale} currentPath={locale === "en" ? "/en" : "/"}
+        chartCtaLabel={locale === "vi" ? "Lập lá số miễn phí" : "Start my free chart"} />
       {/*
         Page-scoped (2026-10-01 audit F2): wraps a server-rendered subtree in a
         client provider — standard RSC composition, not a client-ification of
@@ -47,8 +48,6 @@
             <TroiNamHero locale={locale} />
             <section className="tn-section" data-troi-nam-block="story">
               <TroiNamStory />
-            </section>
-            <section className="tn-section" data-troi-nam-block="ticker">
               <TroiNamTicker />
             </section>
             <section className="tn-section" data-troi-nam-block="explore">
@@ -60,12 +59,10 @@
           </section>
           <section className="tn-section" data-troi-nam-block="compare" id="so-sanh">
             <TroiNamCompare locale={locale} />
+            <div data-troi-nam-part="usp"><TroiNamUsp /></div>
           </section>
           <section className="tn-section" data-troi-nam-block="testimonials">
             <TroiNamTestimonials />
-          </section>
-          <section className="tn-section" data-troi-nam-block="usp">
-            <TroiNamUsp />
           </section>
           <section className="tn-section" data-troi-nam-block="value" id="gia-tri">
             <TroiNamValue locale={locale} />
```

### PR7 — Runtime budget, static fallback and scope cleanup

Files: world/troi-nam-world-scene.ts; troi-nam-hero.tsx; troi-nam-explore.tsx; troi-nam-faq.tsx; homepage-v3-needs.tsx; troi-nam.css. Keep all lifecycle protections. Render the scroll-driven world only when pose is dirty; this still schedules a lightweight rAF while visible and is not a claim of zero idle JS. Remove unneeded client wrappers/reveal observers, correct image hints. The final theme hunk is conditional on founder approval of the homepage lacquer exception. Primitives here preserve the existing shared skin; consolidation in PR8 makes them component tokens.

Acceptance criteria:

- Hardware trace: zero scene draw calls for 5 seconds while scroll, size and chart target are unchanged; resume on scroll/resize. Verify every animated pose is progress-driven before landing the dirty guard. Idle/paused gaps do not trigger false tier downgrade; debug changes mark the pose dirty. Existing tab-hidden/stage-offscreen pause still cancels rAF.

- At scroll into Explore, visible clickable chart labels remain legible and match their painted positions. Treat the ready-state opacity concern in B as a device gate, not a proven fix from the dirty guard.

- Actual 4G mid-range Android field p75: LCP <2.5 s, CLS <0.1, INP <200 ms. Cold-load lab traces are supporting evidence, not substitutes for field INP. No fabricated Lighthouse score.

- No WebGL/saveData/reduced-motion/context loss/asset failure yields readable static content, no blank canvas replacement. Unmount/remount cancels loads and releases renderer, textures, geometry, materials and render targets.

- If theme exception approved: loading homepage with a persisted light preference still paints a consistent lacquer form/chart; no localStorage or global theme preference rewrite. Other approved light pages continue working.

```diff
--- a/apps/web/src/styles/troi-nam.css
+++ b/apps/web/src/styles/troi-nam.css
@@ -2248,3 +2248,26 @@
   .tn .tn-about .hv3-about-body { padding: 0 0 0 32px; align-self: center; }
 }
 
+
+/* Audit PR7: scoped lacquer exception; does not alter the saved site preference. */
+html[data-theme="light"] .tn .hv3 {
+  --page: #0f0d0a; --surface: #15120e; --raised: #1c1813; --inset: #120f0b;
+  --text: #f3ecdd; --muted: #c9bea8; --subtle: #a89d88;
+  --hair: #3a3227; --hair2: #5a4a33; --focus: #e9c987;
+  --action: var(--tn-gold-light); --action-h: var(--tn-gold); --action-t: var(--tn-ink);
+  --accent: #e9c987; --link: #e9c987; --error: #f0a08e;
+  --seg-bg: var(--tn-gold-light); --seg-t: var(--tn-ink);
+  --chart-face: #17130e; --chart-cell: #1c1813; --chart-grid: #4a3e2e; --chart-label: #e0c27a;
+  --chart-active: #d2563c; --chart-active-bg: #3a1f18; --chart-rel: #a85c47; --chart-rel-bg: #261a14;
+  --chart-opp: #9c8248; --chart-opp-bg: #231d12; --chart-opp-line: #c9a44d;
+  --ornament: #c9a44d; --ornament-t: #c9a44d;
+  --inv: #1a1611; --inv-line: #3a3227;
+  --art-dark: 1; --art-light: 0;
+  --art-line: rgba(201,164,77,.5); --art-glyph: #d8bd7c;
+  --tick-off: rgba(201,164,77,.3); --tick-on: #e86b4e; --glow: rgba(232,107,78,.75);
+  --need-bg: #17130e; --need-bg-on: #1c1813;
+  color-scheme: dark;
+}
+.tn .tn-testimonials .hv3-tt-row,
+.tn .tn-testimonials .hv3-tt-dialog { scrollbar-width: thin; }
+
--- a/apps/web/src/features/troi-nam/troi-nam-hero.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-hero.tsx
@@ -108,6 +108,8 @@
             dusk crossfade is scoped to the >=880px layout (see CSS). */}
         <img
           className="tn-hero-plate tn-hero-plate-dusk"
+          loading="lazy"
+          fetchPriority="low"
           src={dusk.src}
           srcSet={dusk.srcSet}
           sizes="100vw"
--- a/apps/web/src/features/troi-nam/troi-nam-explore.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-explore.tsx
@@ -1,5 +1,3 @@
-"use client";
-
 import { CANONICAL_BRANCH_IDS } from "../birth-profile/homepage-birth-prefill";
 import { palaceOnBranch, type PalaceId } from "../homepage-v3/homepage-v3-data";
 import { HomepageV3Explore } from "../homepage-v3/homepage-v3-explore";
--- a/apps/web/src/features/troi-nam/troi-nam-faq.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-faq.tsx
@@ -1,44 +1,5 @@
-"use client";
-
-import { useLayoutEffect, useRef } from "react";
-
 import { HomepageV3Faq } from "../homepage-v3/homepage-v3-faq";
 
 export function TroiNamFaq({ locale }: { locale: "en" | "vi" }) {
-  const wrapRef = useRef<HTMLDivElement>(null);
-
-  // Same shape as the need-cards reveal (troi-nam-needs.tsx): synchronous
-  // pre-paint check so an already-visible list never flashes hidden, and a
-  // one-shot IntersectionObserver for the below-the-fold case.
-  useLayoutEffect(() => {
-    const wrap = wrapRef.current;
-    const list = wrap?.querySelector<HTMLElement>(".hv3-faq-list");
-    if (!wrap || !list) return;
-    if (typeof IntersectionObserver !== "function") return;
-    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
-
-    const rect = list.getBoundingClientRect();
-    if (rect.top < window.innerHeight && rect.bottom > 0) {
-      wrap.setAttribute("data-faq-reveal", "in");
-      return;
-    }
-
-    wrap.setAttribute("data-faq-reveal", "pending");
-    const observer = new IntersectionObserver(
-      (entries) => {
-        if (!entries[0]?.isIntersecting) return;
-        wrap.setAttribute("data-faq-reveal", "in");
-        observer.disconnect();
-      },
-      { threshold: 0.15 },
-    );
-    observer.observe(list);
-    return () => observer.disconnect();
-  }, []);
-
-  return (
-    <div className="hv3 tn-faq" ref={wrapRef}>
-      <HomepageV3Faq locale={locale} />
-    </div>
-  );
+  return <div className="hv3 tn-faq"><HomepageV3Faq locale={locale} /></div>;
 }
--- a/apps/web/src/features/homepage-v3/homepage-v3-needs.tsx
+++ b/apps/web/src/features/homepage-v3/homepage-v3-needs.tsx
@@ -97,7 +97,7 @@
               <img
                 src={`${HOMEPAGE_V3_IMAGE_ROOT}/${TUVI_ART}`}
                 srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/lsv-discipline-tu-vi-560.webp 560w, ${HOMEPAGE_V3_IMAGE_ROOT}/${TUVI_ART} 1122w`}
-                sizes="(max-width: 768px) 50vw, 280px"
+                sizes={compact ? "80px" : "(max-width: 768px) 50vw, 280px"}
                 alt=""
                 width={1122}
                 height={1402}
@@ -121,7 +121,7 @@
                 <img
                   src={`${HOMEPAGE_V3_IMAGE_ROOT}/${item.art}`}
                   srcSet={`${HOMEPAGE_V3_IMAGE_ROOT}/${item.art.replace(".webp", "-560.webp")} 560w, ${HOMEPAGE_V3_IMAGE_ROOT}/${item.art} 1122w`}
-                  sizes="(max-width: 768px) 50vw, 280px"
+                  sizes={compact ? "80px" : "(max-width: 768px) 50vw, 280px"}
                   alt=""
                   width={1122}
                   height={1402}
--- a/apps/web/src/features/troi-nam/world/troi-nam-world-scene.ts
+++ b/apps/web/src/features/troi-nam/world/troi-nam-world-scene.ts
@@ -154,7 +154,8 @@
     function loop(now: number) {
       rafId = null;
       if (disposed || !active) return;
-      if (scheduler.shouldRender(now)) {
+      if (!dirty) lastFrame = null;
+      if (dirty && scheduler.shouldRender(now)) {
         try { renderFrame(now); } catch { fail(); return; }
       }
       if (!disposed && active) rafId = requestAnimationFrame(loop);
@@ -173,13 +174,13 @@
       },
       setActive(next) {
         if (disposed || active === next) return;
-        active = next; stopLoop();
+        active = next; lastFrame = null; stopLoop();
         if (active) rafId = requestAnimationFrame(loop);
       },
       dispose,
     };
     if (diagnostics) {
-      handle.setDebug = (next) => { debug = { ...debug, ...next }; };
+      handle.setDebug = (next) => { debug = { ...debug, ...next }; dirty = true; };
       handle.getDiagnostics = () => {
         glRenderer.getDrawingBufferSize(bufferSize);
         return { tier: scheduler.tier, progress, chartWeight: scenePhases(progress).chart, opacity, targetUploads: stars.targetUploads, drawingBuffer: { width: bufferSize.x, height: bufferSize.y }, rayBuffer: rays?.dimensions ?? null, raysEnabled, frameCpuMs, rayPipelineCpuMs: raysEnabled || debug.mask ? rays?.cpuMs ?? 0 : 0, chartRect, ringCorners: Array.from(projection.corners), ringTargets: Array.from(projection.targets) };
```

### PR8 — Remove retired decoration rules without moving the cascade

Files: troi-nam.css; troi-nam-value.tsx; troi-nam-about.tsx. PR6 intentionally removes leaf/lantern loops and step illustration boxes. Delete their now-inactive rules, keyframes and injected asset styles; remove the highly specific step-3 background so the timeline truly uses one canvas. Keep final landscape plates, quote assets, world particles and all state-dependent shared rules. Do not merge distant identical selectors: moving their declarations can change overlapping-selector precedence.

Acceptance criteria:

- No tn-leaf-fall or tn-lantern-float keyframes/references; no CSS image URL injection for hidden step illustrations or removed floating decorations. World stars/particles and closing L06/L07 landscape plates remain.

- Step 3 has the same transparent canvas as steps 1/2 at 390 and 1440, both locales. No inset valley plate remains. Timeline content and free/save/Lá progression are unchanged.

- Compare PR7 versus PR8 screenshots at 360/390/430/768/1024/1440; only the intentionally retired step-3 background differs. No selector or declaration is reordered.

- Keep the scoped correction layer until native TN visual components can migrate one at a time under screenshot tests. No claim that all remaining .hv3 rules are dead; shared non-TN consumers must remain unchanged.

```diff
--- a/apps/web/src/styles/troi-nam.css
+++ b/apps/web/src/styles/troi-nam.css
@@ -1634,65 +1634,6 @@
   background-repeat: no-repeat;
 }
 
-/*
- * Two gold leaves drift down inside the "unlock with Lá" step card (step 3)
- * on continuous loop — ambient, not scroll-triggered, so no JS is needed.
- * Backgrounds are set per-leaf in troi-nam-value.tsx. prefers-reduced-motion
- * already collapses every .tn animation via the existing global rule.
- */
-.tn .tn-value .hv3-steps li[data-step="3"] {
-  position: relative;
-  isolation: isolate;
-  overflow: hidden;
-}
-
-.tn .tn-value .hv3-steps li[data-step="3"]::before,
-.tn .tn-value .hv3-steps li[data-step="3"]::after {
-  content: "";
-  position: absolute;
-  /* Starts at the visible top edge, not above it — with overflow:hidden on
-     the card, a negative starting offset spent most of the loop clipped out
-     of view before it ever faded in. */
-  top: 0;
-  width: 26px;
-  height: 34px;
-  background-size: contain;
-  background-repeat: no-repeat;
-  background-position: center;
-  opacity: 0;
-  pointer-events: none;
-  animation: tn-leaf-fall 6s ease-in infinite;
-}
-
-.tn .tn-value .hv3-steps li[data-step="3"]::before {
-  left: 18%;
-}
-
-.tn .tn-value .hv3-steps li[data-step="3"]::after {
-  left: 68%;
-  width: 20px;
-  height: 26px;
-  animation-duration: 7s;
-  animation-delay: 2s;
-}
-
-@keyframes tn-leaf-fall {
-  0% {
-    transform: translate(0, 0) rotate(-8deg);
-    opacity: 0;
-  }
-  8% {
-    opacity: 0.9;
-  }
-  90% {
-    opacity: 0.85;
-  }
-  100% {
-    transform: translate(8px, 440px) rotate(40deg);
-    opacity: 0;
-  }
-}
-
 .tn .tn-value .hv3-step-visual > svg,
 .tn .tn-value .hv3-step-dot {
   display: none;
@@ -1825,54 +1766,6 @@
   border-radius: 1rem;
   background: var(--tn-ink);
   color: var(--tn-text);
-}
-
-/*
- * Two floating hoa đăng (candle lanterns) bob gently at the base of the
- * closing CTA, on continuous loop — ambient, matching the falling gold
- * leaves in Value. z-index lifts them above .hv3-final-cta-bg and the CTA
- * copy's own z-index:auto stacking (both are later in source order and
- * would otherwise paint over a plain pseudo-element).
- */
-.tn .tn-about .hv3-final-cta::before,
-.tn .tn-about .hv3-final-cta::after {
-  content: "";
-  position: absolute;
-  z-index: 1;
-  bottom: 6%;
-  width: 4rem;
-  height: 4rem;
-  background-size: contain;
-  background-repeat: no-repeat;
-  background-position: center;
-  opacity: 0.9;
-  pointer-events: none;
-  filter: drop-shadow(0 0 10px rgb(255 190 110 / 0.35));
-  animation: tn-lantern-float 6s ease-in-out infinite;
-}
-
-.tn .tn-about .hv3-final-cta::before {
-  left: 8%;
-}
-
-.tn .tn-about .hv3-final-cta::after {
-  right: 9%;
-  width: 3.25rem;
-  height: 3.25rem;
-  animation-duration: 7s;
-  animation-delay: 1.8s;
-}
-
-@keyframes tn-lantern-float {
-  0%,
-  100% {
-    transform: translateY(0) rotate(-2deg);
-    filter: drop-shadow(0 0 8px rgb(255 190 110 / 0.3));
-  }
-  50% {
-    transform: translateY(-14px) rotate(2deg);
-    filter: drop-shadow(0 0 14px rgb(255 190 110 / 0.55));
-  }
 }
 
 .tn .tn-about .hv3-final-cta-bg {
--- a/apps/web/src/features/troi-nam/troi-nam-value.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-value.tsx
@@ -1,42 +1,5 @@
 import { HomepageV3Value } from "../homepage-v3/homepage-v3-static-sections";
-import { troiNamAsset } from "./troi-nam-assets";
 
 export function TroiNamValue({ locale }: { locale: "en" | "vi" }) {
-  const icons = ["I02.la-so-mien-phi", "I02.luu-la-so", "I02.mo-bang-la"];
-  // Step 3 ("Mở khóa bằng Lá") gets two drifting gold leaves via ::before/::after
-  // on its <li> — see troi-nam.css — since that <li> belongs to the shared,
-  // unmodified HomepageV3Value and can't take real injected children.
-  const leafFront = troiNamAsset("E01.la-vang-mat-truoc-1");
-  const leafBack = troiNamAsset("E01.la-vang-mat-sau-2");
-  const sunlitValley = troiNamAsset("L13");
-
-  return (
-    <div className="hv3 tn-value">
-      {icons.map((id, index) => (
-        <style key={id}>
-          {`
-            .tn .tn-value .hv3-step-visual[data-step="${index + 1}"] {
-              background-image: url("${troiNamAsset(id).src}");
-            }
-          `}
-        </style>
-      ))}
-      <style>
-        {`
-          .tn .tn-value .hv3-steps li[data-step="3"] {
-            background-image: linear-gradient(rgb(16 14 12 / 0.8), rgb(16 14 12 / 0.92)), url("${sunlitValley.src}");
-            background-size: cover;
-            background-position: center;
-          }
-          .tn .tn-value .hv3-steps li[data-step="3"]::before {
-            background-image: url("${leafFront.src}");
-          }
-          .tn .tn-value .hv3-steps li[data-step="3"]::after {
-            background-image: url("${leafBack.src}");
-          }
-        `}
-      </style>
-      <HomepageV3Value locale={locale} showPacks={false} />
-    </div>
-  );
+  return <div className="hv3 tn-value"><HomepageV3Value locale={locale} showPacks={false} /></div>;
 }
--- a/apps/web/src/features/troi-nam/troi-nam-about.tsx
+++ b/apps/web/src/features/troi-nam/troi-nam-about.tsx
@@ -5,13 +5,6 @@
   const lacquer = troiNamAsset("T10");
   const lanterns = troiNamAsset("L06");
   const mobileLanterns = troiNamAsset("L07");
-  // Two floating hoa đăng drift in the closing CTA, on .hv3-final-cta itself —
-  // ::before/::after on .hv3-final-cta-bg are already spoken for (disabled
-  // v3 light-theme side plates, see troi-nam.css) and it's the last-painted
-  // background layer anyway; .hv3-final-cta is still free.
-  const lanternGold = troiNamAsset("E02.hoa-dang-vang");
-  const lanternPink = troiNamAsset("E02.hoa-dang-hong");
-
   return (
     <div className="hv3 tn-about">
       {/* Asset-only rules preserve the original copy, links and wizard CTA. */}
@@ -28,12 +21,6 @@
               background-image: url("${lanterns.src}");
             }
           }
-          .tn .tn-about .hv3-final-cta::before {
-            background-image: url("${lanternGold.src}");
-          }
-          .tn .tn-about .hv3-final-cta::after {
-            background-image: url("${lanternPink.src}");
-          }
         `}
       </style>
       <HomepageV3About locale={locale} />
```

### Release evidence required after manual application

| Gate | Method | Acceptance |
|---|---|---|
| Responsive VI/EN | 360,390,430,768,1024,1440; fonts loaded, same defaults | No clipping/overflow, no desktop CTA wrapping, correct image crop/layout |
| Mobile fold | 390×844 and 360×800, keyboard closed | Primary 52 px button visible; H1 two lines; copy ≤4 elements |
| Height and copy | Restore default state, scroll once for lazy assets/reveals, return top, wait for fonts | ≤10,128 px including footer; ≤1,100 main units; collapsed Needs ≤1,050 px; expanded form ≤10,950 px |
| Spacing | Computed outer/inner styles + content rectangles | Outer 48/64/80, inner 0; no ghost USP/ticker section |
| Contrast | Synchronized text-free composite with glyph mask, every art pose/crop/theme decision | Body ≥4.5:1, large display ≥3:1, visible focus/control edge ≥3:1 |
| Touch/keyboard | Bounding boxes PLUS actual hit geometry and Tab/Enter/Space/Escape | ≥44 px targets, 8 px adjacent controls, correct focus return, no invisible chart buttons |
| Form regressions | Existing tests + smoke paths listed under PR2 | Same draft, validation, concern and `/tao-la-so/tu-vi` handoff |
| Quotes | Byte comparison against baseline data file | No changes to all 15 records; full text still readable |
| Reduced motion/static | OS toggle mid-session, saveData, WebGL disabled, context loss, failed asset | Complete readable content, stopped pseudo loops, safe static world |
| Runtime | Real mid-range Android, cold 4G lab trace + representative field monitoring | LCP <2.5 s, CLS <.1, INP <200 ms; no claimed p75 from one browser |
| Theme | Cold entry with stored light and dark preferences | Approved policy consistent, no preference overwrite or mixed inherited skin |
| CSS cleanup | Before/after PR8 screenshot comparison and scoped coverage | Only intentional step-3 background removal; no cascade reordering |

Use existing analytics only within its approved privacy policy to compare homepage visit → first form interaction → valid wizard handoff → first paid unlock. No new third-party analytics transmission or invented conversion target is authorised by this audit. Production conversion improvement is a hypothesis until measured.

## Part I — Founder decisions only

1. Approve the nine-chapter composition (ticker inside Story, USP inside Compare) and secondary-method disclosure; recommendation: approve, all content destinations remain.
2. Approve the mobile form disclosure while retaining field order and one mounted form; recommendation: approve, the first-screen free-chart action is clearer and data survives.
3. Choose the homepage theme policy; recommendation: a scoped lacquer release now, preserving light-ready pages, with full paper-homepage art direction separately approved if both must launch together.
4. Approve the compact static reader gallery (two phone cards, three desktop, all 15 available on expansion); recommendation: approve, no quote wording changes.

No field reorder, new image, price change, fake review, softened claim or rewritten real quotation is proposed. This audit is ready to review; deployment is outside its scope.
