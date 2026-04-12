package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"regexp"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/models"
)

// CheckRequest is the internal request passed to the fraud checker.
type CheckRequest struct {
	LeadID      string
	TenantID    string
	AffiliateID string
	IP          string
	Email       string
	PhoneE164   string
	Country     string
}

// FraudChecker performs 5-level fraud verification.
type FraudChecker struct {
	redis      *cache.Redis
	store      *Store
	logger     *slog.Logger
	maxmindKey string
	ipqsKey    string
}

// NewFraudChecker creates a FraudChecker with the given dependencies.
func NewFraudChecker(redis *cache.Redis, store *Store, logger *slog.Logger, maxmindKey, ipqsKey string) *FraudChecker {
	return &FraudChecker{
		redis:      redis,
		store:      store,
		logger:     logger,
		maxmindKey: maxmindKey,
		ipqsKey:    ipqsKey,
	}
}

// CheckLead performs all fraud checks and returns a FraudVerificationCard.
func (fc *FraudChecker) CheckLead(ctx context.Context, req *CheckRequest) (*models.FraudVerificationCard, error) {
	var checks []models.FraudCheck

	// 0. Blacklist Check — immediate reject if matched
	if fc.store != nil {
		blacklistHits, err := fc.store.CheckBlacklist(ctx, req.TenantID, req.IP, req.Email, req.PhoneE164)
		if err != nil {
			fc.logger.Warn("blacklist check failed, continuing", "error", err)
		} else if len(blacklistHits) > 0 {
			// Build a blacklist check entry
			reasons := make([]string, 0, len(blacklistHits))
			for _, hit := range blacklistHits {
				reasons = append(reasons, fmt.Sprintf("%s:%s", hit.ListType, hit.Value))
			}
			checks = append(checks, models.FraudCheck{
				Category:    "blacklist",
				CheckName:   "blacklist_match",
				Score:       0,
				MaxScore:    100,
				Result:      "fail",
				Explanation: fmt.Sprintf("Blacklisted: %s", strings.Join(reasons, ", ")),
				Provider:    "internal",
			})

			card := &models.FraudVerificationCard{
				LeadID:       req.LeadID,
				OverallScore: 0,
				Verdict:      "rejected",
				Checks:       checks,
				CheckedAt:    time.Now().UTC(),
			}

			// Persist result
			fc.persistResult(ctx, req, card)

			fc.logger.Info("fraud check completed (blacklisted)",
				"lead_id", req.LeadID,
				"score", 0,
				"verdict", "rejected",
				"blacklist_hits", len(blacklistHits),
			)
			return card, nil
		}
	}

	// 1. IP Check (0-25 points)
	ipChecks := fc.checkIP(req.IP, req.Country)
	checks = append(checks, ipChecks...)

	// 2. Email Check (0-25 points)
	emailChecks := fc.checkEmail(ctx, req.Email)
	checks = append(checks, emailChecks...)

	// 3. Phone Check (0-25 points)
	phoneChecks := fc.checkPhone(req.PhoneE164, req.Country)
	checks = append(checks, phoneChecks...)

	// 4. Velocity Check (0-25 points)
	velocityChecks := fc.checkVelocity(ctx, req)
	checks = append(checks, velocityChecks...)

	// Calculate overall score (sum of individual check scores)
	overallScore := 0
	for _, c := range checks {
		overallScore += c.Score
	}

	// Determine verdict
	verdict := "rejected"
	if overallScore >= 70 {
		verdict = "approved"
	} else if overallScore >= 40 {
		verdict = "review"
	}

	card := &models.FraudVerificationCard{
		LeadID:       req.LeadID,
		OverallScore: overallScore,
		Verdict:      verdict,
		Checks:       checks,
		CheckedAt:    time.Now().UTC(),
	}

	// Persist result
	fc.persistResult(ctx, req, card)

	fc.logger.Info("fraud check completed",
		"lead_id", req.LeadID,
		"score", overallScore,
		"verdict", verdict,
	)

	return card, nil
}

