#!/usr/bin/env python3
"""
Sinh toàn bộ file logo Lá Số Việt từ một nguồn hình học duy nhất.

Nguồn: prototype/logo/source/lasoviet-logomark-colophon-v5.dc.html
       (bản Claude Design "Logomark Colophon v5" — founder chốt 2026-09-04)

Mọi path trong file này chép nguyên văn từ bản đã chốt. KHÔNG sửa toạ độ.
Muốn đổi hình thì đổi ở Claude Design rồi chép lại vào đây.

Chạy:  python3 brand/logo/build-logo-assets.py
Cần:   rsvg-convert (brew install librsvg), ImageMagick, fonttools, uharfbuzz
       và Source Serif 4 (script tự tải nếu chưa có).
"""

import io
import json
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".build-cache"

# ---------------------------------------------------------------- bảng màu
LACQUER = "#0F0D0A"   # nền sơn mài
GOLD = "#C9A44D"      # vàng kim
SON = "#CE5B45"       # đỏ son
CREAM = "#F6F1E6"     # kem — bản một màu
INK = "#14263D"       # mực — bản đảo, dùng trên nền sáng
GOLD_STOPS = [("0%", "#9A7730"), ("34%", "#F2DCA0"),
              ("58%", "#C9A44D"), ("100%", "#A8842F")]

# ------------------------------------------------- hình học (chép từ v5)
# Bản chuẩn: nét 4.5 — tương phản mảnh/đậm 4.4 : 1
STROKE_STD = 4.5
STROKES = [
    "M89.27 42.37A40 40 0 1 1 10.73 42.37",
    "M28.51 16.26A40 40 0 0 1 71.49 16.26",
    "M25.21 38.25C28.45 43.06 36.58 58.47 45.51 76.79A5 5 0 0 0 54.49 76.79"
    "C63.42 58.47 71.55 43.06 74.79 38.25",
]
FILLS_STD = [
    "M8.53 41.94C9.03 39.39 9.93 38.28 12.18 36.98C13.15 39.39 13.44 40.25 12.94 42.8Z",
    "M91.47 41.94C90.97 39.39 90.07 38.28 87.82 36.98C86.85 39.39 86.56 40.25 87.06 42.8Z",
    "M27.3 14.37C25.11 15.77 24.02 16.98 24.02 19.58C26.62 19.58 27.53 19.56 29.72 18.16Z",
    "M72.7 14.37C74.89 15.77 75.98 16.98 75.98 19.58C73.38 19.58 72.47 19.56 70.28 18.16Z",
    "M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.95 37.44 23.35 39.51"
    "L27.08 36.99C25.68 34.92 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z",
    "M83.74 24.99C82.79 28.81 79.95 34.62 76.65 39.51L72.92 36.99C76.66 31.44 80.99 26.64 83.74 24.99Z",
]
VEIN_STD = "M18.22 27.89C18.75 31.36 20.52 33.98 23.53 35.77C23 32.3 21.23 29.68 18.22 27.89Z"

# Bản cỡ nhỏ: nét 5.2 — tương phản còn 2.4 : 1 để sống lá không mất ở 24px.
# Bố cục, toạ độ, bán kính giữ nguyên; chỉ bề rộng đổi.
STROKE_SM = 5.2
FILLS_SM = [
    "M8.18 41.87C8.68 39.32 9.93 38.28 12.18 36.98C13.15 39.39 13.79 40.31 13.29 42.86Z",
    "M91.82 41.87C91.32 39.32 90.07 38.28 87.82 36.98C86.85 39.39 86.21 40.31 86.71 42.86Z",
    "M27.11 14.07C24.92 15.47 24.02 16.98 24.02 19.58C26.62 19.58 27.72 19.86 29.91 18.46Z",
    "M72.89 14.07C75.08 15.47 75.98 16.98 75.98 19.58C73.38 19.58 72.28 19.86 70.09 18.46Z",
    "M16.26 24.99C15.91 28.32 16.33 31.52 17.31 32.97C18.71 35.04 21.66 37.63 23.06 39.7"
    "L27.36 36.8C25.96 34.73 23.85 31.58 22.45 29.51C21.54 28.17 19.07 26.36 16.26 24.99Z",
    "M83.74 24.99C82.79 28.81 78.34 37.63 76.94 39.7L72.64 36.8C74.04 34.73 80.99 26.64 83.74 24.99Z",
]
VEIN_SM = "M18.22 27.89C17.92 31.92 19.69 34.54 23.53 35.77C23.83 31.74 22.06 29.12 18.22 27.89Z"

