# 01 — Evidence & Audience Insights

## 1. Phạm vi dữ liệu

Nguồn chính do người dùng cung cấp:

- 43 file `Keyword Stats`; sau đối chiếu hash còn 25 export độc nhất.
- 24 export cùng kỳ `2025-08-01 → 2026-07-31`.
- 1 export kỳ `2024-08-01 → 2026-07-31` dùng để bổ sung các cụm thương mại/problem intent.
- 571 keyword độc nhất; 298 keyword có volume hiển thị.
- Workbook coverage gồm 27 bộ môn và danh sách repo/giấy phép/kỹ thuật.

Phân bố bucket của keyword canonical:

| Bucket Planner | Mã số trong CSV | Số keyword |
|---|---:|---:|
| 100K–1M | 500,000 | 5 |
| 10K–100K | 50,000 | 29 |
| 1K–10K | 5,000 | 75 |
| 100–1K | 500 | 88 |
| 10–100 | 50 | 101 |
| Không hiển thị | trống | 273 |

Lưu ý: Planner cung cấp bucket, không phải forecast chính xác. Dấu trống không đồng nghĩa 0.

## 2. Tín hiệu nhu cầu đã xác minh

### Category/entry demand rất lớn

| Keyword | Bucket | Ý nghĩa sản phẩm |
|---|---|---|
| tử vi | 100K–1M | Category quen thuộc nhất, nhưng intent rộng |
| lá số tử vi | 100K–1M | Phù hợp trực tiếp với brand và calculator |
| bản đồ sao | 100K–1M | Nhu cầu phương Tây đáng kể |
| bói tình yêu | 100K–1M | Relationship là problem space lớn |
| thần số học | 100K–1M | Growth tool mạnh nhưng YoY trong export là -90% |

### Phương pháp/công cụ có nhu cầu rõ

- `bát tự`, `lá số bát tự`, `lập lá số tử vi`, `tử vi trọn đời`, `lá số tử vi trọn đời`, `kinh dịch`, `gieo quẻ kinh dịch`, `bói bài`, `phong thủy`, `lịch ngày tốt`: 10K–100K.
- `luận giải lá số tử vi`, `luận giải tử vi`, `coi bói`, `huyền học`, `coi chỉ tay`, `giải mã giấc mơ`: 1K–10K.

### Tín hiệu commercial intent

- `luận giải tử vi`: 1K–10K; competition Medium; bid 543–3.467đ trong batch 24 tháng.
- `luận giải lá số tử vi`: 1K–10K; bid 289–2.086đ trong batch 12 tháng.
- `luận giải tử vi online`: 10–100; competition Medium; bid cao nhất 6.289đ.
- `luận giải tử vi chuyên sâu`: 10–100; competition Medium; bid 654–3.851đ.
- `tử vi tình duyên`: 100–1K; bid 678–3.765đ.

Kết luận: “luận giải” là một category thật, nhưng volume nhỏ hơn “lập/xem lá số”; funnel phải lấy calculator/free chart làm đầu vào rồi monetise chiều sâu.

### Tín hiệu cho commerce phong thủy giai đoạn sau

- `vật phẩm phong thủy`: 1K–10K, competition High.
- `vòng phong thủy`, `vòng tay phong thủy`, `đá phong thủy`: 1K–10K trong batch 24 tháng, competition High.
- `sim phong thủy`: 10K–100K, competition Medium.

Các tín hiệu này xác nhận cơ hội giai đoạn 2, nhưng không phải lý do làm loãng MVP.

## 3. Insight người dùng có thể bảo vệ bằng dữ liệu

### Insight A — Người dùng đi vào bằng phương pháp quen thuộc

Bằng chứng: volume cao tập trung ở tên hệ thống và công cụ (`tử vi`, `lá số tử vi`, `bát tự`, `bản đồ sao`, `kinh dịch`), trong khi các cụm “hồ sơ vận mệnh”, “bản đồ vận mệnh” chỉ 10–100 hoặc trống.

Hàm ý: homepage có thể nói concept rộng, nhưng landing page và SEO phải đặt tên phương pháp ở title/H1/URL.

### Insight B — Họ cần lời giải thích cá nhân hóa, không chỉ biểu đồ

Bằng chứng: `luận giải tử vi` và `luận giải lá số tử vi` đều có 1K–10K; các biến thể `phân tích`, `đọc`, `tình duyên`, `hôn nhân`, `công việc`, `tài lộc` có volume.

Hàm ý: chart miễn phí tạo trust; báo cáo trả phí bán chiều sâu theo chủ đề.

### Insight C — AI chưa phải lý do chính để tìm kiếm

Bằng chứng: `tử vi ai` 1K–10K là trường hợp nổi bật; `lá số tử vi ai` 100–1K; đa số `chatbot`, `xem ... bằng ai`, `tarot ai` trống hoặc 10–100.

Hàm ý: không đặt AI trong tên miền/hero. Công bố AI trung thực trong “Cách chúng tôi luận giải”, FAQ và checkout.

### Insight D — Tình yêu là nhu cầu lớn, nhưng không nên biến brand thành website tình yêu

Bằng chứng: `bói tình yêu` 100K–1M và nhiều biến thể có volume; đồng thời category toàn đời và công cụ tổng quát cũng rất lớn.

Hàm ý: relationship là một paid topic mạnh và content hub riêng, không phải toàn bộ positioning.

### Insight E — Niềm tin là rào cản conversion

Bằng chứng trực tiếp ở mức nhỏ: `tử vi có chính xác không`, `lá số tử vi có đúng không` có 10–100. Bằng chứng gián tiếp: commercial query volume thấp hơn calculator/category; người dùng cần kiểm tra giá trị trước khi trả tiền.

Hàm ý: evidence drawer, mẫu báo cáo, phương pháp, nguồn, chính sách sửa dữ liệu và minh bạch AI phải nằm trong funnel.

## 4. Điều dữ liệu không chứng minh

- Không chứng minh giới tính, độ tuổi, thu nhập hoặc vùng miền của người mua.
- Không chứng minh mức giá 50–100k sẽ chuyển đổi tốt.
- Không chứng minh người dùng thích AI hơn chuyên gia.
- Không chứng minh một keyword có volume cao sẽ có CAC thấp hoặc doanh thu cao.
- Không chứng minh “Đông–Tây kim cổ” là cụm người dùng chủ động tìm; đây là differentiation do sản phẩm tạo ra.

Các điểm này phải được đo bằng analytics, phỏng vấn và A/B test sau launch.

## 5. Kết luận về nhu cầu research thêm

Keyword data hiện đủ để:

- chọn brand/domain;
- chọn sản phẩm đầu tiên;
- xây sitemap;
- xác định content cluster;
- thiết kế funnel ban đầu.

Không cần thêm batch Keyword Planner trước MVP. Khoảng trống lớn nhất là conversion, willingness-to-pay, trust và retention — chỉ traffic thật mới trả lời được.
