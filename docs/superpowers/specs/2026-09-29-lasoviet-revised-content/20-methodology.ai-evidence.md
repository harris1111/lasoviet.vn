# methodology.ai-evidence — /phuong-phap/ai-va-can-cu — live_indexable

- Nguồn đã đọc: `content/public/vi/pages/method.ai-evidence.mdx`, `public-content-page.tsx` (`MethodologyPage`). Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Người lo ngại AI sẽ "bịa ra lời luận giải" thiếu căn cứ, muốn biết cơ chế bóc tách nguồn đằng sau nút "Vì sao?" vận hành như thế nào.
- Một câu cần nhớ: "AI tại Lá Số Việt là công cụ diễn đạt ngôn ngữ, dữ liệu lá số và quy tắc cổ thư giữ vai trò căn cứ."
- CTA chính → `sample-report.tu-vi`; CTA phụ → `calculator.tu-vi`

---

## Insight Card
- **moment:** Thấy ứng dụng dùng công nghệ AI để luận giải lá số và lo sợ AI sẽ sinh ra văn bản bịa đặt (hallucination) trôi chảy nhưng vô nghĩa.
- **feeling:** Nghi ngờ công nghệ AI, muốn kiểm chứng xem AI có thực sự tuân thủ quy tắc Tử Vi cổ thư không.
- **search words:** "ai xem tử vi", "lá số việt ai và căn cứ", "nút vì sao lá số việt", "trí tuệ nhân tạo luận giải tử vi"
- **category/alternatives:** Chatbot AI thông thường phán nhảm nhí không có dữ liệu an sao hay quy tắc đối chiếu.
- **what already tried:** Trò chuyện với ChatGPT về tử vi nhưng thấy nó phán linh tinh và nhầm lẫn các sao với nhau.
- **belief to address:** "AI trong Lá Số Việt tự do bịa ra lời luận giải." -> Lá Số Việt đính chính: AI bị giới hạn bởi Ngân hàng quy tắc (Ruleset) và chỉ được diễn đạt lại các căn cứ có sẵn trên đồ hình.
- **verified proof:** Nút "Vì sao?" trên giao diện cho phép bấm mở ra xem chính xác câu luận giải được rút ra từ những sao nào và quy tắc cổ thư nào.
- **story source:** Tình huống người đọc thấy câu "Bạn hợp với nghề quản lý" và bấm nút "Vì sao?" để thấy căn cứ "Sao Thiên Phủ miếu địa tại Cung Quan Lộc".
- **plain explanation:** AI đóng vai trò như một người biên dịch tiếng Việt tự nhiên. Nó không tự chế ra quy tắc — mọi câu nói đều phải xuất phát từ dữ liệu lá số thực tế của bạn.
- **one action:** Bấm thử nút "Vì sao?" trên bản báo cáo mẫu để xem cơ chế vận hành.
- **confidence:** High (Trang phương pháp AI & Căn cứ P1).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Cơ chế AI & Nút căn cứ "Vì sao?"
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Diễn đạt tự nhiên. Căn cứ minh bạch.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** AI và Căn cứ: Cách nút "Vì sao?" bảo vệ sự thật.
- **Lead:** Khám phá cơ chế giới hạn AI tại Lá Số Việt: Mọi lời luận giải đều phải đi từ dữ liệu lá số, thông qua ngân hàng quy tắc và bóc tách rõ ràng nguồn trích dẫn.
- **CTA chính:** Xem báo cáo mẫu có nút "Vì sao?" → (`sample-report.tu-vi`)
- **CTA phụ:** Lập lá số riêng của bạn → (`calculator.tu-vi`)
- **Visual:** Widget tương tác minh họabefore/after: Bên trái là câu luận giải, Bên phải là Drawer mở ra căn cứ sau khi bấm nút "Vì sao?". Alt: "Minh họa nút Vì sao tại Lá Số Việt".
- **390px:** Widget hiển thị gọn mượt mượt trên 390px mobile.
- **1440px:** Layout split 2 cột sắc nét.

---

