# Kế hoạch đưa các ticket In Review sang Done — 05/10/2026

Nguồn: đọc toàn bộ comment của 18 ticket còn In Review trên Kaneo (LSV-51 đã chuyển Done hôm nay). Quy tắc: chỉ Done khi có bằng chứng deploy/smoke; không dùng mô phỏng để thay thanh toán thật, máy thật hay chất lượng AI thật.

## A. Claude làm trực tiếp được (không cần anh, An hay tiền thật)

| # | Việc | Ticket có thể Done | Cách làm | Điều kiện Done |
|---|---|---|---|---|
| A1 | Đối chiếu tiêu chí của LSV-54 với bằng chứng đã có: 12 luồng CI (mua cung 120 Lá, đoạn trích 240, rollover 720), PR #290 (kiểm nguồn/riêng tư/đếm cung của trang đọc) | LSV-54 | Đọc `docs/qa/2026-10-04-lsv80-*.md`, `lsv61-*.md`, test PR #290; lập bảng "tiêu chí → test/bằng chứng". Chỉ nếu đủ 3 ý: dùng chung một lần tạo, trang đọc chỉ hiện đúng cung đã mua, chặn PDF một phần | Bảng phủ hết tiêu chí. Thiếu ý nào thì viết thêm test CI cho ý đó (Sonnet viết, Opus review), deploy, rồi Done |
| A2 | Đóng LSV-53 theo phạm vi đã chốt (xem câu hỏi ở mục C) | LSV-53 | Ghi comment phân định: phần AI cá nhân hoá chuyển hẳn sang LSV-71/75; phần che mờ + khung đọc trước + banner 24 giờ đã deploy và smoke ngày 1/10 | Anh đồng ý phạm vi, sau đó em chuyển Done |
| A3 | Ngân sách chiến dịch AI: viết khoá ngân sách bền, đặt trước khi gửi, và giới hạn số lần gọi lại cho cả request | Gỡ blocker của LSV-71, 68, 58, 63, 62 (chưa tới Done) | Code theo yêu cầu của An (comment 4/10): đặt trước 200.000 VND gồm chạy lại, dừng khi chạm trần, test trên PostgreSQL thật. Sonnet viết, Opus review | PR merge, CI xanh, deploy, smoke với nhà cung cấp giả |
| A4 | Rà lại các ticket đã xong phần mình: dọn bảng, ghi comment tình trạng thật cho từng ticket | Không ticket nào | Một comment tổng hợp "đã xong gì, còn chặn gì" trên từng ticket để lần sau khỏi đọc lại | Comment đã đăng |
| A5 | Chuẩn bị gói nghiệm thu máy thật cho anh | LSV-72, 73, 80 (anh làm bước cuối) | Rút gọn checklist đã có trong `docs/reviews/2026-10-04-nghiem-thu-con-lai.md` thành một trang một màn hình; có ô điền kết quả | Anh có file để điền khi thử |

Lưu ý khi làm A3: theo quy tắc của anh, code production do Sonnet viết, Opus chỉ review. Việc không đụng giao diện nên không cần báo trước về mobile-first.

## B. Làm được một phần, phần còn lại bị chặn

| Ticket | Em làm được | Còn lại chặn bởi |
|---|---|---|
| LSV-78 | Nhắc khách quay lại và khôi phục trong ứng dụng (code, tắt mặc định) | Gửi email thật và phần đo doanh thu khôi phục thật |
| LSV-79 | Phần nhắc sau khi xem lá số xong chưa mua | Như trên, cộng số liệu có phân loại khách |
| LSV-60 | Giữ nguyên phần đã xong (nhắc chờ nạp, nurture) | Email nhắc tháng hạn phụ thuộc LSV-63. Gửi email thật chưa được bật |
| LSV-70 | Không còn việc em làm riêng | Chờ LSV-71 |
| LSV-71, 68 | A3 (khoá ngân sách, giới hạn gọi lại) | Dữ liệu phí đầy đủ từ broker, anh đọc 5 bản luận giải thật |

## C. Chưa làm được: ghi chú cho anh

1. **LSV-50 (nạp Lá thật):** cần mở SePay sandbox hoặc thật. Anh đã hoãn SePay. Vì vậy LSV-50 chặn cả LSV-77. Muốn Done thì cần anh cho phép mở SePay thử.
2. **LSV-72, 73, 80:** anh thử Google, Safari và 4G trên điện thoại thật. Em chuẩn bị file ở A5 nhưng không thể thay anh.
3. **LSV-58, 62, 63 (nội dung cần chạy thật 20 lần mỗi loại, 40 lần cho 58 và 63):** cần anh duyệt ngân sách số tiền và model cho đợt thử (đã duyệt 200.000 VND và `ag/gemini-3.8-flash` ở mức tổng thể; em cần xác nhận phân bổ giữa các loại), và anh đọc nội dung. Cũng cần A3 xong và broker trả phí đầy đủ.
4. **LSV-64 (hội viên), LSV-65 (combo):** anh đã giữ không bán. Mở bán cần anh quyết (A: giữ nguyên và chọn công cụ trả phí cần làm trước; B: thu nhỏ gói hội viên). LSV-65 còn phụ thuộc LSV-63 và 68.
5. **LSV-66 (hợp đôi):** hoãn theo quyết định của anh, cần BaZi. Chưa có phương pháp BaZi chọn; cần anh chọn có ưu tiên làm hay không.
6. **LSV-53:** anh xác nhận hai điều: (a) phần AI cá nhân hoá của "magnet" được chuyển hẳn sang LSV-71/75; (b) em được Done phần che mờ + khung đọc trước đã chạy thật.
7. **Gửi email thật (LSV-60, 78, 79):** hiện ở chế độ ghi nhận, không gửi. Cần anh cho phép bật gửi thật và chọn nhóm nhận.

## Thứ tự thực thi đề xuất

1. A1 và A2 trước vì chỉ đọc và đối chiếu, nhanh, có thể đóng hai ticket ngay.
2. A5 và A4 cùng lúc.
3. A3 (có code) sau khi anh duyệt kế hoạch này.

Mỗi PR đi theo quy trình FD-097: nhánh ngắn, PR vào `master`, test xanh, chờ anh hoặc Lãm duyệt mới merge.
