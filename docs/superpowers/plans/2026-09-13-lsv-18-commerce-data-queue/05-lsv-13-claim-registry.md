# LSV #13 Claim Registry Plan

## Scope

Create one versioned source for customer-facing commitments and enforce it
across public copy, commerce messages, privacy/terms content, and future UI.
Do not change product policy, price, refund rights, retention, or legal
position without a founder decision.

## Registry Contract

`config/claims.yml` is the sole versioned claim-definition source. Each entry
contains:

- stable claim ID and topic;
- status: `draft`, `expert_review_required`, or `founder_approved`;
- exact VI/EN wording;
- binding decision/policy references;
- applicable route IDs and message/content locations;
- effective date and superseded claim ID;
- required legal, finance, privacy, or founder approval; and
- prohibited conflicting phrases.

`packages/config/src/claims.ts` validates the YAML and resolves route IDs
against `config/route-registry.yml`. Runtime surfaces consume approved claims
through typed keys; the registry must not become a second product-decision
register.

## Required Claim Groups

- privacy: birth data, anonymous 24-hour chart retention, identified analytics,
  IP/device/behavior collection, third-party FD-053 limits, export/deletion,
  AI provider boundary;
- payments: VietQR/SePay, QR expiry, self-claim, unmatched funds, retry and
  duplicate-payment behavior;
- Lá: no cash value, no transfer/withdrawal, no expiry in V1, paid/promo
  buckets, bonus truth, top-up invoice timing, Lá-only content pricing;
- upgrade/refund: seven-day 720-Lá upgrade, failed-delivery compensation,
  top-up reversal behavior after spend;
- AI/content: AI role, evidence limits, "Lá Số Việt biên tập", no human-review
  claim, no absolute/scientific-accuracy claim; and
- business metrics: transaction data used for aggregate operations/revenue.

## Inventory and Approval Flow

1. Inventory current wording and produce an English conflict report.
2. Mark unresolved wording as draft; do not silently normalize it.
3. Founder obtains the required legal/finance/privacy expert answers.
4. Founder approves exact VI/EN wording and effective scope.
5. Flash updates the registry and only the listed copy locations.
6. CI rejects unregistered or prohibited high-risk claims.

Known source locations include:

`content/public/{vi,en}/pages/privacy.mdx`,
`content/public/{vi,en}/pages/terms.mdx`,
`content/public/{vi,en}/pages/faq.mdx`,
`content/public/{vi,en}/pages/contact.mdx`,
`apps/web/messages/{vi,en}/reports.json`,
`apps/web/messages/{vi,en}/profile.json`,
`apps/web/messages/{vi,en}/auth.json`,
`apps/web/messages/{vi,en}/account.json`, and
`apps/web/messages/{vi,en}/common.json`.

## Automated Enforcement

The checker:

- validates claim IDs, route references, language parity, approval status, and
  supersession;
- validates every registered route ID and source path against the canonical
  route registry and repository-root containment rules; absolute, UNC,
  traversal, symlink-escaping, and sibling-lookalike paths fail closed;
- scans public content and localized messages after normalizing Unicode and
  CRLF/LF;
- blocks absolute accuracy/science claims, false human review, fabricated
  crossed-out prices, false scarcity/countdowns, fear-based fortune selling,
  and unapproved health/reproduction/lottery claims;
- blocks the withdrawn `1 Lá = 1,000 VND` and VND equivalents on credit-layer
  surfaces; and
- fails when an approved claim's registered locations no longer contain the
  approved wording.

## Bounded Flash Executor Slices

### 13A: Inventory only

**Owned files:** `docs/superpowers/plans/2026-09-13-lsv-18-commerce-data-queue/claim-conflict-report.md`.

**Behavior:** enumerate current claims, conflicts, routes, decision sources,
and required approvers without changing customer copy.

**Acceptance:** every required group has at least one inventory row; unresolved
items are listed at the end.

**Checks:** link/path existence scan, `git diff --check`.

### 13B: Registry and typed loader

**Prerequisite:** founder-approved wording.

**Owned files:** `config/claims.yml`,
`packages/contracts/src/claims.ts`,
`packages/contracts/src/claims.test.ts`,
`packages/config/src/claims.ts`,
`packages/config/src/claims.test.ts`.

**Behavior:** implement the strict registry and route validation.

**Acceptance:** drafts cannot be resolved for production rendering; duplicate
or unknown routes fail.

**Checks:** contracts/config tests and builds, YAML validation,
`git diff --check`.

QI owns the contracts/config exports. This slice exposes local schemas and
loaders and must not edit either shared barrel directly. #13 adds no migration.

### 13C: Approved copy synchronization

**Owned files:** `content/public/vi/pages/privacy.mdx`,
`content/public/en/pages/privacy.mdx`, `content/public/vi/pages/terms.mdx`,
`content/public/en/pages/terms.mdx`, `content/public/vi/pages/faq.mdx`,
`content/public/en/pages/faq.mdx`, `content/public/vi/pages/contact.mdx`,
`content/public/en/pages/contact.mdx`, `apps/web/messages/vi/reports.json`,
`apps/web/messages/en/reports.json`, `apps/web/messages/vi/profile.json`,
`apps/web/messages/en/profile.json`, `apps/web/messages/vi/auth.json`,
`apps/web/messages/en/auth.json`, `apps/web/messages/vi/account.json`,
`apps/web/messages/en/account.json`, `apps/web/messages/vi/common.json`, and
`apps/web/messages/en/common.json`.

**Behavior:** replace conflicting wording only in this closed file list with
registry-approved VI/EN copy. #13A must produce the exact row-level change
list before Sol reissues the #13C brief; files with no approved change remain
untouched.

**Acceptance:** no product/policy value changes beyond the approved claims;
VI/EN parity and route coverage pass.

**Checks:** `pnpm i18n:check`, `pnpm content:check`, focused render tests,
`git diff --check`.

### 13D: CI claim gate

**Owned files:** `scripts/check-public-content.mjs`,
`scripts/check-claims.mjs`,
`tests/content/claims-registry.test.ts`,
`package.json`, `.github/workflows/ci.yml`.

**Behavior:** run registry validation and normalized prohibited-claim scans in
CI.

**Acceptance:** fixtures prove every prohibited category fails and approved
wording passes on LF and CRLF input.

**Checks:** claim/content tests, `pnpm content:check`, lint,
`git diff --check`.
