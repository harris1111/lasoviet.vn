# LSV79 private controls and maintenance composition

## Bounded brief

The owner requests completion of all feasible backend work, preserving the hold
on customer outbound and real SePay. PR324 is now merged at 169382f4 and provides
the fresh-only durable queue, caps, consent/source fences and unknown-outcome
no-retry. Complete its private control and actual worker composition gaps.

Implement a server-only CLI using the existing signed internal actor/session
verification. Revalidate a verified non-anonymous super-admin and the active
commerce-management capability in the same transaction as control mutation.
Fence mutations with the same coordination locks as delivery. Require an
optimistic state token, bounded explicit cohort, fixed cap<=5 and an idempotency
key/reason; audit allowed, rejected and replayed commands without recipient data.
Keep the default stopped control and do not reset attempt exposure.

Compose the runner into maintenance behind a new explicit default-false flag
and valid SMTP configuration; enabled mode creates fresh queue rows instead of
historical capture rows. Preserve unrelated auth email behavior. Add isolated
PostgreSQL authorization/replay/stale/stop tests and real loopback-only STARTTLS
SMTP sink acceptance using synthetic recipients and test-only trust injection.
Never change a production control or enable this flag in production.

Allowed files: this brief; the private command contract and export; backend private control/maintenance modules, exports
and existing runner integration test plus runner documentation; API private CLI; worker maintenance wiring;
`.env.example` and existing worker composition tests. No public route or FE implementation.
Producer rebuild, i18n/lint/typecheck, focused tests, independent review and fresh
CI precede merge; deploy and disabled-state smoke precede technical closure.
Actual cohort/customer delivery and revenue acceptance remain in LSV85.

## Private operational interface

Run `node dist/admin-access/recovery-outbound-control-cli.js read` in the private
API runtime, with an existing valid `RECOVERY_CONTROL_ACTOR_TOKEN` from the
authenticated internal actor channel supplied in the environment. Existing
database and actor-secret configuration are reused; no bootstrap authority or
fabricated identity is accepted. Read returns only stopped state, cohort count,
daily limit and an opaque state token, and appends a redacted read audit.

An `update` command accepts bounded JSON on stdin: the last read's `expectedState`,
explicit `emergencyStopped`, `cohortIds` (at most five unique verified account
IDs), `dailyLimit` (1–5), `idempotencyKey` and a closed reason (`access_review` or
`security_incident`). Emergency stop may clear/retain a stale cohort without
requiring its members to remain eligible. The tool never resets spent attempts,
changes consent, credits wallets, restores superseded state on replay, or enables
the worker flag. No such production command was executed by this task.

`RECOVERY_OUTBOUND_ENABLED` is omitted/false by default in the env-file-based
worker configuration. True requires configured SMTP plus separately audited,
unstopped cohort state. There is no public route, UI or automatic activation.
