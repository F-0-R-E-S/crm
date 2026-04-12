package main

import "os"

type Config struct {
	Port        string
	DBURL       string
	RedisURL    string
	MaxMindKey  string
	IPQSKey     string
	TwilioSID   string
	TwilioToken string
}

func LoadConfig() Config {
	return Config{
		Port:        envOrDefault("PORT", "8004"),
		DBURL:       envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		RedisURL:    envOrDefault("REDIS_URL", "redis://localhost:6379/0"),
		MaxMindKey:  os.Getenv("MAXMIND_KEY"),
		IPQSKey:     os.Getenv("IPQS_KEY"),
		TwilioSID:   os.Getenv("TWILIO_SID"),
		TwilioToken: os.Getenv("TWILIO_TOKEN"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
