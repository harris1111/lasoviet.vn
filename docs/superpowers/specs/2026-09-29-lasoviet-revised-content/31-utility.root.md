# utility.root — /cong-cu-mien-phi — live_noindex

- Nguồn đã đọc: `apps/web/src/features/free-tools/free-tools-page-provider.ts`, `free-tools-hub.tsx`. Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Tìm kiếm kho công cụ tra cứu tiện ích huyền học miễn phí, muốn tra nhanh lịch âm, ngày tốt hoặc trải nghiệm các công cụ tra cứu.
- Một câu cần nhớ: "Kho công cụ tiện ích Lá Số Việt: Tra cứu lịch âm, ngày tốt tức thì; khám phá các phương pháp chiêm nghiệm."
- CTA chính → `utility.lunar-calendar`; CTA phụ → `calculator.tu-vi`

---

## Insight Card
- **moment:** Cần làm một việc tra cứu nhanh (xem hôm nay ngày mấy âm lịch, ngày nào tốt để khai trương) hoặc tò mò trải nghiệm các tiện ích tra cứu.
- **feeling:** Thích sự tiện lợi, muốn dùng ngay mà không phải đăng ký hay trả phí.
- **search words:** "công cụ tử vi miễn phí", "tra cứu lịch âm miễn phí", "xem ngày tốt miễn phí", "kho tiện ích lá số việt"
- **category/alternatives:** Kho công cụ bói toán rác chèn đầy quảng cáo cá độ, bắt nộp tiền trước khi cho xem kết quả.
- **what already tried:** Đọc các trang web hứa "7 công cụ dùng ngay" nhưng khi bấm vào thì 5 cái bị lỗi hoặc bắt trả tiền.
- **belief to address:** "Các công cụ trên web toàn là quảng cáo ảo." -> Lá Số Việt phân loại minh bạch thành 2 nhóm: `[DÙNG NGAY]` (Lịch Âm, Ngày Tốt) và `[XEM TRƯỚC PHƯƠNG PHÁP]` (Đang nghiên cứu).
- **verified proof:** Đánh nhãn trạng thái thật cho từng card công cụ, công cụ dùng ngay chạy 100% trên dữ liệu thật.
- **story source:** Tình huống người dùng bấm vào một công cụ tiện ích và biết chính xác công cụ đó có đang chạy thật hay không.
- **plain explanation:** Chúng tôi ưu tiên hiển thị các công cụ đang hoạt động 100% lên đầu trang. Các công cụ xem trước được dán nhãn minh bạch.
- **one action:** Chọn công cụ bạn muốn tra cứu ngay bên dưới.
- **confidence:** High (Trang hub công cụ tiện ích P1/P2).

---

## Từng section theo thứ tự mobile

### S1 — Hero: Kho Công Cụ Tiện Ích Miễn Phí
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Tra cứu tức thì. Minh bạch trạng thái.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Kho công cụ tra cứu tiện ích: Dùng ngay & Xem trước.
- **Lead:** Tra cứu nhanh Lịch Âm Dương, Ngày Tốt xấu và khám phá các phương pháp chiêm nghiệm được phân loại minh bạch theo trạng thái hoạt động.
- **Segmented Filter:** `[Tất cả công cụ]` | `[Dùng ngay (2)]` | `[Xem trước (9)]`
- **CTA chính:** Trải nghiệm Lịch Âm Dương → (`utility.lunar-calendar`)
- **CTA phụ:** Khám phá Lá Số Tử Vi live → (`calculator.tu-vi`)
- **Visual:** Banner Hub công cụ với bộ lọc segmented filter responsive. Alt: "Kho công cụ tra cứu tiện ích Lá Số Việt".
- **390px:** Hero hiển thị tiêu đề và bộ lọc Filter Chips nằm ngang dễ lướt.
- **1440px:** Container 840px căn giữa.

---

