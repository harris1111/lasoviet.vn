# trust.privacy — /chinh-sach-bao-mat — live_indexable

- Nguồn đã đọc: `content/public/vi/pages/privacy.mdx`, `apps/web/src/features/privacy-policy/privacy-policy-page.tsx`, `privacy-policy-content.ts`. Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Đang chuẩn bị nhập ngày giờ sinh hoặc nạp tiền, muốn kiểm tra xem dữ liệu cá nhân của mình được bảo mật thế nào, có bị lộ thông tin hay bị bán cho bên thứ ba không.
- Một câu cần nhớ: "Chính sách bảo mật Lá Số Việt: Coi sự riêng tư là nguyên tắc tối thượng, tự động xóa dữ liệu ẩn danh sau 24h."
- CTA chính → `calculator.tu-vi`; CTA phụ → `trust.terms`

---

## Insight Card
- **moment:** Nhập ngày giờ sinh để lập lá số và lo lắng thông tin nhạy cảm này sẽ bị chia sẻ hoặc lưu trữ vĩnh viễn trên mạng mà mình không kiểm soát được.
- **feeling:** Thận trọng, đắn đo về quyền riêng tư dữ liệu cá nhân.
- **search words:** "chính sách bảo mật lá số việt", "lá số việt có an toàn không", "bảo mật ngày sinh tử vi", "xóa dữ liệu lá số việt"
- **category/alternatives:** Trang web dịch vụ thu thập số điện thoại/ngày sinh để bán cho các bên telesale bất động sản, bảo hiểm.
- **what already tried:** Đọc các điều khoản bảo mật dài dòng 10.000 từ trên các web khác mà không hiểu mình có quyền xóa dữ liệu không.
- **belief to address:** "Nhập thông tin lên web là chấp nhận bị lộ ngày giờ sinh." -> Lá Số Việt cam kết tự động xóa dữ liệu khách ẩn danh sau 24h và cung cấp nút xóa tài khoản lập tức.
- **verified proof:** Bảng lưu trữ dữ liệu (Data Retention Matrix) công khai thời gian lưu cho từng loại thông tin.
- **story source:** Tình huống người dùng tạo lá số xem thử và muốn chắc chắn rằng lá số đó sẽ không xuất hiện trên Google Search.
- **plain explanation:** Chúng tôi chỉ thu thập dữ liệu ngày giờ sinh đúng để lập lá số cho bạn. Bạn có toàn quyền xóa dữ liệu của mình bất cứ lúc nào.
- **one action:** Đọc bản tóm tắt 4 điểm bảo mật bên dưới.
- **confidence:** High (Trang pháp lý privacy P0).

---

## Từng section theo thứ tự mobile

### S1 — Hero & Bản Tóm Tắt 4 Điểm Cốt Lõi
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Nguyên tắc tối thượng. Bảo vệ riêng tư.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Chính sách bảo mật: Một bàn đọc riêng, không phải tấm gương công khai.
- **Executive Summary (4 Điểm cam kết cốt lõi):**
  1. **Tự động xóa sau 24 giờ:** Dữ liệu ngày sinh của người dùng ẩn danh (chưa đăng ký) sẽ tự động bị xóa sạch khỏi hệ thống sau 24h.
  2. **Quyền tự xóa vĩnh viễn:** Người dùng có tài khoản có thể bấm nút "Xóa hồ sơ lá số" hoặc "Xóa tài khoản" bất kỳ lúc nào trên trang Quản lý.
  3. **Không bán dữ liệu cho bên thứ ba:** Tuyệt đối không chia sẻ, bán hay thương mại hóa dữ liệu ngày giờ sinh hay lịch sử giao dịch của bạn.
  4. **Thanh toán VietQR an toàn:** Mọi giao dịch nạp Lá đều qua cổng VietQR mã hóa, không lưu trữ thông tin thẻ ngân hàng nhạy cảm.
- **Visual:** Card Tóm Tắt Bảo Mật 4 điểm viền bo sang trọng. Alt: "Bản tóm tắt 4 điểm chính sách bảo mật".
- **390px:** Hero hiển thị gọn 1 màn hình, có nút cuộn xuống các điều khoản chi tiết.
- **1440px:** Layout đọc văn bản pháp lý 720px căn giữa có Sticky Navigator bên trái.

