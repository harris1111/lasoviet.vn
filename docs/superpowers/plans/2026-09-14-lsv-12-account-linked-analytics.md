# LSV-12 Account-Linked Analytics Implementation Plan

**Date:** 2026-09-14
**Status:** Approved for implementation
**Branch:** `ticket/lsv-12-20260914`
**Target:** `product/experience-spec-v1`
**Kaneo:** `LSV-12`

## Goal

Replace the legacy log-only analytics path with first-party PostgreSQL
tracking that uses a one-year `visitor_id`, records the approved funnel,
links prior visitor history after wizard consent or sign-in, exposes a bounded
account behavior projection for personalization, and purges unlinked data
after 30 days.

The implementation must not add a consent banner, popup, or checkbox. It must
not send name, exact birth data, free-text questions, `chart_id`, report
content, or evidence content to third-party tools.

## Binding Decisions

- FD-049 requires a complete migration from the legacy event names with no
  dual-write period.
- FD-051 keeps the primary analytics store in the existing PostgreSQL
  infrastructure.
- FD-053 prohibits sensitive birth, chart, free-text, report, and evidence
  fields from leaving self-hosted infrastructure.
- FD-081 requires identified account-linked tracking, a persistent first-party
  `visitor_id`, IP/user-agent/referrer/UTM capture, history linking after
  wizard consent or sign-in, a 30-day purge for unlinked data, and no new
  consent UI.
- The Kaneo authorization recorded on 2026-09-14 allows implementation within
  FD-081 and keeps payment/mailbox work deferred.
- FD-085 clarifies that account-linked behavioral data remains identifiable
  while the account exists and is purged on account/data deletion; all raw IP
  data has one 12-month retention period; and the VI/EN privacy disclosure
  ships atomically with collection in LSV-12 before LSV-13 adopts the claim.
- An approved this plan, migration, service-token boundary, test scope, and
  current branch as the limited artifact branch in chat on 2026-09-14.
- Account deletion, anonymous retention, admin authorization, route registry,
  branch, review, merge, and deployment rules in `AGENTS.md` remain binding.

## Verified Current State

1. `config/analytics-events.json` still defines the legacy 18-event registry.
2. `createApiAnalyticsSink` writes validated events only to the API logger.
3. The only production analytics emission is `paid_topic_selected` in the Zi
   Wei query service.
4. Consent accepts one free-form purpose per request and recognizes only
   privacy document version `2026-09-01`.
5. The wizard records only `birth-profile-calculation`; the required checkbox
   still contains the pre-FD-081 wording.
6. Better Auth already links the 24-hour anonymous actor and birth profiles to
   an account, but there is no durable visitor identity or analytics history.
7. The worker already runs non-overlapping maintenance every 15 minutes and is
   the correct home for unlinked analytics purge.
8. The account privacy projection displays raw purpose identifiers except for
   one obsolete special case.
9. The public privacy route currently renders only generic metadata, so the
   approved policy disclosure needs a real repository-owned content surface.
10. No third-party analytics adapter is enabled. LSV-12 therefore needs a
    tested export projection boundary, not an external provider integration.

## Proposed Architecture

### Identity And Cookies

- Add an opaque UUID `visitor_id` cookie at the canonical web boundary.
- Cookie attributes: `httpOnly`, `secure` in production, `sameSite=lax`,
  `path=/`, and `maxAge=31_536_000`.
- JavaScript never reads the identifier. First-party collection routes receive
  it automatically and forward it through an authenticated web-to-private-API
  command.
- Do not reuse Better Auth user, session, anonymous actor, chart, profile, or
  order IDs as the visitor identifier.

### Ingestion Boundary

- Add `POST /api/analytics/events` in the web application.
- The browser submits only the registered event name and allowlisted event
  properties. The route derives visitor identity, IP, user agent, referrer,
  UTM values, locale, pathname, and device class from the request.
- The route observes an existing Better Auth session without creating an
  anonymous account solely for analytics. When an account session is present,
  the private API atomically links the visitor before storing the event.
- The web route authenticates to a private Nest endpoint with a dedicated,
  short-lived, body-bound service token. The private API remains unpublished.
