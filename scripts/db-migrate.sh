#!/bin/bash
set -e

echo "Running database migrations..."
cd apps/api
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
echo "Migrations complete."
