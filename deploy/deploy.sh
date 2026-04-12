#!/bin/bash
set -euo pipefail

# GambChamp CRM - Production Deployment Script
# Usage: ./deploy/deploy.sh [up|down|pull|logs|status]

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found. Copy .env.example to .env and configure it."
    exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

case "${1:-up}" in
    up)
        echo "Starting GambChamp CRM..."
        docker compose -f "$COMPOSE_FILE" up -d
        echo ""
        echo "Services starting up. Check status with: ./deploy/deploy.sh status"
        echo ""
        echo "  Frontend:   http://localhost:${WEB_PORT:-80}"
        echo "  API:        http://localhost:${API_PORT:-8080}"
        echo "  Grafana:    http://localhost:${GRAFANA_PORT:-3000}"
        echo "  Prometheus: http://localhost:9090"
        echo "  NATS:       http://localhost:8222"
        ;;
    down)
        echo "Stopping GambChamp CRM..."
        docker compose -f "$COMPOSE_FILE" down
        ;;
    pull)
        echo "Pulling latest images..."
        docker compose -f "$COMPOSE_FILE" pull
        echo "Restarting services..."
        docker compose -f "$COMPOSE_FILE" up -d
        ;;
    logs)
        docker compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    status)
        docker compose -f "$COMPOSE_FILE" ps
        ;;
    *)
        echo "Usage: $0 [up|down|pull|logs|status]"
        exit 1
        ;;
esac
