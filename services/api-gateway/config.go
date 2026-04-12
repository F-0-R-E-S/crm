package main

import "os"

type Config struct {
	Port      string
	JWTSecret string
	RedisURL  string

	// CORS
	CORSAllowOrigins string

	// Upstream service addresses
	LeadIntakeAddr    string
	RoutingEngineAddr string
	BrokerAdapterAddr string
	FraudEngineAddr   string
	StatusSyncAddr    string
	AutologinAddr     string
	UADAddr           string
	NotificationAddr  string
	IdentityAddr      string
	AnalyticsAddr     string
}

func LoadConfig() Config {
	return Config{
		Port:      envOrDefault("PORT", "8080"),
		JWTSecret: os.Getenv("JWT_SECRET"),
		RedisURL:  envOrDefault("REDIS_URL", "redis://localhost:6379/0"),

		CORSAllowOrigins: envOrDefault("CORS_ALLOW_ORIGINS", "*"),

		LeadIntakeAddr:    envOrDefault("LEAD_INTAKE_ADDR", "http://localhost:8001"),
		RoutingEngineAddr: envOrDefault("ROUTING_ENGINE_ADDR", "http://localhost:8002"),
		BrokerAdapterAddr: envOrDefault("BROKER_ADAPTER_ADDR", "http://localhost:8003"),
		FraudEngineAddr:   envOrDefault("FRAUD_ENGINE_ADDR", "http://localhost:8004"),
		StatusSyncAddr:    envOrDefault("STATUS_SYNC_ADDR", "http://localhost:8005"),
		AutologinAddr:     envOrDefault("AUTOLOGIN_ADDR", "http://localhost:8006"),
		UADAddr:           envOrDefault("UAD_ADDR", "http://localhost:8007"),
		NotificationAddr:  envOrDefault("NOTIFICATION_ADDR", "http://localhost:8008"),
		IdentityAddr:      envOrDefault("IDENTITY_ADDR", "http://localhost:8010"),
		AnalyticsAddr:     envOrDefault("ANALYTICS_ADDR", "http://localhost:8011"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