WORDMARK = "Lá Số Việt"
FONT_URL = ("https://github.com/adobe-fonts/source-serif/releases/download/"
            "4.005R/source-serif-4.005_Desktop.zip")
FONT_IN_ZIP = "source-serif-4.005_Desktop/VAR/SourceSerif4Variable-Roman.ttf"


# ------------------------------------------------------------------ mark
def mark_body(small, main, vein, indent="  "):
    """Thân mark, không gồm thẻ <svg>. `main`/`vein` là mã màu hoặc currentColor."""
    width = STROKE_SM if small else STROKE_STD
    fills = FILLS_SM if small else FILLS_STD
    vein_d = VEIN_SM if small else VEIN_STD
    out = [f'{indent}<g fill="none" stroke="{main}" stroke-width="{width}" stroke-linecap="butt">']
    out += [f'{indent}  <path d="{d}"/>' for d in STROKES]
    out.append(f"{indent}</g>")
    out.append(f'{indent}<g fill="{main}" stroke="none">')
    out += [f'{indent}  <path d="{d}"/>' for d in fills]
    out.append(f"{indent}</g>")
    out.append(f'{indent}<path fill="{vein}" stroke="none" d="{vein_d}"/>')
    return "\n".join(out)


def mark_svg(small=False, main=GOLD, vein=SON, size=512, gradient=False, title=None):
    title = title or "Lá Số Việt — logomark"
    dims = "" if size is None else f' width="{size}" height="{size}"'
    defs = ""
    if gradient:
        stops = "\n".join(
            f'      <stop offset="{o}" stop-color="{c}"/>' for o, c in GOLD_STOPS)
        defs = ('  <defs>\n'
                '    <linearGradient id="lsv-gold" x1="0" y1="0.28" x2="1" y2="0.72">\n'
                f"{stops}\n"
                "    </linearGradient>\n"
                "  </defs>\n")
        main = "url(#lsv-gold)"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"{dims}'
        ' role="img" aria-label="' + title + '">\n'
        f"  <title>{title}</title>\n"
        f"{defs}"
        f"{mark_body(small, main, vein)}\n"
        "</svg>\n"
    )


# ------------------------------------------------------- chữ hiệu -> path
def font_path():
    CACHE.mkdir(exist_ok=True)
    dst = CACHE / "SourceSerif4Variable-Roman.ttf"
    if dst.exists():
        return dst
    zp = CACHE / "source-serif.zip"
    if not zp.exists():
        print("  tải Source Serif 4 …")
        urllib.request.urlretrieve(FONT_URL, zp)
    with zipfile.ZipFile(zp) as z:
        dst.write_bytes(z.read(FONT_IN_ZIP))
    return dst


_FONT_CACHE = {}


def instanced(opsz, wght):
    key = (opsz, wght)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    f = TTFont(font_path())
    instancer.instantiateVariableFont(f, {"opsz": opsz, "wght": wght}, inplace=True)
    buf = io.BytesIO()
    f.save(buf)
    _FONT_CACHE[key] = (f, buf.getvalue())
    return _FONT_CACHE[key]


