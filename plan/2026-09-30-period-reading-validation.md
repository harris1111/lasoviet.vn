# Period reading validation — 2026-09-30

## Bounded implementation

Ticket 63 implements monthly (300 La) and annual 2026 (480 La) readings from calculated lunar periods. Preserve leap-month halves, immutable source hashes, owned report delivery, and period-specific purchase/refund authority. Keep catalog products reserved until both twenty-output acceptance campaigns and editorial review pass. Ticket 65 consumes this delivery path for an atomic lifetime-plus-annual bundle.

## Evidence and limits

The engine preflight uses twenty synthetic birth profiles. It proves deterministic source calculation, not editorial quality or sellability. Monthly periods use the actual lunar year/month and leap flag; annual periods retain every normal and leap-month segment. No birth profiles are written into campaign manifests.

The writer validates period identity, exact coverage, referenced evidence, minimum depth, the FD-089 content line, and named-month/adverse-pattern grounding. It permits one corrective rewrite with separate cost recording. A frozen snapshot includes these period facts before its canonical hash is calculated. The legacy natal snapshot is unchanged when period facts are absent.

Real acceptance requires a configured provider, allowed resolved model IDs, a database for knowledge retrieval/cost recording, and the existing approved production gate. This shell does not provide them. Do not classify dry runs or fixture-provider tests as real generations.

## Reproducible campaign

Build producer packages first with `pnpm typecheck`.

```sh
node --test scripts/period-campaign.test.mjs
node scripts/verify-period-reading-real-generations.mjs --dryRun --runs 20 --asOfDate 2026-09-30 --output plan/evidence/period-preflight.json
node scripts/verify-period-reading-real-generations.mjs --kind monthly --runs 20 --asOfDate 2026-09-30 --output plan/evidence/monthly-real-campaign.json
node scripts/verify-period-reading-real-generations.mjs --kind annual --runs 20 --asOfDate 2026-09-30 --output plan/evidence/annual-real-campaign.json
```

The real campaign checkpoints every output, stops on the first provider/quality failure, and records content hashes, source hashes, model/provider identity, and quality findings. Short diagnostic runs cannot satisfy acceptance. Never commit credentials or customer profiles.