- Collection failures are reported server-side and do not claim success in
  logs, but analytics availability does not block chart creation, sign-in, or
  paid delivery.

### Storage

Create three self-hosted projections:

1. `analytics_visitors`
   - opaque visitor ID;
   - optional linked account ID;
   - first/last seen timestamps;
   - consent/link timestamps;
   - unlinked expiry timestamp;
   - no birth data or free text.
2. `analytics_events`
   - immutable event ID, visitor ID, optional account ID and optional internal
     birth-profile relation;
   - registered event name and validated JSON properties;
   - request context: IP, user agent, referrer, UTM, device class, locale, and
     pathname;
   - occurred and expiry timestamps.
3. `account_behavior_profiles`
   - one replaceable projection per account containing locked sections viewed,
     top-up packs viewed, current known balance, last return, report-read depth,
     and approved interest codes;
   - source timestamps and a projection version;
   - no copied birth data, chart payload, report text, or free-text question.

An internal visitor/profile association may reference a birth profile for
self-hosted joins, but `chart_id` and birth fields remain outside event
properties and outside every third-party export projection.

### Consent And Linking

- Introduce privacy document version `2026-09-14` with the exact purposes:
  `birth_profile`, `analytics`, `personalization`, and `offers`.
- Replace the single-purpose request with a strict versioned request that
  records the complete approved purpose set in one database transaction.
- Wizard submission sends the server-read `visitor_id` with the consent
  command. Consent grant and visitor-to-actor linking are atomic.
- After the birth profile is created, an idempotent internal command associates
  the visitor with that profile. This identifier is never exposed as an
  analytics property or third-party field.
- The global collector links a visitor to an existing signed-in account on the
  first request after email or Google sign-in, merging all prior unlinked
  events by updating ownership in one transaction.
- Repeated consent, sign-in, profile-link, and event commands are idempotent.

### Event Registry

Replace the legacy registry in one change. The canonical names are:

`landing`, `wizard_start`, `wizard_step_complete`, `chart_success`,
`offer_view`, `locked_preview_view`, `topup_view`, `pack_selected`,
`checkout_created`, `payment_confirmed`, `la_spent`, `report_opened`,
`report_section_read`, `upgrade_view`, `upgrade_purchased`, and
`return_visit`.

Each event has an explicit property allowlist. Internal ownership columns are
not event properties. Events whose product surface is not yet active remain
valid registry entries but must not be fabricated or emitted early.

### Third-Party Boundary

- Add a pure `AnalyticsExportEventV1` projector for future external adapters.
- The projector accepts only approved behavioral/commercial fields and rejects
  names, email, account IDs, internal primary keys, IP, exact birth data,
  free text, `chart_id`, profile IDs, report/evidence content, and unknown
  properties after Unicode-normalized key checks.
- Do not add Meta, TikTok, Google Ads, email marketing, or another external
  analytics provider in this ticket.

### Retention And Deletion

- Every unlinked visitor and event receives an expiry at first collection plus
  30 days.
- Linking clears the unlinked expiry and transfers ownership without copying
  events.
- Extend the existing 15-minute maintenance runner with a bounded,
  non-overlapping analytics purge.
- Account export includes the account-owned visitor history and behavior
  projection within explicit count/size limits.
- Account-linked visitor/event/profile data remains identifiable while the
  account exists and is purged on account or data deletion. Aggregated
  business metrics may survive only if they are irreversibly detached from
  visitor/account identity.
- Raw IP is retained for 12 months for both analytics/personalization and
  fraud/security purposes, then removed while eligible non-IP event history
  remains. Fraud/security IP storage remains a separate purpose and query
  boundary even though both purposes use the same retention period.

## Implementation Slices

### Slice 1: Contracts, Registry, And Database Foundation

**Owned files**

