.PHONY: all build test lint clean docker-up docker-down migrate nats-init help e2e e2e-infra-up e2e-infra-down

SERVICES := lead-intake-svc routing-engine-svc broker-adapter-svc fraud-engine-svc \
            status-sync-svc autologin-svc uad-svc notification-svc api-gateway \
            identity-svc analytics-svc smart-routing-svc

GO := go
GOFLAGS := -ldflags="-s -w"

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

all: lint test build ## Run lint, test, and build

build: ## Build all services
	@for svc in $(SERVICES); do \
		echo "Building $$svc..."; \
		CGO_ENABLED=0 $(GO) build $(GOFLAGS) -o bin/$$svc ./services/$$svc/; \
	done

build-%: ## Build a specific service (e.g., make build-lead-intake-svc)
	CGO_ENABLED=0 $(GO) build $(GOFLAGS) -o bin/$* ./services/$*/

test: ## Run all tests
	$(GO) test -race -count=1 ./...

test-coverage: ## Run tests with coverage
	$(GO) test -race -coverprofile=coverage.out -covermode=atomic ./...
	$(GO) tool cover -html=coverage.out -o coverage.html

lint: ## Run linter
	golangci-lint run ./...

clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out coverage.html

docker-up: ## Start all services with Docker Compose (production frontend)
	docker compose up -d

docker-down: ## Stop all services
	docker compose down

docker-dev-up: ## Start all services with Vite HMR frontend (dev mode)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

docker-dev-down: ## Stop dev services
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

docker-build: ## Build all Docker images
	@for svc in $(SERVICES); do \
		echo "Building Docker image for $$svc..."; \
		docker build --build-arg SERVICE=$$svc -t gambchamp/$$svc:latest .; \
	done

docker-logs: ## Tail logs from all services
	docker compose logs -f

docker-dev-logs: ## Tail logs from dev services
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

migrate: ## Run database migrations
	docker compose exec postgres psql -U gambchamp -d gambchamp -f /docker-entrypoint-initdb.d/001_schema.sql

nats-init: ## Initialize NATS JetStream streams (uses local nats CLI or Docker fallback)
	@if command -v nats >/dev/null 2>&1; then \
		./scripts/nats-init.sh; \
	else \
		echo "nats CLI not found — running via Docker (natsio/nats-box)..."; \
		docker run --rm \
			-v "$$(pwd)/scripts:/scripts" \
			--network "$$(basename $$(pwd))_default" \
			natsio/nats-box:latest \
			sh /scripts/nats-init.sh nats://nats:4222; \
	fi

dev: docker-dev-up nats-init ## Start full dev environment (Vite HMR + all backend services)
	@echo ""
	@echo "Development environment ready!"
	@echo "  Frontend:    http://localhost:5173  (Vite HMR)"
	@echo "  API Gateway: http://localhost:8080"
	@echo "  Grafana:     http://localhost:3000  (admin/admin)"
	@echo "  Prometheus:  http://localhost:9090"
	@echo "  NATS:        http://localhost:8222"
	@echo "  ClickHouse:  http://localhost:8123"
	@echo ""

e2e-infra-up: ## Start E2E test infrastructure (Postgres, Redis, NATS on non-default ports)
	docker compose -f tests/e2e/docker-compose.e2e.yml up -d --wait

e2e-infra-down: ## Stop E2E test infrastructure
	docker compose -f tests/e2e/docker-compose.e2e.yml down -v

e2e: ## Run full E2E integration tests (starts infra, runs tests, stops infra)
	./tests/e2e/run.sh

proto: ## Generate protobuf code (if needed)
	@echo "No proto files yet"

.DEFAULT_GOAL := help
