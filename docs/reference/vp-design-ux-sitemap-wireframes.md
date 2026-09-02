# Lá Số Việt — IA, navigation, journeys & low-fi wireframes

**Góc nhìn:** VP Design / Product UX quốc tế  
**Nguồn quyết định:** Brand & Experience Guideline v1.0  
**Nguyên tắc dẫn đường:** *Thư viện tri thức Việt đương đại — với một bàn đọc riêng tư dành cho từng người.*

## 1. Các quyết định cấp hệ thống

1. **Tách hai không gian sản phẩm.** “Thư viện công khai” gồm landing, phương pháp, bài viết và báo cáo mẫu; có thể index và chia sẻ. “Bàn đọc riêng tư” gồm dữ liệu sinh, lá số cá nhân, checkout và báo cáo; private, URL không tuần tự và `noindex`.
2. **Một nhiệm vụ chính trên mỗi trang.** Homepage dẫn vào “Lập lá số miễn phí”; method landing giải thích đủ để bắt đầu; form chỉ thu dữ liệu; result giao small win; topic page bán chiều sâu; reader phục vụ đọc và đối chiếu.
3. **Giá trị trước tài khoản.** Khách có thể lập và xem kết quả miễn phí ở chế độ tạm thời. Tài khoản chỉ được đề nghị khi người dùng muốn lưu, mua hoặc đồng bộ.
4. **Nội dung trước trang trí.** Giao diện giống một ấn phẩm tri thức cao cấp, không mô phỏng tiệm bói, không dùng “vũ trụ tím”, animation thần bí hay dashboard dày đặc.
5. **Evidence ở đúng điểm nghi ngờ.** Mỗi luận điểm chính có nút “Vì sao có nhận định này?”; không bắt người dùng rời màn hình để đọc methodology chung.
6. **Uncertainty là một phần của UI.** Không rõ giờ sinh, địa danh mơ hồ, timezone và giới hạn phương pháp phải có trạng thái hiển thị, không bị xử lý âm thầm.
7. **Conversion không được thắng trust.** Không blur giả, countdown, “cảnh báo xấu”, giá mồi, auto-renew ngầm, pre-check marketing hoặc chặn kết quả bằng đăng nhập.

## 2. Sitemap ưu tiên người dùng

### 2.1 Public discovery — indexable

| Cấp | Route gợi ý | Vai trò người dùng | Hành động chính | Index |
|---|---|---|---|---|
| 0 | `/` | Hiểu Lá Số Việt là gì và bắt đầu nhanh | Lập lá số miễn phí | Có |
| 1 | `/lap-la-so/` | Chọn hệ quy chiếu đang khả dụng | Chọn phương pháp | Có |
| 2 | `/lap-la-so/tu-vi/` | Landing đúng intent “lập lá số Tử Vi” | Bắt đầu nhập dữ liệu | Có |
| 2 | `/lap-la-so/{method}/` | Landing method tương lai, chỉ publish khi engine thật sự sẵn sàng | Bắt đầu | Có khi live; không index trang “sắp ra mắt” mỏng |
| 1 | `/luan-giai/` | Chọn chủ đề phân tích sâu | Xem sản phẩm luận giải | Có |
| 2 | `/luan-giai/ban-menh/` | Hiểu deliverable và độ sâu | Xem mẫu / chọn lá số | Có |
| 2 | `/luan-giai/tinh-duyen/` | Như trên, theo intent quan hệ | Xem mẫu / chọn lá số | Có |
| 2 | `/luan-giai/cong-viec-tai-loc/` | Như trên, theo intent nghề nghiệp | Xem mẫu / chọn lá số | Có |
| 2 | `/luan-giai/van-trinh-{yyyy}/` | Intent theo năm | Xem mẫu / chọn lá số | Có; nội dung phải duy trì thật |
| 3 | `/bao-cao-mau/{topic}/` | Xem chính xác chất lượng trước mua | Dùng lá số của tôi | Có, dữ liệu hoàn toàn giả lập |
| 1 | `/phuong-phap/` | Hiểu cách hệ thống tính và luận giải | Xem phương pháp | Có |
| 2 | `/phuong-phap/tu-vi/` | Methodology, rule set, giới hạn, cập nhật | Lập lá số | Có |
| 1 | `/thu-vien/` | Tìm hiểu theo câu hỏi/chủ đề | Đọc theo topic | Có |
| 2 | `/thu-vien/tu-vi/` | Pillar nội dung Tử Vi | Chọn cụm bài | Có |
| 3 | `/thu-vien/tu-vi/{slug}/` | Giải quyết một search intent cụ thể | Đọc / đối chiếu / lập lá số | Có |
| 2 | `/thuat-ngu/` và `/thuat-ngu/{slug}/` | Tra cứu thuật ngữ tại điểm cần | Hiểu khái niệm | Có nếu nội dung đủ sâu |
| 1 | `/ve-la-so-viet/` | Hiểu brand, đội ngũ và trách nhiệm | Xem cách hoạt động | Có |
| 1 | `/minh-bach-ai/` | Hiểu engine, rule, AI và review khác nhau thế nào | Xem methodology | Có |
| 1 | `/bao-mat-va-quyen-rieng-tu/` | Hiểu dữ liệu được dùng/lưu/xóa ra sao | Quản lý dữ liệu | Có |
| 1 | `/tro-giup/`, `/cau-hoi-thuong-gap/`, `/lien-he/` | Gỡ vướng | Tìm câu trả lời / hỗ trợ | Có theo chất lượng |

