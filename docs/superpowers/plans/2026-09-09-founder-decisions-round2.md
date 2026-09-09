# Founder Decisions — Round 2 (2026-09-09)

**Ngày:** 2026-09-09
**Bối cảnh:** Founder (Harris) duyệt các điểm còn mở (FD-040…FD-045 và các mục "Còn chờ Founder") trong
`docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` và
`docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`, qua phỏng vấn trực tiếp ngày 2026-09-09,
trước khi An hoàn thiện `feature/site-foundation` để mở PR vào `product/experience-spec-v1`.
**Trạng thái:** Toàn bộ quyết định dưới đây là **chính thức, đã chốt**. Đây là nguồn sự thật thay thế cho
mọi chỗ ghi "Chờ duyệt"/"Chờ Founder" trong hai tài liệu nguồn nói trên.
**Việc An cần làm:** xem mục 6 ở cuối tài liệu này, đồng thời cập nhật `rules-and-decisions-tracker.md`
(đã được bổ sung FD-036 → FD-056 trong lượt này), spec 2026-09-08 và backlog 2026-09-08 cho khớp.

---

## 1. Tính toàn vẹn hồ sơ giao dịch (P0, chặn WP-01/WP-02)

### FD-040 — Approved
`invoice_number` bất biến suốt đời một order row; bảng order chuyển sang append-only (mở lại đơn = tạo
row mới, không `UPDATE` mã cũ). Đúng như An đề xuất, không sửa đổi. Đây là điều kiện tiên quyết để mọi cơ
chế đối soát tự động phía sau (WP-02, WP-02B) hoạt động đúng — vá lỗi mất tiền mô tả ở mục 2 của spec.

### FD-042 — Approved (kèm nguyên tắc bổ sung)
SKU ID (`ZIWEI-IDENTITY-P0`...) là định danh kỹ thuật bất biến; chỉ đổi **tên hiển thị** sản phẩm, không
đổi SKU ID, để không phải migrate bản ghi thương mại cũ.

Founder nhấn mạnh thêm một nguyên tắc cứng, áp dụng xuyên suốt: **SKU ID và mọi định danh kỹ thuật nội bộ
không bao giờ được hiển thị cho khách dưới bất kỳ hình thức nào** — khách chỉ thấy tên sản phẩm dễ hiểu,
hoặc mã đơn/mã tham chiếu ở dạng dễ hiểu (không phải chuỗi ID thô). Đây không phải yêu cầu mới — nó củng
cố đúng yêu cầu B-2 đã có sẵn trong spec ("Không chuỗi `ZIWEI-*` nào lọt ra UI") — nhưng Founder muốn nó
được đối xử như một nguyên tắc cứng khi An thiết kế mọi màn hình liên quan đến mã đơn/SKU, không chỉ ở
trang chọn mua.

### FD-044 — Approved
Thay mã chuyển khoản dài 40 ký tự (`LSV-<uuid>`) bằng mã ngắn 12 ký tự chống nhiễu: `LSV` + 8 ký tự
Crockford base32 in hoa (đã loại `I/L/O/U`) + 1 ký tự kiểm tra. Đúng như An đề xuất.

### FD-045 — Đề xuất ban đầu bị TỪ CHỐI; thay bằng cơ chế mới (Approved 2026-09-09)

**Đề xuất ban đầu bị từ chối:** cộng số lẻ định danh 1–999đ vào số tiền mỗi đơn (79.000đ → 79.348đ) để
làm khoá đối chiếu dự phòng. **Founder không chấp nhận giá lẻ hiển thị cho khách dưới bất kỳ hình thức
nào, không có ngoại lệ** — kể cả chỉ hiện ở bước chuyển khoản/QR.

**Cơ chế thay thế (Founder đã duyệt):**

1. Bỏ hẳn "Tầng 3" kiểu cũ trong mục 2B.2 của spec — không còn bước hệ thống tự động duyệt chỉ dựa vào số
   tiền trùng khớp một cách "mù" (không có xác nhận của khách).
2. Mọi giao dịch không trích được `payment_code` ở Tầng 1–2 (FD-044, R-AUTO-4→7) đi thẳng vào **Tầng 4 —
   khách tự nhận** (R-AUTO-11 → R-AUTO-14), không qua bước tự động ở giữa.
