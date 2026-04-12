package main

import "os"

type Config struct {
	Port     string
	DBURL    string
	RedisURL string
	NATSURL  string

	AnthropicAPIKey string
	Model           string
	MaxToolCalls    int

	// Upstream service addresses for action execution
	RoutingEngineAddr string
	BrokerAdapterAddr string
	FraudEngineAddr   string
	LeadIntakeAddr    string
	UADAddr           string
	NotificationAddr  string
	AutologinAddr     string
	AnalyticsAddr     string
}

func LoadConfig() Config {
	return Config{
		Port:     envOrDefault("PORT", "8012"),
		DBURL:    envOrDefault("DB_URL", "postgres://localhost:5432/gambchamp?sslmode=disable"),
		RedisURL: envOrDefault("REDIS_URL", "redis://localhost:6379/0"),
		NATSURL:  envOrDefault("NATS_URL", "nats://localhost:4222"),

		AnthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
		Model:           envOrDefault("ASSISTANT_MODEL", "claude-sonnet-4-20250514"),
		MaxToolCalls:    50,

		RoutingEngineAddr: envOrDefault("ROUTING_ENGINE_ADDR", "http://localhost:8002"),
		BrokerAdapterAddr: envOrDefault("BROKER_ADAPTER_ADDR", "http://localhost:8003"),
		FraudEngineAddr:   envOrDefault("FRAUD_ENGINE_ADDR", "http://localhost:8004"),
		LeadIntakeAddr:    envOrDefault("LEAD_INTAKE_ADDR", "http://localhost:8001"),
		UADAddr:           envOrDefault("UAD_ADDR", "http://localhost:8007"),
		NotificationAddr:  envOrDefault("NOTIFICATION_ADDR", "http://localhost:8008"),
		AutologinAddr:     envOrDefault("AUTOLOGIN_ADDR", "http://localhost:8006"),
		AnalyticsAddr:     envOrDefault("ANALYTICS_ADDR", "http://localhost:8011"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