// persistResult saves the fraud check result to the database.
func (fc *FraudChecker) persistResult(ctx context.Context, req *CheckRequest, card *models.FraudVerificationCard) {
	if fc.store == nil {
		return
	}

	checksJSON, err := json.Marshal(card.Checks)
	if err != nil {
		fc.logger.Warn("failed to marshal checks for persistence", "error", err)
		return
	}

	result := &models.FraudCheckResult{
		TenantID:     req.TenantID,
		LeadID:       req.LeadID,
		OverallScore: card.OverallScore,
		Verdict:      card.Verdict,
		Checks:       checksJSON,
		CheckedAt:    card.CheckedAt,
	}

	if err := fc.store.SaveFraudCheckResult(ctx, result); err != nil {
		fc.logger.Warn("failed to persist fraud check result", "error", err, "lead_id", req.LeadID)
	}
}

// ---------------------------------------------------------------------------
// 1. IP Check (0-25 points)
// ---------------------------------------------------------------------------

func (fc *FraudChecker) checkIP(ip, declaredCountry string) []models.FraudCheck {
	var checks []models.FraudCheck

	// Sub-check 1a: IP format validation (0-10)
	formatCheck := models.FraudCheck{
		Category: "ip",
		CheckName: "format_validation",
		MaxScore: 10,
		Provider: "internal",
	}

	if ip == "" {
		formatCheck.Score = 0
		formatCheck.Result = "fail"
		formatCheck.Explanation = "No IP address provided"
		checks = append(checks, formatCheck)
		// If no IP, the remaining IP checks automatically fail
		checks = append(checks, models.FraudCheck{
			Category:    "ip",
			CheckName:   "private_range",
			Score:       0,
			MaxScore:    10,
			Result:      "fail",
			Explanation: "Cannot check range without IP",
			Provider:    "internal",
		})
		checks = append(checks, models.FraudCheck{
			Category:    "ip",
			CheckName:   "geo_match",
			Score:       0,
			MaxScore:    5,
			Result:      "skip",
			Explanation: "Cannot check geo without IP",
			Provider:    "internal",
		})
		return checks
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		formatCheck.Score = 0
		formatCheck.Result = "fail"
		formatCheck.Explanation = fmt.Sprintf("Invalid IP format: %s", ip)
	} else {
		formatCheck.Score = 10
		formatCheck.Result = "pass"
		formatCheck.Explanation = "IP format is valid"
	}
	checks = append(checks, formatCheck)

	// Sub-check 1b: Private/reserved range check (0-10)
	rangeCheck := models.FraudCheck{
		Category:  "ip",
		CheckName: "private_range",
		MaxScore:  10,
		Provider:  "internal",
	}
	if parsedIP != nil && isPrivateOrReserved(parsedIP) {
		rangeCheck.Score = 0
		rangeCheck.Result = "fail"
		rangeCheck.Explanation = fmt.Sprintf("IP %s is in a private/reserved range (datacenter or VPN likely)", ip)
	} else if parsedIP != nil {
		rangeCheck.Score = 10
		rangeCheck.Result = "pass"
		rangeCheck.Explanation = "IP is a public address"
	} else {
		rangeCheck.Score = 0
		rangeCheck.Result = "fail"
		rangeCheck.Explanation = "Cannot check range on invalid IP"
	}
	checks = append(checks, rangeCheck)

	// Sub-check 1c: Geo match (0-5)
	// Without MaxMind/IPQS API keys, we can only do a basic presence check.
	geoCheck := models.FraudCheck{
		Category:  "ip",
		CheckName: "geo_match",
		MaxScore:  5,
		Provider:  "internal",
	}
	if fc.maxmindKey != "" {
		// TODO: integrate MaxMind GeoIP2 for real geo matching
		geoCheck.Score = 3
		geoCheck.Result = "pass"
		geoCheck.Explanation = "MaxMind integration configured but not yet implemented; partial score granted"
		geoCheck.Provider = "maxmind"
	} else if declaredCountry != "" && parsedIP != nil {
		// No API key: grant partial score if both IP and country are present
		geoCheck.Score = 3
		geoCheck.Result = "pass"
		geoCheck.Explanation = "Both IP and country declared; full geo verification requires MaxMind key"
	} else {
		geoCheck.Score = 0
		geoCheck.Result = "skip"
		geoCheck.Explanation = "Geo match skipped: no MaxMind key and missing IP or country"
	}
	checks = append(checks, geoCheck)

	return checks
}

