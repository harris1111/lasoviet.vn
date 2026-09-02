---
title: Lá Số Việt — Handoff dựng 9 trang còn lại (cho Claude Design)
version: 1.0
status: active-handoff
date: 2026-09-02
tool: Claude Design (web) — không đọc được git/file local, phải dán text tự chứa
owners: Harris/Product (giao việc), Claude Design (dựng trang), ChatGPT (viết prompt ảnh — xem docs/17)
---

# Handoff — Claude Design dựng 9 trang còn lại

> **Cách dùng file này:** Claude Design không đọc được repo. Mỗi lần dựng một trang, dán
> **PHẦN A (khối hệ thống dùng chung)** + **đúng một khối trang trong PHẦN B**. Đừng dán cả file.

## Chuẩn bị một lần trước khi bắt đầu

1. Mở project "Trang chủ Lá Số Việt" đã hoàn thiện trong Claude Design.
2. Lưu nó thành **Design system** riêng, đặt tên `Lá Số Việt — Sơn Mài` (nút `+` trong bảng chọn
   Design system). Từ đó mọi trang mới chọn đúng DS này → token và component tự kế thừa, brief ngắn
   hơn nhiều và các trang chắc chắn nhất quán.
3. Nếu vì lý do nào đó không lưu được DS: vẫn dán PHẦN A đầy đủ mỗi lần.

---

# PHẦN A — Khối hệ thống dùng chung (dán trước mọi trang)

