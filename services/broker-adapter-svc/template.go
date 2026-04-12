package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/gambchamp/crm/pkg/models"
)

// TemplateEngine builds HTTP requests from broker templates, lead data, and
// broker configuration. It supports {{field}} placeholder expansion and
// multiple authentication schemes.
type TemplateEngine struct{}

func NewTemplateEngine() *TemplateEngine {
	return &TemplateEngine{}
}

// BuildRequest constructs an *http.Request ready to send to the broker API.
// It resolves the URL template, applies field mapping, builds the body from
// the body_template, sets headers, and attaches authentication credentials.
func (te *TemplateEngine) BuildRequest(lead *models.Lead, broker *models.Broker, tmpl *models.BrokerTemplate) (*http.Request, error) {
	// Build the field value map from lead data.
	leadFields := te.leadToMap(lead)

	// Apply broker-specific field mapping (lead_field -> broker_field renames).
	mappedFields := te.applyFieldMapping(leadFields, broker.FieldMapping)

	// Parse credentials from broker config.
	creds, err := te.parseCredentials(broker.Credentials)
	if err != nil {
		return nil, fmt.Errorf("parse credentials: %w", err)
	}

	// Merge credentials into the field map so templates can reference them.
	for k, v := range creds {
		mappedFields["cred_"+k] = v
	}

	// Resolve URL template.
	resolvedURL := te.resolveTemplate(tmpl.URLTemplate, mappedFields)

	// If broker has a custom endpoint, use it as the base URL.
	if broker.Endpoint != "" {
		resolvedURL = te.resolveTemplate(broker.Endpoint, mappedFields)
	}

	// Build request body from body_template.
	body, err := te.buildBody([]byte(tmpl.BodyTemplate), mappedFields)
	if err != nil {
		return nil, fmt.Errorf("build body: %w", err)
	}

	// Create the HTTP request.
	req, err := http.NewRequest(tmpl.Method, resolvedURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	// Set headers from template.
	te.applyHeaders(req, tmpl.Headers, mappedFields)

	// Default content type if not set.
	if req.Header.Get("Content-Type") == "" && len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}

	// Apply authentication.
	if err := te.applyAuth(req, tmpl.AuthType, creds, mappedFields); err != nil {
		return nil, fmt.Errorf("apply auth: %w", err)
	}

	return req, nil
}

// leadToMap converts a Lead struct into a flat string map for template
// placeholder resolution.
func (te *TemplateEngine) leadToMap(lead *models.Lead) map[string]string {
	m := map[string]string{
		"id":             lead.ID,
		"lead_id":        lead.ID,
		"tenant_id":      lead.TenantID,
		"affiliate_id":   lead.AffiliateID,
		"first_name":     lead.FirstName,
		"last_name":      lead.LastName,
		"full_name":      lead.FirstName + " " + lead.LastName,
		"email":          lead.Email,
		"phone":          lead.Phone,
		"phone_e164":     lead.PhoneE164,
		"country":        lead.Country,
		"ip":             lead.IP,
		"user_agent":     lead.UserAgent,
		"quality_score":  fmt.Sprintf("%d", lead.QualityScore),
	}

	// Merge extra fields if present.
	if len(lead.Extra) > 0 {
		var extra map[string]interface{}
		if json.Unmarshal(lead.Extra, &extra) == nil {
			for k, v := range extra {
				m["extra_"+k] = fmt.Sprintf("%v", v)
			}
		}
	}

	return m
}

// applyFieldMapping renames lead fields according to the broker's field_mapping
// JSONB configuration. The mapping is {"broker_field": "lead_field"}.
func (te *TemplateEngine) applyFieldMapping(fields map[string]string, mapping json.RawMessage) map[string]string {
	if len(mapping) == 0 || string(mapping) == "{}" || string(mapping) == "null" {
		return fields
	}

	var fieldMap map[string]string
	if err := json.Unmarshal(mapping, &fieldMap); err != nil {
		return fields
	}

	result := make(map[string]string, len(fields)+len(fieldMap))
	// Copy original fields.
	for k, v := range fields {
		result[k] = v
	}
	// Add mapped aliases: broker_field -> value of lead_field.
	for brokerField, leadField := range fieldMap {
		if val, ok := fields[leadField]; ok {
			result[brokerField] = val
		}
	}

	return result
}

