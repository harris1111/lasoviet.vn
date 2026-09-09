# Product Ladder & Post-Purchase Experience — Spec v1

**Date:** 2026-09-08
**Status:** All decisions FD-036 through FD-056 are ratified by the founder (Round 2, 2026-09-09). Full details, including the rejected odd-unit proposal and replacement mechanism (FD-045), are recorded in `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`. The table below records ratified status.
**Audited base commit:** `6e6ff065b385873b15c926a0c4b95b68074baae5` (tip of `product/experience-spec-v1`, fast-forwarded locally on 2026-09-08).
**Input sources:** `lasoviet-brainstorm-ux-product-ladder.md` (brainstorm council, 2026-09-08) + direct repository audit.
**Inherited constraints:** FD-007, FD-019, FD-029, and OD-001 through OD-006 remain in effect. The 2026-09-07 comprehensive spec is the source of truth for Zi Wei report content.

---

## 0. Founder Decisions (Ratified 2026-09-09)

| ID | Decision | Status |
|---|---|---|
| FD-036 | Phased direction B: Free → micro-offer OR 79k comprehensive report, VND only; wallet/points deferred to a later gated phase | Approved 2026-09-08 |
| FD-037 | Tier-1 micro-offer is a defined natal excerpt with upgrade credit; no situational-question engine this round | Approved 2026-09-08 |
| FD-038 | Primary 90-day KPI is 30-day contribution margin per chart-creating customer; first-purchase rate and return revenue are secondary and must not be optimized at the primary KPI's expense | Approved 2026-09-08 |
| FD-039 | Exclude the "Điểm Việt" wallet/points system from this round's spec; data design must not block adding a wallet later | Approved 2026-09-08 |
| FD-040 | `invoice_number` is immutable for the life of an order row; commerce order table becomes append-only | Approved 2026-09-09 |
| FD-041 | Upgrade credit (Tier 1 → Tier 2) expires 7 days after the Tier 1 `paid_at` (paid timestamp); mandatory disclosure at point of purchase before payment confirmation | Approved 2026-09-09 |
| FD-042 | SKU ID is an immutable technical identifier and must never be exposed to the customer in any form (backend-only); only the customer-facing display name changes | Approved 2026-09-09 |
| FD-043 | No staffed payment reconciliation exists. Every step after checkout must self-recover automatically; anything that cannot self-recover must self-halt sales rather than silently accept payment | Approved 2026-09-08 |
| FD-044 | Replace the 40-character transfer-memo invoice number with a short 12-character anti-noise payment code (`LSV` + 8 Crockford base32 chars + 1 checksum char), stored separately from `invoice_number` | Approved 2026-09-09 |
| FD-045 | Odd-unit surcharge proposal rejected — displayed and charged prices must always be round, no exceptions. Replaced legacy amount fallback matching tier with customer self-claim within +/- 15-minute window around declared transfer timestamp in `Asia/Ho_Chi_Minh` | Approved (revised) 2026-09-09 |
| FD-046 through FD-056 | Unattended reconciliation, alert channel, micro-offer price (19k single price), analytics migration, consent/storage/session ID/third-party export boundaries, dashboard ownership, UI artifact branch (`product/discipline-flagship-pages`), and visual QA sign-off — see full details in `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`. | Approved 2026-09-09 |

---

## 1. Hiện trạng đã kiểm chứng

Audit đọc source trực tiếp tại commit nêu trên. Cột "Kết luận" ghi rõ điều gì được xác nhận và điều gì bị bác bỏ.

