---
phase: 2
title: "Sửa lệch bản đã duyệt, nút bấm, độ trung thực dữ kiện"
status: pending
priority: P1
effort: "3d (FE 2d, BE 1d, chạy song song)"
dependencies: []
---

# Phase 2: Sửa lệch bản đã duyệt, nút bấm, độ trung thực dữ kiện

## Overview
Ba mảng, không cần anh duyệt lại thiết kế, chạy ngay:
1. **Frontend:** đưa trang lá số miễn phí về đúng bản mẫu anh đã duyệt (FD-116); sửa **mọi nút** cho có phản hồi nhìn thấy được (Q10).
2. **Frontend:** bỏ độ trễ "đi hỏi máy chủ" khi đổi tab/mở tấm.
3. **Backend (An):** làm đúng độ trung thực của dữ kiện năm/tháng mà trang miễn phí đang nói.

Không đổi bố cục tab (việc của GĐ4), không đổi chữ (GĐ3), không đổi luồng tiền.

## Requirements

### Frontend (anh + Claude; Sonnet viết, Opus review; mobile trước)
- **U1:** lá số trang miễn phí dùng đúng thiết kế đã duyệt: nền sơn mài `nen-la-so-son-mai-lien-mach-lasoviet.webp`, hoa văn la kinh ở ô giữa, dấu triện `dau-trien-la-so-viet-son-do.webp`. Dùng lại đúng lớp CSS ở `troi-nam.css` (trang chủ) và `report-reader-structure.css`; không vẽ lại.
- **U2:** desktop ≥1024px theo bản mẫu `plan/evidence/lsv75-prototype/proposal-1440-overview.png`: cột trái gọn (~340–380px), cột đọc rộng, 65–75 ký tự/dòng, chữ thân ≥17px.
- **U4 / D5:** tấm "Xem lá số lớn hơn": toàn màn hình, lá số **tự co vừa chiều ngang**, nút + − "Vừa khung" ≥44px, chi tiết cung trong ngăn kéo dưới (mobile) hoặc cột phải (desktop ≥1100); Esc/bấm nền/Back đóng và trả focus.
- **U8:** bỏ chữ lặp ("Đăng nhập để xem hội viên" hai lần); header dính không đè nội dung; khối xoá dữ liệu thu thành một dòng liên kết (giữ xác nhận 2 bước).
- **P2/P3/P6:** chữ nội dung ≥12px; chữ xám ≥4,5:1 (đo bằng công cụ; token cấm dùng cho chữ: `--pearl-600` 2,9:1; `--son` trên thẻ 4,1:1 chỉ cho hình); vùng bấm ≥44px.
- **Nút bấm dùng chung (FE-1, Q10):** thêm một lần cho cả site các luật `.button:hover` (trong `@media (hover:hover)`), `:active` (thu 0,98 trong 120ms), `:focus-visible`, `:disabled`/`[aria-disabled="true"]` (nền tối, viền đứt, kèm dòng lý do), `[aria-busy="true"]` (vòng xoay, chặn bấm đúp); `touch-action: manipulation`; tôn trọng giảm chuyển động. Tiện ích "thẻ bấm cả vùng" (liên kết kéo giãn).
- **Sửa N1–N6 ở trang chọn luận giải bằng bản vá nhỏ** (trước khi GĐ5 dựng lại thẻ): thẻ có con trỏ tay + hover + viền chọn nhìn rõ (hai lớp viền + dấu ✓ + chữ "Đã chọn"); dòng xác nhận không nằm tít cuối trang; nút bị khoá ("Sắp ra mắt") không còn trông như nút bấm được.
- **FE-3 / N7:** đổi tab và mở tấm dùng trạng thái cục bộ rồi đồng bộ địa chỉ bằng `window.history.pushState` (Next 16: không gọi máy chủ); giữ quy ước `?tab=&open=` và Back/Forward. Nếu còn dùng `router.push` thì bắt buộc có trạng thái "đang mở" tức thì (`useTransition` + `aria-busy`). Đọc `AGENTS.md` của `apps/web` trước khi sửa.
- **Hover/nhấn cho mọi điều khiển** ở danh sách kiểm E2 (22 nhóm trang lá số) và E3 (14 nhóm trang chọn luận giải) trong `research/03-tab-hinh-anh-nut-bam.md`: ghi "đạt/chưa" cho từng hàng trong báo cáo trước–sau.

### Backend (An; ticket trong `research/04-ticket-be-cho-an.md`)
- **BE-P0-2 (B2):** `calculateZiweiHoroscope` đúng cho năm khác năm hiện tại: cung lưu niên, can chi, chặng tính theo `targetYear` chứ không theo `asOfDate`.
- **BE-P0-3 (B3):** thống nhất ranh giới năm: dùng năm âm lịch (Tết) hoặc xử lý rõ 01/01–05/02; hiện từ 01/01 đến 05/02/2027 báo cáo "2027" dùng lưu niên Bính Ngọ.
- **BE-P0-4 (B1):** tháng "cần chú ý" không còn bị ép (mặc định bỏ; chờ R4 để chốt); dùng chung định nghĩa "tháng hạn" với bản trả phí (Hoá Kỵ lưu nguyệt); `hanMonthCount` chỉ đếm tháng thật.
- **BE-P0-5:** sửa `daily.headline` bỏ câu "Mở mỗi sáng trong gói Hội viên" khi Hội viên đang ẩn.
- Không đổi luồng tiền.

