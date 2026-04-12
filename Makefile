.PHONY: dev test lint generate migrate build clean

dev:
	air

build:
	go build -o bin/api ./cmd/api
	go build -o bin/worker ./cmd/worker

test:
	go test -race -count=1 ./...

lint:
	golangci-lint run ./...

generate:
	sqlc generate

migrate:
	psql "$(DATABASE_URL)" -f internal/db/migrations/00001_initial.sql

migrate-docker:
	docker compose exec -T postgres psql -U gambchamp -d gambchamp < internal/db/migrations/00001_initial.sql

up:
	docker compose up -d

down:
	docker compose down

clean:
	rm -rf bin/ tmp/

fmt:
	gofumpt -w .