def text_to_path(text, size, tracking_em=0.0, opsz=20, wght=600):
    """Trả về (path_d, advance, metrics) — chữ đã outline, gốc toạ độ tại baseline x=0."""
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.pens.boundsPen import BoundsPen
    import uharfbuzz as hb

    ttf, raw = instanced(opsz, wght)
    upem = ttf["head"].unitsPerEm
    scale = size / upem

    face = hb.Face(hb.Blob(raw))
    hbf = hb.Font(face)
    hbf.scale = (upem, upem)
    hb.ot_font_set_funcs(hbf)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbf, buf)

    names = ttf.getGlyphOrder()
    gs = ttf.getGlyphSet()
    track = tracking_em * upem

    pen_out, pen_x, x = [], 0.0, 0.0
    bounds = [None] * 4
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = names[info.codepoint]
        if name == ".notdef":
            raise SystemExit(f"thiếu glyph cho {text!r} — font không đủ dấu tiếng Việt")
        gx, gy = x + pos.x_offset, pos.y_offset
        sp = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}")
        gs[name].draw(TransformPen(sp, (scale, 0, 0, -scale, gx * scale, -gy * scale)))
        d = sp.getCommands()
        if d:
            pen_out.append(d)
        bp = BoundsPen(gs)
        gs[name].draw(bp)
        if bp.bounds:
            x0, y0, x1, y1 = bp.bounds
            cand = [(gx + x0) * scale, -(gy + y1) * scale,
                    (gx + x1) * scale, -(gy + y0) * scale]
            bounds = [cand[i] if bounds[i] is None else
                      (min(bounds[i], cand[i]) if i < 2 else max(bounds[i], cand[i]))
                      for i in range(4)]
        x += pos.x_advance + track
        pen_x = x
    advance = (pen_x - track) * scale
    cap = ttf["OS/2"].sCapHeight * scale
    return " ".join(pen_out), advance, {
        "cap": cap, "x0": bounds[0], "top": bounds[1],
        "x1": bounds[2], "bottom": bounds[3],
    }


# ------------------------------------------------------------- ink bbox
def ink_bbox(svg_text):
    """Hộp bao phần có mực của mark, tính theo đơn vị viewBox 100."""
    from PIL import Image
    tmp = CACHE / "_bbox.svg"
    png = CACHE / "_bbox.png"
    tmp.write_text(svg_text, encoding="utf-8")
    run(["rsvg-convert", "-w", "1000", "-h", "1000", "-o", str(png), str(tmp)])
    with Image.open(png) as im:
        b = im.convert("RGBA").getchannel("A").getbbox()
    return tuple(v / 10.0 for v in b)


# ------------------------------------------------------------- lockups
MARK_BOX_H = 26.0   # chiều cao hộp mark trong lockup ngang (spec handoff)
GAP_H = 12.0        # khoảng cách mark ↔ chữ
TEXT_SIZE_H = 20.0  # cỡ chữ hiệu
TRACK_H = 0.01      # letter-spacing 0.01em


def lockup_horizontal(main, vein, text_color, title):
    """Mark cỡ nhỏ + chữ hiệu, canh theo trục thị giác (giữa mark ↔ giữa cap height)."""
    d, adv, m = text_to_path(WORDMARK, TEXT_SIZE_H, TRACK_H)
    s = MARK_BOX_H / 100.0
    bb = ink_bbox(mark_svg(small=True, main="#000", vein="#000", size=None))
    mark_ink_top, mark_ink_bot = bb[1] * s, bb[3] * s
    mark_mid = (mark_ink_top + mark_ink_bot) / 2.0

    baseline = mark_mid + m["cap"] / 2.0          # trục thị giác trùng nhau
    text_x = MARK_BOX_H + GAP_H
    top = min(mark_ink_top, baseline + m["top"])
    bottom = max(mark_ink_bot, baseline + m["bottom"])
    left = bb[0] * s
    right = text_x + m["x1"]
    w, h = right - left, bottom - top

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}"'
        f' width="{w:.2f}" height="{h:.2f}" role="img" aria-label="{title}">\n'
        f"  <title>{title}</title>\n"
        f'  <g transform="translate({-left:.3f} {-top:.3f})">\n'
        f'    <g transform="scale({s:.5f})">\n'
        f"{mark_body(True, main, vein, indent='      ')}\n"
        "    </g>\n"
        f'    <path fill="{text_color}" transform="translate({text_x:.2f} {baseline:.3f})"'
        f' d="{d}"/>\n'
        "  </g>\n"
        "</svg>\n"
    )


MARK_BOX_V = 48.0    # lockup dọc dùng bản chuẩn, cỡ lớn hơn
GAP_V = 14.0
TEXT_SIZE_V = 15.0
TRACK_V = 0.30       # chữ hoa giãn 0.3em


