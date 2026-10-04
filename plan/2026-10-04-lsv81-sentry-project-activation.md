# LSV81 bounded brief: supplied Sentry project

## Authority and scope

The owner supplied `cashcow-73/javascript-nextjs` and requested running the official Next.js wizard and explaining secure configuration. Continue the existing SDK 11.4.0 installation; preserve its error-only initialization, strict privacy projection, private source-map upload and disabled default. No new project, initialization, telemetry signal or public route is authorized by this setup command.

Allowed changes are this brief, the client-error operations runbook and the explicitly requested Vietnamese owner worksheet. Configure the supplied GitHub organization/project variables. Obtain the public DSN and private upload credential through authenticated Sentry setup; never print, commit or send a token through chat. Keep client monitoring disabled until configuration and vendor acceptance are ready.

## Evidence and remaining gates

The official instrument skill and relevant references were downloaded with `curl`. The latest wizard resolves to 8.0.0. The supplied command, with wizard telemetry disabled, successfully reaches Sentry browser authentication from `apps/web` on this dedicated branch. Its browser login expires after 180 seconds. No source file changes precede authentication.

GitHub repository variables have been read back as `SENTRY_ORG=cashcow-73`, `SENTRY_PROJECT=javascript-nextjs` and `SENTRY_CLIENT_ENABLED=false`. The upload secret is absent at this checkpoint. These variables identify the requested destination; they do not prove authenticated project access or event ingestion.

The owner then completed the renewed wizard connection. It authenticated, selected the exact requested project and supplied a validated DSN and upload credential. The credential was captured privately before SDK file generation; no existing initializer was overwritten. Store the credential only in GitHub Actions `SENTRY_AUTH_TOKEN` and the public DSN in `SENTRY_CLIENT_DSN`. The credential reads organization releases (200) but project settings deny access (403). A separate OAuth device connection requests only `org:read`, `project:read`, `event:read` for acceptance, with no write/delete scopes. An enabled staging build uses the real credential to check private source-map upload; this does not authorize exposing staging assets or count as production acceptance.

The read-only OAuth connection authenticated successfully. The official Sentry MCP transport was initialized with that credential and verified the selected organization/region. Its Python HTTP signature was rejected by the vendor edge; using the normal curl transport resolved that rejection. This was a transport issue, not an additional credential requirement.

The owner enabled Prevent Storing of IP Addresses; API readback confirms it is on and the project is private. The real enabled staging build passed with the upload credential, and static artifacts contain zero public maps. The real running app's Google-initiation failure produced one error envelope through its existing initializer/capture path, four safe frames and one debug image. Sentry MCP confirms JAVASCRIPT-NEXTJS-1 and readable TypeScript source lines, including `capture-client-failure.ts:6`; vendor processing errors are empty. Vendor readback has no stored IP/account identifier/request URL/private synthetic response value. Coarse geography and a synthetic trace context are vendor-derived at ingestion, not additional outbound tracing or user data.

After exact-head review GO, set the configured GitHub build flag to true, run the existing release pipeline and installed deployment gate, then repeat production error/source-map and blocked-ingestion smoke against the deployed SHA. Do not close LSV81 before that evidence. The only repository changes remain the three scoped documents; SDK/runtime source and host infrastructure are preserved.

Run required i18n, lint and type checks before a documentation PR. Independent review must verify the status and token instructions against the existing SDK/build/workflow. Full LSV81 closure still requires authenticated project access, privacy settings, a deployed release, a real redacted client event, readable private source maps and deployment smoke. Physical-device and SePay acceptance remain separate.
