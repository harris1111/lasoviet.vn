# Bộ Tài Liệu Handoff Hoàn Chỉnh — Content & Technical Spec Trang Chủ Lá Số Việt (`lasoviet.net`)
> **Phiên bản:** 2.1 (Đã tinh chỉnh theo phê duyệt của Founder: Loại bỏ Section đọc thử luận giải)  
> **Ngày cập nhật:** 2026-09-23  
> **Domain chuẩn:** `https://lasoviet.net`  
> **Mục tiêu:** Handoff cho Agent tiếp theo triển khai UI, i18n và Frontend hoàn thiện trang chủ.

---

## MỤC LỤC
1. [Quyết Định Cốt Lõi Từ Founder](#1-quyết-định-cốt-lõi-từ-founder)
2. [Chi Tiết Nội Dung Từng Section (Bản Hoàn Chỉnh)](#2-chi-tiết-nội-dung-từng-section-bản-hoàn-chỉnh)
3. [Quy Chuẩn Giao Diện Mobile Rút Gọn](#3-quy-chuẩn-giao-diện-mobile-rút-gọn)
4. [Bảng Ánh Xạ Từ Khóa, Nhu Cầu & Routes Điều Hướng](#4-bảng-ánh-xạ-từ-khóa-nhu-cầu--routes-điều-hướng)
5. [Quy Chuẩn Hình Ảnh & Chuyển Động (Content + Art Pairing)](#5-quy-chuẩn-hình-ảnh--chuyển-động-content--art-pairing)
6. [Hướng Dẫn Triển Khai Kỹ Thuật Cho Agent Tiếp Theo](#6-hướng-dẫn-triển-khai-kỹ-thuật-cho-agent-tiếp-theo)

---

## 1. QUYẾT ĐỊNH CỐT LÕI TỪ FOUNDER

- **Thương hiệu & Tinh thần:** Tên thương hiệu là **Lá Số Việt** (đầy đủ dấu tiếng Việt). Phong cách bán cổ điển kết hợp hiện đại. Giọng văn ấm áp, sâu sắc, gần gũi đời sống người Việt, tuyệt đối không viết như văn bản báo cáo hệ thống, tài liệu kỹ thuật hay máy dịch quảng cáo.
- **Hero & Form:**
  - H1 giữ nguyên từng chữ: **“Lập lá số. Hiểu vận mệnh.”**
  - Subheadline giữ nguyên từng chữ: **“Công việc, tình cảm hay bản thân: bắt đầu từ lá số của bạn.”**
  - Form nhập liệu (Wizard) chiếm vị trí trung tâm, ít chữ thừa. Nút CTA rõ ràng: **“Lập lá số miễn phí”**.
  - Không hiện cảnh báo giờ sinh trên homepage. Nếu người dùng tick chọn "Tôi không nhớ chính xác giờ sinh", thông báo giải thích ảnh hưởng đến kết quả sẽ xuất hiện nhẹ nhàng ở bước sau khi bấm nút tạo.
- **Giá trị xem & Tiền tệ:**
  - Người dùng xem được trọn vẹn lá số 12 cung và **2 nhận định trọng tâm hữu ích trước khi đăng nhập** (1 về bản thân, 1 theo chủ đề họ chọn sau khi rời homepage).
  - Đăng nhập mở thêm bản tóm lược ban đầu.
  - Sử dụng **Lá** để mở luận giải sâu. Trang chủ không hiện giá. Ở nơi có bán gói Lá (trang chọn luận giải, thanh toán), **bắt buộc hiển thị song song số Lá và số tiền VNĐ thật** (ví dụ: `1.100 Lá · 99.000 đ`), không tạo tỷ giá ảo.
- **Điều hướng & Bộ môn:**
  - Section Nhu cầu và Section Các bộ môn đặt cạnh nhau.
  - Bộ môn **Tử Vi** đã có engine hoạt động: dùng CTA `Lập lá số Tử Vi`.
  - Các bộ môn khác (Bát Tự, Chiêm Tinh, Kinh Dịch, Thần Số Học) hiện là trang landing giới thiệu: **Bắt buộc dùng CTA `Tìm hiểu [Tên bộ môn]`**, không dùng "Lập..." hay "Gieo...".
  - Không đặt link trỏ vào các route `reserved` (như `/luan-giai-tu-vi/tinh-duyen-hon-nhan`, `/luan-giai-tu-vi/cong-viec-tai-loc`).
- **Phần About:** Đặt ở gần cuối trang, chia sẻ chân thành lý do ra đời của Lá Số Việt trước khi kết thúc bằng CTA mời lập lá số.
- **Ranh giới nội dung tuyệt đối cấm (FD-089):** Tuyệt đối không phán đoán cái chết, thọ yểu; không bán bùa chú, đồ phong thủy, cúng bái giải hạn; không claim "chính xác 99%", không dùng review hay chuyên gia giả mạo; không liên quan đến số đề, cờ bạc.

---

## 2. CHI TIẾT NỘI DUNG TỪNG SECTION (BẢN HOÀN CHỈNH)

### SECTION 1: HERO — VÀO VIỆC NGAY

- **H1:** `Lập lá số. Hiểu vận mệnh.`
- **Subheadline:** `Công việc, tình cảm hay bản thân: bắt đầu từ lá số của bạn.`

#### Microcopy Khối Form (Wizard):
- **Tiêu đề form:** Nhập ngày giờ sinh để an lá số riêng của bạn
- **Trường Họ và tên:**
  - *Label:* Bạn muốn gọi tên lá số là gì?
  - *Placeholder:* Ví dụ: Minh An
  - *Ghi chú mờ:* (Tên dùng để in trên lá số và lưu hồ sơ cá nhân)
- **Trường Giới tính:**
  - *Options:* `Nam` · `Nữ`
- **Trường Ngày sinh:**
  - *Chuyển đổi lịch:* `Dương lịch` (mặc định) | `Âm lịch`
  - *Inputs:* [ Ngày ] / [ Tháng ] / [ Năm ]
- **Trường Giờ sinh:**
  - *Dropdown chọn giờ:* 12 khung giờ (Tý: 23h-01h, Sửu: 01h-03h, Dần: 03h-05h, Mão: 05h-07h, Thìn: 07h-09h, Tỵ: 09h-11h, Ngọ: 11h-13h, Mùi: 13h-15h, Thân: 15h-17h, Dậu: 17h-19h, Tuất: 19h-21h, Hợi: 21h-23h).
  - *Lựa chọn phụ:* `Tôi không nhớ chính xác giờ sinh`
- **CTA chính:** **Lập lá số miễn phí**
- **Microcopy dưới nút:** Lá số hiển thị tức thì. Xem trọn vẹn 12 cung và 2 nhận định trọng tâm trước khi cần đăng nhập.

---

### SECTION 2: CHẠM BĂN KHOĂN — KHI LÒNG ĐANG CÓ NHIỀU DẤU HỎI

- **Headline:** Có những giai đoạn, điều bạn cần chỉ là một chỉ dấu rõ ràng
- **Nội dung:**
  > Đứng trước một quyết định chuyển việc, một mối quan hệ dùng dằng, hay những năm tháng cố gắng mãi mà kết quả chưa như ý—ai trong chúng ta cũng từng tự hỏi: *Liệu mình đang đi đúng hướng?*  
  > 
  > Lá số Tử Vi không sinh ra để phán bạn giàu hay nghèo trong chớp mắt. Nó được người xưa lập nên như một tấm bản đồ thời vận: chỉ rõ điểm mạnh để phát huy, nhận diện điểm chông chênh để tránh bớt va vấp, và biết lúc nào nên tiến, lúc nào cần thong thả chờ thời.

---

### SECTION 3: LÁ SỐ MẪU — CHẠM VÀO ĐỂ HIỂU CÁCH XẾP ĐẶT ĐỜI MÌNH

- **Headline:** 12 cung trên lá số: 12 mảnh ghép của một đời người
- **Đoạn dẫn:** Đừng để những thuật ngữ cổ xưa làm bạn bối rối. Nhìn vào lá số, từng ô vuông thực chất đang kể về một phần rất quen thuộc trong cuộc sống của bạn:
- **Tương tác chạm (Interactive Tooltips 12 cung):**
  - **Cung Mệnh:** *Cốt cách & Tính cách gốc.* Bạn là người kiên định, thích hành động độc lập hay giỏi gắn kết mọi người?
  - **Cung Quan Lộc:** *Đường sự nghiệp & Cách làm việc.* Hợp môi trường quy củ, ổn định hay thích tự do bứt phá kinh doanh?
  - **Cung Tài Bạch:** *Tài chính & Dòng tiền.* Kiếm tiền bằng chuyên môn hay đầu tư, giữ của chặt chẽ hay dễ hao hụt?
  - **Cung Phu Thê:** *Tình duyên & Bạn đời.* Mẫu người dễ gắn bó lâu dài, những điểm khác biệt cần học cách lắng nghe.
  - **Cung Phúc Đức:** *Đời sống tinh thần & May mắn nội tâm.* Nền tảng an yên và sự cân bằng trong suy nghĩ.
  - **Cung Thiên Di:** *Môi trường bên ngoài & Duyên đi xa.* Sự thích nghi khi bước ra xã hội hay làm ăn xa quê hương.
  - **Cung Nô Bộc:** *Bạn bè, đồng nghiệp & Cộng sự.* Mối quan hệ tương hỗ và những ai thực sự nâng đỡ bạn.
  - **Cung Điền Trạch:** *Nhà cửa, đất đai & Không gian sống.* Khả năng tích lũy tài sản và sự an cư.
  - **Cung Huynh Đệ:** *Anh chị em & Người gắn kết ruột thịt.* Sự hòa hợp và sẻ chia trong gia đình.
  - **Cung Phụ Mẫu:** *Cha mẹ & Nền tảng dạy dỗ.* Mối liên hệ và sự che chở từ gia đình thời thơ ấu.
  - **Cung Tử Tức:** *Con cái & Hậu duệ.* Duyên gắn kết và cách bạn nuôi dưỡng thế hệ sau.
  - **Cung Tật Ách:** *Sức khỏe & Điểm cần gìn giữ.* Những lưu ý về thể chất để chủ động nghỉ ngơi, điều dưỡng.
  - **Đại vận 10 năm & Lưu niên từng năm:** *Nhịp thời gian.* Năm nào thuận lợi để khởi sự, năm nào nên thận trọng giữ sức.
- **Link phụ:** Xem thử một lá số mẫu hoàn chỉnh → `(Route: /bao-cao-mau/tu-vi)`

---

### SECTION 4: HÔM NAY BẠN ĐANG BĂN KHOĂN ĐIỀU GÌ? (NHU CẦU & BỘ MÔN GẮN LIỀN)

- **Headline:** Bắt đầu từ câu hỏi bạn đang trăn trở nhất
- **Subheadline:** Không cần phải là người am hiểu thuật số. Bạn chỉ cần chọn điều mình muốn gỡ rối hôm nay.

#### 1. Khối Nhu cầu đời sống:
- **Thẻ 1 — Hiểu rõ chính mình:**
  - *Tâm sự:* Mình thực sự mạnh ở điểm nào? Vì sao mình hay chần chừ, khó dứt khoát?
  - *Lối đi:* Lập lá số Tử Vi để soi chiếu cung Mệnh và Thân.
  - *CTA:* **Xem Tử Vi bản mệnh** `(Route: /tu-vi hoặc cuộn lên Hero)`
- **Thẻ 2 — Công việc và tài chính:**
  - *Tâm sự:* Có nên đổi việc lúc này? Giai đoạn này nên bung sức làm ăn hay nên tích lũy chờ thời?
  - *Lối đi:* Xem đường tài vận và hạn thời gian trên lá số Tử Vi.
  - *CTA:* **Xem vận hạn công việc** `(Route: /tu-vi)` | *Link phụ:* Tìm hiểu Bát Tự `(Route: /bat-tu)`
- **Thẻ 3 — Tình cảm và người đồng hành:**
  - *Tâm sự:* Vì sao chuyện tình cảm hay gặp trắc trở? Người thế nào sẽ hòa hợp và bù trừ cho mình?
  - *Lối đi:* Soi chiếu cung Phu Thê trên lá số Tử Vi.
  - *CTA:* **Xem chuyện tình cảm** `(Route: /tu-vi)` | *Link phụ:* Tìm hiểu Chiêm Tinh `(Route: /chiem-tinh)`
- **Thẻ 4 — Một sự việc cụ thể trước mắt:**
  - *Tâm sự:* Đang đứng trước một quyết định cụ thể: có nên ký hợp đồng, nên đi chuyến này hay đợi thêm?
  - *Lối đi:* Tham khảo phương pháp gieo quẻ Kinh Dịch để nhận lời khuyên hành xử.
  - *CTA:* **Tìm hiểu Kinh Dịch** `(Route: /kinh-dich)`

#### 2. Khối Các bộ môn đồng hành tại Lá Số Việt:
*(Minh bạch tình trạng tính năng)*
- **Tử Vi Đẩu Số:** *Hệ thống an sao và luận giải chuyên sâu đã sẵn sàng.*  
  *Trạng thái:* Hoạt động · *CTA:* **Lập lá số Tử Vi** `(Route: /tu-vi)`
- **Bát Tự (Tứ Trụ):** *Phân tích cân bằng âm dương và chu kỳ ngũ hành cuộc đời.*  
  *Trạng thái:* Đang hoàn thiện engine · *CTA:* **Tìm hiểu Bát Tự** `(Route: /bat-tu)`
- **Chiêm Tinh Học:** *Bản đồ sao phương Tây với 12 cung hoàng đạo và các góc chiếu tâm lý.*  
  *Trạng thái:* Đang hoàn thiện engine · *CTA:* **Tìm hiểu Chiêm Tinh** `(Route: /chiem-tinh)`
- **Kinh Dịch:** *Giải mã thời điểm và gợi ý ứng xử trước các tình huống cụ thể.*  
  *Trạng thái:* Đang hoàn thiện engine · *CTA:* **Tìm hiểu Kinh Dịch** `(Route: /kinh-dich)`
- **Thần Số Học:** *Các chu kỳ năm cá nhân và tần số rung động qua họ tên, ngày sinh.*  
  *Trạng thái:* Đang hoàn thiện engine · *CTA:* **Tìm hiểu Thần Số Học** `(Route: /than-so-hoc)`

---

### SECTION 5: BẢNG SO SÁNH — CHỌN CÁCH TÌM HIỂU PHÙ HỢP VỚI BẠN

- **Headline:** Ba cách nhìn lại vận mệnh: Bạn chọn sự tiện lợi nào?
- **Subheadline:** Không có phương thức nào là duy nhất. Chúng tôi đặt cạnh nhau để bạn thấy rõ điều mình nhận được.

#### Nội dung so sánh:
1. **Tính chuẩn xác của lá số:**
   - *Lá Số Việt:* **Chuẩn xác từng phút.** Hệ thống tự chuyển đổi Can Chi, an hơn 100 sao chính xác tuyệt đối theo thuật toán thiên văn.
   - *AI thông thường (ChatGPT...):* Thường xuyên an nhầm vị trí sao hoặc nhầm giờ do thiếu thuật toán chuyên biệt.
   - *Thầy Tử Vi:* Tùy thuộc vào trường phái và kinh nghiệm tính nhẩm, ghi chép tay của từng thầy.
2. **Căn cứ luận giải:**
   - *Lá Số Việt:* **Rõ ràng, đối chứng được.** Nêu rõ căn cứ trên cung nào, sao nào, vì sao đưa ra nhận định đó.
   - *AI thông thường:* Hay nói nước đôi, dùng từ chung chung gán cho ai cũng đúng.
   - *Thầy Tử Vi:* Tùy duyên; có người giải thích cặn kẽ, có người chỉ buông lời phán ngắn gọn.
3. **Thời gian & Không gian:**
   - *Lá Số Việt:* **Bất kỳ lúc nào.** Chỉ cần 30 giây trên điện thoại, tự đọc và lưu lại xem lại cả đời.
   - *AI thông thường:* Có ngay, nhưng phải tốn thời gian nghĩ câu lệnh gợi ý (prompt) nhiều lần.
   - *Thầy Tử Vi:* Cần hẹn trước, di chuyển, phụ thuộc vào lịch rảnh của thầy.
4. **Sự riêng tư & Khách quan:**
   - *Lá Số Việt:* **Hoàn toàn kín đáo.** Không dò hỏi đời tư cá nhân, không phán xét hoàn cảnh.
   - *AI thông thường:* Phụ thuộc vào chính sách lưu trữ lịch sử chat của nền tảng AI.
   - *Thầy Tử Vi:* Có thể cảm thấy ngại ngùng khi chia sẻ những chuyện nhạy cảm ngoài đời.
5. **Tinh thần hướng dẫn:**
   - *Lá Số Việt:* **Văn minh, thiết thực.** Chỉ gợi mở cách phòng bị; tuyệt đối không hù dọa để bán đồ phong thủy hay cúng bái.
   - *AI thông thường:* Không bán đồ, nhưng câu trả lời thường vô thưởng vô phạt, thiếu tính hành động.
   - *Thầy Tử Vi:* Đôi khi dễ gặp tình trạng bị dọa vận hạn xấu để gợi ý làm lễ giải hạn đắt đỏ.
6. **Chi phí:**
   - *Lá Số Việt:* **Minh bạch.** Xem miễn phí nội dung nền tảng; mở sâu chi tiết từ vài chục nghìn đồng.
   - *AI thông thường:* Miễn phí hoặc tốn phí gói tháng chung của công cụ AI.
   - *Thầy Tử Vi:* Thường từ vài trăm nghìn đến vài triệu đồng cho một buổi nói chuyện.

---

### SECTION 6: VÌ SAO CHÚNG TÔI TỰ TIN VỀ MỖI LÁ SỐ? (USP CÓ CĂN CỨ)

- **Headline:** Những giá trị có thể kiểm chứng ngay trên màn hình
- **Subheadline:** Chúng tôi không dùng những lời hứa hẹn mơ hồ. Sự tin cậy của Lá Số Việt đến từ 3 nguyên tắc bất di bất dịch:

1. **Lịch pháp chính xác đến từng khắc**
   - Thuật toán quy đổi Dương lịch – Âm lịch và hệ thống Can Chi được đối soát chuẩn xác, xác định đúng tiết khí và khung giờ địa phương, không ước lượng cảm tính.
2. **Luận giải có xuất xứ, không phán vu vơ**
   - Từng nhận định về tính cách, đường công danh hay thời vận đều được neo chặt vào vị trí sao trên lá số. Bạn luôn biết câu nói đó đến từ đâu.
3. **Tuyệt đối không thương mại hóa nỗi sợ**
   - Nhắc đến vận hạn là để bạn chủ động phòng bị, quản trị rủi ro và giữ gìn sức khỏe. Chúng tôi không bao giờ bán bùa chú, đồ phong thủy hay gạ gẫm làm lễ giải hạn.

---

### SECTION 7: BẬC THANG GIÁ TRỊ & MINH BẠCH CHI PHÍ

- **Headline:** Xem trước miễn phí. Chỉ chi trả khi bạn muốn đi sâu.
- **Subheadline:** Chúng tôi tin rằng bạn cần thấy giá trị thật trước khi đưa ra bất kỳ quyết định nào.

#### Ba bước trải nghiệm:
1. **Bước 1: Trải nghiệm miễn phí (Không cần tài khoản)**
   - Xem trọn vẹn đồ hình lá số 12 cung an sao chuẩn xác.
   - Nhận ngay **2 nhận định cốt lõi có căn cứ**: 1 nhận định về nét tính cách bản mệnh và 1 nhận định theo chủ đề bạn muốn xem.
   - Tra cứu ý nghĩa cơ bản của từng chính tinh khi chạm vào các cung.
2. **Bước 2: Tạo tài khoản nhanh (1 chạm)**
   - Lưu trữ lá số vĩnh viễn để xem lại bất cứ khi nào.
   - Mở thêm bản tóm lược tổng quan và các lưu ý trong năm hiện tại.
3. **Bước 3: Mở khóa luận giải chuyên sâu (Bằng Lá)**
   - Đọc chi tiết từng đại vận 10 năm, diễn biến tiểu hạn từng năm, phối chiếu tương tác giữa các cung và lời khuyên chuẩn bị thiết thực.
   - Dùng **Lá** để mở đúng phần bạn muốn đọc, không ép mua cả gói nếu bạn chỉ quan tâm một khía cạnh.

#### Các gói Lá (KHÔNG hiển thị trên trang chủ — FD-069/FD-101; dùng ở trang chọn luận giải và trang thương mại):
- **Gói Nhập Môn:** `300 Lá` — `29.000 đ`
- **Gói Khởi Đọc:** `1.100 Lá` (1.000 + 100 tặng) — `99.000 đ`
- **Gói Khám Phá:** `3.000 Lá` (2.500 + 500 tặng) — `249.000 đ`
- **Gói Tàng Thư:** `8.000 Lá` (6.000 + 2.000 tặng) — `599.000 đ`

*(Số liệu theo FD-066, ghi nhận tại FD-101.)*

*(Quét mã chuyển khoản VietQR tự động trong vài giây. Không trừ phí duy trì).*

---

### SECTION 8: CÂU HỎI THƯỜNG GẶP (FAQ)

- **Headline:** Những điều bạn có thể đang thắc mắc

1. **Tôi không nhớ chính xác giờ sinh thì có lập lá số được không?**
   - *Trả lời:* Bạn vẫn có thể nhập ngày tháng năm sinh để lưu hồ sơ. Tuy nhiên, trong môn Tử Vi, giờ sinh là dữ liệu quyết định vị trí của cung Mệnh và cách sắp xếp 12 cung. Nếu thiếu khung giờ, hệ thống sẽ chưa thể tính toán lá số Tử Vi cá nhân hóa cho bạn để tránh đưa ra những nhận định sai lệch. Bạn có thể hỏi lại người thân để biết khoảng giờ (ví dụ khoảng từ 7h đến 9h sáng) trước khi lập.
2. **Xem miễn phí thì tôi đọc được những gì?**
   - *Trả lời:* Bạn xem được đầy đủ lá số 12 cung với toàn bộ các sao được an chuẩn xác, cùng 2 nhận định trọng tâm hữu ích (một về bản thân và một theo chủ đề bạn chọn) mà không cần đăng nhập hay trả bất kỳ khoản phí nào.
3. **"Lá" trong hệ thống dùng để làm gì và mua như thế nào?**
   - *Trả lời:* Lá là đơn vị dùng để mở các phần luận giải chuyên sâu (như phân tích đại vận, dự báo chi tiết năm hạn, hoặc phối chiếu nhiều cung). Bạn có thể mua các gói Lá qua chuyển khoản quét mã VietQR tự động trong vài giây. Mỗi gói Lá đều ghi rõ số tiền VNĐ tương ứng, không có tỷ giá ảo.
4. **Lá Số Việt có bán vật phẩm phong thủy hay cúng giải hạn không?**
   - *Trả lời:* **Tuyệt đối không.** Chúng tôi giữ lập trường nhất quán: Tử Vi là môn học quan sát quy luật và thời vận để con người tự tu dưỡng, rèn luyện và chuẩn bị kế hoạch cho đời mình. Mọi khó khăn cần giải quyết bằng hành động thực tế và sự tỉnh táo, không nằm ở việc đốt vàng mã hay mua đồ trừ tà.
5. **Thông tin ngày giờ sinh của tôi có được bảo mật không?**
   - *Trả lời:* Dữ liệu của bạn được mã hóa an toàn. Nếu bạn xem ẩn danh mà không tạo tài khoản, hồ sơ sẽ tự động xóa sau 24 giờ. Chúng tôi không bao giờ chia sẻ hay bán thông tin cá nhân của bạn cho bên thứ ba.

---

### SECTION 9: VỀ LÁ SỐ VIỆT & LỜI KẾT (ABOUT & FINAL CTA)

- **Headline:** Một góc nhìn tử tế và sáng rõ cho vận mệnh
- **Nội dung:**
  > Chúng tôi dựng nên **Lá Số Việt** từ một niềm tin giản dị: Tri thức số mệnh truyền thống của phương Đông rất sâu sắc, nhưng từ lâu đã bị phủ lên quá nhiều lớp sương mù bí hiểm và sự hù dọa vụ lợi.
  > 
  > Ở đây, bạn sẽ không thấy những phán quyết giật gân, không có những thuật ngữ cố tình làm cho khó hiểu, và càng không có ai chèo kéo bạn làm lễ giải hạn. Chúng tôi kết hợp độ chuẩn xác của thuật toán hiện đại với sự tinh tế của tri thức cổ truyền, để gửi lại cho bạn điều quý giá nhất: **sự thấu hiểu chính mình một cách điềm tĩnh và có căn cứ.**

- **CTA kết thúc:**
  - **Tiêu đề phụ:** Cuộc đời bạn là một hành trình riêng biệt. Hãy bắt đầu từ việc hiểu rõ tấm bản đồ của chính mình.
  - **Nút bấm CTA:** **Lập lá số của bạn ngay** `(Hành động: Cuộn mượt mà lên Form Hero)`

---

## 3. QUY CHUẨN GIAO DIỆN MOBILE RÚT GỌN

- **Hero:** Dropdown giờ sinh dùng picker native của smartphone; nút CTA cố định dễ bấm.
- **Section 2 (Băn khoăn):** Cô đọng thành 1 câu: *“Lá số không phán bạn giàu nghèo trong chớp mắt. Nó là tấm bản đồ giúp bạn hiểu điểm mạnh, tránh va vấp và chọn đúng thời điểm để hành động.”*
- **Section 3 (Lá số mẫu):** Hiển thị 4 cung tiêu biểu (Mệnh, Quan, Tài, Phối) dạng thẻ trượt ngang (swipe cards).
- **Section 4 (Nhu cầu & Bộ môn):** 4 thẻ nhu cầu dạng nút bấm to; danh sách 5 bộ môn xếp dọc với nhãn rõ: `Tử Vi (Sẵn sàng)` và `Bát Tự / Chiêm Tinh / Kinh Dịch (Tìm hiểu)`.
- **Section 5 (So sánh):** 3 thẻ dọc độc lập làm nổi bật 3 điểm: Chuẩn an sao, Căn cứ luận giải, Không bán đồ phong thủy.
- **Section 7 (Giá trị):** Chỉ 3 nấc (miễn phí → lưu lá số → đọc sâu bằng Lá), không hiện bảng giá (FD-069).

---

## 4. BẢNG ÁNH XẠ TỪ KHÓA, NHU CẦU & ROUTES ĐIỀU HƯỚNG

| Nhu cầu người dùng | Từ khóa Google Planner | Section trên Homepage | Call-to-Action (CTA) | Đường dẫn (Route) | Trạng thái kỹ thuật |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lập lá số Tử Vi** | `lá số tử vi`, `lập lá số tử vi` | Section 1 & Section 9 | **Lập lá số miễn phí** / **Lập lá số của bạn ngay** | `/tu-vi` | `live_indexable` |
| **Công việc & tài chính** | `tử vi trọn đời`, `xem vận hạn` | Section 4 (Nhu cầu) | **Xem vận hạn công việc** | `/tu-vi` *(hoặc cuộn Hero)* | `live_indexable` |
| **Tình duyên & hôn nhân** | `bói tình yêu`, `tình duyên` | Section 4 (Nhu cầu) | **Xem chuyện tình cảm** | `/tu-vi` *(hoặc cuộn Hero)* | `live_indexable` |
| **Tìm hiểu Bát Tự** | `bát tự`, `tứ trụ` | Section 4 (Bộ môn) | **Tìm hiểu Bát Tự** | `/bat-tu` | `live_indexable` |
| **Chiêm Tinh Tây phương** | `bản đồ sao`, `chiêm tinh` | Section 4 (Bộ môn) | **Tìm hiểu Chiêm Tinh** | `/chiem-tinh` | `live_indexable` |
| **Hỏi việc Kinh Dịch** | `gieo quẻ kinh dịch`, `kinh dịch` | Section 4 (Bộ môn) | **Tìm hiểu Kinh Dịch** | `/kinh-dich` | `live_indexable` |
| **Thần Số Học** | `thần số học` | Section 4 (Bộ môn) | **Tìm hiểu Thần Số Học** | `/than-so-hoc` | `live_indexable` |
| **Xem lá số mẫu** | `mẫu lá số tử vi` | Section 3 (Lá số mẫu) | **Xem thử một lá số mẫu hoàn chỉnh** | `/bao-cao-mau/tu-vi` | `live_indexable` |

---

## 5. QUY CHUẨN HÌNH ẢNH & CHUYỂN ĐỘNG (CONTENT + ART PAIRING)

| Section | Art Visual Đề Xuất | Hành Động Người Dùng | Motion & Chuyển Động |
| :--- | :--- | :--- | :--- |
| **1. Hero** | Nền gấm giấy ngà (Paper texture), khung wizard viền son trầm. | Điền form; chọn giờ sinh hoặc tick "Không nhớ giờ sinh". | 120ms tab chuyển lịch; nút CTA ánh kim nhẹ khi hover. |
| **2. Băn khoăn** | Typography thoáng đãng, trích dẫn phong cách cổ điển. | Cuộn trang đọc tự nhiên. | Fade-in 180ms nhẹ nhàng khi vào tầm mắt. |
| **3. Lá số mẫu** | Lưới 12 cung bán cổ điển; viền vàng son các cung trọng yếu. | Chạm vào từng cung để xem tooltip giải nghĩa. | Cung được chạm nâng sáng nhẹ (scale 1.02, 120ms). |
| **4. Nhu cầu & Bộ môn** | 4 thẻ nhu cầu bo góc; icon Lucide nét vẽ mảnh 1.75px. | Bấm thẻ nhu cầu hoặc bấm "Tìm hiểu" các bộ môn. | Hover card nhấc lên 2px; badge trạng thái hiển thị tinh tế. |
| **5. So sánh** | Desktop: Bảng 4 cột; Mobile: 3 thẻ dọc độc lập. | Chạm xem chi tiết từng tiêu chí trên mobile. | Accordion mở mượt mà 180ms. |
| **6. USP có căn cứ** | 3 biểu tượng: Đồng hồ thiên văn, Thước đo ngọc, Cán cân. | Đọc lướt 3 cột. | Staggered fade-in (100ms). |
| **7. Giá trị** | Đường 3 nấc; không có thẻ gói Lá (FD-069). | Đọc tiến trình từ xem miễn phí tới đọc sâu. | Không có |
| **8. FAQ** | Accordion phẳng tối giản. | Chạm để mở/đóng câu trả lời. | Mở 180ms, tương phản văn bản đạt chuẩn WCAG AA (>4.5:1). |
| **9. About & Final CTA** | Họa tiết triện son đỏ "Hiểu mình có căn cứ". | Bấm nút "Lập lá số của bạn ngay". | Smooth scroll cuộn mượt mà lên Form Hero ở đầu trang. |

---

## 6. HƯỚNG DẪN TRIỂN KHAI KỸ THUẬT CHO AGENT TIẾP THEO

1. **Cấu trúc source code:**
   - Triển khai UI tại `apps/web/src/features/homepage/`.
   - Cập nhật i18n đồng bộ tại `apps/web/messages/vi/` và `apps/web/messages/en/`.
   - Chạy lệnh kiểm tra: `pnpm i18n:check && pnpm lint && pnpm typecheck`.
2. **Xử lý form giờ sinh:**
   - Không đặt bất kỳ cảnh báo đỏ/vàng nào trên giao diện trang chủ về giờ sinh.
   - Khi chọn "Tôi không nhớ chính xác giờ sinh", disable dropdown giờ sinh. Khi submit form, chuyển tiếp sang trang kết quả và hiển thị thông báo hướng dẫn bổ sung giờ sinh sau.
3. **Tiêu chuẩn kiểm thử:**
   - Kiểm tra hiển thị responsive không vỡ layout ở các breakpoint: 320px, 375px, 768px, 1024px, 1440px.
   - Vùng bấm tối thiểu trên mobile là 44px x 44px.
