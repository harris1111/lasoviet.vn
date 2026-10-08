---
phase: 7
title: "Nghiệm thu và phát hành"
status: pending
priority: P1
effort: "2d (+ chạy sau mỗi đợt phát hành)"
dependencies: [2, 3, 4, 5, 6]
---

# Phase 7: Nghiệm thu và phát hành

## Overview
Kiểm tra toàn luồng sau mỗi đợt phát hành, đo hiệu quả bằng số liệu sạch, và gửi anh một trang HTML báo cáo nghiệm thu dễ đọc. Thêm so với bản cũ: kiểm **từng nút**, kiểm **chu kỳ thời gian theo từng người**, kiểm **chữ AI** (đúng lá số), và kiểm **năm tham số** qua ranh giới Tết.

## Requirements
- Functional:
  - Chạy lại 14 luồng kiểm thử tự động có sẵn (LSV-80) ở 390 và 1440; thêm luồng: khách đến từ đoạn Năm nay; khách đến từ một cung; khách mở tấm đọc thử ở tab 12 cung; khách mở tấm đọc thử chặng ở tab Đại vận; khách đổi tab/mở tấm (tức thì, Back/Forward đúng); khách đến lúc năm gần hết (thẻ đầu chuyển sang năm sau); khách thiếu Lá nạp trong tấm; khách xem tiền đồng ở bước xác nhận cuối.
  - **Kiểm nút bấm:** đối chiếu từng hàng của danh sách E2 (22 nhóm trang lá số) và E3 (14 nhóm trang chọn luận giải) trong nghiên cứu 03: hover, nhấn, focus, đã chọn, bị khoá, đang tải; ghi đạt/chưa từng dòng.
  - **Kiểm chu kỳ theo người:** 7 lá số tổng hợp (nam/nữ, nhiều năm sinh) × năm 2026/2027/2030/2035: đúng chặng, đúng cung chặng, đúng cung lưu niên, đúng điểm chặng (= điểm cung chặng đi qua); ngày 2027-01-15, 2027-02-05, 2027-02-06 cho đúng năm; không còn tháng hạn ép.
  - **Kiểm chữ AI:** 10 nhận định ngẫu nhiên mỗi bài, 10 bài, đối chiếu tay với lá số; không câu nào sai sự thật; tỉ lệ khối rơi về chữ quy tắc; chi phí/lá số; độ trễ.
  - **Kiểm tháng cần chú ý (R4):** không còn tháng ép; mọi tháng `warn` có tín hiệu engine và căn cứ; trang miễn phí và bản trả phí nói cùng tháng; báo cáo phân bố ≥200 lá số đã được anh duyệt; đối chiếu 3 lá số tay.
  - **Kiểm engine đại vận (R7):** bảng ≥30 lá số × 4 ngày mốc (gồm 2027-02-05 và 2027-02-06) không còn dòng lệch; Chặng 10 năm của khách thử khớp.
  - **Kiểm chữ AI tiếng Anh (R3):** làm lại phép kiểm 10 nhận định/bài cho một phần bài tiếng Anh; cảnh báo tăng trưởng trần ngày (R2) kích hoạt đúng bằng số liệu giả.
  - **Kiểm món mới (R1):** mỗi món mở bán có ghi 2–3 bài thử tay (ảnh chụp, Claude chấm) và kiểm tự động; Combo, gói cặp, chủ đề mới, Bát Tự, công cụ Hội viên (chỉ tài khoản thử), Hợp đôi (chỉ khi kết quả kiểm tra pháp lý đã ghi vào tracker thì kiểm cả luồng mua).
  - Kiểm trên trang thật sau phát hành: VI/EN, sáng/tối, Chromium/Firefox/WebKit, 360/390/430/1024/1280/1440.
  - Đo: LCP 4G giả lập <2,5 giây; không lộ chữ khoá; không giá trên thân trang; không tiền đồng ngoài bước xác nhận cuối; tương phản; vùng bấm.
  - **Số liệu sạch:** cửa sổ 7 ngày trước và 7 ngày sau phát hành, loại lượt thử nghiệm đã biết; so tỷ lệ: xem lá số → đọc hết miễn phí → mở tấm đọc thử → mở tấm mua → mua.
  - Anh thử trên điện thoại thật (nếu tiện); Sentry bắt lỗi lúc thử.
