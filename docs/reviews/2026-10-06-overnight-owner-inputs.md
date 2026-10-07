# Các mục đã chốt — overnight 06/10/2026

**Đã duyệt ngày 07/10/2026:** bạn chọn toàn bộ đề xuất (FD-116): duyệt bố cục LSV75; LSV79 chọn A; giữ chưa gửi thông báo thật; SePay/điện thoại và các sản phẩm đang giữ tiếp tục để sau. Các mục dưới lưu bối cảnh và phương án đã duyệt, không phải câu hỏi đang chờ trả lời.

**Kaneo lúc chốt đề xuất (trước triển khai LSV75):** 0 To Do; 9 In Review (50, 58, 60, 63, 64, 65, 66, 77, 79); 75 In Progress, đang triển khai bản mẫu đã duyệt. Phần còn chờ của từng nhóm nằm ở các mục dưới.

**Đã chốt:** LSV68/71 Done theo nghiệm thu của bạn; SePay sandbox để sau; thông báo chỉ kiểm thử cô lập, chưa gửi khách thật; hội viên/Combo/Hợp đôi và PR197/231 tiếp tục giữ. LSV62 “Hôm nay” 60 Lá và bonus bảy ngày đã deploy/nghiệm thu, kéo Done: [bằng chứng ngắn](../../plan/evidence/lsv62-daily/published-acceptance.md). Không cần bạn chọn lại giữa phần tặng và mở bán.

## 1. LSV75 — xem bản mẫu tổng quan dài

**Bối cảnh:** ticket và kế hoạch GĐ4 yêu cầu bạn xem bố cục một lần trước khi sửa giao diện chính. Bản mẫu mới có tổng quan nháp 1.228 chữ, một cung đọc trọn, đoạn năm/đại vận cắt giữa câu, phần mờ chỉ là hình khối và tấm mở tại chỗ. Điện thoại cuộn một trang; desktop có sáu tab và lá số ở cột trái. Chữ nháp dùng để đánh giá độ dài/bố cục, chưa phải bài đọc đã nghiệm thu.

**Xem:** [bản mẫu HTML](../../prototype/revamp-2026-09/la-so-ket-qua-v2-phase4-proposal.html), [điện thoại: tổng quan](../../plan/evidence/lsv75-prototype/proposal-390-overview.png), [điện thoại: đoạn khóa](../../plan/evidence/lsv75-prototype/proposal-390-cliffhanger.png), [desktop: tổng quan](../../plan/evidence/lsv75-prototype/proposal-1440-overview.png), [desktop: đoạn khóa](../../plan/evidence/lsv75-prototype/proposal-1440-cliffhanger.png). Tải/mở HTML cùng hai file CSS/JS cạnh nó để thử nút.

**Giải pháp/đề xuất:** duyệt bố cục này để mình triển khai tiếp và kiểm tra chất lượng/caching/ngân sách. Giữ giá trong tấm do người dùng chủ động mở; khi gói năm còn giữ, dùng Tử Vi trọn đời đang có. Không hứa “mở thêm insight” sau đăng nhập; giữ quà 60 Lá một lần và thời hạn dữ liệu khách 24 giờ. Mình chưa bật sinh nội dung miễn phí mới trong lúc chờ bước xem này.

**Trả lời:** duyệt bố cục / sửa ở …

## 2. LSV79 — lời nhắc trên trang đọc miễn phí

**Bối cảnh:** bản đã làm chỉ nhắc trên tài khoản, chọn luận giải và báo cáo đã mua. Kế hoạch cũ ghi “mọi trang”, còn quyết định đã duyệt giữ trang chủ/thân bài miễn phí không có giá.

**Giải pháp:** A) giữ phạm vi hiện tại; B) thêm một lời nhắc không có giá sau mốc đọc xong hoặc khi người dùng mở preview khóa. [Ghi nhận click](../../plan/evidence/lsv79-click/published-acceptance.md) đã deploy/nghiệm thu: đúng người dùng, đúng đơn, không tự trả tiền hoặc trừ Lá. [Đối soát click → đơn nạp → Lá đã dùng](../../plan/evidence/lsv79-financial/published-acceptance.md) cũng đã deploy/nghiệm thu bằng dữ liệu giả, giữ riêng tiền nạp và giá trị phân bổ từ đúng đơn. Chưa gửi nhắc khách thật hoặc tính các số thử thành doanh thu thật.

**Đề xuất:** A trước.

**Trả lời:** A / B, vị trí …

## 3. LSV60/79 — có gửi thông báo cho khách thật không?

**Bối cảnh:** [nghiệm thu email thử](../../plan/evidence/lsv60-capture/published-services-acceptance.md) đã pass: biên 5 phút/48 giờ, không gửi trùng, chặn khi hủy đăng ký/xóa dữ liệu/thu hồi quyền. Thư chỉ vào hộp Mailpit cô lập, chưa gửi khách thật. Nhắc hạn tháng còn phụ thuộc gói năm đang giữ.

**Giải pháp/đề xuất:** giữ chưa gửi thật. Nếu muốn mở thử, chọn loại thông báo và nhóm tài khoản thử được phép nhận; vẫn kiểm tra đồng ý nhận và hủy đăng ký. Chưa cần đưa danh sách email lên Git.

**Trả lời:** giữ chưa gửi / cho gửi thử loại … tới nhóm …

**Nút “Báo tôi khi xong”:** đã triển khai, deploy và [nghiệm thu đăng ký/hủy/capture](../../plan/evidence/lsv60-subscription/published-acceptance.md); không cần bạn duyệt lại yêu cầu GĐ7. Đăng ký gắn với đúng báo cáo, dùng chung chống gửi trùng; hủy chỉ hủy yêu cầu nhắc riêng, không hủy email tự động của đơn mua. Chỉ cần bạn nói thêm nếu muốn đổi toàn bộ email hoàn tất thành bắt buộc bấm nút mới gửi.

## 4. LSV50/77 — kiểm tra thanh toán và QR trên điện thoại thật

**Bối cảnh:** nạp tại chỗ đã có kiểm thử trình duyệt và luồng máy chủ. Chuyển sang app ngân hàng/lưu QR trên điện thoại thật chưa được chứng minh; sandbox vẫn để sau theo bạn.

**Giải pháp/đề xuất:** giữ quét/copy QR hiện có; thử trên thiết bị thật khi bạn sẵn sàng. Liên kết mở app chỉ dùng danh sách ngân hàng được xác minh.

**Trả lời:** để sau / thiết bị …, app ngân hàng …

## 5. Các sản phẩm đang giữ — chỉ trả lời nếu muốn mở lại

**Bối cảnh:** hội viên, Combo, Hợp đôi và đợt nghiệm thu writer tháng/năm/chủ đề chưa được tự mở lại. Hội viên còn thiếu công cụ đã hứa.

**Đề xuất:** tiếp tục giữ. Nếu chọn làm hội viên tiếp, bắt đầu bằng một công cụ chọn ngày: cần chọn phương pháp/nguồn, dữ liệu nhập và đầu ra trước khi code; không giảm quyền lợi đã duyệt.

**Trả lời tùy chọn:** tiếp tục giữ / mở lại ticket …; công cụ hoặc nguồn …
