# methodology.root — /phuong-phap — live_indexable

- Nguồn đã đọc: `content/public/vi/pages/method.mdx`, `public-content-page.tsx` (`RichContentPage`). Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Người muốn tìm hiểu sâu về phương pháp luận của Lá Số Việt: Hệ thống xử lý dữ liệu thế nào, thuật toán an sao ra sao và lời diễn giải được tạo ra như thế nào.
- Một câu cần nhớ: "Phương pháp luận Lá Số Việt: Đường đi 4 chặng từ dữ liệu thời khắc đến lời diễn giải minh bạch."
- CTA chính → `methodology.tu-vi`; CTA phụ → `methodology.ai-evidence`

---

## Insight Card
- **moment:** Muốn biết đằng sau một lá số Tử Vi đẹp mắt là một hệ thống thuật toán nghiêm túc hay chỉ là một script bói toán tạo văn bản ngẫu nhiên.
- **feeling:** Thận trọng, đề cao sự minh bạch và tính chính xác của công nghệ.
- **search words:** "phương pháp lá số việt", "nguyên lý an sao tử vi", "thuật toán lá số việt", "phương pháp luận huyền học"
- **category/alternatives:** Diễn giải huyền học mơ hồ "bí truyền không thể tiết lộ" để giấu đi sự yếu kém về công nghệ.
- **what already tried:** Đọc các trang web khác nhưng không nơi nào cho xem sơ đồ xử lý dữ liệu (data pipeline).
- **belief to address:** "Huyền học và công nghệ máy tính không thể kết hợp minh bạch." -> Lá Số Việt công khai toàn bộ đường đi 4 chặng của dữ liệu từ thời khắc sinh đến bài luận giải.
- **verified proof:** Sơ đồ pipeline 4 chặng (Input -> An sao thiên văn -> Quy tắc diễn giải -> Bóc tách căn cứ) hiển thị công khai.
- **story source:** Tình huống một lập trình viên hoặc nhà nghiên cứu muốn kiểm tra xem hệ thống có dùng thuật toán chuẩn xác không.
- **plain explanation:** Chúng tôi coi phương pháp luận là lời hứa thương hiệu. Mọi dữ liệu bạn nhập vào đều đi qua 4 chặng kiểm xử nghiêm ngặt.
- **one action:** Bấm vào từng chặng trên sơ đồ để xem giải thích chi tiết.
- **confidence:** High (Trang hub phương pháp luận P1).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Phương pháp luận Lá Số Việt
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Minh bạch đường đi. Chuẩn xác dữ liệu.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Một nhận định đi qua những bước nào? Sơ đồ 4 chặng minh bạch.
- **Lead:** Khám phá quy trình xử lý dữ liệu khoa học đằng sau Lá Số Việt: Từ thời khắc bạn sinh ra đến đồ hình an sao chuẩn xác và lời luận giải có nút "Vì sao?".
- **CTA chính:** Khám phá phương pháp an sao Tử Vi → (`methodology.tu-vi`)
- **CTA phụ:** Xem cơ chế AI & Nút căn cứ → (`methodology.ai-evidence`)
- **Visual:** Sơ đồ Pipeline 4 chặng cuộn ngang/dọc với icon hiện đại. Alt: "Sơ đồ 4 chặng phương pháp luận Lá Số Việt".
- **390px:** Hero hiển thị tiêu đề và sơ đồ 4 chặng dạng Stepper 1 cột dọc.
- **1440px:** Layout split 2 cột: Trái giới thiệu, phải sơ đồ tương tác.

---

