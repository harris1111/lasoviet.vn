# Experience & Ladder — Backlog nhiệm vụ

**Ngày:** 2026-09-08
**Spec nguồn:** `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md`
**Base commit:** `6e6ff06`
**Vai trò:** Product (Harris) sở hữu spec và tiêu chí nghiệm thu. Development (An) sở hữu implementation plan, kiến trúc chi tiết và test strategy cho từng WP.
**Cách dùng:** mỗi work package dưới đây là đầu vào cho một implementation plan riêng theo `superpowers:writing-plans`. Không gộp nhiều WP vào một PR.

---

## Thứ tự thực thi

```
P0  WP-01 ─┬─ WP-02 ── WP-02B      [đường tiền tự vận hành]
           ├─ WP-03
           └─ WP-04 ── WP-05
     WP-06 (song song)

P0  WP-07  ← cần WP-04
P0  WP-13  ← cần WP-01, WP-03, WP-06   [chặn mọi việc tăng traffic]

P1  WP-08 ── WP-09   ← cần WP-04, WP-07
P1  WP-10 (song song)
P1  WP-11 (song song)
P1  WP-14  ← cần WP-01, WP-03, WP-06   [Product sở hữu]

P2  WP-12  ← cần toàn bộ P0 + P1
```

**Cổng chặn:** không WP nào từ WP-07 trở đi được bắt đầu trước khi WP-01, WP-02 và WP-02B đã merge và có test integration xanh.

**Cổng bật thanh toán (R-DIS-1):** `SEPAY_ENV` đang là `disabled`, nghĩa là đơn được tự đánh dấu đã trả và báo cáo phát miễn phí. **Không đổi giá trị này** cho tới khi WP-01, WP-02, WP-02B merge xong. Không có tiền thật đang bị rủi ro hôm nay, nên sửa trước rồi mới bật là thứ tự không tốn gì.

**Ràng buộc bao trùm (FD-043):** không có người trực đối soát thanh toán. Mọi WP chạm đường tiền phải tự phục hồi, và nơi nào không tự phục hồi được thì phải tự ngừng bán chứ không được âm thầm nhận tiền. Không được đề xuất giải pháp có bước "vận hành xử lý tay".

---

# GIAI ĐOẠN P0 — An toàn tiền và nền hậu thanh toán
*Mục tiêu: không mất tiền của khách, và khách tìm lại được thứ đã mua. Không mở thử nghiệm giá trong giai đoạn này.*

## WP-01 — Danh tính thanh toán bất biến `[P0-CRITICAL]`

**Vấn đề:** mã đơn vừa là nội dung chuyển khoản vừa là khoá đối chiếu webhook, nhưng bị ghi đè khi mở lại đơn. Khách chuyển tiền bằng mã cũ → `ORDER_NOT_FOUND` → mất tiền, không dấu vết. Chi tiết mục 2 của spec.

**Phạm vi file:**
- `packages/database/src/schema/commerce.ts` — bỏ unique `(chart_id, sku)`, thêm partial unique `(chart_id, sku) WHERE status='pending'`
- `packages/database/drizzle/` — migration mới
- `packages/backend/src/commerce/commerce.repository.ts:120-200` — mở lại đơn = INSERT row mới, không UPDATE `invoice_number`
- `packages/backend/src/commerce/commerce.repository.ts:229-280` — `recordPaid` chấp nhận đơn `expired` khi khớp mã và số tiền, miễn chưa có entitlement
- `packages/backend/src/commerce/commerce.repository.ts:63` — nâng mặc định TTL lên 86400 (cơ chế env `SEPAY_ORDER_TTL_SECONDS` đã có sẵn, chỉ đổi giá trị mặc định và `.env.example`)

**Nghiệm thu:** R-PAY-1, R-PAY-2, R-PAY-3, R-PAY-4, R-PAY-6.

