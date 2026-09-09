# WP-10 Funnel Analytics Blocker Report

## Status

WP-10 implementation is deferred pending two privacy/product inputs. No runtime
or schema changes were made.

## Verified Current State

- `config/analytics-events.json` still contains the legacy event vocabulary.
- The API analytics sink writes validated events to application logs rather
  than PostgreSQL.
- The only current customer consent is birth-data processing consent. It is not
  analytics consent and must not be reused for funnel tracking.
- The consent API can persist a founder-approved document/version/purpose, but
  there is no approved analytics consent document, grant/revoke UX, or browser
  state contract.
- Commerce stores real and `disabled-autopay:` payment events, but the
  repository has no complete AI COGS, payment-fee, refund-cost, or variable
  support-cost source for the binding 30-day contribution-margin KPI.

## Required Stakeholder Inputs

1. **Analytics consent acquisition and withdrawal**
   - Exact customer surface: cookie/banner, account setting, checkout setting,
     or another explicit mechanism.
   - Whether consent is account-bound, anonymous-session-bound, or transferred
     from anonymous to account state.
   - Approved Vietnamese/English consent copy.
   - Canonical consent document key, version, purpose, and withdrawal behavior.
   - Whether previously collected self-hosted events are deleted or retained
     after withdrawal.

2. **Contribution-margin cost sources**
   - Authoritative source for per-attempt AI COGS, including retries.
   - Authoritative payment-fee source.
   - Refund-cost treatment.
   - Variable support-cost source and allocation rule.
   - Whether the first implementation may store explicit internal cost ledger
     rows or must integrate another approved source.

## Safe Work Deferred With The Blocker

After these decisions, WP-10 can atomically:

- replace the legacy event registry without dual-write;
- add PostgreSQL event/session/cost storage;
- require explicit analytics consent before canonical funnel ingestion;
- add server-only third-party export projections with prohibited-field scans;
- instrument approved funnel points;
- calculate real-revenue and 30-day contribution-margin projections while
  excluding every `disabled-autopay:` event.

No third-party analytics export, production activation, dashboard, or external
side effect is authorized by this report.
