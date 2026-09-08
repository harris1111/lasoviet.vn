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

## WP-02 — Máy đối soát tự động, tầng 1–3 `[P0-CRITICAL]`

**Bối cảnh:** FD-043 — không có người trực đối soát. Thiết kế "hàng đợi cho vận hành" bị loại. Chi tiết mục 2B của spec.

**Vấn đề:** khâu khớp tiền hiện quá giòn để chạy không người trông:
- Chỉ lấy token đầu tiên của nội dung chuyển khoản (`sepay-webhook.service.ts:191`), trong khi app ngân hàng VN hay chèn tiền tố trước nội dung khách gõ.
- Nội dung có ký tự lạ như dấu `:` làm cả webhook trả `SEPAY_PAYLOAD_INVALID` (`:193`) và **không ghi lại gì**.
- Khớp bằng `eq()` phân biệt hoa thường, trong khi mã đơn là UUID chữ thường có dấu gạch, dài 40 ký tự.

**Phạm vi file:**
- `packages/database/src/schema/commerce.ts` — thêm `payment_code text unique` vào `commerce_orders`; bảng mới `commerce_unmatched_payments` (`id`, `provider_event_id` unique, `raw_payload jsonb`, `amount`, `reason`, `received_at`, `claimed_by_order_id`, `claimed_at`); thêm `match_method text` vào `commerce_payment_events`
- `packages/backend/src/commerce/payment-code.ts` — **file mới**: sinh mã Crockford base32, tính và kiểm ký tự kiểm tra, chuẩn hoá + trích mã từ nội dung nhiễu
- `packages/backend/src/commerce/sepay-webhook.service.ts:191-193` — thay trích token đầu bằng quét regex toàn chuỗi; bỏ nhánh trả lỗi khi không parse được
- `packages/backend/src/commerce/commerce.repository.ts:237` — khớp theo `payment_code` đã chuẩn hoá; thêm khớp dự phòng theo số tiền
- `packages/backend/src/commerce/payment-instructions.ts:67,79` — QR và nội dung dùng `payment_code`

**Nghiệm thu:** R-AUTO-1 → R-AUTO-10, R-PAY-5.

**Test bắt buộc:**
1. Nội dung `"CT DEN:513423 LSVK7M2P9QX4 CHUYEN TIEN"` → trích đúng `LSVK7M2P9QX4`.
2. Nội dung đã bị viết hoa và lược gạch → vẫn khớp.
3. Nội dung rác hoàn toàn → **ghi 1 row unmatched**, HTTP 200, không ném lỗi.
4. Mã sai ký tự kiểm tra → không khớp, không tự đoán sang đơn khác.
5. Không có mã, đúng một đơn khớp số tiền trong 24h → tự khớp, `match_method='amount'`.
6. Không có mã, **hai** đơn cùng số tiền → không khớp cái nào, ghi unmatched.
7. `provider_event_id` trùng → không tạo row thứ hai.

**Phụ thuộc:** WP-01 (mã đơn bất biến là tiền đề của mọi việc khớp).

**Chờ Founder:** FD-044 (mã ngắn), FD-045 (số lẻ định danh làm giá hiển thị lẻ).

---

## WP-02B — Khách tự nhận giao dịch, cảnh báo và cầu dao `[P0-CRITICAL]`

**Bối cảnh:** đây là phần thay thế trực tiếp cho người trực. Tầng 4–5 và cầu dao ở mục 2B của spec.

**Phạm vi file:**
- `apps/web/` — trang "Tôi đã chuyển tiền nhưng chưa nhận báo cáo": nhập số tiền + ngày chuyển
- `packages/backend/src/commerce/` — logic tự duyệt yêu cầu nhận giao dịch
- `packages/database/src/schema/notifications.ts:13-16` — mở rộng `notification_delivery_kind` thêm `payment_unmatched_alert`, `checkout_circuit_open`, `report_ready`, `report_terminal_failure`
- `packages/backend/src/commerce/` — job tính tỷ lệ tự khớp trượt 24h và đóng/mở cầu dao
- `apps/web/` — trang "tạm ngừng nhận thanh toán" khi cầu dao mở

**Quy tắc tự duyệt (R-AUTO-13):** chỉ tự cấp quyền khi **đồng thời** đúng cả bốn: khách có đơn chưa fulfil; số tiền khớp tuyệt đối; giao dịch chưa ai nhận; chỉ có đúng một giao dịch khớp.

**Nghiệm thu:** R-AUTO-11 → R-AUTO-19.

**Test bắt buộc:**
1. Khách có đơn 79.348đ chưa fulfil + tồn tại giao dịch 79.348đ chưa ai nhận → tự duyệt, cấp entitlement, chạy báo cáo.
2. Hai giao dịch cùng số tiền → **không** tự duyệt.
3. Khách B yêu cầu nhận giao dịch của khách A (số tiền không khớp đơn của B) → từ chối, **không** tiết lộ giao dịch đó tồn tại.
4. Yêu cầu thứ 6 trong ngày của một tài khoản → bị chặn.
5. Một giao dịch đã bị nhận → không nhận lại được lần hai.
6. Tỷ lệ tự khớp tụt dưới 95% với 20 mẫu → cầu dao mở, `createCheckoutOrder` bị chặn, cảnh báo phát ra.
7. Cầu dao đã mở → **không** tự đóng lại theo thời gian.

