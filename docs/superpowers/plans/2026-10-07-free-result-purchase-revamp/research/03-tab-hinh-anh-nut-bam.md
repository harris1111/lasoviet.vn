# 03 — Tab, hình ảnh trực quan, nút bấm (nghiên cứu UX/UI, chưa phải code)

> Ngày 07/10/2026. Phạm vi: câu Q3, Q4, Q7, Q8, Q10 (và Q2, Q6 liên quan) trong biên bản `docs/reviews/2026-10-07-hop-ux-ui-luong-mua-luan-giai.md`.
> Đã dùng `ui-ux-pro-max` (chạy tìm kiếm: điều hướng tab, phản hồi chạm, paywall, biểu đồ thời gian, biểu đồ xếp hạng) và `high-end-visual-design`.
> Hướng hình ảnh: **Editorial Luxury bản tối** (sơn mài, chữ có chân to, hai lớp viền, nút viên tròn), khớp `docs/22-art-direction.md`.
> Bỏ những điều của skill trái quyết định đã duyệt: header "viên thuốc nổi" (FD-100), thẻ xoay nghiêng, kính mờ trên nội dung cuộn, đổi phông.

**Cách đọc các nhãn trong file này**
- **[ĐÃ KIỂM CHỨNG: đường-dẫn:dòng]** = em đã đọc code/ảnh và thấy đúng như vậy.
- **[SUY LUẬN]** = em suy ra từ code liên quan, chưa chạy thử trên trang thật. Cần An hoặc Sonnet kiểm lại trước khi dựa vào.

---

## PHẦN A. Tóm tắt cho anh Lãm (đọc phần này là đủ để quyết)

1. **Tab:** 5 tab anh duyệt (Tổng quan → Năm nay → Đại vận → 12 cung → Chủ đề) là **đủ cho bản đầu**. Không nên thêm tab thứ 6. Những thứ AiTuvi có mà ta thiếu (tháng, ngày, lớp phủ đại vận trên lá số) em xếp **vào trong** các tab này, không mở tab mới.
2. **Thứ tự "Năm nay" trước "Đại vận"** khác thứ tự truyền thống (đại vận trước, rồi tiểu vận/lưu niên). Em vẫn đồng ý giữ thứ tự của anh vì khách tò mò năm nay trước, nhưng đầu tab Năm nay phải có một dòng "Chặng 25–34 tuổi, cung Phu Thê → năm 2026 vào cung Phúc Đức" để khách thấy hai lớp liên quan nhau.
3. **Máy tính vận hành được những gì?** Động cơ đã tính sẵn: đại vận hiện tại, lưu niên (năm), 12 lưu nguyệt (tháng, mỗi tháng thuận / trung tính / cần chú ý), lưu nhật (hôm nay). **Chưa** gửi ra trang miễn phí: danh sách đủ các chặng đại vận (An cần thêm), và từng tháng (trang chỉ nhận con số tổng).
4. **Q4 (tấm xem thử):** giải thích bằng chuyện một khách ở Phần C. Ý chính: bấm một hàng "Chưa mở" thì **một tấm trượt lên ngay lập tức**, cho đọc thử 2 câu đầu của chính cung đó, rồi mờ; giá chỉ hiện trong tấm đó, khách tự bấm mới thấy.
5. **Vì sao hiện nay bấm "không phản hồi"?** Có **hai nguyên nhân thật**, không phải một. (a) Trang lá số: mỗi lần bấm là đi hỏi máy chủ lại cả trang rồi mới mở tấm, không có dấu hiệu đang tải. (b) Trang chọn luận giải: thẻ không có chút code nào để bấm, chỉ có nút nhỏ "Chọn phần này", và dòng "đang chọn" nằm tít cuối trang. Chi tiết ở Phần E.
6. **Phát hiện thêm:** nút bị khoá trên toàn site (ví dụ "Sắp ra mắt") **trông y như nút bấm được**, vì không có giao diện riêng cho nút bị khoá. Sửa một chỗ trong `global.css` là sửa cho cả site.
7. **Q7 (3 cung nâng đỡ / 3 cung cần lưu tâm):** dùng đúng 12 điểm cấu trúc đã có (công thức FD-111). Em đề xuất "huy hiệu tròn có vòng điểm" + biểu tượng cung vẽ sẵn (đã có đủ 12 ảnh).
8. **Q8 (Đường đời 10 năm):** điểm mỗi chặng = điểm cấu trúc của **cung mà chặng đó đi qua** (công thức đã gồm cung đối và hai cung tam hợp, tức tam phương tứ chính). Không cần công thức mới, nhưng cần anh ghi một FD ngắn để chốt.
9. **Ảnh cho ChatGPT:** chỉ cần **2 ảnh bắt buộc** (hoa văn góc khung, vòng huy hiệu) và **1 ảnh tuỳ chọn** (icon Đại vận). Còn lại tái dùng ảnh đã có. Phần F có prompt sẵn.
10. **Phân công:** gần như tất cả là FRONTEND (anh + Claude). An chỉ có 5 việc nhỏ ở phần engine/hợp đồng dữ liệu, nêu ở Phần G.

**Hai chỗ em cần anh quyết riêng** (nằm ở Phần H): (1) đang có đoạn code tự **ép** một tháng "cần chú ý" khi lá số không có tháng nào; (2) có cho hiện vị trí tháng cần chú ý ("?" nằm ở ô số mấy) hay chỉ hiện con số tổng.

---

## PHẦN B. Q3 — Kiểm tra bộ tab

### B1. So sánh ba mô hình

| Lớp xem | Trình tự truyền thống | AiTuvi (7 tab, ảnh 13–20) | Lá Số Việt đề xuất (5 tab) | Máy tính có dữ liệu? |
|---|---|---|---|---|
| Lá số gốc: Mệnh, Thân, tứ hoá, cách cục | 1 | **Lá số** (có "Lưu đại vận / Lưu tiểu vận" bật tắt trên lá số, ảnh 19) | **Tổng quan** (lá số + bài ~1.400 chữ) | Có. Chưa có: Cục, Mệnh chủ, Thân chủ, nạp âm (AiTuvi in những thứ này ở giữa lá số) [SUY LUẬN: không thấy trong `packages/engine-adapters/src/ziwei/iztro-mapping.ts`] |
| 12 cung | 2 | **Luận cung** (12 dòng, mỗi dòng "Mở – 60 đến 150 Xu") | **12 cung** | Có |
| Đại vận (10 năm) | 3 | **Đại vận** (cột 5–14, 15–24…, nhãn "Chính vận") | **Đại vận** | Chặng hiện tại có. Đủ chặng: có trong thư viện iztro nhưng chưa ra trang miễn phí |
| Tiểu vận / lưu niên (năm) | 4 | **Tiểu vận** (đường lượn theo tuổi, nhãn "Năm nay") | **Năm nay** | Có (cung lưu niên, tuổi âm) |
| Lưu nguyệt (tháng) | 5 | **Nguyệt vận** (12 tháng, mỗi tháng một đoạn chữ) | nằm **trong tab Năm nay** | Có: 12 tháng, mỗi tháng thuận / trung tính / cần chú ý |
| Lưu nhật (ngày) | 6 | **Nhật vận** (biểu đồ ngày trống 0%, ảnh 12) | thẻ "Hôm nay của bạn" **trong tab Năm nay** | Có (ngày, cung bị chạm) |
| Chuyên đề | 7 | **Chuyên đề** (15 đề, chỉ mô tả) | **Chủ đề** (2 đề đang bán) | Có (danh mục sản phẩm) |

**[ĐÃ KIỂM CHỨNG]** Động cơ khai báo hỗ trợ đủ bốn lớp: `iztro-mapping.ts:460-465` (decadal, annual, monthly, daily đều `supported: true`). Tháng: `iztro-horoscope.ts:196-313`. Ngày: `iztro-horoscope.ts:364-403`. Đại vận hiện tại: `iztro-horoscope.ts:405-417`.

### B2. Kết luận và lý do

**Giữ 5 tab. Thứ tự: Tổng quan → Năm nay → Đại vận → 12 cung → Chủ đề.**

| Câu hỏi | Trả lời |
|---|---|
| Có thiếu lớp nào so với truyền thống không? | Không thiếu lớp. Tiểu vận + nguyệt vận + nhật vận gộp vào một tab "Năm nay" có ba tầng: năm, 12 tháng, hôm nay. Tách ba tab như AiTuvi chỉ làm khách phải bấm nhiều và hai trong ba tab đó (tiểu vận, nhật vận) của họ gần như trống chữ hoặc chữ giống nhau. |
| Có cần thêm tab để bán thêm không? | Không. Sản phẩm bán được hiện chỉ gồm: một cung, Bản mệnh, Trọn đời, Hôm nay, hai chủ đề (xem `FIXED_SKUS` ở `offer-ladder.tsx:15`). Mỗi tab đã có một "cửa" tới một sản phẩm. |
| Thứ tự "Năm nay" trước "Đại vận" có sai nguyên tắc không? | Truyền thống đọc đại vận trước vì đại vận là bối cảnh của năm. Em giữ thứ tự của anh để đón tò mò, **kèm** dải "hai lớp" ở đầu tab Năm nay (xem B4) để không mất logic. |
| Mobile có tab không? | Hiện **không có**: thanh tab bị ẩn dưới 1024px, mọi thứ là một trang cuộn dài `free-result-read-first.css:7` và `:114`. **[ĐÃ KIỂM CHỨNG]**. FD-108 đã chốt "mobile một trang cuộn". Em đề xuất **giữ một trang cuộn** nhưng thêm **thanh chip dính đầu trang** (5 chip, bấm là cuộn tới mục, chip đang đọc sáng lên). Không phải đổi FD-108. Nếu anh muốn tab thật trên điện thoại (mỗi lần một mục) thì phải sửa FD-108 và đo lại độ sâu đọc. |

### B3. Bổ sung vào trong tab (không thêm tab)

