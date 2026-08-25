#!/bin/bash
set -e

echo "Seeding development database..."
cd apps/api
npx ts-node src/database/seeds/dev.seed.ts
echo "Seed complete."