**Test bắt buộc:**
1. Mở lại đơn hết hạn → 2 row, row cũ giữ nguyên `invoice_number` và `status='expired'`.
2. Trả tiền tại `t0 + 60 phút` với mã đơn đúng → `paid`, entitlement được cấp, job sinh báo cáo được enqueue.
3. Trả tiền vào mã đơn **cũ** sau khi đã có đơn mới → khớp đúng đơn cũ, cấp entitlement, đơn mới bị huỷ, **không** cấp hai entitlement.
4. Hai webhook đồng thời cho hai mã đơn cùng `(chart, sku)` → đúng một entitlement, cái còn lại vào hàng đợi hoàn tiền.
5. Partial unique index: nhiều `expired` cùng tồn tại; chỉ một `pending`.

**Rủi ro:** migration chạm bảng thương mại đang có dữ liệu thật. Cần backup + dry-run trên bản sao production trước.

---

## WP-02 — Automated Reconciliation Engine, Tiers 1–2 `[P0-CRITICAL]`

**Context:** FD-043 — No staffed payment reconciliation. Operational manual review queues are eliminated. Detailed in section 2B of the spec.

**Problem:** Payment matching is currently too brittle to run unattended:
- Extracts only the first token from transfer memo content (`sepay-webhook.service.ts:191`), whereas Vietnamese banking apps often prepend bank prefixes.
- Punctuation like `:` causes the entire webhook to return `SEPAY_PAYLOAD_INVALID` (`:193`) with nothing recorded.
- Matching uses case-sensitive `eq()`, whereas order identifiers are 40-character lowercased UUIDs with hyphens.

**File scope:**
- `packages/database/src/schema/commerce.ts` — add `payment_code text unique` to `commerce_orders`; create `commerce_unmatched_payments` table (`id`, `provider_event_id` unique, `raw_payload jsonb`, `amount`, `reason`, `received_at`, `claimed_by_order_id`, `claimed_at`); add `match_method text` to `commerce_payment_events`.
- `packages/backend/src/commerce/payment-code.ts` — **new file**: generate Crockford base32 codes, calculate and verify checksum character, normalize and extract code from noisy content.
- `packages/backend/src/commerce/sepay-webhook.service.ts:191-193` — replace first-token extraction with full-string regex scan; remove error response branch when parsing fails.
- `packages/backend/src/commerce/commerce.repository.ts:237` — match by normalized `payment_code`; record unparseable/unmatched payments in `commerce_unmatched_payments`.
- `packages/backend/src/commerce/payment-instructions.ts:67,79` — QR and transfer instructions display `payment_code`.

**Acceptance:** R-AUTO-1 through R-AUTO-8, R-PAY-5.

**Required tests:**
1. Content `"CT DEN:513423 LSVK7M2P9QX4 CHUYEN TIEN"` extracts `LSVK7M2P9QX4`.
2. Content transformed to uppercase and stripped of hyphens still matches.
3. Completely corrupted content records 1 row in `commerce_unmatched_payments`, returns HTTP 200, never throws.
4. Payment code with invalid checksum fails match and never guesses another order.
5. Payment without valid payment code is persisted as unmatched in `commerce_unmatched_payments` and never auto-assigned from amount alone (R-AUTO-8).
6. Duplicate `provider_event_id` is idempotent and never creates a duplicate row.

**Dependencies:** WP-01 (immutable order codes are prerequisite for all matching).

**Ratified decisions (2026-09-09):** FD-044 approved (12-character Crockford code). FD-045 odd-unit surcharge rejected; blind amount matching eliminated; unparseable transactions proceed to Tier 4 self-claim (WP-02B).

---

## WP-02B — Customer Self-Claim, Alerting, And Circuit Breaker `[P0-CRITICAL]`

**Context:** Direct replacement for manual operations. Tiers 4–5 and circuit breaker in section 2B of the spec.

