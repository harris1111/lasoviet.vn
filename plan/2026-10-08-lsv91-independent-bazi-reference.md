# LSV91 independent Bazi pillar reference

Base: released master70e84694. Scope: reproducible test-only independent calendar
comparison for the existing private lunar-typescript1.8.6 Bazi projection. Use pinned
sxtwl2.0.7 outside production dependencies. At least30 synthetic normalized profiles,
LiChun/solar-term/minute/timezone and local-midnight/late-Zi checks must compare
independently generated stems/branches. Keep different day/hour versus solar-term
clocks explicit and preserve unknown-hour limitations. Record any disagreement;
never bless production output as its own expected fixture. No runtime behavior,
DB schema, storefront, provider, customer outbound, membership or money activation.

Allowed files: isolated Python oracle/exporter, committed synthetic reference JSON,
focused engine reference tests and concise evidence in this brief. Validation:
regenerate byte-identical fixtures with pinned oracle; focused adapter/contract
checks and required i18n/lint/typecheck; independent exact-head review/fresh CI.
This only closes the narrow four-pillar comparison milestone. Hidden stems, ten
gods/elements, luck cycles, storage/ownership/version locking, writers/commerce and
manual acceptance remain LSV91 work; do not mark the full ticket Done.

## Independent comparison evidence

sxtwl2.0.7 is an isolated BSD3 reference, not a production dependency. Its source
archive SHA256 is38b24472389f7f6f3521c2c99e4b5e86c0184c7d6eb02e5409c239d21f0a6512
([versioned primary package](https://pypi.org/project/sxtwl/2.0.7/),
[primary API documentation](https://github.com/yuangu/sxtwl_cpp/blob/master/python/README.md)).
The Python exporter never imports the production adapter. It accounts for the
date-only reference API by comparing the independent exact Jie instant before
selecting that civil day's year/month pillars. Solar terms use UTC+8; day/hour
use normalized local civil time. Late-Zi advances the hour stem, while day stays
on the original civil date; missing hour remains unknown.

The committed corpus has114 synthetic profiles:30 spread profiles,72 comparisons
around12monthly Jie boundaries at three offsets,8civil-midnight/late-Zi cases,
and4unknown-hour cases. Six offsets occur overall. All458expected pillar pairs
match the existing private adapter; this compares stems/branches only. Both
focused adapter suites pass124tests. Regeneration is byte-identical; corpus SHA256
0025a6df8289e31620ef9ffa2db74d6c317bb2c71983389aa76de29dba2d46bb.

Reproduction: create an isolated Python environment with sxtwl==2.0.7, then run
`python scripts/export-bazi-sxtwl-reference.py --output <temporary-file>` and
compare it with `packages/engine-adapters/src/bazi/fixtures/sxtwl-2.0.7-reference.json`.
CI consumes only the committed fixture; no Python calendar/network install is
required. Consumed producers rebuilt; i18n parity, lint and typecheck passed (four existing
lint warnings). Independent exact-head review and fresh CI remain required before
merge. No full Bazi chart/commerce/manual acceptance or runtime change is claimed.
