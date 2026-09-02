# Lá Số Việt — Homepage v3 — brief tự chứa cho Claude Design (web)

> Copy toàn bộ nội dung file này dán vào ô prompt của Claude Design.
> Trước khi dán: đổi "Design system" ở thanh công cụ về trống/mới — đừng dùng "iconOS Design System"
> (đó là hệ của dự án khác, không liên quan).

---

## 0. Sản phẩm

Lá Số Việt (lasoviet.vn) — nền tảng lập và luận giải lá số Tử Vi bằng tiếng Việt. Free calculator
dẫn vào báo cáo luận giải trả phí (thanh toán một lần, không subscription). Định vị: "thư viện tri
thức Việt đương đại" — không phải web bói toán, không phải "thầy bói AI".

Yêu cầu: dựng lại **trang chủ** (homepage) ở chuẩn thẩm mỹ world-class. Đây là vòng revise thứ 3.
Hai vòng trước: (1) đúng wireframe nhưng nền sáng generic, (2) đổi sang vàng-kim/nền tối nhưng vẫn bị
chê "giống wireframe fill màu, chưa đẳng cấp".

## 1. Chẩn đoán — lý do vòng 2 chưa đạt

Đổi bảng màu (Paper sáng → vàng-kim/nền tối) chỉ đổi **lớp da**. **Bộ khung trang** vẫn là cấu trúc
landing-page SaaS mặc định:

```
Header → Hero (copy trái / art phải) → Trust strip 4 cột → 3-col feature →
3 step đánh số → card grid 4 cột → 3-col trust block → card grid 3 cột → FAQ accordion →
CTA cuối → Footer
```

Đây là khung dán được vào bất kỳ sản phẩm SaaS B2C nào — fintech, app thiền, khoá học — chỉ cần đổi
copy. Icon riêng và màu vàng đang trang trí lên trên một khung generic, chưa tự bộ khung nói lên "đây
là Tử Vi, tàng thư, sơn mài."

**Yêu cầu bắt buộc: phá vỡ bộ khung ở ít nhất 2-3 điểm cụ thể**, không chỉ thêm chi tiết trang trí:

1. **Hero không phải "copy trái / art phải".** Cân nhắc: sơ đồ 12 cung chiếm toàn bộ chiều rộng làm
   nền, chữ nổi lên trên vùng tối của nó; hoặc một khoảnh khắc tương tác thật (gõ ngày sinh → kim la
   bàn xoay tới đúng cung ngay trên hero) thay vì form-card bo góc kiểu SaaS chuẩn.
2. **"Bạn nhận được gì" đừng là chart-trái/list-phải đối xứng.** Thử bố cục không đối xứng — chart
   lớn hơn, insight card chồng lấn lên rìa chart, hoặc insight hiện như ghi chú tay bên lề một trang
   tàng thư (marginalia) thay vì card đóng khung đều nhau.
3. **"Chủ đề luận giải" đừng là 4 card đều nhau kiểu pricing table.** Tàng thư cổ không trưng hàng
   hoá như SaaS pricing. Thử trình bày như mục lục một cuốn sách thật — số trang, tiêu đề canh lề,
   dòng chấm dẫn (leader dots) tới giá.

**Nguyên tắc:** giữ nguyên toàn bộ token màu/font/spacing bên dưới và toàn bộ copy tiếng Việt — chỉ
đổi hình dạng lưới và cách các khối quan hệ với nhau. Nếu một khối vẫn có thể dán sang trang SaaS
khác mà không ai nhận ra khác biệt, chưa xong.

## 2. Art direction — "Tàng thư các dát vàng"

Một kho lưu trữ tri thức phương Đông chụp trong ánh sáng bảo tàng: hiện vật nằm trên nền sơn mài
sẫm, vàng bắt sáng ở rìa, đỏ son xuất hiện như một con dấu. Lý do chọn hướng này: đây là bảng màu của
**sơn mài Việt Nam** (đen sơn, son, vàng dát, xà cừ) — cho phép vừa có vàng-kim founder yêu cầu, vừa
giữ được lý lẽ "Việt đương đại" thay vì rơi vào look "vàng-đen app bói" chung chung.