// resolveTemplate replaces all {{field}} placeholders with values from the map.
func (te *TemplateEngine) resolveTemplate(tmpl string, fields map[string]string) string {
	result := tmpl
	for key, val := range fields {
		placeholder := "{{" + key + "}}"
		result = strings.ReplaceAll(result, placeholder, val)
	}
	return result
}

// buildBody takes the body_template JSONB and resolves all string values that
// contain {{field}} placeholders. The body_template is a JSON object whose
// values are either literal values or template strings.
func (te *TemplateEngine) buildBody(bodyTemplate json.RawMessage, fields map[string]string) ([]byte, error) {
	if len(bodyTemplate) == 0 || string(bodyTemplate) == "null" || string(bodyTemplate) == "{}" {
		return nil, nil
	}

	// Parse the template as a generic map.
	var tmplMap map[string]interface{}
	if err := json.Unmarshal(bodyTemplate, &tmplMap); err != nil {
		// If it's not an object, try resolving it as a raw template string.
		resolved := te.resolveTemplate(string(bodyTemplate), fields)
		return []byte(resolved), nil
	}

	// Recursively resolve all string values.
	resolved := te.resolveMapValues(tmplMap, fields)

	return json.Marshal(resolved)
}

// resolveMapValues recursively walks a map and resolves template placeholders
// in string values.
func (te *TemplateEngine) resolveMapValues(m map[string]interface{}, fields map[string]string) map[string]interface{} {
	result := make(map[string]interface{}, len(m))
	for k, v := range m {
		switch val := v.(type) {
		case string:
			result[k] = te.resolveTemplate(val, fields)
		case map[string]interface{}:
			result[k] = te.resolveMapValues(val, fields)
		case []interface{}:
			result[k] = te.resolveSliceValues(val, fields)
		default:
			result[k] = v
		}
	}
	return result
}

// resolveSliceValues resolves template placeholders in slice elements.
func (te *TemplateEngine) resolveSliceValues(arr []interface{}, fields map[string]string) []interface{} {
	result := make([]interface{}, len(arr))
	for i, v := range arr {
		switch val := v.(type) {
		case string:
			result[i] = te.resolveTemplate(val, fields)
		case map[string]interface{}:
			result[i] = te.resolveMapValues(val, fields)
		case []interface{}:
			result[i] = te.resolveSliceValues(val, fields)
		default:
			result[i] = v
		}
	}
	return result
}

// applyHeaders sets request headers from the template's headers JSONB.
// Header values can contain {{field}} placeholders.
func (te *TemplateEngine) applyHeaders(req *http.Request, headers json.RawMessage, fields map[string]string) {
	if len(headers) == 0 || string(headers) == "null" {
		return
	}

	var headerMap map[string]string
	if err := json.Unmarshal(headers, &headerMap); err != nil {
		return
	}

	for k, v := range headerMap {
		resolved := te.resolveTemplate(v, fields)
		req.Header.Set(k, resolved)
	}
}

