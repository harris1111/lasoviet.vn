# Các quyết định còn cần bạn — lượt chạy overnight 06/10/2026

Trả lời theo số là được. Không cần gửi API key, token, mật khẩu hay dữ liệu khách hàng. Các mục đã duyệt không cần duyệt lại.

## Đã chốt

- **LSV68 và LSV71: Done.** Bạn chấp nhận bản đã triển khai và miễn phần nghiệm thu AI/API còn lại. Không hỏi lại API hay cấu hình model. Quyết định được ghi ở FD115; các giới hạn chi phí vẫn giữ.
- **SePay sandbox để sau.** Không chạy chuyển khoản thật trong đợt này; kiểm thử thanh toán dùng dữ liệu cô lập.
- **Thông báo chỉ ghi nhận trong môi trường thử**, chưa gửi cho khách thật. Hội viên, Combo, Hợp đôi và PR197/231 tiếp tục giữ như đã chốt.

## 1. LSV62 — đóng theo phần tặng 7 ngày, hay làm trọn sản phẩm 60 Lá?

**Bối cảnh:** phần “Hôm nay của bạn” tặng kèm Tử Vi trọn đời đã triển khai, kiểm tra nội dung từ bộ tính, quyền riêng tư và hết hạn ngày thứ 8 đã đạt. Gói mua riêng 60 Lá vẫn chưa mở bán.

**Giải pháp:** A) chấp nhận đóng phần tặng 7 ngày, tách mua riêng thành ticket tiếp; B) giữ ticket hiện tại để nghiệm thu và hoàn tất mua riêng 60 Lá.

**Đề xuất:** B, để giữ đầy đủ phạm vi sản phẩm; không cần thêm API vì nội dung lấy từ bộ tính hiện có.

**Trả lời:** …

## 2. LSV75 — phạm vi trang miễn phí khi bật phần đã làm

**Bối cảnh:** trang hiện vẫn có bản đọc cấu trúc. Ticket LSV75 đòi một cung đọc đầy đủ, ít nhất 900 từ; chuyển LSV71 Done không tự bật cờ tạo bài miễn phí trên môi trường đang chạy.

**Giải pháp:** tiếp tục giao diện/preview an toàn độc lập; chỉ bật phần tạo bài miễn phí khi bạn chọn nghiệm thu luồng đầy đủ trên môi trường thử. Giữ các trần 3.000 VND/lá số, 50.000 VND/ngày và một lần thử như đã duyệt.

**Đề xuất:** nghiệm thu trước trên môi trường thử, sau đó mới bật cho khách. Đây là lựa chọn bật/tắt sản phẩm, không cần bạn nghiên cứu hay cung cấp API.

**Trả lời:** bật thử / tiếp tục giữ tắt …

## 3. LSV60/79 — nếu muốn bật gửi thông báo thật

**Bối cảnh:** nhắc đơn nạp đã có bản ghi nhận chống trùng; phần nhắc lá số, tiếp tục mua và “báo tôi khi xong” còn được hoàn thiện. Quyết định hiện tại chỉ cho ghi nhận thông báo thử. Nhắc hạn tháng còn phụ thuộc gói năm chưa mở.

**Giải pháp:** hoàn tất kiểm thử ghi nhận, đồng ý nhận, huỷ đăng ký và liên kết tới đúng món; sau đó chọn một nhóm nhỏ để nghiệm thu gửi/nhận.

**Đề xuất:** tiếp tục chế độ ghi nhận trong lượt overnight này. Khi bạn muốn gửi thật, chỉ định nhóm chủ sở hữu/tài khoản thử đã đồng ý và loại thông báo được gửi. Không cần cung cấp danh sách khách hàng ở Git.

**Trả lời:** giữ như hiện tại / cho gửi thử tới nhóm …, loại …

## 4. LSV77 — nghiệm thu điện thoại sau phần QR trong tấm

**Bối cảnh:** phần nạp ngay trong tấm mở khóa dùng lại đơn, QR và cơ chế thanh toán cũ. Kiểm thử trình duyệt mô phỏng đạt ở 390/1440px; việc mở app ngân hàng và lưu QR trên điện thoại thật chưa được chứng minh.

**Giải pháp:** giữ đường quét/copy QR đang có; thử trên máy thật khi sandbox được mở. Chỉ thêm liên kết mở app ngân hàng từ danh sách được xác minh.

**Đề xuất:** khi sẵn sàng, cho biết Android/Chrome hay iPhone/Safari và app ngân hàng bạn muốn thử. SePay vẫn để sau theo quyết định hiện tại.

**Trả lời:** thiết bị …; app ngân hàng …; hoặc để sau.

## 5. LSV64 — công cụ đầu tiên của hội viên

**Bối cảnh:** hội viên đang giữ; chỉ có luận giải ngày/tháng chưa đủ các quyền lợi đã hứa.

**Giải pháp:** chọn một công cụ rồi chốt dữ liệu nhập, phương pháp từ bộ tính và đầu ra trước khi triển khai.

**Đề xuất:** bắt đầu với lịch/chọn ngày, sau khi bạn duyệt phương pháp và nguồn; chưa tự mở bán hội viên hoặc giảm quyền lợi.

**Trả lời:** tiếp tục giữ / chọn công cụ …, phương pháp hoặc nguồn …