## Architecture
Frontend chỉ sửa CSS, một ít markup lớp bọc, và logic điều hướng cục bộ. Ảnh nền và dấu triện đã có trong `apps/web/public/images/lasoviet/`; không thêm ảnh. Giữ tên lớp `.fd109*` để không vỡ test hiện có. Backend sửa hàm thuần trong `packages/engine-adapters`; test cố định theo bảng 7 lá số của `research/01` mục 4.2.

## Related Code Files
- Modify: `apps/web/src/styles/global.css` (trạng thái nút dùng chung, sau dòng 58–60)
- Modify: `apps/web/src/styles/free-result-read-first.css` (cột, độ rộng, cỡ chữ, nền lá số, hộp phóng to)
- Modify: `apps/web/src/features/ziwei/ziwei-free-result.tsx` (điều hướng cục bộ `:181-192`, tấm phóng to, lớp bọc lá số)
- Modify: `apps/web/src/features/ziwei/ziwei-chart.tsx`, `ziwei-palace.tsx` (dấu triện/la kinh; `<h3>`/`<div>` trong `<button>`)
- Modify: `apps/web/src/features/reports/offer-ladder.tsx`, `paid-topic-selector-client.tsx`, `apps/web/src/features/commerce/contextual-unlock.css`, `membership-panel.tsx` (bản vá nút, chữ lặp)
- Modify (nếu chữ xám chưa đạt): `apps/web/src/styles/tokens.css`
- Modify (BE): `packages/engine-adapters/src/ziwei/iztro-horoscope.ts` (`:184-199`, `:315-330`, `:341`, `:387`), `packages/backend/src/reports/identity-report-config.ts` (`:366-381`), `period-reading-facts.ts`
- Tests: `ziwei-free-result.test.tsx`; Playwright 390/1440 × sáng/tối × VI/EN; test engine 7 lá số × năm 2026/2027/2030/2035; ngày 2027-01-15, 2027-02-05, 2027-02-06

## Implementation Steps
1. **FE:** chụp trang thật hiện tại ở 1440 và 390, sáng và tối ("trước"). Chụp luôn trạng thái của từng điều khiển (hover/nhấn/khoá) để làm bảng trước–sau.
2. **FE:** báo anh trước khi viết giao diện thật. Sửa theo thứ tự: nút dùng chung → N1–N6 → FE-3 (điều hướng cục bộ) → U1 → U2 → U4/D5 → U8 → P2/P3/P6; mỗi mục một commit nhỏ.
3. **BE (song song):** An làm B2, B3, B1 (+ định nghĩa chung), `daily.headline`; test cố định.
4. **FE:** đo tương phản từng màu chữ xám trên nền panel; ghi bảng số đo. Chạy bộ kiểm tra trình duyệt cũ (không lộ chữ khoá, không tràn ngang, focus/Escape/Back) và đo LCP giả lập; đo độ trễ mở tấm trước và sau FE-3.
5. Dựng trang HTML "Trước – Sau" (xem dưới). Người điều phối publish, gửi anh.
6. Anh duyệt → PR → An/Lãm merge → phát hành → kiểm tra trên trang thật.

## Success Criteria
- [ ] Lá số miễn phí có nền sơn mài, la kinh, dấu triện giống trang chủ.
- [ ] Desktop 1440 khớp bố cục bản mẫu FD-116 (anh xác nhận trên trang HTML).
- [ ] Tấm phóng to hiện đủ 12 ô ở 1024, 1280 và 1440 và 390; không cắt chữ.
- [ ] Không chữ nội dung <12px; mọi chữ thường ≥4,5:1; vùng bấm ≥44px.
- [ ] Mọi điều khiển E2/E3 có đủ hover/nhấn/focus/khoá/đang tải (bảng đạt/chưa, không dòng nào "chưa").
- [ ] Bấm hàng hoặc tab: tấm/tab hiện tức thì (không chờ máy chủ); Back/Forward và liên kết chia sẻ vẫn đúng.
- [ ] Test 7 lá số × 4 năm đạt; ngày 2027-01-15, 2027-02-05, 2027-02-06 cho đúng năm; không còn tháng hạn ép; `daily.headline` không nhắc Hội viên.
- [ ] Bộ kiểm tra cũ vẫn đạt; LCP giả lập < 2,5 giây.

## Risk Assessment
- Nền ảnh làm chậm tải → ảnh đã có, dùng lại; đo LCP trước và sau.
- Sửa token màu ảnh hưởng trang khác → chỉ đổi token dùng trên panel tối; chụp so trang chủ và trang đọc báo cáo.
- `pushState` làm hỏng Back/liên kết chia sẻ → giữ quy ước `ziwei-tabs-state.ts`; test e2e Back/Forward.
- Bản vá nút ở trang chọn luận giải sẽ bị GĐ5 thay → chỉ vá tối thiểu (phản hồi, khoá), không đầu tư thêm; ghi chú trong PR.
- Đổi hàm tính năm làm lệch dữ kiện bản đang bán → test cố định so với bảng chạy thử; không đổi kết quả cho năm hiện tại.

## Trang HTML duyệt
`truoc-sau-sua-lech.html`: từng mục U1…P6 và từng nhóm nút một hàng, hai ảnh cạnh nhau (desktop 1440 và điện thoại 390), chú thích một câu; bảng nút bấm trước–sau (hover, nhấn, khoá, đang tải) và số đo tương phản. Anh làm gì: duyệt hoặc chỉ chỗ còn lệch. Phần dữ kiện (BE) anh không cần xem code; trang ghi 3 dòng "trước nói gì, sau nói gì" cho tháng cần chú ý và năm.
