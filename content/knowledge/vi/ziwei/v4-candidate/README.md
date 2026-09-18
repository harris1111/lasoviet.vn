# Zi Wei Knowledge V4 Candidate

This directory holds draft-only V4 editorial artifacts. It is not a runtime
provisioning source and must remain `draft` until founder approval.

`work-index.v1.json` is the immutable 45-shard partition of all 3,258 V3
source passage IDs. Each editorial shard must use one exact path and may
reference only the source-ID write set recorded there. Shards are intentionally
absent until bounded editorial work is assigned.

The assembler is the only writer of the aggregate candidate, disposition
ledger, validation report, hashes, and provenance edges. It validates NFC,
repository containment, V3 baseline hashes, canonical sorting, derived V4
record IDs, duplicate rejection, and full ledger coverage.

Run:

```text
node scripts/assemble-ziwei-knowledge-v4.mjs --check
node scripts/validate-ziwei-knowledge-v4.mjs --candidate-dir content/knowledge/vi/ziwei/v4-candidate
node --test scripts/assemble-ziwei-knowledge-v4.test.mjs
```
