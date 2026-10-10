# LSV101 wallet library reader readiness

## Bounded brief

Owner authorizes feasible backend fixes and delegated acceptance. Actual isolated LSV58/63 HTTP acceptance on deployed 78e6cef found a wallet topic report readable through the authenticated report query, while library-v2 returns null readUrl and pdf_pending. The library projection hardcodes null links and uses reservation status, which waits for PDF completion even when Browser Print-to-PDF is the approved export path.

On dedicated feature/lsv101-wallet-library-reader-20261010 into master, change only backend commerce library readiness, focused PostgreSQL regressions, and English plan/evidence. Reuse the existing authorized report query service and repository for readiness, so immutable source/version validation, supported content schema, owner, entitlement, restoration, deletion and expiry checks cannot diverge. Preserve order entries, existing pending/failed status, and no link for invalid or unreadable reports. A validated ready result produces the existing locale-correct /bao-cao path and ready status; no route is created. Data-validation failures remain fail-closed, while unexpected database errors propagate. No FE, schema, catalog, pricing, activation, payment or outbound changes.

## Verification and closure

Real PostgreSQL regression must show a source-bound annual wallet report readable without an uploaded server PDF asset (the schema still allocates its non-null asset identifier) and library-ready with its matching link; pending, invalid source/content, terminal, revoked/restored, expired and foreign owners must not receive readable links. Retain existing order-library coverage. Use frozen/injected clocks. Run focused tests, producer builds and required i18n/lint/typecheck, independent working/exact-head review and CI. Merge only reviewed exact source; deploy and record production smoke before marking LSV101 Done. LSV100 frontend navigation and original LSV58/63 full gates remain separate and binding.

## Unresolved questions

None.
