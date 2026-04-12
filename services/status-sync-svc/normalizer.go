package main

import (
	"context"
	"strings"
	"sync"

	"github.com/gambchamp/crm/pkg/models"
)

// statusGroupMap maps raw broker status strings (lowercased) to standard
// GambChamp CRM status groups. Brokers send statuses in many different
// formats — this normalizer ensures a consistent vocabulary.
var statusGroupMap = map[string]string{
	// processing group
	"new":        "processing",
	"pending":    "processing",
	"processing": "processing",

	// ftd group (first time deposit)
	"deposited":     "ftd",
	"ftd":           "ftd",
	"first_deposit": "ftd",

	// active group
	"active":    "active",
	"qualified": "active",

	// rejected group
	"rejected": "rejected",
	"declined": "rejected",
	"invalid":  "rejected",

	// duplicate group
	"duplicate": "duplicate",
	"dup":       "duplicate",

	// no_answer group
	"no_answer":      "no_answer",
	"na":             "no_answer",
	"not_interested": "no_answer",

	// callback group
	"callback": "callback",
	"followup": "callback",

	// converted group
	"converted":  "converted",
	"conversion": "converted",
}

// statusRank defines the ordering of status groups from earliest to latest in
// the lead lifecycle. Higher rank = further along the funnel. A status
// regression (moving from a higher rank to a lower one) is a potential shave.
var statusRank = map[string]int{
	"processing": 1,
	"callback":   2,
	"no_answer":  3,
	"active":     4,
	"ftd":        5,
	"converted":  6,
	// Terminal/negative statuses are not ranked for shave detection.
	"rejected":  -1,
	"duplicate": -1,
}

// NormalizeStatus maps a raw broker status string to the standard GambChamp
// status group. Returns the lowercased input unchanged if no mapping exists,
// so unknown statuses are preserved for manual review.
func NormalizeStatus(brokerStatus string) string {
	key := strings.ToLower(strings.TrimSpace(brokerStatus))
	if group, ok := statusGroupMap[key]; ok {
		return group
	}
	return key
}

// DetectShave checks whether a status transition looks like a shave
// (fraudulent status regression). For example, a lead that was previously
// marked as "ftd" being moved back to "processing" is suspicious — the
// broker may be hiding conversions to avoid paying the affiliate.
//
// This is inspired by the "Status Pipe Pending" concept from Elnopy's
// competitor analysis.
//
// Returns true if the new status has a lower rank than the current status
// AND both statuses have positive ranks (i.e., they are in the normal funnel).
func DetectShave(currentStatus, newStatus string) bool {
	currentRank, currentOk := statusRank[currentStatus]
	newRank, newOk := statusRank[newStatus]

	// Only flag regressions where both statuses are in the normal funnel
	// (positive rank). A move to rejected/duplicate is not shave, it's
	// a legitimate terminal status change.
	if !currentOk || !newOk {
		return false
	}
	if currentRank <= 0 || newRank <= 0 {
		return false
	}

	return newRank < currentRank
}

// ---------------------------------------------------------------------------
// DB-driven status normalizer
// ---------------------------------------------------------------------------

// StatusNormalizer provides DB-driven status normalization with an in-memory
// cache that falls back to the hardcoded statusGroupMap and statusRank.
type StatusNormalizer struct {
	store *Store
	// In-memory cache of broker mappings, refreshed periodically.
	mu       sync.RWMutex
	mappings map[string]map[string]string // brokerID -> rawStatus -> groupSlug
	groups   map[string]models.StatusGroup // slug -> StatusGroup
}

// NewStatusNormalizer creates a normalizer backed by the given store.
func NewStatusNormalizer(store *Store) *StatusNormalizer {
	return &StatusNormalizer{
		store:    store,
		mappings: make(map[string]map[string]string),
		groups:   make(map[string]models.StatusGroup),
	}
}

// LoadMappings loads all broker_status_mappings and status_groups from the
// database into the in-memory cache for the given tenant.
func (sn *StatusNormalizer) LoadMappings(ctx context.Context, tenantID string) error {
	// Load status groups.
	groups, err := sn.store.ListStatusGroups(ctx, tenantID)
	if err != nil {
		return err
	}

	groupMap := make(map[string]models.StatusGroup, len(groups))
	for _, g := range groups {
		groupMap[g.Slug] = g
	}

	// Load all broker mappings.
	mappings, err := sn.store.GetAllMappings(ctx, tenantID)
	if err != nil {
		return err
	}

	sn.mu.Lock()
	sn.groups = groupMap
	sn.mappings = mappings
	sn.mu.Unlock()

	return nil
}

// NormalizeForBroker normalizes a raw status using broker-specific DB mappings
// first, then falls back to the hardcoded statusGroupMap.
func (sn *StatusNormalizer) NormalizeForBroker(brokerID, rawStatus string) string {
	key := strings.ToLower(strings.TrimSpace(rawStatus))

	sn.mu.RLock()
	if brokerMappings, ok := sn.mappings[brokerID]; ok {
		if slug, ok := brokerMappings[key]; ok {
			sn.mu.RUnlock()
			return slug
		}
	}
	sn.mu.RUnlock()

	// Fall back to the hardcoded map.
	return NormalizeStatus(rawStatus)
}

// GetStatusRank returns the rank for a given status group slug. It checks DB
// groups first, then falls back to the hardcoded statusRank map.
func (sn *StatusNormalizer) GetStatusRank(slug string) int {
	sn.mu.RLock()
	if g, ok := sn.groups[slug]; ok {
		sn.mu.RUnlock()
		return g.Rank
	}
	sn.mu.RUnlock()

	if rank, ok := statusRank[slug]; ok {
		return rank
	}
	return 0
}

// DetectShaveEnhanced checks for shave with more context than the old
// DetectShave function. It uses DB-driven ranks when available.
func (sn *StatusNormalizer) DetectShaveEnhanced(currentStatus, newStatus string) (isShave bool, oldRank, newRank int) {
	oldRank = sn.GetStatusRank(currentStatus)
	newRank = sn.GetStatusRank(newStatus)

	// Only flag regressions where both statuses are in the normal funnel
	// (positive rank). Terminal/negative statuses have rank <= 0.
	if oldRank <= 0 || newRank <= 0 {
		return false, oldRank, newRank
	}

	return newRank < oldRank, oldRank, newRank
}
