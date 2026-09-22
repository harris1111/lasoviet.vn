"""Build the Lá Số Việt free-tool icon set (FD-094).

Style: 32px grid, 1.6px gold stroke (currentColor), round caps and joins,
exactly one cinnabar (son) accent per icon. Output: icons.svg (sprite for
apps/web) and icons.js (injects the same sprite into prototype pages, since
<use href="file.svg#id"> is blocked on file://).
"""
import math, json, pathlib

SON = "#CE5B45"
G = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'

def pt(cx, cy, r, deg):
    a = math.radians(deg - 90)
    return round(cx + r * math.cos(a), 2), round(cy + r * math.sin(a), 2)

icons = {}

# 1. Tử vi hôm nay — 12-branch ring, today's sun at the centre, seal on the current branch
ticks = []
for i in range(12):
    x1, y1 = pt(16, 16, 10.5, i * 30); x2, y2 = pt(16, 16, 13, i * 30)
    ticks.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
sx, sy = pt(16, 16, 13.4, 240)
icons["tu-vi-hom-nay"] = ("Tử vi hôm nay", f'<g {G}><circle cx="16" cy="16" r="10.5"/>{"".join(ticks)}<circle cx="16" cy="16" r="3.6"/></g><circle cx="{sx}" cy="{sy}" r="2" fill="{SON}"/>')

# 2. Lịch âm & ngày tốt — calendar leaf, crescent, red "good day" stamp
icons["lich-am-ngay-tot"] = ("Lịch âm & ngày tốt", f'<g {G}><rect x="6" y="7.5" width="20" height="18.5" rx="2.5"/><line x1="11" y1="5" x2="11" y2="9.5"/><line x1="21" y1="5" x2="21" y2="9.5"/><line x1="6" y1="12.5" x2="26" y2="12.5"/><path d="M21.2 15.6a4.4 4.4 0 1 0 1.3 6.9a3.5 3.5 0 1 1 -1.3 -6.9z"/></g><rect x="9" y="16.5" width="4.4" height="4.4" rx=".6" fill="{SON}"/>')

# 3. Thần số học — Pythagoras 3x3 birth grid, one active cell
dots = "".join(f'<circle cx="{x}" cy="{y}" r=".9" fill="currentColor" stroke="none"/>' for x, y in [(10, 10), (22, 10), (16, 22), (22, 22)])
icons["than-so-hoc"] = ("Thần số học", f'<g {G}><rect x="7" y="7" width="18" height="18" rx="2"/><line x1="13" y1="7" x2="13" y2="25"/><line x1="19" y1="7" x2="19" y2="25"/><line x1="7" y1="13" x2="25" y2="13"/><line x1="7" y1="19" x2="25" y2="19"/>{dots}</g><rect x="14.2" y="14.2" width="3.6" height="3.6" rx=".5" fill="{SON}"/>')

# 4. Bói tình yêu — two linked rings, seal where they meet
icons["boi-tinh-yeu"] = ("Bói tình yêu", f'<g {G}><circle cx="12.3" cy="16" r="7"/><circle cx="19.7" cy="16" r="7"/></g><circle cx="16" cy="10.1" r="1.9" fill="{SON}"/>')

# 5. Giải mã giấc mơ — closed eye with lashes, crescent above, one red star
icons["giai-ma-giac-mo"] = ("Giải mã giấc mơ", f'<g {G}><path d="M5.5 17.5q10.5 8 21 0"/><line x1="9" y1="20.6" x2="7.8" y2="23"/><line x1="16" y1="22" x2="16" y2="24.8"/><line x1="23" y1="20.6" x2="24.2" y2="23"/><path d="M22.5 5.8a4 4 0 1 0 3.3 5.9a3.1 3.1 0 1 1 -3.3 -5.9z"/></g><circle cx="11" cy="9.5" r="1.7" fill="{SON}"/>')

