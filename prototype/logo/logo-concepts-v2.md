# Lá Số Việt — 6 hướng logomark (vòng 2, thay thế vòng huy hiệu ormolu)

> Trạng thái: **draft**, chờ founder chọn hướng. Thay thế hoàn toàn cách tiếp cận
> "huy hiệu đồng mạ vàng chụp photoreal" trong `image-prompts-logo.md` (buổi trưa 2026-09-02) —
> hướng đó không dùng nữa. Vòng này dựng logomark là **vector SVG sạch**, đúng cách một
> creative director làm identity mark thật (scalable, currentColor, không phụ thuộc ảnh AI-gen),
> không phải ảnh tham khảo vật liệu.
>
> Palette và font dùng đúng token đã lên production ở `prototype/homepage/homepage.html`
> (hệ sơn mài, không phải hệ giấy/navy trong `docs/13` bản v1.0 — hai hệ đang lệch nhau,
> xem việc còn treo ở cuối file).

## Cách chấm

Mỗi hướng phải trả lời được: **nó tham chiếu đúng yếu tố nào đã có trong brand** (không bịa
biểu tượng mới), và **nó có phạm luật cấm ở `prototype/art-direction.md` §2 / `docs/13` §5.5
không** (không cầu pha lê, không khói hương, không cung hoàng đạo phương Tây, không chữ Hán–Nôm
chưa kiểm chứng, không mặt người). Cả 6 hướng dưới đây đều thuần hình học, không chữ Hán, không
ảnh — an toàn tuyệt đối về mặt này, khác biệt nhau ở **cấu trúc và câu chuyện**, không phải ở
tham số.

Quy tắc màu áp dụng cho cả 6: cấu trúc chính = `currentColor` (render vàng `#C9A44D` trên nền
sơn mài, hoặc mực `#14263D` nếu dùng lại trên nền giấy); đúng **một** điểm nhấn cố định màu
son `#CE5B45` mỗi mark — đúng nguyên tắc "một điểm son có chủ ý" ở `docs/13` §3.4 và §5.2
("cinnabar chiếm khoảng 5–10% diện tích, tối đa một accent nổi bật mỗi khối").

File nguồn: `marks/01-la-kinh.svg` … `marks/06-tang-thu.svg`. Toàn bộ `viewBox="0 0 100 100"`.

---

### 01 — La Kinh (vòng compass, 12 nấc)

Vòng tròn viền mảnh + 12 vạch chia đều quanh rìa (như vạch độ trên la kinh thật), một vạch ở
vị trí 12 giờ tô son — giữ lại đúng chi tiết "một rãnh cẩn son ở 12 giờ" từng thấy trong bản
huy hiệu buổi trưa, nhưng giờ là nét vector sắc, không phải ảnh render vật liệu. Tâm để trống
(một chấm nhỏ, không lấp đầy) — tâm là chỗ người dùng tự đọc, thương hiệu không áp đặt kết luận
vào giữa.

**Vai trò gợi ý:** icon chính / favicon — an toàn, tĩnh, đúng tinh thần "dụng cụ đo đạc chính
xác" hơn là trang trí.

### 02 — Bánh Xe 12 Cung (la bàn sao)

Trục 6 nan rút gọn từ bố cục 12 cung của lá số thật (đủ 12 nan sẽ rối ở size nhỏ), vòng ngoài
mảnh, một cung 30° ở đỉnh được tô đậm son — hình ảnh trực tiếp của sản phẩm (bản đồ 12 cung),
không phải biểu tượng chiêm tinh chung chung.

**Vai trò gợi ý:** icon cho khối sản phẩm/app, chỗ cần liên hệ trực tiếp tới lá số.

### 03 — Dấu Triện (hai hình vuông lồng nhau)