**Chống cannibalization:** `/lap-la-so/tu-vi/` phục vụ intent công cụ; `/phuong-phap/tu-vi/` phục vụ intent “cách tính/phương pháp”; `/thu-vien/tu-vi/` là pillar học; `/luan-giai/{topic}/` phục vụ intent thương mại. H1, title, nội dung và CTA phải giữ đúng vai trò này.

### 2.2 Private product — noindex

| Route gợi ý | Vai trò | Quy tắc |
|---|---|---|
| `/tao-la-so/tu-vi/` | Wizard nhập dữ liệu | Có thể guest; không index |
| `/la-so/{opaque_id}/` | Lá số và kết quả miễn phí | Private mặc định; `noindex`; ID không đoán được |
| `/la-so/{opaque_id}/chon-luan-giai/` | Chọn báo cáo phù hợp | Không dùng fear framing |
| `/thanh-toan/{order_id}/` | Checkout và trạng thái thanh toán | Không index; chống submit lặp |
| `/bao-cao/{opaque_id}/` | Reader báo cáo trả phí | Private; `noindex`; revoke link được |
| `/tai-khoan/` | Tổng quan | Không index |
| `/tai-khoan/ho-so-sinh/` | Quản lý birth profiles | Sửa, tải xuống, xóa |
| `/tai-khoan/bao-cao/` | Báo cáo đã mua | Không tạo vòng lặp xem bói |
| `/tai-khoan/don-hang/` | Hóa đơn, thanh toán, hỗ trợ | Giá và trạng thái rõ |
| `/tai-khoan/quyen-rieng-tu/` | Consent center | Tách consent theo mục đích |

## 3. Navigation

### 3.1 Public desktop header

`Logo | Lập lá số ▾ | Luận giải ▾ | Thư viện | Cách chúng tôi luận giải | [Lập lá số miễn phí] | Tài khoản`

- Header cao 72px, sticky sau khi người dùng cuộn qua hero; nền Paper 50 với border mảnh.
- Dropdown là “mega menu nhỏ”: tối đa 2 cột, tiêu đề phương pháp/chủ đề, trạng thái live rõ ràng. Không liệt kê sản phẩm tương lai như đang dùng được.
- Chỉ một CTA Cinnabar trong viewport. “Tài khoản” là tertiary action.
- Search toàn site đặt trong Thư viện; chỉ đưa lên header khi kho nội dung đủ lớn và log cho thấy nhu cầu.

### 3.2 Public mobile header

`Logo | [Lập miễn phí] | Menu`

- Menu full-height với các nhóm đúng thứ tự desktop; không carousel ngang cho navigation cốt lõi.
- Sticky CTA đáy chỉ xuất hiện sau khi hero rời viewport và phải tự ẩn ở form, checkout, khi bàn phím mở hoặc khi CTA nội tuyến đang hiện.

### 3.3 Private product navigation

