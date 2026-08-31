# 08 — Domain & Infrastructure Strategy

## 1. Domain roles

| Domain | Vai trò | Index | Commerce |
|---|---|---|---|
| `lasoviet.vn` | Brand, canonical SEO, app, checkout, email | Có | Có |
| `lasoviet.cloud` | Dự phòng infrastructure/backend khi cần tách | Không ở root | Không |
| `lasoviet.xyz` | Defensive ownership, lab/staging có kiểm soát | Không | Không |

## 2. Routing rules

- `https://lasoviet.xyz/*` → 301 về URL tương ứng trên `https://lasoviet.vn/*` nếu không dùng cho lab.
- `https://lasoviet.cloud/` → 301 về homepage `.vn` cho tới khi có use case.
- Staging/lab: authentication + `noindex`; không chỉ dựa vào robots.txt.
- Không clone nội dung public trên `.xyz` hoặc `.cloud`.
- Không đặt checkout hoặc email người dùng trên domain phụ.

## 3. Recommended subdomains on .vn

- `www.lasoviet.vn` → redirect/canonical theo lựa chọn host chính.
- `api.lasoviet.vn` → API.
- `static.lasoviet.vn` hoặc CDN managed → static assets nếu cần.
- `status.lasoviet.vn` → status page khi scale.

Ưu tiên subdomain `.vn` thay vì `.cloud` để giảm complexity và tăng tính nhất quán thương hiệu.

## 4. DNS ownership

Hiện trạng đã quyết định:

- Registrar: Mắt Bão.
- Authoritative DNS: Cloudflare.
- Nameserver được cung cấp: `clayton.ns.cloudflare.com` và `stephane.ns.cloudflare.com`.

Quy tắc vận hành:

- Gia hạn domain tại registrar; chỉnh A/CNAME/MX/TXT trong Cloudflare sau khi zone Active.
- Bật DNSSEC ở Cloudflare rồi thêm DS tại registrar theo đúng hướng dẫn, chỉ sau khi nameserver active và ổn định.
- Không bật proxy màu cam cho record xác minh email hoặc record dịch vụ không hỗ trợ proxy.
- Cấu hình SPF, DKIM và DMARC trước khi gửi email giao dịch.
- Bật registrar lock, MFA và recovery contacts.

## 5. Canonical/security checklist

- Một hostname HTTPS canonical.
- HSTS sau khi kiểm thử toàn bộ subdomain cần thiết.
- Redirect HTTP→HTTPS và non-canonical→canonical.
- CSP, secure cookies, rate limit form/calculator/auth.
- Search Console và sitemap chỉ cho `.vn`.
- Monitoring expiry cả ba domain.

## 6. Khi nào dùng lasoviet.cloud

Chỉ dùng khi có một trong các lợi ích rõ:

- tách API/worker theo boundary vận hành;
- storage/render host cần hostname riêng;
- vendor integration yêu cầu domain riêng;
- security policy cần cô lập origin.

Nếu không, để root redirect về `.vn` là lựa chọn tốt hơn.
