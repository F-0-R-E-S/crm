import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  network_admin: [
    'leads:read', 'leads:write', 'leads:export',
    'affiliates:read', 'affiliates:write', 'affiliates:delete',
    'brokers:read', 'brokers:write', 'brokers:delete',
    'routing:read', 'routing:write',
    'analytics:read', 'analytics:export',
    'users:read', 'users:write', 'users:invite',
    'roles:read', 'apikeys:read', 'apikeys:write',
    'fraud:read', 'fraud:write',
    'notifications:read', 'notifications:write',
    'audit:read', 'settings:read', 'settings:write',
  ],
  affiliate_manager: [
    'leads:read', 'leads:write', 'leads:export',
    'affiliates:read', 'affiliates:write',
    'brokers:read', 'routing:read', 'analytics:read',
    'fraud:read', 'notifications:read', 'notifications:write',
  ],
  team_lead: [
    'leads:read', 'leads:write', 'leads:export',
    'affiliates:read', 'affiliates:write',
    'brokers:read', 'brokers:write',
    'routing:read', 'routing:write',
    'analytics:read', 'analytics:export',
    'users:read', 'fraud:read',
    'notifications:read', 'notifications:write',
  ],
  media_buyer: [
    'leads:read', 'leads:write',
    'affiliates:read', 'analytics:read',
    'notifications:read',
  ],
  finance_manager: [
    'leads:read', 'leads:export',
    'affiliates:read', 'brokers:read',
    'analytics:read', 'analytics:export',
    'billing:read', 'billing:write', 'audit:read',
  ],
}

interface PermissionsResponse {
  role: string
  permissions: string[]
}

export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role ?? '')

  const { data } = useQuery({
    queryKey: ['auth-permissions', role],
    queryFn: () =>
      api.get<PermissionsResponse>('/auth/permissions').catch(() => ({
        role,
        permissions: ROLE_PERMISSIONS[role] || [],
      })),
    enabled: Boolean(role),
    staleTime: 60_000,
  })

  const permissions = useMemo(() => {
    if (data?.permissions?.length) {
      return data.permissions
    }
    return ROLE_PERMISSIONS[role] || []
  }, [data, role])

  function has(permission: string): boolean {
    if (permissions.includes('*')) return true
    return permissions.includes(permission)
  }

  function hasAny(...required: string[]): boolean {
    return required.some((p) => has(p))
  }

  return { role: data?.role || role, has, hasAny, permissions }
}
