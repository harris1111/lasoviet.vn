# Lá Số Việt — Production Image Bible cho Homepage

> Bản chốt sau creative-direction interview. Mỗi code block là một prompt hoàn chỉnh, copy–paste một lần để gen một ảnh. Không có placeholder trắng, không cần nối thêm style suffix hoặc negative prompt.

## 1. Creative thesis

Homepage không phải một gallery đồ cổ. Nó kể một hành trình nhận thức:

**Dữ liệu sinh → một bản đồ được khai mở → căn cứ trở nên nhìn thấy → người đọc nhận ra chính mình.**

Hệ hình ảnh mang tên **“Tàng thư khai quang”**: tri thức Tử Vi được bảo tồn trong ngôn ngữ giấy cổ, sơn mài, đồng già và son triện; nhưng ánh sáng, bố cục và tính minh bạch khiến nó thuộc về một sản phẩm đương đại.

Ba tiêu chuẩn kiểm mọi ảnh:

1. **Có ý niệm:** nhìn ảnh phải hiểu được section đang nói gì, không chỉ thấy một hiện vật đẹp.
2. **Có nguồn gốc:** đúng cấu trúc Tử Vi; chữ Hán chỉ xuất hiện khi có thể kiểm chứng.
3. **Có nhiệm vụ giao diện:** đúng tỷ lệ, đúng vùng crop, đúng khoảng tối và không cạnh tranh với copy/UI.

## 2. Vì sao hai ảnh thử nghiệm thất bại

- Đĩa 12 phần không chữ: là một đạo cụ hình học vô danh; không liên hệ trực tiếp đến lá số Tử Vi hay khám phá bản thân.
- Khung giấy trắng: là background compositing, không phải minh họa; nó không cho người xem thấy “toàn bộ lá số, ba điểm nổi bật và căn cứ”.

Từ phiên bản này, **không prompt nào yêu cầu một khung trống để tự đưa lên homepage**. Nếu asset cần hậu kỳ chữ, prompt vẫn phải sinh ra một scene có nội dung và ý nghĩa hoàn chỉnh; phần overlay chỉ dùng để bảo đảm độ chính xác.

## 3. Image map của homepage

| Mã | Vị trí | Ý niệm | Tỷ lệ master | Trạng thái |
|---|---|---|---|---|
| H01-D | Hero desktop | Mệnh thư khai quang | 12:7 · 2400×1400 | Gen mới |
| H01-M | Hero mobile | Mệnh thư khai quang | 4:5 · 1200×1500 | Gen từ reference desktop |
| H02 | “Bạn nhận được gì” | Bản đồ đã mở, ba điểm nổi bật có căn cứ | 5:4 · 2000×1600 | Gen mới, thay la kinh |
| H03 | Cách hoạt động 01 | Dữ liệu sinh được quy đổi qua lịch pháp | 3:2 · 1800×1200 | Gen mới hoặc thay ảnh lịch cũ |
| H04 | Cách hoạt động 02 | Lá số được an định thành hệ thống | 3:2 · 1800×1200 | Gen mới |
| H05 | Cách hoạt động 03 | Chọn lát cắt luận giải sâu | 3:2 · 1800×1200 | Gen mới |
| H06 | Nền “Luận giải chuyên sâu” | Tàng thư chủ đề mở dần | 4:5 · 1600×2000 | Gen mới, thay texture vô nghĩa |
| H07 | Card “Lá số Tử Vi là gì?” | Giải phẫu cấu trúc lá số | 3:2 · 1800×1200 | Gen mới |
| H08 | Card “Cách lập lá số” | Từ lịch pháp đến bàn 12 cung | 3:2 · 1800×1200 | Gen mới |
| H09 | Card “Cách đọc lá số” | Theo dấu quan hệ giữa các cung | 3:2 · 1800×1200 | Gen mới |
| H10 | Pattern nền | Vân sơn mài và hình học 12 cung | 1:1 · 1024×1024 | Gen mới |
| H11-D | CTA cuối desktop | Ngưỡng mở mệnh thư | 8:3 · 2400×900 | Gen mới, thay vòng SVG |
| H11-M | CTA cuối mobile | Ngưỡng mở mệnh thư | 4:5 · 1200×1500 | Gen từ reference desktop |

Các section **Minh bạch**, **Cách chúng tôi luận giải** và **FAQ** giữ không ảnh. Khoảng nghỉ thị giác ở đây là chủ ý; không lấp đầy mọi khoảng trống bằng hiện vật. CTA cuối có background riêng nhưng vùng trung tâm vẫn được giữ yên tuyệt đối để tập trung vào hành động.

## 4. Hệ chữ Địa Chi được phép dùng

Khi prompt yêu cầu lá số, chỉ dùng đúng ma trận cố định sau:

```text
巳  午  未  申
辰  [khối trung tâm]  酉
卯  [khối trung tâm]  戌
寅  丑  子  亥
```

Đọc theo chiều kim đồng hồ từ ô dưới trái: `寅 → 卯 → 辰 → 巳 → 午 → 未 → 申 → 酉 → 戌 → 亥 → 子 → 丑`.

