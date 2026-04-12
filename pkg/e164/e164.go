// Package e164 normalizes phone numbers to E.164 format.
package e164

import (
	"fmt"
	"strings"
)

var countryCodes = map[string]string{
	"US": "1", "GB": "44", "DE": "49", "FR": "33", "IT": "39",
	"ES": "34", "PT": "351", "NL": "31", "BE": "32", "AT": "43",
	"CH": "41", "SE": "46", "NO": "47", "DK": "45", "FI": "358",
	"PL": "48", "CZ": "420", "SK": "421", "HU": "36", "RO": "40",
	"BG": "359", "HR": "385", "SI": "386", "RS": "381", "UA": "380",
	"RU": "7", "BY": "375", "KZ": "7", "TR": "90", "GR": "30",
	"CY": "357", "IL": "972", "AE": "971", "SA": "966", "QA": "974",
	"KW": "965", "BH": "973", "OM": "968", "JO": "962", "LB": "961",
	"EG": "20", "ZA": "27", "NG": "234", "KE": "254", "GH": "233",
	"TZ": "255", "UG": "256", "MA": "212", "TN": "216", "DZ": "213",
	"IN": "91", "PK": "92", "BD": "880", "LK": "94", "NP": "977",
	"CN": "86", "JP": "81", "KR": "82", "TW": "886", "HK": "852",
	"SG": "65", "MY": "60", "TH": "66", "VN": "84", "PH": "63",
	"ID": "62", "AU": "61", "NZ": "64", "CA": "1", "MX": "52",
	"BR": "55", "AR": "54", "CL": "56", "CO": "57", "PE": "51",
	"VE": "58", "EC": "593", "UY": "598", "PY": "595", "BO": "591",
	"CR": "506", "PA": "507", "DO": "1", "PR": "1", "CU": "53",
	"IE": "353", "IS": "354", "LU": "352", "MT": "356", "EE": "372",
	"LV": "371", "LT": "370", "AL": "355", "MK": "389", "BA": "387",
	"ME": "382", "XK": "383", "MD": "373", "GE": "995", "AM": "374",
	"AZ": "994",
}

// Normalize converts a phone number to E.164 format using the given ISO 3166-1 alpha-2 country code.
func Normalize(phone, country string) (string, error) {
	digits := stripNonDigits(phone)
	if len(digits) == 0 {
		return "", fmt.Errorf("phone number contains no digits")
	}

	country = strings.ToUpper(strings.TrimSpace(country))
	code, ok := countryCodes[country]
	if !ok {
		return "", fmt.Errorf("unknown country code: %s", country)
	}

	if strings.HasPrefix(digits, code) && len(digits) > len(code)+4 {
		return "+" + digits, nil
	}

	if digits[0] == '0' {
		digits = digits[1:]
	}

	result := "+" + code + digits
	if len(result) < 8 || len(result) > 16 {
		return "", fmt.Errorf("normalized phone length %d is out of valid E.164 range", len(result))
	}

	return result, nil
}

// CountryCode returns the dialing code for an ISO country.
func CountryCode(country string) (string, bool) {
	code, ok := countryCodes[strings.ToUpper(strings.TrimSpace(country))]
	return code, ok
}

func stripNonDigits(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
