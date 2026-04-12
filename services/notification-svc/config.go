package main

import "os"

type Config struct {
	Port          string
	DBURL         string
	NATSURL       string
	TelegramToken string
	SMTPHost      string
	SMTPPort      string
	SMTPFrom      string
	SMTPUser      string
	SMTPPass      string
}

func LoadConfig() Config {
	return Config{
		Port:          envOrDefault("PORT", "8008"),
		DBURL:         envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		NATSURL:       envOrDefault("NATS_URL", "nats://localhost:4222"),
		TelegramToken: os.Getenv("TELEGRAM_TOKEN"),
		SMTPHost:      envOrDefault("SMTP_HOST", "localhost"),
		SMTPPort:      envOrDefault("SMTP_PORT", "587"),
		SMTPFrom:      envOrDefault("SMTP_FROM", "noreply@gambchamp.com"),
		SMTPUser:      os.Getenv("SMTP_USER"),
		SMTPPass:      os.Getenv("SMTP_PASS"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