```
BỐI CẢNH

Lá Số Việt (lasoviet.vn) — nền tảng lập và luận giải lá số Tử Vi tiếng Việt. Công cụ lập lá số miễn
phí dẫn vào báo cáo luận giải trả phí, thanh toán một lần, không subscription. Định vị: "thư viện tri
thức Việt đương đại" — không phải web bói toán, không phải thầy bói AI.

Trang chủ đã dựng xong trong project này và là chuẩn tham chiếu. Việc bây giờ: dựng thêm một trang
mới theo đúng hệ đó. Giữ nguyên 100% token, sprite icon, pattern header/footer/marquee, cách bố cục
section. Không phát minh lại hệ thống.

HỆ TOKEN (đã chốt, không đổi)

Nền:    --lacquer-900 #0F0D0A · --lacquer-800 #15120E · --lacquer-700 #1C1813 · --lacquer-line #3A3227
Vàng:   --gold-400 #F2DCA0 · --gold-500 #C9A44D · --gold-600 #A8842F · --gold-700 #9A7730
        gradient: linear-gradient(103deg,#9A7730 0%,#F2DCA0 34%,#C9A44D 58%,#A8842F 100%)
        Vàng chỉ dùng cho heading lớn, nút chính, nét trang trí. KHÔNG dùng cho body/label.
Son:    --son #CE5B45 · --son-deep #9E3D2C — chỉ dùng cho dấu triện và điểm nhấn cực hiếm
Chữ:    --pearl-50 #F6F1E6 (heading) · --pearl-200 #DCD4C3 (body) · --pearl-400 #A79E8B (phụ)
        · --pearl-600 #6E6656 (muted) — luôn màu đặc, không bao giờ gradient cho đoạn văn

Font:   display "Source Serif 4", Georgia, serif — heading, lead, quote
        ui      "Be Vietnam Pro", system-ui — body, form, nav
        mono    "JetBrains Mono", ui-monospace — eyebrow, giá, nhãn, số liệu

Layout: container 1200px · cột đọc 680–760px · section padding 104–112px desktop
Radius: 4px control · 8px card · 12px panel · 999px chỉ cho tag/filter
Theme:  color-scheme dark, single theme, không làm light mode

Icon:   dùng lại sprite 24 symbol đã có trong trang chủ (i-menu, i-close, i-chevron-down,
        i-chevron-right, i-arrow-right, i-external-link, i-search, i-check, i-shield-lock,
        i-refresh-off, i-calendar-day, i-clock, i-map-pin, i-user, i-help-circle, i-book-open,
        i-scroll, i-compass, i-user-circle, i-download, i-trash, i-pencil, i-share, i-link, i-trien).
        Cần icon mới: vẽ cùng spec — khung 24×24, vùng vẽ 20×20, nét 1.5px, bo tròn đầu nét, riêng
        i-trien giữ góc vuông.

RÀNG BUỘC KHÔNG ĐƯỢC PHÁ

- Copy luôn có điều kiện: "có xu hướng", "có thể biểu hiện". Không bao giờ "sẽ xảy ra", "chắc chắn",
  "định sẵn".
- Không fear-based upsell, không countdown, không khan hiếm giả, không testimonial giả, không
  "chính xác 99%".
- Giá luôn kèm "thanh toán một lần" / "không tự động gia hạn" hiển thị rõ cạnh CTA.
- Mọi kết luận quan trọng có nút "Vì sao có nhận định này?" kèm icon i-trien nằm ngay cạnh claim.
- Câu AI disclosure dùng nguyên văn, không diễn giải lại: "Lá Số Việt dùng công cụ tính toán theo
  phương pháp và AI để tổ chức, đối chiếu và diễn giải bằng tiếng Việt. Mỗi nhận định quan trọng đều
  gắn với dữ liệu lá số được sử dụng."
- Giá trị trước tài khoản: không ép đăng nhập trước khi người dùng thấy kết quả miễn phí.
- Trang chứa dữ liệu sinh phải có noindex trong head, URL không đoán được, share ẩn PII mặc định.
- WCAG 2.2 AA: chữ thường ≥4.5:1, chữ lớn/UI ≥3:1, focus visible rõ, keyboard đi hết được, reflow
  320px, zoom 200%, tôn trọng prefers-reduced-motion, touch target ≥44×44px.
- Lá số không mã hoá chỉ bằng màu — luôn có label/icon/pattern và một view bảng/list tương đương.
- Không dùng chữ Hán–Nôm chưa kiểm chứng nghĩa, kể cả trong hoạ tiết trang trí.

ẢNH

Trang này chưa có ảnh thật. Chỗ nào cần ảnh thì đặt placeholder nền tối đúng tỷ lệ, có nhãn mã ảnh
(ví dụ LS01-D) và một dòng mô tả ngắn ảnh sẽ là gì. Đừng để trang trống chờ ảnh, và đừng tự vẽ ảnh
minh hoạ bằng SVG thay cho ảnh chụp.

Ngoại lệ quan trọng: sơ đồ mang thông tin (lá số 12 cung, sơ đồ giải thích, biểu đồ chu kỳ) thì
PHẢI dựng bằng SVG/HTML trong code, kèm alt và một bảng/list tương đương — không phải ảnh.
```

---

# PHẦN B — Chín khối trang (mỗi lần dán đúng một khối)

Thứ tự dưới đây là thứ tự ưu tiên nên làm.

## B1 — Trang lập lá số (calculator landing) · `/la-so-tu-vi`

```
DỰNG TRANG: Calculator landing, route /la-so-tu-vi

Đây là trang SEO quan trọng nhất của site. Toàn bộ nội dung phải nằm trong HTML hiển thị được ngay,
không giấu trong canvas hoặc chỉ render bằng JS.

Tám khối theo đúng thứ tự:
01. Breadcrumb · H1 đúng intent tìm kiếm ("Lập lá số Tử Vi miễn phí") · subhead · form hoặc CTA ngay
    phần đầu
02. "Kết quả miễn phí bạn nhận được" — liệt kê cụ thể, không hứa chung chung
03. Sample chart thật (lá số mẫu đã điền, KHÔNG phải khung trống) + danh sách narrative tương đương
    bên cạnh để đọc được không cần nhìn hình
04. "Ngày, giờ, nơi sinh dùng để làm gì" — giải thích từng trường, vì sao cần
05. Unknown-time mode — nói rõ nếu không rõ giờ sinh thì vẫn tiếp tục được và phần nào bị ảnh hưởng
06. Cách tính · rule set · phiên bản engine
07. Giới hạn và safety — nội dung tham khảo, không thay tư vấn y tế/pháp lý/tài chính
08. Cluster bài kiến thức liên quan + FAQ + CTA cuối

Indexing: index, follow. Schema: WebApplication + BreadcrumbList.

Ảnh cần placeholder: LS01-D và LS01-M (hero desktop 12:7 / mobile 4:5), LS02 (bối cảnh lá số mẫu,
3:2), LS03 (lịch pháp Can-Chi, 3:2).
```

