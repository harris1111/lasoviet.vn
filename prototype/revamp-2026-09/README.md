# Revamp prototypes — 2026-09-22

Founder-requested prototypes for the UI/content revamp. Open the HTML files
directly in a browser. Static HTML, no build step.

| File | What it is |
|---|---|
| `trang-chu.html` | Revamped homepage, 12 sections in the order of the revamp plan (FD-091 spec §4.1 plus "Hôm nay" and the tools row) |
| `cong-cu-mien-phi.html` | Free tools hub (FD-090, FD-094) with need filters, 12 tools, bridge to the chart, membership (FD-093) |
| `cong-cu-tu-vi-hom-nay.html` | Template for one tool page: input → result → cinnabar "Còn tùy lá số của bạn" bridge → daily reminder |
| `la-so-ket-qua.html` | Free result page: sticky tabs (Lá số · Tổng quan · Năm nay · 12 cung · Chủ đề · Căn cứ, state in `?tab=`), right-rail next steps, tap-to-inspect 12-palace board, "Năm nay" teaser with masked hạn months, save-chart banner, mobile buy bar. Uses the real chart of a test profile created on the live site on 2026-09-22 |
| `chon-luan-giai.html` | Topic selection and top-up: Luận giải · Hội viên · Nạp Lá tabs, sticky pay bar that pre-selects the smallest covering pack (FD-066) |
| `bao-cao-mau.html` | Sample report rebuilt as a real anonymised reading (4 open sections, 2 locked previews), replacing the page that still prints "79.000 ₫" |
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

Implementation notes for the result and purchase pages:

- "Năm nay" needs an engine rule set for yearly and monthly hạn before it can
  ship; until then hide the tab count and the teaser (FD-089 forbids naming a
  hạn the engine did not compute). Locked month names and topic text must not
  reach the client (FD-059); the prototype blurs placeholder text only.
- Offer and pack cards are built as buttons for the prototype; implement them
  as a radio group so the headings and lists inside stay valid markup.
- Found on the live result page (2026-09-22): the birth date prints as
  `1992-06-15` (show `15/06/1992`), and the Life palace lists "Đại Hao" twice.
