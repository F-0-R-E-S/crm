package main

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port            string
	DBURL           string
	NATSURL         string
	DeliveryTimeout time.Duration
	MaxRetries      int
}

func LoadConfig() Config {
	return Config{
		Port:            envOrDefault("PORT", "8003"),
		DBURL:           envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		NATSURL:         envOrDefault("NATS_URL", "nats://localhost:4222"),
		DeliveryTimeout: parseDuration("DELIVERY_TIMEOUT", 30*time.Second),
		MaxRetries:      parseInt("MAX_RETRIES", 3),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func parseInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