| # | Bổ sung | Nằm ở | Vì sao | Dữ liệu |
|---|---|---|---|---|
| 1 | **Lớp phủ trên lá số**: hai nút bật/tắt "Hiện đại vận" và "Hiện lưu niên", đánh dấu cung đại vận (vòng vàng đứt nét + chữ "ĐV") và cung lưu niên (vòng son liền + chữ "LN") | Lá số dính cột trái (desktop), khối lá số (mobile). Mặc định bật khi đang ở tab Năm nay / Đại vận | AiTuvi có (ảnh 19) và đây là cách trực quan nhất để khách thấy "chặng này, năm này nằm ở đâu trên lá số của mình" | Có trong `ZiweiHoroscopeResultV1`: `decadal.palaceId`, `yearly.annualPalaceId` (`ziwei-horoscope-v1.ts:35,76`). Chưa có trong `FreeResultModel` (`ziwei-free-result-model.ts:34-48`) nên cần thêm [ĐÃ KIỂM CHỨNG] |
| 2 | **Dải "hai lớp"** ở đầu tab Năm nay | Năm nay | Giữ logic truyền thống | Như trên |
| 3 | **Thẻ "Hôm nay của bạn"** (ngày, cung bị chạm) | Cuối tab Năm nay | Thay cho tab Nhật vận. Sản phẩm `ZIWEI-TODAY-P0` 60 Lá đã bán được (`offer-ladder.tsx:15`, ảnh 4) | `horoscope.daily` |
| 4 | **Bản mệnh–thân ngắn gọn** (Mệnh ở đâu, Thân ở đâu, tứ hoá) | Đầu Tổng quan, cạnh lá số | Bài đọc dài 1.400 chữ cần "tóm trong 3 dòng" trước | Có trong lá số (`ziwei-chart.tsx:132-152`) |
| 5 | **Cục, Mệnh chủ, Thân chủ, nạp âm** ở giữa lá số | Giữa lá số | AiTuvi in ra (ảnh 19), người xem Tử Vi quen đọc những thứ này. Cũng lấp chỗ trống cho hoa văn la kinh | Chưa có, An thêm ở lớp ánh xạ động cơ. **Không bắt buộc cho bản đầu** |
| 6 | **Bản đồ 12 cung** có biểu tượng + điểm + nút "Xem thử" | Tab 12 cung | Thay danh sách chữ khô | Có (12 biểu tượng sẵn, xem F0) |

### B4. Từng tab: gì miễn phí, gì khoá, hình gì

| Tab | Miễn phí | Khoá (mở trong tấm xem thử) | Hình ảnh | Dữ liệu có sẵn? |
|---|---|---|---|---|
| **Tổng quan** | Lá số đẹp (sơn mài, la kinh, dấu triện), tóm tắt Mệnh–Thân, bài ~1.400 chữ, **3 cung nâng đỡ + 3 cung cần lưu tâm**, một cung đọc trọn (quà), 12 điểm cấu trúc | Cung còn lại | Huy hiệu vòng điểm (Q7) | Có. Điểm: `report-palace-score.ts` → `structural-palace-score.ts:111-136` |
| **Năm nay** | Cung lưu niên, tuổi âm, dải hai lớp, **12 ô tháng** (thuận / trung tính / cần chú ý), câu tóm tắt năm, thẻ "Hôm nay" (ngày + cung bị chạm) | Luận năm 2026 + đại vận (đoạn cắt giữa câu hiện có, `model.periodTeaser`), nội dung từng tháng cần chú ý | Dải 12 ô tháng | Có (xem Phần C phần "Năm nay") |
| **Đại vận** | Dải **Đường đời 10 năm** (Q8), chặng hiện tại đánh dấu, cung và tuổi từng chặng, điểm cấu trúc từng chặng, hộp "tính thế nào" | Luận giải từng chặng (chặng hiện tại có đọc thử) | Dải cột / thanh | Cần An thêm danh sách đủ chặng (xem G) |
| **12 cung** | Bản đồ: tên cung, sao chính, điểm, nhãn dễ hiểu; 1 cung đọc trọn (đã tặng) | 11 cung còn lại: tấm xem thử | Thẻ có biểu tượng + thanh điểm | Có |
| **Chủ đề** | 2 đề đang bán (Công việc và tài lộc; Tình duyên và hôn nhân), câu hỏi + cung liên quan | Luận giải đề | Hai cung liên quan nối bằng đường mảnh trên lá số mini | Có (`free-result-topic-catalog.ts:16-29`) |

> Ghi chú tab "Căn cứ" (Q2): đã bỏ. Mỗi nhận định có **chip "Căn cứ"** (Phần C-6).

---

## PHẦN C. Q4 — "Hàng bị khoá mở ra tấm xem thử" là gì (giải thích dễ hiểu)

### C1. Nói đơn giản
- **Hàng bị khoá** = một dòng trên trang miễn phí nói về phần anh **chưa đọc** (ví dụ "Cung Phu Thê").
- **Tấm xem thử** = một tờ giấy **trượt lên từ dưới** (điện thoại) hoặc **trượt từ phải sang** (máy tính), nằm trên trang. Bấm đóng là về đúng chỗ đang đọc.
- Hiện nay bấm vào dòng đó, tấm mở ra nhưng **không có gì mới**: chỉ có tên cung, điểm, vài ngôi sao, một câu chung chung, rồi nút mua. Khách thấy như bị chặn lại (ngõ cụt). [ĐÃ KIỂM CHỨNG: `ziwei-free-result.tsx:347-369`]

### C2. Chuyện một khách (Mai, 29 tuổi) từng bước

1. Mai đọc xong phần tổng quan. Cô thấy dòng **Cung Phu Thê · Bộ sao thiên về hỗ trợ · 67 · Xem thử ›**.
2. Cô chạm vào dòng. **Ngay lập tức** (không chờ tải) tấm xem thử trượt lên.
3. Trong tấm, từ trên xuống: tên cung + huy hiệu điểm → "**Bài đọc đầy đủ sẽ cho bạn biết**" (3 gạch đầu dòng, có tên sao thật của lá số của Mai) → **2 câu đầu bài đọc của đúng cung Phu Thê**, câu thứ hai bị cắt giữa chừng và mờ dần → chip "Căn cứ: Phá Quân ở Phu Thê" → hộp mờ (chỉ là các thanh xám, không có chữ thật) → **giá + nút "Mở – 120 Lá →"** → "Xem tất cả gói" → nút Đóng.
4. Mai có ba cách: (a) bấm Mở, thấy bước xác nhận (số dư, còn lại bao nhiêu, và lúc này mới hiện quy đổi tiền đồng, theo Q6), (b) bấm Đóng quay lại đọc tiếp, (c) bấm "Xem tất cả gói".
5. Nếu Mai không bấm gì, trang miễn phí **không bao giờ** hiện giá trên thân trang (FD-109, FD-110).

### C3. Vì sao thiết kế này hợp lý

| Quyết định | Lý do |
|---|---|
| Hàng nào cũng bấm được, nhưng không có giá trên hàng | Khách tự mở mới thấy giá: giữ FD-110, không bị cảm giác "bị bán hàng" khi đang đọc |
| Tấm hiện **ngay**, không chờ máy chủ | Nếu chờ, khách tưởng không bấm được. Xem nguyên nhân ở Phần E |
| Có 2 câu đọc thử **của chính cung đó** | Khắc phục điểm yếu của AiTuvi (chữ đọc thử giống nhau cho mọi người) và ngõ cụt X2 trong biên bản |
| Phần mờ chỉ là hình khối | Giữ nguyên quy tắc không lộ chữ trả phí (FD-059) |
| Tấm thay vì mở rộng tại chỗ hoặc sang trang khác | Bảng so sánh dưới |

| Cách trình bày | Ưu | Nhược | Chọn? |
|---|---|---|---|
| Mở rộng tại chỗ (accordion) | Không rời trang | Đẩy nội dung xuống, trên điện thoại rất dài, khó đặt nút mua rõ | Không |
| Sang trang riêng | Nhiều chỗ | Khách mất vị trí đang đọc, phải bấm Back | Không |
| **Tấm trượt (sheet)** | Giữ ngữ cảnh, một ngón cái đóng được, đã có sẵn khung mở khoá (`unlock-sheet.tsx`) | Cần quản lý focus, Esc, nút Back | **Chọn** |

### C4. Phần miễn phí vẫn nguyên
Toàn bộ bài tổng quan, một cung đọc trọn, 12 điểm cấu trúc, lá số, số tháng, các chặng đại vận (mới), 3 cung nâng đỡ / cần lưu tâm. Tấm xem thử **chỉ thêm** chữ miễn phí mới (2 câu đầu), không rút gì của thân trang.

### C5. Thành phần tấm xem thử (cho Sonnet làm)

```
Điện thoại 390 (tấm trượt từ dưới, cao tối đa 88dvh)       Desktop 1440 (tấm bên phải 480px)
┌────────────────────────────────┐
│          ───── (tay nắm)       │   Hàng: [●] Cung Phu Thê   67 ▸ Xem thử
│ ✕ Đóng                         │          Phá Quân · Dần
│ [vòng điểm 67]  CUNG PHU THÊ   │   Bấm → tấm
│ Bộ sao thiên về hỗ trợ         │
│ ── Bài đọc đầy đủ cho bạn biết │
│ • 3 gạch đầu dòng (sao thật)   │
│ ── Đọc thử ───────────────     │
│ "Phá Quân ở Phu Thê gợi ...    │
│  thay đổi cần được hiểu trong ░│  <- câu 2 bị cắt giữa chừng, mờ dần
│ ░░░░░░░░░░░░░░░ (hình khối)    │
│ [Căn cứ · 2 sao]               │
│ Mở – 120 Lá  [  Mở  → ]        │  <- nút viên, mũi tên trong vòng tròn
│ Xem tất cả gói luận giải       │
└────────────────────────────────┘
```
- Nguồn chữ đọc thử: thư viện câu miễn phí GĐ3 (An). Trong lúc chờ: dùng dòng sự kiện thật hiện có (`facts`: nhánh + sao, `ziwei-free-result-model.ts:101-104`).
- Giá lấy từ báo giá thật (`contextual-unlock.tsx:74-80`), chỉ bằng Lá. Quy đổi tiền đồng chỉ ở bước xác nhận cuối (Q6).

### C6. Chip "Căn cứ" (thay tab Căn cứ, Q2) — mô tả ở Phần D-6.

---

## PHẦN D. Thiết kế hình ảnh (visualize) từng khối

### D0. Hệ thiết kế chung (áp cho mọi khối bên dưới)

