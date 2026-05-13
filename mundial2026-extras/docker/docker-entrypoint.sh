#!/bin/sh
# mundial2026-backend/docker-entrypoint.sh
set -e

echo "⏳ Esperando base de datos..."
until npx prisma db push --accept-data-loss 2>/dev/null; do
  echo "  DB no lista, reintentando en 5s..."
  sleep 5
done

echo "🌱 Ejecutando seed..."
node prisma/seed.js || echo "Seed ya ejecutado o sin cambios"

echo "🚀 Iniciando servidor..."
exec node src/index.js
