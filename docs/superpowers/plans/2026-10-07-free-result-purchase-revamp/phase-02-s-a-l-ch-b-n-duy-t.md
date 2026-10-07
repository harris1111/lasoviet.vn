---
phase: 2
title: "Sửa lệch bản đã duyệt"
status: pending
priority: P1
effort: "1.5d"
dependencies: []
---

# Phase 2: Sửa lệch bản đã duyệt

## Overview
Đưa trang lá số miễn phí về đúng bản mẫu anh đã duyệt (FD-116 và `la-so-ket-qua-v2`). Không đổi bố cục tab, không đổi chữ, không đổi luồng tiền. Đây là các lỗi nhóm A trong biên bản họp, nên **không cần anh duyệt lại thiết kế**; trang HTML chỉ để anh xác nhận đã hết lệch.

## Requirements
- Functional:
  - U1: lá số trên trang miễn phí dùng đúng thiết kế đã duyệt: nền sơn mài `nen-la-so-son-mai-lien-mach-lasoviet.webp`, hoa văn la kinh ở ô giữa, dấu triện `dau-trien-la-so-viet-son-do.webp`. Dùng lại đúng lớp CSS đang có ở `troi-nam.css` (trang chủ) và `report-reader-structure.css` (trang đọc báo cáo), không vẽ lại.
  - U2: desktop ≥1024px theo bản mẫu `plan/evidence/lsv75-prototype/proposal-1440-overview.png`: cột trái gọn (~340–380px), cột đọc rộng, đoạn văn 65–75 ký tự, chữ thân ≥17px; khung nội dung rộng như bản mẫu, không co còn ~60% màn hình.
  - U4: tấm "Xem lá số lớn hơn" hiện trọn 12 ô, không cắt chữ, không bị header che, cuộn được khi màn thấp.
  - U8: bỏ chữ lặp ("Đăng nhập để xem hội viên" hai lần); header dính không đè lên nội dung khi cuộn hay khi mở tấm.
  - P2/P3/P6: chữ nội dung ≥12px (nhãn trang trí bằng chữ in hoa thì ≥11px); chữ xám đạt tương phản ≥4,5:1 trên nền panel (đo bằng công cụ, sửa qua token màu theo `docs/24-light-theme-color-spec.md`); nút "Chọn phần này", "Chưa mở" cao ≥44px.
- Non-functional: giữ nguyên bố cục điện thoại đã nghiệm thu (390px); LCP không tăng quá 100ms; không thêm ảnh mới.

## Architecture
Chỉ sửa CSS và một ít markup lớp bọc. Ảnh nền và dấu triện đã có trong `apps/web/public/images/lasoviet/`. Giữ tên lớp `.fd109*` để không vỡ test hiện có.

## Related Code Files
- Modify: `apps/web/src/styles/free-result-read-first.css` (cột, độ rộng, cỡ chữ, nền lá số)
- Modify: `apps/web/src/features/ziwei/ziwei-free-result.tsx` (tấm phóng to lá số, lớp bọc lá số)
- Modify: `apps/web/src/features/ziwei/ziwei-chart.tsx` (thêm phần tử dấu triện/la kinh nếu cần markup)
- Modify: `apps/web/src/features/reports/paid-topic-selector-client.tsx` + CSS liên quan (vùng bấm, chữ lặp)
- Modify (nếu chữ xám chưa đạt): `apps/web/src/styles/tokens.css`
- Tests: `apps/web/src/features/ziwei/ziwei-free-result.test.tsx`; Playwright 390/1440 × sáng/tối × VI/EN (dùng lại bộ kiểm tra LSV-72/75)

## Implementation Steps
1. Chụp trang thật hiện tại ở 1440 và 390, sáng và tối, làm ảnh "trước".
2. Sửa U1 → U2 → U4 → U8 → P2/P3/P6, mỗi mục một commit.
3. Đo tương phản từng màu chữ xám trên nền panel; ghi bảng số đo.
4. Chạy bộ kiểm tra trình duyệt cũ (không lộ chữ khoá, không tràn ngang, focus/Escape) và đo LCP giả lập.
5. Dựng trang HTML "Trước – Sau": từng mục U1…P6 một hàng, hai ảnh cạnh nhau, chú thích một câu. Publish Artifact, gửi anh.
6. Anh duyệt → PR → An/Lãm merge → phát hành → kiểm tra trên trang thật.

## Success Criteria
- [ ] Lá số miễn phí có nền sơn mài, la kinh, dấu triện giống trang chủ.
- [ ] Desktop 1440 khớp bố cục bản mẫu FD-116 (anh xác nhận trên trang HTML).
- [ ] Tấm phóng to hiện đủ 12 ô ở 1280 và 1440.
- [ ] Không còn chữ nội dung <12px; mọi chữ thường ≥4,5:1; vùng bấm ≥44px.
- [ ] Bộ kiểm tra cũ vẫn đạt; LCP giả lập < 2,5 giây.

## Risk Assessment
- Nền ảnh làm chậm tải → ảnh đã có, dùng lại, không tải thêm; đo LCP trước và sau.
- Sửa token màu ảnh hưởng trang khác → chỉ đổi token dùng trên panel tối, chạy ảnh chụp trang chủ và trang đọc báo cáo để so.
