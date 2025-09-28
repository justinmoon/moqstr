#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)
RELAY_CONFIG="${PROJECT_ROOT}/config/moq-relay-dev.toml"

if [[ ! -f "${RELAY_CONFIG}" ]]; then
  echo "Expected relay config not found at ${RELAY_CONFIG}" >&2
  exit 1
fi

export VITE_RELAY_URL="${VITE_RELAY_URL:-http://127.0.0.1:4443/anon}"
export VITE_TRANSPORT="${VITE_TRANSPORT:-moq}"
export VITE_ROOM="${VITE_ROOM:-js-api-meet}"
START_MOQ_RELAY="${START_MOQ_RELAY:-1}"

log() {
  printf '[dev] %s\n' "$*"
}

start_relay() {
  if command -v moq-relay >/dev/null 2>&1; then
    log "Starting moq-relay from PATH"
    moq-relay "${RELAY_CONFIG}" &
  else
    if ! command -v nix >/dev/null 2>&1; then
      echo "moq-relay not found and nix is unavailable; install one of them" >&2
      exit 1
    fi
    log "Starting moq-relay via nix run"
    nix run "${PROJECT_ROOT}#moq-relay" -- "${RELAY_CONFIG}" &
  fi
  RELAY_PID=$!
  export RELAY_PID
}

cleanup() {
  if [[ -n "${RELAY_PID:-}" ]] && ps -p "${RELAY_PID}" >/dev/null 2>&1; then
    log "Stopping moq-relay (pid ${RELAY_PID})"
    kill "${RELAY_PID}" >/dev/null 2>&1 || true
    wait "${RELAY_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

if [[ "${START_MOQ_RELAY}" != "0" ]]; then
  start_relay
else
  log "Skipping moq-relay startup (START_MOQ_RELAY=${START_MOQ_RELAY})"
fi

log "Starting Vite dev server"
cd "${PROJECT_ROOT}"
if command -v bunx >/dev/null 2>&1; then
  bunx --bun vite dev "$@"
else
  bun run --bun vite dev "$@"
fi
