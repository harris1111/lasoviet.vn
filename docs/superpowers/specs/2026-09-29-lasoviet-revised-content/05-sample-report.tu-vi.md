# sample-report.tu-vi — /bao-cao-mau/tu-vi — live_indexable

- Nguồn đã đọc: `content/public/vi/pages/sample.ziwei.mdx`, `apps/web/src/features/sample-report/sample-report-page.tsx`, `sample-ziwei-data.ts`, `apps/web/messages/vi/ziwei.json`. Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Đang tò mò muốn xem thử một bản báo cáo luận giải Tử Vi hoàn chỉnh trông như thế nào trước khi quyết định dùng dịch vụ hoặc nạp Lá.
- Một câu cần nhớ: "Báo cáo mẫu Tử Vi: Trải nghiệm thực tế giao diện đọc, cấu trúc phân tích và tính năng bóc tách căn cứ."
- CTA chính → `calculator.tu-vi`; CTA phụ → `commercial.tu-vi.identity`

---

## Insight Card
- **moment:** Muốn "sờ tận tay, thấy tận mắt" sản phẩm trước khi chi tiền, sợ quảng cáo một đằng sản phẩm thật một nẻo.
- **feeling:** Thận trọng, nghi ngờ chất lượng bài luận giải tự động, muốn kiểm tra xem giọng văn có trôi chảy và có căn cứ thật không.
- **search words:** "báo cáo tử vi mẫu", "xem mẫu luận giải tử vi", "mẫu lá số tử vi việt", "dùng thử lá số việt"
- **category/alternatives:** Xem screenshot quảng cáo mờ nhòe trên Facebook hoặc các trang không cho xem trước sản phẩm.
- **what already tried:** Xem các bài viết quảng cáo hứa hẹn nhiều nhưng khi vào web thì bắt nạp tiền ngay mới cho xem giao diện.
- **belief to address:** "Dịch vụ online toàn dùng hình ảnh dựng sẵn để lừa khách." -> Lá Số Việt cung cấp một bản báo cáo mẫu tương tác 100% bằng dữ liệu tĩnh thật.
- **verified proof:** Trang báo cáo mẫu có đầy đủ tabs chuyển đổi 12 cung, biểu đồ lá số tương tác và nút "Vì sao?" chạy thật trên dữ liệu mẫu.
- **story source:** Tình huống người mua thanh toán xong mới ngã ngửa vì giao diện xấu, khó đọc và bài viết đầy lỗi phông chữ.
- **plain explanation:** Đây là bản báo cáo mẫu tĩnh dùng dữ liệu giả lập minh bạch. Bạn có thể bấm thử mọi tính năng như trên một lá số thật.
- **one action:** Trải nghiệm hai thao tác bấm thử trên bản mẫu và lập lá số cho chính mình.
- **confidence:** High (Trang báo cáo mẫu P0).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Giới thiệu bản báo cáo mẫu
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Trải nghiệm thực tế. Minh bạch cấu trúc.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Báo cáo luận giải mẫu: Trực quan giao diện, minh bạch căn cứ.
- **Lead:** Đây là bản luận giải tĩnh minh họa cho cấu trúc bài đọc "Tử Vi Trọn Đời". Mọi tính năng tương tác — từ chuyển tab 12 cung đến nút bóc tách căn cứ "Vì sao?" — đều hoạt động giống hệt trên lá số của bạn.
- **Badge thông báo:** `[DỮ LIỆU MINH HỌA - BẢN MẪU CÔNG KHAI]`
- **CTA chính:** Lập lá số cá nhân của bạn ngay → (`calculator.tu-vi`)
- **Visual:** Banner Hero có badge "BẢN MẪU TĨNH" nổi bật màu vàng Kim trên nền tối. Alt: "Trang báo cáo luận giải Tử Vi mẫu tại Lá Số Việt".
- **390px:** Hero gọn gàng, badge hiển thị rõ ở dòng đầu tiên.
- **1440px:** Container trung tâm 800px căn giữa.

---

### S2 — Hướng dẫn 2 thao tác trải nghiệm
- **Eyebrow (Chơi chữ - Điệp phụ âm):** Hai thao tác. Thấu quy trình.
- **H2 (Headline sáng tạo - Trực diện):** Thử ngay 2 tính năng cốt lõi trên bản mẫu.
- **Body (2 Bước hướng dẫn trải nghiệm):**
  1. **Thao tác 1 - Chọn Cung để đọc:** Bấm vào bất kỳ Cung nào trên Đồ hình (hoặc chọn từ danh sách Tab) để chuyển đổi bài phân tích chuyên sâu cho cung đó.
  2. **Thao tác 2 - Bấm nút "Vì sao?":** Tìm đến các đoạn luận giải có biểu tượng nút "Vì sao?" và bấm vào để xem phần bóc tách quy tắc an sao và tài liệu cổ thư trích dẫn.
