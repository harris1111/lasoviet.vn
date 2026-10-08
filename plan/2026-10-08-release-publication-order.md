# Release publication ordering repair

## Bounded brief

The owner requests actual deployment and closure of the open backlog. During
release, master run 37805401838 for newer f0c82bc2 reached publication first, then
older run 37805329253 for 86e8f8b3 entered the same cancellable publication group and
cancelled it. Production remains 49639331. Repair this observed release blocker
without altering application code, host Nginx, credentials or operator files.

Allowed files: this brief, `.github/workflows/ci.yml`, and the existing release
publication contract test. Dedicated branch targets master. Required local checks,
independent review and CI precede merge; actual publication/deployment evidence
remains necessary for runtime task closure.

## Change and verification

Use immutable-SHA publication groups so an older commit cannot cancel a newer
commit's build. Serialize production-marker promotion without cancellation and
check the current remote master before the sole marker mutation. A stale commit
must skip promotion; malformed/unavailable remote state must fail closed.

GitHub documents that concurrency follows job-arrival order rather than original
workflow-dispatch order, which explains the observed cancellation:
https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency

Exercise the actual workflow promotion script against owned git/docker doubles:
matching current SHA promotes exactly once, later stale completion cannot
overwrite it, and failed/invalid remote lookup cannot mutate the marker. Retain
the immutable image/tag and sole-marker-mutation contract checks. No live registry
mutation occurs in these local regression checks.
