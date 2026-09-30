# knowledge.tu-vi.calculation — /kien-thuc/tu-vi/cach-lap-la-so-tu-vi — live_indexable

- Nguồn đã đọc: `content/public/vi/articles/cach-lap-la-so-tu-vi.mdx`, `knowledge-article.tsx`, `knowledge-data.ts`. Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Muốn tìm hiểu quy trình tính toán để lập nên một lá số Tử Vi, cần nhập những thông tin gì và máy tính an sao thế nào.
- Một câu cần nhớ: "Cách lập lá số Tử Vi chuẩn xác: 3 bước quy đổi lịch pháp, xác định Mệnh Thân và an sao tự động."
- CTA chính → `calculator.tu-vi`; CTA phụ → `knowledge.tu-vi.reading`

---

## Insight Card
- **moment:** Chuẩn bị lập lá số cho bản thân hoặc người nhà, muốn biết cần chuẩn bị những thông tin gì để lá số không bị sai lệch.
- **feeling:** Cẩn thận, sợ nhập sai múi giờ hay sai lịch Âm/Dương dẫn đến lá số sai hoàn toàn.
- **search words:** "cách lập lá số tử vi", "hướng dẫn lấy lá số tử vi", "lập lá số tử vi chuẩn xác", "cách tính lá số tử vi"
- **category/alternatives:** Sách dạy lập lá số thủ công ngàn trang bấm tay phức tạp, hoặc các web lập lá số không công bố công thức.
- **what already tried:** Tự mò mẫm tra lịch âm dương trên mạng rồi tính bằng tay nhưng sợ bị nhầm tháng nhuận.
- **belief to address:** "Muốn lập lá số Tử Vi phải tự bấm tay học thuộc lòng công thức an sao." -> Lá Số Việt tự động hóa 100% quy trình tính toán thiên văn chuẩn xác chỉ trong 3 giây.
- **verified proof:** Hệ thống quy đổi Âm - Dương lịch thiên văn Việt Nam tích hợp sẵn trong form lập lá số.
- **story source:** Tình huống người dùng nhập sinh 12h đêm không biết thuộc tính là ngày hôm trước hay hôm sau.
- **plain explanation:** Bạn chỉ cần cung cấp Ngày, Tháng, Năm, Giờ sinh và Giới tính. Hệ thống sẽ tự động quy đổi Âm lịch, tính Cục Mệnh và an sao chính xác.
- **one action:** Chuẩn bị thông tin ngày sinh và bấm nút Lập lá số.
- **confidence:** High (Bài 2 trong lộ trình nhập môn).

---

## Từng section theo thứ tự mobile

### S1 — Hero & Direct Answer
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Quy trình chuẩn xác. Tự động ba giây.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Cách lập lá số Tử Vi: Từ thông tin ngày sinh đến đồ hình hoàn chỉnh.
- **Direct Answer:** **Để lập một lá số Tử Vi chuẩn xác, bạn cần 4 thông tin đầu vào cơ bản: Ngày, Tháng, Năm sinh, Giờ sinh và Giới tính (Nam/Nữ).** Hệ thống máy tính sẽ thực hiện 3 bước: Quy đổi Dương lịch sang Âm lịch thiên văn, xác định vị trí Cung Mệnh/Cung Thân và an hơn 100 ngôi sao vào 12 ô vị trí theo quy luật cổ thư.
- **Visual:** Flow sơ đồ 3 bước quy trình lập lá số từ Input đến Chart output. Alt: "Quy trình 3 bước lập lá số Tử Vi chuẩn xác".
- **390px:** Flow dạng dọc với 3 thẻ nối bằng mũi tên chỉ xuống.
- **1440px:** Flow ngang 3 bước sắc nét.

---