# 6. Gieo quẻ — six lines of a hexagram; the moving line is red
lines = []
for i, (y, solid) in enumerate([(8, True), (11.6, False), (15.2, True), (18.8, True), (22.4, False), (26, True)]):
    colour = f' stroke="{SON}"' if i == 3 else ""
    if solid:
        lines.append(f'<line x1="8" y1="{y}" x2="24" y2="{y}"{colour}/>')
    else:
        lines.append(f'<line x1="8" y1="{y}" x2="14.3" y2="{y}"{colour}/><line x1="17.7" y1="{y}" x2="24" y2="{y}"{colour}/>')
icons["gieo-que"] = ("Gieo quẻ Kinh Dịch", f'<g {G} stroke-width="1.9">{"".join(lines)}</g>')

# 7. Rút bài mỗi ngày — fanned pair of cards, seal on the drawn card
icons["rut-bai"] = ("Rút bài mỗi ngày", f'<g {G}><rect x="6.5" y="8.5" width="12" height="17" rx="2" transform="rotate(-12 12.5 17)"/><rect x="13.5" y="6.5" width="12" height="17" rx="2"/><path d="M19.5 10.8l3 4.2l-3 4.2l-3 -4.2z"/></g><circle cx="19.5" cy="15" r="1.3" fill="{SON}"/>')

# 8. Hắt xì hơi, máy mắt — twitching eye, red pupil
icons["hat-xi-may-mat"] = ("Hắt xì hơi, máy mắt", f'<g {G}><path d="M5 17q11 -11 22 0q-11 11 -22 0z"/><circle cx="16" cy="17" r="4.2"/><line x1="10" y1="6" x2="11" y2="8.6"/><line x1="16" y1="4.6" x2="16" y2="7.4"/><line x1="22" y1="6" x2="21" y2="8.6"/></g><circle cx="16" cy="17" r="1.8" fill="{SON}"/>')

# 9. Con số may mắn — jade bi disc on a cord, red tassel
icons["con-so-may-man"] = ("Con số may mắn", f'<g {G}><circle cx="16" cy="13.5" r="9"/><circle cx="16" cy="13.5" r="3"/><line x1="16" y1="22.5" x2="16" y2="25.5"/></g><rect x="14.5" y="25.3" width="3" height="4.2" rx="1.2" fill="{SON}"/>')

# 10. Tuổi gì mệnh gì — five-element pentagon, one element lit
verts = [pt(16, 17, 10, i * 72) for i in range(5)]
poly = " ".join(f"{x},{y}" for x, y in verts)
nodes = "".join(f'<circle cx="{x}" cy="{y}" r="2.3"/>' for x, y in verts[1:])
icons["menh-ngu-hanh"] = ("Tuổi gì, mệnh gì", f'<g {G}><polygon points="{poly}"/>{nodes}</g><circle cx="{verts[0][0]}" cy="{verts[0][1]}" r="2.6" fill="{SON}"/>')

# 11. Xin xăm — bamboo tube with sticks, the drawn stick is red
icons["xin-xam"] = ("Xin xăm", f'<g {G}><path d="M9 14.5h14l-1.3 12a1.8 1.8 0 0 1 -1.8 1.5h-7.8a1.8 1.8 0 0 1 -1.8 -1.5z"/><line x1="12" y1="14.5" x2="10.8" y2="6"/><line x1="19" y1="14.5" x2="20" y2="5.5"/><line x1="21.8" y1="14.5" x2="24" y2="8"/><line x1="10" y1="20" x2="22.4" y2="20"/></g><line x1="15.6" y1="14.5" x2="15.6" y2="3.6" stroke="{SON}" stroke-width="1.9" stroke-linecap="round"/>')

# 12. Sim phong thủy — phone with a trigram, red home dot
icons["sim-phong-thuy"] = ("Sim phong thủy", f'<g {G}><rect x="10" y="4" width="12" height="24" rx="2.6"/><line x1="13.4" y1="11" x2="18.6" y2="11"/><line x1="13.4" y1="14.6" x2="15.2" y2="14.6"/><line x1="16.8" y1="14.6" x2="18.6" y2="14.6"/><line x1="13.4" y1="18.2" x2="18.6" y2="18.2"/></g><circle cx="16" cy="24.2" r="1.4" fill="{SON}"/>')