| # | Quan sát | Vị trí | Kết luận |
|---|---|---|---|
| 1 | Contract thương mại chỉ chấp nhận đúng một SKU: `z.literal("ZIWEI-IDENTITY-P0")` | `packages/contracts/src/commerce.ts:3` | **Xác nhận.** Ladder nhiều SKU bị chặn ngay ở tầng contract. |
| 2 | `PaidTopicSelector` chỉ render `topics.offers[0]` | `apps/web/src/features/reports/paid-topic-selector.tsx:19` | **Xác nhận.** Không có cơ chế chọn giữa nhiều offer. |
| 3 | `createCheckoutOrder` hardcode `sku: "ZIWEI-IDENTITY-P0"` | `apps/web/src/features/commerce/create-checkout-order.ts:34` | **Xác nhận.** |
| 4 | `AccountDashboard` chỉ có tiêu đề + nút đăng nhập, không có thư viện/đơn hàng | `apps/web/src/features/account/account-dashboard.tsx` | **Xác nhận.** Không có vòng quay lại sau mua. |
| 5 | Report `failed` chỉ có `mailto:support@lasoviet.vn`, không mã đơn, không trạng thái xử lý | `apps/web/src/features/reports/report-progress.tsx:45` | **Xác nhận.** |
| 6 | Catalog gọi SKU 79k là "Bản mệnh & tiềm năng"; spec 2026-09-07 đã duyệt sản phẩm là báo cáo toàn diện 12 cung | `config/product-catalog.json`, `apps/web/src/features/ziwei/ziwei-presentation.ts:147-149` | **Xác nhận.** Lời hứa trước mua lệch đầu ra. |
| 7 | Hai nguồn sự thật cho catalog: `config/product-catalog.json` (6 sản phẩm) và `PRODUCT_CATALOG` hardcode trong code (1 sản phẩm) | `packages/backend/src/commerce/order.service.ts:3-10` | **Xác nhận, chưa ai nêu.** Giá và SKU có thể trôi lệch nhau. |
| 8 | Giả thuyết ban đầu của tôi: unique index `(chart_id, sku)` chặn tạo lại đơn sau khi hết hạn | `packages/backend/src/commerce/commerce.repository.ts:120-153` | **Bác bỏ.** Repository xử lý đúng: tìm order cũ và mở lại (`reused: true`). |
| 9 | Mã đơn bị **thay mới** khi mở lại đơn, trong khi mã đơn chính là nội dung chuyển khoản và tham số đối chiếu webhook | `commerce.repository.ts:131,182`, `payment-instructions.ts:67,79`, `commerce.repository.ts:236-238` | **Xác nhận. Lỗi mất tiền. Hội đồng chưa nêu.** Chi tiết mục 2. |
| 10 | TTL đơn hàng 900 giây | `commerce.repository.ts:63`, `commerce.controller.ts:58,84` | **Xác nhận một nửa.** Cơ chế cấu hình **đã có** (`SEPAY_ORDER_TTL_SECONDS`, wired qua `load-environment.ts:299`) — bản audit đầu của tôi ghi sai là không cấu hình được. Vấn đề thật chỉ là **giá trị mặc định 900 giây quá ngắn** cho luồng chuyển app ngân hàng thực tế. |
| 11 | Bảng `commerce_entitlements` đã tồn tại, unique theo `(chart_id, sku)` | `packages/database/src/schema/commerce.ts:49-62` | **Xác nhận.** Đây là nền có sẵn cho thư viện và chống thu phí hai lần. |
| 12 | Bank mode chỉ lấy **token đầu tiên** của nội dung chuyển khoản làm mã đối chiếu: `rawContent.split(/\s+/, 1)[0]` | `sepay-webhook.service.ts:191` | **Xác nhận.** App ngân hàng VN thường chèn tiền tố ("CT DEN:...", tên người gửi) trước nội dung khách gõ. Token đầu khi đó không phải mã đơn. |
| 13 | Nội dung chuyển khoản không khớp `^[A-Za-z0-9_-]+$` làm **cả webhook** trả `SEPAY_PAYLOAD_INVALID` và không ghi lại gì | `sepay-webhook.service.ts:193` | **Xác nhận.** Chỉ cần một dấu `:` trong tiền tố ngân hàng là mất trắng dấu vết giao dịch. |
| 14 | Đối chiếu dùng `eq()` phân biệt hoa thường, trong khi mã đơn là UUID **chữ thường có dấu gạch** | `commerce.repository.ts:237`, `:160` | **Xác nhận ở tầng code.** Nhiều app ngân hàng viết hoa hoặc lược ký tự đặc biệt trong nội dung. Mức ảnh hưởng thực tế phải đo bằng giao dịch thật trên vài ngân hàng. |
| 15 | Mã chuyển khoản dài 40 ký tự | `commerce.repository.ts:160` | **Xác nhận.** Quá dài để khách gõ tay và dễ bị cắt bởi giới hạn độ dài nội dung của app ngân hàng. |
| 16 | Sinh báo cáo **đã có** retry tự động: `attemptCount`, `retryable_failure` → `terminal_failure` | `packages/backend/src/reports/report.service.ts:132,188` | **Xác nhận. Điểm tốt.** Khâu sau thanh toán đã có nền tự phục hồi; chỉ khâu đối soát tiền là chưa. |
| 17 | Hạ tầng gửi email đã có nhưng enum chỉ có `email_verification`, `password_reset` | `packages/database/src/schema/notifications.ts:13-16` | **Xác nhận.** Thêm email "báo cáo đã sẵn sàng" chỉ cần mở rộng enum, không phải xây mới. |

---

## 2. P0-CRITICAL: danh tính thanh toán có thể đổi dưới chân khách

Đây là lỗi nghiêm trọng nhất tìm được trong lượt này, cao hơn mọi hạng mục UX trong bản brainstorm. Nó làm khách **mất tiền mà không nhận được gì, và hệ thống không giữ dấu vết nào nối khoản tiền đó với khách**.

### 2.1 Cơ chế lỗi

1. `createPaymentInstructions` đặt `transferDescription = invoiceNumber` và nhúng `des=<invoiceNumber>` vào URL ảnh QR VietQR (`payment-instructions.ts:67,79`). Mã đơn **chính là** nội dung chuyển khoản khách gõ vào app ngân hàng.
2. Khi mở lại một đơn `expired`/`failed`/`pending` quá hạn, repository ghi đè `invoiceNumber: "LSV-" + randomUUID()` lên chính row cũ (`commerce.repository.ts:131,182`).
3. `recordPaid` đối chiếu tiền **chỉ bằng** `eq(commerceOrders.invoiceNumber, input.invoiceNumber)` (`commerce.repository.ts:236-238`). Không khớp → trả `ORDER_NOT_FOUND` và **không lưu lại gì**.

### 2.2 Kịch bản thất bại cụ thể

**Kịch bản A — mã đơn bị thay:**
- `t0`: khách bấm mua. Đơn `LSV-A`, hết hạn `t0+15p`. Khách chụp màn hình QR hoặc copy nội dung `LSV-A`, mở app ngân hàng.
- `t0+20p`: khách quay lại tab web (hoặc bấm mua lại). Repository thấy đơn quá hạn → mở lại → mã đơn nay là `LSV-B`. Khách không được báo mã đã đổi.
- `t0+22p`: khách hoàn tất chuyển khoản bằng nội dung `LSV-A` đang mở sẵn trong app ngân hàng.
- Webhook SePay gửi `order_invoice_number = "LSV-A"` → `recordPaid` → `ORDER_NOT_FOUND`.
- **Kết quả: tiền đã vào tài khoản ngân hàng. Không có đơn nào chuyển sang `paid`. Không có entitlement. Không có báo cáo. Không có bản ghi nào để đối soát.**

**Kịch bản B — chỉ cần chậm 16 phút:**
- Khách chuyển đúng `LSV-A` tại `t0+16p`. Order tồn tại nhưng `createdAt <= cutoff` → `recordPaid` trả `PAYMENT_STATE_CONFLICT` và lật đơn thành `expired`.
- **Cùng kết quả: tiền vào, không giao hàng, không dấu vết.**

Kịch bản B không cần bất kỳ hành vi bất thường nào của khách. Chuyển khoản liên ngân hàng lần đầu ở Việt Nam thường mất hơn 15 phút khi khách phải mở app, đăng nhập sinh trắc học, thêm người thụ hưởng mới và xác thực OTP.

### 2.3 Yêu cầu bắt buộc

