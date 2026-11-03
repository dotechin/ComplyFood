#!/usr/bin/env bash
set -euo pipefail

# Pull the latest changes and rebuild the real local stack (prod + Tailscale API,
# web on 127.0.0.1:3100). Data volumes are kept; never uses -v.
#
#   ./scripts/update-local.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

git pull --ff-only

docker compose --project-directory . --env-file .env \
  -f infra/docker-compose.prod.yml \
  -f infra/docker-compose.tailscale.yml \
  -f infra/docker-compose.tailnet-web.yml \
  -f infra/docker-compose.local-web.yml \
  up -d --build api web

curl -s -o /dev/null -w "api  :4000 -> %{http_code}\n" http://127.0.0.1:4000/api/v1/auth/me || true
curl -s -o /dev/null -w "web  :3100 -> %{http_code}\n" http://127.0.0.1:3100/api/v1/auth/me || true
