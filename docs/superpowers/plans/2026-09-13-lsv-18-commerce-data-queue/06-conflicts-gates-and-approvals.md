# Conflict Map, Gates, and Approvals

## Resolved Plan-Level Conflicts

| Conflict | Resolution |
|---|---|
| #18 comment retains FD-080, while #12 requires identified analytics | FD-081 is later and binding; use identified account-linked tracking |
| #18 preview work depends on #11 while #11-C depends on #10 | Split #18 into pre-queue foundation and post-#11 generated-preview slices |
| Consent V2 requires one atomic receipt but legacy consent rows are per-purpose | Add append-only receipt parent plus compatible purpose rows in #12A |
| New business capability has no active seed path | #10 owns additive capability seed migration `0030` and the role/policy entry |
| The live capability enum is canonical in `admin-auth.ts`, not `capability.ts` | #10B extends `AdminCapabilitySchema` and the live role matrix; exact roles remain founder input |
| Strict account export has no analytics section | #12D owns the `AccountExportProjectionV1` extension and its contract tests |
| Legacy API analytics is a log sink | QI replaces it with the #12 PostgreSQL sink and tests that no dual-write remains |
| Shared barrels/controllers/module files overlap across slices | QI owns root exports, API/worker wiring, outbox registration, and the central schema integration suite; feature slices expose local factories |
| Spec §16 item 5 requires VND equivalents for Lá | Spec §18.2 and FD-065 supersede it; credit surfaces show Lá only |
| `commerce_entitlements.order_id` is required | Keep historical order source; add spend source; require exactly one |
| Top-ups cannot satisfy required chart fields | Add `order_kind`; top-ups forbid chart fields |
| Pending `(chart_id, sku)` uniqueness affects top-ups | Scope the partial index to content-purchase rows |
| Migration 0023 upgrade credit is VND-order logic | Preserve historical fields read-only; new upgrade is one 720-Lá price |
| `FreeIdentityPreviewV1` hardcodes 19k/79k VND | Add V2; retain V1 unchanged |
| Invoice number currently belongs to every order | Preserve historical rows; new invoice issue occurs only on paid top-up |
| Top-up confirmation and unlock failure are coupled | Secure top-up first, then recover intent idempotently |
| Revenue at top-up conflicts with FD-067 | Top-up is deferred revenue; paid-Lá allocation recognizes revenue at spend |
| Bonus-lot revenue allocation was underspecified | Use exact integer micro-VND paid-lot vectors; promotional units have zero value |
| Bonus Lá could inflate revenue | Promotional allocation is always zero revenue |
| UI requirements appear in non-UI tickets | Implement headless contracts/data only; defer visual wiring to UI artifact branch |
| Parallel PRs can collide on migration numbers | Reserve 0026-0030 in this plan and reassign centrally if `master` changes |

## NEEDS_FOUNDER_INPUT

1. **Plan approval:** approve this dated queue plan, scope, and the proposed
   three-section / 3,000-VND free-preview cap before any implementation.
2. **Top-up refund after spend:** approve the final customer and entitlement
   policy. The plan's fail-safe only restricts the wallet and halts sales; it
   does not assert customer debt or revoke delivered ownership.
3. **Unlock refund eligibility:** define which non-delivery states trigger an
   automatic Lá restoration versus continued recovery.
4. **Fraud/security IP retention:** approve a concrete retention period and
   deletion/export treatment distinct from 30-day pre-consent analytics.
5. **AI unknown-usage accounting:** approve a provider billing source or a
   conservative fallback if failed calls do not return actual usage.
6. **Pricing currency/FX:** approve the authoritative model-price source and,
   if needed, versioned FX source used for VND CM30.
7. **Claim wording:** approve exact VI/EN terms, privacy, Lá, invoice, refund,
   failure-recovery, and AI wording after the #13 conflict report.
8. **Merge and release:** separately authorize every PR merge, deployment,
   provider activation, and public feature activation.
9. **Consent and capability migration scope:** confirm that the receipt-parent
   consent model and the new admin capability seed are acceptable additions to
   the existing privacy/admin schemas.
10. **Business-metrics role assignment:** select the exact existing admin role
    or roles that receive `admin.business_metrics.read`; no role is granted by
    an undocumented default.

## NEEDS_EXPERT_APPROVAL

1. Vietnamese legal review of the permitted/prohibited commercial-technique
   table and identified analytics consent/retention wording.
2. Legal review that Lá is a closed-loop service credit with no cash value,
   transfer, or withdrawal right.
3. Finance/tax approval of the top-up invoice line item and deferred-revenue
   recognition/allocation method.
4. Accounting approval of refund, promotional discount, rounding, FX, and
   restricted-shortfall treatment.
5. Privacy/security approval for raw IP storage, fraud-purpose separation,
   access control, retention, export, and deletion.

## Migration Gates

- Additive migrations only; no destructive rewrite or fabricated legal dates.
- Test clean install and upgrade from `origin/master`.
- Reconcile wallet cached balances to ledger sums before enabling writes.
- Prove all legacy order/entitlement/report projections remain readable.
- Run producer builds before dependent typechecks.
- Stop if any migration number or owned schema file overlaps another open PR.

## Release Gates

- Founder approves the implementation plan and exact open decisions.
- Terra approves each milestone with no unresolved `must-fix`.
- SePay sandbox proves authenticated callback, replay, self-claim, and refund
  handling.
- AI provider contract proves usage/model/pricing evidence.
- Legal, finance/tax, accounting, and privacy approvals are recorded.
- Claim registry is founder-approved and CI-enforced.
- Feature-off reads preserve existing balances and entitlements.
- Dedicated UI artifact implementation passes plaintext leakage,
  accessibility, mobile banking-return, and no-VND-on-credit-layer checks.
- Founder separately authorizes deployment and staged production activation.

## Branch and PR Gate

For every implementation ticket:

1. fetch and verify latest `origin/master`;
2. create the dedicated ticket worktree/branch from that exact commit;
3. use only Sol-assigned files and checks;
4. push the branch and open a PR directly to `master`;
5. run non-mutating Git and semantic-overlap checks against related PRs;
6. complete required Terra review and corrections; and
7. wait for explicit founder merge authorization.

No agent merges.
