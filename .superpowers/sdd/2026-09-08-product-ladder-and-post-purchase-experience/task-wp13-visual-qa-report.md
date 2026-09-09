# WP-13 Visual QA Report: Provider-Independent Public & Birth Wizard Flows

## 1. Executive Summary

- **Task**: WP-13 Cross-Cutting Visual QA (Provider-Independent Public & Birth Wizard Flows)
- **Worktree**: `/home/debian/projects/lasoviet.vn-ziwei-v3`
- **Branch**: `feature/wp13-visual-qa-20260909`
- **Runtime**: Local production web runtime on `http://127.0.0.1:3011` (no private API or external provider dependencies active)
- **Automated Test Suite**: `tests/e2e/wp13-visual-qa.spec.ts` (7 passed across mobile & desktop viewports)
- **Overall Status**: `INCOMPLETE - PENDING FOUNDER SIGN-OFF (FD-056) & EXTERNAL FIXTURES`
  - Provider-independent public and birth-wizard flows: **VERIFIED PASS**
  - Paid checkout, banking returns, account library, and terminal-failure recovery: **BLOCKED - NOT VERIFIED** (requires authenticated local fixtures / provider credentials)
  - **Harris alone provides final sign-off under FD-056**. Per the brief instructions, WP-13 cannot be labeled complete while checkout/banking evidence is blocked or while Harris sign-off is absent.

---

## 2. Automated Visual & Reflow Evidence Matrix

All automated checks were executed with Playwright using exact viewport screenshots (not stitched full-page captures, preserving sticky bar positions).

| Flow / Screen | Viewport | Measured Evidence | Artifact Screenshot | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Homepage Compact Mobile** | 360x800 | `scrollWidth = clientWidth = 360px` (no overflow). Loaded fonts: Be Vietnam Pro (UI), Source Serif 4 (Display), JetBrains Mono (Mono) with VN glyphs. All initial interactive controls >= 44px touch target. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-mobile-360.png` | **PASS** |
| **Homepage Standard Mobile** | 390x844 | `scrollWidth = clientWidth = 390px` (no overflow). Loaded font roles verified. All controls >= 44px touch target. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-mobile-390.png` | **PASS** |
| **Homepage Large Mobile** | 414x896 | `scrollWidth = clientWidth = 414px` (no overflow). Loaded font roles verified. All controls >= 44px touch target. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-mobile-414.png` | **PASS** |
| **Homepage Desktop** | 1440x900 | `scrollWidth = clientWidth = 1440px` (no overflow). Loaded fonts verified with full Vietnamese character set sample. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-desktop-1440.png` | **PASS** |
| **Homepage 200% Zoom Reflow Equivalent** | 720x900 | `scrollWidth = clientWidth = 720px` (no overflow, clean vertical stacking, responsive grid collapses cleanly). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/homepage-desktop-200pct-equivalent.png` | **PASS** |
| **Wizard Step 1: Subject (Mobile)** | 390x844 | Heading visible; labels associated with Nam/Nữ radios. Keyboard Tab navigation moves focus with visible outline/ring. No overflow (`390px`). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-step1-mobile-390.png` | **PASS** |
| **Wizard Step 1: Subject (Desktop)** | 1440x900 | Heading visible; form labels associated. Keyboard Tab focus indicator verified. No overflow (`1440px`). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-step1-desktop-1440.png` | **PASS** |
| **Wizard Step 2: Birth Step (Mobile)** | 390x844 | Date (Day, Month, Year), calendar button, hour/minute, place inputs all labeled and visible. No overflow (`390px`). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-step2-mobile-390.png` | **PASS** |
| **Wizard Step 2: Birth Step (Desktop)** | 1440x900 | Date and time fields cleanly aligned. Labels associated with inputs. No overflow (`1440px`). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-step2-desktop-1440.png` | **PASS** |
| **Wizard Step 2: Invalid Date Error (Mobile)** | 390x844 | Entering Day 32, Month 13, Year 1990 produces error specifically at date field (`.birth-date-fields .form-error`). Page-bottom form error is not displayed. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-invalid-date-error-mobile-390.png` | **PASS** |
| **Wizard Step 2: Invalid Date Error (Desktop)** | 1440x900 | Invalid date error appears directly beneath date inputs in `.birth-date-fields`. Page bottom error count = 0. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-invalid-date-error-desktop-1440.png` | **PASS** |
| **Wizard Soft-Keyboard Pressure** | 390x500 | Reduced viewport height simulates soft keyboard. Hour and minute inputs focused and scrolled: `hourBox.y + hourBox.height <= 500px`, `minBox.y + minBox.height <= actionsBox.y`. Sticky actions do not cover active input. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-soft-keyboard-focus-390x500.png` | **PASS** |
| **Wizard Step 3: Exact-Time Review (Mobile)** | 390x844 | Summary values verified: Nam, 01/01/1990, 09:30. Submit button shows "Lập lá số". Sticky footer does not cover final consent content (`padding-bottom: 96px` creates safe clearance). | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-review-mobile-390.png` | **PASS** |
| **Wizard Step 3: Exact-Time Review (Desktop)** | 1440x900 | Desktop review summary verified. Submit button: "Lập lá số". Page reload preserves wizard state safely. Multi-tab cache reads do not mutate or clear stored birth data in `localStorage`. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-review-desktop-1440.png` | **PASS** |
| **Wizard Step 3: Unknown-Time Review (Mobile)** | 390x844 | Summary shows "Không rõ giờ sinh". Submit button text is "Lưu hồ sơ". Page contains **0** paid terms (no "19.000", "79.000", "19k", "79k", "thanh toán", "mua ngay", "nâng cấp trả phí"). Consent content not covered. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-unknown-review-mobile-390.png` | **PASS** |
| **Wizard Step 3: Unknown-Time Review (Desktop)** | 1440x900 | Unknown-time review summary verified on desktop. Submit button: "Lưu hồ sơ". Zero paid upgrade or pricing text anywhere on page. | `.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13/wizard-unknown-review-desktop-1440.png` | **PASS** |

---

## 3. Provider-Dependent & Authenticated Flows (Blocked Items)

Per brief instructions, the following items are explicitly marked as `BLOCKED - NOT VERIFIED` because no isolated local fixture exists in the current runtime without new credentials or external side effects:

1. **Verified-account library and order history**:
   - **Status**: `BLOCKED - NOT VERIFIED`
   - **Reason**: The local production web runtime at `http://127.0.0.1:3011` intentionally has no reachable private API or database session fixture to simulate an authenticated customer library.
2. **Paid checkout states**:
   - **Status**: `BLOCKED - NOT VERIFIED`
   - **Reason**: Requires live or mock VietQR payment provider webhooks, which are disabled and excluded under server safety rules.
3. **Return from banking app on one mobile device**:
   - **Status**: `BLOCKED - NOT VERIFIED`
   - **Reason**: Requires real physical mobile banking app app-switching and deep-link / callback simulation.
4. **Report recovery and terminal-failure states**:
   - **Status**: `BLOCKED - NOT VERIFIED`
   - **Reason**: Requires triggering private API error codes and worker retry exhaustion, which are unavailable in the isolated web runtime.

---

## 4. Final Sign-off Authority (FD-056)

- **Authority Requirement**: Per founder decision FD-056 and the approved QA brief, **Harris alone provides final sign-off**.
- **WP-13 Status**: Remains `INCOMPLETE - PENDING FOUNDER SIGN-OFF & EXTERNAL FIXTURES`.
- All provider-independent flows and visual criteria are fully implemented, automated, and verified via Playwright tests and viewport screenshots.
