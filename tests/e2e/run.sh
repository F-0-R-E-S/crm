#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== GambChamp CRM E2E Tests ==="

# Start infrastructure
echo "Starting test infrastructure..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" up -d --wait

# Export connection strings for the test
export E2E_PG_DSN="postgres://postgres:postgres@localhost:5433/gambchamp_e2e?sslmode=disable"
export E2E_REDIS_URL="redis://localhost:6380/15"
export E2E_NATS_URL="nats://localhost:4223"

echo "Infrastructure ready:"
echo "  Postgres: $E2E_PG_DSN"
echo "  Redis:    $E2E_REDIS_URL"
echo "  NATS:     $E2E_NATS_URL"

# Run tests
echo ""
echo "Running E2E tests..."
cd "$PROJECT_ROOT"
go test -v -timeout 180s -tags=e2e -count=1 ./tests/e2e/...
EXIT_CODE=$?

# Cleanup
echo ""
echo "Stopping infrastructure..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" down -v

exit $EXIT_CODE
