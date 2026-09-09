---
route_id: private.checkout
canonical_path: /thanh-toan/{orderId}
locale: vi
lifecycle: live_noindex
implementation_state: current (thiếu order recap, trạng thái hạn/lỗi dùng chung 1 giao diện — chặn bởi WP-01/WP-02/WP-02B)
source_commit: a3db625e1117e2facb0e066192b098aff4570913
candidate_commit: null
version: 1
status: draft
reviewer: null
approved_at: null
approval_record: null
content_sha256: null
---

# `/thanh-toan/{orderId}` — Checkout VietQR — Draft nội dung (vòng 1)

**Nguồn:** `app/[locale]/thanh-toan/[orderId]/page.tsx`, `features/commerce/vietqr-checkout.tsx`,
`messages/vi/reports.json` khối `checkout`. Đây là trang **tiền thật đang di chuyển** — đúng brand voice
(Caregiver, không tăng lo âu), trang này cần rõ ràng và trấn an, **không áp kỹ thuật thuyết phục/tò mò**
như các trang duyệt/chọn mua. Không dùng Zeigarnik, anchoring hay bất kỳ cơ chế marketing-psychology nào ở
đây — đúng như đã ghi trong `voice-and-positioning.md` ("Không dùng... ở checkout").

**Phụ thuộc engineering — đọc trước khi implement:** nội dung dưới đây giả định cơ chế thanh toán MỚI đã
mô tả trong `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` (mã
`payment_code` ngắn thay `invoice_number`, TTL 24 giờ, luồng tự nhận giao dịch Tầng 4). **Chưa implement
được nếu WP-01/WP-02/WP-02B chưa xong** — đây là content chuẩn bị trước, không phải patch cho code hiện
tại. Trang hiện tại vẫn dùng `invoice_number` dài 40 ký tự làm nội dung chuyển khoản và TTL ngắn — đây
chính là lỗi mất tiền P0-CRITICAL đã ghi trong spec đó, không sửa qua content được.

## Vấn đề xác nhận trực tiếp trên source

1. Không có khối tóm tắt đơn hàng (mua gì, tên gói) — chỉ có tiêu đề tĩnh "Luận giải bản mệnh" bất kể mua
   tầng nào.
2. `labels.status[status]` chỉ là **một từ trạng thái** ("Đơn đã hết hạn", "Thanh toán chưa thành công",
   "Đã hoàn tiền") — không có hành động đi kèm. Toàn bộ khối QR/số tài khoản **vẫn hiện y nguyên** ở mọi
   trạng thái, kể cả khi đơn đã hết hạn — đúng phát hiện của CX audit ("Terminal state labels retain the
   same bank-details presentation").
3. Không có bước đánh số, không có "điều gì xảy ra tiếp theo", không có đường tự nhận giao dịch khi lỗi
   khớp.

## Đề xuất

### Tiêu đề — chuyển từ tĩnh sang động theo gói đã chọn

**Current:** `reports.checkout.title` = "Luận giải bản mệnh" (tĩnh, sai tên khi mua tầng khác)
**Đề xuất:** `"Thanh toán · {tên gói đã chọn}"` — ví dụ "Thanh toán · Luận giải Tử Vi toàn diện"

### Khối tóm tắt đơn hàng — MỚI, đặt trên cùng, trước QR

```
"Bạn đang mua: {tên gói} — {giá} · Mã đơn: {payment_code}
Báo cáo mở tự động khi chúng tôi xác nhận thanh toán — bạn không cần làm gì thêm sau khi chuyển khoản."
```

### Bước thực hiện — MỚI, đánh số thay vì chỉ liệt kê trường dữ liệu

```
"1. Quét mã VietQR, hoặc sao chép thông tin bên dưới.
2. Chuyển đúng số tiền hiển thị.
3. Giữ nguyên nội dung chuyển khoản — đây là cách chúng tôi nhận ra đúng đơn của bạn.
4. Ở lại trang này. Chúng tôi tự động kiểm tra, không cần bấm gì thêm."
```

### Thời hạn — hiện cả đếm ngược lẫn mốc giờ tuyệt đối

**Current:** chỉ đếm ngược `remainingTime` (mm:ss), không có mốc giờ cụ thể — dễ hoảng khi đồng hồ chạy
gần hết mà không rõ "hết vào lúc mấy giờ".
**Đề xuất:** thêm bên cạnh đếm ngược: `"Còn hiệu lực đến {giờ}:{phút}, {ngày}/{tháng} (24 giờ kể từ lúc
tạo đơn)"`.

### Trạng thái — mỗi trạng thái có lời giải thích + một hành động, không dùng chung 1 giao diện

| Trạng thái | Copy đề xuất | Hành động |
|---|---|---|
| `pending` | "Đang chờ xác nhận thanh toán. Nếu bạn đã chuyển khoản, chúng tôi đang kiểm tra tự động — thường chỉ mất vài phút." | Link phụ: "Đã chuyển khoản mà chưa thấy cập nhật?" → luồng tự nhận (xem dưới) |
| `paid` nhưng báo cáo đang tạo | "Đã nhận được thanh toán. Đang tổng hợp nội dung luận giải của bạn — trang sẽ tự chuyển khi sẵn sàng." | Không hiện lại QR/số tài khoản (đã thanh toán xong, không phải chờ thanh toán) |
| `expired` (chưa trả) | "Đơn này đã hết hiệu lực. Nếu bạn lỡ chuyển khoản với mã đơn cũ ({payment_code}), liên hệ hỗ trợ kèm mã này — chúng tôi vẫn đối chiếu được." | [Tạo yêu cầu thanh toán mới] · [Quay lại chọn luận giải] — ẩn hẳn khối QR/số tài khoản cũ |
| `failed` | "Chưa thể xác nhận thanh toán cho đơn này." | Cùng 2 hành động như `expired` |
| `refunded` | "Đơn này đã được hoàn tiền vào {ngày}." | [Liên hệ hỗ trợ] — **không** hiện nút mua lại như một đơn mới (BE-6) |
| Lỗi kiểm tra tự động (mạng/API) | "Chúng tôi tạm thời không kiểm tra được trạng thái tự động." | [Kiểm tra lại] + link tự nhận giao dịch — giữ nguyên QR/thông tin cũ, không xóa |

### Luồng tự nhận giao dịch (Tầng 4, R-AUTO-11…14) — sketch copy cho micro-flow liên kết từ đây

```
Tiêu đề: "Tôi đã chuyển khoản nhưng chưa thấy cập nhật"
Form:    "Số tiền đã chuyển" + "Ngày, giờ đã chuyển"
Sau khi gửi: "Đang đối chiếu. Nếu khớp đúng một giao dịch, chúng tôi mở ngay tự động. Nếu chưa tìm thấy,
             đội ngũ sẽ liên hệ trong vòng 6 giờ."
```

Không dùng "đang xử lý ngay" hay % tiến độ giả (B-8) — 6 giờ là SLA thật đã chốt (FD-047), không phải số
tuỳ tiện.

### Chân trang mọi trạng thái

`"Cần hỗ trợ? [Liên hệ — đã điền sẵn mã đơn]"` — luôn hiện, mã đơn tự điền vào form liên hệ để người dùng
không phải gõ lại (BE-5).

## Không dùng ở trang này (nhắc lại có chủ đích)

Không đếm ngược kịch tính, không "chỉ còn X phút để giữ giá", không badge khan hiếm, không bất kỳ ngôn ngữ
tạo áp lực nào — khách đang ở bước trả tiền thật, không phải bước cân nhắc mua. Toàn bộ giữ tông trấn an.

## Founder approval

Chưa duyệt.