3. Trong Tầng 4, thắt điều kiện khớp: số tiền khớp tuyệt đối **và** nằm trong cửa sổ thời gian do khách tự
   khai báo (ngày/giờ đã chuyển, theo R-AUTO-12) — thay cho cửa sổ 24 giờ rộng mà tầng auto-match cũ dùng.
   Cửa sổ hẹp làm giảm mạnh khả năng trùng ở cùng mức giá tròn (79.000đ/19.000đ sẽ trùng nhau giữa nhiều
   đơn nếu dùng cửa sổ rộng).
4. Vẫn giữ nguyên tắc "chỉ tự duyệt khi đúng một ứng viên khớp" (R-AUTO-13). Có ≥2 ứng viên trùng số tiền
   trong cùng cửa sổ → không tự duyệt, đẩy sang Tầng 5 (cảnh báo Founder, xem FD-047) để xử lý tay ca hiếm.
5. Cầu dao tự ngắt (R-AUTO-17/18/19) giữ nguyên như spec — không đổi.

**Đánh đổi đã được Founder chấp nhận:** tỷ lệ tự động khớp ở phần "không trích được mã" sẽ thấp hơn so với
phương án số lẻ, nhưng đổi lại **giá hiển thị luôn tròn tuyệt đối ở mọi nơi** — offer, checkout, QR, biên
nhận — không có ngoại lệ.

**Tác động cần sửa trong spec/backlog:** mục 2B.2 "Tầng 3" của spec 2026-09-08 cần viết lại theo mô tả
trên; R-AUTO-8/9/10 (dựa vào số lẻ định danh) bị loại bỏ, thay bằng yêu cầu tương đương cho cửa sổ thời
gian hẹp ở Tầng 4 (An diễn giải chi tiết thành implementation plan khi viết plan cho WP-02/WP-02B).

---

## 2. Đối soát khi không có người trực (thực thi FD-043)

### FD-046 — Approved
Khi không xác định được chủ giao dịch (không ai tự nhận, không khớp đơn nào) **và** hệ thống không có khả
năng tự hoàn tiền ra ngân hàng (SePay không hỗ trợ tự động hoàn tiền) → giữ giao dịch ở trạng thái **chờ
khách tự nhận vô thời hạn**. Founder không yêu cầu xây quy trình hoàn tiền thủ công thay thế — đây là giới
hạn thật của hệ thống, không phải hạng mục có thể lập trình bỏ qua (đúng như spec mục 2B.1 đã nêu).

### FD-047 — Approved
Kênh cảnh báo out-of-band cho cầu dao tự ngắt (R-AUTO-18) và giao dịch tồn đọng >6 giờ (R-AUTO-15):
**bot Telegram gửi vào group vận hành chung của Harris và An.**

**SLA phản hồi:** Founder cam kết kiểm tra cảnh báo **trong vòng 6 giờ**. Vì cầu dao **không tự mở lại**
(R-AUTO-19, bật lại là thao tác thủ công có chủ ý), thời gian ngừng bán khi cầu dao mở phụ thuộc trực tiếp
vào SLA này — An nên coi 6 giờ là mốc thời gian tối đa hệ thống có thể ở trạng thái "tạm ngừng nhận thanh
toán" trước khi Founder can thiệp.

**Việc kỹ thuật cần chuẩn bị:** bot token + group chat ID cấu hình qua biến môi trường (không hardcode).
Founder sẽ tạo bot/group và cung cấp giá trị khi An sẵn sàng tích hợp WP-02B.

---

## 3. Chính sách sản phẩm

