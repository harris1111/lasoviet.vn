# Lá Số Việt — Upgrade v3→v4 — brief tự chứa cho Claude Design (web)

> Dán nội dung này vào ô prompt của Claude Design, MỞ LẠI đúng project "Trang chủ Lá Số Việt" đã có
> (đừng tạo project mới — bản hiện tại đã đúng hướng, đây là bản nâng cấp tiếp, không phải viết lại).
> Toàn bộ 7 ảnh cần dùng đã gen xong — kéo cả 7 vào cùng lúc trước khi bắt đầu.

---

## 0. Đánh giá bản hiện tại — giữ nguyên, đừng làm mất

Bản vừa dựng đã đúng hướng "phá khung SaaS" — không viết lại các phần sau, chỉ nâng cấp thêm:

- Kim la bàn tương tác đồng bộ theo ngày/giờ/năm nhập ở hero (`needleTransform`, `needleLabel`) — giữ
  nguyên logic, chỉ đổi phần nền phía sau nó (xem mục 1).
- Khối "Bạn nhận được gì" lệch trục — chart âm margin bên trái, card "ghi chú bên lề" chồng lên viền
  chart — giữ nguyên bố cục, chỉ đổi phần vẽ chart (xem mục 1).
- "Chọn chủ đề khi bạn cần đi sâu hơn" trình bày như mục lục sách (số La Mã + dòng chấm dẫn tới giá)
  thay vì pricing card — giữ nguyên.
- FAQ với số thứ tự + ký hiệu thay vì icon chevron thông thường — giữ nguyên.
- Toàn bộ token màu/font, toàn bộ copy tiếng Việt — giữ nguyên 100%.

## 1. Thay bản vẽ SVG thiên bàn bằng ảnh la kinh thật

Thiên bàn 12 cung hiện đang được VẼ bằng SVG (vòng tròn, spoke, kim chỉ) ở hai chỗ: nền hero và khối
"Bạn nhận được gì". Ảnh la kinh đã gen xong và đã kiểm tra chữ đúng (12 Địa Chi 子丑寅卯辰巳午未申酉戌亥
quanh viền, Bát Quái vòng trong, kim chỉ 子/午 ở tâm — khớp chính xác với 12 giờ sinh Tý-Sửu-Dần...
dùng trong form của web).

### 1a. Nền hero

- Đặt `la-kinh-phong-thuy-dong-tam-son-mai.webp` làm nền, thay cho toàn bộ khối `<svg>` vòng
  tròn/spoke hiện tại (giữ layer gradient tối phủ lên trên để chữ vẫn đọc được, y như cách đang làm
  với `background: linear-gradient(97deg, ...)`).
- **Giữ lại** riêng phần kim chỉ (`needleTransform`) và điểm tâm — vẽ lại nó như MỘT lớp SVG mảnh,
  tối giản (chỉ 1 đường kim + 1 chấm tâm, không vẽ vòng tròn/spoke nữa vì ảnh nền đã có sẵn các vòng
  khắc thật) — đặt đè lên đúng vị trí tâm khí cụ trong ảnh (tâm la bàn nằm hơi lệch phải-dưới so với
  khung ảnh, không phải chính giữa — canh lại toạ độ theo ảnh thật, đừng dùng toạ độ cũ của SVG).
  Animation xoay kim khi đổi ngày sinh giữ nguyên như hiện tại.

### 1b. Khối "Bạn nhận được gì" (12 cung)

- Thay toàn bộ `<svg>` vẽ vòng tròn + chữ "Thiên bàn / 12 CUNG" bằng chính ảnh la kinh đó (crop góc
  khác hoặc cùng khung, tuỳ bố cục). Không cần kim tương tác ở khối này — đây chỉ là ảnh minh hoạ ngữ
  cảnh bên cạnh 3 insight card, không phải công cụ tính toán.
- Giữ nguyên khung viền, border-radius, vị trí lệch trục (margin âm) hiện có — chỉ đổi nội dung bên
  trong từ SVG sang `<img>` object-fit: cover.

## 2. Hai ảnh bổ sung — đặt vào đúng chỗ có lý do, không phải trang trí ngẫu nhiên

### 2a. Lịch vạn niên (`lich-van-nien-thien-can-dia-chi-cach-lap-la-so.webp`) — đã kiểm tra chữ đúng

Ảnh có cột 甲乙丙丁戊己 (Thiên Can) và hàng 子丑寅卯辰巳午未 (Địa Chi) — đúng bảng Can-Chi dùng để tính
ngày/giờ trong Tử Vi, kèm một đồng hồ cát đồng có mặt tròn khắc độ. **Đặt ở khối "Cách hoạt động"**,
cụ thể đứng cạnh hoặc làm nền mờ phía sau bước **01 "Nhập dữ liệu sinh"** — đây là bước duy nhất trong
3 bước nói về ngày/giờ/nơi sinh, nên ảnh lịch + đồng hồ cát khớp ngữ nghĩa trực tiếp, không phải ảnh
minh hoạ chung chung. Hiện khối này đang là text-only (số 01/02/03 + tiêu đề + mô tả) — thêm ảnh nhỏ
bên phải bước 01, kích thước vừa phải, đừng để ảnh lấn át 2 bước còn lại (02, 03 vẫn giữ text-only để
tạo nhịp: có ảnh → không ảnh → không ảnh, tránh lặp đều 3 lần gây nặng trang).

