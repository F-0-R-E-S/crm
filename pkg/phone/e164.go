package phone

import (
	"regexp"
	"strings"
)

var nonDigits = regexp.MustCompile(`[^\d+]`)

var countryPrefixes = map[string]string{
	"US": "1", "GB": "44", "DE": "49", "FR": "33", "IT": "39",
	"ES": "34", "NL": "31", "BE": "32", "AT": "43", "CH": "41",
	"SE": "46", "NO": "47", "DK": "45", "FI": "358", "PL": "48",
	"CZ": "420", "RO": "40", "HU": "36", "BG": "359", "HR": "385",
	"SK": "421", "SI": "386", "LT": "370", "LV": "371", "EE": "372",
	"PT": "351", "IE": "353", "GR": "30", "CY": "357", "MT": "356",
	"LU": "352", "RU": "7", "UA": "380", "BY": "375", "KZ": "7",
	"TR": "90", "IL": "972", "AE": "971", "SA": "966", "IN": "91",
	"CN": "86", "JP": "81", "KR": "82", "AU": "61", "NZ": "64",
	"BR": "55", "MX": "52", "AR": "54", "CO": "57", "CL": "56",
	"ZA": "27", "NG": "234", "KE": "254", "EG": "20", "MA": "212",
	"TH": "66", "VN": "84", "PH": "63", "MY": "60", "SG": "65",
	"ID": "62", "CA": "1",
}

func NormalizeE164(phone, countryCode string) string {
	cleaned := nonDigits.ReplaceAllString(phone, "")

	if strings.HasPrefix(phone, "+") {
		if len(cleaned) >= 7 && len(cleaned) <= 15 {
			return "+" + cleaned
		}
		return ""
	}

	if strings.HasPrefix(cleaned, "00") {
		cleaned = cleaned[2:]
		if len(cleaned) >= 7 && len(cleaned) <= 15 {
			return "+" + cleaned
		}
		return ""
	}

	countryCode = strings.ToUpper(countryCode)
	prefix, ok := countryPrefixes[countryCode]
	if !ok {
		if len(cleaned) >= 7 && len(cleaned) <= 15 {
			return "+" + cleaned
		}
		return ""
	}

	if strings.HasPrefix(cleaned, prefix) {
		if len(cleaned) >= 7 && len(cleaned) <= 15 {
			return "+" + cleaned
		}
	}

	if strings.HasPrefix(cleaned, "0") {
		cleaned = cleaned[1:]
	}

	result := prefix + cleaned
	if len(result) >= 7 && len(result) <= 15 {
		return "+" + result
	}
	return ""
}