## B2 — Form lập lá số 3 bước · `/la-so-tu-vi/tao`

```
DỰNG TRANG: Form lập lá số, 3 bước, route /la-so-tu-vi/tao. Trang riêng tư — noindex.

Ba bước:
01. Người được lập — tên hiển thị (không bắt buộc), chọn "cho bản thân" hoặc "cho người khác". Nếu
    lập cho người khác: nhắc xin phép, cho phép xử lý tạm thời không lưu.
02. Ngày, giờ, nơi sinh — dương lịch mặc định, ô "Không rõ giờ sinh" tách riêng, có bước xác nhận
    múi giờ. Ví dụ nhập theo định dạng Việt Nam.
03. Kiểm tra và quyền riêng tư — summary toàn bộ dữ liệu, sửa được theo từng nhóm, chọn chế độ
    "xử lý tạm thời" hay "lưu hồ sơ".

Bố cục theo vùng:
                desktop                              mobile
Header          logo · thoát/xoá tạm · trợ giúp      back · "Bước x/3" · trợ giúp
Progress        stepper có nhãn chữ                  text + progress bar
Form            7 cột + rail giải thích 4 cột        một cột, giải thích inline
Actions         Back (tertiary) + Continue (primary) sticky khi bàn phím đóng
Review          summary card, sửa theo từng section  summary dạng stack

Dựng đủ 11 trạng thái, mỗi trạng thái là một biến thể nhìn thấy được, không chỉ mô tả bằng chữ:
empty · focus · valid · error cụ thể (nêu cách sửa, không nói "dữ liệu không hợp lệ") · địa danh
trùng tên · không rõ giờ sinh · review chuyển đổi âm lịch · loading thật · mất mạng nhưng giữ nguyên
dữ liệu đã nhập · engine lỗi · chống submit trùng.

Ảnh: tối đa 1 placeholder ở rail giải thích bước 02 (mã FM01, 3:2). Các bước khác không ảnh.
```

## B3 — Kết quả miễn phí · `/la-so/{id}`

```
DỰNG TRANG: Kết quả lá số miễn phí, route /la-so/{id}. Riêng tư — noindex, URL không đoán được.

Lá số ở đây là dữ liệu thật, dựng bằng SVG/HTML, không phải ảnh minh hoạ.

Desktop:
- Header riêng tư + trạng thái đã lưu / chưa lưu
- Birth summary + nút "Sửa dữ liệu" + badge độ không chắc chắn (nếu thiếu giờ sinh)
- Rail mục lục 2 cột · lá số 6 cột · "Ba điểm nổi bật" 4 cột
- Mỗi insight theo đúng chuỗi: claim → điều kiện → điều có thể quan sát → nút "Vì sao có nhận định
  này?" (icon i-trien)
- Đúng một thế mạnh và đúng một điểm căng thẳng. Không tô màu tốt/xấu.
- Khối mời xem luận giải sâu chỉ xuất hiện SAU khi đã trao đủ giá trị miễn phí

Mobile:
- Narrative là mặc định, segmented control "Tóm tắt / Lá số"
- Lá số hỗ trợ tap, pan/zoom, reset; luôn có list view tương đương
- Evidence mở inline hoặc bottom sheet, đóng lại trả focus về đúng claim vừa mở

Evidence drawer có đúng 7 mục:
yếu tố dễ hiểu · vị trí trên lá số · quy tắc ngắn · yếu tố hỗ trợ và xung đột · mức tin cậy và giới
hạn · ảnh hưởng của giờ sinh · điều người dùng có thể tự quan sát

Không ảnh không khí trên trang này.
```

