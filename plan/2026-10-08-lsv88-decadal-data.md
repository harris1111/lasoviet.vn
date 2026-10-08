# LSV88: decadal data for the revamp

## Bounded brief

Owner authorized executable backend work on 2026-10-08. Base master: 49639331.
Add complete vendor-derived decadal cycles, lifecycle state and current ordinal,
canonical bureau/master metadata, scoped transformations and annual palaces per
cycle. Select target-year annual data and use the vendor lunar birth year.
Reuse FD107/FD111 structural palace scores in the authorized backend projection;
do not add a fortune score or frontend. No paid writer, activation or outbound.

## Vendor facts and acceptance

Exact local iztro 2.6.0 decadalList/yearlyList APIs have been inspected. They use
rawDates.lunarDate.lunarYear and preserve twelve cycle palaces. Use the exact
ordered list rather than inferring direction from an ambiguous ordinal. Annual
rows use the public vendor fixEarthlyBranchIndex/getMutagensByHeavenlyStem
utilities at lunar 6/1, matching the installed yearlyList normal-year semantics
without calculating 120 unused daily/monthly layers; all 2400 annual rows in the
20-case export are checked against yearlyList.
Frozen-Tet, male/female direction, first/seventh cycle and pre-cycle tests are
required. Export twenty synthetic reference rows from installed vendor values,
explicitly distinguishing vendor parity from an independent external chart
comparison. Owner 2–3 manual samples and the independent 20-chart comparison remain
open until actual reference evidence is supplied; never label a self-comparison
as independent acceptance. Required gates, review, CI, deployment/smoke precede Done.

## Local evidence

-25 engine/horoscope/query tests plus 15 authorized query tests passed, with an
  independent reviewer repeating 5 new engine and 15 query tests successfully.
-20 synthetic charts verified all 12 cycles and 2400 annual age/year/palace rows,
  including all canonical transformation/star pairs against installed vendor.
  Receipt: `plan/evidence/lsv 88/decadal-vendor-parity-20.json`.
-Initial full vendor yearlyList projection took about 3 seconds/query. Public
  vendor-utility projection avoids 120 irrelevant horoscope calculations; focused
  tests now finish normally. No numeric fortune or compatibility score introduced.
-External chart reference comparison and owner 2–3 sample reading remain pending.
