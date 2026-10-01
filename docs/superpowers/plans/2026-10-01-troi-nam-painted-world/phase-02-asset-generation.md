---
phase: 2
title: "asset-generation"
status: in-progress
priority: P1
effort: "0.5d Claude + thời gian gen của founder"
dependencies: []
---

# Phase 2: Sinh ảnh bổ sung (founder chạy ChatGPT)

> **ĐÃ GIAO 2026-10-01** — toàn bộ W01–W11 (bản chính + alt) nằm ở
> `/Users/admin/Downloads/lasoviet-3D-elements` (6 file zip, kèm QA.md, manifest.json,
> SHA256SUMS, WebP đã chuyển sẵn, preview ghép thử). Kết quả kiểm chứng độc lập và các bước
> nhập kho còn lại: xem [§ Nghiệm thu đợt giao](#nghiệm-thu-đợt-giao-2026-10-01) ở cuối file.
> Phần prompt bên dưới giữ nguyên làm hồ sơ nguồn gốc.

## Overview

Bộ 11 ảnh mới (ID **W01–W11**) để dựng thế giới lớp tranh. Phase này **không chặn Phase 1** —
founder gen song song. Mỗi ảnh có: prompt dán thẳng, kích thước, có/không alpha, tiêu chí QA,
và tên file SEO theo `docs/22-art-direction.md` §0.

**Vì sao cần gen thêm:** L01/L03/L04 là ảnh phẳng — núi, nước, trời dính liền một tấm. Muốn
có chiều sâu thật khi cuộn và muốn tia nắng bị núi che đúng chỗ, phải có **các lớp rời tách
nền**. Kho hiện tại không có lớp nào như vậy.

## Quy tắc chung khi gen

1. **Dán nguyên khối STYLE PREAMBLE vào cuối mọi prompt, không sửa một chữ.** Đây là thứ giữ
   11 ảnh trông cùng một thế giới (yêu cầu của skill `scroll-world-storytelling`).
2. **Gen W04 → W05 → W06 trong cùng một cuộc hội thoại, theo đúng thứ tự.** Sau W04, nói với
   ChatGPT: *"Same mountain range, same light, same painting. Now generate only the NEXT ridge
   closer to the viewer"*. Ba lớp phải trông như một dãy núi ở ba độ sâu, không phải ba dãy
   núi khác nhau.
3. **Ảnh có alpha:** yêu cầu rõ *"transparent background, PNG with real alpha channel, no
   checkerboard pattern drawn into the image, no white or black halo around edges"*. Kho cũ đã
   gen được alpha thật (T03, T07, T11, P01, P05, E01, E02) nên kỹ thuật này chạy được.
4. **Không có chữ, không người, không mặt.** Vi phạm là loại, gen lại.
5. Gen **2 bản** mỗi ảnh (`Wxx.png` và `Wxx-alt.png`) để có cái so.

### STYLE PREAMBLE (dán không sửa)

```
Vietnamese lacquer-painting realism — son mai sensibility rendered with photographic depth.
Deep lacquer-black ground (#0F0D0A to #1C1813), antique gold (#C9A44D) and pale gold (#F2DCA0)
catching every lit edge, a single restrained cinnabar red (#CE5B45) accent only where the
composition earns it. One low-angle raking light source, high contrast, long shadows. Layered
atmospheric haze separating depth planes. Quiet, museum-lit, preserved and provenanced mood.
No text, no letters, no numbers, no watermark, no logo, no signature, no seal, no people,
no faces, no boats with visible figures, no crystal ball, no incense smoke, no tarot cards,
no Western zodiac symbols, no purple cosmic nebula, no blue cast, no green cast.
Muted warm palette only. Photorealistic painterly finish, high detail.
```

---

## Nhóm 1 — Bầu trời (không có tiền cảnh)

Ba tấm này nằm sau cùng. **Tuyệt đối không được có núi, nước, cây, hay đường chân trời cứng** —
vì núi sẽ là lớp riêng đặt đè lên. Đây là lỗi dễ mắc nhất: ChatGPT rất hay tự thêm núi.

### W01 — Trời bình minh
- **Kích thước:** 2560×1440 · **Alpha:** không · **File:** `bau-troi-binh-minh-son-mai-trang-chu.webp`

```
A wide empty dawn sky only — no land, no mountains, no water, no horizon line, no silhouettes
of any kind. Warm gold light rising from the lower right, spreading through thin layered
cloud banks. Deep warm brown-black at the top of the frame fading to pale amber near the
bottom edge. Soft volumetric haze. The lower third is the brightest area; the sun itself is
just below the frame and never visible as a disk. Nothing but sky and cloud.

[STYLE PREAMBLE]
```

### W02 — Trời hoàng hôn
- **Kích thước:** 2560×1440 · **Alpha:** không · **File:** `bau-troi-hoang-hon-son-mai-trang-chu.webp`

```
A wide empty dusk sky only — no land, no mountains, no water, no horizon line, no silhouettes
of any kind. The warm light has retreated to a narrow band low on the right; the upper two
thirds have gone deep ember-brown toward near-black. Thin torn cloud layers catch the last
cinnabar-tinged light on their undersides. Cooler and darker than dawn but still warm-toned,
never blue. Nothing but sky and cloud.

[STYLE PREAMBLE]
```

### W03 — Trời đêm sao
- **Kích thước:** 2560×1440 · **Alpha:** không · **File:** `bau-troi-dem-ngan-ha-son-mai-trang-chu.webp`

```
A wide empty night sky only — no land, no mountains, no water, no horizon line, no silhouettes
of any kind. A dense Milky Way band arcs from the lower left to the upper right, its dust
lanes rendered in warm amber and brown rather than blue. Thousands of fine stars at varying
brightness. A faint warm glow remains along the bottom edge as if from a distant unseen
shore. Deep near-black elsewhere. Nothing but sky and stars.

[STYLE PREAMBLE]
```

> **Ghi chú:** W03 khác L04 ở chỗ L04 đã có núi Hạ Long dính ở đáy ảnh. L04 vẫn dùng cho
> crossfade Phase 1; W03 dùng cho world 3D Phase 3.

---

## Nhóm 2 — Ba lớp núi đá vôi (alpha) ★ quan trọng nhất

Đây là bộ ảnh mà toàn bộ hiệu ứng chiều sâu và tia nắng phụ thuộc vào. Gen liên tiếp trong
một cuộc hội thoại.

### W04 — Núi lớp XA (mờ nhất)
- **Kích thước:** 2560×1440 · **Alpha:** CÓ · **File:** `nui-da-voi-lop-xa-trang-chu.webp`

```
A horizontal band of distant Vietnamese karst limestone peaks, seen across water haze, as a
single continuous ridge line spanning the full width of the frame. Low contrast, pale and
hazy, as if 3 kilometres away — the atmosphere has drained most of their darkness. Sharp
irregular tower-karst silhouettes with rounded vegetated tops, never symmetrical cones.
The ridge occupies only the lower third of the frame.

CRITICAL: fully transparent background — the sky must be empty alpha, not painted. Transparent
PNG with a real alpha channel. No checkerboard pattern drawn into the image. No white or black
halo or fringe around the silhouette edges. Clean anti-aliased edges. No water, no reflection,
no foreground, no sky gradient — only the karst band on transparency.

[STYLE PREAMBLE]
```

### W05 — Núi lớp GIỮA
- **Kích thước:** 2560×1440 · **Alpha:** CÓ · **File:** `nui-da-voi-lop-giua-trang-chu.webp`

```
Same mountain range, same painting, same light as the previous image. Now generate only the
NEXT ridge closer to the viewer: taller peaks, noticeably darker and more saturated than the
distant band, individual rock faces and vegetation clumps beginning to read, thin mist still
pooling at their bases. The ridge occupies the lower half of the frame, with two or three
dominant peaks offset from centre.

CRITICAL: fully transparent background — sky must be empty alpha, not painted. Transparent PNG
with a real alpha channel. No checkerboard drawn into the image. No white or black halo around
edges. No water, no sky, no distant range — only this one ridge on transparency.

[STYLE PREAMBLE]
```

### W06 — Núi lớp GẦN
- **Kích thước:** 2560×1440 · **Alpha:** CÓ · **File:** `nui-da-voi-lop-gan-trang-chu.webp`

```
Same mountain range, same painting, same light as the previous two images. Now generate only
the NEAREST karst mass: a large dark limestone cliff entering from the right side of the
frame, close enough that individual rock strata, cracks, hanging vegetation and tree
silhouettes are fully legible. Near-black with gold rim light along its lit edge. It occupies
the right third of the frame and leaves the left two thirds completely empty.

CRITICAL: fully transparent background — everything except the cliff must be empty alpha.
Transparent PNG with a real alpha channel. No checkerboard drawn into the image. No white or
black halo around edges. Leaf and branch edges must be cleanly cut, not blurred into a blob.
No water, no sky — only the cliff mass on transparency.

[STYLE PREAMBLE]
```

---

## Nhóm 3 — Mặt nước và tiền cảnh

### W07 — Mặt nước tĩnh
- **Kích thước:** 2560×1024 · **Alpha:** CÓ (mờ dần ở mép trên) · **File:** `mat-nuoc-tinh-phan-chieu-vang-trang-chu.webp`

```
A still water surface seen in perspective from just above it, filling the frame from a distant
edge at the top to close foreground at the bottom. Fine wind ripples, progressively larger and
more separated toward the viewer. A broken vertical path of warm gold reflected light runs
from the top edge down toward the lower right, fragmented into horizontal ripple segments —
never a solid triangle of light. Deep near-black water everywhere else.

CRITICAL: the top edge must fade to fully transparent alpha over roughly the top 15 percent so
this plate can be composited against a separate horizon. Transparent PNG with a real alpha
channel. No checkerboard drawn into the image. No land, no mountains, no boats, no sky.

[STYLE PREAMBLE]
```

### W08 — Khung tiền cảnh (vách đá + tán lá)
- **Kích thước:** 2560×1440 · **Alpha:** CÓ · **File:** `khung-tien-canh-vach-da-tan-la-trang-chu.webp`

```
An extreme foreground framing element: dark rock and overhanging tropical foliage entering
from the top edge and the left edge of the frame only, as if the viewer stands just inside a
cave mouth or under a tree. Almost pure silhouette, near-black, with a thin gold rim on the
few lit leaf edges. The entire centre and lower right of the frame is empty.

CRITICAL: fully transparent background — only the rock and foliage carry pixels. Transparent
PNG with a real alpha channel. No checkerboard drawn into the image. No white or black halo.
Individual leaf edges must be cleanly separated, not merged into a solid mass. No sky, no
water, no mountains.

[STYLE PREAMBLE]
```

### W09 — Vật thể trung cảnh (lưới 2×1)
- **Kích thước:** 2048×1024 (2 ô, mỗi ô 1024×1024) · **Alpha:** CÓ · **File:** cắt thành `thuy-dinh-co-trang-chu.webp`, `thuyen-nan-tren-nuoc-trang-chu.webp`

```
Two separate objects side by side on one fully transparent background, clearly separated with
empty space between them, each centred in its own half of the frame:
LEFT: a small traditional Vietnamese water pavilion (thuy dinh) on slender wooden stilts,
tiled curved roof, seen from a low distant angle, near-silhouette with warm gold light showing
between its columns.
RIGHT: an empty small wooden sampan boat, long and narrow, seen from the same distance and
angle, near-silhouette, no person aboard, no oar raised.

CRITICAL: fully transparent background. Transparent PNG with a real alpha channel. No
checkerboard drawn into the image. No white or black halo. No water beneath the objects, no
reflection, no sky, no ground — the two objects float on pure transparency.

[STYLE PREAMBLE]
```

---

## Nhóm 4 — Nguồn sáng và hạt

### W10 — Đĩa mặt trời + quầng sáng
- **Kích thước:** 1024×1024 · **Alpha:** CÓ · **File:** `dia-mat-troi-quang-sang-vang-trang-chu.webp`

```
A single warm light source on transparency: a small soft-edged pale gold disk at the exact
centre, surrounded by a broad smooth radial halo that fades to fully transparent well before
the edge of the frame. The halo is warm amber, never white-hot and never blue. Perfectly
radially symmetric. Nothing else in the frame.

CRITICAL: fully transparent background, transparent PNG with a real alpha channel, alpha
falling smoothly to zero at the frame edge. No checkerboard drawn into the image. No lens
flare streaks, no starburst spikes, no rings, no text.

[STYLE PREAMBLE]
```

### W11 — Hạt sao / đốm sáng (lưới 3×2)
- **Kích thước:** 1536×1024 (6 ô 512×512) · **Alpha:** CÓ · **File:** cắt thành `hat-sao-{1..6}-trang-chu.webp`

```
Six separate small light particles arranged in a 3 by 2 grid on one fully transparent
background, clearly separated, each centred in its own cell: a four-pointed soft star, a round
soft glow, a tiny sharp point with a faint halo, an elongated spark, a dim distant pinpoint,
and a slightly larger warm bokeh disk. All pale gold to warm amber. Each fades smoothly to
transparent at its own edges.

CRITICAL: fully transparent background, transparent PNG with a real alpha channel, no
checkerboard drawn into the image, no white or black box around any particle, no grid lines,
no labels, no text.

[STYLE PREAMBLE]
```

---

## QA bắt buộc trước khi nhập kho

Dùng đúng bảng kiểm của kho cũ (`QA.md`), thêm 2 mục cho alpha:

| Mã | Kiểm tra |
|---|---|
| a | Không có chữ/số/watermark/chữ ký |
| b | Đúng bảng màu (vàng/son/đen sơn mài; không lam, không lục, không tím) |
| c | Bố cục chừa ≥40% vùng tối để đè chữ |
| d | Không méo hình, không vật thể dị dạng |
| e | **Alpha thật** — mở bằng công cụ kiểm tra, không phải nền ca-rô vẽ vào ảnh |
| f | **Không viền quầng** trắng/đen quanh mép cắt |
| g | Đúng kích thước yêu cầu |
| h | Chất lượng "sang" — không giả, không nhựa |
| i | Nhóm 1 (W01–W03): **không có núi/nước/đường chân trời** lọt vào |
| j | Nhóm 2 (W04–W06): ba lớp trông như **một** dãy núi ở ba độ sâu |

Lệnh kiểm alpha nhanh (chạy trong repo):

```bash
node -e "const s=require('sharp');(async()=>{for(const f of process.argv.slice(1)){
const m=await s(f).metadata();const st=m.hasAlpha?await s(f).stats():null;
console.log(f, m.width+'x'+m.height, 'alpha='+!!m.hasAlpha, st?('alphaMean='+st.channels[3].mean.toFixed(1)):'');}})()" \
  ~/Downloads/troi-nam-w/W04.png ~/Downloads/troi-nam-w/W05.png ~/Downloads/troi-nam-w/W06.png
```
`alpha=true` và `alphaMean` nằm khoảng 20–80 là dấu hiệu tách nền thật. `alpha=false` hoặc
`alphaMean≈255` nghĩa là ChatGPT vẽ nền ca-rô/đặc vào ảnh → gen lại.

## Nhập kho

Thêm vào `scripts/build-troi-nam-assets.mjs`:
- W01–W03 → mảng `PHOTOS`, thư mục `canh`, widths `[960, 1440, 1920, 2560]`
- W04–W08, W10 → mảng `OVERLAYS`, loại `"photo"`, thư mục `the-gioi`
- W09 → mảng `GRIDS`, thư mục `vat-the/trung-canh`
- W11 → mảng `GRIDS`, thư mục `vat-the/hat-sao`

Rồi chạy `node scripts/build-troi-nam-assets.mjs ~/Downloads/troi-nam-w` và commit kết quả.

## Phương án dự phòng (nếu alpha gen ra không đạt)

Pipeline đã có sẵn kỹ thuật **dùng độ sáng làm kênh alpha** (đang dùng cho I01/I02 — xem
comment `ICON_SHEETS` trong script). Núi trong L01/L04 là bóng tối trên nền trời sáng, nên có
thể tách lớp bằng luminance key trực tiếp từ L01/L04. Chất lượng kém hơn (mép cây bị bệt,
sương bị ăn mất) nhưng đủ để làm **mặt nạ che cho god-ray**, kể cả khi không đủ đẹp để làm lớp
nhìn thấy. Nếu phải dùng phương án này: chỉ dùng làm mặt nạ, giữ ảnh gốc làm lớp hiển thị.

## Success Criteria

- [ ] 11 ảnh W01–W11 (kèm bản `-alt`) gen xong, qua hết bảng QA a–j
- [ ] W04/W05/W06 đặt chồng lên nhau trong Photoshop/Preview trông như một dãy núi liền mạch
- [ ] Lệnh kiểm alpha báo `alpha=true` cho W04–W11
- [ ] Script asset cập nhật, chạy sạch, manifest có đủ ID mới
- [ ] Kích thước tổng của bộ W sau khi nén WebP < 4 MB

## Risk Assessment

- **ChatGPT tự thêm núi vào ảnh trời (W01–W03):** lỗi hay gặp nhất. Prompt đã nhấn 3 lần; nếu
  vẫn dính, yêu cầu *"crop the bottom 20% away and regenerate only the sky"*.
- **Ba lớp núi không khớp nhau:** bắt buộc gen liên tiếp một hội thoại. Nếu lệch, gen lại cả
  bộ 3 chứ không sửa lẻ một lớp.
- **Alpha giả (vẽ ca-rô vào ảnh):** lệnh kiểm ở trên bắt được ngay, không để lọt vào repo.

---

## Nghiệm thu đợt giao 2026-10-01

### Kiểm chứng độc lập (Claude tự đo, không dựa vào báo cáo của ChatGPT)

| ID | Kích thước | Alpha | alphaMean | Hộp bao silhouette (y) | Ghi chú |
|---|---|---|---:|---|---|
| W01/W02/W03 | 2560×1440 | opaque | — | — | Không có núi/nước/đường chân trời cứng ✔ |
| W04 | 2560×1440 | **thật** (0–255) | 33.4 | 1113–1439 = **77.3%→100%** | Silhouette cao **22.7%** khung |
| W05 | 2560×1440 | **thật** | 62.5 | 756–1439 = **52.5%→100%** | Silhouette cao **47.5%** khung |
| W06 | 2560×1440 | **thật** | 54.3 | 99–1439, x 1744–2559 | Khối phải, cao **93%**, đáy rộng 32% |
| W07 | 2560×1024 | **thật** | 235.8 | fade 154 hàng (15%) rồi đặc | Gần như kín khung — che mọi thứ phía sau |
| W08 | 2560×1440 | **thật** | 60.6 | mép trên + trái, đáy rộng 11% | Khung tiền cảnh ✔ |
| W09 | 2048×1024 | **thật** | 38.7 | — | Đã tách sẵn 2 file: thuỷ đình, thuyền nan |
| W10 | 1024×1024 | **thật** | 52.1 | — | Đối xứng xuyên tâm, alpha=0 ở mép ✔ |
| W11 | 1536×1024 | **thật** | 6.9 | — | Đã tách sẵn 6 file `hat-sao-{1..6}` |

Toàn bộ alpha đều thật (min=0, max=253–255), không có nền ca-rô vẽ vào ảnh. Bảng QA a–j của
ChatGPT khớp với số đo của Claude. **Đạt.**

### Ba điều phát hiện thêm, ảnh hưởng trực tiếp tới Phase 3

**1. Nguồn gen ở độ phân giải thấp hơn rồi phóng to.** ChatGPT khai báo rõ trong QA: nguồn
Imagegen là 1672×941 (W01–W03, W08), 1983×793 (W07), rồi Sharp phóng lên 2560. Nghĩa là
**chi tiết thật chỉ ~1672px**, phần còn lại là nội suy. Theo skill `3d-high-resolution-textures`:
*"Upscaling a small source cannot invent captured detail"*. Giao texture 2560 chỉ tốn gấp 2.3
lần bộ nhớ GPU mà không thêm chi tiết nào.

→ **Quyết định: hạ cỡ khi nhập kho.** Bảng cỡ cuối ở [phase-03](./phase-03-painted-layer-world.md#kích-thước-texture-cuối).
Ước tính bộ nhớ GPU: 2560 cho tất cả ≈ **142 MB** (vượt ngân sách 120 MB); theo bảng đã hạ ≈
**74 MB**. Không mất chi tiết nhìn thấy được.

**2. W07 (nước) gần như đục hoàn toàn** (alphaMean 235.8, chỉ fade 15% ở mép trên). Xếp chồng
nguyên khung thì nước **che sạch W04/W05** — Claude đã dựng thử và tái hiện đúng lỗi này.
→ Vị trí/tỉ lệ từng lớp là bắt buộc, không được xếp chồng "full canvas". Luật đặt lớp ở Phase 3.

**3. W01/W02 có dải sáng ở đáy khung** trông như ánh sáng phía chân trời. Không phải silhouette
nên vẫn đạt mục i, nhưng **phải luôn nằm khuất sau lớp núi/nước**, không bao giờ để lộ.

### Chọn bản chính hay alt — ĐÃ CHỐT: **bản chính**

`group-a-qa/manifest.json` khuyến nghị `"alt"`, nhưng Claude đã ghép thử **cả hai bộ ở cùng
khung p=0 với cùng thông số đặt lớp** và founder chọn **bản chính** (2026-10-01). Bản chính
nhiều sương và chiều sâu khí quyển hơn; bản alt lộ trời nhiều hơn nhưng núi gần đè mạnh hơn.

→ Nhập kho **chỉ bản chính** (`Wxx.png`). Giữ `Wxx-alt.png` trong thư mục nguồn làm dự phòng,
**không** đưa vào repo.

### Nhập kho (việc còn lại của Phase 2)

Nguồn đã có sẵn WebP đúng tên SEO, nhưng **không dùng trực tiếp** — phải đi qua
`scripts/build-troi-nam-assets.mjs` để manifest, srcset và quy ước thư mục nhất quán với 78
ảnh cũ. Các dòng cần thêm:

```js
// PHOTOS — bầu trời (opaque, responsive)
["W01", "canh", "bau-troi-binh-minh-son-mai-trang-chu",  [960, 1440, 1920]],
["W02", "canh", "bau-troi-hoang-hon-son-mai-trang-chu",  [960, 1440, 1920]],
["W03", "canh", "bau-troi-dem-ngan-ha-son-mai-trang-chu",[960, 1440, 1920]],

// OVERLAYS — lớp thế giới (alpha)
["W04", "the-gioi", "nui-da-voi-lop-xa-trang-chu",            "photo"],
["W05", "the-gioi", "nui-da-voi-lop-giua-trang-chu",          "photo"],
["W06", "the-gioi", "nui-da-voi-lop-gan-trang-chu",           "photo"],
["W07", "the-gioi", "mat-nuoc-tinh-phan-chieu-vang-trang-chu","photo"],
["W08", "the-gioi", "khung-tien-canh-vach-da-tan-la-trang-chu","photo"],
["W10", "the-gioi", "dia-mat-troi-quang-sang-vang-trang-chu", "photo"],

// GRIDS — đã tách sẵn, chỉ cần copy vào đúng thư mục + ghi manifest
["W09", "vat-the/trung-canh", ["thuy-dinh-co", "thuyen-nan-tren-nuoc"]],
["W11", "vat-the/hat-sao",    ["hat-sao-1","hat-sao-2","hat-sao-3","hat-sao-4","hat-sao-5","hat-sao-6"]],
```

**Lưu ý:** W09/W11 ChatGPT đã tách rời sẵn thành file riêng, nên **không chạy qua nhánh
`GRIDS`** (vốn tách theo hộp bao alpha từ một tấm lưới). Thêm một nhánh nhỏ `PRESPLIT` trong
script, hoặc xử lý như `OVERLAYS` từng file. Chọn cách nào cũng được, miễn manifest ra đúng
dạng `W09.thuy-dinh-co`, `W11.hat-sao-1`.

Lệnh: `node scripts/build-troi-nam-assets.mjs ~/Downloads/lasoviet-3D-elements/<đã-giải-nén>`

### Việc còn lại

- [ ] Giải nén 6 zip vào một thư mục phẳng theo quy ước `Wxx.png` / `Wxx-alt.png`
- [ ] Thêm các dòng trên vào `scripts/build-troi-nam-assets.mjs` (kèm nhánh `PRESPLIT`)
- [ ] Hạ cỡ theo bảng ở Phase 3 **trong script**, không hạ thủ công
- [ ] Chạy script, commit ảnh + manifest
- [ ] Kiểm: `troiNamAsset("W04")` trả về đúng đường dẫn, không ném lỗi
