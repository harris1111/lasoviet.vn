# LSV81 client error preparation

Owner request: add Sentry before owner-operated Google/mobile/4G acceptance. SePay acceptance is deferred. This release prepares monitoring with the default disabled; it does not claim a configured project, private upload, readable source-map event or physical-device pass.

## Change

Pin Next SDK11.4.0 and the shared OpenTelemetry API1.9.1 peer (one Drizzle SQL type identity, no tracing initializer). Initialize synchronously before hydration only with complete explicit SaaS DSN/SHA/environment. Enable global handlers and browser API errors; all default integrations are absent. SDK11's `dataCollection` disables personal/body/header/cookie/query/AI/frame data. A closed `beforeSend` projection retains only generic exception type/text, first-party static JS coordinates, safe debug IDs and release/environment. Raw fields and unsafe stacks are dropped. Tracing rates are omitted, logs/metrics dropped, Replay/profiling/session capture absent. No server initializer, API tunnel or visual flow is added.

Opt-in GitHub variables configure a future image build; upload credentials enter only through a BuildKit secret. Missing enabled configuration or upload failure blocks the build. Private source maps are deleted by the upload plugin and stripped from runtime static/standalone build artifacts. The owner worksheet now records approved recommendations, deferred SePay, owner physical tests, and the remaining Sentry project reference.

## Evidence

- Twenty focused auth/configuration/redaction/source-map boundary tests passed, including handled Google rejection/response capture without arguments.
- Four Chromium cases passed using the real pinned SDK: disabled capture sends no request; deliberate capture drops private user/context/message/URL data and preserves coordinates; an actual uncaught first-party script error and a handled Google initiation failure preserve safe first-party coordinates without private data.
- i18n parity and lint passed (four pre-existing unrelated warnings).
- Broad repository validation passed 4,057 tests and 17 script tests before the additional Google hook; its final focused 20-test run and four browser cases passed.
- Repository typecheck passed after rebuilding producer packages and aligning the optional Drizzle peer.
- Full production build passed. The compile-time disabled guard removes SDK-bearing chunks from the production static output (zero Sentry-bearing JS files); final exact-head review/deployment evidence remains pending.

## Closure

Keep LSV81 open until a real owner-controlled project is configured, private maps upload successfully, and a synthetic redacted event resolves to a readable source file/line for the deployed SHA. Also inspect IP/retention settings and public map denial. The Google initiation hook covers that specific handled failure. Global handlers do not establish coverage of errors swallowed by React boundaries or other handled API failures; those need an explicitly scoped capture hook when reproductions require it.
