package main

import "os"

type Config struct {
	Port          string
	DBURL         string
	JWTPrivateKey string
	JWTPublicKey  string
}

func LoadConfig() Config {
	return Config{
		Port:          envOrDefault("PORT", "8010"),
		DBURL:         envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		JWTPrivateKey: os.Getenv("JWT_PRIVATE_KEY"),
		JWTPublicKey:  os.Getenv("JWT_PUBLIC_KEY"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
