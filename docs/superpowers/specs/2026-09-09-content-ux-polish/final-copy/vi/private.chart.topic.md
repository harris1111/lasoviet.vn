# `/la-so/{chartId}/chon-luan-giai` — Chọn luận giải — bản chữ cuối

`[Chờ WP-01/WP-02 — contract hiện chỉ cho 1 SKU, chưa render được 2 thẻ]`

```
Eyebrow: Chọn luận giải phù hợp
H1:      Luận giải cho lá số của bạn
Context: Luận giải cho lá số ngày {ngày sinh} · [Xem lại lá số ←]

── Thẻ 1 ──
Tên:          Bản mệnh & Tiềm năng
Nội dung:     Tổng quan bản mệnh, trục cốt lõi Mệnh – Thân, và điểm mạnh/điểm căng chính.
Giá:          19.000 ₫ · một lần
Link mẫu:     Xem bản mẫu
Ghi chú khấu trừ (BẮT BUỘC hiện tại đây, trước khi khách xác nhận mua):
              Nếu sau đó bạn muốn đọc bản toàn diện, số tiền này được trừ thẳng vào giá nâng cấp — trong
              vòng 7 ngày kể từ hôm nay.
CTA:          Chọn Bản mệnh & Tiềm năng — 19.000 ₫

── Thẻ 2 (badge "Đầy đủ nhất") ──
Tên:          Luận giải Tử Vi toàn diện
Nội dung:     Toàn bộ nội dung ở trên, cộng đủ 12 cung, các cấu hình quan trọng và tổng hợp theo 4 chủ đề
              cuộc sống.
Giá:          79.000 ₫ · một lần
Link mẫu:     Xem bản mẫu
CTA:          Chọn Luận giải toàn diện — 79.000 ₫

── Chung ──
Trust row:    Thanh toán một lần, không tự động gia hạn · Đọc lại không giới hạn sau khi mua.
Gate note:    Cần tài khoản có email đã xác minh để thanh toán. Nếu bạn đăng nhập sau khi chọn, lựa chọn
              này vẫn được giữ nguyên — không phải chọn lại.
Help:         Chuyển nhầm hoặc cần hỗ trợ? [Liên hệ]
```

## Các trạng thái khác

- **Đã có tầng 1, còn trong 7 ngày:** thẻ 1 đổi thành "Bạn đã có Bản mệnh & Tiềm năng (mua ngày {date})";
  thẻ 2 hiện **"Nâng cấp — chỉ còn 60.000 ₫"** + "Ưu đãi còn {N} ngày".
- **Đã có tầng 1, quá 7 ngày:** thẻ 2 hiện giá đầy đủ 79.000 ₫, không nhắc lại ưu đãi đã mất.
- **Đã có tầng 2:** không hiện nút mua — chỉ hiện "Đọc lại luận giải" → thẳng vào reader.
- **Chưa xác minh email:** giữ nguyên lựa chọn đã bấm, điều hướng đăng nhập, quay lại đúng chỗ sau khi
  xong (không phải về trang chủ).
- **Lỗi tải offer (0 hoặc nhiều hơn 2):** "Không thể tải lựa chọn luận giải lúc này" + [Thử lại] +
  [Xem lá số].
