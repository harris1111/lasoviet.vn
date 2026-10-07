---
phase: 6
title: "Nghiệm thu và phát hành"
status: pending
priority: P1
effort: "1.5d"
dependencies: [2, 3, 4, 5]
---

# Phase 6: Nghiệm thu và phát hành

## Overview
Kiểm tra toàn luồng sau mỗi đợt phát hành, đo hiệu quả bằng số liệu sạch, và gửi anh một trang HTML báo cáo nghiệm thu dễ đọc.

## Requirements
- Functional:
  - Chạy lại 14 luồng kiểm thử tự động có sẵn (LSV-80) ở 390 và 1440; thêm luồng: khách đến từ đoạn năm 2026, khách đến từ một cung, khách mở tấm đọc thử ở tab 12 cung.
  - Kiểm tra trên trang thật sau phát hành: VI/EN, sáng/tối, Chromium/Firefox/WebKit, 360/390/430/1024/1280/1440.
  - Đo: LCP 4G giả lập < 2,5 giây; không lộ chữ khoá; không giá trên thân; tương phản; vùng bấm.
  - **Số liệu sạch**: cửa sổ 7 ngày trước và 7 ngày sau phát hành, loại lượt thử nghiệm đã biết; so tỷ lệ: xem lá số → đọc hết miễn phí → mở tấm đọc thử → mở tấm mua → mua.
  - Anh thử trên điện thoại thật (nếu tiện); Sentry để bắt lỗi trong lúc thử.
- Non-functional: không tạo dữ liệu thật trong cơ sở dữ liệu chính ngoài lá số thử có xoá ngay; dọn sạch môi trường thử.

## Related Code Files
- Modify: `tests/e2e/*` (thêm 3 luồng mới)
- Modify: `docs/runbooks/funnel-dashboard.md` (cửa sổ sạch trước/sau)
- Create: `docs/qa/2026-10-xx-free-result-purchase-revamp.md`
- Create: `prototype/revamp-2026-10/nghiem-thu.html` (bản nguồn Artifact)

## Implementation Steps
1. Sau mỗi đợt GĐ2/3/4/5 phát hành: chạy bộ kiểm tra, ghi bằng chứng vào ticket Kaneo của giai đoạn đó.
2. Bắt đầu đếm cửa sổ 7 ngày sạch ngay khi GĐ2 phát hành (đó là mốc "trước").
3. Khi GĐ4 và GĐ5 đã phát hành đủ 7 ngày: tính lại tỷ lệ phễu, so với mốc trước.
4. Dựng trang HTML nghiệm thu: ảnh trang thật từng khổ, bảng đạt/chưa đạt, số đo tốc độ, biểu đồ phễu trước/sau, việc còn lại. Publish Artifact, gửi anh.
5. Anh duyệt → chuyển các ticket Kaneo sang Done kèm bằng chứng.

## Success Criteria
- [ ] Bộ kiểm thử cũ + 3 luồng mới đạt ở mọi khổ.
- [ ] Trang thật khớp các bản mẫu anh đã duyệt.
- [ ] Có số liệu phễu trước/sau trên cửa sổ sạch (không điền số giả khi thiếu dữ liệu).
- [ ] Anh duyệt trang nghiệm thu; ticket Kaneo chuyển Done có bằng chứng.

## Risk Assessment
- Lưu lượng thấp, số liệu 7 ngày chưa đủ kết luận → ghi rõ số lượt, không kết luận khi quá ít; kéo dài cửa sổ nếu cần.
- Lẫn lượt thử nghiệm vào số liệu → đánh dấu phiên thử, loại khỏi báo cáo như runbook hiện có.
