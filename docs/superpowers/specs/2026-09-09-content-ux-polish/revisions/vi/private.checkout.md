---
route_id: private.checkout
canonical_path: /thanh-toan/{orderId}
locale: vi
lifecycle: live_noindex
version: 2
status: handoff_ready
reviewer: Harris
approved_at: 2026-09-10
approval_record: "User authorized finalization and packaging on 2026-09-10."
rules_reference: ../CONTENT-RULES.md
layout_style: visual_first_calm_checkout
---

# /thanh-toan/{orderId} — Thanh toán VietQR

## Vai trò của trang

Đây là trang tiền thật đang di chuyển. Mọi câu chữ phải rõ, bình tĩnh và có đường lui khi có lỗi.

Không dùng kỹ thuật gây tò mò, khan hiếm giả, countdown kịch tính hoặc bất kỳ ngôn ngữ nào khiến người dùng sợ mất cơ hội.

Trang này giả định backend đã có mã thanh toán ngắn, thời hạn 24 giờ, đơn hàng giữ nguyên danh tính và cơ chế tự đối chiếu giao dịch.

## Tiêu đề động

**Tier 1:**  
Thanh toán · Bản mệnh và tiềm năng

**Tier 2:**  
Thanh toán · Luận giải Tử Vi toàn diện

**Nâng cấp:**  
Thanh toán · Nâng cấp bản luận giải toàn diện

## Tóm tắt đơn hàng

**Bạn đang mua:**  
{tên gói}

**Số tiền cần thanh toán:**  
{giá cuối cùng}

**Mã đơn:**  
{mã đơn}

Bản luận giải sẽ được mở tự động sau khi thanh toán được xác nhận. Bạn không cần bấm “đã chuyển khoản”.

### Trường hợp nâng cấp

**Giá bản toàn diện:** 79.000 ₫  
**Tín dụng đã thanh toán:** −19.000 ₫  
**Số tiền cần thanh toán:** 60.000 ₫

Mức tín dụng nâng cấp có hiệu lực trong 7 ngày kể từ thời điểm thanh toán gói Bản mệnh và tiềm năng.

## Hướng dẫn thanh toán

### 01 · Quét hoặc sao chép

Quét mã VietQR hoặc sao chép thông tin chuyển khoản bên dưới.

### 02 · Chuyển đúng số tiền

Chuyển đúng số tiền đang hiển thị trên trang.

### 03 · Giữ nguyên nội dung

Giữ nguyên nội dung chuyển khoản. Đây là cách chúng tôi nhận ra đúng đơn của bạn.

### 04 · Chờ cập nhật

Ở lại trang này hoặc quay lại sau. Hệ thống sẽ tự động kiểm tra và cập nhật trạng thái.

Bạn không cần chuyển khoản lần nữa chỉ vì trang chưa cập nhật ngay.

## Thông tin chuyển khoản

**Ngân hàng:**  
{tên ngân hàng}

**Người nhận:**  
{tên tài khoản}

**Số tài khoản:**  
{số tài khoản}

**Số tiền:**  
{số tiền}

**Nội dung chuyển khoản:**  
{mã thanh toán}

**Nút:**  
Sao chép

**Sau khi sao chép:**  
Đã sao chép

Chỉ giữ nguyên mã này trong nội dung chuyển khoản. Không thêm lời nhắn hoặc ký tự khác nếu ứng dụng ngân hàng cho phép.

## Mã VietQR

**Nhãn:**  
Quét để thanh toán

**Văn bản thay thế:**  
Mã VietQR thanh toán {số tiền} cho {tên gói}. Nếu không thể quét mã, hãy sao chép thông tin chuyển khoản bên cạnh.

**Liên kết phụ:**  
Không quét được mã? Xem thông tin chuyển khoản

## Thời hạn

**Thời gian còn lại:**  
{thời gian còn lại}

**Mốc thời gian:**  
Thông tin chuyển khoản còn hiệu lực đến {giờ}:{phút}, {ngày}/{tháng}/{năm}.

Thời hạn là 24 giờ kể từ lúc tạo đơn. Nếu bạn đã chuyển khoản trước thời điểm hết hạn, không cần chuyển lại. Hãy giữ biên lai và liên hệ hỗ trợ nếu trạng thái chưa cập nhật.

## Trạng thái đang chờ xác nhận

**Nhãn:**  
Đang chờ xác nhận thanh toán

**Nội dung:**  
Nếu bạn đã chuyển khoản, chúng tôi đang tự động kiểm tra giao dịch. Trạng thái thường được cập nhật sau vài phút.

Bạn có thể rời trang và quay lại sau. Thông tin đơn hàng vẫn được giữ nguyên.

**Liên kết:**  
Đã chuyển khoản nhưng chưa thấy cập nhật?

## Trạng thái đã nhận thanh toán

**Nhãn:**  
Đã nhận được thanh toán

**Nội dung:**  
Thanh toán của bạn đã được xác nhận. Chúng tôi đang tổng hợp nội dung luận giải — trang sẽ tự chuyển khi bản đọc sẵn sàng.

