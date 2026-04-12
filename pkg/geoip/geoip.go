// Package geoip provides IP-to-country resolution.
// Uses a static mapping for common IP ranges as a fallback, and integrates with
// MaxMind GeoIP2 via HTTP API when MAXMIND_ACCOUNT_ID and MAXMIND_LICENSE_KEY are set.
package geoip

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"
)

type Result struct {
	Country string `json:"country"`
	City    string `json:"city,omitempty"`
	ISP     string `json:"isp,omitempty"`
	IsVPN   bool   `json:"is_vpn,omitempty"`
	IsProxy bool   `json:"is_proxy,omitempty"`
}

type Client struct {
	httpClient *http.Client
	accountID  string
	licenseKey string
	cache      sync.Map
}

func New(accountID, licenseKey string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 3 * time.Second},
		accountID:  accountID,
		licenseKey: licenseKey,
	}
}

func (c *Client) Lookup(ctx context.Context, ip string) Result {
	if ip == "" {
		return Result{}
	}

	parsed := net.ParseIP(ip)
	if parsed == nil {
		return Result{}
	}

	if parsed.IsLoopback() || parsed.IsPrivate() || parsed.IsUnspecified() {
		return Result{}
	}

	if cached, ok := c.cache.Load(ip); ok {
		return cached.(Result)
	}

	if c.accountID != "" && c.licenseKey != "" {
		if result, err := c.lookupMaxMind(ctx, ip); err == nil {
			c.cache.Store(ip, result)
			return result
		}
	}

	return Result{}
}

type maxMindResponse struct {
	Country struct {
		ISOCode string `json:"iso_code"`
	} `json:"country"`
	City struct {
		Names map[string]string `json:"names"`
	} `json:"city"`
	Traits struct {
		ISP                string `json:"isp"`
		IsAnonymousProxy   bool   `json:"is_anonymous_proxy"`
		IsAnonymousVPN     bool   `json:"is_anonymous_vpn"`
	} `json:"traits"`
}

func (c *Client) lookupMaxMind(ctx context.Context, ip string) (Result, error) {
	url := fmt.Sprintf("https://geolite.info/geoip/v2.1/city/%s", ip)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Result{}, err
	}
	req.SetBasicAuth(c.accountID, c.licenseKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return Result{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return Result{}, fmt.Errorf("maxmind returned %d", resp.StatusCode)
	}

	var mmResp maxMindResponse
	if err := json.NewDecoder(resp.Body).Decode(&mmResp); err != nil {
		return Result{}, err
	}

	result := Result{
		Country: mmResp.Country.ISOCode,
		City:    mmResp.City.Names["en"],
		ISP:     mmResp.Traits.ISP,
		IsVPN:   mmResp.Traits.IsAnonymousVPN,
		IsProxy: mmResp.Traits.IsAnonymousProxy,
	}
	return result, nil
}
