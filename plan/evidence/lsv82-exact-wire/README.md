# Exact-wire preparation evidence

Local-verification.json records the reviewed preparation checks; compiled-smoke.json records actual local execution against rebuilt package exports. These are not native token proof, manual acceptance or production deployment receipts.

Run the installed smoke through stdin so imports resolve from the selected worker/API application package:

```sh
cd apps/worker
node --input-type=module < ../../plan/evidence/lsv82-exact-wire/installed-smoke.mjs
```

On a verified deployed worker image, use the same source via stdin from its default /app working directory:

```sh
docker exec -i lasoviet-mvp-worker-1 node --input-type=module < plan/evidence/lsv82-exact-wire/installed-smoke.mjs
```

The program constructs only synthetic chart facts and injected fetch responses. Native Gemini counters deliberately remain quarantined as unknown. Destination drift is refused before recorder begin. The program imports private facts/fallback modules relative to the selected installed backend entry; it does not add public helpers, production requests, quotas, database operations or customer sends.
