package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gambchamp/crm/pkg/database"
)

type Store struct {
	db *database.DB
}

func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// BrokerStats holds aggregated performance data for a broker.
type BrokerStats struct {
	BrokerID      string  `json:"broker_id"`
	BrokerName    string  `json:"broker_name"`
	TenantID      string  `json:"tenant_id"`
	TotalLeads    int     `json:"total_leads"`
	Delivered     int     `json:"delivered"`
	Rejected      int     `json:"rejected"`
	ConversionRate float64 `json:"conversion_rate"`
	AvgResponseMs int     `json:"avg_response_ms"`
	DailyCap      int     `json:"daily_cap"`
	Country       string  `json:"country,omitempty"`
}

// RuleStats holds performance data for a distribution rule.
type RuleStats struct {
	RuleID       string          `json:"rule_id"`
	RuleName     string          `json:"rule_name"`
	TenantID     string          `json:"tenant_id"`
	Algorithm    string          `json:"algorithm"`
	BrokerTargets json.RawMessage `json:"broker_targets"`
	TotalRouted  int             `json:"total_routed"`
	TotalDelivered int           `json:"total_delivered"`
	AvgLatencyMs int             `json:"avg_latency_ms"`
}

// GetBrokerStats returns delivery stats per broker over a time window.
func (s *Store) GetBrokerStats(ctx context.Context, tenantID string, since time.Time) ([]*BrokerStats, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT b.id, b.name, b.tenant_id, b.daily_cap,
		        COUNT(CASE WHEN le.event_type = 'lead.routed' THEN 1 END) as total,
		        COUNT(CASE WHEN le.event_type = 'delivery_success' THEN 1 END) as delivered,
		        COUNT(CASE WHEN le.event_type = 'delivery_failed' THEN 1 END) as rejected,
		        COALESCE(AVG(le.duration_ms) FILTER (WHERE le.duration_ms > 0), 0) as avg_ms
		 FROM brokers b
		 LEFT JOIN lead_events le ON le.broker_id = b.id AND le.created_at > $2
		 WHERE b.tenant_id = $1 AND b.status = 'active'
		 GROUP BY b.id, b.name, b.tenant_id, b.daily_cap
		 ORDER BY total DESC`,
		tenantID, since,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []*BrokerStats
	for rows.Next() {
		s := &BrokerStats{}
		if err := rows.Scan(&s.BrokerID, &s.BrokerName, &s.TenantID, &s.DailyCap,
			&s.TotalLeads, &s.Delivered, &s.Rejected, &s.AvgResponseMs); err != nil {
			return nil, err
		}
		if s.TotalLeads > 0 {
			s.ConversionRate = float64(s.Delivered) / float64(s.TotalLeads) * 100
		}
		stats = append(stats, s)
	}
	return stats, rows.Err()
}

// GetBrokerStatsByCountry returns per-country stats for a broker.
func (s *Store) GetBrokerStatsByCountry(ctx context.Context, brokerID string, since time.Time) ([]*BrokerStats, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT l.country,
		        COUNT(*) as total,
		        COUNT(CASE WHEN le.event_type = 'delivery_success' THEN 1 END) as delivered,
		        COUNT(CASE WHEN le.event_type = 'delivery_failed' THEN 1 END) as rejected,
		        COALESCE(AVG(le.duration_ms) FILTER (WHERE le.duration_ms > 0), 0) as avg_ms
		 FROM lead_events le
		 JOIN leads l ON l.id = le.lead_id
		 WHERE le.broker_id = $1 AND le.created_at > $2
		 GROUP BY l.country
		 HAVING COUNT(*) >= 5
		 ORDER BY total DESC`,
		brokerID, since,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []*BrokerStats
	for rows.Next() {
		s := &BrokerStats{BrokerID: brokerID}
		if err := rows.Scan(&s.Country, &s.TotalLeads, &s.Delivered, &s.Rejected, &s.AvgResponseMs); err != nil {
			return nil, err
		}
		if s.TotalLeads > 0 {
			s.ConversionRate = float64(s.Delivered) / float64(s.TotalLeads) * 100
		}
		stats = append(stats, s)
	}
	return stats, rows.Err()
}

// GetRuleStats returns routing rule performance data.
func (s *Store) GetRuleStats(ctx context.Context, tenantID string) ([]*RuleStats, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT dr.id, dr.name, dr.tenant_id, dr.algorithm, dr.broker_targets,
		        COUNT(CASE WHEN le.event_type = 'lead.routed' THEN 1 END) as routed,
		        COUNT(CASE WHEN le.event_type = 'delivery_success' THEN 1 END) as delivered,
		        COALESCE(AVG(le.duration_ms) FILTER (WHERE le.event_type = 'lead.routed'), 0) as avg_ms
		 FROM distribution_rules dr
		 LEFT JOIN lead_events le ON le.request_body->>'rule_id' = dr.id::text
		                          AND le.created_at > NOW() - interval '7 days'
		 WHERE dr.tenant_id = $1 AND dr.is_active = true
		 GROUP BY dr.id, dr.name, dr.tenant_id, dr.algorithm, dr.broker_targets`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []*RuleStats
	for rows.Next() {
		rs := &RuleStats{}
		if err := rows.Scan(&rs.RuleID, &rs.RuleName, &rs.TenantID, &rs.Algorithm,
			&rs.BrokerTargets, &rs.TotalRouted, &rs.TotalDelivered, &rs.AvgLatencyMs); err != nil {
			return nil, err
		}
		stats = append(stats, rs)
	}
	return stats, rows.Err()
}

// GetCapVelocity returns the rate of cap consumption for a broker.
func (s *Store) GetCapVelocity(ctx context.Context, brokerID string, hours int) (leadsPerHour float64, err error) {
	var total int
	err = s.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM lead_events
		 WHERE broker_id = $1 AND event_type = 'lead.routed'
		   AND created_at > NOW() - $2::interval`,
		brokerID, time.Duration(hours)*time.Hour,
	).Scan(&total)
	if err != nil {
		return 0, err
	}
	if hours > 0 {
		leadsPerHour = float64(total) / float64(hours)
	}
	return leadsPerHour, nil
}

// GetActiveBrokersForTenant returns broker IDs and caps.
func (s *Store) GetActiveBrokersForTenant(ctx context.Context, tenantID string) ([]struct {
	ID       string
	Name     string
	DailyCap int
	Status   string
}, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, name, daily_cap, status FROM brokers WHERE tenant_id = $1 AND status = 'active'`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var brokers []struct {
		ID       string
		Name     string
		DailyCap int
		Status   string
	}
	for rows.Next() {
		var b struct {
			ID       string
			Name     string
			DailyCap int
			Status   string
		}
		if err := rows.Scan(&b.ID, &b.Name, &b.DailyCap, &b.Status); err != nil {
			return nil, err
		}
		brokers = append(brokers, b)
	}
	return brokers, rows.Err()
}
