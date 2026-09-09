# `/thanh-toan/{orderId}` — Checkout VietQR — bản chữ cuối

`[Chờ WP-01/WP-02/WP-02B — nội dung dưới giả định payment_code ngắn + TTL 24h + luồng tự nhận giao dịch đã
có; chưa patch được lên cơ chế invoice_number/TTL ngắn hiện tại]`

`[Chủ đích không áp bất kỳ kỹ thuật thuyết phục/tò mò nào ở trang này — chỉ rõ ràng và trấn an]`

## Tiêu đề `[ĐỔI — từ tĩnh sang động theo gói]`

`"Thanh toán · {tên gói đã chọn}"` — ví dụ "Thanh toán · Luận giải Tử Vi toàn diện"

## Tóm tắt đơn hàng `[MỚI, đặt trên cùng]`

```
Bạn đang mua: {tên gói} — {giá} · Mã đơn: {payment_code}
Báo cáo mở tự động khi chúng tôi xác nhận thanh toán — bạn không cần làm gì thêm sau khi chuyển khoản.
```

## Các bước thực hiện `[MỚI]`

```
1. Quét mã VietQR, hoặc sao chép thông tin bên dưới.
2. Chuyển đúng số tiền hiển thị.
3. Giữ nguyên nội dung chuyển khoản — đây là cách chúng tôi nhận ra đúng đơn của bạn.
4. Ở lại trang này. Chúng tôi tự động kiểm tra, không cần bấm gì thêm.
```

## Thông tin chuyển khoản `[giữ cấu trúc hiện có]`

Ngân hàng / Số tài khoản (+ sao chép) / Chủ tài khoản / Số tiền (+ sao chép) / Nội dung chuyển khoản (+ sao
chép) / Thời gian còn lại.

`[THÊM]` bên cạnh đếm ngược: `"Còn hiệu lực đến {giờ}:{phút}, {ngày}/{tháng} (24 giờ kể từ lúc tạo đơn)"`.

## Theo trạng thái `[ĐỔI — mỗi trạng thái có lời giải thích + một hành động riêng, không dùng chung 1 giao diện]`

| Trạng thái | Copy | Hành động |
|---|---|---|
| Đang chờ | Đang chờ xác nhận thanh toán. Nếu bạn đã chuyển khoản, chúng tôi đang kiểm tra tự động — thường chỉ mất vài phút. | "Đã chuyển khoản mà chưa thấy cập nhật?" → luồng tự nhận |
| Đã trả, đang tạo báo cáo | Đã nhận được thanh toán. Đang tổng hợp nội dung luận giải của bạn — trang sẽ tự chuyển khi sẵn sàng. | Ẩn khối QR/số tài khoản |
| Hết hạn | Đơn này đã hết hiệu lực. Nếu bạn lỡ chuyển khoản với mã đơn cũ ({payment_code}), liên hệ hỗ trợ kèm mã này — chúng tôi vẫn đối chiếu được. | [Tạo yêu cầu mới] · [Quay lại chọn luận giải] — ẩn QR cũ |
| Thất bại | Chưa thể xác nhận thanh toán cho đơn này. | Như trên |
| Đã hoàn tiền | Đơn này đã được hoàn tiền vào {ngày}. | [Liên hệ hỗ trợ] — không hiện nút mua lại |
| Lỗi kiểm tra tự động | Chúng tôi tạm thời không kiểm tra được trạng thái tự động. | [Kiểm tra lại] + link tự nhận — giữ nguyên QR |

## Luồng tự nhận giao dịch `[MỚI, micro-flow liên kết từ đây]`

```
Tiêu đề: Tôi đã chuyển khoản nhưng chưa thấy cập nhật
Form:    Số tiền đã chuyển + Ngày, giờ đã chuyển
Sau gửi: Đang đối chiếu. Nếu khớp đúng một giao dịch, chúng tôi mở ngay tự động. Nếu chưa tìm thấy, đội
         ngũ sẽ liên hệ trong vòng 6 giờ.
```

## Chân trang mọi trạng thái `[MỚI]`

`"Cần hỗ trợ? [Liên hệ — đã điền sẵn mã đơn]"`