| Mục | Quy định |
|---|---|
| Màu | Chỉ dùng token (`tokens.css`): nền `--lacquer-800/700`, mặt thẻ `--surface-raised #221d16`, vàng `--gold-400 #f2dca0` / `--gold-500 #c9a44d`, son `--son #ce5b45`, chữ `--text-heading/body/muted`. **Không** dùng lục/lam/tím (docs/22 mục 2). Light theme tự đổi theo lớp semantic (docs/24). |
| Thang màu cho điểm | `manh` vàng sáng `--gold-400` → `thuan` `--gold-500` → `can` ngà `--pearl-400` → `canh` son `--son` → `kho` son + **sọc chéo**. Luôn kèm **nhãn chữ + con số**, không để màu một mình mang nghĩa. |
| Độ tương phản đã đo (tôi tính từ token) | Chữ `--pearl-400` trên `--surface-raised`: **6,3:1** (đạt). `--gold-500` trên `--surface-raised`: **7,1:1**. `--son` trên `--lacquer-900`: **4,8:1**, trên `--surface-raised`: **4,1:1** (chỉ dùng cho hình ≥3:1, **không** dùng cho chữ nhỏ trên thẻ). `--pearl-600` chỉ **2,9:1**: cấm dùng cho chữ. Viền `--border-soft` chỉ ~1,7:1: chỉ để trang trí, không dùng để nhận biết "đang chọn". |
| Chữ | Tiêu đề: Source Serif 4. Thân và nhãn: Be Vietnam Pro. Con số điểm / năm: JetBrains Mono. Nội dung ≥ 16px (thân), nhãn ≥ 14px, không dưới 12px. |
| Thẻ quan trọng | **Hai lớp viền**: vỏ ngoài (nền vàng rất nhạt `rgba(242,220,160,.04)`, viền 1px, đệm 6px, bo 22px) + lõi trong (`--surface-raised`, bo 16px = `--radius-card`, vệt sáng trong `inset 0 1px 0 rgba(242,220,160,.06)`). Áp cho: lá số, thẻ gói, tấm xem thử, khối Đường đời. |
| Nút chính | Viên tròn (`--radius-pill`), cao ≥48px, mũi tên (`ui-arrow-lasoviet.svg`) trong vòng tròn 32px riêng sát mép phải. |
| Chuyển động | Thời lượng token: 120ms phản hồi, 180ms chuẩn, 240ms tấm. Đường cong `cubic-bezier(0.32,0.72,0,1)`. Hiện dần khi cuộn tới: chỉ `opacity` + `translateY(12px)`, 600ms, dùng `IntersectionObserver`, **không** làm mờ bằng blur trên điện thoại. Chỉ animate `transform` và `opacity`. Tắt hết khi `prefers-reduced-motion`. |
| Hoa văn trang trí | Hai ảnh mới (Phần F) tô màu bằng CSS mask nên dùng được cả sáng và tối [SUY LUẬN: mask-image trên ảnh có kênh trong suốt, cần thêm tiền tố `-webkit-`]. |
| Mọi cung có biểu tượng sẵn | `apps/web/public/images/troi-nam/icon/cung/*.webp` (12 ảnh nét vàng, kênh trong suốt, ~200px) **[ĐÃ KIỂM CHỨNG]**; biểu tượng hành trình `icon/hanh-trinh/{nam-nay,lich-am,luu-la-so,...}.webp`. Bộ SVG 100+ icon `icons/lasoviet/v1` (gold / ink / mono) cho giao diện nhỏ. |

### D1. Q7 — "3 cung nâng đỡ nhất / 3 cung cần lưu tâm"

**Thay cho:** biểu đồ mạng nhện `ReportPalaceRadar` (`ziwei-free-result.tsx:241,262`) và hai dòng `strongest/weakest` (`:84-85`, :263-264).

**Dữ liệu [ĐÃ KIỂM CHỨNG]:** `model.palaces[].score/band/facts` (`ziwei-free-result-model.ts:93-105`), sắp xếp giảm dần lấy 3 đầu và 3 cuối. Công thức `structural-palace-score.ts:111-136`. Tách "hòa điểm" theo thứ tự cung chuẩn để kết quả luôn giống nhau.

**Tên tiêu đề:** "3 cung nâng đỡ nhất" và "3 cung cần lưu tâm hơn cả". "Hơn cả" là so sánh trong lá số này. Nếu cung thấp nhất vẫn ≥ 55 (nhãn "thiên về hỗ trợ"), dưới huy hiệu ghi "vẫn ở mức thuận, chỉ thấp hơn các cung khác".

```
Desktop 1440 (cột đọc ~740px)                                  Điện thoại 390 (xếp dọc)
┌ 3 CUNG NÂNG ĐỠ NHẤT ────────┬ 3 CUNG CẦN LƯU TÂM HƠN CẢ ┐   ┌ 3 CUNG NÂNG ĐỠ NHẤT ─────────┐
│ ①  (◔71) Mệnh               │ ①  (◔32) Tử Tức            │   │ ① (◔71) Mệnh        Xem thử ›│
│    Bộ sao hỗ trợ mạnh       │    Bộ sao cần lưu tâm      │   │   Liêm Trinh, Thiên Phủ        │
│    Liêm Trinh, Thiên Phủ    │    Sửu · không chính tinh  │   │ ② (◔70) Quan Lộc               │
│ ②  (◔70) Quan Lộc           │ ②  (◔39) Điền Trạch        │   │ ③ (◔68) Thiên Di               │
│ ③  (◔68) Thiên Di           │ ③  (◔40) Tật Ách           │   ├ 3 CUNG CẦN LƯU TÂM HƠN CẢ ─────┤
└─────────────────────────────┴────────────────────────────┘   │ ① (◔32) Tử Tức                 │
 [Xem cả 12 cung ▾]  → 12 thanh ngang xếp theo điểm + hộp       │ ...                           │
 "Điểm này tính thế nào?"                                       └────────────────────────────────┘
```
(◔) = huy hiệu: biểu tượng cung vẽ sẵn ở giữa, **vòng cung điểm** quanh biểu tượng, khung vòng trang trí (ảnh mới F2: vàng cho "nâng đỡ", son cho "cần lưu tâm", tô bằng CSS mask).

| Khía cạnh | Quy định |
|---|---|
| Mỗi mục | Số thứ hạng (Serif), huy hiệu, tên cung, nhãn dễ hiểu (`score_band_*` ở `messages/vi/reports.json:349-353`), một dòng sao thật (`facts`), con số điểm cỡ nhỏ bên cạnh, chip "Căn cứ", mũi tên "Xem thử ›". |
| Bấm | Cả mục là nút (≥ 64px cao). Bấm → lá số làm nổi cung đó (vòng sáng) **và** mở tấm xem thử cung đó (hoặc cuộn tới bài quà nếu là cung đã tặng). |
| Mobile 390 | Hai nhóm xếp dọc, mỗi nhóm 3 hàng; không cuộn ngang. Không đặt mạng nhện. |
| Desktop 1440 | Hai cột cạnh nhau trong cột đọc; hover nâng thẻ 2px + viền vàng; con trỏ tay. |
| Chuyển động | Vòng điểm "vẽ" từ 0 tới giá trị (dùng `transform: rotate` trên nửa vòng hoặc ảnh tĩnh nếu giảm chuyển động), 700ms, lệch nhau 80ms. Chỉ chạy một lần khi vào khung nhìn. |
| Trợ năng | Danh sách `<ol>`; mỗi nút có nhãn: "Hạng 1, Cung Mệnh, 71 trên 100, bộ sao hỗ trợ mạnh, bấm để xem thử". Không dùng màu một mình. Thứ tự tab = thứ tự thị giác. |
| Miễn phí / khoá | Điểm, nhãn, sao: **miễn phí** (FD-108). Bài giải thích của cung (trừ cung quà): khoá, nằm trong tấm xem thử. |
| Cả 12 cung | `<details>` "Xem cả 12 cung": 12 thanh ngang xếp theo điểm, có đường mốc 50 "khởi điểm", chữ kèm số. Thay `fd109-score-list` (`:265`). |

### D2. Q8 — "Đường đời 10 năm" (dải đại vận)

**Cách tính (V1, không cần công thức mới):** điểm một chặng = điểm cấu trúc của **cung mà chặng đó đi qua** (đã là số liệu được duyệt FD-111). Lý do hợp lý: công thức đã cộng **một phần ba điểm cung đối và hai cung tam hợp**, tức đúng "tam phương tứ chính" mà người xem Tử Vi dùng khi đọc đại vận. [ĐÃ KIỂM CHỨNG: `structural-palace-score.ts:119-122`]

**Giới hạn phải ghi rõ trong hộp giải thích:** đây là sức nâng đỡ của **bộ sao của cung** chặng đó, **không** phải điểm may rủi của 10 năm, **không** vẽ đường theo từng năm (FD-063 vẫn cấm). V2 (sau này, cần FD mới): thêm tứ hoá đại vận. Dùng **cột rời rạc**, không nối đường cong.

**Dữ liệu cần:**
- Điểm 12 cung: đã có phía trang (`model.palaces`).
- Danh sách chặng: **chưa ra trang miễn phí.** Trang chỉ nhận chặng hiện tại: `ZiweiHoroscopeResultV1.decadal` (`ziwei-horoscope-v1.ts:76`). Thư viện iztro có đủ danh sách (`astrolabe.decadalList()` được dùng ở `iztro-horoscope.ts:406`) và kho báo cáo đã có `decadal.cycles` tối đa 12 chặng (`report-chart-snapshot-v1.ts:48-52`, `report-chart-snapshot.ts:44-62`). **Đề nghị An** thêm `decadalCycles[]` vào kết quả horoscope. [SUY LUẬN: số lượng 12 chặng theo lược đồ báo cáo.] Lưu ý `deriveDecadalCycles` trả về rỗng khi chặng đầu hoặc thứ 7 (chiều thuận nghịch mơ hồ) nên **dùng `decadalList()` của iztro, đừng dùng hàm suy ra**.

```
DESKTOP 1440 — cột đọc ~740px, nằm trong khung hai lớp viền, nền sơn mài, 4 hoa văn góc
┌ ĐƯỜNG ĐỜI 10 NĂM ──────────────────────  [ Điểm này tính thế nào? ] ┐
│ Độ mạnh cấu trúc của cung ở mỗi chặng (không phải điểm may rủi)     │
│ 100 ┤                                                                │
│  71 ┤  ▓▓                                                            │
│  50 ┤ ┄┄┄┄┄ ┄┄┄┄┄ ┄┄┄┄┄ ┄┄┄┄┄ ┄┄┄┄┄ ┄┄┄┄┄  <- vạch "khởi điểm 50"    │
│     │  ▓▓   ░░    ▓▓▓                                  ░░          │
│     │  ▓▓   ░░    ▓▓▓   ▒▒    ▓▓    ▒▒    ▓▓           ░░          │
│     └──────────────────────────────────────────────────────────────  │
│      5-14  15-24  25-34  35-44  45-54  55-64  65-74  75-84  85-94   │
│      Mệnh  P.Mẫu  P.Thê  H.Đệ   ...                                 │
│      1997  2007   2017   2027                                        │
│                    ◉ dấu triện đỏ + "ĐANG Ở ĐÂY" (chặng hiện tại)    │
│ ┌ Chặng 25–34 tuổi (2017–2026) · cung Phu Thê (Dần) ───────────────┐ │
│ │ [vòng 67] Bộ sao thiên về hỗ trợ · Phá Quân, Hóa Lộc             │ │
│ │ Cách tính: 50 + sao trong cung +8 + cung chiếu +9 ≈ 67           │ │
│ │ Đọc thử (2 câu, mờ) ... [Xem thử chặng này ›]                    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

MOBILE 390 — danh sách thanh ngang xếp dọc (không cuộn ngang)
┌ ĐƯỜNG ĐỜI 10 NĂM ──────────────┐
│ 5–14   Mệnh     ▓▓▓▓▓▓▓▓░ 71   │   mỗi hàng cao ≥ 56px, bấm được
│ 15–24  Phụ Mẫu  ▓▓▓▓░░░░░ 45   │   quá khứ: mờ 55%
│ ◉ 25–34 Phu Thê ▓▓▓▓▓▓░░░ 67   │   <- hiện tại: viền vàng, dấu triện, nhãn "ĐANG Ở ĐÂY"
│ 35–44  Huynh Đệ ▓▓▓▓░░░░░ 48   │
│ ...                            │
└────────────────────────────────┘
(bấm hàng → thẻ chi tiết mở ngay dưới hàng, hoặc tấm xem thử nếu cung bị khoá)
```

