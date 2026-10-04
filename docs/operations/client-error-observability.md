# Client error observability (LSV81)

The owner requested Sentry before physical-device Google/4G acceptance. The pinned Next SDK is 11.4.0, verified against local Next16.3.4/Node24 and its installed APIs. Monitoring defaults to disabled. This is preparation, not configured-vendor acceptance.

The synchronous pre-hydration initializer captures uncaught JavaScript errors and unhandled promise rejections. It enables only global handlers and browser API error capture. It has no default session, breadcrumb, console, Replay, tracing, profiling or feedback integrations. Log/metric callbacks drop their records; tracing is not initialized. It sends no raw error message, function name, source text, user, request URL, cookies, tokens, form/birth/report data, chart ID or account ID. Only closed exception types, generic error text, canonical static-JS asset line/column, validated debug IDs, release SHA and environment survive. Errors without a safe first-party stack are dropped. Browser network headers remain subject to normal HTTP behavior; disable IP storage in the Sentry project settings.

No server, middleware, API or route instrumentation is enabled. Handled Google initiation failures use a no-argument capture hook that records only the client call site, with no response or callback data. Next error boundaries that handle exceptions internally require a later explicitly scoped capture hook; this initializer does not claim all handled failures are observable.

## Selected project and activation

On 2026-10-04 the owner selected organization `cashcow-73` and project `javascript-nextjs`. The official Next.js wizard 8.0.0 authenticated and selected that exact project. The validated public DSN is stored as `SENTRY_CLIENT_DSN`, and the upload credential is stored privately as GitHub Actions secret `SENTRY_AUTH_TOKEN`. Monitoring was initially configured with `SENTRY_CLIENT_ENABLED=false` during acceptance. A separate read-only OAuth connection now verifies project settings and events through Sentry MCP.

The owner enabled Prevent Storing of IP Addresses. API readback confirms `scrubIPAddresses=true`, a private project and both default data scrubbers enabled. The enabled staging build uploaded private maps and deleted all public static maps. A synthetic Google-initiation failure through the real running application's initializer was received as [JAVASCRIPT-NEXTJS-1](https://cashcow-73.sentry.io/issues/JAVASCRIPT-NEXTJS-1), with four readable TypeScript frames/source context, release `52f71643e8cc8946a38e69e0d722199e99448f5c`, and no processing errors. Outbound and vendor checks found no IP, account identifier, request URL or private response sentinel.

Sentry can derive coarse network geography and synthetic trace context during ingestion. This is distinct from application data capture: the observed outbound envelope contains only one error event, with no user/context/request fields, trace/span, Replay, log, metric or session payload. Do not claim the vendor stores only the original browser projection.

Configure these GitHub repository variables, then rebuild/deploy (runtime environment changes do not update browser bundles):

| Variable | Required value |
| --- | --- |
| `SENTRY_CLIENT_ENABLED` | `true` only after the project privacy settings and event review |
| `SENTRY_CLIENT_DSN` | Project public DSN; supported Sentry SaaS ingest host |
| `SENTRY_ORG` | `cashcow-73` |
| `SENTRY_PROJECT` | `javascript-nextjs` |

Store the upload credential only as GitHub Actions secret `SENTRY_AUTH_TOKEN`, with source-map/release upload permission for the selected organization; the workflow remains bound to the selected project. Never put it in chat, Git, a Docker argument or runtime environment. The workflow passes it through a BuildKit secret mount. The build sets the full Git SHA and production environment. An enabled incomplete configuration or failed private source-map upload fails the build. Uploaded maps are deleted; the image build additionally removes `.map` files from public static/standalone artifacts without following symlinks. No public tunnel route is created.

The DSN is public browser routing configuration, not an account credential. Set it as repository variable `SENTRY_CLIENT_DSN`. The upload token is a credential and belongs under repository Settings → Secrets and variables → Actions → Secrets, named `SENTRY_AUTH_TOKEN`. Only its storage location or configured status belongs in documentation. Wizard-generated `.env.sentry-build-plugin` is covered by `.env.*` ignore rules; it must never be added to Git or copied into a runtime image. Do not rerun the wizard unreviewed over the existing initializer: its default templates include server/edge instrumentation and optional tracing/Replay, outside this ticket's approved scope.

The supplied upload credential can read organization releases (HTTP 200) but cannot read project settings (HTTP 403). Upload access is separate from event/privacy inspection. Use an authenticated read connection with `org:read`, `project:read` and `event:read` for that acceptance; do not broaden the CI secret into an agent credential or add write/delete scopes merely to inspect errors.

For a local staging build use the matching `NEXT_PUBLIC_SENTRY_*` variables and `staging` environment with the same private build-secret boundary. Staging assets must still use the canonical static asset origin to pass the projection.

## Acceptance

1. Verify the project disables IP storage and has appropriate retention/access settings.
2. Deploy the configured build and trigger a synthetic client exception with no real customer data.
3. Check the event has the deployed SHA and a readable private source-map file/line; inspect its full envelope for forbidden data.
4. Confirm no public `.map` response, Replay, session, trace, log or metric payload; verify Google sign-in and content still work when ingestion is blocked.
5. Attach redacted evidence to LSV81. Only then mark Done and ask the owner to run the physical-device acceptance.

The staging gate is verified; production closure still requires an independently reviewed enabled release, a production event matching its deployed SHA and deployment smoke. Record the final release/event evidence in LSV81 before Done. Org/project, DSN, the private GitHub upload secret, read-only Sentry MCP access and project privacy configuration are resolved. Do not infer physical-device acceptance from this synthetic error test. SePay setup remains deferred independently.
