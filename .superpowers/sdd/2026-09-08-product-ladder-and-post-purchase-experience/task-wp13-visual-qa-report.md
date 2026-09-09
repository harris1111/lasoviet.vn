# WP-13 Visual QA Report: Public, Wizard, and Authenticated Post-Purchase Flows

## 1. Executive Summary

- **Task**: WP-13 Cross-Cutting Visual QA (Public, Birth Wizard, and Authenticated Post-Purchase Flows)
- **Worktree**: `/home/debian/projects/lasoviet.vn-ziwei-v3`
- **Branch**: `feature/wp13-visual-qa-20260909`
- **Runtime**:
  - Web: Local production web build on `http://127.0.0.1:3011`
  - Private API: Real local Fastify/NestJS API on `http://127.0.0.1:3012`
  - PostgreSQL: Isolated container `lasoviet-wp13-postgres` on `127.0.0.1:55435`
  - Redis: Isolated container `lasoviet-wp13-redis` on `127.0.0.1:63424`
- **Automated Test Suites**:
  - `tests/e2e/wp13-visual-qa.spec.ts` (7 passed)
  - `tests/e2e/wp13-authenticated-visual-qa.spec.ts` (20 passed)
- **Overall Status**: `INCOMPLETE - PENDING FOUNDER SIGN-OFF (FD-056) & EXTERNAL DEVICE BANKING APP RETURN`
  - Provider-independent birth wizard flows (all viewports): **VERIFIED PASS**
  - Homepage desktop viewports (1440x900 & 720x450 reflow): **VERIFIED PASS**
  - Homepage mobile viewports (360x800, 390x844, 414x896): **VERIFIED PASS**
  - Authenticated account overview with latest report and recent blocks (mobile & desktop): **VERIFIED PASS**
  - Authenticated report library grouped deterministically by birth profile (mobile & desktop): **VERIFIED PASS**
  - Authenticated immutable order history with paid, pending, expired, failed, refunded rows (mobile & desktop): **VERIFIED PASS**
  - Paid checkout visual states (pending with VietQR & self-claim, paid with no report ID, expired, failed, refunded): **VERIFIED PASS**
  - Report progress visual states (pending generating progress, terminal-failure recovery facts): **VERIFIED PASS**
  - All-document touch target audit (every rendered interactive control meets >= 44x44px): **VERIFIED PASS**
  - Deterministic named keyboard Tab focus sequences (outline/box-shadow required, no border-color reliance): **VERIFIED PASS**
  - Top-of-page primary viewport screenshots at scrollY=0: **VERIFIED PASS**
  - Return from physical mobile banking app: **BLOCKED - NOT VERIFIED (EXTERNAL DEVICE)**
  - **Harris alone provides final sign-off under FD-056**. Overall WP-13 cannot be labeled complete until external device verification and Harris sign-off are completed.

---

## 2. Provider-Independent Public & Birth Wizard Evidence Matrix

All automated checks were executed with Playwright using exact viewport screenshots (not stitched full-page captures, preserving sticky bar positions).

