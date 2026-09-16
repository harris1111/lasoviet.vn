# LSV-12 Analytics And Privacy Claim Record

Date: 2026-09-14
Status: Initial LSV-12 record for adoption by LSV-13
Authority: Founder Decisions FD-081, FD-085, Kaneo comment `wca61lezzekqbi4xayi1msi1`
Adoption Notice: VI/EN privacy disclosure ships atomically in LSV-12; LSV-13 adopts this claim record as the binding compliance source.

## 1. Scope And Identifiers

- Source ID: `lsv-12-claim-record`
- Ticket ID: `LSV-12` (Account-linked Analytics and Privacy Foundation)
- Privacy Document Version: `2026-09-14`
- Canonical Document Key: `privacy`
- Canonical Purpose Set:
  1. `birth_profile`
  2. `analytics`
  3. `personalization`
  4. `offers`

## 2. Exact Consent And Auth Continuation Wording

### Wizard Consent Wording (Single Checkbox with Rich Link)
- Vietnamese (VI): `Tôi đồng ý để Lá Số Việt xử lý thông tin sinh để lập lá số, và dùng dữ liệu sử dụng của tôi để cá nhân hoá nội dung, gợi ý dịch vụ phù hợp theo Chính sách bảo mật.`
  - Link: `/chinh-sach-bao-mat`
- English (EN): `I agree that Lá Số Việt may process birth information to create this chart and use my usage data to personalize content and suggest relevant services under the Privacy Policy.`
  - Link: `/en/chinh-sach-bao-mat`

### Auth Continuation Notice (Below Email and Google Actions, No Checkbox)
- Vietnamese (VI): `Bằng việc tiếp tục, bạn đồng ý với Điều khoản và Chính sách bảo mật.`
  - Links: `/dieu-khoan`, `/chinh-sach-bao-mat`
- English (EN): `By continuing, you agree to the Terms and Privacy Policy.`
  - Links: `/en/dieu-khoan`, `/en/chinh-sach-bao-mat`

## 3. Core Privacy, Linking, And Retention Claims

1. **First-Party Technical Identity**:
   - Before consent or sign-in, behavioral usage data is keyed to a first-party HTTP-only `visitor_id` cookie with a 1-year max age (`31,536,000` seconds).
   - Advertising pixels and third-party advertising trackers are not activated by LSV-12 in the current release.
2. **Ownership Linking And Account Boundaries**:
   - Wizard consent by an anonymous actor links visitor history to the birth profile and anonymous ownership context; it does not by itself create or imply an authenticated account.
   - Authenticating or signing in (via Email or Google) links visitor history to the authenticated account.
   - When an anonymous actor or profile is subsequently linked to a verified account, ownership transfers under the existing account-linking flow.
   - Atomic database linking applies specifically to operations linking visitor records, prior events, and fraud-IP rows upon authenticated consent or link commands without duplicating records.
3. **Retention Schedules**:
   - Unlinked visitor and event records: purged after at most 30 days.
   - Anonymous birth profiles and charts: retained for at most 24 hours with immediate manual deletion available.
   - Account-linked behavioral data: retained while the account exists and purged completely upon account or customer data deletion requests.
   - Raw IP addresses: retained for 12 months for analytics/personalization and separately bounded fraud/security, then scrubbed from event records while eligible non-IP history remains.
   - Statutory accounting records: financial transaction invoices and receipts are preserved separately under statutory obligations.
4. **Third-Party Boundary (Binding FD-053 Boundary)**:
   - Under the binding FD-053 boundary, third-party analytics or export adapters do not receive: names, emails, exact birth date/time/place, free-text questions, `chart_id`, `profile_id`, report content, evidence text, raw IP addresses, or internal account/visitor identifiers.
5. **User Rights**:
   - Complete account data export in standard JSON format.
   - Account deletion request with a 30-day recovery window.
   - Immediate temporary data deletion during anonymous sessions.
   - Unsubscribe from marketing communications at any time.

## 4. Consuming Surfaces And Files

- `apps/web/src/features/birth-profile/birth-wizard-review-step.tsx`
- `apps/web/src/features/birth-profile/birth-profile-form.tsx`
- `apps/web/src/features/auth/auth-panel.tsx`
- `apps/web/src/app/[locale]/tai-khoan/quyen-rieng-tu/page.tsx`
- `apps/web/src/features/content/privacy-policy-content.ts`
- `apps/web/src/features/content/privacy-policy-page.tsx`
- `content/public/vi/pages/privacy.mdx`
- `content/public/en/pages/privacy.mdx`
- `config/public-content.json`
