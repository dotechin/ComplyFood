#!/bin/bash
set -e

echo "Running database migrations..."
cd apps/api
npx typeorm migration:run -d src/database/data-source.ts
echo "Migrations complete."
