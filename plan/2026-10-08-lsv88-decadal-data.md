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
as independent acceptance. The scoped comparison below now supplies independent
core cycle evidence; excluded fields and manual acceptance remain open.
Required gates, review, CI, deployment/smoke precede Done.

## Local evidence

- 25 engine/horoscope/query tests plus 15 authorized query tests passed, with an
  independent reviewer repeating 5 new engine and 15 query tests successfully.
- 20 synthetic charts verified all 12 cycles and 2400 annual age/year/palace rows,
  including all canonical transformation/star pairs against installed vendor.
  Receipt: `plan/evidence/lsv88/decadal-vendor-parity-20.json`.
- Initial full vendor yearlyList projection took about 3 seconds/query. Public
  vendor-utility projection avoids 120 irrelevant horoscope calculations; focused
  tests now finish normally. No numeric fortune or compatibility score introduced.
- Owner 2–3 sample reading and the excluded independent fields remain pending.

## Independent reference comparison: bounded evidence follow-up

Reproduce the same twenty frozen synthetic inputs against unmodified
[`doanguyen/lasotuvi` at ace8379](https://github.com/doanguyen/lasotuvi/tree/ace8379a3ea033674e8a9096f5b98a9e2041eace).
Read exact source before execution; its calendar and board modules use only the
Python standard library. Do not install its historical dependency list, vendor
third-party source into production, or make customer/provider/network calls.
This follow-up changes only the reference script, evidence and this brief.

Run `python3 scripts/compare-decadal-independent-reference.py /path/to/lasotuvi`
with the pinned clean checkout. The script records source hashes and the frozen
actual artifact hash, computes reference output without calling iztro, and writes
`plan/evidence/lsv88/decadal-independent-reference-20.{json,csv}`. No comparisons
are synthesized from the actual result beyond input coordinates and projection
into the repository's canonical palace IDs.

Actual scoped result: 20 charts, 240 cycles and 2,400 annual rows agree, with zero
mismatches. Checks cover bureau, forward/reverse direction, current ordinal,
cycle palace/age/year/state and annual year/age/palace. Inputs include January
births before Tet and a leap-month birth; the as-of date is frozen at 2026-09-22.
This is independent structural computation, not prediction accuracy or a manual
reading. Separate frozen-Tet boundary tests remain part of existing local tests.

Life/body masters, na-yin label, decadal/annual transformations, structural scores,
and prose quality are excluded from this reference comparison. They retain the
existing vendor/contract tests and any outstanding acceptance. The reference's
ThienBan master fields index by birth stem rather than the required branches;
they are not silently corrected or used to certify those fields. The original
vendor export preserves its historical `externalReference: null` provenance;
this dated receipt supplies the scoped independent evidence separately.
