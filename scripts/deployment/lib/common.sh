#!/usr/bin/env bash
set -Eeuo pipefail

# Convert and prepend LASOVIET_TEST_BIN if set
if [ -n "${LASOVIET_TEST_BIN:-}" ]; then
  converted_bin="$(cygpath -u "$LASOVIET_TEST_BIN" 2>/dev/null || echo "$LASOVIET_TEST_BIN")"
  PATH="${converted_bin}:${PATH}"
fi

# Determine config file
load_deploy_config() {
  local config_file=""
  if [ -n "${LASOVIET_DEPLOY_CONFIG:-}" ]; then
    config_file="${LASOVIET_DEPLOY_CONFIG}"
  elif [ -f "$(dirname "$0")/deploy.env" ]; then
    config_file="$(dirname "$0")/deploy.env"
  elif [ -f "$(dirname "$0")/../deploy.env" ]; then
    config_file="$(dirname "$0")/../deploy.env"
  elif [ -f "/home/debian/infra/lasoviet/deploy.env" ]; then
    config_file="/home/debian/infra/lasoviet/deploy.env"
  fi

  if [ -z "$config_file" ] || [ ! -f "$config_file" ]; then
    echo "ERROR: deploy configuration file not found" >&2
    exit 1
  fi

  # Source the config file safely
  # shellcheck source=/dev/null
  set -a
  . "$config_file"
  set +a

  validate_config
}

