#!/bin/sh
set -e

echo "==> Running database migrations..."
# Retry migration tối đa 5 lần nếu DB chưa sẵn sàng
for i in 1 2 3 4 5; do
  node ./node_modules/.bin/typeorm --dataSource=dist/database/data-source.js migration:run && break
  echo "    Migration attempt $i failed, retrying in 5s..."
  sleep 5
done

echo "==> Migrations completed. Starting application..."
exec node dist/main
