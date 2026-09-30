# methodology.tu-vi — /phuong-phap/tu-vi — live_indexable

- Nguồn đã đọc: `content/public/vi/pages/method.ziwei.mdx`, `public-content-page.tsx` (`MethodologyPage`). Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Muốn tìm hiểu chi tiết kỹ thuật an sao Tử Vi của Lá Số Việt: Công thức tính Ngũ Hành Cục, quy tắc đặt 12 cung và vị trí 14 chính tinh.
- Một câu cần nhớ: "Phương pháp an sao Tử Vi: Đọc cấu trúc bản mệnh từ đồ hình 12 cung, không phán một câu về số phận."
- CTA chính → `calculator.tu-vi`; CTA phụ → `trust.sources`

---

## Insight Card
- **moment:** Đang tìm hiểu sâu về kỹ thuật Tử Vi, muốn biết hệ thống sử dụng thuật toán an sao nào và xử lý các ca khó (tháng nhuận, ranh giới giờ) ra sao.
- **feeling:** Tò mò về góc độ kỹ thuật, coi trọng sự chuẩn xác và minh bạch của công thức.
- **search words:** "phương pháp an sao tử vi", "công thức an sao tử vi", "thuật toán an sao tử vi", "cách tính ngũ hành cục"
- **category/alternatives:** Sách cổ chữ Hán dạy an sao rải rác mỗi nơi ghi một công thức khác nhau.
- **what already tried:** Đối chiếu lá số an ở hai trang web khác nhau thấy vị trí một số phụ tinh không trùng nhau.
- **belief to address:** "An sao Tử Vi trên mạng toàn là lập trình qua loa không có căn cứ." -> Lá Số Việt công khai toàn bộ logic an sao được kiểm thử qua hàng ngàn test vector chuẩn xác.
- **verified proof:** Bảng quy tắc an sao minh bạch cho từng nhóm sao (Chính tinh, Vòng Thái Tuế, Vòng Lộc Tồn, Vòng Tràng Sinh).
- **story source:** Tình huống một ca sinh đúng 23h00 thuộc ranh giới giữa giờ Hợi ngày cũ và giờ Tý ngày mới.
- **plain explanation:** Chúng tôi sử dụng động cơ an sao chuẩn mực, công khai công thức quy đổi Âm - Dương lịch và giải thích rõ cách xử lý các ca khó.
- **one action:** Đọc phần bóc tách kỹ thuật an sao và thử lập lá số của bạn.
- **confidence:** High (Trang phương pháp Tử Vi P1).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Phương pháp an sao Tử Vi Đẩu Số
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Chuẩn mực thuật toán. Minh bạch nguồn gốc.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Phương pháp an sao Tử Vi: Từ thời khắc sinh đến đồ hình 12 cung.
- **Lead:** Khám phá chi tiết quy trình an sao toán học tại Lá Số Việt: Đọc cấu trúc bản mệnh có căn cứ, không phán một câu duy tiện về số phận.
- **CTA chính:** Lập lá số Tử Vi của bạn ngay → (`calculator.tu-vi`)
- **CTA phụ:** Xem bảng nguồn tri thức cổ thư → (`trust.sources`)
- **Visual:** Sơ đồ kỹ thuật an sao split 2 cột (Trái Đồ hình lá số, Phải Mã giả/Flow an sao). Alt: "Sơ đồ kỹ thuật an sao Tử Vi".
- **390px:** Layout 1 cột dọc, sơ đồ hiển thị mượt mượt ở màn hình đầu.
- **1440px:** Layout split 2 cột kỹ thuật chuyên nghiệp.

---