Ba tính từ kiểm tra mọi quyết định hình ảnh: **được bảo tồn · có nguồn gốc · được chiếu sáng có chủ đích.**

Cấm: quả cầu pha lê, khói/nhang, lá bài tarot, biểu tượng cung hoàng đạo phương Tây, vũ trụ tím/neon,
mặt người nhìn thẳng, chữ Hán–Nôm chưa kiểm chứng nghĩa.

## 3. Design tokens — ĐÃ CHỐT

```css
/* Nền / bề mặt */
--lacquer-900: #0F0D0A;   /* nền sâu nhất */
--lacquer-800: #15120E;   /* canvas mặc định */
--lacquer-700: #1C1813;   /* panel nổi */
--lacquer-line: #3A3227;  /* hairline */

/* Vàng — dùng cho heading lớn, nút chính, nét vẽ trang trí. KHÔNG dùng cho body/label. */
--gold-400: #F2DCA0;
--gold-500: #C9A44D;      /* vàng đặc — an toàn cho text, contrast cao */
--gold-600: #A8842F;
--gold-700: #9A7730;      /* stop tối nhất của gradient — đo được 4.58:1 trên lacquer-800, vừa đạt AA */
gradient vàng: linear-gradient(103deg, gold-700 0%, gold-400 34%, gold-500 58%, gold-600 100%)

/* Son — chỉ dùng cho "dấu triện" (xem mục 4), không dùng làm accent đại trà */
--son: #CE5B45;
--son-deep: #9E3D2C;

/* Chữ — luôn đặc màu, không bao giờ dùng gradient/--gold-* cho đoạn văn dài */
--pearl-50: #F6F1E6;   /* heading */
--pearl-200: #DCD4C3;  /* body chính */
--pearl-400: #A79E8B;  /* body phụ / caption */
--pearl-600: #6E6656;  /* muted */

/* Font — 3 giọng */
font-display: "Source Serif 4", Georgia, serif;      /* heading, lead, quote, số bước */
font-ui:      "Be Vietnam Pro", system-ui;             /* body, form, nav */
font-mono:    "JetBrains Mono", ui-monospace;          /* eyebrow, giá, nhãn, số liệu */

/* Type scale (desktop / mobile) */
Display 64/40   H1 44/32   H2 34/28   H3 24/22   Lead 20/19   Body 16/15   Small 13.5

/* Spacing */
scale px:  4 8 12 16 24 32 48 64 96 128
scale em (dùng cho nhịp co giãn theo cỡ chữ): .5em .75em 1em 1.5em 2em 3em 4em 6em 8em

/* Bo góc */
--r-sm: 4px (nút, control)   --r-md: 8px (card)   --r-lg: 12px (panel lớn)   --r-pill: 999px (chỉ tag/filter)

/* Container */
max-width: 1200px   |   narrative/reading: 720px

color-scheme: dark — QUYẾT ĐỊNH CHỦ ĐÍCH, single-theme, không cần responsive theo light mode.
```

Ràng buộc contrast: nếu chỉnh gradient vàng, đo lại contrast của stop tối nhất trên nền
`--lacquer-800`, phải ≥4.5:1 cho text thường, ≥3:1 cho text lớn/UI.

## 4. Signature element — bắt buộc giữ, có thể đào sâu cách thể hiện

**Dấu triện** — một icon con dấu vuông viền đôi màu son (`--son`), xuất hiện cạnh MỌI điểm "Vì sao có
nhận định này?" và mọi trích dẫn/căn cứ trong trang. Nguồn gốc: brand guideline gốc viết nguyên văn
"Cinnabar hoạt động như dấu triện: ít nhưng có lực" — đây không phải icon trang trí tự chọn, đây là
component xuyên suốt sản phẩm. Có thể đào sâu: hiệu ứng "đóng dấu" khi hover/click (scale nhẹ + đổi
opacity như mực vừa in xuống giấy).

