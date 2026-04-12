package main

import "os"

type Config struct {
	Port            string
	DBURL           string
	RedisURL        string
	NATSURL         string
	FraudEngineAddr string
}

func LoadConfig() Config {
	return Config{
		Port:            envOrDefault("PORT", "8001"),
		DBURL:           envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		RedisURL:        envOrDefault("REDIS_URL", "redis://localhost:6379/0"),
		NATSURL:         envOrDefault("NATS_URL", "nats://localhost:4222"),
		FraudEngineAddr: envOrDefault("FRAUD_ENGINE_ADDR", "http://localhost:8004"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
