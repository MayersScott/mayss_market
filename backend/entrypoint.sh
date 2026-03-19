#!/bin/sh
set -e

echo "Waiting for database..."
while ! python -c "import psycopg2, os; psycopg2.connect(os.environ['DATABASE_URL'].replace('+psycopg2', ''))" 2>/dev/null; do
    sleep 1
done
echo "Database ready."

python seed.py

exec uvicorn app.main:app --host 0.0.0.0 --port 8000