**File scope:**
- `apps/web/` — "Claim Unmatched Payment" interface: input exact transferred amount and transfer timestamp to minute precision in `Asia/Ho_Chi_Minh`.
- `packages/backend/src/commerce/` — automated self-claim evaluation logic enforcing R-AUTO-8 through R-AUTO-10.
- `packages/database/src/schema/notifications.ts:13-16` — extend `notification_delivery_kind` with `payment_unmatched_alert`, `checkout_circuit_open`, `report_ready`, `report_terminal_failure`.
- `packages/backend/src/commerce/` — rolling 24-hour auto-match rate calculation and circuit breaker management.
- `apps/web/` — "payments temporarily paused" page when circuit breaker opens.

**Automated approval rules (R-AUTO-9, R-AUTO-10, R-AUTO-13):**
Auto-approval requires that all of the following conditions hold simultaneously:
1. Customer has exactly one eligible unfulfilled order under their authenticated account matching the transferred amount.
2. Order amount matches candidate payment amount exactly.
3. Customer supplies a transfer timestamp to minute precision in `Asia/Ho_Chi_Minh`, and the candidate payment `received_at` falls within plus/minus 15 minutes of that timestamp.
4. The candidate payment in `commerce_unmatched_payments` is currently unclaimed.
5. Exactly one candidate payment matches these criteria, and exactly one eligible unfulfilled order for that owner matches. If zero or multiple candidate payments or orders match, entitlement is not granted, the payment remains unmatched in `commerce_unmatched_payments`, and it becomes eligible for Tier 5 stale alerting only after remaining pending >6 hours under R-AUTO-15 (no immediate Telegram alert or manual queue).

**Acceptance:** R-AUTO-9 through R-AUTO-19.

**Required tests:**
1. Authenticated customer with unfulfilled 79,000 VND order submits exact amount and transfer timestamp within +/- 15 minutes of an unclaimed 79,000 VND payment -> exactly one candidate payment and one order match -> auto-approves, grants entitlement, enqueues report generation, sets `match_method = 'self_claim'`.
2. Two candidate payments match exact amount and time window -> do not auto-approve, entitlement not granted, payment remains unmatched; becomes eligible for Tier 5 alerting only after pending >6 hours under R-AUTO-15.
3. Customer submits amount with no matching unclaimed payment in the +/- 15-minute window -> denied with "payment not found", never disclosing whether unmatched payments exist.
4. Two eligible owner orders match the claimed amount -> do not auto-approve, entitlement not granted, payment remains unmatched; becomes eligible for Tier 5 alerting only after pending >6 hours under R-AUTO-15.
5. Rate limiting: 6th claim request in a single day for an account is blocked.
6. An unmatched payment once claimed cannot be claimed a second time.
7. Rolling 24-hour auto-match rate drops below 95% (min 20 samples) or >=3 unclaimed transactions pending >6 hours -> circuit breaker opens, `createCheckoutOrder` is blocked, Telegram alert fires.
8. Open circuit breaker never automatically resets over time; requires explicit manual reactivation.
9. Focused frozen/injected-clock test for R-AUTO-15: one unmatched payment produces no Telegram alert at <=6 hours from `received_at`, and produces the Tier 5 alert only after >6 hours.

**Dependencies:** WP-02.

**Ratified decisions (2026-09-09):** FD-046 (unmatched funds held pending indefinite customer self-claim without manual refund workflow). FD-047 (out-of-band alert channel is Telegram bot to Harris/An operations group, 6-hour founder response SLA; uses `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` environment variables).

---

## WP-03 — Thư viện và lịch sử đơn `[P0]`

**Vấn đề:** `account-dashboard.tsx` chỉ có nút đăng nhập. Khách không có đường tìm lại thứ đã mua — chặn toàn bộ retention và mọi tầng ladder về sau.

**Phạm vi file:**
- `packages/contracts/src/` — contract mới `AccountLibraryV1`, `OrderHistoryV1`
- `packages/backend/src/commerce/commerce.repository.ts` — projection thư viện: entitlement ⋈ order ⋈ report ⋈ birth_profile
- `apps/api/src/` — endpoint đọc, giới hạn theo owner
- `apps/web/src/features/account/account-dashboard.tsx` — viết lại
- Trang lịch sử đơn mới