| Khía cạnh | Quy định |
|---|---|
| Chọn hiển thị | Các chặng bắt đầu ≤ 95 tuổi (thường 9–10 cột). Chặng đã qua mờ 55% nhưng vẫn bấm được. |
| Chặng hiện tại | Cột rộng hơn 12%, viền vàng, **dấu triện đỏ có sẵn** (`dau-trien-la-so-viet-son-do.webp`) đặt trên đầu, nhãn chữ "ĐANG Ở ĐÂY". Mở trang là chặng này được chọn sẵn. |
| Nền | Texture sơn mài có sẵn (`nen-la-so-son-mai-lien-mach-lasoviet.webp`, ô lặp 300px, đã dùng ở `troi-nam.css:830-835`), phủ tối. Bốn hoa văn góc (ảnh F1). |
| Hộp giải thích | `ReportScoreExplainer` có sẵn (`report-chart-visuals.tsx:427-442`) + một đoạn về chặng. **Ví dụ tính ghi số thật của lá số.** Lưu ý: phần `parts` được làm tròn riêng nên cộng lại có thể lệch 1 so với điểm cuối (`structural-palace-score.ts:123-132`). Hiển thị "≈" hoặc chia phần dư để cộng đúng. [ĐÃ KIỂM CHỨNG cách tính] |
| Chuyển động | Cột mọc lên bằng `transform: scaleY` (hàng ngang thì `scaleX`) 700ms, lệch 60ms, một lần. Giảm chuyển động: hiện tĩnh. |
| Trợ năng | `<ol>` các `<button aria-pressed>`; mũi tên trái/phải di chuyển giữa cột; tên đọc: "Chặng 25 đến 34 tuổi, 2017 đến 2026, cung Phu Thê, 67 trên 100, bộ sao thiên về hỗ trợ, đang ở chặng này". Có bảng số ẩn cho trình đọc màn hình. Cột rộng ≥ 64px. |
| Miễn phí / khoá | Cột, điểm, cung, tuổi, năm: miễn phí. Luận giải chặng: khoá. Chặng hiện tại có 2 câu đọc thử (`model.periodTeaser`, `ziwei-free-result-model.ts:140-146`). Các chặng khác: tấm xem thử của **cung** đó (bán Một cung 120 Lá). |
| Cần FD | Ghi FD-117: nới FD-063 cho dải đại vận theo công thức = điểm cung chặng; ghi rõ giới hạn trên. |
| Nhất quán với báo cáo trả phí | Bản đọc trả phí có `ReportDecadalTimeline` **không điểm** (`report-chart-visuals.tsx:444-536`, FD-104). Sau này đồng bộ để khách không thấy hai kiểu khác nhau. |

### D3. Tab "Năm nay": lưu niên + 12 lưu nguyệt + hôm nay

**Hiện trạng [ĐÃ KIỂM CHỨNG]:** `FreeResultModel.annual` chỉ có 3 con số (`ziwei-free-result-model.ts:149-152`), trang vẽ 3 số to (`ziwei-free-result.tsx:289-293`, ảnh 6: "1 tháng cần chú ý, 1 tháng thuận, 10 trung tính"). Động cơ đã tính **từng tháng** (`iztro-horoscope.ts:196-313`; mỗi tháng: `monthIndex`, `marker`, cung, can chi). Bản cũ `ziwei-annual-tab.tsx:54-77` có lưới 12 ô tháng nhưng chỉ dùng ở trang mẫu (`ZiweiResultTabs`), không dùng ở trang thật.

**Dữ liệu động cơ trả cho tháng cần chú ý khi chưa mở khoá:** số tháng bị thay bằng "?", chữ chuẩn bị bị bỏ (`iztro-horoscope.ts:297-312`). Giữ nguyên ý đó.

```
DESKTOP / MOBILE (cùng cấu trúc; mobile xếp 6 x 2)
┌ NĂM 2026 · BÍNH NGỌ ──────────────────────────────────────────────┐
│ Chặng 25–34 tuổi · cung Phu Thê  ──▶  Năm 2026 vào cung Phúc Đức   │  <- dải hai lớp
│ Năm nay có 1 tháng cần chú ý và 1 tháng thuận.                    │  <- yearly.summary (miễn phí)
│  T1   T2   T3   T4   T5   T6                                      │
│  ○    ◆    ○    ○    ○    ○     ◆ thuận   ○ trung tính   ⚿ cần chú ý│
│  T7   T8   T9   T10  T11  T12                                     │
│  ⚿?   ○    ○    ○    ○    ○     (bấm ô → tấm: cung, can chi tháng) │
│ ┌ Luận năm 2026 + đại vận (đoạn cắt giữa câu, mờ) ────────────────┐│
│ │ ... [Xem thử ›]                                                 ││
│ └─────────────────────────────────────────────────────────────────┘│
│ HÔM NAY · Giáp Dần · chạm cung Tử Tức   [Xem thử ›]                │
└────────────────────────────────────────────────────────────────────┘
```

| Khía cạnh | Quy định |
|---|---|
| Ô tháng | Ô 56x56 (mobile 6 cột, mỗi ô ≥ 48px), nhãn "T7", ký hiệu hình học ◆ / ○ / ⚿ + màu vàng / ngà / son. **Không chỉ dựa vào màu.** Chú giải luôn hiện. |
| Bấm ô | Mở tấm: cung của tháng đó, can chi, thuận/trung tính/cần chú ý, chip "Căn cứ" (khoá: nội dung chuẩn bị). **Không dùng câu chuẩn bị mẫu** của động cơ cho tháng trung tính/thuận vì **giống nhau cho mọi lá số** (`iztro-horoscope.ts:253,292`), đúng điểm yếu của AiTuvi. Chỉ hiện sự kiện riêng của lá số. |
| Dải hai lớp | Lấy `horoscope.decadal` + `yearly.annualPalaceName`. Đồng thời bật lớp phủ trên lá số (B3-1). |
| Hôm nay | `horoscope.daily` (ngày, cung bị chạm). Nút mở tấm xem thử cho `ZIWEI-TODAY-P0` (60 Lá, đang bán). **Không dùng** `daily.headline` hiện tại vì kết bằng "Mở mỗi sáng trong gói Hội viên" (`iztro-horoscope.ts:387`) mà gói Hội viên đang bị ẩn (Q1). |
| Chuyển động | Ô tháng hiện dần lệch 40ms một lần. Ô được chọn có vòng sáng 420ms (đã có kiểu `tn-cell-select`, `troi-nam.css:798-808`). |
| Trợ năng | `<ol>` 12 mục; mỗi nút: "Tháng 7, cần chú ý, bấm để xem thử". Ô cần chú ý có ký hiệu khoá, không chỉ màu son. |
| Miễn phí / khoá | Miễn phí: cung lưu niên, tuổi âm, tóm tắt năm, đánh dấu từng tháng (xem lựa chọn ở Phần H), ngày hôm nay (một dòng). Khoá: luận năm, luận từng tháng, hôm nay đầy đủ. |
| Năm trong chặng (V2, chưa làm) | Dải 10 chấm "10 năm của chặng này" ghi cung lưu niên từng năm. Cung = cung có cùng địa chi với năm (suy ra đơn giản) [SUY LUẬN: nên để An xác nhận khớp `yearly.index` của iztro]. Chưa có điểm từng năm (cần FD mới). |

### D4. Tab "12 cung" (bản đồ cung)

**Hiện trạng [ĐÃ KIỂM CHỨNG]:** 11 hàng chữ, mỗi hàng là nút có chip "Chưa mở" (`ziwei-free-result.tsx:301-305`), CSS chỉ có đường kẻ dưới và cỡ chữ (`free-result-read-first.css:22-25`), **không có hover, không có nhấn, không có mũi tên**.

```
DESKTOP 1440 (lưới 2 cột x 6)                MOBILE 390 (1 cột)
┌────────────────────┬────────────────────┐   ┌─────────────────────────────┐
│ [icon] Phu Thê  67 │ [icon] Tài Bạch 53 │   │ [icon] Phu Thê    ◔67       │
│ Phá Quân · Dần     │ Tử Vi · Tý         │   │ Bộ sao thiên về hỗ trợ      │
│ ▓▓▓▓▓▓░░░ thiên hỗ │ ▓▓▓▓▓░░░░ cân bằng │   │ Phá Quân · Dần   [Xem thử ›]│
│        [Xem thử ›] │        [Xem thử ›]  │   └─────────────────────────────┘
└────────────────────┴────────────────────┘
Lọc: ( Theo thứ tự cung | Theo độ mạnh )   <- hai chip chọn, có trạng thái đang chọn
```
- Thứ tự mặc định: Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di, Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ.
- Cung đã tặng đọc trọn: dấu tích ✓ "Đã đọc đầy đủ", bấm cuộn tới bài quà.
- Cả thẻ là nút; nhãn rõ "Xem thử ›" (không còn "Chưa mở" như một con tem chết).
- Chọn một thẻ làm nổi cung đó trên lá số (desktop dính cột trái). Mobile: lá số không dính; tấm xem thử đã có tên cung nên không cần.
- Dữ liệu: `model.palaces` (`ziwei-free-result-model.ts:93-105`). Biểu tượng: 12 ảnh `icon/cung`.

### D5. Xem lá số lớn hơn (sửa lỗi U4)