### 2b. Dấu triện — đã thử 2 lần, cả 2 lần đều nghi sai chữ → đổi hướng, dùng hoạ tiết không chữ

Đã gen lại lần 2 (`dau-trien-son-tren-giay-co-v2-van-nghi-sai-chu.webp`) — vẫn có dấu hiệu ra chữ
**福 (Phúc)** thay vì **信 (Tín)** yêu cầu (bộ chữ bên phải vẫn kết ở một ô chia đôi — đặc điểm của
畐/Phúc, không phải 言/Tín). Model có xu hướng mặc định về 福 vì đây là chữ xuất hiện dày đặc nhất
trong mọi ảnh "con dấu đỏ" mà nó từng học — khó thắng bằng cách chỉnh prompt thêm.

**Quyết định: bỏ yêu cầu chữ Hán cụ thể, dùng hoạ tiết vuông-lồng-vuông không chữ** — chính là hình
dạng con dấu triện đang dùng trong icon UI hiện tại của trang (`i-trien`: hai hình vuông bo góc lồng
nhau). Ảnh chụp thật khớp thẳng với icon đó thì nhất quán hệ thống hơn, và loại bỏ hoàn toàn rủi ro
sai chữ vì không còn chữ để sai.

**Prompt gen mới (thay hẳn prompt cũ, không dùng bản có chữ 信 nữa):**

```
Extreme macro close-up still life of a red cinnabar-lacquer seal impression freshly pressed into
aged cream-colored paper, the seal a simple abstract geometric motif — a square with softly rounded
corners nested inside a slightly larger square with softly rounded corners, both concentric and
evenly spaced, no characters, no script, no text of any kind inside or around the squares — the
cinnabar pigment sitting slightly raised and textured at the impression's edges, one folded corner of
a paper document visible at the edge of frame, resting on a dark lacquered wood surface, single warm
raking light from the upper left casting a soft shadow beneath the paper's folded edge, extremely
shallow depth of field with only the seal impression in crisp focus and everything else softly
blurred into warm darkness, dark near-black background, absolutely no legible or illegible characters
anywhere in the frame, no people, photorealistic still life photography, 100mm macro lens, f/2, fine
paper fiber and pigment texture visible, editorial product photography lighting
```

Sau khi gen, đổi tên `dau-trien-vuong-long-vuong-son-tren-giay-co.webp`, xoá 2 file bản có chữ
(`...v2-van-nghi-sai-chu.webp` và bản gốc nếu còn giữ). Vị trí dùng giữ nguyên như cũ: khối "Chọn chủ
đề khi bạn cần đi sâu hơn" — nền mờ phía sau hoặc góc phải section, gắn với ý "báo cáo được đóng gói
như một ấn phẩm đáng tin".

*Nếu anh vẫn muốn thử thêm 信 lần nữa thay vì đổi hướng: có thể thử một công cụ gen khác (một số model
render chữ Hán ổn định hơn model khác), nhưng tôi khuyến nghị hoạ tiết không chữ ở trên vì vừa an
toàn vừa khớp hệ thống UI sẵn có hơn.*

## 3. Bổ sung bộ icon — vector, KHÔNG gen bằng AI ảnh

Icon phải là vector (SVG), không phải ảnh raster — để giữ nét sắc ở mọi kích thước và đổi màu được
qua `currentColor`. Vẽ theo đúng spec sau, nhất quán với con dấu triện đã có sẵn trong bản hiện tại:

**Spec kỹ thuật:**
- Khung vẽ 24×24px, vùng vẽ thật 20×20 (chừa 2px mỗi cạnh).
- Nét 1.5px, đầu nét và góc nối bo tròn (`round`) — **trừ icon dấu triện** vẫn giữ góc vuông như hiện
  tại (đây là ngoại lệ chủ đích, không phải thiếu nhất quán).
- Không tô nền/fill, chỉ vẽ nét — trừ khi icon cần một chấm đặc nhỏ (ví dụ tâm la bàn).
- Màu mặc định: `#C9A44D` (gold-500) trên nền tối; dùng `#A79E8B` (pearl-400) cho trạng thái mờ/phụ.
- Xuất dạng `<symbol>` trong một `<svg><defs>` sprite dùng chung, gọi lại bằng `<use href="#i-ten">`
  — đúng cách bản hiện tại đang tổ chức icon (không viết icon rời từng chỗ).

**Danh sách icon cần vẽ** (nhóm theo chức năng, ưu tiên nhóm 1–2 trước vì dùng ngay trên trang chủ):

