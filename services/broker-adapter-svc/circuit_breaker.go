package main

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

type CircuitState string

const (
	CircuitClosed   CircuitState = "closed"
	CircuitOpen     CircuitState = "open"
	CircuitHalfOpen CircuitState = "half_open"
)

type BrokerCircuit struct {
	BrokerID     string
	State        CircuitState
	FailureCount int
	OpenedAt     time.Time
	CooldownSec  int
}

type CircuitBreaker struct {
	mu       sync.RWMutex
	circuits map[string]*BrokerCircuit
	store    *Store
	logger   *slog.Logger

	failureThreshold int
	cooldownSec      int
}

func NewCircuitBreaker(store *Store, logger *slog.Logger, failureThreshold, cooldownSec int) *CircuitBreaker {
	if failureThreshold <= 0 {
		failureThreshold = 5
	}
	if cooldownSec <= 0 {
		cooldownSec = 300
	}
	return &CircuitBreaker{
		circuits:         make(map[string]*BrokerCircuit),
		store:            store,
		logger:           logger,
		failureThreshold: failureThreshold,
		cooldownSec:      cooldownSec,
	}
}

func (cb *CircuitBreaker) getCircuit(brokerID string) *BrokerCircuit {
	cb.mu.RLock()
	c, ok := cb.circuits[brokerID]
	cb.mu.RUnlock()
	if ok {
		return c
	}

	cb.mu.Lock()
	defer cb.mu.Unlock()

	if c, ok = cb.circuits[brokerID]; ok {
		return c
	}

	c = &BrokerCircuit{
		BrokerID:    brokerID,
		State:       CircuitClosed,
		CooldownSec: cb.cooldownSec,
	}
	cb.circuits[brokerID] = c
	return c
}

func (cb *CircuitBreaker) AllowRequest(brokerID string) bool {
	c := cb.getCircuit(brokerID)

	cb.mu.RLock()
	defer cb.mu.RUnlock()

	switch c.State {
	case CircuitClosed:
		return true
	case CircuitOpen:
		if time.Since(c.OpenedAt) > time.Duration(c.CooldownSec)*time.Second {
			return true
		}
		return false
	case CircuitHalfOpen:
		return true
	}
	return true
}

func (cb *CircuitBreaker) RecordSuccess(ctx context.Context, brokerID string) {
	c := cb.getCircuit(brokerID)

	cb.mu.Lock()
	defer cb.mu.Unlock()

	c.FailureCount = 0
	if c.State == CircuitHalfOpen || c.State == CircuitOpen {
		c.State = CircuitClosed
		cb.logger.Info("circuit breaker closed", "broker_id", brokerID)
		cb.persistState(ctx, brokerID, c)
	}
}

func (cb *CircuitBreaker) RecordFailure(ctx context.Context, brokerID string) {
	c := cb.getCircuit(brokerID)

	cb.mu.Lock()
	defer cb.mu.Unlock()

	c.FailureCount++

	if c.State == CircuitHalfOpen {
		c.State = CircuitOpen
		c.OpenedAt = time.Now()
		cb.logger.Warn("circuit breaker re-opened from half_open",
			"broker_id", brokerID, "failures", c.FailureCount)
		cb.persistState(ctx, brokerID, c)
		return
	}

	if c.FailureCount >= cb.failureThreshold && c.State == CircuitClosed {
		c.State = CircuitOpen
		c.OpenedAt = time.Now()
		cb.logger.Warn("circuit breaker opened",
			"broker_id", brokerID, "failures", c.FailureCount)
		cb.persistState(ctx, brokerID, c)
	}
}

func (cb *CircuitBreaker) TransitionToHalfOpen(brokerID string) {
	c := cb.getCircuit(brokerID)

	cb.mu.Lock()
	defer cb.mu.Unlock()

	if c.State == CircuitOpen {
		c.State = CircuitHalfOpen
		cb.logger.Info("circuit breaker half_open", "broker_id", brokerID)
	}
}

func (cb *CircuitBreaker) GetState(brokerID string) CircuitState {
	c := cb.getCircuit(brokerID)
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return c.State
}

func (cb *CircuitBreaker) persistState(ctx context.Context, brokerID string, c *BrokerCircuit) {
	go func() {
		if err := cb.store.UpdateBrokerCircuit(ctx, brokerID, string(c.State), c.FailureCount, c.OpenedAt); err != nil {
			cb.logger.Error("failed to persist circuit state",
				"broker_id", brokerID, "error", err)
		}
	}()
}