- Desktop: logo + tên không gian hiện tại; bên phải là “Trợ giúp”, trạng thái lưu, avatar. Với reader, TOC nằm ở rail trái chứ không nhồi vào global header.
- Mobile authenticated: bottom navigation tối đa 4 mục **Lá số – Báo cáo – Thư viện – Tài khoản**. Trong wizard/checkout/reader, thay bottom nav bằng local navigation để không phân tâm.
- Breadcrumb dùng ở landing/article; không dùng breadcrumb dài trong flow riêng tư.

## 4. User journeys chuẩn

### Journey A — Organic search → giá trị miễn phí → mua chiều sâu

1. Vào method landing hoặc article đúng câu hỏi.
2. Hiểu “nhận được gì”, xem chart/report mẫu và methodology ngắn.
3. Bắt đầu wizard không cần tài khoản.
4. Xác nhận dữ liệu và giới hạn, nhất là giờ sinh.
5. Nhận chart + ba insight + một evidence drawer.
6. Chọn topic vì nội dung phù hợp, không vì bị dọa.
7. Xem mục lục, báo cáo mẫu, giá cuối và thời gian giao.
8. Thanh toán; trạng thái pending/success/failed có chỉ dẫn.
9. Đọc report, đối chiếu căn cứ, tải xuống hoặc lưu vào tài khoản.

### Journey B — Người đọc thư viện chưa sẵn sàng nhập dữ liệu

1. Article giải quyết đầy đủ intent, không biến thành advertorial.
2. Inline glossary/evidence giúp hiểu thuật ngữ.
3. CTA contextual ở cuối phần liên quan: “Xem vị trí này trên lá số của bạn”.
4. Có thể tiếp tục đọc related article; không bật modal ép lập lá số.

### Journey C — Không rõ giờ sinh

1. Chọn “Tôi không rõ giờ sinh”.
2. UI giải thích phần nào vẫn tính được, phần nào giảm độ chắc chắn.
3. Cho tiếp tục với “Kết quả giới hạn”; badge này đi xuyên suốt result/report.
4. Khi bổ sung giờ sau, cho tạo phiên bản mới và nêu nội dung thay đổi; không âm thầm ghi đè báo cáo đã mua.

### Journey D — Privacy-first guest

1. Chọn “Xử lý tạm thời, không lưu vào tài khoản”.
2. Xem result bằng opaque link có thời hạn được nói rõ.
3. Trước khi hết hạn, đề nghị lưu là lựa chọn; không chặn download hợp lệ.
4. Có “Xóa ngay dữ liệu tạm thời” và xác nhận phạm vi xóa.

### Journey E — Returning user

1. Dashboard mở bằng birth profiles và report hiện có, không có “vận xấu hôm nay”.
2. Tiếp tục đọc đúng vị trí, xem bản engine/report version.
3. Quản lý consent, export và delete không cần liên hệ support nếu không bắt buộc pháp lý.

## 5. Low-fi wireframes theo màn hình

Quy ước desktop: container tối đa khoảng 1200px, lưới 12 cột, content prose 680–760px. Mobile: một cột, padding 16–20px, reflow tốt ở 320px. Các vùng dưới đây được ghi theo thứ tự thị giác/DOM.

### 5.1 Homepage

| Thứ tự | Desktop | Mobile |
|---|---|---|
| 1 | Header toàn cục | Logo + CTA ngắn + menu |
| 2 | Hero 7/5 cột: eyebrow “Tử Vi”, H1 canonical, supporting line, subhead, CTA primary + link “Xem báo cáo mẫu”; cạnh phải là preview chart có chú giải | Copy trước, CTA full-width, trust microcopy; preview chart bên dưới, không crop chữ |
| 3 | Trust strip 4 mục: miễn phí trước; có căn cứ; riêng tư mặc định; không auto-renew | Danh sách 2×2, icon + text; không auto-scroll |
| 4 | “Bạn nhận được gì?”: chart, 3 insight, evidence | Stack 3 card có số thứ tự |
| 5 | “Cách hoạt động” 3 bước | Vertical stepper |
| 6 | Sample insight 7/5: narrative + evidence drawer mở mẫu | Narrative trước; evidence accordion ngay dưới claim |
| 7 | Report topics: 3–4 card với deliverable/giá, không “VIP” | Stack; ưu tiên topic theo nhu cầu, không carousel bắt buộc |
| 8 | “Một người, nhiều hệ quy chiếu”: Tử Vi live; các hệ tương lai chỉ mô tả trong roadmap trung thực | Stack, label “Đang khả dụng”/“Nghiên cứu” rõ |
| 9 | Methodology + AI disclosure + privacy | Ba khối ngắn, link đọc sâu |
| 10 | Thư viện mới/đáng đọc, FAQ, footer | Article stack, accordion FAQ, footer đầy đủ |

