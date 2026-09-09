# Final copy — bản để Harris revise tay lần cuối

Đây là bản **sạch**, tách khỏi mọi phân tích/rationale/bảng current-vs-proposed ở thư mục cha
(`../vi/*.md`). Mỗi file dưới đây là toàn bộ chữ hiển thị của một trang, theo đúng thứ tự đọc thật, sẵn
sàng để anh sửa trực tiếp bằng tay. Phần nào giữ nguyên so với hiện tại được đánh dấu `[giữ]`; phần đổi
đánh dấu `[ĐỔI]`. Ghi chú kỹ thuật/phụ thuộc chỉ giữ lại dạng 1 dòng ngắn trong ngoặc vuông, không lặp lại
lý do đầy đủ — cần lý do thì quay lại file phân tích tương ứng ở `../vi/`.

**Ảnh đã gen cho section "Về Lá Số Việt" trên trang chủ:**
`/Users/admin/Downloads/ChatGPT Image Sep 9, 2026, 03_43_36 PM.webp` — đạt, đúng tinh thần brief (một điểm
son duy nhất, tư liệu cổ, không dính motif cấm). Trước khi đưa An, đổi tên theo rule đặt tên ảnh SEO của
dự án, đề xuất: `ve-lasoviet-tu-lieu-co-mo-trang-homepage.webp`.

## Danh sách file

| File | Trang | Trạng thái khi đưa cho An |
|---|---|---|
| `vi/brand.home.md` | `/` | Sẵn sàng — không phụ thuộc engineering, chỉ chờ 2 quyết định nhỏ đánh dấu bên trong |
| `vi/methodology.root.md` | `/phuong-phap` | Sẵn sàng |
| `vi/methodology.tu-vi.md` | `/phuong-phap/tu-vi` | Sẵn sàng |
| `vi/methodology.ai-evidence.md` | `/phuong-phap/ai-va-can-cu` | Sẵn sàng |
| `vi/trust.sources.md` | `/nguon-tri-thuc` | Chờ 1 xác nhận nhỏ (đánh dấu bên trong) |
| `vi/brand.about.md` | `/ve-la-so-viet` | Chờ 1 xác nhận nhỏ (đánh dấu bên trong) |
| `vi/private.chart.md` | `/la-so/{chartId}` | Sẵn sàng — không phụ thuộc payment engineering |
| `vi/private.chart.topic.md` | `/la-so/{chartId}/chon-luan-giai` | **Chờ WP-01/WP-02** (contract nhiều SKU) |
| `vi/private.checkout.md` | `/thanh-toan/{orderId}` | **Chờ WP-01/WP-02/WP-02B** (payment_code, TTL 24h, tự nhận giao dịch) |

Route mà `implementation_state` ghi "sẵn sàng" nghĩa là nội dung không còn phụ thuộc phần code chưa xong —
vẫn cần anh đọc/sửa tay và An implement/PR/merge theo đúng quy trình bình thường, không phải đã publish.
