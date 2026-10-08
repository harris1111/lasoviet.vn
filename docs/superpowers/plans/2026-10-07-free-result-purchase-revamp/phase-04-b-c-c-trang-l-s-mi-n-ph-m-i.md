---
phase: 4
title: "Bố cục trang lá số miễn phí và hình ảnh"
status: pending
priority: P1
effort: "6d (FE 5d, BE phụ 1d)"
dependencies: [1, 2]
---

# Phase 4: Bố cục trang lá số miễn phí và hình ảnh

## Overview
Sắp xếp lại trang `/la-so/{chartId}` theo hành trình tò mò của khách, bố cục riêng cho desktop, hình ảnh trực quan mạnh, không khối lặp, không ngõ cụt. Làm **bản mẫu HTML bấm được trước** (FD-098), anh duyệt rồi mới viết code. Phạm vi theo FD-117 (Q2, Q3, Q4, Q7, Q8, Q10) và FD-118 (R4 tháng cần chú ý do engine tính thật, R5 12 ô tháng có dấu khoá, R6 một trang cuộn + 5 chip dính, R7 Đường đời 10 năm chỉ bày sau khi engine đại vận đã kiểm chứng). **Mọi mã backend của phase này là ticket cho An** (R1); phần giao diện do anh + Claude.