**Hierarchy:** H1 → giá trị miễn phí → bằng chứng sản phẩm → chiều sâu trả phí → methodology/trust. Hero không đặt AI, giá hay danh sách keyword.

### 5.2 Method landing — `/lap-la-so/tu-vi/`

| Thứ tự | Desktop | Mobile |
|---|---|---|
| 1 | Breadcrumb + H1 “Lập lá số Tử Vi…” + subhead + CTA; sample chart ở cột phải | Copy, CTA, sample chart |
| 2 | Anchor nav: Kết quả nhận được / Cách tính / Dữ liệu cần / Giới hạn / FAQ | Select “Trong trang này” hoặc sticky compact TOC |
| 3 | Free deliverable vs paid depth, tách rõ | Hai section nối tiếp; không bảng ngang khó đọc |
| 4 | Interactive sample: chọn một cung để đọc insight + evidence | Chart zoom/tap; có narrative list thay thế hoàn chỉnh |
| 5 | “Cần chuẩn bị gì?” ngày, giờ, nơi; giải thích giờ không rõ | Checklist + link giải thích |
| 6 | Methodology/rule set/engine version/AI role | Accordion, mặc định mở phần tóm tắt |
| 7 | Giới hạn & safety | Callout trung tính, không chữ nhỏ |
| 8 | Related cluster + FAQ + CTA cuối | Stack |

**Rationale:** Landing trả lời đủ intent trước khi xin dữ liệu; CTA lặp lại sau mỗi “ngưỡng quyết định”, không sticky liên tục từ đầu đến cuối.

### 5.3 Chart form

**Cấu trúc 3 bước:** (1) Người được lập → (2) Ngày/giờ/nơi sinh → (3) Kiểm tra & quyền riêng tư.

| Vùng | Desktop | Mobile |
|---|---|---|
| Header | Logo; “Thoát và xóa dữ liệu tạm”; Trợ giúp | Back; Step 1/3; Trợ giúp |
| Progress | Stepper ngang có label, không chỉ số | Text “Bước 1/3” + progress bar |
| Main | Form 7 cột; rail giải thích 4 cột | Một cột; giải thích inline sau field |
| Actions | Back tertiary; Continue primary, thẳng hàng cuối form | Sticky action bar khi bàn phím đóng; Back + Continue |
| Review | Summary card có nút Sửa từng nhóm | Summary stack; CTA “Tạo lá số” |

**Field decisions:**

- “Tên hiển thị” là optional; có thể dùng “Tôi”.
- Ngày dương là mặc định; lịch âm chỉ xuất hiện nếu engine conversion đã kiểm thử, luôn cho xem ngày đã quy đổi.
- Giờ sinh gồm exact time và lựa chọn riêng “Tôi không rõ giờ sinh”; không ép chọn 12 khung giờ nếu không có căn cứ.
- Nơi sinh autosuggest ưu tiên địa danh Việt Nam, hỗ trợ tên lịch sử/tên thường gọi và cho xác nhận địa điểm + timezone.
- Chỉ hỏi giới tính/thuộc tính khác nếu rule set thực sự sử dụng; cạnh label có “Vì sao cần?”.
- “Lập cho người khác” hiện nhắc xin phép và chế độ không lưu.
- Save-to-account mặc định off; marketing opt-in riêng, mặc định off; không xin số điện thoại.

**States bắt buộc:** empty, focused, valid, error cụ thể, địa danh trùng tên, giờ không rõ, lunar conversion review, loading có tiến độ thực, network fail giữ dữ liệu cục bộ an toàn, engine fail có retry/support, duplicate submit idempotent.

### 5.4 Free result

