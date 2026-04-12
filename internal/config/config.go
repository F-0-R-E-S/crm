// Package config loads application configuration from environment variables.
package config

import (
	"context"
	"fmt"
	"time"

	"github.com/sethvargo/go-envconfig"
)

// Config holds all application configuration.
type Config struct {
	DatabaseURL      string `env:"DATABASE_URL,required"`
	RedisURL         string `env:"REDIS_URL,required"`
	NatsURL          string `env:"NATS_URL,required"`
	JWTSecret        string `env:"JWT_SECRET,required"`
	JWTRefreshSecret string `env:"JWT_REFRESH_SECRET,required"`
	Port             int    `env:"PORT,default=8080"`
	LogLevel         string `env:"LOG_LEVEL,default=info"`
	Environment      string `env:"ENVIRONMENT,default=development"`
	BcryptCost       int    `env:"BCRYPT_COST,default=12"`
}

// AccessTokenTTL returns the JWT access token duration.
func (c *Config) AccessTokenTTL() time.Duration {
	return 15 * time.Minute
}

// RefreshTokenTTL returns the JWT refresh token duration.
func (c *Config) RefreshTokenTTL() time.Duration {
	return 7 * 24 * time.Hour
}

// Addr returns the listen address.
func (c *Config) Addr() string {
	return fmt.Sprintf(":%d", c.Port)
}

// Load reads configuration from environment variables.
func Load(ctx context.Context) (*Config, error) {
	var cfg Config
	if err := envconfig.Process(ctx, &cfg); err != nil {
		return nil, fmt.Errorf("loading config: %w", err)
	}
	return &cfg, nil
}