## Requirements (FE: anh + Claude; BE phụ: An)
- **5 tab theo thời gian** (Q3): Tổng quan (có lá số) → Năm nay → Đại vận → 12 cung → Chủ đề. Không thêm tab thứ 6; tháng và ngày nằm **trong** tab Năm nay. Khối "Chi tiết cung" chỉ hiện khi chạm vào một cung, dạng tấm trượt.
- **Màn đầu = Tổng quan có lá số:** desktop: lá số đúng thiết kế (sơn mài, la kinh, dấu triện) ở cột trái dính khi cuộn, bài tổng quan ở cột phải rộng; điện thoại: lá số trên, bài dưới. Tóm tắt Mệnh–Thân 3 dòng đầu bài.
- **Điện thoại (R6 đã chốt):** giữ một trang cuộn (FD-108) + **thanh 5 chip dính** ở đầu trang; bấm chip cuộn tới mục, chip đang đọc sáng lên. Không làm tab thật trên điện thoại.
- **Lớp phủ trên lá số:** hai nút bật/tắt "Hiện đại vận" và "Hiện lưu niên"; cung đại vận có vòng vàng đứt nét + "ĐV", cung lưu niên vòng son liền + "LN"; mặc định bật khi ở tab Năm nay/Đại vận.
- **Bỏ tab Căn cứ** (Q2): chip "Căn cứ" cuối đoạn mở tấm nêu sao/cung làm căn cứ (tầng 1 thẻ từ engine; tầng 2 chữ AI từ GĐ3); `?tab=evidence` chuyển về Tổng quan.
- **Hàng "Chưa mở" mở tấm đọc thử** (Q4): tấm trượt (mobile từ dưới cao tối đa 88dvh; desktop bên phải 480px), hiện **tức thì**: tên cung + huy hiệu điểm → "Bài đọc đầy đủ sẽ cho bạn biết" (3 gạch có tên sao thật) → 2 câu đọc thử của đúng cung, câu 2 cắt giữa chừng và mờ → chip Căn cứ → hộp mờ bằng hình khối (không chữ thật) → giá Lá + nút "Mở – N Lá →" → "Xem tất cả gói". **Không giá trên thân trang** (FD-110). Giá chỉ bằng Lá; tiền đồng chỉ ở bước xác nhận cuối (Q6).
- **Q7:** "3 cung nâng đỡ nhất / 3 cung cần lưu tâm hơn cả" thay mạng nhện; huy hiệu tròn có vòng điểm quanh biểu tượng cung (vàng/son), nhãn dễ hiểu + số điểm nhỏ, một dòng sao thật, chip Căn cứ, bấm làm nổi cung trên lá số và mở tấm; `<details>` "Xem cả 12 cung" = 12 thanh ngang có vạch mốc 50; nếu cung thấp nhất vẫn ≥55 ghi "vẫn ở mức thuận, chỉ thấp hơn các cung khác"; hộp "Điểm này tính thế nào" giữ một bản.
- **Q8 Đường đời 10 năm** (tab Đại vận): cột rời rạc theo đại vận (mobile: thanh ngang xếp dọc, không cuộn ngang); điểm mỗi chặng = điểm cấu trúc (FD-107/111) của **cung chặng đó đi qua**; chặng hiện tại rộng hơn, viền vàng, dấu triện đỏ, nhãn "ĐANG Ở ĐÂY", chọn sẵn; chặng đã qua mờ 55% nhưng bấm được; tiêu đề phụ cố định "Độ mạnh cấu trúc của cung ở mỗi chặng (không phải điểm may rủi)"; không vẽ đường cong; không dùng đỏ = xấu. Hộp "Điểm này tính thế nào" có ví dụ số thật của lá số (cộng tròn đúng, hiện "≈" hoặc chia phần dư). Chặng hiện tại có đọc thử 2 câu; chặng khác mở tấm xem thử của cung đó (Một cung 120 Lá).
- **Tab Năm nay:** dải "hai lớp" ("Chặng 25–34 tuổi · cung Phúc Đức → năm Bính Ngọ vào cung Thiên Di"), tóm tắt năm, **12 ô tháng** (6×2 trên mobile; ký hiệu ◆ thuận / ○ trung tính / ⚿ cần chú ý, màu + hình + nhãn, luôn có chú giải), đoạn Năm nay cắt giữa câu, thẻ "Hôm nay" (ngày + cung bị chạm). **Không dùng câu chuẩn bị mẫu** của engine cho tháng thuận/trung tính (giống nhau cho mọi lá số). **R5 đã chốt:** hiện đủ 12 ô theo thứ tự, ô cần chú ý có dấu khoá (giữ nội dung che). **R4 đã chốt:** ô cần chú ý chỉ xuất hiện khi engine tính ra tháng đó (BE-P0-4); lá số không có tháng nào thì ghi thật "chưa thấy tháng nào bị ép đặc biệt", không đặt tháng giả. Khi mở khoá, mỗi tháng cần chú ý hiện căn cứ thật (ví dụ "Hoá Kỵ lưu nguyệt nhập cung Tài Bạch").
- **Tab 12 cung:** lưới thẻ có biểu tượng, điểm, nhãn, sao; lọc "Theo thứ tự cung / Theo độ mạnh"; cả thẻ là nút "Xem thử ›" (bỏ con tem "Chưa mở"); cung đã tặng có dấu "Đã đọc đầy đủ".
- **Tab Chủ đề:** 2 đề đang bán (hiện thêm khi qua cổng) với câu hỏi + cung liên quan.
- **Q10:** lá số, tấm đọc thử, khối Đường đời dùng **hai lớp viền** (vỏ ngoài nền vàng rất nhạt + lõi trong); nút chính dạng viên có mũi tên trong vòng tròn riêng; trạng thái nút theo bảng E4 của nghiên cứu 03.
- **R13 (đã chốt, làm ở GĐ6, không chặn):** Cục, Mệnh chủ, Thân chủ, nạp âm giữa lá số khi engine có (BE-P1-13).
- **Khối "Bạn đã đọc xong phần miễn phí"** giữ như FD-109, chữ lấy từ GĐ3; khối xoá dữ liệu thu thành dòng liên kết (đã làm ở GĐ2).
- Non-functional: điện thoại trước (390), desktop 1024/1280/1440 bố cục riêng (1024–1279 lá số thu nhỏ, không dính); không lộ chữ khoá, không giá trên thân, focus/Escape/Back như LSV-72; LCP <2,5 giây; hiện dần khi cuộn tới (`opacity` + `translateY(12px)`, 600ms; không làm mờ bằng blur trên điện thoại); tôn trọng giảm chuyển động; trợ năng (`<ol>` các nút có nhãn đọc đầy đủ, không dùng màu một mình, bảng số ẩn cho trình đọc màn hình).

