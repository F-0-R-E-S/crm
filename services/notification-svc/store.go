package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
)

type Store struct {
	db *database.DB
}

func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

type NotificationRecord struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	UserID    string    `json:"user_id,omitempty"`
	Channel   string    `json:"channel"`
	EventType string    `json:"event_type"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
	IsRead    bool      `json:"is_read"`
	SentAt    *time.Time `json:"sent_at,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type NotificationPrefs struct {
	ID              string          `json:"id"`
	TenantID        string          `json:"tenant_id"`
	UserID          string          `json:"user_id"`
	TelegramChatID  string          `json:"telegram_chat_id,omitempty"`
	TelegramEnabled bool            `json:"telegram_enabled"`
	EmailEnabled    bool            `json:"email_enabled"`
	WebhookURL      string          `json:"webhook_url,omitempty"`
	WebhookEnabled  bool            `json:"webhook_enabled"`
	EventFilters    json.RawMessage `json:"event_filters,omitempty"`
}

func (s *Store) SaveNotification(ctx context.Context, n *NotificationRecord) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO notifications (tenant_id, user_id, channel, event_type, title, body, metadata, sent_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
		 RETURNING id, created_at`,
		n.TenantID, nilStr(n.UserID), n.Channel, n.EventType, n.Title, n.Body,
		n.Metadata, n.SentAt,
	).Scan(&n.ID, &n.CreatedAt)
}

func (s *Store) ListNotifications(ctx context.Context, tenantID, userID string, limit, offset int) ([]NotificationRecord, int, error) {
	var total int
	if err := s.db.Pool.QueryRow(ctx,
		`SELECT count(*) FROM notifications WHERE tenant_id = $1 AND user_id = $2`,
		tenantID, userID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, COALESCE(user_id::text,''), channel, event_type, title, body, metadata, is_read, sent_at, created_at
		 FROM notifications
		 WHERE tenant_id = $1 AND user_id = $2
		 ORDER BY created_at DESC
		 LIMIT $3 OFFSET $4`,
		tenantID, userID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var nots []NotificationRecord
	for rows.Next() {
		var n NotificationRecord
		if err := rows.Scan(
			&n.ID, &n.TenantID, &n.UserID, &n.Channel, &n.EventType,
			&n.Title, &n.Body, &n.Metadata, &n.IsRead, &n.SentAt, &n.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		nots = append(nots, n)
	}
	return nots, total, rows.Err()
}

func (s *Store) MarkRead(ctx context.Context, tenantID, notificationID string) error {
	return s.db.Exec(ctx,
		`UPDATE notifications SET is_read = true WHERE id = $1 AND tenant_id = $2`,
		notificationID, tenantID,
	)
}

func (s *Store) MarkAllRead(ctx context.Context, tenantID, userID string) error {
	return s.db.Exec(ctx,
		`UPDATE notifications SET is_read = true WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
		tenantID, userID,
	)
}

func (s *Store) GetPreferences(ctx context.Context, tenantID, userID string) (*NotificationPrefs, error) {
	p := &NotificationPrefs{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, user_id, COALESCE(telegram_chat_id,''), telegram_enabled,
		        email_enabled, COALESCE(webhook_url,''), webhook_enabled, COALESCE(event_filters,'{}'::jsonb)
		 FROM notification_preferences
		 WHERE tenant_id = $1 AND user_id = $2`,
		tenantID, userID,
	).Scan(
		&p.ID, &p.TenantID, &p.UserID, &p.TelegramChatID, &p.TelegramEnabled,
		&p.EmailEnabled, &p.WebhookURL, &p.WebhookEnabled, &p.EventFilters,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get preferences: %w", err)
	}
	return p, nil
}

func (s *Store) UpsertPreferences(ctx context.Context, p *NotificationPrefs) error {
	return s.db.Exec(ctx,
		`INSERT INTO notification_preferences (tenant_id, user_id, telegram_chat_id, telegram_enabled,
		 email_enabled, webhook_url, webhook_enabled, event_filters)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
		 ON CONFLICT (tenant_id, user_id) DO UPDATE SET
		   telegram_chat_id = EXCLUDED.telegram_chat_id,
		   telegram_enabled = EXCLUDED.telegram_enabled,
		   email_enabled = EXCLUDED.email_enabled,
		   webhook_url = EXCLUDED.webhook_url,
		   webhook_enabled = EXCLUDED.webhook_enabled,
		   event_filters = EXCLUDED.event_filters`,
		p.TenantID, p.UserID, nilStr(p.TelegramChatID), p.TelegramEnabled,
		p.EmailEnabled, nilStr(p.WebhookURL), p.WebhookEnabled, p.EventFilters,
	)
}

func (s *Store) ListTenantPreferences(ctx context.Context, tenantID string) ([]NotificationPrefs, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, user_id, COALESCE(telegram_chat_id,''), telegram_enabled,
		        email_enabled, COALESCE(webhook_url,''), webhook_enabled, COALESCE(event_filters,'{}'::jsonb)
		 FROM notification_preferences
		 WHERE tenant_id = $1`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var prefs []NotificationPrefs
	for rows.Next() {
		var p NotificationPrefs
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.UserID, &p.TelegramChatID, &p.TelegramEnabled,
			&p.EmailEnabled, &p.WebhookURL, &p.WebhookEnabled, &p.EventFilters,
		); err != nil {
			return nil, err
		}
		prefs = append(prefs, p)
	}
	return prefs, rows.Err()
}

func nilStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
