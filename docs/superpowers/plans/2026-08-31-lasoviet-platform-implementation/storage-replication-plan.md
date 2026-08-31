# Storage Replication Plan

## Object Ownership

Garage is authoritative. PostgreSQL owns object metadata and lifecycle state.
Cloud S3 is an optional replica.

## Write Flow

1. Render the PDF to a temporary worker path.
2. Calculate SHA-256 and byte length.
3. Upload to a private Garage bucket using an opaque object key.
4. Commit asset metadata and an outbox event.
5. Delete the temporary file.
6. Dispatch `storage.replicate` only when cloud S3 is enabled.

## Replica State

```text
disabled
pending
replicating
replicated
retryable_failure
terminal_failure
delete_pending
deleted
```

## Idempotency

- Job key: `asset_id + source_version + destination`.
- Repeated upload checks stored SHA-256 metadata.
- Multipart ETag is not treated as a complete integrity hash.
- Reconciliation compares PostgreSQL state, Garage metadata, and cloud
  metadata without downloading every object.

## Deletion

1. Authorize deletion from the owning domain workflow.
2. Record a tombstone transactionally.
3. Remove or mark the Garage object unavailable.
4. Queue cloud deletion.
5. Retry until deleted or terminally failed.
6. Surface unresolved privacy deletion failures to operations.

No cloud-to-Garage synchronization or bidirectional conflict resolution exists.

## Degraded Modes

- No cloud configuration: normal `disabled` state.
- Cloud outage: Garage writes and user requests succeed; replication retries.
- Garage outage: report HTML remains available; PDF generation/download waits.
- Redis outage: outbox retains undispatched replication work.

## Backup Boundary

The replica is not a backup because deletions propagate. PostgreSQL and Garage
backups require separate encrypted retention and restore procedures.

Garage backup uses an independent versioned offsite target, S3 object-copy
manifests, clean metadata snapshots, and an isolated restore drill. The
encrypted offsite set explicitly contains the snapshot directory, cluster
layout, node IDs and node keys, bucket/key policies, and required
configuration recovery files. Restore evidence restores those artifacts and
compares object SHA-256 values against PostgreSQL asset metadata.
