package main

type ConfirmLevel int

const (
	ConfirmNone      ConfirmLevel = iota // read-only, execute immediately
	ConfirmStandard                       // show what will happen, ask yes/no
	ConfirmDangerous                      // show impact analysis, require explicit confirm
)

type ToolDefinition struct {
	Name         string                 `json:"name"`
	Description  string                 `json:"description"`
	InputSchema  map[string]interface{} `json:"input_schema"`
	Service      string                 `json:"-"`
	ConfirmLevel ConfirmLevel           `json:"-"`
	AllowedRoles []string               `json:"-"`
}

type ToolRegistry struct {
	tools map[string]ToolDefinition
}

func NewToolRegistry() *ToolRegistry {
	r := &ToolRegistry{tools: make(map[string]ToolDefinition)}
	r.registerAll()
	return r
}

func (r *ToolRegistry) Get(name string) (ToolDefinition, bool) {
	t, ok := r.tools[name]
	return t, ok
}

func (r *ToolRegistry) ToolsForRole(role string) []ToolDefinition {
	var result []ToolDefinition
	for _, t := range r.tools {
		if r.roleAllowed(t, role) {
			result = append(result, t)
		}
	}
	return result
}

func (r *ToolRegistry) roleAllowed(t ToolDefinition, role string) bool {
	if len(t.AllowedRoles) == 0 {
		return true
	}
	for _, allowed := range t.AllowedRoles {
		if allowed == role {
			return true
		}
	}
	return false
}

func (r *ToolRegistry) register(t ToolDefinition) {
	r.tools[t.Name] = t
}

var (
	adminRoles  = []string{"super_admin", "network_admin"}
	managerUp   = []string{"super_admin", "network_admin", "affiliate_mgr", "team_lead"}
	allRoles    = []string{"super_admin", "network_admin", "affiliate_mgr", "team_lead", "media_buyer", "finance_mgr"}
	readAll     = []string{"super_admin", "network_admin", "affiliate_mgr", "team_lead", "media_buyer"}
	financeAll  = []string{"super_admin", "network_admin", "affiliate_mgr", "team_lead", "media_buyer", "finance_mgr"}
)

func idParam() map[string]interface{} {
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"id": map[string]interface{}{"type": "string", "description": "Entity UUID"},
		},
		"required": []string{"id"},
	}
}

