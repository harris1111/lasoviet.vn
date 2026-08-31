# Open Decisions

These decisions are intentionally deferred until their implementation phase.
Approval of the planning package does not resolve them. Sol must present the
current evidence and recommendation in Vietnamese; silence is never approval.

## Decision Register

| ID | Decision gate | Blocks | Status |
|---|---|---|---|
| OD-001 | Remaining Zi Wei SKU launch prices and enablement order | Phase 07 Task 1 checkout enablement | Open |
| OD-002 | BaZi paid SKU name, scope, and launch price | Phase 08 Task 4 checkout enablement | Open |
| OD-003 | Western natal paid SKU name, scope, and launch price | Phase 09 Task 3 checkout enablement | Open |
| OD-004 | Liu Yao cooldown and repeated-question policy | Phase 10 Task 3 public release | Open |
| OD-005 | First compatibility systems, SKU scope, and price | Phase 11 Tasks 1-2 | Open |
| OD-006 | First public Feng Shui utility | Phase 11 Task 3 | Open |

## OD-001: Remaining Zi Wei Commercial Sequence

**Decision:** Confirm launch order and production price for
`ZIWEI-RELATIONSHIP-P0`, `ZIWEI-CAREER-P0`, and `ZIWEI-YEAR-P0`.

**Why it matters:** The existing VND 79,000 values are product hypotheses.
Enabling all three together would weaken per-topic quality and conversion
measurement.

**Option A:** Launch one topic at a time at VND 79,000.

**Option B:** Launch one topic at a time with a founder-selected price per
topic.

**Option C:** Keep completed reports internal until more identity-report data
is available.

**Recommendation:** Option A unless P0 conversion, refund, or support data
shows a clear reason to change the price.

**Blocks implementation?** No for evidence/report preparation; yes for public
checkout enablement.

## OD-002: BaZi Paid Offer

**Decision:** Confirm the first BaZi paid SKU name, report scope, and launch
price.

**Why it matters:** BaZi should not inherit Zi Wei's four-topic packaging
without evidence, and checkout must remain server-authoritative.

**Option A:** One comprehensive BaZi report at VND 79,000.

**Option B:** One narrower report at a lower founder-selected validation price.

**Option C:** Launch the free calculator first and defer paid checkout until
usage data is available.

**Recommendation:** Option A if internal report QA meets the common release
gate; otherwise Option C.

**Blocks implementation?** No for method, calculation, evidence, or free UI;
yes for paid checkout enablement.

## OD-003: Western Natal Paid Offer

**Decision:** Confirm the first Western natal paid SKU name, report scope, and
launch price.

**Why it matters:** The initial offer must match Celestine's verified natal
capabilities and must not imply unsupported Solar Return functionality.

**Option A:** One natal interpretation covering planets, angles, houses, and
aspects at VND 79,000.

**Option B:** A narrower Sun/Moon/Rising interpretation at a lower
founder-selected validation price.

**Option C:** Launch the free chart first and defer paid checkout.

**Recommendation:** Option A after natal fixtures and twenty-report QA pass.

**Blocks implementation?** No for natal calculation, evidence, or free UI; yes
for paid checkout enablement.

## OD-004: Liu Yao Cooldown

**Decision:** Select the cooldown and repeated-question policy.

**Why it matters:** A deterministic replay record is not enough to prevent
compulsive recasting or contradictory paid interpretations.

**Option A:** One active cast per normalized question every 24 hours, with the
previous cast shown instead of rerolling.

**Option B:** A 12-hour cooldown with a prominent prior-cast history.

**Option C:** No hard cooldown, but require explicit acknowledgement and show
all prior same-question casts.

**Recommendation:** Option A because it is simple, testable, and aligned with
the non-compulsive product principle.

**Blocks implementation?** No for adapter and replay fixtures; yes for public
casting release.

## OD-005: Compatibility Launch Scope

**Decision:** Select the first source systems, paid SKU scope, and price for
compatibility.

**Why it matters:** Cross-system synthesis is credible only when every source
system has stable individual evidence and when both profiles have valid access
and consent.

**Option A:** Start with Zi Wei compatibility only.

**Option B:** Start with BaZi compatibility only.

**Option C:** Launch Zi Wei plus BaZi synthesis after both individual systems
meet stability gates.

**Recommendation:** Option A for the smallest independently reviewable launch.

**Blocks implementation?** Yes for compatibility contract finalization,
synthesis, and public offer.

## OD-006: First Feng Shui Utility

**Decision:** Select the first public utility.

**Why it matters:** House, desk, kitchen, and element/color guidance require
different inputs and evidence; implementing all of them together would broaden
scope without demand evidence.

**Option A:** House-direction utility.

**Option B:** Desk-direction utility.

**Option C:** Basic element/color guidance.

**Recommendation:** Option A because it has the clearest standalone input and
output contract. Kitchen direction can follow after method review.

**Blocks implementation?** Yes for the Phase 11 Feng Shui contract, fixtures,
and public page.

## Closure Protocol

When the founder resolves an item:

1. Record the answer, date, and exact scope in
   `rules-and-decisions-tracker.md`.
2. Mark the item `Resolved` here and link the superseding founder decision.
3. Update the affected phase files, product catalog, traceability, and risks.
4. Obtain renewed approval if the resolution materially changes the approved
   architecture or release gates.