### S2 — Sơ đồ Pipeline 4 Chặng minh bạch
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Bốn chặng nghiêm ngặt. Một đường đi rõ ràng.
- **H2 (Headline sáng tạo - Cấu trúc song song):** Bốn chặng xử lý từ dữ liệu đến bài luận.
- **Body (4 Chặng):**
  1. **Chặng 1 - Tiếp nhận & Quy đổi lịch pháp (Input Layer):** Chuyển đổi chính xác ngày giờ sinh Dương lịch sang Âm lịch thiên văn theo múi giờ UTC+7 Việt Nam. Xử lý chính xác các trường hợp tháng nhuận và ranh giới canh giờ.
  2. **Chặng 2 - An sao & Dựng đồ hình (Engine Layer):** Áp dụng thuật toán an sao chuẩn ngạch (động cơ `iztro` / `ziwei.default`) để dựng nên đồ hình 12 Cung, xác định Cục Mệnh và tọa độ 108+ ngôi sao.
  3. **Chặng 3 - Diễn giải bằng ngôn ngữ tự nhiên (Copy Layer):** Kết hợp các quy tắc cổ thư với ngôn ngữ tiếng Việt thuần túy, loại bỏ từ ngữ hù dọa u uất và đưa ra góc nhìn thực tế cho người đọc.
  4. **Chặng 4 - Bóc tách căn cứ "Vì sao?" (Evidence Layer):** Gắn nút "Vì sao?" trên từng câu luận giải, cho phép người đọc mở ra xem quy tắc an sao và trích dẫn cổ thư tương ứng.
- **Visual:** Card 4 chặng có thể bấm lật mặt sau để xem chi tiết thuật toán. Alt: "4 chặng xử lý dữ liệu Lá Số Việt".
- **390px:** Stepper 4 bước dọc có chỉ báo nút bấm mở rộng.
- **1440px:** Grid 4 cột đều nhau có mũi tên dẫn hướng.
- **Claim ledger:** "Quy đổi lịch pháp UTC+7" → Verified. "Engine an sao iztro" → Verified.

---

### S3 — Hiện trạng & Ranh giới: Hệ nào live, hệ nào đang nghiên cứu?
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Trung thực trạng thái. Không hứa hão huyền.
- **H2 (Headline sáng tạo - Tương phản):** Điều hệ thống đang làm thật và điều đang hoàn thiện.
- **Body:**
  - **Hệ thống đang hoạt động (Live 100%):** Bộ môn Tử Vi Đẩu Số — từ an sao, dựng chart đến các bài luận giải chuyên sâu và nút căn cứ.
  - **Hệ thống đang nghiên cứu (Roadmap):** Bát Tự, Kinh Dịch, Chiêm Tinh Tây Phương và Thần Số Học đang được kiểm thử thuật toán và biên soạn ngân hàng quy tắc trước khi mở công khai.
- **Visual:** Bảng lộ trình sản phẩm minh bạch với 2 trạng thái rõ ràng. Alt: "Trạng thái các bộ môn tại Lá Số Việt".

---

### S4 — Lời kết & CTA Kết trang
- **Eyebrow (Chơi chữ - Slogan ngắn):** Tin tưởng vào phương pháp. Khám phá bản thể.
- **H2 (Headline sáng tạo - Điệp vần):** Bạn muốn tìm hiểu sâu hơn về phương pháp an sao Tử Vi?
- **CTA chính:** Xem chi tiết Phương pháp Tử Vi → (`methodology.tu-vi`)
- **CTA phụ:** Lập lá số Tử Vi ngay → (`calculator.tu-vi`)

---

## SEO + Metadata + Schema

- **SEO Title:** Phương Pháp Luận Lá Số Việt — Sơ Đồ Xử Lý Dữ Liệu Minh Bạch
- **Meta Description:** Khám phá phương pháp luận của Lá Số Việt: Quy trình 4 chặng xử lý dữ liệu từ thời khắc sinh đến an sao chuẩn xác và bóc tách căn cứ nút "Vì sao?".
- **Canonical URL:** `https://lasoviet.net/phuong-phap`
- **Internal Links:**
  - `/phuong-phap/tu-vi` (Phương pháp Tử Vi)
  - `/phuong-phap/ai-va-can-cu` (AI & Căn cứ)
  - `/nguon-tri-thuc` (Bảng nguồn tri thức)

---

## File / Key Mapping
- `content/public/vi/pages/method.mdx`
- `apps/web/src/features/public-pages/public-content-page.tsx`
