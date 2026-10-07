---
phase: 4
title: "Bố cục trang lá số miễn phí mới"
status: pending
priority: P1
effort: "4d"
dependencies: [1, 2]
---

# Phase 4: Bố cục trang lá số miễn phí mới

## Overview
Sắp xếp lại trang `/la-so/{chartId}` theo hành trình tò mò của khách, có bố cục desktop riêng, không còn khối lặp và ngõ cụt. Làm bản mẫu HTML bấm được trước (FD-098), anh duyệt rồi mới viết code. Phạm vi cuối cùng theo câu trả lời Q2, Q3, Q4, Q7, Q8, Q10.

## Requirements
- Functional (theo đề xuất; bỏ mục anh nói Không ở GĐ1):
  - **Màn đầu = Tổng quan có lá số** (Q3): desktop: lá số đúng thiết kế ở cột trái dính khi cuộn, bài tổng quan ở cột phải rộng; điện thoại: lá số trên, bài dưới.
  - **Tab theo thời gian** (Q3): Tổng quan → Năm nay → Đại vận → 12 cung → Chủ đề. Khối "Chi tiết cung vị đang chọn" chỉ hiện khi khách chạm vào một cung, dạng tấm trượt, không lặp ở mọi tab.
  - **Bỏ tab Căn cứ** (Q2): mỗi nhận định có một nút nhỏ "Căn cứ" mở tấm nêu sao/cung làm căn cứ.
  - **Hàng "Chưa mở" mở được tấm đọc thử** (Q4): dòng đọc thử từ GĐ3, phần mờ là hình khối, giá và nút mua chỉ nằm trong tấm (FD-110).
  - **Thay biểu đồ mạng nhện** (Q7c): "3 cung nâng đỡ nhất / 3 cung cần lưu tâm", mỗi cung một câu, bấm mở tấm cung đó.
  - **Đường đời 10 năm** (nếu Q8): dải cột theo các đại vận, đánh dấu chặng hiện tại, hộp "Điểm này tính thế nào"; chặng hiện tại có đọc thử và mở tấm.
  - **Cuối phần miễn phí**: khối "Bạn đã đọc xong phần miễn phí" giữ như FD-109, câu chữ lấy từ GĐ3.
  - **Khối xoá dữ liệu** thu gọn thành một dòng liên kết ở cuối trang (vẫn dễ tìm; CISO đồng ý).
- Non-functional: điện thoại trước (390px), desktop 1024/1280/1440 có bố cục riêng; giữ không lộ chữ khoá, không giá trên thân trang, focus/Escape/Back như LSV-72; LCP < 2,5 giây; tôn trọng chế độ giảm chuyển động.

## Architecture
- Hướng hình ảnh "Editorial Luxury bản tối" (`high-end-visual-design`): nền sơn mài, tiêu đề chữ có chân to (Source Serif 4), khoảng trống lớn có chủ đích; lá số và tấm đọc thử dùng "hai lớp viền" (khung ngoài + lõi trong) nếu Q10 đồng ý.
- Chuyển động: hiện dần khi cuộn tới (chỉ đổi độ mờ và vị trí, 600–800ms, đường cong mềm), tắt hết khi người dùng chọn giảm chuyển động.
- Không dùng: kính mờ trên nội dung cuộn, thẻ xoay nghiêng, header kiểu viên nổi (FD-100).
- Dữ liệu dùng lại: `ziwei-free-result-model.ts`, `ziwei-free-preview-projection.ts`, `secure-locked-preview.tsx`, `contextual-unlock.tsx`, `unlock-sheet.tsx` (không viết lại luồng mở khoá).

## Related Code Files
- Create: `prototype/revamp-2026-10/la-so-mien-phi-v3.html` (+ `.css`, `.js`) — bản mẫu bấm được
- Modify: `apps/web/src/features/ziwei/ziwei-free-result.tsx`, `ziwei-result-tabs.tsx`, `ziwei-tabs-state.ts`, `ziwei-overview-tab.tsx`, `ziwei-annual-tab.tsx`, `ziwei-palaces-tab.tsx`, `ziwei-topics-tab.tsx`
- Delete hoặc chuyển thành tấm: `apps/web/src/features/ziwei/ziwei-evidence-tab.tsx` (nếu Q2)
- Create (nếu Q8): `apps/web/src/features/ziwei/ziwei-decadal-strip.tsx`
- Modify: `apps/web/src/styles/free-result-read-first.css`
- Modify: `apps/web/messages/{vi,en}/ziwei.json`
- Tests: các test `ziwei-*.test.tsx` liên quan; Playwright 390/1440 × sáng/tối × VI/EN; kiểm tra không lộ chữ khoá

## Implementation Steps
1. Báo anh trước khi bắt đầu phần giao diện (quy tắc của anh).
2. Dựng bản mẫu HTML bấm được với 1 lá số mẫu tổng hợp và chữ thật từ GĐ3 (hoặc chữ hiện tại nếu GĐ3 chưa xong): đủ 5 tab, tấm cung, tấm đọc thử, tấm căn cứ, khối đọc xong; hai khổ 390 và 1440; sáng và tối.
3. Publish Artifact riêng tư; anh bấm thử và bình luận từng khối. Sửa đến khi anh duyệt.
4. Viết code theo bản mẫu đã duyệt, từng tab một PR nhỏ; giữ test cũ về an toàn chữ khoá.
5. Chạy bộ kiểm tra trình duyệt và đo LCP; dựng trang HTML so "bản mẫu đã duyệt – trang thật" để anh xác nhận.
6. Merge → phát hành → kiểm tra trên trang thật.

## Success Criteria
- [ ] Anh duyệt bản mẫu HTML.
- [ ] Không khối nào lặp lại giữa các tab; không còn nút "Chưa mở" dẫn vào ngõ cụt.
- [ ] Desktop 1440 và điện thoại 390 khớp bản mẫu đã duyệt (anh xác nhận trên trang so sánh).
- [ ] Bộ kiểm tra cũ (không lộ chữ khoá, không giá trên thân, focus/Back) đạt; LCP < 2,5 giây.
- [ ] Sự kiện đo `free_read_depth` và `locked_preview_open` vẫn ghi đúng.

## Risk Assessment
- Đổi tab làm hỏng đường dẫn cũ `?tab=` → giữ bảng chuyển tên tab cũ sang tab mới.
- Lá số dính cột trái làm chật màn 1024 → ở 1024–1279 lá số thu nhỏ và không dính.
- Thêm "Đường đời 10 năm" trước khi có công thức đại vận được duyệt → chỉ làm khi Q8 đồng ý và công thức được ghi vào FD.
