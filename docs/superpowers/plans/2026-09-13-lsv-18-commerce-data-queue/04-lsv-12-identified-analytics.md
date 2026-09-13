# LSV #12 Identified Analytics, Consent, and Retention Plan

## Scope

Replace the log sink with first-party PostgreSQL behavioral analytics under
FD-081. Add no consent banner, popup, or second wizard checkbox. Keep
third-party ad pixels and marketing-email automation out of scope.

## Identity and Consent

- The server creates a persistent, first-party, HTTP-only `visitor_id` cookie
  with a one-year lifetime and secure same-site attributes.
- Clients submit only event name and allowed event properties. The server
  attaches visitor, request, network, account, and consent context.
- Before consent/sign-in, events and IP observations are unlinked and have a
  hard 30-day purge deadline.
- The existing wizard checkbox records one atomic consent receipt containing
  versioned purposes `birth_profile`, `analytics`, `personalization`, and
  `offers`.
- Sign-in links the visitor under FD-081 and displays the approved terms/privacy
  notice through the later UI artifact branch.
- Link operations merge prior visitor history exactly once into the account
  profile without rewriting event identity or timestamps.

Retain `ConsentRequestV1` for existing callers. Add `ConsentRequestV2` with a
closed purpose array and one submission/receipt ID; the repository writes all
purpose rows and audit evidence atomically.

## Data Model

- `analytics_visitors`: opaque visitor ID, first/last seen, consent/link state,
  account/profile link timestamps, purge deadline.
- `analytics_events`: immutable event, visitor ID, optional account ID,
  allowed dimensions, occurred/received time, retention class.
- `analytics_network_observations`: IP (`inet`), bounded user agent, referrer,
  UTM, device class, purpose (`analytics_preconsent` or `fraud_security`), and
  purge deadline.
- `analytics_identity_links`: append-only visitor-to-account/profile link
  receipt and audit correlation.
- `analytics_account_profiles`: derived upsell projection: locked sections
  viewed, top-up packs viewed, Lá balance reference, last return, report depth,
  and approved reading-context enum.

Fraud/security IP observations are stored separately from analytics consent
and have their own approved retention rule. Raw IP and full user agent never
appear in Admin V1 projections, external analytics payloads, or customer-
facing event contracts.

Account export includes the customer's linked events and consent/link
metadata, excluding internal fraud signals unless law/policy requires them.
Account deletion purges or irreversibly detaches analytics rows according to
the approved statutory/fraud retention decision. Anonymous chart purge
continues to remove chart/profile data at 24 hours and does not delete an
otherwise valid unlinked visitor before the 30-day analytics boundary.

## Event Registry

Replace the legacy registry without dual-write:

`landing`, `wizard_start`, `wizard_step_complete`, `chart_success`,
`offer_view`, `locked_preview_view`, `topup_view`, `pack_selected`,
`checkout_created`, `payment_confirmed`, `la_spent`, `report_opened`,
`report_section_read`, `upgrade_view`, `upgrade_purchased`, `return_visit`.

Properties are closed per event. The server may join self-hosted data, but any
third-party exporter must reject name, exact birth date/time/place, free text,
`chart_id`, profile ID, report/evidence content, raw IP, and visitor/account
identifiers unless a later founder decision explicitly allows them.

## Bounded Flash Executor Slices

### 12A: Contracts, registry, and consent V2

**Owned files:** `config/analytics-events.json`,
`packages/config/src/analytics-events.ts`,
`packages/config/src/analytics-events.test.ts`,
`packages/contracts/src/analytics-event-v1.ts`,
`packages/contracts/src/privacy.ts`,
`packages/contracts/src/privacy.test.ts`,
`packages/database/src/schema/privacy.ts`,
`packages/database/drizzle/0029_identified_analytics.sql`,
`packages/backend/src/consent/consent.service.ts`,
`packages/backend/src/consent/consent.service.test.ts`,
`packages/backend/src/consent/consent.repository.ts`,
`packages/backend/src/consent/consent.repository.test.ts`,
`apps/api/src/privacy/privacy.controller.ts`,
`apps/api/src/privacy/privacy-http-flow.test.ts`.

**Behavior:** no-dual-write event registry and atomic multi-purpose consent.
Add an append-only `consent_receipts` parent and nullable
`consent_receipt_id` on legacy-compatible purpose rows. A V2 request creates
one receipt plus all four purpose rows in one transaction; V1 single-purpose
callers continue to write the legacy-compatible row shape. Identity-link
receipts have a unique visitor/account pair key so concurrent sign-ins replay
one link result.