**Sơ đồ 12 cung (thiên bàn)** — vòng tròn chia 12 cung xuất hiện ở hero và ở khối "bạn nhận được gì",
vẽ như bản vẽ kỹ thuật của một khí cụ thật (đường line-art vàng trên nền tối), không phải icon huyền
bí. Có thể đào sâu: animate xoay chậm vòng ngoài cùng (tôn trọng `prefers-reduced-motion`).

## 5. Ràng buộc brand — KHÔNG được phá dù đổi bố cục/màu

- Copy không dùng ngôn ngữ chắc chắn/định mệnh ("sẽ xảy ra", "chắc chắn") — luôn có điều kiện: "có xu
  hướng", "có thể biểu hiện".
- Không fear-based upsell, không countdown, không fake urgency/scarcity, không testimonial giả.
- Giá luôn kèm "thanh toán một lần" / "không tự động gia hạn" hiển thị rõ, không giấu trong text nhỏ.
- WCAG 2.2 AA là gate bắt buộc: text thường ≥4.5:1, text lớn/UI ≥3:1, focus state luôn hiện rõ bằng
  bàn phím, tôn trọng `prefers-reduced-motion`, touch target tối thiểu 44×44px.
- Không dùng chữ Hán–Nôm chưa kiểm chứng nghĩa, kể cả trong hoạ tiết trang trí SVG.
- AI disclosure phải xuất hiện nguyên văn (xem copy bên dưới), không diễn giải lại thành "AI hiểu bạn
  hơn chính bạn" hay tương tự.

## 6. Copy thật — dùng nguyên văn, không viết lại

**Header:** Logo "Lá Số Việt" · nav: Lập lá số / Luận giải / Kiến thức / Phương pháp · CTA "Lập lá số miễn phí"

**Dải chạy trên đỉnh (marquee, 4 câu lặp vòng):**
Lập lá số Tử Vi miễn phí — không cần tài khoản · Mỗi nhận định đều mở được căn cứ · Lá số của bạn
riêng tư theo mặc định · Báo cáo thanh toán một lần — không tự động gia hạn

**Hero:**
- Eyebrow: `Nền tảng lập và luận giải Tử Vi`
- H1: `Lập lá số. Hiểu vận mệnh.` (đoạn "Hiểu vận mệnh." dùng gradient vàng, phần còn lại pearl-50 đặc)
- Dòng phụ (italic): `Một con người. Nhiều hệ quy chiếu. Một bản luận giải dễ hiểu.`
- Lead: `Xem lá số Tử Vi miễn phí và khám phá những điểm nổi bật bằng lời giải thích rõ ràng, gắn với căn cứ trên chính lá số của bạn.`
- CTA chính: `Lập lá số miễn phí` — CTA phụ: `Xem báo cáo mẫu`
- Ghi chú dưới CTA: `Không cần tài khoản để bắt đầu.`

**Trust strip (4 mục):**
1. Miễn phí trước — Xem tổng quan lá số trước khi cần trả phí.
2. Có căn cứ — Mỗi nhận định gắn với dữ liệu và quy tắc công bố.
3. Riêng tư mặc định — Lá số của bạn không hiển thị công khai.
4. Không tự động gia hạn — Báo cáo là thanh toán một lần.

**"Bạn nhận được gì ngay từ đầu"** (eyebrow: Lá số miễn phí)
Intro: Toàn bộ sơ đồ lá số, ba điểm nổi bật và một căn cứ mở được — trước khi bạn nghĩ đến việc trả phí.
Ba insight (mỗi cái có nút "Vì sao có nhận định này?" kèm dấu triện):
1. Cung Mệnh cho thấy xu hướng chủ động trong giao tiếp. — Rõ hơn ở các giai đoạn cần thương lượng hoặc trình bày ý tưởng.
2. Giai đoạn này có thể tăng áp lực về vai trò trong công việc. — Một điểm căng thẳng nên quan sát, không phải một cảnh báo chắc chắn.
3. Một điểm đáng theo dõi: nhịp độ tài chính giữa năm. — Gợi ý để chuẩn bị, không phải một kết luận về được hay mất.