## B4 — Trang chủ đề luận giải trả phí · `/luan-giai-tu-vi/tong-quan-ban-menh`

```
DỰNG TRANG: Paid topic landing, route /luan-giai-tu-vi/tong-quan-ban-menh

Bảy khối theo thứ tự:
01. H1 đúng tên chủ đề + đoạn "phù hợp khi bạn đang..."
02. Chọn hồ sơ lá số đã có, hoặc lập lá số mới
03. Deliverable: mục lục thật, 5–7 luận điểm, độ dài, thời gian giao, định dạng
04. Preview 10–15% nội dung THẬT — tuyệt đối không blur giả, không khoá nội dung bằng hiệu ứng mờ
05. "Có gì / Không có gì" — hai cột đối chiếu thẳng thắn
06. Giá cuối bằng VND · thanh toán một lần · chính sách hỗ trợ và tạo lại
07. FAQ + policy + CTA

Indexing: index, follow. Schema: Product + Offer (VND) + BreadcrumbList, dữ liệu phải khớp checkout.

Ảnh placeholder: LG01-D/LG01-M (hero), LG02 (trang mẫu báo cáo mở ra, 3:2), LG03 (dấu triện /
đóng gói ấn phẩm, 1:1).
```

## B5 — Checkout · `/thanh-toan`

```
DỰNG TRANG: Checkout, route /thanh-toan. Riêng tư — noindex. Không ảnh trang trí.

- Trên mobile: order summary xuất hiện TRƯỚC phần thanh toán
- Luôn nhìn thấy: tên báo cáo · hồ sơ lá số áp dụng · giá cuối · dòng "Thanh toán một lần"
- Phương thức: VietQR / thẻ / ví điện tử — chỉ hiển thị đúng những gì provider thật hỗ trợ
- QR hiển thị rõ người nhận và số tiền, có nút tải QR hoặc mở app ngân hàng
- Điều khoản bắt buộc và đồng ý nhận marketing tách riêng, marketing mặc định TẮT
- CTA chứa giá: "Thanh toán 79.000 ₫"

Dựng đủ 7 trạng thái: đang tạo đơn · chờ thanh toán · thành công đã xác nhận · thất bại · QR hết
hạn · đã trả tiền nhưng chưa quay lại được app · đang tạo báo cáo.

Nguyên tắc: không hiển thị "thành công" chỉ vì người dùng quay lại từ app ngân hàng — chỉ xác nhận
khi hệ thống thật sự nhận được xác nhận.
```

## B6 — Trình đọc báo cáo · `/bao-cao/{id}`

```
DỰNG TRANG: Report reader, route /bao-cao/{id}. Riêng tư — noindex.

                desktop                              mobile
Header          tên báo cáo · lưu · tải · chia sẻ     back · title rút gọn · menu
Mục lục         rail trái 3 cột                       bottom sheet
Vùng đọc        680–760px, typography editorial       một cột, body ~18px
Evidence        context rail bên phải                 inline hoặc bottom sheet
Cuối mỗi phần   "điều có thể quan sát" + câu hỏi phản tư   dạng stack
Footer          phương pháp · phiên bản · ngày · giới hạn  giống desktop

Thêm: điều chỉnh cỡ chữ, nhớ vị trí đang đọc, in/PDF accessible được.
Chia sẻ: mặc định ẩn tên, ngày, giờ, nơi sinh. Người dùng xem trước được bản chia sẻ và thu hồi được
link bất cứ lúc nào.

Ảnh placeholder: BC01 (frontispiece/bìa báo cáo, 3:2). Còn lại không ảnh — đây là trang để đọc.
```

## B7 — Hub kiến thức · `/kien-thuc/tu-vi`

