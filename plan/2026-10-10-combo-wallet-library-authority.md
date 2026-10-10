# Combo wallet library authority

## Bounded brief

Branch feature/lsv86-combo-library-authority-20261010; direct PR into master.
Base e799c9badc3b5e0de73a26d61f933dd310f9e78c; reconcile actual combined master after the already-reviewed FD124 correction release. Do not include this change in the frozen native correction release.

Real isolated Combo QA purchased current2027 for1300La, created two children with one shared spend, generated both reports with actual source/validator/worker repositories and read the annual report as ready. LibraryV2 omitted both children because its wallet intent and reservation joins require intentSKU equal childSKU. This existing defect is separate from LSV101's ready-link fix for topic/period entitlements.

Owner authorizes feasible backend fixes and self-acceptance. Only change packages/backend/src/commerce/commerce.repository.ts, focused commerce repository PostgreSQL regressions, this brief and redacted evidence. No FE, schema, price, catalog availability, outbound, private native authority or payment activation. Retain all owner/chart/version/evidence/revocation/restoration/private-reader checks. Permit differing Combo intent/child SKUs only when the existing closed hasCompleteComboAuthority proves the exact two-child bundle. No free-form SKU aliases or weakened direct/link reservation authority.

Use a narrow SQL candidate join for known Combo parent/child SKUs, then closed existing complete-bundle validation before any candidate contributes a library entry. Direct SKU-matching wallet entries retain their current path. Validate correct current/next Combo two entries, shared spend, locale/source/version reader links; incomplete/wrong-period/mismatched owner/chart/extra child/restored/revoked candidates remain absent. Focused real PostgreSQL regressions must cover malicious/incomplete candidates, not implementation-only mocks.

Root executes in the interactive session; independent Sol reviewer reviews plan, source, exact-head, CI and actual installed evidence. Mandatory i18n/lint/typecheck and both fresh CI before merge; audited deployment plus exact installed read-only smoke and actual two Combo QA cases before task closure. No false Done until recorded target deployment evidence.