- Non-functional: không tạo dữ liệu thật trong cơ sở dữ liệu chính ngoài lá số thử có xoá ngay; dọn sạch môi trường thử; không bật SePay hay email thật.

## Related Code Files
- Modify: `tests/e2e/*` (thêm luồng mới ở trên), `apps/web/e2e/*`
- Modify: `docs/runbooks/funnel-dashboard.md` (cửa sổ sạch trước/sau)
- Create: `docs/qa/2026-10-xx-free-result-purchase-revamp.md`
- Create: `prototype/revamp-2026-10/nghiem-thu.html` (bản nguồn Artifact)

## Implementation Steps
1. Sau mỗi đợt GĐ2/3/4/5/6 phát hành: chạy bộ kiểm tra, ghi bằng chứng vào ticket Kaneo của giai đoạn đó.
2. Bắt đầu đếm cửa sổ 7 ngày sạch ngay khi GĐ2 phát hành (mốc "trước").
3. Khi GĐ4 và GĐ5 đã phát hành đủ 7 ngày: tính lại tỷ lệ phễu, so với mốc trước. Với từng món GĐ6 mở bán: ghi riêng tỷ lệ mua và tỷ lệ hoàn Lá.
4. Dựng trang HTML nghiệm thu: ảnh trang thật từng khổ, bảng đạt/chưa đạt, bảng nút bấm, số đo tốc độ, kết quả 7 lá số, kết quả chữ AI, biểu đồ phễu trước/sau, việc còn lại. Người điều phối publish, gửi anh.
5. Anh duyệt → chuyển các ticket Kaneo sang Done kèm bằng chứng.

## Success Criteria
- [ ] Bộ kiểm thử cũ + các luồng mới đạt ở mọi khổ.
- [ ] Bảng nút bấm: 0 dòng "chưa".
- [ ] 7 lá số × 4 năm đúng toàn bộ; năm tham số qua ranh giới Tết đúng.
- [ ] Chữ AI: 0 câu sai sự thật trong 100 nhận định đối chiếu tay (VI và một phần EN).
- [ ] Tháng cần chú ý: 0 tháng ép; bảng đại vận không dòng lệch.
- [ ] Mỗi món đã mở bán có bằng chứng 2–3 bài thử tay + kiểm tự động; Hội viên vẫn ẩn; Hợp đôi không bán nếu chưa có kết quả pháp lý.
- [ ] Trang thật khớp các bản mẫu anh đã duyệt.
- [ ] Có số liệu phễu trước/sau trên cửa sổ sạch (không điền số giả khi thiếu dữ liệu).
- [ ] Anh duyệt trang nghiệm thu; ticket Kaneo chuyển Done có bằng chứng.

## Risk Assessment
- Lưu lượng thấp, số liệu 7 ngày chưa đủ kết luận → ghi rõ số lượt, không kết luận khi quá ít; kéo dài cửa sổ nếu cần.
- Lẫn lượt thử nghiệm vào số liệu → đánh dấu phiên thử, loại khỏi báo cáo như runbook hiện có.
- Nhiều đợt phát hành chồng nhau làm khó quy nguyên nhân → ghi ngày phát hành từng đợt trên trang nghiệm thu, so riêng từng cửa sổ.
- Món GĐ6 mở sau làm số liệu phễu trôi → đo riêng từng món, không gộp.

## Trang HTML duyệt
`nghiem-thu.html`: ảnh trang thật từng khổ, bảng đạt/chưa đạt, bảng nút bấm, kết quả 7 lá số, kết quả chữ AI, số đo tốc độ, biểu đồ phễu trước/sau, danh sách lỗi đã sửa và việc còn lại. Anh làm gì: duyệt phát hành và cho phép kéo ticket sang Done; ghi chú chỗ còn muốn sửa.
