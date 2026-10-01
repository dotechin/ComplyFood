#!/usr/bin/env bash
set -euo pipefail

# Start the local staging stack: build images, run DB migrations, start
# web + api + postgres (uploads stored in a local volume). Pass --seed to also load demo data.
#
#   ./scripts/staging-up.sh          # build + migrate + start
#   ./scripts/staging-up.sh --seed   # also seed demo data

# Resolve repo root regardless of where the script is called from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="infra/docker-compose.staging.yml"

# Fail loudly if Docker isn't available/running (the usual cause of "nothing happened").
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: 'docker' is not installed or not on your PATH." >&2
  echo "Install Docker Desktop (https://www.docker.com/products/docker-desktop) and try again." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is installed but the daemon isn't running." >&2
  echo "Open Docker Desktop, wait until it says 'running', then re-run this script." >&2
  exit 1
fi

# Prefer 'docker compose' (v2), fall back to 'docker-compose' (v1).
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi

# Load .env.staging if present (optional; compose has defaults otherwise).
ENV_ARGS=()
if [ -f ".env.staging" ]; then
  echo "Using .env.staging for overrides."
  ENV_ARGS=(--env-file .env.staging)
fi

SEED=false
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

echo "==> Building images (first run can take a few minutes)..."
"${DC[@]}" "${ENV_ARGS[@]}" -f "$COMPOSE_FILE" build

echo "==> Starting staging stack (migrations run automatically before the API)..."
"${DC[@]}" "${ENV_ARGS[@]}" -f "$COMPOSE_FILE" up -d

if [ "$SEED" = true ]; then
  echo "==> Seeding demo data..."
  "${DC[@]}" "${ENV_ARGS[@]}" -f "$COMPOSE_FILE" run --rm seed
fi

echo ""
echo "Staging is up:"
echo "  Web:           http://localhost:3100"
echo "  API:           http://localhost:4100/api/v1"
if [ "$SEED" = true ]; then
  echo ""
  echo "Demo login: admin@demo.com / password123  (also staff@demo.com / password123)"
fi
echo ""
echo "Logs:  docker compose -f $COMPOSE_FILE logs -f"
echo "Stop:  ./scripts/staging-down.sh"
