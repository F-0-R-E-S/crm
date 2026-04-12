package events

import "time"

type CloudEvent struct {
	SpecVersion     string      `json:"specversion"`
	Type            string      `json:"type"`
	Source          string      `json:"source"`
	ID              string      `json:"id"`
	Time            time.Time   `json:"time"`
	DataContentType string      `json:"datacontenttype"`
	Subject         string      `json:"subject,omitempty"`
	Data            interface{} `json:"data"`
}

const (
	LeadReceived        = "lead.received"
	LeadRouted          = "lead.routed"
	LeadDelivered       = "lead.delivered"
	LeadDeliveryFailed  = "lead.delivery_failed"
	LeadStatusUpdated   = "lead.status_updated"
	LeadFraudFlagged    = "lead.fraud.flagged"
	LeadShaveDetected   = "lead.shave_detected"
	LeadAutologinStarted   = "lead.autologin.started"
	LeadAutologinCompleted = "lead.autologin.completed"
	LeadAutologinFailed    = "lead.autologin.failed"
	CapThreshold80     = "cap.threshold.80pct"
	CapExhausted       = "cap.exhausted"
	AffiliateCreated   = "affiliate.created"
	BrokerHealthChanged = "broker.integration.health_changed"

	// Fraud events
	LeadFraudChecked    = "lead.fraud.checked"
	BlacklistHit        = "blacklist.hit"
	BlacklistEntryAdded = "blacklist.entry.added"

	// Shave & status events
	ShaveAcknowledged     = "shave.acknowledged"
	StatusAnomalyDetected = "status.anomaly.detected"

	// Compliance events
	AuditLogCreated      = "audit.log.created"
	GDPRRequestCreated   = "gdpr.request.created"
	GDPRRequestCompleted = "gdpr.request.completed"

	// ML fraud events
	MLModelTrained        = "ml.model.trained"
	MLModelActivated      = "ml.model.activated"
	VelocityRuleTriggered = "velocity.rule.triggered"
)

func New(eventType, source string, data interface{}) CloudEvent {
	return CloudEvent{
		SpecVersion:     "1.0",
		Type:            eventType,
		Source:          source,
		ID:              "", // caller must set
		Time:            time.Now().UTC(),
		DataContentType: "application/json",
		Data:            data,
	}
}
