package main

import "os"

type Config struct {
	Port               string
	DBURL              string
	RedisURL           string
	NATSURL            string
	FraudEngineAddr    string
	MaxMindAccountID   string
	MaxMindLicenseKey  string
}

func LoadConfig() Config {
	return Config{
		Port:              envOrDefault("PORT", "8001"),
		DBURL:             envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		RedisURL:          envOrDefault("REDIS_URL", "redis://localhost:6379/0"),
		NATSURL:           envOrDefault("NATS_URL", "nats://localhost:4222"),
		FraudEngineAddr:   envOrDefault("FRAUD_ENGINE_ADDR", "http://localhost:8004"),
		MaxMindAccountID:  os.Getenv("MAXMIND_ACCOUNT_ID"),
		MaxMindLicenseKey: os.Getenv("MAXMIND_LICENSE_KEY"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
