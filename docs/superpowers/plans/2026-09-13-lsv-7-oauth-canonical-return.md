# LSV-7 Google OAuth Canonical Return Plan

**Date:** 2026-09-13
**Status:** Implementation complete; awaiting device-host and deployment evidence
**Branch:** `fix/lsv-7-oauth-canonical-return-20260913`
**Target:** `product/experience-spec-v1`

## Goal

Remove the Google OAuth return loop from
`/la-so/{chartId}/chon-luan-giai` without weakening OAuth state validation,
anonymous-chart ownership transfer, or the canonical-domain decision.

## Binding Decisions

- FD-011 requires Better Auth with Google OAuth.
- FD-020 requires anonymous chart data to transfer only through verified
  account linking.
- FD-057 makes `https://lasoviet.net` the sole public application, Better Auth,
  and checkout origin. `lasoviet.vn` is a redirect reserve.
- Deployment and external Cloudflare/Nginx changes remain separately
  founder-authorized operations.

## Verified Evidence

1. Production read-only checks on 2026-09-13 returned HTTP `200` from both
   `https://lasoviet.net/` and `https://lasoviet.vn/`. The `.vn` host did not
   redirect to the canonical `.net` host.
2. `config/domain-routing.json` requires `lasoviet.vn` to redirect to
   `lasoviet.net`.
3. `apps/web/src/proxy.ts` performs locale and legacy-route handling but does
   not enforce the canonical host.
4. Binding deployment guidance requires production Better Auth to use
   `BETTER_AUTH_URL=https://lasoviet.net`. The live value has not been printed
   or inferred from a complete runtime environment map.
5. Better Auth `1.7.2` uses a database OAuth state plus a signed, host-only
   state cookie by default. A cookie created while the browser is on
   `lasoviet.vn` cannot be returned to a callback on `lasoviet.net`.
6. Better Auth `1.7.2` already preserves the anonymous user identifier in
   server-side OAuth state for account-link fallback. Losing only the anonymous
   session cookie is therefore not sufficient evidence that
   `anonymous.onLinkAccount` is the root cause.
7. Existing callback construction preserves the paid-topic pathname, query,
   and fragment. Unit tests cover that local callback value, but no test covers
   a non-canonical request host crossing to the canonical OAuth callback host.

## Leading Root-Cause Hypothesis

The strongest current hypothesis is a split-origin OAuth flow:

1. A mobile or privacy-focused browser opens the application on
   `https://lasoviet.vn`.
2. The same-origin auth client starts Google OAuth from `.vn`, so OAuth state
   cookies are stored for `.vn`.
3. If the deployed Better Auth base URL matches the binding configuration, it
   constructs the Google callback at
   `https://lasoviet.net/api/auth/callback/google`.
4. The callback cannot receive the `.vn` state cookie. Better Auth rejects the
   callback state and redirects to its default error/fallback destination,
   which the founder observes as the homepage.
5. Retrying from the still non-canonical entry path repeats the split-origin
   flow.

This hypothesis is consistent with the two-day timing between the canonical
domain migration and the report, but it is not confirmed until the affected
device's address-bar host and callback request are recorded.

The browser-family correlation must not be treated as proof of ITP/ETP. The
OAuth state cookie is first-party and `SameSite=Lax`; changing it to
`SameSite=None` or disabling state-cookie verification would weaken the
security boundary without resolving a cross-registrable-domain split.

## Required Device Evidence

Record these values from one affected iPhone or Firefox reproduction:

1. Exact address-bar origin before selecting Google: `.net` or `.vn`.
2. Exact callback request URL after Google.
3. Callback status and `Location` response header.
4. Presence or absence of the Better Auth state and session cookies on the
   initiating request and callback request.
5. Final URL shown as the homepage.

Do not record cookie values, OAuth codes, tokens, email addresses, chart birth
data, or other secrets/PII in Kaneo or repository files.

## Implementation Path A: Split Origin Confirmed

### Owned Files

- Modify: `apps/web/src/proxy.ts`
- Create: `apps/web/src/routing/canonical-origin.ts`
- Modify: `tests/i18n/runtime-routing.test.ts`
- Create or modify one focused browser-boundary test under `tests/e2e/`
- Update: this plan and the rules/decisions tracker with verification evidence

### Behavior

1. Redirect requests for configured non-canonical public hosts to
   `https://lasoviet.net`.
2. Preserve pathname and query exactly. URL fragments remain browser-local and
   are naturally preserved when navigation starts from a client-visible URL.
