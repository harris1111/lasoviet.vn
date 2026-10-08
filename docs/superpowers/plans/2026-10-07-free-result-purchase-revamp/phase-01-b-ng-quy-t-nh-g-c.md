---
phase: 1
title: "Quyết định vòng 2"
status: done
priority: P1
effort: "0.5d"
dependencies: []
---

# Phase 1: Quyết định vòng 2

## Overview
Vòng 1 (10 câu Q1–Q10) anh đã trả lời ngày 07/10 và đã ghi thành FD-117. **Vòng 2 (13 câu R1–R13) anh đã trả lời ngày 08/10 và đã ghi thành FD-118** (bảng kết quả bên dưới). Giai đoạn này là **vòng 2**: một trang HTML duy nhất cho anh (1) xem lại điều đã chốt, (2) đọc điều nghiên cứu tìm ra, (3) hiểu lại Q4 bằng chuyện đời thường, (4) xem dải sản phẩm đề xuất và hình minh hoạ, (5) lấy brief ảnh để nhờ ChatGPT vẽ, (6) trả lời **13 câu còn mở** (R1–R13), (7) xem ai làm gì theo thứ tự.

Nguồn trang: `prototype/revamp-2026-10/ke-hoach-v2-duyet.html` (Claude dựng; người điều phối publish thành Artifact riêng tư). Lựa chọn lưu vào bộ nhớ chung của Artifact, collection `answers2`, mỗi câu một bản ghi theo mã (R1…R13).

## Requirements
- Functional: mỗi câu có bối cảnh 2–3 dòng, đề xuất, các phương án, nút Đồng ý / Không / Sửa và ô ghi chú; lưu lại để Claude đọc được (khả năng lưu dữ liệu của Artifact, không dùng bộ nhớ trình duyệt làm nguồn thật).
- Non-functional: đọc được trên điện thoại 390 và máy tính; chữ thường ngày, không thuật ngữ, không đường dẫn tệp; lá số mẫu tổng hợp, không dữ liệu cá nhân thật; không ảnh ngoài (hình minh hoạ dựng bằng HTML/CSS).

## Kết quả vòng 2 (FD-118, 08/10)

| Mã | Anh chốt | Ảnh hưởng |
|---|---|---|
| R1 | **Đồng ý + ghi chú:** bỏ luật 20 bài thật liên tiếp; mỗi món 2–3 bài thử tay (anh + đồng nghiệp, ảnh chụp gửi Claude chấm); xây mã cho TẤT CẢ sản phẩm ngay; UX/UI = anh + Claude, mã backend = ticket An | GĐ6 |
| R2 | Đồng ý: 3.000đ/lá số, 50.000đ/ngày; **cảnh báo khi lượng khách tăng để nâng trần ngày** | GĐ3 |
| R3 | Tiếng Anh cùng quy tắc với tiếng Việt (cá nhân hoá, chuyên gia, tư vấn/đồng hành/tâm tình); chỉ cấm điều luật cấm và điều sai sự thật; AI viết cả VI và EN | GĐ3 |
| R4 | **KHÔNG ép tháng cần chú ý**: phải do engine tính thật, quy tắc nhiều tín hiệu, "đào sâu engine" | GĐ2 (BE), GĐ4, GĐ6 |
| R5 | Đồng ý: 12 ô tháng, ô cần chú ý có dấu khoá | GĐ4 |
| R6 | Đồng ý: một trang cuộn + thanh 5 chip dính | GĐ4 |
| R7 | Đồng ý 360 Lá + **kiểm tra engine đại vận thật kỹ cho mọi lá số** | GĐ5, GĐ6 |
| R8 | Đồng ý: gần Tết thẻ đầu sang năm sau; gói cặp 780 làm sau | GĐ5, GĐ6 |
| R9 | Đồng ý: Combo "Trọn đời + Năm [Y]" 1.300; khấu trừ 7 ngày giữ | GĐ6 |
| R10 | **KHÔNG hoãn**: Hội viên giữ "sắp ra mắt" **và** xây công cụ Hội viên ngay | GĐ5 (ẩn), GĐ6 |
| R11 | **KHÔNG hoãn**: xây cả Hợp đôi và Bát Tự; Hợp đôi không cần người kia đồng ý; **cờ pháp lý Nghị định 13/2023/NĐ-CP, anh kiểm tra** | GĐ6 |
| R12 | **KHÔNG hoãn**: làm ngay chủ đề kế tiếp theo gợi ý Claude + từ khoá Google trong repo (`research/05`) | GĐ6 |
| R13 | Đồng ý: làm ở đợt hoàn thiện, không chặn việc khác | GĐ6 |

## Các câu đã đặt trên trang (đề xuất ban đầu, để tham chiếu)

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
4. (Xong 08/10) Ghi FD-118 vào tracker; thay chữ cũ mâu thuẫn trong plan; cập nhật phạm vi GĐ3–7 theo câu trả lời.
5. Tạo ticket Kaneo: **mỗi mục `BE-Px-n` của `research/04-ticket-be-cho-an.md` là một ticket cho An** (P0 trước), và một ticket cho mỗi GĐ2–7 phần giao diện. Lãm hoặc người điều phối tạo; Claude không gọi Kaneo.

## Success Criteria
- [x] Anh trả lời đủ R1–R13 trên trang (08/10).
- [x] FD-118 có trong tracker, ghi rõ từng mục.
- [x] `research/04-ticket-be-cho-an.md` viết lại: không còn mục "chờ" nào; thêm BE-P0-8 và các ticket mới.
- [x] Phase 3–7 cập nhật theo câu trả lời.
- [ ] Ticket Kaneo được tạo cho An (P0 trước).

## Risk Assessment
- Rủi ro còn lại sau vòng 2: (a) Hợp đôi cần kết quả kiểm tra pháp lý trước khi bán; (b) cổng nội dung thu hẹp (chỉ luật + sai sự thật) cần anh liệt kê điều luật thực sự cấm; (c) phạm vi xây rất lớn (nhiều món + hai hệ). Cách giảm: xem GĐ6.
- Câu R2 đã đóng: trần và giá tính tiền đã chốt; không còn câu mở về tiền AI (FD-116 "không hỏi lại" được giữ).

## Trang HTML duyệt
`ke-hoach-v2-duyet.html` (đã duyệt 08/10: https://claude.ai/artifact/Vfah8jkp58aqnfUn9D5rRu). Ba ảnh ChatGPT theo brief đã được duyệt và xử lý (xem mục Tài sản hình ảnh trong `plan.md`).
