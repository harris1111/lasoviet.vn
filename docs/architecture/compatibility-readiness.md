# Compatibility readiness and mobile flow draft

Status: design-only, 2026-09-30. Kaneo #66 remains blocked for paid execution.

## Binding scope

FD-105 sets Hợp đôi at 600 Lá. OD-005 Option C requires **Zi Wei and BaZi together**, with source-separated evidence for two people. It does not authorize a Zi Wei-only replacement. FD-063 prohibits invented compatibility scores. The owner decision explicitly permits planning and contract design while source-system implementation and stability gates remain unresolved.

Sources:

- [Owner decision OD-005](../superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md#open-decisions-od-001-through-od-006-resolved), lines 733–741.
- [FD-105 package 2.5](../superpowers/plans/2026-09-27-la-ladder-funnel-implementation.md), lines 252–253.
- [Phase 11 compatibility plan](../superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-11-compatibility-fengshui-and-extraction.md), entry gate and tasks 1–2.
- [Engine discipline gate](../23-index-eligibility-gate.md), §0 and §2.5.

## Verified missing dependencies

The master baseline `223aa5d0` contains only Zi Wei engine adapters. It has no normalized BaZi chart contract, BaZi adapter, BaZi persistence, BaZi evidence contract, or compatibility synthesis writer. `packages/engine-adapters/package.json` lists `iztro` and `lunar-typescript`, without a BaZi adapter integration. The birth-year-only free love tool is not evidence for this paid product.

Before implementation, Phase 08 must provide a reviewed normalized BaZi contract, exact-version engine integration and method record, immutable profile/revision-bound calculation and evidence, trusted deterministic fixtures, and source-system stability evidence. Each participant must have both source systems. A failed or missing source blocks compatibility; it must never be filled with invented facts or silently omitted.

The shared consent table records account/document/purpose grants. It does not bind both profile revisions or the other participant's authorization. Existing profile ownership is not proof that the identifiable second person consented to synthesis or disclosure.

## Draft private data boundary

`packages/contracts/src/compatibility-readiness-draft-v1.ts` is a design-only validator, intentionally not exported from the package barrel or used by a route, wallet command, worker, or report dispatcher. Its synthetic tests establish required shape, not calculation correctness or valid consent.

A candidate freeze references two distinct profile revisions. Each includes separately identified Zi Wei and BaZi chart/evidence versions, engine/adapter/ruleset versions, source hashes, and limitations. Each consent binds the authenticated participant, both exact revisions, a versioned document, purpose, and server grant time. Revoked, late, missing-version, or mismatched consent fails validation. Parsing identifiers never authorizes a read: the eventual repository must resolve ownership and participant consent itself and freeze server-fetched data only.

The future server must prevent supplied chart IDs from reading another account's private chart. Cross-owner access requires the invited participant's authenticated, explicit grant for this pair. Same-owner family profiles still require the other person's explicit consent; the profile manager's checkbox alone must not silently stand in for that person. The draft distinguishes profile ownership from the subject participant; the identity-proof and invitation workflow must be finalized before execution is built.

Consent must be revalidated before computation, purchase, generation, and every report/evidence/PDF read. Revocation or profile deletion closes both participants' access and stops queued generation. A revised profile requires renewed pair-specific consent and a new frozen pair. Purchase provenance remains append-only; compensation, retention, deletion, and access behavior must be reviewed together before implementation.

## Mobile-first flow for review

This is a planning artifact, with no fake input form or newly exposed route.

1. Select your saved profile. Show the name, birth-data summary, revision, and a clear change action in one column.
2. Choose the other profile through an authorized invitation. The initiator sees invitation status, not the other person's private birth data. The participant opens a private sign-in link, selects their own profile, and reviews which data and report will be shared.
3. Present unchecked consent for the exact pair and both methods. Explain report access, cancellation/revocation, and source limitations before the participant grants consent. Record document version and server time.
4. Show one card per person, then one row per method: Zi Wei ready, BaZi ready, consent ready. If any prerequisite is absent, show the real reason and return to an available Zi Wei reading. No purchase CTA is enabled.
5. Once all reviewed source gates pass, show the existing Lá confirmation pattern: item, 600 Lá, balance, balance after, confirm/cancel. Short balance uses the immutable top-up continuation. An authorized server transaction must bind a single debit and entitlement to the exact immutable pair.
6. Reading order: Zi Wei evidence, BaZi evidence, agreements, tensions, limitations, bounded synthesis. Do not merge disagreement into a numeric match score. Report access and downloads recheck consent and source ownership on the server.

At 320 px, use stacked cards, full-width actions, visible field labels, an accessible consent description, keyboard focus, and a non-overlapping confirmation footer. Invitation, unavailable-source, revoked-consent, payment-pending, generation-failure, and ready states need independent browser coverage once implemented.

## Release evidence still required

- Reviewed BaZi runtime, fixtures, evidence, and stability; compatibility source-separated writer and contract.
- Reviewed participant identity/consent, revocation, retention, and private report-sharing policy.
- Atomic 600-Lá spend/entitlement and immutable paired generation, replay/concurrency tests, and cross-owner/deleted/stale/revoked access tests.
- Report-quality gates applicable to the exact writer, independent review, mobile flow smoke, deployment evidence, and an explicit catalog release change.

No paid reservation, migration, computation, new route, SKU activation, invented score, or production change is included in this planning slice. This document does not resolve missing source-system gates or claim the complete ticket is implemented.
