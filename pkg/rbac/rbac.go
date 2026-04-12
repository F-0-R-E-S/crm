package rbac

import "github.com/gambchamp/crm/pkg/models"

type Permission string

const (
	LeadsRead    Permission = "leads:read"
	LeadsWrite   Permission = "leads:write"
	LeadsExport  Permission = "leads:export"
	LeadsDelete  Permission = "leads:delete"

	AffiliatesRead   Permission = "affiliates:read"
	AffiliatesWrite  Permission = "affiliates:write"
	AffiliatesDelete Permission = "affiliates:delete"

	BrokersRead   Permission = "brokers:read"
	BrokersWrite  Permission = "brokers:write"
	BrokersDelete Permission = "brokers:delete"

	RoutingRead  Permission = "routing:read"
	RoutingWrite Permission = "routing:write"

	AnalyticsRead   Permission = "analytics:read"
	AnalyticsExport Permission = "analytics:export"

	UsersRead   Permission = "users:read"
	UsersWrite  Permission = "users:write"
	UsersInvite Permission = "users:invite"
	UsersDelete Permission = "users:delete"

	RolesRead  Permission = "roles:read"
	RolesWrite Permission = "roles:write"

	APIKeysRead  Permission = "apikeys:read"
	APIKeysWrite Permission = "apikeys:write"

	FraudRead  Permission = "fraud:read"
	FraudWrite Permission = "fraud:write"

	NotificationsRead  Permission = "notifications:read"
	NotificationsWrite Permission = "notifications:write"

	AuditRead Permission = "audit:read"

	ComplianceRead  Permission = "compliance:read"
	ComplianceWrite Permission = "compliance:write"

	SecurityRead  Permission = "security:read"
	SecurityWrite Permission = "security:write"

	SettingsRead  Permission = "settings:read"
	SettingsWrite Permission = "settings:write"

	BillingRead  Permission = "billing:read"
	BillingWrite Permission = "billing:write"
)

var AllPermissions = []Permission{
	LeadsRead, LeadsWrite, LeadsExport, LeadsDelete,
	AffiliatesRead, AffiliatesWrite, AffiliatesDelete,
	BrokersRead, BrokersWrite, BrokersDelete,
	RoutingRead, RoutingWrite,
	AnalyticsRead, AnalyticsExport,
	UsersRead, UsersWrite, UsersInvite, UsersDelete,
	RolesRead, RolesWrite,
	APIKeysRead, APIKeysWrite,
	FraudRead, FraudWrite,
	NotificationsRead, NotificationsWrite,
	AuditRead,
	ComplianceRead, ComplianceWrite,
	SecurityRead, SecurityWrite,
	SettingsRead, SettingsWrite,
	BillingRead, BillingWrite,
}

var rolePermissions = map[models.Role][]Permission{
	models.RoleSuperAdmin: AllPermissions,

	models.RoleNetworkAdmin: {
		LeadsRead, LeadsWrite, LeadsExport,
		AffiliatesRead, AffiliatesWrite, AffiliatesDelete,
		BrokersRead, BrokersWrite, BrokersDelete,
		RoutingRead, RoutingWrite,
		AnalyticsRead, AnalyticsExport,
		UsersRead, UsersWrite, UsersInvite,
		RolesRead,
		APIKeysRead, APIKeysWrite,
		FraudRead, FraudWrite,
		NotificationsRead, NotificationsWrite,
		AuditRead,
		ComplianceRead, ComplianceWrite,
		SecurityRead, SecurityWrite,
		SettingsRead, SettingsWrite,
	},

	models.RoleAffiliateManager: {
		LeadsRead, LeadsWrite, LeadsExport,
		AffiliatesRead, AffiliatesWrite,
		BrokersRead,
		RoutingRead,
		AnalyticsRead,
		FraudRead,
		NotificationsRead, NotificationsWrite,
	},

	models.RoleTeamLead: {
		LeadsRead, LeadsWrite, LeadsExport,
		AffiliatesRead, AffiliatesWrite,
		BrokersRead, BrokersWrite,
		RoutingRead, RoutingWrite,
		AnalyticsRead, AnalyticsExport,
		UsersRead,
		FraudRead,
		NotificationsRead, NotificationsWrite,
	},

	models.RoleMediaBuyer: {
		LeadsRead, LeadsWrite,
		AffiliatesRead,
		AnalyticsRead,
		NotificationsRead,
	},

	models.RoleFinanceManager: {
		LeadsRead, LeadsExport,
		AffiliatesRead,
		BrokersRead,
		AnalyticsRead, AnalyticsExport,
		BillingRead, BillingWrite,
		AuditRead,
		ComplianceRead,
	},
}

type Set map[Permission]struct{}

func NewSet(perms []Permission) Set {
	s := make(Set, len(perms))
	for _, p := range perms {
		s[p] = struct{}{}
	}
	return s
}

func (s Set) Has(p Permission) bool {
	_, ok := s[p]
	return ok
}

func (s Set) HasAny(perms ...Permission) bool {
	for _, p := range perms {
		if s.Has(p) {
			return true
		}
	}
	return false
}

func ForRole(role models.Role) Set {
	perms, ok := rolePermissions[role]
	if !ok {
		return Set{}
	}
	return NewSet(perms)
}

func PermissionsForRole(role models.Role) []Permission {
	return rolePermissions[role]
}

type RoleInfo struct {
	Role        models.Role `json:"role"`
	Label       string      `json:"label"`
	Description string      `json:"description"`
	Permissions []string    `json:"permissions"`
}

func ListRoles() []RoleInfo {
	defs := []struct {
		role  models.Role
		label string
		desc  string
	}{
		{models.RoleSuperAdmin, "Super Admin", "Full system access, billing, and role management"},
		{models.RoleNetworkAdmin, "Network Admin", "Manages affiliates, brokers, routing, and team"},
		{models.RoleAffiliateManager, "Affiliate Manager", "Manages assigned affiliates and their leads"},
		{models.RoleTeamLead, "Team Lead", "Oversees team operations, routing, and analytics"},
		{models.RoleMediaBuyer, "Media Buyer", "Submits and monitors own leads"},
		{models.RoleFinanceManager, "Finance Manager", "Read-only analytics, billing, and audit access"},
	}
	out := make([]RoleInfo, 0, len(defs))
	for _, d := range defs {
		perms := rolePermissions[d.role]
		ps := make([]string, len(perms))
		for i, p := range perms {
			ps[i] = string(p)
		}
		out = append(out, RoleInfo{Role: d.role, Label: d.label, Description: d.desc, Permissions: ps})
	}
	return out
}