### S2 — Ba lớp kiến tạo nên một nhận định chuẩn xác
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Ba lớp kiểm soát. Loại bỏ ảo giác.
- **H2 (Headline sáng tạo - Cấu trúc song song):** AI tại Lá Số Việt hoạt động dưới 3 lớp kiểm soát nghiêm ngặt.
- **Body (3 Lớp kiểm soát):**
  1. **Lớp 1 - Đồ hình lá số chuẩn xác (Data Core):** Tọa độ 12 cung và 108+ sao được tính toán bằng động cơ an sao thuần toán học (`iztro`), hoàn toàn độc lập với AI.
  2. **Lớp 2 - Ngân hàng quy tắc cổ thư (Ruleset Library):** Hệ thống trích xuất các quy tắc tương ứng với vị trí sao (VD: *Sao Thái Dương miếu địa tại Tị = Chủ về sự quang hoa, danh tiếng*).
  3. **Lớp 3 - Diễn đạt ngôn ngữ tự nhiên (AI Generator):** AI lấy quy tắc từ Lớp 2 để viết thành câu tiếng Việt tự nhiên, ấm áp, loại bỏ từ ngữ Hán Việt bí hiểm mà không làm thay đổi bản chất quy tắc.
- **Visual:** Sơ đồ 3 lớp kiểm soát AI (Input Data -> Deterministic Ruleset -> Constrained AI Output). Alt: "3 lớp kiểm soát AI trong Tử Vi".
- **390px:** Stepper 3 bước dọc.
- **1440px:** Grid 3 cột mạch lạc.
- **Claim ledger:** "AI hoạt động dưới sự kiểm soát của Ruleset" → Verified (Quy trình sản phẩm).

---

### S3 — Ranh giới đỏ: Những điều AI tuyệt đối KHÔNG ĐƯỢC LÀM
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Minh bạch ranh giới. Bảo vệ người dùng.
- **H2 (Headline sáng tạo - Tương phản):** Bốn ranh giới đỏ AI không bao giờ được vi phạm.
- **Body (4 Ranh giới cấm):**
  - **1. KHÔNG chẩn đoán bệnh tật cụ thể:** AI không được phán tên bệnh, không thay thế chẩn đoán y khoa.
  - **2. KHÔNG phán ngày chết / tuổi thọ:** Tuyệt đối không phán xét sinh tử hay các mốc thời gian u uất.
  - **3. KHÔNG hù dọa để bán vật phẩm:** Không tự tạo ra nỗi sợ hãi để gợi ý mua bùa cúng hay phong thủy.
  - **4. KHÔNG tiên đoán số may rủi ngẫu nhiên:** Không dự đoán số lô đề, kết quả tài chính mạo hiểm.
- **Visual:** Box ranh giới đỏ với icon tấm khiên bảo vệ viền Cinnabar. Alt: "4 ranh giới cấm của AI Lá Số Việt".

---

### S4 — Lời kết & CTA Kết trang
- **Eyebrow (Chơi chữ - Slogan ngắn):** Trải nghiệm minh bạch. An tâm đồng hành.
- **H2 (Headline sáng tạo - Điệp vần):** Thử bấm nút "Vì sao?" ngay trên báo cáo mẫu.
- **CTA chính:** Trải nghiệm bản báo cáo mẫu ngay → (`sample-report.tu-vi`)
- **CTA phụ:** Lập lá số cá nhân của bạn → (`calculator.tu-vi`)

---

## SEO + Metadata + Schema

- **SEO Title:** AI & Căn Cứ — Cách Nút "Vì Sao?" Vận Hành Minh Bạch | Lá Số Việt
- **Meta Description:** Tìm hiểu cách AI vận hành tại Lá Số Việt: Giới hạn AI bằng ngân hàng quy tắc cổ thư, minh bạch căn cứ nút "Vì sao?" và 4 ranh giới đỏ bảo vệ người dùng.
- **Canonical URL:** `https://lasoviet.net/phuong-phap/ai-va-can-cu`
- **Internal Links:**
  - `/bao-cao-mau/tu-vi` (Trang báo cáo mẫu)
  - `/phuong-phap/tu-vi` (Phương pháp Tử Vi)
  - `/nguon-tri-thuc` (Bảng nguồn tri thức)

---

## File / Key Mapping
- `content/public/vi/pages/method.ai-evidence.mdx`
- `apps/web/src/features/public-pages/public-content-page.tsx`