**Nguyên nhân bị cắt [ĐÃ KIỂM CHỨNG]:** hộp phóng to đặt bảng 12 cung rộng tối thiểu 720px (`free-result-read-first.css:32`) vào khung cuộn có chiều rộng bằng màn hình điện thoại/tablet, nên cột phải bị cuộn khuất (ảnh 7); đồng thời bên dưới bảng còn kéo theo cả khung "Chi tiết cung" (`ZiweiChart` vẽ cả bảng và khung chi tiết, `ziwei-chart.tsx:79-252`).

**Thiết kế mới:**
- Toàn màn hình, nền tối. Lá số **tự co vừa chiều ngang** (CSS transform scale theo chiều rộng khung), không cuộn khuất.
- Điều khiển: nút `＋`, `－`, `Vừa khung` (đều ≥ 44px), chụm hai ngón/kéo để dời; phím `+ - 0` và phím mũi tên trên desktop; `touch-action: pinch-zoom pan-x pan-y`.
- Chi tiết cung chọn nằm **ngăn kéo dưới** (mobile) hoặc **cột phải** (desktop 1100px), không đè lên lá số.
- Nút Đóng góc trên, Esc, bấm nền, nút Back đều đóng và trả focus về nút "Xem lá số lớn hơn".
- Dùng đúng giao diện lá số đã duyệt: sơn mài, la kinh giữa, dấu triện (xem `troi-nam.css:830-880`; trang miễn phí hiện chưa dùng, đó là lỗi U1 của GĐ2).
- Hai nút bật "Hiện đại vận" / "Hiện lưu niên" có mặt ở cả chế độ lớn.

### D6. Chip / tấm "Căn cứ" (thay tab Căn cứ, Q2)

**Hiện trạng [ĐÃ KIỂM CHỨNG]:** tab Căn cứ có 3 thẻ, mỗi thẻ một nút "Xem căn cứ" (`ziwei-free-result.tsx:323-341`); chỉ có 3 tài liệu căn cứ (mệnh, thân, tứ hoá: `ziwei-tabs-state.ts:49-61`). Bài tổng quan **không** gắn căn cứ theo từng đoạn (lược đồ `free-structural-overview-v1.ts:4-9` chỉ có `id`, `title`, `paragraphs`).

```
Đoạn văn ......................................... [Căn cứ · 2 sao]   <- chip nhỏ cuối đoạn
                                                          │ bấm
                        ┌ Căn cứ của nhận định này ─────────────────┐
                        │ ① Phá Quân (Đắc) ở Cung Phu Thê, Dần      │
                        │ ② Hóa Lộc tại Phá Quân                    │
                        │ [Xem trên lá số]  <- làm nổi 2 cung, đóng tấm │
                        └────────────────────────────────────────────┘
```
- Chip cao nhìn 28px nhưng vùng bấm ≥ 44x44 bằng đệm (kỹ thuật đã dùng ở `free-result-read-first.css:95`).
- Nút có `aria-haspopup="dialog"` và nhãn "Căn cứ: Phá Quân ở Phu Thê, Hóa Lộc".
- Dữ liệu: bài quà đã có sự kiện đánh số (`FreeResultGift.facts`, `ziwei-free-result-model.ts:23-33`). Bài tổng quan: tạm suy ra theo cung/sao của từng mục (**[SUY LUẬN]** kiểm lại quy ước `section.id`). Đề nghị An thêm `evidence: { palaceIds, starIds }` vào từng mục (GĐ3).
- Tab Căn cứ cũ: giữ đường dẫn `?tab=evidence` chuyển về Tổng quan (bảng chuyển tên tab cũ đã có trong rủi ro của `phase-04`).

---

## PHẦN E. Q10 — Kiểm tra mọi nút bấm

### E1. "Bấm thẻ không phản hồi" đến từ đâu (nguyên nhân gốc)

| # | Nguyên nhân | Bằng chứng | Mức |
|---|---|---|---|
| N1 | **Trang chọn luận giải: thẻ không phải nút.** Thẻ là `<article>` không có `onClick`; chỉ nút nhỏ "Chọn phần này" mới đổi lựa chọn. | `offer-ladder.tsx:79` (article) và `:89` (nút); ảnh 4 [ĐÃ KIỂM CHỨNG] | Chính |
| N2 | **Giao diện thẻ có con trỏ tay + hover + viền chọn nằm ở nhóm thẻ CŨ** (`.offer-card`) mà trang luận giải không còn dùng: `paid-topic-selector-client.tsx:287` chỉ dựng nhóm thẻ cũ khi **không** có `readingContent`, trong khi `chon-luan-giai/page.tsx:103` luôn truyền `readingContent` là `OfferLadder`. Thẻ mới `.offer-ladder-cards article` không có cursor, hover, active. | `pricing-and-topup.css:108-138` so với `contextual-unlock.css:12` [ĐÃ KIỂM CHỨNG] | Chính |
| N3 | **Trạng thái "đã chọn" quá nhạt**: chỉ đổi màu viền nút thành vàng (`contextual-unlock.css:21`). Thẻ Trọn đời vốn đã viền vàng (`:13`) nên chọn hay không trông như nhau. | [ĐÃ KIỂM CHỨNG] | Chính |
| N4 | **Dòng "đang chọn + nút Mở" nằm cuối trang**, sau cả 8 thẻ (khoảng 1.500px trên điện thoại). Bấm "Chọn phần này" ở thẻ đầu thì phản hồi nằm ngoài màn hình. | `offer-ladder.tsx:93-100`, ảnh 4 | Chính |
| N5 | **Không có trạng thái nhấn (`:active`) ở bất cứ đâu** trong bộ CSS của hai trang này. Toàn bộ dự án chỉ có 3 chỗ dùng `:active` (`homepage-v3.css:129`, `ui-core.css:512`, `troi-nam.css:1168`). | tìm trong `apps/web/src/styles` [ĐÃ KIỂM CHỨNG] | Phụ |
| N6 | **Nút bị khoá trông như nút bấm được.** Lớp `.button` không có `:disabled`; `.button-primary` và `.button-disabled` không có luật CSS nào. "Sắp ra mắt" hiện nền vàng đầy (ảnh 2). | `global.css:58-60`; tìm toàn bộ `styles/` không có `button-disabled` [ĐÃ KIỂM CHỨNG] | Chính |
| N7 | **Trang lá số: bấm hàng "Chưa mở" phải đi qua máy chủ rồi mới mở tấm.** `navigate()` gọi `router.push` đổi địa chỉ (`ziwei-free-result.tsx:181-192`); trạng thái tấm lấy từ `initialState` (`:74-79`) do **máy chủ** tính; trang là `force-dynamic` (`page.tsx:30`) và mỗi lần đổi địa chỉ lại chạy lại toàn bộ bộ nạp (lá số, horoscope, quà, `page.tsx:57-88`). Không có `loading.tsx` (thư mục chỉ có `page.tsx`, `chon-luan-giai`) nên không có dấu hiệu đang tải. Độ trễ thật chưa đo [SUY LUẬN]. | [ĐÃ KIỂM CHỨNG cấu trúc] | Chính |
| N8 | Hàng "Chưa mở" **không có dấu hiệu bấm được** (không mũi tên, không hover, "Chưa mở" là con tem). | `free-result-read-first.css:22-25`, `ziwei-free-result.tsx:304` | Chính |
| N9 | Trạng thái tải trong tấm mở khoá chỉ là dấu "…" (`wallet-unlock-dialog.tsx:323`). | [ĐÃ KIỂM CHỨNG] | Phụ |

**Cách sửa N7 (Next 16 đã hỗ trợ):** dùng trạng thái cục bộ cho tab và tấm, rồi đồng bộ địa chỉ bằng `window.history.pushState`; theo tài liệu đi kèm gói `next`, lệnh này tích hợp với `useSearchParams` mà **không** gọi máy chủ (`apps/web/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md:343-349`). Máy chủ chỉ chuẩn hoá địa chỉ ở lần tải đầu. Đọc kỹ `AGENTS.md` của `apps/web` trước khi sửa. Nếu vẫn dùng `router.push`, bắt buộc có trạng thái "đang mở" tức thì (`useTransition` + nút `aria-busy`).

### E2. Danh sách MỌI điều khiển trên trang lá số miễn phí (`/la-so/{chartId}`)

Cột "Xử lý": có hàm bấm thật hay không. "Trạng thái": có đủ hover / nhấn / focus / chọn / khoá / đang tải hay không.