**Nghiệm thu:** C-1, C-2, C-3, C-4.

**Test bắt buộc:** owner A không đọc được thư viện của owner B; đơn `expired` vẫn hiện trong lịch sử; mở lại báo cáo 20 lần không bị chặn.

**Phụ thuộc:** WP-01 (lịch sử nhiều đơn chỉ đúng sau khi bảng order thành append-only).

---

## WP-04 — Catalog một nguồn sự thật + contract SKU mở rộng `[P0]`

**Vấn đề:** `PRODUCT_CATALOG` hardcode 1 sản phẩm trong `order.service.ts:3-10` song song với `config/product-catalog.json` 6 sản phẩm. `CommerceSkuSchema` là `z.literal`, chặn cứng ladder ở tầng contract.

**Phạm vi file:**
- `packages/contracts/src/commerce.ts:3` — `z.literal` → `z.enum` dẫn xuất từ SKU `availability: "first_paid_flow"`
- `packages/backend/src/commerce/order.service.ts:3-10` — xoá hardcode, load từ config + validate Zod, fail-fast khi khởi động
- `config/product-catalog.json` — thêm `ZIWEI-NATAL-EXCERPT-P0`

**Nghiệm thu:** mục 4.1, 4.2 của spec.

**Test bắt buộc:** request tạo đơn với SKU `reserved` → bị từ chối ở tầng contract, không tới được DB; catalog sai schema → app không khởi động được.

---

## WP-05 — Đồng bộ tên gọi và lời hứa `[P0]`

**Vấn đề:** sản phẩm 79k được quảng bá là "Bản mệnh & tiềm năng" nhưng giao báo cáo toàn diện 12 cung. Kỳ vọng trước mua lệch đầu ra.

**Phạm vi file:**
- `config/product-catalog.json` — `name` và `sections` của `ZIWEI-IDENTITY-P0`
- `apps/web/src/features/ziwei/ziwei-presentation.ts:147-149` — chuỗi offer vi/en
- Copy trang chọn mua

**Quan trọng:** **không đổi SKU ID** `ZIWEI-IDENTITY-P0`. Chỉ đổi tên hiển thị (FD-042). Đổi ID sẽ buộc migrate bản ghi thương mại bất biến, vi phạm FD-029.

**Nghiệm thu:** mục 6 của spec.

**Test bắt buộc:** không chuỗi `ZIWEI-*` nào xuất hiện trong UI; mô tả tầng 2 không chứa lời hứa dự báo đại vận/năm/tháng/ngày.

---

## WP-06 — Đường ra cho mọi trạng thái lỗi thanh toán `[P0]`

**Vấn đề:** report `failed` chỉ có `mailto:` (`report-progress.tsx:45`). Khách đã trả tiền phải tự soạn mail mà không biết mã đơn.

**Phạm vi file:**
- `apps/web/src/features/reports/report-progress.tsx` — trạng thái `failed` hiện mã đơn, xác nhận đã nhận tiền, thời điểm cập nhật, bước tiếp theo, nút hỗ trợ điền sẵn mã đơn
- `apps/web/src/features/commerce/vietqr-checkout.tsx` — copy cảnh báo không chuyển lại
- Trang tra cứu theo mã đơn
- Tách `paid` và `generating` thành hai màn riêng biệt
- Email "báo cáo đã sẵn sàng" để khách không phải ngồi canh tab (R-AUTO-20)
- `terminal_failure` trên đơn đã trả tiền tự động báo Founder trong 15 phút (R-AUTO-21)

**Nghiệm thu:** BE-1 → BE-6, B-6, B-8, R-AUTO-20 → R-AUTO-22.

**Đã có sẵn, đừng xây lại:** retry sinh báo cáo đã tồn tại (`report.service.ts:132,188` với `attemptCount`, `retryable_failure`, `terminal_failure`). WP này chỉ nối thông báo và màn hình vào cơ chế đó. Retry **không bao giờ** được thu thêm tiền hay tạo đơn mới (R-AUTO-22).