Căn cứ: [Tử Vi Việt Nam](https://tuvivietnam.vn/thuat-ngu-co-ban-trong-tu-vi-tuvivietnam/) mô tả dạng vuông/chữ nhật, 12 ô bao quanh và các trục Tí–Ngọ, Mão–Dậu; [Star Lin](https://www.108s.tw/article/info/88) xác nhận vị trí Địa Chi cố định theo chuỗi 12 chi.

---

## H01-D — Hero desktop: “Mệnh thư khai quang”

**Nhiệm vụ:** trong 3 giây phải gợi cảm giác “một sự thật sâu kín về chính mình đang được khai mở”.

```text
Create a world-class cinematic website hero for Lá Số Việt, a premium Vietnamese Tử Vi knowledge platform. The key visual is titled “Mệnh thư khai quang”: the instant a hidden map of the viewer’s own life begins to emerge from darkness. The image must carry narrative tension and emotional revelation, not resemble a catalogue photograph of an antique prop.

Use a 12:7 landscape composition designed for a 2400 × 1400 hero banner. Preserve the entire left 55% as velvety near-black negative space for a large cream headline, supporting copy and a birth-data form. This left copy-safe zone must contain no bright paper, reflection, glyph, gold fleck or light beam. On the right 45%, show an opened Vietnamese-style hand-bound archival manuscript placed diagonally on a dark lacquer reading table, photographed from a cinematic three-quarter overhead angle and partially cropped by the right and lower edges.

On the visible page, render a complete square Tử Vi chart: a precise 4 × 4 grid whose four middle cells merge into one central block, leaving exactly twelve perimeter cells. The page must not look blank. Fill the central block with subtle archival structure: a blind-embossed double-square seal geometry, fine registration rules and one small cinnabar dot at the exact center, with no personal name or invented text. Place the twelve fixed Earthly Branch glyphs exactly as follows: top row 巳 午 未 申; second row 辰 [merged center] 酉; third row 卯 [merged center] 戌; bottom row 寅 丑 子 亥. Use correct, elegant, lightly worn woodblock-print forms. Every glyph appears once and only once. Add restrained nonverbal analytical marks inside several cells: tiny ink dots, short ruled lines and three small cinnabar marginal seals, suggesting observations and evidence without imitating language.

A narrow, powerful warm beam sweeps diagonally from the upper right across the chart. Its leading edge is visible: cells already touched by light reveal paper fibers, grid rules, the correct Earthly Branch glyphs and the three evidence seals; cells ahead remain submerged in rich darkness. The ink never emits light—the revelation comes from real raking illumination. The visual story must read instantly as hidden → revealed → understood.

Beside the page, include a small irregular fragment of an aged Vietnamese bronze mirror. In its dim oxidized surface, show only a soft anonymous head-and-shoulder reflection of the viewer leaning toward the chart, with no eyes, no skin detail and no recognizable face. The mirror makes the meaning personal: the map being revealed belongs to the person looking at it.

Art direction: contemporary Vietnamese knowledge archive, museum-conservation restraint, matte black-brown lacquer #0F0D0A and #1C1813, aged cream paper #F6F1E6, restrained antique bronze-gold #C9A44D, one controlled cinnabar accent #CE5B45, handmade paper fibers, worn woodblock ink, subtle lacquer crackle, aged bronze patina, strong chiaroscuro, quiet intellectual luxury, culturally grounded, private and credible. Photorealistic cinematic editorial still life, 50mm lens, f/3.5, shallow but controlled depth of field, high micro-detail, premium film grading, natural imperfections, no excessive sepia.

Strict exclusions: no blank page, no empty placement rectangle, no circular chart, no decorative twelve-segment disc, no luopan, no feng-shui compass, no bagua, no yin-yang, no Western zodiac, no horoscope wheel, no tarot, no fortune teller, no incense, no smoke, no candles, no crystal ball, no starscape, no magical glow, no floating symbols, no temple altar, no dragon or phoenix, no fantasy, no steampunk, no festive red-and-gold cliché, no hands, no visible person outside the mirror, no recognizable face, no logos, no watermark, no Latin or Vietnamese text, no numbers, no palace names, no Heavenly Stems, no additional Chinese characters beyond exactly 巳午未申辰酉卯戌寅丑子亥, no repeated or malformed glyphs, no pseudo-writing, no blue, green or purple lighting, no bright detail in the left 55% copy-safe zone.
```

Filename: `menh-thu-khai-quang-hero-lasoviet-desktop.webp`

Alt: `Dải sáng làm hiện ra lá số Tử Vi 12 cung trên cổ thư cạnh mảnh gương đồng`

## H01-M — Hero mobile

```text
Create the portrait mobile companion to the Lá Số Việt “Mệnh thư khai quang” desktop hero, preserving the same manuscript, bronze-mirror fragment, lighting language and emotional story. Use a 4:5 portrait frame at 1200 × 1500. Place the opened archival manuscript across the upper 42% of the frame, entering from the upper-right edge. Keep the entire lower 58% calm and near-black for a cream headline, supporting copy and stacked birth-data controls; absolutely no bright paper, reflection, glyph or light beam may enter the lower copy-safe area.

The visible page contains a complete square Tử Vi chart, not a blank template: a precise 4 × 4 grid with four central cells merged into one information block and exactly twelve perimeter cells. In the central block show a subtle blind-embossed double-square seal geometry, fine registration rules and one small cinnabar center dot. Place the fixed Earthly Branch glyphs exactly as follows: top row 巳 午 未 申; second row 辰 [merged center] 酉; third row 卯 [merged center] 戌; bottom row 寅 丑 子 亥. Every glyph appears once. Add tiny ink dots, short ruled marks and three small cinnabar evidence seals in selected cells, creating a complete analytical artifact without fake writing.

A narrow warm beam enters from upper right and crosses the chart with a defined leading edge, revealing three or four crisp glyphs, tactile paper fibers, grid rules and evidence seals while the untouched cells remain in velvety shadow. No supernatural glow. At the upper-right paper edge, place a small dark oxidized bronze-mirror fragment reflecting only an anonymous head-and-shoulder silhouette with no face.

Use museum-conservation editorial photography: matte dark lacquer #0F0D0A, aged cream paper #F6F1E6, restrained bronze-gold #C9A44D, one cinnabar accent #CE5B45, strong chiaroscuro, Vietnamese archive sensibility, intimate self-discovery, photorealistic, 50mm lens, f/3.5, high micro-detail, natural imperfections, premium cinematic grading.

Strict exclusions: no blank page, no empty frame, no circular chart, no luopan, no compass, no bagua, no yin-yang, no zodiac, no tarot, no smoke, no candles, no crystal ball, no cosmic imagery, no magical glow, no hands, no visible person outside the mirror, no recognizable face, no logos, no watermark, no text beyond exactly 巳午未申辰酉卯戌寅丑子亥, no numbers, no invented glyphs, no pseudo-writing, no blue, green or purple lighting, no bright detail in the lower 58% copy-safe zone.
```

Filename: `menh-thu-khai-quang-hero-lasoviet-mobile.webp`

Alt: `Lá số 12 cung dần hiện ra dưới dải sáng trên nền sơn mài tối`

---

## H02 — “Bạn nhận được gì”: Bản đồ đã mở

**Nhiệm vụ:** minh họa trực tiếp “toàn bộ sơ đồ, ba điểm nổi bật và căn cứ mở được”. Ảnh này nằm sau ba insight card nên ba vùng nhấn phải hướng về cạnh phải.

```text
Create a premium editorial product image that makes the value of a free Vietnamese Tử Vi chart immediately visible: a complete life map, three highlighted insights and visible evidence. Use a 5:4 landscape frame at 2000 × 1600, intended to be cropped inside a large homepage panel. Photograph from a near-overhead 10-degree angle.

Place a fully completed square Tử Vi archival chart on a warm cream handmade-paper folio over a matte near-black lacquer desk. The chart occupies roughly 78% of the frame and is shifted slightly left so its right edge remains available for three website insight cards to overlap. It must be content-rich and finished, never blank: a precise 4 × 4 grid with a merged central block and twelve perimeter cells; central double-square seal geometry; fine grid rules; many restrained ink dots and short ruled analytical marks; exactly three selected cells emphasized by small cinnabar seal impressions and thin antique-gold connector lines leading toward three matching brass evidence tabs along the right paper edge.

Place the twelve fixed Earthly Branch glyphs correctly: top row 巳 午 未 申; second row 辰 [merged center] 酉; third row 卯 [merged center] 戌; bottom row 寅 丑 子 亥. Every glyph appears once and only once. No other readable writing. Make the three highlighted cells visually distinct but refined: one gold pin, one cinnabar underline, one tiny translucent paper marker. Their connector lines should make the relationship between chart evidence and the three overlaid insight cards obvious.

Use even but directional museum light from upper left so the entire chart is readable, with slightly brighter focus on the three highlighted cells. Dark lacquer #12100C, warm paper #E9DFC8, antique gold #C9A44D, restrained cinnabar #CE5B45, aged brass tabs, crisp paper fibers, precise editorial information-design feeling translated into physical materials. Photorealistic contemporary Vietnamese archive, 65mm lens, f/5.6, controlled depth of field, clear geometry, premium product photography, calm and credible rather than mystical.

Strict exclusions: no blank paper, no empty central rectangle, no screen mockup, no laptop, no phone, no circular chart, no luopan, no bagua, no yin-yang, no zodiac, no astrology wheel, no tarot, no cosmic imagery, no smoke, no candles, no hands, no people, no random decorative props, no fantasy glow, no logos, no watermark, no text beyond exactly 巳午未申辰酉卯戌寅丑子亥, no numbers, no palace or star names, no repeated or malformed glyphs, no pseudo-writing, no blue, green or purple, no bright clutter behind the right-side overlay-card zone.
```

Filename: `la-so-mien-phi-ba-diem-noi-bat-co-can-cu-homepage.webp`

Alt: `Lá số Tử Vi hoàn chỉnh với ba cung được đánh dấu và nối tới các thẻ căn cứ`

---

## H03 — Cách hoạt động 01: Dữ liệu sinh được quy đổi

```text
Create a meaningful cinematic still life illustrating the first step of building a Vietnamese Tử Vi chart: birth date and birth hour being translated through the traditional Can–Chi calendar system. Use a 3:2 landscape frame at 1800 × 1200 for a 340 × 220 homepage image.

On a dark lacquer reading desk, show an antique East Asian perpetual-calendar accordion book partially unfolded from lower left to upper right. The nearest illuminated fold displays a small verified calendar matrix with only these exact characters: column headers 甲 乙 丙 丁 and row labels 子 丑 寅 卯, printed once each in worn traditional woodblock ink. Beside it place a compact aged-brass water-clock or hourglass-like time instrument and three narrow bone or brass registration sliders aligned with day, month and hour. A thin cinnabar thread begins at the calendar page, passes through the time instrument and continues out of frame toward the next step, visually expressing conversion rather than mere decoration.

Use one warm raking light from upper left, making the exact calendar cells and the time instrument sharply legible while farther paper folds recede into darkness. Dark lacquer #0F0D0A, aged cream paper, antique brass #C9A44D, one cinnabar accent #CE5B45, fine paper fibers, rubbed edges, museum-conservation editorial photography, culturally grounded, precise and quiet. Photorealistic, 85mm lens, f/3.2, shallow but controlled depth of field, high detail.

Strict exclusions: no generic empty book, no modern calendar, no clock face with Western numerals, no extra text beyond exactly 甲乙丙丁子丑寅卯, no malformed or repeated glyphs, no full fake manuscript paragraphs, no zodiac animals, no luopan, no bagua, no yin-yang, no tarot, no fortune teller, no incense, no smoke, no candles, no cosmic imagery, no people, no hands, no logos, no watermark, no blue, green or purple lighting, no festive red-and-gold styling.
```

Filename: `lich-phap-can-chi-quy-doi-du-lieu-sinh-homepage.webp`

Alt: `Lịch Can Chi cổ và khí cụ đo thời gian dùng để quy đổi dữ liệu sinh`

## H04 — Cách hoạt động 02: Lá số được an định

```text
Create a cinematic editorial still life illustrating the second step of Lá Số Việt: raw birth data becoming an ordered twelve-palace Tử Vi chart. Use a 3:2 landscape frame at 1800 × 1200.

Show a square handmade-paper Tử Vi chart placed on a black lacquer alignment board. The chart is complete and visually active, not blank: a precise 4 × 4 grid with four central cells merged into one block and twelve perimeter cells. The fixed Earthly Branch glyphs appear exactly once in this matrix: top row 巳 午 未 申; second row 辰 [merged center] 酉; third row 卯 [merged center] 戌; bottom row 寅 丑 子 亥. A slender aged-brass registration frame has just settled over the page, its corners perfectly aligning with the chart. Along one side, three small brass sliders corresponding to day, month and hour have converged into position; fine incised guide lines lead from those sliders into the twelve cells. The central block contains a subtle double-square seal geometry and a single cinnabar center mark, conveying that dispersed inputs have become one coherent map.

Light the exact moment of alignment: a narrow warm raking light catches the brass frame, the center mark and four nearest correct glyphs, while the outer corners fall into soft darkness. Matte lacquer #0F0D0A, cream archival paper, antique gold #C9A44D, restrained cinnabar #CE5B45, precise information design expressed through traditional materials, museum-conservation mood, photorealistic, 70mm lens, f/4, controlled depth of field, high micro-detail.

Strict exclusions: no blank chart, no circular disc, no compass, no luopan, no bagua, no yin-yang, no Western zodiac, no astrology wheel, no tarot, no magical glow, no smoke, no candles, no modern machinery, no laptop or phone, no hands, no people, no logos, no watermark, no text beyond exactly 巳午未申辰酉卯戌寅丑子亥, no numbers, no palace or star names, no malformed or invented glyphs, no blue, green or purple.
```

Filename: `an-dinh-la-so-tu-vi-12-cung-homepage.webp`

Alt: `Khung đồng căn chỉnh một lá số Tử Vi vuông 12 cung trên giấy cổ`

## H05 — Cách hoạt động 03: Chọn lát cắt luận giải

```text
Create a premium cinematic still life illustrating the choice of deeper Tử Vi interpretation topics. Use a 3:2 landscape frame at 1800 × 1200.

Arrange four slim archival report folios as a deliberate staggered fan on a dark Vietnamese lacquer reading table. Each folio is visibly different through a meaningful text-free edge motif: one concentric-square seal for self and potential; two balanced interlocking brass arcs for relationships; a measured ascending set of three short brass rules for work and resources; and a twelve-notch circular year marker for annual timing. These are restrained indexing symbols, not mystical icons. Each folio has a narrow aged-brass or cinnabar tab, showing four clear choices. The top folio is partially open and already contains a finished analytical spread made of precise ruled columns, evidence markers, a miniature twelve-cell grid and one opened cinnabar seal—never a blank page and never fake paragraphs.

A warm raking light selects only the open folio and its tab while the other three recede in ordered layers, visually communicating “choose how deep to go.” Dark lacquer #0F0D0A, warm handmade paper, antique gold #C9A44D, one controlled cinnabar #CE5B45, visible fibers, aged brass patina, quiet intellectual luxury, contemporary Vietnamese archive, photorealistic editorial product photography, 85mm lens, f/3.2, shallow controlled depth of field, high detail.

Strict exclusions: no empty notebooks, no blank report cover, no gift packaging, no ribbon, no envelopes, no tarot deck, no zodiac symbols, no crystal, no smoke, no candles, no coins, no jewelry, no hands, no people, no logos, no watermark, no readable text, no letters, no numbers, no fake glyphs, no decorative calligraphy, no blue, green or purple, no glossy CGI, no festive styling.
```

Filename: `chon-chu-de-luan-giai-sau-ho-so-tang-thu-homepage.webp`

Alt: `Bốn tập hồ sơ luận giải chuyên sâu với các dấu mục chủ đề khác nhau`

---

## H06 — Nền “Luận giải chuyên sâu”: Tàng thư chủ đề

```text
Create a vertical atmospheric background image for the right side of the Lá Số Việt “Luận giải chuyên sâu” section. Use a 4:5 portrait frame at 1600 × 2000. The image will cover the right 46% of a dark desktop section, so keep its left third extremely dark and low-detail for a smooth CSS gradient transition.

On the right side, show the edge of an open red-black lacquer archive case containing four nested cream-paper report folios with aged-brass index tabs. One folio is pulled forward just enough to reveal a finished analytical page: thin ruled columns, three evidence markers, a small twelve-cell diagram and one text-free cinnabar seal. Behind it, the remaining folios recede into deep shadow. A few worn gold-leaf traces catch a narrow warm light along the case edge, creating depth without becoming ornamental noise. The meaning is access to progressively deeper layers of interpretation, not generic luxury texture.

Use museum-conservation lighting from upper right, long controlled shadows, black-brown lacquer #0F0D0A, dark red lacquer close to #4A211A used sparingly, antique gold #C9A44D, warm paper #E9DFC8 and one cinnabar accent #CE5B45. Photorealistic editorial artifact photography, 85mm lens, f/2.8, shallow depth, tactile crackle and patina, restrained and intelligent.

Strict exclusions: no blank folders, no readable text, no letters, no numbers, no fake Chinese, no Western zodiac, no tarot, no cosmic imagery, no smoke, no candles, no temple altar, no dragon or phoenix, no gift box, no jewelry, no coins, no people, no hands, no blue, green or purple, no bright detail in the left third, no repetitive decorative pattern, no glossy CGI.
```

Filename: `tang-thu-chu-de-luan-giai-sau-background-homepage.webp`

Alt: để trống vì là background trang trí có nội dung đã được heading mô tả.

---

## H07 — Kiến thức: “Lá số Tử Vi là gì?”

```text
Create a world-class editorial still life explaining the anatomy of a Vietnamese Tử Vi chart. Use a 3:2 landscape frame at 1800 × 1200 for a knowledge-card crop.

Show an open archival manuscript on dark lacquer. On the page lies a complete square twelve-palace chart, while a very thin translucent mica or handmade-paper overlay is lifted a few millimeters above it, revealing the chart’s two structural layers: the twelve perimeter cells below and one central information block. The lifted overlay carries only fine gold construction lines and twelve small registration dots, no text. On the lower page, the fixed Earthly Branch glyphs appear exactly once in the correct matrix: top row 巳 午 未 申; second row 辰 [merged center] 酉; third row 卯 [merged center] 戌; bottom row 寅 丑 子 亥. A narrow cinnabar bracket visually distinguishes the perimeter from the center. The image should instantly communicate “this is how a lá số is structured,” not merely “an old book.”

Light from upper left passes through the translucent overlay and casts a precise second set of grid shadows on the paper, creating intellectual depth and a sense of explanation. Dark lacquer #0F0D0A, cream paper, restrained gold #C9A44D, one cinnabar accent #CE5B45, fine paper fibers, worn ink, museum-conservation editorial photography, photorealistic, 85mm lens, f/4, high detail, calm and didactic without feeling clinical.

Strict exclusions: no blank manuscript, no circular chart, no luopan, no bagua, no yin-yang, no Western zodiac, no tarot, no magic glow, no smoke, no candles, no hands, no people, no logos, no watermark, no text beyond exactly 巳午未申辰酉卯戌寅丑子亥, no numbers, no palace names, no malformed glyphs, no fake writing, no blue, green or purple, no decorative clutter.
```

Filename: `cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp`

Alt: `Lớp sơ đồ trong suốt làm rõ cấu trúc 12 cung và phần trung tâm của lá số Tử Vi`

## H08 — Kiến thức: “Cách lập lá số Tử Vi”

```text
Create a cinematic process still life showing how a Vietnamese Tử Vi chart is constructed from calendar and time data. Use a 3:2 landscape frame at 1800 × 1200.

Compose the scene as one continuous visual path from left to right: at left, a partially folded traditional Can–Chi calendar page with only the exact characters 甲 乙 丙 丁 and 子 丑 寅 卯 visible in a small verified matrix; at center, a carved dark-stone inkstone holding wet black ink and a fine calligraphy brush drawing the final straight line of a square twelve-cell chart; at right, the newly completed chart begins to receive three tiny brass registration markers corresponding to date, hour and place. A single thin cinnabar thread physically connects calendar → inkstone → chart, making the calculation process readable without captions. The chart has full geometric structure and subtle ink marks; it is not an empty page.

Use one warm low-angle light from upper left. Keep the brush tip and the line currently being drawn tack-sharp, with the calendar and completed chart slightly softer but still intelligible. Dark lacquer #0F0D0A, carved stone, aged cream paper, antique brass #C9A44D, restrained cinnabar #CE5B45, paper fibers, wet ink sheen, museum-artifact editorial photography, photorealistic, 85mm lens, f/2.8, high micro-detail, thoughtful and procedural.

Strict exclusions: no generic brush portrait with no chart, no blank paper, no modern stationery, no extra readable text beyond exactly 甲乙丙丁子丑寅卯, no malformed glyphs, no fake manuscript paragraphs, no zodiac animals, no luopan, no bagua, no yin-yang, no tarot, no magic, no smoke, no incense, no candles, no hands, no people, no logos, no watermark, no blue, green or purple, no excessive gold dust.
```

Filename: `quy-trinh-lap-la-so-tu-vi-tu-lich-phap-homepage.webp`

Alt: `Lịch Can Chi, nghiên mực và sơ đồ 12 cung thể hiện quy trình lập lá số Tử Vi`

## H09 — Kiến thức: “Cách đọc lá số Tử Vi”

```text
Create a cinematic editorial still life explaining that a Vietnamese Tử Vi chart is read through relationships between multiple palaces, not one cell in isolation. Use a 3:2 landscape frame at 1800 × 1200.

Show a complete square twelve-palace chart on aged cream paper over a dark lacquer desk. A slender aged-brass reading pointer rests diagonally across the chart. Three non-adjacent perimeter cells are marked with small text-free cinnabar seals and connected by one fine taut cinnabar thread forming a clear triangle across the central block. A fourth thin antique-gold line extends to the opposite cell, indicating opposition and cross-reference. The visual hierarchy must immediately communicate “follow the relationships.” The chart is full of restrained analytical texture—tiny ink dots, short ruled marks, evidence ticks—and never blank.

Place the fixed Earthly Branch glyphs exactly once in the correct matrix: top row 巳 午 未 申; second row 辰 [merged center] 酉; third row 卯 [merged center] 戌; bottom row 寅 丑 子 亥. Only four glyphs near the pointer need to be in sharp focus; all must nevertheless remain correctly formed. Use a narrow warm beam from upper left to illuminate the pointer tip, three sealed cells and connecting thread while other cells recede into soft shadow.

Dark lacquer #0F0D0A, aged paper, antique gold #C9A44D, restrained cinnabar #CE5B45, worn woodblock ink, museum-conservation editorial photography, photorealistic, 100mm macro lens, f/3.5, shallow controlled depth, precise and investigative rather than mystical.

Strict exclusions: no archive cabinet, no blank chart, no circular wheel, no luopan, no bagua, no yin-yang, no Western zodiac, no tarot, no cosmic glow, no smoke, no candles, no hands, no people, no logos, no watermark, no text beyond exactly 巳午未申辰酉卯戌寅丑子亥, no numbers, no palace or star names, no malformed or invented glyphs, no pseudo-writing, no blue, green or purple, no decorative clutter.
```

Filename: `cach-doc-moi-lien-he-giua-cac-cung-la-so-tu-vi-homepage.webp`

Alt: `Kim chỉ và đường son nối các cung liên hệ trên một lá số Tử Vi`

---

## H10 — Pattern nền seamless toàn homepage

```text
Create a perfectly seamless square material texture tile for the background of the Lá Số Việt homepage, 1024 × 1024. The pattern must function as an almost invisible layer of material depth behind long text and UI, not as a decorative illustration.

Use a near-black brown lacquer base #15120E with extremely subtle handmade variation: fine irregular lacquer pores, sparse hairline crackle, faint horizontal wiping marks and microscopic isolated traces of worn antique gold no larger than dust. Integrate a very low-contrast geometric watermark derived from the square Tử Vi structure: occasional partial right-angle grid lines, corners from nested squares and fragments of twelve-cell perimeter construction, but never show one complete chart or a recognizable emblem inside a single tile. Let these tonal grooves cross all four tile boundaries naturally so repetition has no visible center, direction or edge.

Uniform luminance, matte surface, orthographic flat material scan, no hotspot, no vignette, no cast shadow, no depth of field. The pattern should be barely perceptible at 100% and remain quiet at 4–6% CSS opacity. Seamless on all edges, archival, tactile and premium.

Strict exclusions: no readable text, no glyphs, no zodiac, no bagua, no yin-yang, no stars, no constellations, no floral brocade, no lotus, no dragons, no clouds, no medallion, no complete compass, no complete seal, no large gold flakes, no bright patches, no red areas, no blue, green or purple, no visible seam, no central focal point, no border, no fabric, no stone, no concrete, no wood grain, no paper grain, no glossy CGI.
```

Filename: `van-son-mai-hinh-hoc-la-so-seamless-homepage.webp`

Alt: để trống; dùng làm CSS background.

---

## H11-D — CTA desktop: “Ngưỡng mở mệnh thư”

**Nhiệm vụ:** tạo cảm giác người xem đã đi tới ngưỡng cửa cuối và chỉ còn một hành động để mở lá số của mình. Đây là hình nền hỗ trợ CTA, không phải một hero thứ hai.

```text
Create a world-class cinematic decorative background for the final call-to-action section of Lá Số Việt, titled “Ngưỡng mở mệnh thư” — the threshold before opening one’s personal Tử Vi chart. Use an ultra-wide 8:3 landscape composition at 2400 × 900. The image will sit behind a centered Vietnamese headline, one supporting sentence and two large buttons, so protect the central interaction zone with absolute discipline.

Keep the central 62% of the frame and the middle 58% of the image height as a calm, nearly uniform near-black lacquer field #0F0D0A. This central safe area must contain no object, line, glyph, reflection, gold flake or bright highlight behind the headline and buttons. Build the visual meaning only around the outer perimeter.

From the left and right edges, show two monumental cropped halves of a black-lacquer archival folio or reading case opening away from the center like a quiet threshold. Their inner edges are lined with extremely restrained aged brass and a few worn eggshell-inlay fragments. Across the far outer edges and corners, emboss fragments of a square Tử Vi structure into the lacquer: exactly twelve implied perimeter compartments surrounding the untouched dark center, visible only as hairline bronze grooves and low-relief right angles. Do not complete the full diagram in one visible area; let the viewer sense that a personal chart is about to open beyond the buttons.

At the exact bottom-center edge, below the button zone, place one tiny text-free cinnabar seal impression made from two concentric rounded squares. From that seal, a very narrow warm line of real reflected light travels outward along the lower brass edges toward both sides, as if the action is ready to activate the archive. The light must never become a supernatural glow and must not pass behind the CTA copy. Add subtle lacquer crackle and deep tonal falloff at the corners so the center feels focused, welcoming and quietly consequential.

Art direction: contemporary Vietnamese knowledge archive, threshold and invitation rather than mysticism, museum-conservation restraint, matte black-brown lacquer #0F0D0A and #15120E, aged brass #C9A44D, pale gold edge #F2DCA0 used sparingly, one tiny cinnabar accent #CE5B45, tactile lacquer and patina, strong but quiet cinematic chiaroscuro, premium editorial product photography, near-overhead perspective, 50mm lens, f/5.6, high detail at the outer edges, soft controlled darkness in the center, photorealistic, no excessive sepia.

Strict exclusions: no text, no letters, no numbers, no Chinese glyphs, no logo, no watermark, no complete chart behind the headline, no central circle, no concentric horoscope rings, no radial spokes, no luopan, no compass, no bagua, no yin-yang, no Western zodiac, no tarot, no stars, no galaxy, no smoke, no incense, no candles, no crystal ball, no door architecture, no temple gate, no religious altar, no dragon or phoenix, no magical portal, no glowing vortex, no people, no hands, no faces, no bright detail in the central 62% width and middle 58% height, no blue, green or purple lighting, no festive red-and-gold styling, no glossy CGI.
```

Filename: `nguong-mo-menh-thu-cta-background-lasoviet-desktop.webp`

Alt: để trống vì là background trang trí; nội dung CTA đã có text thật trong HTML.

## H11-M — CTA mobile

```text
Create the portrait mobile companion to the Lá Số Việt final CTA background “Ngưỡng mở mệnh thư.” Use a 4:5 portrait composition at 1200 × 1500. The background must support a centered headline, supporting sentence and two vertically stacked buttons.

Keep the central 78% of the frame width and the middle 62% of the image height as calm, nearly uniform near-black lacquer #0F0D0A, completely free of objects, grooves, glyphs, reflections and bright highlights. This is the protected mobile CTA zone.

At the extreme upper-left, upper-right, lower-left and lower-right edges, show only cropped fragments of two black-lacquer archival folio covers opening away from the center. Their inner rims carry extremely restrained aged-brass lines and a few worn eggshell-inlay fragments. Emboss partial right-angle corners and short grid segments from a square twelve-palace Tử Vi structure into the outer lacquer, never forming a complete chart and never entering the center. The geometry should feel like a personal map waiting beyond the action, not a generic pattern.

At the bottom edge below the stacked-button area, place one tiny text-free cinnabar seal impression made from two concentric rounded squares. A narrow warm reflection follows the lowest brass edge toward the corners, suggesting readiness and invitation without glowing. Use subtle lacquer crackle, deep corner shadows and restrained museum lighting. Contemporary Vietnamese knowledge archive, matte black-brown #0F0D0A and #15120E, antique brass #C9A44D, one tiny cinnabar #CE5B45 accent, tactile and premium, photorealistic cinematic editorial background, near-overhead view, 50mm lens, f/5.6, high detail only at the outer margins.

Strict exclusions: no text, no letters, no numbers, no Chinese glyphs, no logo, no watermark, no central circle, no horoscope rings, no radial spokes, no luopan, no compass, no bagua, no yin-yang, no zodiac, no tarot, no stars, no galaxy, no smoke, no candles, no crystal ball, no temple gate, no magical portal, no vortex, no people, no hands, no faces, no bright detail inside the protected central 78% width and middle 62% height, no blue, green or purple, no festive red-and-gold styling, no glossy CGI.
```

Filename: `nguong-mo-menh-thu-cta-background-lasoviet-mobile.webp`

Alt: để trống; dùng bằng CSS hoặc `<picture>` với `aria-hidden="true"`.

### Acceptance criteria cho CTA background

- Headline và hai button vẫn là điểm sáng nhất sau khi đặt ảnh.
- Ở desktop, center safe zone rộng tối thiểu 62%; ở mobile, rộng tối thiểu 78%.
- Người xem cảm nhận được một cấu trúc đang mở ở ngoại vi, nhưng không thấy một vòng tròn hoặc biểu tượng chiêm tinh hoàn chỉnh.
- Không có đường kẻ chạy xuyên chữ hoặc nút.
- Dấu son nằm dưới vùng button, không biến thành button thứ ba.
- Test với overlay `linear-gradient(rgba(15,13,10,.56), rgba(15,13,10,.72))`; nếu mất toàn bộ chi tiết ngoại vi thì ảnh quá tối, nếu cạnh tranh với copy thì ảnh quá sáng.

---

## 5. Production rules bắt buộc

### Không ship chữ AI chưa kiểm chứng

1. Zoom 200–400% kiểm từng glyph.
2. Với ảnh có ma trận Địa Chi, kiểm đúng 12 ô và đúng vị trí.
3. Nếu scene đẹp nhưng chữ sai, giữ scene; thay riêng mặt chart bằng vector/overlay đúng, distort theo phối cảnh, dùng multiply và mask ánh sáng để hòa vào giấy.
4. Không chấp nhận “chữ trông giống cổ” nếu không đọc được.

### Kiểm tra trên giao diện thật

- Test ảnh ở đúng `object-fit`, `object-position` và overlay gradient trong homepage.
- Hero desktop và mobile dùng hai file riêng.
- H02 phải test cùng ba insight card đang chồng lên cạnh phải.
- H06 phải fade sạch vào nền ở một phần ba bên trái.
- Card H07–H09 phải vẫn đọc được ý niệm sau khi crop xuống khoảng 380 × 260.
- Pattern test bằng lưới 2 × 2; không lộ tile, moiré hoặc banding.
- H11-D/H11-M phải test sau overlay với headline dài nhất và trạng thái focus của cả hai button.

### Thay đổi code đi kèm

- Bỏ hero la kinh và toàn bộ SVG kim la bàn (`needleTransform`, đường kim, chấm tâm).
- Bỏ microcopy `Kim la bàn → ...` và `Vị trí sơ bộ trên thiên bàn...`.
- Có thể thay bằng: `Từ dữ liệu sinh đến bản đồ 12 cung của riêng bạn.`
- Nếu cần motion, animate một mép sáng rất nhẹ qua cổ thư; không animate chữ và không dùng glow.
- Thay H02 vào khung hình lớn “Bạn nhận được gì”; không dùng giấy trắng hoặc screenshot AI giả.
- Thêm H04 và H05 vào cột visual của bước 02–03 nếu layout desktop cho phép; trên mobile đặt ảnh ngay dưới mô tả từng bước.
- Thay cụm SVG vòng tròn ở CTA cuối bằng `<picture>` dùng H11-D/H11-M; giữ một lớp scrim riêng trong CSS để điều chỉnh contrast mà không sửa file ảnh.

## 6. Thứ tự sản xuất

1. Gen H01-D, duyệt câu chuyện ánh sáng và mảnh gương trước.
2. Dùng H01-D làm reference để gen/outpaint H01-M.
3. Gen H02 và kiểm cùng ba insight card.
4. Gen bộ H03–H05 với cùng seed/reference màu vật liệu.
5. Gen H06.
6. Gen H07–H09 như một triptych đồng nhất.
7. Gen H10 và test tile.
8. Gen H11-D, kiểm trực tiếp dưới CTA; dùng H11-D làm reference để gen H11-M.
