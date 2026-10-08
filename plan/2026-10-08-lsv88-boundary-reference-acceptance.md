# LSV88 boundary and independent reference acceptance

## Bounded brief

The owner requests completion of the entire backlog. The latest approved BE-P0-8
plan asks for at least thirty independent charts across four dates including
three Tet boundaries, and at least two hundred invariants. Expand the existing
twenty-case scoped comparison to thirty deterministic synthetic birth profiles
and eight evaluation dates (both sides of Tet2026/2027/2028 plus two ordinary
dates). Do not modify or relabel the frozen original evidence.

Allowed files: this brief, one deterministic compiled-engine exporter, one
pinned independent offline comparator, and its new JSON/CSV evidence. Dedicated
branch targets master; runtime remains unchanged. Validate real live compiled
engine output, structural invariants and reference calendar/board projections,
with explicit source versions/hashes and no production/customer/provider data.
Independent reference scope remains bureau, direction, current cycle and all
cycle/annual palace-age-year fields. Masters, Na-yin, transformations, scores and
prose remain excluded rather than falsely certified. Owner manual trials remain
pending. Required checks, independent review and CI precede merge.

## Reproduction

Install the frozen workspace and rebuild engine adapters. With the unmodified
`doanguyen/lasotuvi` checkout at `ace8379a3ea033674e8a9096f5b98a9e2041eace`:

```sh
node scripts/export-decadal-boundary-acceptance.mjs > /tmp/lsv88-boundary-actual.json
python3 scripts/compare-decadal-boundary-reference.py /path/to/lasotuvi < /tmp/lsv88-boundary-actual.json
```

Temporary input is regenerable from versioned code, and the JSON/CSV results
are versioned. No installation or network call occurs in the reference engine.