3. Do not redirect loopback, local development, Compose service, preview, or
   test hosts.
4. Run canonical-host enforcement before locale rewrites and legacy aliases.
5. Keep Better Auth state-cookie verification enabled.
6. Keep host-only auth cookies and do not attempt cross-domain cookie sharing.
7. Do not add `lasoviet.vn` to Better Auth trusted origins as an application
   origin.

### Focused Checks

- A `.vn` paid-topic URL redirects to the same `.net` path and query.
- A `.net` paid-topic URL is not redirected.
- Local and Playwright base URLs remain usable.
- Legacy alias and locale tests remain green.
- The existing callback resolver and checkout callback tests remain green.
- A browser smoke starts from `.vn`, reaches `.net` before auth initiation,
  completes Google OAuth, returns to the exact paid-topic route, and creates no
  duplicate order.

### Implementation Evidence (2026-09-13)

- Implemented `apps/web/src/routing/canonical-origin.ts` with `RESERVE_HOSTS` (`lasoviet.vn`, `lasoviet.cloud`, `lasoviet.xyz`) issuing HTTP 301 redirects to `https://lasoviet.net` while preserving pathname and query string.
- Integrated `resolveCanonicalOriginRedirect` as first check in `apps/web/src/proxy.ts` before legacy alias and locale processing.
- Verified with focused tests in `tests/i18n/runtime-routing.test.ts` covering `.vn` with path/query, optional port, `.cloud`, `.xyz`, canonical `.net`, localhost, and arbitrary attacker hosts.

### Terra Review (2026-09-13)

- Technical review approved the implementation: the allowlist and fixed
  canonical target prevent open redirects; forwarded-host headers are not
  used; local, preview, subdomain, and arbitrary hosts remain untouched; and
  OAuth state, cookie, CSRF, and origin safeguards are unchanged.
- Deferred: add a direct `proxy` integration test. Current helper coverage and
  source ordering inspection are sufficient for this bounded correction; the
  integration test remains follow-up work.
- Release blocker: the task still requires sanitized affected-device evidence,
  real browser OAuth smoke across the reported environments, deployment, and
  deployment smoke evidence.

## Investigation Path B: Same Canonical Origin Confirmed

If the full failing flow starts and callbacks on `https://lasoviet.net`, do not
apply Path A as the task fix by itself.

1. Correlate the callback status and sanitized server log error with the device
   trace.
2. Classify the failure as state validation, provider exchange, account
   linking, session issuance, or post-callback navigation.
3. Add the smallest failing automated contract test that matches the observed
   stage.
4. Prepare a narrowed implementation brief only after the failing boundary is
   identified.
5. Do not set `account.skipStateCookieCheck`, disable CSRF/origin checks, or
   change cookie attributes as a speculative workaround.

## Workflow

1. Founder approves this plan and confirms the device-host evidence.
2. Sol gives Flash Executor `ag/gemini-3.8-flash-high` with `high` reasoning a
   bounded brief for the confirmed path.
3. Flash Executor edits only the owned files and runs the focused checks.
4. Terra high independently reviews the complete fix milestone.
5. Sol adjudicates findings and issues at most the bounded correction passes
   allowed by repository policy.
6. Push and PR require the normal branch workflow.
7. Merge and deployment require explicit founder authorization.
8. Keep Kaneo in `In Progress` or `In Review` until target deployment and
   device/browser smoke evidence are recorded. Only then may it move to
   `Done`.

## Acceptance Criteria

- Root cause is supported by a sanitized affected-device trace.
- Google OAuth returns to the exact paid-topic path, query, and fragment.
- Anonymous chart ownership is linked to the verified Google account.
- Chrome desktop retains its working behavior.
- Safari 14.1.3/Big Sur, current Firefox macOS, and current iOS Safari/Chrome
  are verified according to the task.
- No OAuth state, CSRF, origin, privacy, or account-linking safeguard is
  weakened.
- Deployment and smoke evidence are attached to LSV-7 before completion.

## Deferred or Excluded

- Better Auth dependency upgrades without evidence that a vendor defect causes
  this incident.
- Cross-domain auth cookies between `.vn` and `.net`.
- OAuth state-cookie bypasses.
- Production Cloudflare, DNS, Nginx, or deploy changes without explicit
  authorization.

## Open Questions

1. On an affected device, is the initiating address-bar origin
   `https://lasoviet.vn` or `https://lasoviet.net`?
2. What is the sanitized callback error/status and final URL?
3. Does the founder authorize the external canonical-domain redirect and target
   deployment needed to close the task after device evidence is collected?