### S2 — Bốn bước kỹ thuật an sao Tử Vi
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Bốn bước kỹ thuật. Độ chính xác tuyệt đối.
- **H2 (Headline sáng tạo - Cấu trúc song song):** Tiến trình an sao toán học 4 bước.
- **Body (4 Bước kỹ thuật):**
  1. **Bước 1 - Quy đổi lịch pháp & Tính Can Chi:** Chuyển ngày giờ sinh Dương lịch sang Âm lịch, xác định Thiên Can - Địa Chi của Năm, Tháng, Ngày, Giờ.
  2. **Bước 2 - Đặt Cung Mệnh & Cung Thân:** Khởi từ cung Dần, tính thuận theo tháng sinh để tìm cung tháng, rồi tính nghịch theo giờ sinh để an Cung Mệnh (tính thuận tìm Cung Thân).
  3. **Bước 3 - Xác định Ngũ Hành Cục:** Tùy thuộc vào Thiên Can của năm sinh và vị trí Cung Mệnh để tính ra 1 trong 5 Cục (Kim Tứ Cục, Mộc Tam Cục, Thủy Nhị Cục, Hỏa Lục Cục, Thổ Ngũ Cục).
  4. **Bước 4 - An 14 Chính Tinh & Phụ Tinh:** Dựa vào Cục và Ngày sinh Âm lịch để tìm vị trí sao Tử Vi, từ đó an 13 chính tinh còn lại và các vòng sao phụ (Lộc Tồn, Thái Tuế, Tràng Sinh).
- **Visual:** Infographic 4 bước an sao có hình vẽ bàn tay bấm độn bấm cung truyền thống giao thoa mã lập trình. Alt: "Quy trình an sao Tử Vi 4 bước".
- **390px:** Stepper 4 bước dọc có code snippet minh họa ngắn.
- **1440px:** Grid 4 cột rõ ràng.
- **Claim ledger:** "An Cung Mệnh Thân & Ngũ Hành Cục" → Verified (`iztro` engine).

---

### S3 — Xử lý các ca khó: Tháng nhuận & Ranh giới canh giờ
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Ca khó minh bạch. Xử lý chuẩn mực.
- **H2 (Headline sáng tạo - Tương phản):** Giải quyết hai bài toán kinh điển trong an sao Tử Vi.
- **Body (Accordion Chi tiết Kỹ thuật):**
  - **Bài toán 1 - Sinh vào Tháng Nhuận Âm lịch:**
    - *Quy tắc:* Nếu sinh trước ngày 15 của tháng nhuận, giữ nguyên tính theo tháng nhuận đó. Nếu sinh từ ngày 15 trở đi, tính an sao sang tháng Âm lịch kế tiếp (theo quy tắc phổ biến được kiểm thử chuẩn xác).
  - **Bài toán 2 - Ranh giới canh giờ (VD: Đúng 23h00 hoặc 1h00):**
    - *Quy tắc:* 23h00 là thời điểm bắt đầu Canh giờ Tý của ngày Âm lịch mới (Dạ Tý vs Tý chính). Hệ thống hiển thị rõ cảnh báo ranh giới giờ để bạn có tùy chọn đối chiếu 2 lá số liền kề.
- **Visual:** Box kỹ thuật Accordion có thể bấm mở để đọc logic xử lý. Alt: "Xử lý tháng nhuận và ranh giới giờ sinh trong Tử Vi".

---

### S4 — Lời kết & CTA Kết trang
- **Eyebrow (Chơi chữ - Slogan ngắn):** Thuật toán chính xác. Luận giải chân thành.
- **H2 (Headline sáng tạo - Điệp vần):** Kiểm chứng phương pháp an sao trên chính lá số của bạn.
- **CTA chính:** Lập lá số Tử Vi ngay → (`calculator.tu-vi`)
- **CTA phụ:** Xem bảng nguồn cổ thư trích dẫn → (`trust.sources`)

---

## SEO + Metadata + Schema

- **SEO Title:** Phương Pháp An Sao Tử Vi — Thuật Toán & Quy Tắc Kỹ Thuật | Lá Số Việt
- **Meta Description:** Tìm hiểu phương pháp an sao Tử Vi tại Lá Số Việt: Công thức tính Cục Mệnh, 14 chính tinh, xử lý tháng nhuận và ranh giới canh giờ chuẩn xác cổ thư.
- **Canonical URL:** `https://lasoviet.net/phuong-phap/tu-vi`
- **Internal Links:**
  - `/nguon-tri-thuc` (Bảng nguồn tri thức cổ thư)
  - `/phuong-phap/ai-va-can-cu` (Trang AI & Căn cứ)
  - `/tu-vi` (Lập lá số)

---

## File / Key Mapping
- `content/public/vi/pages/method.ziwei.mdx`
- `apps/web/src/features/public-pages/public-content-page.tsx`