| Flow / Screen | Viewport | Measured Evidence | Artifact Screenshot | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Homepage Compact Mobile** | 360x800 | `scrollWidth = clientWidth = 360px` (no overflow). Loaded fonts: Be Vietnam Pro (UI), Source Serif 4 (Display), JetBrains Mono (Mono) with VN glyphs. Every visible button, input, select, summary, and anchor meets both width >= 44px and height >= 44px; measured minimum width and height are 44px. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-mobile-360.png` | **PASS** |
| **Homepage Standard Mobile** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). Loaded font roles verified. Every visible interactive control and anchor meets 44x44px; measured minimum width and height are 44px. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-mobile-390.png` | **PASS** |
| **Homepage Large Mobile** | 414x896 | `scrollWidth = clientWidth = 414px` (no overflow). Loaded font roles verified. Every visible interactive control and anchor meets 44x44px; measured minimum width and height are 44px. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-mobile-414.png` | **PASS** |
| **Homepage Desktop** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Loaded fonts verified with full Vietnamese character set sample. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-desktop-1440.png` | **PASS** |
| **Homepage 200% Zoom Reflow Approximation** | 720x450 | `scrollWidth = clientWidth = 720px` (no overflow, clean vertical stacking, responsive grid collapses cleanly). Evaluated at 720x450 as an equivalent reflow approximation for a 1440x900 viewport at 200% zoom rather than native browser engine zoom. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-desktop-200pct-equivalent.png` | **PASS** |
| **Wizard Step 1: Subject (Mobile)** | 390x844 | Heading visible; labels associated with Nam/Nữ radios. All initial interactive controls meet >= 44px touch target (width >= 44px AND height >= 44px; min width = 44px, min height = 44px), including Help link (`a[aria-label="Trợ giúp lập lá số"]`, 44x44px). Deterministic Tab sequence verified across 6 named controls (Help link -> Name input -> Choice: Self -> Choice: Other -> Gender: Male -> Continue button) with real focus indicator (outline-style solid 2px or gold box-shadow). No overflow (`390px`). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-step1-mobile-390.png` | **PASS** |
| **Wizard Step 1: Subject (Desktop)** | 1440x900 | Heading visible; form labels associated. Deterministic Tab sequence verified across 8 named controls (Logo link -> Help link -> Exit button -> Name input -> Choice: Self -> Choice: Other -> Gender: Male -> Continue button) with visible focus indicators. No overflow (`1440px`). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-step1-desktop-1440.png` | **PASS** |
| **Wizard Step 2: Birth Step (Mobile)** | 390x844 | Date (Day, Month, Year), calendar button, hour/minute, place inputs all labeled and visible. No overflow (`390px`). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-step2-mobile-390.png` | **PASS** |
| **Wizard Step 2: Birth Step (Desktop)** | 1440x900 | Date and time fields cleanly aligned. Labels associated with inputs. No overflow (`1440px`). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-step2-desktop-1440.png` | **PASS** |
| **Wizard Step 2: Invalid Date Error (Mobile)** | 390x844 | Entering Day 32, Month 13, Year 1990 produces error specifically at date field (`.birth-date-fields .form-error`). Page-bottom form error is not displayed. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-invalid-date-error-mobile-390.png` | **PASS** |
| **Wizard Step 2: Invalid Date Error (Desktop)** | 1440x900 | Invalid date error appears directly beneath date inputs in `.birth-date-fields`. Page bottom error count = 0. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-invalid-date-error-desktop-1440.png` | **PASS** |
| **Wizard Soft-Keyboard Pressure** | 390x500 | Reduced viewport height simulates soft keyboard. Hour and minute inputs focused and scrolled: `hourBox.y + hourBox.height <= 500px`, `minBox.y + minBox.height <= actionsBox.y`. Sticky actions do not cover active input. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-soft-keyboard-focus-390x500.png` | **PASS** |
| **Wizard Step 3: Exact-Time Review (Mobile)** | 390x844 | Summary values verified: Nam, 01/01/1990, 09:30. Submit button shows "Lập lá số". Scrolled to bottom; both consent and actions bounding boxes verified; sticky footer does not cover final consent content (`clearance > 100px`, `padding-bottom: 96px` safe clearance). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-review-mobile-390.png` | **PASS** |
| **Wizard Step 3: Exact-Time Review (Desktop)** | 1440x900 | Desktop review summary verified. Submit button: "Lập lá số". Direct unsubmitted browser refresh safely resets to initial wizard state (Step 1: "Người được lập lá số"); does not claim unsaved input persistence. Multi-tab cache reads do not mutate or clear stored birth data in `localStorage`. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-review-desktop-1440.png` | **PASS** |
| **Wizard Step 3: Unknown-Time Review (Mobile)** | 390x844 | Summary shows "Không rõ giờ sinh". Submit button text is "Lưu hồ sơ". Page contains **0** paid terms (no "19.000", "79.000", "19k", "79k", "thanh toán", "mua ngay", "nâng cấp trả phí"). Scrolled to final consent; both consent and actions bounding boxes verified; non-overlap asserted without `isMobile` guard (`clearance > 100px`). Screenshot captured at final consent position. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-unknown-review-mobile-390.png` | **PASS** |
| **Wizard Step 3: Unknown-Time Review (Desktop)** | 1440x900 | Unknown-time review summary verified on desktop. Submit button: "Lưu hồ sơ". Zero paid upgrade or pricing text anywhere on page. Scrolled to consent; both bounding boxes verified; non-overlap asserted geometrically without `isMobile` guard (`consentBox.y + consentBox.height <= actionsBox.y + 4`, pass). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-unknown-review-desktop-1440.png` | **PASS** |

