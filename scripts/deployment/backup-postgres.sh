#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
. "${SCRIPT_DIR}/lib/common.sh"

load_deploy_config
build_base_compose_cmd

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
      chmod 600 "$PARTIAL_ARCHIVE" 2>/dev/null || true
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
DUMP_SCRIPT="set -eu; trap 'rm -f ${CONTAINER_TEMP}' EXIT; pg_dump -U \"\${POSTGRES_USER}\" -d \"\${POSTGRES_DB}\" --format=custom --file=${CONTAINER_TEMP}; pg_restore --list ${CONTAINER_TEMP} > /dev/null; cat ${CONTAINER_TEMP}"

rm -f "$PARTIAL_ARCHIVE" "$PARTIAL_CHECKSUM"

# Enforce umask 077 before creating any host partial
umask 077

# Stream backup from container
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

# Chmod must succeed
chmod 600 "$PARTIAL_ARCHIVE"
chmod 600 "$PARTIAL_CHECKSUM"

# Atomic rename
mv -f "$PARTIAL_ARCHIVE" "$FINAL_ARCHIVE"
mv -f "$PARTIAL_CHECKSUM" "$FINAL_CHECKSUM"
chmod 600 "$FINAL_ARCHIVE"
chmod 600 "$FINAL_CHECKSUM"

# Strict retention pruning
prune_pairs() {
  local prefix_type="$1" # daily or pre-deploy
  local keep_count="$2"

  local valid_dumps=()

  while IFS= read -r -d '' dump_path; do
    local fname
    fname="$(basename "$dump_path")"
    local base="${fname%.dump}"
    local is_match=0

    if [ "$prefix_type" = "daily" ]; then
      if [[ "$base" =~ ^daily-[0-9]{8}T[0-9]{6}Z$ ]]; then
        is_match=1
      fi
    elif [ "$prefix_type" = "pre-deploy" ]; then
      if [[ "$base" =~ ^pre-deploy-[0-9a-f]{40}-[0-9]{8}T[0-9]{6}Z$ ]]; then
        is_match=1
      fi
    fi

    if [ "$is_match" -eq 1 ]; then
      if [ -f "${dump_path}.sha256" ]; then
        valid_dumps+=("$dump_path")
      fi
    fi
  done < <(find "$BACKUP_DIR" -maxdepth 1 -name "*.dump" -print0)

  if [ "${#valid_dumps[@]}" -eq 0 ]; then
    return 0
  fi

  local sorted_dumps=()
  while IFS= read -r line; do
    [ -n "$line" ] && sorted_dumps+=("$line")
  done < <(printf "%s\n" "${valid_dumps[@]}" | sort -r)

  local total="${#sorted_dumps[@]}"
  if [ "$total" -gt "$keep_count" ]; then
    local idx=0
    for d in "${sorted_dumps[@]}"; do
      idx=$((idx + 1))
      if [ "$idx" -gt "$keep_count" ]; then
        rm -f "$d" "${d}.sha256"
      fi
    done
  fi
}

prune_pairs "daily" 7
prune_pairs "pre-deploy" 10

exit 0