def lockup_vertical(main, vein, text_color, title):
    up = WORDMARK.upper()
    d, adv, m = text_to_path(up, TEXT_SIZE_V, TRACK_V, opsz=15, wght=600)
    s = MARK_BOX_V / 100.0
    bb = ink_bbox(mark_svg(small=False, main="#000", vein="#000", size=None))
    mark_l, mark_t, mark_r, mark_b = (v * s for v in bb)
    mark_w = mark_r - mark_l
    text_w = m["x1"] - m["x0"]

    w = max(mark_w, text_w)
    mark_dx = (w - mark_w) / 2.0 - mark_l
    text_dx = (w - text_w) / 2.0 - m["x0"]
    baseline = (mark_b - mark_t) + GAP_V - m["top"]
    h = baseline + m["bottom"]

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}"'
        f' width="{w:.2f}" height="{h:.2f}" role="img" aria-label="{title}">\n'
        f"  <title>{title}</title>\n"
        f'  <g transform="translate({mark_dx:.3f} {-mark_t:.3f}) scale({s:.5f})">\n'
        f"{mark_body(False, main, vein, indent='    ')}\n"
        "  </g>\n"
        f'  <path fill="{text_color}" transform="translate({text_dx:.3f} {baseline:.3f})"'
        f' d="{d}"/>\n'
        "</svg>\n"
    )


def wordmark_svg(color, title):
    d, adv, m = text_to_path(WORDMARK, 100.0, TRACK_H)
    w, h = m["x1"] - m["x0"], m["bottom"] - m["top"]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}"'
        f' width="{w:.2f}" height="{h:.2f}" role="img" aria-label="{title}">\n'
        f"  <title>{title}</title>\n"
        f'  <path fill="{color}" transform="translate({-m["x0"]:.2f} {-m["top"]:.2f})"'
        f' d="{d}"/>\n'
        "</svg>\n"
    )


# --------------------------------------------------------------- helpers
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"lỗi: {' '.join(cmd)}\n{r.stderr}")
    return r


def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    return p


def rasterize(svg_rel, png_rel, width=None, height=None, bg=None):
    src, dst = ROOT / svg_rel, ROOT / png_rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["rsvg-convert"]
    if width:
        cmd += ["-w", str(width)]
    if height:
        cmd += ["-h", str(height)]
    if bg:
        cmd += ["-b", bg]
    run(cmd + ["-o", str(dst), str(src)])
    return dst


def padded_icon(svg_rel, png_rel, size, margin=0.15, bg=LACQUER):
    """Mark đặt giữa trên nền đặc, lề an toàn `margin` mỗi bên."""
    inner = int(round(size * (1 - 2 * margin)))
    tmp = CACHE / "_icon.png"
    run(["rsvg-convert", "-w", str(inner), "-h", str(inner),
         "-o", str(tmp), str(ROOT / svg_rel)])
    dst = ROOT / png_rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(["magick", str(tmp), "-background", bg, "-gravity", "center",
         "-extent", f"{size}x{size}", "-alpha", "remove", "-alpha", "off", str(dst)])
    return dst


