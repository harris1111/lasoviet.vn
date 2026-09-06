#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
. "${SCRIPT_DIR}/lib/common.sh"

load_deploy_config

if ! acquire_release_lock; then
  # Lock contention is quiet exit 0
  exit 0
fi

read_state

DRY_RUN=0
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=1
  fi
done

MARKER_IMAGE="ghcr.io/harris1111/lasoviet-release:production"

# Pull marker
pull_output=""
if ! pull_output="$(docker pull "$MARKER_IMAGE" 2>&1)"; then
  # Check if manifest unknown / not found
  if echo "$pull_output" | grep -qiE "manifest unknown|not found|does not exist"; then
    exit 0
  fi
  record_failure "MARKER_PULL_FAILED"
  exit 1
fi

# Inspect image revision label
revision=""
if ! revision="$(docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$MARKER_IMAGE" 2>/dev/null)"; then
  record_failure "MARKER_INSPECT_FAILED"
  exit 1
fi

revision="$(echo "$revision" | tr -d ' \r\n')"

if ! validate_sha "$revision"; then
  record_failure "MARKER_INVALID"
  exit 1
fi

# Unchanged SHA is quiet exit 0
if [ "$revision" = "$CURRENT_RELEASE_SHA" ]; then
  exit 0
fi

# In dry-run mode: do not deploy or mutate state
if [ "$DRY_RUN" -eq 1 ]; then
  exit 0
fi

# Invoke deployment, keeping inherited FD 9 lock
exec "${SCRIPT_DIR}/deploy-release.sh" "$revision"