**Test bắt buộc:** mỗi trạng thái `pending`/`expired`/`paid`/`generating`/`failed`/`refunded` render đúng một màn có đường ra; không tồn tại nút client-side mở khoá báo cáo.

---

## WP-07 — Sửa lỗi luồng chọn mua `[P0]`

**Vấn đề:** `PaidTopicSelector` chỉ render `offers[0]`; `createCheckoutOrder` hardcode SKU; đã mua rồi vẫn hiện nút mua và nhận lỗi trắng `CHECKOUT_ORDER_FAILED`.

**Phạm vi file:**
- `apps/web/src/features/reports/paid-topic-selector.tsx:19` — render nhiều offer, tối đa 2
- `apps/web/src/features/commerce/create-checkout-order.ts:34` — nhận `sku` làm tham số
- `create-checkout-order.ts:36` — xử lý `ENTITLEMENT_EXISTS` thành "Đọc lại", không ném lỗi
- Giữ product intent qua đăng nhập

**Nghiệm thu:** B-1, B-2, B-3, B-5, B-9.

**Phụ thuộc:** WP-04.

---

# GIAI ĐOẠN P1 — Micro-offer và ladder
*Chỉ bắt đầu sau khi P0 merge xong và có 14 ngày baseline funnel sạch.*

## WP-08 — Entitlement theo phạm vi + trích phần natal `[P1]`

**Phạm vi file:**
- `packages/database/src/schema/commerce.ts` — thêm `scope jsonb` vào `commerce_entitlements`
- `packages/backend/src/reports/` — render theo scope; sinh nội dung **một lần đầy đủ**, gate ở tầng đọc
- `apps/web/src/features/reports/comprehensive-report-reader.tsx` — hiện section đã mở, khoá phần còn lại kèm tiêu đề để thấy giá trị nâng cấp
- `config/product-catalog.json` — scope của `ZIWEI-NATAL-EXCERPT-P0`

**Ranh giới nội dung (spec 3.2):**
- Tầng 1: `overview`, `coreAxis`, `strengthsAndTensions`, `practicalDirection`
- Tầng 2 thêm: `keyConfigurations`, 12 `palaceReadings`, 4 `thematicSynthesis`

**Nghiệm thu:** mục 3.2, 4.4.

**Test bắt buộc:** entitlement tầng 1 → API **không trả** nội dung 12 cung (kiểm ở tầng server, không chỉ ẩn ở UI); quyền đọc = hợp của mọi entitlement chưa hoàn tiền.

**Lưu ý COGS:** một đơn 19k gánh đúng COGS một báo cáo đầy đủ. Phải bật đo trước khi bán.

---

## WP-09 — Discounted Upgrade `[P1]`

**File scope:**
- `packages/database/src/schema/commerce.ts` — `price_variant`, `credit_applied`, `credited_from_order_id`, `credit_expires_at` on `commerce_orders`.
- `packages/backend/src/commerce/order.service.ts` — calculate upgrade price and evaluate 7-day credit expiration from Tier 1 `paid_at`.
- `apps/web/src/features/reports/paid-topic-selector.tsx` — display applied credit, 7-day expiration notice, and net upgrade price.

**Rules (FD-041 Approved 2026-09-09):**
- Upgrade credit = actual amount paid on an unrefunded `paid` Tier 1 order for the same chart.
- Upgrade price = `79,000 VND − credit`, floored at 0.
- **7-day expiration:** Credit expires exactly 7 days after the Tier 1 `paid_at` (paid timestamp), never generic order creation or an ambiguous purchase timestamp. After expiry, the full 79,000 VND price applies.
- **Mandatory point-of-purchase disclosure:** The 7-day limit must be clearly stated at the Tier 1 checkout point prior to payment confirmation.
- Upgrading unlocks Tier 2 sections immediately without regenerating report content.

**Acceptance:** B-4, section 3.3.

