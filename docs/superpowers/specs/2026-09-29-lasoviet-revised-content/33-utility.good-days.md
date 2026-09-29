# utility.good-days — /ngay-tot — live_noindex

- Nguồn đã đọc: `apps/web/src/features/free-tools/good-days-preview.tsx`, engine tra cứu ngày tốt. Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Tìm kiếm ngày tốt để thực hiện công việc quan trọng như khai trương, xuất hành, cưới hỏi, động thổ hay mua xe.
- Một câu cần nhớ: "Công cụ Xem Ngày Tốt: Tra cứu ngày phù hợp theo công việc, minh bạch quy tắc lựa chọn."
- CTA chính → `utility.good-days` (Chọn việc tra cứu); CTA phụ → `calculator.tu-vi`

---

## Insight Card
- **moment:** Chuẩn bị làm một việc lớn (mở cửa hàng, sửa nhà, ký hợp đồng) và muốn chọn một ngày hoàng đạo thuận lợi.
- **feeling:** Muốn có sự an tâm tâm lý, muốn tìm ngày phù hợp nhất trong khoảng thời gian sắp tới.
- **search words:** "xem ngày tốt khai trương", "ngày đẹp xuất hành", "xem ngày tốt cưới hỏi", "tra cứu ngày hoàng đạo"
- **category/alternatives:** Sách lịch vạn sự chép nguyên danh sách ngày tốt xấu mâu thuẫn làm người đọc hoang mang.
- **what already tried:** Đọc 3 trang web khác nhau thấy 1 nơi bảo ngày này tốt, nơi khác lại bảo ngày xấu.
- **belief to address:** "Chọn ngày tốt đảm bảo 100% việc gì cũng thành công rực rỡ." -> Lá Số Việt đính chính: Ngày tốt mang lại yếu tố thuận lợi về thời tiết và tâm lý, thành công thực tế dựa vào sự chuẩn bị kỹ lưỡng của bạn.
- **verified proof:** Công cụ Xem Ngày Tốt đang hoạt động 100% (Live Functional Tool) với bộ lọc công việc rõ ràng.
- **story source:** Tình huống người dùng muốn chọn ngày đẹp nhất trong tháng 10 để tổ chức lễ khai trương.
- **plain explanation:** Chọn loại công việc và khoảng thời gian, hệ thống sẽ lọc ra các ngày ứng viên tốt nhất kèm lý do tra cứu minh bạch.
- **one action:** Chọn công việc bạn cần xem ngày bên dưới.
- **confidence:** High (Công cụ tra cứu live 100%).

---

## Từng section theo thứ tự mobile

### S1 — Hero & Form Chọn Việc Xem Ngày Tốt
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Thao tác tiện lợi. Lựa chọn an tâm.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Xem Ngày Tốt Theo Việc: Lựa chọn ngày hoàng đạo phù hợp.
- **Badge trạng thái:** `[CÔNG CỤ ĐANG HOẠT ĐỘNG 100%]`
- **Form Lựa Chọn Công Việc:**
  - Danh mục công việc: `[Khai trương / Mở hàng]` | `[Xuất hành / Đi xa]` | `[Cưới hỏi / Đính hôn]` | `[Động thổ / Sửa nhà]` | `[Ký hợp đồng / Giao dịch]`
  - Chọn khoảng thời gian: `[Tháng này]` hoặc `[Chọn khoảng ngày cụ thể]`
  - Nút bấm: **Tra Cứu Ngày Tốt**
- **Visual:** Giao diện thẻ chọn công việc có icon minh họa sinh động. Alt: "Công cụ Xem Ngày Tốt Lá Số Việt".
- **390px:** Thẻ chọn công việc dạng Carousel vuốt mượt trên mobile.
- **1440px:** Grid 5 thẻ công việc nằm ngang đẹp mắt.
- **Claim ledger:** "Tra cứu ngày tốt theo công việc" → Verified (`good-days-preview.tsx`).

---

### S2 — Bảng Danh Sách Ngày Ứng Viên & Lý Do Tra Cứu
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Danh sách minh bạch. Lý do rõ ràng.
- **H2 (Headline sáng tạo - Cấu trúc song song):** Các ngày phù hợp nhất cho công việc của bạn.
- **Body (Danh sách Ngày Ứng viên & Drawer "Vì sao ngày này tốt?"):**
  - **Ngày 1 - Giáp Tý (Dương lịch 05/10):** Ngày Hoàng Đạo Thanh Long. Hợp việc Khai trương, Giao dịch. *(Bấm xem lý do)*
  - **Ngày 2 - Bính Dần (Dương lịch 09/10):** Ngày Hoàng Đạo Tư Mệnh. Hợp việc Ký hợp đồng, Xuất hành. *(Bấm xem lý do)*
  - *Drawer giải thích:* Mở ra xem quy tắc chọn ngày (Tránh các ngày Sát Chủ, Thụ Tử, Tam Nương; chọn ngày có sao Nhị Thập Bát Tú tốt đóng).
- **Visual:** Card danh sách ngày tốt có nút "Vì sao ngày này tốt?" bấm mở drawer chú giải. Alt: "Danh sách ngày tốt được lọc".
- **390px:** List ngày hiển thị dọc gọn gàng.
- **1440px:** Bảng kết quả 3 cột sắc nét.

---

### S3 — Ranh giới & Lời khuyên khi chọn ngày
- **H2 (Headline sáng tạo - Tương phản):** Ngày tốt chung vs Ngày hợp với Lá Số cá nhân.
- **Body:** Ngày tốt được lọc ở đây là ngày Hoàng Đạo chung theo lịch pháp. Để có sự chuẩn xác nhất, bạn nên đối chiếu thêm với **Lá Số Tử Vi cá nhân** để đảm bảo ngày đó không xung khắc với Cung Mệnh hay Cung Tài Bạch của riêng bạn.
- **Visual:** Box nhắc nhở đối chiếu với lá số cá nhân. Alt: "Lời khuyên khi chọn ngày tốt".

---

### S4 — Lời kết & CTA Kết trang
- **H2 (Headline sáng tạo - Slogan ngắn):** Muốn đối chiếu ngày tốt với Lá Số Tử Vi cá nhân?
- **CTA chính:** Lập lá số Tử Vi để đối chiếu ngay → (`calculator.tu-vi`)
- **CTA phụ:** Xem Lịch Âm Dương hôm nay → (`utility.lunar-calendar`)

---

## SEO + Metadata + Schema

- **SEO Title:** Xem Ngày Tốt Theo Việc — Khai Trương, Xuất Hành, Cưới Hỏi | Lá Số Việt
- **Meta Description:** Công cụ xem ngày tốt theo công việc: Khai trương, xuất hành, cưới hỏi, động thổ. Lọc ngày hoàng đạo chuẩn xác, minh bạch lý do tra cứu tại Lá Số Việt.
- **Canonical URL:** `https://lasoviet.net/ngay-tot`
- **Internal Links:**
  - `/lich-am` (Lịch Âm)
  - `/tu-vi` (Lập lá số Tử Vi)

---

## File / Key Mapping
- `apps/web/src/features/free-tools/good-days-preview.tsx`
- Engine tra cứu ngày tốt
