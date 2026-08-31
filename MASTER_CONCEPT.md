# Master Concept — Lá Số Việt

## 1. Concept một câu

**Lá Số Việt là nền tảng lập và luận giải lá số dành cho người Việt, kết hợp các hệ thống Đông–Tây để giúp mỗi người hiểu bản thân, hoàn cảnh và lựa chọn bằng một bản giải thích có căn cứ, dễ đọc và có thể truy nguyên.**

Hero: **Lập lá số. Hiểu vận mệnh.**  
Supporting line: **Một con người. Nhiều hệ quy chiếu. Một bản luận giải dễ hiểu.**

## 2. Bài toán người dùng

Người dùng không chủ yếu mua “một lời tiên tri”. Họ tìm cách giảm bất định trong ba tình huống:

1. Muốn hiểu tổng thể bản thân và đường đời.
2. Đang bất an về tình yêu, hôn nhân hoặc quan hệ.
3. Cần một khung tham chiếu cho công việc, tài lộc hoặc một giai đoạn sắp tới.

Họ bắt đầu bằng tên phương pháp quen thuộc — `tử vi`, `lá số tử vi`, `bát tự`, `bản đồ sao`, `kinh dịch` — rồi mới đánh giá độ tin cậy của nơi luận giải. Vì vậy acquisition phải **method-first**, còn conversion phải **evidence-first**.

## 3. Lời hứa giá trị

- Lập lá số chính xác theo dữ liệu đầu vào và phương pháp được công bố.
- Diễn giải tiếng Việt có cấu trúc, tránh thuật ngữ khó hiểu nếu không giải thích.
- Cho biết căn cứ của từng nhận định: sao, cung, trụ, ngũ hành, góc chiếu hoặc quẻ.
- Phân biệt rõ dữ kiện tính toán, quy tắc diễn giải và phần tổng hợp bằng AI.
- Đưa ra câu hỏi suy ngẫm và hành động trong vùng người dùng kiểm soát; không áp đặt định mệnh.

## 4. Hệ sản phẩm

### Giai đoạn 1A — MVP doanh thu

- Lập lá số Tử Vi miễn phí.
- Tóm tắt miễn phí: ba điểm nổi bật, một thế mạnh, một căng thẳng, chủ đề nên đọc tiếp.
- Bốn báo cáo trả phí, khởi điểm 79.000đ/báo cáo:
  - Bản mệnh & tiềm năng
  - Tình duyên & hôn nhân
  - Công việc & tài lộc
  - Vận trình năm hiện tại/kế tiếp
- Tài khoản, lưu lá số, thanh toán, trang báo cáo, PDF/print, email hoàn tất, hỗ trợ.

### Giai đoạn 1B — Mở rộng chiều sâu

- Bát Tự/Tứ Trụ.
- Bản đồ sao phương Tây.
- Một hồ sơ ngày–giờ–nơi sinh dùng chung cho nhiều hệ.
- Bản tổng hợp Đông–Tây chỉ xuất hiện sau khi từng hệ đã có engine và evidence ổn định.

### Giai đoạn 1C — Mở rộng use case

- Kinh Dịch cho câu hỏi tình huống.
- Thần số học miễn phí/growth.
- Báo cáo tương hợp/cặp đôi.
- Mở rộng content hub theo truy vấn có nhu cầu thực.

### Giai đoạn 2

- Bán sản phẩm phong thủy sau khi đã có traffic, dữ liệu hành vi và niềm tin thương hiệu.
- Không trộn commerce vào MVP vì làm loãng lời hứa “lập và luận giải lá số”.

## 5. Luồng chuyển đổi chuẩn

`Từ khóa/nhu cầu → trang phương pháp → nhập dữ liệu sinh → lá số miễn phí → tóm tắt có căn cứ → chọn chủ đề sâu → thanh toán → báo cáo → lưu/chia sẻ riêng tư`

