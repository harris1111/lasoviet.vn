# 04 — Phase 1 Product Specification

## 1. Objective

Kiểm chứng rằng người dùng Việt sẵn sàng trả tiền cho một bản luận giải Tử Vi có cấu trúc, cá nhân hóa, minh bạch căn cứ và giao ngay online.

Không cố chứng minh toàn bộ vision Đông–Tây trong MVP.

## 2. P0 scope

### User/account

- Đăng ký/đăng nhập bằng email hoặc social login.
- Có thể lập thử trước đăng ký; yêu cầu tài khoản khi lưu/mua.
- Một tài khoản có nhiều hồ sơ sinh cho bản thân/gia đình, mỗi hồ sơ có nhãn và consent.
- Xem, sửa, tải và xóa dữ liệu.

### Birth profile

- Họ tên hoặc biệt danh hiển thị.
- Ngày sinh dương lịch; tùy chọn nhập âm lịch nếu engine hỗ trợ chuyển đổi đã kiểm thử.
- Giờ/phút sinh; trạng thái “không rõ giờ sinh”.
- Nơi sinh; timezone được resolve và cho người dùng xác nhận.
- Giới tính/âm dương chỉ hỏi nếu phương pháp thực sự cần; giải thích lý do.
- Không yêu cầu số điện thoại trước khi tạo giá trị.

### Tử Vi calculator

- Chuyển đổi lịch và Can Chi.
- Mệnh, Thân, Cục.
- 12 cung.
- Chính tinh/phụ tinh theo rule set đã chọn.
- Miếu/vượng/đắc/hãm khi phương pháp có định nghĩa.
- Đại vận, tiểu vận và view năm.
- Hiển thị thiên bàn/địa bàn dễ đọc trên mobile.
- Tooltip cho thuật ngữ.
- Unknown-birth-time mode: không giả định âm thầm; chỉ hiển thị phần có thể tính hoặc yêu cầu chạy kịch bản giờ sinh.

### Free experience

- Toàn bộ sơ đồ lá số cơ bản.
- Dữ liệu đầu vào và phương pháp.
- Ba insight nổi bật.
- Một thế mạnh và một điểm căng thẳng.
- Gợi ý chủ đề nên xem sâu.
- Preview 10–15% nội dung trả phí, không dùng blur giả.

### Paid reports

- 4 SKU giá khởi đầu 79.000đ/SKU.
- Trang bán hàng nêu rõ mục lục, độ dài dự kiến, căn cứ, thời gian tạo và chính sách xử lý sai dữ liệu.
- Thanh toán nội địa; trạng thái pending/success/failed/idempotent.
- Tạo báo cáo bất đồng bộ, có progress và email khi hoàn tất.
- Web report responsive + PDF/print.
- Report đã mua không bị thay nội dung khi engine/prompt nâng phiên bản; regeneration tạo version mới có lịch sử.

### Operations

- CMS cho landing, FAQ, kiến thức và methodology.
- Admin xem đơn hàng, report, lỗi engine, regeneration và support case.
- Audit log cho thay đổi nội dung trả phí.
- Analytics events theo config.

## 3. Out of scope P0

- Marketplace chuyên gia.
- Chat bói mở không giới hạn.
- Subscription/token wallet.
- Tarot, xem chỉ tay, xem tướng bằng ảnh.
- Bán vật phẩm phong thủy.
- Tổng hợp Đông–Tây khi engine riêng chưa ổn định.
- Tự động tạo hàng loạt trang SEO.

## 4. User flows

### Flow A — Organic calculator

1. Vào `/la-so-tu-vi`.
2. Hiểu giá trị miễn phí trong 5 giây.
3. Nhập/xác nhận dữ liệu sinh.
4. Nhận chart + free summary.
5. Mở một evidence explanation.
6. Chọn topic phù hợp.
7. Xem mục lục, mẫu và giá.
8. Thanh toán.
9. Nhận report và lưu tài khoản.

### Flow B — Commercial intent

1. Vào `/luan-giai-tu-vi`.
2. Xem báo cáo mẫu/phương pháp/giá.
3. Lập hoặc chọn lá số đã lưu.
4. Chọn topic → checkout → report.

### Flow C — Existing user

1. Vào “Báo cáo của tôi”.
2. Chọn lá số.
3. Mua topic khác hoặc xem lại report.

## 5. Acceptance criteria quan trọng

### Calculation

- Test fixture bao phủ ngày giao mùa, đổi ngày âm/dương, leap month, timezone và giờ Tý.
- Kết quả được đối chiếu với ít nhất hai nguồn/engine độc lập cho fixture quan trọng.
- Engine version và rule set xuất hiện trong metadata.

### Report

- Mọi luận điểm chính có ít nhất một `evidence_key` hợp lệ.
- Không có nội dung ngoài evidence allowlist.
- Không có câu tuyệt đối về tai nạn, tử vong, bệnh, pháp lý hoặc tài chính.
- Report render tốt ở mobile và PDF; tiếng Việt không lỗi font.

### Commerce

- Webhook idempotent; không tạo hai report cho một giao dịch.
- User thấy trạng thái rõ khi thanh toán pending/failed.
- Có quy trình sửa input và tạo lại trong điều kiện công bố.

### Privacy

- Report không thể đoán bằng URL tuần tự.
- Private pages noindex.
- Xóa tài khoản có workflow xóa/ẩn danh hóa được ghi nhận.

## 6. Release gates

Chỉ public launch khi:

- 100% fixture P0 pass.
- Không còn lỗi severity-1 về tính toán, thanh toán hoặc rò dữ liệu.
- 20 report nội bộ được review theo rubric: đúng evidence, dễ hiểu, không lặp, không gây hại.
- Có sample report, methodology, privacy, terms và support workflow.
