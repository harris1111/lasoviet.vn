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

# Preflight 1: Disk space check using df -Pk
check_disk_space() {
  local avail_kb
  avail_kb="$(df -Pk "$DATA_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
  if [[ ! "$avail_kb" =~ ^[1-9][0-9]*$ ]]; then
    echo "ERROR: unparseable disk space output" >&2
    record_failure "DISK_SPACE_INVALID"
    exit 1
  fi
  if [ "$avail_kb" -lt "$MIN_FREE_KB" ]; then
    echo "ERROR: insufficient disk space" >&2
    record_failure "DISK_SPACE_INSUFFICIENT"
    exit 1
  fi
}
check_disk_space

# Preflight 2: Current running service health
check_current_services() {
  # 1. postgres
  if ! "${COMPOSE_CMD[@]}" exec -T postgres pg_isready >/dev/null 2>&1; then
    record_failure "PREFLIGHT_POSTGRES_UNHEALTHY"
    exit 1
  fi
  # 2. redis PONG
  local redis_pong
  redis_pong="$("${COMPOSE_CMD[@]}" exec -T redis redis-cli ping 2>/dev/null | tr -d ' \r\n')"
  if [ "$redis_pong" != "PONG" ]; then
    record_failure "PREFLIGHT_REDIS_UNHEALTHY"
    exit 1
  fi
  # 3. API internal
  if ! "${COMPOSE_CMD[@]}" exec -T api node -e "fetch('http://127.0.0.1:3001/health/ready').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    record_failure "PREFLIGHT_API_UNHEALTHY"
    exit 1
  fi
  # 4. Web internal
  if ! "${COMPOSE_CMD[@]}" exec -T web node -e "fetch('http://127.0.0.1:3000/health/ready').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    record_failure "PREFLIGHT_WEB_UNHEALTHY"
    exit 1
  fi
  # 5. Worker legacy-aware health check:
  # First test if dist/health/worker-health-cli.js exists inside container
  if "${COMPOSE_CMD[@]}" exec -T worker test -f dist/health/worker-health-cli.js >/dev/null 2>&1; then
    if ! "${COMPOSE_CMD[@]}" exec -T worker node dist/health/worker-health-cli.js >/dev/null 2>&1; then
      record_failure "PREFLIGHT_WORKER_UNHEALTHY"
      exit 1
    fi
  else
    # Legacy image: verify worker service is running via compose ps
    local running_workers
    running_workers="$("${COMPOSE_CMD[@]}" ps --status running --services 2>/dev/null | grep -E '^worker$' || true)"
    if [ -z "$running_workers" ]; then
      record_failure "PREFLIGHT_WORKER_UNHEALTHY"
      exit 1
    fi
  fi
}
check_current_services

# Record candidate attempt before deployment operations start
PREV_CURRENT="$CURRENT_RELEASE_SHA"
PREV_PREVIOUS="$PREVIOUS_RELEASE_SHA"
write_state "$CURRENT_RELEASE_SHA" "$PREVIOUS_RELEASE_SHA" "$CANDIDATE_SHA" "$LAST_SUCCESSFUL_DEPLOYMENT_AT" "" ""

# Preflight 3: Pre-deploy backup
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

# Rollback eligibility: once we attempt application replacement, any failure invokes rollback
# to PREV_CURRENT if PREV_CURRENT is a valid SHA.
ROLLBACK_ELIGIBLE=1

perform_rollback_if_eligible() {
  local fail_code="$1"
  record_failure "$fail_code"
  if [ "$ROLLBACK_ELIGIBLE" -eq 1 ] && [ -n "$PREV_CURRENT" ] && validate_sha "$PREV_CURRENT"; then
    "${SCRIPT_DIR}/rollback-release.sh" "$PREV_CURRENT" >/dev/null 2>&1 || true
    # Re-record original failure code so rollback does not mask candidate failure
    record_failure "$fail_code"
  fi
}

# Step 5: Replace api+worker then web
if ! "${COMPOSE_CMD[@]}" up -d --no-build api worker >/dev/null 2>&1; then
  perform_rollback_if_eligible "APP_UP_FAILED"
  exit 1
fi

if ! "${COMPOSE_CMD[@]}" up -d --no-build web >/dev/null 2>&1; then
  perform_rollback_if_eligible "WEB_UP_FAILED"
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

    # redis exact PONG
    local pong
    pong="$("${COMPOSE_CMD[@]}" exec -T redis redis-cli ping 2>/dev/null | tr -d ' \r\n')"
    if [ "$pong" != "PONG" ]; then
      ok=0
    fi

    # worker CLI probe
    if [ "$ok" -eq 1 ] && ! "${COMPOSE_CMD[@]}" exec -T worker node dist/health/worker-health-cli.js >/dev/null 2>&1; then
      ok=0
    fi

    # api internal
    if [ "$ok" -eq 1 ] && ! "${COMPOSE_CMD[@]}" exec -T api node -e "fetch('http://127.0.0.1:3001/health/ready').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      ok=0
    fi

    # web internal
    if [ "$ok" -eq 1 ] && ! "${COMPOSE_CMD[@]}" exec -T web node -e "fetch('http://127.0.0.1:3000/health/ready').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      ok=0
    fi

    # loopback curl with strict timeouts
    if [ "$ok" -eq 1 ] && ! curl --fail --silent --show-error --connect-timeout 5 --max-time 10 "$LOOPBACK_READY_URL" >/dev/null 2>&1; then
      ok=0
    fi

    # public curl with strict timeouts
    if [ "$ok" -eq 1 ] && ! curl --fail --silent --show-error --connect-timeout 5 --max-time 10 "$PUBLIC_READY_URL" >/dev/null 2>&1; then
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
  perform_rollback_if_eligible "HEALTH_CHECK_FAILED"
  exit 1
fi

# Step 7: Promote state
NOW="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
write_state "$CANDIDATE_SHA" "$PREV_CURRENT" "$CANDIDATE_SHA" "$NOW" "" ""
log_status "DEPLOY_SUCCESSFUL"

exit 0