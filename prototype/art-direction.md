# Lá Số Việt — Art Direction cho hình ảnh (bản làm việc)

> Trạng thái: **draft**, đi kèm bản Claude Design "Trang chủ Lá Số Việt" (hệ sơn mài, vòng 3).
> Chưa cập nhật vào `docs/13-brand-experience-guideline.md` — chờ founder duyệt hướng hình.

---

## 0. QUY TẮC BẮT BUỘC — đặt tên file ảnh (áp dụng cho mọi ảnh, mọi trang, từ giờ trở đi)

Mọi file ảnh trước khi đưa vào website — dù AI-gen, ảnh stock tải về, hay ảnh founder tự chụp —
**phải đổi tên thân thiện SEO trước khi input vào web.** Không giữ tên gốc kiểu
`ChatGPT Image Sep 1, 2026, 09_40_17 PM.webp` hay `IMG_1234.jpg`.

**Format:** chữ thường, không dấu tiếng Việt, các từ cách nhau bằng dấu gạch ngang `-`, mô tả đúng nội
dung ảnh + gắn với ngữ cảnh trang/từ khóa liên quan, đuôi file giữ nguyên định dạng gốc (`.webp` ưu
tiên vì nhẹ).

```
[mô-tả-nội-dung-ảnh]-[ngữ-cảnh-hoặc-từ-khóa-trang].webp
```

Ví dụ đã áp dụng (xem mục 8):
- `son-mai-dat-vang-xa-cu-macro-nen-toi.webp`
- `sach-tang-thu-co-dau-trien-do-la-so-tu-vi-la-gi.webp`
- `thien-ban-dong-khi-cu-chiem-tinh-co.webp`

Khi chèn vào HTML, `alt` text viết đầy đủ có dấu, mô tả tự nhiên (không nhồi từ khóa) — filename và
alt là hai lớp khác nhau, cả hai đều cần làm đúng.

## 1. Câu chốt art direction

**Tàng thư các dát vàng.** Một kho lưu trữ tri thức phương Đông chụp trong ánh sáng bảo tàng: hiện vật
nằm trên nền sơn mài sẫm, vàng bắt sáng ở rìa, đỏ son xuất hiện như một con dấu. Không khói hương,
không quả cầu, không thầy bói, không vũ trụ tím.

Ba tính từ để kiểm tra mọi tấm ảnh: **được bảo tồn · có nguồn gốc · được chiếu sáng có chủ đích.**

## 2. Ràng buộc kỹ thuật (áp cho cả ảnh AI lẫn ảnh tìm)

| Yếu tố | Yêu cầu |
|---|---|
| Nền | Sẫm — đen sơn mài `#0F0D0A`–`#1C1813`. Không nền trắng, không nền xám studio. |
| Ánh sáng | Một nguồn xiên, góc thấp, tương phản cao. Bóng đổ dài, rõ. Không ánh sáng phẳng. |
| Sắc độ chủ đạo | Vàng kim `#C9A44D` / `#F2DCA0` và son `#CE5B45`. Không đưa màu lam, lục, tím vào khung. |
| Bố cục | Chừa khoảng tối ≥40% để chồng chữ. Chủ thể lệch một bên, không đặt giữa. |
| Độ sâu trường ảnh | Nông — nhấn một chi tiết, phần còn lại tan vào tối. |
| Cấm | Mặt người nhìn thẳng, quả cầu pha lê, khói/nhang, lá bài tarot, biểu tượng cung hoàng đạo phương Tây, chữ Hán–Nôm không kiểm chứng được nghĩa. |

> **Lưu ý chữ Hán–Nôm:** guideline hiện hành cấm dùng chữ Hán/Nôm chưa kiểm chứng. Nếu ảnh có chữ,
> phải đọc được và xác nhận nghĩa trước khi dùng, hoặc chọn góc chụp làm chữ nhòe/ngoài nét.

## 3. Prompt sinh ảnh — dán vào Midjourney / Nano Banana / Flux

Đuôi chung, nối vào cuối mọi prompt:

```
dark lacquer background, single low-angle raking light, deep shadows, gold leaf catching
the light, shallow depth of field, museum artifact photography, muted warm palette of
black-brown, antique gold and cinnabar red, no text, no people, no cosmic or zodiac imagery,
photorealistic, 35mm, f/2, high detail
```

### ẢNH 01 — Nền hero (ngang, ≥2400×1400)

```
Extreme close-up of a Vietnamese sơn mài lacquer panel, black lacquer surface with
fine crackle, inlaid mother-of-pearl fragments and worn gold leaf, a faint engraved
concentric circle pattern barely visible in the raking light, vast empty dark area on
the left two-thirds of the frame
```
Yêu cầu riêng: **2/3 khung bên trái phải gần như tối đặc** để chữ hero đè lên đọc được.