# ------------------------------------------------- bản dựng hình & quy tắc
def construction_svg():
    """Mark chồng trên lưới dựng — hồ sơ kỹ thuật, không dùng làm logo."""
    grid = """  <g stroke="#C9A44D" stroke-width="0.16" opacity="0.45" fill="none">
    <circle cx="50" cy="50" r="40"/>
    <circle cx="50" cy="50" r="37.75"/>
    <circle cx="50" cy="50" r="42.25"/>
    <line x1="4" y1="50" x2="96" y2="50"/>
    <line x1="50" y1="4" x2="50" y2="96"/>
    <circle cx="50" cy="74.6" r="5"/>
    <path d="M23.7 32.07 L50 86 L76.3 32.07"/>
    <path d="M16.26 24.99 L30.8 46.55"/>
    <path d="M83.74 24.99 L69.2 46.55"/>
    <line x1="50" y1="50" x2="12.18" y2="36.98"/>
    <line x1="50" y1="50" x2="24.02" y2="19.58"/>
    <line x1="50" y1="50" x2="87.82" y2="36.98"/>
    <line x1="50" y1="50" x2="75.98" y2="19.58"/>
  </g>"""
    nodes = "\n".join(
        f'    <rect x="{x}" y="{y}" width="2.2" height="2.2"/>' for x, y in [
            (24.11, 37.15), (44.41, 75.69), (53.39, 75.69), (73.69, 37.15),
            (15.16, 23.89), (82.64, 23.89), (11.08, 35.88), (86.72, 35.88),
            (22.92, 18.48), (74.88, 18.48)])
    labels = "\n".join(
        f'    <text x="{x}" y="{y}">{t}</text>' for x, y, t in [
            (52, 8, "R = 40"), (52, 70, "ρ = 5"),
            (30, 12, "26° → 34°"), (4, 30, "khuyết 30°")])
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'
        ' width="800" height="800" role="img"'
        ' aria-label="Lá Số Việt — bản dựng hình logomark">\n'
        "  <title>Lá Số Việt — bản dựng hình logomark</title>\n"
        f'  <rect width="100" height="100" fill="{LACQUER}"/>\n'
        f"{grid}\n"
        f'  <g opacity="0.62">\n{mark_body(False, GOLD, SON, indent="    ")}\n  </g>\n'
        f'  <g fill="none" stroke="#F2DCA0" stroke-width="0.32">\n{nodes}\n  </g>\n'
        '  <g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="2.5"'
        f' fill="#8A7440">\n{labels}\n  </g>\n'
        "</svg>\n"
    )


def clearspace_svg():
    """Sơ đồ khoảng thở: lề tối thiểu quanh lockup = chiều cao chữ L viết hoa."""
    d, adv, m = text_to_path(WORDMARK, TEXT_SIZE_H, TRACK_H)
    cap = m["cap"]
    s = MARK_BOX_H / 100.0
    bb = ink_bbox(mark_svg(small=True, main="#000", vein="#000", size=None))
    mark_t, mark_b = bb[1] * s, bb[3] * s
    baseline = (mark_t + mark_b) / 2.0 + cap / 2.0
    left, top = bb[0] * s, min(mark_t, baseline + m["top"])
    right = MARK_BOX_H + GAP_H + m["x1"]
    bottom = max(mark_b, baseline + m["bottom"])
    lw, lh = right - left, bottom - top
    w, h = lw + 2 * cap, lh + 2 * cap
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}"'
        f' width="{w * 8:.0f}" height="{h * 8:.0f}" role="img"'
        ' aria-label="Lá Số Việt — sơ đồ khoảng thở quanh lockup">\n'
        "  <title>Lá Số Việt — sơ đồ khoảng thở quanh lockup</title>\n"
        f'  <rect width="{w:.2f}" height="{h:.2f}" fill="{LACQUER}"/>\n'
        f'  <rect x="{cap / 2:.2f}" y="{cap / 2:.2f}" width="{w - cap:.2f}"'
        f' height="{h - cap:.2f}" fill="none" stroke="{SON}" stroke-width="0.4"'
        ' stroke-dasharray="2 2" opacity="0.75"/>\n'
        f'  <rect x="{cap:.2f}" y="{cap:.2f}" width="{lw:.2f}" height="{lh:.2f}"'
        f' fill="none" stroke="{GOLD}" stroke-width="0.3" opacity="0.4"/>\n'
        f'  <g transform="translate({cap - left:.3f} {cap - top:.3f})">\n'
        f'    <g transform="scale({s:.5f})">\n'
        f"{mark_body(True, GOLD, SON, indent='      ')}\n"
        "    </g>\n"
        f'    <path fill="{CREAM}" transform="translate({MARK_BOX_H + GAP_H:.2f}'
        f' {baseline:.3f})" d="{d}"/>\n'
        "  </g>\n"
        '  <g font-family="IBM Plex Mono, ui-monospace, monospace" font-size="3"'
        f' fill="#8A7440">\n'
        f'    <text x="{cap:.2f}" y="{h - cap / 4:.2f}">lề tối thiểu = chiều cao chữ L'
        f' ({cap:.1f}px khi chữ hiệu 20px)</text>\n'
        "  </g>\n"
        "</svg>\n"
    )


