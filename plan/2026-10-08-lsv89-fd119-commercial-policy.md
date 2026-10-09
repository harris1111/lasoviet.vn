# LSV89 atomic FD119 commercial policy

Base: PR334 c8dfba21ae9352aa012dfce3837a22a0ffb965a8 (depends on PR333/334).
Implement the approved new-purchase commercial-policy portion of LSV89: current
Zi Wei lifetime1200 La, versioned post-FD119 frozen promises and server-derived
half guarantee for a charged purchase at/above500 La. Below500 remains full and
zero-price remains no paid compensation. No retrospective change: NULL/v1 intents,
completed receipts and accepted same-order top-ups retain their historical base,
guarantee and credit proof. A refreshed pending offer retains its frozen policy only within the same
owner/chart/version/SKU/locale/period scope, with an append-only replacement audit; current new purchases use the released policy only.

Extend rollover proof/version authority to1200 while retaining version1 cap960.
Do not apply a new cap to historical proofs. Update catalog and public compatible
price/upgrade bounds together with migration checks and strict frozen policy
validation. New product families, annual pairs and decade writing are separate
remaining LSV89 milestones; no incomplete product sale is activated.

Only the private guarantee service can request derived partial restoration. It
must validate frozen policy, ownership, posted spend, all linked report readiness for the newly introduced half guarantee,
24-hour eligibility under fresh locked time, original allocation math and replay.
Below500 retains the existing full guarantee behavior. An unsupported odd half
amount fails closed rather than introducing a rounding rule. A public command
cannot select an amount or a compensation policy. Half returns
still revoke all linked entitlements. Terminal generation/validation failure
continues full compensation and cannot race a ready-only half guarantee.

Allowed scope: contracts catalog/price/upgrade/guarantee compatibility, backend
purchase terms/quote/settlement/upgrade/guarantee/wallet authority and focused
financial tests, new database migration/schema and historical rewind fixtures,
this brief, existing frontend quote-contract and isolated funnel golden-path
tests, and concise release evidence.
Frozen-price recovery eligibility/template validation is included in the compatibility scope.
No visual frontend, new routes, provider
calls, operator/Nginx edits, SePay/customer outbound or membership sale activation.
Frontend remains Lam/Claude; deliver any affected contract/copy requirement to its
ticket. Preserve settled API/model/pricing and FD119/121 decisions.

Validation: old and new policy cohorts; legacy and snapshot pending top-ups under
catalog change, membership/rollover expiration and replay; mixed-bucket half and
full terminal compensation; malformed/private authority and ready-state races;
real PostgreSQL invariants, producer rebuild, required i18n/lint/typecheck,
independent exact-head review and fresh CI. The approved scope requires a reviewed
atomic release before new prices/promises apply; record successful immutable
deployment and scope smoke. Do not mark full LSV89 Done without its remaining
product/writer/manual gates.

## Frontend release dependency

LSV83 retains Lam/Claude ownership. Before activating the catalog/policy, reconcile
annual.offerCta (VI/EN960), ladderLifetimeComparison (eight palaces), static
upgrade_price_notice and purchase-offer-presentation720/960 fallbacks with current
1200/ten-palace offers and original historical quotes.
Also reconcile VI/EN reports.guarantee.priceLimit/conditions and any guarantee
eligibility controls: the current copy says below500 only, while new frozen policy
supports full below500 and half at/above500, preserving historical rights.
Existing quote-contract tests retain an explicit historical960 base and assert the current1200 guest fallback;
this does not implement or certify visual/copy acceptance. Keep this policy release
held until the matching frontend contract/copy can ship together. No new owner
pricing/API/model question is required.

## Local validation, 2026-10-08

Final full Vitest run: 479 files passed, three skipped; 4,640 tests passed, three
skipped. Script suite: 75 passed, zero failed. Production web build, consumed
producer builds, i18n parity, lint and typecheck passed; lint retains four existing
warnings. The actual PostgreSQL cases include old NULL/v1 price preservation,
same-purchase scope, new version2 proofs and zero-price ten-palace rollover,
mixed-bucket half guarantees, all Combo components, fresh locked 24-hour expiry,
ready-version replacement and full terminal compensation. No live provider call,
customer outbound, production refund or new policy activation was performed.
Fresh CI and final independent exact-head review remain required after committing.

## Isolated real-network acceptance correction

Updated golden-path independent expected prices to released1200/upgrade960 and
asserted version2/fd119 frozen base1200 in the settled intent. The upgrade cohort
uses two existing synthetic1100-La grants plus the actual welcome60 to cover the
new total; cumulative spend is independently asserted1200. The separate short-
balance path, replay/preview privacy and all eleven durable events remain intact.
Final isolated run:14/14 mobile/desktop paths passed; zero AI calls. Owned QA
containers/network/credentials were removed. Required i18n/lint/typecheck passed
after this test-only correction. New exact-head review and fresh CI remain gates.

## Reconciliation with 2026-10-09 master

Reconcile master8e72a87f including Lam/Claude FE345/351 and the approved backend
source/CLI releases. Only conflicts are test expectations: preserve the new
selection-dialog and Escape flow with candidate1200 price; preserve historical
authoritative960 quotes while guest catalog fallback uses1200. No UI component,
translation, visible copy or business-policy behavior is implemented here.
Current FE still has960/720 literals and below500-only guarantee copy; the atomic
FD119 release hold remains. Focused financial/quote checks, required checks,
independent exact-head review and fresh CI apply before pushing the reconciled
candidate; real-network golden paths need rebuilding against this exact tree.
Do not infer new-policy deployment or activate reserved products.

Reconciled focused run:94 tests across eight financial/catalog/quote suites
passed. Producer and production web builds, i18n/lint/typecheck passed, retaining
four existing lint warnings. The first isolated golden run correctly rejected
a stale ungrouped1200 expectation: the actual new unlock sheet renders1.200 La.
Only the independent displayed-price expectation is corrected; actual wallet,
frozen-price, once-only replay and eleven durable-event checks stay intact.
A fresh isolated golden run, exact-head review and CI remain required.

## Unapplied migration reconciliation (2026-10-09)

Bounded maintenance: reserve0066 for the reviewed private Bazi source PR365.
Rename only this unapplied FD119 migration to0067/index67 with a later timestamp,
preserving its SQL body and all applied≤0065 byte-for-byte. Merge the reviewed
Bazi source dependency, then run real schema replay/FD119 commerce regression,
producer and required gates, independent exact-head review and fresh CI.
Previous validation receipts describe their original heads; they are not fresh
evidence for this migration head. Public FE/manual/native/price-release holds
remain binding; this draft is not deployed or merged.