### ẢNH 02 — “Lá số Tử Vi là gì?” (4:3)

```
An open antique East Asian manuscript book, hand-stitched binding, aged paper the color
of weak tea, resting on a dark lacquered table, one corner lit by a narrow shaft of light,
the rest falling into shadow, a small red seal impression on the page edge
```

### ẢNH 03 — “Cách lập lá số Tử Vi” (4:3)

```
A calligraphy brush resting across a carved stone inkstone with wet black ink pooled in
it, on a dark wood surface, gold dust scattered at the edge of the frame, single warm
light from the upper left, everything else in deep shadow
```

### ẢNH 04 — “Cách đọc lá số Tử Vi” (4:3)

```
Close-up of an antique Vietnamese archive cabinet, red-lacquered wood with gilded
detailing, rows of small drawers with aged brass handles, shot at a shallow angle so the
drawers recede into darkness, warm light grazing the gilded edges
```

### Ảnh dự phòng — dùng cho trang bộ môn về sau

```
A brass astronomical instrument, engraved concentric rings and radial division marks,
patinated surface, lying on black lacquer, lit from one side so the engraved lines catch
gold highlights
```

## 4. Keyword tìm ảnh thật (Unsplash / Pexels / Getty / Adobe Stock)

Xếp theo mức độ dễ tìm. Ưu tiên tiếng Anh vì kho ảnh index theo tiếng Anh.

**Nhóm nền & chất liệu (cho Ảnh 01)**
- `black lacquer texture macro`
- `gold leaf on black background`
- `mother of pearl inlay dark`
- `cracked lacquer surface`
- `vietnamese lacquer art son mai`
- `gold foil texture dark moody`

**Nhóm thư tịch cổ (Ảnh 02)**
- `antique asian manuscript dark background`
- `old chinese book stitched binding`
- `aged paper red seal stamp`
- `vietnamese han nom manuscript`
- `antique book low key lighting`

**Nhóm bút mực (Ảnh 03)**
- `calligraphy brush inkstone dark`
- `chinese ink stone still life moody`
- `sumi ink brush black background`
- `east asian calligraphy tools`

**Nhóm tủ tàng thư / kiến trúc (Ảnh 04)**
- `antique apothecary drawers dark wood`
- `chinese medicine cabinet drawers`
- `vietnamese temple gilded wood detail`
- `red lacquer gold leaf architecture detail`
- `imperial archive cabinet`

**Nhóm khí cụ thiên văn (dự phòng)**
- `brass astrolabe dark background`
- `antique astronomical instrument macro`
- `armillary sphere detail low key`

## 4.5 Ảnh đã gen — trạng thái + vai trò (cập nhật vòng 3)

| File (đã đổi tên SEO) | Vai trò | Ghi chú |
|---|---|---|
| `son-mai-dat-vang-xa-cu-macro-nen-toi.webp` | Nền hero, khối khí quyển chung | Dùng được ngay |
| `sach-tang-thu-co-dau-trien-do-la-so-tu-vi-la-gi.webp` | Ảnh bài "Lá số Tử Vi là gì?" | Dùng được ngay |
| `but-long-nghien-muc-da-cach-lap-la-so-tu-vi.webp` | Ảnh bài "Cách lập lá số Tử Vi" | Dùng được ngay |
| `tu-tang-thu-son-son-thep-vang-cach-doc-la-so-tu-vi.webp` | Ảnh bài "Cách đọc lá số Tử Vi" | Dùng được ngay |
| `thien-ban-dong-khi-cu-chiem-tinh-co.webp` | Khí cụ cổ trang trí chung (không thay cho la kinh Đông phương) | **Lưu ý:** đây là astrolabe phương Tây (vòng đồng khắc kiểu La Mã) — đẹp nhưng lệch văn hóa nếu dùng làm đại diện "thiên bàn 12 cung" của Tử Vi. Dùng cho vai trò khí cụ cổ nói chung (ví dụ: trang "Phương pháp"), không dùng thay la kinh ở mục 4.6. |

## 4.6 Ba ảnh bổ sung — vòng 2 (viết theo art direction, đóng vai trò creative director)

> **Cập nhật vòng 3:** ba prompt dưới đây dùng chữ Hán cổ **thật, có nghĩa, kiểm chứng được** —
> không còn "line-art trừu tượng không đọc được" như bản đầu. Xem lý do chọn từng ký tự và cảnh báo
> về độ chính xác render CJK của công cụ ảnh AI ở cuối mục này.

### Ảnh 06 — La kinh (thay SVG "12 cung" ở khối "Bạn nhận được gì" và ring nền hero)

