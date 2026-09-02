# P02-T04 Report

Completion date: 2026-09-01

## Delivered

- `CapabilityDefinitionV1`, `EvidenceItemV1`, and `EvidenceSetV1` contracts.
- One static capability: `ziwei.identity.p0`, with approved public and
  `ZIWEI-IDENTITY-P0` paid availability.
- Three AI-free identity evidence IDs: life palace, body palace, and
  transformations.
- Typed rejection for unsupported rule sets or missing normalized facts.
- Immutable `evidence_sets` and `evidence_items`, unique by chart version and
  rule version for idempotent reuse.

## Verification

- Focused evidence/contracts and persistence: 4 files, 25 tests passed.
- Migration acceptance: 1 file, 5 tests passed.
- Root typecheck and build passed.

## Persistence Regression

`ziwei.repository.integration.test.ts` uses a real PostgreSQL container and
the production `createEvidenceService` path. Two concurrent identical requests
for the same chart version and `ziwei.identity.v1` reused one evidence set and
left exactly three immutable evidence items, without rewriting or duplicating
history.

Docs impact: minor.
Rule candidate: none.
AGENTS.md action: none.

Open questions: none.