---

## 3. Authenticated Post-Purchase Visual Evidence Matrix

All authenticated visual states were tested through canonical Vietnamese routes using a verified non-anonymous Better Auth session cookie, isolated PostgreSQL 16 database, Redis 7 instance, and real local private API. All primary viewport screenshots are captured at `scrollY = 0` showing heading and primary state cards.

| Flow / Screen | Viewport | Measured Evidence | Artifact Screenshot | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Account Overview (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). Heading "Tài khoản", latest readable report section ("Báo cáo gần nhất", "Nguyễn Minh Châu", "Đọc tiếp" action, min-height 48px), and recent blocks. Every rendered control in document meets width >= 44px and height >= 44px (including section link "Xem tất cả" at 75x44px; min width = 75px, min height = 44px). Deterministic Tab sequence verified across 5 named controls (Tabs -> Latest report CTA -> Section link). Zero `ZIWEI-` or raw statuses exposed. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/account-overview-mobile-390.png` | **PASS** |
| **Account Overview (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Header navigation tabs (active: "Tổng quan"), latest readable report card with "Đọc tiếp" primary CTA, 2-column stats and recent lists layout. Deterministic Tab sequence verified. Zero sticky overlap. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/account-overview-desktop-1440.png` | **PASS** |
| **Report Library (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). Grouped deterministically into 2 birth profile sections: "Nguyễn Văn An" and "Nguyễn Minh Châu". All controls meet >= 44x44px (min width = 78px, min height = 44px). Deterministic Tab sequence verified (Tabs -> Action "Đọc báo cáo"). Zero internal IDs exposed. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/account-reports-mobile-390.png` | **PASS** |
| **Report Library (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Clean vertical layout of profile groups with respective report cards, dates, status badges, and action buttons. Deterministic focus verified. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/account-reports-desktop-1440.png` | **PASS** |
| **Order History (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). Section heading "Lịch sử đơn hàng". All immutable states verified: "Đã thanh toán", "Đang chờ thanh toán", "Hết hạn", "Thất bại", "Đã hoàn tiền". Every control across document meets >= 44x44px. Deterministic Tab sequence verified (Tabs -> Action "Hỗ trợ"). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/account-orders-mobile-390.png` | **PASS** |
| **Order History (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Clean list of orders with preserved customer invoice numbers (`LSV-20260909-xxx`), formatted amounts (`79.000 ₫`), dates, and status badges. Zero internal IDs exposed. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/account-orders-desktop-1440.png` | **PASS** |
| **Checkout: Pending (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). State marker `[data-checkout-status="pending"]` with status "Đang chờ thanh toán". Visible VietQR image, transfer details, and self-claim form. All controls meet >= 44px. Deterministic Tab sequence verified across 3 copy buttons with 2px outline focus indicators. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-pending-mobile-390.png` | **PASS** |
| **Checkout: Pending (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). VietQR checkout container cleanly aligned with QR figure, transfer details, copy actions, warning notice, and embedded reconciliation form. Deterministic focus verified across 3 copy buttons. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-pending-desktop-1440.png` | **PASS** |
| **Checkout: Paid (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). State marker `[data-checkout-status="paid"]` with status "Đã thanh toán", heading "Đã nhận thanh toán thành công", processing spinner, and order history navigation CTA. All controls meet >= 44px. Deterministic Tab sequence verified to "Xem lịch sử đơn hàng". | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-paid-mobile-390.png` | **PASS** |
| **Checkout: Paid (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Status `role="status"` and `aria-live="polite"` confirmed. No report ID exposed. Clean recovery card presentation. Focus verified. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-paid-desktop-1440.png` | **PASS** |
| **Checkout: Expired (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). State marker `[data-checkout-status="expired"]` with status "Đơn đã hết hạn" and heading "Đơn hàng đã hết hạn thanh toán". Actions meet >= 44px. Deterministic Tab sequence verified (Action "Lập lá số mới" -> "Xem lịch sử đơn hàng"). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-expired-mobile-390.png` | **PASS** |
| **Checkout: Expired (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Explanatory text and navigation to order history rendered cleanly. Zero paid terms or active QR shown. Deterministic focus verified. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-expired-desktop-1440.png` | **PASS** |
| **Checkout: Failed (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). State marker `[data-checkout-status="failed"]` with status "Thanh toán chưa thành công" and heading "Thanh toán chưa thành công". Actions meet >= 44px. Deterministic Tab sequence verified (Action "Xem lịch sử đơn hàng" -> "Liên hệ hỗ trợ"). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-failed-mobile-390.png` | **PASS** |
| **Checkout: Failed (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Failure description with non-retry warning and support contact action. Zero raw error codes. Deterministic focus verified. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-failed-desktop-1440.png` | **PASS** |
| **Checkout: Refunded (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). State marker `[data-checkout-status="refunded"]` with status "Đã hoàn tiền" and heading "Đơn hàng đã được hoàn tiền". Actions meet >= 44px. Deterministic Tab sequence verified to "Xem lịch sử đơn hàng". | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-refunded-mobile-390.png` | **PASS** |
| **Checkout: Refunded (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Status badge and refund confirmation description with link to order history. Focus verified. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/checkout-refunded-desktop-1440.png` | **PASS** |
| **Report: Pending (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). Semantic `[role="status"]` on `.report-progress-pending`, heading "Báo cáo đang được xử lý", animated spinner, and library navigation action. Actions meet >= 44px. Deterministic Tab sequence verified to "Xem danh sách báo cáo". | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/report-pending-mobile-390.png` | **PASS** |
| **Report: Pending (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Clean progress card with confirmed payment notification, localized status ("Đang tổng hợp nội dung luận giải..."), and library link. Focus verified. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/report-pending-desktop-1440.png` | **PASS** |
| **Report: Terminal Failure (Mobile)** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). Semantic `[role="alert"]` on `.report-progress-failed`, heading "Chưa thể hoàn tất báo cáo", payment confirmation notice, customer facts list (invoice `LSV-20260909-009`, times, support reference), support mailto CTA, and order history link. Actions meet >= 44px. Deterministic Tab sequence verified (Support action -> Order history action). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/report-terminal-failure-mobile-390.png` | **PASS** |
| **Report: Terminal Failure (Desktop)** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Full recovery layout with definition list of order facts, next step explanation, and dual actions. Zero internal failure codes or AI model mentions exposed. Focus verified. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/report-terminal-failure-desktop-1440.png` | **PASS** |

