# support.contact — /lien-he — live_indexable

- Nguồn đã đọc: `content/public/vi/pages/contact.mdx`, `public-content-page.tsx` (`ContactPage`). Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Đang gặp sự cố cần hỗ trợ trực tiếp (lỗi thanh toán VietQR, không đăng nhập được tài khoản, góp ý nội dung bài viết).
- Một câu cần nhớ: "Liên hệ Lá Số Việt: Kênh tiếp nhận hỗ trợ chính thức qua email, phản hồi chân thành và nhanh chóng."
- CTA chính → `support.faq`; CTA phụ → `calculator.tu-vi`

---

## Insight Card
- **moment:** Đã nạp Lá hoặc gặp sự cố kỹ thuật và muốn liên hệ trực tiếp với đội ngũ phát triển để được giải quyết.
- **feeling:** Cần sự phản hồi đáng tin cậy, muốn biết phải gửi thông tin gì để được xử lý nhanh nhất.
- **search words:** "liên hệ lá số việt", "email lá số việt", "hỗ trợ thanh toán lá số việt", "góp ý lá số việt"
- **category/alternatives:** Trang liên hệ có form giả không gửi được mail hoặc không công khai email thật.
- **what already tried:** Tìm kiếm số điện thoại hay chatbox trên web nhưng chỉ thấy nút gửi email.
- **belief to address:** "Gửi email hỗ trợ chắc cả tuần mới có người trả lời." -> Lá Số Việt cam kết tiếp nhận và hỗ trợ xử lý giao dịch qua email chính thức.
- **verified proof:** Email chính thức `lasoviet.net@gmail.com` hiển thị đồng bộ trên toàn bộ footer và trang liên hệ.
- **story source:** Tình huống người dùng gửi email hỗ trợ nhưng quên kèm Mã đơn hàng khiến việc kiểm tra bị kéo dài.
- **plain explanation:** Để được hỗ trợ nhanh nhất, hãy chọn đúng nhóm vấn đề và sao chép mẫu tiêu đề email bên dưới gửi về cho chúng tôi.
- **one action:** Sao chép mẫu email hỗ trợ và gửi về `lasoviet.net@gmail.com`.
- **confidence:** High (Trang liên hệ P0/P1).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Kênh Liên Hệ & Hỗ Trợ
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Phản hồi chân thành. Hỗ trợ tận tâm.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Cần Lá Số Việt hỗ trợ việc gì? Chúng tôi luôn sẵn sàng lắng nghe.
- **Lead:** Chọn nhóm vấn đề bạn đang gặp phải để xem hướng dẫn sao chép thông tin gửi về email chính thức `lasoviet.net@gmail.com`.
- **Email chính thức:** `lasoviet.net@gmail.com` *(Bấm để sao chép)*
- **CTA phụ:** Xem câu hỏi thường gặp FAQ → (`support.faq`)
- **Visual:** Banner Hero có card Email chính thức bo viền sang trọng màu Paper & Ink. Alt: "Kênh liên hệ hỗ trợ Lá Số Việt".
- **390px:** Hero hiển thị gọn gàng, nút bấm copy email to rõ 48px height.
- **1440px:** Container 800px căn giữa.

---

### S2 — Ba nhánh hỗ trợ chính & Mẫu Email sao chép
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Ba nhóm vấn đề. Ba mẫu thông tin.
- **H2 (Headline sáng tạo - Cấu trúc song song):** Hướng dẫn gửi thông tin hỗ trợ theo từng nhóm.
- **Body (3 Nhánh hỗ trợ):**

  #### Nhánh 1: Sự cố Thanh Toán VietQR & Nạp Lá
  - *Thông tin cần gửi:* Mã đơn hàng VietQR (hoặc Mã giao dịch ngân hàng), Số điện thoại/Email tài khoản, Thời gian chuyển khoản.
  - *Mẫu Tiêu đề Email:* `[HỖ TRỢ THANH TOÁN] - Mã đơn: {Mã_Đơn_Hàng} - {Số_Điện_Thoại}`

  #### Nhánh 2: Sự cố Tài Khoản & Báo Cáo Luận Giải
  - *Thông tin cần gửi:* Email tài khoản đăng ký, Tên bài luận giải không mở được, Mô tả hình ảnh lỗi.
  - *Mẫu Tiêu đề Email:* `[HỖ TRỢ TÀI KHOẢN] - Email: {Email_Tài_Khoản} - Lỗi mở bài`

  #### Nhánh 3: Góp Ý Nội Dung & Hợp Tác Tri Thức
  - *Thông tin cần gửi:* Tên bài viết/cụm từ góp ý, Nội dung phản hồi hoặc đề xuất hợp tác.
  - *Mẫu Tiêu đề Email:* `[GÓP Ý NỘI DUNG] - Bài viết: {Tên_Bài_Viết}`
- **Visual:** 3 Card hành động cho phép bấm vào từng card để tự động mở ứng dụng Email trên máy với tiêu đề mẫu đã điền sẵn. Alt: "3 nhánh hỗ trợ liên hệ Lá Số Việt".
- **390px:** List 3 card xếp dọc mượt mà trên mobile.
- **1440px:** Grid 3 cột mạch lạc.
- **Claim ledger:** "Email lasoviet.net@gmail.com" → Verified (Header/Footer config).

---

### S3 — Cảnh báo an toàn: Những điều KHÔNG NÊN GỬI qua Email
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Bảo vệ riêng tư. Cảnh báo an toàn.
- **H2 (Headline sáng tạo - Tương phản):** Giữ an toàn cho tài khoản cá nhân của bạn.
- **Body:**
  - **TUYỆT ĐỐI KHÔNG gửi Mật khẩu tài khoản** qua email. Đội ngũ Lá Số Việt không bao giờ yêu cầu bạn cung cấp mật khẩu.
  - **KHÔNG gửi đầy đủ thông tin ngày giờ sinh nhạy cảm** nếu chỉ yêu cầu hỗ trợ thanh toán đơn hàng.
- **Visual:** Box nhắc nhở viền Cinnabar cảnh báo an toàn. Alt: "Cảnh báo an toàn thông tin khi liên hệ".

---

### S4 — Lời kết & CTA Kết trang
- **H2 (Headline sáng tạo - Slogan ngắn):** Chúng tôi luôn ở đây để đồng hành cùng bạn.
- **CTA chính:** Sao chép Email `lasoviet.net@gmail.com` → (`support.contact`)
- **CTA phụ:** Quay lại Trang chủ → (`brand.home`)

---

## SEO + Metadata + Schema

- **SEO Title:** Liên Hệ & Hỗ Trợ Khách Hàng — Email Chính Thức | Lá Số Việt
- **Meta Description:** Kênh liên hệ chính thức Lá Số Việt qua email lasoviet.net@gmail.com. Hướng dẫn gửi thông tin hỗ trợ nạp Lá VietQR, sự cố tài khoản và góp ý nội dung.
- **Canonical URL:** `https://lasoviet.net/lien-he`
- **Internal Links:**
  - `/cau-hoi-thuong-gap` (Trang FAQ)
  - `/chinh-sach-bao-mat` (Chính sách bảo mật)

---

## File / Key Mapping
- `content/public/vi/pages/contact.mdx`
- `apps/web/src/features/public-pages/public-content-page.tsx`
