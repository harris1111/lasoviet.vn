# LSV72 header: deployed acceptance and remaining diagnostics

## Accepted milestone

PR [295](https://github.com/harris1111/lasoviet.vn/pull/295) fixes the shared
session-cache hydration race in the header. Its final head is
`56cbcb08db07ad2e32c709e7b84b4cf7143deac6`; the merged, installed and tested
revision is `7fe0a404e826a35bf2a2d20270779d3362c512f2`.

Both head verification runs passed: `37234954635` and `37234950730`.
Master [37235876950](https://github.com/harris1111/lasoviet.vn/actions/runs/37235876950)
passed verify, publish and promote-production. Four exact-revision application
containers are healthy; public and loopback readiness return 200, both worker
CLI checks return 0, and all 102 protected operator files are unchanged.
The release wrapper waited for actual startup health before its strict check.

Independent review issued GO for this deployed header milestone. Full LSV72
remains In Review. Existing candidate evidence is recorded separately in
[the regression report](2026-10-04-lsv72-header-hydration-regression.md).

## Published browser acceptance

The installed published web/API images were exercised with real services in
an isolated PostgreSQL/mail/API/web environment. No candidate build mount,
QA React runtime hook or QA fetch wrapper was used for this acceptance run.

| Check | Result |
| --- | --- |
| VI/EN × guest/account × Chromium/Firefox/WebKit × 360/390/430/1280 × light/dark | 96/96 functional passes |
| Actual DOM errors and unhandled exceptions | 0 |
| Supplementary query, focus, history and breakpoint cases | 12 completed |
| Throttled Chromium measurements | 4 completed; simulated, not physical 4G |
| Cold LCP | 1,344–1,560 ms |
| Warm LCP | 456–760 ms |
| Unmatched WebKit RSC diagnostics | 16; remain unclassified in the original result |
| Real provider calls | 0 |
| Full acceptance | false |

Both account avatars are checked on cold load and reload; guest contexts must
have neither account link nor avatar. Functional monitor success does not
assert that unmatched RSC diagnostics passed protocol acceptance.

All four owned QA containers, their internal network and private credentials
were removed. Browser cleanup awaits independent browser closures, closes the
proxy and destroys relay sockets before awaiting its close callback. The
retained cleanup fault proof verifies that one rejected browser close does not
skip the remaining resources.

Sentry remains enabled: 75 public static files, zero public maps, two SDK-bearing
assets and one release-bound asset. Checked public JS returns 200 and its map
returns 404. The upload token is absent from runtime environment. This check
does not claim a new literal-secret artifact scan.

## Diagnostic controls and limits

An unchanged native eight-case WebKit VI/EN desktop diagnostic reproduced 29
unmatched RSC messages with no actual unhandled exceptions. Waiting for network
idle did not produce matching cancellation evidence.

A valid canonical HTTPS control, without the private QA proxy or TLS bypass,
ran four functional cases and reproduced 19 unmatched messages. It used exactly
two fresh synthetic anonymous profiles through the ordinary consent wizard
around 22:05–22:08 UTC on 2026-10-04. Both profiles were immediately deleted
through the product control; both former chart URLs returned indistinguishable
404. Exclude this known QA window from customer conversion/baseline evidence.
No accounts, emails, payment/provider calls or administrative mutations occurred.

That control's initial launch failed before profile creation because the root
browser-cache path was missing; retry used the existing Debian browser cache.
After successful product deletion, its concurrent browser/context teardown
reported a browser-close failure and exited 1. The failure is retained. A
separate post-exit check confirmed the runner had exited and zero WebKit
processes remained in known browser caches. Future diagnostic cleanup closes
contexts before the browser; no extra production profiles were created.

A separate isolated four-case diagnostic observed native fetch AbortSignal and
Response/stream cancellation delegation. It returned the original fetch/cancel
promises, attached no handlers to them, and did not rewrite responses. It
reproduced 19 messages without exact matching signal aborts or stream cancels.

A further two-case isolated lifecycle diagnostic retained observations across
reload. All seven observed messages matched a fetch in the same old document
4–8 ms after `beforeunload` and before `pagehide`. Console warnings followed
the Node-side observation receipt by 0–4 ms; this is not a browser-native
fetch-start interval. No matching network event occurred within 150 ms of the warning.
There were zero actual unhandled exceptions. All diagnostic fixture resources
were removed without failures.

These observations support the inference that the observed seven messages
come from prefetch attempts during document teardown. They do not establish
the cause of every original message. Matching HTTP 200/requestfinished records
for repeated URLs belong to other attempts and do not prove that a particular
warning's fetch succeeded.

Upstream WebKit's
[CachedResourceLoader](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/loader/cache/CachedResourceLoader.cpp)
converts synchronous null/cancellation failures to AccessControl;
[ThreadableLoader](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/loader/ThreadableLoader.cpp)
logs AccessControl as the JavaScript-source fetch diagnostic. This is consistent
with the lifecycle evidence. Upstream main is not proof of the exact browser
binary's implementation. The observer changes function identities and is
diagnostic only; it cannot retroactively upgrade the unchanged 96-case result.

## Remaining acceptance

Keep the original 16 RSC observations visible until classification is reconciled
with native acceptance. Owner-run physical Google authentication, actual device
behavior and measured 4G performance remain open. Neither simulated performance
nor the lifecycle inference constitutes that acceptance. SePay remains deferred;
free generation, outbound recovery delivery and reserved products remain held.

Private evidence directories under `/home/debian/projects/`:

- `lasoviet-lsv72-header-release-evidence-20261004`
- `lasoviet-lsv72-header-published-matrix-evidence-20261004`
- `lasoviet-lsv72-rsc-native-diagnostics-20261004`
- `lasoviet-lsv72-public-https-control-20261004`
- `lasoviet-lsv72-rsc-stream-diagnostics-20261004`
- `lasoviet-lsv72-rsc-lifecycle-diagnostics-20261004`

Raw diagnostic URLs, synthetic profile references and session state remain
private; only aggregate results are recorded here. Kaneo remains the canonical
task-status source.
