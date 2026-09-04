#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
. "${SCRIPT_DIR}/lib/common.sh"

load_deploy_config
read_state

CANDIDATE_SHA="${1:-}"
if [ -z "$CANDIDATE_SHA" ] || ! validate_sha "$CANDIDATE_SHA"; then
  echo "ERROR: valid 40-character release SHA required" >&2
  exit 1
fi

export LASOVIET_RELEASE_SHA="$CANDIDATE_SHA"
build_compose_cmd

# Preflight 1: Disk space check
check_disk_space() {
  local avail_kb
  avail_kb="$(df -k "$DATA_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
  if [ -n "$avail_kb" ] && [ "$avail_kb" -lt "$MIN_FREE_KB" ]; then
    echo "ERROR: insufficient disk space" >&2
    record_failure "DISK_SPACE_INSUFFICIENT"
    exit 1
  fi
}
check_disk_space

# Record candidate attempt before deployment operations start
PREV_CURRENT="$CURRENT_RELEASE_SHA"
PREV_PREVIOUS="$PREVIOUS_RELEASE_SHA"
write_state "$CURRENT_RELEASE_SHA" "$PREVIOUS_RELEASE_SHA" "$CANDIDATE_SHA" "$LAST_SUCCESSFUL_DEPLOYMENT_AT" "" ""

# Preflight 2: Pre-deploy backup
if ! "${SCRIPT_DIR}/backup-postgres.sh" pre-deploy "$CANDIDATE_SHA"; then
  echo "ERROR: pre-deploy backup failed" >&2
  record_failure "BACKUP_FAILED"
  exit 1
fi

# Step 3: Pull immutable images
if ! "${COMPOSE_CMD[@]}" pull migrate api worker web >/dev/null 2>&1; then
  record_failure "IMAGE_PULL_FAILED"
  exit 1
fi

# Step 4: Run one-shot migration
if ! "${COMPOSE_CMD[@]}" run --rm migrate >/dev/null 2>&1; then
  record_failure "MIGRATION_FAILED"
  exit 1
fi

# Step 5: Replace api+worker then web
APP_REPLACED=0
if ! "${COMPOSE_CMD[@]}" up -d --no-build api worker >/dev/null 2>&1; then
  record_failure "APP_UP_FAILED"
  exit 1
fi
APP_REPLACED=1

if ! "${COMPOSE_CMD[@]}" up -d --no-build web >/dev/null 2>&1; then
  record_failure "WEB_UP_FAILED"
  if [ -n "$PREV_CURRENT" ]; then
    "${SCRIPT_DIR}/rollback-release.sh" "$PREV_CURRENT" || true
  fi
  exit 1
fi

# Step 6: Post-deploy readiness checks
check_readiness() {
  local timeout="${DEPLOY_TEST_TIMEOUT:-120}"
  local interval="${DEPLOY_TEST_INTERVAL:-5}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout" ]; do
    local ok=1

    # postgres
    if ! "${COMPOSE_CMD[@]}" exec -T postgres pg_isready >/dev/null 2>&1; then
      ok=0
    fi

    # redis
    if [ "$ok" -eq 1 ] && ! "${COMPOSE_CMD[@]}" exec -T redis redis-cli ping >/dev/null 2>&1; then
      ok=0
    fi

    # worker
    if [ "$ok" -eq 1 ] && ! "${COMPOSE_CMD[@]}" exec -T worker node dist/health/worker-health-cli.js >/dev/null 2>&1; then
      ok=0
    fi

    # loopback
    if [ "$ok" -eq 1 ] && ! curl -sf -o /dev/null "$LOOPBACK_READY_URL" >/dev/null 2>&1; then
      ok=0
    fi

    # public
    if [ "$ok" -eq 1 ] && ! curl -sf -o /dev/null "$PUBLIC_READY_URL" >/dev/null 2>&1; then
      ok=0
    fi

    if [ "$ok" -eq 1 ]; then
      return 0
    fi

    sleep "$interval"
    elapsed=$((elapsed + interval))
  done

  return 1
}

if ! check_readiness; then
  record_failure "HEALTH_CHECK_FAILED"
  if [ "$APP_REPLACED" -eq 1 ] && [ -n "$PREV_CURRENT" ] && validate_sha "$PREV_CURRENT"; then
    "${SCRIPT_DIR}/rollback-release.sh" "$PREV_CURRENT" || true
  fi
  exit 1
fi

# Step 7: Promote state
NOW="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
write_state "$CANDIDATE_SHA" "$PREV_CURRENT" "$CANDIDATE_SHA" "$NOW" "" ""
log_status "DEPLOY_SUCCESSFUL"

exit 0