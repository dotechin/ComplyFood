#!/bin/bash
set -e

# Bring up the local staging stack (build images, run migrations, start services).
# Pass --seed to also load demo data after migrations.
#
#   ./scripts/staging-up.sh
#   ./scripts/staging-up.sh --seed

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.staging.yml"

COMPOSE_ARGS=(-f "$COMPOSE_FILE")
if [ -f "$ROOT_DIR/.env.staging" ]; then
  COMPOSE_ARGS+=(--env-file "$ROOT_DIR/.env.staging")
fi

SEED=false
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

echo "Building and starting staging services..."
docker compose "${COMPOSE_ARGS[@]}" up -d --build minio-init api web

if [ "$SEED" = true ]; then
  echo "Seeding staging database with demo data..."
  docker compose "${COMPOSE_ARGS[@]}" --profile seed run --rm seed
fi

echo ""
echo "Staging is up:"
echo "  Web:          http://localhost:3100"
echo "  API:          http://localhost:4100/api/v1"
echo "  MinIO console http://localhost:9003"
