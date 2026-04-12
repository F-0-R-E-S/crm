package main

import (
	"os"
	"time"
)

type Config struct {
	Port          string
	DBURL         string
	RedisURL      string
	JWTSecret     string
	TokenExpiry   time.Duration
	RefreshExpiry time.Duration
}

func LoadConfig() Config {
	return Config{
		Port:          envOrDefault("PORT", "8010"),
		DBURL:         envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		RedisURL:      envOrDefault("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:     envOrDefault("JWT_SECRET", "dev-secret-change-in-production"),
		TokenExpiry:   parseDuration("TOKEN_EXPIRY", 15*time.Minute),
		RefreshExpiry: parseDuration("REFRESH_EXPIRY", 168*time.Hour),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		d, err := time.ParseDuration(v)
		if err == nil {
			return d
		}
	}
	return fallback
}