**Phụ thuộc:** WP-02.

**Chờ Founder:** kênh nhận cảnh báo out-of-band.

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

## WP-09 — Nâng cấp có khấu trừ `[P1]`

**Phạm vi file:**
- `packages/database/src/schema/commerce.ts` — `price_variant`, `credit_applied`, `credited_from_order_id` trên `commerce_orders`
- `packages/backend/src/commerce/order.service.ts` — tính giá nâng cấp
- `apps/web/src/features/reports/paid-topic-selector.tsx` — hiện số tiền đã trả và giá nâng cấp

**Quy tắc:** khấu trừ = tiền thực trả trên đơn tầng 1 `paid` chưa hoàn của cùng lá số; giá nâng cấp = `79000 − khấu trừ`, sàn 0; không hạn sử dụng (FD-041); nâng cấp mở khoá tức thì, **không sinh lại nội dung**.

**Nghiệm thu:** B-4, mục 3.3.

**Test bắt buộc:** mua 19k → nâng cấp đúng 60.000đ; mua 29k → 50.000đ; đã có tầng 2 trước → không bao giờ hiện offer tầng 1; đơn tầng 1 đã hoàn tiền → không được khấu trừ.

---

# GIAI ĐOẠN P1 — Đo lường (chạy song song)

## WP-10 — Instrument funnel và KPI `[P1]`

**Phạm vi file:**
- `packages/contracts/src/analytics-event-v1.ts` — tên event
- Điểm phát event dọc luồng web

**Sự kiện:** `landing`, `wizard_start`, `wizard_step_complete`, `chart_success`, `offer_view`, `auth_verified`, `checkout_created`, `payment_confirmed`, `report_ready`, `report_opened`, `upgrade_view`, `upgrade_purchased`, `repeat_purchase`, `payment_unmatched`, `payment_pending_over_1h`, `report_failed`, `refund`, `support_ticket`.

**Ràng buộc không thương lượng:** không gửi tên, ngày/giờ/nơi sinh, nội dung câu hỏi, hoặc `chart_id` sang analytics bên thứ ba. Join thương mại chỉ phía server.

**Loại trừ bắt buộc (R-DIS-2):** mọi phép đo doanh thu phải loại đơn có `provider_event_id` bắt đầu bằng `disabled-autopay:`. Đó là đơn test tự đánh dấu đã trả, không có tiền thật. Tính nhầm vào là KPI sai từ ngày đầu.

**Nghiệm thu:** mục 7.

**Test bắt buộc:** test tự động quét payload event, fail nếu chứa trường thuộc danh sách cấm.

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

## WP-12 — A/B 19k vs 29k `[P2]`

**Quy tắc:** cùng đầu ra, cùng nguồn traffic, phân bổ **deterministic theo `chart_id`** để khách không thấy hai giá cho cùng một thứ. Ghi `price_variant` vào đơn. Đo bằng lãi đóng góp/khách (FD-038), không đo bằng conversion.

**Điều kiện dừng:** theo bảng guardrail mục 8. Không dừng sớm vì kết quả đẹp.

**Chờ Founder:** chạy cả hai mức hay chỉ một, do traffic hiện thấp.

---

# GIAI ĐOẠN XUYÊN SUỐT — Kiểm chứng

## WP-13 — Vòng kiểm UI xuyên suốt `[P0, chặn tăng traffic]`

**Vấn đề:** lượt audit này chỉ đọc source, chưa render bất kỳ màn nào. Không có cơ sở kết luận pass/fail cho bất kỳ tiêu chí giao diện nào. Hội đồng UX/UI yêu cầu vòng kiểm này trước khi mở traffic.

**Phạm vi kiểm:**
- Viewport mobile phổ biến (360, 390, 414) và desktop; zoom 200%
- Font Việt thật đã tải, không fallback nuốt dấu
- Thứ tự Tab và focus ring xuyên toàn luồng mua
- Label và thông báo lỗi form; lỗi hiện ngay tại trường
- Bàn phím mobile không che trường ngày/giờ sinh
- Drawer đóng/mở, sticky CTA không che nội dung
- Tương phản chữ trên nền ảnh
- Back / refresh / nhiều tab cùng lúc
- **Quay lại từ app ngân hàng trên cùng một điện thoại** — kịch bản quan trọng nhất, chưa ai chạy thật

**Chủ sở hữu:** An chạy kiểm, Harris nghiệm thu.

**Nghiệm thu:** mục "Kiểm UI xuyên suốt" của spec. Đầu ra là một bảng pass/fail có ảnh chụp, không phải kết luận suông.

**Công cụ có sẵn trong repo:** `tests/e2e/` đã có hạ tầng Playwright.

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

## Việc dọn dẹp phát hiện thêm

- File lạ `--full-page` ở gốc repo (ảnh PNG 1440x900, 455KB, chưa track) — sinh ra do một flag CLI screenshot bị hiểu thành tên file đầu ra. Cần xác nhận rồi xoá.
- `docs/20-deep-research-ta-social-listening-handoff.md` chưa được commit.
