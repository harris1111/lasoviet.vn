---
phase: 1
title: "Bảng quyết định gốc"
status: pending
priority: P1
effort: "0.5d"
dependencies: []
---

# Phase 1: Bảng quyết định gốc

## Overview
Một trang HTML gom 10 quyết định còn mở từ biên bản họp (nhóm B và C). Anh bấm chọn ngay trên trang; kết quả thành FD-117 và quyết định phạm vi của giai đoạn 3–5.

## Requirements
- Functional: mỗi câu hỏi có bối cảnh 2–3 dòng, ảnh hiện tại (cắt từ ảnh anh gửi), phác hoạ phương án đề xuất, nút Đồng ý / Không / Sửa và ô ghi chú. Lựa chọn được lưu lại để Claude đọc được (dùng khả năng lưu dữ liệu của Artifact, không dùng bộ nhớ trình duyệt).
- Non-functional: đọc được trên điện thoại; ngôn ngữ thường, không thuật ngữ; không có dữ liệu cá nhân thật.

## Các câu hỏi trên trang

| Mã | Câu hỏi | Đề xuất của hội đồng | Ảnh hưởng tới |
|---|---|---|---|
| Q1 | Ẩn mọi món "Sắp mở/Sắp có" (kể cả tab Hội viên) khỏi trang chọn luận giải? | Đồng ý | GĐ5 |
| Q2 | Bỏ tab "Căn cứ"; đưa căn cứ vào cạnh từng nhận định? | Đồng ý | GĐ4 |
| Q3 | Thứ tự tab mới: **Tổng quan (có lá số) → Năm nay → Đại vận → 12 cung → Chủ đề**; khối chi tiết cung không lặp ở mọi tab (sửa FD-109e)? | Đồng ý | GĐ4 |
| Q4 | Các hàng "Chưa mở" mở được tấm đọc thử của chính lá số; giá chỉ nằm trong tấm (đúng FD-110)? | Đồng ý | GĐ3, GĐ4 |
| Q5 | Khách tò mò năm 2026: (a) giữ bán Trọn đời 960 Lá, nói rõ "phần năm 2026 nằm trong Trọn đời"; hay (b) mở bán Vận hạn 2026 480 Lá (cần chạy chất lượng LSV-63 trước) | (a) ngay; (b) khi LSV-63 đạt | GĐ5 |
| Q6 | Ghi thêm giá tiền đồng cạnh giá Lá trong tấm mở khoá (ví dụ "960 Lá ≈ 86.000đ") — sửa FD-065? | Đồng ý, chỉ trong tấm, không trên thân trang | GĐ5 |
| Q7 | Biểu đồ mạng nhện 12 cung: (a) giữ, (b) thu nhỏ vào tab 12 cung, (c) thay bằng "3 cung mạnh nhất / 3 cung cần lưu tâm" | (c) | GĐ4 |
| Q8 | Thêm "Đường đời 10 năm" (cột theo từng đại vận) dùng điểm cấu trúc có công thức công bố như FD-107; nới FD-063 cho đại vận? | Đồng ý, kèm hộp "Điểm này tính thế nào" | GĐ3, GĐ4 |
| Q9 | Chữ tổng quan miễn phí: (a) viết lại bằng engine quy tắc (không tốn tiền AI); (b) AI viết theo trần 3.000đ/lá số, 50.000đ/ngày đã có | (a) trước, (b) để sau khi đo | GĐ3 |
| Q10 | Thẻ gói, lá số, tấm mở khoá dùng "hai lớp viền" và nút viên có mũi tên (theo `high-end-visual-design`)? | Đồng ý | GĐ4, GĐ5 |

## Related Code Files
- Create: `prototype/revamp-2026-10/quyet-dinh-ux-2026-10.html` (bản nguồn của Artifact)
- Modify: `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md` (thêm FD-117, đánh dấu phần bị thay thế của FD-065/109/116)
- Modify: `docs/reviews/2026-10-07-hop-ux-ui-luong-mua-luan-giai.md` (ghi kết quả)

## Implementation Steps
1. Nạp `artifact-design` và `artifact-capabilities`; dựng trang theo bảng trên, mỗi câu một thẻ, ảnh minh hoạ lấy từ ảnh anh gửi (đã che tên/ngày sinh) và phác hoạ bằng HTML/CSS.
2. Publish Artifact riêng tư, gửi link cho anh.
3. Khi anh xong: đọc lại lựa chọn, ghi FD-117 vào tracker, sửa chữ cũ mâu thuẫn trong spec FD-109 và tài liệu liên quan.
4. Cập nhật phạm vi GĐ3–5 theo lựa chọn (bỏ việc anh nói Không).
5. Tạo ticket Kaneo cho GĐ2–6.

## Success Criteria
- [ ] Anh trả lời đủ Q1–Q10 trên trang.
- [ ] FD-117 có trong tracker, ghi rõ từng mục đồng ý/không.
- [ ] Phase 3–5 cập nhật theo câu trả lời.

## Risk Assessment
- Anh bận, trả lời chậm → GĐ2 không phụ thuộc nên vẫn chạy; GĐ3–5 dùng đề xuất mặc định nếu anh nói "làm theo đề xuất".
- Câu hỏi khó hiểu → mỗi câu có ảnh trước/sau, không có thuật ngữ.
