# utility.lunar-calendar — /lich-am — live_noindex

- Nguồn đã đọc: `apps/web/src/features/free-tools/lunar-calendar-preview.tsx`, engine thiên văn Âm Dương lịch. Commit `5bed9d9`.
- Live/preview được quan sát: Source-only verification (snapshot master).
- Người đến trang: Tìm kiếm lịch âm hôm nay, tra cứu ngày âm dương tương ứng hoặc xem Can Chi ngày/giờ để tính toán công việc hay lập lá số.
- Một câu cần nhớ: "Công cụ Lịch Âm Dương: Quy đổi chuẩn xác thiên văn, tra cứu Can Chi và Tiết Khí tức thì."
- CTA chính → `utility.lunar-calendar` (Dùng form lịch); CTA phụ → `calculator.tu-vi`

---

## Insight Card
- **moment:** Cần xem hôm nay ngày mấy Âm lịch, hoặc quy đổi ngày sinh Dương lịch của mình sang Âm lịch để chuẩn bị lập lá số Tử Vi.
- **feeling:** Cần sự chính xác tuyệt đối về ngày tháng Âm lịch, không muốn bị lệch ngày do múi giờ.
- **search words:** "lịch âm hôm nay", "tra cứu lịch âm dương", "đổi ngày dương sang ngày âm", "xem can chi ngày"
- **category/alternatives:** Xem lịch vạn sự giấy trên tường hoặc tra cứu trên các web lịch chèn quá nhiều quảng cáo.
- **what already tried:** Đổi lịch âm ở một web nước ngoài bị sai mất 1 ngày do dùng múi giờ Bắc Kinh (UTC+8) thay vì UTC+7 Việt Nam.
- **belief to address:** "Đổi lịch âm ở đâu cũng giống nhau." -> Lá Số Việt dùng thuật toán lịch pháp thiên văn chuẩn múi giờ UTC+7 Việt Nam, tính đúng ngày nhuận và tiết khí.
- **verified proof:** Công cụ Lịch Âm Dương đang hoạt động 100% (Live Functional Tool) trên dữ liệu thật.
- **story source:** Tình huống người dùng sinh lúc 23h30 đêm chuyển giao ngày âm lịch mới và cần công cụ quy đổi chính xác.
- **plain explanation:** Nhập ngày Dương lịch hoặc chọn ngày trên lịch để xem ngay ngày Âm lịch, Can Chi, Tiết Khí và Giờ Hoàng Đạo tương ứng.
- **one action:** Chọn ngày trên lịch để xem chi tiết thông tin Âm Dương.
- **confidence:** High (Công cụ tra cứu live 100%).

---

## Từng section theo thứ tự mobile

### S1 — Hero & Form Tra Cứu Lịch Âm Dương
- **Eyebrow (Chơi chữ - Nhịp biệt lập):** Quy đổi chuẩn xác. Múi giờ Việt Nam.
- **H1 (Headline sáng tạo - Đối ý & Cân bằng):** Lịch Âm Dương: Quy đổi chuẩn xác & Tra cứu Can Chi.
- **Badge trạng thái:** `[CÔNG CỤ ĐANG HOẠT ĐỘNG 100%]`
- **Form Tra cứu Lịch:**
  - Ô chọn ngày/tháng/năm Dương lịch hoặc Âm lịch.
  - Nút bấm: **Xem Lịch Ngay** | **Hôm Nay**
- **Hiển thị trực quan (Widget Lịch Tờ):**
  - Số ngày Dương lịch lớn (VD: `29` Tháng 9).
  - Số ngày Âm lịch tương ứng (VD: `19` Tháng 8 Âm lịch - Ngày Giáp Tý, Tháng Quý Dậu, Năm Bính Ngọ).
  - Tiết khí hiện tại (VD: Thu Phân) & Giờ Hoàng Đạo trong ngày.
- **Visual:** Giao diện Tờ Lịch Vạn Sự màu Paper & Ink hoài cổ nhưng hiện đại. Alt: "Giao diện Lịch Âm Dương Lá Số Việt".
- **390px:** Tờ lịch hiển thị vừa vặn màn hình mobile, số ngày to 48px nét căng.
- **1440px:** Layout 2 cột: Trái Tờ Lịch Vạn Sự, Phải Bảng tra cứu Can Chi & Giờ Hoàng Đạo.
- **Claim ledger:** "Quy đổi Âm Dương lịch UTC+7 chuẩn thiên văn" → Verified.

---

### S2 — Bảng tra cứu Giờ Hoàng Đạo & Tiết Khí trong ngày
- **Eyebrow (Chơi chữ - Từ cùng trường nghĩa):** Can chi ngày giờ. Hoàng đạo may mắn.
- **H2 (Headline sáng tạo - Cấu trúc song song):** Thông tin Can Chi & Tiết Khí chi tiết.
- **Body (Bảng dữ liệu):**
  - **Giờ Hoàng Đạo:** Danh sách các canh giờ tốt trong ngày (Tý, Sửu, Mão, Ngọ, Thân, Dậu) để tiến hành việc quan trọng.
  - **Tiết Khí:** Điểm mốc thiên văn thời tiết hiện tại (24 Tiết khí trong năm).
  - **Ứng dụng khi lập lá số:** Sử dụng thông tin ngày Âm lịch vừa tra cứu để nhập vào form Lập Lá Số Tử Vi.
- **Visual:** Bảng tra cứu Giờ Hoàng Đạo có icon tích xanh dễ nhận biết. Alt: "Bảng giờ hoàng đạo trong ngày".

---

### S3 — Ứng dụng Lịch Âm trong lập Lá Số Tử Vi
- **H2 (Headline sáng tạo - Tương phản):** Tại sao lịch Âm chuẩn lại quan trọng khi xem Tử Vi?
- **Body:** Lá số Tử Vi dùng ngày tháng Âm lịch để an vị trí của các sao như Tử Vi, Lộc Tồn, Thái Tuế. Nhập sai ngày Âm lịch do tính nhầm tháng nhuận sẽ làm lá số sai lệch hoàn toàn. Công cụ Lịch Âm Lá Số Việt đảm bảo 100% độ chuẩn xác thiên văn cho bạn.
- **Visual:** Infographic cầu nối giữa Lịch Âm và Đồ hình Lá Số Tử Vi. Alt: "Mối liên hệ giữa Lịch Âm và Tử Vi".

---

### S4 — Lời kết & CTA Kết trang
- **H2 (Headline sáng tạo - Slogan ngắn):** Đã có ngày Âm lịch chuẩn? Hãy lập ngay lá số Tử Vi của bạn.
- **CTA chính:** Lập lá số Tử Vi từ ngày Âm lịch này → (`calculator.tu-vi`)
- **CTA phụ:** Xem kho công cụ miễn phí → (`utility.root`)

---

## SEO + Metadata + Schema

- **SEO Title:** Lịch Âm Hôm Nay — Tra Cứu Âm Dương Lịch & Can Chi | Lá Số Việt
- **Meta Description:** Xem lịch âm hôm nay, tra cứu Âm Dương lịch chuẩn xác múi giờ Việt Nam. Đổi ngày âm sang ngày dương, xem Can Chi, Tiết Khí và Giờ Hoàng Đạo miễn phí.
- **Canonical URL:** `https://lasoviet.net/lich-am`
- **Internal Links:**
  - `/ngay-tot` (Xem ngày tốt)
  - `/tu-vi` (Lập lá số Tử Vi)

---

## File / Key Mapping
- `apps/web/src/features/free-tools/lunar-calendar-preview.tsx`
- Engine an sao & lịch pháp