| Thứ tự | Desktop | Mobile |
|---|---|---|
| 1 | Header riêng tư + trạng thái lưu | Compact private header |
| 2 | Title + birth summary + “Sửa dữ liệu”; badge “Giới hạn do chưa rõ giờ” nếu có | Summary card trước, sửa rõ ràng |
| 3 | Rail trái TOC 2 cột; chart 6 cột; “Điểm nổi bật” 4 cột | Segmented control **Tóm tắt / Lá số**; narrative là mặc định, chart pan/zoom có reset |
| 4 | Ba insight theo cấu trúc claim → điều kiện → quan sát; mỗi insight có “Vì sao?” | Stack; evidence mở inline, không modal full-screen nếu không cần |
| 5 | Một thế mạnh + một điểm căng thẳng, cân bằng | Hai card không mã màu tốt/xấu |
| 6 | Feedback Đúng / Một phần / Không đúng + ghi chú optional | Touch target lớn, nói rõ feedback dùng để làm gì |
| 7 | Topic deep-dive; mỗi card có contents, sample, giá cuối | Stack; primary CTA theo topic đã chọn |
| 8 | Method, engine version, AI disclosure, privacy actions | Accordion + xóa/lưu rõ ràng |

**Evidence drawer:** tên yếu tố dễ hiểu; vị trí trên chart; rule ngắn; các yếu tố hỗ trợ/xung đột; confidence/giới hạn; ảnh hưởng của giờ sinh; “Điều bạn có thể quan sát”. Không biến drawer thành dump thuật ngữ.

### 5.5 Paid topic landing & checkout

#### Topic landing

| Thứ tự | Desktop | Mobile |
|---|---|---|
| 1 | H1 đúng topic; một đoạn “phù hợp khi”; chọn birth profile | H1 + profile selector |
| 2 | Deliverable card: 5–7 luận điểm, mục lục, độ dài, thời gian tạo, format | Stack |
| 3 | Preview 10–15% nội dung thật; phần tiếp theo liệt kê chứ không blur | Sample readable; không faux lock |
| 4 | “Có gì / Không có gì”: giới hạn, không dự báo chắc chắn | Hai danh sách rõ |
| 5 | Giá cuối + mua một lần + support/regeneration | Order card sticky chỉ trên desktop khi không che nội dung |
| 6 | FAQ/refund/regeneration + CTA | Accordion + CTA |

#### Checkout

| Vùng | Desktop | Mobile |
|---|---|---|
| Main | Payment 7 cột; order summary 4 cột sticky | Order summary trước, payment sau |
| Identity | Email nhận hóa đơn/report; đăng nhập optional | Same; keyboard/email tối ưu |
| Birth data | Summary + “Sửa trước khi mua” | Collapsible nhưng tên/ngày/giờ luôn thấy |
| Payment | VietQR/card/e-wallet chỉ theo provider thật; hướng dẫn nhận diện đúng người nhận/số tiền | QR có nút tải/mở app phù hợp; không bắt pinch zoom |
| Consent | Terms bắt buộc riêng; marketing optional off | Không gộp checkbox |
| CTA | `Thanh toán 79.000 ₫` — label chứa giá cuối | Full-width, không đổi giá sau click |

**Payment states:** creating order, waiting/pending có thời hạn và nút “Tôi đã thanh toán”; success chỉ khi backend xác nhận; failed có lý do và retry an toàn; expired QR tạo mới mà không tạo đơn trùng; paid-but-not-returned có trang tra cứu; report generation tách khỏi payment success và có ETA/support.

### 5.6 Report reader

| Vùng | Desktop | Mobile |
|---|---|---|
| Header | Tên report, trạng thái lưu; Download; Share | Back, title rút gọn, overflow menu |
| Rail trái 3 cột | TOC sticky, progress theo section, search trong report | Bottom sheet “Mục lục”; không chiếm chiều ngang |
| Reading 6 cột | Prose 680–760px, Source Serif cho title/quote, Be Vietnam Pro cho UI/body nếu readability test xác nhận | Một cột, 18px body/line-height rộng; không justified text |
| Evidence rail 3 cột | Evidence contextual khi chọn claim | Evidence mở inline/bottom sheet và focus được trả lại đúng claim |
| Section end | “Điều có thể quan sát”, câu hỏi phản tư, tối đa 3 action liên quan | Stack; không gamification/check streak |
| Footer | Method/version/created date/limitations; report feedback | Same |

**Reader controls:** font size 3 mức; width 2 mức desktop; “Ẩn thuật ngữ/Xem thuật ngữ”; print/PDF accessible; resume location. Share mặc định tạo summary card đã ẩn tên, ngày, giờ, nơi sinh; người dùng preview trước khi tạo link và có thể revoke.