| ID | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| R-PAY-1 | `invoice_number` bất biến suốt đời một order row. Không lệnh `UPDATE` nào được phép ghi vào cột này. | Test: mở lại đơn hết hạn → order row cũ giữ nguyên `invoice_number`; DB constraint/trigger hoặc test chặn ghi đè. |
| R-PAY-2 | Mở lại đơn tạo **row mới**, giữ nguyên row cũ làm lịch sử. Bảng order là append-only về mặt danh tính. | Test: hết hạn rồi mua lại → tồn tại 2 row, row cũ `expired` giữ mã cũ, row mới `pending` mã mới. |
| R-PAY-3 | Thay unique index `(chart_id, sku)` bằng **partial unique index trên `(chart_id, sku) WHERE status = 'pending'`**. Chống trùng đơn đang mở, nhưng cho phép lịch sử nhiều đơn. | Migration + test: 1 pending duy nhất tại mỗi thời điểm; nhiều `expired` cùng tồn tại. |
| R-PAY-4 | Thanh toán khớp `invoice_number` và khớp số tiền phải được **chấp nhận kể cả khi đơn đã `expired`**, miễn là chưa có entitlement cho `(chart, sku)` đó. Đơn được kích hoạt lại và fulfil. | Test: trả tiền tại `t0+60p` với mã đúng → đơn `paid`, entitlement được cấp, báo cáo chạy. |
| R-PAY-5 | Mọi webhook hợp lệ về chữ ký nhưng **không đối chiếu được** phải ghi vào `commerce_unmatched_payments` kèm payload gốc, rồi đưa vào chuỗi tự động ở mục 2B. Không bao giờ được im lặng bỏ qua. | Test: webhook mã lạ → 1 row unmatched, HTTP vẫn 200 để provider không retry vô hạn. |
| R-PAY-6 | Nâng **giá trị mặc định** TTL lên 24 giờ và đặt `SEPAY_ORDER_TTL_SECONDS` tương ứng khi triển khai. Cơ chế env đã có sẵn, không phải xây mới. QR và mã đơn không được đổi trong thời gian đó. | Test: mặc định 86400 khi env không đặt; `.env.example` cập nhật. |
| R-PAY-7 | Màn thanh toán hiển thị mã đơn cố định, thời hạn thật, và câu "Chuyển đúng nội dung này. Nếu đã chuyển, đừng chuyển lại — tra cứu bằng mã đơn." | Acceptance UI + i18n key vi/en. |

**R-PAY-3 đồng thời gỡ chặn kiến trúc cho ladder:** unique index `(chart_id, sku)` hiện tại khiến một lá số **vĩnh viễn chỉ mua được một lần mỗi SKU**. Tầng 3 (câu hỏi tình huống mới) và tầng 4 (báo cáo năm khác) sẽ không thể tạo đơn thứ hai. Một migration giải quyết cả lỗi tiền lẫn trần kiến trúc.

**Điều kiện chặn:** không mở bất kỳ thử nghiệm giá nào, không tăng traffic trả phí, cho đến khi R-PAY-1…R-PAY-7 xong. Bán thêm hàng trên một đường thanh toán có thể nuốt tiền là làm hỏng niềm tin nhanh hơn tốc độ kiếm được doanh thu.

---

## 2B. Đối soát tự động khi không có người trực (FD-043)

Founder xác nhận **không có nhân sự trực đối soát thanh toán**. Điều này bác bỏ thiết kế "hàng đợi cho vận hành xử lý" — một hàng đợi không người đọc chỉ là một nơi chôn tiền của khách cho gọn mắt.

Thiết kế lại theo nguyên tắc: **tự giải quyết theo tầng, và nơi nào không tự giải quyết được thì tự ngừng bán.**

### 2B.1 Sự thật phải nói thẳng

Đối soát chuyển khoản ngân hàng **không thể đạt 100% tự động**. Nội dung chuyển khoản do khách gõ và do app ngân hàng định dạng lại, nằm ngoài tầm kiểm soát của hệ thống. Mục tiêu thực tế là đẩy tỷ lệ tự khớp lên rất cao rồi **tự ngắt việc bán khi tỷ lệ đó tụt**, chứ không phải giả vờ rằng phần dư bằng không.

Ngoài ra, hệ thống **không có khả năng tự hoàn tiền ra ngân hàng**. Tiền không thể quy về chủ sẽ phải nằm lại và được thông báo. Đây là giới hạn thật, không phải hạng mục có thể lập trình bỏ qua.

### 2B.2 Sáu tầng tự động, xếp theo thứ tự ưu tiên

**Tầng 0 — Triệt tiêu nguyên nhân.** R-PAY-1 → R-PAY-7 ở mục 2. Mã đơn bất biến, TTL 24 giờ, chấp nhận thanh toán trên đơn đã hết hạn. Riêng nhóm này đã xoá phần lớn các ca hỏng.

**Tầng 1 — Mã chuyển khoản chống nhiễu (FD-044).**

| ID | Yêu cầu |
|---|---|
| R-AUTO-1 | Thêm cột `payment_code text unique` vào `commerce_orders`, tách khỏi `invoice_number` (giữ `invoice_number` cho mục đích kế toán, không đụng vào). |
| R-AUTO-2 | `payment_code` = `LSV` + 8 ký tự Crockford base32 in hoa + 1 ký tự kiểm tra. Không dấu gạch, không chữ thường, bảng chữ đã loại `I`, `L`, `O`, `U` để tránh nhầm với `1`, `0`. Tổng 12 ký tự. |
| R-AUTO-3 | QR và nội dung chuyển khoản hiển thị `payment_code`, không hiển thị `invoice_number`. |

Lý do: mã ngắn sống sót qua việc app ngân hàng viết hoa, lược ký tự đặc biệt, và cắt bớt độ dài. Ký tự kiểm tra cho phép loại bỏ chuỗi trùng ngẫu nhiên khi quét nội dung.

**Tầng 2 — Trích xuất và đối chiếu chịu nhiễu.**

