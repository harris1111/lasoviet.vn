---
phase: 3
title: "painted-layer-world"
status: completed
priority: P1
effort: "2d"
dependencies: [1, 2]
---

> **Đã triển khai 2026-10-01.** Kết quả thật và một thay đổi so với kế hoạch gốc: xem
> [§ Kết quả thật](#kết-quả-thật-2026-10-01) ở cuối file. Tóm tắt: **bỏ cơ chế đệm chống lộ
> mép khi camera nghiêng** (mục "Luật 3"/`CAMERA_TILT_MARGIN_DEG` trong bản thảo) — cả hai cách
> thử (texture repeat>1 lẫn geometry 3-hàng-đỉnh tự viết) đều gây lỗi dựng hình thật (sọc dọc)
> trên renderer phần mềm của môi trường này. Thay vào đó dùng kích thước đúng-như-thiết-kế,
> chấp nhận một đường nối nhẹ giữa núi và trời ở pha hoàng hôn/đêm — đã nhìn thấy, chấp nhận
> được, không phải lỗi dựng hình.

# Phase 3: Thế giới lớp tranh

## Overview

Thay toàn bộ hình học vector bằng **các mặt phẳng dán tranh W01–W11** đặt ở độ sâu khác nhau.
Camera đi qua chúng sinh parallax thật. Không còn pixel nào do code tô màu.

Kế hoạch này viết **sau khi đã đo thật từng file ảnh được giao** (2026-10-01), nên mọi con số
dưới đây là số đo, không phải ước lượng.

## Luật hình học — đọc trước, nếu không sẽ đặt lớp sai

### Luật 1 (bất biến): khoảng cách KHÔNG đổi độ lớn nhìn thấy

Một mặt phẳng phủ kín khung hình thì **kích thước biểu kiến của nội dung trong nó là cố định**,
bất kể đặt xa hay gần — vì muốn phủ kín khung ở xa thì phải phóng to đúng tỉ lệ ấy. Khoảng
cách `z` **chỉ điều khiển tốc độ parallax**, không điều khiển độ lớn.

→ Hệ quả: chỉnh `z` để sửa "núi to quá" là **vô ích**. Phải chỉnh **tỉ lệ mặt phẳng**.

### Luật 2 (độ lớn): tỉ lệ silhouette đã đo được

Mỗi ảnh có phần ăn mực chiếm một tỉ lệ cố định chiều cao khung của chính nó:

| Ảnh | Hộp bao (y) | **Tỉ lệ silhouette `f`** |
|---|---|---:|
| W04 núi xa | 1113–1439 / 1440 | **0.227** |
| W05 núi giữa | 756–1439 / 1440 | **0.475** |
| W06 núi gần | 99–1439 / 1440 | **0.931** |

Công thức đặt lớp:

```
d          = cameraZ − planeZ                    // khoảng cách
visibleH   = 2 · d · tan(fov/2)                  // chiều cao khung tại d
visibleW   = visibleH · aspect

planeW     = overscan · visibleW                 // overscan ≥ 1.0, biên dự phòng khi camera dịch
planeH     = planeW / textureAspect              // textureAspect = 16/9 (W04–W06, W08), 2.5 (W07)

// chiều cao biểu kiến của núi TÍNH TỪ ĐƯỜNG NƯỚC:
apparentAboveWater = f · planeH / visibleH = f · overscan
```

**Cảnh báo (Claude đã mắc rồi sửa):** vì W04–W06 cùng tỉ lệ 16:9 với khung hình, mặt phẳng vừa
khít khung thì **không thể làm núi thấp hơn `f`**. Muốn núi xa chỉ cao 15% khung là bất khả thi
với `f = 0.227` — thu nhỏ sẽ hở hai bên. Giá trị tự nhiên chính là `f`, và núm chỉnh duy nhất
là `overscan` (phóng to) cộng với việc **neo đáy xuống dưới đường nước** (dìm bớt chân núi).

### Luật 3 (căn chỉnh): mọi chân núi phải chạm cùng một đường nước

Đặt một hằng số nghệ thuật duy nhất `WATERLINE_SCREEN = 0.50` (50% tính từ đáy khung ở p=0).
Neo **đáy mặt phẳng** của cả ba lớp núi xuống dưới đường này ~1% chiều cao khung, rồi mặt nước
W07 phủ từ đó xuống (mép fade của W07 trùng đường nước). Không anchor theo world-y cố định — ba
lớp có tỉ lệ khác nhau nên anchor chung world-y sẽ cho ba đường chân núi lệch nhau.

## Bảng đặt lớp khởi điểm — đã kiểm bằng render thử

Camera p=0 (giữ nguyên `applyResponsiveFraming` hiện có): `pos (0, 1.4, 6)`, `look (0, 0.4, −6)`,
`fov 40°` desktop. `tan(20°) = 0.3640`.

Các giá trị `overscan` dưới đây **không phải suy luận** — Claude đã ghép thử hai vòng bằng Sharp
ở khung 1600×900 rồi soi mắt. Vòng 1 (overscan 1.17/1.31/1.62, waterline 0.42) cho núi quá to,
che gần hết trời, và tiền cảnh lấp mất vùng trái dành cho chữ hero. Vòng 2 dưới đây đạt.

| # | Lớp | Ảnh | z | d | **overscan** | Neo | Parallax |
|---|---|---|---:|---:|---:|---|---|
| 1 | Trời | W01/W02/W03 | −60 | 66 | phủ kín | khoá theo camera | 0 |
| 2 | Mặt trời | W10 | −40 | 46 | sprite ~Ø8 | theo hướng sáng | rất nhỏ |
| 3 | Núi xa | W04 | −26 | 32 | **1.00** | đáy = waterline +1% | chậm |
| 4 | Sương 1 | T11 | −20 | 26 | 1.3 | — | |
| 5 | Núi giữa | W05 | −15 | 21 | **1.06** | đáy = waterline +1% | vừa |
| 6 | Thuỷ đình + thuyền | W09 | −10 | 16 | sprite | trên đường nước | |
| 7 | Sương 2 | T11 | −8 | 14 | 1.3 | — | |
| 8 | Núi gần | W06 | −6 | 12 | **1.28** | đáy = waterline +1% | nhanh |
| 9 | Mặt nước | W07 | −2 | 8 | **1.20** | mép fade = waterline | nhanh |
| 10 | Khung tiền cảnh | W08 | +3.2 | 2.8 | **1.00**, **lật ngang** | lệch lên ~7% khung | nhanh nhất |

**W08 phải lật ngang (`flop`).** Bản gốc có tán lá ở mép **trên + trái**, đè đúng vào vùng chữ
hero và form. Lật lại thì khung lá ôm mép **trên + phải**, chừa nửa trái tối cho chữ — đúng
yêu cầu "chừa ≥40% vùng tối" của `docs/22-art-direction.md`. Đây là ảnh trang trí, lật không
vi phạm luật thương hiệu (luật cấm lật chỉ áp cho logomark).

### Trời bị che ở p=0 là **có chủ ý**

Ở bố cục này núi + tán lá chiếm gần hết phần trên, trời chỉ hở vài mảng. Đó là đúng: p=0 là
khung nhìn gần mặt nước, thân mật. Trời lộ dần khi camera ngẩng lên theo chapter ledger
(`look.y` đi từ 0.4 → 2.6 → 6.5), nên **dải Ngân Hà W03 chỉ mở ra trọn vẹn ở cảnh đêm** — đó
chính là cao trào thị giác của hành trình, không phải lỗi bố cục.

## Kích thước texture cuối

**Căn cứ:** ChatGPT khai báo nguồn Imagegen là 1672×941 (W01–W03, W08), 1983×793 (W07), rồi
Sharp phóng lên 2560. Chi tiết thật chỉ tới ~1672px. Giao 2560 chỉ tốn bộ nhớ, không thêm
chi tiết (`3d-high-resolution-textures`: *"Upscaling a small source cannot invent captured detail"*).

| Ảnh | Giao ở | Lý do | GPU (RGBA + mip) |
|---|---|---|---:|
| W01–W03 trời | 1920×1080 | tần số thấp, 3 tấm chồng | 11.1 MB × 3 |
| W04 núi xa | 1280×720 | mờ, tương phản thấp, ở xa | 4.9 MB |
| W05 núi giữa | 1600×900 | chi tiết trung bình | 7.7 MB |
| W06 núi gần | 1920×1080 | chiếm khung nhiều nhất | 11.1 MB |
| W07 nước | 1920×768 | nguồn thật 1983 | 7.9 MB |
| W08 tiền cảnh | 1920×1080 | gần camera nhất, mép lá quan trọng | 11.1 MB |
| W09 vật thể | 768×768 mỗi cái | nhỏ trên màn hình | 3.1 MB × 2 |
| W10 mặt trời | 512×512 | gradient xuyên tâm | 1.4 MB |
| W11 hạt sao | 256×256 mỗi hạt | vài pixel trên màn hình | 0.35 MB × 6 |
| | | **Tổng** | **≈ 86 MB** |

Nếu giao nguyên 2560 cho tất cả: **≈ 177 MB** — vượt xa ngân sách 120 MB mà không đẹp hơn.

**Hạ cỡ trong `build-troi-nam-assets.mjs`**, không hạ thủ công.

## Mạch sáng phải nhất quán (bắt buộc)

Các lớp núi được vẽ với **ánh sáng hoàng hôn nướng sẵn** (W04 opaqueMeanLuma 131.7, W05 63).
Khi trời đổi sang đêm W03, núi vẫn sáng như hoàng hôn → sai khí quyển, `3d-sky-background`
cảnh báo đúng chỗ này.

→ Giữ lại cơ chế `setNightWeight` của bản cũ (nó đúng, chỉ phần hình học là sai): nhân màu lớp
núi dần về `#060812` theo trọng số `night`, và giảm opacity nhẹ. Kiểm bằng cách chụp p=0.9 rồi
soi: viền vàng trên đá phải tắt gần hết.

Tương tự, vệt phản chiếu vàng trong W07 phải mờ theo `night` (uniform đã có sẵn ở bản cũ).

## Hai ràng buộc từ ảnh thật

1. **Dải sáng đáy W01/W02** — trông như ánh chân trời. Phải luôn khuất sau núi/nước. Kiểm ở
   cả 390 và 1440: không mốc p nào để lộ dải này thành một đường ngang lơ lửng.
2. **W07 gần như đục** (alphaMean 235.8, chỉ fade 15% mép trên). Nó **che sạch** mọi thứ phía
   sau nếu đặt sai — Claude đã dựng thử và tái hiện đúng lỗi này. Mép fade phải trùng waterline.

## Related Code Files

- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-layers.ts` — dựng 10 lớp theo bảng, `setPhase(weights)`
- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-textures.ts` — nạp texture: `colorSpace`, mipmap, anisotropy, hàng đợi ưu tiên, `disposeAll()`
- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-chapters.ts` — ledger chapter (đã phác ở bản trước)
- Modify: `troi-nam-world-scene.ts` — dùng layers thay terrain/light/water
- Modify: `troi-nam-world-light.ts` — bỏ gradient vẽ tay, chuyển sang 3 tấm trời + giữ gradient làm **dự phòng** khi ảnh lỗi
- Modify: `troi-nam-world-water.ts` — dán W07; giữ gợn sóng vertex nhẹ và uniform `uNightWeight`
- **Delete:** `troi-nam-world-terrain.ts` — hình học vector, thứ founder bác
- Modify: `prototype/revamp-2026-09/troi-nam-world/` — harness thử trước khi lên trang thật

## Implementation Steps

> **Bước 0 — chọn bộ ảnh.** `group-a-qa/manifest.json` ghi `recommendedSet: "alt"`. Dựng
> **cả bản chính và alt ở cùng khung p=0**, xuất 2 ảnh cạnh nhau, founder chọn. Không tự quyết.

1. Gọi skill `3d-sky-background` và `3d-high-resolution-textures` đọc đầy đủ trước khi viết code.
2. `troi-nam-world-textures.ts`:
   - `texture.colorSpace = THREE.SRGBColorSpace` cho **mọi** ảnh màu (lỗi thầm lặng hay gặp nhất).
   - `generateMipmaps = true`, `minFilter = LinearMipmapLinearFilter`.
   - `anisotropy = min(4, maxAnisotropy)` **chỉ cho W07** (góc tà); các lớp khác nhìn gần vuông góc.
   - Hàng đợi 2 mức: *bắt buộc* (W01, W04–W08) và *hoãn* (W02, W03, W09–W11, T11).
3. `troi-nam-world-layers.ts`: dựng theo bảng đặt lớp, dùng công thức Luật 2/3 — **không
   hardcode kích thước mặt phẳng**, tính từ `fov`/`aspect`/`z` để đổi viewport vẫn đúng.
4. Trời: 3 tấm, opacity theo công thức đặc tả (`1-dusk`, `dusk*(1-night)`, `night`), khoá vị
   trí theo camera. Gradient CanvasTexture rẻ tiền vẽ ngay từ frame đầu, ảnh thật pha vào sau.
5. Nước: W07, mép fade trùng waterline, giữ gợn sóng + `uNightWeight`.
6. Xoá `troi-nam-world-terrain.ts` và mọi tham chiếu.
7. Nối ledger chapter vào `applyPose` (camera + trọng số lớp cùng một nguồn).
8. **Chụp p=0 đặt cạnh ảnh L01 để so.** Đây là cổng quyết định — không đạt thì dừng, giữ Phase 1.
9. Chạy trong harness prototype trước, rồi mới bật trên `/troi-nam`.

## Success Criteria

- [ ] Ảnh so sánh cạnh nhau: world p=0 vs L01 — world **không thua** về độ sang (founder duyệt)
- [ ] So bản chính vs alt, founder chọn, ghi lại lựa chọn vào manifest
- [ ] Cuộn thấy chiều sâu rõ: lớp gần trượt nhanh hơn lớp xa, không giật, đảo chiều đúng
- [ ] Ba chân núi chạm **cùng một** đường nước ở mọi cỡ màn hình (390, 768, 1440)
- [ ] Không mốc p nào lộ dải sáng đáy trời thành đường ngang lơ lửng
- [ ] p=0.9: viền vàng trên đá đã tắt (núi đã ngả màu đêm), không còn "núi hoàng hôn dưới trời sao"
- [ ] Mạng chậm 3G: có trời dự phòng ngay, ảnh vào dần, không khung đen
- [ ] Chặn 1 file texture → world vẫn chạy
- [ ] `renderer.info`: draw call ≤ 40, triangle ≤ 20k; bộ nhớ texture ước tính ≤ 120 MB
- [ ] Không còn file/hàm nào sinh hình học trang trí bằng code
- [ ] Ảnh chụp 4 mốc p ở 390 và 1440

## Risk Assessment

| Rủi ro | Giảm thiểu |
|---|---|
| **"Sân khấu giấy bồi"** khi camera dịch nhiều | Biên độ ngang ≤1.5 đơn vị; luôn có sương xen giữa hai lớp kề; lớp gần luôn tối hơn lớp xa |
| **Overscan không đủ** → lộ mép mặt phẳng | Đã gặp thật khi dựng thử bản alt: `overscan 1.00` + lệch lên 60px làm mép dưới W08 lộ thành **một đường ngang cứng** ở góc phải. Luật: `overscan` phải bù cả độ lệch neo lẫn biên parallax, không chỉ biên parallax. Thêm assert lúc dev: mọi mép mặt phẳng phải nằm ngoài khung ở **mọi** mốc p |
| **Sai không gian màu** (ảnh bợt hoặc cháy) | Chụp texture gốc và khung render cạnh nhau, so histogram |
| **Vượt bộ nhớ GPU** | Bảng kích thước đã tính 86 MB; có số đo `renderer.info.memory` trong tiêu chí |
| **Ảnh phóng to lộ nhoè ở màn lớn** | Chi tiết thật chỉ ~1672px; nếu 1440px lộ nhoè, đành chấp nhận hoặc gen lại ở độ phân giải gốc cao hơn |

## Kết quả thật (2026-10-01)

Đã dựng đủ: 3 tấm trời (billboard theo camera), 3 lớp núi, 2 dải sương T11, khung tiền cảnh W08
(lật ngang), 2 vật thể nổi W09, mặt trời W10, mặt nước W07 (thay toàn bộ shader màu phẳng cũ).
Xoá `troi-nam-world-terrain.ts`. Không còn hàm nào sinh hình học trang trí bằng code.

### Thay đổi so với bản thảo: bỏ cơ chế đệm chống lộ mép khi nghiêng camera

Bản thảo đặt `CAMERA_TILT_MARGIN_DEG=16°` để phóng to mọi mặt phẳng, phòng camera ngẩng lên
~11° qua các pha mà không lộ mép. Thử hai cách:

1. `texture.repeat.y > 1` + `ClampToEdgeWrapping` (map ảnh vào phần dưới mặt phẳng, phần đệm
   phía trên lặp lại pixel mép trên).
2. Hình học tự viết 6 đỉnh/3 hàng (hàng dưới V=0, hàng giữa V=1, hàng trên cũng V=1 — nội suy
   phẳng, không bao giờ lấy mẫu UV ngoài [0,1]).

**Cả hai đều gây lỗi dựng hình thật**: sọc dọc lặp lại phủ kín vùng trời phía trên núi, tái hiện
ổn định mỗi lần tải lại trang (không phải cache cũ — đã xoá `.next` và khởi động lại nhiều lần).
Cô lập bằng cách ép `repeat.y=1` (tắt đệm, giữ nguyên scale lớn) → hết sọc ngay. Billboard hoá
bầu trời (trước đó nghi là nguyên nhân) cũng không liên quan — bật billboard mà vẫn giữ đệm thì
sọc vẫn còn. Kết luận: **lỗi nằm ở chính cơ chế đệm**, nhiều khả năng là lỗi driver của
SwiftShader (renderer phần mềm dùng trong môi trường này), không phải lỗi logic.

**Quyết định:** bỏ hẳn phần đệm, dùng đúng kích thước thiết kế (`fillFootprint` chỉ còn trả
`designedWidth`/`designedHeight`, không còn `paddedHeight`). Hệ quả nhìn thấy: ở pha hoàng
hôn/đêm (camera ngẩng lên nhiều nhất), đỉnh các lớp núi/tiền cảnh cắt ngang bằng một đường nối
nhẹ với tấm trời phía sau — **cả hai bên đều hiện đúng nội dung** (không phải lỗi/khung trống),
chỉ là chuyển tiếp không mượt tuyệt đối. Đã nhìn ảnh chụp ở 390 và 1440, cả pha hoàng hôn
(p≈0.375) lẫn đêm (p≈0.625) — chấp nhận được, không phải lỗi chặn. Để Phase 4/5 xử lý tiếp nếu
cần (lúc đó có thêm sao/tia sáng che bớt vùng này).

### Đối chiếu tiêu chí

- [x] p=0 so với L01: núi/nước/sương/tiền cảnh đều là tranh thật, không thua ảnh gốc
- [x] Đã chọn bản chính (ghi ở phase-02, không lặp lại ở đây)
- [x] Chiều sâu parallax rõ khi cuộn (lớp núi xa/giữa/gần ở z khác nhau, neo theo đường nước)
- [x] Ba chân núi chạm cùng đường nước ở p=0, mọi cỡ màn hình (viewport scale theo fov/aspect)
- [x] p=0.9: núi ngả màu đêm (`nightTint`), không còn "núi hoàng hôn dưới trời sao"
- [x] Chặn test: xoá hẳn cơ chế đệm sau khi phát hiện lỗi — world vẫn chạy ổn định
- [x] Không còn file/hàm sinh hình học trang trí bằng code (`troi-nam-world-terrain.ts` đã xoá)
- [x] Ảnh chụp 4 mốc p ở 390 và 1440 — xem trong báo cáo gửi founder
- [ ] **Không đạt, chấp nhận có điều kiện:** "không mốc p nào lộ dải sáng đáy trời thành đường
      ngang lơ lửng" — đường nối núi/trời mô tả ở trên là hệ quả trực tiếp của việc bỏ đệm;
      không phải "dải sáng lơ lửng" như lo ngại ban đầu, nhưng vẫn là một đường nối nhìn thấy
      được. Founder xem ảnh và quyết định có cần xử lý thêm ở Phase 4 không
- [ ] **Chưa đo:** `renderer.info` draw call/triangle/bộ nhớ chưa đo bằng số — suy luận từ số
      lớp dựng (14 draw call: 3 trời + 6 lớp đệm + 2 vật thể + 1 mặt trời + 1 nước + 1 sao) chắc
      chắn dưới ngân sách 40, nhưng chưa có số đo `renderer.info` thật
- [ ] **Chưa test:** mạng chậm 3G / chặn 1 file texture — world vẫn chạy khi ảnh chưa tải xong
      về mặt lý thuyết (texture bắt đầu trong suốt), nhưng chưa test bằng throttle thật