```
Extreme macro photograph of an antique East Asian geomantic compass (la kinh / luopan), a round
lacquered wooden disc with a deep cinnabar-red lacquered center medallion housing a small black
magnetic needle marked with the characters 子 (north) and 午 (south) at its tips, surrounded by two
concentric engraved rings: an inner ring bearing the eight Bát Quái trigram symbols (☰ ☷ ☳ ☴ ☵ ☲ ☶ ☱)
evenly spaced, and a wider ring outside it bearing the twelve Địa Chi characters in order
(子丑寅卯辰巳午未申酉戌亥), all characters carved in a worn, aged engraving style with gold or brass
inlay catching the light, the disc resting at a slight tilted angle on a dark near-black lacquer
table surface, single low-angle warm raking light from the upper left so the engraved characters and
grooves throw fine shadow lines across the rings, shallow depth of field with one quadrant of the
inner rings (showing 2-3 trigram symbols and 3-4 Địa Chi characters clearly) in tack-sharp focus and
the rest of the disc softly falling into shadow, muted warm palette of aged brass, dark lacquer red,
and deep umber-black, all characters must be historically correct Bát Quái and Địa Chi symbols, no
invented or garbled characters, no people, photorealistic museum-artifact photography, shot on 100mm
macro lens, f/2.8, high micro-detail on wood grain, lacquer crackle, and metal patina, moody
editorial still-life lighting
```

### Ảnh 07 — Dấu triện / vết son ép trên giấy (cho gói báo cáo trả phí, checkout, report reader)

```
Extreme macro close-up still life of a red cinnabar-lacquer seal impression freshly pressed into
aged cream-colored paper, the seal carved in classical archaic seal-script (triện thư / 篆書) bearing
the single character 信 (Tín, meaning trust/faith), rendered in the correct blocky symmetric
seal-script form — not modern print style — enclosed in a simple square border with softly rounded
corners, the cinnabar pigment sitting slightly raised and textured at the impression's edges, one
folded corner of a paper document visible at the edge of frame, resting on a dark lacquered wood
surface, single warm raking light from the upper left casting a soft shadow beneath the paper's
folded edge, extremely shallow depth of field with only the seal impression in crisp focus and
everything else softly blurred into warm darkness, dark near-black background, the character 信 must
render as a correct, legible, historically accurate seal-script glyph, no garbled or invented
characters, no people, no other text, photorealistic still life photography, 100mm macro lens, f/2,
fine paper fiber and pigment texture visible, editorial product photography lighting
```

### Ảnh 08 — Lịch vạn niên cổ (cho trang "Lập lá số" / trang "Phương pháp")

```
Close-up still life of an antique East Asian perpetual calendar book (lịch vạn niên), aged cream
accordion-fold paper pages partially fanned open, the visible page bearing faint printed columns
headed by a partial sequence of the ten Thiên Can characters (甲乙丙丁戊己庚辛壬癸) and rows headed by
a partial sequence of the twelve Địa Chi characters (子丑寅卯辰巳午未申酉戌亥), printed in a worn,
slightly faded traditional woodblock-print style, a small antique brass hourglass-shaped time
instrument resting beside the book on a dark lacquered wood surface, single warm light source from
the right casting long soft shadows across the fanned pages, shallow depth of field with the nearest
page edge (showing 3-4 characters clearly) in sharp focus and the rest gently falling into shadow,
dark near-black background, warm palette of aged paper cream, dark lacquer, and antique brass, all
characters must be correct, legible Thiên Can and Địa Chi glyphs, no garbled or invented characters,
no people, photorealistic archival still-life photography, 85mm lens, f/2.2, fine paper texture and
fold detail, museum-conservation lighting
```

### Vì sao chọn đúng những ký tự này (để trace được nguồn gốc — đúng yêu cầu §5.5 brand guideline)

| Ảnh | Ký tự | Nghĩa | Nguồn/kiểm chứng |
|---|---|---|---|
| La kinh | ☰☷☳☴☵☲☶☱ (Bát Quái) | 8 quẻ nền tảng Kinh Dịch | Hệ ký hiệu ~3000 năm, tài liệu Kinh Dịch bất kỳ |
| La kinh | 子丑寅卯辰巳午未申酉戌亥 (12 Địa Chi) | Tý Sửu Dần Mão Thìn Tỵ Ngọ Mùi Thân Dậu Tuất Hợi | Chính là 12 khung giờ sinh dùng trong form lập lá số của web — không phải trang trí, là vật liệu sản phẩm thật |
| Dấu triện | 信 (Tín) | Lời nói/điều đáng tin | Khớp thẳng vào §7 "Niềm tin" của brand guideline |
| Lịch vạn niên | 甲乙丙丁戊己庚辛壬癸 (10 Thiên Can) | Giáp Ất Bính Đinh Mậu Kỷ Canh Tân Nhâm Quý | Cùng hệ Can-Chi dùng để tính năm/tháng/ngày/giờ trong Tử Vi |