## Architecture
- Hướng hình ảnh "Editorial Luxury bản tối" (`high-end-visual-design`): sơn mài, tiêu đề Source Serif 4, khoảng trống có chủ đích; chỉ dùng token màu; thang điểm `manh` vàng sáng → `thuan` vàng → `can` ngà → `canh` son → `kho` son + sọc chéo, luôn kèm nhãn và số. Không dùng: header viên nổi (FD-100), thẻ xoay nghiêng, kính mờ trên nội dung cuộn.
- Điểm 12 cung đã có (`model.palaces`); cần thêm vào `FreeResultModel`: cung đại vận, cung lưu niên, 3 mạnh/3 yếu, 12 tháng (chỉ `marker`), danh sách chặng.
- Dùng lại: `secure-locked-preview.tsx`, `contextual-unlock.tsx`, `unlock-sheet.tsx`, `ReportScoreExplainer`; 12 biểu tượng cung `images/troi-nam/icon/cung/*.webp`, dấu triện, nền sơn mài, bộ SVG icon.
- **Ảnh mới (ĐÃ DUYỆT và ĐÃ XỬ LÝ, nền trong suốt, có PNG và WebP) nằm ở `/Users/admin/Downloads/Add-on photos 1/da-xu-ly/`:** `goc-trang-tri-hoa-van-khung-vang-lasoviet` (hoa văn góc khung), `vong-huy-hieu-cung-nang-do-lasoviet` (vòng huy hiệu), `chang-duong-10-nam-dai-van-lasoviet` (icon Đại vận). **Ở bước FE đầu tiên của phase này, sao chép chúng vào `apps/web/public/images/lasoviet/`** (WebP trước, PNG dự phòng; tên đã đúng chuẩn SEO lowercase-hyphen). Tô vàng/son nếu cần bằng CSS mask (có `-webkit-` và dự phòng). Không cần ChatGPT thêm; không đưa `xem-thu-nho.png` (ảnh xem thử) vào web.

## Related Code Files
**Frontend:**
- Create: `prototype/revamp-2026-10/la-so-mien-phi-v3.html` (+ `.css`, `.js`) bản mẫu bấm được
- Create: `ziwei-support-palaces.tsx`, `ziwei-decadal-strip.tsx`, `ziwei-month-strip.tsx`, `ziwei-palace-map.tsx`, `ziwei-section-rail.tsx`, `locked-preview-sheet.tsx`, `chart-zoom-sheet.tsx` (đã có từ GĐ2), `evidence-chip.tsx` (hoặc dùng `claim-with-basis.tsx` từ GĐ3) trong `apps/web/src/features/ziwei/`
- Modify: `ziwei-free-result.tsx`, `ziwei-result-tabs.tsx`, `ziwei-tabs-state.ts` (bảng chuyển tên tab cũ: `chart`→`overview`, `evidence`→`overview`), `ziwei-free-result-model.ts` (`:34-48`, `:136-153`), `ziwei-chart.tsx`, `ziwei-palace.tsx` (huy hiệu ĐV/LN), `free-result-read-first.css`, `apps/web/messages/{vi,en}/ziwei.json`
- Delete: `ziwei-evidence-tab.tsx`
- Add: ảnh mới trong `apps/web/public/images/lasoviet/`
**Backend (An):**
- Modify: `packages/contracts/src/ziwei-horoscope-v1.ts` (`:67-78`), `packages/engine-adapters/src/ziwei/iztro-horoscope.ts` (`:405-417`): thêm `decadalCycles[]` bằng `astrolabe.decadalList()` (không dùng `deriveDecadalCycles` vì trả rỗng ở chặng 0 và 6)
- Modify: `free-structural-overview-v1.ts`/`free-structural-overview.ts`: thêm `evidence {palaceIds, starIds}` cho từng mục tổng quan (nếu chưa có từ GĐ3); dòng đọc thử 13 mục (từ GĐ3)
- (Tuỳ chọn) `iztro-mapping.ts`: Cục, Mệnh chủ, Thân chủ, nạp âm (R13); cung lưu niên từng năm trong chặng
**Tests:** các test `ziwei-*.test.tsx` liên quan; Playwright 390/1440 × sáng/tối × VI/EN; kiểm không lộ chữ khoá; mỗi điều khiển có đủ trạng thái.