### S2 — Bốn thông tin bắt buộc khi lập lá số
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Bốn dữ liệu nền. Quyết định độ chuẩn.
- **H2 (Headline sáng tạo - Trực diện):** Giải mã chi tiết 4 thông tin đầu vào.
- **Body (4 Ô dữ liệu):**
  1. **Ngày, Tháng, Năm sinh:** Có thể dùng Dương lịch hoặc Âm lịch. Hệ thống tự động quy đổi chính xác theo múi giờ Việt Nam (UTC+7).
  2. **Giờ sinh chính xác:** Giờ sinh quyết định vị trí Cung Mệnh và Cung Thân. Tử Vi chia 1 ngày thành 12 canh giờ (mỗi canh giờ bằng 2 tiếng đồng hồ Dương lịch).
  3. **Giới tính (Nam / Nữ):** Giới tính kết hợp với năm sinh để xác định thuộc tính Âm Nam, Dương Nam, Âm Nữ, hay Dương Nữ (quyết định chiều quay đại vận thuận hay nghịch).
  4. **Năm xem lá số (Tùy chọn):** Dùng để tính vị trí các sao lưu (Lưu Thái Tuế, Lưu Lộc Tồn...) nhằm xem vận hạn năm cụ thể.
- **Visual:** Bảng anatomy Form nhập liệu với chú giải kỹ thuật từng ô. Alt: "4 thông tin đầu vào lập lá số Tử Vi".
- **390px:** Grid 2x2 gọn gàng trên mobile.
- **1440px:** Bảng thông số 4 cột rõ ràng.
- **Claim ledger:** "Múi giờ UTC+7 Âm lịch thiên văn" → Verified (`iztro` engine).

---

### S3 — Xử lý trường hợp "Không nhớ chính xác giờ sinh"
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Thiếu giờ sinh. Vẫn có giải pháp.
- **H2 (Headline sáng tạo - Thành ngữ biến tấu):** Nhớ khoảng giờ, vẫn lập được lá số tạm tính.
- **Body:** Nếu bạn chỉ nhớ mình sinh vào khoảng "buổi sáng" (từ 7h - 9h hay 9h - 11h), hãy chọn tùy chọn **"Tôi không nhớ chính xác giờ sinh"** trên form Lá Số Việt. Hệ thống sẽ tạo ra **Lá số tạm tính** (theo FD-103) và chỉ rõ những phần thông tin dựa trên Ngày/Tháng/Năm để bạn đọc trước, đồng thời gợi ý các điểm đối chiếu tính cách để xác định đúng canh giờ sinh về sau.
- **CTA phụ:** Đọc bài chuyên sâu: Giờ sinh ảnh hưởng thế nào? → (`knowledge.tu-vi.birth-time`)
- **Visual:** Badge "Lá số tạm tính" màu cam ấm kèm checklist đối chiếu 3 bước. Alt: "Giải pháp lá số tạm tính cho người thiếu giờ sinh".

---

### S4 — Lời kết & CTA Bài viết
- **Eyebrow (Chơi chữ - Slogan ngắn):** Thao tác đơn giản. Kết quả tức thì.
- **H2 (Headline sáng tạo - Điệp vần):** Bạn đã có đầy đủ thông tin ngày sinh chưa?
- **CTA chính:** Khai mở lá số Tử Vi của bạn ngay → (`calculator.tu-vi`)
- **CTA phụ:** Đọc bài tiếp theo: Cách đọc lá số trong 60 giây → (`knowledge.tu-vi.reading`)

---

## SEO + Metadata + Schema

- **SEO Title:** Cách Lập Lá Số Tử Vi Chuẩn Xác — Hướng Dẫn 3 Bước | Lá Số Việt
- **Meta Description:** Hướng dẫn cách lập lá số Tử Vi chuẩn xác từ ngày giờ sinh. Giải thích quy trình an sao, chuyển đổi Âm Dương lịch và giải pháp cho người không nhớ rõ giờ sinh.
- **Canonical URL:** `https://lasoviet.net/kien-thuc/tu-vi/cach-lap-la-so-tu-vi`
- **Internal Links:**
  - `/kien-thuc/tu-vi/cach-doc-la-so-tu-vi` (Bài 3: Cách đọc lá số)
  - `/kien-thuc/tu-vi/gio-sinh-anh-huong-the-nao` (Bài ảnh hưởng giờ sinh)
  - `/tu-vi` (Lập lá số)

---

## File / Key Mapping
- `content/public/vi/articles/cach-lap-la-so-tu-vi.mdx`
- `apps/web/src/features/knowledge/knowledge-article.tsx`
- `knowledge-data.ts`
