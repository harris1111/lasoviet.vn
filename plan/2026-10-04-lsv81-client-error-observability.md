# LSV81 bounded brief: client error observability

## Owner authority

On 2026-10-04 the owner will run physical-device acceptance and requested Sentry first to make client errors traceable. LSV81 is separate from contextual unlock/payment/writer work. SePay acceptance is explicitly deferred. This branch was rebased onto the reviewed LSV76 merge `74d44909bee441629190bc10fc5e1557bc234920` before release checks.

## Allowed implementation

Pin `@sentry/nextjs` 11.4.0 after inspecting its installed imports/types/build configuration and the local Next16.3.4 instrumentation-client guide. Registry metadata confirms the SDK's Next16 peer range and Node24 compatibility. Add an error-only client initializer, strict configuration/projection, and private source-map build support. Add a no-argument redacted capture hook for handled Google initiation failures, retaining authentication outcomes; use existing first-party error boundaries/handled failures only where needed; no new visual flow or public route. Add focused redaction/configuration/capture tests, dependency lock changes, a shared root OpenTelemetry API peer pin to preserve one Drizzle SQL type identity, and documentation for activation.

External project/DSN and secure source-map token reference remain pending. Default disabled until explicit valid configuration; no guessed project, external event or upload. Never use auth tokens as Docker arguments or bake them into browser/runtime images. Use trusted build secrets for a future authorized upload. Public source-map files must not be published by the runtime image.

## Required boundaries

- Errors only; Session Replay, tracing, logs, profiling, feedback and automatic sessions off.
- No default PII. Drop all breadcrumbs and request/user/transaction/context/extra data. Keep only a closed redacted exception/stack/debug-ID projection plus validated release SHA/environment; never birth/report text, account/chart/profile IDs, full URLs, query, cookies, token, raw error message or form values.
- Stack assets are limited to canonical first-party static JS; unknown filenames/fields fail closed. SDK failures never block the application.
- Do not activate a vendor or count owner device acceptance from a disabled integration. No payment, catalog, generation, host Nginx, installed infrastructure or unrelated UI changes.

## Verification and closure

Adversarial redaction/config tests with actual SDK types; controlled exception transport test retaining useful source references while excluding raw payload; disabled/no-DSN path creates no request. Validate privately uploaded source maps only after the real project configuration is supplied. Run required i18n/lint/typecheck, production build, independent exact-head review and deployed disabled-state smoke. Record pending activation inputs in Kaneo; full Done requires a real configured redacted event with readable release/source line.