# UI glyphs (24px grid, no seal). Messenger uses the official Meta logo image
# (uploads/messenger-logo-meta-ho-tro-khach-hang-lasoviet.webp), not a redrawn glyph.
U = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'
ui = {
  "ui-mail": '<g '+U+'><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6l8-6"/></g>',
  "ui-calendar": '<g '+U+'><rect x="4" y="5" width="16" height="15" rx="2"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="4" y1="10" x2="20" y2="10"/></g>',
  "ui-clock": '<g '+U+'><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></g>',
  "ui-user": '<g '+U+'><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3"/></g>',
  "ui-gender": '<g '+U+'><circle cx="10" cy="14" r="5"/><path d="M13.6 10.4L19 5M15 5h4v4"/></g>',
  "ui-arrow": '<g '+U+'><path d="M5 12h14M13 6l6 6l-6 6"/></g>',
  "ui-chevron": '<g '+U+'><path d="M6 9l6 6l6-6"/></g>',
  "ui-check": '<g '+U+'><path d="M5 12.5l4.5 4.5L19 7.5"/></g>',
  "ui-lock": '<g '+U+'><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></g>',
  "ui-search": '<g '+U+'><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></g>',
  "ui-menu": '<g '+U+'><path d="M4 7h16M4 12h16M4 17h16"/></g>',
  "ui-leaf": '<g '+U+'><path d="M5 19c0-8 5-13 14-14c-1 9-6 14-14 14z"/><path d="M5 19l7-7"/></g>',
}

symbols = ['<symbol id="logo" viewBox="0 0 100 100"><title>Lá Số Việt</title><g fill="none" stroke="#C9A44D" stroke-width="4.5" stroke-linecap="butt">    <path d="M89.27 42.37A40 40 0 1 1 10.73 42.37"/>    <path d="M28.51 16.26A40 40 0 0 1 71.49 16.26"/>    <path d="M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79C63.42 58.47 71.55 43.06 74.79 38.25"/>  </g>  <g fill="#C9A44D" stroke="none">    <path d="M8.53 41.94C9.03 39.39 9.93 38.28 12.18 36.98C13.15 39.39 13.44 40.25 12.94 42.8Z"/>    <path d="M91.47 41.94C90.97 39.39 90.07 38.28 87.82 36.98C86.85 39.39 86.56 40.25 87.06 42.8Z"/>    <path d="M27.3 14.37C25.11 15.77 24.02 16.98 24.02 19.58C26.62 19.58 27.53 19.56 29.72 18.16Z"/>    <path d="M72.7 14.37C74.89 15.77 75.98 16.98 75.98 19.58C73.38 19.58 72.47 19.56 70.28 18.16Z"/>    <path d="M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.95 37.44 23.35 39.51L27.08 36.99C25.68 34.92 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z"/>    <path d="M83.74 24.99C82.79 28.81 79.95 34.62 76.65 39.51L72.92 36.99C76.66 31.44 80.99 26.64 83.74 24.99Z"/>  </g>  <path fill="#CE5B45" stroke="none" d="M18.22 27.89C18.75 31.36 20.52 33.98 23.53 35.77C23 32.3 21.23 29.68 18.22 27.89Z"/></symbol>']
for key, (title, body) in icons.items():
    symbols.append(f'<symbol id="i-{key}" viewBox="0 0 32 32"><title>{title}</title>{body}</symbol>')
for key, body in ui.items():
    symbols.append(f'<symbol id="{key}" viewBox="0 0 24 24">{body}</symbol>')

sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' + "".join(symbols) + "</svg>"
here = pathlib.Path(__file__).parent
(here / "icons.svg").write_text(sprite + "\n", encoding="utf-8")
(here / "icons.js").write_text(
    "// Generated by build-icons.py — do not edit by hand.\n"
    "(function(){var d=document.createElement('div');d.innerHTML=" + json.dumps(sprite, ensure_ascii=False)
    + ";document.body.insertBefore(d.firstChild,document.body.firstChild);})();\n", encoding="utf-8")
(here / "icons.json").write_text(json.dumps({k: v[0] for k, v in icons.items()}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(len(icons), "tool icons,", len(ui), "ui glyphs")
