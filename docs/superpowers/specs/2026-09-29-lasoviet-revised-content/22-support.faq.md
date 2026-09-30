# support.faq — /cau-hoi-thuong-gap — live_indexable

- Nguồn đã đọc: `content/public/vi/pages/faq.mdx`, `public-content-page.tsx` (`FaqPage`). Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Người dùng có thắc mắc trước khi lập lá số, gặp trục trặc khi thanh toán/nạp Lá, hoặc băn khoên về chính sách bảo mật dữ liệu.
- Một câu cần nhớ: "Trung tâm hỏi đáp Lá Số Việt: Giải đáp tức thì mọi thắc mắc về lập lá số, thanh toán Lá và bảo mật."
- CTA chính → `calculator.tu-vi`; CTA phụ → `support.contact`

---

## Insight Card
- **moment:** Gặp vướng mắc khi sử dụng dịch vụ (chưa thấy bài báo cáo sau khi chuyển khoản, không chắc thông tin giờ sinh) và cần câu trả lời nhanh chóng.
- **feeling:** Cần câu trả lời trực tiếp, rõ ràng, không muốn phải tự mò mẫm hoặc chờ đợi lâu.
- **search words:** "câu hỏi thường gặp lá số việt", "hướng dẫn nạp lá số việt", "hỗ trợ lá số việt", "faq lá số việt"
- **category/alternatives:** Trang FAQ sơ sài 2-3 câu chung chung, không giải quyết được vấn đề thực tế.
- **what already tried:** Đọc các câu hỏi thường gặp cũ bị lỗi kỹ thuật (hiển thị mã code `exact_minute` hay bảo không hỗ trợ người thiếu giờ sinh).
- **belief to address:** "Dịch vụ online không có ai hỗ trợ khi gặp sự cố thanh toán." -> Lá Số Việt đính chính: FAQ trả lời 100% tình huống thực tế, có kênh hỗ trợ email phản hồi rõ ràng.
- **verified proof:** 4 cụm câu hỏi FAQ phân loại theo từng giai đoạn trải nghiệm người dùng (Lập lá số -> Đọc bài -> Thanh toán Lá -> Bảo mật).
- **story source:** Tình huống người dùng nạp tiền qua VietQR nhưng 2 phút sau chưa thấy Lá nhảy trên tài khoản.
- **plain explanation:** Chúng tôi tổng hợp sẵn câu trả lời trực tiếp cho 15 băn khoên phổ biến nhất. Bạn có thể tìm thấy hướng dẫn xử lý ngay tại đây.
- **one action:** Tìm câu hỏi của bạn trong các nhóm chủ đề FAQ bên dưới.
- **confidence:** High (Trang FAQ P0 đã được sửa toàn bộ lỗi kỹ thuật).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Trung tâm trợ giúp & FAQ
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Giải đáp tức thì. Minh bạch thông tin.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Câu hỏi thường gặp: Giải đáp mọi thắc mắc của bạn.
- **Lead:** Tìm kiếm câu trả lời nhanh chóng cho các băn khoăn về lập lá số, cách sử dụng Lá, thanh toán VietQR và bảo mật thông tin.
- **Search input:** [Tìm kiếm câu hỏi...]
- **CTA chính:** Lập lá số Tử Vi ngay → (`calculator.tu-vi`)
- **CTA phụ:** Gửi yêu cầu hỗ trợ trực tiếp → (`support.contact`)
- **Visual:** Banner Hero có thanh tìm kiếm FAQ hiện đại nổi bật ở trung tâm. Alt: "Trung tâm hỏi đáp FAQ Lá Số Việt".
- **390px:** Hero hiển thị tiêu đề và thanh search 48px height dễ gõ.
- **1440px:** Container 800px căn giữa.

---

### S2 — Nhóm 1: Thắc mắc khi Lập Lá Số & Giờ Sinh
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Nhập liệu dễ dàng. Lối đi linh hoạt.
- **H2 (Headline sáng tạo - Cấu trúc song song):** Giải đáp thắc mắc về ngày giờ sinh & an sao.
- **FAQ Items (Accordion):**
  1. *Q: Tôi không nhớ chính xác phút sinh thì có lập lá số được không?*
     *A:* **Hoàn toàn được.** Giờ sinh trong Tử Vi tính theo canh giờ 2 tiếng (VD: Giờ Thìn từ 7h00 đến 8h59). Chỉ cần bạn sinh trong khoảng 2 tiếng đó thì lá số hoàn toàn giống nhau. Nếu chỉ nhớ buổi sáng hay buổi tối, bạn vẫn lập được **Lá số tạm tính** (FD-103) để xem trước thông tin chung.
  2. *Q: Tôi nên nhập thông tin theo Lịch Âm hay Lịch Dương?*
     *A:* **Bạn nhập lịch nào cũng được.** Hệ thống có sẵn công cụ tự động quy đổi Âm - Dương lịch chuẩn xác theo thiên văn học Việt Nam.
  3. *Q: Sinh vào 23h00 đêm thì tính là ngày cũ hay ngày mới?*
     *A:* Trong Tử Vi, 23h00 là thời điểm chuyển sang canh giờ Tý của ngày Âm lịch mới. Hệ thống sẽ tự động ghi nhận chuẩn xác cho bạn.