### 5.7 Library hub & article

#### Hub

- H1 và search theo câu hỏi tự nhiên.
- Topic taxonomy theo **nhu cầu** trước (Hiểu bản thân, Quan hệ, Công việc, Vận trình), filter theo **phương pháp** sau.
- Pillar card lớn + danh sách “Bắt đầu từ đây”; không infinite scroll ở MVP.
- Glossary và methodology là utility links, không lẫn với bài editorial.

#### Article

| Thứ tự | Desktop | Mobile |
|---|---|---|
| 1 | Breadcrumb, H1, dek, author/reviewer thật, updated date, reading time | Stack, metadata wrap tốt |
| 2 | TOC rail + article body + related utility | Collapsible “Trong bài” trước nội dung |
| 3 | Định nghĩa/claim → nguồn/căn cứ → ví dụ → giới hạn | Same order |
| 4 | Inline glossary và chart figure có caption/alt | Tap glossary không che paragraph |
| 5 | CTA contextual sau đoạn liên quan, không quá 2 CTA trong body | Full-width nhưng tertiary/secondary trước khi có intent mạnh |
| 6 | Sources, methodology, related articles, CTA cuối | Stack; visited link khác biệt |

### 5.8 Account & privacy

| Mục | Nội dung chính | Quyết định UX |
|---|---|---|
| Tổng quan | Birth profiles; reports; order/support status | Không “điểm vận”, streak hay cảnh báo hàng ngày |
| Hồ sơ sinh | Ai, ngày/giờ/nơi, độ đầy đủ, charts liên quan | Sửa tạo version mới; cho chọn report nào cập nhật, không ghi đè |
| Báo cáo | Purchased/processing/ready, created version | Filter đơn giản; resume reading |
| Đơn hàng | Giá, phương thức, status, hóa đơn, support | Tra cứu giao dịch rõ; không làm người dùng chứng minh lại dữ liệu đã có |
| Quyền riêng tư | Purposes + trạng thái consent + last changed | Toggle tách vận hành/marketing/third party/AI training; mục bắt buộc không giả làm toggle |
| Export | Tải dữ liệu máy đọc được + report | Nêu phạm vi và thời gian chuẩn bị |
| Delete | Xóa profile/report/account theo phạm vi | Summary tác động trước; re-auth; receipt sau; không “guilt copy” |

## 6. Component hierarchy và design behavior

- **Typography:** Source Serif 4 cho editorial display/heading chọn lọc; Be Vietnam Pro cho body/UI. Test đầy đủ dấu Việt, chữ hoa và line wrap trên Android. Không dùng nhiều hơn hai family.
- **Color:** Paper làm nền; Ink cho thông tin; Cinnabar chỉ cho accent/primary CTA. Không dùng đỏ để biểu đạt “xấu”; error cần icon + text. Link nội dung luôn underline và có visited state.
- **Grid:** 12 cột desktop, 8 tablet, 4 mobile; spacing theo 8pt với ngoại lệ 4px cho optical alignment. Card border trước shadow; radius vừa phải, không “app pastel”.
- **Chart:** có narrative tương đương cho screen reader; selection dùng outline/weight/icon ngoài màu; zoom, reset và list view trên mobile.
- **Motion:** 150–240ms cho state transition; evidence drawer tối đa khoảng 300ms; tôn trọng `prefers-reduced-motion`; không sao bay, xoay la bàn hoặc parallax.
- **Loading:** skeleton khớp layout; tác vụ tạo report lâu dùng step status thật. Không dùng fake progress tiến đến 99%.
- **Empty state:** giải thích bước tiếp theo, không minh họa hù dọa. Error ở gần nguyên nhân và giữ input hợp lệ.

## 7. Accessibility gate trước release

- WCAG 2.2 AA; text 4.5:1, large/UI/focus 3:1; focus luôn nhìn thấy và không bị sticky bar che.
- Tất cả flow chạy được bằng keyboard; dialog/drawer quản lý focus và trả focus đúng trigger.
- Heading/landmark semantic; label luôn hiện; required state và error được announce; date/time input không lệ thuộc placeholder.
- Zoom 200%; reflow ở 320 CSS px; touch target tối thiểu 44×44; orientation không bị khóa.
- Chart có table/list/narrative alternative; tooltip dùng được bằng focus/tap; màu không là tín hiệu duy nhất.
- Payment QR có text account/amount/reference tương đương; timeout có cảnh báo và gia hạn.
- Nội dung nhạy cảm không auto-read hoặc auto-play; link trợ giúp rõ cho crisis/safety case đã được review.

