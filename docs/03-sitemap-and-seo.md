# 03 — Sitemap, Information Architecture & SEO

## 1. Navigation

- Xem lá số
- Luận giải
- Khám phá
- Kiến thức
- Về Lá Số Việt
- CTA cố định: Lập lá số miễn phí

## 2. Sitemap giai đoạn 1

### Trang thương hiệu

- `/`
- `/gioi-thieu`
- `/phuong-phap-luan-giai`
- `/nguon-tri-thuc`
- `/cau-hoi-thuong-gap`
- `/lien-he`
- `/bao-mat-du-lieu`
- `/dieu-khoan`
- `/chinh-sach-bao-mat`

### Calculator/tool pages

- `/la-so-tu-vi` — P0
- `/la-so-bat-tu` — P1
- `/ban-do-sao` — P1 (vị trí chốt, engine chưa chốt — xem `docs/11 §4.1`)
- `/gieo-que-kinh-dich` — P1
- `/than-so-hoc` — Batch 1, build song song Bát Tự (đề xuất nâng ưu tiên — xem `docs/11 §7-D`)
- `/12-con-giap` — Batch 1, đẩy sớm vì rẻ + mùa vụ Tết
- `/cung-hoang-dao` — Content/tool, sau P0
- `/lich-am` — Utility, sau P0
- `/ngay-tot` — Batch 1, đẩy sớm cùng đợt tích hợp mingyu
- `/boi-bai` — Batch 1, free content + rút bài mỗi ngày (gồm cả Bói Bài Tây, không tách trang riêng)
- `/phong-thuy/huong-nha` — Batch 1, calculator nhỏ (hướng nhà/bếp hợp tuổi) — chỉ tính toán, không bán vật phẩm (D-010)

### Commercial pages

- `/luan-giai-tu-vi`
- `/luan-giai-tu-vi/tong-quan-ban-menh`
- `/luan-giai-tu-vi/tinh-duyen-hon-nhan`
- `/luan-giai-tu-vi/cong-viec-tai-loc`
- `/luan-giai-tu-vi/van-trinh-{year}`
- `/luan-giai-bat-tu` — Batch 1, 1 báo cáo tổng hợp khi launch (không nhân bản 4 SKU ngay)

### Knowledge hubs

- `/kien-thuc/tu-vi`
- `/kien-thuc/bat-tu`
- `/kien-thuc/chiem-tinh`
- `/kien-thuc/kinh-dich`
- `/kien-thuc/tinh-duyen-hon-nhan`
- `/kien-thuc/cong-viec-tai-loc`
- `/kien-thuc/phuong-phap-va-do-chinh-xac`
- `/kien-thuc/phong-thuy` — Batch 1, content-only, không đụng D-010 (không bán vật phẩm)
- `/giai-ma-giac-mo` — Content-only, không cần engine; bắt buộc disclaimer "không liên hệ số đề/lô đề" (an toàn theo `MASTER_CONCEPT.md §8`)

### Private/noindex

- `/tai-khoan`
- `/ho-so-cua-toi`
- `/la-so-da-luu`
- `/bao-cao-cua-toi`
- `/thanh-toan`
- `/checkout`
- `/bao-cao/{private-id}`
- `/xem-chi-tay` — Batch 4, pilot ảnh bàn tay; noindex cho tới khi validate engagement/complaint rate (xem `docs/11 §4.3`)

## 3. Intent separation

| Intent | URL | Mục tiêu |
|---|---|---|
| Informational | `/kien-thuc/tu-vi/...` | Giải thích, xây topical authority |
| Calculator | `/la-so-tu-vi` | Hoàn thành chart creation |
| Commercial | `/luan-giai-tu-vi` | Giải thích value/giá/mẫu báo cáo |
| Topic product | `/luan-giai-tu-vi/tinh-duyen-hon-nhan` | Chuyển đổi theo nhu cầu cụ thể |
| Private output | `/bao-cao/{id}` | Trải nghiệm cá nhân, noindex |

Không dùng một URL để vừa làm bài kiến thức, vừa calculator, vừa checkout.

## 4. SEO priorities

### Tier 1 — Launch

- lá số tử vi
- lập lá số tử vi
- tử vi trọn đời
- lá số tử vi trọn đời
- luận giải lá số tử vi
- luận giải tử vi
- lá số tử vi online
- lá số tử vi miễn phí

### Tier 2 — Product expansion

- bát tự
- lá số bát tự
- lập lá số bát tự
- bản đồ sao
- bản đồ sao cá nhân
- lập bản đồ sao
- kinh dịch
- gieo quẻ kinh dịch

### Tier 3 — Topic clusters

- tử vi tình duyên / hôn nhân / tình yêu
- tử vi công việc / sự nghiệp / tài lộc
- các khái niệm sao, cung, trụ, ngũ hành, góc chiếu
- câu hỏi về độ chính xác và cách đọc lá số

## 5. Page template

Mỗi calculator landing page nên có:

1. H1 đúng tên phương pháp.
2. Form/CTA ở phần đầu.
3. Kết quả mẫu hoặc screenshot rõ ràng.
4. Người dùng nhận được gì miễn phí.
5. Cách tính và dữ liệu cần nhập.
6. Các chủ đề có thể luận giải sâu.
7. FAQ dựa trên truy vấn thật.
8. Internal links sang knowledge hub và commercial page.
9. Schema phù hợp: WebApplication/SoftwareApplication, FAQ khi nội dung thật; không lạm dụng Review.

## 6. Technical SEO rules

- Canonical toàn bộ public content về `https://lasoviet.vn`.
- Report cá nhân, tài khoản, checkout: `noindex, nofollow` theo ngữ cảnh.
- Sitemap XML chỉ chứa public indexable URLs.
- Dùng slug tiếng Việt không dấu, ngắn và ổn định.
- SSR/prerender cho landing/content; chart app có thể hydrate phía client.
- Core Web Vitals ưu tiên form và chart; không tải engine/visual nặng trước intent.
- Structured data chỉ phản ánh nội dung có thật.
- Không tạo hàng nghìn trang tổ hợp ngày sinh/năm/con giáp bằng AI nếu nội dung không có giá trị độc lập.

## 7. Editorial quality gate

Một trang chỉ được index nếu có ít nhất một trong các giá trị:

- công cụ tính hữu ích;
- dữ liệu/phương pháp cụ thể;
- giải thích do biên tập kiểm tra;
- ví dụ có căn cứ;
- trả lời một intent độc lập không trùng trang khác.

Nếu không đạt, gộp vào hub hoặc giữ noindex.