| # | Điều khiển | Vị trí | Xử lý | Hover | Nhấn | Focus | Chọn | Khoá | Tải | Cần sửa |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| 1 | 6 nút tab (chỉ ≥1024px) | `ziwei-free-result.tsx:226-230` | Có (`navigate`) | Không | Không | Có (`:15`) | Có (`:62`) | - | **Không** (N7) | Hover, nhấn, tải |
| 2 | Nút "Xem lá số lớn hơn" | `:234-235` | Có (mở hộp) | Không | Không | Có | - | - | - | Hover, nhấn; thiết kế lại (D5) |
| 3 | 12 ô cung trên lá số | `ziwei-palace.tsx:61-71` | Có (`onSelect`) | Có (`global.css:960`) | Không | Có | Có (`is-selected`) | - | - | Nhấn; bố cục bên trong nút có `<h3>` và `<div>` (không hợp lệ HTML trong `<button>`) [SUY LUẬN, xem `ziwei-palace.tsx:61-139`] |
| 4 | Hàng "12 cung" x11 | `:301-305` | Có | Không | Không | Có | - | - | **Không** (N7) | Cả bộ trạng thái (D4) |
| 5 | Hàng "Chủ đề" x2 | `:309-314` | Có | Không | Không | Có | - | - | **Không** | Như trên |
| 6 | Nút "Xem phần đọc sâu" (đoạn năm/đại vận) | `secure-locked-preview.tsx:117-125` → `ziwei-free-result.tsx:296` | Có (mở tấm) | `.button:hover` sáng 8% | Không | Có | - | - | - | Nhấn, tải, đổi chữ rõ "Xem thử" |
| 7 | 3 nút căn cứ (EvidenceDrawer) tab Tổng quan | `:254` | Có (chuyển tab) | - | - | - | - | Có (`disabled={loading}`, `evidence-drawer.tsx:147`) | Có | Bỏ cùng tab Căn cứ (Q2) |
| 8 | 3 nút căn cứ trong tab Căn cứ | `:334-336` | Có | - | - | - | - | - | - | Bỏ (Q2) |
| 9 | "Điểm này tính thế nào?" x5 (`<details>`) | `:242,266,271,283,361` | Có (gốc trình duyệt) | Không | Không | Có | Có (mở/đóng) | - | - | Hiện 5 bản trùng; chỉ giữ 1 ở mỗi khối cần |
| 10 | 3 nút chấm "Đúng / Một phần / Không đúng" + nút hoàn Lá | `part-feedback.tsx:89-94` | Có | Không | Không | Có | Có (`aria-pressed`) | Có (`disabled`, `global.css:1232`) | Có (`:96`) | Vùng bấm, nhấn |
| 11 | Liên kết "Lưu lá số" | `:257` | Có (`Link`) | `.button-secondary:hover` | Không | Có | - | - | - | Nhấn |
| 12 | Liên kết số căn cứ `<a>` trong bài quà | `free-palace-gift-block.tsx:15` | Có (neo `#fd109-gift-fact-n`) | Không | Không | Có | Có (`:target` `:99`) | - | - | Hover |
| 13 | `<details>` căn cứ của bài quà | `:56-63` | Có | Không | Không | Có | Có | - | - | - |
| 14 | Liên kết "Chọn luận giải" (khối đọc xong) | `:321` | Có | `.button:hover` | Không | Có | - | - | - | Nhấn |
| 15 | Thanh dính "Chọn luận giải" (mobile, hiện sau khi đọc) | `:344-346` | Có | - | Không | Có | - | `hidden` đến khi đọc | - | Nhấn |
| 16 | Hộp xem thử: nút Đóng, bấm nền, Esc | `:347-352` | Có | Không | Không | Có (`autoFocus`) | - | - | - | Nút Đóng 44px: đạt; thêm nhấn |
| 17 | `ContextualUnlock`: nút mở một cung / nút Trọn đời / "Xem tất cả gói" / Thử lại | `contextual-unlock.tsx:84-97` | Có | `.button:hover` | Không | Có | - | Có (`disabled`, nhưng trông như bật, N6) | Có chữ "đang tải" (`:94`) | **Khoá rõ ràng**, nhấn |
| 18 | Biên nhận sau mở: "Đọc luận giải / Xem tiến trình / Thử lại" | `contextual-unlock.tsx:55-63` | Có | `.button:hover` | Không | Có (focus vào hộp) | - | - | Có (hỏi lại mỗi 15 giây, `:47-53`) | Nhấn |
| 19 | Tấm xác nhận: Huỷ / Mở / Thử lại | `wallet-unlock-dialog.tsx:344-392` | Có | `.button:hover` | Không | Có | - | Có (`disabled` khi đang xử lý, nhưng trông như bật) | Chữ "Đang..." (`labels.confirming`) | Khoá, tải bằng vòng xoay, nhấn |
| 20 | Nạp Lá trong tấm | `wallet-unlock-dialog.tsx:402-416`, `inline-topup.tsx` | Có | - | - | - | - | - | Có (`busy`) | Rà riêng ở LSV-77 (chưa bật SePay) |
| 21 | Chân trang: "Đăng nhập để lưu", "Xoá dữ liệu lá số" (2 bước) | `page.tsx:132-175`; `anonymous-data-deletion-control.tsx:36-80` | Có | `.button-secondary:hover` | Không | Có | - | - | Có (`pending`) | Thu thành dòng liên kết (U8); giữ xác nhận 2 bước |
| 22 | Header dùng chung | `SiteHeader` | Có | Có | - | - | - | - | - | FD-100 giữ nguyên |

Tổng: **22 nhóm điều khiển, 0 nhóm nào có trạng thái nhấn (`:active`)**; 9 nhóm (hàng 1, 2, 4, 5, 9, 10, 12, 13, 16) không có hover; 3 nhóm không có dấu hiệu đang tải khi đổi địa chỉ (hàng 1, 4, 5).

### E3. Danh sách MỌI điều khiển trên trang chọn luận giải (`/la-so/{chartId}/chon-luan-giai`)

| # | Điều khiển | Vị trí | Xử lý | Trạng thái còn thiếu | Cần sửa |
|---|---|---|---|---|---|
| 1 | 3 tab "Luận giải / Hội viên / Nạp Lá" | `paid-topic-selector-client.tsx:262-283` | Có (`selectTab`, mũi tên trái/phải) | Hover đã có (`pricing-and-topup.css:76`), chọn đã có (`:80`); thiếu nhấn | Ẩn tab Hội viên khi gói còn giữ (Q1) |
| 2 | Nút "Chọn phần này" x7 | `offer-ladder.tsx:89` | Có (`select`) | Chọn chỉ đổi màu viền (N3); không hover/nhấn | Bỏ: thay bằng nút "Mở – N Lá →" ngay trên thẻ |
| 3 | 12 nút chọn cung | `palace-picker.tsx:14-18` | Có (`onSelect`, `aria-pressed`) | Hover/nhấn không; chọn chỉ đổi viền | Chip chọn có dấu ✓ + nền |
| 4 | Nút "Mở luận giải – N Lá" (dưới cùng) | `offer-ladder.tsx:98` | Có (mở tấm) | Khoá trông như bật (N6) | Chuyển lên từng thẻ; bỏ nút gộp |
| 5 | Thẻ "Sắp mở" (4/8 thẻ) | `offer-ladder.tsx:87-88` | **Không có nút**, chỉ chữ | Trông gần như thẻ bán được (P4) | **Ẩn** (Q1) |
| 6 | Nút Thử lại khi lỗi báo giá | `:75` | Có | Nhấn | - |
| 7 | Liên kết "Xem bản mẫu" x2 | `:99`, `paid-topic-selector-client.tsx:251` | Có | - | Giữ một |
| 8 | Liên kết "Xem lại lá số" | `:247` | Có | - | - |
| 9 | 4 thẻ gói nạp Lá + nút "Nạp 99.000đ" | `:517-543`, `:708-728` | Có (`selectPack`, form) | Hover/chọn có (`pricing-and-topup.css:284-293`); thiếu nhấn | - |
| 10 | Nút cố định cuối trang (thanh thanh toán) | `:622-737` | Có | Nút khoá "Sắp ra mắt" trông như bật (ảnh 2, N6) | Ẩn cùng tab Hội viên |
| 11 | Nút mua gói hội viên + liên kết đăng nhập (`MembershipPanel`) | `membership-panel.tsx:30-33` | Có khi có gói | Chữ "Đăng nhập để xem hội viên" lặp 2 lần (`:30,32`, ảnh 2) | Ẩn tab |
| 12 | FAQ (`<details>`) | `:590-597` | Có | Hover/nhấn không | - |
| 13 | Thẻ hỗ trợ "Gửi email hỗ trợ" | `SupportCard` | Có | - | - |
| 14 | Nhóm thẻ cũ `.offer-card` (nút radio tròn, `WalletUnlockButton`) | `paid-topic-selector-client.tsx:287-465` | Có | **Mã chết** trên trang này (chỉ chạy khi không truyền `readingContent`) | Xoá sau khi thẻ mới xong |

### E4. Quy định trạng thái bắt buộc cho mọi nút (để "bấm được có chủ đích")

**Quy tắc chung:** vùng bấm ≥ 44x44, khoảng cách giữa hai vùng bấm ≥ 8px, `touch-action: manipulation` (bỏ trễ 300ms), tiếng Việt rõ động từ ("Xem thử", "Mở", "Đóng").

| Loại | Hover (chỉ máy có chuột) | Nhấn (`:active`) | Focus bàn phím | Đã chọn | Bị khoá | Đang tải |
|---|---|---|---|---|---|---|
| **Nút chính viên** | sáng 8%, vòng mũi tên dịch chéo 4px | thu nhỏ 0,98 trong 120ms | vòng `--focus-ring` 3px vàng, cách 3px | - | Nền tối, **viền đứt**, chữ ngà mờ, kèm dòng lý do ngay dưới ("Cần X Lá nữa"), `aria-disabled` | Chữ đổi "Đang mở…", vòng xoay thay mũi tên, `aria-busy`, chặn bấm đúp |
| **Nút phụ (viền)** | chữ vàng, viền vàng | thu nhỏ 0,98 | như trên | - | như trên | như trên |
| **Hàng / thẻ bấm được** (hàng khoá, thẻ cung) | nền nhấc lên 4%, viền vàng, mũi tên `›` dịch 3px | thu nhỏ 0,99, nền sáng thêm | như trên (vòng bao cả hàng) | - | - | Hàng hiện vòng xoay nhỏ ở bên phải tới khi tấm mở |
| **Thẻ chọn gói** | nâng 2px, viền vàng | thu 0,99 | như trên | Hai lớp viền vàng + dấu ✓ + chữ "Đã chọn" (**không** chỉ đổi màu viền) | Không hiện thẻ không bán được (Q1) | - |
| **Chip chọn (cung, lọc)** | viền vàng | thu 0,97 | như trên | Nền vàng nhạt + ✓ + `aria-pressed` | - | - |
| **Chip "Căn cứ"** | gạch chân vàng | thu 0,97 | như trên | - | - | - |
| **Ô trên biểu đồ (cột, ô tháng, ô cung)** | nhấc 2px + hiện chú thích | thu 0,98 | vòng focus bao ô | Viền vàng + nhãn, **cột hiện tại có dấu triện** | Ô khoá có ký hiệu ⚿ | - |
| **Nút đóng tấm** | nền ngà 8% | thu 0,95 | vòng focus | - | - | - |

**Cách làm một lần cho cả site (FRONTEND):** thêm vào `global.css` (ngay sau `:58-60`) các luật `.button:hover` (chỉ trong `@media (hover:hover)`), `.button:active`, `.button:focus-visible`, `.button:disabled, .button[aria-disabled="true"]`, `.button[aria-busy="true"]`; dùng token `--motion-feedback`. Thêm tiện ích "thẻ mở rộng vùng bấm" (kỹ thuật liên kết kéo giãn: `::after { position:absolute; inset:0 }` trên nút chính của thẻ; một điều khiển duy nhất nhận tab, cả thẻ bấm được).
Với thẻ "Một cung" có chip chọn cung bên trong, chỉ kéo giãn vùng phần đầu thẻ, **không** phủ lên các chip.

### E5. Thiết kế lại thẻ ở trang chọn luận giải (một bước, không "chọn rồi mới mua")

| Phương án | Ưu | Nhược | Chọn? |
|---|---|---|---|
| Giữ hai bước (Chọn → nút cuối trang) | Ít sửa | Chính là nguyên nhân N1-N4 | Không |
| **Một bước: nút "Mở – N Lá →" ngay trên thẻ mở thẳng tấm xác nhận** | Một chạm; phản hồi ngay trước mắt; tấm xác nhận vẫn chặn mua nhầm | Phải đảm bảo một lần bấm một lần trừ (đã có test e2e) | **Chọn** (khớp phase-05: "nút riêng trên thẻ, bỏ nút trùng ở dưới") |