---

### S2 — Bảng Lưu Trữ Dữ Liệu (Data Retention Matrix)
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Minh bạch mục đích. Thời hạn rõ ràng.
- **H2 (Headline sáng tạo - Cấu trúc song song):** Dữ liệu chúng tôi thu thập, mục đích & thời gian lưu trữ.
- **Body (Bảng 3 cột):**

| Loại Dữ Liệu | Mục Đích Sử Dụng | Thời Gian Lưu Trữ |
|---|---|---|
| **Thông tin Ngày/Giờ/Năm sinh (Ẩn danh)** | Quy đổi lịch pháp & an sao Tử Vi | Tự động xóa sau **24 giờ** |
| **Thông tin Ngày/Giờ/Năm sinh (Đã đăng ký)** | Lưu trữ lá số để bạn mở lại đọc | Lưu đến khi bạn bấm **Xóa hồ sơ** |
| **Email / Số điện thoại đăng nhập** | Định danh tài khoản & gửi hỗ trợ | Lưu đến khi bạn bấm **Xóa tài khoản** |
| **Nhật ký giao dịch VietQR (Mã đơn, Số Lá)** | Đối soát thanh toán & hoàn Lá sự cố | Lưu theo quy định kế toán pháp luật |
- **Visual:** Bảng Data Retention Matrix rõ chữ responsive. Alt: "Bảng thời gian lưu trữ dữ liệu".

---

### S3 — Quyền của người dùng đối với dữ liệu cá nhân
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Chủ động kiểm soát. Quyền lợi tối đa.
- **H2 (Headline sáng tạo - Tương phản):** Bạn luôn giữ toàn quyền chủ động đối với dữ liệu của mình.
- **Body (Các quyền người dùng):**
  - **Quyền xem & xuất dữ liệu (Export):** Bạn có thể tải file bản vẽ lá số SVG hoặc dữ liệu bài đọc về máy cá nhân.
  - **Quyền yêu cầu xóa (Right to be Forgotten):** Bấm nút "Xóa tài khoản" trong cài đặt, toàn bộ lá số và lịch sử của bạn sẽ bị hủy vĩnh viễn không thể khôi phục.
  - **Quyền không bị theo dõi quảng cáo:** Lá Số Việt không cài đặt các pixel quảng cáo bám đuổi (retargeting ads) xâm phạm đời tư.
- **Visual:** Box danh sách quyền lợi người dùng có icon tích xanh. Alt: "Quyền của người dùng với dữ liệu".

---

### S4 — Lời kết & Thông tin liên hệ Bảo mật
- **H2 (Headline sáng tạo - Slogan ngắn):** Thắc mắc về Chính sách bảo mật?
- **Body:** Nếu bạn có bất kỳ câu hỏi nào về cách chúng tôi xử lý dữ liệu, vui lòng gửi email về `lasoviet.net@gmail.com`.
- **CTA chính:** Đọc Điều khoản sử dụng → (`trust.terms`)
- **CTA phụ:** Lập lá số Tử Vi an toàn → (`calculator.tu-vi`)

---

## SEO + Metadata + Schema

- **SEO Title:** Chính Sách Bảo Mật Dữ Liệu — Minh Bạch & An Toàn | Lá Số Việt
- **Meta Description:** Chính sách bảo mật dữ liệu tại Lá Số Việt: Tự động xóa thông tin ẩn danh sau 24h, mã hóa dữ liệu tài khoản, không bán dữ liệu cho bên thứ ba.
- **Canonical URL:** `https://lasoviet.net/chinh-sach-bao-mat`
- **Internal Links:**
  - `/dieu-khoan` (Trang điều khoản dịch vụ)
  - `/lien-he` (Trang liên hệ)

---

## File / Key Mapping
- `content/public/vi/pages/privacy.mdx`
- `apps/web/src/features/privacy-policy/privacy-policy-page.tsx`
- `privacy-policy-content.ts`