## Implementation Steps
1. **Báo anh trước khi bắt đầu phần giao diện** (quy tắc của anh).
2. Sao chép ba ảnh đã xử lý từ `/Users/admin/Downloads/Add-on photos 1/da-xu-ly/` vào `apps/web/public/images/lasoviet/` (WebP + PNG dự phòng); kiểm tên SEO; kiểm hiển thị trên nền sáng và tối.
3. Dựng bản mẫu HTML bấm được với 1 lá số mẫu tổng hợp và chữ thật từ GĐ3 (hoặc chữ hiện tại nếu GĐ3 chưa xong): 5 tab, tấm cung, tấm đọc thử, tấm căn cứ, Đường đời 10 năm, Năm nay có 12 ô tháng, lớp phủ ĐV/LN, khối đọc xong; hai khổ 390 và 1440; sáng và tối.
4. Người điều phối publish Artifact riêng tư; anh bấm thử và bình luận từng khối; sửa đến khi anh duyệt.
5. **BE (An):** `decadalCycles[]` và `evidence` theo từng mục trong khi FE dựng bản mẫu (không chờ duyệt vì không đổi hành vi hiện có).
6. Viết code theo bản mẫu đã duyệt, mỗi tab một PR nhỏ; giữ test cũ về an toàn chữ khoá.
7. Kiểm tra trình duyệt, đo LCP, kiểm bảng điều khiển; dựng trang so "bản mẫu đã duyệt – trang thật" để anh xác nhận.
8. Merge → phát hành → kiểm tra trên trang thật.

## Success Criteria
- [ ] Anh duyệt bản mẫu HTML.
- [ ] Không khối nào lặp giữa các tab; không còn nút "Chưa mở" dẫn vào ngõ cụt; mọi hàng khoá mở ra tấm đọc thử có chữ thật của chính lá số.
- [ ] Đường đời 10 năm: điểm mỗi chặng đúng bằng điểm cung chặng đi qua (test 7 lá số); hộp công thức có số ví dụ thật cộng tròn.
- [ ] Desktop 1440 và điện thoại 390 khớp bản mẫu (anh xác nhận trên trang so sánh).
- [ ] Bộ kiểm tra cũ (không lộ chữ khoá, không giá trên thân, focus/Back) đạt; LCP <2,5 giây.
- [ ] `free_read_depth` và `locked_preview_open` vẫn ghi đúng.
- [ ] Mọi điều khiển mới có đủ trạng thái hover/nhấn/focus/chọn/khoá/đang tải.

## Risk Assessment
- Đổi tab làm hỏng đường dẫn cũ `?tab=` → giữ bảng chuyển tên tab cũ; test Back/Forward.
- Dải đại vận bị hiểu là "dự báo may rủi 10 năm" (FD-107 cấm) → tiêu đề phụ cố định, cột rời rạc, không đỏ = xấu, hộp giải thích.
- Điểm các phần cộng lệch 1 do làm tròn → hiện "≈" hoặc chia phần dư.
- Điểm chặng bị coi là "điểm mới" → ghi rõ "điểm của cung chặng đi qua"; cùng công thức.
- Lá số dính cột trái làm chật màn 1024 → ở 1024–1279 thu nhỏ, không dính.
- Hoa văn mask không hiện ở trình duyệt cũ → `-webkit-mask-image` + dự phòng ảnh nền thường.
- Dải 12 tháng làm lộ vị trí tháng cần chú ý → đó là lựa chọn R5; cái bán là "chuyện gì và chuẩn bị gì", không phải "tháng nào".
- `decadalList()` có trả đủ 12 chặng không là suy luận, và R7 dặn kiểm engine đại vận thật kỹ → An làm BE-P0-7 và **BE-P0-8 (kiểm chứng đại vận)** trước khi Đường đời 10 năm ra trang thật; bản mẫu HTML dùng lá số tổng hợp đã kiểm.
- Tháng cần chú ý do engine tính (R4) có thể ít với một số lá số → giao diện và chữ phải đẹp ở cả trường hợp 0 tháng (nói thật, không để ô trống vô nghĩa).

## Trang HTML duyệt
`la-so-mien-phi-v3.html`: bản mẫu bấm được của trang lá số mới (390 và 1440, sáng và tối). Anh làm gì: bấm thử từng tab, mở tấm đọc thử và tấm căn cứ, bấm vào từng cột Đường đời 10 năm và từng ô tháng; bình luận từng khối; xem cả lá số có nhiều tháng cần chú ý và lá số không có tháng nào; xác nhận ảnh minh hoạ (ba ảnh đã duyệt).
