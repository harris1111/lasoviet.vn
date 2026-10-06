# Các mục cần bạn chốt — overnight 06/10/2026

Trả lời theo số là được. Không gửi token, mật khẩu hay dữ liệu khách hàng. Không cần duyệt lại API, model hoặc giá API.

**Đã chốt:** LSV68/71 Done theo nghiệm thu của bạn; SePay sandbox để sau; thông báo chỉ kiểm thử cô lập, chưa gửi khách thật; hội viên/Combo/Hợp đôi và PR197/231 tiếp tục giữ. LSV62 “Hôm nay” 60 Lá có yêu cầu triển khai đã duyệt: mình đang hoàn tất nghiệm thu mua/đọc/hoàn Lá, không cần bạn chọn lại giữa phần tặng và mở bán.

## 1. LSV75 — xem bản mẫu tổng quan dài

**Bối cảnh:** ticket và kế hoạch GĐ4 yêu cầu bạn xem bố cục một lần trước khi sửa giao diện chính. Bản mẫu mới có tổng quan nháp 1.228 chữ, một cung đọc trọn, đoạn năm/đại vận cắt giữa câu, phần mờ chỉ là hình khối và tấm mở tại chỗ. Điện thoại cuộn một trang; desktop có sáu tab và lá số ở cột trái. Chữ nháp dùng để đánh giá độ dài/bố cục, chưa phải bài đọc đã nghiệm thu.

**Xem:** [bản mẫu HTML](../../prototype/revamp-2026-09/la-so-ket-qua-v2-phase4-proposal.html), [điện thoại: tổng quan](../../plan/evidence/lsv75-prototype/proposal-390-overview.png), [điện thoại: đoạn khóa](../../plan/evidence/lsv75-prototype/proposal-390-cliffhanger.png), [desktop: tổng quan](../../plan/evidence/lsv75-prototype/proposal-1440-overview.png), [desktop: đoạn khóa](../../plan/evidence/lsv75-prototype/proposal-1440-cliffhanger.png). Tải/mở HTML cùng hai file CSS/JS cạnh nó để thử nút.

**Giải pháp/đề xuất:** duyệt bố cục này để mình triển khai tiếp và kiểm tra chất lượng/caching/ngân sách. Giữ giá trong tấm do người dùng chủ động mở; khi gói năm còn giữ, dùng Tử Vi trọn đời đang có. Không hứa “mở thêm insight” sau đăng nhập; giữ quà 60 Lá một lần và thời hạn dữ liệu khách 24 giờ. Mình chưa bật sinh nội dung miễn phí mới trong lúc chờ bước xem này.

**Trả lời:** duyệt bố cục / sửa ở …

## 2. LSV79 — lời nhắc trên trang đọc miễn phí

**Bối cảnh:** bản đã làm chỉ nhắc trên tài khoản, chọn luận giải và báo cáo đã mua. Kế hoạch cũ ghi “mọi trang”, còn quyết định đã duyệt giữ trang chủ/thân bài miễn phí không có giá.

**Giải pháp:** A) giữ phạm vi hiện tại; B) thêm một lời nhắc không có giá sau mốc đọc xong hoặc khi người dùng mở preview khóa. Đo doanh thu thu hồi còn cần nối nguồn click với đơn; bản ghi thử chưa được tính là gửi thật hoặc doanh thu.

**Đề xuất:** A trước.

**Trả lời:** A / B, vị trí …

## 3. LSV60/79 — có gửi thông báo cho khách thật không?

**Bối cảnh:** đợt này chỉ dùng dữ liệu thử cô lập. Việc gửi ra ngoài và nhóm người nhận chưa được duyệt; nhắc hạn tháng còn phụ thuộc gói năm đang giữ. Riêng nút “Báo tôi khi xong” vẫn cần nối đúng quyền đăng ký với báo cáo.

**Giải pháp/đề xuất:** giữ chưa gửi thật. Nếu muốn mở thử, chọn loại thông báo và nhóm tài khoản thử được phép nhận; vẫn kiểm tra đồng ý nhận và hủy đăng ký. Chưa cần đưa danh sách email lên Git.

**Trả lời:** giữ chưa gửi / cho gửi thử loại … tới nhóm …

## 4. LSV77 — kiểm tra QR trên điện thoại thật

**Bối cảnh:** nạp tại chỗ đã có kiểm thử trình duyệt và luồng máy chủ. Chuyển sang app ngân hàng/lưu QR trên điện thoại thật chưa được chứng minh; sandbox vẫn để sau theo bạn.

**Giải pháp/đề xuất:** giữ quét/copy QR hiện có; thử trên thiết bị thật khi bạn sẵn sàng. Liên kết mở app chỉ dùng danh sách ngân hàng được xác minh.

**Trả lời:** để sau / thiết bị …, app ngân hàng …

## 5. Các sản phẩm đang giữ — chỉ trả lời nếu muốn mở lại

**Bối cảnh:** hội viên, Combo, Hợp đôi và đợt nghiệm thu writer tháng/năm/chủ đề chưa được tự mở lại. Hội viên còn thiếu công cụ đã hứa.

**Đề xuất:** tiếp tục giữ. Nếu chọn làm hội viên tiếp, bắt đầu bằng một công cụ chọn ngày: cần chọn phương pháp/nguồn, dữ liệu nhập và đầu ra trước khi code; không giảm quyền lợi đã duyệt.

**Trả lời tùy chọn:** tiếp tục giữ / mở lại ticket …; công cụ hoặc nguồn …
