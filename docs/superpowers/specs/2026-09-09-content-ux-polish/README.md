# Content & UX Polish — Founder Draft Pass (bắt đầu 2026-09-09)

**Vai trò tài liệu này:** đây là vòng Harris/Product soạn và chốt nội dung/UX ở mức **quyết định**,
trước khi An implement. Đây **không phải** bản export `content-review/` bắt buộc mô tả trong
`docs/superpowers/handoffs/lasoviet-ux-content-handoff/requirements/content-approval-workflow.md`
(bản đó là export tự động từ source thật, chạy sau khi An code xong, dùng để chốt hash/parity trước
khi publish). Hai việc khác nhau:

- **Tài liệu này (trước code):** Harris quyết "trang này nên nói gì, theo thứ tự nào, tại sao" — input
  cho An viết implementation plan.
- **`content-review/` sau này (sau code):** An/tooling export đúng chữ đang hiển thị trên candidate
  build, Harris duyệt hash-by-hash trước khi publish.

## Nguồn đầu vào

- Gói audit UX/Content độc lập nhận ngày 2026-09-09: `/Users/admin/Downloads/lasoviet-ux-content-handoff`
  (baseline commit `a3db625e1117e2facb0e066192b098aff4570913` — **trùng chính xác** với tip hiện tại của
  `master`, nên các quan sát source-level trong đó vẫn đúng với code hiện hành).
- Quyết định ladder sản phẩm mới nhất: `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
  và `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md` (FD-036…FD-056, chốt cùng ngày
  2026-09-09). **Bộ audit tải về không biết về ladder 2 tầng này** — nó giả định vẫn chỉ có một SKU 79k.
  Ở mọi chỗ hai nguồn mâu thuẫn nhau về giá/SKU, **ladder FD-036…FD-056 thắng** vì mới hơn và đã được
  Founder duyệt chính thức; audit thắng ở phần quan sát UX/copy chưa liên quan tới giá.

## Cách đọc mỗi file trang

Theo khung `templates/page-review-template.md` của gói audit (frontmatter route ID, bảng nội dung theo
đúng thứ tự hiển thị, bảng trạng thái, sổ tuyên bố/claim, khung duyệt của Founder). Trạng thái mặc định
là `draft`, `approved_at: null` — không tự ý điền duyệt thay Harris.

## Giọng văn & định vị (áp dụng toàn site)

Sau vòng 1 của trang chủ, Harris yêu cầu viết lại giọng văn toàn site (đang đọc như report kỹ thuật, cần
tự nhiên/storytelling/punchline hơn) và nghiên cứu đối thủ. Kết quả nằm ở
[voice-and-positioning.md](voice-and-positioning.md) — **đọc file đó trước khi viết bất kỳ trang nào tiếp
theo**, kể cả khi không có trong hai câu hỏi mở của trang chủ.

## Tiến độ

| Route ID | Trang | Trạng thái |
|---|---|---|
| `brand.home` | `/` | Draft v2 — chờ Harris duyệt (3 câu hỏi mở, xem cuối file) |
| `methodology.root` | `/phuong-phap` | Draft v1 — chờ duyệt |
| `methodology.tu-vi` | `/phuong-phap/tu-vi` | Draft v1 — chờ duyệt |
| `methodology.ai-evidence` | `/phuong-phap/ai-va-can-cu` | Draft v1 — chờ duyệt |
| `trust.sources` | `/nguon-tri-thuc` | Draft v1 — chờ duyệt (có 1 câu hỏi mở về nguồn thật bổ sung) |
| `private.chart` | `/la-so/{chartId}` | Draft v1 — chờ duyệt |
| `private.chart.topic` | `/la-so/{chartId}/chon-luan-giai` | Draft v1 — chờ duyệt, phụ thuộc WP-01/WP-02 |
| `private.checkout` | `/thanh-toan/{orderId}` | Draft v1 — chờ duyệt, phụ thuộc WP-01/WP-02/WP-02B |
| `brand.about` | `/ve-la-so-viet` | Draft v1 — chờ duyệt (có câu hỏi mở về câu chuyện cá nhân thật) |