- Thẻ "Một cung": chọn sẵn cung theo `?palace=` hoặc cung khách vừa bấm; chip chọn cung hiện ✓; nút ghi "Mở Cung Phu Thê – 120 Lá →".
- Thẻ được làm nổi theo ý định (`?offer=`): hai lớp viền vàng + nhãn "Hợp với câu bạn vừa hỏi".
- Giá chỉ bằng Lá. Quy đổi tiền đồng chỉ ở bước xác nhận cuối trong tấm (Q6).

---

## PHẦN F. Brief ảnh cho ChatGPT

### F0. Đã có sẵn, KHÔNG cần làm mới

| Cần | Dùng ảnh có sẵn | Đường dẫn |
|---|---|---|
| Biểu tượng 12 cung | 12 ảnh nét vàng vẽ tay | `apps/web/public/images/troi-nam/icon/cung/{menh,phu-mau,phuc-duc,dien-trach,quan-loc,no-boc,thien-di,tat-ach,tai-bach,tu-tuc,phu-the,huynh-de}.webp` |
| Biểu tượng "Năm nay", "Lịch âm", "Lá số lưu" | có | `.../icon/hanh-trinh/{nam-nay,lich-am,luu-la-so}.webp` |
| Dấu triện đỏ (mốc "ĐANG Ở ĐÂY") | có | `apps/web/public/images/lasoviet/dau-trien-la-so-viet-son-do.webp` (480x480) |
| Hoa văn la kinh giữa lá số | có | `.../hoa-van-la-kinh-trung-tam-la-so-lasoviet.svg` |
| Nền sơn mài liền mạch | có | `.../nen-la-so-son-mai-lien-mach-lasoviet.webp` (1024x1024, lặp 300px) |
| Nền giấy cổ liền mạch (tấm xem thử sáng) | có | `.../nen-la-so-giay-co-lien-mach-lasoviet.webp` |
| Icon giao diện (khoá, mũi tên, check, thông tin...) | bộ SVG 100+ | `apps/web/public/icons/lasoviet/v1/ui-*.svg` |
| Icon tab (Tổng quan, Năm nay, 12 cung, Chủ đề) | `chart-palaces`, `annual-cycle`, `related-palaces`, `topic-select` | `icons/lasoviet/v1/*-lasoviet-{gold,ink,mono}.svg` |
| Icon tab Đại vận | **thiếu** trong bộ SVG | Claude vẽ SVG theo `prototype/revamp-2026-09/build-icons.py`, không cần ChatGPT |

### F1. Ảnh BẮT BUỘC 1: Hoa văn góc khung

| Mục | Nội dung |
|---|---|
| Mục đích | Bốn góc khung "Đường đời 10 năm", hộp phóng to lá số, tấm xem thử, khối "Bạn đã đọc xong phần miễn phí". Một ảnh xoay bốn hướng. |
| Tên file đặt | `goc-trang-tri-hoa-van-khung-vang-lasoviet.webp` |
| Kích thước | 1024x1024, vuông, hoa văn nằm sát góc **trên trái**, phần còn lại để trống |
| Nền | **Nền đen tuyền #000000, nét trắng tinh #FFFFFF**, không xám, không bóng. (ChatGPT thường không xuất được nền trong suốt thật; Claude sẽ đổi độ sáng thành kênh trong suốt rồi tô vàng bằng CSS.) |
| Màu sau khi tô | vàng `#C9A44D` → `#F2DCA0` (bản tối), mực `#14263D` (bản sáng) |
| Phong cách | Nét mảnh đều như khắc trên sơn mài, hoa văn dạng sóng cuộn và vòng cung tối giản, đối xứng chéo, **cùng họ** với hoa văn la kinh `hoa-van-la-kinh-trung-tam-la-so-lasoviet.svg` và vòng 12 phân (`images/troi-nam/hoa-tiet/vong-12-phan-net-vang-trang-chu.webp`) |
| Tránh | Chữ, chữ Hán/Nôm, mặt người, rồng phượng, hoa sen to, hạt/ngọc, bóng đổ, ánh sáng loé, nền họa tiết, cung hoàng đạo phương Tây, màu bất kỳ ngoài trắng/đen, nét quá rườm rà (phải nhận ra rõ khi thu nhỏ 48px) |

**Prompt (tiếng Anh, dán nguyên):**
```
A single corner ornament for a luxury lacquer frame, drawn in the top-left corner of a square canvas. Thin, even-weight line art as if engraved into black lacquer: a restrained scroll of two interlocking curves ending in small spiral hooks, one short parallel inner line following the corner, a tiny lozenge at the tip. Elegant, minimal, symmetrical along the diagonal, inspired by Vietnamese lacquer and Dong Son bronze-drum linework. Pure white lines (#FFFFFF) on a pure flat black background (#000000). No gradients, no shading, no glow, no texture, no shadow, no text, no letters, no characters, no faces, no animals, no flowers, no Western zodiac. Must stay readable when scaled down to 48 pixels. Square 1:1, 1024 x 1024.
```
**Ghi chú tiếng Việt:** xin ChatGPT tạo 3 bản rồi anh chọn bản đơn giản nhất. Nếu có chữ hay đốm xám thì bắt tạo lại.

### F2. Ảnh BẮT BUỘC 2: Vòng huy hiệu "cung nâng đỡ / cần lưu tâm"

| Mục | Nội dung |
|---|---|
| Mục đích | Khung tròn quanh biểu tượng cung trong 6 huy hiệu (Q7); dùng lại làm khung số điểm ở bản đồ 12 cung. Một ảnh, CSS tô **vàng** cho "nâng đỡ" và **son** cho "cần lưu tâm". |
| Tên file đặt | `vong-huy-hieu-cung-nang-do-lasoviet.webp` |
| Kích thước | 1024x1024, vuông, vòng nằm giữa, chừa chỗ trống tròn đường kính 62% ở giữa |
| Nền | Nền đen tuyền, nét trắng tinh (như F1) |
| Phong cách | Hai vòng đồng tâm mảnh, giữa hai vòng có 12 chấm nhỏ đều nhau (gợi 12 cung) và bốn hình thoi nhỏ tại 4 hướng chính; **không** viền dày. Gần với `vong-12-phan-net-vang-trang-chu.webp` nhưng đơn giản hơn |
| Tránh | Vòng nguyệt quế, cánh, vương miện, sao 5 cánh, chữ số, tia sáng, nền họa tiết, màu khác trắng/đen, chi tiết nhỏ hơn 4px ở bản 1024 |

**Prompt:**
```
A circular medallion ring, centered on a square canvas, drawn as thin even-weight engraved line art. Two concentric thin circles with a narrow band between them; in the band, twelve small evenly spaced dots, and four small lozenge shapes at the cardinal points. The inner area is completely empty (about 62% of the diameter). Restrained, elegant, inspired by Vietnamese lacquer and bronze-drum linework. Pure white lines (#FFFFFF) on a pure flat black background (#000000). No gradients, no shading, no glow, no shadow, no texture, no text, no letters, no numbers, no laurel, no wings, no crown, no stars, no Western zodiac. Must stay crisp when scaled down to 56 pixels. Square 1:1, 1024 x 1024.
```

### F3. Ảnh TUỲ CHỌN: Biểu tượng "Đại vận · chặng 10 năm"

| Mục | Nội dung |
|---|---|
| Mục đích | Đầu khối "Đường đời 10 năm" và đầu tab Đại vận, đi cặp với `icon/hanh-trinh/nam-nay.webp` (đã có) cho đồng bộ |
| Tên file đặt | `chang-duong-10-nam-dai-van-lasoviet.webp` |
| Kích thước | 512x512 (ảnh hiện có ~210x220, nên 512 là dư) |
| Nền | **Trong suốt, giống bộ hành trình đang có**: nét vàng `#C9A44D`. Nếu ChatGPT không xuất được nền trong suốt: nền trắng tinh, Claude tách nền |
| Phong cách | Nét vàng mảnh đồng nhất với `nam-nay.webp` (đồi bậc thang + trăng lưỡi liềm): ở đây là **con đường uốn dưới ba bậc đá/mốc**, phía xa có mặt trời nhỏ |
| Tránh | Chữ, người nhìn thẳng, đường cong dạng "biểu đồ chứng khoán", mũi tên đi lên, bất cứ thứ gì gợi dự báo tăng giảm |

**Prompt:**
```
A single minimalist icon in thin, even-weight golden line art (#C9A44D) on a transparent background: a winding path rising gently over three stepped stone markers, a small low sun at the far end. Same hand-drawn linework language as a set of Vietnamese-inspired travel icons (terraced hills with a crescent moon). No text, no letters, no people, no arrows, no chart or graph shapes, no gradients, no shadow, no glow. Square 1:1, 512 x 512, generous empty margin around the drawing.
```

### F4. Đổi tên và nhập vào web
Mỗi ảnh nhận về phải: (1) giữ đúng **tên file ở trên** (chữ thường, gạch ngang, có từ khoá, đuôi `.webp`) theo `docs/22-art-direction.md` mục 0; (2) lưu vào `apps/web/public/images/lasoviet/`; (3) viết `alt` tiếng Việt có dấu khi dùng (ảnh trang trí thuần dùng `alt=""` và `aria-hidden`). Claude tách nền / đổi sang kênh trong suốt (kỹ năng `media-processing`) trước khi đưa vào.

---

## PHẦN G. Phân công FRONTEND (Lãm + Claude) và BACKEND (An)

### G1. FRONTEND (`apps/web`) — Sonnet viết, Opus review; báo anh trước khi làm giao diện thật

