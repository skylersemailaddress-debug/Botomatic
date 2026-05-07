#!/bin/sh
# Commercial production start script for Railway single-service deployment.
# Runs the orchestrator API on an internal port (3001) and the Next.js UI on
# Railway's exposed PORT. The Next.js catch-all proxy routes /api/* calls to
# the API on localhost:3001.

set -e

# The API always listens on 3001 (internal only). Export so child processes
# can pick it up, and set BOTOMATIC_API_PROXY_BASE_URL if not already set.
export BOTOMATIC_API_PROXY_BASE_URL="${BOTOMATIC_API_PROXY_BASE_URL:-http://localhost:3001}"

echo "[start-commercial] API proxy base: $BOTOMATIC_API_PROXY_BASE_URL"
echo "[start-commercial] UI port: ${PORT:-3000}"

# Start the orchestrator API on port 3001 in the background.
PORT=3001 npx tsx --no-warnings apps/orchestrator-api/src/bootstrap.ts &
API_PID=$!

# Brief startup window so the API is accepting connections before the first
# Railway health check arrives via the Next.js proxy.
sleep 3

# Start Next.js on Railway's exposed PORT (inherits $PORT from the environment).
npm --prefix apps/control-plane run start

# If Next.js exits for any reason, tear down the API too.
kill "$API_PID" 2>/dev/null || true
