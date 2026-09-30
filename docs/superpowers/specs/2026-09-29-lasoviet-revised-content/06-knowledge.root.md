# knowledge.root — /kien-thuc — live_indexable

- Nguồn đã đọc: `content/public/vi/pages/knowledge.mdx`, `apps/web/src/features/knowledge/knowledge-hub.tsx`, `knowledge-data.ts`. Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Người muốn tìm hiểu kiến thức huyền học nói chung, chưa biết nên đọc bài nào trước, muốn có lộ trình tự học hoặc tra cứu minh bạch.
- Một câu cần nhớ: "Thư viện kiến thức huyền học Lá Số Việt: Hệ thống hóa tri thức cổ, diễn giải bằng tiếng Việt minh bạch."
- CTA chính → `knowledge.tu-vi`; CTA phụ → `calculator.tu-vi`

---

## Insight Card
- **moment:** Muốn học và hiểu về Tử Vi hay các môn thuật số nhưng bị ngợp giữa hàng ngàn bài viết chắp vá, sai lệch trên mạng.
- **feeling:** Tò mò nhưng ngại các bài viết học thuật quá nặng nề hoặc chứa đầy từ ngữ Hán Việt đánh đố.
- **search words:** "kiến thức tử vi", "tự học tử vi", "thư viện huyền học", "tìm hiểu lá số tử vi"
- **category/alternatives:** Diễn đàn tử vi cổ điển bài viết dàn trải, blog cá nhân chia sẻ kinh nghiệm chưa được kiểm chứng.
- **what already tried:** Đọc thử vài bài trên Google nhưng thấy mỗi nơi nói một kiểu, không có lộ trình hệ thống.
- **belief to address:** "Học Tử Vi rất khó và phải nhớ hàng nghìn câu phú rối rắm." -> Lá Số Việt đúc kết tri thức thành các nhóm bài ngắn gọn, dễ hiểu và gắn liền với đồ hình thực tế.
- **verified proof:** 5 cụm chủ đề kiến thức được phân loại rõ ràng theo mức độ nhập môn đến nâng cao.
- **story source:** Tình huống người đọc sa vào ma trận thuật ngữ mà không biết bài nào là nền tảng cần đọc trước.
- **plain explanation:** Đây là thư viện kiến thức tổng hợp. Bạn có thể chọn đọc theo lộ trình nhập môn hoặc tra cứu theo chủ đề mình quan tâm.
- **one action:** Chọn lộ trình "Bắt đầu cho người mới" để đọc bài đầu tiên.
- **confidence:** High (Trang hub kiến thức P0/P1).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Trung tâm tri thức huyền học minh bạch
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Tri thức hệ thống. Ngôn ngữ bình dân.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Bắt đầu đọc lá số từ đâu? Thư viện kiến thức chuẩn hóa.
- **Lead:** Khám phá tri thức Tử Vi và thuật số Đông Tây được hệ thống hóa mạch lạc. Không còn những thuật ngữ bí hiểm — chỉ có sự minh bạch, dễ hiểu và dễ ứng dụng.
- **CTA chính:** Xem chuyên mục Tử Vi → (`knowledge.tu-vi`)
- **CTA phụ:** Thử lập lá số của bạn → (`calculator.tu-vi`)
- **Visual:** Banner dạng Thư viện hiện đại với hình họa sách dó mở ra đồ hình ngân hà. Alt: "Thư viện kiến thức huyền học Lá Số Việt".
- **390px:** Hero hiển thị gọn 1 màn hình, có ô tìm kiếm bài viết ở ngay dưới lead.
- **1440px:** Layout split: Trái văn bản & Search bar, phải minh họa nổi 3D.

---

