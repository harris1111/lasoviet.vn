# LSV-13 Claim Registry Implementation Plan

**Date:** 2026-09-15
**Status:** Reconciled implementation independently approved; pull request,
deployment authorization, deployment, and deployment smoke evidence remain
pending.
**Target base:** `origin/product/experience-spec-v1` at `946d1bb`.

## Objective

Maintain a machine-readable registry of customer-facing claims and fail
validation when public content reintroduces known unapproved or prohibited
claims. The canonical registry now contains 20 claims.

## Binding Evidence

- FD-081 privacy wording is approved and published on the Vietnamese and
  English Privacy routes.
- Approved Terms wording covers La non-expiry/non-transferability, the
  seven-day upgrade rule, and report retry, case-by-case regeneration, or
  refund without an automatic outcome or fixed SLA.
- FD-053 third-party boundaries, founder-operated AI processing, anonymous
  retention, and export/deletion are published in Privacy.
- Under FD-067, finance/tax has not confirmed the invoice line wording
  `Lá service credit` / `La service credit`.

## Implemented Scope

1. Registry claims published in Privacy and Terms are `approved`,
   `publishable: true`, and `active` only at their verified public placement.
2. `la-invoice-wording-draft` remains `draft_finance`, non-publishable, and
   without an active placement.
3. The exact unapproved Vietnamese and English invoice-line sentences are
   removed from public Terms and rejected by the scanner.
4. Validation rejects any non-approved claim that declares an active placement.
5. Every active placement has structured source excerpts that must match its
   containment-checked real source after newline and NFC normalization.
6. Customer-facing file discovery fails closed before reading directory or file
   symlinks that escape the canonical repository root.
7. `la-credit-validity` is narrowed to purchased La as published in Terms;
   bonus-La non-expiry remains a separate approved claim with planned placement.
8. Focused tests preserve path-boundary and prohibited-pattern checks while
   covering invoice semantics, draft-active rejection, excerpt evidence, and
   scanner-walker symlink containment.

## Exclusions

- No wallet, top-up, invoice, payment-provider, analytics, consent, or
  customer-facing UI implementation.
- No change to approved privacy, Terms, retry/refund, or rich-renderer
  behavior outside removal of the finance-gated invoice line.
- No deployment, merge, production access, payment, mailbox, or external
  provider side effect.

## Review and Verification

The separate Terra high milestone review completed after the bounded correction
pass with `SPEC PASS / QUALITY APPROVED`, 0 must-fix findings, and 0 optional
findings.

Final verification on 2026-09-15:

- Focused public-claim suite: 57 tests passed.
- Public content check: 20 claims validated with 0 violations.
- Internationalization check: passed.
- Lint: passed with 0 errors and one existing out-of-scope Tarot `<img>`
  warning.
- Dependency-ordered typecheck: passed.
- Full build: passed.
- Full Vitest suite: 242 files and 2,219 tests passed.
- `git diff --check`: passed.

## Closure Gate

Finance/tax confirmation of the FD-067 invoice description is the only
remaining content-approval gate. LSV-13 remains **In Review** while pull request
creation, deployment authorization, deployment, and deployment smoke evidence
are pending.