**"Cách hoạt động"** (3 bước — số thứ tự CÓ Ý NGHĨA ở đây, đây là quy trình thật):
01 Nhập dữ liệu sinh — Ngày, giờ và nơi sinh. Không rõ giờ sinh vẫn tiếp tục được với kết quả giới hạn.
02 Xem lá số miễn phí — Toàn bộ sơ đồ, ba điểm nổi bật và một căn cứ có thể mở ra xem ngay.
03 Chọn chủ đề luận giải sâu — Xem mục lục, báo cáo mẫu và giá trước khi quyết định — nếu bạn muốn đi sâu hơn.

**"Căn cứ nằm ngay cạnh nhận định"** (eyebrow: Minh bạch)
Intro: Mọi kết luận quan trọng đều mở ra được để xem vì sao — ngay tại chỗ, không chôn trong trang phương pháp.
Claim mẫu: `Giai đoạn này có thể tăng áp lực về vai trò trong công việc.` — nhãn: `Tin cậy: trung bình`
Evidence drawer (5 dòng, dt/dd):
- Căn cứ được sử dụng → Vận hạn tại Cung Quan Lộc, đối chiếu với chính tinh thủ mệnh.
- Mức độ tin cậy → Trung bình — nhạy với giờ sinh.
- Ảnh hưởng của giờ sinh → Nếu giờ sinh không chắc chắn, cung này có thể lệch một vị trí liền kề.
- Khi nào có thể không đúng → Khi vai trò công việc hiện tại đã ổn định và ít thay đổi trong năm nay.
- Điều bạn có thể quan sát → Đối chiếu với khối lượng công việc hoặc trách nhiệm mới trong 1–2 tháng tới.

**"Chọn chủ đề khi bạn cần đi sâu hơn"** (eyebrow: Luận giải chuyên sâu, 4 chủ đề — số thứ tự ở đây là danh mục, không phải quy trình):
1. Bản mệnh & Tiềm năng — 7 luận điểm · thế mạnh và nguồn lực · khoảng 12 trang — 79.000 ₫ · Một lần
2. Tình duyên & Hôn nhân — Pattern quan hệ · giới hạn · hành động lành mạnh — 79.000 ₫ · Một lần
3. Công việc & Tài lộc — Xu hướng, điều kiện và rủi ro quan sát được — 79.000 ₫ · Một lần
4. Vận trình năm 2026 — Cửa sổ thời gian, dấu hiệu và checklist chuẩn bị — 99.000 ₫ · Một lần
(mỗi mục có link "Xem báo cáo mẫu")

**"Cách chúng tôi luận giải"** (eyebrow: Niềm tin, 3 khối):
- Phương pháp — Lá số được lập theo rule set Tử Vi công bố. Cách tính và phiên bản engine đều ghi rõ trong trang phương pháp.
- Vai trò của AI — Lá Số Việt dùng công cụ tính toán theo phương pháp và AI để tổ chức, đối chiếu và diễn giải bằng tiếng Việt. Mỗi nhận định quan trọng đều gắn với dữ liệu lá số được sử dụng.
- Quyền riêng tư — Lá số và báo cáo là riêng tư theo mặc định, không xuất hiện trên công cụ tìm kiếm. Bạn xem, sửa hoặc xóa dữ liệu bất cứ lúc nào.

**"Bắt đầu từ đây"** (eyebrow: Thư viện tri thức, 3 bài viết — mỗi bài có ô ảnh, xem mục 7):
- Lá số Tử Vi là gì? — Định nghĩa, cấu trúc 12 cung và cách một lá số được dựng lên.
- Cách lập lá số Tử Vi — Quy trình tính toán từ ngày, giờ, nơi sinh đến vị trí các sao.
- Cách đọc lá số Tử Vi — Bắt đầu từ Cung Mệnh, sau đó mở rộng sang các cung liên quan.