| ID | Yêu cầu |
|---|---|
| R-AUTO-4 | Chuẩn hoá nội dung trước khi khớp: viết hoa toàn bộ, xoá mọi ký tự không phải chữ-số. |
| R-AUTO-5 | Quét mã bằng regex `LSV[0-9A-Z]{9}` trên **toàn bộ** chuỗi đã chuẩn hoá, không chỉ token đầu tiên. Thay thế `rawContent.split(/\s+/, 1)[0]` ở `sepay-webhook.service.ts:191`. |
| R-AUTO-6 | Xác thực ký tự kiểm tra trước khi coi là khớp. |
| R-AUTO-7 | Nội dung không parse được **không bao giờ** làm webhook trả lỗi. Bỏ nhánh `SEPAY_PAYLOAD_INVALID` tại `:193` cho trường hợp này; luôn ghi nhận giao dịch rồi mới xử lý khớp. |

**Tier 3 — Automated Fallback Matching Boundary (FD-045 Revised).**

*Historical note: The initial proposal to append an identifying odd-unit surcharge (1–999 VND) to order amounts as an automated fallback reconciliation key was explicitly rejected by the founder on 2026-09-09. All displayed and charged prices must remain round without exception.*

Under ratified FD-045, blind fallback matching based on amount alone without customer confirmation is eliminated. Transactions where a payment code cannot be extracted in Tiers 1–2 proceed directly to Tier 4 customer self-claim:

| ID | Requirement |
|---|---|
| R-AUTO-8 | A validly authenticated payment without a valid payment code is persisted as unmatched in `commerce_unmatched_payments` and must never be auto-assigned from amount alone. |
| R-AUTO-9 | An authenticated customer self-claim supplies exact transferred amount and a transfer timestamp to minute precision in `Asia/Ho_Chi_Minh`; candidate payment `received_at` must fall within plus/minus 15 minutes. |
| R-AUTO-10 | Auto-approval requires exactly one eligible unmatched payment and exactly one eligible unfulfilled order for that owner under the exact-amount/time-window constraints. Zero or multiple candidates do not grant entitlement; the payment remains unmatched and becomes eligible for Tier 5 stale alerting only after remaining pending >6 hours under R-AUTO-15. |

**Tier 4 — Customer Self-Claim (Unattended Recovery).**

This replaces manual operations support: the customer who transferred funds initiates self-claim.

| ID | Requirement |
|---|---|
| R-AUTO-11 | The `commerce_unmatched_payments` table stores the full raw webhook payload, including all sender identification fields provided by SePay. Persist first, evaluate later. |
| R-AUTO-12 | "Claim Unmatched Payment" interface for authenticated accounts: customer enters the exact transferred amount and transfer timestamp to minute precision in `Asia/Ho_Chi_Minh`. |
| R-AUTO-13 | Automatically approve the self-claim when all conditions are satisfied: customer has exactly one eligible unfulfilled order for that owner; order amount matches candidate payment amount exactly; candidate payment `received_at` falls within plus/minus 15 minutes of the declared timestamp; payment is currently unclaimed; and exactly one candidate payment matches. If zero or multiple eligible payments or orders match, entitlement is not granted, the payment remains unmatched in `commerce_unmatched_payments`, and it becomes eligible for Tier 5 stale alerting only after remaining pending >6 hours under R-AUTO-15. When approved, grant entitlement, start report generation, and set `match_method = 'self_claim'`. |
| R-AUTO-14 | Abuse prevention: mandatory authentication, rate-limited to 5 claim requests per account per day, each payment can only be claimed once, append-only audit logging. If no match is found, display "payment not found"; never disclose or list unclaimed payments. |

**Tier 5 — Residual Alerting And Escalation.**

| ID | Requirement |
|---|---|
| R-AUTO-15 | Unmatched transactions pending >6 hours trigger an out-of-band Telegram alert (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) to the operations group, including amount, received timestamp, and payload metadata (FD-047). Unmatched funds remain held pending indefinite customer self-claim (FD-046). |
| R-AUTO-16 | Notifications are alerts, not a routine work queue. If Tier 5 alerts fire frequently, Tiers 1–4 are malfunctioning and must be repaired. |

### 2B.3 Circuit Breaker

| ID | Requirement |
|---|---|
| R-AUTO-17 | The system computes a 24-hour rolling auto-match rate: `auto_matched_payments / total_received_payments`. |
| R-AUTO-18 | If the auto-match rate drops below **95%** (minimum 20 sample transactions) or if **3 or more unclaimed transactions** remain pending >6 hours: **automatically halt new order creation**, display a "payments temporarily paused" page, and alert the founder via Telegram. |
| R-AUTO-19 | Resuming sales requires an intentional manual reset; the circuit breaker never automatically resets over time. |

Đây là điều khoản quan trọng nhất của FD-043. Không có người trực nghĩa là không ai phát hiện lúc đường tiền hỏng. Vậy hệ thống phải tự phát hiện và **tự ngừng nhận tiền** — thà mất vài đơn còn hơn nhận tiền mà không giao được hàng và không ai biết.

### 2B.4 Tự động hoá khâu sau thanh toán

Khâu này đã có nền tốt: `report_queue_jobs` có `attemptCount`, `retryable_failure`, `terminal_failure` (`report.service.ts:132,188`). Cần bổ sung:

| ID | Yêu cầu |
|---|---|
| R-AUTO-20 | Gửi email khi báo cáo sẵn sàng, để khách không phải ngồi canh tab. Mở rộng `notification_delivery_kind`. |
| R-AUTO-21 | `terminal_failure` trên đơn đã trả tiền tự động báo Founder trong 15 phút và hiện cho khách trạng thái thật kèm mã đơn (BE-5). Khách đã trả tiền không bao giờ rơi vào ngõ cụt im lặng. |
| R-AUTO-22 | Retry sinh báo cáo **không bao giờ** thu thêm tiền hoặc tạo đơn mới. |

---

## 2C. Trạng thái hiện tại: thanh toán đang tắt

