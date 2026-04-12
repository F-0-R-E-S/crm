package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
)

type EmailSender struct {
	logger   *slog.Logger
	host     string
	port     string
	from     string
	username string
	password string
}

func NewEmailSender(logger *slog.Logger, host, port, from, username, password string) *EmailSender {
	return &EmailSender{
		logger:   logger,
		host:     host,
		port:     port,
		from:     from,
		username: username,
		password: password,
	}
}

func (e *EmailSender) Enabled() bool {
	return e.host != "" && e.from != ""
}

func (e *EmailSender) Send(_ context.Context, to, subject, body string) error {
	if !e.Enabled() {
		return fmt.Errorf("email not configured")
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		e.from, to, subject, body)

	addr := e.host + ":" + e.port

	var auth smtp.Auth
	if e.username != "" {
		auth = smtp.PlainAuth("", e.username, e.password, e.host)
	}

	if err := smtp.SendMail(addr, auth, e.from, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("send email to %s: %w", to, err)
	}

	e.logger.Info("email sent", "to", to, "subject", subject)
	return nil
}

func (e *EmailSender) FormatEvent(eventType string, data map[string]interface{}) (subject, body string) {
	switch eventType {
	case EventCapExhausted:
		subject = "Cap Exhausted"
		body = fmt.Sprintf("<h3>Daily Cap Reached</h3><p>Affiliate %v has reached the daily cap of %v leads.</p>",
			data["affiliate_id"], data["daily_cap"])
	case EventLeadFraud:
		subject = "Fraud Alert"
		body = fmt.Sprintf("<h3>Fraud Detected</h3><p>Lead %v flagged with score %v.</p>",
			data["lead_id"], data["quality_score"])
	case EventShaveDetected:
		subject = "Shave Alert"
		body = fmt.Sprintf("<h3>Status Regression Detected</h3><p>Lead %v from broker %v: %v → %v</p>",
			data["lead_id"], data["broker_id"], data["old_status"], data["new_status"])
	default:
		subject = fmt.Sprintf("Notification: %s", eventType)
		body = fmt.Sprintf("<h3>%s</h3><pre>%v</pre>", eventType, data)
	}
	return subject, body
}
