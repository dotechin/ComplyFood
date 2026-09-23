#!/usr/bin/env bash
set -euo pipefail

# Stop the local staging stack.
#   ./scripts/staging-down.sh            # stop containers, keep data
#   ./scripts/staging-down.sh --volumes  # stop AND wipe the staging data volumes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="infra/docker-compose.staging.yml"

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi

if [ "${1:-}" = "--volumes" ]; then
  echo "==> Stopping staging stack and removing data volumes..."
  "${DC[@]}" -f "$COMPOSE_FILE" down --volumes
else
  echo "==> Stopping staging stack (data preserved)..."
  "${DC[@]}" -f "$COMPOSE_FILE" down
fi
