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

export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role ?? '')

  function has(permission: string): boolean {
    const perms = ROLE_PERMISSIONS[role]
    if (!perms) return false
    if (perms.includes('*')) return true
    return perms.includes(permission)
  }

  function hasAny(...permissions: string[]): boolean {
    return permissions.some((p) => has(p))
  }

  return { role, has, hasAny }
}
