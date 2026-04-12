FROM golang:1.22-alpine AS builder

ARG SERVICE

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY pkg/ pkg/
COPY services/${SERVICE}/ services/${SERVICE}/

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/service ./services/${SERVICE}/

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/service /usr/local/bin/service

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/service"]