## 8. Việt Nam localization — không đồng nghĩa với “trang trí Việt”

- Hỗ trợ dấu Việt chuẩn, line-height thoáng, không dùng all-caps cho câu dài; giữ brand “Lá Số Việt” đủ dấu.
- Ngày hiển thị `DD/MM/YYYY` nhưng field có label rõ; thời gian 24 giờ; tiền `79.000 ₫`; timezone hiển thị `GMT+7 (Việt Nam)` cùng tên kỹ thuật khi cần.
- Search nơi sinh hiểu tên thường gọi, tên cũ và thay đổi địa giới; người dùng luôn xác nhận địa điểm được map, không chỉ tên hành chính hiện tại.
- Ngày dương/âm không dùng toggle mơ hồ; label đầy đủ và luôn cho xem kết quả quy đổi trước khi tính.
- Thiết kế mobile-first cho thiết bị tầm trung và mạng không ổn định: tối ưu font, ảnh/chart, giữ form khi mất mạng, không tải video hero.
- Thanh toán dùng phương thức thực sự được provider hỗ trợ; với VietQR, hiển thị người nhận, số tiền, nội dung và trạng thái xác minh, không dùng screenshot QR không có lifecycle.
- Nút chia sẻ dùng native share sheet; chỉ thêm Zalo/Facebook khi integration thật sự hỗ trợ quyền riêng tư. Preview phải ẩn dữ liệu sinh mặc định.
- Giọng “bạn/chúng tôi” trung tính vùng miền; không giả giọng “thầy”, không gọi “con”, không dùng thành ngữ Hán–Việt dày đặc để tạo authority.

## 9. Anti-dark-pattern review gate

Không release nếu có một trong các pattern sau:

- Buộc đăng ký trước khi xem small win miễn phí.
- Che/blur nội dung giả và gọi là “cảnh báo quan trọng”.
- Countdown, “chỉ còn 2 suất”, review/testimonial giả hoặc avatar chuyên gia không có thật.
- Pre-check marketing, huấn luyện AI hoặc share; nút từ chối mờ/nhỏ hơn không hợp lý.
- Giá thiếu tổng tiền, auto-renew không nổi bật, phí xuất hiện ở bước cuối.
- Mặc định lưu dữ liệu sinh, public report hoặc nhúng PII vào analytics/URL.
- Dùng feedback “Không đúng” để nói người dùng chưa hiểu bản thân.
- Tạo vòng lặp “xem lại hôm nay”, streak, notification vận xấu hoặc upsell “hóa giải”.
- Làm khó export/delete/cancel hoặc dùng guilt copy khi xóa.

## 10. Validation trước khi khóa high-fidelity

1. **Tree test:** người dùng tìm được lập lá số, báo cáo mẫu, phương pháp, quyền xóa dữ liệu và hỗ trợ thanh toán.
2. **First-click test:** từ homepage/method/article, click đầu tiên khớp intent.
3. **Moderated usability:** 5–8 người mỗi nhóm nhu cầu; bắt buộc có case không rõ giờ sinh, địa danh tên cũ, người dùng hoài nghi và mobile tầm trung.
4. **Comprehension test:** phân biệt được “có xu hướng” với dự báo chắc chắn; hiểu engine, evidence và AI khác nhau; nói lại được mình mua gì.
5. **Accessibility audit:** keyboard/screen reader/zoom/reflow/payment timeout và chart alternative.
6. **Guardrail analytics:** completion, evidence-open, sample-view, payment success cùng complaint/refund, delete completion, “bị phán xét/bị dọa”, repeat-view bất thường và unknown-time comprehension.

**Definition of done:** Thiết kế chỉ được gọi là “đẳng cấp quốc tế” khi nó vừa đẹp, vừa đọc được, vừa giải thích được, vừa tôn trọng sự bất định và quyền riêng tư—không phải khi có nhiều hiệu ứng hoặc giống một template phương Tây.