1. Điều hướng — `menu`, `close`, `chevron-down`, `chevron-right`, `arrow-right`, `external-link`, `search`
2. Niềm tin/trạng thái — `check`, `shield-lock` (quyền riêng tư), `refresh-off` (không tự động gia hạn) — *(dấu triện giữ nguyên, không vẽ lại)*
3. Form nhập liệu — `calendar-day`, `clock`, `map-pin`, `user`, `help-circle` (không rõ giờ sinh)
4. Nội dung/thư viện — `book-open`, `scroll`, `compass`
5. Tài khoản/quyền riêng tư — `user-circle`, `download`, `trash`, `pencil`
6. Chia sẻ — `share`, `link`

Nhóm 1–2 dùng ngay ở: menu di động (hiện đang trống icon), nút đóng/mở FAQ (hiện dùng ký tự thay vì
icon — có thể giữ ký tự nếu anh thích cách đó, hoặc đổi sang `chevron-down` cho nhất quán với input
form), badge "Không tự động gia hạn" ở trust strip. Nhóm 3–6 chuẩn bị trước cho form lập lá số và
trang tài khoản (chưa build, nhưng vẽ sẵn để nhất quán khi tới lúc).

## 4. Toàn bộ ảnh — bảng cuối để đối chiếu khi kéo vào Claude Design

Mọi ảnh đã đổi tên theo rule SEO bắt buộc (chữ thường, không dấu, gạch ngang, mô tả nội dung + ngữ
cảnh). Alt text viết tiếng Việt có dấu khi Claude Design sinh code.

| File | Alt text gợi ý | Dùng ở đâu | Trạng thái |
|---|---|---|---|
| `la-kinh-phong-thuy-dong-tam-son-mai.webp` | Cận cảnh la kinh phong thủy cổ khắc 12 Địa Chi và Bát Quái | Nền hero + khối "Bạn nhận được gì" (mục 1) | ✅ Đã kiểm tra chữ, dùng ngay |
| `lich-van-nien-thien-can-dia-chi-cach-lap-la-so.webp` | Lịch vạn niên cổ khắc Thiên Can Địa Chi bên cạnh đồng hồ cát đồng | Khối "Cách hoạt động", cạnh bước 01 (mục 2a) | ✅ Đã kiểm tra chữ, dùng ngay |
| *(chưa có file)* — gen theo prompt mới ở mục 2b | Cận cảnh dấu triện son đỏ hình vuông lồng vuông trên giấy cổ | Khối "Chọn chủ đề luận giải sâu" (mục 2b) | ⚠️ 2 bản có chữ đều nghi sai (福 thay vì 信) — đã đổi prompt sang hoạ tiết không chữ, gen lại trước khi dùng |
| `sach-tang-thu-co-dau-trien-do-la-so-tu-vi-la-gi.webp` | Trang sách cổ phương Đông đang mở với dấu triện đỏ | Ảnh bài "Lá số Tử Vi là gì?" | ✅ Dùng ngay |
| `but-long-nghien-muc-da-cach-lap-la-so-tu-vi.webp` | Bút lông thư pháp gác trên nghiên mực đá có vụn vàng | Ảnh bài "Cách lập lá số Tử Vi" | ✅ Dùng ngay |
| `tu-tang-thu-son-son-thep-vang-cach-doc-la-so-tu-vi.webp` | Cận cảnh tủ tàng thư cổ sơn son thếp vàng, tay cầm đồng | Ảnh bài "Cách đọc lá số Tử Vi" | ✅ Dùng ngay |
| `son-mai-dat-vang-xa-cu-macro-nen-toi.webp` | Cận cảnh bề mặt sơn mài đen dát vàng và khảm xà cừ | Lớp khí quyển phụ (không phải nền hero chính — la kinh đã thay vai trò đó) | ✅ Dùng nếu cần thêm texture, không bắt buộc |
| `thien-ban-dong-khi-cu-chiem-tinh-co.webp` | Cận cảnh khí cụ thiên văn bằng đồng cổ, các vòng khắc độ | Khí cụ trang trí chung — KHÔNG dùng thay la kinh | Dự phòng cho trang "Phương pháp" sau này |

## 5. Thứ tự làm

1. Kéo 7 ảnh (trừ file dấu triện sai chữ) vào Claude Design ngay từ đầu.
2. Thay SVG thiên bàn ở hero + khối "Bạn nhận được gì" bằng ảnh la kinh (mục 1).
3. Đặt 3 ảnh bài viết vào đúng 3 card kiến thức (đã đúng vị trí trong code hiện tại, chỉ cần nối file
   thật vào chỗ đang để placeholder gradient).
4. Đặt ảnh lịch vạn niên cạnh bước 01 trong "Cách hoạt động" (mục 2a).
5. Vẽ bộ icon theo spec mục 3, ưu tiên nhóm 1–2 trước.
6. Kiểm tra lại: ảnh nền hero có đủ tối để chữ trắng ngà đọc được không (test tại đúng vị trí chữ H1
   sẽ đè lên, không chỉ nhìn tổng thể ảnh).
7. Riêng: gen lại ảnh dấu triện (mục 2b) ở một lượt sau, chưa cần chặn 6 bước trên.