### Cảnh báo bắt buộc đọc trước khi gen

Công cụ ảnh AI (Midjourney/DALL-E/Nano Banana/Flux...) **render chữ Hán rất hay sai hoặc nhoè thành
ký tự giả** dù prompt đúng — đây là giới hạn kỹ thuật chung của mọi model hiện nay, không phải lỗi
cách viết prompt. Cách xử lý:
1. Sau khi gen, **zoom vào đúng vùng nét** (vùng shallow-DOF được chỉ định là sharp) và so với bảng
   ký tự ở trên.
2. Nếu sai/nhoè: gen lại (đổi seed), hoặc chấp nhận nếu ký tự nằm ngoài vùng nét (đã thiết kế shallow
   DOF để che bớt rủi ro này).
3. Nếu là ảnh flagship (dùng lớn, ví dụ nền hero) và vẫn sai sau vài lần gen: cân nhắc hậu kỳ (crop
   kỹ hơn để né hẳn vùng chữ, hoặc overlay chữ đúng bằng tay).

**Đuôi prompt chung** (đã dùng nhất quán cho cả 8 ảnh, giữ nguyên khi gen thêm ảnh mới):
`dark lacquer background, single low-angle raking light, deep shadows, gold leaf catching the light,
shallow depth of field, museum artifact photography, muted warm palette of black-brown, antique gold
and cinnabar red, no text, no people, no cosmic or zodiac imagery, photorealistic, 35mm, f/2, high
detail`

### Bộ lọc khi chọn ảnh
1. Nền có đủ tối để chồng chữ trắng ngà không? Nếu phải làm tối nhân tạo quá nhiều → bỏ.
2. Có màu lạ (lam/lục/tím) chiếm diện tích lớn không? → bỏ.
3. Có mặt người nhìn thẳng không? → bỏ.
4. Có chữ Hán–Nôm rõ nét mà chưa biết nghĩa không? → bỏ hoặc chọn ảnh chữ nhòe.
5. License có cho dùng thương mại không? → bắt buộc kiểm tra, lưu lại nguồn + license vào `docs/`.

## 5. Những gì đã tự sinh trong code, anh không cần tìm

| Thành phần | Cách làm | Ở đâu |
|---|---|---|
| Grain sơn mài phủ trang | Canvas sinh nhiễu 180×180, lặp nền | `<script>` cuối `homepage.html` |
| Thiên bàn 12 cung | SVG, gradient vàng `#g-gold` | Hero + khối “Bạn nhận được gì” |
| Bộ icon 13 ký hiệu | SVG symbol, lưới 24px, nét 1.4 | `<defs>` đầu file |
| Hoa văn vòng cung, vụn vàng | SVG symbol `o-arc`, `o-flake` | Lớp `.orn` trong hero |
| Dấu triện | SVG symbol `i-trien` | Mọi điểm “Vì sao có nhận định này?” |

Bộ icon gồm: thiên bàn · dấu triện · cuộn thư · la kinh · nguyệt tướng · bút lông · tàng thư ·
khóa · cân · check · mũi tên · cộng · chevron · menu · sao.

## 6. Việc còn treo

- [ ] Logo — anh tự làm, sau đó thay wordmark `Lá Số Việt` + icon thiên bàn ở header/footer.
- [ ] Cập nhật `docs/13-brand-experience-guideline.md` §5.2/§5.5/§5.8 sang hệ sơn mài.
- [ ] Ghi entry decision log cho việc đổi LOCKED palette.
- [ ] Kiểm contrast thực tế sau khi ảnh thật vào chỗ (ảnh sáng hơn dự kiến sẽ phá contrast chữ hero).
- [ ] **Mới (2026-09-04, xem `docs/19` §5.3–5.4):** ảnh hero/homepage hiện tại
      code cứng theo Tử Vi/Đông phương (sách tàng thư, la kinh) — cần 1 đợt ảnh
      mới theo hướng "tàng thư vũ trụ" phổ quát Đông-Tây cho riêng homepage,
      nhường lại hiện vật đặc trưng (la kinh...) cho trang `/la-so-tu-vi`. Ảnh
      dự phòng "khí cụ thiên văn đồng" ở mục 3 là ứng viên chính cho homepage
      thay vì chỉ dùng cho trang bộ môn. Đồng thời §2 (cấm ảnh tarot/hoàng đạo)
      có ngoại lệ có kiểm soát cho `/boi-bai` và `/chiem-tinh` — xem `docs/19`
      §5.4 trước khi gen ảnh cho hai trang đó.