- Modify: `config/analytics-events.json`
- Modify: `packages/contracts/src/analytics-event-v1.ts`
- Modify: `packages/contracts/src/privacy.ts`
- Modify: `packages/contracts/src/account-center.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/config/src/analytics-events.ts`
- Modify: `packages/config/src/index.ts`
- Create: `packages/database/src/schema/analytics.ts`
- Modify: `packages/database/src/client.ts`
- Modify: `packages/database/src/index.ts`
- Modify: `packages/database/src/runtime.ts`
- Modify: `packages/database/drizzle.config.ts`
- Create: `packages/database/drizzle/0027_account_linked_analytics.sql`
- Modify: `packages/database/drizzle/meta/_journal.json`
- Add focused contract, config, schema, and migration tests.

**Acceptance**

- Only the FD-081 event registry validates.
- Legacy event names fail validation.
- Sensitive or unknown properties fail closed.
- Database constraints prevent invalid linked/unlinked state and duplicate
  idempotency keys.

### Slice 2: Analytics Domain, Persistence, And Purge

**Owned files**

- Replace: `packages/backend/src/analytics/analytics.service.ts`
- Create: `packages/backend/src/analytics/analytics.repository.ts`
- Create: `packages/backend/src/analytics/analytics-export.ts`
- Create: `packages/backend/src/analytics/account-behavior-profile.ts`
- Create: `packages/backend/src/analytics/analytics-retention.service.ts`
- Modify: `packages/backend/src/maintenance/phase-one-maintenance.ts`
- Modify: `packages/backend/src/index.ts`
- Modify: `apps/worker/src/worker.module.ts`
- Add focused unit and PostgreSQL integration tests.

**Acceptance**

- Event writes, visitor linking, profile association, and matching retries are
  transactional and idempotent.
- Prior history becomes account-owned after linking without duplicate events.
- Unlinked records expire after 30 days using an injected clock.
- Account behavior projections contain only the approved bounded fields.
- Third-party export tests prove all FD-053 fields are absent.

### Slice 3: Private API And First-Party Web Collection

**Owned files**

- Create: `packages/contracts/src/analytics-ingest.ts`
- Create: `apps/api/src/analytics/analytics.controller.ts`
- Create: `apps/api/src/analytics/analytics-service.guard.ts`
- Modify: `apps/api/src/api.module.ts`
- Create: `apps/web/src/auth/create-analytics-service-token.ts`
- Create: `apps/web/src/analytics/visitor-cookie.ts`
- Create: `apps/web/src/analytics/analytics-client.ts`
- Create: `apps/web/src/features/analytics/analytics-collector.tsx`
- Create: `apps/web/src/app/api/analytics/events/route.ts`
- Modify: `apps/web/src/proxy.ts`
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Add focused service-token, cookie, route, and collector tests.

**Acceptance**

- The cookie is one-year, opaque, HTTP-only, same-site, and secure in
  production.
- Browser payloads cannot supply IP, account/profile identity, or forbidden
  fields.
- Server-derived request context is normalized and bounded.
- The collector does not create a Better Auth anonymous actor merely to log a
  page visit.
- API ingress requires a valid body-bound service token and rejects replay or
  tampering within the defined command boundary.

### Slice 4: Consent, Sign-In Linking, And Product Events

**Owned files**

- Modify: `packages/backend/src/consent/consent.service.ts`
- Modify: `packages/backend/src/consent/consent.repository.ts`
- Modify: `apps/api/src/privacy/privacy.controller.ts`
- Modify: `apps/web/src/features/birth-profile/save-birth-profile.ts`
- Modify: `apps/web/src/features/birth-profile/birth-profile-actions.ts`
- Modify only the current product event call sites required for active
  LSV-12 events.
- Update focused consent, birth-profile flow, auth-return, and analytics
  integration tests.

**Acceptance**

- One wizard acceptance records exactly four purposes for version
  `2026-09-14`.
- Consent and visitor linking cannot partially commit.
- Email and Google sign-in link history on the first authenticated collection
  request.
- The old `paid_topic_selected` emission is removed; no legacy/new dual write
  exists.
- Inactive Lá or upgrade surfaces do not emit fabricated events.

### Slice 5: Privacy Projection, Export, And Approved Copy

**Owned files**