Vuông bo góc ngoài viền mảnh, vuông bo góc nhỏ bên trong tô đặc son — **đây chính là icon đặt
chỗ đang chạy thật trong header `homepage.html` hiện tại**, chỉ khác là đã hoàn thiện tỷ lệ bo
góc và độ dày nét thay vì để tạm. Hướng an toàn nhất, ít rủi ro nhất, ship được ngay hôm nay vì
không đổi cảm nhận đã quen với ai từng thấy bản dựng.

**Vai trò gợi ý:** phương án "nâng cấp cái đang có" thay vì đổi hẳn.

### 04 — Một Hồ Sơ, Nhiều Hệ (mạng nút)

1 nút tâm tô đặc son (hồ sơ sinh) nối bằng 3 đường mảnh tới 3 nút vệ tinh chỉ viền, không tô
(ba hệ quy chiếu: Tử Vi, Bát Tự, Bản đồ sao) — dựng thẳng từ chính **supporting line đã chốt**
ở `docs/13` §3.5: *"Một con người. Nhiều hệ quy chiếu. Một bản luận giải dễ hiểu."* Ba nút vệ
tinh cố tình để rỗng, không hoà vào nhau — đúng câu ở `docs/02-brand-and-positioning.md`:
"mỗi hệ vẫn giữ phương pháp riêng."

**Vai trò gợi ý:** mark ý niệm nhất trong 6 hướng — dùng cho hero/app icon nếu muốn logo *kể*
định vị thay vì chỉ trang trí.

### 05 — Nguyệt Tướng (trăng khuyết)

Một hình trăng khuyết dựng từ hai vòng tròn lệch tâm (mask), không thêm chi tiết nào khác —
đúng "nguyệt tướng" đã có sẵn trong bộ icon 13 ký hiệu ở `prototype/art-direction.md` §5, không
phải biểu tượng bịa mới. Không dùng điểm son — hướng duy nhất cố tình *không* có accent, để
kiểm tra độ đơn sắc/im lặng đến đâu là vừa.

**Vai trò gợi ý:** ứng viên yếu nhất về mặt liên hệ trực tiếp tới "lập lá số", mạnh nhất về độ
tối giản — đưa vào để founder thấy biên dưới của "càng ít càng được" trước khi chốt.

### 06 — Tàng Thư (trang sách + nhãn ruy băng)

Hình chữ nhật bo góc như gáy sách/trang tư liệu, 4 vạch ngang mô phỏng dòng chữ (so le, không
đều tăm tắp — như một đoạn văn thật), một nhãn ruy băng tô son ở góc trên — dựng từ chính
**North Star** ở `docs/13` §3.1: "Thư viện tri thức Việt đương đại — với một bàn đọc riêng tư."
Đây là hướng duy nhất không dựa trên hình tròn/la bàn, cho founder một lựa chọn silhouette khác
hẳn 5 hướng còn lại.

**Vai trò gợi ý:** icon cho khối "Kiến thức" / blog, hoặc ứng viên logo chính nếu muốn nhấn
"thư viện" hơn "công cụ đo đạc".

---

## Việc còn treo

- [ ] Founder chọn 1 (hoặc 2 để thử lockup) từ 6 hướng trên.
- [ ] Sau khi chốt: vẽ lockup ngang chính thức (icon + wordmark "Lá Số Việt", Source Serif 4)
      để thay khối placeholder trong `header` của `homepage.html` và 9 trang còn lại.
- [ ] Xuất favicon 16/32/48px + app icon 512px từ bản chọn, kiểm tra độ rõ ở size nhỏ thật
      (không chỉ xem trên canvas 100×100).
- [ ] `docs/13-brand-experience-guideline.md` §5.1–5.2 vẫn mô tả hệ "Giấy — Mực — Son" (nền
      paper, navy làm chủ đạo) trong khi bản dựng thật đã chuyển hệ sơn mài nền tối — đúng như
      `prototype/art-direction.md` đã ghi nhận ở mục "Việc còn treo" của nó. Logo nên chốt xong
      trước, rồi gộp luôn vào lần cập nhật §5 đó thay vì sửa hai lần.