### FD-041 — Approved, khác với đề xuất của An
Khấu trừ khi nâng cấp tầng 1 → tầng 2 **hết hạn sau 7 ngày** kể từ ngày mua tầng 1 (không phải "không hết
hạn" như An đề xuất; theo đúng cửa sổ hội đồng brainstorm ban đầu nêu ra dù chưa có bằng chứng thúc mua).

**Yêu cầu bắt buộc đi kèm (theo đúng điều kiện chính An đã ghi trong spec mục 3.3):** vì đây là cửa sổ có
hạn, phải **công bố rõ ngay tại điểm mua tầng 1**, trước khi khách xác nhận thanh toán — ví dụ: "Ưu đãi
khấu trừ khi nâng cấp lên bản toàn diện áp dụng trong 7 ngày kể từ hôm nay." Đây là điều kiện bắt buộc đi
kèm quyết định này, không phải tuỳ chọn: nếu không disclose rõ, khách trả tiền tầng 1 rồi mất quyền lợi đã
ngụ ý sau 7 ngày — đúng loại rủi ro phá niềm tin mà spec đang cố tránh.

**Tác động backlog:** WP-09 cần thêm cơ chế hết hạn (ví dụ cột thời điểm hết hạn khấu trừ trên đơn tầng 1)
và copy cảnh báo thời hạn hiển thị tại thời điểm mua tầng 1, không phải sau khi mua.

### FD-048 — Approved
Micro-offer tầng 1 chỉ bán/test ở **19.000đ** — một mức giá duy nhất, không chạy A/B 19k/29k ở giai đoạn
này.

**Lưu ý guardrail (mục 8 spec):** ngưỡng "Tỷ lệ COGS trên giá tầng 1 > 40% → Dừng nhánh 19k" áp dụng trực
tiếp lên mức giá này — đây là mức rủi ro biên lợi nhuận cao nhất trong hai lựa chọn từng cân nhắc, vì mỗi
đơn 19k vẫn gánh đúng COGS của một báo cáo đầy đủ (spec mục 3.2). Cần đo COGS thật càng sớm càng tốt sau
khi có traffic thật để kiểm tra ngưỡng này — xem mục 5 bên dưới.

**Tác động backlog:** WP-12 (A/B 19k vs 29k) hạ khỏi ưu tiên gần hạn — giữ trong backlog cho tương lai
nhưng không phải việc cần làm khi chỉ bán một mức giá.

---

## 4. Analytics

### FD-049 — Approved
Migrate hoàn toàn bộ event cũ (`config/analytics-events.json`, 18 event: `landing_view`, `chart_created`,
`payment_completed`...) sang tên funnel mới theo WP-10 (`landing, wizard_start, wizard_step_complete,
chart_success, offer_view, auth_verified, checkout_created, payment_confirmed, report_ready,
report_opened, upgrade_view, upgrade_purchased, repeat_purchase, payment_unmatched,
payment_pending_over_1h, report_failed, refund, support_ticket`). Không chạy song song hai hệ tên event.

### FD-050 — Approved
Trước khi khách đồng ý analytics consent (nếu trang có cơ chế consent), **chỉ** được ghi event kỹ thuật ẩn
danh không gắn hành vi người dùng (ví dụ lỗi tải trang, health check). Không event nào trong funnel
canonical (`landing_view`, `chart_created`, `checkout_created`...) được ghi trước khi có consent.

### FD-051 — Approved
Lưu trữ analytics lâu dài: **tự host trong hạ tầng hiện có** (bảng riêng trong Postgres đang dùng, hoặc
ClickHouse tự host) — không dùng dịch vụ SaaS bên thứ ba để lưu trữ chính. Hiện tại sink chỉ ghi log ứng
dụng qua `createApiAnalyticsSink` (`apps/api/src/api.module.ts:160`) — không bền vững, cần thay theo quyết
định này khi An làm WP-10.

### FD-052 — Approved (đơn giản hoá so với đề xuất ban đầu)
Pseudonymous session ID cho tầng analytics: **không cần xoay vòng theo chu kỳ.** Lý do đơn giản hoá: rủi ro
"lần theo lịch sử hành vi trọn đời qua một ID bền vững" chỉ thực sự đáng lo khi dữ liệu rời khỏi hệ thống
tự host (FD-051 đã loại trừ việc này với vai trò lưu trữ chính). Chỉ cần là một giá trị kỹ thuật khác với
account ID — không dùng thẳng account ID/khoá chính nội bộ làm ID analytics (tránh trộn khoá nội bộ với hệ
thống công khai/log — thói quen kỹ thuật tốt, không phải yêu cầu riêng tư đặc biệt). Cookie/ID sống dài
bình thường như analytics thông thường.

### FD-053 — Approved
Phạm vi dữ liệu được phép gửi ra công cụ phân tích/tối ưu hành vi mua bên thứ ba (nếu Founder dùng công cụ
ngoài hạ tầng tự host để tối ưu conversion):

- **Được gửi tự do:** toàn bộ dữ liệu hành vi + thương mại — bước phễu, SKU/giá đã chọn, nguồn traffic,
  thời gian tới mua, điểm rời bỏ, thiết bị/trình duyệt.
- **Không bao giờ gửi ra bên thứ ba, dưới bất kỳ hình thức nào:** tên, ngày/giờ/nơi sinh chính xác, nội
  dung câu hỏi tự do của khách, `chart_id`.
- Phân tích sâu cần join với dữ liệu lá số (ví dụ phân khúc theo năm sinh) chỉ chạy trên **BI tool tự
  host** (ví dụ Metabase/Superset trên chính Postgres của Founder) — không rời khỏi hạ tầng do Founder
  kiểm soát.

**Vì sao ranh giới này giữ nguyên dù Founder ưu tiên tiện lợi kinh doanh:** một khi dữ liệu rời sang bên
thứ ba (Google/Meta/Mixpanel...), nghĩa vụ xoá dữ liệu theo yêu cầu khách (đã implement Phase 01, FD-020)
không còn hiệu lực với bản sao đã ở bên thứ ba; ngày/giờ/nơi sinh và nội dung câu hỏi cá nhân có thể chạm
ngưỡng dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP. Founder đã xác nhận chấp nhận ranh giới này
sau khi cân nhắc rủi ro — đây là quyết định có chủ ý, không phải giới hạn kỹ thuật áp đặt.

### FD-054 — Approved
Dashboard analytics + bảng ánh xạ migration (event cũ → mới) do **Harris và An cùng sở hữu.**

---

## 5. UI

### FD-055 — Approved
UI artifact branch chính thức để An dựa vào khi làm WP-03 (thư viện/lịch sử đơn), WP-06 (đường ra lỗi
thanh toán), WP-11 (đường ra khi không biết giờ sinh), WP-13 (kiểm UI xuyên suốt) — theo đúng yêu cầu
FD-024 ("Defer user-facing UI to a dedicated artifact branch"):

**`product/discipline-flagship-pages`**

**Founder cần lưu ý trước khi An bắt đầu:** repo hiện có nhiều branch `product/*` mang UI khác nhau chưa
hợp nhất với nhau — `product/bg-texture-consistency` (có logo Colophon v5 đã chốt + texture nền đồng bộ
toàn site) và `product/homepage-content-rewrite` (nội dung trang chủ mới nhất). Nếu các thay đổi đó (đặc
biệt logo đã chốt) chưa được hợp nhất vào `product/discipline-flagship-pages`, An sẽ build trên một
artifact **thiếu** các thay đổi này. Đề xuất: Founder xác nhận có cần hợp nhất các branch UI liên quan vào
`product/discipline-flagship-pages` trước khi An bắt đầu, hoặc xác nhận rõ những gì được phép bỏ qua ở
vòng này.

### FD-056 — Approved
Nghiệm thu visual xuyên suốt (WP-13, mobile/desktop/checkout flow, kể cả kịch bản quay lại từ app ngân
hàng): **Harris nghiệm thu một mình.** An chạy kiểm và cung cấp bảng pass/fail có ảnh chụp theo đúng
backlog đã ghi (WP-13 "Chủ sở hữu: An chạy kiểm, Harris nghiệm thu") — không đổi vai trò thực thi, chỉ xác
nhận người ký duyệt cuối là Harris.

---

## 6. Dữ liệu kinh tế (mục 9 của "Còn chờ Founder") — cam kết cung cấp, chưa phải quyết định

Founder xác nhận: **lasoviet.vn hiện chưa có traffic/doanh thu thật** — site mới ra mắt, sẽ ramp dần từ 0
theo kế hoạch launch riêng của Founder (không phải số có thể nghiên cứu được — đây là mục tiêu kinh doanh
của Founder, không phải benchmark thị trường). Do đó COGS AI thật, phí thanh toán thật, và tỷ lệ hoàn tiền
thật **chưa tồn tại** để cung cấp làm baseline chính xác.

Founder yêu cầu nghiên cứu thị trường Việt Nam nói chung để có giả định tạm dùng thay thế cho ba số còn
lại (COGS AI/report, phí thanh toán, tỷ lệ hoàn tiền benchmark). Một lượt nghiên cứu riêng đã được khởi
động cùng lúc với tài liệu này — kết quả sẽ được bổ sung vào phụ lục bên dưới khi hoàn tất.

**Hệ quả cho An:** guardrail "COGS/giá tầng 1 > 40%" (mục 8 spec) và KPI chính FD-038 (lãi đóng góp 30
ngày/khách) tạm thời phải chạy trên số giả định trong phụ lục này cho đến khi có dữ liệu thật đầu tiên.
**Không dùng số giả định để ra quyết định dừng/mở rộng vĩnh viễn** — chỉ dùng để không chặn việc lập kế
hoạch và cấu hình guardrail ban đầu.

### Phụ lục — giả định kinh tế (nghiên cứu thị trường VN, 2026-09-09)

**Toàn bộ số dưới đây là GIẢ ĐỊNH/ƯỚC TÍNH, không phải dữ liệu thật của lasoviet.vn.** Phải thay bằng số
thật ngay khi có traffic/doanh thu đầu tiên; không dùng để ra quyết định dừng/mở rộng vĩnh viễn.

**1. COGS AI trung bình/report** — giả định 1 lần gọi API/report, tổng input+output 15.000–30.000 token
(input ~70% gồm prompt cấu trúc + dữ liệu lá số/tài liệu tham chiếu; output 2.200–3.200 từ tiếng Việt ≈
4.500–9.000 token vì tokenizer BPE tốn nhiều token hơn với văn bản có dấu):
- Tier frontier (GPT-4o/Claude Sonnet-class, giá 09/2026): **~1.750–5.000đ/report**
- Tier mid (GPT-4o-mini-class): **~100–225đ/report**
→ Ngay cả ở tier frontier, COGS AI dưới 5.000đ/report — không đáng kể so với giá bán 19k/79k. Cần đối
chiếu với model thật mà `9router-an` đang proxy để chọn đúng tier.

**2. Phí thanh toán VN** — SePay (mô hình webhook bank-sync, chuyển khoản VietQR trực tiếp ngân hàng↔ngân
hàng, không giữ tiền hộ) **không tính % giao dịch**: gói FREE 0đ/tháng (50 giao dịch), STARTUP 120.000đ/
tháng (180 giao dịch, ~667đ/giao dịch). Cổng trung gian thật (VNPay, Ngân Lượng, Momo) tính **1.000–1.650đ
+ 1–1,1%/giao dịch** nếu sau này mở thêm thẻ/ví. → Với mô hình hiện tại (chỉ VietQR bank-transfer qua
SePay), baseline hợp lý là **~0% + phí cố định/tháng theo gói**.

**3. Tỷ lệ hoàn tiền** — không có số liệu công khai riêng cho VN; benchmark toàn cầu cho digital/info-
product: **3–5% baseline**, stress-test kịch bản xấu ở **10%**.

**4. Traffic ramp** — không dự đoán số cụ thể (đây là mục tiêu kinh doanh của Founder, không phải benchmark
thị trường). Ghi chú SEO chung: tuần 1–12 chủ yếu là giai đoạn nền tảng (index hoá, on-page), traffic gần
như chưa đáng kể; tín hiệu đầu tiên thường xuất hiện quanh tuần 8–12; tăng trưởng compounding thường bắt
đầu sau tháng 6.

**Áp dụng vào guardrail:** với COGS ước tính tối đa ~5.000đ/report trên giá bán 19.000đ, tỷ lệ COGS/giá ≈
26% — dưới ngưỡng dừng 40% (mục 8 spec) ở baseline giả định này. Guardrail vẫn phải đo lại bằng số thật
ngay khi có traffic, vì đây chỉ là ước tính trước khi biết model/token thật sự dùng.

_Nguồn: bảng giá GPT-4o/Claude/GPT-4o-mini (09/2026), bảng giá SePay, biểu phí payOS/VNPay/Momo, benchmark
refund rate Adapty/KISSmetrics, timeline SEO chung — chi tiết link có trong transcript nghiên cứu, không
lặp lại ở đây để giữ tài liệu gọn._

---

## 7. Việc An cần làm ngay sau khi nhận tài liệu này

1. Cập nhật spec 2026-09-08 mục 2B.2 "Tầng 3" theo cơ chế thay thế FD-045 (mục 1 ở trên).
2. Cập nhật spec mục 3.3 thêm điều kiện hết hạn 7 ngày + yêu cầu disclosure UI tại điểm mua tầng 1
   (FD-041).
3. Cập nhật backlog: WP-09 thêm field/logic hết hạn khấu trừ; WP-12 hạ khỏi ưu tiên gần hạn (chỉ 1 mức giá
   19k — FD-048); WP-02/WP-02B cập nhật theo cơ chế FD-045 mới; WP-10 áp dụng FD-049 → FD-054.
4. Xác nhận với Founder việc có cần hợp nhất các branch UI trước khi bắt đầu WP-03/06/11/13 (FD-055).
5. Chuẩn bị tích hợp Telegram bot cho cảnh báo (FD-047) — chờ Founder cấp bot token/group chat ID trước
   khi triển khai WP-02B.
6. Việc dọn dẹp còn treo từ backlog trước: file lạ `--full-page` ở gốc repo (chưa track, nghi do lỗi flag
   CLI screenshot) và `docs/20-deep-research-ta-social-listening-handoff.md` (chưa track) — xác nhận với
   Founder trước khi xoá/commit.

---

**Nguồn quyết định:** phỏng vấn trực tiếp Founder ngày 2026-09-09, đối chiếu trực tiếp với
`docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` và
`docs/superpowers/plans/2026-09-08-experience-ladder-backlog.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
