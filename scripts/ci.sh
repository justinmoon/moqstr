#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)

log() {
  printf '[ci] %s\n' "$*"
}

cd "${PROJECT_ROOT}"

log "Installing npm dependencies"
npm ci

log "Installing Playwright browsers"
npx playwright install --with-deps chromium

log "Running TypeScript checks"
npx tsc --noEmit

log "Running Biome checks"
npx @biomejs/biome check .

log "Running Playwright tests (mock transport)"
START_MOQ_RELAY="0" npx playwright test tests/preview.spec.ts

log "Running Playwright tests (MoQ relay)"
START_MOQ_RELAY="0" \
  MOQ_RELAY_BIN="${MOQ_RELAY_BIN:-moq-relay}" \
  MOQ_RELAY_CONFIG="${MOQ_RELAY_CONFIG:-${PROJECT_ROOT}/config/moq-relay-dev.toml}" \
  npx playwright test tests/moq-dual.spec.ts
