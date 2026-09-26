#!/bin/bash
set -e

# Stop the local staging stack.
# Pass --volumes to also delete the Postgres and MinIO data volumes.
#
#   ./scripts/staging-down.sh
#   ./scripts/staging-down.sh --volumes

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.staging.yml"

COMPOSE_ARGS=(-f "$COMPOSE_FILE")
if [ -f "$ROOT_DIR/.env.staging" ]; then
  COMPOSE_ARGS+=(--env-file "$ROOT_DIR/.env.staging")
fi

DOWN_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --volumes) DOWN_ARGS+=(--volumes) ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

echo "Stopping staging services..."
docker compose "${COMPOSE_ARGS[@]}" --profile seed down "${DOWN_ARGS[@]}"
echo "Staging stopped."
