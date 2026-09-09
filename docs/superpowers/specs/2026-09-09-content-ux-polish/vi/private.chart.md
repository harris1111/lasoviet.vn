---
route_id: private.chart
canonical_path: /la-so/{chartId}
locale: vi
lifecycle: live_noindex
implementation_state: current (giá/tên vẫn theo SKU đơn cũ — cần cập nhật theo ladder FD-036…048)
source_commit: a3db625e1117e2facb0e066192b098aff4570913
candidate_commit: null
version: 1
status: draft
reviewer: null
approved_at: null
approval_record: null
content_sha256: null
---

# `/la-so/{chartId}` — Kết quả lá số miễn phí — Draft nội dung (vòng 1)

**Nguồn:** `app/[locale]/la-so/[chartId]/page.tsx` (khối CTA trả phí hardcode trực tiếp trong TSX, không
qua i18n), `features/reports/free-identity-preview.tsx`, `messages/vi/ziwei.json`, `messages/vi/
reports.json`. Đây là trang **quan trọng nhất trong toàn funnel trả phí** — người dùng vừa thấy lá số
thật của chính họ, đây là khoảnh khắc quyết định có đọc sâu hơn không.

## Vấn đề xác nhận trực tiếp trên source

1. Khối CTA trả phí hardcode **"79.000 ₫" + "Báo cáo luận giải Bản mệnh & Tiềm năng"** ngay trong
   `page.tsx` (dòng ~76-83) — đây chính là tên/giá SKU cũ, chưa theo ladder 2 tầng mới. Vì giá/tên bị lặp
   ở nhiều nơi (trang này, trang chọn luận giải, trang mẫu), sửa một chỗ dễ để sót — nên gộp về một nguồn.
2. Không có trạng thái riêng tư/thời hạn hiển thị cho khách vãng lai (chỉ có nút xóa thủ công, không có
   câu nói rõ "tự xóa sau 24 giờ nếu không làm gì") — đúng phát hiện P1 của CX audit.

## Đề xuất

### Khối CTA trả phí — viết lại hoàn toàn, bỏ giá/tên cứng khỏi trang này

**Current (hardcode trong `page.tsx`):**
> eyebrow "Luận giải chuyên sâu trọn đời" · h2 "Báo cáo luận giải Bản mệnh & Tiềm năng" · "79.000 ₫" ·
> "Thanh toán một lần · Không tự động gia hạn" · CTA "Chọn chủ đề luận giải"

**Đề xuất:**
```
eyebrow: "Đọc sâu hơn lá số của bạn"
h2:      "Từ 3 điểm hôm nay, đến toàn bộ 12 cung"
body:    "Bạn vừa đọc 3 điểm nổi bật từ Cung Mệnh. Lá số của bạn còn Cung Thân, Tứ Hóa và các cấu hình
          khác chưa mở — xem đầy đủ khi bạn sẵn sàng đọc sâu hơn."
CTA:     "Chọn luận giải phù hợp" (primary, → chon-luan-giai)  +  "Xem bản luận giải mẫu" (secondary, giữ
          nguyên, → /bao-cao-mau/tu-vi)
```

**Lý do bỏ giá/tên khỏi trang này:** giá và tên gói giờ có 2 tầng (19k/79k) — nguồn sự thật duy nhất nên là
trang `chon-luan-giai` (nơi khách thật sự chọn). Lặp lại giá ở đây tạo thêm một chỗ có thể lệch số khi đổi
giá sau này — đúng đúng loại lỗi "hai nguồn giá song song" mà spec ladder mục 4.1 đã cảnh báo (giữa
`config/product-catalog.json` và code hardcode). **Kỹ thuật:** Zeigarnik/Goal-gradient (marketing-
psychology) — nói cụ thể "bạn vừa đọc 3 điểm, còn Cung Thân/Tứ Hóa/cấu hình khác chưa mở" thay vì chỉ nói
chung chung "luận giải chuyên sâu"; bỏ "trọn đời" vì spec 2026-09-07 loại trừ dự báo theo thời gian, "trọn
đời" dễ hiểu nhầm.

### Trạng thái riêng tư — thêm câu còn thiếu (P1 CX audit)

Thêm ngay trên `AnonymousDataDeletionControl` (chỉ hiện với khách vãng lai):

```
"Lá số riêng tư · dữ liệu khách tự xóa sau 24 giờ nếu chưa liên kết với tài khoản đã xác minh. Đăng nhập
để lưu lại, hoặc xóa ngay bên dưới."
```

### Không đổi

`ziwei.heroCopy`, `ziwei.summary.*`, `reports.preview.*` (3 điểm nổi bật, điểm mạnh/điểm căng), khối
Evidence — đã đúng giọng, đã trung thực, không có overclaim. `reports.preview.coverage` ("Phần xem trước
bao quát {percent}% nội dung của {offer}") giữ nguyên cấu trúc động, chỉ cần đảm bảo `{offer}` resolve
đúng tên hiển thị mới ("Luận giải Tử Vi toàn diện") khi An cập nhật `ziwei-presentation.ts` theo mục 6 của
spec ladder.

## Ghi chú implementation (không phải nội dung)

Giá/tên hiện hardcode trực tiếp trong JSX của `page.tsx`, không qua `common.json`/`reports.json` — khi An
sửa theo ladder mới, nên chuyển khối này thành key i18n thay vì hardcode lần nữa, để tránh lặp lại đúng
lỗi "content nằm rải rác nhiều nơi" mà toàn bộ audit đang cố sửa.