is_absolute_path() {
  case "$1" in
    /*|[a-zA-Z]:/*|[a-zA-Z]:\\*) return 0 ;;
    *) return 1 ;;
  esac
}

validate_config() {
  local required_paths=(
    "PROJECT_DIR"
    "DEPLOY_ENV_FILE"
    "DATA_DIR"
    "STATE_DIR"
    "LOG_DIR"
    "BACKUP_DIR"
  )

  for var_name in "${required_paths[@]}"; do
    local val="${!var_name:-}"
    if [ -z "$val" ]; then
      echo "ERROR: missing required config variable: $var_name" >&2
      exit 1
    fi
    if ! is_absolute_path "$val"; then
      echo "ERROR: config variable $var_name must be an absolute path" >&2
      exit 1
    fi
  done

  if [ -z "${LOOPBACK_READY_URL:-}" ] || [ -z "${PUBLIC_READY_URL:-}" ]; then
    echo "ERROR: missing readiness URL configuration" >&2
    exit 1
  fi

  MIN_FREE_KB="${MIN_FREE_KB:-2097152}"
  if [[ ! "$MIN_FREE_KB" =~ ^[1-9][0-9]*$ ]]; then
    echo "ERROR: MIN_FREE_KB must be a positive decimal integer" >&2
    exit 1
  fi

  mkdir -p "$STATE_DIR" "$LOG_DIR" "$BACKUP_DIR"
  chmod 700 "$STATE_DIR" "$LOG_DIR" "$BACKUP_DIR" 2>/dev/null || true
}

acquire_release_lock() {
  if [ "${LASOVIET_RELEASE_LOCK_HELD:-0}" = "1" ]; then
    if ! { true >&9; } 2>/dev/null; then
      echo "ERROR: release lock marker inherited but file descriptor 9 unavailable" >&2
      exit 1
    fi
    return 0
  fi

  local lock_file="${STATE_DIR}/release.lock"
  mkdir -p "$(dirname "$lock_file")"
  exec 9>"$lock_file"

  if ! flock -n 9; then
    exec 9>&-
    return 1
  fi

  export LASOVIET_RELEASE_LOCK_HELD=1
  return 0
}

validate_sha() {
  local sha="$1"
  if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
    return 1
  fi
  return 0
}

validate_status_code() {
  local code="$1"
  if [[ ! "$code" =~ ^[A-Z][A-Z0-9_]{0,63}$ ]]; then
    return 1
  fi
  return 0
}

validate_timestamp() {
  local ts="$1"
  if [[ ! "$ts" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]; then
    return 1
  fi
  return 0
}

log_status() {
  local code="$1"
  if ! validate_status_code "$code"; then
    echo "ERROR: invalid status code format: $code" >&2
    return 1
  fi
  local log_file="${LOG_DIR:-/tmp}/deploy.log"
  local timestamp
  timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  printf '%s %s\n' "$timestamp" "$code" >> "$log_file"
}

get_state_file() {
  echo "${STATE_DIR}/release-state.env"
}

read_state() {
  local state_file
  state_file="$(get_state_file)"

  CURRENT_RELEASE_SHA=""
  PREVIOUS_RELEASE_SHA=""
  LAST_ATTEMPTED_RELEASE_SHA=""
  LAST_SUCCESSFUL_DEPLOYMENT_AT=""
  LAST_FAILURE_CODE=""
  LAST_FAILURE_AT=""

  if [ -f "$state_file" ]; then
    while IFS='=' read -r key val || [ -n "$key" ]; do
      key="$(echo "$key" | tr -d ' ')"
      val="$(echo "$val" | sed -e 's/^"//' -e 's/"$//')"
      case "$key" in
        CURRENT_RELEASE_SHA) CURRENT_RELEASE_SHA="$val" ;;
        PREVIOUS_RELEASE_SHA) PREVIOUS_RELEASE_SHA="$val" ;;
        LAST_ATTEMPTED_RELEASE_SHA) LAST_ATTEMPTED_RELEASE_SHA="$val" ;;
        LAST_SUCCESSFUL_DEPLOYMENT_AT) LAST_SUCCESSFUL_DEPLOYMENT_AT="$val" ;;
        LAST_FAILURE_CODE) LAST_FAILURE_CODE="$val" ;;
        LAST_FAILURE_AT) LAST_FAILURE_AT="$val" ;;
      esac
    done < "$state_file"
  fi
}

write_state() {
  if [ "$#" -ne 6 ]; then
    echo "ERROR: write_state requires exactly 6 explicit arguments" >&2
    return 1
  fi

  local cur="$1"
  local prev="$2"
  local last_att="$3"
  local last_succ="$4"
  local fail_code="$5"
  local fail_at="$6"

  # Validate non-empty values
  if [ -n "$cur" ] && ! validate_sha "$cur"; then
    echo "ERROR: invalid CURRENT_RELEASE_SHA format" >&2
    return 1
  fi
  if [ -n "$prev" ] && ! validate_sha "$prev"; then
    echo "ERROR: invalid PREVIOUS_RELEASE_SHA format" >&2
    return 1
  fi
  if [ -n "$last_att" ] && ! validate_sha "$last_att"; then
    echo "ERROR: invalid LAST_ATTEMPTED_RELEASE_SHA format" >&2
    return 1
  fi
  if [ -n "$last_succ" ] && ! validate_timestamp "$last_succ"; then
    echo "ERROR: invalid LAST_SUCCESSFUL_DEPLOYMENT_AT format" >&2
    return 1
  fi
  if [ -n "$fail_code" ] && ! validate_status_code "$fail_code"; then
    echo "ERROR: invalid LAST_FAILURE_CODE format" >&2
    return 1
  fi
  if [ -n "$fail_at" ] && ! validate_timestamp "$fail_at"; then
    echo "ERROR: invalid LAST_FAILURE_AT format" >&2
    return 1
  fi

  local state_file
  state_file="$(get_state_file)"
  local tmp_file="${state_file}.tmp.$$"

  local old_umask
  old_umask="$(umask)"
  umask 077

  cat <<EOF > "$tmp_file"
CURRENT_RELEASE_SHA="${cur}"
PREVIOUS_RELEASE_SHA="${prev}"
LAST_ATTEMPTED_RELEASE_SHA="${last_att}"
LAST_SUCCESSFUL_DEPLOYMENT_AT="${last_succ}"
LAST_FAILURE_CODE="${fail_code}"
LAST_FAILURE_AT="${fail_at}"
EOF

  chmod 600 "$tmp_file"
  mv -f "$tmp_file" "$state_file"
  umask "$old_umask"
}

record_failure() {
  local code="$1"
  local now
  now="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  log_status "$code"
  read_state
  write_state "$CURRENT_RELEASE_SHA" "$PREVIOUS_RELEASE_SHA" "$LAST_ATTEMPTED_RELEASE_SHA" "$LAST_SUCCESSFUL_DEPLOYMENT_AT" "$code" "$now"
}

build_base_compose_cmd() {
  COMPOSE_CMD=(
    docker compose
    --env-file "$DEPLOY_ENV_FILE"
    -f "$PROJECT_DIR/docker-compose.yml"
    -f "$PROJECT_DIR/docker-compose.production.yml"
  )
}

build_compose_cmd() {
  build_base_compose_cmd
  COMPOSE_CMD+=(-f "$PROJECT_DIR/docker-compose.registry.yml")
}
