package main

import "strings"

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
