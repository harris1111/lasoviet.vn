# Phase 03 Non-Visual Slice 1 Report

Date: 2026-09-01

## Scope

Implemented the server-only private API client and registry-derived crawl
controls. No UI, layout, page, component, navigation, style, or interaction
files were changed.

## Changed Files

- `apps/web/src/api/private-api-client.ts`
- `apps/web/src/app/robots.ts`
- `apps/web/src/app/sitemap.xml/route.ts`
- `apps/web/src/app/sitemaps/[section]/route.ts`
- `apps/web/src/seo/sitemap-registry.ts`
- `packages/config/src/route-registry.test.ts`
- `tests/seo/crawl-controls.test.ts`
- `tests/web/no-public-api-reference.test.ts`

## Verification

- RED: `pnpm vitest run packages/config/src/route-registry.test.ts tests/seo/crawl-controls.test.ts tests/web/no-public-api-reference.test.ts`
  failed as expected because crawl-control modules did not exist.
- GREEN: the same focused command passed: 3 test files, 9 tests.
- `pnpm --filter @lasoviet/web typecheck` passed.
- Self-review: private client is marked `server-only`, obtains the internal
  actor token, forwards authorization and request ID headers, and maps
  transport failures to `PRIVATE_API_UNREACHABLE`. Sitemap and robots output
  consume the typed registry-derived crawl policy at
  `https://lasoviet.vn`.

## Docs Impact

None. This implementation does not change product behavior documentation; this
task report records the delivery evidence.

## Rule Candidate

None. Existing server-only, registry-source, and private-route restrictions
cover this slice.

## Unresolved Questions

None.

DONE

## Fix Round 1 Evidence

Date: 2026-09-02

### Findings Resolved

- C1: Section sitemap params now require and strip the `.xml` suffix before
  validating the registry section. Tests use the filename value advertised by
  the sitemap index.
- I1: The English root sitemap URL is `https://lasoviet.vn/en`; non-root
  English paths remain under `/en/<path>`.
- I2: The private client accepts only same-origin application paths and rejects
  absolute and network-path references before issuing actor credentials.
- I3: Safe uppercase API error codes and non-2xx status values are preserved
  without retaining provider text. Transport and malformed JSON keep their
  local error contracts.
- I4: Browser-boundary checks require non-empty source and artifact scans,
  traverse `use client` local dependencies, and ran immediately after a fresh
  web build.

### Verification

- RED:
  `pnpm vitest run tests/seo/crawl-controls.test.ts tests/web/no-public-api-reference.test.ts apps/web/src/api/private-api-client.test.ts`
  exited 1 with the expected English-root, `.xml` route-param, unsafe-path,
  and safe-error-contract failures.
- GREEN:
  `pnpm vitest run tests/seo/crawl-controls.test.ts apps/web/src/api/private-api-client.test.ts`
  passed: 2 files, 9 tests.
- `pnpm --filter @lasoviet/web typecheck` passed.
- `pnpm --filter @lasoviet/web build` passed.
- `pnpm vitest run tests/web/no-public-api-reference.test.ts` passed
  immediately after the fresh build: 1 file, 1 test.

### Docs Impact

None. This report is the required delivery evidence; no product documentation
changed.

### Rule Candidate

Dynamic sitemap route params must be validated as emitted filenames, including
their extension, before they are mapped to registry section keys.

### Unresolved Questions

None.

DONE

## Fix Round 2 Evidence

Date: 2026-09-02

### Finding Resolved

- N1: Failed environment loading, missing `PRIVATE_API_URL`, and malformed
  private API base URLs now remain `PRIVATE_API_UNREACHABLE`. Only caller path
  parsing may produce `PRIVATE_API_PATH_INVALID`.

### Verification

- RED: `pnpm vitest run apps/web/src/api/private-api-client.test.ts` exited 1
  with the expected reclassification failures.
- GREEN: the same command passed: 1 file, 8 tests.
- `pnpm --filter @lasoviet/web typecheck` passed.

### Docs Impact

None. This report is the required delivery evidence; no product documentation
changed.

### Rule Candidate

Private API base configuration must be resolved before caller path validation
so configuration failures preserve their operational error contract.

### Unresolved Questions

None.

DONE