// isPrivateOrReserved checks if an IP is in a private or reserved range.
func isPrivateOrReserved(ip net.IP) bool {
	privateRanges := []struct {
		network string
	}{
		{"10.0.0.0/8"},
		{"172.16.0.0/12"},
		{"192.168.0.0/16"},
		{"127.0.0.0/8"},
		{"169.254.0.0/16"},  // link-local
		{"100.64.0.0/10"},   // CGN
		{"0.0.0.0/8"},       // current network
		{"240.0.0.0/4"},     // reserved
		{"fc00::/7"},        // IPv6 unique local
		{"fe80::/10"},       // IPv6 link-local
		{"::1/128"},         // IPv6 loopback
	}

	for _, r := range privateRanges {
		_, cidr, err := net.ParseCIDR(r.network)
		if err != nil {
			continue
		}
		if cidr.Contains(ip) {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// 2. Email Check (0-25 points)
// ---------------------------------------------------------------------------

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// disposableDomains is a list of common disposable/temporary email providers.
var disposableDomains = map[string]bool{
	"tempmail.com":        true,
	"guerrillamail.com":   true,
	"guerrillamail.info":  true,
	"guerrillamail.net":   true,
	"guerrillamail.org":   true,
	"mailinator.com":      true,
	"throwaway.email":     true,
	"temp-mail.org":       true,
	"fakeinbox.com":       true,
	"sharklasers.com":     true,
	"guerrillamailblock.com": true,
	"grr.la":              true,
	"dispostable.com":     true,
	"yopmail.com":         true,
	"yopmail.fr":          true,
	"trashmail.com":       true,
	"trashmail.me":        true,
	"trashmail.net":       true,
	"maildrop.cc":         true,
	"mailnull.com":        true,
	"mailnesia.com":       true,
	"tempail.com":         true,
	"tempr.email":         true,
	"10minutemail.com":    true,
	"10minutemail.net":    true,
	"minutemail.com":      true,
	"emailondeck.com":     true,
	"getairmail.com":      true,
	"mohmal.com":          true,
	"getnada.com":         true,
	"tempmailo.com":       true,
	"burnermail.io":       true,
	"discard.email":       true,
	"mailcatch.com":       true,
	"meltmail.com":        true,
	"harakirimail.com":    true,
	"33mail.com":          true,
	"inboxkitten.com":     true,
	"tmpmail.net":         true,
	"tmpmail.org":         true,
	"boun.cr":             true,
	"filzmail.com":        true,
	"mailexpire.com":      true,
	"tempinbox.com":       true,
	"spamgourmet.com":     true,
	"mailmoat.com":        true,
	"trashymail.com":      true,
	"mytemp.email":        true,
	"spam4.me":            true,
	"trashemail.de":       true,
	"wegwerfmail.de":      true,
	"crazymailing.com":    true,
	"tmail.ws":            true,
}

func (fc *FraudChecker) checkEmail(ctx context.Context, email string) []models.FraudCheck {
	var checks []models.FraudCheck

	// Sub-check 2a: Format validation (0-8)
	formatCheck := models.FraudCheck{
		Category:  "email",
		CheckName: "format_validation",
		MaxScore:  8,
		Provider:  "internal",
	}

	if email == "" {
		formatCheck.Score = 0
		formatCheck.Result = "fail"
		formatCheck.Explanation = "No email address provided"
		checks = append(checks, formatCheck)
		checks = append(checks, models.FraudCheck{
			Category:    "email",
			CheckName:   "mx_lookup",
			Score:       0,
			MaxScore:    10,
			Result:      "fail",
			Explanation: "Cannot check MX without email",
			Provider:    "internal",
		})
		checks = append(checks, models.FraudCheck{
			Category:    "email",
			CheckName:   "disposable_check",
			Score:       0,
			MaxScore:    7,
			Result:      "fail",
			Explanation: "Cannot check disposable without email",
			Provider:    "internal",
		})
		return checks
	}

	if !emailRegex.MatchString(email) {
		formatCheck.Score = 0
		formatCheck.Result = "fail"
		formatCheck.Explanation = fmt.Sprintf("Invalid email format: %s", email)
	} else {
		formatCheck.Score = 8
		formatCheck.Result = "pass"
		formatCheck.Explanation = "Email format is valid"
	}
	checks = append(checks, formatCheck)

	// Extract domain
	parts := strings.SplitN(email, "@", 2)
	domain := ""
	if len(parts) == 2 {
		domain = strings.ToLower(parts[1])
	}

	// Sub-check 2b: DNS MX lookup (0-10)
	mxCheck := models.FraudCheck{
		Category:  "email",
		CheckName: "mx_lookup",
		MaxScore:  10,
		Provider:  "internal",
	}

	if domain == "" {
		mxCheck.Score = 0
		mxCheck.Result = "fail"
		mxCheck.Explanation = "Cannot extract domain from email"
	} else {
		mxRecords, err := net.LookupMX(domain)
		if err != nil || len(mxRecords) == 0 {
			mxCheck.Score = 0
			mxCheck.Result = "fail"
			mxCheck.Explanation = fmt.Sprintf("No MX records found for domain %s", domain)
		} else {
			mxCheck.Score = 10
			mxCheck.Result = "pass"
			mxCheck.Explanation = fmt.Sprintf("Domain %s has %d MX record(s)", domain, len(mxRecords))
		}
	}
	checks = append(checks, mxCheck)

	// Sub-check 2c: Disposable domain check (0-7)
	dispCheck := models.FraudCheck{
		Category:  "email",
		CheckName: "disposable_check",
		MaxScore:  7,
		Provider:  "internal",
	}

	if domain == "" {
		dispCheck.Score = 0
		dispCheck.Result = "fail"
		dispCheck.Explanation = "Cannot check disposable without domain"
	} else if disposableDomains[domain] {
		dispCheck.Score = 0
		dispCheck.Result = "fail"
		dispCheck.Explanation = fmt.Sprintf("Domain %s is a known disposable email provider", domain)
	} else {
		dispCheck.Score = 7
		dispCheck.Result = "pass"
		dispCheck.Explanation = "Email domain is not in disposable provider list"
	}
	checks = append(checks, dispCheck)

	return checks
}

// ---------------------------------------------------------------------------
// 3. Phone Check (0-25 points)
// ---------------------------------------------------------------------------

func (fc *FraudChecker) checkPhone(phoneE164, country string) []models.FraudCheck {
	var checks []models.FraudCheck

	// Sub-check 3a: Presence (0-5)
	presenceCheck := models.FraudCheck{
		Category:  "phone",
		CheckName: "presence",
		MaxScore:  5,
		Provider:  "internal",
	}

	if phoneE164 == "" {
		presenceCheck.Score = 0
		presenceCheck.Result = "fail"
		presenceCheck.Explanation = "No phone number provided"
		checks = append(checks, presenceCheck)
		checks = append(checks, models.FraudCheck{
			Category:    "phone",
			CheckName:   "e164_format",
			Score:       0,
			MaxScore:    10,
			Result:      "fail",
			Explanation: "Cannot validate format without phone",
			Provider:    "internal",
		})
		checks = append(checks, models.FraudCheck{
			Category:    "phone",
			CheckName:   "length_check",
			Score:       0,
			MaxScore:    10,
			Result:      "fail",
			Explanation: "Cannot validate length without phone",
			Provider:    "internal",
		})
		return checks
	}

	presenceCheck.Score = 5
	presenceCheck.Result = "pass"
	presenceCheck.Explanation = "Phone number is present"
	checks = append(checks, presenceCheck)

	// Sub-check 3b: E.164 format validation (0-10)
	e164Check := models.FraudCheck{
		Category:  "phone",
		CheckName: "e164_format",
		MaxScore:  10,
		Provider:  "internal",
	}

	// E.164: starts with +, followed by 1-15 digits
	e164Valid := isValidE164(phoneE164)
	if e164Valid {
		e164Check.Score = 10
		e164Check.Result = "pass"
		e164Check.Explanation = "Phone number matches E.164 format"
	} else {
		e164Check.Score = 0
		e164Check.Result = "fail"
		e164Check.Explanation = fmt.Sprintf("Phone %s does not match E.164 format (+[1-15 digits])", phoneE164)
	}
	checks = append(checks, e164Check)

	// Sub-check 3c: Length matches country expectations (0-10)
	lengthCheck := models.FraudCheck{
		Category:  "phone",
		CheckName: "length_check",
		MaxScore:  10,
		Provider:  "internal",
	}

	if !e164Valid {
		lengthCheck.Score = 0
		lengthCheck.Result = "fail"
		lengthCheck.Explanation = "Cannot check length of invalid E.164 number"
	} else {
		// Strip '+' and count digits
		digits := phoneE164[1:]
		digitLen := len(digits)

		// Most international numbers are 7-15 digits (including country code)
		if digitLen >= 7 && digitLen <= 15 {
			// Check against known country code + length patterns
			if matchesCountryPattern(digits, country) {
				lengthCheck.Score = 10
				lengthCheck.Result = "pass"
				lengthCheck.Explanation = fmt.Sprintf("Phone length (%d digits) matches expected pattern for country %s", digitLen, country)
			} else if country == "" {
				lengthCheck.Score = 7
				lengthCheck.Result = "pass"
				lengthCheck.Explanation = fmt.Sprintf("Phone length (%d digits) is valid; no country to cross-check", digitLen)
			} else {
				lengthCheck.Score = 5
				lengthCheck.Result = "warn"
				lengthCheck.Explanation = fmt.Sprintf("Phone length (%d digits) may not match country %s expectations", digitLen, country)
			}
		} else {
			lengthCheck.Score = 0
			lengthCheck.Result = "fail"
			lengthCheck.Explanation = fmt.Sprintf("Phone has %d digits (expected 7-15 for international)", digitLen)
		}
	}
	checks = append(checks, lengthCheck)

	return checks
}

// isValidE164 checks whether the phone number conforms to E.164 format.
func isValidE164(phone string) bool {
	if len(phone) < 2 || phone[0] != '+' {
		return false
	}
	digits := phone[1:]
	if len(digits) < 1 || len(digits) > 15 {
		return false
	}
	for _, ch := range digits {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return true
}

// countryPhonePatterns maps ISO country codes to expected total digit lengths
// (including country code). This is a subset for the most common CRM markets.
var countryPhonePatterns = map[string][]int{
	"US": {11},       // +1XXXXXXXXXX
	"GB": {12, 13},   // +44XXXXXXXXX or +44XXXXXXXXXX
	"DE": {12, 13},   // +49XXXXXXXXX or +49XXXXXXXXXX
	"FR": {12},       // +33XXXXXXXXX
	"ES": {12},       // +34XXXXXXXXX
	"IT": {12, 13},   // +39XXXXXXXXXX
	"NL": {12},       // +31XXXXXXXXX
	"AU": {12},       // +61XXXXXXXXX
	"CA": {11},       // +1XXXXXXXXXX (same as US)
	"BR": {13, 14},   // +55XXXXXXXXXXX
	"RU": {12},       // +7XXXXXXXXXX
	"IN": {13},       // +91XXXXXXXXXX
	"JP": {12, 13},   // +81XXXXXXXXX or +81XXXXXXXXXX
	"KR": {12, 13},   // +82XXXXXXXXX
	"MX": {13},       // +52XXXXXXXXXX
	"ZA": {12},       // +27XXXXXXXXX
	"IL": {12, 13},   // +972XXXXXXXXX
	"AE": {13},       // +971XXXXXXXXX
	"SG": {11},       // +65XXXXXXXX
	"HK": {12},       // +852XXXXXXXX
	"TR": {13},       // +90XXXXXXXXXX
	"PL": {12},       // +48XXXXXXXXX
	"SE": {12, 13},   // +46XXXXXXXXX
	"NO": {11},       // +47XXXXXXXX
	"FI": {12, 13},   // +358XXXXXXXXX
	"DK": {11},       // +45XXXXXXXX
	"AT": {12, 13},   // +43XXXXXXXXXX
	"CH": {12},       // +41XXXXXXXXX
	"CZ": {12},       // +420XXXXXXXXX
	"PT": {12},       // +351XXXXXXXXX
}

// matchesCountryPattern checks if a digit string length matches known patterns
// for the declared country.
func matchesCountryPattern(digits, country string) bool {
	country = strings.ToUpper(strings.TrimSpace(country))
	expectedLens, ok := countryPhonePatterns[country]
	if !ok {
		// Unknown country code; we can't validate
		return false
	}
	for _, l := range expectedLens {
		if len(digits) == l {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// 4. Velocity Check (0-25 points, Redis-based)
// ---------------------------------------------------------------------------

const (
	velocityEmailTTL = 24 * time.Hour
	velocityIPTTL    = 1 * time.Hour
	velocityPhoneTTL = 24 * time.Hour

	velocityEmailMaxCount = 3 // same email more than 3 times in 24h is suspicious
	velocityIPMaxCount    = 10 // same IP more than 10 times in 1h is suspicious
	velocityPhoneMaxCount = 3 // same phone more than 3 times in 24h is suspicious
)

func (fc *FraudChecker) checkVelocity(ctx context.Context, req *CheckRequest) []models.FraudCheck {
	var checks []models.FraudCheck

	// Sub-check 4a: Email velocity (0-9)
	emailVel := fc.checkVelocityKey(ctx, "fraud:vel:email:", req.Email, velocityEmailTTL, velocityEmailMaxCount, 9)
	emailVel.Category = "velocity"
	emailVel.CheckName = "email_frequency"
	checks = append(checks, emailVel)

	// Sub-check 4b: IP velocity (0-8)
	ipVel := fc.checkVelocityKey(ctx, "fraud:vel:ip:", req.IP, velocityIPTTL, velocityIPMaxCount, 8)
	ipVel.Category = "velocity"
	ipVel.CheckName = "ip_frequency"
	checks = append(checks, ipVel)

	// Sub-check 4c: Phone velocity (0-8)
	phoneVel := fc.checkVelocityKey(ctx, "fraud:vel:phone:", req.PhoneE164, velocityPhoneTTL, velocityPhoneMaxCount, 8)
	phoneVel.Category = "velocity"
	phoneVel.CheckName = "phone_frequency"
	checks = append(checks, phoneVel)

	return checks
}

// checkVelocityKey increments a Redis counter for the given key prefix+value
// and scores based on how many times it has appeared within the TTL window.
func (fc *FraudChecker) checkVelocityKey(ctx context.Context, prefix, value string, ttl time.Duration, maxCount, maxScore int) models.FraudCheck {
	check := models.FraudCheck{
		MaxScore: maxScore,
		Provider: "redis",
	}

	if value == "" {
		// No value to check — grant full score (no velocity issue)
		check.Score = maxScore
		check.Result = "pass"
		check.Explanation = "No value to check velocity against"
		return check
	}

	key := prefix + strings.ToLower(value)

	count, err := fc.redis.IncrWithExpiry(ctx, key, ttl)
	if err != nil {
		fc.logger.Warn("velocity check redis error", "key", key, "error", err)
		// On Redis error, grant partial score rather than blocking the lead
		check.Score = maxScore / 2
		check.Result = "warn"
		check.Explanation = fmt.Sprintf("Velocity check unavailable (Redis error): %v", err)
		return check
	}

	if count <= 1 {
		// First occurrence — full score
		check.Score = maxScore
		check.Result = "pass"
		check.Explanation = "First occurrence in the time window"
	} else if int(count) <= maxCount {
		// Within acceptable range — proportional score
		ratio := float64(maxCount-int(count)+1) / float64(maxCount)
		check.Score = int(float64(maxScore) * ratio)
		if check.Score < 0 {
			check.Score = 0
		}
		check.Result = "pass"
		check.Explanation = fmt.Sprintf("Seen %d time(s) in window (limit: %d)", count, maxCount)
	} else {
		// Exceeded threshold
		check.Score = 0
		check.Result = "fail"
		check.Explanation = fmt.Sprintf("Velocity exceeded: seen %d time(s) in window (limit: %d)", count, maxCount)
	}

	return check
}