Bạn không cần thanh toán thêm lần nữa.

Ẩn mã QR, số tài khoản và nút thanh toán.

## Trạng thái luận giải đã sẵn sàng

**Nhãn:**  
Luận giải đã sẵn sàng

**Nội dung:**  
Bản luận giải của bạn đã được mở khóa và lưu trong tài khoản.

**Nút chính:**  
Mở bản luận giải

**Nút phụ:**  
Về thư viện của tôi

## Trạng thái đơn đã hết hiệu lực

**Nhãn:**  
Đơn này đã hết hiệu lực

**Nội dung:**  
Bạn có thể tạo một yêu cầu thanh toán mới để tiếp tục.

Nếu bạn đã chuyển khoản bằng mã đơn cũ {mã đơn}, đừng chuyển lại ngay. Hãy liên hệ hỗ trợ và gửi kèm mã này để chúng tôi đối chiếu.

Ẩn mã QR và toàn bộ thông tin chuyển khoản cũ.

**Nút chính:**  
Tạo yêu cầu thanh toán mới

**Nút phụ:**  
Quay lại chọn luận giải

**Liên kết:**  
Tôi đã chuyển khoản bằng mã cũ

## Trạng thái chưa thể xác nhận

**Nhãn:**  
Chưa thể xác nhận thanh toán

**Nội dung:**  
Chúng tôi chưa thể xác nhận giao dịch cho đơn này.

Nếu bạn đã chuyển khoản, vui lòng không chuyển thêm lần nữa. Bạn có thể gửi thông tin giao dịch để chúng tôi đối chiếu.

**Nút chính:**  
Tạo yêu cầu thanh toán mới

**Nút phụ:**  
Quay lại chọn luận giải

## Trạng thái đã hoàn tiền

**Nhãn:**  
Đơn này đã được hoàn tiền

**Nội dung:**  
Khoản thanh toán đã được hoàn vào {ngày hoàn tiền}.

Nếu cần kiểm tra thêm, vui lòng liên hệ hỗ trợ và cung cấp mã đơn này.

**Nút:**  
Liên hệ hỗ trợ

Không hiển thị nút mua lại trực tiếp trên đơn đã hoàn tiền.

## Trạng thái tạm thời không kiểm tra được

**Nhãn:**  
Chưa thể kiểm tra trạng thái tự động

**Nội dung:**  
Kết nối kiểm tra giao dịch đang tạm thời gián đoạn. Thông tin chuyển khoản của bạn vẫn được giữ nguyên.

Nếu bạn chưa chuyển khoản, hãy thử lại sau. Nếu bạn đã chuyển khoản, không cần chuyển thêm lần nữa.

**Nút chính:**  
Kiểm tra lại

**Liên kết:**  
Tôi đã chuyển khoản nhưng chưa thấy cập nhật

Giữ nguyên mã QR và thông tin chuyển khoản cũ.

## Luồng tự nhận giao dịch

**Tiêu đề:**  
Tôi đã chuyển khoản nhưng chưa thấy cập nhật

**Mô tả:**  
Gửi lại một vài thông tin để chúng tôi đối chiếu giao dịch. Bạn không cần chuyển khoản lần nữa.

**Trường:**  
Số tiền đã chuyển

**Trường:**  
Ngày và giờ đã chuyển

**Trường tùy chọn:**  
Biên lai chuyển khoản

**Nút:**  
Gửi thông tin giao dịch

### Sau khi gửi

Thông tin của bạn đã được ghi nhận.

Nếu tìm thấy giao dịch khớp, bản luận giải sẽ được mở tự động. Nếu chưa tìm thấy, đội ngũ hỗ trợ sẽ phản hồi trong vòng 6 giờ.

Không gửi lại biểu mẫu nhiều lần cho cùng một giao dịch.

## Lỗi biểu mẫu

**Số tiền chưa hợp lệ:**  
Vui lòng nhập đúng số tiền đã chuyển.

**Thiếu ngày hoặc giờ:**  
Hãy cho biết thời điểm bạn thực hiện giao dịch.

**Gửi thất bại:**  
Chưa thể gửi thông tin lúc này. Vui lòng thử lại sau.

## Hỗ trợ

Cần hỗ trợ?

Liên hệ với Lá Số Việt — mã đơn {mã đơn} sẽ được điền sẵn để bạn không phải nhập lại.

**Nút:**  
Liên hệ hỗ trợ

## Layout & visual

- Desktop: hai cột; bên trái là tóm tắt và hướng dẫn, bên phải là QR và thông tin chuyển khoản.
- Mobile: tóm tắt → QR → thông tin chuyển khoản → hướng dẫn → thời hạn → hỗ trợ.
- QR phải có văn bản thay thế và thông tin sao chép được.
- Trạng thái đã thanh toán phải thay đổi bố cục, không để QR cũ còn xuất hiện.
- Trạng thái hết hạn, thất bại và hoàn tiền phải có đường đi tiếp.
- Không hiển thị SKU hoặc tên trường kỹ thuật.
- Không dùng đỏ cảnh báo cho một đơn còn hiệu lực.

