#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
. "${SCRIPT_DIR}/lib/common.sh"

load_deploy_config
build_compose_cmd

MODE="${1:-}"
if [ -z "$MODE" ]; then
  echo "Usage: $0 daily | pre-deploy <sha>" >&2
  exit 1
fi

TARGET_SHA=""
case "$MODE" in
  daily)
    ;;
  pre-deploy)
    TARGET_SHA="${2:-}"
    if [ -z "$TARGET_SHA" ] || ! validate_sha "$TARGET_SHA"; then
      echo "ERROR: pre-deploy backup requires valid 40-hex lowercase sha" >&2
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 daily | pre-deploy <sha>" >&2
    exit 1
    ;;
esac

TIMESTAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
if [ "$MODE" = "daily" ]; then
  BASE_NAME="daily-${TIMESTAMP}"
else
  BASE_NAME="pre-deploy-${TARGET_SHA}-${TIMESTAMP}"
fi

FINAL_ARCHIVE="${BACKUP_DIR}/${BASE_NAME}.dump"
FINAL_CHECKSUM="${FINAL_ARCHIVE}.sha256"
PARTIAL_ARCHIVE="${FINAL_ARCHIVE}.partial"
FAILED_ARCHIVE="${FINAL_ARCHIVE}.failed"
PARTIAL_CHECKSUM="${FINAL_CHECKSUM}.partial"

cleanup_failure() {
  if [ -f "$PARTIAL_ARCHIVE" ]; then
    if [ -s "$PARTIAL_ARCHIVE" ]; then
      mv -f "$PARTIAL_ARCHIVE" "$FAILED_ARCHIVE" 2>/dev/null || true
    else
      rm -f "$PARTIAL_ARCHIVE" 2>/dev/null || true
    fi
  fi
  rm -f "$PARTIAL_CHECKSUM" 2>/dev/null || true
}

trap cleanup_failure ERR INT TERM

# Run backup inside container
CONTAINER_TEMP="/tmp/dump-${TIMESTAMP}-$$.dump"
DUMP_SCRIPT="set -euo pipefail; trap 'rm -f ${CONTAINER_TEMP}' EXIT; pg_dump -U \"\${POSTGRES_USER}\" -d \"\${POSTGRES_DB}\" --format=custom --file=${CONTAINER_TEMP}; pg_restore --list ${CONTAINER_TEMP} > /dev/null; cat ${CONTAINER_TEMP}"

rm -f "$PARTIAL_ARCHIVE" "$PARTIAL_CHECKSUM"

# Stream backup from container
# Suppress stderr to avoid leaking sensitive connection data
if ! "${COMPOSE_CMD[@]}" exec -T postgres sh -c "$DUMP_SCRIPT" > "$PARTIAL_ARCHIVE" 2>/dev/null; then
  echo "ERROR: postgres container dump failed" >&2
  cleanup_failure
  exit 1
fi

# Reject empty
if [ ! -s "$PARTIAL_ARCHIVE" ]; then
  echo "ERROR: backup output is empty" >&2
  cleanup_failure
  exit 1
fi

# Checksum creation
(
  cd "$BACKUP_DIR"
  sha256sum "$(basename "$PARTIAL_ARCHIVE")" | sed "s|$(basename "$PARTIAL_ARCHIVE")|${BASE_NAME}.dump|" > "$PARTIAL_CHECKSUM"
)

chmod 600 "$PARTIAL_ARCHIVE" "$PARTIAL_CHECKSUM" 2>/dev/null || true

# Atomic rename
mv -f "$PARTIAL_ARCHIVE" "$FINAL_ARCHIVE"
mv -f "$PARTIAL_CHECKSUM" "$FINAL_CHECKSUM"
chmod 600 "$FINAL_ARCHIVE" "$FINAL_CHECKSUM" 2>/dev/null || true

# Prune retention
prune_backups() {
  local prefix="$1"
  local keep_count="$2"

  local matching_dumps=()
  local prev_shopt
  prev_shopt="$(shopt -p nullglob || true)"
  shopt -s nullglob

  for f in $(printf '%s\n' "${BACKUP_DIR}/${prefix}"*.dump | sort -r); do
    [ -f "$f" ] && matching_dumps+=("$f")
  done

  eval "$prev_shopt"

  local total="${#matching_dumps[@]}"
  if [ "$total" -gt "$keep_count" ]; then
    local idx=0
    for dump_path in "${matching_dumps[@]}"; do
      idx=$((idx + 1))
      if [ "$idx" -gt "$keep_count" ]; then
        rm -f "$dump_path" "${dump_path}.sha256" 2>/dev/null || true
      fi
    done
  fi
}

prune_backups "daily-" 7
prune_backups "pre-deploy-" 10

exit 0