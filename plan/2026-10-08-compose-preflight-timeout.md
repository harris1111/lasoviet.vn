# Bound Docker Compose preflight on CI

## Bounded brief

The owner requests completion, deployment and real closure of the backlog.
Fresh LSV82 and LSV91 CI runs both failed only on the first Docker Compose
configuration subprocess crossing Vitest's default five-second timeout. Their
remaining 4,543 and 4,522 tests respectively passed. Fix this shared release
verification blocker on a dedicated branch into master.

Allowed files: this brief and `tests/deployment/compose-config.test.ts`.
Application behavior, assertions, Docker configuration and operator files stay
outside this task. Bound Compose subprocesses at fifteen seconds and the suite's
test budget at twenty seconds so cold plugin startup has bounded time to finish;
failed or hung subprocesses still fail the checks. Do not retry or skip assertions.

Run all existing Compose topology checks against real Docker Compose, then the
required local i18n/lint/typecheck checks. Independent review and fresh CI precede
merge. This test-only repair does not certify application acceptance or customer
outbound activation.