**Required tests:**
1. Purchase Tier 1 (19,000 VND) -> upgrade within 7 days of Tier 1 `paid_at` is 60,000 VND (applying 19,000 VND credit against 79,000 VND).
2. Purchase Tier 1 (19,000 VND) -> upgrade after 7 days of Tier 1 `paid_at` displays full 79,000 VND (credit expired).
3. Prior Tier 2 ownership -> never display Tier 1 offer.
4. Refunded Tier 1 order -> no upgrade credit granted.

---

# GIAI ĐOẠN P1 — Đo lường (chạy song song)

## WP-10 — Funnel And KPI Instrumentation `[P1]`

**File scope:**
- `packages/contracts/src/analytics-event-v1.ts` — canonical event names.
- `config/analytics-events.json` — full migration to new event registry; no dual-write (FD-049).
- `apps/web/` and `apps/api/` — event dispatch points with analytics consent gate.
- `packages/database/src/schema/` — dedicated analytics storage tables in PostgreSQL (FD-051).

**Canonical funnel events:** `landing`, `wizard_start`, `wizard_step_complete`, `chart_success`, `offer_view`, `auth_verified`, `checkout_created`, `payment_confirmed`, `report_ready`, `report_opened`, `upgrade_view`, `upgrade_purchased`, `repeat_purchase`, `payment_unmatched`, `payment_pending_over_1h`, `report_failed`, `refund`, `support_ticket`.

**Ratified decisions (FD-049 through FD-054, 2026-09-09):**
- Full migration: Migrate `config/analytics-events.json` completely to new event names; no parallel dual event systems (FD-049).
- Consent gate: Pre-consent logging is strictly restricted to anonymous technical events (page errors, health checks); no canonical funnel events fire pre-consent (FD-050).
- Storage: Primary long-term storage is PostgreSQL within existing infrastructure; ClickHouse and third-party SaaS are not used (FD-051).
- Session ID: Analytics session ID is pseudonymous, distinct from account ID / internal primary keys, with no periodic rotation required (FD-052).
- Third-party boundary: Behavioral and commercial data may be exported to external optimization tools; name, exact birth date/time/place, free-text questions, and `chart_id` must never leave self-hosted infrastructure (FD-053).
- Ownership: Dashboard and legacy-to-new event mapping are jointly owned by Harris and An (FD-054).
- Mandatory exclusion (R-DIS-2): All revenue and margin KPI queries must filter out orders where `provider_event_id` begins with `disabled-autopay:`.

**Acceptance:** Section 7.

**Required tests:**
1. Automated payload scan fails if any third-party export payload contains prohibited fields (`name`, birth date/time/place, free-text questions, `chart_id`).
2. Canonical funnel events are suppressed prior to analytics consent.
3. Disabled-autopay orders are excluded from revenue and 30-day contribution margin calculations.

---

## WP-11 — Đường ra khi không biết giờ sinh `[P1]`

**Vấn đề:** FD-007 cấm bán Tử Vi khi chưa xác định chi giờ, nhưng khách rơi vào nhánh này hiện không có bước tiếp theo.