Founder xác nhận cơ chế thanh toán đang tắt để test. Kiểm code cho thấy `SEPAY_ENV=disabled` **không phải** là "chặn mua" mà là **tự động đánh dấu đã trả tiền**:

- Tạo đơn xong, controller gọi ngay `recordPaid` với `providerEventId: "disabled-autopay:<orderId>"` (`apps/api/src/commerce/commerce.controller.ts:105-118`), cấp entitlement và chạy sinh báo cáo.
- `paymentInstructions` trả `null`, không hiện QR (`:177`).
- Endpoint webhook trả 503 `SEPAY_DISABLED` (`:194`).

Nghĩa là hiện tại **mọi báo cáo đều miễn phí** với bất kỳ ai đi hết luồng.

| ID | Yêu cầu |
|---|---|
| R-DIS-1 | **Không đổi `SEPAY_ENV` khỏi `disabled`** cho tới khi WP-01, WP-02, WP-02B đã merge và test integration xanh. Đây là cổng chặn cụ thể thay cho "chưa tăng traffic". |
| R-DIS-2 | Mọi phép đo doanh thu và KPI phải **loại trừ** đơn có `provider_event_id` bắt đầu bằng `disabled-autopay:`. Chúng nằm chung `commerce_orders` với trạng thái `paid` nhưng không có tiền thật. |
| R-DIS-3 | Khi bật thanh toán, ghi lại mốc thời gian bật để tách cohort trước/sau. Dữ liệu giai đoạn `disabled` không được dùng làm baseline cho FD-038. |

**Điểm thuận lợi:** không có tiền thật đang bị rủi ro hôm nay, nên toàn bộ P0 ở mục 2 và 2B sửa được *trước khi* bật thanh toán. Đây là thứ tự lý tưởng và không tốn thêm gì.

**Cần Founder xác nhận:** giá trị `SEPAY_ENV` đang chạy trên production. Nếu bản deploy công khai đang ở `disabled`, người truy cập thật đang nhận báo cáo 79k miễn phí. Có thể đúng ý (beta miễn phí), có thể không — từ trong repo tôi không kiểm chứng được giá trị đang chạy.

---

## 3. Ladder trong phạm vi đợt này

Chỉ ba tầng dưới đây được phép hiển thị và bán. Mọi thứ khác giữ nguyên `reserved`.

| Tầng | Sản phẩm | SKU ID | Giá | Phạm vi quyền đọc |
|---|---|---|---|---|
| 0 | Lá số + xem trước miễn phí | — | 0đ | Chart, sao/cung, 3 ý nghĩa cá nhân dễ hiểu |
| 1 | **Bản mệnh và tiềm năng** | `ZIWEI-NATAL-EXCERPT-P0` | 19.000đ | `overview`, `coreAxis`, `strengthsAndTensions`, `practicalDirection` |
| 2 | **Luận giải Tử Vi toàn diện** | `ZIWEI-IDENTITY-P0` *(giữ nguyên ID)* | 79k | Toàn bộ tầng 1 + `keyConfigurations`, 12 `palaceReadings`, 4 `thematicSynthesis` |

### 3.1 Vì sao giữ nguyên SKU ID `ZIWEI-IDENTITY-P0` cho sản phẩm 79k

FD-029 quy định bản ghi thương mại là bất biến. `commerce_orders.sku` và `commerce_entitlements.sku` của các đơn đã phát sinh đang mang giá trị `ZIWEI-IDENTITY-P0`. Đổi SKU ID sẽ buộc phải migrate bản ghi bất biến — vi phạm chính nguyên tắc đã duyệt. **SKU ID là định danh kỹ thuật, tên hiển thị là nội dung.** Chỉ đổi tên hiển thị (FD-042).

Tên "Bản mệnh và tiềm năng" hiện đang gắn sai chỗ: nó mô tả đúng một lát cắt cốt lõi, không mô tả báo cáo 12 cung. Chuyển đúng tên đó sang tầng 1 và đặt tên tầng 2 theo đúng thứ đang giao.

### 3.2 Ranh giới nội dung: không thu phí hai lần cho cùng một luận natal

Hai tầng lấy từ **cùng một lần sinh nội dung**, không phải hai lần luận riêng:

- Khi đơn trả phí đầu tiên của một lá số được xác nhận, hệ thống sinh **trọn vẹn** báo cáo toàn diện theo spec 2026-09-07, đúng một lần, một AI call như đã duyệt.
- Entitlement quyết định **phần nào được render**, không quyết định phần nào được sinh ra.
- Nâng cấp tầng 1 → tầng 2 là **mở khoá tức thì, không sinh lại nội dung**, không có độ trễ, không tốn thêm COGS.

Hệ quả bắt buộc phải chấp nhận và theo dõi: một đơn 19k chịu **đúng COGS AI của một báo cáo đầy đủ**. Đây là đánh đổi có chủ ý để (a) tái dùng engine hiện hữu như FD-037 yêu cầu, (b) nâng cấp là tức thì, (c) nội dung tầng 1 không bao giờ mâu thuẫn với tầng 2. Rủi ro biên lợi nhuận được quản bằng guardrail mục 8.

### 3.3 Upgrade Credit (FD-041 Approved 2026-09-09)

- Upgrade credit = **actual amount paid** on an unrefunded `paid` Tier 1 order for the same birth chart.
- Upgrade price = `79,000 VND − credit`, floored at 0.
- Standard flow: Purchase Tier 1 at 19,000 VND → upgrade within 7 days of payment (`paid_at`) by paying 60,000 VND (applying 19,000 VND credit against 79,000 VND).
- Prior Tier 2 ownership: Customers who already purchased Tier 2 retain full access to all Tier 1 sections; never charge additional fees.
- **7-day credit expiration (FD-041):** Upgrade credit expires exactly 7 days after the Tier 1 `paid_at` (paid timestamp), never generic order creation or an ambiguous purchase timestamp. After 7 days from `paid_at`, the credit is void and the full 79,000 VND price applies.
- **Mandatory disclosure requirement:** Because the credit window is bounded, it must be explicitly disclosed at the point of purchase for Tier 1 before payment confirmation (e.g. "Upgrade credit towards the comprehensive report applies for 7 days from payment").
- The credit amount and net upgrade price must be explicitly displayed before the customer confirms: "You paid 19,000 VND. Upgrade today: 60,000 VND (valid for 7 days from payment)."