| # | Việc | File chính |
|---|---|---|
| FE-1 | Trạng thái nút dùng chung (hover, nhấn, focus, khoá, đang tải) + tiện ích "thẻ bấm cả vùng" | `apps/web/src/styles/global.css:58-60` (hoặc tệp mới `ui-states.css` nạp từ đó) |
| FE-2 | Tab bar mới 5 tab, chuyển tên tab cũ (`chart`→`overview`, `evidence`→`overview`, `annual`→`nam-nay` đã có), thêm tab `dai-van` | `apps/web/src/features/ziwei/ziwei-tabs-state.ts`, `ziwei-free-result.tsx`, `apps/web/messages/{vi,en}/ziwei.json` |
| FE-3 | Bỏ độ trễ máy chủ khi đổi tab/mở tấm: trạng thái cục bộ + `history.pushState` | `ziwei-free-result.tsx:181-192` |
| FE-4 | Thanh chip dính + theo dõi cuộn trên mobile | thành phần mới `ziwei-section-rail.tsx`, `free-result-read-first.css` |
| FE-5 | Chip + tấm xem thử khoá (hàng, thẻ, đoạn năm, tháng) | thành phần mới `locked-preview-sheet.tsx`, thay khối `ziwei-free-result.tsx:347-369`; dùng `secure-locked-preview.tsx`, `contextual-unlock.tsx` |
| FE-6 | Q7: 3+3 huy hiệu, 12 thanh trong `<details>` | thành phần mới `ziwei-support-palaces.tsx`; bỏ `ReportPalaceRadar` khỏi trang miễn phí (`ziwei-free-result.tsx:241,262`) |
| FE-7 | Q8: dải Đường đời 10 năm (cột desktop, thanh mobile), thẻ chi tiết chặng, hộp "tính thế nào" | thành phần mới `ziwei-decadal-strip.tsx` (đã có trong `phase-04` mục Related Code Files) |
| FE-8 | Tab Năm nay: dải hai lớp, 12 ô tháng, thẻ Hôm nay | thành phần mới `ziwei-month-strip.tsx`; tái dùng ý tưởng `ziwei-annual-tab.tsx:54-77` |
| FE-9 | Tab 12 cung: lưới thẻ có biểu tượng + lọc 2 chế độ | `ziwei-free-result.tsx:299-306` → `ziwei-palace-map.tsx` |
| FE-10 | Lớp phủ Đại vận / Lưu niên trên lá số + nút bật tắt | `ziwei-chart.tsx`, `ziwei-palace.tsx` (thêm huy hiệu ĐV/LN) |
| FE-11 | Xem lá số lớn: co vừa khung, phóng thu, ngăn kéo chi tiết | thành phần mới `chart-zoom-sheet.tsx` (thay `.fd109-chart-fullscreen`, `free-result-read-first.css:30-34`) |
| FE-12 | Chip "Căn cứ" + tấm; bỏ tab Căn cứ | `evidence-chip.tsx` mới; `ziwei-free-result.tsx:254,323-341`; `ziwei-evidence-tab.tsx` xoá |
| FE-13 | Mở rộng `FreeResultModel`: `timing` (cung đại vận, cung lưu niên), top 3 mạnh/yếu, 12 tháng (chỉ `marker` và số tháng), chặng đại vận khi An xong | `ziwei-free-result-model.ts:34-48,136-153` |
| FE-14 | Trang chọn luận giải: thẻ một bước + thẻ bấm cả vùng + chip chọn cung + ẩn thẻ/tab "Sắp mở" | `offer-ladder.tsx`, `palace-picker.tsx`, `paid-topic-selector-client.tsx:262-283,468-512,621-737`, `contextual-unlock.css` |
| FE-15 | Xoá mã chết nhóm thẻ `.offer-card` khi xong | `paid-topic-selector-client.tsx:287-465`, `pricing-and-topup.css:108-190` |
| FE-16 | Hộp "Điểm này tính thế nào?" gọn, số ví dụ thật | `report-chart-visuals.tsx:427-442`, `messages/vi/reports.json:354-374` |
| FE-17 | Quy đổi tiền đồng chỉ ở bước xác nhận cuối (Q6) | `wallet-unlock-dialog.tsx:362-392`, `commerce/la-packs.ts` (hàm hiển thị) |
| FE-18 | Giao diện lá số theo bản duyệt (sơn mài, la kinh, dấu triện) = GĐ2 | `free-result-read-first.css`, tham chiếu `troi-nam.css:830-880` |
| FE-19 | Nhập 2-3 ảnh mới (đổi tên SEO, tách nền, mask) | `apps/web/public/images/lasoviet/` |
| FE-20 | Kiểm thử: Playwright 390 / 1440 × sáng / tối × VI / EN; kiểm "không lộ chữ khoá"; kiểm từng điều khiển ở E2 / E3 có đủ trạng thái; đo tương phản thật | `apps/web/e2e/*`, test `ziwei-*.test.tsx` |

### G2. BACKEND / ENGINE (An) — ghi ticket "GĐ3 (BE)" trên Kaneo

| # | Việc | File | Bắt buộc? |
|---|---|---|---|
| BE-1 | Thêm **danh sách đủ các chặng đại vận** (thứ tự, tuổi bắt đầu/kết thúc, năm, cung) vào kết quả horoscope; dùng `astrolabe.decadalList()` (đã dùng ở `iztro-horoscope.ts:406`), không dùng hàm suy ra vì hàm đó trả rỗng ở chặng 0 và 6 | `packages/contracts/src/ziwei-horoscope-v1.ts:67-78`, `packages/engine-adapters/src/ziwei/iztro-horoscope.ts:405-417`, test | **Có** cho Q8 |
| BE-2 | Quyết định về việc **ép một tháng "cần chú ý"** khi không có tháng nào (anh quyết, xem H1) | `iztro-horoscope.ts:315-330` | Có nếu anh chọn bỏ |
| BE-3 | Sửa `daily.headline` bỏ câu "Mở mỗi sáng trong gói Hội viên" khi Hội viên bị ẩn | `iztro-horoscope.ts:387` | Có (Q1) |
| BE-4 | Câu đọc thử riêng từng cung / từng chủ đề (thư viện câu miễn phí GĐ3) và gắn `evidence {palaceIds, starIds}` cho từng mục tổng quan | `packages/contracts/src/free-structural-overview-v1.ts:4-9`, `packages/backend/src/ziwei/free-structural-overview.ts` | Có (tấm xem thử, chip Căn cứ) |
| BE-5 | Ghi FD mới (FD-117+): công thức điểm chặng = điểm cung chặng; bản FE chỉ dùng hàm đã duyệt | `rules-and-decisions-tracker.md` | Có |
| BE-6 | (Tuỳ chọn, GĐ sau) ánh xạ Cục, Mệnh chủ, Thân chủ, nạp âm, âm dương thuận nghịch | `packages/engine-adapters/src/ziwei/iztro-mapping.ts`, `packages/contracts/src/normalized-ziwei-chart-v1.ts` | Không |
| BE-7 | (Tuỳ chọn) cung lưu niên của từng năm trong chặng, xác nhận khớp `yearly.index` | `iztro-horoscope.ts` | Không |

Không đổi: luồng tiền, ví, báo giá, khấu trừ 7 ngày, SePay.

---

## PHẦN H. Các điều còn lại anh cần quyết, rủi ro, và danh sách kiểm chứng

### H1. Hai quyết định riêng cho anh
1. **Tháng "cần chú ý" bị ép.** **[ĐÃ KIỂM CHỨNG: `iztro-horoscope.ts:315-330`]** Nếu lá số không có tháng nào đạt điều kiện cần chú ý, code tự đặt **tháng 7** thành "cần chú ý" (chủ đề tiền bạc). Khi trang hiện 12 ô tháng, ô số 7 luôn xuất hiện cho những lá số này mà không có căn cứ từ sao. Theo FD-108 điều này không bị cấm, nhưng nó khác tinh thần "truy ngược được về sao thật" của FD-107. Hai lựa chọn: **(A) Giữ** (có mồi nhử cho mọi người, rủi ro khách bắt bẻ khi xem hai lá số); **(B) Bỏ** (có thể hiện "0 tháng cần chú ý", ít mồi nhử hơn, sạch hơn). Em đề xuất (B) nếu muốn bảo vệ uy tín lâu dài, (A) nếu ưu tiên doanh thu ngắn hạn. Quyết định của anh.
2. **Có hiện vị trí tháng cần chú ý không.** Động cơ đã thiết kế: tháng cần chú ý hiện "?" thay số (`iztro-horoscope.ts:303`). Nếu vẽ 12 ô theo thứ tự, ô "?" nằm ở vị trí thứ mấy thì khách suy ra tháng đó. **Lựa chọn (A, em đề xuất):** vẽ 12 ô theo thứ tự, ô cần chú ý có khoá; cái được bán là *chuyện gì và nên chuẩn bị gì*, không phải *tháng nào*. **(B):** chỉ hiện con số tổng như hiện nay (ít hấp dẫn).

### H2. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Dải đại vận bị hiểu là "dự báo may rủi 10 năm" (FD-107 cấm) | Tiêu đề phụ cố định "Độ mạnh cấu trúc của cung ở mỗi chặng"; cột rời rạc, không đường cong; không dùng đỏ=xấu; hộp giải thích |
| Điểm phần `parts` cộng lệch 1 | Hiện "≈" hoặc dùng cách chia phần dư |
| Tấm xem thử lộ chữ trả phí | Chỉ dùng thư viện miễn phí GĐ3; test "không lộ chữ khoá" như LSV-75 |
| Đồng bộ địa chỉ bằng `pushState` làm hỏng nút Back / liên kết chia sẻ `?tab=&open=` | Giữ nguyên quy ước `ziwei-tabs-state.ts`; test e2e Back/Forward; đọc docs Next trong `node_modules` |
| Hoa văn mask không hiện ở trình duyệt cũ | `-webkit-mask-image` + dự phòng ảnh nền thường |
| Điểm chặng bị coi là "điểm số mới" so với 12 điểm cung | Cùng một công thức, ghi rõ "điểm của cung chặng đi qua" |
| Ẩn món "Sắp mở" làm giảm cảm giác phong phú | Bảng so sánh + đọc thử bù lại (phase-05) |

### H3. Danh sách đã kiểm chứng và còn là suy luận
**Đã kiểm chứng bằng đọc code/ảnh:** nguyên nhân N1-N6, N8, N9; danh sách điều khiển E2/E3; công thức điểm; động cơ hỗ trợ tháng/ngày/đại vận; đại vận hiện tại chỉ có 1 chặng ra trang; 12 biểu tượng cung và dấu triện có sẵn; tài liệu Next 16 về `history.pushState`; cuộn một trang trên mobile; độ tương phản token (tôi tính).
**Còn là suy luận (cần kiểm trước khi làm):** độ trễ thật của N7 (chưa đo); `decadalList()` trả đủ 12 chặng; `section.id` của bài tổng quan có ánh xạ cung hay không; cung lưu niên từng năm theo địa chi khớp `yearly.index`; CSS mask trên ảnh có kênh trong suốt cho kết quả đúng ở mọi trình duyệt mục tiêu; hợp lệ HTML của `<h3>`/`<div>` trong `<button>` ở ô cung (`ziwei-palace.tsx`); Cục / Mệnh chủ chưa có trong động cơ (chỉ thấy không có trong ánh xạ).
**Em chưa làm:** không chạy trang thật, không đo hiệu năng, không đo tương phản trên trang, không xem lại ảnh sáng AiTuvi ở điện thoại.
