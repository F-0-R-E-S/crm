package main

import "os"

type Config struct {
	Port    string
	DBURL   string
	NATSURL string
}

func LoadConfig() Config {
	return Config{
		Port:    envOrDefault("PORT", "8003"),
		DBURL:   envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		NATSURL: envOrDefault("NATS_URL", "nats://localhost:4222"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