---

## 4. Mô hình SKU, giá và entitlement

### 4.1 Một nguồn sự thật cho catalog

`PRODUCT_CATALOG` hardcode trong `order.service.ts` phải bị xoá. Giá và SKU đọc từ `config/product-catalog.json` qua một module load + validate bằng Zod khi khởi động, fail-fast nếu sai schema. Lý do: hiện có 6 sản phẩm trong JSON và 1 trong code; hai bảng giá song song là rủi ro thu sai tiền.

### 4.2 Contract SKU

`CommerceSkuSchema` đổi từ `z.literal` sang `z.enum` dẫn xuất từ danh sách SKU **được phép bán** (`availability: "first_paid_flow"`). SKU `reserved` phải bị từ chối ở tầng contract, không chỉ ở UI — đây là cơ chế chặn duy nhất khiến sản phẩm chưa qua QA không thể bị kích hoạt bằng một request thủ công.

### 4.3 Order-Level Pricing And Credit Tracking

`commerce_orders.amount` persists the exact charged amount. The schema additions are:

- `price_variant text` — records price variant. Under FD-048, only the `"19k"` assignment is active in near-term scope; no A/B allocation is implemented.
- `credit_applied integer not null default 0` — credit amount deducted from the list price.
- `credited_from_order_id uuid` — references the Tier 1 order used for upgrade credit, `null` if none.
- `credit_expires_at timestamp with time zone` — records credit expiration timestamp for Tier 1 orders (7 days after `paid_at`).

### 4.4 Entitlement và phạm vi đọc

- Bổ sung `scope jsonb` vào `commerce_entitlements`, chứa danh sách section id được phép đọc.
- Nâng cấp **thêm một entitlement row mới** cho SKU tầng 2; không sửa row tầng 1. Giữ đúng nguyên tắc bản ghi bất biến.
- Quyền đọc của một lá số = hợp của scope mọi entitlement chưa bị hoàn tiền.
- Quyền đã mua **không bao giờ bị thu hồi** bởi hết hạn gói, đổi giá, hay đổi packaging.

---

## 5. Đặc tả luồng và tiêu chí nghiệm thu

### Flow A — Khám phá → lá số miễn phí

| ID | Yêu cầu | Nghiệm thu |
|---|---|---|
| A-1 | Prefill từ homepage sang wizard giữ nguyên ngày/giờ đã nhập; cache cũ không được ghi đè input mới | Nhập ở homepage → wizard hiển thị đúng, 0 trường phải nhập lại |
| A-2 | Ba lựa chọn giờ sinh (chính xác / theo chi / không biết) có giải thích ngắn tại chỗ | Test hiểu: người mới nói đúng khác biệt 3 lựa chọn |
| A-3 | **Không biết giờ: không hiện CTA trả phí Tử Vi** (FD-007). Thay bằng hướng dẫn tìm giờ + lưu hồ sơ để bổ sung sau | Test: profile `branch unresolved` → không render nút mua, render hướng dẫn |
| A-4 | Lỗi tính toán/mất mạng giữ nguyên form, cho retry cùng tác vụ, phân biệt "chưa tạo" với "đã tạo nhưng điều hướng lỗi" | Test: ngắt mạng ở bước tính → dữ liệu còn nguyên |
| A-5 | Free preview hiển thị **3 ý nghĩa cá nhân dễ hiểu trước**, chi tiết sao/cung/Tứ Hoá mở khi cần | Test hiểu: người mới giải thích lại được 1 insight bằng lời của họ |
| A-6 | Khách vãng lai được báo dữ liệu lưu tạm 24 giờ và cách xoá | Có thông báo + đường xoá hoạt động |

### Flow B — Chọn sản phẩm → trả tiền → nhận

| ID | Yêu cầu | Nghiệm thu |
|---|---|---|
| B-1 | Trang chọn hiển thị **tối đa 2 lựa chọn trả phí** liên quan nhu cầu hiện tại, kèm giá VND cuối cùng và mô tả đầu ra không trùng nhau. Không bày bảng toàn bộ danh mục | UI test: người mới thấy đúng 2 offer + free |
| B-2 | Nhãn mua là tên khách hàng hiểu được, không phải SKU nội bộ | Không chuỗi `ZIWEI-*` nào lọt ra UI |
| B-3 | Đã sở hữu → hiện "Đọc lại", **không hiện nút mua**. Hiện tại `ENTITLEMENT_EXISTS` bị nuốt thành `CHECKOUT_ORDER_FAILED` và khách thấy lỗi trắng | Test: chart đã mua → nút "Đọc lại", 0 lỗi |
| B-4 | Active Tier 1 entitlement → Tier 2 upgrade offer displays discounted price and clearly names unlocked sections | Test: Purchase 19,000 VND → upgrade offer displays "60.000đ" within 7 days of Tier 1 `paid_at`; after 7 days displays full 79,000 VND |
| B-5 | Giữ product intent xuyên qua đăng nhập/xác minh email; quay lại đúng offer đã chọn | Test: chọn offer → login → về đúng offer, không phải trang chủ |
| B-6 | Tách bạch **"Đã thanh toán"** và **"Đang tạo báo cáo"** thành hai trạng thái khác nhau về chữ và bố cục | Hai màn phân biệt được, không dùng chung copy |
| B-7 | Không có nút "tôi đã trả" tự mở báo cáo. Chỉ webhook hợp lệ mới xác nhận tiền | Không tồn tại đường mở khoá phía client |
| B-8 | Trang tiến trình không hiện % giả hay thời gian cam kết; khách rời trang được, quay lại bằng mã đơn hoặc thư viện | Không có progress bar bịa |
| B-9 | Refresh trang đơn không tạo đơn mới, không thu thêm | Test: refresh 10 lần → vẫn 1 đơn pending |