// applyAuth applies authentication to the request based on the auth_type.
// Supported types: api_key, bearer, basic, header, query_param.
func (te *TemplateEngine) applyAuth(req *http.Request, authType string, creds map[string]string, fields map[string]string) error {
	switch strings.ToLower(authType) {
	case "bearer":
		token := creds["token"]
		if token == "" {
			token = creds["api_key"]
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}

	case "basic":
		username := creds["username"]
		password := creds["password"]
		if username != "" {
			encoded := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
			req.Header.Set("Authorization", "Basic "+encoded)
		}

	case "api_key":
		apiKey := creds["api_key"]
		if apiKey == "" {
			break
		}
		// API key can go in header or query param. Check for header_name in creds.
		headerName := creds["header_name"]
		if headerName == "" {
			headerName = "X-API-Key"
		}
		req.Header.Set(headerName, apiKey)

	case "header":
		// Generic header-based auth: creds contains header_name and header_value.
		headerName := creds["header_name"]
		headerValue := creds["header_value"]
		if headerName != "" && headerValue != "" {
			req.Header.Set(headerName, headerValue)
		}

	case "query_param":
		// Add credentials as query parameters.
		q := req.URL.Query()
		paramName := creds["param_name"]
		if paramName == "" {
			paramName = "api_key"
		}
		paramValue := creds["param_value"]
		if paramValue == "" {
			paramValue = creds["api_key"]
		}
		if paramValue != "" {
			q.Set(paramName, paramValue)
		}
		req.URL.RawQuery = q.Encode()

	case "", "none":
		// No authentication required.

	default:
		return fmt.Errorf("unsupported auth type: %s", authType)
	}

	return nil
}

// parseCredentials decrypts/parses the broker's credentials_enc field.
// In production this would involve decryption; for now we parse the JSON directly.
func (te *TemplateEngine) parseCredentials(credentialsEnc json.RawMessage) (map[string]string, error) {
	if len(credentialsEnc) == 0 || string(credentialsEnc) == "null" {
		return map[string]string{}, nil
	}

	var creds map[string]string
	if err := json.Unmarshal(credentialsEnc, &creds); err != nil {
		return nil, err
	}
	return creds, nil
}

// ParseResponse extracts broker_lead_id and autologin_url from the broker's
// HTTP response body using the template's response_mapping configuration.
// response_mapping JSONB format: {"broker_lead_id": "path.to.field", "autologin_url": "path.to.field"}
func (te *TemplateEngine) ParseResponse(body io.Reader, responseMapping json.RawMessage) (brokerLeadID, autologinURL string, err error) {
	if len(responseMapping) == 0 || string(responseMapping) == "null" || string(responseMapping) == "{}" {
		return "", "", nil
	}

	// Read the response body.
	data, err := io.ReadAll(body)
	if err != nil {
		return "", "", fmt.Errorf("read response body: %w", err)
	}

	// Parse response body as JSON.
	var respData map[string]interface{}
	if err := json.Unmarshal(data, &respData); err != nil {
		// Not JSON — return raw body as broker_lead_id if mapping expects it.
		return string(data), "", nil
	}

	// Parse the mapping.
	var mapping map[string]string
	if err := json.Unmarshal(responseMapping, &mapping); err != nil {
		return "", "", nil
	}

	// Extract mapped fields.
	if path, ok := mapping["broker_lead_id"]; ok {
		brokerLeadID = te.extractField(respData, path)
	}
	if path, ok := mapping["autologin_url"]; ok {
		autologinURL = te.extractField(respData, path)
	}

	return brokerLeadID, autologinURL, nil
}

// extractField navigates a dot-separated path in a nested map to extract a
// string value. E.g., "data.lead.id" navigates map["data"]["lead"]["id"].
func (te *TemplateEngine) extractField(data map[string]interface{}, path string) string {
	parts := strings.Split(path, ".")
	var current interface{} = data

	for _, part := range parts {
		switch m := current.(type) {
		case map[string]interface{}:
			current = m[part]
		default:
			return ""
		}
	}

	if current == nil {
		return ""
	}
	return fmt.Sprintf("%v", current)
}

// SanitizeURL removes credentials from a URL for safe logging.
func (te *TemplateEngine) SanitizeURL(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	// Remove query params that look like credentials.
	q := u.Query()
	for key := range q {
		lower := strings.ToLower(key)
		if strings.Contains(lower, "key") || strings.Contains(lower, "token") ||
			strings.Contains(lower, "secret") || strings.Contains(lower, "password") {
			q.Set(key, "***")
		}
	}
	u.RawQuery = q.Encode()
	return u.String()
}