```
DỰNG TRANG: Knowledge hub, route /kien-thuc/tu-vi

- H1 + ô tìm theo câu hỏi tự nhiên
- Sắp xếp theo nhu cầu người dùng trước, theo phương pháp sau
- Khối "Bắt đầu từ đây" cho người mới
- Không infinite scroll ở giai đoạn này — phân trang rõ ràng
- Glossary và trang phương pháp là tiện ích, để riêng, không trộn vào luồng bài editorial

Indexing: index, follow. Schema: CollectionPage + ItemList + BreadcrumbList.

Ảnh placeholder: KT01-D/KT01-M (hero hub). Card bài viết dùng placeholder tỷ lệ 3:2.
```

## B8 — Bài viết kiến thức · `/kien-thuc/tu-vi/la-so-tu-vi-la-gi`

```
DỰNG TRANG: Knowledge article template, route /kien-thuc/tu-vi/la-so-tu-vi-la-gi

Sáu phần theo thứ tự:
01. Breadcrumb · H1 · dek · tác giả và người rà soát phương pháp · ngày rà soát gần nhất
02. Tóm tắt ngắn bằng ngôn ngữ đời thường + mục lục bài
03. Thân bài theo chuỗi: nhận định → nguồn/căn cứ → ví dụ → giới hạn
04. Glossary inline cho thuật ngữ + sơ đồ minh hoạ có caption và alt
05. Tối đa HAI CTA contextual trong thân bài, không hơn
06. Nguồn tham khảo · liên kết trang phương pháp · bài liên quan · CTA cuối

Tên tác giả/reviewer: dùng placeholder rõ ràng dạng [Tên reviewer] — KHÔNG bịa tên người thật.

Sơ đồ trong bài PHẢI dựng bằng SVG trong code (mang thông tin, cần chính xác và accessible), không
dùng ảnh AI. Chỉ ảnh hero là ảnh không khí.

Indexing: index, follow. Schema: Article + BreadcrumbList.

Ảnh placeholder: KT10 (hero bài viết, 3:2).
```

## B9 — Tài khoản và quyền riêng tư · `/tai-khoan`

```
DỰNG TRANG: Account & privacy, route /tai-khoan. Riêng tư — noindex. Không ảnh.

- Dashboard mở ra bằng danh sách hồ sơ lá số và báo cáo đã có. Tuyệt đối không có widget kiểu
  "vận hạn hôm nay" hay bất cứ thứ gì khuyến khích quay lại xem lặp lại.
- Consent tách riêng theo từng mục đích, mỗi mục một toggle độc lập: tạo lá số · lưu hồ sơ ·
  marketing · analytics · cải thiện AI. Không gộp.
- Người dùng tự thao tác được: xuất dữ liệu · xoá dữ liệu · thu hồi link đã chia sẻ.
- Phần xoá dữ liệu mô tả rõ: xoá những gì, trong bao lâu, và dữ liệu nào bắt buộc phải giữ theo
  nghĩa vụ giao dịch/kế toán.
```

---

# Kiểm tra trước khi coi một trang là xong

1. Mở chạy được, không lỗi console.
2. Đủ đúng các khối theo khối brief — không thiếu, không tự thêm section không có trong brief.
3. Token màu/font/spacing khớp trang chủ, không có giá trị lạ ngoài hệ.
4. Responsive kiểm tại 320px / 768px / 1200px — không tràn ngang, không cần zoom vẫn đọc được.
5. Keyboard đi hết mọi control, focus state nhìn thấy rõ.
6. Contrast đạt AA ở mọi cặp màu thật trên trang, gồm cả chữ đè lên ảnh/placeholder.
7. Copy không có câu định mệnh, không fear-based; AI disclosure nguyên văn nếu trang có nhắc AI.
8. Trang riêng tư có noindex trong head.
9. Placeholder ảnh có mã (LS01-D, FM01...) đúng tỷ lệ và có mô tả — để ChatGPT viết prompt khớp.
10. Sơ đồ mang thông tin được dựng bằng SVG kèm alt + bảng/list tương đương, không phải ảnh.

# Sau khi dựng xong mỗi trang

Export và gửi lại cho founder để đưa về repo tại `prototype/<ten-trang>/`. Danh sách mã ảnh của trang
đó chuyển sang ChatGPT để viết prompt (xem `docs/17-chatgpt-image-prompt-handoff.md`).
