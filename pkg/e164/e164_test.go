package e164

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalize(t *testing.T) {
	tests := []struct {
		name    string
		phone   string
		country string
		want    string
		wantErr bool
	}{
		// Already international (with +)
		{name: "already E164 US", phone: "+12125551234", country: "US", want: "+12125551234"},
		{name: "already E164 DE", phone: "+4930123456", country: "DE", want: "+4930123456"},
		{name: "already E164 with spaces", phone: "+1 212 555 1234", country: "US", want: "+12125551234"},

		// International prefix 00
		{name: "00 prefix", phone: "004915123456789", country: "DE", want: "+4915123456789"},

		// Local numbers with country context
		{name: "local US no country code", phone: "2125551234", country: "US", want: "+12125551234"},
		{name: "local US with leading zero", phone: "02125551234", country: "US", want: "+12125551234"},
		{name: "local DE", phone: "015123456789", country: "DE", want: "+4915123456789"},
		{name: "local UA", phone: "0501234567", country: "UA", want: "+380501234567"},
		{name: "local RU", phone: "9161234567", country: "RU", want: "+79161234567"},
		{name: "local GB", phone: "07911123456", country: "GB", want: "+447911123456"},
		{name: "local BR", phone: "11987654321", country: "BR", want: "+5511987654321"},

		// Already has country code digits
		{name: "US number with country code", phone: "12125551234", country: "US", want: "+12125551234"},

		// Unknown country - passthrough if length ok
		{name: "unknown country long enough", phone: "1234567890", country: "XX", want: "+1234567890"},

		// Errors
		{name: "empty phone", phone: "", country: "US", wantErr: true},
		{name: "no digits", phone: "abc", country: "US", wantErr: true},
		{name: "too short with unknown country", phone: "123", country: "XX", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Normalize(tt.phone, tt.country)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestNormalizeE164(t *testing.T) {
	// NormalizeE164 returns empty string on error instead of error value
	assert.Equal(t, "+12125551234", NormalizeE164("+12125551234", "US"))
	assert.Equal(t, "", NormalizeE164("", "US"))
	assert.Equal(t, "", NormalizeE164("abc", "US"))
}

func TestCountryCode(t *testing.T) {
	code, ok := CountryCode("US")
	assert.True(t, ok)
	assert.Equal(t, "1", code)

	code, ok = CountryCode("DE")
	assert.True(t, ok)
	assert.Equal(t, "49", code)

	code, ok = CountryCode("ua") // lowercase should work
	assert.True(t, ok)
	assert.Equal(t, "380", code)

	_, ok = CountryCode("XX")
	assert.False(t, ok)
}

func TestIsValidCountry(t *testing.T) {
	assert.True(t, IsValidCountry("US"))
	assert.True(t, IsValidCountry("us"))
	assert.True(t, IsValidCountry("DE"))
	assert.True(t, IsValidCountry("UA"))
	assert.True(t, IsValidCountry("RU"))
	assert.False(t, IsValidCountry("XX"))
	assert.False(t, IsValidCountry(""))
}

func TestStripNonDigits(t *testing.T) {
	// Indirectly tested via Normalize, but cover edge cases
	got, err := Normalize("+1 (212) 555-1234", "US")
	require.NoError(t, err)
	assert.Equal(t, "+12125551234", got)

	got, err = Normalize("+44 7911 123456", "GB")
	require.NoError(t, err)
	assert.Equal(t, "+447911123456", got)
}