---

### S3 — Nhóm 2: Thắc mắc về Lá & Thanh Toán VietQR
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Nạp Lá VietQR. Xác nhận tức thì.
- **H2 (Headline sáng tạo - Tương phản):** Giải đáp thắc mắc về chi phí & giao dịch.
- **FAQ Items (Accordion):**
  4. *Q: "Lá" là gì và dùng để làm gì?*
     *A:* **Lá là đơn vị thanh toán nội bộ tại Lá Số Việt.** Bạn dùng Lá để tùy ý mở các bài luận giải chuyên sâu (như Tử Vi Trọn Đời). Số Lá cần dùng luôn hiển thị rõ ràng trước khi bạn bấm xác nhận.
  5. *Q: Tôi chuyển khoản qua VietQR rồi nhưng chưa thấy Lá cộng vào tài khoản?*
     *A:* Thông thường hệ thống xử lý giao dịch tự động trong 5-10 giây. Nếu sau 3 phút chưa thấy cộng Lá, bạn chỉ cần bấm **"Kiểm tra lại giao dịch"** hoặc gửi Mã đơn hàng đến email `lasoviet.net@gmail.com` để được xử lý ngay.
  6. *Q: Báo cáo đã mở bằng Lá có bị mất khi tôi đăng xuất không?*
     *A:* **Tuyệt đối không.** Toàn bộ các bài luận giải bạn đã mở sẽ được lưu trữ vĩnh viễn trong mục "Tài khoản của tôi". Bạn có thể mở đọc lại bất cứ lúc nào trên điện thoại hay máy tính.

---

### S4 — Nhóm 3: Bảo mật thông tin & Quyền riêng tư
- **Eyebrow (Chơi chữ - Slogan ngắn):** Bảo mật tối thượng. An tâm sử dụng.
- **H2 (Headline sáng tạo - Điệp vần):** Dữ liệu ngày giờ sinh của bạn có an toàn không?
- **FAQ Items (Accordion):**
  7. *Q: Thông tin ngày giờ sinh của tôi có bị chia sẻ cho bên thứ ba không?*
     *A:* **Tuyệt đối không.** Lá Số Việt coi sự riêng tư của người dùng là nguyên tắc tối thượng. Chúng tôi không bao giờ bán hay chia sẻ dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào.
  8. *Q: Dữ liệu người dùng ẩn danh được lưu trữ bao lâu?*
     *A:* Nếu bạn không đăng ký tài khoản, dữ liệu lá số tạm thời sẽ tự động bị xóa vĩnh viễn khỏi hệ thống sau 24 giờ. Bạn cũng có thể bấm nút "Xóa ngay" bất kỳ lúc nào.

---

### S5 — Lời kết & CTA Bài viết
- **H2 (Headline sáng tạo - Đối ý):** Vẫn chưa tìm thấy câu trả lời cho vấn đề của bạn?
- **Body:** Đội ngũ hỗ trợ khách hàng Lá Số Việt luôn sẵn sàng đồng hành và phản hồi thắc mắc của bạn qua email.
- **CTA chính:** Gửi yêu cầu hỗ trợ qua Email → (`support.contact`)
- **CTA phụ:** Lập lá số Tử Vi ngay → (`calculator.tu-vi`)

---

## SEO + Metadata + Schema

- **SEO Title:** Câu Hỏi Thường Gặp (FAQ) — Trợ Giúp & Hỗ Trợ | Lá Số Việt
- **Meta Description:** Giải đáp câu hỏi thường gặp tại Lá Số Việt: Hướng dẫn giờ sinh, cách cộng Lá VietQR, lưu trữ bài luận giải vĩnh viễn và chính sách bảo mật dữ liệu 24h.
- **Canonical URL:** `https://lasoviet.net/cau-hoi-thuong-gap`
- **FAQPage Schema JSON-LD:** Bao gồm toàn bộ 8 Q/A chính xác ở trên.
- **Internal Links:**
  - `/lien-he` (Trang liên hệ)
  - `/chinh-sach-bao-mat` (Chính sách bảo mật)
  - `/tu-vi` (Lập lá số)

---

## File / Key Mapping
- `content/public/vi/pages/faq.mdx`
- `apps/web/src/features/public-pages/public-content-page.tsx`