### S2 — Lộ trình nhập môn 4 bước dành cho người mới
- **Eyebrow (Chơi chữ - Điệp từ):** Đi từng bước nhỏ. Hiểu cả hành trình.
- **H2 (Headline sáng tạo - Trực diện):** Lộ trình 4 bước tự đọc lá số cho người mới bắt đầu.
- **Body (4 Bài viết nền tảng):**
  1. *Bước 1:* **Lá số Tử Vi là gì?** — Hiểu cấu trúc đồ hình 12 cung và cách một lá số được hình thành. (`knowledge.tu-vi.definition`)
  2. *Bước 2:* **Giờ sinh ảnh hưởng thế nào?** — Giải đáp thắc mắc về độ chính xác thời khắc sinh và lá số tạm tính. (`knowledge.tu-vi.birth-time`)
  3. *Bước 3:* **12 Cung trong lá số Tử Vi** — Tra cứu ý nghĩa từng ô số và mối quan hệ giữa các khía cạnh cuộc sống. (`knowledge.tu-vi.palaces`)
  4. *Bước 4:* **14 Chính tinh cơ bản** — Nhận diện nhóm sao chủ đạo định hình tính cách và tư chất. (`knowledge.tu-vi.stars`)
- **Visual:** Flow 4 thẻ bài viết nối nhau dạng Timeline. Alt: "4 bước nhập môn đọc lá số Tử Vi".
- **390px:** Timeline 1 cột chạy dọc, mỗi thẻ có badge "Bài 1", "Bài 2"...
- **1440px:** Grid 4 cột nằm ngang có mũi tên dẫn hướng.
- **Claim ledger:** "Lộ trình 4 bài cơ bản" → Verified (`knowledge-data.ts`).

---

### S3 — Năm cụm chủ đề tri thức cốt lõi
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Phân loại rõ ràng. Tra cứu dễ dàng.
- **H2 (Headline sáng tạo - Nhịp ngắn):** Chọn chuyên mục bạn muốn khám phá.
- **Body (5 Cluster Hub Cards):**
  1. **Nhập môn Tử Vi:** Định nghĩa, cách lập lá số, cách đọc 60 giây cho người mới.
  2. **12 Cung & Cấu trúc:** Chi tiết Mệnh, Thân, Quan, Tài, Phu Thê và tam hợp đối cung.
  3. **Sao & Tổ hợp sao:** 14 chính tinh, phụ tinh và cách diễn giải vị trí đắc/miếu/hãm.
  4. **Vận trình & Thời gian:** Đại vận 10 năm, tiểu vận hàng năm và cách nhìn mốc thời gian.
  5. **Phương pháp & Niềm tin:** So sánh trường phái, kiểm chứng độ chính xác và ranh giới AI.
- **Visual:** Grid 5 thẻ chuyên mục với icon sắc nét. Alt: "5 cụm chủ đề kiến thức Tử Vi".
- **390px:** Xếp 1 cột 5 thẻ, có bộ lọc Filter Chips ở đỉnh để chọn nhanh.
- **1440px:** Grid 3x2 cân đối trên màn hình lớn.
- **Claim ledger:** "5 cluster kiến thức" → Verified.

---

### S4 — CTA Kết trang: Thực hành trên lá số thật
- **Eyebrow (Chơi chữ - Slogan ngắn):** Học đi đôi với hành. Đọc ngay lá số.
- **H2 (Headline sáng tạo - Điệp vần):** Tri thức chỉ thực sự sống động khi chiếu vào chính bạn.
- **Body:** Đã nắm được các khái niệm cơ bản? Hãy lập ngay lá số cá nhân của bạn để vừa đọc vừa đối chiếu thực tế.
- **CTA chính:** Lập lá số và tự đối chiếu ngay → (`calculator.tu-vi`)
- **CTA phụ:** Đọc chuyên mục Tử Vi → (`knowledge.tu-vi`)

---

## SEO + Metadata + Schema

- **SEO Title:** Kiến Thức Tử Vi & Huyền Học Số — Lộ Trình Tự Học Minh Bạch | Lá Số Việt
- **Meta Description:** Thư viện kiến thức Tử Vi đúc kết chuẩn xác, dễ hiểu. Lộ trình tự học 4 bước cho người mới, tra cứu 12 cung, 14 chính tinh và vận hạn có căn cứ cổ thư.
- **Canonical URL:** `https://lasoviet.net/kien-thuc`
- **Internal Links:**
  - `/kien-thuc/tu-vi` (Chuyên mục Tử Vi)
  - `/kien-thuc/tu-vi/la-so-tu-vi-la-gi` (Bài 1: Lá số Tử Vi là gì)
  - `/tu-vi` (Lập lá số)

---

## File / Key Mapping
- `content/public/vi/pages/knowledge.mdx`
- `apps/web/src/features/knowledge/knowledge-hub.tsx`
- `knowledge-data.ts`
