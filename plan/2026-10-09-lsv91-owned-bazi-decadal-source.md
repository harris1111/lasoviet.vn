# LSV-91 owned Bazi decadal source preparation

## Bounded implementation brief

Add a private server-only repository that accepts an authenticated CurrentActor
and an existing Bazi source ID, then derives the draft decadal source from the
actual immutable stored input/chart and actual stored original-input gender.
Never accept client-supplied gender, resolved birth inputs, normalized charts or
hashes as ownership or provenance. Reuse deployed Bazi source read authorization
and revalidation inside the same PostgreSQL transaction/savepoint; its global
free-AI/recovery coordination and owner/profile lifecycle locks remain held.

Project only source ID and the strict private decadal DTO. Missing/foreign,
missing gender, unknown/provisional, invalid lineage, deletion, expired guest,
invalid clock and final-lifecycle failures all return one generic unavailable
result. Recheck with the existing source repository after projection using the
final injected clock; guest actor/profile expiry must not cross the final return
boundary. Ownership transfer must retain account access and revoke old guest
access. The final read must still match the source snapshot used by the builder.

Allow existing authenticated owners/eligible 24-hour guests to prepare factual
drafts, matching private Bazi source policy. This is not paid checkout admission:
verified non-anonymous paid checkout and future purchase/dispatch reauthorization
remain separate required commerce gates. No durable new records, SQL migrations,
Bazi v1 rewrite, provider calls, public route/API/UI, SKU/price or sales activation.
No current-cycle or traditional/manual acceptance is inferred; Yun method stays
explicitly draft/manualAccepted=false.

Assigned files: new bazi/bazi-decadal-source.repository.ts and actual PostgreSQL
integration tests, backend root export and this brief only. Rebuild producers,
run focused owned source/decadal/two-person regressions and required i18n/lint/
typecheck. Independent working/exact-head review, fresh CI, combined master
release and audited deployment/installed read-only smoke precede release claims.

Full LSV-91/66 remain open for independent decadal reference/manual acceptance,
report writing/composition and 840/960/1500 La commerce, delivery and FE gates.

## Verification receipt

- Producer builds and required i18n/lint/typecheck passed. Lint retains four
  existing warnings, zero errors.
- Final focused regression passed 91 tests in four suites, including 15 new
  actual PostgreSQL owned decadal tests, immutable source and two-person source
  regressions, and the pinned decadal adapter source tests.
- Initial run passed 89 cases and failed two deletion fixtures because required
  lifecycle timestamps were missing. Both fixtures now use frozen timestamps;
  assertions and database constraints were preserved. Independent reviewer
  reproduced the fixture failures and then independently replayed all 15 cases
  successfully with working-diff GO.
- Compiled local installed-factory export smoke passed with zero effects. No
  local installed database probes or positive production preparation is claimed.
- Exact-head review, fresh CI, combined release and audited installed smoke are
  still required. Source remains a private draft, not checkout/runtime/manual
  acceptance; full LSV-91/66 remain open.