**FAQ** (eyebrow: Câu hỏi thường gặp, 4 mục dạng accordion):
- Lá Số Việt có dùng AI không? → Có. AI hỗ trợ tổ chức và diễn giải trong giới hạn căn cứ đã cấp — không thay thế dữ liệu và quy tắc tính toán.
- Tôi không nhớ chính xác giờ sinh thì sao? → Bạn có thể tiếp tục với kết quả giới hạn hoặc bổ sung giờ sinh sau. Chúng tôi nêu rõ phần nào bị ảnh hưởng.
- Báo cáo trả phí có tự động gia hạn không? → Không. Giá hiển thị là giá thanh toán một lần, không tự động gia hạn.
- Dữ liệu sinh của tôi được dùng như thế nào? → Chỉ để lập lá số và tạo phần diễn giải này. Lá số riêng tư theo mặc định; bạn có thể kiểm tra, sửa hoặc xóa bất cứ lúc nào.

**CTA cuối:**
H2: `Bắt đầu với lá số miễn phí của bạn` — Body: `Không phán định tương lai. Không dùng nỗi sợ để bán hàng.`
CTA: Lập lá số miễn phí / Xem báo cáo mẫu

**Footer:**
Brand line: Lá Số Việt — Thư viện tri thức Việt đương đại — một bàn đọc riêng tư dành cho từng người.
- Sản phẩm: Lập lá số Tử Vi / Luận giải Tử Vi / Báo cáo mẫu
- Kiến thức: Lá số Tử Vi là gì? / Cách lập lá số / Cách đọc lá số
- Công ty & pháp lý: Phương pháp & trust / Quyền riêng tư / Liên hệ
- Dòng cuối: © 2026 Lá Số Việt. Nội dung mang tính tham khảo và tự chiêm nghiệm. · lasoviet.vn

## 7. Hình ảnh — chưa có ảnh thật, dùng placeholder có đánh số

4 vị trí cần ảnh (đặt placeholder tối màu, đánh số rõ để sau thay bằng ảnh thật — đừng để thiếu ảnh
làm chậm tiến độ):

- **Ảnh 01** (nền hero, ngang, rộng): macro cận cảnh bề mặt sơn mài đen, có vết rạn tự nhiên, dát vàng
  bắt sáng ở một góc, xà cừ khảm rải rác, ánh sáng xiên góc thấp, 2/3 khung bên trái tối đặc để chữ đè lên.
- **Ảnh 02** (bài "Lá số Tử Vi là gì?"): một cuốn sách cổ phương Đông đang mở, giấy ngả vàng, đóng gáy
  chỉ, đặt trên mặt bàn sơn mài tối, một vệt sáng hẹp chiếu vào một góc trang.
- **Ảnh 03** (bài "Cách lập lá số Tử Vi"): bút lông thư pháp gác trên nghiên mực đá, mực đen còn ướt,
  vụn vàng rải ở rìa khung, ánh sáng ấm từ một phía.
- **Ảnh 04** (bài "Cách đọc lá số Tử Vi"): cận cảnh một tủ tàng thư cổ sơn son thếp vàng, các ngăn kéo
  nhỏ tay cầm đồng cũ, chụp góc thấp để các ngăn khuất dần vào bóng tối.

Nếu cần sinh ảnh bằng AI, đuôi prompt chung: `dark lacquer background, single low-angle raking light,
deep shadows, gold leaf catching the light, shallow depth of field, museum artifact photography,
muted warm palette of black-brown, antique gold and cinnabar red, no text, no people, no cosmic or
zodiac imagery, photorealistic, 35mm, f/2, high detail`

## 8. Yêu cầu cuối

Dựng lại trang chủ theo toàn bộ nội dung trên. Trước khi build, tự phê bình bố cục dự kiến: nếu một
khối bất kỳ vẫn có thể dán sang trang SaaS khác mà không ai nhận ra khác biệt, chưa xong — quay lại
sửa bố cục đó theo hướng mục 1. Ưu tiên phá khung ở hero, "bạn nhận được gì", và "chủ đề luận giải".
Giữ nguyên 100% token ở mục 3 và copy ở mục 6.
