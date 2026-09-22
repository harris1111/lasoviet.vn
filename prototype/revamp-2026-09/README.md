# Revamp prototypes — 2026-09-22

Founder-requested prototypes for the UI/content revamp. Open the HTML files
directly in a browser. Static HTML, no build step.

| File | What it is |
|---|---|
| `trang-chu.html` | Revamped homepage, 12 sections in the order of the revamp plan (FD-091 spec §4.1 plus "Hôm nay" and the tools row) |
| `cong-cu-mien-phi.html` | Free tools hub (FD-090, FD-094) with need filters, 12 tools, bridge to the chart, membership (FD-093) |
| `cong-cu-tu-vi-hom-nay.html` | Template for one tool page: input → result → cinnabar "Còn tùy lá số của bạn" bridge → daily reminder |
| `bo-icon.html` | Icon review sheet |
| `icons.svg` | Icon sprite for `apps/web` (12 tool icons `i-*`, UI glyphs `ui-*`, logomark `logo`) |
| `build-icons.py` | Generates `icons.svg`, `icons.js`, `icons.json`. Edit icons here, then run `python3 build-icons.py` |
| `lsv-revamp.css` | Shared styles. New tokens `--surface-raised`, `--surface-raised-2`, `--border-soft` make the lacquer theme brighter; proposed for `apps/web/src/styles/tokens.css` |
| `uploads/messenger-logo-meta-ho-tro-khach-hang-lasoviet.*` | Official Meta Messenger logo supplied by the founder (FD-095) |

Notes for An:

- Founder approved these prototypes on 2026-09-22 (FD-098).
- Messenger links show `data-pending` until the founder supplies the fanpage
  link. The link goes into the `social` field of `config/customer-contact.json`;
  render the Messenger button only when that field is visible (FD-095).
- Support email is lasoviet.net@gmail.com (FD-098).
- Sample reading text on the tool page is placeholder copy for voice review.
- Dates on the "Hôm nay" cards are real for 21–23/9/2026; the product computes
  them from the lunar calendar.
- Tools marked "Sắp có" are wave 3B and stay `noindex` until they return real
  results (`docs/23`).