def og_svg():
    """Ảnh chia sẻ mạng xã hội 1200×630 — nền sơn mài, lockup dọc đặt giữa."""
    inner = lockup_vertical(GOLD, SON, CREAM, "Lá Số Việt")
    body = inner.split("\n", 2)[2].rsplit("</svg>", 1)[0]
    head = inner.split("\n", 1)[0]
    vb = head.split('viewBox="0 0 ', 1)[1].split('"', 1)[0].split()
    lw, lh = float(vb[0]), float(vb[1])
    target_h = 232.0
    k = target_h / lh
    dx, dy = (1200 - lw * k) / 2.0, (630 - lh * k) / 2.0
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"'
        ' width="1200" height="630" role="img"'
        ' aria-label="Lá Số Việt — ảnh chia sẻ mạng xã hội">\n'
        "  <title>Lá Số Việt — ảnh chia sẻ mạng xã hội</title>\n"
        f'  <rect width="1200" height="630" fill="{LACQUER}"/>\n'
        f'  <rect x="40" y="40" width="1120" height="550" fill="none"'
        f' stroke="{GOLD}" stroke-width="1" opacity="0.22"/>\n'
        f'  <g transform="translate({dx:.2f} {dy:.2f}) scale({k:.5f})">\n'
        f"{body}"
        "  </g>\n"
        "</svg>\n"
    )


