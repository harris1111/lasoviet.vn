# Client error observability (LSV81)

The owner requested Sentry before physical-device Google/4G acceptance. The pinned Next SDK is 11.4.0, verified against local Next16.3.4/Node24 and its installed APIs. Monitoring defaults to disabled. This is preparation, not configured-vendor acceptance.

The synchronous pre-hydration initializer captures uncaught JavaScript errors and unhandled promise rejections. It enables only global handlers and browser API error capture. It has no default session, breadcrumb, console, Replay, tracing, profiling or feedback integrations. Log/metric callbacks drop their records; tracing is not initialized. It sends no raw error message, function name, source text, user, request URL, cookies, tokens, form/birth/report data, chart ID or account ID. Only closed exception types, generic error text, canonical static-JS asset line/column, validated debug IDs, release SHA and environment survive. Errors without a safe first-party stack are dropped. Browser network headers remain subject to normal HTTP behavior; disable IP storage in the Sentry project settings.

No server, middleware, API or route instrumentation is enabled. Handled Google initiation failures use a no-argument capture hook that records only the client call site, with no response or callback data. Next error boundaries that handle exceptions internally require a later explicitly scoped capture hook; this initializer does not claim all handled failures are observable.

## Selected project and activation

On 2026-10-04 the owner selected organization `cashcow-73` and project `javascript-nextjs`. These GitHub variables are configured and read back; `SENTRY_CLIENT_ENABLED=false` remains explicit. The official Next.js wizard 8.0.0 reaches browser authentication, which is required to obtain the project's public DSN and private upload credential. Project access and ingestion have not yet been verified.

Configure these GitHub repository variables, then rebuild/deploy (runtime environment changes do not update browser bundles):

| Variable | Required value |
| --- | --- |
| `SENTRY_CLIENT_ENABLED` | `true` only after the project privacy settings and event review |
| `SENTRY_CLIENT_DSN` | Project public DSN; supported Sentry SaaS ingest host |
| `SENTRY_ORG` | `cashcow-73` |
| `SENTRY_PROJECT` | `javascript-nextjs` |

Store the upload credential only as GitHub Actions secret `SENTRY_AUTH_TOKEN`, scoped to the specified project with source-map/release upload permission. Never put it in chat, Git, a Docker argument or runtime environment. The workflow passes it through a BuildKit secret mount. The build sets the full Git SHA and production environment. An enabled incomplete configuration or failed private source-map upload fails the build. Uploaded maps are deleted; the image build additionally removes `.map` files from public static/standalone artifacts without following symlinks. No public tunnel route is created.

The DSN is public browser routing configuration, not an account credential. Set it as repository variable `SENTRY_CLIENT_DSN`. The upload token is a credential and belongs under repository Settings → Secrets and variables → Actions → Secrets, named `SENTRY_AUTH_TOKEN`. Only its storage location or configured status belongs in documentation. Wizard-generated `.env.sentry-build-plugin` is covered by `.env.*` ignore rules; it must never be added to Git or copied into a runtime image. Do not rerun the wizard unreviewed over the existing initializer: its default templates include server/edge instrumentation and optional tracing/Replay, outside this ticket's approved scope.

For a local staging build use the matching `NEXT_PUBLIC_SENTRY_*` variables and `staging` environment with the same private build-secret boundary. Staging assets must still use the canonical static asset origin to pass the projection.

## Acceptance

1. Verify the project disables IP storage and has appropriate retention/access settings.
2. Deploy the configured build and trigger a synthetic client exception with no real customer data.
3. Check the event has the deployed SHA and a readable private source-map file/line; inspect its full envelope for forbidden data.
4. Confirm no public `.map` response, Replay, session, trace, log or metric payload; verify Google sign-in and content still work when ingestion is blocked.
5. Attach redacted evidence to LSV81. Only then mark Done and ask the owner to run the physical-device acceptance.

Pending setup: authenticated Sentry connection, public DSN, private GitHub upload secret and vendor privacy/event acceptance. The org/project choice is resolved. The instrument skill requires authenticated Sentry MCP access for event verification; this session currently has no Sentry MCP connection. Do not infer ingestion success from wizard completion or local intercepted-envelope tests. SePay setup remains deferred independently.