**Phạm vi file:**
- `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- `apps/web/src/features/reports/free-identity-preview.tsx`

**Quy tắc:** không CTA trả phí Tử Vi; hướng dẫn tìm giờ sinh; cho lưu hồ sơ để bổ sung sau; **tuyệt đối không tự gán giờ để hoàn tất funnel**.

**Nghiệm thu:** A-3.

---

# GIAI ĐOẠN P2 — Thử nghiệm giá
*Chỉ mở sau khi WP-01 → WP-11 xong, guardrail mục 8 đã bật, cầu dao tự ngắt đã chạy thật, và tỷ lệ tự khớp thanh toán giữ trên 95% liên tục 14 ngày.*

## WP-12 — Pricing Experimentation `[P2, Deprioritized 2026-09-09]`

**Ratified status (FD-048):** Tier 1 micro-offer is priced and tested at exactly 19,000 VND as a single price point. WP-12 is deprioritized from near-term implementation and retained in the backlog as a future experiment only after live traffic is established. In near-term scope, `price_variant` is assigned only `"19k"`, and no A/B allocation logic is implemented.

**Future rules (if reopened):** Identical output, identical traffic source, deterministic allocation by `chart_id` hash so a customer never observes two prices for the same chart. Measure primary KPI (30-day contribution margin per chart-creating customer, FD-038).

**Stop conditions:** Per guardrail table in spec section 8 (e.g. COGS/price > 40%).

---

# GIAI ĐOẠN XUYÊN SUỐT — Kiểm chứng

## WP-13 — Cross-Cutting Visual QA Pass `[P0, Blocks Traffic Scale]`

**Context:** The initial audit inspected source code without rendering views. Visual pass/fail criteria require end-to-end rendering verification before scaling traffic.

**Scope of checks:**
- Common mobile viewports (360, 390, 414) and desktop; 200% zoom.
- Vietnamese fonts loaded with proper diacritic glyph coverage; no fallback rendering.
- Tab order and focus ring integrity across the checkout and purchasing flow.
- Form field labels and inline validation messages; errors anchored to fields.
- Mobile soft keyboard does not occlude birth date/time inputs.
- Drawer open/close and sticky CTA do not obscure primary content.
- Text contrast over background patterns and images.
- Browser back / refresh / multi-tab concurrency.
- **Return from banking app on a single mobile device** — critical real-world payment flow.

**Ownership and Sign-Off (FD-056):** An executes checks and provides screenshot-backed pass/fail evidence; Harris signs off alone.

**UI Artifact Branch (FD-055):** The official UI artifact branch is `product/discipline-flagship-pages`. On 2026-09-09, Git inspection verified that `product/bg-texture-consistency` and `product/homepage-content-rewrite` are ancestors of `product/discipline-flagship-pages`, which in turn is an ancestor of `product/experience-spec-v1`. No preliminary UI branch merge is required; implementation branches start from `product/experience-spec-v1` with the flagship artifact as binding.

**Acceptance:** Spec cross-cutting UI criteria. Output is a screenshot-backed pass/fail report.

**Available tooling in repo:** `tests/e2e/` contains Playwright test infrastructure.

---

## WP-14 — Nghiên cứu người dùng vòng 1 `[P1, Product sở hữu]`

**Chủ sở hữu:** Harris/Product. Không phải việc của An.

**Mẫu:** 8–12 người, chia ba nhóm: người mới, người mua bói định kỳ, người đọc sâu. Đây là nghiên cứu khám phá vấn đề — **không được dùng mẫu này để tuyên bố tỷ lệ toàn thị trường**.

**Nhiệm vụ cho người tham gia:**
1. Lập lá số
2. Tìm và giải thích lại ý nghĩa một insight bằng lời của họ
3. Chọn giữa mức giá tầng 1 và 79k, nói lý do
4. Giải thích họ nghĩ mình sẽ nhận được gì
5. Thanh toán trên cùng một điện thoại trong môi trường thử
6. Tìm lại báo cáo đã mua
7. Xử lý tình huống "đã chuyển tiền nhưng chưa thấy báo cáo"

**Quan sát:** thời gian, số lần quay lại, điểm hiểu sai, câu hỏi phát sinh trước khi mua.

**Ranh giới:** dùng giá giả lập để kiểm khả năng hiểu; đo willingness-to-pay chỉ bằng test có thanh toán thật. Ý định nói ra không thay thế hành vi mua.

**Phụ thuộc:** nhiệm vụ 5, 6, 7 chỉ chạy được sau khi WP-01, WP-03, WP-06 xong.

---

## Additional Housekeeping Items

- Stray `--full-page` file at repo root (PNG 1440x900, untracked, produced by a misparsed CLI screenshot flag) — confirm and clean up.
- `docs/20-deep-research-ta-social-listening-handoff.md` is excluded from this reconciliation and remains a separate documentation task.
