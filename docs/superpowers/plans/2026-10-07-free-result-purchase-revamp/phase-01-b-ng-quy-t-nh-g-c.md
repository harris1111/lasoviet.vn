---
phase: 1
title: "Quyết định vòng 2"
status: page-ready
priority: P1
effort: "0.5d"
dependencies: []
---

# Phase 1: Quyết định vòng 2

## Overview
Vòng 1 (10 câu Q1–Q10) anh đã trả lời ngày 07/10 và đã ghi thành FD-117. Giai đoạn này là **vòng 2**: một trang HTML duy nhất cho anh (1) xem lại điều đã chốt, (2) đọc điều nghiên cứu tìm ra, (3) hiểu lại Q4 bằng chuyện đời thường, (4) xem dải sản phẩm đề xuất và hình minh hoạ, (5) lấy brief ảnh để nhờ ChatGPT vẽ, (6) trả lời **13 câu còn mở** (R1–R13), (7) xem ai làm gì theo thứ tự.

Nguồn trang: `prototype/revamp-2026-10/ke-hoach-v2-duyet.html` (Claude dựng; người điều phối publish thành Artifact riêng tư). Lựa chọn lưu vào bộ nhớ chung của Artifact, collection `answers2`, mỗi câu một bản ghi theo mã (R1…R13).

## Requirements
- Functional: mỗi câu có bối cảnh 2–3 dòng, đề xuất, các phương án, nút Đồng ý / Không / Sửa và ô ghi chú; lưu lại để Claude đọc được (khả năng lưu dữ liệu của Artifact, không dùng bộ nhớ trình duyệt làm nguồn thật).
- Non-functional: đọc được trên điện thoại 390 và máy tính; chữ thường ngày, không thuật ngữ, không đường dẫn tệp; lá số mẫu tổng hợp, không dữ liệu cá nhân thật; không ảnh ngoài (hình minh hoạ dựng bằng HTML/CSS).

## Các câu trên trang (đã bỏ mọi điều anh đã chốt ở vòng 1)

| Mã | Câu hỏi | Đề xuất | Ảnh hưởng |
|---|---|---|---|
| R1 | Ngân sách thử chất lượng 20 bài cho Năm, Chặng, Tình duyên, Công việc, Tháng | Duyệt từng món theo thứ tự, trần riêng, dừng ở lỗi đầu | GĐ6 |
| R2 | Tiền cho AI viết chữ miễn phí (trần lá số, trần ngày, bảng giá tính tiền, ngân sách thử) | Giữ 3.000đ/lá số và 50.000đ/ngày; tính theo giá đã duyệt 06/10; thử ≤180.000đ | GĐ3 |
| R3 | Bốn nguyên tắc chữ AI (chỉ tiếng Việt; không gửi tên khách; "tôi" ≤2 lần; danh sách từ cấm riêng) | Đồng ý | GĐ3 |
| R4 | Tháng "cần chú ý" đang bị ép | Bỏ, nói thật | GĐ2 (BE), GĐ4 |
| R5 | Dải 12 ô tháng có đánh dấu tháng cần chú ý không | Có, ô khoá theo thứ tự | GĐ4 |
| R6 | Điện thoại: một trang cuộn + thanh chip, hay tab thật | Một trang cuộn + chip | GĐ4 |
| R7 | Giá và phạm vi món "Chặng 10 năm của bạn" | 360 Lá | GĐ6, GĐ5 |
| R8 | Gần Tết: thẻ đầu chuyển sang năm sau; gói cặp "Năm nay + năm sau" | Đồng ý cả hai (gói cặp làm sau) | GĐ5, GĐ6 |
| R9 | Combo đổi nghĩa "Trọn đời + Năm [Y]"; khấu trừ 7 ngày | Giữ 1.300; không mở rộng khấu trừ lúc đầu | GĐ6 |
| R10 | Hội viên | Giữ ẩn; chọn công cụ khi sẵn sàng | ngoài plan |
| R11 | Hợp đôi, Bát Tự, Tây phương | Hoãn (chưa có engine) | ngoài plan |
| R12 | Thêm chủ đề và tầng "từng tuổi" | Sau khi hai chủ đề đầu qua cổng | ngoài plan |
| R13 | Cục, Mệnh chủ, Thân chủ, nạp âm giữa lá số | Làm ở đợt hoàn thiện, không chặn phần khác | GĐ4/GĐ6 |

Những điều **đã mặc định, không hỏi lại** (ghi trên trang ở mục "Đã tìm ra gì"): tham số hoá năm; sửa tính năm tương lai và ranh giới Tết; sửa `daily.headline`; nói thật khi dùng Trọn đời cho khách tò mò năm; điểm chặng = điểm cung chặng đi qua.

## Related Code Files
- Create: `prototype/revamp-2026-10/ke-hoach-v2-duyet.html` (bản nguồn Artifact; đã dựng)
- Create: `docs/superpowers/plans/2026-10-07-free-result-purchase-revamp/research/04-ticket-be-cho-an.md` (ticket An; đã viết)
- Modify (sau khi anh trả lời): `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md` (thêm FD-118 cho R1–R13)
- Modify: `docs/reviews/2026-10-07-hop-ux-ui-luong-mua-luan-giai.md` (ghi kết quả)

## Implementation Steps
1. (Xong) Dựng trang theo bảng trên từ ba bản nghiên cứu; kiểm cú pháp JavaScript.
2. Người điều phối publish Artifact riêng tư và gửi link cho anh. Claude **không** tự publish trong bước dựng.
3. Anh trả lời R1–R13; Claude đọc bộ nhớ chung (collection `answers2`).
4. Ghi FD-118 vào tracker; xoá chữ cũ mâu thuẫn; cập nhật phạm vi GĐ5–6 theo câu trả lời (bỏ việc anh nói Không).
5. Tạo ticket Kaneo: một ticket cho mỗi nhóm P0/P1/P2 của An (lấy từ `research/04-ticket-be-cho-an.md`) và một ticket cho mỗi GĐ2–7 phần giao diện.

## Success Criteria
- [ ] Anh trả lời đủ R1–R13 trên trang.
- [ ] FD-118 có trong tracker, ghi rõ từng mục Đồng ý / Không / Sửa.
- [ ] Ticket An đã cập nhật: mục chờ quyết định nào được mở khoá.
- [ ] Phase 5–6 cập nhật theo câu trả lời.

## Risk Assessment
- Anh bận, trả lời chậm → các việc P0 của An (không chờ quyết định) và GĐ2 vẫn chạy; câu nào chưa trả lời dùng đề xuất mặc định **chỉ khi anh nói "làm theo đề xuất"**.
- Câu khó hiểu → mỗi câu có 2–3 dòng bối cảnh và đề xuất; câu liên quan tiền AI viết bằng số tiền cụ thể.
- Câu R2 chạm chủ đề giá AI mà FD-116 dặn "không hỏi lại": nó khác ở chỗ đây là phạm vi **mới** (AI viết cả bài miễn phí), không phải cấu hình API cũ; trang ghi rõ điều này.

## Trang HTML duyệt
`ke-hoach-v2-duyet.html`. Anh làm gì: đọc 8 mục, bấm Đồng ý / Không / Sửa cho 13 câu, ghi chú ở ô bên dưới nếu muốn khác; bấm "Sao chép" ở brief ảnh rồi dán vào ChatGPT.
