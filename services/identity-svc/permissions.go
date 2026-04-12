package main

import (
	"github.com/gambchamp/crm/pkg/models"
	"github.com/gambchamp/crm/pkg/rbac"
)

var (
	PermUsersInvite = rbac.UsersInvite
	PermUsersRead   = rbac.UsersRead
	PermUsersWrite  = rbac.UsersWrite
	PermUsersDelete = rbac.UsersDelete
	PermRolesRead   = rbac.RolesRead
)

func PermissionsForRole(role models.Role) rbac.Set {
	return rbac.ForRole(role)
}

func ListRoles() []rbac.RoleInfo {
	return rbac.ListRoles()
}