### Flow B-lỗi — mọi trạng thái phải có đường ra

| ID | Trạng thái | Hành vi bắt buộc |
|---|---|---|
| BE-1 | `pending` | Giữ nguyên QR và mã đơn cho tới hết TTL 24h. Không đổi mã dưới chân khách |
| BE-2 | `expired` trước khi trả | Nút tạo yêu cầu mới, nói rõ mã đơn mới; mã cũ vẫn tra cứu được |
| BE-3 | Đã chuyển nhưng chưa thấy tiền | Ô tra cứu theo mã đơn, cộng đường tự nhận giao dịch (R-AUTO-12). **Tuyệt đối không hướng dẫn chuyển lại** |
| BE-4 | Sai/thiếu/thừa số tiền hoặc nội dung | Chạy chuỗi tự khớp mục 2B. Còn dư thì hiện "đang đối soát" kèm mã đơn, thời điểm cập nhật và đường tự nhận giao dịch |
| BE-5 | `paid` nhưng report `failed` | Hiện: đã nhận tiền, mã đơn, thời điểm cập nhật, bước xử lý tiếp theo, và nút hỗ trợ **đã điền sẵn mã đơn**. Không biến lỗi xử lý thành cơ hội bán lại |
| BE-6 | `refunded` | Hiện trạng thái hoàn tiền, không render lại nút mua như đơn mới |

### Flow C — Khách đã mua quay lại (nền retention, P0)

| ID | Yêu cầu | Nghiệm thu |
|---|---|---|
| C-1 | `/tai-khoan` sau đăng nhập hiện **thư viện thật**: nhóm theo hồ sơ, mặc định mở báo cáo gần nhất | Thay thế toàn bộ `account-dashboard.tsx` hiện tại |
| C-2 | Mỗi mục thư viện: tên hồ sơ, tên sản phẩm, ngày mua, trạng thái, nút đọc | Test projection có đủ trường |
| C-3 | Trang lịch sử đơn: mã đơn, số tiền, trạng thái, thời điểm, đường hỗ trợ gắn đơn. Lịch sử **bất biến**, hiện đủ cả đơn hết hạn | Phụ thuộc R-PAY-2 |
| C-4 | Đọc lại báo cáo đã mua **luôn miễn phí**, không giới hạn số lần | Test: mở 20 lần → 0 lần bị chặn |
| C-5 | Sửa thông tin sinh: hiện tác động lên báo cáo cũ và điều kiện tạo phiên bản mới **trước** khi xác nhận | Không âm thầm vô hiệu hoá báo cáo đã trả tiền |

### Flow D — Khách đến từ bộ môn khác

| ID | Yêu cầu | Nghiệm thu |
|---|---|---|
| D-1 | Trang bộ môn `reserved` nói rõ **chưa sử dụng được**, cho xem mẫu, có đường quay lại | Không CTA trả phí nào trên trang reserved |
| D-2 | **Không đẩy khách vào wizard Tử Vi** như thể đó là chức năng họ chọn | Test điều hướng: /kinh-dich không dẫn tới birth wizard |
| D-3 | Kinh Dịch dùng câu hỏi + thời điểm gieo, không dùng birth wizard chung | Theo OD-004 |
| D-4 | Compatibility cần hai hồ sơ và consent tương ứng | Theo OD-005 |

### Flow E — Kiến thức và tiện ích miễn phí

| ID | Yêu cầu | Nghiệm thu |
|---|---|---|
| E-1 | Lịch âm, ngày tốt, con giáp đọc được **không cần đăng nhập** | Test ẩn danh: 200, nội dung đầy đủ |
| E-2 | Link sang sản phẩm reserved phải có nhãn trạng thái sẵn sàng rõ ràng | Không link nào hứa mua được thứ chưa mở |
| E-3 | Giấc mơ giữ vai trò nội dung, không chuyển thành số đề | Content review |

### Flow F — Riêng tư và hỗ trợ

| ID | Yêu cầu | Nghiệm thu |
|---|---|---|
| F-1 | Xoá hồ sơ/tài khoản nêu rõ ảnh hưởng tới quyền đọc báo cáo đã mua **trước** khi xác nhận | Có màn xác nhận nêu hệ quả cụ thể |
| F-2 | Nghĩa vụ lưu bản ghi giao dịch được giữ đúng khi xoá dữ liệu cá nhân | Theo FD-029 |
| F-3 | Không dùng quyền lợi còn lại để gây áp lực giữ chân | Copy review |

### Kiểm UI xuyên suốt (bắt buộc trước khi tăng traffic)

Viewport mobile phổ biến + desktop; zoom 200%; font Việt thật đã tải; thứ tự Tab/focus; label và lỗi form; drawer đóng/mở; tương phản chữ trên ảnh; sticky CTA không che nội dung; bàn phím mobile không che trường ngày/giờ; back/refresh/nhiều tab; và **quay lại từ app ngân hàng trên cùng một điện thoại**. Lượt audit này chưa render UI nên chưa kết luận pass/fail bất kỳ mục nào.

---

## 6. Đồng bộ tên gọi và lời hứa

| Vị trí | Hiện tại | Phải đổi thành |
|---|---|---|
| `config/product-catalog.json` `ZIWEI-IDENTITY-P0.name` | "Bản mệnh & tiềm năng" | "Luận giải Tử Vi toàn diện" |
| `config/product-catalog.json` `.sections` | 7 section identity cũ | Danh sách section thật của `ZiweiComprehensiveReportContentV1` |
| `ziwei-presentation.ts` `offers.vi` | "Bản mệnh và tiềm năng" | "Luận giải Tử Vi toàn diện" |
| `ziwei-presentation.ts` `offers.en` | "Identity and potential" | "Comprehensive Zi Wei reading" |
| SKU mới `ZIWEI-NATAL-EXCERPT-P0` | — | vi: "Bản mệnh và tiềm năng" / en: "Core identity and potential" |
| `pricing_status` | `hypothesis_to_test` | Giữ nguyên cho tới khi có dữ liệu cohort thật |