---

## 4. Resolved Defects

1. **Mobile Homepage Header Touch Targets (Resolved in Pass 2)**:
   - `a.brand[href="/"]`: previously measured 126x22px.
   - `a.login-link[href="/dang-nhap"]`: previously measured 74x19px.
   - Resolved by bounded mobile breakpoint CSS in `apps/web/src/styles/global.css` (commit `4666bb6`).
2. **Account Section Links Touch Target (Resolved in Pass 3)**:
   - `.account-section-link` ("Xem tất cả"): previously measured 75x18px at mobile viewport.
   - Resolved by bounded mobile layout rule in `apps/web/src/styles/account-dashboard.css` giving it `display: inline-flex; align-items: center; justify-content: flex-end; min-width: 44px; min-height: 44px;` and explicit `:focus-visible` indicator. Measured after correction: **75x44px** (PASS).

---

## 5. Remaining External Blocker

Per brief instructions, exactly one physical external device flow remains blocked:

- **Return from banking app on physical mobile device**:
  - **Status**: `BLOCKED - NOT VERIFIED (EXTERNAL DEVICE)`
  - **Reason**: Requires live mobile banking application switching, biometric authorization on an iOS/Android device, and operating-system level deep-link return to the mobile browser.

---

## 6. Final Sign-off Authority (FD-056)

- **Authority Requirement**: Per founder decision FD-056 and the approved QA brief, **Harris alone provides final sign-off**.
- **WP-13 Status**: Remains `INCOMPLETE - PENDING FOUNDER SIGN-OFF & EXTERNAL DEVICE BANKING APP RETURN`.
- All local automated visual and reflow evidence across both public and authenticated flows is fully verified, repeatable, and preserved with Playwright artifacts.
