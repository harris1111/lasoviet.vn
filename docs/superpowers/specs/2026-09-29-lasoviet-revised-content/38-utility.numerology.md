# utility.numerology — /tra-cuu-than-so-hoc — live_noindex

- Nguồn đã đọc: `apps/web/src/features/free-tools/numerology-preview.tsx`, `numerology-engine.ts`. Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Tìm kiếm công cụ tra cứu Thần Số Học nhanh, muốn nhập ngày sinh để nhận ngay con số đường đời và kết quả tính toán tức thì.
- Một câu cần nhớ: "Tra Cứu Thần Số Học: Phép tính rút gọn con số đường đời minh bạch từng bước."
- CTA chính → `calculator.tu-vi`; CTA phụ → `calculator.numerology`

---

## Insight Card
- **moment:** Cần một công cụ tra cứu con số Thần Số Học nhanh từ ngày tháng năm sinh Dương lịch.
- **feeling:** Tò mò, muốn xem phép tính có rõ ràng không.
- **search words:** "tra cứu thần số học nhanh", "tính thần số học online", "con số đường đời thần số học", "công cụ nhân số học"
- **category/alternatives:** Trang tra cứu thần số học yêu cầu nhập số điện thoại để gửi tin nhắn rác hoặc bắt trả phí mới cho xem kết quả.
- **what already tried:** Sử dụng các web tính thần số học nhưng chỉ thấy hiển thị con số cuối cùng mà không cho biết các bước cộng.
- **belief to address:** "Công cụ tra cứu thần số học nào cũng tự động phán xét tính cách." -> Lá Số Việt hiển thị chi tiết từng bước phép cộng rút gọn để bạn tự kiểm tra.
- **verified proof:** Badge trạng thái xem trước phương pháp minh bạch, giao diện phép tính từng bước (Step-by-step math).
- **story source:** Tình huống người dùng nhập ngày sinh và thấy từng con số được phân bóc rõ ràng.
- **plain explanation:** Nhập ngày sinh Dương lịch để xem từng bước cộng rút gọn và ý nghĩa con số đường đời của bạn.
- **one action:** Nhập ngày sinh Dương lịch để xem phép tính mẫu.
- **confidence:** High (Trang preview Tra Cứu Thần Số Học P2).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Công cụ Tra Cứu Thần Số Học Nhanh
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Phép tính từng bước. Con số minh bạch.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Tra Cứu Thần Số Học: Phép tính rút gọn con số đường đời.
- **Badge trạng thái:** `[XEM TRƯỚC PHƯƠNG PHÁP - ĐANG NGHIÊN CỨU]`
- **Lead:** Tra cứu nhanh con số đường đời Pitago bằng phép cộng rút gọn từng bước minh bạch từ thông tin ngày sinh Dương lịch.
- **CTA chính:** Khám phá Lá Số Tử Vi đang mở live → (`calculator.tu-vi`)
- **CTA phụ:** Đọc bài chuyên sâu Thần Số Học → (`calculator.numerology`)
- **Visual:** Widget Phép tính rút gọn theo chiều dọc (Step 1 -> Step 2 -> Output). Alt: "Widget phép tính Thần Số Học".
- **390px:** Form nhập liệu 100% width, nút bấm 48px height.
- **1440px:** Layout split 2 cột sắc nét.

---

### S2 — Ví dụ Phép tính từng bước trực quan
- **H2 (Headline sáng tạo - Cấu trúc song song):** Minh bạch từng bước cộng con số.
- **Body:**
  - *Ngày sinh mẫu:* `28/11/1990`
  - *Bước 1 (Ngày):* `2 + 8 = 10` -> `1 + 0 = 1`
  - *Bước 2 (Tháng):* `11` *(Giữ nguyên con số Master)*
  - *Bước 3 (Năm):* `1 + 9 + 9 + 0 = 19` -> `1 + 9 = 10` -> `1 + 0 = 1`
  - *Bước 4 (Tổng):* `1 + 11 + 1 = 13` -> `1 + 3 = 4` -> **Con số đường đời = 4**.
- **Visual:** Box phép tính mượt mượt phong cách Paper & Ink. Alt: "Ví dụ phép tính rút gọn Thần số học".

---

### S3 — Lời kết & CTA Kết trang
- **H2 (Headline sáng tạo - Slogan ngắn):** Trải nghiệm Lá Số Tử Vi Đông Phương đang chạy live.
- **CTA chính:** Lập lá số Tử Vi đang mở live ngay → (`calculator.tu-vi`)
- **CTA phụ:** Đọc pillar Thần Số Học → (`calculator.numerology`)

---

## SEO + Metadata + Schema

- **SEO Title:** Tra Cứu Thần Số Học Online — Tính Con Số Đường Đời | Lá Số Việt
- **Meta Description:** Công cụ tra cứu Thần Số Học online: Phép tính rút gọn con số đường đời Pitago từng bước minh bạch. Xem giải nghĩa con số cá nhân tại Lá Số Việt.
- **Canonical URL:** `https://lasoviet.net/tra-cuu-than-so-hoc`
- **Internal Links:**
  - `/than-so-hoc` (Pillar Thần Số Học)
  - `/tu-vi` (Lập lá số Tử Vi)

---

## File / Key Mapping
- `apps/web/src/features/free-tools/numerology-preview.tsx`
- `numerology-engine.ts`