# ------------------------------------------------------------------ main
def main():
    for tool in ("rsvg-convert", "magick"):
        if not shutil.which(tool):
            raise SystemExit(f"thiếu {tool}")
    CACHE.mkdir(exist_ok=True)
    made = []

    # --- SVG: logomark ------------------------------------------------
    marks = [
        ("lasoviet-logomark-vang-son", dict(main=GOLD, vein=SON), False),
        ("lasoviet-logomark-vang-chuyen-sac", dict(gradient=True, vein=SON), False),
        ("lasoviet-logomark-mot-mau-kem", dict(main=CREAM, vein=CREAM), False),
        ("lasoviet-logomark-dao-muc", dict(main=INK, vein=INK), False),
        ("lasoviet-logomark-co-nho-vang-son", dict(main=GOLD, vein=SON), True),
        ("lasoviet-logomark-co-nho-mot-mau-kem", dict(main=CREAM, vein=CREAM), True),
        ("lasoviet-logomark-co-nho-dao-muc", dict(main=INK, vein=INK), True),
    ]
    for name, kw, small in marks:
        made.append(write(f"svg/{name}.svg", mark_svg(small=small, **kw)))

    # bản currentColor: không khai width/height, dùng để nhúng inline
    made.append(write("svg/lasoviet-logomark-currentcolor.svg",
                      mark_svg(main="currentColor", vein=SON, size=None)))
    made.append(write("svg/lasoviet-logomark-co-nho-currentcolor.svg",
                      mark_svg(small=True, main="currentColor", vein=SON, size=None)))

    # --- SVG: lockup & chữ hiệu ---------------------------------------
    made.append(write("svg/lasoviet-logo-ngang-vang-son.svg",
                      lockup_horizontal(GOLD, SON, CREAM, "Lá Số Việt")))
    made.append(write("svg/lasoviet-logo-ngang-mot-mau-kem.svg",
                      lockup_horizontal(CREAM, CREAM, CREAM, "Lá Số Việt")))
    made.append(write("svg/lasoviet-logo-ngang-dao-muc.svg",
                      lockup_horizontal(INK, SON, INK, "Lá Số Việt")))
    made.append(write("svg/lasoviet-logo-doc-vang-son.svg",
                      lockup_vertical(GOLD, SON, CREAM, "Lá Số Việt")))
    made.append(write("svg/lasoviet-logo-doc-mot-mau-kem.svg",
                      lockup_vertical(CREAM, CREAM, CREAM, "Lá Số Việt")))
    made.append(write("svg/lasoviet-logo-doc-dao-muc.svg",
                      lockup_vertical(INK, SON, INK, "Lá Số Việt")))
    made.append(write("svg/lasoviet-chu-hieu-kem.svg", wordmark_svg(CREAM, "Lá Số Việt")))
    made.append(write("svg/lasoviet-chu-hieu-muc.svg", wordmark_svg(INK, "Lá Số Việt")))

    # --- SVG: hồ sơ kỹ thuật ------------------------------------------
    made.append(write("svg/lasoviet-logomark-ban-dung-hinh.svg", construction_svg()))
    made.append(write("svg/lasoviet-logo-khoang-tho.svg", clearspace_svg()))
    made.append(write("social/lasoviet-og-image.svg", og_svg()))

    # --- PNG ----------------------------------------------------------
    for name, sizes in [
        ("lasoviet-logomark-vang-son", (1024, 512, 256, 128, 64)),
        ("lasoviet-logomark-vang-chuyen-sac", (1024, 512)),
        ("lasoviet-logomark-mot-mau-kem", (512, 256, 128)),
        ("lasoviet-logomark-dao-muc", (512, 256, 128)),
    ]:
        for s in sizes:
            made.append(rasterize(f"svg/{name}.svg", f"png/{name}-{s}.png", width=s, height=s))

    for name, widths in [
        ("lasoviet-logo-ngang-vang-son", (1600, 800, 400)),
        ("lasoviet-logo-ngang-mot-mau-kem", (1600, 800)),
        ("lasoviet-logo-ngang-dao-muc", (1600, 800)),
        ("lasoviet-logo-doc-vang-son", (1200, 600)),
        ("lasoviet-logo-doc-mot-mau-kem", (1200,)),
        ("lasoviet-logo-doc-dao-muc", (1200,)),
    ]:
        for w in widths:
            made.append(rasterize(f"svg/{name}.svg", f"png/{name}-{w}.png", width=w))

    made.append(rasterize("svg/lasoviet-logomark-ban-dung-hinh.svg",
                          "png/lasoviet-logomark-ban-dung-hinh-1200.png", width=1200))
    made.append(rasterize("svg/lasoviet-logo-khoang-tho.svg",
                          "png/lasoviet-logo-khoang-tho-1200.png", width=1200))
    made.append(rasterize("social/lasoviet-og-image.svg",
                          "social/lasoviet-og-image-1200x630.png", width=1200, height=630))

    # app icon: nền sơn mài đặc, lề an toàn 15%
    for s in (1024, 512):
        made.append(padded_icon("svg/lasoviet-logomark-vang-son.svg",
                                f"png/lasoviet-app-icon-{s}.png", s))

    # --- favicon ------------------------------------------------------
    made.append(write("favicon/favicon.svg",
                      mark_svg(small=True, main=GOLD, vein=SON, size=32,
                               title="Lá Số Việt")))
    for s in (16, 32, 48):
        made.append(rasterize("favicon/favicon.svg", f"favicon/favicon-{s}x{s}.png",
                              width=s, height=s))
    run(["magick", str(ROOT / "favicon/favicon-16x16.png"),
         str(ROOT / "favicon/favicon-32x32.png"), str(ROOT / "favicon/favicon-48x48.png"),
         str(ROOT / "favicon/favicon.ico")])
    made.append(ROOT / "favicon/favicon.ico")
    made.append(padded_icon("svg/lasoviet-logomark-co-nho-vang-son.svg",
                            "favicon/apple-touch-icon.png", 180, margin=0.12))
    for s in (192, 512):
        made.append(padded_icon("svg/lasoviet-logomark-vang-son.svg",
                                f"favicon/android-chrome-{s}x{s}.png", s, margin=0.12))
    made.append(write("favicon/site.webmanifest", json.dumps({
        "name": "Lá Số Việt",
        "short_name": "Lá Số Việt",
        "icons": [
            {"src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png"},
        ],
        "theme_color": LACQUER,
        "background_color": LACQUER,
        "display": "standalone",
    }, ensure_ascii=False, indent=2) + "\n"))

    shutil.rmtree(CACHE, ignore_errors=True)
    print(f"\n{len(made)} file:")
    for p in sorted(made):
        print(f"  {p.relative_to(ROOT)}  ({p.stat().st_size:,} B)")


if __name__ == "__main__":
    main()
