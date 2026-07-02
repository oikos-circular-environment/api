#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Seeding database..."
npm run seed
echo "Starting development server..."
exec npm run dev