Mô tả trước mua của tầng 2 phải nêu đúng thứ được giao theo spec 2026-09-07: 12 cung, cấu trúc lá số, tổng hợp chủ đề, 2.200–3.200 từ. **Không được hứa dự báo đại vận/năm/tháng/ngày** — spec đã duyệt loại trừ rõ ràng.

---

## 7. Đo lường

### 7.1 Funnel tối thiểu

`landing → wizard_start → wizard_step_complete → chart_success → offer_view → auth_verified → checkout_created → payment_confirmed → report_ready → report_opened → upgrade_view → upgrade_purchased → repeat_purchase`

Đo riêng: `payment_unmatched`, `payment_pending_over_1h`, `report_failed`, `refund`, `support_ticket`.

### 7.2 Ràng buộc riêng tư (không thương lượng)

Không đưa tên, ngày/giờ/nơi sinh, nội dung câu hỏi, hoặc `chart_id` vào công cụ analytics bên thứ ba. Nối dữ liệu thương mại bằng hệ đo nội bộ. Event dùng định danh phiên giả danh; join với commerce chỉ xảy ra phía server.

### 7.3 KPI

- **Chính (FD-038):** lãi đóng góp 30 ngày trên mỗi khách tạo lá số.
  `(Σ doanh thu ghi nhận − hoàn tiền − phí thanh toán − COGS AI kể cả retry − hỗ trợ biến đổi) / số khách tạo lá số trong cohort`
- **Phụ:** tỷ lệ mua đầu, tỷ lệ nâng cấp tầng 1→2, thời gian tới `report_ready` (p50/p95), mua lặp 30 ngày, tỷ lệ hoàn tiền, số ticket/100 đơn, số lỗi trừ tiền hai lần.
- **Bắt buộc trước mọi thử nghiệm giá:** 14 ngày dữ liệu baseline sạch sau khi P0 xong. Không so nhóm SEO với nhóm referral. Không dừng test sớm vì kết quả đẹp.

---

## 8. Guardrail và điều kiện dừng

| Guardrail | Ngưỡng | Hành động |
|---|---|---|
| Tỷ lệ tự khớp thanh toán 24h | < 95% (mẫu ≥ 20 giao dịch) | **Cầu dao tự ngắt** tạo đơn mới (R-AUTO-18) |
| Giao dịch chưa có chủ quá 6 giờ | ≥ 3 vụ | **Cầu dao tự ngắt** tạo đơn mới (R-AUTO-18) |
| Tầng 5 phát cảnh báo | > 1 lần/tuần | Tầng 1–4 đang hỏng, sửa gốc thay vì xử lý tay |
| Tỷ lệ COGS trên giá tầng 1 | > 40% | Dừng nhánh 19k, đánh giá lại |
| Thay thế đơn 79k | Lãi đóng góp/khách giảm so với baseline | Dừng micro-offer, quay về baseline A |
| Yêu cầu tự nhận giao dịch | > 5/100 đơn | Tầng 1–3 đang yếu, sửa trước khi tăng traffic |
| Lỗi số dư / trừ lặp | > 0 | Dừng ngay hạng mục liên quan |
| Trùng nội dung giữa các tầng | Bất kỳ báo cáo nào | Dừng upsell của cặp sản phẩm đó |

---

## 9. Ngoài phạm vi đợt này

Ví và điểm "Điểm Việt" (FD-039). Rewarded ads. Affiliate. Hệ nhiệm vụ. Gói hội viên. Bundle Tử Vi + Bát Tự 129k. Câu hỏi tình huống mới (tầng 3). Vận trình năm (tầng 4, chờ engine thời gian + QA). Bát Tự (gate P8). Natal Tây (gate P9). Chuyên gia người thật. Xem chỉ tay. Nhân tướng.

Ràng buộc thiết kế duy nhất phải giữ cho tương lai: R-PAY-3 và mục 4.4 phải làm sao cho việc bổ sung ví, mua lặp cùng SKU, và sản phẩm theo năm về sau **không cần migrate bản ghi thương mại bất biến**.

---

## 10. Founder Decisions — Ratified 2026-09-09

All open items in this section were resolved via direct founder interview on 2026-09-09. Full details are recorded in `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md`.

| # | Original Open Item | Ratified Outcome |
|---|---|---|
| 1 | Approve FD-040, FD-041, FD-042 | FD-040 and FD-042 approved as proposed. FD-041 approved with 7-day expiration window from Tier 1 `paid_at` and mandatory point-of-purchase disclosure. |
| 2 | Tier 1 pricing (19k vs 29k vs A/B) | Fixed at single price 19,000 VND (FD-048); no A/B testing in this release. |
| 3 | Economic data (AI COGS, payment fees, refund rate, traffic ramp) | No live traffic yet; working assumptions established from VN market research (see round-2 doc appendix). |
| 4 | Approve FD-044 and FD-045 | FD-044 approved as proposed. FD-045 odd-unit surcharge rejected; replaced with narrow-window (+/- 15 min) customer self-claim (R-AUTO-8..10). |
| 5 | Out-of-band alert channel for Tier 5 and circuit breaker | Telegram bot posting to shared Harris/An operations group with 6-hour founder response SLA (FD-047). |
| 6 | Unmatched funds disposition | Held pending indefinite customer self-claim; no manual refund workflow required (FD-046). |

Additional ratified decisions from the round-2 interview:
- FD-049 through FD-054: Complete analytics event migration to WP-10 names, pre-consent anonymous technical logging only, self-hosted PostgreSQL primary storage, pseudonymous session ID without rotation, strict privacy boundaries on third-party exports, joint Harris/An dashboard ownership.
- FD-055: Approved UI artifact branch is `product/discipline-flagship-pages`; verified ancestry confirms no preliminary merge required; UI branches start from `product/experience-spec-v1`.
- FD-056: Harris visual QA single sign-off for WP-13.
