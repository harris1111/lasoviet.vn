# LSV91 authorized immutable Bazi source persistence

Bounded brief: use reviewed PR362 supported profile mapping, stored original and
normalized birth-profile revisions and deployed Bazi source validators to persist
and privately read an immutable, deterministic Bazi calculation source. Reuse
generic calculation_runs for method/version/hash identity; add a separate Bazi
source table for the redacted normalized chart, private resolved-input/mapping
provenance and exact profile/revision/run binding. Do not store Bazi in Ziwei
versions or evidence_sets, which have Ziwei-specific readers/foreign keys.

Trusted actors supply stored revision/source IDs, never caller-provided facts.
Acquire shared free-AI coordination then recovery coordination and owner/profile
locks consistently with linking/deletion. Sample the injected clock after lock
waits, authorize current ownership and lifecycle, and reconstruct/validate the
actual stored profile before calculating, inserting or reusing. Account deletion,
profile archival, exact guest expiry and changed ownership must fail closed.
Concurrent identical requests on one revision reuse one run/source; cache keys
are revision-scoped and not shared across owners. Revalidate full source/run and
stored-profile/mapped-input lineage on reads/reuse; self-consistent hashes alone
do not prove that the snapshot came from the stored profile or a trusted vendor.

Enforce same profile/revision/run, closed Bazi method/engine/schema identifiers,
hash formats and source/update immutability, including referenced run/revision
metadata where necessary. Retain actual Bazi evidence inside the normalized
snapshot. Public projections are not introduced; private returns omit owner IDs,
original birth details and resolved input snapshots. Existing profile linking
transfers ownership without copying/recalculating artifacts. Immediate deletion,
24-hour purge and account deletion cascade private sources/runs.

Allowed: the already verified local engine-adapters workspace dependency and lockfile entry (no external package upgrade); new database schema/export and additive migration/journal; private Bazi
repository/service/export; focused real PostgreSQL source and lifecycle tests;
existing schema/lifecycle tests only where needed to verify additive coexistence;
this brief and release evidence. No API/route, FE, provider/native trial, report
writer/luck/compatibility score, commerce/catalog/price, public or sale activation,
operator/Nginx or customer-send changes. Supported/refused inputs remain PR362;
full91 and manual product acceptance stay open.

Migration coordination: master has applied through0065. Allocate new0066 Bazi,
idx66 with a later timestamp, preserving every applied<=0065 file byte-for-byte.
Before the held commercial batch can release, renumber only its unapplied drafts:
FD1190067, Business0068, Transition0069, Family0070, Study/Property0071, with matching
journals/increasing timestamps and historical replay fixture references. No
duplicate slot, earlier applied migration, held price activation or owner pricing
decision. Reconcile and rerun held migration/review/required/CI gates after this
source release; record dependency explicitly rather than infer their old CI is
valid for changed migration heads.

Verify actual PostgreSQL concurrent reuse and Ziwei/Bazi coexistence, wrong
owner/profile/run and mapped-input/snapshot/hash substitution, immutable updates,
supported leap/unknown/IANA and unsupported precision/ambiguous timezone,
expiry after waiting on shared locks, manual purge, linking without duplication,
archival/account deletion and historical migration replay. Producer rebuild,
i18n/lint/typecheck and independent exact-head review plus fresh CI precede merge.
Audited deployment and installed compiled scope smoke precede a deployed claim;
no full ticket Done until all its remaining product/runtime/manual gates pass.

## Local validation receipt (2026-10-09)

Base reconciled to master622a46388a28ebad49b9def17bb535c545eaf68b after PR362
merged with both fresh CI runs successful. Private source changes only; no API,
provider, flags, prices, route or frontend activation.

- Actual PostgreSQL:54 checks across5 suites PASS, including23 source checks,
  actual Iztro/Bazi coexistence and replay, missing/foreign run/profile binding,
  SQL immutable source/run/revision guards, stored mapping/hash/vendor-substitution
  rejection on read/reuse, real lock-wait expiry, account link without duplication,
  manual/expired cascade, archival/deletion denial, actual0065→0066 replay and
  existing schema/Ziwei/guest/account-deletion regression.
- Reviewer independently replayed23 source checks and reviewed the final54-check
  receipt and the two added shared-storage assertions. Working-tree source GO.
- Producer rebuild and required i18n/lint/typecheck passed. Lint retains the four
  pre-existing warnings and zero errors. Frozen offline installation passed with
  exactly one local workspace dependency lockfile entry; no external upgrade.
- All applied migrations through0065 are byte-identical to master. New0066 is
  additive, replay-safe and preserves existing Ziwei-only metadata behavior.
- Initial build failed because config dist was missing and guest expiresAt is a
  string; producer build and finite Date parsing corrected those errors. The first
  test invocation collected no tests because it imported postgres without a
  backend dependency; use the existing Drizzle execute API instead. The corrected
 22-check run and the final54-check regression passed; initial failures are retained.

Evidence logs: /tmp/lasoviet-bazi-immutable-pg-first-20261009.log (failed collection),
/tmp/lasoviet-bazi-immutable-pg-second-20261009.log (22PASS),
/tmp/lasoviet-bazi-immutable-pg-regression-20261009.log (54PASS), and
/tmp/lasoviet-bazi-immutable-required-20261009.log (required gates PASS).
These local log paths are supplementary; this versioned receipt, tests and fresh
CI remain portable evidence. Exact committed-head review, fresh PR/push CI,
release publication and audited deployment/smoke are still pending at this record.
FullLSV91, public delivery, report/manual acceptance and native transport remain open.

## Historical fixture portability correction

The original0065 replay test passed on this source branch but failed when inherited
by the unapplied FD119 commercial draft: rewinding all canonical migrations also
reran already-present price DDL. The initial descendant run recorded20 failures
and28 passes; this was a test-isolation fault, not production source acceptance.
The source regression now creates a separate owned database, copies the actual
≤0065 journal and SQL into a temporary migration directory, preserves an existing
Ziwei run/revision, then applies canonical migrations and checks idempotency and
new Bazi storage. Later inherited commerce DDL in the primary test DB is untouched.
No runtime code, SQL body, privacy or financial assertion changed.

Replayed54 checks/5 suites PASS19.16s; reviewer approved the test-only correction.
Logs:/tmp/lasoviet-bazi-immutable-isolated-regression-20261009.log and
/tmp/lasoviet-bazi-immutable-isolated-required-20261009.log. Required checks on this
correction and fresh updated-head CI remain gates until successfully completed.