func (r *ToolRegistry) registerAll() {
	// === routing-engine-svc (8 tools) ===
	r.register(ToolDefinition{
		Name:         "list_rules",
		Description:  "List all distribution/routing rules with their status, caps, and algorithms",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "routing-engine",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:         "get_rule",
		Description:  "Get detailed info about a specific routing rule by ID",
		InputSchema:  idParam(),
		Service:      "routing-engine",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:        "adjust_weights",
		Description: "Adjust broker weight distribution within a routing rule",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"rule_id": map[string]interface{}{"type": "string", "description": "Rule UUID"},
				"weights": map[string]interface{}{
					"type":        "array",
					"description": "Array of {broker_id, weight} objects",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"broker_id": map[string]interface{}{"type": "string"},
							"weight":    map[string]interface{}{"type": "number"},
						},
					},
				},
			},
			"required": []string{"rule_id", "weights"},
		},
		Service:      "routing-engine",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:         "pause_rule",
		Description:  "Pause a routing rule, stopping all lead distribution through it",
		InputSchema:  idParam(),
		Service:      "routing-engine",
		ConfirmLevel: ConfirmDangerous,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:         "resume_rule",
		Description:  "Resume a paused routing rule",
		InputSchema:  idParam(),
		Service:      "routing-engine",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "update_rule_cap",
		Description: "Update the daily cap for a routing rule",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"rule_id":   map[string]interface{}{"type": "string"},
				"daily_cap": map[string]interface{}{"type": "integer", "description": "New daily cap (0 = unlimited)"},
			},
			"required": []string{"rule_id", "daily_cap"},
		},
		Service:      "routing-engine",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "update_geo_filter",
		Description: "Update country filters for a routing rule",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"rule_id":   map[string]interface{}{"type": "string"},
				"countries": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}, "description": "ISO 3166-1 alpha-2 country codes"},
			},
			"required": []string{"rule_id", "countries"},
		},
		Service:      "routing-engine",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "update_timeslots",
		Description: "Update timezone-based distribution slots for a routing rule",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"rule_id": map[string]interface{}{"type": "string"},
				"slots":   map[string]interface{}{"type": "array", "description": "Array of {timezone, start_hour, end_hour} objects"},
			},
			"required": []string{"rule_id", "slots"},
		},
		Service:      "routing-engine",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})

	// === broker-adapter-svc (8 tools) ===
	r.register(ToolDefinition{
		Name:         "list_brokers",
		Description:  "List all brokers with their status, caps, health, and success rates",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "broker-adapter",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:         "get_broker",
		Description:  "Get detailed info about a specific broker including health checks and delivery stats",
		InputSchema:  idParam(),
		Service:      "broker-adapter",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:         "pause_broker",
		Description:  "Pause a broker, stopping all lead delivery to it. Leads in pipeline will be rerouted.",
		InputSchema:  idParam(),
		Service:      "broker-adapter",
		ConfirmLevel: ConfirmDangerous,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:         "resume_broker",
		Description:  "Resume a paused broker",
		InputSchema:  idParam(),
		Service:      "broker-adapter",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "update_broker_cap",
		Description: "Update the daily cap for a broker",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"broker_id": map[string]interface{}{"type": "string"},
				"daily_cap": map[string]interface{}{"type": "integer"},
			},
			"required": []string{"broker_id", "daily_cap"},
		},
		Service:      "broker-adapter",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:         "check_broker_health",
		Description:  "Trigger a health check for a specific broker and return the result",
		InputSchema:  idParam(),
		Service:      "broker-adapter",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:        "toggle_autologin",
		Description: "Enable or disable autologin for a specific broker",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"broker_id": map[string]interface{}{"type": "string"},
				"enabled":   map[string]interface{}{"type": "boolean"},
			},
			"required": []string{"broker_id", "enabled"},
		},
		Service:      "broker-adapter",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:         "get_cap_usage",
		Description:  "Get current cap usage for a broker across all countries",
		InputSchema:  idParam(),
		Service:      "broker-adapter",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})

	// === fraud-engine-svc (7 tools) ===
	r.register(ToolDefinition{
		Name:         "get_fraud_profile",
		Description:  "Get the fraud profile configuration for an affiliate",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{"affiliate_id": map[string]interface{}{"type": "string"}}, "required": []string{"affiliate_id"}},
		Service:      "fraud-engine",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:         "list_fraud_profiles",
		Description:  "List all fraud profiles with their settings and stats",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "fraud-engine",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:        "adjust_fraud_threshold",
		Description: "Adjust the minimum quality score threshold for an affiliate's fraud profile",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"affiliate_id":      map[string]interface{}{"type": "string"},
				"min_quality_score": map[string]interface{}{"type": "integer", "description": "New minimum quality score (0-100)"},
			},
			"required": []string{"affiliate_id", "min_quality_score"},
		},
		Service:      "fraud-engine",
		ConfirmLevel: ConfirmDangerous,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "set_auto_reject_score",
		Description: "Set the auto-reject threshold score for an affiliate",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"affiliate_id":     map[string]interface{}{"type": "string"},
				"auto_reject_score": map[string]interface{}{"type": "integer"},
			},
			"required": []string{"affiliate_id", "auto_reject_score"},
		},
		Service:      "fraud-engine",
		ConfirmLevel: ConfirmDangerous,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "add_ip_blacklist",
		Description: "Add IP addresses or CIDR ranges to the blacklist",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"ips":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}, "description": "IP addresses or CIDR ranges"},
				"reason": map[string]interface{}{"type": "string"},
			},
			"required": []string{"ips"},
		},
		Service:      "fraud-engine",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "remove_ip_blacklist",
		Description: "Remove IP addresses or CIDR ranges from the blacklist",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"ips": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
			"required": []string{"ips"},
		},
		Service:      "fraud-engine",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:         "check_lead_fraud",
		Description:  "Run a fraud check on a specific lead and return the fraud card",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{"lead_id": map[string]interface{}{"type": "string"}}, "required": []string{"lead_id"}},
		Service:      "fraud-engine",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})

	// === lead-intake-svc (5 tools) ===
	r.register(ToolDefinition{
		Name:         "get_lead",
		Description:  "Get full details about a specific lead including fraud card and delivery history",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{"lead_id": map[string]interface{}{"type": "string"}}, "required": []string{"lead_id"}},
		Service:      "lead-intake",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:        "search_leads",
		Description: "Search leads by email, phone, country, affiliate, status, or date range",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"email":        map[string]interface{}{"type": "string"},
				"phone":        map[string]interface{}{"type": "string"},
				"country":      map[string]interface{}{"type": "string"},
				"affiliate_id": map[string]interface{}{"type": "string"},
				"status":       map[string]interface{}{"type": "string", "enum": []string{"new", "processing", "routed", "delivered", "rejected", "fraud", "duplicate"}},
				"date_from":    map[string]interface{}{"type": "string", "description": "ISO 8601 date"},
				"date_to":      map[string]interface{}{"type": "string", "description": "ISO 8601 date"},
				"limit":        map[string]interface{}{"type": "integer", "description": "Max results (default 20, max 100)"},
			},
		},
		Service:      "lead-intake",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: readAll,
	})
	r.register(ToolDefinition{
		Name:        "block_source",
		Description: "Block a lead source (IP, email domain, or affiliate sub-ID) from submitting leads",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"source_type": map[string]interface{}{"type": "string", "enum": []string{"ip", "email_domain", "sub_id"}},
				"value":       map[string]interface{}{"type": "string"},
				"reason":      map[string]interface{}{"type": "string"},
			},
			"required": []string{"source_type", "value"},
		},
		Service:      "lead-intake",
		ConfirmLevel: ConfirmDangerous,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "unblock_source",
		Description: "Unblock a previously blocked lead source",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"source_type": map[string]interface{}{"type": "string", "enum": []string{"ip", "email_domain", "sub_id"}},
				"value":       map[string]interface{}{"type": "string"},
			},
			"required": []string{"source_type", "value"},
		},
		Service:      "lead-intake",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "set_dedup_window",
		Description: "Set the deduplication time window for leads",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"window_minutes": map[string]interface{}{"type": "integer", "description": "Dedup window in minutes"},
			},
			"required": []string{"window_minutes"},
		},
		Service:      "lead-intake",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})

	// === uad-svc (5 tools) ===
	r.register(ToolDefinition{
		Name:         "get_uad_status",
		Description:  "Get the current status of the UAD (Unsold Auto-Distribution) system",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "uad",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: managerUp,
	})
	r.register(ToolDefinition{
		Name:         "trigger_uad_run",
		Description:  "Trigger a manual UAD run to redistribute unsold leads",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "uad",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:         "pause_uad",
		Description:  "Pause the UAD system",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "uad",
		ConfirmLevel: ConfirmDangerous,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:         "resume_uad",
		Description:  "Resume the UAD system",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "uad",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "set_uad_retry_schedule",
		Description: "Set the retry schedule for UAD redistribution attempts",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"max_attempts":    map[string]interface{}{"type": "integer"},
				"interval_minutes": map[string]interface{}{"type": "integer"},
			},
			"required": []string{"max_attempts", "interval_minutes"},
		},
		Service:      "uad",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})

	// === notification-svc (3 tools) ===
	r.register(ToolDefinition{
		Name:        "send_alert",
		Description: "Send a custom alert/notification to specified channels (Telegram, email, webhook)",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"title":    map[string]interface{}{"type": "string"},
				"body":     map[string]interface{}{"type": "string"},
				"channels": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string", "enum": []string{"telegram", "email", "webhook"}}},
			},
			"required": []string{"title", "body", "channels"},
		},
		Service:      "notification",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: managerUp,
	})
	r.register(ToolDefinition{
		Name:         "list_notification_preferences",
		Description:  "List notification preferences for all users in the tenant",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "notification",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: managerUp,
	})
	r.register(ToolDefinition{
		Name:        "update_notification_preferences",
		Description: "Update notification preferences for a user",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"user_id":          map[string]interface{}{"type": "string"},
				"telegram_enabled": map[string]interface{}{"type": "boolean"},
				"email_enabled":    map[string]interface{}{"type": "boolean"},
				"webhook_enabled":  map[string]interface{}{"type": "boolean"},
			},
			"required": []string{"user_id"},
		},
		Service:      "notification",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: managerUp,
	})

	// === autologin-svc (2 tools) ===
	r.register(ToolDefinition{
		Name:         "retry_autologin_session",
		Description:  "Retry a failed autologin session for a lead",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{"session_id": map[string]interface{}{"type": "string"}}, "required": []string{"session_id"}},
		Service:      "autologin",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
	r.register(ToolDefinition{
		Name:        "pause_broker_autologin",
		Description: "Pause autologin for a specific broker",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"broker_id": map[string]interface{}{"type": "string"},
			},
			"required": []string{"broker_id"},
		},
		Service:      "autologin",
		ConfirmLevel: ConfirmDangerous,
		AllowedRoles: adminRoles,
	})

	// === analytics-svc (3 tools) ===
	r.register(ToolDefinition{
		Name:        "get_dashboard",
		Description: "Get the main analytics dashboard data: lead volume, conversion rates, revenue, top brokers/affiliates",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"period": map[string]interface{}{"type": "string", "enum": []string{"today", "7d", "30d", "90d"}, "description": "Time period"},
			},
		},
		Service:      "analytics",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: financeAll,
	})
	r.register(ToolDefinition{
		Name:        "get_metrics",
		Description: "Get specific metrics: delivery success rate, fraud rate, avg latency, revenue by broker/affiliate/country",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"metric": map[string]interface{}{"type": "string", "enum": []string{
					"delivery_success_rate", "fraud_rate", "avg_latency",
					"revenue_by_broker", "revenue_by_affiliate", "revenue_by_country",
					"leads_by_status", "leads_by_country",
				}},
				"period":    map[string]interface{}{"type": "string", "enum": []string{"today", "7d", "30d", "90d"}},
				"broker_id": map[string]interface{}{"type": "string"},
				"affiliate_id": map[string]interface{}{"type": "string"},
			},
			"required": []string{"metric"},
		},
		Service:      "analytics",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: financeAll,
	})
	r.register(ToolDefinition{
		Name:        "run_report",
		Description: "Generate a custom analytics report with specified dimensions and filters",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"report_type": map[string]interface{}{"type": "string", "enum": []string{"daily_summary", "broker_performance", "affiliate_performance", "fraud_analysis", "geo_breakdown"}},
				"date_from":   map[string]interface{}{"type": "string", "description": "ISO 8601 date"},
				"date_to":     map[string]interface{}{"type": "string", "description": "ISO 8601 date"},
				"group_by":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
			"required": []string{"report_type"},
		},
		Service:      "analytics",
		ConfirmLevel: ConfirmNone,
		AllowedRoles: financeAll,
	})

	// === meta (1 tool) ===
	r.register(ToolDefinition{
		Name:         "undo_last_action",
		Description:  "Undo the last executed action in this session by restoring the previous state",
		InputSchema:  map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
		Service:      "meta",
		ConfirmLevel: ConfirmStandard,
		AllowedRoles: adminRoles,
	})
}