**Acceptance:** one submission records all four purposes or none; V1 remains
valid; unknown purpose/version fails closed; a receipt is never partially
visible.

**Checks:** config/contracts/consent/API tests, producer builds,
`git diff --check`.

### 12B: Visitor and event persistence

**Owned files:** `packages/database/src/schema/analytics.ts`,
`packages/database/src/schema/analytics-schema.integration.test.ts`,
`packages/backend/src/analytics/analytics.repository.ts`,
`packages/backend/src/analytics/analytics.repository.test.ts`,
`packages/backend/src/analytics/analytics.service.ts`,
`packages/backend/src/analytics/analytics.service.test.ts`,
`apps/api/src/analytics/analytics.controller.ts`,
`apps/api/src/analytics/analytics.controller.test.ts`.

**Behavior:** server-owned cookie identity, PostgreSQL sink, bounded request
metadata, immutable events, and no client-controlled identity.

**Acceptance:** cookie security attributes pass; spoofed identity fields are
rejected/ignored; event writes contain no birth/chart/report content.

**Checks:** migration integration, analytics/API/security tests,
database/backend/API builds, `git diff --check`.

Migration `0029` is owned by 12A. QI owns the database barrel and API module;
12B must expose a factory with the existing module injection boundary and may
not edit those shared files.

### 12C: Link, merge, profile, and retention

**Owned files:** `packages/backend/src/analytics/analytics-identity.service.ts`,
`packages/backend/src/analytics/analytics-identity.service.test.ts`,
`packages/backend/src/analytics/analytics-retention.service.ts`,
`packages/backend/src/analytics/analytics-retention.service.test.ts`,
`packages/backend/src/analytics/analytics-profile.service.ts`,
`packages/backend/src/analytics/analytics-profile.service.test.ts`,
`packages/database/src/runtime.ts`,
`apps/web/src/auth/auth.ts`,
`apps/worker/src/maintenance/analytics-retention.ts`,
`apps/worker/src/maintenance/analytics-retention.test.ts`.

**Behavior:** exactly-once account/profile linking on wizard consent or sign-
in, 30-day unlinked purge, and derived upsell profile.

**Acceptance:** pre-link events merge once; concurrent sign-ins do not
duplicate; expired unlinked events/IP purge automatically; fraud rows follow
their separate retention.

**Checks:** auth-link integration, frozen-clock retention tests, backend/web/
worker builds and typechecks. Worker module registration is owned by QI. Run
`git diff --check`.

### 12D: Privacy export/deletion and FD-053 exporter

**Owned files:** `packages/backend/src/accounts/account-center.service.ts`,
`packages/backend/src/accounts/account-center.service.test.ts`,
`packages/contracts/src/account-center.ts`,
`packages/contracts/src/account-center.test.ts`,
`packages/backend/src/privacy/deletion.repository.ts`,
`packages/backend/src/privacy/deletion.service.test.ts`,
`packages/backend/src/analytics/third-party-export.ts`,
`packages/backend/src/analytics/third-party-export.test.ts`,
`apps/api/src/accounts/account-center.controller.test.ts`.

**Behavior:** extend the strict `AccountExportProjectionV1` contract with a
bounded linked-analytics and consent/link section, include permitted linked
analytics in export/deletion workflows, and enforce the third-party denylist.

**Acceptance:** FD-053 fields never leave the exporter; deletion/export is
owner-scoped; admin projections contain no raw network identifiers.

**Checks:** account/privacy/export tests, backend/API builds,
`git diff --check`.

### 12E: Claim input handoff

**Owned files:** no public copy. Produce the exact consent, sign-in notice,
and purpose-label keys for #13A's inventory and the later UI artifact brief.

**Behavior:** hand off message intent and required approval references without
editing localized files or adding a consent control.

**Acceptance:** #13C remains the sole owner of localized copy changes; one
checkbox remains; the UI artifact branch receives no unapproved wording.

**Checks:** claim-input completeness check and `git diff --check`.

## UI Artifact Handoff

The UI branch owns wiring the revised checkbox text, sign-in notice, privacy
purpose labels, and analytics event emission from visual interactions. It may
not add a new consent control.