### S2 — Nhóm 1: Công cụ DÙNG NGAY 100% (Functional Tools)
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Dữ liệu chạy thật. Kết quả tức thì.
- **H2 (Headline sáng tạo - Cấu trúc song song):** Hai công cụ tra cứu đang mở hoàn toàn miễn phí.
- **Body (2 Card Dùng ngay):**
  1. **Tra Cứu Lịch Âm Dương (Live):** Xem lịch âm dương, can chi ngày giờ, tiết khí và giờ hoàng đạo chuẩn thiên văn. (`utility.lunar-calendar`) `[DÙNG NGAY]`
  2. **Xem Ngày Tốt Theo Việc (Live):** Chọn việc cần làm (khai trương, xuất hành, cưới hỏi) để tìm ngày phù hợp. (`utility.good-days`) `[DÙNG NGAY]`
- **Visual:** 2 Thẻ công cụ nổi bật viền xanh Lục Bảo có nút "Dùng Ngay" 48px height. Alt: "2 công cụ dùng ngay tại Lá Số Việt".
- **390px:** Xếp 1 cột 2 thẻ dọc.
- **1440px:** Grid 2 cột lớn song song.
- **Claim ledger:** "Lịch Âm & Ngày Tốt live 100%" → Verified (`free-tools-page-provider.ts`).

---

### S3 — Nhóm 2: Các công cụ XEM TRƯỚC PHƯƠNG PHÁP (Preview Tools)
- **Eyebrow (Chơi chữ - Từ trái nghĩa):** Minh bạch dự kiến. Trải nghiệm phương pháp.
- **H2 (Headline sáng tạo - Tương phản):** Khám phá nguyên lý của các công cụ đang nghiên cứu.
- **Body (Danh mục Card Preview):**
  - **Tra cứu 12 Con Giáp:** Biết con giáp chuẩn theo năm sinh và giao thừa âm lịch. (`utility.zodiac`)
  - **Bói Bài Tarot Preview:** Trải nghiệm phương pháp đọc bài 1 lá / 3 lá. (`calculator.tarot`)
  - **Phong Thủy Hướng Nhà:** Đo hướng cửa chính theo nguyên lý Bát Trạch. (`utility.feng-shui`)
  - **Xem Chỉ Tay Thử Nghiệm:** Khám phá ý nghĩa 3 đường chỉ tay chính. (`utility.palmistry`)
  - **Tra Cứu Thần Số Học:** Phép tính rút gọn con số đường đời. (`utility.numerology`)
  - **Bói Tình Yêu / Hòa Hợp:** So sánh điểm hòa hợp giữa hai lá số. (`utility.love-compatibility`)
  - **Tử Vi Hôm Nay:** Nhật trình năng lượng ngày theo lá số. (`utility.daily-horoscope`)
  - **Giải Mã Giấc Mơ:** Thư viện biểu tượng giấc mơ dân gian & tâm lý. (`content.dream-symbols`)
- **Visual:** Grid 8 thẻ công cụ preview có badge xám `[XEM TRƯỚC]`. Alt: "8 công cụ xem trước phương pháp".
- **390px:** Grid 2 cột mượt mượt trên mobile.
- **1440px:** Grid 4 cột cân đối.

---

### S4 — Lời kết & CTA Kết trang
- **H2 (Headline sáng tạo - Slogan ngắn):** Muốn có trải nghiệm cá nhân hóa hoàn chỉnh?
- **CTA chính:** Khai mở Lá Số Tử Vi đang hoạt động ngay → (`calculator.tu-vi`)
- **CTA phụ:** Tra cứu Lịch Âm Dương ngay → (`utility.lunar-calendar`)

---

## SEO + Metadata + Schema

- **SEO Title:** Kho Công Cụ Tiện Ích Miễn Phí — Lịch Âm & Ngày Tốt | Lá Số Việt
- **Meta Description:** Kho công cụ tra cứu tiện ích miễn phí Lá Số Việt: Tra cứu Lịch Âm Dương, Xem Ngày Tốt xuất hành khai trương. Phân loại badge trạng thái minh bạch 100%.
- **Canonical URL:** `https://lasoviet.net/cong-cu-mien-phi`
- **Internal Links:**
  - `/lich-am` (Trang Lịch Âm)
  - `/ngay-tot` (Trang Ngày Tốt)
  - `/tu-vi` (Trang Tử Vi live)

---

## File / Key Mapping
- `apps/web/src/features/free-tools/free-tools-page-provider.ts`
- `free-tools-hub.tsx`