- **Visual:** Box chỉ dẫn dạng Tooltip overlay nhẹ nhàng hướng dẫn ngón tay bấm thử. Alt: "Hướng dẫn 2 thao tác trải nghiệm báo cáo mẫu".
- **390px:** Overlay dạng Card ghim ở chân màn hình (Sticky Bottom Hint) dễ tắt mở.
- **1440px:** Tooltip nhấp nháy nhẹ ở góc phải màn hình báo cáo.
- **Claim ledger:** "Tương tác tabs & nút Vì sao trên bản mẫu" → Verified (`SampleReportPage`).

---

### S3 — Khung hiển thị Báo cáo mẫu tương tác (Interactive Viewer)
- **H2 (Headline sáng tạo - Nhịp biệt lập):** Giao diện đọc trực tiếp.
- **Giao diện hiển thị (Dữ liệu từ Component `SampleReportPage` & `messages/vi/ziwei.json`):**
  - Khối Đồ hình Lá số SVG minh họa (Lá số mẫu: Nam mệnh, sinh năm Giáp Tý, giờ Ngọ).
  - Thanh Tabs điều hướng: `[Tổng quan Cục Mệnh]` | `[Cung Quan Lộc]` | `[Cung Tài Bạch]` | `[Cung Phu Thê]` | `[Đại Vận]`.
  - Nội dung bài đọc mẫu với phông chữ Source Serif 4 trang nhã, khoảng cách dòng rộng rãi 1.7 dễ đọc.
  - Các khối Callout giải thích quy tắc an sao xuất hiện khi bấm nút "Vì sao?".
- **Visual:** Khung đọc báo cáo tràn chiều rộng màn hình với các thanh công cụ điều hướng mượt mà. Alt: "Khung hiển thị bài luận giải Tử Vi mẫu".
- **390px:** Đồ hình co giãn responsive, văn bản đọc 17px sắc nét.
- **1440px:** Layout đọc sách 2 cột: Cột trái cố định Đồ hình mini, cột phải cuộn đọc nội dung bài luận.

---

### S4 — Callout Ranh giới: "Bản mẫu này cho bạn thấy điều gì?"
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Thấy rõ cấu trúc. Không phán cá nhân.
- **H2 (Headline sáng tạo - Tương phản):** Bản mẫu thể hiện phương pháp, không nói về cá nhân bạn.
- **Body:**
  - *Điều bản mẫu cho bạn thấy:* Giao diện đọc thực tế, độ sâu của nội dung phân tích, sự trôi chảy của tiếng Việt và tính minh bạch của các nút tra cứu căn cứ.
  - *Điều bản mẫu không có:* Lá số riêng của bạn. Để có bài luận giải cá nhân hóa 100% dựa trên ngày giờ sinh chính xác của mình, bạn cần lập lá số riêng.
- **Visual:** Callout Box viền son Cinnabar với phong cách ghi chú biên tập (Editorial Note). Alt: "Ghi chú về bản báo cáo mẫu Lá Số Việt".
- **390px:** Margin 16px hai bên, bo góc 8px.
- **1440px:** Container 760px căn giữa.

---

### S5 — CTA Kết trang: Chuyển sang lá số của bạn
- **Eyebrow (Chơi chữ - Slogan ngắn):** Đã thấy sự minh bạch. Bắt đầu hành trình riêng.
- **H2 (Headline sáng tạo - Điệp vần):** Sẵn sàng khám phá bản báo cáo của chính bạn?
- **Body:** Bạn đã trải nghiệm xong bản mẫu. Giờ là lúc nhập thông tin ngày sinh để khai mở lá số và bài luận giải dành riêng cho bạn.
- **CTA chính:** Khai mở lá số riêng của bạn ngay → (`calculator.tu-vi`)
- **CTA phụ:** Khám phá chi tiết gói Tử Vi Trọn Đời → (`commercial.tu-vi.identity`)

---

## SEO + Metadata + Schema

- **SEO Title:** Báo Cáo Luận Giải Tử Vi Mẫu — Trải Nghiệm Thực Tế | Lá Số Việt
- **Meta Description:** Xem thử bản báo cáo luận giải Tử Vi mẫu hoàn chỉnh. Trải nghiệm giao diện đọc sắc nét, thử nút bóc tách căn cứ nút "Vì sao?" trên dữ liệu minh họa công khai.
- **Canonical URL:** `https://lasoviet.net/bao-cao-mau/tu-vi`
- **Internal Links:**
  - `/tu-vi` (Lập lá số riêng)
  - `/luan-giai-tu-vi/tong-quan-ban-menh` (Chi tiết gói Tử Vi trọn đời)
  - `/phuong-phap/ai-va-can-cu` (Giải thích cơ chế nút "Vì sao?")

---

## File / Key Mapping
- `content/public/vi/pages/sample.ziwei.mdx`
- `apps/web/src/features/sample-report/sample-report-page.tsx`
- `sample-ziwei-data.ts`
- `apps/web/messages/vi/ziwei.json`

---

## Fact Ledger & Review Notes
- **Fact check:** Giữ nguyên dữ liệu mẫu tĩnh trong component và file JSON, chỉ sửa phần văn bản biên tập dẫn dắt xung quanh theo đúng tinh thần handoff.
