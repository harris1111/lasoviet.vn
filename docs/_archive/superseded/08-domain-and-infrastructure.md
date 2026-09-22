# 08 — Domain & Infrastructure Strategy

## 1. Domain roles

| Domain | Role | Index | Commerce |
|---|---|---|---|
| `lasoviet.net` | Master brand, canonical public SEO, web application, Better Auth, checkout, email | Yes | Yes |
| `lasoviet.vn` | Non-canonical redirect reserve (pending external DNS configuration) | No (301 to `.net`) | No |
| `lasoviet.cloud` | Infrastructure/backend reserve when separation is needed | No at root (301 to `.net`) | No |
| `lasoviet.xyz` | Defensive ownership, controlled lab/staging | No (301 to `.net`) | No |

## 2. Routing rules

- `https://lasoviet.vn/*` → HTTP 301 redirect to the corresponding URL on `https://lasoviet.net/*` once DNS is externally configured.
- `https://lasoviet.xyz/*` → HTTP 301 redirect to the corresponding URL on `https://lasoviet.net/*` when not used for lab.
- `https://lasoviet.cloud/` → HTTP 301 redirect to homepage `https://lasoviet.net/` until a distinct technical use case exists.
- Staging/lab: authentication + `noindex`; do not rely solely on robots.txt.
- Do not clone public content across secondary domains.
- Do not place checkout or user email on secondary domains.

## 3. Recommended subdomains on .net

- `www.lasoviet.net` → HTTP 301 redirect / canonical to canonical apex `https://lasoviet.net`.
- `api.lasoviet.net` → API (when public separation is needed).
- `static.lasoviet.net` or managed CDN → static assets if needed.
- `status.lasoviet.net` → status page as service scales.

Prefer `.net` subdomains rather than `.cloud` to reduce complexity and maintain brand consistency.

## 4. DNS ownership and external gates

Authoritative DNS: Cloudflare.

External domain and DNS gates (FD-057):
- `lasoviet.net` is the canonical public domain zone on Cloudflare, but currently has no MX or TXT records configured; code and docs migration does not complete inbound customer support email delivery until external MX/TXT records are provisioned.
- `lasoviet.vn` currently has no DNS records configured at all; code and docs migration does not complete external DNS redirects until DNS records are provisioned.

Operational rules:
- Renew domains at registrar; configure A/CNAME/MX/TXT in Cloudflare.
- Enable DNSSEC in Cloudflare then add DS records at registrar once nameservers are active.
- Do not orange-proxy email verification records or services that do not support proxying.
- Configure SPF, DKIM, and DMARC on `lasoviet.net` before sending production transactional email.
- Enable registrar lock, MFA, and recovery contacts.

## 5. Canonical and security checklist

- Single canonical HTTPS hostname: `https://lasoviet.net`.
- HSTS after testing all required subdomains.
- Redirect HTTP→HTTPS and non-canonical (`.vn`, `.xyz`, `.cloud`, `www.lasoviet.net`) → canonical (`https://lasoviet.net`).
- CSP, secure cookies, rate limiting for forms/calculators/auth.
- Google Search Console and sitemap XML submissions strictly for `https://lasoviet.net`.
- Expiry monitoring across all owned domains.

## 6. When to use lasoviet.cloud

Only use when a clear technical advantage exists:

- separate API/worker operational boundaries;
- storage or asset rendering host requires a dedicated hostname;
- vendor integrations require an isolated domain;
- security policies require origin isolation.

Otherwise, keeping a root HTTP 301 redirect to `https://lasoviet.net` remains the standard.