- Modify: `packages/backend/src/accounts/account-center.service.ts`
- Modify: `apps/web/src/app/[locale]/tai-khoan/quyen-rieng-tu/page.tsx`
- Modify: `apps/web/messages/vi/profile.json`
- Modify: `apps/web/messages/en/profile.json`
- Modify: `apps/web/messages/vi/auth.json`
- Modify: `apps/web/messages/en/auth.json`
- Modify: `apps/web/src/features/auth/auth-panel.tsx`
- Add a repository-owned privacy-policy content source and the smallest
  existing-template extension needed to render the approved VI/EN disclosure.
- Register the exact claims in the claim registry owned by LSV-13, or add a
  temporary repository claim record only if LSV-13 has not yet landed and An
  approves the integration order.
- Update account privacy, public content, i18n, and export tests.

**Acceptance**

- The wizard still has one checkbox with the founder-approved wording.
- Sign-in and sign-up show one terms/privacy notice without a checkbox.
- Purpose labels for all four purposes are localized and no raw purpose ID is
  shown to customers.
- The public privacy policy names collected data, purposes, retention,
  deletion/export rights, account linking, and FD-053 third-party limits.
- Account export includes owned analytics within existing fail-closed limits.

## Focused Verification

Run producer builds before dependent typechecks:

```bash
corepack pnpm@11.25.0 --filter @lasoviet/contracts build
corepack pnpm@11.25.0 --filter @lasoviet/config build
corepack pnpm@11.25.0 --filter @lasoviet/database build
corepack pnpm@11.25.0 --filter @lasoviet/backend build
corepack pnpm@11.25.0 --filter @lasoviet/api typecheck
corepack pnpm@11.25.0 --filter @lasoviet/worker typecheck
corepack pnpm@11.25.0 --filter @lasoviet/web typecheck
corepack pnpm@11.25.0 vitest run <focused analytics, consent, privacy, auth, and retention files>
corepack pnpm@11.25.0 i18n:check
corepack pnpm@11.25.0 content:check
corepack pnpm@11.25.0 eslint <changed source and test files>
git diff --check
```

The complete milestone then runs the repository test suite and production
build before Terra review.

## Review And Release

1. An approved this technical plan, migration, branch arrangement, and
   implementation scope on 2026-09-14.
2. Lãm resolved the three customer-facing retention/copy questions on
   LSV-12 on 2026-09-14.
3. Sol dispatches sequential bounded briefs to Flash Executor
   `ag/gemini-3.8-flash-high` with `high` reasoning.
4. Flash Executor owns only the files named in each brief and runs the focused
   checks.
5. Terra `cx/gpt-5.6-terra` with `high` reasoning independently reviews the
   complete milestone after all approved slices are integrated.
6. Sol adjudicates evidence-backed findings and issues only narrowed correction
   briefs.
7. Push, PR, merge, migration, deployment, and production smoke require An's
   explicit authorization. The PR targets `product/experience-spec-v1`.
8. Keep LSV-12 in `In Progress` or `In Review` until deployment and smoke
   evidence are recorded. Do not move it to `Done` from local tests alone.

## Deferred Or Excluded

- Third-party ad pixels or analytics provider activation.
- Marketing-email delivery, segmentation, or campaigns.
- Payment-provider or mailbox changes.
- Lá wallet, top-up, and upgrade product implementation owned by other tickets.
- New visual layouts, consent controls, banners, popups, or modal flows.
- A broad admin analytics dashboard beyond the bounded behavior projection.

## Owner Decisions

### Lãm

1. **Linked analytics retention:** Lãm selected retention while the account
   exists, with complete purge on account or customer-requested data deletion.
2. **Raw IP retention:** Lãm selected one 12-month retention period for both
   analytics/personalization IP and separately bounded fraud/security IP.
3. **Claims wording and sequencing:** Lãm approved the LSV-12 wizard/auth
   wording and VI/EN privacy-policy implementation in this ticket. LSV-13 will
   adopt the resulting claim record.

### An

1. An approved this implementation plan, including migration `0027`, the
   web-to-private-API service-token boundary, and the proposed test scope.
2. An approved `ticket/lsv-12-20260914` as the limited artifact branch for the
   minimal LSV-12 wording changes.
3. LSV-12 owns the initial claim record; LSV-13 adopts it after integration.