Paywall không chặn lá số cơ bản. Người dùng phải thấy hệ thống đã hiểu đúng dữ liệu và tạo ra giá trị trước khi được mời mua.

## 6. Kiến trúc trải nghiệm

Navigation chính:

- Xem lá số
- Luận giải
- Khám phá
- Kiến thức
- Về Lá Số Việt
- CTA: Lập lá số miễn phí

Ba loại trang phải tách intent:

- Knowledge: giải thích phương pháp/chủ đề.
- Calculator: nhập dữ liệu và lập lá số.
- Commercial: giải thích nội dung báo cáo, mẫu kết quả, giá và điều kiện.

## 7. Hệ thống tạo báo cáo

`Birth Profile → Calculation Engine → Normalized Chart JSON → Rules/Evidence → AI Vietnamese Narrative → Report`

AI không được tự tính lá số từ văn bản tự do. Engine xác định cấu trúc; lớp evidence chọn luận điểm; AI chỉ viết lại thành ngôn ngữ tự nhiên trong giới hạn bằng chứng đã cấp.

Mỗi báo cáo lưu bất biến:

- dữ liệu đầu vào và timezone;
- phương pháp/trường phái;
- phiên bản engine và rule set;
- Chart JSON và evidence keys;
- phiên bản prompt/model;
- thời gian tạo và trạng thái thanh toán.

## 8. Niềm tin và an toàn

Không có đội ngũ chuyên gia phía sau thì không được dùng ảnh, chức danh hoặc testimonial giả. Cách xây uy tín:

- công bố phương pháp và nguồn tri thức;
- giải thích “Vì sao có nhận định này?”;
- hiển thị sai số khi thiếu giờ sinh;
- chính sách sửa dữ liệu/tạo lại báo cáo rõ ràng;
- bảo mật dữ liệu sinh;
- tuyên bố giới hạn: nội dung phục vụ tự chiêm nghiệm, không thay thế tư vấn y tế, pháp lý, tài chính hoặc sức khỏe tâm thần.

Không đưa dự đoán chắc chắn về tử vong, bệnh nặng, tai nạn, phản bội hoặc phá sản. Không dùng nỗi sợ để upsell.

## 9. Vai trò tên miền

- `lasoviet.vn`: canonical duy nhất cho thương hiệu, SEO, ứng dụng, checkout và email.
- `lasoviet.cloud`: dự phòng hạ tầng/backend; root redirect về `.vn` cho tới khi có use case kỹ thuật rõ ràng.
- `lasoviet.xyz`: bảo vệ thương hiệu/thử nghiệm; root 301 về `.vn`; staging/lab phải chặn index và truy cập công khai.

Không triển khai ba website nội dung giống nhau.

## 10. Quyết định từ dữ liệu

- Dữ liệu đã đủ để chốt MVP và cấu trúc thông tin; không cần tiếp tục Keyword Planner trước khi build.
- Tử Vi có cả volume lớn ở truy vấn category/calculator và tín hiệu thương mại ở `luận giải tử vi`.
- AI keywords nhỏ hơn đáng kể tên phương pháp; AI là cơ chế sản phẩm, không phải brand promise.
- Nhu cầu “Đông–Tây” là điểm khác biệt chiến lược nhưng chưa phải category người dùng chủ động search.
- Phong thủy có tín hiệu commerce mạnh, phù hợp giai đoạn 2 hơn là lời hứa MVP.

## 11. Điều phải kiểm chứng bằng thị trường thật

- Tỷ lệ hoàn thành form lập lá số.
- Tỷ lệ xem free summary → mở paywall.
- Conversion ở 59k/79k/99k; 79k là mức khởi đầu, không phải sự thật đã chứng minh.
- Chủ đề trả phí có nhu cầu cao nhất.
- Tác động của evidence drawer, mẫu báo cáo và chính sách hoàn tiền đến conversion.
- Repeat purchase và nhu cầu báo cáo cặp đôi.

Ngưỡng quyết định và event tracking nằm trong `docs/09-roadmap-and-metrics.md`.
