# Zi Wei P0 Fixture Sources

## Fixture Record

The versioned manifest is the source of executable inputs, reviewed
fixture-specific normalized facts, method/rule set, precision, review state,
and typed difference classifications.
All fixtures run the real `IztroAdapter` with `ziwei.default` and
`algorithm: "default"`.

Phase 01 BirthProfile fixtures remain the source for preserved user input,
timezone provenance, branch-only precision, and unknown-time eligibility.
P02-T02's reviewed adapter case remains the initial known-chart baseline.

## Tianji Reference Boundary

Tianji is a read-only local reference at audited commit
`a48cf098bbb4f45ca7848a304ca8d90f50697473`. Its Zi Wei implementation accepts
lunar year/month/day and a local hour, then produces twelve palaces and the
Zi Wei/Tian Fu star groups. The runner may compare only common lunar
input/hour-to-branch/life-palace facts.

Tianji has no complete equivalent of the approved iztro configuration and
collapses `23:xx` into the same hour branch as early Zi. It is therefore not
comparable for late-Zi division, solar-term behavior, timezone provenance,
true-solar-time behavior, leap-month conversion, or complete star placement.
Those entries are marked in the manifest instead of being silently averaged.

Mingyu Zi Wei is excluded because it is not independent validation. No Tianji
code or output is imported into production packages.

## Mismatch Policy

An unexplained mismatch is emitted as `UNEXPLAINED_MISMATCH` and blocks a
fixture expectation change. A non-overlapping reference method is emitted as
`REFERENCE_METHOD_INCOMPATIBLE`; prose alone never accepts a difference. First
classify a mismatch as an adapter defect, a source/input defect, or a documented
method difference. Only a trusted worked source can settle a non-overlapping
school difference; do not majority-vote engines.
