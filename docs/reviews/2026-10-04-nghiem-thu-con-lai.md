# Nghiệm thu còn lại — 04/10/2026

Bản ngắn để bạn trả lời; [file chi tiết](2026-10-03-owner-inputs.md) giữ các quyết định và bối cảnh. Các đề xuất đã được duyệt không cần duyệt lại. Trạng thái triển khai mới nhất được cập nhật trên Kaneo; file này chỉ giữ các việc cần bạn trả lời. Không ghi mật khẩu, token, cookie, dữ liệu sinh hay thông tin ngân hàng vào Git.

## Bối cảnh cho phần bạn nghiệm thu

- LSV52 (khấu trừ nâng cấp), LSV61 (đọc/nâng cấp trong bài), LSV76 (bảng mở khóa), LSV81 (Sentry): đã deploy, nghiệm thu và Done.
- LSV79: nhắc đơn nạp đang chờ chỉ ghi nhận trong môi trường thử; PR [289](https://github.com/harris1111/lasoviet.vn/pull/289) đã deploy/nghiệm thu. Còn nhắc lá số và tiếp tục mua trong ứng dụng; chưa gửi thật.
- LSV80: 12 luồng chuẩn mobile/desktop chạy trong CI qua PR [288](https://github.com/harris1111/lasoviet.vn/pull/288), đã deploy/nghiệm thu. Chưa thay thế kiểm thử nhà cung cấp và thiết bị thật.
- LSV61: PR [290](https://github.com/harris1111/lasoviet.vn/pull/290) đã deploy và nghiệm thu 4 màn hình mobile/desktop, bảo vệ nội dung khóa và nâng cấp đúng 720 Lá. Done trên Kaneo.
- LSV71/68: PR [291](https://github.com/harris1111/lasoviet.vn/pull/291) đã deploy/nghiệm thu 50 trường hợp giả lập về phí. Dữ liệu phí thiếu hoặc bị broker biến đổi giữ trạng thái chưa xác định; vẫn chờ kiểm chứng nhà cung cấp thật trước khi chạy bộ chất lượng.

## Bạn có thể nghiệm thu ngay: Google và 4G — LSV72/73

**Bối cảnh:** Sentry đã hoạt động và đọc được file/dòng lỗi. Kiểm thử trình duyệt và mạng mô phỏng đã có; cần kiểm tra trên điện thoại thật của bạn.

**Cách chạy:** tại [lasoviet.net](https://lasoviet.net), mở một lá số → chọn luận giải → đăng nhập Google → kiểm tra quay lại đúng lá số/trang, ngôn ngữ và URL. Bấm Quay lại, mở lại link; ghi nếu đăng nhập bị lặp. Thử Android/Chrome, iPhone/Safari hoặc trình duyệt Facebook/Messenger bạn có. Dùng mạng 4G và ghi nếu trang chậm; đội kỹ thuật đối chiếu ngưỡng LCP dưới 2,5 giây bằng số đo thực tế.

**Đề xuất:** ghi thiết bị/trình duyệt, thời điểm thử, URL không chứa thông tin riêng tư và bước gặp lỗi; Sentry hỗ trợ truy lỗi. Không kết luận đạt hiệu năng chỉ từ cảm giác nhanh.

**Trả lời:** thiết bị/trình duyệt: …; thời điểm UTC hoặc múi giờ: …; Google đạt/chưa đạt: …; lỗi/bước gặp lỗi: …

## Review 5 luận giải thật — chờ đội kỹ thuật cung cấp

**Bối cảnh:** model `ag/gemini-3.8-flash` và trần tổng **200.000 VND gồm chạy lại** đã duyệt. Broker đang sửa số token trả về và có thể tự thử lại; đội kỹ thuật cần xác minh phí đầy đủ/giới hạn số lần gọi và giữ trần ngân sách trước khi chạy; chưa có bộ chất lượng thật để bạn review.

**Đề xuất:** sau khi có bộ đạt kiểm tra tự động, bạn đọc 5 bản đầy đủ: đúng dữ kiện, tiếng Việt dễ hiểu, lời khuyên cụ thể, không lặp/viết cho đủ chữ và không có nội dung bị cấm. Ghi đạt/chưa đạt cùng đoạn cần sửa. Không cần duyệt ngân sách lại.

**Trả lời sau khi nhận 5 bản:** …

## Giữ theo quyết định hiện tại

SePay để sau; không giao dịch ngân hàng thật. AI miễn phí và gửi nhắc mua thật vẫn tắt. Thành viên/Combo chưa mở bán; hợp đôi/BaZi hoãn; PR197/231 giữ nguyên. Chỉ cần trả lời thêm khi bạn muốn đổi các quyết định này.
