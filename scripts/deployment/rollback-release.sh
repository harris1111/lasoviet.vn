#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
. "${SCRIPT_DIR}/lib/common.sh"

load_deploy_config
read_state

TARGET_SHA="${1:-}"
if [ -z "$TARGET_SHA" ] || ! validate_sha "$TARGET_SHA"; then
  echo "ERROR: valid 40-character target release SHA required" >&2
  exit 1
fi

# Rollback accepts only a SHA equal to recorded CURRENT_RELEASE_SHA or PREVIOUS_RELEASE_SHA
if [ "$TARGET_SHA" != "$CURRENT_RELEASE_SHA" ] && [ "$TARGET_SHA" != "$PREVIOUS_RELEASE_SHA" ]; then
  echo "ERROR: rollback target must equal current or previous release SHA" >&2
  exit 1
fi

export LASOVIET_RELEASE_SHA="$TARGET_SHA"
build_compose_cmd

# Pull images for rollback target SHA
if ! "${COMPOSE_CMD[@]}" pull api worker web >/dev/null 2>&1; then
  record_failure "ROLLBACK_PULL_FAILED"
  exit 1
fi

# Replace api+worker then web
if ! "${COMPOSE_CMD[@]}" up -d --no-build api worker >/dev/null 2>&1; then
  record_failure "ROLLBACK_APP_UP_FAILED"
  exit 1
fi

if ! "${COMPOSE_CMD[@]}" up -d --no-build web >/dev/null 2>&1; then
  record_failure "ROLLBACK_WEB_UP_FAILED"
  exit 1
fi

# Health check helper: retry with total timeout 120s, interval 5s
check_readiness() {
  local timeout="${DEPLOY_TEST_TIMEOUT:-120}"
  local interval="${DEPLOY_TEST_INTERVAL:-5}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout" ]; do
    local ok=1

    # 1. postgres health
    if ! "${COMPOSE_CMD[@]}" exec -T postgres pg_isready >/dev/null 2>&1; then
      ok=0
    fi

    # 2. redis ping
    if [ "$ok" -eq 1 ] && ! "${COMPOSE_CMD[@]}" exec -T redis redis-cli ping >/dev/null 2>&1; then
      ok=0
    fi

    # 3. worker probe
    if [ "$ok" -eq 1 ] && ! "${COMPOSE_CMD[@]}" exec -T worker node dist/health/worker-health-cli.js >/dev/null 2>&1; then
      ok=0
    fi

    # 4. loopback curl
    if [ "$ok" -eq 1 ] && ! curl -sf -o /dev/null "$LOOPBACK_READY_URL" >/dev/null 2>&1; then
      ok=0
    fi

    # 5. public curl
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
  record_failure "ROLLBACK_HEALTH_FAILED"
  exit 1
fi

# Consistently update state
# If rollback succeeded, target SHA becomes current release
# Previous release remains or is cleared if target was previous
NOW="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
write_state "$TARGET_SHA" "" "$LAST_ATTEMPTED_RELEASE_SHA" "$NOW" "" ""
log_status "ROLLBACK_SUCCESSFUL"
exit 0